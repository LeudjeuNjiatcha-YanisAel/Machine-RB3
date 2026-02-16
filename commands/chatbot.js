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

    if (["salut","bonjour","yo","bjr"].some(w=>lower.includes(w)))
        return random(["Salut 😄","Yo 👋","Hey !"]);

    if (["ça va","ca va","comment tu vas"].some(w=>lower.includes(w)))
        return random(["Ça va tranquille 😎 et toi ?","Oui nickel !"]);

    if (["merci","thanks"].some(w=>lower.includes(w)))
        return random(["Avec plaisir 😉","De rien !"]);

    return null;
}

// ================= USER INFO =================
function extractUserInfo(message) {
    const info = {};
    const lower = message.toLowerCase();

    if (lower.includes('my name is'))
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

        const result = await model.generateContent(prompt);

        const response = result.response;
        if (!response) throw new Error("Empty Gemini response");

        const responseText = response.text();

        return responseText?.trim() || "Hmm 😅 reformule un peu.";

    } catch (error) {
        console.error("Gemini error FULL:", error);
        return "😅 Petit bug IA… réessaie.";
    }
}


// ================= CHATBOT RESPONSE =================
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {

    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (senderId === botJid) return;

        let cleanedMessage = userMessage.trim();
        if (!cleanedMessage || cleanedMessage.length < 2) return;

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
