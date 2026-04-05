class CheckersGame {
    constructor() {
        this.board = [];
        this.selectedSquare = null;
        this.currentPlayer = 'red';
        this.moveHistory = [];
        this.gameOver = false;
        this.winner = null;
        
        // Single player mode properties
        this.isPlayerHuman = true;
        this.playerColor = 'red';
        this.difficulty = null;
        this.ai = null;
        this.aiThinking = false;
        
        // Random difficulty properties
        this.isRandomDifficulty = false;
        this.turnCount = 0;
        this.difficultyRotation = ['easy', 'medium', 'hard'];
        this.currentDifficultyIndex = 0;
        
        this.attachEventListeners();
    }

    initBoard() {
        // Create 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place red pieces (top)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'red', isKing: false };
                }
            }
        }
        
        // Place black pieces (bottom)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'black', isKing: false };
                }
            }
        }
        
        this.gameOver = false;
        this.winner = null;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getPieceAt(row, col) {
        if (this.isValidPosition(row, col)) {
            return this.board[row][col];
        }
        return null;
    }

    getValidMoves(row, col) {
        const piece = this.getPieceAt(row, col);
        if (!piece) return { moves: [], captures: [] };

        const moves = [];
        const captures = [];
        
        // Determine directions based on piece type
        let directions = [];
        if (piece.isKing) {
            directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        } else {
            if (piece.color === 'red') {
                directions = [[1, -1], [1, 1]]; // Red moves down
            } else {
                directions = [[-1, -1], [-1, 1]]; // Black moves up
            }
        }

        // Check normal moves
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isValidPosition(newRow, newCol) && !this.getPieceAt(newRow, newCol)) {
                moves.push([newRow, newCol]);
            }
        }

        // Check capture moves (can be multi-jump)
        this.findCaptures(row, col, piece, [], captures, new Set());

        return { moves, captures };
    }

    findCaptures(row, col, piece, capturedPieces, allCaptures, visitedSquares) {
        let foundCapture = false;

        const directions = piece.isKing 
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : piece.color === 'red'
            ? [[1, -1], [1, 1]]
            : [[-1, -1], [-1, 1]];

        for (const [dRow, dCol] of directions) {
            const enemyRow = row + dRow;
            const enemyCol = col + dCol;
            const landRow = row + 2 * dRow;
            const landCol = col + 2 * dCol;

            if (!this.isValidPosition(enemyRow, enemyCol) || !this.isValidPosition(landRow, landCol)) continue;

            const enemy = this.getPieceAt(enemyRow, enemyCol);
            const landingSquare = this.getPieceAt(landRow, landCol);

            const squareKey = `${landRow},${landCol}`;
            const enemyKey = `${enemyRow},${enemyCol}`;

            if (enemy && enemy.color !== piece.color && !landingSquare && !visitedSquares.has(squareKey)) {
                // This is a valid capture
                foundCapture = true;
                
                const newCaptured = [...capturedPieces, enemyKey];
                const newVisited = new Set(visitedSquares);
                newVisited.add(squareKey);
                
                // Record this capture sequence
                allCaptures.push({
                    path: [[row, col], [landRow, landCol]],
                    captured: newCaptured
                });

                // Look for additional captures from the landing square
                this.findCaptures(landRow, landCol, piece, newCaptured, allCaptures, newVisited);
            }
        }
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
            return false;
        }

        const piece = this.getPieceAt(fromRow, fromCol);
        if (!piece || piece.color !== this.currentPlayer) {
            return false;
        }

        const { moves, captures } = this.getValidMoves(fromRow, fromCol);
        const moveValid = moves.some(m => m[0] === toRow && m[1] === toCol);
        const captureValid = captures.some(c => c.path[c.path.length - 1][0] === toRow && c.path[c.path.length - 1][1] === toCol);

        if (!moveValid && !captureValid) {
            return false;
        }

        // Save move history
        this.moveHistory.push(JSON.parse(JSON.stringify(this.board)));

        // Move the piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle captures
        if (captureValid) {
            const capture = captures.find(c => c.path[c.path.length - 1][0] === toRow && c.path[c.path.length - 1][1] === toCol);
            if (capture) {
                for (const enemyKey of capture.captured) {
                    const [eRow, eCol] = enemyKey.split(',').map(Number);
                    this.board[eRow][eCol] = null;
                }
            }
        }

        // Promote to king if reached opposite end
        if ((piece.color === 'red' && toRow === 7) || (piece.color === 'black' && toRow === 0)) {
            piece.isKing = true;
        }

        // Track turn count for random difficulty
        if (this.currentPlayer === 'black') {
            this.turnCount++;
            
            // Change difficulty every 5 turns after the first 5 turns
            if (this.isRandomDifficulty && this.turnCount >= 5 && this.turnCount % 5 === 0) {
                this.currentDifficultyIndex = (this.currentDifficultyIndex + 1) % this.difficultyRotation.length;
                this.ai.difficulty = this.difficultyRotation[this.currentDifficultyIndex];
            }
        }

        // Check win conditions
        if (this.checkGameOver()) {
            return true;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.selectedSquare = null;

        return true;
    }

    checkGameOver() {
        const redPieces = this.countPieces('red');
        const blackPieces = this.countPieces('black');

        // Check if one side has no pieces
        if (redPieces === 0) {
            this.gameOver = true;
            this.winner = 'black';
            return true;
        }
        if (blackPieces === 0) {
            this.gameOver = true;
            this.winner = 'red';
            return true;
        }

        // Check if current player has no valid moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === this.currentPlayer) {
                    const { moves, captures } = this.getValidMoves(row, col);
                    if (moves.length > 0 || captures.length > 0) {
                        return false;
                    }
                }
            }
        }

        // Current player has no moves
        this.gameOver = true;
        this.winner = this.currentPlayer === 'red' ? 'black' : 'red';
        return true;
    }

    countPieces(color) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.getPieceAt(row, col)?.color === color) {
                    count++;
                }
            }
        }
        return count;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        this.board = JSON.parse(JSON.stringify(this.moveHistory.pop()));
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.selectedSquare = null;
        this.gameOver = false;
        this.winner = null;
        
        return true;
    }

    reset() {
        this.selectedSquare = null;
        this.moveHistory = [];
        this.initBoard();
        this.currentPlayer = 'red';
    }

    render() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Check if this square is selected
                if (this.selectedSquare && this.selectedSquare[0] === row && this.selectedSquare[1] === col) {
                    square.classList.add('selected');
                }

                // Show valid moves if a piece is selected
                if (this.selectedSquare) {
                    const { moves, captures } = this.getValidMoves(this.selectedSquare[0], this.selectedSquare[1]);
                    const isValidMove = moves.some(m => m[0] === row && m[1] === col);
                    const isValidCapture = captures.some(c => c.path[c.path.length - 1][0] === row && c.path[c.path.length - 1][1] === col);
                    
                    if (isValidMove || isValidCapture) {
                        square.classList.add('valid-move');
                    }
                }

                const piece = this.getPieceAt(row, col);
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}`;
                    if (piece.isKing) {
                        pieceElement.classList.add('king');
                    }
                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }

        this.updateGameInfo();
    }

    handleSquareClick(row, col) {
        // Don't allow interaction if game is over or AI is thinking
        if (this.gameOver || this.aiThinking) return;
        
        // Don't allow moves if it's not the human player's turn
        if (this.currentPlayer !== this.playerColor) return;

        const piece = this.getPieceAt(row, col);

        // If clicking on own piece, select it
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = [row, col];
            this.render();
            return;
        }

        // If a piece is selected and clicking on valid destination
        if (this.selectedSquare) {
            const moveSuccess = this.movePiece(this.selectedSquare[0], this.selectedSquare[1], row, col);
            
            if (moveSuccess) {
                this.render();
                
                // If it's a single player game and it's now AI's turn, make a move
                if (this.playerColor !== this.currentPlayer && !this.gameOver) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            } else {
                // Invalid move - deselect if clicking empty square or opponent piece
                if (!piece || piece.color !== this.currentPlayer) {
                    this.selectedSquare = null;
                    this.render();
                } else if (piece.color === this.currentPlayer) {
                    // Clicked another own piece - select it instead
                    this.selectedSquare = [row, col];
                    this.render();
                }
            }
        } else if (piece && piece.color === this.currentPlayer) {
            // No piece selected yet, select this one
            this.selectedSquare = [row, col];
            this.render();
        }
    }

    updateGameInfo() {
        const currentPlayerElement = document.getElementById('current-player');
        const redCountElement = document.getElementById('red-count');
        const blackCountElement = document.getElementById('black-count');
        const gameStatusElement = document.getElementById('game-status');
        const gameStatsElement = document.getElementById('game-stats');

        const redCount = this.countPieces('red');
        const blackCount = this.countPieces('black');

        // Update game stats
        let statsText = '';
        if (this.isRandomDifficulty) {
            const currentDifficulty = this.difficultyRotation[this.currentDifficultyIndex];
            statsText = `CPU Difficulty: <strong>${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}</strong> | Turn: ${this.turnCount}`;
        } else {
            statsText = `CPU Difficulty: <strong>${this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1)}</strong>`;
        }
        gameStatsElement.innerHTML = statsText;

        if (this.gameOver) {
            currentPlayerElement.textContent = 'Game Over!';
            
            if (this.winner === this.playerColor) {
                gameStatusElement.textContent = 'You Win! 🎉';
            } else {
                gameStatusElement.textContent = `${this.winner === 'red' ? 'Red' : 'Black'} wins!`;
            }
            
            gameStatusElement.classList.add('winner');
        } else {
            const playerType = this.currentPlayer === this.playerColor ? 'Your Turn' : 'CPU Thinking...';
            currentPlayerElement.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}: ${playerType}`;
            gameStatusElement.textContent = '';
            gameStatusElement.classList.remove('winner', 'draw');
        }

        redCountElement.textContent = redCount;
        blackCountElement.textContent = blackCount;
    }

    attachEventListeners() {
        // Start screen event listeners
        document.getElementById('play-red').addEventListener('click', () => {
            this.playerColor = 'red';
            this.updateSideSelection();
        });

        document.getElementById('play-black').addEventListener('click', () => {
            this.playerColor = 'black';
            this.updateSideSelection();
        });

        document.getElementById('easy-btn').addEventListener('click', () => {
            this.difficulty = 'easy';
            this.isRandomDifficulty = false;
            this.updateDifficultySelection();
        });

        document.getElementById('medium-btn').addEventListener('click', () => {
            this.difficulty = 'medium';
            this.isRandomDifficulty = false;
            this.updateDifficultySelection();
        });

        document.getElementById('hard-btn').addEventListener('click', () => {
            this.difficulty = 'hard';
            this.isRandomDifficulty = false;
            this.updateDifficultySelection();
        });

        document.getElementById('random-btn').addEventListener('click', () => {
            this.difficulty = 'random';
            this.isRandomDifficulty = true;
            this.updateDifficultySelection();
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        // Game screen event listeners
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.showStartScreen();
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.undoMove()) {
                this.render();
            }
        });
    }

    updateSideSelection() {
        document.querySelectorAll('.side-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        if (this.playerColor === 'red') {
            document.getElementById('play-red').classList.add('selected');
        } else {
            document.getElementById('play-black').classList.add('selected');
        }

        this.updateStartButtonState();
    }

    updateDifficultySelection() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        if (this.difficulty === 'random') {
            document.getElementById('random-btn').classList.add('selected');
        } else if (this.difficulty) {
            document.getElementById(`${this.difficulty}-btn`).classList.add('selected');
        }

        this.updateStartButtonState();
    }

    updateStartButtonState() {
        const startBtn = document.getElementById('start-game-btn');
        if (this.playerColor && this.difficulty) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }

    startGame() {
        // Initialize AI with appropriate difficulty and color
        const initialDifficulty = this.isRandomDifficulty ? 'easy' : this.difficulty;
        const aiColor = this.playerColor === 'red' ? 'black' : 'red';
        this.ai = new CheckersAI(initialDifficulty, aiColor);
        
        this.initBoard();
        this.currentPlayer = 'red';
        this.selectedSquare = null;
        this.turnCount = 0;
        this.currentDifficultyIndex = 0;
        
        // Hide start screen, show game screen
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        this.render();
        
        // If AI plays first (when AI is red and player is black), make a move
        if (this.playerColor !== 'red') {
            this.makeAIMove();
        }
    }

    makeAIMove() {
        if (this.gameOver || this.aiThinking) return;
        
        this.aiThinking = true;
        
        // Delay AI move slightly for better UX
        setTimeout(() => {
            const move = this.ai.getMove(this);
            
            if (move) {
                this.movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                this.render();
            }
            
            this.aiThinking = false;
            
            // Check if it's AI's turn again (shouldn't happen in normal checkers)
            if (this.currentPlayer !== this.playerColor && !this.gameOver) {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }, 600);
    }

    showStartScreen() {
        this.playerColor = null;
        this.difficulty = null;
        this.isRandomDifficulty = false;
        this.selectedSquare = null;
        
        document.querySelectorAll('.side-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CheckersGame();
});
