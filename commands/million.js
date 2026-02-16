const MillionGame = require("../lib/million");
const games = {};

async function sendQuestion(sock, chatId) {
    const game = games[chatId];
    if (!game) return;

    const q = game.currentQuestion;

    const text =
`💎 *QUI VEUT GAGNER DES MACH$* 💎

🎯 Joueur : @${game.currentTurn.split("@")[0]}
💰 Argent : ${game.moneyLevels[game.level]}🤑 €

❓ *${q.question}*

A) ${q.choices[0]}
B) ${q.choices[1]}
C) ${q.choices[2]}
D) ${q.choices[3]}

👉 Réponds avec : *slam A / B / C / D*
⏳ 20 secondes !`;

    await sock.sendMessage(chatId, {
        text,
        mentions: [game.currentTurn]
    });

    game.timer = setTimeout(() => {
        sock.sendMessage(chatId, { text: "⏰ Temps écoulé !" });
        game.switchTurn();
        sendQuestion(sock, chatId);
    }, 20000);
}

async function execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    
    if (args[0] === "join") {
    const game = games[chatId];
    if (!game)
        return sock.sendMessage(chatId, { text: "❌ Aucune partie." });

    game.addPlayer(sender);

    return sock.sendMessage(chatId, {
        text: `✅ @${sender.split("@")[0]} a rejoint la partie !`,
        mentions: [sender]
    });
    }
    if (args[0] === "go") {
    const game = games[chatId];
    if (!game)
        return sock.sendMessage(chatId, { text: "❌ Aucune partie." });

    if (game.players.length < 2)
        return sock.sendMessage(chatId, { text: "⚠️ Minimum 2 joueurs." });

    return sendQuestion(sock, chatId);
    }

    if (!args[0] || args[0] === "start") {
        if (games[chatId])
            return sock.sendMessage(chatId, { text: "❌ Partie déjà en cours." });

                games[chatId] = new MillionGame(sender);

                await sock.sendMessage(chatId, {
                    text:
                `🎮 Partie créée !

                👉 Tape * *million join* pour participer
                ⏳ L'hôte lance avec * *million go*`
                });

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
        game.switchTurn();
    }else if (result.status === "wrong") {

        await sock.sendMessage(chatId, {
            text: `💀 @${sender.split("@")[0]} est éliminé !`,
            mentions: [sender]
        });

        game.eliminatePlayer(sender);

        const winner = game.getWinner();

        if (winner) {
            await sock.sendMessage(chatId, {
                text: `🏆 @${winner.split("@")[0]} est le dernier survivant et gagne la partie !`,
                mentions: [winner]
            });

            delete games[chatId];
            return;
        }

        game.switchTurn();
    }   

    else if (result.status === "win") {
        await sock.sendMessage(chatId, { text: `🏆 1 MILLION € GAGNÉ !!!` });
        delete games[chatId];
        return;
    }

    sendQuestion(sock, chatId);
}

module.exports = {execute,handleSlam};
