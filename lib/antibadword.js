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
    const config = loadAntibadwordConfig(chatId);
    if (!config.enabled) return;

    // Ignorer si ce n’est pas un groupe
    if (!chatId.endsWith('@g.us')) return;

    // Ignorer si le message vient du bot
    if (message.key.fromMe) return;

    // Obtenir d’abord la configuration antibadword
    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) {
        console.log('Antibadword non activé pour ce groupe');
        return;
    }

    // Convertir le message en minuscules et le nettoyer
    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  
        .replace(/\s+/g, ' ')      
        .trim();

    // Liste des mots interdits
    const badWords = [
        // (Liste inchangée volontairement)
    ];
    
    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;

    for (const word of messageWords) {
        if (word.length < 2) continue;

        if (badWords.includes(word)) {
            containsBadWord = true;
            break;
        }

        for (const badWord of badWords) {
            if (badWord.includes(' ')) {
                if (cleanMessage.includes(badWord)) {
                    containsBadWord = true;
                    break;
                }
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    // Vérifier si le bot est admin avant d’agir
    const groupMetadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find(p => p.id === botId);
    if (!bot?.admin) {
        return;
    }

    // Vérifier si l’expéditeur est admin
    const participant = groupMetadata.participants.find(p => p.id === senderId);
    if (participant?.admin) {
        return;
    }

    // Supprimer immédiatement le message
    try {
        await sock.sendMessage(chatId, { 
            delete: message.key
        });
    } catch (err) {
        console.error('Erreur lors de la suppression du message :', err);
        return;
    }

    switch (antiBadwordConfig.action) {
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `*@${senderId.split('@')[0]} les mots interdits ne sont pas autorisés ici*`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} a été expulsé pour utilisation de mots interdits*`,
                    mentions: [senderId]
                });
            } catch (error) {
                console.error('Erreur lors de l’expulsion de l’utilisateur :', error);
            }
            break;

        case 'warn':
            const warningCount = await incrementWarningCount(chatId, senderId);
            if (warningCount >= 3) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `*@${senderId.split('@')[0]} a été expulsé après 3 avertissements*`,
                        mentions: [senderId]
                    });
                } catch (error) {
                    console.error('Erreur lors de l’expulsion après avertissements :', error);
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} avertissement ${warningCount}/3 pour utilisation de mots interdits*`,
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
