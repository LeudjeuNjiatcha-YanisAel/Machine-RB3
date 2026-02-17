const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config();


async function generateImage(prompt) {
    const ai = new GoogleGenAI({
        apiKey: process.env.IMAGE
    });

    const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: prompt,
        config: {
            responseModalities: ["TEXT", "IMAGE"]
        }
    });

    const part = result.candidates[0].content.parts
        .find(p => p.inlineData);

    return Buffer.from(part.inlineData.data, "base64");
}

// === OpenAI ===
async function callOpenAI(prompt) {
    try {
        const apiKey = process.env.GEMINI;
        if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

        const ai = new GoogleGenAI({ apiKey });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        if (!result || !result.text)
            throw new Error("Réponse Gemini vide");

        return result.text;

    } catch (err) {
        console.error("Gemini error:", err.response?.data || err.message);
        throw err;
    }
}

// === Gemini OFFICIEL ===
async function callGeminiOfficial(prompt) {
    try {
        const apiKey = process.env.GEMINI_API;
        if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

        const ai = new GoogleGenAI({ apiKey });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        if (!result || !result.text)
            throw new Error("Réponse Gemini vide");

        return result.text;

    } catch (err) {
        console.error("Gemini error:", err.response?.data || err.message);
        throw err;
    }
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
                text: '❌ Utilisation : *gpt question | *gemini question '
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

        if (command === '*gpt') {
            //  OpenAI
            try {
                const answer = await callOpenAI(query);
                if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
            } catch (e) {
                console.error('OpenAI failed:', e.message);
            }

            //  Ici on teste plusieurs cles
            const keys = process.env.AI_STUDIO?.split(',');
            if(!keys || keys.length === 0)
            throw new Error('GEMINI_KEYS manquantes');

            for (let i = 0; i < keys.length ; i++)
            {
                const apiKey = keys[i].trim();
                try
                {
                    const api = new GoogleGenAI({ apiKey });

                    const result = await api.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: query
                    });


                    if (!result || !result.text)
                        throw new Error("Réponse Gemini vide");

                    if (result) return sock.sendMessage(chatId, { text: result.text }, { quoted: message });

                } catch (err) {
                    console.log(`❌ Clé ${i + 1} erreur`);
                    
                }
            }
            return sock.sendMessage(chatId, {
                text: '❌ Toutes les clés Gemini ont échoué.'
            }, { quoted: message });
        }
        // === Gemini ===
        else if (command === '*gemini') {
            //  Gemini officiel
            try {
                const answer = await callGeminiOfficial(query);
                if (answer) return sock.sendMessage(chatId, { text: answer }, { quoted: message });
            } catch (e) {
                console.error('Gemini OFFICIEL failed:', e.message);
            }
            // teste d'autres cles
            const keys = process.env.AI_STUDIO?.split(',');
            
            if(!keys || keys.length === 0)
            throw new Error('GEMINI_KEYS manquantes');

            for (let i = 0; i < keys.length ; i++)
            {
                const apiKey = keys[i].trim();
                try
                {
                    const api = new GoogleGenAI({ apiKey });

                    const result = await api.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: query
                    });

                    if (!result || !result.text)
                        throw new Error("Réponse Gemini vide");

                    if (result) return sock.sendMessage(chatId, { text: result.text }, { quoted: message });

                } catch (err) {
                    console.log(`❌ Clé ${i + 1} erreur`);
                }
            }
            return sock.sendMessage(chatId, {
                text: '❌ Toutes les clés Gemini ont échoué.'
            }, { quoted: message });
        }
        else if(command === '*image')
        {
            const img = await generateImage(query);

            await sock.sendMessage(chatId, {
                image: img,
                caption: "🖼️ Image générée par IA"
            }, { quoted: message });
                }

    } catch (err) {
        console.error('AI ERROR:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Erreur IA, réessaie plus tard.' }, { quoted: message });
    }   
}


module.exports = { aiCommand, callGeminiOfficial, callOpenAI };
