class TicTacToe {
    constructor(playerX, playerO) {
        this.playerX = playerX;
        this.playerO = playerO;
        this.currentTurn = playerX;
        this.board = Array(25).fill(null);
        this.turns = 0;
        this.winner = null;
    }

    turn(isO, index) {
        if (this.winner) return false;
        if (this.board[index] !== null) return false;

        const symbol = isO ? 'O' : 'X';
        this.board[index] = symbol;
        this.turns++;

        if (this.checkWinner(symbol)) {
            this.winner = isO ? this.playerO : this.playerX;
        } else {
            this.currentTurn = isO ? this.playerX : this.playerO;
        }

        return true;
    }

    render() {
        return this.board.map((v, i) => v ?? (i + 1).toString());
    }

    checkWinner(symbol) {
        const size = 5;
        const winLength = 4;
        const b = this.board;

        const idx = (r, c) => r * size + c;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - winLength; c++) {

                if ([0,1,2,3].every(i => b[idx(r, c + i)] === symbol))
                    return true;

                if ([0,1,2,3].every(i => b[idx(c + i, r)] === symbol))
                    return true;
            }
        }

        for (let r = 0; r <= size - winLength; r++) {
            for (let c = 0; c <= size - winLength; c++) {

                if ([0,1,2,3].every(i => b[idx(r + i, c + i)] === symbol))
                    return true;

                if ([0,1,2,3].every(i => b[idx(r + i, c + winLength - 1 - i)] === symbol))
                    return true;
            }
        }

        return false;
    }
}

module.exports = TicTacToe;

