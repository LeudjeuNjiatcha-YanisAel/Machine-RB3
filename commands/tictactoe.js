const TicTacToe = require('../lib/tictactoe');

// Stocker les parties globalement
const games = {};

/* =========================
   🎨 RENDER BOARD PROPRE
========================= */

// Convertit X / O / nombres en emojis
function renderEmojiBoard(board) {
    return board.map(v => {
        if (v === 'X') return '❎';
        if (v === 'O') return '⭕';

        const n = Number(v);
        if (n % 10 === 0) return '🔟';
        return ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][n % 10];
    });
}

// Transforme le tableau en grille 10x10
function boardToString(arr) {
    let out = '';
    for (let i = 0; i < 100; i += 10) {
        out += arr.slice(i, i + 10).join('') + '\n';
    }
    return out;
}

/* =========================
   🎮 START / JOIN GAME
========================= */

async function tictactoeCommand(sock, chatId, senderId, text) {
    try {

        // Vérifie si déjà dans une partie
        if (Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, {
                text: '❌ Vous êtes déjà dans une partie. Tapez *quit* pour quitter.'
            });
            return;
        }

        // Cherche salle en attente
        let room = Object.values(games).find(room =>
            room.state === 'WAITING' &&
            (text ? room.name === text : true)
        );

        if (room) {
            // Rejoindre
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = renderEmojiBoard(room.game.render());
            const boardStr = boardToString(arr);

            const str = `
🎮 *Partie TicTacToe commencée !*

🎲 Tour de : @${room.game.currentTurn.split('@')[0]}

${boardStr}

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

• Tapez un numéro (1-100) pour jouer
• Tapez *quit* pour abandonner
`;

            await sock.sendMessage(chatId, {
                text: str,
                mentions: [room.game.playerX, room.game.playerO]
            });

        } else {
            // Créer nouvelle salle
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            games[room.id] = room;

            await sock.sendMessage(chatId, {
                text: `⏳ *En attente d’un adversaire*\nTapez *accept ${text || ''}* pour rejoindre !`
            });
        }

    } catch (error) {
        console.error('Erreur tictactoeCommand :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Erreur lors du démarrage.'
        });
    }
}

/* =========================
   🎯 HANDLE MOVE
========================= */

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {

        const isQuit = /^(quit|give up)$/i.test(text);
        const cleaned = text.replace(/[^\d]/g, '');
        const move = cleaned ? parseInt(cleaned, 10) : NaN;

        const room = Object.values(games).find(room =>
            room.id.startsWith('tictactoe') &&
            [room.game.playerX, room.game.playerO].includes(senderId) &&
            room.state === 'PLAYING'
        );

        if (!room) return;

        if (!isQuit && (!Number.isInteger(move) || move < 1 || move > 100)) {
            await sock.sendMessage(chatId, {
                text: '❌ Choisis une position entre 1 et 100.'
            });
            return;
        }

        if (senderId !== room.game.currentTurn && !isQuit) {
            await sock.sendMessage(chatId, {
                text: '❌ Ce n’est pas ton tour !'
            });
            return;
        }

        const ok = isQuit ? true : room.game.turn(
            senderId === room.game.playerO,
            move - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette case est déjà occupée.'
            });
            return;
        }

        let winner = room.game.winner;
        const isTie = room.game.turns === 100;

        if (isQuit) {
            winner = senderId === room.game.playerX
                ? room.game.playerO
                : room.game.playerX;

            await sock.sendMessage(chatId, {
                text: `🏳️ @${senderId.split('@')[0]} abandonne !\n🏆 @${winner.split('@')[0]} gagne !`,
                mentions: [senderId, winner]
            });

            delete games[room.id];
            return;
        }

        const arr = renderEmojiBoard(room.game.render());
        const boardStr = boardToString(arr);

        let gameStatus;
        if (winner) {
            gameStatus = `🏆 @${winner.split('@')[0]} remporte la partie !`;
        } else if (isTie) {
            gameStatus = `🤝 Match nul !`;
        } else {
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]}`;
        }

        const str = `
🎮 *TicTacToe*

${gameStatus}

${boardStr}

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ?
'• Tapez un numéro (1-100)\n• Tapez *quit* pour abandonner'
: ''}
`;

        const mentions = [
            room.game.playerX,
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, {
            text: str,
            mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, {
                text: str,
                mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('Erreur handleTicTacToeMove :', error);
    }
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};
