const CapitalGame = require('../lib/capital');

const games = {};

/* =====================================================
   UTILITAIRE DE GESTION DES TOURS
===================================================== */
function advanceTurn(room) {
    const previousPlayer = room.game.currentTurn;

    // changer joueur
    room.game.switchTurn();

    const currentPlayer = room.game.currentTurn;

    let tourFinished = false;

    // si on revient au joueur qui a commencé le tour
    if (currentPlayer === room.turnStarter) {
        room.turnNumber++;
        tourFinished = true;
    }

    return { previousPlayer, currentPlayer, tourFinished };
}

/* =====================================================
   LANCER / REJOINDRE PARTIE
===================================================== */
async function capitalCommand(sock, chatId, senderId) {
    try {
        const existingRoom = Object.values(games).find(r =>
            r.game &&
            [r.game.playerA, r.game.playerB].includes(senderId)
        );

        if (existingRoom) {
            return sock.sendMessage(chatId, {
                text: '❌ *Vous êtes déjà dans une partie CAPITAL.*'
            });
        }

        let room = Object.values(games).find(r => r.state === 'WAITING');

        if (room) {
            room.playerB = senderId;
            room.game = new CapitalGame(room.playerA, senderId);
            room.state = 'PLAYING';
            room.roundsWithoutAnswer = 0;

            // ✅ gestion tours
            room.turnNumber = 1;
            room.turnStarter = room.game.currentTurn;

            await sock.sendMessage(chatId, {
                text:
`🌍 *CAPITAL – PARTIE COMMENCÉE*

🎯 Tour 1
Joueur : @${room.game.currentTurn.split('@')[0]}
⏱️ 25 secondes`,
                mentions: [room.game.currentTurn]
            });

            await sendCapitalHint(sock, room);
            startTimer(sock, room);

        } else {
            room = {
                id: 'capital-' + Date.now(),
                chatId,
                playerA: senderId,
                playerB: null,
                game: null,
                state: 'WAITING',
                timer: null,
                roundsWithoutAnswer: 0,
                turnNumber: 1,
                turnStarter: null,
                lastActivity: Date.now()
            };

            games[room.id] = room;

            await sock.sendMessage(chatId, {
                text:
`⏳ En attente d'un adversaire...
👤 Créateur : @${senderId.split('@')[0]}
Tapez *capital* pour rejoindre`,
                mentions: [senderId]
            });
        }
    } catch (e) {
        console.error(e);
    }
}

/* =====================================================
   MASQUER CAPITALE
===================================================== */
function maskCapital(capital) {
    const first = capital.charAt(0).toUpperCase();
    const masked = '_ '.repeat(capital.length - 1).trim();
    return `${first} ${masked}`;
}

/* =====================================================
   ENVOI QUESTION
===================================================== */
async function sendCapitalHint(sock, room) {

    const masked = maskCapital(room.game.capital.toLowerCase());
    const country = room.game.country;

    const message =
`╔════════════════════════╗
║     💡 *DEVINEZ LA CAPITALE !*     ║
╠═════════════════════════╣
║ 🌐 *Pays :* ${country}
║ 🏙️ *Capitale :* ${masked}
║
║ 🎯 *Tour de :* @${room.game.currentTurn.split('@')[0]}
║ ⏱️ *Temps :* 25 secondes
║
║ 📊 *SCORES :*
║ • @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA] || 0}
║ • @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB] || 0}
║
║ 🎯 *Objectif :* 10 points
╚════════ ════════════════╝`;

    await sock.sendMessage(room.chatId, {
        text: message,
        mentions: [
            room.game.currentTurn,
            room.game.playerA,
            room.game.playerB
        ]
    });

    room.lastActivity = Date.now();
}

/* =====================================================
   TIMER
===================================================== */
function startTimer(sock, room) {
    if (room.timer) clearTimeout(room.timer);

    room.timer = setTimeout(async () => {

        const { previousPlayer, currentPlayer, tourFinished } =
            advanceTurn(room);

        await sock.sendMessage(room.chatId, {
            text:
`⏰ Temps écoulé !

${tourFinished
? `✅ Tour ${room.turnNumber - 1} terminé`
: `➡️ Le tour continue`
}

🎯 Joueur suivant : @${currentPlayer.split('@')[0]}`,
            mentions: [previousPlayer, currentPlayer]
        });

        await sendCapitalHint(sock, room);
        startTimer(sock, room);

    }, 25000);
}

