const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API);
const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// ================= MEMORY =================
const chatMemory = {
    messages: new Map(),
    userInfo: new Map()
};

// Pour la rotation des cles 
async function generateGeminiWithRotation(prompt) {

    const keys = process.env.AI_STUDIO?.split(',');
    if (!keys || keys.length === 0)
        throw new Error("Aucune clé Gemini");

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i].trim();

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash"
            });

            const result = await model.generateContent(prompt);
            const text = result?.response?.text();

            if (!text) throw new Error("Réponse vide");

            console.log(`✅ Gemini clé ${i + 1} utilisée`);
            return text.trim();

        } catch (err) {
            console.log(`❌ Gemini clé ${i + 1} échouée`);
        }
    }

    throw new Error("Toutes les clés Gemini ont échoué");
}

// ===== Ajouter message mémoire =====
function addMessageToMemory(userId, role, text) {
    if (!chatMemory.messages.has(userId))
        chatMemory.messages.set(userId, []);

    const history = chatMemory.messages.get(userId);

    history.push({
        role,
        text,
        time: Date.now()
    });

    // garder seulement 12 messages
    if (history.length > 12) history.shift();
}

// ================= DATA =================
function loadUserGroupData() {
    try {
        const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));

        if (!data.chatbot || typeof data.chatbot !== 'object')
            data.chatbot = {};

        return data;
    } catch {
        return { chatbot: {} };
    }
}

// ================= HUMAN DELAY =================
function getRandomDelay(text = "") {
    const base = 700;
    return base + text.length * 18;
}

async function showTyping(sock, chatId, text = "") {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, getRandomDelay(text)));
    } catch {}
}

// ================= QUICK REPLIES =================
function quickReplies(text) {
    const lower = text.toLowerCase();

    const random = arr => arr[Math.floor(Math.random() * arr.length)];

    if (["salut","bonjour","yo","bjr","asser","hello !"].some(w=>lower.includes(w)))
        return random(["Salut 😄 comment tu as passer ta journee","Yo 👋 ca dit quoi ?","Hey ! 😄comment tu te porte"]);

    if([" suis la","gerer comme"].some(w=>lower.includes(w)))
        return random(["et l'ecole 😀","tu sais je chatbot je peux t'aider confie toi 😉"]);
    if(["maff","mouf","imbecile","chyeng","chien","maman","insulte","salo"].some(w=>lower.includes(w)))
        return random(["Je t'insulte pas tu m'insulte ok ok!","Je peux devoile tout t'est petit secret","\Machine m'a renseigne sur ta personnalite\n point fort et faible\n ne m'oblige pas a tout devoile","Ton cu petit frere Modia "]);
    if(["bugs","bug"].some(w=>lower.includes(w)))
        return random(["A ta place je ne dirais pas ca ","je te deconseille fortement ca tu ne me connais pas"])
    if(["vas-y","devoile","la joie"].some(w=>lower.includes(w)))
        return random(["Un instant je collecte les infos ..."]);
    if(["qui est-tu","machine","toi c'est qui"].some(w=>lower.includes(w)))
        return random(["Je suis un modele sur-entrainer par Machine@mr.robot 😎\n grace au renseignement 24/24","Je suis l'assistant de Mr.robot","Un gars comme toi"]);

    if (["ça va","ca va","comment tu vas","bien"].some(w=>lower.includes(w)))
        return random(["bien! 😎 et toi ?","Oui nickel !","En sante!","Me voici Tout"]);

    if (["merci","thanks"].some(w=>lower.includes(w)))
        return random(["Avec plaisir 😉","De rien !"]);
    if(["souci","pb","aider","aide","probleme"].some(w =>lower.includes(w)))
        return random(["A quelle niveau ?","ca conserne quoi"])

    return null;
}

// ================= USER INFO =================
function extractUserInfo(message) {
    const info = {};
    const lower = message.toLowerCase();

    if (lower.includes('my name is')|| lower.includes('mon nom est'))
        info.name = message.split('my name is')[1]?.trim().split(' ')[0];

    if (lower.includes('years old'))
        info.age = message.match(/\d+/)?.[0];

    if (lower.includes('i live in') || lower.includes('i am from'))
        info.location = message.split(/(?:i live in|i am from)/i)[1]
            ?.trim().split(/[.,!?]/)[0];

    return info;
}

// ================= AI RESPONSE =================
async function getAIResponse(text, context = {}) {

    const fast = quickReplies(text);
    if (fast) return fast;

    try {

        const history = (context.messages || [])
            .slice(-6)
            .map(m =>
                `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.text.slice(0,200)}`
            )
            .join('\n');

        const userInfo = context.userInfo || {};

        const prompt = `
Tu es un ami qui discute naturellement sur WhatsApp.

Règles :
- réponses courtes
- ton humain
- precis et concis
- jamais robotique
- emojis légers
- naturel

Profil utilisateur:
Nom: ${userInfo.name || "inconnu"}
Age: ${userInfo.age || "inconnu"}
Lieu: ${userInfo.location || "inconnu"}

Conversation:
${history}

Message:
"${text}"

Réponds naturellement :
`;

        const result = await generateGeminiWithRotation(prompt);
        return result || "Hmm 😅 reformule un peu.";

    } catch (error) {
        console.error("Gemini error FULL:", error);
        return "😅 Petit bug IA… réessaie.";
    }
}


// ================= CHATBOT RESPONSE =================
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) return;

    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (senderId === botJid) return;

        const FREE_GROUP = "120363354190283631@g.us";

        let cleanedMessage = userMessage.trim();
        if (!cleanedMessage || cleanedMessage.length < 3) return;

        const context =
            message.message?.extendedTextMessage?.contextInfo ||
            message.message?.imageMessage?.contextInfo ||
            message.message?.videoMessage?.contextInfo;

        const mentionedJids = context?.mentionedJid || [];
        const isMentioned = mentionedJids.includes(botJid);

       const repliedToBot =
        context?.quotedMessage &&
        context?.participant &&
        context.participant.includes(botJid.split('@')[0]);


        // Init mémoire utilisateur
        if (!chatMemory.userInfo.has(senderId))
            chatMemory.userInfo.set(senderId, {});

        // Extraction infos
        const info = extractUserInfo(cleanedMessage);
        if (Object.keys(info).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...info
            });
        }

        // Ajouter message user mémoire
        addMessageToMemory(senderId, "user", cleanedMessage);

        const history = chatMemory.messages.get(senderId);

        const typingPromise = showTyping(sock, chatId, cleanedMessage);

        const response = await getAIResponse(cleanedMessage, {
            messages: history,
            userInfo: chatMemory.userInfo.get(senderId)
        });
        await typingPromise;

        if (!response) return;

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

        // Ajouter réponse bot mémoire
        addMessageToMemory(senderId, "assistant", response);

    } catch (err) {
        console.error("Chatbot error:", err);
    }
}

// ================= CHATBOT COMMAND =================
async function handleChatbotCommand(sock, chatId, message, match) {

    const data = loadUserGroupData();

    if (!match) {
        return sock.sendMessage(chatId,{
            text:`*CONFIGURATION CHATBOT*

chatbot on → activer
chatbot off → désactiver`
        },{quoted:message});
    }

    const action = match.toLowerCase().trim();

    if (action === "on")
        data.chatbot[chatId] = true;

    if (action === "off")
        delete data.chatbot[chatId];

    fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data,null,2));

    return sock.sendMessage(chatId,{
        text:`✅ Chatbot ${action === "on" ? "activé" : "désactivé"}`
    },{quoted:message});
}

// ================= EXPORT =================
module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
