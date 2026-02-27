const { callGeminiOfficial, callOpenAI, callDeepSeek, callMetaAI } = require("./ai");

/**
 * Détecte la longueur et génère le prompt de résumé
 */
function buildSummaryPrompt(text) {
    const length = text.length;

    let instruction = "";

    if (length < 500) {
        instruction = "Résume ce texte en 2 ou 3 phrases maximum.";
    } else if (length < 2000) {
        instruction = "Fais un résumé clair et concis en un seul paragraphe.";
    } else {
        instruction = `
Résume ce long texte de manière structurée :
- idées principales
- points importants
- conclusion courte

ne dépasse pas 300 mots. Utilise des listes à puces si nécessaire.`;
    }

    return `${instruction}\n\nTEXTE À RÉSUMER :\n${text}`;
}

/**
 * Commande résumé (en réponse à un message)
 */
async function resumeCommand(sock, chatId, message) {
    try {
        // Vérifie que c’est une réponse
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return sock.sendMessage(
                chatId,
                { text: "❌ Réponds à un message contenant un texte à résumer." },
                { quoted: message }
            );
        }

        // Récupération du texte cité
        let text = "";
        if (quoted.conversation) text = quoted.conversation;
        else if (quoted.extendedTextMessage?.text) text = quoted.extendedTextMessage.text;

        if (!text || text.length < 150) {
            return sock.sendMessage(
                chatId,
                { text: "⚠️ Le texte est trop court pour être résumé." },
                { quoted: message }
            );
        }

        await sock.sendMessage(chatId, {
            react: { text: "📝", key: message.key }
        });

        const prompt = buildSummaryPrompt(text);

        // 🔁 Ordre de priorité IA
        let summary;

        try {
            summary = await callGeminiOfficial(prompt);
        } catch {
            try {
                summary = await callOpenAI(prompt);
            } catch {
                summary = await callMetaAI(prompt);
            }
        }

        if (!summary) throw new Error("Résumé vide");

        return sock.sendMessage(
            chatId,
            { text: `🧠 *Résumé intelligent :*\n\n${summary}` },
            { quoted: message }
        );

    } catch (err) {
        console.error("RESUME ERROR:", err.message);
        return sock.sendMessage(
            chatId,
            { text: "❌ Erreur lors du résumé." },
            { quoted: message }
        );
    }
}

module.exports = resumeCommand;