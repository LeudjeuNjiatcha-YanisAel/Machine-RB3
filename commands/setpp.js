const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function setProfilePicture(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée uniquement au propriétaire du bot !'
            });
            return;
        }

        const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || !quoted.imageMessage) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Répondez à une *image* avec la commande *.setpp*'
            });
            return;
        }

        // Télécharger l'image
        const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Mettre à jour la photo de profil (DIRECTEMENT avec le buffer)
        await sock.updateProfilePicture(sock.user.id, buffer);

        await sock.sendMessage(chatId, {
            text: '✅ Photo de profil du bot mise à jour avec succès !'
        });

    } catch (error) {
        console.error('Erreur setpp :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de mettre à jour la photo de profil.'
        });
    }
}

module.exports = setProfilePicture;
