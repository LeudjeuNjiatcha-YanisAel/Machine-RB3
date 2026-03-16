require('./settings')
require('dotenv').config();
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const trackActivity = require('./commands/trackActivity');
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia,fetchJson,await,sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')
const store = require('./lib/lightweight_store')

store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)


// C'est Pour Ouvrir Le Bot Sur Un Serveur Web 
const express = require('express');
const { reactToAllMessages } = require('./lib/reactions');
const autoResponse = require('./autoResponse');
const unzipper = require('unzipper');
const { handleBadwordDetection } = require('./lib/antibadword');
const {autoDeleteHandler} = require('./commands/autodelete');
let hasConnected = false;

// ✅ RESTAURATION SESSION MULTI-FICHIERS DEPUIS SESSION_DATA
const SESSION_DIR = path.join(__dirname, './session');
const SESSION_ZIP = path.join(__dirname, './session.zip');

let MachineBot = null
let BOT_CONNECTED = false
let PAIRING_CODE = null
let QR_CODE = null
const MAX_USERS = 3
let bots = {}
let userPrefixes = {}
global.userPrefixes = userPrefixes

async function startMachineBot(number){

try{
    const sessionPath = `./sessions/${number}`
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const MachineBot = makeWASocket({
        version,
        logger: pino({level:"silent"}),
        auth: state,
        printQRInTerminal:false,
        browser:['Ubuntu','Chrome','20.0.04'],
        connectTimeoutMs:60000,
        keepAliveIntervalMs:10000
    })

    store.bind(MachineBot.ev)
    MachineBot.ev.on("creds.update",saveCreds)

    // MESSAGES

    MachineBot.ev.on("messages.upsert", async (chatUpdate)=>{
        try{
            if(chatUpdate.type !== "notify") return

            const mek = chatUpdate.messages[0]

            await reactToAllMessages(MachineBot,mek)
            if(!mek.message) return;
            await autoResponse(MachineBot,mek)
            await autoDeleteHandler(MachineBot, mek)

            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(MachineBot, chatUpdate);
                return;
            }

            if (!mek?.message) return;
            if (!MachineBot.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                if (!isGroup) return
            }
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return    
            if (MachineBot?.msgRetryCounterCache) {
                MachineBot.msgRetryCounterCache.clear()
            }
            // trackActivity(mek);
            try {
                await handleMessages(MachineBot, chatUpdate, true)
            }
            catch (err) {
                console.error("Erreur dans handleMessages :", err)
                    if (mek.key && mek.key.remoteJid) {
                        await MachineBot.sendMessage(mek.key.remoteJid, {
                            text: '❌ Une erreur est survenue lors du traitement de votre message.'
                            })
                    }
            }
        }
        catch(err){
            console.log("❌ erreur messages:",err)
        }

    })
    MachineBot.ev.on("connection.update", async (update)=>{
        
        if(update.qr){
            QR_CODE = update.qr
            addLog("📱 QR Code généré")
        }
        const { connection, lastDisconnect } = update
        
        if(connection === "connecting"){
            addLog('🔄 Connexion à WhatsApp en cours...');
        }

        if(connection === "open"){
            addLog("✅ "+number+" connecté")
            addLog('🤖 Bot connecté avec succès !');
            bots[number] = MachineBot
            const botNumber = MachineBot.user.id.split(':')[0] + '@s.whatsapp.net';
                try{
                    await MachineBot.sendMessage(botNumber, {
                        text:
                            `🤖 *Bot connecté avec succès*🤖!\n\n` +
                            `⏰ *Heure* : ${new Date().toLocaleString()}\n` +
                            `✅ *Statut* : En ligne Et Operationnel\n`

                    });
                }catch(err){
                    console.error('Erreur lors de l’envoi du message de bienvenue :', err);
                }
        }

        if(connection === "close"){
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            console.log("connexion fermée :",reason)
            if(reason === DisconnectReason.loggedOut){
                addLog("❌ "+number+" deconnecté")
                delete bots[number]
                delete userPrefixes[number]
                fs.rmSync(sessionPath,{recursive:true,force:true})
            }
            else{
                console.log("🔄 Reconnexion",number)
                setTimeout(()=>{
                try{ MachineBot.end() }catch{}
                startMachineBot(number)
                },4000)
            }

        }
    })

    return MachineBot

    }catch(err){
        console.log("Erreur startMachineBot :",err)

    }

}

