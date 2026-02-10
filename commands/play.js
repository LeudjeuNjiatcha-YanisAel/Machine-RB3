const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const yts = require('yt-search');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return sock.sendMessage(chatId, { text: "🎵 Utilisation : *play nom_de_la_chanson*" });
        }

        // 🔍 Recherche YouTube
        const { videos } = await yts(searchQuery);
        if (!videos.length) {
            return sock.sendMessage(chatId, { text: "❌ Aucune musique trouvée." });
        }

        const video = videos[0];

        // Message d’attente
        await sock.sendMessage(chatId, {
            text: `⏳ Téléchargement en cours de *${video.title}*...`,
            quoted: message
        });

        // Créer un dossier temporaire
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
        const outputPath = path.join(tmpDir, '%(title).50s.%(ext)s');

        // Appel yt-dlp pour extraire l’audio en mp3
        await new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                video.url,
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '192K',
                '-o', outputPath
            ], { timeout: 120000 }, (err, stdout, stderr) => {
                if (err) return reject(err);
                resolve(stdout);
            });
        });

        // Trouver le fichier mp3 téléchargé
        const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
        if (!files.length) throw new Error("Fichier mp3 non trouvé");

        const mp3Path = path.join(tmpDir, files[0]);

        // Envoyer le mp3
        await sock.sendMessage(chatId, {
            audio: { url: mp3Path },
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`
        }, { quoted: message });

        // Nettoyer le dossier temporaire
        fs.rmSync(tmpDir, { recursive: true, force: true });

    } catch (err) {
        console.error('❌ playCommand error:', err);
        await sock.sendMessage(chatId, {
            text: "⚠️ Erreur lors du téléchargement ou de la conversion. Réessaie plus tard."
        }, { quoted: message });
    }
}

module.exports = playCommand;
