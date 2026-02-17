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
            return sock.sendMessage(chatId, { 
                text: "🎵 Utilisation : *play nom_de_la_chanson*" 
            });
        }

        // 🔎 Recherche YouTube
        const { videos } = await yts(searchQuery);
        if (!videos.length) {
            return sock.sendMessage(chatId, { 
                text: "❌ Aucune musique trouvée." 
            });
        }

        const video = videos[0];

        await sock.sendMessage(chatId, {
            text: `⏳ Téléchargement de *${video.title}* en cours...`,
            quoted: message
        });

        // 📁 Créer dossier temporaire dans /tmp (Render compatible)
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
        const outputPath = path.join(tmpDir, 'audio.%(ext)s');

        // 🎵 Télécharger audio
        await new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                video.url,
                '-f', 'bestaudio',
                '--no-playlist',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '192K',
                '--geo-bypass',
                '--add-header', 'User-Agent:Mozilla/5.0',
                '-o', outputPath
            ], { timeout: 180000 }, (err, stdout, stderr) => {

                console.log("STDOUT:", stdout);
                console.log("STDERR:", stderr);

                if (err) {
                    console.error("YT-DLP ERROR:", err);
                    return reject(err);
                }

                resolve();
            });
        });

        // 📂 Trouver le mp3
        const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
        if (!files.length) throw new Error("MP3 non trouvé");

        const mp3Path = path.join(tmpDir, files[0]);

        // ⚡ IMPORTANT : envoyer en buffer (PAS en url)
        const audioBuffer = fs.readFileSync(mp3Path);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`
        }, { quoted: message });

        // 🧹 Nettoyage
        fs.rmSync(tmpDir, { recursive: true, force: true });

    } catch (err) {
        console.error('❌ playCommand error:', err);

        await sock.sendMessage(chatId, {
            text: "⚠️ Impossible de télécharger la musique. Réessaie plus tard."
        }, { quoted: message });
    }
}

module.exports = playCommand;
