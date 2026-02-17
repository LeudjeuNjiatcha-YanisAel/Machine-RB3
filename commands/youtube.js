const axios = require('axios');
require('dotenv').config();

const YOUTUBE_API = process.env.YOUTUBE_API;

// ============================
// 🛑 ANTI-SPAM SYSTEM
// ============================
const cooldown = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 secondes

async function youtubeCommand(sock, chatId, senderId, text) {
    try {

        const now = Date.now();

        // Vérification cooldown
        if (cooldown.has(senderId)) {
            const lastUse = cooldown.get(senderId);
            const remaining = COOLDOWN_TIME - (now - lastUse);

            if (remaining > 0) {
                await sock.sendMessage(chatId, {
                    text: `⏳ Patiente encore ${Math.ceil(remaining / 1000)} seconde(s).`
                });
                return;
            }
        }

        // Enregistrer l'utilisation
        cooldown.set(senderId, now);

        // ============================
        // Vérifier si nom vidéo fourni
        // ============================
        const query = text.replace('*youtube', '').trim();

        if (!query) {
            await sock.sendMessage(chatId, {
                text: "❌ Utilisation: *youtube nom_de_la_video"
            });
            return;
        }

        // ============================
        // 1️⃣ Rechercher la vidéo
        // ============================
        const searchResponse = await axios.get(
            'https://www.googleapis.com/youtube/v3/search',
            {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 1,
                    key: YOUTUBE_API
                }
            }
        );

        if (!searchResponse.data.items.length) {
            await sock.sendMessage(chatId, {
                text: "❌ Aucune vidéo trouvée."
            });
            return;
        }

        const videoId = searchResponse.data.items[0].id.videoId;
        const videoTitle = searchResponse.data.items[0].snippet.title;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // ============================
        // 2️⃣ Récupérer commentaires
        // ============================
        const commentsResponse = await axios.get(
            'https://www.googleapis.com/youtube/v3/commentThreads',
            {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: 100,
                    order: 'relevance',
                    key: YOUTUBE_API
                }
            }
        );

        if (!commentsResponse.data.items.length) {
            await sock.sendMessage(chatId, {
                text: "❌ Aucun commentaire trouvé."
            });
            return;
        }

        // ============================
        // 3️⃣ Trier par likes
        // ============================
        let comments = commentsResponse.data.items.map(item => {
            const comment = item.snippet.topLevelComment.snippet;

            return {
            author: comment.authorDisplayName || "Utilisateur inconnu",
            text: (comment.textDisplay || "Commentaire indisponible").replace(/<[^>]+>/g, ''),
            likes: comment.likeCount || 0
            };

        });

        comments.sort((a, b) => b.likes - a.likes);

        const top10 = comments.slice(0, 10);

        // ============================
        // 4️⃣ Construire message
        // ============================
        let message = `🎬 *${videoTitle}*\n`;
        message += `🔗 ${videoUrl}\n\n`;
        message += `🔥 Top 10 commentaires les plus likés:\n\n`;

        top10.forEach((c, index) => {
            message += `#${index + 1} 👍 ${c.likes} likes\n`;
            message += `👤 ${c.author}\n`;
            message += `💬 ${c.text}\n\n`;
        });

        const thumbnail = searchResponse.data.items[0].snippet.thumbnails.high.url;

        await sock.sendMessage(chatId, {
            image: { url: thumbnail },
            caption: message
        });


    } catch (error) {
        console.error("❌ YouTube Error:", error.response?.data || error.message);

        await sock.sendMessage(chatId, {
            text: "❌ Erreur lors de la récupération des commentaires."
        });
    }
}

module.exports = youtubeCommand;
