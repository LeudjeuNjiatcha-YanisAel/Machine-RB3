const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╭━━━〔 🤖 ${settings.botName || 'MachineBot-RB3'} 〕━━━╮
┃ ✨ Version : ${settings.version || '3.0.0'}
┃ 👤 Dev     : ${settings.botOwner || 'Mr Robot'}
┃ 📳 Contact  : 682441127
╰━━━━━━━━━━━━━━━━━━━━━━╯

🌟 *MENU PRINCIPAL* 🌟
_Tape une commande avec le préfixe (.)_

══════════════════════
🌐 *COMMANDES GÉNÉRALES*
══════════════════════
*• *help / .menu*
*• *ping*
*• *alive*
*• *tts <texte>*
*• *owner*
*• *groupinfo*
*• *osint @utilisateur*
*• *extract*
*• *topmembers*
*• *chip*
*• *delete <num_message>*
*• *sticker*
*• *tagall*
*• *character*
*• *emojimix*
*• *sudo*
*• *setpp*
*• *mute*
*• *unmute*
*• *online*
*• *compliment*
*• *insult*
*• *translate <text> <lang>*
*• *chatbot <on/off>*

══════════════════════
🎮 *JEUX*
══════════════════════
*• *tictactoe @user*
*• *hangman*
*• *guess <lettre>*
*• *answer <réponse>*
*• *capital*

══════════════════════
🤖 *INTELLIGENCE ARTIFICIELLE*
══════════════════════
*• *gpt <question>*
*• *gemini <question>*
══════════════════════
📥 *DOWNLOAD / MÉDIAS*
══════════════════════
*• *play <musique>*
*• *tiktok <lien>*
*• *ytmp4 <lien>*

══════════════════════
✨ *${settings.botName || 'MachineBot-RB3'}*
⚡ Rapide *• 🔒 Sécurisé *• 🤖 Intelligent
══════════════════════
`;
    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: helpMessage });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;
