const BOARD_SIZE = 9;
let currentPlayer = 'black'; // Human is black, Computer is white
let isGameActive = true;
const gameBoard = document.getElementById('game');
const statusDisplay = document.getElementById('status');
const passBtn = document.getElementById('passBtn');
let previousBoardStateString = "";

// Initialize 2D virtual state tracking: null, 'black', or 'white'
let boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// 1. Helper: Grabs cross-directional neighbors
function getNeighbors(r, c) {
    const n = [];
    if (r > 0) n.push([r - 1, c]);
    if (r < BOARD_SIZE - 1) n.push([r + 1, c]);
    if (c > 0) n.push([r, c - 1]);
    if (c < BOARD_SIZE - 1) n.push([r, c + 1]);
    return n;
}

// 2. Helper: Flood-fill to find connected chain of same-colored stones
function getGroup(startRow, startCol, color, customBoard = boardState) {
    const group = [];
    const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    const queue = [[startRow, startCol]];
    visited[startRow][startCol] = true;

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        group.push([r, c]);

        getNeighbors(r, c).forEach(([nr, nc]) => {
            if (!visited[nr][nc] && customBoard[nr][nc] === color) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        });
    }
    return group;
}

// 3. Helper: Evaluates surrounding empty spaces for a chain
function countLiberties(group, customBoard = boardState) {
    const liberties = new Set();
    group.forEach(([r, c]) => {
        getNeighbors(r, c).forEach(([nr, nc]) => {
            if (customBoard[nr][nc] === null) {
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

// 4. Core Logic: Process rules, captures, and check legality (WITH KO RULE)
function executeMove(r, c, playerColor) {
    let snapshot = JSON.stringify(boardState);

    boardState[r][c] = playerColor;
    const opponent = playerColor === 'black' ? 'white' : 'black';
    let capturedAny = false;

    getNeighbors(r, c).forEach(([nr, nc]) => {
        if (boardState[nr][nc] === opponent) {
            const group = getGroup(nr, nc, opponent);
            if (countLiberties(group) === 0) {
                captureGroup(group);
                capturedAny = true;
            }
        }
    });

    const ownGroup = getGroup(r, c, playerColor);
    if (!capturedAny && countLiberties(ownGroup) === 0) {
        boardState[r][c] = null; 
        if (playerColor === 'black') alert("Illegal Move: Suicide is prohibited!");
        return false;
    }

    let newSnapshot = JSON.stringify(boardState);
    if (newSnapshot === previousBoardStateString) {
        boardState = JSON.parse(snapshot); 
        if (playerColor === 'black') {
            alert("Illegal Move: Ko Rule violation! You cannot immediately recreate the previous board state.");
        }
        return false;
    }

    previousBoardStateString = snapshot;
    return true;
}

// 5. Render Engine: Syncs HTML with data matrix state
function renderBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.getElementById(`cell_${r}_${c}`);
            if (!cell) continue;
            cell.innerHTML = '';
            
            if (boardState[r][c] !== null) {
                const stone = document.createElement('div');
                stone.classList.add('stone', `${boardState[r][c]}-stone`);
                cell.appendChild(stone);
            }
        }
    }
}

// 6. Computer Logic Engine (White)
function computerTurn() {
    if (!isGameActive) return;

    let bestMove = null;
    let highestScore = -1000;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardState[r][c] !== null) continue; 

            let score = 0;

            // Deep copy board state to safely simulate without breaking references
            let simBoard = JSON.parse(JSON.stringify(boardState));
            simBoard[r][c] = 'white';
            
            const ownGroupSim = getGroup(r, c, 'white', simBoard);
            let potentialCaptures = 0;

            const neighbors = getNeighbors(r, c);
            neighbors.forEach(([nr, nc]) => {
                if (simBoard[nr][nc] === 'black') {
                    const enemyGroup = getGroup(nr, nc, 'black', simBoard);
                    if (countLiberties(enemyGroup, simBoard) === 0) {
                        potentialCaptures += enemyGroup.length;
                    }
                }
            });

            if (potentialCaptures === 0 && countLiberties(ownGroupSim, simBoard) === 0) {
                continue; 
            }

            // --- HEURISTIC SCORING RULES ---
            score += potentialCaptures * 50;

            neighbors.forEach(([nr, nc]) => {
                if (boardState[nr][nc] === 'white') {
                    const alliedGroup = getGroup(nr, nc, 'white');
                    if (countLiberties(alliedGroup) === 1) {
                        score += 30; 
                    }
                }
            });

            const distanceFromCenter = Math.abs(r - 4) + Math.abs(c - 4);
            score += (8 - distanceFromCenter) * 2; 

            if (score > highestScore) {
                highestScore = score;
                bestMove = { r, c };
            }
        }
    }

    if (bestMove) {
        executeMove(bestMove.r, bestMove.c, 'white');
        renderBoard();
        currentPlayer = 'black';
        statusDisplay.textContent = "Black's Turn (Your Move)";
    } else {
        currentPlayer = 'black';
        statusDisplay.textContent = "Black's Turn (Computer Passed!)";
    }
}

// 7. Handle Human Move (Black)
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
        setTimeout(computerTurn, 600);
    }
}

// 8. Generate the 9x9 board layout
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

// User Pass setup interaction
passBtn.addEventListener('click', () => {
    if (currentPlayer !== 'black') return;
    currentPlayer = 'white';
    statusDisplay.textContent = "Computer is thinking...";
    setTimeout(computerTurn, 600);
});

// 9. Formation Preset Engine Data Router
function loadFormation(type) {
    // Completely reset board matrix data states back to empty spaces
    boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    previousBoardStateString = ""; // Clear execution memory history logs
    currentPlayer = 'black';       // Black resets to go first
    isGameActive = true;

    if (type === 'sanrensei') {
        // Sanrensei: Classic side control strategy along line index 2 (the 3rd line)
        boardState[2][2] = 'black';
        boardState[4][2] = 'black';
        boardState[6][2] = 'black';
        
        // Automated computer response stones layout adjustments
        boardState[2][6] = 'white';
        boardState[6][6] = 'white';
        statusDisplay.textContent = "Sanrensei loaded. Black's Turn (Your Move)";
    } 
    else if (type === 'shusaku') {
        // Shusaku: Traditional solid corner framework setups
        boardState[2][2] = 'black';
        boardState[2][3] = 'black';
        boardState[6][2] = 'black';
        
        boardState[6][6] = 'white';
        boardState[3][6] = 'white';
        statusDisplay.textContent = "Shusaku Opening loaded. Black's Turn (Your Move)";
    } 
    else if (type === 'cross') {
        // Cross-Opening: Forces direct early combat across splitting quadrants
        boardState[2][2] = 'black';
        boardState[6][6] = 'black';
        
        boardState[2][6] = 'white';
        boardState[6][2] = 'white';
        statusDisplay.textContent = "Cross-Opening loaded. Black's Turn (Your Move)";
    } 
    else {
        // Standard blank vanilla board setup fallback routing
        statusDisplay.textContent = "Black's Turn (Your Move)";
    }

    // Refresh display layout on screen
    renderBoard();
}

// Replace the lonely old 'createBoard();' line at the end with this initialization loop sequence:
createBoard();
loadFormation('blank'); // Instantly starts the initial screen state as clean/blank
