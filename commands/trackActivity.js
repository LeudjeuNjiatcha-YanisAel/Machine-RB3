// Stocke la dernière activité des utilisateurs
const lastActivity = {};

function trackActivity(message) {
    const jid = message.key?.participant || message.key?.remoteJid;
    if (jid) {
        lastActivity[jid] = Date.now();
    }
}

module.exports.trackActivity = {trackActivity,lastActivity};