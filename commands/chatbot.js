const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API
});

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// In-memory storage for chat history and user info
const chatMemory = {
    messages: new Map(), // Stocke les 5 derniers messages par utilisateur
    userInfo: new Map()  // Stocke les informations utilisateur
};

// Load user group data
function loadUserGroupData() {
    try {
        const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));

        // 🔒 Sécurisation ABSOLUE
        if (!data.chatbot || typeof data.chatbot !== 'object') {
            data.chatbot = {};
        }

        return data;
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données du groupe utilisateur :', error.message);
        return { chatbot: {} };
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
            text: `*CONFIGURATION DU CHATBOT*\n\n*chatbot on*\nActiver le chatbot\n\n*chatbot off*\nDésactiver le chatbot dans ce groupe`,
            quoted: message
        });
    }

    const action = match.toLowerCase().trim();
    const data = loadUserGroupData();

    const senderId = message.key.participant || message.key.remoteJid;
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isOwner = senderId === botJid;

    // ===== OWNER =====
    if (isOwner) {
        if (action === 'on') {
            await showTyping(sock, chatId);
            if (data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: '*Le chatbot est déjà activé pour ce groupe*',
                    quoted: message
                });
            }

            data.chatbot[chatId] = true;
            fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));

            return sock.sendMessage(chatId, {
                text: '*Le chatbot a été activé pour ce groupe*',
                quoted: message
            });
        }

        if (action === 'off') {
            await showTyping(sock, chatId);
            if (!data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: '*Le chatbot est déjà désactivé pour ce groupe*',
                    quoted: message
                });
            }

            delete data.chatbot[chatId];
            fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));

            return sock.sendMessage(chatId, {
                text: '*Le chatbot a été désactivé pour ce groupe*',
                quoted: message
            });
        }
    }

    // ===== ADMINS =====
    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const meta = await sock.groupMetadata(chatId);
            isAdmin = meta.participants.some(
                p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
            );
        } catch {
            isAdmin = false;
        }
    }

    if (!isAdmin && !isOwner) {
        return sock.sendMessage(chatId, {
            text: '❌ Seuls les admins ou le propriétaire du bot peuvent utiliser cette commande.',
            quoted: message
        });
    }

    // ===== ACTION =====
    if (action === 'on') {
        data.chatbot[chatId] = true;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));

        return sock.sendMessage(chatId, {
            text: '*Le chatbot a été activé pour ce groupe*',
            quoted: message
        });
    }

    if (action === 'off') {
        delete data.chatbot[chatId];
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));

        return sock.sendMessage(chatId, {
            text: '*Le chatbot a été désactivé pour ce groupe*',
            quoted: message
        });
    }

    return sock.sendMessage(chatId, {
        text: '*Commande invalide. Utilisez `*chatbot` pour voir l’aide*',
        quoted: message
    });
}


async function getAIResponse(text, context = {}) {
    const lower = text.toLowerCase();

    // ===== RÉPONSES RAPIDES (locales, instantanées) =====
    // Réponses pour "bonjour"
    if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('bjr') || lower.includes('yo')|| lower.includes('asser')) {
        const reponsesBonjour = [
            "Salut 👋 comment tu vas ?",
            "Yes ! Quoi de neuf ?",
            "Hey 😄 content de te voir !",
            "Salut 😎 comment ça va ?"
        ];
        return reponsesBonjour[Math.floor(Math.random() * reponsesBonjour.length)];
    }

    // Réponses pour "ça va"
    if (lower.includes('ça va') || lower.includes('ca va')) {
        const reponsesCaVa = [
            "Oui ça va très bien 😄 et toi ?",
            "Ça roule ! Et toi ?",
            "Super 😎, et toi comment ça va ?"
        ];
        return reponsesCaVa[Math.floor(Math.random() * reponsesCaVa.length)];
    }

    // Réponses pour "bien"
    if (lower === 'bien' || lower.includes('ça va bien')) {
        const reponsesBien = [
            "Parfait alors 😊",
            "Super 😄",
            "Content de l'entendre !"
        ];
        return reponsesBien[Math.floor(Math.random() * reponsesBien.length)];
    }

    // Réponses pour "merci"
    if (lower.includes('merci')) {
        const reponsesMerci = [
            "Avec plaisir 😎",
            "De rien !",
            "Je t'en prie 😉"
        ];
        return reponsesMerci[Math.floor(Math.random() * reponsesMerci.length)];
    }

    // ===== GEMINI (fallback intelligent) =====
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        const history = (context.messages || [])
            .slice(-5)
            .map(m => `- ${m}`)
            .join('\n');

        const userInfo = context.userInfo || {};
        const userProfile = `
Nom: ${userInfo.name || "inconnu"}
Âge: ${userInfo.age || "inconnu"}
Localisation: ${userInfo.location || "inconnue"}
`;

        const prompt = `
Tu es un chatbot WhatsApp humain, amical et naturel.
Tu parles simplement, jamais comme une IA.
Tu adaptes ton ton : cool, respectueux, parfois drôle.
Réponses courtes et claires (WhatsApp).

Profil utilisateur :
${userProfile}

Historique récent :
${history}

Message actuel :
"${text}"

Réponds de manière conversationnelle.
`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        return response?.trim() || "🤖 Hmm… j’hésite un peu 😅";

    } catch (error) {
        console.error("❌ Erreur Gemini :", error);
        return "😅 J’ai eu un petit bug… réessaie encore.";
    }
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

        // Message privé → toujours autorisé
        if (!chatId.endsWith('@g.us')) {
            isBotMentioned = true;
        }

        // En groupe : autoriser les messages normaux des membres
        if (chatId.endsWith('@g.us')) {
            // Ignorer seulement les messages du bot lui-même
        if (senderId === botJid) return;
        }

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
