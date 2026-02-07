// commands/pp.js
const log = require('../logger')(module);

async function viewPhotoCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        let targetUser = null;
        let deleteGroupMessages = false;

        if (isGroup) {
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else {
                await sock.sendMessage(chatId, { text: '❌ Veuillez mentionner un utilisateur ou répondre à son message.' }, { quoted: message });
                return;
            }
        } else {
            targetUser = chatId;
        }

        const chatMessages = await sock.loadMessages(chatId, 100);
        const toDelete = [];
        const seenIds = new Set();

        if (isGroup && !targetUser.endsWith('@s.whatsapp.net')) {
            deleteGroupMessages = true;
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < 10; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;
                if (participant === targetUser && !seenIds.has(m.key.id)) {
                    if (!m.message?.protocolMessage) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        }

        if (toDelete.length > 0) {
            const profilePicUrl = await sock.profilePictureUrl(targetUser, 'image').catch(() => null);
            if (profilePicUrl) {
                await sock.sendMessage(chatId, { image: { url: profilePicUrl }, caption: `📸 Photo de profil de @${targetUser.split('@')[0]}` }, { quoted: message

                });
            } else {
                await sock.sendMessage(chatId, { text: '❌ Impossible de récupérer la photo de profil.' }, { quoted: message });
            }
        } else {
            await sock.sendMessage(chatId, { text: '❌ Aucun message récent trouvé pour cet utilisateur.' }, { quoted: message });
        }

    } catch (error) {
        log.error('Erreur dans la commande chip :', error);
        await sock.sendMessage(chatId, { text: '❌ Une erreur est survenue lors de la récupération de la photo de profil.' }, { quoted: message });
    }
}
module.exports = viewPhotoCommand;