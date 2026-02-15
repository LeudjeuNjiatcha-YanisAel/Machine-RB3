const MillionGame = require("../lib/million");

const games = {};

module.exports = {
    name: "million",
    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        if (args[0] === "*start") {
            if (games[chatId]) return sock.sendMessage(chatId, { text: "❌ Une partie est déjà en cours." });

            games[chatId] = new MillionGame(sender, sender);

            return sendQuestion(sock, chatId);
        }

        if (args[0] === "*stop") {
            delete games[chatId];
            return sock.sendMessage(chatId, { text: "🛑 Partie arrêtée." });
        }
    }
};

async function sendQuestion(sock, chatId) {
    const game = games[chatId];
    const q = game.currentQuestion;

    let text =
`💎 *QUI VEUT GAGNER 1 MILLION* 💎

🎯 Joueur : @${game.currentTurn.split("@")[0]}
💰 Niveau : ${game.moneyLevels[game.level]}€

❓ ${q.question}

A) ${q.choices[0]}
B) ${q.choices[1]}
C) ${q.choices[2]}
D) ${q.choices[3]}

🆘 Lifelines:
- slam 50
- slam ami
- slam public

Réponds avec:
👉 * *slam A*
👉 * *slam B*
👉 * *slam C*
👉 * *slam D*

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

module.exports.handleSlam = async function(sock, msg, text) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const game = games[chatId];
    if (!game) return;

    if (sender !== game.currentTurn)
        return sock.sendMessage(chatId, { text: "⛔ Ce n'est pas ton tour." });

    clearTimeout(game.timer);

    const input = text.split(" ")[1]?.toUpperCase();

    if (["A", "B", "C", "D"].includes(input)) {
        const index = ["A","B","C","D"].indexOf(input);
        const result = game.checkAnswer(index);

        if (result.status === "correct") {
            await sock.sendMessage(chatId, { text: `✅ Bonne réponse ! 💰 ${result.money}€` });
        } else if (result.status === "wrong") {
            await sock.sendMessage(chatId, { text: `❌ Mauvaise réponse !` });
            game.switchTurn();
        } else if (result.status === "win") {
            await sock.sendMessage(chatId, { text: `🏆 1 MILLION € GAGNÉ !!!` });
            delete games[chatId];
            return;
        }

        return sendQuestion(sock, chatId);
    }

    if (input === "50") {
        const removed = game.useLifeline(sender, "fifty");
        return sock.sendMessage(chatId, { text: `❌ Réponses supprimées: ${removed.map(i => ["A","B","C","D"][i]).join(", ")}` });
    }

    if (input === "AMI") {
        const hint = game.useLifeline(sender, "friend");
        return sock.sendMessage(chatId, { text: hint });
    }

    if (input === "PUBLIC") {
        const poll = game.useLifeline(sender, "public");
        return sock.sendMessage(chatId, {
            text: `📊 Vote du public:\nA: ${poll[0]}%\nB: ${poll[1]}%\nC: ${poll[2]}%\nD: ${poll[3]}%`
        });
    }
};
