const CapitalGame = require('../lib/capital');

const games = {};

/**
 * Lancer ou rejoindre une partie CAPITAL
 */
async function capitalCommand(sock, chatId, senderId) {
    try {
        // Vérifie si le joueur est déjà dans une partie
        const existingRoom = Object.values(games).find(r =>
            r.game &&
            [r.game.playerA, r.game.playerB].includes(senderId)
        );
        
        if (existingRoom) {
            return sock.sendMessage(chatId, { 
                text: '❌ *Vous êtes déjà dans une partie CAPITAL.*\nTapez `exit` pour quitter.' 
            });
        }

        // Cherche une partie en attente
        let room = Object.values(games).find(r => r.state === 'WAITING');

        if (room) {
            // Rejoint la partie
            room.playerB = senderId;
            room.game = new CapitalGame(room.playerA, senderId);
            room.state = 'PLAYING';
            room.roundsWithoutAnswer = 0;
            room.chatId = chatId; // Mettre à jour le chatId

            await sock.sendMessage(chatId, {
                text: `🌍 *CAPITAL – PARTIE COMMENCÉE* 🌍\n\n🎯 Tour de : @${room.game.currentTurn.split('@')[0]}\n⏱️ Temps par tour : 25 secondes\n📌 Score à atteindre : *7 points*\n\n• Tapez \`exit\` pour abandonner`,
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
                roundsWithoutAnswer: 0,
                lastActivity: Date.now()
            };

            games[room.id] = room;

            await sock.sendMessage(chatId, { 
                text: `⏳ *En attente d'un adversaire pour CAPITAL...*\n\n👤 Créateur : @${senderId.split('@')[0]}\n\nUn joueur peut rejoindre avec la commande :\n\`capital\``,
                mentions: [senderId]
            });
        }
    } catch (error) {
        console.error('Erreur capitalCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Une erreur est survenue lors de la création de la partie.' 
        });
    }
}

/**
 * Masque la capitale pour le joueur
 */
function maskCapital(capital) {
    if (!capital || capital.length === 0) return '';
    
    const firstLetter = capital.charAt(0).toUpperCase();
    const masked = '_ '.repeat(capital.length - 1).trim();
    return `${firstLetter} ${masked}`;
}

/**
 * Envoie la capitale masquée au joueur courant
 */
async function sendCapitalHint(sock, room) {
    try {
        if (!room || !room.game || !room.game.capital || !room.game.country) {
            console.error('Données manquantes pour sendCapitalHint');
            return;
        }

        const masked = maskCapital(room.game.capital.toLowerCase());
        const country = room.game.country;

        const message = `
╔═══════════════════════════════╗
║     💡 *DEVINEZ LA CAPITALE !*     ║
╠═══════════════════════════════╣
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
║ 🎯 *Objectif :* 7 points
╚═══════════════════════════════╝
        `;

        await sock.sendMessage(room.chatId, {
            text: message,
            mentions: [room.game.currentTurn, room.game.playerA, room.game.playerB]
        });

        room.lastActivity = Date.now();
    } catch (error) {
        console.error('Erreur sendCapitalHint:', error);
    }
}

/**
 * Timer 25 secondes par tour
 */
function startTimer(sock, room) {
    if (!room) return;
    
    // Nettoyer l'ancien timer
    if (room.timer) {
        clearTimeout(room.timer);
    }

    room.timer = setTimeout(async () => {
        try {
            if (!games[room.id]) return; // La partie a été supprimée
            
            room.roundsWithoutAnswer += 1;
            const previousPlayer = room.game.currentTurn;
            room.game.switchTurn();

            // Message d'annonce du temps écoulé
            await sock.sendMessage(room.chatId, {
                text: `⏰ *TEMPS ÉCOULÉ !*\n\nLe tour de @${previousPlayer.split('@')[0]} est terminé.\n\n🎯 C'est maintenant au tour de : @${room.game.currentTurn.split('@')[0]}`,
                mentions: [previousPlayer, room.game.currentTurn]
            });

            if (room.roundsWithoutAnswer >= 2) {
                // Deux tours sans réponse → nouveau pays
                room.game.pickNewCapital();
                room.roundsWithoutAnswer = 0;
                
                await sock.sendMessage(room.chatId, {
                    text: '🔀 *Nouveau pays sélectionné !*\n\nPersonne n\'a trouvé la capitale précédente.'
                });
            }

            await sendCapitalHint(sock, room);
            
            // Redémarrer le timer pour le nouveau tour
            startTimer(sock, room);
            
        } catch (error) {
            console.error('Erreur dans le timer:', error);
        }
    }, 25000); // 25 secondes
}

