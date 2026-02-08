const insults = [
    "C'est une honte pour ta famille!",
    "Tu as le QI d'une huître!",
    "Tu es fiere de ta nullité?",
    "Va la bas dechet!",
    "Sale Con!",
    "Idiot",
    "Crétin",
    "Imbécile",
    "Sale Chien!",
    "Débile",
    "Abruti",
    "Ton cerveau est en mode avion!",
    "Regarde comment tu fais les trucs de yaourt-nature!",
    "Je vais te giffler!",
    "Kungnaffe!",
    "Salopard!",
    "Ton modia petit frere!",
    "T'es qu'une merde!",
    "Espèce de tocard!",
    "je vais demander a machine de pirater ton compte!",
    "Ekiee dont touch me!",
];

async function insultCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId });
            return;
        }

        let userToInsult;
        
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToInsult = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToInsult) {
            await sock.sendMessage(chatId, { 
                text: 'Veuillez Mentionner Une Personne Pour l\'insulter!'
            });
            return;
        }

        const insult = insults[Math.floor(Math.random() * insults.length)];

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Hey @${userToInsult.split('@')[0]}, ${insult}`,
            mentions: [userToInsult]
        });
    } catch (error) {
        console.error('Error in insult command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '🙏 Veuillez Reessayer Apres qq secondes 🙏.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ Une erreur est survenue lors de l\'exécution de la commande d\'insulte.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = { insultCommand };