/* =====================================================
   REPONSE JOUEUR
===================================================== */
async function handleCapitalAnswer(sock, chatId, senderId, text) {
    try {
        const room = Object.values(games).find(r =>
            r.state === 'PLAYING' &&
            r.chatId === chatId &&
            [r.game.playerA, r.game.playerB].includes(senderId)
        );

        if (!room) return;

        if (senderId !== room.game.currentTurn) {
            return sock.sendMessage(chatId, {
                text:
`⏳ *Ce n'est pas ton tour !*

🎯 Tour actuel : @${room.game.currentTurn.split('@')[0]}`,
                mentions: [room.game.currentTurn]
            });
        }

        clearTimeout(room.timer);

        const currentCapital = room.game.capital;
        const result = room.game.checkAnswer(senderId, text);

        /* ================== BONNE REPONSE ================== */
        if (result.status === 'correct') {

            room.roundsWithoutAnswer = 0;

            // 🔥 Vérification MANUELLE victoire à 7 points
            if (room.game.scores[senderId] >= 10) {

                await sock.sendMessage(chatId, {
                    text:
`🏆 *VICTOIRE !*

🎉 @${senderId.split('@')[0]} atteint *7 points* !

📊 *SCORE FINAL :*
• @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}

Tapez *capital* pour rejouer !`,
                    mentions: [senderId, room.game.playerA, room.game.playerB]
                });

                delete games[room.id];
                return;
            }

            await sock.sendMessage(chatId, {
                text:
`✅ *Bonne réponse !*

🏙️ Capitale : *${currentCapital}*
🎉 +1 point pour @${senderId.split('@')[0]}

📊 Scores :
• @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}`,
                mentions: [senderId, room.game.playerA, room.game.playerB]
            });

            room.game.pickNewCapital();

            setTimeout(async () => {
                await sendCapitalHint(sock, room);
                startTimer(sock, room);
            }, 2000);

            return;
        }

        /* ================== MAUVAISE REPONSE ================== */
        if (result.status === 'wrong') {

            room.roundsWithoutAnswer++;

            const previousPlayer = room.game.currentTurn;

            // 🔥 Passage de tour FORCÉ
            room.game.switchTurn();

            const nextPlayer = room.game.currentTurn;

            await sock.sendMessage(chatId, {
                text:
`❌ *Mauvaise réponse !*

🏙️ La capitale était : *${currentCapital}*

➡️ Tour suivant : @${nextPlayer.split('@')[0]}`,
                mentions: [previousPlayer, nextPlayer]
            });

            if (room.roundsWithoutAnswer >= 2) {
                room.game.pickNewCapital();
                room.roundsWithoutAnswer = 0;

                await sock.sendMessage(chatId, {
                    text: `🔀 *Nouveau pays sélectionné !*`
                });
            }

            await sendCapitalHint(sock, room);
            startTimer(sock, room);
        }

    } catch (error) {
        console.error('Erreur handleCapitalAnswer:', error);
    }
}

async function stopCapitalGame(sock, chatId, senderId) {
    try {
        const room = Object.values(games).find(r => 
            r.chatId === chatId && 
            r.state === 'PLAYING'
        );

        if (!room) return sock.sendMessage(chatId, { 
            text: '❌ Aucune partie CAPITAL en cours à arrêter.' 
        });

        clearTimeout(room.timer);
        delete games[room.id];

        await sock.sendMessage(chatId, { 
            text: `🛑 *Partie CAPITAL arrêtée*\n\nLa partie a été interrompue par @${senderId.split('@')[0]}.`,
            mentions: [senderId]
        });
    } catch (error) {
        console.error('Erreur stopCapitalGame:', error);
    }
}

/**
 * Quitter une partie CAPITAL
 */
async function quitCapitalGame(sock, chatId, senderId) {
    try {
        const room = Object.values(games).find(r =>
            r.state === 'PLAYING' &&
            r.chatId === chatId &&
            [r.game.playerA, r.game.playerB].includes(senderId)
        );

        if (!room) return sock.sendMessage(chatId, { 
            text: '❌ Vous n\'êtes dans aucune partie CAPITAL en cours.' 
        });

        clearTimeout(room.timer);
        delete games[room.id];

        const winner = senderId === room.game.playerA ? room.game.playerB : room.game.playerA;
        
        await sock.sendMessage(chatId, {
            text: `🏳️ *PARTIE ABANDONNÉE* 🏳️\n\n@${senderId.split('@')[0]} a quitté la partie.\n\n🏆 @${winner.split('@')[0]} remporte la partie par forfait !\n\n📊 Score final :\n• @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}\n• @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}`,
            mentions: [senderId, winner, room.game.playerA, room.game.playerB]
        });
    } catch (error) {
        console.error('Erreur quitCapitalGame:', error);
    }
}

/**
 * Nettoyer les parties inactives (cron job optionnel)
 */
function cleanupInactiveGames() {
    const now = Date.now();
    const inactiveTimeout = 5 * 60 * 1000; // 5 minutes
    
    Object.keys(games).forEach(roomId => {
        const room = games[roomId];
        if (now - room.lastActivity > inactiveTimeout) {
            clearTimeout(room.timer);
            delete games[roomId];
        }
    });
}

// Nettoyage automatique toutes les 10 minutes
setInterval(cleanupInactiveGames, 10 * 60 * 1000);



/* =====================================================
   EXPORT
===================================================== */
module.exports = {
    capitalCommand,
    handleCapitalAnswer,
    stopCapitalGame,
    quitCapitalGame,
    games
};
