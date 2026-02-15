// const fs = require('fs');
// const path = require('path');
// const { callGeminiOfficial } = require('./commands/ai');
// const e = require('express');


// function isOwner(senderId, sock) {
//     if (!senderId || !sock?.user?.id) return false;

//     const botId = sock.user.id.split(':')[0]; // enlève device id
//     const sender = senderId.split(':')[0];

//     return sender === botId;
// }

// /* ================= CONFIG ================= */


// const CONFIG_PATH = path.join(__dirname, 'autoresponse.json');

// /* ================= STATE ================= */

// let AUTO_RESPONSE_ENABLED = true;

// // Charger état sauvegardé
// try {
//     if (fs.existsSync(CONFIG_PATH)) {
//         const saved = JSON.parse(fs.readFileSync(CONFIG_PATH));
//         AUTO_RESPONSE_ENABLED = saved.enabled ?? true;
//     }
// } catch (e) {
//     console.log("AutoResponse config load error");
// }

// function saveState() {
//     fs.writeFileSync(CONFIG_PATH, JSON.stringify({
//         enabled: AUTO_RESPONSE_ENABLED
//     }, null, 2));
// }

// /* ================= MEMORY ================= */

// const conversationMemory = {}; // { userId: [] }

// /* ================= MAIN ================= */

// async function autoResponse(msg, sock) {
//     try {
//         if (!msg?.key?.remoteJid) return;
//         if (msg.key.fromMe) return;

//         const remoteJid = msg.key.remoteJid;
//         const isGroup = remoteJid.endsWith('@g.us');

//         const senderId = isGroup
//             ? msg.key.participant
//             : remoteJid;

//         let text =
//             msg.message?.conversation ||
//             msg.message?.extendedTextMessage?.text;

//         if (!text) return;

//         const rawText = text.trim();
//         const lowerText = rawText.toLowerCase();

//         /* ================= OWNER COMMANDS ================= */

//         if (isOwner(senderId, sock))
//         {

//             if (lowerText === '*autoresponse off') {
//                 AUTO_RESPONSE_ENABLED = false;
//                 saveState();

//                 await sock.sendMessage(remoteJid, {
//                     text: "⛔ Auto-response désactivée"
//                 }, { quoted: msg });

//                 return;
//             }

//             if (lowerText === '*autoresponse on') {
//                 AUTO_RESPONSE_ENABLED = true;
//                 saveState();

//                 await sock.sendMessage(remoteJid, {
//                     text: "✅ Auto-response activée"
//                 }, { quoted: msg });

//                 return;
//             }
//         }

//         /* ================= STOP SI OFF ================= */

//         if (!AUTO_RESPONSE_ENABLED) return;

//         /* ================= TRIGGER ================= */

//         let isMentioned = false;

//         if (isGroup) {
//             const mentions =
//                 msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

//             const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
//             isMentioned = mentions.includes(botJid);
//         }

//         // répondre seulement en DM ou mention
//         if (!( !isGroup || isMentioned )) return;

//         /* ================= MEMORY ================= */

//         if (!conversationMemory[senderId])
//             conversationMemory[senderId] = [];

//         conversationMemory[senderId].push(`User: ${rawText}`);

//         if (conversationMemory[senderId].length > 5)
//             conversationMemory[senderId].shift();

//         const history = conversationMemory[senderId].join('\n');

//         /* ================= QUICK REPLIES ================= */

//         let reply = null;

//         if (/(bonjour|salut|bjr|yo)/i.test(lowerText))
//             reply = "Salut 👋 comment tu vas ?";
//         else if (/(merci|thanks)/i.test(lowerText))
//             reply = "Avec plaisir 😄";
//         else if (/(bye|au revoir)/i.test(lowerText))
//             reply = "À bientôt 👋";
//         else if (/(ton nom|comment tu t'appelles)/i.test(lowerText)) {
//             reply = "Je suis un bot WhatsApp 🤖";
//         }
//         else if (/(aide|help)/i.test(lowerText)) {
//             reply = "Je peux discuter et répondre intelligemment 😉";
//         }
//         else if (/(blague|joke)/i.test(lowerText)) {
//             reply = "Pourquoi les devs aiment la nuit ? Parce que les bugs dorment 😄";
//         }

//         /* ================= GEMINI ================= */

//         if (!reply) {
//             try {

//                 reply = await callGeminiOfficial(`
// Tu es un chatbot WhatsApp humain.
// Réponses naturelles, courtes, de maniere conversationnelle avec les emojis parfois, jamais robotique.

// Historique:
// ${history}

// Message:
// "${rawText}"
//                 `);

//                 if (!reply?.trim())
//                     reply = "🤖 Hmm… redis-moi 😅";

//             } catch (err) {
//                 console.error("Gemini error:", err.message);
//                 reply = "😅 Petit bug IA.";
//             }
//         }

//         /* ================= SAVE MEMORY ================= */

//         conversationMemory[senderId].push(`Bot: ${reply}`);

//         if (conversationMemory[senderId].length > 5)
//             conversationMemory[senderId].shift();

//         /* ================= SEND ================= */

//         await sock.sendMessage(
//             remoteJid,
//             { text: reply },
//             { quoted: msg }
//         );

//     } catch (err) {
//         console.error("AutoResponse Error:", err);
//     }
// }

// module.exports = autoResponse;

