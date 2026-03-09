const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const jid = message.key.participant || message.key.remoteJid;
    const name = await sock.getName(jid);

    const helpMessage = `
    ╭━━━✨━━━━━━━━━━━━━━━━━━✨━╮
    ┃ 🤖 *MACHINE BOT ACCUEIL* ┃
    ╰━━━✨━━━━━━━━━━━━━━━━━━✨━╯
 
✦ • ────── ✾ ────── • ✦
👋 *Salut @${name}*
    _Profite au maximum mes commandes_.

┌════════════════════════╮
👑     *COMMANDES DE MACHINE* 👑
╰════════════════════════╯
_Tape une commande sans oublier le préfixe (*)_
✦ • ────── ✾ ────── • ✦

╭══〔 📂 *SYSTÈME & GÉNÉRAL* 〕═╮
│ ⚙️  *help / menu   → Affiche le menu
│ 🏓  *ping          → Test de vitesse
│ 🎨  *sticker       → Image en sticker
│ 🟢  *groupinfo     → Infos du groupe
│ 🔥  *implante <on/off>
│ 💬  *chatbot on/off    → IA auto
│ 📸  *chip          → Extraire la pp
│ 📦  *extract       → Extrait vue unique
│ 📘  *summary on/off      → Résumé des discussions 
│ 🌍  *translate <texte> <lang>
╰════════════════════

╭══〔 🛡️ *ADMINISTRATION* 〕═╮
│ 🔇  *mute / 🔊 *unmute
│ 🚫  *antidelete on/off
│ 🏷️  *tagall
│ 🗑️  *delete <msg>
│ 🚫  *antibadword on/off
│ 👮  *admins
│ ❌  *kick
│ 🗑️  *autodelete on/off
│ ⭐  *sudo
│ ✅  *statusall on/off
│ 🖼️  *setpp
╰════════════════════

╭══〔 🎭 *OUTILS & UTILITAIRES* 〕═╮
│ 🔊  *tts <texte>        → Texte en vocal
│ 🔮  *character           → Trait physique
│ 🎋  *sand <texte>
│ 🎇  *impressive <texte>
│ 🔆  *matrix <texte>
│ 🚓  *waste
│ 🤣  *emojimix     → Fusionner 02 emo
│ 📈  *topmembers
│ 📊  *audit               → Activité bot
│ 🎤  *transcribe
│ 💯  *codefix          → Corrige un code 
│ 🔎  *osint numero
╰═══════════════════

╭══〔 🤖 *INT ARTIFICIEL* 〕═╮
│ 🧠  *gpt <question>
│ 💡  *gemini <question>
│ 🧠  *deepseek <question>
│ 🔰  *essentiel 
│ 💡  *nano <question>
│ ✨  *llama <question>
│ 👾  *hackbox <question>
│ 🎬  *genere <prompt>      → Vidéo IA
╰═════════════════

╭══〔 📥 *DOWNLOAD & MÉDIAS* 〕═╮
│ 🎵  *play <musique>
│ ▶️  *youtube <sujet>
│ 🎬  *ytmp4 <lien> <qualité>
│ 🔎  *ytsearch <mot clé>
│ 🎵  *music <musique> <qualité>
╰═════════════════

╭══〔 🎮 *GAMES MR ROBOT* 〕═╮
│ ❌  *tictactoe @user
│ 💰  *million
│ 🌍  *capital
╰═════════════════

╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 💀 ${settings.botName || 'MachineBot-RB3'}
┃ ⚡ Rapide • 🔒 Sécurisé • Intelligent
┃ 💀 Nous Sommes _*Anonymes*_
┃ 🔥 Nous Sommes La _*FSOCIETY*_
╰━━━━━━━━━━━━━━━━━━━━━━━╯
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
