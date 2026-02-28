require('dns').setDefaultResultOrder('ipv4first');

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// =======================
// GET VIDEO INFO VIA YT-DLP
// =======================
function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const yt = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);

        let data = '';
        yt.stdout.on('data', d => data += d.toString());
        yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));

        yt.on('close', code => {
            if (code !== 0) return reject(new Error('yt-dlp info failed'));
            try {
                resolve(JSON.parse(data));
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
    });
}

// =======================
// YTMP4 COMMAND
// =======================
async function ytmp4(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const args = text.split(' ').slice(1);
        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: '🎬 Utilisation : *ytmp4 <lien> [240|360|480|720|1080]*'
            }, { quoted: message });
        }

        const url = args[0];
        const quality = args[1] || '720';

        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return sock.sendMessage(chatId, {
                text: '❌ Lien YouTube invalide.'
            }, { quoted: message });
        }

        // 🔥 INFO FIABLE
        const info = await getVideoInfo(url);

        await sock.sendMessage(chatId, {
            image: { url: info.thumbnail },
            caption:
                `🎬 *${info.title}*\n` +
                `⏱ Durée : *${formatDuration(info.duration)}*\n` +
                `📀 Qualité : *${quality}p*\n` +
                `⬇️ Téléchargement...`
        }, { quoted: message });

        const output = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

        const yt = spawn('yt-dlp', [
            '-f', `bv*[height<=${quality}]+ba/b[height<=${quality}]`,
            '--merge-output-format', 'mp4',
            '--user-agent', 'com.google.android.youtube/19.09.37 (Linux; Android 14)',
            '--add-header', 'X-Youtube-Client-Name:3',
            '--add-header', 'X-Youtube-Client-Version:19.09.37',
            '--no-playlist',
            '-o', output,
            url
        ]);

        yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));

        yt.on('close', async (code) => {
            if (code !== 0 || !fs.existsSync(output)) {
                return sock.sendMessage(chatId, {
                    text: '❌ Erreur lors du téléchargement vidéo.'
                }, { quoted: message });
            }

            const buffer = fs.readFileSync(output);

            await sock.sendMessage(chatId, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${info.title}.mp4`
            }, { quoted: message });

            fs.unlink(output, () => {});
        });

    } catch (err) {
        console.error('❌ ytmp4 error:', err);
        await sock.sendMessage(chatId, {
            text: '⚠️ Impossible de traiter cette vidéo.'
        }, { quoted: message });
    }
}

module.exports = ytmp4;