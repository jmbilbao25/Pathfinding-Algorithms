// Modify these constants at the beginning of the file
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const cellSize = 20;
canvas.width = 800;
canvas.height = 600;
const gridWidth = Math.floor(canvas.width / cellSize);
const gridHeight = Math.floor(canvas.height / cellSize);

let visualizationState = {
    openSet: [],
    closedSet: [],
    path: []
};

let grid = [];
let start = null;
let end = null;
let isDrawing = false;
let currentKey = null;

let comparisonData = {};


let isRunning = false;
let stepCount = 0;
let startTime = 0;

// Node class
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isWall = false;
        this.f = 0;
        this.g = 0;
        this.h = 0;
        this.parent = null;
    }
}

// Initialize grid
function initGrid() {
    grid = [];
    for (let y = 0; y < gridHeight; y++) {
        const row = [];
        for (let x = 0; x < gridWidth; x++) {
            row.push(new Node(x, y));
        }
        grid.push(row);
    }
    start = null;
    end = null;
}




// Draw grid
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw nodes
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const node = grid[y][x];
            if (node.isWall) {
                ctx.fillStyle = 'black';
                ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
            } else if (node === start) {
                ctx.fillStyle = 'green';
                ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
            } else if (node === end) {
                ctx.fillStyle = 'red';
                ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
            }
        }
    }

    // Draw visualization state
    visualize(visualizationState.openSet, visualizationState.closedSet);
    drawPath(visualizationState.path);
}





