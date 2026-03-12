const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock,chatId,message,prefix) {
    const jid = message.key.participant || message.key.remoteJid;
    const name = message.pushName || "Utilisateur";

    const helpMessage = `
    ╭━━━✨━━━━━━━━━━━━━━✨━╮
    ┃ 🤖 *MACHINE BOT ACCUEIL*           ┃
    ╰━━━✨━━━━━━━━━━━━━━✨━╯
 
✦ • ────── ✾ ────── • ✦
👋 *Hello ${name} !*
    _Profite au maximum de mes commandes_.

┌════════════════════════╮
👑     *COMMANDES DE MACHINE*     👑
╰════════════════════════╯
_Tape une commande sans oublier le préfixe (${prefix})_
✦ • ────── ✾ ────── • ✦

╭══〔 📂 *SYSTÈME & GÉNÉRAL* 〕═╮
│ ⚙️  ${prefix}help / menu   → Affiche le menu
│ 🏓  ${prefix}ping          → Test de vitesse
│ 🎨  ${prefix}sticker       → Image en sticker
│ 🟢  ${prefix}groupinfo     → Infos du groupe
│ 🎤  ${prefix}transcribe
│ 💬  ${prefix}chatbot on/off    → IA auto
│ 📸  ${prefix}chip          → Extraire la pp
│ 📦  ${prefix}extract       → Extrait vue unique
│ 📘  ${prefix}summary on/off 
│ 🌍  ${prefix}translate <texte> <lang>
╰════════════════════

╭══〔 🛡️ *ADMINISTRATION* 〕═╮
│ 🔇  ${prefix}mute / 🔊 ${prefix}unmute
│ 🚫  ${prefix}antidelete on/off
│ 🏷️  ${prefix}tagall
│ 🗑️  ${prefix}delete <msg>
│ 🚫  ${prefix}antibadword on/off
│ 👮  ${prefix}admins
│ ❌  ${prefix}kick
│ 🗑️  ${prefix}autodelete on/off
│ ⭐  ${prefix}sudo
│ ✅  ${prefix}statusall on/off
│ 🖼️  ${prefix}setpp
╰════════════════════

╭══〔 🛠 *OUTILS & UTILITAIRES* 〕═╮
│ 🔊  ${prefix}tts <texte>        → Texte en vocal
│ 🔮  ${prefix}character           → Trait physique
│ 🎋  ${prefix}sand <texte>
│ 🎇  ${prefix}impressive <texte>
│ 🔆  ${prefix}matrix <texte>
│ 🚓  ${prefix}waste
│ 🤣  ${prefix}emojimix     → Fusionner 02 emo
│ 📈  ${prefix}topmembers
│ 📊  ${prefix}audit               → Activité bot
│ 💯  ${prefix}codefix          → Corrige un code 
│ 🔎  ${prefix}osint numero
╰═══════════════════

╭══〔 🤖 *INT ARTIFICIEL* 〕═╮
│ 🧠  ${prefix}gpt <question>
│ 💡  ${prefix}gemini <question>
│ 🧠  ${prefix}deepseek <question>
│ 🔰  ${prefix}essentiel 
│ 💡  ${prefix}nano <question>
| 💡  ${prefix}cerebras <question>
│ ✨  ${prefix}llama <question>
│ 👾  ${prefix}hackbox <question>
│ 🎬  ${prefix}genere <prompt>      → Vidéo IA
╰═════════════════

╭══〔 📥 *DOWNLOAD & MÉDIAS* 〕═╮
│ 🎵  ${prefix}play <musique>
│ ▶️  ${prefix}youtube <sujet>
│ 🎬  ${prefix}ytmp4 <lien> <qualité>
│ 🔎  ${prefix}ytsearch <mot clé>
│ 🎵  ${prefix}music <musique> <qualité>
╰═════════════════

╭══〔 🎮 *GAMES CENTER* 〕═╮
│ ❌  ${prefix}tictactoe @user
│ 💰  ${prefix}million
│ 🌍  ${prefix}capital
╰═════════════════

╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 💀 ${settings.botName || 'MachineBot-RB3'}
┃  Rapide • 🔒 Sécurisé • Intelligent
┃ 💀 Nous Sommes _*Anonymes*_
┃ 🔥 Nous Sommes La _*FSOCIETY*_
╰━━━━━━━━━━━━━━━━━━━━━━━╯
🌐 *Site Web*  
📁 Cliquer ici : https://machine-rb3-q7mz.onrender.com
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
