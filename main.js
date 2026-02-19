// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(() => {
  fs.readdir(customTemp, (err, files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(customTemp, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    }
  });
  console.log('🧹 Temp folder auto-cleaned');
}, 3 * 60 * 60 * 1000);

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
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');

// Command imports
const tagAllCommand = require('./commands/tagall');
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
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { Antilink } = require('./lib/antilink');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./commands/mention');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const kickCommand = require('./commands/kick');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const { welcomeCommand, handleJoinEvent } = require('./commands/welcome');
const { goodbyeCommand, handleLeaveEvent } = require('./commands/goodbye');
const githubCommand = require('./commands/github');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const antibadwordCommand = require('./commands/antibadword');
const { handleChatbotCommand, handleChatbotResponse } = require('./commands/chatbot');
const takeCommand = require('./commands/take');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const textmakerCommand = require('./commands/textmaker');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const { setGroupDescription, setGroupName, setGroupPhoto } = require('./commands/groupmanage');

const playCommand = require('./commands/play');
const songCommand = require('./commands/song');
const {aiCommand,callGeminiOfficial} = require('./commands/ai');
const { handleTranslateCommand } = require('./commands/translate');
const { reactToAllMessages, handleAreactCommand } = require('./lib/reactions');
const sudoCommand = require('./commands/sudo');
const updateCommand = require('./commands/update');
const removebgCommand = require('./commands/removebg');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const settingsCommand = require('./commands/settings');
const viewPhotoCommand = require('./commands/pp');
const onlineCommand = require('./commands/online');
require('dotenv').config();
const {capitalCommand,handleCapitalAnswer,stopCapitalGame,quitCapitalGame} = require('./commands/capital'); 
const { games } = require('./commands/capital');
const runSessionCommand = require('./commands/session.js');
const autoResponse = require('./autoResponse');
const { createRunwayVideo, waitForVideo } = require('./commands/runway');
const {execute,handleSlam} = require('./commands/million');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A";
global.ytch = "Verison 20";

// Add this near the top of main.js with other global configurations

