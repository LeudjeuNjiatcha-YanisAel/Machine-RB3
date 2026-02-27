const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function runSessionCommand({ sock, msg, replyWithTag }) {
    try {
        const SESSION_DIR = path.join(__dirname, "../session");
        const ZIP_PATH = path.join(__dirname, "../session.zip");

        if (!fs.existsSync(SESSION_DIR)) {
            return replyWithTag(
                sock,
                msg.key.remoteJid,
                msg,
                "❌ Aucune session trouvée."
            );
        }

        // ZIP du dossier session
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(ZIP_PATH);
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.pipe(output);
            archive.directory(SESSION_DIR, false);
            archive.finalize();

            output.on('close', resolve);
            archive.on('error', reject);
        });

        const zipBuffer = fs.readFileSync(ZIP_PATH);
        const sessionBase64 = zipBuffer.toString('base64');

        const message =
            `🤫 *SESSION DATA — CONFIDENTIEL*\n\n` +
            `Ajoute ceci dans Render :\n\n` +
            `🧩 *Nom* : SESSION_DATA\n` +
            `📦 *Valeur* :\n` +
            `\`\`\`${sessionBase64}\`\`\`\n\n` +
            `⚠️ *Ne partage jamais cette clé*\n` +
            `🔁 Redéploie après l’ajout`;

        await sock.sendMessage(
            msg.key.remoteJid,
            { text: message },
            { quoted: msg }
        );

        fs.removeSync(ZIP_PATH);

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

module.exports = { runSessionCommand };