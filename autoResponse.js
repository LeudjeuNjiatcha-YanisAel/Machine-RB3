const { callGeminiOfficial } = require('./commands/ai');

async function autoResponse (msg, sock) {
    try {
        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const isDM = !isGroup;

        let text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text;

        if (!text) return;

        text = text.toLowerCase().trim();

        // Détection mention en groupe
        let isMentioned = false;
        if (isGroup) {
            const mentions =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            isMentioned = mentions.includes(botJid);
        }

        // 👉 Déclenchement uniquement en privé OU mention
        if (!(isDM || isMentioned)) return;

        console.log('🤖 AutoResponse:', text);

        let reply = null;

        if (/(bonjour|salut|bjr|yo|asser)/i.test(text)) {
            reply = "Salut 👋 comment tu vas ?";
        }
        else if (/ça va|cv/i.test(text)) {
            reply = "Oui ça va très bien 😄 et toi ?";
        }
        else if (/bien|cool|nickel/i.test(text)) {
            reply = "Parfait alors 😎";
        }
        else if (/merci|thanks/i.test(text)) {
            reply = "Avec plaisir 🤖";
        }

        // IA si aucune réponse prédéfinie
        if (!reply) {
            try {
                reply = await callGeminiOfficial(text);
            } catch (e) {
                console.error('Gemini error:', e.message);
                reply = "🤖 Erreur IA, réessaie plus tard.";
            }
        }

        await sock.sendMessage(
            remoteJid,
            { text: reply },
            { quoted: msg }
        );

    } catch (err) {
        console.error('AutoResponse Error:', err);
    }
};

module.exports = autoResponse;
