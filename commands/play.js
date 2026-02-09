const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return sock.sendMessage(chatId, {
                text: "🎵 Utilisation : *play nom_de_la_chanson*"
            });
        }

        // 🔍 Recherche YouTube
        const { videos } = await yts(searchQuery);
        if (!videos.length) {
            return sock.sendMessage(chatId, { text: "❌ Aucune musique trouvée." });
        }

        const video = videos[0];
        const ytUrl = encodeURIComponent(video.url);

        // 📢 Infos musique
        await sock.sendMessage(chatId, {
            text: `
🎧 *MUSIQUE TROUVÉE*

• 📝 Titre : ${video.title}
• ⏱️ Durée : ${video.timestamp}
• 👤 Auteur : ${video.author.name}
• 👁️ Vues : ${video.views.toLocaleString()}

⏳ Téléchargement en cours...
            `.trim(),
            quoted: message
        });

        // 🔁 APIs MP3 (fallback)
        const apis = [
            `https://api.giftedtech.my.id/api/download/yta?apikey=gifted&url=${ytUrl}`,
            `https://api.ryzendesu.vip/api/downloader/youtube-mp3?url=${ytUrl}`,
            `https://api.siputzx.my.id/api/d/ytmp3?url=${ytUrl}`
        ];

        let audioUrl = null;

        for (const api of apis) {
            try {
                const res = await axios.get(api, { timeout: 20000 });
                const d = res.data;

                audioUrl =
                    d?.result?.download_url ||
                    d?.result?.url ||
                    d?.data?.download ||
                    d?.download_url;

                if (audioUrl) break;
            } catch {
                continue;
            }
        }

        if (!audioUrl) {
            return sock.sendMessage(chatId, {
                text: "❌ Toutes les APIs de téléchargement sont indisponibles."
            });
        }

        // 📤 Envoi audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`
        }, { quoted: message });

    } catch (err) {
        console.error('❌ playCommand error:', err.message);
        await sock.sendMessage(chatId, {
            text: "⚠️ Erreur lors du téléchargement. Réessaie plus tard."
        });
    }
}

module.exports = playCommand;
