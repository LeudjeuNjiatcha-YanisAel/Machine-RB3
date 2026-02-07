const settings = require("../settings");
async function aliveCommand(sock, chatId, message) {
    try {
        const message1 = `*🤖 Machine Bot est Actif !*\n\n` +
                       `*Version :* ${settings.version}\n` +
                       `*Statut :* En ligne\n` +
                       `*Mode :* Public\n\n` +
                       `*🌟 Fonctionnalités :*\n` +
                       `• Gestion des groupes\n` +
                       `• Protection Anti-lien\n` +
                       `• Commandes amusantes\n` +
                       `• Et bien plus encore !\n\n` +
                       `Tapez *.menu* pour voir la liste complète des commandes`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'MachineBot V3',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Erreur dans la commande alive :', error);
        await sock.sendMessage(chatId, { text: 'Le bot est actif et fonctionne !' }, { quoted: message });
    }
}

module.exports = aliveCommand;
