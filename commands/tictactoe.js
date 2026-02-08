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
                '11':'1️⃣',
                '12':'2️⃣',
                '13':'3️⃣',
                '14':'4️⃣',
                '15':'5️⃣',
                '16':'6️⃣',
                '17':'7️⃣',
                '18':'8️⃣',
                '19':'9️⃣',
                '20':'🔟',
                '21':'1️⃣',
                '22':'2️⃣',
                '23':'3️⃣',
                '24':'4️⃣',
                '25':'5️⃣',
                '26':'6️⃣',
                '27':'7️⃣',
                '28':'8️⃣',
                '29':'9️⃣',
                '30':'🔟',   
            }[v]));

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

${arr.slice(0, 7).join('')}
${arr.slice(7, 14).join('')}
${arr.slice(14, 21).join('')}
${arr.slice(21, 28).join('')}
${arr.slice(28, 35).join('')}
${arr.slice(35, 42).join('')}
${arr.slice(42, 49).join('')}

▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 4 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez un numéro (1-49) pour placer votre symbole
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
        
        if (!isquit && !/^([1-9]|[1-3][0-9]|4[0-9])$/.test(text)) return;

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
        let isTie = room.game.turns === 49;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '⬜',
            '2': '⬜',
            '3': '⬜',
            '4': '⬜',
            '5': '⬜',
            '6': '⬜',
            '7': '⬜',
            '8': '⬜',
            '9': '⬜',
            '10': '⬜',
            '11': '⬜',
            '12': '⬜',
            '13': '⬜',
            '14': '⬜',
            '15': '⬜',
            '16': '⬜',
            '17': '⬜',
            '18': '⬜',
            '19': '⬜',
            '20': '⬜',
            '21': '⬜',
            '22': '⬜',
            '23': '⬜',
            '24': '⬜',
            '25': '⬜',
            '26': '⬜',
            '27': '⬜',
            '28': '⬜',
            '29': '⬜',
            '30': '⬜',
            '31': '⬜',
            '32': '⬜',
            '33': '⬜',
            '34': '⬜',
            '35': '⬜',
            '36': '⬜',
            '37': '⬜',
            '38': '⬜',
            '39': '⬜',
            '40': '⬜',
            '41': '⬜',
            '42': '⬜',
            '43': '⬜',
            '44': '⬜',
            '45': '⬜',
            '46': '⬜',
            '47': '⬜',
            '48': '⬜',
            '49': '⬜'

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
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '⭕' : '❎'})`;
        }

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

${arr.slice(0, 7).join('')}
${arr.slice(7, 14).join('')}
${arr.slice(14, 21).join('')}
${arr.slice(21, 28).join('')}
${arr.slice(28, 35).join('')}
${arr.slice(35, 42).join('')}
${arr.slice(42, 49).join('')}



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
