const CapitalGame = require('../lib/capital');

const games = {};

async function capitalCommand(sock, chatId, senderId) {
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
Nombre de lettres : *${room.game.length}*

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

async function handleCapitalAnswer(sock, chatId, senderId, text) {
    const room = Object.values(games).find(r =>
        r.state === 'PLAYING' &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    );

    if (!room) return;
    if (senderId !== room.game.currentTurn) return;

    const win = room.game.checkAnswer(senderId, text);

    if (win) {
        clearTimeout(room.timer);

        await sock.sendMessage(chatId, {
            text: `🎉 *VICTOIRE !*

@${senderId.split('@')[0]} a trouvé la bonne réponse 🏆

🏙️ Capitale : *${room.game.capital}*
🌍 Pays : *${room.game.country}*`,
            mentions: [senderId]
        });

        delete games[room.id];
    }
}

module.exports = {
    capitalCommand,
    handleCapitalAnswer
};
