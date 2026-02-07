const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔═════════════════════╗
║        🤖 *${settings.botName || 'MachineBot-RB3'}*        ║
║─────────────────────║
║ 📌 Version : *${settings.version || '3.0.0'}*
║ 👤 Dev     : ${settings.botOwner || 'Mr Robot'}
║ 📺 YouTube : ${global.ytch}
╚═════════════════════╝

🌟 *MENU DES COMMANDES* 🌟

━━━━━━━━━━━━━━━━━━━━━━
🌐 *COMMANDES GÉNÉRALES*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *.help | .menu*
▫️ *.ping* 
▫️ *.alive*
▫️ *.tts <texte>*
▫️ *.owner* 
▫️ *.news* 
▫️ *.groupinfo*  
▫️ *.extract*
▫️ *.autoreact <on/off>*
▫️ *.autostatus <on/off>*
▫️ *.autoread <on/off>*
▫️ *.delete number_message*
▫️ *.sticker*
▫️ *.tagall* 
▫️ *.tagnotadmin*
▫️ *.sudo*
▫️ *.chatbot <on/off>*
▫️ *.*

━━━━━━━━━━━━━━━━━━━━━━
🎮 *JEUX*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *.tictactoe @user*
▫️ *.hangman*
▫️ *.guess <lettre>*
▫️ *.trivia*
▫️ *.answer <réponse>*
▫️ *.truth*

━━━━━━━━━━━━━━━━━━━━━━
🤖 *INTELLIGENCE ARTIFICIELLE*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *.gpt <question>*
▫️ *.gemini <question>*
▫️ *.imagine <prompt>*
▫️ *.flux <prompt>*
▫️ *.sora <prompt>*


━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOAD*
━━━━━━━━━━━━━━━━━━━━━━
▫️ *.play <musique>*
▫️ *.song <musique>*
▫️ *.spotify <recherche>*
▫️ *.instagram <lien>*
▫️ *.facebook <lien>*
▫️ *.tiktok <lien>*
▫️ *.ytmp4 <lien>*
 ✨
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
