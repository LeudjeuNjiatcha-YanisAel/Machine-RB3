const aiService = require('../command/ai');

module.exports = async (msg, sock) => {
    try {
        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const isDM = remoteJid.endsWith('@s.whatsapp.net');

        if (!msg.message) return;

        let text = "";
        let isMentioned = false;

        // Texte simple
        if (msg.message.conversation) {
            text = msg.message.conversation;
        }

        // Texte avec mention
        if (msg.message.extendedTextMessage) {
            text = msg.message.extendedTextMessage.text;
            const mentions = msg.message.extendedTextMessage.contextInfo?.mentionedJid || [];
            isMentioned = mentions.includes(sock.user.id);
        }

        if (!text) return;

        // 👉 Déclencheur
        if (!isDM && !(isGroup && isMentioned)) return;

        console.log("Message reçu :", text);

        // Détection de salutations
        const greetings = ['salut', 'bonjour', 'coucou', 'hello', 'hi', 'hey', 'yo'];
        const lowerText = text.toLowerCase();
        const isGreeting = greetings.some(g => lowerText.includes(g));

        if (!isGreeting) {
            console.log("Pas une salutation → ignoré");
            return;
        }

        // Appel IA
        const aiResponse = await aiService.getAIResponse(text);

        await sock.sendMessage(
            remoteJid,
            { text: aiResponse },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Erreur auto-reply:", err);
    }
};