// Event listeners
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    handleMouseEvent(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        handleMouseEvent(e);
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        drawGrid();
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

document.addEventListener('keydown', (e) => {
    currentKey = e.key.toLowerCase();
});

document.addEventListener('keyup', () => {
    currentKey = null;
    drawGrid();
});

function handleMouseEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return;

    if (currentKey === 's') {
        start = grid[y][x];
    } else if (currentKey === 'e') {
        end = grid[y][x];
    } else {
        const node = grid[y][x];
        if (!node.isAnimating) {
            if (e.buttons === 1) { // Left mouse button
                if (!node.isWall) animateWall(x, y, true);
            } else if (e.buttons === 2) { // Right mouse button
                if (node.isWall) animateWall(x, y, false);
            }
        }
    }
    drawGrid();
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function animateWall(x, y, isAdding) {
    const node = grid[y][x];
    node.isAnimating = true;
    let alpha = isAdding ? 0 : 1;
    const animate = () => {
        if (isAdding && alpha < 1 || !isAdding && alpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
            alpha += isAdding ? 0.1 : -0.1;
            requestAnimationFrame(animate);
        } else {
            node.isAnimating = false;
            node.isWall = isAdding;
            drawGrid();
        }
    };
    animate();
}







// Pathfinding algorithms SEARCH ALGOSSSSS ============================================================================================
async function aStar() {
    stepCount = 0;
    const openSet = [start];
    const closedSet = [];

    while (openSet.length > 0) {
        stepCount++;
        let current = openSet[0];
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < current.f) {
                current = openSet[i];
            }
        }

        if (current === end) {
            return reconstructPath(current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.push(current);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.includes(neighbor) || neighbor.isWall) continue;

            const tentativeG = current.g + 1;

            if (!openSet.includes(neighbor)) {
                openSet.push(neighbor);
            } else if (tentativeG >= neighbor.g) {
                continue;
            }

            neighbor.parent = current;
            neighbor.g = tentativeG;
            neighbor.h = heuristic(neighbor, end);
            neighbor.f = neighbor.g + neighbor.h;
        }

        visualizationState.openSet = [...openSet];
        visualizationState.closedSet = [...closedSet];
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function dijkstra() {
    stepCount = 0;
    const unvisited = getAllNodes();
    const distances = new Map();
    const previous = new Map();

    for (const node of unvisited) {
        distances.set(node, Infinity);
        previous.set(node, null);
    }
    distances.set(start, 0);

    while (unvisited.length > 0) {
        stepCount++;
        const current = unvisited.reduce((minNode, node) => 
            distances.get(node) < distances.get(minNode) ? node : minNode
        );

        if (current === end) {
            return reconstructPath(current, previous);
        }

        unvisited.splice(unvisited.indexOf(current), 1);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (neighbor.isWall) continue;

            const alt = distances.get(current) + 1;
            if (alt < distances.get(neighbor)) {
                distances.set(neighbor, alt);
                previous.set(neighbor, current);
            }
        }

        visualizationState.openSet = unvisited;
        visualizationState.closedSet = Array.from(distances.keys()).filter(n => !unvisited.includes(n));
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function bfs() {
    stepCount = 0;
    const queue = [start];
    const visited = new Set();
    const previous = new Map();

    while (queue.length > 0) {
        stepCount++;
        const current = queue.shift();
        visited.add(current);

        if (current === end) {
            return reconstructPath(current, previous);
        }

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor) && !neighbor.isWall) {
                queue.push(neighbor);
                visited.add(neighbor);
                previous.set(neighbor, current);
            }
        }

        visualizationState.openSet = queue;
        visualizationState.closedSet = Array.from(visited);
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function greedyBestFirst() {
    stepCount = 0;
    const openSet = [start];
    const closedSet = [];

    while (openSet.length > 0) {
        stepCount++;
        let current = openSet[0];
        for (let i = 1; i < openSet.length; i++) {
            if (heuristic(openSet[i], end) < heuristic(current, end)) {
                current = openSet[i];
            }
        }

        if (current === end) {
            return reconstructPath(current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.push(current);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.includes(neighbor) || neighbor.isWall) continue;

            if (!openSet.includes(neighbor)) {
                neighbor.parent = current;
                openSet.push(neighbor);
            }
        }

        visualizationState.openSet = [...openSet];
        visualizationState.closedSet = [...closedSet];
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function dfs() {
    stepCount = 0;
    const stack = [start];
    const visited = new Set();
    const previous = new Map();

    while (stack.length > 0) {
        stepCount++;
        const current = stack.pop();
        visited.add(current);

        if (current === end) {
            return reconstructPath(current, previous);
        }

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors.reverse()) {
            if (!visited.has(neighbor) && !neighbor.isWall) {
                stack.push(neighbor);
                previous.set(neighbor, current);
            }
        }

        visualizationState.openSet = stack;
        visualizationState.closedSet = Array.from(visited);
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function bidirectionalBFS() {
    stepCount = 0;
    const startQueue = [start];
    const endQueue = [end];
    const startVisited = new Set([start]);
    const endVisited = new Set([end]);
    const startParent = new Map([[start, null]]);
    const endParent = new Map([[end, null]]);

    while (startQueue.length > 0 && endQueue.length > 0) {
        stepCount++;

        // Expand from start
        const meetingPoint = await expandBFS(startQueue, startVisited, startParent, endVisited);
        if (meetingPoint) {
            return reconstructBidirectionalPath(meetingPoint, startParent, endParent);
        }

        // Expand from end
        const meetingPointReverse = await expandBFS(endQueue, endVisited, endParent, startVisited);
        if (meetingPointReverse) {
            return reconstructBidirectionalPath(meetingPointReverse, startParent, endParent);
        }

        visualizationState.openSet = [...startQueue, ...endQueue];
        visualizationState.closedSet = [...startVisited, ...endVisited];
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

async function expandBFS(queue, visited, parent, otherVisited) {
    const current = queue.shift();

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && !neighbor.isWall) {
            queue.push(neighbor);
            visited.add(neighbor);
            parent.set(neighbor, current);

            if (otherVisited.has(neighbor)) {
                return neighbor; // Meeting point found
            }
        }
    }

    return null;
}

function reconstructBidirectionalPath(meetingPoint, startParent, endParent) {
    const path = [];
    let current = meetingPoint;

    while (current) {
        path.unshift(current);
        current = startParent.get(current);
    }

    current = endParent.get(meetingPoint);
    while (current) {
        path.push(current);
        current = endParent.get(current);
    }

    return path;
}




async function thetaStar() {
    stepCount = 0;
    const openSet = [start];
    const closedSet = new Set();
    start.g = 0;
    start.f = heuristic(start, end);

    while (openSet.length > 0) {
        stepCount++;
        let current = openSet.reduce((a, b) => a.f < b.f ? a : b);

        if (current === end) {
            return reconstructPath(current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.add(current);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.has(neighbor) || neighbor.isWall) continue;

            let lineOfSight = hasLineOfSight(current.parent || current, neighbor);
            let tentativeG = current.g + (lineOfSight ? distance(current.parent || current, neighbor) : 1);

            if (!openSet.includes(neighbor)) {
                openSet.push(neighbor);
            } else if (tentativeG >= neighbor.g) {
                continue;
            }

            neighbor.parent = lineOfSight ? (current.parent || current) : current;
            neighbor.g = tentativeG;
            neighbor.f = neighbor.g + heuristic(neighbor, end);
        }

        visualizationState.openSet = [...openSet];
        visualizationState.closedSet = Array.from(closedSet);
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

function hasLineOfSight(a, b) {
    let x0 = a.x, y0 = a.y;
    let x1 = b.x, y1 = b.y;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let x = x0;
    let y = y0;
    let n = 1 + dx + dy;
    let x_inc = (x1 > x0) ? 1 : -1;
    let y_inc = (y1 > y0) ? 1 : -1;
    let error = dx - dy;
    dx *= 2;
    dy *= 2;

    for (; n > 0; --n) {
        if (grid[y][x].isWall) return false;
        
        if (error > 0) {
            x += x_inc;
            error -= dy;
        } else {
            y += y_inc;
            error += dx;
        }
    }

    return true;
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

async function bestFirstSearch() {
    stepCount = 0;
    const openSet = [start];
    const closedSet = new Set();
    start.f = heuristic(start, end);

    while (openSet.length > 0) {
        stepCount++;
        let current = openSet.reduce((a, b) => a.f < b.f ? a : b);

        if (current === end) {
            return reconstructPath(current);
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.add(current);

        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.has(neighbor) || neighbor.isWall) continue;

            if (!openSet.includes(neighbor)) {
                neighbor.parent = current;
                neighbor.f = heuristic(neighbor, end);
                openSet.push(neighbor);
            }
        }

        visualizationState.openSet = [...openSet];
        visualizationState.closedSet = Array.from(closedSet);
        drawGrid();
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}



function animatePathDot(path) {
    let dotIndex = 0;
    const animateDot = () => {
        if (dotIndex < path.length) {
            drawGrid();
            drawPath(path);
            
            // Draw the moving dot
            const node = path[dotIndex];
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(node.x * cellSize + cellSize / 2, node.y * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
            ctx.fill();
            
            dotIndex++;
            requestAnimationFrame(animateDot);
        }
    };
    animateDot();
}



function drawPath(path) {
    if (path.length > 1) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();
    }
}


// Helper functions
function getNeighbors(node) {
    const neighbors = [];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of dirs) {
        const x = node.x + dx;
        const y = node.y + dy;
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
            neighbors.push(grid[y][x]);
        }
    }
    return neighbors;
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getAllNodes() {
    return grid.flat();
}

function reconstructPath(current, previous = null) {
    const path = [current];
    while (previous ? previous.get(current) : current.parent) {
        current = previous ? previous.get(current) : current.parent;
        path.unshift(current);
    }
    return path;
}

function visualize(openSet, closedSet) {
    for (const node of closedSet) {
        if (node !== start && node !== end && !node.isWall) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(node.x * cellSize + 1, node.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
    }
    for (const node of openSet) {
        if (node !== start && node !== end && !node.isWall) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(node.x * cellSize + 1, node.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
    }
}

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startPathfinding);
document.getElementById('resetBtn').addEventListener('click', resetGrid);
document.getElementById('algorithm').addEventListener('change', resetExploredArea);

async function startPathfinding() {
    if (isRunning) {
        alert('Please wait for the current algorithm to finish.');
        return;
    }

    if (!start || !end) {
        alert('Please set both start and end points');
        return;
    }

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    resetExploredArea();
    const algorithm = document.getElementById('algorithm').value;
    let path;

    startTime = performance.now();

    switch (algorithm) {
        case 'astar':
            path = await aStar();
            break;
        case 'dijkstra':
            path = await dijkstra();
            break;
        case 'bfs':
            path = await bfs();
            break;
        case 'greedy':
            path = await greedyBestFirst();
            break;
        case 'dfs':
            path = await dfs();
            break;
        case 'bibfs':
            path = await bidirectionalBFS();
            break;
        case 'thetastar':
            path = await thetaStar();
            break;
        case 'bestfirst':
            path = await bestFirstSearch();
            break;
    }




    const endTime = performance.now();
    const duration = endTime - startTime;

    if (path) {
        visualizationState.path = path;
        drawGrid();
        displayStatistics(algorithm, path.length - 1, stepCount, duration);
        animatePathDot(path); // my dot anim :D
    } else {
        alert('No path found');
        displayStatistics(algorithm, 'N/A', stepCount, duration);
    }

    isRunning = false;
    document.getElementById('startBtn').disabled = false;
}






function displayStatistics(algorithm, pathLength, steps, duration) {
    const statsDiv = document.getElementById('statistics');
    statsDiv.innerHTML = `
        <h3>Current Run Statistics:</h3>
        <p>Algorithm: ${algorithm}</p>
        <p>Path Length: ${pathLength}</p>
        <p>Steps Taken: ${steps}</p>
        <p>Time: ${duration.toFixed(2)} ms</p>
    `;

    // Store comparison data
    comparisonData[algorithm] = {
        pathLength: pathLength,
        steps: steps,
        duration: duration.toFixed(2)
    };

    updateComparisonTable();
}


function updateComparisonTable() {
    const tableBody = document.querySelector('#comparison-table tbody');
    tableBody.innerHTML = '';

    for (const [algorithm, data] of Object.entries(comparisonData)) {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = algorithm;
        row.insertCell(1).textContent = data.pathLength;
        row.insertCell(2).textContent = data.steps;
        row.insertCell(3).textContent = data.duration;
    }
}


function resetGrid() {
    initGrid();
    visualizationState = {
        openSet: [],
        closedSet: [],
        path: []
    };
    comparisonData = {}; // Clear comparison data
    drawGrid();
    // Clear statistics and comparison table
    document.getElementById('statistics').innerHTML = '';
    updateComparisonTable();
}

function resetExploredArea() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const node = grid[y][x];
            if (!node.isWall) {
                node.parent = null;
                node.f = 0;
                node.g = 0;
                node.h = 0;
            }
        }
    }
    visualizationState = {
        openSet: [],
        closedSet: [],
        path: []
    };
    drawGrid();
    // Clear statistics
    document.getElementById('statistics').innerHTML = '';
}

// Initialize
initGrid();

drawGrid();