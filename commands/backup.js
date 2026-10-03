const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { asyncLocalStorage } = require('../lib/context');
const isOwnerOrSudo = require('../lib/isOwner');

async function handleBackupCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner) {
            return sock.sendMessage(chatId, { text: "❌ Commande réservée au Owner / Sudo." }, { quoted: msg });
        }

        const botNumber = asyncLocalStorage.getStore();
        if (!botNumber) {
            return sock.sendMessage(chatId, { text: "❌ Aucun numéro de bot associé à cette session." }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: "📦 Préparation de la sauvegarde en cours..." }, { quoted: msg });

        const sessionDir = path.join(process.cwd(), "sessions", botNumber);
        const dataDir = path.join(process.cwd(), "data", botNumber);
        const zipPath = path.join(process.cwd(), `backup_${botNumber}.zip`);

        if (fs.existsSync(zipPath)) {
            fs.removeSync(zipPath);
        }

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);

            // Zip the session folder if exists
            if (fs.existsSync(sessionDir)) {
                archive.directory(sessionDir, 'sessions');
            }

            // Zip the data folder if exists
            if (fs.existsSync(dataDir)) {
                archive.directory(dataDir, 'data');
            }

            archive.finalize();
        });

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(zipPath),
            mimetype: 'application/zip',
            fileName: `backup_${botNumber}.zip`,
            caption: `✅ *Sauvegarde réussie pour le bot ${botNumber}!*\n\n⚠️ Ce fichier contient vos informations de connexion et configurations. Ne le partagez jamais !`
        }, { quoted: msg });

        fs.removeSync(zipPath);

    } catch (err) {
        console.error("Backup command error:", err);
        await sock.sendMessage(chatId, { text: `❌ Erreur lors de la sauvegarde : ${err.message}` }, { quoted: msg });
    }
}

async function handleRestoreCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner) {
            return sock.sendMessage(chatId, { text: "❌ Commande réservée au Owner / Sudo." }, { quoted: msg });
        }

        const botNumber = asyncLocalStorage.getStore();
        if (!botNumber) {
            return sock.sendMessage(chatId, { text: "❌ Aucun numéro de bot associé à cette session." }, { quoted: msg });
        }

        // Check if user replied to a document/zip
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const docMsg = quotedMsg?.documentMessage;

        if (!docMsg || docMsg.mimetype !== 'application/zip') {
            return sock.sendMessage(chatId, { text: "⚠️ Veuillez répondre à un fichier de sauvegarde (.zip) valide avec la commande *.restore*." }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: "📥 Téléchargement et restauration de la sauvegarde..." }, { quoted: msg });

        // Download the document message
        const buffer = await downloadMediaMessage(
            { key: msg.message.extendedTextMessage.contextInfo.stanzaId, message: quotedMsg },
            'buffer',
            {},
            { logger: sock.logger }
        );

        const tempZip = path.join(process.cwd(), `temp_restore_${botNumber}.zip`);
        fs.writeFileSync(tempZip, buffer);

        const sessionDir = path.join(process.cwd(), "sessions", botNumber);
        const dataDir = path.join(process.cwd(), "data", botNumber);

        // Ensure directories exist
        fs.ensureDirSync(sessionDir);
        fs.ensureDirSync(dataDir);

        // Extract files
        await fs.createReadStream(tempZip)
            .pipe(unzipper.Parse())
            .on('entry', function (entry) {
                const fileName = entry.path;
                let destPath;

                if (fileName.startsWith('sessions/')) {
                    destPath = path.join(sessionDir, fileName.replace('sessions/', ''));
                } else if (fileName.startsWith('data/')) {
                    destPath = path.join(dataDir, fileName.replace('data/', ''));
                }

                if (destPath) {
                    if (entry.type === 'Directory') {
                        fs.ensureDirSync(destPath);
                        entry.autodrain();
                    } else {
                        fs.ensureDirSync(path.dirname(destPath));
                        entry.pipe(fs.createWriteStream(destPath));
                    }
                } else {
                    entry.autodrain();
                }
            })
            .promise();

        fs.removeSync(tempZip);

        await sock.sendMessage(chatId, { text: "✅ *Restauration réussie !*\nLes fichiers de configuration et les sessions ont été restaurés.\n\n🔄 Veuillez redémarrer le bot ou reconnecter pour appliquer les changements." }, { quoted: msg });

    } catch (err) {
        console.error("Restore command error:", err);
        await sock.sendMessage(chatId, { text: `❌ Erreur lors de la restauration : ${err.message}` }, { quoted: msg });
    }
}

module.exports = {
    handleBackupCommand,
    handleRestoreCommand
};
