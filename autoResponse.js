const { callGeminiOfficial } = require('./commands/ai');

// Objet pour stocker les utilisateurs déjà répondu
const alreadyReplied = {};

async function autoResponse(msg, sock) {
    try {
        if (msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const isDM = !isGroup;

        let text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text;

        if (!text) return;

        text = text.toLowerCase().trim();

        // Détection mention en groupe
        let isMentioned = false;
        if (isGroup) {
            const mentions =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            isMentioned = mentions.includes(botJid);
        }

        // 👉 Déclenchement uniquement en privé OU mention
        if (!(isDM || isMentioned)) return;

        console.log('🤖 AutoResponse:', text);

        let reply = null;

        if (/(bonjour|salut|bjr|yo|asser|on dit quoi)/i.test(text)) {
            reply = "Salut 👋 comment tu vas ?";
        }
        else if (/ça va|cv/i.test(text)) {
            reply = "Oui ça va très bien 😄 et toi ?";
        }
        else if (/bien|cool|nickel/i.test(text)) {
            reply = "Parfait alors 😎";
        }
        else if (/merci|thanks/i.test(text)) {
            reply = "Avec plaisir 🤖";
        }
        else if (/au revoir|bye|cya/i.test(text)) {
            reply = "Au revoir 👋 à bientôt !";
        }
        else if (/comment tu t'appelles|ton nom/i.test(text)) {
            reply = "Je suis un bot 🤖 créé par mon propriétaire.";
        }
        else if (/qui est ton créateur|qui t'a créé/i.test(text)) {
            reply = "Mon créateur est un développeur passionné qui m'a programmé pour répondre à vos messages !";
        }
        else if (/aide|help/i.test(text)) {
            reply = "Je suis un bot de réponse automatique 🤖. Je peux répondre à des salutations, des questions simples, et plus encore ! Essayez de me dire bonjour ou de me poser une question.";
        }
        else if (/blague|joke/i.test(text)) {
            reply = "Pourquoi les développeurs n'aiment-ils pas la nature ? Parce qu'elle a trop de bugs ! 😄";
        }

        // IA si aucune réponse prédéfinie
        if (!reply) {
            // Vérifie si l'utilisateur a déjà reçu une réponse automatique
            if (alreadyReplied[remoteJid]) {
                console.log('❌ Déjà répondu automatiquement à cet utilisateur.');
                return; // ne rien faire
            }

            // Marquer comme déjà répondu
            alreadyReplied[remoteJid] = true;

            reply = "🤖 Aucune reponse a ce sujet . . .\n 😪 bah veuillez patienter mon proprietaire \n";
        }

        await sock.sendMessage(
            remoteJid,
            { text: reply },
            { quoted: msg }
        );

    } catch (err) {
        console.error('AutoResponse Error:', err);
    }
};

module.exports = autoResponse;
