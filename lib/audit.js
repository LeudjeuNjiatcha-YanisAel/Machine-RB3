const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '../data/audit.json');

/*📥 LOAD / SAVE */
function loadAudit() {
    if (!fs.existsSync(AUDIT_FILE)) {
        return {
            messages: [],
            commands: [],
            botMessages: []
        };
    }
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
}

function saveAudit(data) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(data, null, 2));
}

/*📨 LOG MESSAGES */
function logMessage(mek) {
    if (!mek.message || mek.key.fromMe) return;

    const data = loadAudit();

    data.messages.push({
        from: mek.key.remoteJid,
        sender: mek.key.participant || mek.key.remoteJid,
        time: new Date().toISOString(),
        messageType: Object.keys(mek.message)[0]
    });

    saveAudit(data);
}

/*⚙️ LOG COMMANDES */
function logCommand(command, mek) {
    const data = loadAudit();

    data.commands.push({
        command,
        from: mek.key.remoteJid,
        sender: mek.key.participant || mek.key.remoteJid,
        time: new Date().toISOString()
    });

    saveAudit(data);
}

/*🤖 LOG MESSAGES BOT */
function logBotMessage(jid, text) {
    const data = loadAudit();

    data.botMessages.push({
        to: jid,
        text,
        time: new Date().toISOString()
    });

    saveAudit(data);
}

/*📊 STATS GLOBALES */
function getStats() {
    const data = loadAudit();

    return {
        totalMessages: data.messages.length,
        totalCommands: data.commands.length,
        totalBotMessages: data.botMessages.length,
        lastCommand: data.commands.at(-1) || null,
        data // 🔥 important : accès complet si besoin
    };
}

/*👤 COMMANDES PAR UTILISATEUR */
function getUserCommands(userJid) {
    const data = loadAudit();

    const clean = (jid) => jid?.split('@')[0];

    return data.commands.filter(cmd => 
        clean(cmd.sender) === clean(userJid)
    );
}

/*EXPORTS */
module.exports = {
    logMessage,
    logCommand,
    logBotMessage,
    getStats,
    getUserCommands
};