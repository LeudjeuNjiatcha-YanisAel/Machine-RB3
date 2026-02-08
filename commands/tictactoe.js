const TicTacToe = require('../lib/tictactoe');

// Stocker les parties globalement
const games = {};

async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        // Vérifier si le joueur est déjà dans une partie
        if (Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, { 
                text: '❌ Vous êtes déjà dans une partie. Tapez *quit* pour quitter.' 
            });
            return;
        }

        // Rechercher une salle existante
        let room = Object.values(games).find(room => 
            room.state === 'WAITING' && 
            (text ? room.name === text : true)
        );

        if (room) {
            // Rejoindre une salle existante
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map(v => ({
                'X': '❎',
                'O': '⭕',
                '1':'①',
                '2':'②',
                '3':'③',
                '4':'④',
                '5':'⑤',
                '6':'⑥',
                '7':'⑦',
                '8':'⑧',
                '9':'⑨',
                '10':'⑩',
                '11':'⑪',
                '12':'⑫',
                '13':'⑬',
                '14':'⑭',
                '15':'⑮',
                '16':'⑯',
                '17':'⑰',
                '18':'⑱',
                '19':'⑲',
                '20':'⑳',
                '21':'㉑',
                '22':'㉒',
                '23':'㉓',
                '24':'㉔',
                '25':'㉕'
            }[v]));

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

${arr.slice(0, 5).join('')}
${arr.slice(5, 10).join('')}
${arr.slice(10, 15).join('')}
${arr.slice(15, 20).join('')}
${arr.slice(20, 25).join('')}


▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 4 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez un numéro (1-25) pour placer votre symbole
• Tapez *quit* pour abandonner
`;

            // Envoyer le message une seule fois au groupe
            await sock.sendMessage(chatId, { 
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            // Créer une nouvelle salle
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, { 
                text: `⏳ *En attente d’un adversaire*\nTapez **accept ${text || ''}* pour rejoindre !`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('Erreur dans la commande tictactoe :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Erreur lors du démarrage de la partie. Veuillez réessayer.' 
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        // Trouver la partie du joueur
        const room = Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId) && 
            room.state === 'PLAYING'
        );

        if (!room) return;

        const isquit = /^(quit|give up)$/i.test(text);
        
        if (!isquit && !/^([1-9]|1[0-9]|2[0-5])$/.test(text)) return;

        // Autoriser l’abandon à tout moment
        if (senderId !== room.game.currentTurn && !isquit) {
            await sock.sendMessage(chatId, { 
                text: '❌ Ce n’est pas votre tour !' 
            });
            return;
        }

        let ok = isquit ? true : room.game.turn(
            senderId === room.game.playerO,
            parseInt(text) - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, { 
                text: '❌ Coup invalide ! Cette position est déjà occupée.' 
            });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 25;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '1️⃣',
            '2': '2️⃣',
            '3': '3️⃣',
            '4': '4️⃣',
            '5': '5️⃣',
            '6': '6️⃣',
            '7': '7️⃣',
            '8': '8️⃣',
            '9': '9️⃣',
            '10':'🔟',
            '11':'1️⃣1️⃣',
            '12':'1️⃣2️⃣',
            '13':'1️⃣3️⃣',
            '14':'1️⃣4️⃣',
            '15':'1️⃣5️⃣',
            '16':'1️⃣6️⃣',
            '17':'1️⃣7️⃣',
            '18':'1️⃣8️⃣',
            '19':'1️⃣9️⃣',
            '20':'2️⃣0️⃣',
            '21':'2️⃣1️⃣',
            '22':'2️⃣2️⃣',
            '23':'2️⃣3️⃣',
            '24':'2️⃣4️⃣',
            '25':'2️⃣5️⃣'
        }[v]));

        if (isquit) {
            // Définir le gagnant comme l’adversaire
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
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '❎' : '⭕'})`;
        }

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

${arr.slice(0, 5).join('')}
${arr.slice(5, 10).join('')}
${arr.slice(10, 15).join('')}
${arr.slice(15, 20).join('')}
${arr.slice(20, 25).join('')}


▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Tapez un numéro (1-9) pour jouer\n• Tapez *quit* pour abandonner' : ''}
`;

        const mentions = [
            room.game.playerX, 
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, { 
            text: str,
            mentions: mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, { 
                text: str,
                mentions: mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('Erreur dans le coup tictactoe :', error);
    }
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};
