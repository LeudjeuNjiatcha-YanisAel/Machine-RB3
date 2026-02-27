const fs = require('fs-extra');
const path = require('path');

async function runSessionCommand({ sock, msg, replyWithTag }) {
        try {
            const AUTH_FOLDER = path.join(__dirname, "../session");
            const CREDS_PATH = path.join(AUTH_FOLDER, "creds.json");

            if (!fs.existsSync(CREDS_PATH)) {
                return replyWithTag(
                    sock,
                    msg.key.remoteJid,
                    msg,
                    "❌ Aucune session trouvée. Connecte le bot une première fois."
                );
            }

            const credsBuffer = fs.readFileSync(CREDS_PATH);
            const sessionBase64 = Buffer.from(credsBuffer).toString("base64");

            let message = `🤫 *SESSION DATA — CONFIDENTIEL*\n\n`;
            message += `Ajoute ceci dans les variables d'environnement :\n\n`;
            message += `🧩 *Nom* : SESSION_DATA\n`;
            message += `📦 *Valeur* :\n`;
            message += `\`\`\`${sessionBase64}\`\`\`\n\n`;
            message += `⚠️ *Ne partage jamais cette clé*\n`;
            message += `ℹ️ Redémarre le service après l'ajout.`;

            await sock.sendMessage(
                msg.key.remoteJid,
                { text: message },
                { quoted: msg }
            );

        } catch (err) {
            console.error("SESSION CMD ERROR:", err);
            await replyWithTag(
                sock,
                msg.key.remoteJid,
                msg,
                "❌ Erreur lors de la génération de la session."
            );
        }
    }
module.exports = {runSessionCommand};