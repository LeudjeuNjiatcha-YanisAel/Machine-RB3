const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        await sock.sendMessage(chatId, { text: 'Pong! 🏓' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);


        // 📡 Latence API WhatsApp
        const apiStart = Date.now();
        await sock.sendPresenceUpdate('composing', chatId);
        const apiLatency = Date.now() - apiStart;

        let statusIcon = "🟢";
        let statusText = "Excellent";

        if (ping > 600) {
            statusIcon = "🔴";
            statusText = "Faible";
        } else if (ping > 200) {
            statusIcon = "🟡";
            statusText = "Moyen";
        }

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        const platform = os.platform();
        const nodeVersion = process.version;
        const now = new Date().toLocaleString();
        const botInfo = `
╭━━≼〔 🚀 *MachineBot Status* 〕≽━━╮
│ 📶 *Ping*     : _${ping} ms_ ${statusIcon} (_${statusText}_)
│ 📡 *Latence API* : _${apiLatency} ms_
│ ⏱️ *Uptime*   : _${uptimeFormatted}_
│ 🔖 *Version*  : _v${settings.version}_
│ 🌐 *Platform* : _${platform}_
│ 📦 *NodeJS*   : _${nodeVersion}_
│ 🕒 *Heure*     : _${now}_
│
╰───≼  🤖 By *Machine* ≽──╯`.trim();

        // Reply to the original message with the bot info
        await sock.sendMessage(chatId, { text: botInfo},{ quoted: message });

    } catch (error) {
        console.error('Erreur dans ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' });
    }
}

module.exports = pingCommand;
