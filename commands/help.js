const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔═══════════════════╗
║ 🤖 *${settings.botName || 'MachineBot-RB3'}  SYSTEM*   ║
╠═══════════════════╣
║ ⚡ *Version*     : *${settings.version || '3.0.0'}*
║ 👨‍💻 *Developpeur* : *${settings.botOwner || 'Mr Robot'}*
║ 📳 *Contact*     : +237682441127
╚═══════════════════╝

┌────────────────────────┐
👑*BIENVENUE DANS LE SYSTÈME*   👑
└────────────────────────┘
_Tape une commande avec le préfixe (*)_

╭───≼  🧠 *SYSTÈME & GÉNÉRAL*
│ ⚙️  *help / menu*   → Affiche le menu
│ 🏓  *ping*          → Test de vitesse
│ 🟢  *alive*         → Statut du bot
│ 🎨  *sticker*       → Image en sticker
│ 📊  *groupinfo*     → Infos du groupe
│ 💬  *chatbot on/off*    → IA auto
│ 📸  *chip*          → Extraire la pp
│ 📦  *extract*       → Extrait vue unique
╰───────────────────

╭───≼  🛡️ *ADMIN & MODÉRATION*
│ 🔇  *mute* / 🔊 *unmute*
│ 🚫  *antidelete on/off*
│ 🏷️  *tagall*
│ 🗑️  *delete <msg>*
│ 🚫  *antibadword on/off*
│ 👮  *admins*
│ ❌  *kick*
│ 🗑️  *autodelete on/off*
│ ⭐  *sudo*
│ ✅  *statusall on/off*
│ 🖼️  *setpp*
╰───────────────────

╭───≼  🎭 *OUTILS & UTILITAIRES*
│ 🔊  *tts <texte>*        → Texte en vocal
│ 🔮  *character*           → Trait physique
│ 🎋  *sand <texte>*
│ 🎇  *impressive <texte>*
│ 🔆  *matrix <texte>*
│ 🚓  *waste*
│ 🤣  *emojimix*     → Fusionner 02 emo
│ 📈  *topmembers*
│ 📊  *audit*               → Activité bot
│ 🌍  *translate <texte> <lang>*
│ 🔎  *osint numero*
│ 🔥  *implante <on/off>*
╰──────────────────

╭───≼  🤖 *INT ARTIFICIEL*
│ 🧠  *gpt <question>*
│ 💡  *gemini <question>*
│ 🧠  *deepseek <question>*
│ 🔰  *essentiel* 
│ ✨  *llama <question>*
│ 👾  *hackbox <question>*
│ 🎬  *genere <prompt>*      → Vidéo IA
╰─────────────────

╭───≼  📥 *DOWNLOAD & MÉDIAS*
│ 🎵  *play <musique>*
│ ▶️  *youtube <sujet>*
│ 🎬  *ytmp4 <lien> <qualité>*
│ 🔎  *ytsearch <mot clé>*
│ 🎵  *music <musique> <qualité>*
╰─────────────────

╭───≼  🎮 *GAMES MR ROBOT*
│ ❌  *tictactoe @user*
│ 💰  *million*
│ 🌍  *capital*
╰───────────────────

╔═══════════════════════╗
║ 💀 ${settings.botName || 'MachineBot-RB3'}
║ ⚡ Rapide • 🔒 Sécurisé • Intelligent
║ 💀 Nous Sommes _*Anonymes*_
║ 🔥 Nous Sommes La _*FSOCIETY*_
╚═══════════════════════╝
`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
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
