const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// In-memory storage for chat history and user info
const chatMemory = {
    messages: new Map(), // Stocke les 5 derniers messages par utilisateur
    userInfo: new Map()  // Stocke les informations utilisateur
};

// Load user group data
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données du groupe utilisateur :', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Save user group data
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erreur lors de l’enregistrement des données du groupe utilisateur :', error.message);
    }
}

// Add random delay between 2-5 seconds
function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

// Add typing indicator
async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    } catch (error) {
        console.error('Erreur de l’indicateur de saisie :', error);
    }
}

// Extract user information from messages
function extractUserInfo(message) {
    const info = {};
    
    // Extract name
    if (message.toLowerCase().includes('my name is')) {
        info.name = message.split('my name is')[1].trim().split(' ')[0];
    }
    
    // Extract age
    if (message.toLowerCase().includes('i am') && message.toLowerCase().includes('years old')) {
        info.age = message.match(/\d+/)?.[0];
    }
    
    // Extract location
    if (message.toLowerCase().includes('i live in') || message.toLowerCase().includes('i am from')) {
        info.location = message.split(/(?:i live in|i am from)/i)[1].trim().split(/[.,!?]/)[0];
    }
    
    return info;
}

async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `*CONFIGURATION DU CHATBOT*\n\n*.chatbot on*\nActiver le chatbot\n\n*.chatbot off*\nDésactiver le chatbot dans ce groupe`,
            quoted: message
        });
    }

    const data = loadUserGroupData();
    
    // Get bot's number
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    // Check if sender is bot owner
    const senderId = message.key.participant || message.participant || message.pushName || message.key.remoteJid;
    const isOwner = senderId === botNumber;

    // If it's the bot owner, allow access immediately
    if (isOwner) {
        if (match === 'on') {
            await showTyping(sock, chatId);
            if (data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '*Le chatbot est déjà activé pour ce groupe*',
                    quoted: message
                });
            }
            data.chatbot[chatId] = true;
            saveUserGroupData(data);
            console.log(`✅ Chatbot activé pour le groupe ${chatId}`);
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot a été activé pour ce groupe*',
                quoted: message
            });
        }

        if (match === 'off') {
            await showTyping(sock, chatId);
            if (!data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '*Le chatbot est déjà désactivé pour ce groupe*',
                    quoted: message
                });
            }
            delete data.chatbot[chatId];
            saveUserGroupData(data);
            console.log(`✅ Chatbot désactivé pour le groupe ${chatId}`);
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot a été désactivé pour ce groupe*',
                quoted: message
            });
        }
    }

    // For non-owners, check admin status
    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            isAdmin = groupMetadata.participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
        } catch (e) {
            console.warn('⚠️ Impossible de récupérer les métadonnées du groupe. Le bot n’est peut-être pas admin.');
        }
    }

    if (!isAdmin && !isOwner) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: '❌ Seuls les administrateurs du groupe ou le propriétaire du bot peuvent utiliser cette commande.',
            quoted: message
        });
    }

    if (match === 'on') {
        await showTyping(sock, chatId);
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot est déjà activé pour ce groupe*',
                quoted: message
            });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        console.log(`✅ Chatbot activé pour le groupe ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '*Le chatbot a été activé pour ce groupe*',
            quoted: message
        });
    }

    if (match === 'off') {
        await showTyping(sock, chatId);
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot est déjà désactivé pour ce groupe*',
                quoted: message
            });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        console.log(`✅ Chatbot désactivé pour le groupe ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '*Le chatbot a été désactivé pour ce groupe*',
            quoted: message
        });
    }

    await showTyping(sock, chatId);
    return sock.sendMessage(chatId, { 
        text: '*Commande invalide. Utilisez *chatbot pour voir l’utilisation*',
        quoted: message
    });
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        let isBotMentioned = false;
        let isReplyToBot = false;

        // ----- DÉTECTION TAG / RÉPONSE -----
        if (message.message?.extendedTextMessage) {
            const context = message.message.extendedTextMessage.contextInfo || {};
            const mentionedJid = context.mentionedJid || [];
            const quotedParticipant = context.participant;

            // Tag du bot
            isBotMentioned = mentionedJid.includes(botJid);

            // Réponse à un message du bot
            if (quotedParticipant && quotedParticipant === botJid) {
                isReplyToBot = true;
            }
        }

        // Message privé → toujours autorisé
        if (!chatId.endsWith('@g.us')) {
            isBotMentioned = true;
        }

        if (!isBotMentioned && !isReplyToBot) return;

        // ----- NETTOYAGE DU MESSAGE -----
        let cleanedMessage = userMessage
            .replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '')
            .trim();

        if (!cleanedMessage || cleanedMessage.length < 2) return;

        // ----- MÉMOIRE UTILISATEUR -----
        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
            chatMemory.userInfo.set(senderId, {});
        }

        const userInfo = extractUserInfo(cleanedMessage);
        if (Object.keys(userInfo).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...userInfo
            });
        }

        const messages = chatMemory.messages.get(senderId);
        messages.push(cleanedMessage);
        if (messages.length > 20) messages.shift();

        await showTyping(sock, chatId);

        const response = await getAIResponse(cleanedMessage, {
            messages,
            userInfo: chatMemory.userInfo.get(senderId)
        });

        if (!response) {
            return sock.sendMessage(chatId, {
                text: "🤔 Je réfléchis encore… reformule un peu ta question.",
                quoted: message
            });
        }

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (error) {
        console.error('❌ Erreur chatbot :', error);
        try {
            await sock.sendMessage(chatId, {
                text: "😅 Oups… petite erreur interne. Réessaie.",
                quoted: message
            });
        } catch {}
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
