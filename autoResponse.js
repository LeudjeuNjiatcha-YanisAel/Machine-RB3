const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('./lib/isOwner');
const { callGeminiOfficial,callMetaAI,callOpenAI } = require('./commands/ai');

const CONFIG_PATH = path.join(__dirname, './data/autoresponse.json');

let AUTO_RESPONSE_ENABLED = true;


function cleanJid(jid = '') {
    return jid.split(':')[0];
}

function loadState() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_PATH));
            AUTO_RESPONSE_ENABLED = data.enabled ?? true;
        }
    } catch (err) {
        console.error("AutoResponse Load Error:", err);
    }
}

function saveState() {
    try {
        fs.writeFileSync(
            CONFIG_PATH,
            JSON.stringify({ enabled: AUTO_RESPONSE_ENABLED }, null, 2)
        );
    } catch (err) {
        console.error("AutoResponse Save Error:", err);
    }
}

loadState();

const conversationMemory = {};

function updateMemory(userId, role, text) {
    if (!conversationMemory[userId]) {
        conversationMemory[userId] = [];
    }

    conversationMemory[userId].push(`${role}: ${text}`);

    if (conversationMemory[userId].length > 6) {
        conversationMemory[userId].shift();
    }
}

function getHistory(userId) {
    return conversationMemory[userId]
        ? conversationMemory[userId].join('\n')
        : '';
}
function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getQuickReply(text) {
    const lower = text.toLowerCase();

    if (/(bonjour|salut|bjr|yo|cc)/i.test(lower)) return random(["Salut 👋 comment tu vas ?","Hey ! 😄comment tu te porte","Salut 😄 comment tu as passer ta journee"]);
    if (/(ça va|comment ça va)/i.test(lower)) return random(["Je vais bien 😌 et toi ?","Je vais bien merci 😄"]);
    if (/(merci|thanks|thx)/i.test(lower)) return random(["Avec plaisir 😄","De rien 😄"]);
    if (/(bye|au revoir|à plus)/i.test(lower)) return random(["À bientôt 👋","Au revoir 😄"]);
    if (/(ton nom|tu t'appelles)/i.test(lower)) return "Je suis ton bot WhatsApp 🤖";
    if (/(qui t'a créé|créateur)/i.test(lower)) return "J’ai été créé par mon développeur 😎";
    if (/(tu fais quoi|fonction)/i.test(lower)) return "Je peux discuter, répondre et aider 😌";
    if (/(mdr|lol|😂)/i.test(lower)) return random(["😂😂 tu es en forme toi","Haha 😂"]);
    if (/(bonne nuit)/i.test(lower)) return "Bonne nuit 😴 dors bien";
    if (/(bonne journée)/i.test(lower)) return random(["Bonne journée ☀️","Bonne journée 😊"]);
    if (/(je m'ennuie)/i.test(lower)) return random(["On peut discuter 😄 raconte-moi quelque chose","Tu peux me parler de ce qui te préoccupe 😊"]);
    if (/(aide|help)/i.test(lower)) return random(["Tu peux me parler normalement ou utiliser les commandes fais *menu 😌","Je peux t'aider à utiliser les commandes du bot"]);
    if (/(comment tu t'appelles|ton nom)/i.test(lower)) return "Je suis ton assistant WhatsApp 🤖";
    
    return null;
}

async function autoResponse(sock, msg) {
    try {
        if (!msg?.key?.remoteJid) return;

        const remoteJid = msg.key.remoteJid;

        // Inbox uniquement
        if (remoteJid.endsWith('@g.us')) return;

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text;

        if (!text) return;

        const rawText = text.trim();

        // ⛔ Ne jamais auto-répondre aux messages envoyés par le bot
        if (msg.key.fromMe && !rawText.startsWith('*')) return; 
        
        const lowerText = rawText.toLowerCase();
        const args = lowerText.split(/\s+/);

        // ❗ Bloquer les messages du bot SAUF les commandes
        if (msg.key.fromMe && !rawText.startsWith('*')) return;

        const senderIdRaw = msg.key.fromMe
            ? sock.user.id
            : msg.key.participant || msg.key.remoteJid;

        const senderId = cleanJid(senderIdRaw);

        if (args[0] === '*autoresponse') {
            const isOwner = await isOwnerOrSudo(senderId, sock, remoteJid);

            if (!isOwner) {
                return sock.sendMessage(
                    remoteJid,
                    { text: "❌ Commande réservée au propriétaire." },
                    { quoted: msg }
                );
            }

            if (args[1] === 'off') {
                AUTO_RESPONSE_ENABLED = false;
                saveState();
                return sock.sendMessage(
                    remoteJid,
                    { text: "⛔ Auto-response désactivée." },
                    { quoted: msg }
                );
            }

            if (args[1] === 'on') {
                AUTO_RESPONSE_ENABLED = true;
                saveState();
                return sock.sendMessage(
                    remoteJid,
                    { text: "✅ Auto-response activée." },
                    { quoted: msg }
                );
            }

            return sock.sendMessage(
                remoteJid,
                { text: "Usage: *autoresponse on/off" },
                { quoted: msg }
            );
        }

        if (!AUTO_RESPONSE_ENABLED) return;

        updateMemory(senderId, "User", rawText);
        const history = getHistory(senderId);

        let reply = getQuickReply(rawText);

        if (!reply) {
            try {
                reply = await callGeminiOfficial(`
Tu es un chatbot WhatsApp humain.
Réponses naturelles, courtes, emojis légers.

Historique:
${history}

Message:
"${rawText}"
                `);

                if (!reply || !reply.trim()) {
                    reply = "🤖 Hmm… redis-moi 😅";
                }
            } 
            catch (err) {
                console.error("Gemini Error:", err);
                try 
                {
                    reply = await callMetaAI(`Tu es un chatbot WhatsApp humain.
                    Réponses naturelles, courtes, emojis légers.

                    Historique:
                    ${history}

                    Message:
                    "${rawText}" `);
                } 
                catch (llamaErr) 
                {
                    try {
                        reply = await callOpenAI(`Tu es un chatbot Whatsapp humain Reponses naturelle,courtes,emojis legers 
                            Historique:
                    ${history}

                    Message:
                    "${rawText}" `);
                    }
                   catch
                   {
                    console.error("OpenAI Error:", llamaErr);
                    reply = "🤖 Oups, j'ai du mal à répondre en ce moment 😅";
                   }
                }
            }
        }

        updateMemory(senderId, "", reply);

        await sock.sendMessage(
            remoteJid,
            { text: reply },
            { quoted: msg }
        );

    } catch (err) {
        console.error("AutoResponse Error:", err);
    }
}

module.exports = autoResponse;