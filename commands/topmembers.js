const fs = require('fs');
const path = require('path');

function getDataFilePath(botNumber) {
    return path.join(__dirname, '..', 'data', `${botNumber}_messageCount.json`);
}

function loadMessageCounts(botNumber) {
    const dataFilePath = getDataFilePath(botNumber);
    if (fs.existsSync(dataFilePath)) {
        try {
            const data = fs.readFileSync(dataFilePath, 'utf8');
            const parsed = JSON.parse(data);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (err) {
            console.error('Erreur lecture messageCount.json:', err);
            return {};
        }
    }
    return {};
}


function saveMessageCounts(botNumber, messageCounts) {
    const dataFilePath = getDataFilePath(botNumber);
    fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(botNumber, groupId, userId) {
    const messageCounts = loadMessageCounts(botNumber);

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;

    saveMessageCounts(botNumber, messageCounts);
}

function topMembers(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'Cette Commande est seulement dispo pour les groups.' });
        return;
    }

    const botNumber = sock.user.id.split(':')[0];
    const messageCounts = loadMessageCounts(botNumber);
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Get top 5 members

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { text: 'Aucune Activite Enregistrer.' });
        return;
    }

    let message = '🏆 Top Members Basee sur les messages Compter:\n\n';
    sortedMembers.forEach(([userId, count], index) => {
        message += `${index + 1}. @${userId.split('@')[0]} - ${count} messages\n`;
    });

    sock.sendMessage(chatId, { text: message, mentions: sortedMembers.map(([userId]) => userId) });
}

module.exports = { incrementMessageCount, topMembers };
