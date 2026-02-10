const axios = require('axios');

async function characterCommand(sock, chatId, message) {
    let userToAnalyze;
    
    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToAnalyze) {
        await sock.sendMessage(chatId, { 
            text: 'Veuillez mentionner quelqu’un ou répondre à son message pour analyser son caractère !', 
        });
        return;
    }

    try {
        // Get user's profile picture
        let profilePic;
        try {
            profilePic = await sock.profilePictureUrl(userToAnalyze, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // Image par défaut si aucune photo de profil
        }

        const traits = [
            "Intelligent", "Créatif", "Déterminé", "Ambitieux", "Attentionné",
            "Charismatique", "Confiant", "Empathique", "Énergique", "Amical",
            "Généreux", "Honnête", "Humoristique", "Imaginatif", "Indépendant",
            "Intuitif", "Gentil", "Logique", "Loyal", "Optimiste",
            "Passionné", "Patient", "Persévérant", "Fiable", "Ingénieux",
            "Sincère", "Réfléchi", "Compréhensif", "Polyvalent", "Sage"
        ];

        // Get 3-5 random traits
        const numTraits = Math.floor(Math.random() * 3) + 3; // Nombre aléatoire entre 3 et 5
        const selectedTraits = [];
        for (let i = 0; i < numTraits; i++) {
            const randomTrait = traits[Math.floor(Math.random() * traits.length)];
            if (!selectedTraits.includes(randomTrait)) {
                selectedTraits.push(randomTrait);
            }
        }

        // Calculate random percentages for each trait
        const traitPercentages = selectedTraits.map(trait => {
            const percentage = Math.floor(Math.random() * 41) + 60; // Nombre aléatoire entre 60 et 100
            return `${trait} : ${percentage}%`;
        });

        // Create character analysis message
        const analysis = `🔮 *Analyse de caractère* 🔮\n\n` +
            `👤 *Utilisateur :* ${userToAnalyze.split('@')[0]}\n\n` +
            `✨ *Traits principaux :*\n${traitPercentages.join('\n')}\n\n` +
            `🎯 *Note globale :* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
            `Note : Cette analyse est faite pour s’amuser et ne doit pas être prise au sérieux !`;

        // Send the analysis with the user's profile picture
        await sock.sendMessage(chatId, {
            image: { url: profilePic },
            caption: analysis,
            mentions: [userToAnalyze]
        });

    } catch (error) {
        console.error('Error in character command:', error);
        await sock.sendMessage(chatId, { 
            text: 'Impossible d’analyser le caractère ! Réessayez plus tard.',
        });
    }
}

module.exports = characterCommand;
