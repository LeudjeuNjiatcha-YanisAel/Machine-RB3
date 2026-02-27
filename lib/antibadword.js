const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// Charger la configuration antibadword
function loadAntibadwordConfig(groupId) {
    try {
        const configPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = JSON.parse(fs.readFileSync(configPath));
        return data?.antibadword?.[groupId] || {};
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la configuration antibadword :', error.message);
        return {};
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*CONFIGURATION ANTIBADWORD*\n\n**antibadword on*\nActiver l’antibadword\n\n**antibadword set <action>*\nDéfinir l’action : delete/kick/warn\n\n**antibadword off*\nDésactiver l’antibadword dans ce groupe`
        }, { quoted: message });
    }

    if (match === 'on') {
        const existingConfig = await getAntiBadword(chatId, 'on');
        if (existingConfig?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword est déjà activé pour ce groupe*' });
        }
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, { text: '*AntiBadword a été activé. Utilisez *antibadword set <action> pour personnaliser l’action*' }, { quoted: message });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword est déjà désactivé pour ce groupe*' }, { quoted: message } );
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '*AntiBadword a été désactivé pour ce groupe*' }, { quoted: message } );
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];
        if (!action || !['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, { text: '*Action invalide. Choisissez : delete, kick ou warn*' }, { quoted: message } );
        }
        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, { text: `*Action AntiBadword définie sur : ${action}*` }, { quoted: message } );
    }

    return sock.sendMessage(chatId, { text: '*Commande invalide. Utilisez *antibadword pour voir l’utilisation*' }, { quoted: message } );
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {

    if (!chatId.endsWith('@g.us')) return;
    if (message.key.fromMe) return;

    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) return;

    const cleanMessage = userMessage
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const badWords = [
        "imbecile","chyeng","chien","enculer","modia","cu","merde","conard","salo",
        "bete","bet","connard","pute","fdp","pd","salope","encule",
        "ta mere","ta mère","nique ta mere","nique ta mère",
        "ta mère est une pute"
    ];

    const containsBadWord = badWords.some(bad =>
        bad.includes(' ')
            ? cleanMessage.includes(bad)
            : cleanMessage.split(' ').includes(bad)
    );

    if (!containsBadWord) return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find(p => p.id === botId);
    if (!bot?.admin) return;

    const participant = groupMetadata.participants.find(p => p.id === senderId);
    if (participant?.admin) return;

    // 🔥 SUPPRESSION DU MESSAGE
    await sock.sendMessage(chatId, {
        delete: {
            remoteJid: chatId,
            fromMe: false,
            id: message.key.id,
            participant: senderId
        }
    });

    switch (antiBadwordConfig.action) {

        case 'delete':
            await sock.sendMessage(chatId, {
                text: `*@${senderId.split('@')[0]} les mots interdits ne sont pas autorisés ici*`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            break;

        case 'warn':
            const warningCount = await incrementWarningCount(chatId, senderId);
            if (warningCount >= 3) {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await resetWarningCount(chatId, senderId);
            } else {
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} avertissement ${warningCount}/3*`,
                    mentions: [senderId]
                });
            }
            break;
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};