async function handleMessages(sock, messageUpdate, printLog) {
    let chatId = null;
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Handle autoread functionality
        await handleAutoread(sock, message);

        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }
        let chatId = message?.key?.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Handle button responses
        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            
            if (buttonId === 'channel') {
                await sock.sendMessage(chatId, { 
                    text: '📢 *Join our Channel:*\nhttps://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A' 
                }, { quoted: message });
                return;
            } else if (buttonId === 'owner') {
                const ownerCommand = require('./commands/owner');
                await ownerCommand(sock, chatId);
                return;
            } else if (buttonId === 'support') {
                await sock.sendMessage(chatId, { 
                    text: `🔗 *Support*\n\nhttps://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7?mode=wwt` 
                }, { quoted: message });
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
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        // Preserve raw message for commands like .tag that need original casing
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

            // 🎮 Gestion du jeu Million - Slam
        

        // Only log command usage
        if (userMessage.startsWith('*')) {
            console.log(`📝 Command used in ${isGroup ? 'group' : 'private'}: ${userMessage}`);
        }
        // Read bot mode once; don't early-return so moderation can still run in private mode
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Error checking access mode:', error);
            // default isPublic=true on error
        }
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo === true;
        // Check if user is banned (skip ban check for unban command)
        if (isBanned(senderId) && !userMessage.startsWith('*unban')) {
            // Only respond occasionally to avoid spam
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
                    
                });
            }
            return;
        }

        // First check if it's a game move
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'quit') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }
        // Basic message response in private chat
          if (!isGroup && (userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bot' || userMessage === 'hlo' || userMessage === 'hey' || userMessage === 'bro')) {
              await sock.sendMessage(chatId, {
                  text: 'Hi, How can I help you?\nYou can use .menu for more info and commands.',
                  
              });
              return;
          } 

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Check for bad words and antilink FIRST, before ANY other processing
        // Always run moderation in groups, regardless of mode
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            // Antilink checks message text internally, so run it even if userMessage is empty
            await Antilink(message, sock);
        }

        // PM blocker: block non-owner DMs when enabled (do not ban)
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    // Inform user, delay, then block without banning globally
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        // Then check for command prefix
        if (!userMessage.startsWith('*')) {
            
            await handleCapitalAnswer(sock, chatId, senderId, rawText); // Check for capital game answer with original casing
            // Show typing indicator if autotyping is enabled
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                // Always run moderation features (antitag) regardless of mode
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                
                // Only run chatbot in public mode or for owner/sudo
                if (isPublic || isOwnerOrSudoCheck) {
                    await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                }
            }
            return;
        }
        // In private mode, only owner/sudo can run commands
        if (!isPublic && !isOwnerOrSudoCheck) {
            return;
        }

        // List of admin commands
        const adminCommands = ['*mute', '*unmute', '*ban', '*unban', '*promote', '*demote', '*kick', '*tagall', '*tagnotadmin', '*hidetag', '*antilink', '*antitag', '*setgdesc', '*setgname', '*setgpp'];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = ['*mode', '*autostatus', '*antidelete', '*cleartmp', '*setpp', '*clearsession', '*areact', '*autoreact', '*autotyping', '*autoread', '*pmblocker'];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.',  }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('*mute') ||
                userMessage === '*unmute' ||
                userMessage.startsWith('*ban') ||
                userMessage.startsWith('*unban') ||
                userMessage.startsWith('*promote') ||
                userMessage.startsWith('*demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: '*Seul administrateurs peut utiliser cette commande*',
                        
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { text: '❌ Cette Commande est seulement disponible pour le proprietaire or sudo!' }, { quoted: message });
                return;
            }
        }

        // Command handlers - Execute commands immediately without waiting for typing indicator
        // We'll show typing indicator after command execution if needed
        let commandExecuted = false;
        
         // 🎮 Coup TicTacToe par réponse directe (1 à 100)
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage &&games && Object.values(games).some(r =>r.id.startsWith('tictactoe') &&
        r.state === 'PLAYING' && [r.game.playerX, r.game.playerO].includes(senderId))) {
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
        const moveNumber = parseInt(replyText, 10);
        if (isNaN(moveNumber) || moveNumber < 1 || moveNumber > 100) return;

        // Appeler la fonction avec la chaîne du nombre
        await handleTicTacToeMove(sock, chatId, senderId, moveNumber.toString());
        return; // Stop le reste
}

        // 🎮 Slam (réponse aux questions)
        if (userMessage.startsWith('*slam ')) {
        await handleSlam(sock, message, userMessage);
        return;
        }

        // 🎮 Commande Million
        if (userMessage.startsWith('*million')) {
        const args = userMessage.split(/\s+/).slice(1);
        await execute(sock, message, args);
        return;
        }

        switch (true) { 
            case userMessage.startsWith('*kick'):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
                break;
            case userMessage.startsWith('*mute'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const muteArg = parts[1];
                    const muteDuration = muteArg !== undefined ? parseInt(muteArg, 10) : undefined;
                    if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid number of minutes or use .mute with no number to mute immediately.',  }, { quoted: message });
                    } else {
                        await muteCommand(sock, chatId, senderId, message, muteDuration);
                    }
                }
                break;
            case userMessage === '*unmute':
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('*ban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*unban'):
                if (!isGroup) {
                    if (!message.key.fromMe && !senderIsSudo) {
                        await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .unban in private chat.' }, { quoted: message });
                        break;
                    }
                }
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === '*help' || userMessage === '*menu' || userMessage === '*bot' || userMessage === '*list':
                await helpCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;
            case userMessage === '*sticker' || userMessage === '*s':
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('*warnings'):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                break;
            case userMessage.startsWith('*warn'):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                break;
            case userMessage.startsWith('*tts'):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                break;
            case userMessage.startsWith('*delete') || userMessage.startsWith('*del'):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            
            case userMessage === '*settings':
                await settingsCommand(sock, chatId, message);
                break;
            case userMessage === '*session':
                await runSessionCommand({
                    sock,
                    msg: message,
                });
                break;
            case userMessage.startsWith('*mode'):
                // Check if sender is the owner
                if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                    await sock.sendMessage(chatId, { text: 'Seulement le proprietaire peut utiliser cette commande!',  }, { quoted: message });
                    return;
                }
                // Read current data first
                let data;
                try {
                    data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                } catch (error) {
                    console.error('Error reading access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to read bot mode status',  });
                    return;
                }

                const action = userMessage.split(' ')[1]?.toLowerCase();
                // If no argument provided, show current status
                if (!action) {
                    const currentMode = data.isPublic ? 'public' : 'private';
                    await sock.sendMessage(chatId, {
                        text: `Current bot mode: *${currentMode}*\n\nUsage: *mode public/private\n\nExample:\n*mode public - Tout le monde peut utiliser le bot\n*mode private - Restrait seulement au proprietaire`,
                        
                    }, { quoted: message });
                    return;
                }

                if (action !== 'public' && action !== 'private') {
                    await sock.sendMessage(chatId, {
                        text: 'Usage: *mode public/private\n\nExample:\n*mode public - Allow everyone to use bot\n*mode private - Restrict to owner only',
                        
                    }, { quoted: message });
                    return;
                }

                try {
                    // Update access mode
                    data.isPublic = action === 'public';

                    // Save updated data
                    fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));

                    await sock.sendMessage(chatId, { text: `Bot est maintenant en *${action}* mode`,  });
                } catch (error) {
                    console.error('Error updating access mode:', error);
                    await sock.sendMessage(chatId, { text: 'Failed to update bot access mode',  });
                }
                break;
            case userMessage.startsWith('*pmblocker'):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage === '*owner':
                await ownerCommand(sock, chatId);
                break;
             case userMessage === '*tagall':
                await tagAllCommand(sock, chatId, senderId, message);
                break;
            case userMessage === '*tagnotadmin':
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('*hidetag'):
                {
                    const messageText = rawText.slice(8).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                break;
            
            case userMessage.startsWith('*antitag'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'Cet commande peut etre seulement  utiliser dans un groupes.',
                        
                    }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Please je dois etre admin.',
                        
                    }, { quoted: message });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith('*genere'):
                const prompt = userMessage.replace("*genere ", "").trim();

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
           
            case userMessage.startsWith('*accept') || userMessage.startsWith('*tictactoe'):
                const tttText = userMessage.split(' ').slice(1).join(' ');
                await tictactoeCommand(sock, chatId, senderId, tttText);
                break;
            case userMessage === '*capital':
                await capitalCommand(sock, chatId, senderId);
            break;

            case userMessage === '*exit':
                await quitCapitalGame(sock, chatId, senderId);
                break;
                
            case userMessage.startsWith('*move'):
               // on enlève seulement la commande, PAS le reste
                const moveText = userMessage.replace(/^(\*move)\s*/i, '');
                if (!moveText) {
                    await sock.sendMessage(chatId, {
                    text: '❌ Utilisation : *move <numéro>'
                }, { quoted: message });
                 break;
                }
                // ⚠️ on envoie le texte BRUT
                await handleTicTacToeMove(sock, chatId, senderId, moveText);
                break;
            case userMessage === '*chip':
                await viewPhotoCommand(sock, chatId, message);
            break;

            case userMessage === '*online':
                await onlineCommand(sock, chatId, message);
                break;
            case userMessage === '*topmembers':
                topMembers(sock, chatId, isGroup);
                break;
            case userMessage.startsWith('*youtube'):
                const youtubeCommand = require('./commands/youtube');
                await youtubeCommand(sock, chatId,senderId,userMessage);
                break;
            case userMessage.startsWith('*compliment'):
                await complimentCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*insult'):
                await insultCommand(sock, chatId, message);
                break;
            case userMessage === '*clear':
                if (isGroup) await clearCommand(sock, chatId);
                break;
            case userMessage.startsWith('*promote'):
                const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await promoteCommand(sock, chatId, mentionedJidListPromote, message);
                break;
            case userMessage.startsWith('*demote'):
                const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await demoteCommand(sock, chatId, mentionedJidListDemote, message);
                break;
            case userMessage === '*ping':
                await pingCommand(sock, chatId, message);
                break;
            case userMessage === '*alive':
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*welcome'):
                if (isGroup) {
                    // Check admin status if not already checked
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }

                    if (isSenderAdmin || message.key.fromMe) {
                        await welcomeCommand(sock, chatId, message);
                    } else {
                        await sock.sendMessage(chatId, { text: '*Seul administrateurs peut utiliser cette commande*',  }, { quoted: message });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'Cet commande peut etre seulement  utiliser dans un groups.',  }, { quoted: message });
                }
                break;
            case userMessage.startsWith('*goodbye'):
                if (isGroup) {
                    // Check admin status if not already checked
                    if (!isSenderAdmin) {
                        const adminStatus = await isAdmin(sock, chatId, senderId);
                        isSenderAdmin = adminStatus.isSenderAdmin;
                    }

                    if (isSenderAdmin || message.key.fromMe) {
                        await goodbyeCommand(sock, chatId, message);
                    } else {
                        await sock.sendMessage(chatId, { text: '*Seul administrateurs peut utiliser cette commande*',  }, { quoted: message });
                    }
                } else {
                    await sock.sendMessage(chatId, { text: 'Cet commande peut etre seulement  utiliser dans un groups.',  }, { quoted: message });
                }
                break;
            case userMessage === '*git':
            case userMessage === '*github':
            case userMessage === '*sc':
            case userMessage === '*script':
            case userMessage === '*repo':
                await githubCommand(sock, chatId, message,args);
                break;
            case userMessage.startsWith('*antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Cet commande peut etre seulement  utiliser dans un groups.',  }, { quoted: message });
                    return;
                }

                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;

                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*',  }, { quoted: message });
                    return;
                }

                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('*chatbot'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'Commande dispo slt pour le proprietaire.',  }, { quoted: message });
                    return;
                }

                // Check if sender is admin or bot owner
                const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
                if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, { text: '*Seul administrateurs peut utiliser cette commande*',  }, { quoted: message });
                    return;
                }

                const match = userMessage.slice(8).trim();
                await handleChatbotCommand(sock, chatId, message, match);
                break;
            case userMessage.startsWith('*take') || userMessage.startsWith('*steal'):
                {
                    const isSteal = userMessage.startsWith('*steal');
                    const sliceLen = isSteal ? 6 : 5; // '.steal' vs '.take'
                    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
                    await takeCommand(sock, chatId, message, takeArgs);
                }
                break;
            case userMessage.startsWith('*character'):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*waste'):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === '*groupinfo' || userMessage === '*infogp' || userMessage === '*infogrupo':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!',  }, { quoted: message });
                    return;
                }
                await groupInfoCommand(sock, chatId, message);
                break;
            case userMessage === '*resetlink' || userMessage === '*revoke' || userMessage === '*anularlink':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!',  }, { quoted: message });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '*staff' || userMessage === '*admins' || userMessage === '*listadmin':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!',  }, { quoted: message });
                    return;
                }
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*emojimix') || userMessage.startsWith('*emix'):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage === '*extract':
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === '*clearsession' || userMessage === '*clearsesi':
                await clearSessionCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*autostatus'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, message, autoStatusArgs);
                break;
            case userMessage.startsWith('*metallic'):
                await textmakerCommand(sock, chatId, message, userMessage, 'metallic');
                break;
            case userMessage.startsWith('*ice'):
                await textmakerCommand(sock, chatId, message, userMessage, 'ice');
                break;
            case userMessage.startsWith('*snow'):
                await textmakerCommand(sock, chatId, message, userMessage, 'snow');
                break;
            
            case userMessage.startsWith('*getid'):
                await sock.sendMessage(chatId, { text: `📌 Group ID: ${chatId}` });
                break;
            case userMessage.startsWith('*osint'):
                await infoCommand(sock, chatId, message);
                break;

            case userMessage.startsWith('*impressive'):
                await textmakerCommand(sock, chatId, message, userMessage, 'impressive');
                break;
            case userMessage.startsWith('*matrix'):
                await textmakerCommand(sock, chatId, message, userMessage, 'matrix');
                break;
            case userMessage.startsWith('*light'):
                await textmakerCommand(sock, chatId, message, userMessage, 'light');
                break;
            case userMessage.startsWith('*neon'):
                await textmakerCommand(sock, chatId, message, userMessage, 'neon');
                break;
            case userMessage.startsWith('*devil'):
                await textmakerCommand(sock, chatId, message, userMessage, 'devil');
                break;
            case userMessage.startsWith('*thunder'):
                await textmakerCommand(sock, chatId, message, userMessage, 'thunder');
                break;
            case userMessage.startsWith('*leaves'):
                await textmakerCommand(sock, chatId, message, userMessage, 'leaves');
                break;
            case userMessage.startsWith('*1917'):
                await textmakerCommand(sock, chatId, message, userMessage, '1917');
                break;
            case userMessage.startsWith('*arena'):
                await textmakerCommand(sock, chatId, message, userMessage, 'arena');
                break;
            case userMessage.startsWith('*hacker'):
                await textmakerCommand(sock, chatId, message, userMessage, 'hacker');
                break;
            case userMessage.startsWith('*sand'):
                await textmakerCommand(sock, chatId, message, userMessage, 'sand');
                break;
            case userMessage.startsWith('*blackpink'):
                await textmakerCommand(sock, chatId, message, userMessage, 'blackpink');
                break;
            case userMessage.startsWith('*glitch'):
                await textmakerCommand(sock, chatId, message, userMessage, 'glitch');
                break;
            case userMessage.startsWith('*fire'):
                await textmakerCommand(sock, chatId, message, userMessage, 'fire');
                break;
            case userMessage.startsWith('*antidelete'):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                break;
            case userMessage === '*quit':
                // Handle quit command for tictactoe game
                await handleTicTacToeMove(sock, chatId, senderId, 'quit');
                break;
            case userMessage === '*cleartmp':
                await clearTmpCommand(sock, chatId, message);
                break;
            case userMessage === '*setpp':
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith('*setgdesc'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupDescription(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith('*setgname'):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupName(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith('*setgpp'):
                await setGroupPhoto(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith('*music'):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*play') || userMessage.startsWith('*mp3') || userMessage.startsWith('*ytmp3') || userMessage.startsWith('*song'):
                await songCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*gpt') || userMessage.startsWith('*gemini') || userMessage.startsWith('*image') || userMessage.startsWith('*deepseek') || userMessage.startsWith('*dalle') || userMessage.startsWith('*llama'):
                await aiCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*translate') || userMessage.startsWith('*trt'):
                const commandLength = userMessage.startsWith('*translate') ? 10 : 4;
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(commandLength));
                return;
            case userMessage.startsWith('*areact') || userMessage.startsWith('*autoreact') || userMessage.startsWith('*autoreaction'):
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudoCheck);
                break;
            case userMessage.startsWith('*sudo'):
                await sudoCommand(sock, chatId, message);
                break;
            case userMessage === '*jid': await groupJidCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('*autotyping'):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('*autoread'):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith('*horny'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['horny', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('*circle'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['circle', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            
            case userMessage.startsWith('*ytcomment'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['youtube-comment', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            
            case userMessage.startsWith('*update'):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock, chatId, message, zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith('*removebg') || userMessage.startsWith('*rmbg') || userMessage.startsWith('*nobg'):
                await removebgCommand.exec(sock, message, userMessage.split(' ').slice(1));
                break;
            default:
                if (isGroup) {
                    // Handle non-command group messages
                    if (userMessage) {  // Make sure there's a message
                        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                    }
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                }
                commandExecuted = false;
                break;
        }

        // If a command was executed, show typing status after command execution
        if (commandExecuted !== false) {
            // Command was executed, now show typing status after command execution
            await showTypingAfterCommand(sock, chatId);
        }

        // Function to handle .groupjid command
        async function groupJidCommand(sock, chatId, message) {
            const groupJid = message.key.remoteJid;

            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, {
                    text: "❌ This command can only be used in a group."
                });
            }

            await sock.sendMessage(chatId, {
                text: `✅ Group JID: ${groupJid}`
            }, {
                quoted: message
            });
        }

        if (!userMessage.startsWith('*')) {
            // After command is processed successfully
            await reactToAllMessages(sock, message);
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
        // Only try to send error message if we have a valid chatId
        if (chatId) {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to process command!',
                
            });
        }
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;

        // Check if it's a group
        if (!id.endsWith('@g.us')) return;

        // Respect bot mode: only announce promote/demote in public mode
        let isPublic = true;
        try {
            const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
        } catch (e) {
            // If reading fails, default to public behavior
        }

        // Handle promotion events
        if (action === 'promote') {
            if (!isPublic) return;
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }

        // Handle demotion events
        if (action === 'demote') {
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }

        // Handle join events
        if (action === 'add') {
            await handleJoinEvent(sock, id, participants);
        }

        // Handle leave events
        if (action === 'remove') {
            await handleLeaveEvent(sock, id, participants);
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

// Instead, export the handlers along with handleMessages
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};