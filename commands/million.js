const MillionGame = require("../lib/million");
const games = {};

async function sendQuestion(sock, chatId) {
    const game = games[chatId];
    if (!game) return;

    const q = game.currentQuestion;

    const text =
`💎 *QUI VEUT GAGNER DES MACH$* 💎

🎯 Joueur : @${game.currentTurn.split("@")[0]}
💰 Niveau : ${game.moneyLevels[game.level]}€

❓ ${q.question}

A) ${q.choices[0]}
B) ${q.choices[1]}
C) ${q.choices[2]}
D) ${q.choices[3]}

👉 Réponds avec : *slam A / B / C / D*
⏳ 10 secondes !`;

    await sock.sendMessage(chatId, {
        text,
        mentions: [game.currentTurn]
    });

    game.timer = setTimeout(() => {
        sock.sendMessage(chatId, { text: "⏰ Temps écoulé !" });
        game.switchTurn();
        sendQuestion(sock, chatId);
    }, 10000);
}

async function execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (args[0] === "start") {
        if (games[chatId])
            return sock.sendMessage(chatId, { text: "❌ Partie déjà en cours." });

        games[chatId] = new MillionGame(sender, sender);
        return sendQuestion(sock, chatId);
    }

    if (args[0] === "stop") {
        delete games[chatId];
        return sock.sendMessage(chatId, { text: "🛑 Partie arrêtée." });
    }
}

async function handleSlam(sock, msg, text) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const game = games[chatId];
    if (!game) return;

    if (sender !== game.currentTurn)
        return sock.sendMessage(chatId, { text: "⛔ Pas ton tour." });

    clearTimeout(game.timer);

    const input = text.split(" ")[1]?.toUpperCase();
    if (!["A","B","C","D"].includes(input)) return;

    const index = ["A","B","C","D"].indexOf(input);
    const result = game.checkAnswer(index);

    if (result.status === "correct") {
        await sock.sendMessage(chatId, { text: `✅ Bonne réponse !` });
    } else if (result.status === "wrong") {
        await sock.sendMessage(chatId, { text: `❌ Mauvaise réponse.` });
        game.switchTurn();
    } else if (result.status === "win") {
        await sock.sendMessage(chatId, { text: `🏆 1 MILLION € GAGNÉ !!!` });
        delete games[chatId];
        return;
    }

    sendQuestion(sock, chatId);
}

module.exports = {
    name: "million",
    run:execute,
    handleSlam
};
