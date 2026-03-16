// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(),'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp,{ recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(() => {
  fs.readdir(customTemp,(err,files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(customTemp,file);
      fs.stat(filePath,(err,stats) => {
        if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
          fs.unlink(filePath,() => {});
        }
      });
    }
  });
  console.log('🧹 Temp folder auto-cleaned');
},3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const { autotypingCommand,isAutotypingEnabled,handleAutotypingForMessage,handleAutotypingForCommand,showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand,isAutoreadEnabled,handleAutoread } = require('./commands/autoread');

// Command imports
const { tagAll, tagAdmins, tagNonAdmins, hideTag, tagAllAudio } = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./lib/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { tictactoeCommand,handleTicTacToeMove } = require('./commands/tictactoe');
const { incrementMessageCount,topMembers } = require('./commands/topmembers');
const deleteCommand = require('./commands/delete');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection,mentionToggleCommand,setMentionCommand } = require('./commands/mention');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const { welcomeCommand,handleJoinEvent } = require('./commands/welcome');
const githubCommand = require('./commands/github');
const { handleAntiBadwordCommand,handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const { handleChatbotCommand,handleChatbotResponse } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const groupInfoCommand = require('./commands/groupinfo');
const infoCommand = require('./commands/info');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const { autoStatusCommand,handleStatusUpdate,statusCommand } = require('./commands/autostatus');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand,handleMessageRevocation,storeMessage } = require('./commands/antidelete');
const setProfilePicture = require('./commands/setpp');
const { setGroupDescription,setGroupName,setGroupPhoto } = require('./commands/groupmanage');

