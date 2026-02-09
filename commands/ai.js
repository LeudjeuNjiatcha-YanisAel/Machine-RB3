const axios = require('axios');
const fetch = require('node-fetch');



async function callGeminiOfficial(prompt) {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await axios.post(url, {
        contents: [
            {
                parts: [{ text: prompt }]
            }
        ]
    });

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}


async function aiCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption;

        if (!text) return;

        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '❌ Utilisation : *gpt ta question ou *gemini ta question'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🤖', key: message.key }
        });

        if (command === '*gpt') {
            const apis = [
                `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`
            ];

            for (const api of apis) {
                try {
                    const res = await fetch(api);
                    const data = await res.json();
                    const answer = data.result || data.answer || data.response;
                    if (answer) {
                        return sock.sendMessage(chatId, { text: answer }, { quoted: message });
                    }
                } catch {}
            }

            throw new Error('GPT APIs failed');
        }

        if (command === '*gemini') {

            try {
                const answer = await callGeminiOfficial(query);
                if (answer) {
                    return sock.sendMessage(chatId, { text: answer }, { quoted: message });
                }
            } catch (e) {
                console.error('Gemini OFFICIEL failed:', e.message);
            }

            const apis = [
                `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
                `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`
            ];

            for (const api of apis) {
                try {
                    const res = await fetch(api);
                    const data = await res.json();
                    const answer = data.message || data.data || data.answer || data.result || data.response;
                    if (answer) {
                        return sock.sendMessage(chatId, { text: answer }, { quoted: message });
                    }
                } catch {}
            }

            throw new Error('Gemini APIs failed');
        }

    } catch (err) {
        console.error('AI ERROR:', err.message);
        await sock.sendMessage(chatId, {
            text: '❌ Erreur IA, réessaie plus tard.'
        }, { quoted: message });
    }
}

module.exports = aiCommand;
