// Supprimer un utilisateur du groupe
async function removeCommand({ sock, msg, args, replyWithTag }) {
    const remoteJid = msg.key.remoteJid;

    // Vérifie si c'est un groupe
    if (!remoteJid.endsWith('@g.us')) {
        return await replyWithTag(
            sock,
            remoteJid,
            msg,
            "❌ Cette commande fonctionne uniquement dans les groupes."
        );
    }

    try {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;

        const botNumber = sock.user.id.split(':')[0];
        const senderNumber = msg.key.participant
            ? msg.key.participant.split('@')[0]
            : msg.key.remoteJid.split('@')[0];

        // Vérifie si le bot est admin
        const botParticipant = participants.find(
            p => p.id.split('@')[0] === botNumber
        );

        if (!botParticipant || !botParticipant  .admin) {
            return await replyWithTag(
                sock,
                remoteJid,
                msg,
                "❌ Je dois être administrateur pour supprimer des membres."
            );
        }

        // Vérifie si l'utilisateur est admin ou owner
        const senderParticipant = participants.find(
            p => p.id.split('@')[0] === senderNumber
        );

        const isOwner =
            (senderNumber + '@s.whatsapp.net') === sock.user.id ||
            (process.env.OWNER_NUMBER &&
                process.env.OWNER_NUMBER.includes(senderNumber));

        if (!isOwner && (!senderParticipant || !senderParticipant.admin)) {
            return await replyWithTag(
                sock,
                remoteJid,
                msg,
                "❌ Seuls les administrateurs peuvent supprimer des membres."
            );
        }

        // 🔹 Récupération des numéros
        let numbersToRemove = [];

        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        numbersToRemove.push(...mentionedJids.map(jid => jid.split('@')[0]));

        if (args.length > 0) {
            const argsNumbers = args.filter(arg => /^\d+$/.test(arg));
            numbersToRemove.push(...argsNumbers);
        } else if (mentionedJids.length === 0) {
            return await replyWithTag(
                sock,
                remoteJid,
                msg,
                "❌ Veuillez mentionner ou fournir les numéros à supprimer."
            );
        }

        // Supprimer les membres
        for (const number of numbersToRemove) {
            const jidToRemove = number + '@s.whatsapp.net';
            await sock.groupParticipantsUpdate(remoteJid, [jidToRemove], 'remove');
        }

        await replyWithTag(
            sock,
            remoteJid,
            msg,
            `✅ Membres supprimés : ${numbersToRemove.join(', ')}`
        );
    } catch (err) {
        console.error('Remove Command Error:', err);
        await replyWithTag(
            sock,
            remoteJid,
            msg,
            "❌ Une erreur est survenue lors de la suppression des membres."
        );
    }
}

module.exports = {
    name: 'remove',
    description: 'Supprime un membre du groupe (admin uniquement)',
    run: removeCommand
};