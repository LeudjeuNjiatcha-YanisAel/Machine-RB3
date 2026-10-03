const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { asyncLocalStorage } = require('../lib/context');

async function runSessionCommand({ sock, msg }) {
    const chatId = msg.key.remoteJid;
    try {
        const botNumber = asyncLocalStorage.getStore();
        if (!botNumber) {
            return sock.sendMessage(chatId, { text: "❌ Aucun numéro de bot associé à cette session." }, { quoted: msg });
        }

        // Sessions are saved inside "./sessions/[botNumber]"
        const SESSION_DIR = path.join(process.cwd(), "sessions", botNumber);
        const ZIP_PATH = path.join(process.cwd(), `session_${botNumber}.zip`);

        if (!fs.existsSync(SESSION_DIR)) {
            return sock.sendMessage(chatId, { text: "❌ Aucune session trouvée pour ce bot." }, { quoted: msg });
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
            chatId,
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
        await sock.sendMessage(chatId, { text: "❌ Erreur lors de la génération de la session." }, { quoted: msg });
    }
}

module.exports = { runSessionCommand };