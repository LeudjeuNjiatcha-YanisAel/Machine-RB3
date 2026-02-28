process.env.YTDL_NO_UPDATE = '1';
require('dns').setDefaultResultOrder('ipv4first');

const { spawn } = require('child_process');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getAudioQuality(arg) {
    switch (arg) {
        case '64':
        case 'low':
            return { bitrate: '64k', label: '64 kbps' };
        case '192':
        case 'high':
            return { bitrate: '192k', label: '192 kbps' };
        case '320':
        case 'max':
            return { bitrate: '320k', label: '320 kbps' };
        case '128':
        case 'medium':
        default:
            return { bitrate: '128k', label: '128 kbps' };
    }
}

async function playCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const args = text.split(' ').slice(1);
        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: '🎵 Utilisation : *music titre [low|medium|high|max]*'
            }, { quoted: message });
        }

        const lastArg = args[args.length - 1].toLowerCase();
        const quality = getAudioQuality(lastArg);

        const query = ['low','medium','high','max','64','128','192','320'].includes(lastArg)
            ? args.slice(0, -1).join(' ')
            : args.join(' ');

        const search = await yts(query);
        if (!search.videos?.length) {
            return sock.sendMessage(chatId, {
                text: '❌ Aucune musique trouvée.'
            }, { quoted: message });
        }

        const video = search.videos[0];

        await sock.sendMessage(chatId, {
            text: `🎧 *${video.title}*\n📀 Qualité : *${quality.label}*\n⏳ Téléchargement...`
        }, { quoted: message });

        const outputPath = path.join(os.tmpdir(), `music-${Date.now()}.mp3`);

        const yt = spawn('yt-dlp', [
            '--js-runtimes', 'node',
            '-f', 'ba',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', quality.bitrate,
            '--user-agent', 'com.google.android.youtube/19.09.37 (Linux; U; Android 14)',
            '--add-header', 'X-Youtube-Client-Name:3',
            '--add-header', 'X-Youtube-Client-Version:19.09.37',
            '--no-playlist',
            '-o', outputPath,
            video.url
        ]);

        yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));

        yt.on('close', async (code) => {
            if (code !== 0 || !fs.existsSync(outputPath)) {
                return sock.sendMessage(chatId, {
                    text: '❌ Erreur lors du téléchargement.'
                }, { quoted: message });
            }

            const audioBuffer = fs.readFileSync(outputPath);

            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: message });

            fs.unlink(outputPath, () => {});
        });

    } catch (err) {
        console.error('❌ playCommand error:', err);
        await sock.sendMessage(chatId, {
            text: '⚠️ Erreur système.'
        }, { quoted: message });
    }
}

module.exports = playCommand;