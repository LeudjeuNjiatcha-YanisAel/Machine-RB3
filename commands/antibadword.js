const { handleAntiBadwordCommand } = require('../lib/antibadword');

async function antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin) {
    try {
        if (!isSenderAdmin) {
            return await sock.sendMessage(
                chatId,
                { text: '```Pour Groupe Admins Seulement!```' },
                { quoted: message }
            );
        }

        // ✅ Récupération complète du texte
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            '';

        const match = text.trim().split(/\s+/).slice(1).join(' ');

        await handleAntiBadwordCommand(sock, chatId, message, match);

    } catch (error) {
        console.error('❌ Error in antibadword command:', error);
        await sock.sendMessage(
            chatId,
            { text: '*Erreur lors du traitement de la commande antibadword*' },
            { quoted: message }
        );
    }
}

module.exports = antibadwordCommand;