const fs = require('fs');
const path = require('path');
const { asyncLocalStorage } = require('./context');

const emojiIntents = {
    greeting: ['👋', '😊', '🙌'],
    positive: ['❤️', '🔥', '💯', '✨', '👏'],
    funny: ['😂', '🤣', '😹'],
    sad: ['😢', '🥺', '💔'],
    angry: ['😡', '🤬', '⚠️'],
    question: ['🤔', '❓'],
    surprise: ['😲', '😮', '😱'],
    love: ['😍', '❤️‍🔥', '😘'],
    agreement: ['👍', '👌'],
    disagreement: ['👎', '🙄'],
    spam: [''],
    neutral: ['😮', '👀']
};

function getAutoReactionFile(botNumber) {
    const filename = botNumber ? `../data/${botNumber}/userGroupData.json` : '../data/userGroupData.json';
    return path.join(__dirname, filename);
}

function loadAutoReactionState(botNumber) {
    try {
        const filePath = getAutoReactionFile(botNumber);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('Erreur chargement réactions automatiques :', error);
    }
    return false;
}

function saveAutoReactionState(botNumber, state) {
    try {
        const filePath = getAutoReactionFile(botNumber);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const data = fs.existsSync(filePath)
            ? JSON.parse(fs.readFileSync(filePath))
            : { groups: [], chatbot: {} };

        data.autoReaction = state;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur sauvegarde réactions automatiques :', error);
    }
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function analyzeMessage(text = '') {
    const msg = text.toLowerCase();

    if (/bonjour|salut|hello|yo|asser|bonsoir/.test(msg))
        return pickRandom(emojiIntents.greeting);

    if (/merci|cool|top|good|thank you|super|parfait|bien/.test(msg))
        return pickRandom(emojiIntents.positive);

    if (/lol|mdr|😂|🤣/.test(msg))
        return pickRandom(emojiIntents.funny);

    if (/triste|mal|pleure|😭|😢/.test(msg))
        return pickRandom(emojiIntents.sad);

    if (/fuck|merde|con|putain|bordel/.test(msg))
        return pickRandom(emojiIntents.angry);

    if (msg.includes('?'))
        return pickRandom(emojiIntents.question);

    if (/wow|incroyable|omg|😮|😱/.test(msg))
        return pickRandom(emojiIntents.surprise);

    if (/je t'aime|love|❤️|😍/.test(msg))
        return pickRandom(emojiIntents.love);
    if (/oui|ok|d'accord|👌|👍/.test(msg))
        return pickRandom(emojiIntents.agreement);
    if (/non|jamais|🙄|👎/.test(msg))
        return pickRandom(emojiIntents.disagreement);
    if (/oui|ok|d'accord|👌|👍/.test(msg))
        return pickRandom(emojiIntents.agreement);

    if (/non|jamais|🙄|👎/.test(msg))
        return pickRandom(emojiIntents.disagreement);

    if (msg.length < 2)
        return pickRandom(emojiIntents.spam);

    return pickRandom(emojiIntents.neutral);
}

async function reactToAllMessages(sock, message) {
    try {
        const botNumber = sock.user.id.split(":")[0];
        const isAutoReactionEnabled = loadAutoReactionState(botNumber);
        if (!isAutoReactionEnabled) return;
        if (!message?.key?.id) return;

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        // Évite de réagir aux messages du bot lui-même
        if (message.key.fromMe) return;

        const emoji = analyzeMessage(text);

        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });

    } catch (error) {
        console.error('Erreur réaction automatique :', error);
    }
}

async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée au propriétaire du bot.',
                quoted: message
            });
            return;
        }

        const botNumber = sock.user.id.split(":")[0];
        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1];

        if (action === 'on') {
            saveAutoReactionState(botNumber, true);
            await sock.sendMessage(chatId, {
                text: '✅ Les réactions automatiques sont ACTIVÉES pour tous les groupes.',
                quoted: message
            });
        } else if (action === 'off') {
            saveAutoReactionState(botNumber, false);
            await sock.sendMessage(chatId, {
                text: '✅ Les réactions automatiques sont DÉSACTIVÉES.',
                quoted: message
            });
        } else {
            const isAutoReactionEnabled = loadAutoReactionState(botNumber);
            await sock.sendMessage(chatId, {
                text:
`ℹ️ Réactions automatiques : *${isAutoReactionEnabled ? 'ACTIVÉES' : 'DÉSACTIVÉES'}*

Utilisation :
*areact on  → Activer
*areact off → Désactiver`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Erreur commande areact :', error);
    }
}

module.exports = {
    reactToAllMessages,
    handleAreactCommand
};