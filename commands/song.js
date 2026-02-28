process.env.YTDL_NO_UPDATE = '1';
require('dns').setDefaultResultOrder('ipv4first');

const { spawn } = require('child_process');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const os = require('os');

// =======================
// CACHE CONFIG
// =======================
const CACHE_DIR = path.join(__dirname, '../cache/music');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// =======================
// AUDIO QUALITY
// =======================
function getAudioQuality(arg) {
    switch (arg) {
        case '64':
        case 'low':
            return { bitrate: '64k', label: '64 kbps' };
        case '192':
        case 'high':
            return { bitrate: '192 kbps' };
        case '320':
        case 'max':
            return { bitrate: '320 kbps' };
        case '128':
        case 'medium':
        default:
            return { bitrate: '128 kbps' };
    }
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// =======================
// PLAY COMMAND
// =======================
async function songCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const args = text.split(' ').slice(1);
        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: '🎵 Utilisation : *play titre [low|medium|high|max]*'
            }, { quoted: message });
        }

        const lastArg = args[args.length - 1].toLowerCase();
        const quality = getAudioQuality(lastArg);

        const query = ['low','medium','high','max','64','128','192','320'].includes(lastArg)
            ? args.slice(0, -1).join(' ')
            : args.join(' ');

        // 🔎 Recherche YouTube
        const search = await yts(query);
        if (!search.videos?.length) {
            return sock.sendMessage(chatId, {
                text: '❌ Aucune musique trouvée.'
            }, { quoted: message });
        }

        const video = search.videos[0];
        const cacheFile = path.join(CACHE_DIR, `${video.videoId}-${quality.bitrate}.mp3`);

        // 📩 MESSAGE DÉTAILLÉ
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption:
                `🎵 *${video.title}*\n` +
                `⏱ Durée : *${formatDuration(video.seconds)}*\n` +
                `🎧 Qualité : *${quality.label}*\n` +
                `⬇️ Téléchargement en cours...`
        }, { quoted: message });

        // =======================
        // CACHE HIT
        // =======================
        if (fs.existsSync(cacheFile)) {
            const audio = fs.readFileSync(cacheFile);
            return sock.sendMessage(chatId, {
                audio,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: message });
        }

        // =======================
        // DOWNLOAD WITH yt-dlp
        // =======================
        const tmpFile = path.join(os.tmpdir(), `yt-${Date.now()}.mp3`);

        const yt = spawn('yt-dlp', [
            '--js-runtimes', 'node',
            '-f', 'ba',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', quality.bitrate,
            '--user-agent', 'com.google.android.youtube/19.09.37 (Linux; Android 14)',
            '--add-header', 'X-Youtube-Client-Name:3',
            '--add-header', 'X-Youtube-Client-Version:19.09.37',
            '--no-playlist',
            '-o', tmpFile,
            video.url
        ]);

        yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));

        yt.on('close', async (code) => {
            if (code !== 0 || !fs.existsSync(tmpFile)) {
                return sock.sendMessage(chatId, {
                    text: '❌ Erreur lors du téléchargement.'
                }, { quoted: message });
            }

            fs.renameSync(tmpFile, cacheFile);
            const audio = fs.readFileSync(cacheFile);

            await sock.sendMessage(chatId, {
                audio,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: message });
        });

    } catch (err) {
        console.error('❌ playCommand error:', err);
        await sock.sendMessage(chatId, {
            text: '⚠️ Erreur système.'
        }, { quoted: message });
    }
}

module.exports = songCommand;