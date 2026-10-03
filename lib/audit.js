const fs = require('fs');
const path = require('path');

const { asyncLocalStorage } = require('./context');

function getAuditFile() {
    const botNumber = asyncLocalStorage.getStore();
    const filename = botNumber ? `../data/${botNumber}/audit.json` : '../data/audit.json';
    return path.join(__dirname, filename);
}

/*📥 LOAD / SAVE */
function loadAudit() {
    const auditFile = getAuditFile();
    if (!fs.existsSync(auditFile)) {
        return {
            messages: [],
            commands: [],
            botMessages: []
        };
    }
    try {
        return JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    } catch {
        return {
            messages: [],
            commands: [],
            botMessages: []
        };
    }
}

function saveAudit(data) {
    const auditFile = getAuditFile();
    const dir = path.dirname(auditFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(auditFile, JSON.stringify(data, null, 2));
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