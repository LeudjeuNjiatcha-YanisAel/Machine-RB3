const fs = require("fs");
const path = require("path");

class MillionGame {
    constructor(host) {
        this.players = [host];

        this.lives = {};
        this.levels = {};
        this.money = {};

        this.lives[host] = 3;
        this.levels[host] = 0;
        this.money[host] = 0;

        this.currentPlayerIndex = 0;

        this.moneyLevels = [
            100,150,200,250,300,350,400,450,500,550,
            600,650,700,750,800,850,900,950,
            1000,2000,3000,4000,5000,10000,
            50000,100000,500000,1000000
        ];

        this.usedQuestions = [];

        this.loadQuestions();
        this.nextQuestion();
    }

    loadQuestions() {
        const filePath = path.join(__dirname, "million_questions.json");
        const data = fs.readFileSync(filePath, "utf8");
        this.questions = JSON.parse(data);
    }

    addPlayer(jid) {
        if (!this.players.includes(jid)) {
            this.players.push(jid);
            this.lives[jid] = 3;
            this.levels[jid] = 0;
            this.money[jid] = 0;
        }
    }

    get currentTurn() {
        return this.players[this.currentPlayerIndex];
    }

    switchTurn() {
        if (this.players.length === 0) return;

        this.currentPlayerIndex =
            (this.currentPlayerIndex + 1) % this.players.length;
    }

    eliminatePlayer(jid) {
        this.players = this.players.filter(p => p !== jid);

        delete this.lives[jid];
        delete this.levels[jid];
        delete this.money[jid];

        if (this.currentPlayerIndex >= this.players.length) {
            this.currentPlayerIndex = 0;
        }
    }

    nextQuestion() {
        const player = this.currentTurn;
        const level = this.levels[player];
        const difficulty = Math.min(level + 1, 5);

        const pool = this.questions.filter(
            q =>
                q.difficulty <= difficulty &&
                !this.usedQuestions.includes(q.question)
        );

        if (pool.length === 0) {
            this.usedQuestions = [];
            return this.nextQuestion();
        }

        const q = pool[Math.floor(Math.random() * pool.length)];
        this.usedQuestions.push(q.question);

        this.currentQuestion = q;
    }

    getWinner() {
        if (this.players.length === 1) {
            return this.players[0];
        }
        return null;
    }

    loseLife(player) {
        this.lives[player]--;

        if (this.lives[player] <= 0) {
            return { status: "eliminated" };
        }

        return {
            status: "wrong",
            lives: this.lives[player]
        };
    }

    checkAnswer(choiceIndex) {
        const player = this.currentTurn;

        if (choiceIndex === this.currentQuestion.answer) {

            this.levels[player]++;
            this.money[player] =
                this.moneyLevels[this.levels[player]] || this.moneyLevels.at(-1);

            this.nextQuestion();

            return { status: "correct" };
        }

        // mauvaise réponse
        const result = this.loseLife(player);

        this.nextQuestion();

        return result;
    }
}

module.exports = MillionGame;