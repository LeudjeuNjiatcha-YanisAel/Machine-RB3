const fs = require("fs");
const path = require("path");

class MillionGame {
    constructor(host) {
        this.players = [host]; // liste des joueurs
        this.lives = {};
        this.lives[host] = 3
        this.currentPlayerIndex = 0;

        this.level = 0;
        this.moneyLevels = [100,150,200,250,300,350,400,450 ,500,550,600,650,700,750,800,850,900,950, 1000, 2000,3000,4000,5000,10000, 50000, 100000, 500000, 1000000];

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
        }
    }

    get currentTurn() {
        return this.players[this.currentPlayerIndex];
    }

    switchTurn() {
        this.currentPlayerIndex =
            (this.currentPlayerIndex + 1) % this.players.length;
    }

    nextQuestion() {
        const difficulty = Math.min(this.level + 1, 5);

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

    checkAnswer(choiceIndex) {

    if (choiceIndex === this.currentQuestion.answer) {

        this.level++;

        if (this.level >= this.moneyLevels.length) {
            return { status: "win" };
        }

        this.nextQuestion();
        return { status: "correct" };
    }

    // ❌ Mauvaise réponse → perte de vie
    const player = this.currentTurn;

    this.lives[player]--;

    const remainingLives = this.lives[player];

    this.nextQuestion();

    // plus de vies → élimination
    if (remainingLives <= 0) {
        return {
            status: "eliminated",
            player
        };
    }

    return {
        status: "wrong",
        lives: remainingLives
    };
    }

}

module.exports = MillionGame;