/**
 * Gérer la réponse d'un joueur
 */
async function handleCapitalAnswer(sock, chatId, senderId, text) {
    try {
        const room = Object.values(games).find(r =>
            r.state === 'PLAYING' &&
            r.chatId === chatId &&
            [r.game.playerA, r.game.playerB].includes(senderId)
        );

        if (!room) return;

        // Vérifier si c'est le tour du joueur
        if (senderId !== room.game.currentTurn) {
            await sock.sendMessage(chatId, {
                text: `⏳ *Ce n'est pas votre tour !*\n\n🎯 C'est actuellement le tour de : @${room.game.currentTurn.split('@')[0]}`,
                mentions: [room.game.currentTurn]
            });
            return;
        }

        // Gestion de la commande exit/quit
        if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
            await quitCapitalGame(sock, chatId, senderId);
            return;
        }

        const result = room.game.checkAnswer(senderId, text);

        // Arrêter le timer actuel
        clearTimeout(room.timer);

        if (result.status === 'win') {
            await sock.sendMessage(chatId, {
                text: `
🏆 *PARTIE TERMINÉE - VICTOIRE !* 🏆
🎉 *@${senderId.split('@')[0]}* a atteint 7 points !

📊 *SCORE FINAL :*
• @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}

🎮 Tapez \`capital\` pour rejouer !
                `,
                mentions: [senderId, room.game.playerA, room.game.playerB]
            });

            delete games[room.id];
            return;
        }

        if (result.status === 'correct') {
            room.roundsWithoutAnswer = 0;

            await sock.sendMessage(chatId, {
                text: `
✅ *BONNE RÉPONSE !* ✅
🎉 *@${senderId.split('@')[0]}* +1 point

🌐 *Pays :* ${result.country}
🏙️ *Capitale :* ${room.game.capital}

📊 *SCORE ACTUEL :*
• @${room.game.playerA.split('@')[0]} : ${room.game.scores[room.game.playerA]}
• @${room.game.playerB.split('@')[0]} : ${room.game.scores[room.game.playerB]}
                `,
                mentions: [senderId, room.game.playerA, room.game.playerB]
            });

            // Nouveau pays
            room.game.pickNewCapital();
            
            // Attendre 2 secondes avant d'envoyer le nouveau défi
            setTimeout(async () => {
                await sendCapitalHint(sock, room);
                startTimer(sock, room);
            }, 2000);
            
            return;
        }

        if (result.status === 'wrong') {
            room.roundsWithoutAnswer += 1;
            const previousPlayer = room.game.currentTurn;
            room.game.switchTurn();

            await sock.sendMessage(chatId, {
                text: `❌ *Mauvaise réponse !*\n\nLa capitale était : *${room.game.capital}*\n\n⏳ Le tour passe à : @${room.game.currentTurn.split('@')[0]}`,
                mentions: [previousPlayer, room.game.currentTurn]
            });

            if (room.roundsWithoutAnswer >= 2) {
                room.game.pickNewCapital();
                room.roundsWithoutAnswer = 0;
                
                await sock.sendMessage(chatId, {
                    text: '🔀 *Nouveau pays sélectionné !*'
                });
            }

            await sendCapitalHint(sock, room);
            startTimer(sock, room);
        }

    } catch (error) {
        console.error('Erreur handleCapitalAnswer:', error);
    }
}

/**
 * Arrêter une partie manuellement (admin)
 */
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

module.exports = {
    capitalCommand,
    handleCapitalAnswer,
    stopCapitalGame,
    quitCapitalGame,
    cleanupInactiveGames
};
