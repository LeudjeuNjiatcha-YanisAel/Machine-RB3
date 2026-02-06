const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔════════════════════════════╗
║        🤖 *${settings.botName || 'MachineBot-RB3'}*        ║
║────────────────────────────║
║ 📌 Version : *${settings.version || '3.0.0'}*
║ 👤 Dev     : ${settings.botOwner || 'Mr Robot'}
║ 📺 YouTube : ${global.ytch}
╚════════════════════════════╝

🌟 *MENU DES COMMANDES* 🌟

━━━━━━━━━━━━━━━━━━━━━━
🌐 *COMMANDES GÉNÉRALES*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .help | .menu
▫️ .ping → Tester la connectivité
▫️ .alive
▫️ .tts <texte>
▫️ .owner → Contact du propriétaire
▫️ .fact
▫️ .news → Actualités
▫️ .lyrics <titre>
▫️ .8ball <question>
▫️ .groupinfo
▫️ .staff | .admins
▫️ .vv → Vues uniques

━━━━━━━━━━━━━━━━━━━━━━
👮‍♂️ *COMMANDES ADMIN*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .ban @user
▫️ .kick @user
▫️ .promote @user
▫️ .demote @user
▫️ .mute <minutes>
▫️ .unmute
▫️ .delete | .del
▫️ .warnings @user
▫️ .warn @user
▫️ .antilink
▫️ .antibadword
▫️ .clear
▫️ .tag <message>
▫️ .tagall
▫️ .tagnotadmin
▫️ .hidetag <message>
▫️ .chatbot
▫️ .resetlink
▫️ .antitag <on/off>
▫️ .welcome <on/off>
▫️ .goodbye <on/off>

━━━━━━━━━━━━━━━━━━━━━━
🔒 *COMMANDES PROPRIÉTAIRE*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .mode <public/private>
▫️ .clearsession
▫️ .antidelete
▫️ .cleartmp
▫️ .update
▫️ .settings
▫️ .setpp <image>
▫️ .autoreact <on/off>
▫️ .autostatus <on/off>
▫️ .autostatus react <on/off>
▫️ .autotyping <on/off>
▫️ .autoread <on/off>
▫️ .anticall <on/off>
▫️ .pmblocker <on/off/status>
▫️ .pmblocker setmsg <texte>
▫️ .setmention <msg>
▫️ .mention <on/off>

━━━━━━━━━━━━━━━━━━━━━━
🎨 *IMAGES & STICKERS*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .sticker <image>
▫️ .simage <sticker>
▫️ .blur
▫️ .removebg
▫️ .remini
▫️ .crop
▫️ .tgsticker <lien>
▫️ .meme
▫️ .take <pack>
▫️ .emojimix 😄+😂
▫️ .igs <lien>
▫️ .igsc <lien>

━━━━━━━━━━━━━━━━━━━━━━
🖼️ *PICS*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .pies <pays>
▫️ .china
▫️ .indonesia
▫️ .japan
▫️ .korea
▫️ .hijab

━━━━━━━━━━━━━━━━━━━━━━
🎮 *JEUX*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .tictactoe @user
▫️ .hangman
▫️ .guess <lettre>
▫️ .trivia
▫️ .answer <réponse>
▫️ .truth
▫️ .dare

━━━━━━━━━━━━━━━━━━━━━━
🤖 *INTELLIGENCE ARTIFICIELLE*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .gpt <question>
▫️ .gemini <question>
▫️ .imagine <prompt>
▫️ .flux <prompt>
▫️ .sora <prompt>

━━━━━━━━━━━━━━━━━━━━━━
🎯 *FUN*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .compliment @user
▫️ .insult @user
▫️ .flirt
▫️ .ship @user
▫️ .simp @user
▫️ .character @user
▫️ .stupid @user <texte>

━━━━━━━━━━━━━━━━━━━━━━
🔤 *TEXT MAKER*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .neon <texte>
▫️ .matrix <texte>
▫️ .hacker <texte>
▫️ .fire <texte>
▫️ .glitch <texte>
▫️ .blackpink <texte>
▫️ .devil <texte>
▫️ .purple <texte>

━━━━━━━━━━━━━━━━━━━━━━
📥 *DOWNLOAD*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .play <musique>
▫️ .song <musique>
▫️ .spotify <recherche>
▫️ .instagram <lien>
▫️ .facebook <lien>
▫️ .tiktok <lien>
▫️ .ytmp4 <lien>

━━━━━━━━━━━━━━━━━━━━━━
🖼️ *ANIME*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .nom
▫️ .poke
▫️ .cry
▫️ .kiss
▫️ .pat
▫️ .hug
▫️ .wink
▫️ .facepalm

━━━━━━━━━━━━━━━━━━━━━━
💻 *GITHUB*
━━━━━━━━━━━━━━━━━━━━━━
▫️ .git
▫️ .github
▫️ .repo
▫️ .script

━━━━━━━━━━━━━━━━━━━━━━
✨ Rejoignez notre chaîne pour les mises à jour ✨
`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
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
