const BOARD_SIZE = 9;
let currentPlayer = 'black'; // Human is black, Computer is white
let isGameActive = true;
const gameBoard = document.getElementById('game');
const statusDisplay = document.getElementById('status');
const passBtn = document.getElementById('passBtn');
let previousBoardStateString = "";

// Initialize 2D virtual state tracking: null, 'black', or 'white'
let boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// 1. Generate the 9x9 board layout
function createBoard() {
    gameBoard.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `cell_${r}_${c}`;
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.addEventListener('click', handleHumanClick);
            gameBoard.appendChild(cell);
        }
    }
}

// 2. Handle Human Move (Black)
function handleHumanClick(event) {
    if (!isGameActive || currentPlayer !== 'black') return;

    const cell = event.currentTarget;
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    if (boardState[r][c] !== null) return;

    if (executeMove(r, c, 'black')) {
        renderBoard();
        currentPlayer = 'white';
        statusDisplay.textContent = "Computer is thinking...";
        
        // Let the computer think for 600ms to mimic real gameplay
        setTimeout(computerTurn, 600);
    }
}

// 3. Computer Logic Engine (White)
function computerTurn() {
    if (!isGameActive) return;

    let bestMove = null;
    let highestScore = -1000;

    // Scan every single cell on the 9x9 board to find the best move
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardState[r][c] !== null) continue; // Skip occupied spaces

            let score = 0;

            // Simulate the move temporarily
            boardState[r][c] = 'white';
            
            // Check legality (Suicide check)
            const ownGroup = getGroup(r, c, 'white');
            let potentialCaptures = 0;

            // Look for enemy captures
            const neighbors = getNeighbors(r, c);
            neighbors.forEach(([nr, nc]) => {
                if (boardState[nr][nc] === 'black') {
                    const enemyGroup = getGroup(nr, nc, 'black');
                    if (countLiberties(enemyGroup) === 0) {
                        potentialCaptures += enemyGroup.length;
                    }
                }
            });

            // If it's a suicide move and captures nothing, it's illegal
            if (potentialCaptures === 0 && countLiberties(ownGroup) === 0) {
                boardState[r][c] = null; // Revert
                continue; 
            }

            // --- HEURISTIC SCORING RULES ---
            // Rule A: Immediate captures are highly valued
            score += potentialCaptures * 50;

            // Rule B: Defend own groups that are in danger (1 liberty remaining)
            neighbors.forEach(([nr, nc]) => {
                if (boardState[nr][nc] === 'white') {
                    const alliedGroup = getGroup(nr, nc, 'white');
                    if (countLiberties(alliedGroup) === 1) {
                        score += 30; // Help save endangered stones
                    }
                }
            });

            // Rule C: Positional Strategy (Prefer center areas over extreme edges)
            const distanceFromCenter = Math.abs(r - 4) + Math.abs(c - 4);
            score += (8 - distanceFromCenter) * 2; 

            // Clean up simulation
            boardState[r][c] = null;

            // Keep tracking the highest scored choice
            if (score > highestScore) {
                highestScore = score;
                bestMove = { r, c };
            }
        }
    }

    // Execute move or Pass if no valid options remain
    if (bestMove) {
        executeMove(bestMove.r, bestMove.c, 'white');
        renderBoard();
        currentPlayer = 'black';
        statusDisplay.textContent = "Black's Turn (Your Move)";
    } else {
        // Pass if trapped
        currentPlayer = 'black';
        statusDisplay.textContent = "Black's Turn (Computer Passed!)";
    }
}

// 4. Core Logic: Process rules, captures, and check legality
// 4. Core Logic: Process rules, captures, and check legality (WITH KO RULE)
function executeMove(r, c, playerColor) {
    // 1. Snapshot current layout before placing the stone
    let snapshot = JSON.stringify(boardState);

    // 2. Run your provisional placement logic
    boardState[r][c] = playerColor;
    const opponent = playerColor === 'black' ? 'white' : 'black';
    let capturedAny = false;

    // Evaluate structural captures
    getNeighbors(r, c).forEach(([nr, nc]) => {
        if (boardState[nr][nc] === opponent) {
            const group = getGroup(nr, nc, opponent);
            if (countLiberties(group) === 0) {
                captureGroup(group);
                capturedAny = true;
            }
        }
    });

    // Handle structural suicide legality checks
    const ownGroup = getGroup(r, c, playerColor);
    if (!capturedAny && countLiberties(ownGroup) === 0) {
        boardState[r][c] = null; // Undo placement
        if (playerColor === 'black') alert("Illegal Move: Suicide is prohibited!");
        return false;
    }

    // 3. Check against history to enforce the Ko Rule
    let newSnapshot = JSON.stringify(boardState);
    if (newSnapshot === previousBoardStateString) {
        boardState = JSON.parse(snapshot); // Revert board state completely
        if (playerColor === 'black') {
            alert("Illegal Move: Ko Rule violation! You cannot immediately recreate the previous board state.");
        }
        return false;
    }

    // 4. Update history tracking state if the move is entirely legal
    previousBoardStateString = snapshot;
    return true;
}

// 5. Helper: Grabs cross-directional neighbors
function getNeighbors(r, c) {
    const n = [];
    if (r > 0) n.push([r - 1, c]);
    if (r < BOARD_SIZE - 1) n.push([r + 1, c]);
    if (c > 0) n.push([r, c - 1]);
    if (c < BOARD_SIZE - 1) n.push([r, c + 1]);
    return n;
}

// 6. Helper: Flood-fill to find connected chain of same-colored stones
function getGroup(startRow, startCol, color) {
    const group = [];
    const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    const queue = [[startRow, startCol]];
    visited[startRow][startCol] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        group.push([r, c]);

        getNeighbors(r, c).forEach(([nr, nc]) => {
            if (!visited[nr][nc] && boardState[nr][nc] === color) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        });
    }
    return group;
}

// 7. Helper: Evaluates surrounding empty spaces for a chain
function countLiberties(group) {
    const liberties = new Set();
    group.forEach(([r, c]) => {
        getNeighbors(r, c).forEach(([nr, nc]) => {
            if (boardState[nr][nc] === null) {
                liberties.add(`${nr}_${nc}`);
            }
        });
    });
    return liberties.size;
}

function captureGroup(group) {
    group.forEach(([r, c]) => {
        boardState[r][c] = null;
    });
}

// 8. Render Engine: Syncs HTML with data matrix state
function renderBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.getElementById(`cell_${r}_${c}`);
            cell.innerHTML = '';
            
            if (boardState[r][c] !== null) {
                const stone = document.createElement('div');
                stone.classList.add('stone', `${boardState[r][c]}-stone`);
                cell.appendChild(stone);
            }
        }
    }
}

// User Pass setup interaction
passBtn.addEventListener('click', () => {
    if (currentPlayer !== 'black') return;
    currentPlayer = 'white';
    statusDisplay.textContent = "Computer is thinking...";
    setTimeout(computerTurn, 600);
});

createBoard();
