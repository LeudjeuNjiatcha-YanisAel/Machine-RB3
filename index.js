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

let PAIRING_CODE = null
let BOT_CONNECTED = false
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

let hasConnected = false;
// ✅ RESTAURATION SESSION MULTI-FICHIERS DEPUIS SESSION_DATA
const SESSION_DIR = path.join(__dirname, './session');
const SESSION_ZIP = path.join(__dirname, './session.zip');

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

// Route de ping
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'))
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

let phoneNumber = "682441127"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "MACHINE VB3"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

async function startXeonBotInc() {
    try {
        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                
                await reactToAllMessages(XeonBotInc, mek);
                if (!mek.message) return;
                await autoResponse(XeonBotInc, mek);
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                if (!mek?.message) return;
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return // Block DMs in private mode, but allow group messages
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
                
                // Clear message retry cache to prevent memory bloat
                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }
                
                //trackActivity(mek);
                
                try {
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error("Erreur dans handleMessages :", err)
                    if (mek.key && mek.key.remoteJid) {
                        await XeonBotInc.sendMessage(mek.key.remoteJid, {
                            text: '❌ Une erreur est survenue lors du traitement de votre message.'
                        })
                    }
                }
            } catch (err) {
                console.error("Erreur messages.upsert :", err)
            }
        })

        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            let phoneNumber = await question(
                chalk.bgBlack(chalk.greenBright(
                    `Entrez votre numéro WhatsApp ⏩\nFormat : 2376xxxxxxxx (sans espaces ni +) : `
                ))
            )

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red(
                    'Numéro invalide. Veuillez entrer un numéro international valide.'
                ))
                process.exit(1)
            }

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(chalk.black(chalk.bgGreen(`Votre code d’association : `)), chalk.black(chalk.blueBright(code)))
                    console.log(chalk.yellow(
                        `\nVeuillez saisir ce code dans WhatsApp :\n` +
                        `1. Ouvrez WhatsApp\n` +
                        `2. Paramètres > Appareils associés\n` +
                        `3. Associer un appareil`))
 console.log(chalk.blue(`4. Entrez le code ci-dessus`)) 
                } catch (error) {
                    console.error('Erreur lors de la génération du code :', error)
                    console.log(chalk.red(
                        'Impossible d’obtenir le code d’association. Vérifiez le numéro.'
                    ))
                }
            }, 3000)
        }

        XeonBotInc.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(chalk.yellow('📱 QR Code généré.'));
            }

            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 Connexion à WhatsApp...'));
            }

            if (connection === 'open') {
                console.log(chalk.green('🤖 Bot connecté avec succès !'));

                const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                try{
                    await XeonBotInc.sendMessage(botNumber, {
                        text:
                            `🤖 *Bot connecté avec succès*🤖!\n\n` +
                            `⏰ *Heure* : ${new Date().toLocaleString()}\n` +
                            `✅ *Statut* : En ligne Et Operationnel\n`

                    });
                }catch(err){
                    console.error('Erreur lors de l’envoi du message de bienvenue :', err);
                }
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;

                console.log(chalk.red('❌ Connexion fermée. Raison :'), reason);

                if (reason === DisconnectReason.loggedOut) {
                    console.log(chalk.yellow('🧹 Session invalide. Supprime la session.'));
                    process.exit(1);
                }

                // ⚠️ NE PAS relancer startXeonBotInc ici
                console.log(chalk.blueBright('⏳ Baileys va tenter une reconnexion automatique...'));
               startXeonBotInc()
            }
            });

        return XeonBotInc
    } catch (error) {
        console.error('Erreur dans startXeonBotInc :', error)
        await delay(5000)
        startXeonBotInc()
    }
}
(async () => {
    await restoreSessionFromEnv()
    startXeonBotInc().catch(error => {
        console.error('Erreur fatale :', error)
        process.exit(1)
    })
})();

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
