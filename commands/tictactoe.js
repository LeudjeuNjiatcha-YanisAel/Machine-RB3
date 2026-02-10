const TicTacToe = require('../lib/tictactoe');

// Stocker les parties globalement
const games = {};

// ====== MAPPING GRILLE 7x7 ALIGNÉ ======
const LETTERS = ['A','B','C','D','E','F','G'];

function renderCell(v, i) {
    if (v === 'X') return '❎';
    if (v === 'O') return '⭕';

    const row = Math.floor(i / 7);
    const col = i % 7;
    return LETTERS[row] + (col + 1);
}
// =====================================


async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        if (Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, {
                text: '❌ Vous êtes déjà dans une partie. Tapez *quit* pour quitter.'
            });
            return;
        }

        let room = Object.values(games).find(room =>
            room.state === 'WAITING' &&
            (text ? room.name === text : true)
        );

        if (room) {
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map((v, i) => renderCell(v, i));

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

│ ${arr.slice(0, 7).join(' │ ')} │
│ ${arr.slice(7, 14).join(' │ ')} │
│ ${arr.slice(14, 21).join(' │ ')} │
│ ${arr.slice(21, 28).join(' │ ')} │
│ ${arr.slice(28, 35).join(' │ ')} │
│ ${arr.slice(35, 42).join(' │ ')} │
│ ${arr.slice(42, 49).join(' │ ')} │

▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 4 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez une position (ex: A1, C5, G7)
• Tapez *quit* pour abandonner
`;

            await sock.sendMessage(chatId, {
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, {
                text: `⏳ *En attente d’un adversaire*\nTapez **accept* ${text || ''}* pour rejoindre !`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('Erreur dans la commande tictactoe :', error);
    }
}


async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        const isquit = /^(quit|give up)$/i.test(text);

        let move = NaN;
        const match = text.toUpperCase().match(/^([A-G])([1-7])$/);

        if (match) {
            const row = LETTERS.indexOf(match[1]);
            const col = parseInt(match[2], 10) - 1;
            move = row * 7 + col + 1;
        }

        const room = Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId) &&
            room.state === 'PLAYING'
        );

        if (!room) return;

        if (!isquit && (!Number.isInteger(move) || move < 1 || move > 49)) {
            await sock.sendMessage(chatId, {
                text: '❌ Choisis une position valide (ex: A1, D4, G7).'
            });
            return;
        }

        if (senderId !== room.game.currentTurn && !isquit) {
            await sock.sendMessage(chatId, { text: '❌ Ce n’est pas ton tour !' });
            return;
        }

        const ok = isquit ? true : room.game.turn(
            senderId === room.game.playerO,
            move - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, { text: '❌ Cette case est déjà occupée.' });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 49;

        const arr = room.game.render().map((v, i) => renderCell(v, i));

        if (isquit) {
            winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;

            await sock.sendMessage(chatId, {
                text: `🏳️ @${senderId.split('@')[0]} a abandonné ! @${winner.split('@')[0]} remporte la partie !`,
                mentions: [senderId, winner]
            });

            delete games[room.id];
            return;
        }

        let gameStatus;
        if (winner) {
            gameStatus = `🎉 @${winner.split('@')[0]} remporte la partie !`;
        } else if (isTie) {
            gameStatus = `🤝 La partie se termine par un match nul !`;
        } else {
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '⭕' : '❎'})`;
        }

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

│ ${arr.slice(0, 7).join(' │ ')} │
│ ${arr.slice(7, 14).join(' │ ')} │
│ ${arr.slice(14, 21).join(' │ ')} │
│ ${arr.slice(21, 28).join(' │ ')} │
│ ${arr.slice(28, 35).join(' │ ')} │
│ ${arr.slice(35, 42).join(' │ ')} │
│ ${arr.slice(42, 49).join(' │ ')} │

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Tapez une position (ex: A1, D4, G7)\n• Tapez *quit* pour abandonner' : ''}
`;

        const mentions = [
            room.game.playerX,
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, { text: str, mentions });
        if (room.x !== room.o) await sock.sendMessage(room.o, { text: str, mentions });

        if (winner || isTie) delete games[room.id];

    } catch (error) {
        console.error('Erreur dans le coup tictactoe :', error);
    }
}


module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};
