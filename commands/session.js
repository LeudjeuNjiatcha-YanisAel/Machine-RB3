const fs = require('fs-extra');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, "../session");
const CREDS_PATH = path.join(AUTH_FOLDER, 'creds.json');

async function runSessionCommand({ sock, msg}) {
    try {
        if (!sock || !msg) {
            console.error('sock ou msg non défini');
            return;
        }

        // Récupération sécurisée du chatId
        const chatId = msg?.key?.remoteJid || msg?.from;
        if (!chatId) {
            console.error('Impossible de récupérer le chatId');
            return;
        }

        if (!fs.existsSync(CREDS_PATH)) {
            return await replyWithTag(
                sock,
                chatId,
                msg,
                "❌ Fichier de session introuvable."
            );
        }

        const creds = fs.readFileSync(CREDS_PATH);
        const sessionBase64 = creds.toString('base64');

        let statusMsg = `🤫 *SESSION ID (NE PAS PARTAGER)*\n\n`;
        statusMsg += `Copiez le texte ci-dessous et ajoutez-le sur Render :\n`;
        statusMsg += `Nom de variable : *SESSION_DATA*\n\n`;
        statusMsg += `\`\`\`${sessionBase64}\`\`\`\n\n`;
        statusMsg += `ℹ️ *Persistance Render :*\n`;
        statusMsg += process.env.SESSION_DATA
            ? `✅ SESSION_DATA détectée`
            : `❌ SESSION_DATA non définie sur Render`;

        await sock.sendMessage(
            chatId,
            { text: statusMsg },
            { quoted: msg || undefined }
        );

    } catch (err) {
        console.error('Session Error:', err);
        const chatId = msg?.key?.remoteJid || msg?.from;
        if (chatId) {
            await replyWithTag(
                sock,
                chatId,
                msg,
                "❌ Une erreur est survenue."
            );
        }
    }
}

module.exports = runSessionCommand;
