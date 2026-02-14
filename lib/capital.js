const { count } = require("node:console");

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
            { country: 'Canada', capital: 'montreal' },
            { country: 'Australie', capital: 'canberra' },
            { country: 'Inde', capital: 'newdelhi' },
            { country: 'États-Unis', capital: 'washington' },
            { country: 'Royaume-Uni', capital: 'londres' },
            { country: 'monaco', capital: 'monaco' },
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
            { country: 'Pologne', capital: 'varsovie' },
            { country: 'Portugal', capital: 'lisbonne' },
            { country: 'Belgique', capital: 'bruxelles' },
            { country: 'Suisse', capital: 'berne' },
            { country: 'Autriche', capital: 'vienne' },
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
            { country: 'Kosovo', capital: 'pristina' },
             { country: 'Liban', capital: 'beirut' },
             { country: 'Syrie', capital: 'damas' },
             { country: 'Jordanie', capital: 'amman' },
             { country: 'Irak', capital: 'bagdad' },
             { country: 'Iran', capital: 'teheran' },
             { country: 'Arabie Saoudite', capital: 'riyad' },
             { country: 'Émirats Arabes Unis', capital: 'abouddabi' },
             { country: 'Qatar', capital: 'doha' },
             { country: 'Koweït', capital: 'kuwaitcity' },
             { country: 'Oman', capital: 'masqat' },
             { country: 'Yémen', capital: 'sanaa' },
             { country: 'Soudan', capital: 'khartoum' },
             { country: 'Libye', capital: 'tripoli' },
             { country: 'Tunisie', capital: 'tunis' },
             { country: 'Maroc', capital: 'rabat' },
             { country: 'Algérie', capital: 'alger' },
             { country: 'Mauritanie', capital: 'nouakchott' },
             { country: 'Mali', capital: 'bamako' },
             { country: 'Niger', capital: 'niamey' },
             { country: 'Tchad', capital: 'ndjamena' },
             { country: 'Sénégal', capital: 'dakar' },
             { country: 'Guinée', capital: 'conakry' },
             { country: 'Côte d\'Ivoire', capital: 'yamoussoukro' },
             { country: 'Ghana', capital: 'accra' },
             { country: 'Burkina Faso', capital: 'ouagadougou' },
             { country: 'Bénin', capital: 'porto-novo' },
             { country: 'Togo', capital: 'lome' },
             { country: 'Sierra Leone', capital: 'freetown' },
             { country: 'Libéria', capital: 'monrovia' },
             { country: 'Cameroun', capital: 'yaounde' },
             { country: 'Gabon', capital: 'libreville' },
             { country: 'Congo-Brazzaville', capital: 'brazzaville' },
             { country: 'Congo-Kinshasa', capital: 'kinshasa' },
             { country: 'Angola', capital: 'luanda' },
             { country: 'Zambie', capital: 'lusaka' },
             { country: 'Zimbabwe', capital: 'harare' },
             { country: 'Namibie', capital: 'windhoek' },
             { country: 'Botswana', capital: 'gaborone' },
             { country: 'Mozambique', capital: 'maputo' },        
             { country: 'Madagascar', capital: 'antananarivo' },
             { country: 'Zanzibar', capital: 'zanzibarcity' },
             { country: 'Réunion', capital: 'saintdenis' },
             { country: 'Seychelles', capital: 'victoria' },
             { country: 'Maurice', capital: 'portlouis' },
             { country: 'Comores', capital: 'moroni' },
             { country: 'Cap-Vert', capital: 'praia' },
             { country: 'São Tomé-et-Príncipe', capital: 'saotome' },
             { country: 'Guinée-Bissau', capital: 'bissau' },
             { country: 'Timor oriental', capital: 'dili' },
             { country: 'Papouasie-Nouvelle-Guinée', capital: 'portmoresby' },
             { country: 'Fidji', capital: 'suva' },
             { country: 'Solomon', capital: 'honiara' },
             { country: 'Vanuatu', capital: 'portvila' },
             { country: 'Samoa', capital: 'apia' }
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

            if (this.scores[player] >= 3) {
                this.winner = player;
                return {
                    status: 'win',
                    winner: player,
                    scores: this.scores
                };
            }

            // Nouvelle capitale
            this.pickNewCapital();

            return {
                status: 'correct',
                player,
                scores: this.scores,
                country: this.country
            };
        }

        // Mauvaise réponse → tour suivant
        this.switchTurn();

        return {
            status: 'wrong',
            nextTurn: this.currentTurn
        };
    }

    switchTurn() {
        this.currentTurn =
            this.currentTurn === this.playerA
                ? this.playerB
                : this.playerA;
    }
}

module.exports = CapitalGame;
