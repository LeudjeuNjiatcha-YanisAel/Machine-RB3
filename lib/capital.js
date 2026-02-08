class CapitalGame {
    constructor(playerA, playerB) {
        this.playerA = playerA;
        this.playerB = playerB;
        this.currentTurn = playerA;
        this.winner = null;

        this.capitals = [
            // 🌍 Europe
            { country: 'France', capital: 'paris' },
            { country: 'Italie', capital: 'rome' },
            { country: 'Espagne', capital: 'madrid' },
            { country: 'Allemagne', capital: 'berlin' },
            { country: 'Portugal', capital: 'lisbonne' },
            { country: 'Belgique', capital: 'bruxelles' },
            { country: 'Suisse', capital: 'berne' },
            { country: 'Autriche', capital: 'vienne' },
            { country: 'Pays-Bas', capital: 'amsterdam' },
            { country: 'Pologne', capital: 'varsovie' },
            { country: 'Grèce', capital: 'athenes' },
            { country: 'Norvège', capital: 'oslo' },
            { country: 'Suède', capital: 'stockholm' },
            { country: 'Finlande', capital: 'helsinki' },
            { country: 'Irlande', capital: 'dublin' },

            // 🌍 Afrique
            { country: 'Maroc', capital: 'rabat' },
            { country: 'Algérie', capital: 'alger' },
            { country: 'Tunisie', capital: 'tunis' },
            { country: 'Égypte', capital: 'lecaire' },
            { country: 'Sénégal', capital: 'dakar' },
            { country: 'Mali', capital: 'bamako' },
            { country: 'Côte d’Ivoire', capital: 'yamoussoukro' },
            { country: 'Nigeria', capital: 'abuja' },
            { country: 'Kenya', capital: 'nairobi' },
            { country: 'Afrique du Sud', capital: 'pretoria' },

            // 🌍 Amériques
            { country: 'Canada', capital: 'ottawa' },
            { country: 'États-Unis', capital: 'washington' },
            { country: 'Brésil', capital: 'brasilia' },
            { country: 'Argentine', capital: 'buenosaires' },
            { country: 'Mexique', capital: 'mexico' },
            { country: 'Chili', capital: 'santiago' },
            { country: 'Colombie', capital: 'bogota' },
            { country: 'Pérou', capital: 'lima' },

            // 🌍 Asie
            { country: 'Japon', capital: 'tokyo' },
            { country: 'Chine', capital: 'pekin' },
            { country: 'Inde', capital: 'newdelhi' },
            { country: 'Thaïlande', capital: 'bangkok' },
            { country: 'Vietnam', capital: 'hanoi' },
            { country: 'Indonésie', capital: 'jakarta' },
            { country: 'Arabie Saoudite', capital: 'riyad' },
            { country: 'Turquie', capital: 'ankara' },

            // 🌍 Océanie
            { country: 'Australie', capital: 'canberra' },
            { country: 'Nouvelle-Zélande', capital: 'wellington' }
        ];

        const pick = this.capitals[Math.floor(Math.random() * this.capitals.length)];
        this.country = pick.country;
        this.capital = pick.capital;
        this.length = pick.capital.length;
    }

    checkAnswer(player, answer) {
        if (player !== this.currentTurn) return false;

        if (answer.toLowerCase().replace(/\s/g, '') === this.capital) {
            this.winner = player;
            return true;
        }

        this.switchTurn();
        return false;
    }

    switchTurn() {
        this.currentTurn =
            this.currentTurn === this.playerA
                ? this.playerB
                : this.playerA;
    }
}

module.exports = CapitalGame;
