const { GoogleGenAI } = require('@google/genai');
const OpenAI = require("openai");
const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config();
const Cerebras = require('@cerebras/cerebras_cloud_sdk').default;

async function callMetaAI(prompt) {

    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    });

    const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
    });

    return completion.choices[0].message.content;
}

async function Image(prompt) {
    try {

        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 120000
        });

        return Buffer.from(response.data);

    } catch (err) {
        console.error("IMAGE ERROR:", err.message);
        throw err;
    }
}


async function freeImage(prompt) {
    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
            { inputs: prompt, options: { wait_for_model: true } },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_KEY}`, // clé HuggingFace gratuite
                    "Content-Type": "application/json"
                },
                responseType: "arraybuffer",
                timeout: 180000
            }
        );
        return Buffer.from(response.data);
    } catch (err) {
        console.error("HF IMAGE ERROR:", err.response?.status, err.response?.data || err.message);
        throw err;
    }
}



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

// === DeepSeek ===
async function callDeepSeek(prompt) {
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("DEEPSEEK_API_KEY manquante");

        const client = new OpenAI({
            apiKey,
            baseURL: "https://api.deepseek.com"
        });

        const response = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant inside a hacker-style WhatsApp bot created by Mr Robot."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7
        });

        return response.choices[0].message.content;

    } catch (err) {
        console.error("DeepSeek error:", err.message);
        throw err;
    }
}

async function callCerebras(prompt) {

    try {
        if (!process.env.CEREBRAS_API_KEY)
            throw new Error("CEREBRAS_API_KEY manquante");
        
        const cerebras = new Cerebras({
            apiKey: process.env.CEREBRAS_API_KEY
        });
        
        const completion = await cerebras.chat.completions.create({
            model: "gpt-oss-120b", // OU llama-3.1-70b si dispo
            messages: [
                {
                    role: "system",
                    content: "You are a powerful AI assistant inside a hacker-style WhatsApp bot."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7
        });

        return completion.choices[0].message.content;

    } catch (err) {
        console.error("Cerebras error:", err.message);
        throw err;
    }
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
        let text = '';

            if (message.message?.conversation) {
            text = message.message.conversation;
            }
            else if (message.message?.extendedTextMessage?.text) {
            text = message.message.extendedTextMessage.text;
            }
            else if (message.message?.imageMessage?.caption) {
            text = message.message.imageMessage.caption;
            }
            else if (message.message?.videoMessage?.caption) {
            text = message.message.videoMessage.caption;
            }

        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase(); // .gpt / .gemini
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '❌ Utilisation : *gpt question | *gemini question | *llama | *deepseek'
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
            const img = await freeImage(query);

            await sock.sendMessage(chatId, {
                image: img,
                caption: "🖼️ Image générée par IA"
            }, { quoted: message });
               
        }
                    // DeepSeek
        else if (command === '*deepseek') {
            try {
                const answer = await callDeepSeek(query);
                if (answer)
                    return sock.sendMessage(chatId, { text: answer }, { quoted: message });

            } catch (e) {
                console.error('DeepSeek failed:', e.message);
                return sock.sendMessage(chatId, {
                    text: '❌ DeepSeek indisponible pour le moment.'
                }, { quoted: message });
            }
        }
        else if (command === '*llama' || command === '*ai') {
            try {
                const answer = await callMetaAI(query);
                if (answer)
                    return sock.sendMessage(chatId, { text: answer }, { quoted: message });

            } catch (e) {
                console.error('Meta AI failed:', e.message);
                return sock.sendMessage(chatId, {
                    text: '❌ Meta AI indisponible pour le moment.'
                }, { quoted: message });
            }
        }

        else if (command === '*cerebras') {
            try {
                const answer = await callCerebras(query);
                if (answer)
                    return sock.sendMessage(chatId, { text: answer }, { quoted: message });

            } catch (e) {
                console.error('Cerebras failed:', e.message);
                return sock.sendMessage(chatId, {
                    text: '❌ Cerebras indisponible.'
                }, { quoted: message });
            }
        }
    } catch (err) {
        console.error('AI ERROR:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Erreur IA, réessaie plus tard.' }, { quoted: message });
    }   
}


module.exports = { aiCommand, callGeminiOfficial, callOpenAI,callDeepSeek , Image , callMetaAI};
