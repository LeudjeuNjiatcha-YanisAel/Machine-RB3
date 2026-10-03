const fs = require('fs');
const path = require('path');
const { asyncLocalStorage } = require('../lib/context');

function getWarningsFilePath() {
    const botNumber = asyncLocalStorage.getStore();
    const filename = botNumber ? `../data/${botNumber}/warnings.json` : '../data/warnings.json';
    return path.join(__dirname, filename);
}

function loadWarnings() {
    const filePath = getWarningsFilePath();
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function warningsCommand(sock, chatId, mentionedJidList) {
    const warnings = loadWarnings();

    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: 'Svp mentionner un utilisateur pour verifier avertissement.' });
        return;
    }

    const userToCheck = mentionedJidList[0];
    // Fix: query warning count from the group JID context, matching warn.js structure
    const warningCount = warnings[chatId]?.[userToCheck] || 0;

    await sock.sendMessage(chatId, { text: `L'utilisateur a ${warningCount} avertissement(s) dans ce groupe.` });
}

module.exports = warningsCommand;
