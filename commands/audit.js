const { log } = require('node:console');
const { getUserCommands, getStats, logBotMessage } = require('../lib/audit');

async function auditCommand(sock, msg) {

    const stats = getStats();
    const chatId = msg.key.remoteJid;

    let mention = null;

        // 🔎 1️⃣ Mention officielle WhatsApp
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.mentionedJid?.length > 0) {
            mention = contextInfo.mentionedJid[0];
        }

        // 🔎 2️⃣ Fallback : récupération depuis texte brut
        if (!mention) {
            const text =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                '';

            const match = text.match(/@(\d+)/);
            if (match) {
                mention = match[1] + '@s.whatsapp.net';
            }
        }
    let text = `
╭━━━〔 📊 *BOT AUDIT* 〕━━━⬣
┃ 👤 *Messages reçus* : ${stats.totalMessages}
┃ ⚙️ *Commandes utilisées* : ${stats.totalCommands}
┃ 🤖 *Réponses du bot* : ${stats.totalBotMessages}
╰━━━━━━━━━━━━━━━━⬣
`;

    // 🔍 AUDIT UTILISATEUR
    if (mention) {

        const userCommands = getUserCommands(mention);

        text += `
╭━━━〔 👤 *UTILISATEUR* 〕━━━⬣
┃ 🧾 *Nom* : @${mention.split('@')[0]}
┃ 📌 *Total commandes* : ${userCommands.length}
╰━━━━━━━━━━━━━━━━⬣
`;

        if (userCommands.length > 0) {
            text += `\n📜 *5 Dernières commandes :*\n\n`;

            userCommands
                .slice(-5)
                .reverse()
                .forEach((c, i) => {
                    text += ` ${i + 1}. 📘 *${c.command}*\n    🕒 ${new Date(c.time).toLocaleString()}\n\n`;
                });
        } else {
            text += `\n❌ Aucune commande enregistrée.\n`;
        }

        await sock.sendMessage(chatId, {
            text,
            mentions: [mention]
        }, { quoted: msg });
        logBotMessage(chatId,text);
        return;
    }

    // 📌 Dernière commande globale
    if (stats.lastCommand) {
        text += `
╭━━〔 🕒 *DERNIÈRE COMMANDE* 〕⬣
┃ ⚡ ${stats.lastCommand.command}
┃ 👤*Identifiant lid* : @${stats.lastCommand.sender.split('@')[0]}
┃ 🕒 *Date :* ${new Date(stats.lastCommand.time).toLocaleString()}
╰━━━━━━━━━━━━━━━━⬣
`;
    }

    await sock.sendMessage(chatId, { text }, { quoted: msg });
}

module.exports = auditCommand;