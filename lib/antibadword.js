const {
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    incrementWarningCount,
    resetWarningCount
} = require('../lib/index');

/* =====================================================
   COMMANDE ANTIBADWORD
===================================================== */

async function handleAntiBadwordCommand(sock, chatId, message, match) {

    if (!match) {
        return sock.sendMessage(chatId, {
            text:
`*CONFIGURATION ANTIBADWORD*

*antibadword on*
Activer l’antibadword

*antibadword set <action>*
Actions disponibles : delete | kick | warn

*antibadword off*
Désactiver l’antibadword`
        }, { quoted: message });
    }

    if (match === 'on') {
        const config = await getAntiBadword(chatId);

        if (config?.enabled)
            return sock.sendMessage(chatId,
                { text: '*AntiBadword déjà activé*' },
                { quoted: message }
            );

        await setAntiBadword(chatId, true, 'delete');

        return sock.sendMessage(chatId, {
            text: '*✅ AntiBadword activé*\nUtilisez *antibadword set delete|kick|warn*'
        }, { quoted: message });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId);

        if (!config?.enabled)
            return sock.sendMessage(chatId,
                { text: '*AntiBadword déjà désactivé*' },
                { quoted: message }
            );

        await removeAntiBadword(chatId);

        return sock.sendMessage(chatId,
            { text: '*✅ AntiBadword désactivé*' },
            { quoted: message }
        );
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];

        if (!['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, {
                text: '*Action invalide : delete | kick | warn*'
            }, { quoted: message });
        }

        await setAntiBadword(chatId, true, action);

        return sock.sendMessage(chatId,
            { text: `*✅ Action définie : ${action}*` },
            { quoted: message }
        );
    }
}


/* =====================================================
   DETECTION MOTS INTERDITS
===================================================== */

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {

    console.log("🔥 AntiBadword appelé");

    if (!chatId.endsWith('@g.us')) {
        console.log("❌ Pas un groupe");
        return;
    }

    if (!userMessage) {
        return;
    }

    if (message.key.fromMe) {
        return;
    }

    const config = await getAntiBadword(chatId);

    console.log("CONFIG:", config);

    if (!config?.enabled) {
        console.log("❌ AntiBadword désactivé");
        return;
    }

    /* ---------- Nettoyage ---------- */

    const cleanMessage = userMessage
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    console.log("Clean:", cleanMessage);

    const badWords = [
        "imbecile","chyeng","chien","enculer","modia","cu","merde",
        "conard","connard","pute","fdp","pd","salope","encule",
        "ta mere","nique ta mere","ta mere est une pute"
    ];

    const containsBadWord =
        badWords.some(word => cleanMessage.includes(word));

    console.log("Badword detected:", containsBadWord);

    if (!containsBadWord) return;

    console.log("📡 Récupération metadata groupe...");

    const groupMetadata = await sock.groupMetadata(chatId);

    const normalize = (id) =>
        id?.split('@')[0]?.split(':')[0];

    const botNumber = normalize("136966976892958@lid");

        console.log("🤖 BOT NUMBER:", botNumber);
        console.log("👥 Participants:");

        groupMetadata.participants.forEach(p => {
            console.log(
                " -",
                normalize(p.id),
                "| admin:",
                p.admin
            );
        });

        const bot = groupMetadata.participants.find(p =>
            normalize(p.id) === botNumber
        );

        console.log("BOT OBJECT:", bot);

        if (!bot) {
            console.log("❌ Bot introuvable dans participants");
            return;
        }

        console.log("BOT ADMIN:", bot.admin);

        if (bot.admin !== "admin" && bot.admin !== "superadmin") {
            console.log("❌ Bot pas admin");
            return;
        }

        console.log("✅ Bot confirmé admin");

            const senderNumber =
                senderId.split('@')[0].split(':')[0];

            const participant = groupMetadata.participants.find(p =>
                p.id.split('@')[0].split(':')[0] === senderNumber
            );

            if (participant?.admin === "admin" ||
                participant?.admin === "superadmin") {

                console.log("❌ Admin ignoré");
                return;
            }

    /* ---------- SUPPRESSION ---------- */

    console.log("🧹 Tentative suppression message");

    try {
        await sock.sendMessage(chatId, {
            delete: message.key
        });

        console.log("✅ Message supprimé");

    } catch (e) {
        console.log("❌ Suppression échouée:", e.message);
    }

    /* ---------- ACTION ---------- */

    console.log("⚙️ Action choisie:", config.action);

    switch (config.action) {

        case 'delete':
            console.log("📢 Envoi avertissement texte");
            await sock.sendMessage(chatId, {
                text: `🚨 MOT INTERDIT DETECTÉ`
            });
            await sock.sendMessage(chatId, {
                text: `*@${senderNumber} mots interdits.\nNe réutilisez pas ce type de langage dans ce groupe.*`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            console.log("👢 Kick utilisateur");

            await sock.groupParticipantsUpdate(
                chatId,
                [senderId],
                'remove'
            );
            break;

        case 'warn':

            console.log("⚠️ Warning utilisateur");

            const warningCount =
                await incrementWarningCount(chatId, senderId);

            console.log("Warnings:", warningCount);

            if (warningCount >= 3) {

                console.log("🚫 Expulsion après 3 warnings");

                await sock.groupParticipantsUpdate(
                    chatId,
                    [senderId],
                    'remove'
                );

                await resetWarningCount(chatId, senderId);

            } else {

                await sock.sendMessage(chatId, {
                    text: `*@${senderNumber} avertissement ${warningCount}/3*`,
                    mentions: [senderId]
                });
            }
            break;

        default:
            console.log("❌ Action inconnue:", config.action);
    }
}

/* ===================================================== */

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};