async function onlineCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande fonctionne uniquement dans les groupes.'
            }, { quoted: message });
            return;
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ Impossible de récupérer les membres du groupe.'
            }, { quoted: message });
            return;
        }

        let text = `╔══════════════════╗
👥 *MEMBRES DU GROUPE*
╚══════════════════╝

👤 Total : *${participants.length}*

`;

        const mentions = [];

        participants.forEach((p, i) => {
            const jid = p.id;
            const num = jid.split('@')[0];
            mentions.push(jid);
            text += `🔹 ${i + 1}. @${num}\n`;
        });

        text += `\nℹ️ _Erreur Lors De La Recuperation membres en ligne dans un groupe_`;

        await sock.sendMessage(chatId, {
            text,
            mentions
        }, { quoted: message });

    } catch (err) {
        console.error('[ONLINE] Erreur :', err);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue.'
        }, { quoted: message });
    }
}

module.exports = onlineCommand;
