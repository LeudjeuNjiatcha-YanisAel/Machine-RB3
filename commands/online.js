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

        let text = `╔════════════════════╗
👥 *ACTIVITÉ DU GROUPE*
╚════════════════════╝

`;

        const mentions = [];
        const now = Date.now();

        participants.forEach((p, i) => {
            const jid = p.id;
            const num = jid.split('@')[0];
            mentions.push(jid);

            let status = '🔴 Inactif';
            if (lastActivity[jid]) {
                const diff = now - lastActivity[jid];

                if (diff < 5 * 60 * 1000) status = '🟢 Actif';
                else if (diff < 60 * 60 * 1000) status = '🟡 Vu récemment';
            }

            text += `🔹 ${i + 1}. @${num} — ${status}\n`;
        });

        text += `_basé sur la dernière interaction avec le bot_`;

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
