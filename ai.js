class CheckersAI {
    constructor(difficulty = 'medium', aiColor = 'black') {
        this.difficulty = difficulty;
        this.aiColor = aiColor;
        this.timeLimit = 4500; // 4.5 seconds in milliseconds to ensure move completes
        this.startTime = 0;
        this.aborted = false;
    }

    /**
     * Get the best move for the AI
     */
    getMove(game) {
        this.startTime = Date.now();
        this.aborted = false;
        
        switch (this.difficulty) {
            case 'easy':
                return this.getEasyMove(game, this.aiColor);
            case 'medium':
                return this.getMediumMove(game, this.aiColor);
            case 'hard':
                return this.getHardMove(game, this.aiColor);
            default:
                return this.getEasyMove(game, this.aiColor);
        }
    }

    /**
     * Check if time limit exceeded
     */
    isTimeExceeded() {
        return (Date.now() - this.startTime) > this.timeLimit;
    }

    /**
     * Easy: Random valid move
     */
    getEasyMove(game, color) {
        const validMoves = this.getAllValidMoves(game, color);
        if (validMoves.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }

    /**
     * Medium: Prefer captures and king safety, with some lookahead
     */
    getMediumMove(game, color) {
        const validMoves = this.getAllValidMoves(game, color);
        if (validMoves.length === 0) return null;

        // Separate capture moves from regular moves
        const captureMoves = validMoves.filter(move => move.isCapture);
        
        if (captureMoves.length > 0) {
            // Prefer captures - evaluate top captures with lookahead if time allows
            let bestCapture = captureMoves[0];
            let bestScore = -Infinity;
            
            for (const move of captureMoves) {
                if (this.isTimeExceeded()) break;
                
                const gameCopy = this.copyGameState(game);
                gameCopy.movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                const score = this.evaluatePosition(gameCopy, color);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestCapture = move;
                }
            }
            return bestCapture;
        }

        // No captures available, pick random move
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }

    /**
     * Hard: Minimax with lookahead and time limit
     */
    getHardMove(game, color) {
        const validMoves = this.getAllValidMoves(game, color);
        if (validMoves.length === 0) return null;

        // Separate capture and regular moves
        const captureMoves = validMoves.filter(move => move.isCapture);
        const regularMoves = validMoves.filter(move => !move.isCapture);
        
        // Prioritize evaluating capture moves
        const movesToEvaluate = captureMoves.length > 0 ? captureMoves : regularMoves;

        let bestMove = movesToEvaluate[0];
        let bestScore = -Infinity;

        // Evaluate moves with minimax, respecting time limit
        for (const move of movesToEvaluate) {
            if (this.isTimeExceeded()) {
                break;
            }

            // Create a copy of the game state
            const gameCopy = this.copyGameState(game);
            
            // Make the move
            gameCopy.movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
            
            // Evaluate with depth 3, respecting time limit
            const score = this.minimax(gameCopy, 3, false, color);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    /**
     * Minimax algorithm for evaluating positions
     */
    minimax(game, depth, isMaximizing, aiColor) {
        // Check time limit
        if (this.isTimeExceeded()) {
            return this.evaluatePosition(game, aiColor);
        }

        if (depth === 0 || game.gameOver) {
            return this.evaluatePosition(game, aiColor);
        }

        const currentPlayer = game.currentPlayer;
        const isAITurn = currentPlayer === aiColor;

        if (isMaximizing && !isAITurn) {
            return this.minimax(game, depth - 1, true, aiColor);
        }
        if (!isMaximizing && isAITurn) {
            return this.minimax(game, depth - 1, false, aiColor);
        }

        const validMoves = this.getAllValidMoves(game, currentPlayer);

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of validMoves) {
                if (this.isTimeExceeded()) break;
                
                const gameCopy = this.copyGameState(game);
                gameCopy.movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                const score = this.minimax(gameCopy, depth - 1, false, aiColor);
                maxScore = Math.max(score, maxScore);
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of validMoves) {
                if (this.isTimeExceeded()) break;
                
                const gameCopy = this.copyGameState(game);
                gameCopy.movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                const score = this.minimax(gameCopy, depth - 1, true, aiColor);
                minScore = Math.min(score, minScore);
            }
            return minScore;
        }
    }

    /**
     * Evaluate a game position
     */
    evaluatePosition(game, aiColor) {
        const opponentColor = aiColor === 'red' ? 'black' : 'red';
        
        let aiScore = 0;
        let opponentScore = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.getPieceAt(row, col);
                if (!piece) continue;

                const value = piece.isKing ? 5 : 1;
                
                if (piece.color === aiColor) {
                    aiScore += value;
                    // Bonus for being closer to opponent's end
                    if (aiColor === 'black') {
                        aiScore += (7 - row) * 0.1;
                    } else {
                        aiScore += row * 0.1;
                    }
                } else if (piece.color === opponentColor) {
                    opponentScore += value;
                }
            }
        }

        // Cap the score to prevent overflow
        const diff = aiScore - opponentScore;
        return Math.max(-1000, Math.min(1000, diff));
    }

    /**
     * Get all valid moves for a color
     */
    getAllValidMoves(game, color) {
        const moves = [];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.getPieceAt(row, col);
                if (!piece || piece.color !== color) continue;

                const { moves: regularMoves, captures } = game.getValidMoves(row, col);

                // Add regular moves
                for (const move of regularMoves) {
                    moves.push({
                        from: [row, col],
                        to: move,
                        isCapture: false
                    });
                }

                // Add capture moves
                for (const capture of captures) {
                    moves.push({
                        from: [row, col],
                        to: capture.path[capture.path.length - 1],
                        isCapture: true
                    });
                }
            }
        }

        return moves;
    }

    /**
     * Create a deep copy of the game state
     */
    copyGameState(game) {
        const copy = Object.create(Object.getPrototypeOf(game));
        copy.board = JSON.parse(JSON.stringify(game.board));
        copy.selectedSquare = game.selectedSquare ? [...game.selectedSquare] : null;
        copy.currentPlayer = game.currentPlayer;
        copy.moveHistory = JSON.parse(JSON.stringify(game.moveHistory));
        copy.gameOver = game.gameOver;
        copy.winner = game.winner;
        copy.isPlayerHuman = game.isPlayerHuman;
        copy.playerColor = game.playerColor;
        copy.difficulty = game.difficulty;
        copy.ai = game.ai;
        return copy;
    }
}
