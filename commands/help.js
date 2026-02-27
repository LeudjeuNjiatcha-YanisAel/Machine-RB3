const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `╭━━〔 🤖 *${settings.botName || 'MachineBot-RB3'}* 〕━╮
┃ ⚡ Version : *${settings.version || '3.0.0'}*
┃ 👨‍💻 Developpeur  : *${settings.botOwner || 'Mr Robot'}*
┃ 📳 Contact : *682441127*
╰━━━━━━━━━━━━━━━━━━━╯

👑 Bienvenue dans le système.👑
_Tape une commande avec le préfixe (*)_

━━━━━━━━━━━━━━━━━━
🧠  *SYSTÈME & GÉNÉRAL*
━━━━━━━━━━━━━━━━━━
⚙️ *help / menu*  → Affiche le menu
🏓 *ping*         → Test de vitesse
🟢 *alive*        → Statut du bot
👑 *owner*        → Contacter le dev
💻 *github*       → Repo du projet
📊 *groupinfo*    → Infos du groupe
👀 *online*       → Voir activité mem
📸 *chip*         → Extraire la pp

━━━━━━━━━━━━━━━━━━
🛡️ *ADMIN & MODÉRATION*
━━━━━━━━━━━━━━━━━━
🔇 *mute* / 🔊 *unmute*
🚫 *antidelete on/off*
🏷️ *tagall*
✅ *autoread on/off*
🗑️ *delete <msg>*
🚫 *antibadword on/off*
👮 *staff*
❌ *kick* 
⭐ *sudo*
😀 *autoreact on/off*
✅ *autostatus on/off*
🖼️ *setpp*

━━━━━━━━━━━━━━━━━━
🎭 *OUTILS & UTILITAIRES*
━━━━━━━━━━━━━━━━━━
🔊 *tts <texte>* → Texte en vocal
📸 *ss* → Capture ecran
🎨 *sticker* → Convertir en sticker
😎 *character* → Trait physique
🎋 *sand <texte>*
🎇 *impressive <texte>*
🔆 *matrix <texte>*
🚓 *waste*
🤣 *emojimix* → Fusionner 02 emo
📦 *extract* → Extrait vue unique
📈 *topmembers*
📈 *audit* activite bot
🌍 *translate <texte> <lang>*
🔎 *osint numero*

━━━━━━━━━━━━━━━━━━
🤖 *INTELLIGENCE ARTIFICIELLE*
━━━━━━━━━━━━━━━━━━
🧠 *gpt <question>*
✨ *gemini <question>*
🧠 *deepseek <question>*
🔰 *resume* (en réponse à un message)
✨ *llama <question>*
🖼️ *image <prompt>*      
🎬 *genere <prompt>*     → Vidéo IA
💬 *chatbot on/off*      → IA automatique

━━━━━━━━━━━━━━━━━━
📥 *DOWNLOAD & MÉDIAS*
━━━━━━━━━━━━━━━━━━
🎵 *play <musique>*
▶️ *youtube <sujet>*
🎬 *ytmp4 <lien>*

━━━━━━━━━━━━━━━━━━
🎮 *JEUX MR ROBOT*
━━━━━━━━━━━━━━━━━━
❌*tictactoe @user*
💰 *million*
🌍 *capital*

━━━━━━━━━━━━━━━━━━
💀 ${settings.botName || 'MachineBot-RB3'}
⚡ Rapide • 🔒 Sécurisé • 🤖 Intelligent
_Nous sommes anonyme. Nous sommes la FSOCIETY._
━━━━━━━━━━━━━━━━━━
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
