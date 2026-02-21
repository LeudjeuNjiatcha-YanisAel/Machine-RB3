process.env.YTDL_NO_UPDATE = '1';
require('dns').setDefaultResultOrder('ipv4first');

const { spawn } = require('child_process');
const yts = require('yt-search');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation ||
                     message.message?.extendedTextMessage?.text;

        const query = text.split(' ').slice(1).join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, {
                text: "🎵 Utilisation : *music nom*"
            });
        }

        const { videos } = await yts(query);
        if (!videos.length) {
            return sock.sendMessage(chatId, {
                text: "❌ Aucune musique trouvée."
            });
        }

        const video = videos[0];

        await sock.sendMessage(chatId, {
            text: `⏳ Téléchargement de *${video.title}*...`
        });

        const yt = spawn('yt-dlp', [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '-o', '-',
            video.url
        ]);

        let data = [];

        yt.stdout.on('data', chunk => data.push(chunk));
        yt.stderr.on('data', err => console.log(err.toString()));

        yt.on('close', async code => {
            if (code !== 0) {
                return sock.sendMessage(chatId, {
                    text: "❌ Erreur téléchargement."
                });
            }

            const buffer = Buffer.concat(data);

            await sock.sendMessage(chatId, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            });
        });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, {
            text: "⚠️ Erreur système."
        });
    }
}

module.exports = playCommand;