// const { callGeminiOfficial } = require('./commands/ai');

// module.exports = async (msg, sock) => {
//     try {
//         // Ignore messages du bot lui-même
//         if (msg.key.fromMe) return;

//         const remoteJid = msg.key.remoteJid;
//         const isGroup = remoteJid.endsWith('@g.us');
//         const isDM = remoteJid.endsWith('@s.whatsapp.net');

//         let text = "";
//         if (msg.message?.conversation) {
//             text = msg.message.conversation;
//         } else if (msg.message?.extendedTextMessage) {
//             text = msg.message.extendedTextMessage.text;
//         }

//         if (!text) return;

//         // Check if bot is mentioned in group
//         let isMentioned = false;
//         if (isGroup && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
//             const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
//             isMentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid.includes(botJid);
//         }

//         // Trigger only in DM or if mentioned in group
//         if (!(isDM || isMentioned)) return;

//         console.log("Auto Response Triggered for:", text);

//         // Nettoyer mentions
//         const botUsername = sock.user.name?.toLowerCase() || "machine_bot";
//         text = text.replace(new RegExp(`@${botUsername}`, "gi"), "").trim().toLowerCase();

//         // Réponses prédéfinies
//         let reply = null;
//         if (/bonjour|salut|bjr|yo/.test(text)) {
//             reply = "Salut 👋 comment tu vas ?";
//         } else if (/ça va/.test(text)) {
//             reply = "Oui ça va très bien merci 🤖 et toi ?";
//         } else if (/bien/.test(text)) {
//             reply = "Idem de mon côté";
//         } else if (/merci/.test(text)) {
//             reply = "Avec plaisir 😎";
//         }

//         // Sinon appel Gemini
//         if (!reply) {
//             try {
//                 const aiResponse = await callGeminiOfficial(text);
//                 reply = aiResponse || "🤖 Je n'ai pas de réponse pour ça 😅";
//             } catch (err) {
//                 console.error("AI call failed:", err.message);
//                 reply = "🤖 Erreur IA, réessaie plus tard.";
//             }
//         }

//         // Envoyer réponse
//         if (reply) await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });

//     } catch (err) {
//         console.error("AutoResponse Error:", err);
//     }
// };