const playCommand = require('./commands/play');
const songCommand = require('./commands/song');
const {aiCommand,callGeminiOfficial} = require('./commands/ai');
const { handleTranslateCommand } = require('./commands/translate');
const { reactToAllMessages,handleAreactCommand } = require('./lib/reactions');
const sudoCommand = require('./commands/sudo');
const updateCommand = require('./commands/update');
const { pmblockerCommand,readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const viewPhotoCommand = require('./commands/pp');
require('dotenv').config();
const {capitalCommand,handleCapitalAnswer,stopCapitalGame,quitCapitalGame} = require('./commands/capital'); 
const { games } = require('./commands/capital');
const {runSessionCommand} = require('./commands/session.js');
const { createRunwayVideo,waitForVideo } = require('./commands/runway');
const {execute,handleSlam} = require('./commands/million');
const resumeCommand = require('./commands/resume.js');
const {logCommand,logMessage,logBotMessage} = require('./lib/audit');
const auditCommand = require('./commands/audit');
const ytsearch = require('./commands/ytsearch');
const ytmp4 = require('./commands/ytmp4');
const {handleAntitagCommand,handleTagDetection} = require('./commands/antitag');
const {handleAutoDeleteCommand , autoDeleteHandler} = require('./commands/autodelete');
const { handleCodeFix } = require('./commands/codefix');
const { trackMessage, handleSummary } = require('./commands/summary');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A";
global.ytch = "Verison 20";

// Add this near the top of main.js with other global configurations

let COMMAND_LOGS = []
global.COMMAND_LOGS = COMMAND_LOGS

function commandLog(message){
    const log = {
    time: new Date().toLocaleTimeString(),
    msg: message
    }

    COMMAND_LOGS.push(log)

    if(COMMAND_LOGS.length > 200){
    COMMAND_LOGS.shift()
    }

    console.log(message)
}


async function handleMessages(sock,messageUpdate,printLog) {
    let chatId = null;
    try {
        const { messages,type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;
        logMessage(message);
        // Handle autoread functionality
        await handleAutoread(sock,message);

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock,message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock,message);
            return;
        }
        let chatId = message?.key?.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId,sock,chatId);
        const botNumber = sock.user.id.split(":")[0]
        let prefix = global.userPrefixes[botNumber] || "*"
        // Handle button responses
        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            
            if (buttonId === 'channel') {
                await sock.sendMessage(chatId,{ 
                    text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' 
                },{ quoted: message });
                return;
            } else if (buttonId === 'owner') {
                const ownerCommand = require('./commands/owner');
                await ownerCommand(sock,chatId);
                return;
            } else if (buttonId === 'support') {
                await sock.sendMessage(chatId,{ 
                    text: `🔗 *Support*\n\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt` 
                },{ quoted: message });
                return;
            }
        }

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g,'.').trim();

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';
        await trackMessage(chatId, senderId, rawText);
        // 🎮 Gestion du jeu Million - Slam
        

        // Only log command usage
        if (userMessage.startsWith(prefix+'')) {
            console.log(`📝 Commande utiliser en ${isGroup ? 'group' : 'private'}: ${userMessage}`);
            commandLog(`📝 Commande utiliser en ${isGroup ? 'group' : 'private'}: ${userMessage}`)
        }   
        // Read bot mode once; don't early-return so moderation can still run in private mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:',error);
            // default isPublic=true on error
        }
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo === true;
        // Check if user is banned (skip ban check for unban command)
        if (isBanned(senderId) && !userMessage.startsWith(prefix+'unban')) {
            // Only respond occasionally to avoid spam
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId,{
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
                    
                });
            }
            return;
        }

        // First check if it's a game move
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'quit') {
            await handleTicTacToeMove(sock,chatId,senderId,userMessage);
            return;
        }
        // Basic message response in private chat
          if (!isGroup && (userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bot' || userMessage === 'hlo' || userMessage === 'hey' || userMessage === 'bro')) {
              await sock.sendMessage(chatId,{
                  text: 'Hi,How can I help you?\nYou can use .menu for more info and commands.',
                  
              });
              return;
          } 

        if (!message.key.fromMe) incrementMessageCount(chatId,senderId);

        // Check for bad words and antilink FIRST,before ANY other processing
        // Always run moderation in groups,regardless of mode
        if (isGroup) {
            const badwordText = rawText || '';
            if (badwordText) {
                await handleBadwordDetection(
                    sock,
                    chatId,
                    message,
                    badwordText,
                    senderId
                );
            }
            await Antilink(message,sock);
        }

        // PM blocker: block non-owner DMs when enabled (do not ban)
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    // Inform user,delay,then block without banning globally
                    await sock.sendMessage(chatId,{ text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r,1500));
                    try { await sock.updateBlockStatus(chatId,'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        // Then check for command prefix
        if (!userMessage.startsWith(prefix+'')) {
            
            await handleCapitalAnswer(sock,chatId,senderId,rawText); // Check for capital game answer with original casing
            // Show typing indicator if autotyping is enabled
            await handleAutotypingForMessage(sock,chatId,userMessage);

            if (isGroup) {
                // Always run moderation features (antitag) regardless of mode
                await handleTagDetection(sock,chatId,message,senderId);
                await handleMentionDetection(sock,chatId,message);
                
                // Only run chatbot in public mode or for owner/sudo
                if (isPublic || isOwnerOrSudoCheck) {
                    await handleChatbotResponse(botNumber,sock,chatId,message,userMessage,senderId);
                }
            }
            return;
        }

        // ✅ AUDIT : log de la commande
        const commandName = userMessage.split(' ')[0].toLowerCase();
        logCommand(commandName, message);

        // In private mode,only owner/sudo can run commands
        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

        // List of admin commands
        const adminCommands = ['*mute','*unmute','*ban','*unban','*promote','*demote','*kick','*tagall','*tagnotadmin','*hidetag','*antilink','*antitag','*setgdesc','*setgname','*setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = ['*mode','*autostatus','*antidelete','*setpp','*areact','*autoreact','*autotyping','*autoread','*pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock,chatId,senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId,{ text: 'Please make the bot an admin to use admin commands.', },{ quoted: message });
                return;
            }

            if (
                userMessage.startsWith(prefix+'mute') ||
                userMessage.startsWith(prefix+'unmute') ||
                userMessage.startsWith(prefix+'ban') ||
                userMessage.startsWith(prefix+'unban') ||
                userMessage.startsWith(prefix+'promote') ||
                userMessage.startsWith(prefix+'demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId,{
                        text: '*Seul administrateurs peut utiliser cette commande*',
                        
                    },{ quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId,{ text: '❌ Cette Commande est seulement disponible pour le proprietaire or sudo!' },{ quoted: message });
                return;
            }
        }

        // Command handlers - Execute commands immediately without waiting for typing indicator
        // We'll show typing indicator after command execution if needed
        let commandExecuted = false;
        
         // 🎮 Coup TicTacToe par réponse directe (1 à 100)
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage &&games && Object.values(games).some(r =>r.id.startsWith('tictactoe') &&
        r.state === 'PLAYING' && [r.game.playerX,r.game.playerO].includes(senderId))) {
            // Récupérer le texte que l'utilisateur a réellement envoyé
        let replyText = '';
    
        if (message.message?.conversation) {
            replyText = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            replyText = message.message.extendedTextMessage.text;
        }
        replyText = String(replyText).trim();

        if (!replyText) return;
            // Vérifier que c'est un nombre 1 à 100
        const moveNumber = parseInt(replyText,10);
        if (isNaN(moveNumber) || moveNumber < 1 || moveNumber > 100) return;

        // Appeler la fonction avec la chaîne du nombre
        await handleTicTacToeMove(sock,chatId,senderId,moveNumber.toString());
        return; // Stop le reste
}

        if (userMessage.startsWith(prefix+'slam ')) {
        await handleSlam(sock,message,userMessage);
        return;
        }

        // 🎮 Commande Million
        if (userMessage.startsWith(prefix+'million')) {
        const args = userMessage.split(/\s+/).slice(1);
        await execute(sock,message,args);
        return;
        }
        const args = userMessage.split(/\s+/).slice(1);
        switch (true) { 
            case userMessage.startsWith(prefix+'kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock,chatId,senderId,mentionedJidListKick,message);
                break;
            case userMessage.startsWith(prefix+'mute'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const muteArg = parts[1];
                    const muteDuration = muteArg !== undefined ? parseInt(muteArg,10) : undefined;
                    if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
                        await sock.sendMessage(chatId,{ text: 'Please provide a valid number of minutes or use .mute with no number to mute immediately.', },{ quoted: message });
                    } else {
                        await muteCommand(sock,chatId,senderId,message,muteDuration);
                    }
                }
                break;
            case userMessage.startsWith(prefix+'unmute'):
                await unmuteCommand(sock,chatId,senderId);
                break;
            case userMessage.startsWith(prefix+'ban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId,{ text: 'Only owner/sudo can use *ban in private chat.' },{ quoted: message });
                        break;
                    }
                }
                await banCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'unban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId,{ text: 'Only owner/sudo can use *unban in private chat.' },{ quoted: message });
                        break;
                    }
                }
                await unbanCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'help') || userMessage.startsWith(prefix+'menu') || userMessage.startsWith(prefix+'bot') || userMessage.startsWith(prefix+'list'):
                await helpCommand(sock,chatId,message,prefix);
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'sticker') || userMessage.startsWith(prefix+'s'):
                await stickerCommand(sock,chatId,message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock,chatId,mentionedJidListWarnings);
                break;
            case userMessage.startsWith(prefix+'warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock,chatId,senderId,mentionedJidListWarn,message);
                break;
            case userMessage.startsWith(prefix+'tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock,chatId,text,message);
                break;
            case userMessage.startsWith(prefix+'delete') || userMessage.startsWith(prefix+'del'):
                await deleteCommand(sock,chatId,message,senderId);
                break;
            
            case userMessage.startsWith(prefix+'settings'):
                await settingsCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'session'):
                await runSessionCommand({
                    sock,
                    msg: message,
                });
                break;
            case userMessage.startsWith(prefix+'mode'):
                // Check if sender is the owner
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId,{ text: 'Seulement le proprietaire peut utiliser cette commande!', },{ quoted: message });
                    return;
                }
                // Read current data first
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error reading access mode:',error);
                    await sock.sendMessage(chatId,{ text: 'Failed to read bot mode status', });
                    return;
                }

                const action = userMessage.split(' ')[1]?.toLowerCase();
                // If no argument provided,show current status
                if (!action) {
                    const currentMode = data.isPublic ? 'public' : 'private';
                    await sock.sendMessage(chatId,{
                        text: `Current bot mode: *${currentMode}*\n\nUsage: *mode public/private\n\nExample:\n*mode public - Tout le monde peut utiliser le bot\n*mode private - Restrait seulement au proprietaire`,
                        
                    },{ quoted: message });
                    return;
                }

                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId,{
                        text: 'Usage: *mode public/private\n\nExample:\n*mode public - Allow everyone to use bot\n*mode private - Restrict to owner only',
                        
                    },{ quoted: message });
                    return;
                }

                try {
                    // Update access mode
                    data.isPublic = action === 'public';

                    // Save updated data
                    fs.writeFileSync('./data/messageCount.json',JSON.stringify(data,null,2));

                    await sock.sendMessage(chatId,{ text: `Bot est maintenant en *${action}* mode`, });
                } catch (error) {
                    console.error('Error updating access mode:',error);
                    await sock.sendMessage(chatId,{ text: 'Failed to update bot access mode', });
                }
                break;
            case userMessage.startsWith(prefix+'pmblocker'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock,chatId,message,args);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'owner'):
                await ownerCommand(sock,chatId);
                break;
            case userMessage.startsWith(prefix+'genere'):
                const prompt = userMessage.replace("*genere ","").trim();

                if (!prompt)
                    return sock.sendMessage(chatId,{ text:"❌ Exemple: *video un dragon vole dans le ciel"});

                await sock.sendMessage(chatId,{
                    text:"🎬 Création de la vidéo IA...\n⏳ cela prend ~30 secondes"
                },{ quoted: message });

                try {

                    const taskId = await createRunwayVideo(prompt);

                    const videoUrl = await waitForVideo(taskId);

                    await sock.sendMessage(chatId,{
                        video:{ url: videoUrl },
                        caption:"✅ Vidéo générée par IA 🎥"
                    },{ quoted: message });

                } catch (err) {

                    await sock.sendMessage(chatId,{
                        text:"❌ Impossible de générer la vidéo."
                    },{ quoted: message });

                }
                break;
           
            case userMessage.startsWith(prefix+'accept') || userMessage.startsWith(prefix+'tictactoe'):
                const tttText = userMessage.split(' ').slice(1).join(' ');
                await tictactoeCommand(sock,chatId,senderId,tttText);
                break;
            case userMessage.startsWith(prefix+'capital'):
                await capitalCommand(sock,chatId,senderId);
            break;

            case userMessage.startsWith(prefix+'exit'):
                await quitCapitalGame(sock,chatId,senderId);
                break;
                
            case userMessage.startsWith(prefix+'move'):
               // on enlève seulement la commande,PAS le reste
                const moveText = userMessage.replace(/^(\*move)\s*/i,'');
                if (!moveText) {
                    await sock.sendMessage(chatId,{
                    text: '❌ Utilisation : *move <numéro>'
                },{ quoted: message });
                 break;
                }
                // ⚠️ on envoie le texte BRUT
                await handleTicTacToeMove(sock,chatId,senderId,moveText);
                break;
            case userMessage.startsWith(prefix+'chip'):
                await viewPhotoCommand(sock,chatId,message);
            break;

            case userMessage.startsWith(prefix+'topmembers'):
                topMembers(sock,chatId,isGroup);
                break;
            case userMessage.startsWith(prefix+'youtube'):
                const youtubeCommand = require('./commands/youtube');
                await youtubeCommand(sock,chatId,senderId,userMessage);
                break;
            case userMessage.startsWith(prefix+'compliment'):
                await complimentCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'insult'):
                await insultCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'promote'):
                const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await promoteCommand(sock,chatId,mentionedJidListPromote,message);
                break;
            case userMessage.startsWith(prefix+'demote'):
                const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await demoteCommand(sock,chatId,mentionedJidListDemote,message);
                break;
            case userMessage.startsWith(prefix+'ping'):
                await pingCommand(sock,chatId,message,prefix);
                break;
            case userMessage.startsWith(prefix+'alive'):
                await aliveCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'welcome'):
                if (isGroup) {
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock,chatId,senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }

                    if (isSenderAdmin || message.key.fromMe) {
                        await welcomeCommand(sock,chatId,message);
                    } else {
                        await sock.sendMessage(chatId,{ text: '*Seul administrateurs peut utiliser cette commande*', },{ quoted: message });
                    }
                } else {
                    await sock.sendMessage(chatId,{ text: 'Cet commande peut etre seulement  utiliser dans un groups.', },{ quoted: message });
                }
                break;
            case userMessage.startsWith(prefix+'git'):
            case userMessage.startsWith(prefix+'github'):
            case userMessage.startsWith(prefix+'sc'):
            case userMessage.startsWith(prefix+'script'):
            case userMessage.startsWith(prefix+'repo'):
                await githubCommand(sock,chatId,message,args);
                break;
            case userMessage.startsWith(prefix+'antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId,{ text: 'Cet commande peut etre seulement  utiliser dans un groups.', },{ quoted: message });
                    return;
                }

                const adminStatus = await isAdmin(sock,chatId,senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;

                if (!isBotAdmin) {
                    await sock.sendMessage(chatId,{ text: '*Bot doit etre admin pour l\'utilisation*', },{ quoted: message });
                    return;
                }

                await antibadwordCommand(sock,chatId,message,senderId,isSenderAdmin);
                break;
            case userMessage.startsWith(prefix+'chatbot'):
                if (!isGroup) {
                    await sock.sendMessage(chatId,{ text: 'Commande dispo slt pour le proprietaire.', },{ quoted: message });
                    return;
                }

                // Check if sender is admin or bot owner
                const chatbotAdminStatus = await isAdmin(sock,chatId,senderId);
                if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId,{ text: '*Seul administrateurs peut utiliser cette commande*', },{ quoted: message });
                    return;
                }

                const match = userMessage.slice(8).trim();
                await handleChatbotCommand(botNumber,sock,chatId,message,match);
                break;
            case userMessage.startsWith(prefix+'take') || userMessage.startsWith(prefix+'steal'):
                {
                    const isSteal = userMessage.startsWith(prefix+'steal');
                    const sliceLen = isSteal ? 6 : 5; // '.steal' vs '.take'
                    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
                    await takeCommand(sock,chatId,message,takeArgs);
                }
                break;
            case userMessage.startsWith(prefix+'character'):
                await characterCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'waste'):
                await wastedCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'groupinfo') || userMessage.startsWith(prefix+'infogp') || userMessage.startsWith(prefix+'infogrupo'):
                if (!isGroup) {
                    await sock.sendMessage(chatId,{ text: 'This command can only be used in groups!', },{ quoted: message });
                    return;
                }
                await groupInfoCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'resetlink') || userMessage.startsWith(prefix+'revoke') || userMessage.startsWith(prefix+'anularlink'):
                if (!isGroup) {
                    await sock.sendMessage(chatId,{ text: 'This command can only be used in groups!', },{ quoted: message });
                    return;
                }
                await resetlinkCommand(sock,chatId,senderId);
                break;
            case userMessage.startsWith(prefix+'staff') || userMessage.startsWith(prefix+'admins') || userMessage.startsWith(prefix+'listadmin'):
                if (!isGroup) {
                    await sock.sendMessage(chatId,{ text: 'This command can only be used in groups!', },{ quoted: message });
                    return;
                }
                await staffCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'emojimix') || userMessage.startsWith(prefix+'emix'):
                await emojimixCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'extract'):
                await viewOnceCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'autostatus') || userMessage.startsWith(prefix+'statusall'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock,chatId,message,autoStatusArgs);
                break;
            case userMessage.startsWith(prefix+'status'):
                await statusCommand(sock,chatId);
                break;
            case userMessage.startsWith(prefix+'metallic'):
                await textmakerCommand(sock,chatId,message,userMessage,'metallic');
                break;
            case userMessage.startsWith(prefix+'ice'):
                await textmakerCommand(sock,chatId,message,userMessage,'ice');
                break;
            case userMessage.startsWith(prefix+'snow'):
                await textmakerCommand(sock,chatId,message,userMessage,'snow');
                break;
            
            case userMessage.startsWith(prefix+'getid'):
                await sock.sendMessage(chatId,{ text: `📌 Group ID: ${chatId}` });
                break;
            case userMessage.startsWith(prefix+'osint'):
                await infoCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'impressive'):
                await textmakerCommand(sock,chatId,message,userMessage,'impressive');
                break;
            case userMessage.startsWith(prefix+'matrix'):
                await textmakerCommand(sock,chatId,message,userMessage,'matrix');
                break;
            case userMessage.startsWith(prefix+'light'):
                await textmakerCommand(sock,chatId,message,userMessage,'light');
                break;
            case userMessage.startsWith(prefix+'neon'):
                await textmakerCommand(sock,chatId,message,userMessage,'neon');
                break;
            case userMessage.startsWith(prefix+'devil'):
                await textmakerCommand(sock,chatId,message,userMessage,'devil');
                break;
            case userMessage.startsWith(prefix+'thunder'):
                await textmakerCommand(sock,chatId,message,userMessage,'thunder');
                break;
            case userMessage.startsWith(prefix+'leaves'):
                await textmakerCommand(sock,chatId,message,userMessage,'leaves');
                break;
            case userMessage.startsWith(prefix+'1917'):
                await textmakerCommand(sock,chatId,message,userMessage,'1917');
                break;
            case userMessage.startsWith(prefix+'arena'):
                await textmakerCommand(sock,chatId,message,userMessage,'arena');
                break;
            case userMessage.startsWith(prefix+'hacker'):
                await textmakerCommand(sock,chatId,message,userMessage,'hacker');
                break;
            case userMessage.startsWith(prefix+'sand'):
                await textmakerCommand(sock,chatId,message,userMessage,'sand');
                break;
            case userMessage.startsWith(prefix+'blackpink'):
                await textmakerCommand(sock,chatId,message,userMessage,'blackpink');
                break;
            case userMessage.startsWith(prefix+'glitch'):
                await textmakerCommand(sock,chatId,message,userMessage,'glitch');
                break;
            case userMessage.startsWith(prefix+'fire'):
                await textmakerCommand(sock,chatId,message,userMessage,'fire');
                break;
            case userMessage.startsWith(prefix+'antidelete'):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock,chatId,message,antideleteMatch);
                break;
            case userMessage.startsWith(prefix+'quit'):
                // Handle quit command for tictactoe game
                await handleTicTacToeMove(sock,chatId,senderId,'quit');
                break;
            case userMessage.startsWith(prefix+'setpp'):
                await setProfilePicture(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'setgdesc'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupDescription(sock,chatId,senderId,text,message);
                }
                break;
            case userMessage.startsWith(prefix+'setgname'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupName(sock,chatId,senderId,text,message);
                }
                break;
            case userMessage.startsWith(prefix+'setgpp'):
                await setGroupPhoto(sock,chatId,senderId,message);
                break;
            case userMessage.startsWith(prefix+'music'):
                await playCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'play') || userMessage.startsWith(prefix+'mp3') || userMessage.startsWith(prefix+'ytmp3') || userMessage.startsWith(prefix+'song'):
                await songCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'gpt') || userMessage.startsWith(prefix+'gemini') || userMessage.startsWith(prefix+'deepseek') || userMessage.startsWith(prefix+'llama') || userMessage.startsWith(prefix+'cerebras') || userMessage.startsWith(prefix+'ai') || userMessage.startsWith(prefix+'hackbox')  || userMessage.startsWith(prefix+'nano') || userMessage.startsWith(prefix+'img') || userMessage.startsWith(prefix+'transcribe'):
                await aiCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'translate') || userMessage.startsWith(prefix+'trt'):
                const commandLength = userMessage.startsWith(prefix+'translate') ? 10 : 4;
                await handleTranslateCommand(sock,chatId,message,userMessage.slice(commandLength));
                return;
            case userMessage.startsWith(prefix+'areact') || userMessage.startsWith(prefix+'autoreact') || userMessage.startsWith(prefix+'autoreaction'):
                await handleAreactCommand(sock,chatId,message,isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith(prefix+'sudo'):
                await sudoCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'jid'): await groupJidCommand(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'autotyping'):
                await autotypingCommand(sock,chatId,message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'autoread'):
                await autoreadCommand(sock,chatId,message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'horny'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['horny',...parts.slice(1)];
                    await miscCommand(sock,chatId,message,args);
                }
                break;
            case userMessage.startsWith(prefix+'circle'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['circle',...parts.slice(1)];
                    await miscCommand(sock,chatId,message,args);
                }
                break;
            
            case userMessage.startsWith(prefix+'ytcomment'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['youtube-comment',...parts.slice(1)];
                    await miscCommand(sock,chatId,message,args);
                }
                break;
            
            case userMessage.startsWith(prefix+'update'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock,chatId,message,zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith(prefix+'essentiel'):
                {
                    await resumeCommand(sock,chatId,message);
                }
                break;
            case userMessage.startsWith(prefix+'audit'):
                await auditCommand(sock,message);
                break;
            case userMessage.startsWith(prefix+'ytsearch'):
                await ytsearch(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'ytmp4'):
                await ytmp4(sock,chatId,message);
                break;
            case userMessage.startsWith(prefix+'autodelete'):
                await handleAutoDeleteCommand(sock,message,args);
                break;
            case userMessage.startsWith(prefix+'tagall'):
                await tagAll(sock,chatId,senderId,message,args);
                break;
            case userMessage.startsWith(prefix+'tagadmins'):
                await tagAdmins(sock,chatId,senderId,message,args);
                break;
            case userMessage.startsWith(prefix+'tagnotadmin'):
                await tagNonAdmins(sock,chatId,senderId,message,args);
                break;
            case userMessage.startsWith(prefix+'hidetag'):    
                await hideTag(sock,chatId,senderId,message,args);
                break;
            case userMessage.startsWith(prefix+'tagaudio'):
                await tagAllAudio(sock,chatId,senderId,message,args);
                break;
            case userMessage.startsWith(prefix +'prefix'):

                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId,{
                        text: "❌ Seul le proprietaire peut changer le prefixe"
                    },{ quoted: message });
                    break;
                }

                const newPrefix = userMessage.split(" ")[1];

                if (!newPrefix) {
                    await sock.sendMessage(chatId,{
                        text: `Example:\n${prefix}setprefix !`
                    },{ quoted: message });
                    break;
                }

                prefix = newPrefix;

                await sock.sendMessage(chatId,{
                    text: `✅ Prefixe changee en: ${prefix}`
                },{ quoted: message });

            break;
     
            case userMessage.startsWith(prefix+'codefix'):
                await handleCodeFix(sock, message, chatId);
            break;

            case userMessage.startsWith(prefix+'summary'):
                await handleSummary(sock, message, chatId, senderId, userMessage);
            break;

            default:
                if (isGroup) {
                    // Handle non-command group messages
                    if (userMessage) {  // Make sure there's a message
                        await handleChatbotResponse(sock,chatId,message,userMessage,senderId);
                    }
                    await handleTagDetection(sock,chatId,message,senderId);
                    await handleMentionDetection(sock,chatId,message);
                }
                commandExecuted = false;
                break;
        }

        // If a command was executed,show typing status after command execution
        if (commandExecuted !== false) {
            // Command was executed,now show typing status after command execution
            await showTypingAfterCommand(sock,chatId);
        }

        // Function to handle .groupjid command
        async function groupJidCommand(sock,chatId,message) {
            const groupJid = message.key.remoteJid;

            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(chatId,{
                    text: "❌ This command can only be used in a group."
                });
            }

            await sock.sendMessage(chatId,{
                text: `✅ Group JID: ${groupJid}`
            },{
                quoted: message
            });
        }

        if (!userMessage.startsWith(prefix+'')) {
            // After command is processed successfully
            await reactToAllMessages(sock,message);
        }
    } catch (error) {
        console.error('❌ Error in message handler:',error.message);
        // Only try to send error message if we have a valid chatId
        if (chatId) {
            await sock.sendMessage(chatId,{
                text: '❌ Failed to process command!',
                
            });
        }
    }
}

async function handleGroupParticipantUpdate(sock,update) {
    try {
        const { id,participants,action,author } = update;

        // Check if it's a group
        if (!id.endsWith('@g.us')) return;

        // Respect bot mode: only announce promote/demote in public mode
        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
        } catch (e) {
            // If reading fails,default to public behavior
        }

        // Handle promotion events
        if (action === 'promote') {
            if (!isPublic) return;
            await handlePromotionEvent(sock,id,participants,author);
            return;
        }

        // Handle demotion events
        if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock,id,participants,author);
            return;
        }

        // Handle join events
        if (action === 'add') {
            await handleJoinEvent(sock,id,participants);
        }

        // Handle leave events
        if (action === 'remove') {
            await handleLeaveEvent(sock,id,participants);
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:',error);
    }
}

// Instead,export the handlers along with handleMessages
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock,status) => {
        await handleStatusUpdate(sock,status);
    }
};