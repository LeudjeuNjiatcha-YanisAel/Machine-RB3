const CapitalGame = require('../lib/capital');

const games = {};

/**
 * Lancer / rejoindre une partie CAPITAL
 */
async function capitalCommand(sock, chatId, senderId) {
    // Déjà en partie ?
    if (Object.values(games).find(r =>
        r.game &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    )) {
        await sock.sendMessage(chatId, {
            text: '❌ Vous êtes déjà dans une partie CAPITAL.'
        });
        return;
    }

    let room = Object.values(games).find(r => r.state === 'WAITING');

    if (room) {
        room.playerB = senderId;
        room.game = new CapitalGame(room.playerA, senderId);
        room.state = 'PLAYING';

        startTimer(sock, room);

        await sock.sendMessage(chatId, {
            text: `🌍 *CAPITAL – PARTIE COMMENCÉE*

Pays : *${room.game.country}*

✍️ Écrivez le nom de la capitale

🎯 Tour de : @${room.game.currentTurn.split('@')[0]}
⏱️ Temps : 10 secondes`,
            mentions: [room.game.currentTurn]
        });

    } else {
        room = {
            id: 'capital-' + Date.now(),
            chatId,
            playerA: senderId,
            playerB: null,
            game: null,
            state: 'WAITING',
            timer: null
        };

        games[room.id] = room;

        await sock.sendMessage(chatId, {
            text: '⏳ En attente d’un adversaire pour *CAPITAL*'
        });
    }
}

/**
 * Timer 10 secondes
 */
function startTimer(sock, room) {
    if (room.timer) clearTimeout(room.timer);

    room.timer = setTimeout(async () => {
        room.game.switchTurn();

        await sock.sendMessage(room.chatId, {
            text: `⏱️ Temps écoulé !

🎯 Tour de : @${room.game.currentTurn.split('@')[0]}`,
            mentions: [room.game.currentTurn]
        });

        startTimer(sock, room);
    }, 10000);
}

/**
 * Réponses des joueurs
 */
async function handleCapitalAnswer(sock, chatId, senderId, text) {
    const room = Object.values(games).find(r =>
        r.state === 'PLAYING' &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    );

    if (!room) return;
    if (senderId !== room.game.currentTurn) return;

    const result = room.game.checkAnswer(senderId, text);

    // Partie terminée
    if (result.status === 'win') {
        clearTimeout(room.timer);

        await sock.sendMessage(chatId, {
            text: `🏆 *PARTIE TERMINÉE !*

@${senderId.split('@')[0]} a gagné 🎉

📊 Score final :
${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}`,
            mentions: [senderId]
        });

        delete games[room.id];
        return;
    }

    // Bonne réponse (mais pas encore 3 points)
    if (result.status === 'correct') {
        await sock.sendMessage(chatId, {
            text: `✅ Bonne réponse !

📊 Score :
${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}

🌍 Nouveau pays : *${room.game.country}*

🎯 Tour de : @${room.game.currentTurn.split('@')[0]}`,
            mentions: [room.game.currentTurn]
        });

        startTimer(sock, room);
        return;
    }

    // Mauvaise réponse
    if (result.status === 'wrong') {
        await sock.sendMessage(chatId, {
            text: `❌ Mauvaise réponse !

🎯 Tour de : @${room.game.currentTurn.split('@')[0]}`,
            mentions: [room.game.currentTurn]
        });

        startTimer(sock, room);
    }
}

module.exports = {
    capitalCommand,
    handleCapitalAnswer
};
