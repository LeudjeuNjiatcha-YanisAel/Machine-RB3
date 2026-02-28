const yts = require('yt-search');

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function ytsearch(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const query = text.split(' ').slice(1).join(' ');
        if (!query) {
            return sock.sendMessage(chatId, {
                text: '🔎 Utilisation : *ytsearch <mot clé>*'
            }, { quoted: message });
        }

        const search = await yts(query);
        if (!search.videos.length) {
            return sock.sendMessage(chatId, {
                text: '❌ Aucun résultat trouvé.'
            }, { quoted: message });
        }

        const videos = search.videos.slice(0, 5);

        let caption = `🔎 *Résultats pour :* _${query}_\n\n`;

        videos.forEach((v, i) => {
            caption +=
                `*${i + 1}. ${v.title}*\n` +
                `⏱ ${formatDuration(v.seconds)}\n` +
                `🔗 ${v.url}\n\n`;
        });

        await sock.sendMessage(chatId, {
            image: { url: videos[0].thumbnail },
            caption
        }, { quoted: message });

    } catch (err) {
        console.error('❌ ytsearch error:', err);
        await sock.sendMessage(chatId, {
            text: '⚠️ Erreur lors de la recherche.'
        }, { quoted: message });
    }
}

module.exports = ytsearch;