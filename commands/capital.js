const CapitalGame = require('../lib/capital');

const games = {};

/**
 * Lancer ou rejoindre une partie CAPITAL
 */
async function capitalCommand(sock, chatId, senderId) {
    // Vérifie si le joueur est déjà dans une partie
    if (Object.values(games).find(r =>
        r.game &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    )) {
        return sock.sendMessage(chatId, { text: '❌ Vous êtes déjà dans une partie CAPITAL.' });
    }

    // Cherche une partie en attente
    let room = Object.values(games).find(r => r.state === 'WAITING');

    if (room) {
        // Rejoint la partie
        room.playerB = senderId;
        room.game = new CapitalGame(room.playerA, senderId);
        room.state = 'PLAYING';
        room.roundsWithoutAnswer = 0;

        await sock.sendMessage(chatId, {
            text: `🌍 *CAPITAL – PARTIE COMMENCÉE*\n\n🎯 Tour de : @${room.game.currentTurn.split('@')[0]}\n⏱️ Temps par tour : 25 secondes\n• Tapez *exit* pour abandonner`,
            mentions: [room.game.currentTurn]
        });

        await sendCapitalHint(sock, room);
        startTimer(sock, room);

    } else {
        // Crée une nouvelle partie
        room = {
            id: 'capital-' + Date.now(),
            chatId,
            playerA: senderId,
            playerB: null,
            game: null,
            state: 'WAITING',
            timer: null,
            roundsWithoutAnswer: 0
        };

        games[room.id] = room;

        await sock.sendMessage(chatId, { text: '⏳ En attente d’un adversaire pour *CAPITAL*...' });
    }
}

/**
 * Masque la capitale pour le joueur
 */
function maskCapital(capital) {
    return capital.split('').map((c, i) => (i === 0 ? c : '_')).join(' ');
}

/**
 * Envoie la capitale masquée au joueur courant
 */
async function sendCapitalHint(sock, room) {
    const masked = maskCapital(room.game.capital);
    const country = room.game.country;

    await sock.sendMessage(room.chatId, {
        text: `
╔═════════════════════╗
║ 💡 *DEVINEZ LA CAPITALE !* ║
╠═════════════════════╣
║ 🌐 Pays : *${country}*
║ 🏙️ Capitale : ${masked}
║
║ 🎯 Tour de : @${room.game.currentTurn.split('@')[0]}
║ ⏱️ 25 secondes pour répondre
║ 📌 Score : 
║ • ${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
║ • ${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}
╚═════════════════════╝
        `,
        mentions: [room.game.currentTurn]
    });
}

/**
 * Timer 25 secondes par tour
 */
function startTimer(sock, room) {
    if (room.timer) clearTimeout(room.timer);

    room.timer = setTimeout(async () => {
        room.roundsWithoutAnswer += 1;
        room.game.switchTurn();

        if (room.roundsWithoutAnswer >= 2) {
            // Personne n'a trouvé → nouveau pays
            room.game.pickNewCapital();
            room.roundsWithoutAnswer = 0;
        }

        await sendCapitalHint(sock, room);
        startTimer(sock, room);
    }, 25000);
}

/**
 * Gérer la réponse d’un joueur
 */
async function handleCapitalAnswer(sock, chatId, senderId, text) {
    const room = Object.values(games).find(r =>
        r.state === 'PLAYING' &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    );

    if (!room || senderId !== room.game.currentTurn) return;

    const result = room.game.checkAnswer(senderId, text);

    if (result.status === 'win') {
        clearTimeout(room.timer);

        await sock.sendMessage(chatId, {
            text: `
🏆 *PARTIE TERMINÉE !*
🎉 @${senderId.split('@')[0]} a atteint 7 points et remporte la partie !

📊 Score final :
• ${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• ${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}
        `,
            mentions: [senderId]
        });

        delete games[room.id];
        return;
    }

    if (result.status === 'correct') {
        room.roundsWithoutAnswer = 0;

        await sock.sendMessage(chatId, {
            text: `
✅ *Bonne réponse !*
🌐 Pays : *${result.country}*
🏙️ Capitale : *${room.game.capital}*

📊 Score actuel :
• ${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• ${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}
        `,
            mentions: [room.game.currentTurn]
        });

        // Nouveau pays
        room.game.pickNewCapital();
        await sendCapitalHint(sock, room);
        return;
    }

    if (result.status === 'wrong') {
        room.roundsWithoutAnswer += 1;
        room.game.switchTurn();

        if (room.roundsWithoutAnswer >= 2) {
            room.game.pickNewCapital();
            room.roundsWithoutAnswer = 0;
        }

        await sendCapitalHint(sock, room);
    }
}

/**
 * Arrêter une partie manuellement
 */
async function stopCapitalGame(sock, chatId) {
    const room = Object.values(games).find(r => r.chatId === chatId && r.state === 'PLAYING');

    if (!room) return sock.sendMessage(chatId, { text: '❌ Aucune partie en cours à arrêter.' });

    clearTimeout(room.timer);
    delete games[room.id];

    await sock.sendMessage(chatId, { text: '🛑 La partie CAPITAL a été arrêtée.' });
}

/**
 * Quitter une partie CAPITAL
 */
async function quitCapitalGame(sock, chatId, senderId) {
    const room = Object.values(games).find(r =>
        r.state === 'PLAYING' &&
        r.chatId === chatId &&
        [r.game.playerA, r.game.playerB].includes(senderId)
    );

    if (!room) return sock.sendMessage(chatId, { text: '❌ Vous n’êtes dans aucune partie CAPITAL.' });

    clearTimeout(room.timer);
    delete games[room.id];

    await sock.sendMessage(chatId, {
        text: `🏳️ *PARTIE CAPITAL TERMINÉE*\n\n@${senderId.split('@')[0]} a quitté la partie.`,
        mentions: [senderId]
    });
}

module.exports = {
    capitalCommand,
    handleCapitalAnswer,
    stopCapitalGame,
    quitCapitalGame
};
