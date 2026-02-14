const { callGeminiOfficial } = require('./commands/ai');

/**
 * 🔐 CONFIGURATION
 * Remplace par TON numéro WhatsApp (format international)
 * Exemple : 2376XXXXXXXX@s.whatsapp.net
 */
const OWNER_JID = "237682441127@s.whatsapp.net";

// ===== ÉTAT GLOBAL =====
let AUTO_RESPONSE_ENABLED = true;

// ===== MÉMOIRE DES CONVERSATIONS (5 derniers messages) =====
const conversationMemory = {}; // { userId: [msg1, msg2, ...] }

// ===== AUTO RESPONSE =====
async function autoResponse(msg, sock) {
    try {
        if (!msg) return;
        if (!msg.key) return;
        if (!msg.key.remoteJid) return;

        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const isDM = !isGroup;

        const senderId = isGroup
            ? msg.key.participant
            : remoteJid;

        let text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text;

        if (!text) return;

        const rawText = text.trim();
        const lowerText = rawText.toLowerCase();

        // ===== DÉTECTION MENTION =====
        let isMentioned = false;
        if (isGroup) {
            const mentions =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            isMentioned = mentions.includes(botJid);
        }
        console.log("Sender:", senderId, "Message:", lowerText);

        // ===== COMMANDES OWNER ONLY =====

            if (lowerText === '*autoresponse off') {
                AUTO_RESPONSE_ENABLED = false;
                await sock.sendMessage(remoteJid, {
                    text: "⛔ Auto-response désactivée par le propriétaire"
                }, { quoted: msg });
                return;
            }

            if (lowerText === '*autoresponse on') {
                AUTO_RESPONSE_ENABLED = true;
                await sock.sendMessage(remoteJid, {
                    text: "✅ Auto-response activée par le propriétaire"
                }, { quoted: msg });
                return;
            }


        // ===== BLOQUAGE SI DÉSACTIVÉ =====
        if (!AUTO_RESPONSE_ENABLED) return;

        // ===== DÉCLENCHEMENT =====
        if (!(isDM || isMentioned)) return;

        console.log("🤖 AutoResponse:", rawText);

        // ===== MÉMOIRE UTILISATEUR =====
        if (!conversationMemory[senderId]) {
            conversationMemory[senderId] = [];
        }

        conversationMemory[senderId].push(`User: ${rawText}`);

        if (conversationMemory[senderId].length > 5) {
            conversationMemory[senderId].shift();
        }

        const history = conversationMemory[senderId].join('\n');

        let reply = null;

        // ===== RÉPONSES RAPIDES =====
        if (/(bonjour|salut|bjr|yo|on dit quoi)/i.test(lowerText)) {
            reply = "Salut 👋 comment tu vas ?";
        }
        else if (/(ça va|cv|yes bg)/i.test(lowerText)) {
            reply = "Oui ça va très bien 😄 et toi ?";
        }
        else if (/(bien|cool|nickel)/i.test(lowerText)) {
            reply = "Parfait alors 😎";
        }
        else if (/(merci|thanks)/i.test(lowerText)) {
            reply = "Avec plaisir 🤖";
        }
        else if (/(au revoir|bye)/i.test(lowerText)) {
            reply = "À bientôt 👋";
        }
        else if (/(ton nom|comment tu t'appelles)/i.test(lowerText)) {
            reply = "Je suis un bot WhatsApp 🤖";
        }
        else if (/(aide|help)/i.test(lowerText)) {
            reply = "Je peux discuter et répondre intelligemment 😉";
        }
        else if (/(blague|joke)/i.test(lowerText)) {
            reply = "Pourquoi les devs aiment la nuit ? Parce que les bugs dorment 😄";
        }

        // ===== IA (GEMINI) =====
        if (!reply) {
            try {
                await new Promise(r => setTimeout(r, 1200)); // anti-spam

                reply = await callGeminiOfficial(`
Tu es un chatbot WhatsApp humain, naturel et cool.
Réponses courtes, simples, pas comme une IA.

Historique récent :
${history}

Message actuel :
"${rawText}"

Réponds de manière conversationnelle.
                `);

                if (!reply || !reply.trim()) {
                    reply = "🤖 Hmm… dis-moi encore 😅";
                }

            } catch (err) {
                console.error("❌ Gemini error:", err.message);
                reply = "😅 Petit bug, réessaie.";
            }
        }

        // ===== MÉMOIRE BOT =====
        conversationMemory[senderId].push(`Bot: ${reply}`);
        if (conversationMemory[senderId].length > 5) {
            conversationMemory[senderId].shift();
        }

        // ===== ENVOI =====
        await sock.sendMessage(
            remoteJid,
            { text: reply },
            { quoted: msg }
        );

    } catch (err) {
        console.error("❌ AutoResponse Error:", err);
    }
}

module.exports = autoResponse;
