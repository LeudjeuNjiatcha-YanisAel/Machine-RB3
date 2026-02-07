const fs = require('fs');
const path = require('path');

// Emojis selon le type de commande / message
const commandEmojisMap = {
    wait: ['⏳', '⌛'],
    success: ['✅', '✔️'],
    error: ['❌', '⚠️'],
    admin: ['👑', '🛡️'],
    fun: ['😂', '🤣', '😎'],
    info: ['ℹ️', '📌'],
    default: ['🤖']
};

// Path for storing auto-reaction state
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Load auto-reaction state from file
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l’état des réactions automatiques :', error);
    }
    return false;
}

// Save auto-reaction state to file
function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA) 
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA))
            : { groups: [], chatbot: {} };
        
        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur lors de l’enregistrement de l’état des réactions automatiques :', error);
    }
}

// Store auto-reaction state
let isAutoReactionEnabled = loadAutoReactionState();

// Analyse du message pour choisir l’emoji approprié
function getEmojiForMessage(text = '') {
    const msg = text.toLowerCase();

    if (msg.includes('error') || msg.includes('fail') || msg.includes('erreur')) {
        return randomFrom(commandEmojisMap.error);
    }
    if (msg.includes('admin') || msg.includes('owner')) {
        return randomFrom(commandEmojisMap.admin);
    }
    if (msg.includes('enable') || msg.includes('on') || msg.includes('activé')) {
        return randomFrom(commandEmojisMap.success);
    }
    if (msg.includes('disable') || msg.includes('off') || msg.includes('désactivé')) {
        return randomFrom(commandEmojisMap.info);
    }
    if (msg.includes('menu') || msg.includes('help') || msg.includes('info')) {
        return randomFrom(commandEmojisMap.info);
    }
    if (msg.includes('joke') || msg.includes('fun') || msg.includes('lol')) {
        return randomFrom(commandEmojisMap.fun);
    }

    return randomFrom(commandEmojisMap.wait);
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Function to add reaction to a command message
async function addCommandReaction(sock, message) {
    try {
        if (!isAutoReactionEnabled || !message?.key?.id) return;

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const emoji = getEmojiForMessage(text);

        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout de la réaction automatique :', error);
    }
}

// Function to handle areact command
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée uniquement au propriétaire du bot.',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1]?.toLowerCase();

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, { 
                text: '✅ Les réactions automatiques ont été activées globalement.',
                quoted: message
            });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, { 
                text: '✅ Les réactions automatiques ont été désactivées globalement.',
                quoted: message
            });
        } else {
            const currentState = isAutoReactionEnabled ? 'activées' : 'désactivées';
            await sock.sendMessage(chatId, { 
                text:
`ℹ️ Les réactions automatiques sont actuellement *${currentState}*.

Utilisation :
.areact on  → Activer les réactions automatiques
.areact off → Désactiver les réactions automatiques`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Erreur lors de la gestion de la commande areact :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Erreur lors du contrôle des réactions automatiques.',
            quoted: message
        });
    }
}

module.exports = {
    addCommandReaction,
    handleAreactCommand
};

