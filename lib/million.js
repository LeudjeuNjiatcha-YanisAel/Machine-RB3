const fs = require("fs");

class MillionGame {
    constructor(playerA, playerB) {
        this.playerA = playerA;
        this.playerB = playerB;
        this.currentTurn = playerA;
        this.level = 0;
        this.moneyLevels = [100, 500, 1000, 10000, 50000, 100000, 500000, 1000000];
        this.lifelines = {
            [playerA]: { fifty: true, friend: true, public: true },
            [playerB]: { fifty: true, friend: true, public: true }
        };
        this.loadQuestions();
        this.nextQuestion();
    }

    loadQuestions() {
        const data = fs.readFileSync("../data/million_questions.json");
        this.questions = JSON.parse(data);
    }

    nextQuestion() {
        const difficulty = Math.min(this.level + 1, 5);
        const pool = this.questions.filter(q => q.difficulty <= difficulty);
        this.currentQuestion = pool[Math.floor(Math.random() * pool.length)];
    }

    checkAnswer(choiceIndex) {
        if (choiceIndex === this.currentQuestion.answer) {
            this.level++;
            if (this.level >= this.moneyLevels.length) {
                return { status: "win", money: this.moneyLevels[this.level - 1] };
            }
            this.nextQuestion();
            return { status: "correct", money: this.moneyLevels[this.level - 1] };
        } else {
            return { status: "wrong", correct: this.currentQuestion.answer };
        }
    }

    switchTurn() {
        this.currentTurn =
            this.currentTurn === this.playerA ? this.playerB : this.playerA;
    }

    useLifeline(player, type) {
        if (!this.lifelines[player][type]) return null;
        this.lifelines[player][type] = false;

        if (type === "fifty") {
            let wrong = [0, 1, 2, 3].filter(i => i !== this.currentQuestion.answer);
            wrong = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
            return wrong;
        }

        if (type === "friend") {
            return `Je pense que la bonne réponse est ${
                ["A", "B", "C", "D"][this.currentQuestion.answer]
            } 🤔`;
        }

        if (type === "public") {
            const correct = this.currentQuestion.answer;
            const results = [10, 10, 10, 10];
            results[correct] = 70;
            return results;
        }
    }
}

module.exports = MillionGame;
