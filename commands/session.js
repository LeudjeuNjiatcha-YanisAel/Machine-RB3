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

        // Supprime ancien zip
        if (fs.existsSync(ZIP_PATH)) {
            fs.removeSync(ZIP_PATH);
        }

        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(ZIP_PATH);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            const files = fs.readdirSync(SESSION_DIR);

            // 🔥 FILTRAGE MINIMAL INTELLIGENT
            const essentialFiles = files.filter(file =>
                file === 'creds.json' ||
                file.startsWith('session-') ||
                file.startsWith('app-state-sync-key-')
            );

            for (const file of essentialFiles) {
                archive.file(
                    path.join(SESSION_DIR, file),
                    { name: file }
                );
            }

            archive.finalize();
        });

        const zipBuffer = fs.readFileSync(ZIP_PATH);
        const sessionBase64 = zipBuffer.toString('base64');

        console.log("📦 Taille session minimale (base64):", sessionBase64.length);

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
`🤫 *SESSION DATA MINIMAL*

🧩 Nom : SESSION_DATA
📦 Valeur :

${sessionBase64}

⚠️ Ne partage jamais cette clé
🔁 Redéploie après ajout`
            },
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