async function restoreSessionFromEnv() {
    try {
        if (!process.env.SESSION_DATA) {
            console.log('ℹ️ Aucune SESSION_DATA trouvée');
            return;
        }

        console.log('🔄 Restauration SESSION_DATA...');

        // 🔥 Toujours supprimer ancienne session
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        }

        fs.mkdirSync(SESSION_DIR, { recursive: true });

        // 🔥 Nettoyage base64
        const base64Data = process.env.SESSION_DATA.trim();
        const zipBuffer = Buffer.from(base64Data, 'base64');

        fs.writeFileSync(SESSION_ZIP, zipBuffer);

        // 🔥 Extraction propre
        await fs.createReadStream(SESSION_ZIP)
            .pipe(unzipper.Extract({ path: SESSION_DIR }))
            .promise();

        fs.unlinkSync(SESSION_ZIP);

        const files = fs.readdirSync(SESSION_DIR);

        if (files.length === 0) {
            console.log('❌ ERREUR : session vide après extraction');
        } else {
            console.log('✅ Session restaurée avec succès');
            console.log('📂 Fichiers restaurés :', files);
        }

    } catch (err) {
        console.error('❌ Erreur restauration session:', err);
    }
}
const app = express();
const PORT = process.env.PORT || 3000;


// Ajout des routes au serveur
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'))
})

app.get("/users", (req, res) => {
res.sendFile(__dirname + "/users.html")
}) 

app.get("/admin",(req,res)=>{
res.sendFile(path.join(__dirname,"admin.html"))
})

app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
})

app.get("/qr-verif",(req,res)=>{
    res.json({qr:QR_CODE})
})

app.get("/status",(req,res)=>{
    const list = Object.keys(bots).map(num => ({
    number:num,
    prefix:userPrefixes[num] || "*"
    }))

    res.json({
    connected:Object.keys(bots).length > 0,
    users:Object.keys(bots).length,
    list:list
    })
})

app.use(express.json())

app.post("/connect", async (req,res)=>{

    const number = req.body.number

    if(!number){
        return res.json({error:true})
    }

    if(bots[number]){
        return res.json({
        error:true,
        message:"Ce numéro est déjà connecté"
        })
    }

    if(Object.keys(bots).length >= MAX_USERS){
        return res.json({
        error:true,
        message:"Maximum utilisateurs connectés atteint"
        })
    }

    const randomPrefixes = ["!","#","$","&","?","%"]
    if(Object.keys(bots).length >= 1){
        userPrefixes[number] = randomPrefixes[Math.floor(Math.random()*randomPrefixes.length)]
    }else{
        userPrefixes[number] = "*"
    }
    try{
        const MachineBot = await startMachineBot(number)

        await delay(3000)

        let code = await MachineBot.requestPairingCode(number)

        PAIRING_CODE = code

        code = code.match(/.{1,4}/g).join("-")

        addLog("📲 Code généré pour "+number)

        res.json({
        code,
        prefix:userPrefixes[number]
        })
    }catch(err){
        console.log(err)
        res.json({error:true})
    }
})

app.get("/prefix/:number",(req,res)=>{

    const number = req.params.number

    res.json({
    prefix:userPrefixes[number] || "*"
    })

    })

let WEB_LOGS = []

function addLog(message){
    const log = {
    time: new Date().toLocaleTimeString(),
    msg: message
    }

    WEB_LOGS.push(log)

    if(WEB_LOGS.length > 200){
    WEB_LOGS.shift()
    }

    console.log(message)

}

app.get("/log",(req,res)=>{
    res.json(COMMAND_LOGS)
})

app.get("/logs",(req,res)=>{
    res.json(WEB_LOGS)
})

app.get("/paircode",(req,res)=>{
    res.json({code:PAIRING_CODE})
})

app.post("/disconnect", async (req,res)=>{
    const number = req.body.number

    if(!number){
        return res.json({error:true,message:"Numero requis"})
    }

    if(!bots[number]){
        return res.json({
        error:true,
        message:"Bot introuvable"
    })
    }

    try{

        await bots[number].logout()

        delete bots[number]
        delete userPrefixes[number]

        const sessionPath = `./sessions/${number}`

        if(fs.existsSync(sessionPath)){
        fs.rmSync(sessionPath,{recursive:true,force:true})
        }

        addLog("❌ Bot "+number+" deconnecté")

        res.json({
        success:true,
        message:"Bot supprimé"
        })
    }catch(err){
        console.log(err)

        res.json({
        error:true,
        message:"Erreur de deconnexion"
        })
    }

})
// Démarrage du serveur web
app.listen(PORT, () => {
    console.log(`🌍 Serveur HTTP actif sur le port ${PORT}`);
});

// C'est Pour Pinger Le Bot Toutes Les 5 Minutes Pour Eviter Qu'il Se Deconnecte Sur render
setInterval(async () => {
    try {
        const url = process.env.RENDER_EXTERNAL_URL;
        if (!url) return;

        await axios.get(url);
        console.log('🔁 Auto-ping Render OK');
    } catch (err) {
        console.log('⚠️ Auto-ping échoué');
    }
}, 5 * 60 * 1000); // toutes les 5 minutes

setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Nettoyage de la mémoire effectué')
    }
}, 60_000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ Mémoire RAM trop élevée (>400MB), redémarrage du bot...')
        process.exit(1)
    }
}, 30_000)


process.on('uncaughtException', (err) => {
    console.error('Exception non capturée :', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Promesse rejetée non gérée :', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Mise à jour détectée : ${__filename}`))
    delete require.cache[file]
    require(file)
})

