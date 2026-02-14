class CapitalGame {
    constructor(playerA, playerB) {
        this.playerA = playerA;
        this.playerB = playerB;

        this.scores = {
            [playerA]: 0,
            [playerB]: 0
        };

        this.currentTurn = playerA;
        this.winner = null;

        this.capitals = [
            { country: 'France', capital: 'paris' },
            { country: 'Italie', capital: 'rome' },
            { country: 'Espagne', capital: 'madrid' },
            { country: 'Allemagne', capital: 'berlin' },
            { country: 'Cameroun', capital: 'yaounde' },
            { country: 'Nigeria', capital: 'abuja' },
            { country: 'Japon', capital: 'tokyo' },
            { country: 'Chine', capital: 'pekin' },
            { country: 'Brésil', capital: 'brasilia' },
            { country: 'Canada', capital: 'ottawa' },
            { country: 'Australie', capital: 'canberra' },
            { country: 'Inde', capital: 'newdelhi' },
            { country: 'États-Unis', capital: 'washington' },
            { country: 'Royaume-Uni', capital: 'londres' },
            { country: 'Russie', capital: 'moscou' },
            { country: 'Mexique', capital: 'mexicocity' },
            { country: 'Argentine', capital: 'buenosaires' },
            { country: 'Égypte', capital: 'lecaire' },
            { country: 'Grèce', capital: 'athenes' },
            { country: 'Turquie', capital: 'ankara' },
            { country: 'Suède', capital: 'stockholm' },
            { country: 'Norvège', capital: 'oslo' },
            { country: 'Finlande', capital: 'helsinki' },
            { country: 'Danemark', capital: 'copenhague' },
            { country: 'Pays-Bas', capital: 'amsterdam' },
            { country: 'Belgique', capital: 'bruxelles' },
            { country: 'Suisse', capital: 'berne' },
            { country: 'Autriche', capital: 'vienne' },
            { country: 'Portugal', capital: 'lisbonne' },
            { country: 'Pologne', capital: 'varsovie' },
            { country: 'Hongrie', capital: 'budapest' },
            { country: 'République tchèque', capital: 'prague' },
            { country: 'Slovaquie', capital: 'bratislava' },
            { country: 'Bulgarie', capital: 'sofia' },
            { country: 'Roumanie', capital: 'bucharest' },
            { country: 'Serbie', capital: 'belgrade' },
            { country: 'Croatie', capital: 'zagreb' },
            { country: 'Bosnie-Herzégovine', capital: 'sarajevo' },
            { country: 'Slovénie', capital: 'ljubljana' },
            { country: 'Macédoine du Nord', capital: 'skopje' },
            { country: 'Albanie', capital: 'tirana' },
            { country: 'Monténégro', capital: 'podgorica' },
            { country: 'Lituanie', capital: 'vilnius' },
            { country: 'Lettonie', capital: 'riga' },
            { country: 'Estonie', capital: 'tallinn' },
            { country: 'Ukraine', capital: 'kiev' },
            { country: 'Biélorussie', capital: 'minsk' },
            { country: 'Moldavie', capital: 'chisinau' },
            { country: 'Géorgie', capital: 'tbilissi' },
            { country: 'Arménie', capital: 'erevan' },
            { country: 'Azerbaïdjan', capital: 'bakou' },
            { country: 'Kazakhstan', capital: 'noursoultan' },
            { country: 'Ouzbékistan', capital: 'tachkent' },
            { country: 'Turkménistan', capital: 'achgabat' },
            { country: 'Kirghizistan', capital: 'bichkek' },
            { country: 'Tadjikistan', capital: 'douchanbé' },   
            { country: 'Syrie', capital: 'damas' },
            { country: 'Liban', capital: 'beyrouth' },
            { country: 'Jordanie', capital: 'amman' },
            { country: 'Irak', capital: 'bagdad' },
            { country: 'Iran', capital: 'téhéran' },
            { country: 'Arabie Saoudite', capital: 'riyad' },
            { country: 'Émirats Arabes Unis', capital: 'abouddabi' },
            { country: 'Qatar', capital: 'doha' },
            { country: 'Koweït', capital: 'kuwaitcity' },
            { country: 'Bahreïn', capital: 'manama' },
            { country: 'Yémen', capital: 'sanaa' }
        ];

        this.pickNewCapital();
    }

    pickNewCapital() {
        const pick = this.capitals[Math.floor(Math.random() * this.capitals.length)];
        this.country = pick.country;
        this.capital = pick.capital.toLowerCase().replace(/\s/g, '');
    }

    checkAnswer(player, answer) {
        if (this.winner) return { status: 'ended' };

        const cleanAnswer = answer.toLowerCase().replace(/\s/g, '');

        if (cleanAnswer === this.capital) {
            this.scores[player] += 1;

            // Vérifier si joueur atteint le score max
            if (this.scores[player] >= 10) {
                this.winner = player;
                return { status: 'win', winner: player, scores: this.scores };
            }

            // La capitale sera changée par le module principal
            return { status: 'correct', player, scores: this.scores, country: this.country };
        }

        // Mauvaise réponse → ne rien changer ici
        return { status: 'wrong', currentTurn: this.currentTurn };
    }

    switchTurn() {
        this.currentTurn =
            this.currentTurn === this.playerA
                ? this.playerB
                : this.playerA;
    }
}

module.exports = CapitalGame;
