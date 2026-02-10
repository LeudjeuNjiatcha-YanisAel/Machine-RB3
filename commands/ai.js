const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config();

// === OpenAI ===
async function callOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API;
    if (!apiKey) throw new Error('OPENAI_API_KEY manquante');
    if (!prompt || !prompt.trim()) throw new Error('Prompt vide');

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return response.data.choices?.[0]?.message?.content || null;
}

// === Gemini OFFICIEL ===
async function callGeminiOfficial(prompt) {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) throw new Error('GEMINI_API_KEY manquante');
    if (!prompt || !prompt.trim()) throw new Error('Prompt vide');

    const ai = new GoogleGenAI({ apiKey });
    const model = 'models/gemini-2.5-flash'; // ✅ chemin complet requis

    const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response?.response?.text();
}

// === Command handler ===
async function aiCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption;
        if (!text) return;

        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase(); // .gpt / .gemini
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '❌ Utilisation : .gpt question | .gemini question | .openai question'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

        // === GPT via OpenAI + APIs tierces ===
        if (command === '.gpt') {
            // 1️⃣ OpenAI
            try {
                const answer = await callOpenAI(query);
                if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
            } catch (e) {
                console.error('OpenAI failed:', e.message);
            }

            // 2️⃣ APIs tierces
            const apis = [
                `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`
            ];

            for (const api of apis) {
                try {
                    const res = await fetch(api);
                    const data = await res.json();
                    const answer = data.result || data.answer || data.response;
                    if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
                } catch {}
            }

            return sock.sendMessage(chatId, { text: '❌ GPT a échoué. Réessaie plus tard.' }, { quoted: message });
        }

        // === Gemini ===
        else if (command === '.gemini') {
            // 1️⃣ Gemini officiel
            try {
                const answer = await callGeminiOfficial(query);
                if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
            } catch (e) {
                console.error('Gemini OFFICIEL failed:', e.message);
            }

            // 2️⃣ APIs fallback
            const apis = [
                `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
                `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`
            ];

            for (const api of apis) {
                try {
                    const res = await fetch(api);
                    const data = await res.json();
                    const answer = data.message || data.data || data.answer || data.result || data.response;
                    if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
                } catch {}
            }

            return sock.sendMessage(chatId, { text: '❌ Toutes les APIs Gemini ont échoué.' }, { quoted: message });
        }

    } catch (err) {
        console.error('AI ERROR:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Erreur IA, réessaie plus tard.' }, { quoted: message });
    }
}

module.exports = { aiCommand, callGeminiOfficial, callOpenAI };
