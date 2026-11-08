// Initial State for Reset
const INITIAL_STATE = {
    numProcesses: 5,
    numResources: 3,
    allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
    ],
    max: [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
    ],
    available: [3, 3, 2]
};

// Current State
let STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
STATE.need = [];
STATE.request = Array.from({ length: STATE.numProcesses }, () => Array(STATE.numResources).fill(0));
STATE.deadlockedProcesses = [];
STATE.deadlockedEdges = []; // Track edges in cycle [ {from, to} ]
STATE.isDeadlocked = false;
STATE.safeSequence = [];

// Checkpoint State
let CHECKPOINT_STATE = null;

// Node Positions (for drag and drop)
let NODE_POSITIONS = { p: [], r: [] };
let positionsInitialized = false;

// Interactive Stepper State
const STEP_STATE = {
    active: false,
    mode: 'bankers',
    steps: [],
    idx: 0,
    timer: null,
    highlightProcess: null
};

// DOM Elements
const allocGrid = document.getElementById('allocation-matrix');
const reqGrid = document.getElementById('request-matrix');
const availGrid = document.getElementById('available-vector');
const needGrid = document.getElementById('need-matrix');
const terminal = document.getElementById('terminal-output');
const svg = document.getElementById('rag-svg');
const statusDot = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const seqPanel = document.getElementById('safe-sequence-display');
const seqPath = document.getElementById('sequence-path');
const cyclePanel = document.getElementById('deadlock-cycle-display');
const cyclePath = document.getElementById('cycle-path');
const unsafePanel = document.getElementById('unsafe-explanation-display');
const btnRecoverAbort = document.getElementById('btn-recover-abort');
const btnRecoverVictim = document.getElementById('btn-recover-victim');
const btnRecoverPreempt = document.getElementById('btn-recover-preempt');
const btnRollback = document.getElementById('btn-rollback');

function getTimestamp() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

function triggerSuccessGlow() {
    const sweep = document.getElementById('glow-sweep');
    if(sweep) {
        sweep.classList.remove('sweep-active');
        void sweep.offsetWidth; // Force reflow
        sweep.classList.add('sweep-active');
    }
}

function log(msg, type = 'sys-msg') {
    const p = document.createElement('p');
    p.className = type;
    const timeSpan = document.createElement('span');
    timeSpan.style.color = 'var(--text-muted)';
    timeSpan.style.fontSize = '0.75rem';
    timeSpan.textContent = getTimestamp() + ' > ';
    p.appendChild(timeSpan);
    p.appendChild(document.createTextNode(String(msg)));
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
}

// Initialization & Rendering Data
function calculateNeed() {
    STATE.need = [];
    for (let i = 0; i < STATE.numProcesses; i++) {
        let row = [];
        for (let j = 0; j < STATE.numResources; j++) {
            row.push(STATE.max[i][j] - STATE.allocation[i][j]);
        }
        STATE.need.push(row);
    }
}

function renderMatrices() {
    calculateNeed();
    allocGrid.innerHTML = '';
    reqGrid.innerHTML = '';
    const reqGridActive = document.getElementById('request-matrix-active');
    reqGridActive.innerHTML = '';
    availGrid.innerHTML = '';
    needGrid.innerHTML = '';

    // Render Allocation & Max
    for (let i = 0; i < STATE.numProcesses; i++) {
        let rAlloc = document.createElement('div'); rAlloc.className = 'matrix-row';
        let rMax = document.createElement('div'); rMax.className = 'matrix-row';
        let rNeed = document.createElement('div'); rNeed.className = 'matrix-row';

        let lbl1 = document.createElement('span'); lbl1.className = 'row-label'; lbl1.innerText = `P${i}`;
        let lbl2 = document.createElement('span'); lbl2.className = 'row-label'; lbl2.innerText = `P${i}`;
        let lbl3 = document.createElement('span'); lbl3.className = 'row-label'; lbl3.innerText = `P${i}`;
        rAlloc.appendChild(lbl1);
        rMax.appendChild(lbl2);
        rNeed.appendChild(lbl3);

        for (let j = 0; j < STATE.numResources; j++) {
            // Alloc Input
            let aInp = document.createElement('input');
            aInp.type = 'number'; aInp.min = 0; aInp.className = 'matrix-input';
            aInp.value = STATE.allocation[i][j];
            aInp.onchange = (e) => { 
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val > STATE.max[i][j]) {
                    log(`Input Rejected: Allocation (${val}) cannot exceed Max claim (${STATE.max[i][j]}) for P${i}, R${String.fromCharCode(65+j)}`, 'error-msg');
                    e.target.value = STATE.allocation[i][j]; // Revert
                    return;
                }
                STATE.allocation[i][j] = val; 
                log(`Updated Allocation P${i}, R${String.fromCharCode(65+j)} to ${val}`, 'sys-msg');
                updateSystem(); 
            };
            rAlloc.appendChild(aInp);

            // Max Input
            let mInp = document.createElement('input');
            mInp.type = 'number'; mInp.min = 0; mInp.className = 'matrix-input';
            mInp.value = STATE.max[i][j];
            mInp.onchange = (e) => { 
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val < STATE.allocation[i][j]) {
                    log(`Input Rejected: Max claim (${val}) cannot be less than current Allocation (${STATE.allocation[i][j]}) for P${i}, R${String.fromCharCode(65+j)}`, 'error-msg');
                    e.target.value = STATE.max[i][j]; // Revert
                    return;
                }
                STATE.max[i][j] = val; 
                log(`Updated Max P${i}, R${String.fromCharCode(65+j)} to ${val}`, 'sys-msg');
                updateSystem(); 
            };
            rMax.appendChild(mInp);

            // Need Display
            let nInp = document.createElement('input');
            nInp.type = 'number'; nInp.className = 'matrix-input'; nInp.readOnly = true;
            nInp.value = STATE.need[i][j];
            rNeed.appendChild(nInp);

            // Active Request Display
            let arInp = document.createElement('input');
            arInp.type = 'number'; arInp.min = 0; arInp.className = 'matrix-input';
            arInp.value = STATE.request[i][j];
            arInp.style.borderColor = 'var(--accent-red)';
            arInp.onchange = (e) => {
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val > STATE.need[i][j]) {
                    log(`Warning: Request (${val}) exceeds remaining Need (${STATE.need[i][j]}) for P${i}`, 'warn-msg');
                }
                STATE.request[i][j] = val;
                updateSystem();
            };
            if (j === 0) {
                let rActive = document.createElement('div'); rActive.className = 'matrix-row';
                let lbl = document.createElement('span'); lbl.className = 'row-label'; lbl.innerText = `P${i}`;
                rActive.appendChild(lbl);
                reqGridActive.appendChild(rActive);
            }
            reqGridActive.children[i].appendChild(arInp);
        }
        allocGrid.appendChild(rAlloc);
        reqGrid.appendChild(rMax);
        needGrid.appendChild(rNeed);
    }

    // Render Available
    let rAvail = document.createElement('div'); rAvail.className = 'matrix-row';
    let aLbl = document.createElement('span'); aLbl.className = 'row-label'; aLbl.innerText = 'R';
    rAvail.appendChild(aLbl);
    for (let j = 0; j < STATE.numResources; j++) {
        let vInp = document.createElement('input');
        vInp.type = 'number'; vInp.min = 0; vInp.className = 'matrix-input';
        vInp.value = STATE.available[j];
        vInp.onchange = (e) => { 
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            STATE.available[j] = val; 
            log(`Updated Available R${String.fromCharCode(65+j)} to ${val}`, 'sys-msg');
            updateSystem(); 
        };
        rAvail.appendChild(vInp);
    }
    availGrid.appendChild(rAvail);

    // Sync Dynamic Resource Request form controls to match state
    const reqProcSelect = document.getElementById('req-process');
    if (reqProcSelect) {
        const curVal = reqProcSelect.value;
        reqProcSelect.innerHTML = '';
        for (let i = 0; i < STATE.numProcesses; i++) {
            let opt = document.createElement('option');
            opt.value = i;
            opt.innerText = `P${i}`;
            reqProcSelect.appendChild(opt);
        }
        if (curVal !== "" && parseInt(curVal) < STATE.numProcesses) {
            reqProcSelect.value = curVal;
        }
    }

    const reqForm = document.querySelector('.request-form');
    const sendBtn = document.getElementById('btn-submit-req');
    if (reqForm && sendBtn) {
        reqForm.querySelectorAll('input[id^="req-r"]').forEach(el => el.remove());
        for (let j = 0; j < STATE.numResources; j++) {
            let inp = document.createElement('input');
            inp.type = 'number';
            inp.id = `req-r${j}`;
            inp.className = 'matrix-input';
            inp.placeholder = String.fromCharCode(65 + j);
            inp.min = 0;
            inp.value = 0;
            reqForm.insertBefore(inp, sendBtn);
        }
    }
}

const SVG_VIEW_WIDTH = 720;
const SVG_VIEW_HEIGHT = 440;

function initNodePositions() {
    NODE_POSITIONS.p = [];
    NODE_POSITIONS.r = [];
    
    for(let i=0; i<STATE.numProcesses; i++) {
        NODE_POSITIONS.p.push({
            x: Math.round(SVG_VIEW_WIDTH * 0.25),
            y: Math.round(SVG_VIEW_HEIGHT * (i + 1) / (STATE.numProcesses + 1)),
            id: `P${i}`,
            type: 'p',
            idx: i
        });
    }
    for(let j=0; j<STATE.numResources; j++) {
        NODE_POSITIONS.r.push({
            x: Math.round(SVG_VIEW_WIDTH * 0.75),
            y: Math.round(SVG_VIEW_HEIGHT * (j + 1) / (STATE.numResources + 1)),
            id: `R${j}`,
            type: 'r',
            idx: j
        });
    }
    positionsInitialized = true;
}

function drawRAG() {
    if(!positionsInitialized || NODE_POSITIONS.p.length !== STATE.numProcesses || NODE_POSITIONS.r.length !== STATE.numResources) {
        initNodePositions();
    }

    svg.setAttribute("viewBox", `0 0 ${SVG_VIEW_WIDTH} ${SVG_VIEW_HEIGHT}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    svg.innerHTML = `
        <defs>
            <marker id="arrowhead-alloc" markerWidth="9" markerHeight="8" refX="26" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 8 4 L 1 7 Z" fill="#10b981" />
            </marker>
            <marker id="arrowhead-req" markerWidth="9" markerHeight="8" refX="26" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 8 4 L 1 7 Z" fill="#f43f5e" />
            </marker>
            <marker id="arrowhead-deadlock" markerWidth="9" markerHeight="8" refX="26" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 1 1 L 8 4 L 1 7 Z" fill="#ff003c" />
            </marker>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <text x="360" y="215" text-anchor="middle" fill="rgba(255,255,255,0.03)" font-size="36px" font-weight="900" font-family="Outfit, sans-serif" letter-spacing="6px" pointer-events="none">DEADLOCKLAB</text>
        <text x="360" y="240" text-anchor="middle" fill="rgba(255,255,255,0.025)" font-size="11px" font-weight="700" font-family="JetBrains Mono, monospace" letter-spacing="3px" pointer-events="none">RESOURCE ALLOCATION GRAPH</text>
    `;
    
    // Draw Edges
    for(let i=0; i<STATE.numProcesses; i++) {
        for(let j=0; j<STATE.numResources; j++) {
            if (!NODE_POSITIONS.p[i] || !NODE_POSITIONS.r[j]) continue;
            // Spread connection points cleanly along resource node height to prevent line/arrow collisions
            const spread = (i - (STATE.numProcesses - 1) / 2) * 5;
            // Allocation Edge (Resource -> Process)
            if(STATE.allocation[i][j] > 0) {
                drawLine(
                    { x: NODE_POSITIONS.r[j].x, y: NODE_POSITIONS.r[j].y + spread },
                    { x: NODE_POSITIONS.p[i].x, y: NODE_POSITIONS.p[i].y - 3 },
                    '#10b981', 'arrowhead-alloc', STATE.allocation[i][j], false
                );
            }
            // Request Edge (Process -> Resource) based on ACTIVE request matrix
            if(STATE.request[i][j] > 0) {
                const isHighlighted = STATE.deadlockedEdges.some(e => e.from === `P${i}` && e.to === `R${j}`);
                const marker = isHighlighted ? 'arrowhead-deadlock' : 'arrowhead-req';
                const color = isHighlighted ? '#ff003c' : '#f43f5e';
                drawLine(
                    { x: NODE_POSITIONS.p[i].x, y: NODE_POSITIONS.p[i].y + 3 },
                    { x: NODE_POSITIONS.r[j].x, y: NODE_POSITIONS.r[j].y + spread },
                    color, marker, STATE.request[i][j], isHighlighted
                );
            }
        }
    }

    // Draw Nodes
    NODE_POSITIONS.p.forEach(n => drawDraggableNode(n, true, STATE.deadlockedProcesses.includes(n.idx)));
    NODE_POSITIONS.r.forEach(n => drawDraggableNode(n, false, false));
}

function drawLine(p1, p2, color, marker, weight, isHighlighted) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    if (isHighlighted) line.classList.add('edge-highlight');
    
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", isHighlighted ? "2.5" : Math.min(1.8 + weight*0.2, 3));
    line.setAttribute("marker-end", `url(#${marker})`);
    line.setAttribute("opacity", isHighlighted ? "1" : "0.85");
    
    svg.appendChild(line);
}

// Drag and Drop Logic (Mouse & Touch)
let draggedNode = null;

function handleDragStart(type, idx) {
    draggedNode = type === 'p' ? NODE_POSITIONS.p[idx] : NODE_POSITIONS.r[idx];
}

function getSVGPoint(clientX, clientY) {
    try {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
            return pt.matrixTransform(ctm.inverse());
        }
    } catch (e) {}
    const rect = svg.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (SVG_VIEW_WIDTH / (rect.width || SVG_VIEW_WIDTH)),
        y: (clientY - rect.top) * (SVG_VIEW_HEIGHT / (rect.height || SVG_VIEW_HEIGHT))
    };
}

function handleDragMove(clientX, clientY) {
    if(draggedNode) {
        const coords = getSVGPoint(clientX, clientY);
        // Clamp to ensure nodes never escape the screen on any device
        draggedNode.x = Math.max(30, Math.min(SVG_VIEW_WIDTH - 30, coords.x));
        draggedNode.y = Math.max(30, Math.min(SVG_VIEW_HEIGHT - 30, coords.y));
        drawRAG();
    }
}

function handleDragEnd() {
    draggedNode = null;
}

svg.addEventListener('mousedown', (e) => {
    if(e.target.classList.contains('drag-handle')) {
        let type = e.target.getAttribute('data-type');
        let idx = parseInt(e.target.getAttribute('data-idx'));
        handleDragStart(type, idx);
    }
});

svg.addEventListener('mousemove', (e) => {
    handleDragMove(e.clientX, e.clientY);
});

svg.addEventListener('mouseup', handleDragEnd);
svg.addEventListener('mouseleave', handleDragEnd);

// Touch Support for mobile and tablets
svg.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('drag-handle')) {
            e.preventDefault();
            let type = target.getAttribute('data-type');
            let idx = parseInt(target.getAttribute('data-idx'));
            handleDragStart(type, idx);
        }
    }
}, { passive: false });

svg.addEventListener('touchmove', (e) => {
    if (draggedNode && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
    }
}, { passive: false });

svg.addEventListener('touchend', handleDragEnd);
svg.addEventListener('touchcancel', handleDragEnd);

function drawDraggableNode(node, isProcess, isDeadlocked) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.style.cursor = "grab";
    g.setAttribute("data-id", (isProcess ? 'P' : 'R') + node.idx);
    
    let shape;
    if(isProcess) {
        shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        shape.setAttribute("cx", node.x);
        shape.setAttribute("cy", node.y);
        shape.setAttribute("r", 20);
        shape.setAttribute("stroke", isDeadlocked ? "#f43f5e" : "#0ea5e9");
    } else {
        shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shape.setAttribute("x", node.x - 20);
        shape.setAttribute("y", node.y - 20);
        shape.setAttribute("width", 40);
        shape.setAttribute("height", 40);
        shape.setAttribute("rx", "6");
        shape.setAttribute("ry", "6");
        shape.setAttribute("stroke", "#f59e0b");
    }
    
    shape.setAttribute("fill", "#0f172a");
    shape.setAttribute("stroke-width", "2.5");
    if(isDeadlocked) shape.setAttribute("filter", "url(#glow)");
    
    shape.classList.add("drag-handle", "node-shape");
    shape.setAttribute("data-type", node.type);
    shape.setAttribute("data-idx", node.idx);

    // Active step highlight during interactive stepper execution
    if (isProcess && typeof STEP_STATE !== 'undefined' && STEP_STATE.active && STEP_STATE.highlightProcess === node.idx) {
        shape.classList.add("node-highlight-step");
    }

    const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    if(!isProcess) {
        const used = STATE.allocation.reduce((sum, row) => sum + (row[node.idx] || 0), 0);
        const avail = STATE.available[node.idx] || 0;
        tooltip.textContent = `RESOURCE R${node.idx} (${String.fromCharCode(65 + node.idx)})\nTotal: ${used + avail}\nAllocated: ${used}\nAvailable: ${avail}`;
    } else {
        tooltip.textContent = `PROCESS P${node.idx}\nStatus: ${isDeadlocked ? 'DEADLOCKED' : 'RUNNING'}`;
    }
    g.appendChild(tooltip);
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", isProcess ? node.y + 5 : node.y - 1);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "#f8fafc");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("font-size", isProcess ? "14px" : "13px");
    text.setAttribute("font-family", "Outfit, sans-serif");
    text.style.pointerEvents = "none";
    text.textContent = isProcess ? `P${node.idx}` : `R${node.idx}`;

    const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subText.setAttribute("x", node.x);
    subText.setAttribute("y", isProcess ? node.y + 36 : node.y + 13);
    subText.setAttribute("text-anchor", "middle");
    subText.setAttribute("fill", isProcess ? (isDeadlocked ? "#f43f5e" : "#64748b") : "#94a3b8");
    subText.setAttribute("font-size", "10px");
    subText.setAttribute("font-weight", "800");
    subText.setAttribute("font-family", "JetBrains Mono, monospace");
    subText.style.pointerEvents = "none";
    
    if(isProcess) {
        subText.textContent = isDeadlocked ? "DEADLOCK" : "OK";
    } else {
        const used = STATE.allocation.reduce((sum, row) => sum + (row[node.idx] || 0), 0);
        const avail = STATE.available[node.idx] || 0;
        subText.textContent = `${used}/${used + avail}`;
    }

    g.appendChild(shape);
    g.appendChild(text);
    g.appendChild(subText);

    // Interactive Node Inspector HUD Hover
    g.addEventListener('mouseenter', () => {
        const hudTitle = document.getElementById('hud-title');
        const hudBody = document.getElementById('hud-body');
        if (!hudTitle || !hudBody) return;

        if (isProcess) {
            hudTitle.textContent = `PROCESS P${node.idx} (${isDeadlocked ? 'DEADLOCKED' : 'RUNNING'})`;
            const alloc = STATE.allocation[node.idx] ? STATE.allocation[node.idx].join(', ') : '-';
            const max = STATE.max[node.idx] ? STATE.max[node.idx].join(', ') : '-';
            const need = STATE.need && STATE.need[node.idx] ? STATE.need[node.idx].join(', ') : '-';
            hudBody.textContent = `Allocated: [${alloc}] | Max Claim: [${max}] | Need: [${need}]`;
        } else {
            const used = STATE.allocation.reduce((sum, row) => sum + (row[node.idx] || 0), 0);
            const avail = STATE.available[node.idx] || 0;
            const resName = String.fromCharCode(65 + node.idx);
            hudTitle.textContent = `RESOURCE ${resName} (R${node.idx}) — ${used + avail} TOTAL UNITS`;
            hudBody.textContent = `Held: ${used} units | Available Pool: ${avail} units | Capacity: ${used + avail}`;
        }
    });

    g.addEventListener('mouseleave', () => {
        const hudTitle = document.getElementById('hud-title');
        const hudBody = document.getElementById('hud-body');
        if (!hudTitle || !hudBody) return;
        hudTitle.textContent = 'TOPOLOGY OVERVIEW';
        hudBody.textContent = 'Hover or click any process or resource node to inspect live vectors.';
    });

    svg.appendChild(g);
}

function updateSystem() {
    renderMatrices();
    drawRAG();
    updateResourceBars();
    renderProcessTable();
    updateTelemetry();
    statusText.innerText = 'STATE UPDATED - RUN CHECK';
    seqPanel.style.display = 'none';
    cyclePanel.style.display = 'none';
    unsafePanel.style.display = 'none';
    btnRecoverAbort.disabled = true;
    btnRecoverVictim.disabled = true;
    btnRecoverPreempt.disabled = true;
}

function updateResourceBars() {
    const container = document.getElementById('resource-bars');
    if (!container) return;
    let fullHtml = '';

    for (let j = 0; j < STATE.numResources; j++) {
        const allocated = STATE.allocation.reduce((sum, row) => sum + row[j], 0);
        const total = allocated + STATE.available[j];
        const percent = total > 0 ? Math.round((allocated / total) * 100) : 0;
        
        let statusClass = '';
        if (percent >= 90) statusClass = 'danger';
        else if (percent >= 70) statusClass = 'warning';

        fullHtml += `
            <div class="bar-group">
                <div class="bar-info">
                    <span class="bar-label">RESOURCE R${String.fromCharCode(65 + j)}</span>
                    <span class="bar-percent">${allocated} / ${total} (${percent}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${statusClass}" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }
    container.innerHTML = fullHtml;
}

function updateTelemetry() {
    const elProcs = document.getElementById('tel-procs');
    const elRes = document.getElementById('tel-res');
    const elAlloc = document.getElementById('tel-alloc');
    const elAvail = document.getElementById('tel-avail');
    const elEdges = document.getElementById('tel-edges');
    const elModel = document.getElementById('tel-model');
    const elContention = document.getElementById('qs-contention');
    const elQsState = document.getElementById('qs-state');
    const elBadge = document.getElementById('proc-active-badge');
    const elPanelTag = document.getElementById('panel-state-tag');

    if (!elProcs) return;

    elProcs.textContent = STATE.numProcesses;
    elRes.textContent = STATE.numResources;

    let totalAlloc = 0;
    let totalAvail = STATE.available.reduce((a, b) => a + (b || 0), 0);
    let edgeCount = 0;

    for (let i = 0; i < STATE.numProcesses; i++) {
        for (let j = 0; j < STATE.numResources; j++) {
            if (STATE.allocation[i] && STATE.allocation[i][j] > 0) {
                totalAlloc += STATE.allocation[i][j];
                edgeCount++;
            }
            if (STATE.request[i] && STATE.request[i][j] > 0) {
                edgeCount++;
            }
        }
    }

    elAlloc.textContent = `${totalAlloc} units`;
    elAvail.textContent = `${totalAvail} units`;
    elEdges.textContent = `${edgeCount} active`;

    let isSingleInstance = true;
    for (let j = 0; j < STATE.numResources; j++) {
        let total = (STATE.available[j] || 0) + STATE.allocation.reduce((sum, row) => sum + (row[j] || 0), 0);
        if (total > 1) {
            isSingleInstance = false;
            break;
        }
    }

    elModel.textContent = isSingleInstance ? 'Single-Instance DFS' : 'Multi-Instance Reduction';

    const systemTotal = totalAlloc + totalAvail;
    const contentionPct = systemTotal > 0 ? Math.round((totalAlloc / systemTotal) * 100) : 0;
    if (elContention) elContention.textContent = `${contentionPct}%`;

    let activeCount = 0;
    for (let i = 0; i < STATE.numProcesses; i++) {
        const isTerminated = STATE.allocation[i]?.every(v => v === 0) && STATE.max[i]?.every(v => v === 0);
        if (!isTerminated) activeCount++;
    }
    if (elBadge) elBadge.textContent = `${activeCount} ACTIVE`;

    if (elQsState && elPanelTag) {
        if (STATE.isDeadlocked) {
            elQsState.textContent = 'CIRCULAR WAIT';
            elQsState.style.color = '#f43f5e';
            elPanelTag.textContent = 'DEADLOCKED';
            elPanelTag.style.borderColor = '#f43f5e';
            elPanelTag.style.color = '#f43f5e';
        } else if (STATE.safeSequence && STATE.safeSequence.length > 0) {
            elQsState.textContent = 'SAFE';
            elQsState.style.color = '#10b981';
            elPanelTag.textContent = 'DETERMINISTIC';
            elPanelTag.style.borderColor = '#10b981';
            elPanelTag.style.color = '#10b981';
        } else {
            elQsState.textContent = 'MONITORING';
            elQsState.style.color = '#38bdf8';
            elPanelTag.textContent = 'OPERATIONAL';
            elPanelTag.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            elPanelTag.style.color = 'var(--text-muted)';
        }
    }
}

function renderProcessTable() {
    const tbody = document.getElementById('process-table-body');
    if (!tbody) return;

    let html = '';
    for (let i = 0; i < STATE.numProcesses; i++) {
        const isTerminated = STATE.allocation[i]?.every(v => v === 0) && STATE.max[i]?.every(v => v === 0);
        const isDeadlocked = STATE.deadlockedProcesses?.includes(i);
        
        let stateBadge = '';
        if (isTerminated) {
            stateBadge = '<span class="badge badge-neutral">TERMINATED</span>';
        } else if (isDeadlocked) {
            stateBadge = '<span class="badge badge-danger">DEADLOCKED</span>';
        } else if (typeof STEP_STATE !== 'undefined' && STEP_STATE.active) {
            if (STEP_STATE.completedProcesses?.includes(i)) {
                stateBadge = '<span class="badge badge-info">FINISHED</span>';
            } else if (STEP_STATE.highlightProcess === i) {
                stateBadge = '<span class="badge badge-warning">EVALUATING</span>';
            } else {
                stateBadge = '<span class="badge badge-success">RUNNING</span>';
            }
        } else if (STATE.safeSequence && STATE.safeSequence.length > 0) {
            stateBadge = '<span class="badge badge-success">SAFE</span>';
        } else {
            stateBadge = '<span class="badge badge-info">RUNNING</span>';
        }

        const allocStr = STATE.allocation[i] ? STATE.allocation[i].join(' ') : '-';
        const needStr = STATE.need && STATE.need[i] ? STATE.need[i].join(' ') : (STATE.max[i] ? STATE.max[i].join(' ') : '-');

        html += `
            <tr onclick="highlightProcessNode(${i})" title="Click to locate P${i} on RAG canvas">
                <td><strong>P${i}</strong></td>
                <td>${stateBadge}</td>
                <td><code>${allocStr}</code></td>
                <td><code>${needStr}</code></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function highlightProcessNode(pid) {
    if (typeof playHapticBeep === 'function') playHapticBeep(440, 0.05, 'sine');
    const nodeEl = document.querySelector(`g[data-id="P${pid}"]`);
    if (nodeEl) {
        nodeEl.classList.add('node-highlight-step');
        setTimeout(() => nodeEl.classList.remove('node-highlight-step'), 1200);
    }
    const hudTitle = document.getElementById('hud-title');
    const hudBody = document.getElementById('hud-body');
    if (hudTitle && hudBody && STATE.allocation[pid]) {
        hudTitle.textContent = `PROCESS P${pid} (INSPECTED)`;
        const alloc = STATE.allocation[pid].join(', ');
        const max = STATE.max[pid] ? STATE.max[pid].join(', ') : '-';
        const need = STATE.need && STATE.need[pid] ? STATE.need[pid].join(', ') : '-';
        hudBody.textContent = `Alloc: [${alloc}] | Max: [${max}] | Need: [${need}]`;
    }
}

function saveCheckpoint() {
    CHECKPOINT_STATE = JSON.parse(JSON.stringify(STATE));
    log('State Checkpoint Saved.', 'success-msg');
    btnRollback.disabled = false;
}

function rollbackSystem() {
    if(CHECKPOINT_STATE) {
        STATE = JSON.parse(JSON.stringify(CHECKPOINT_STATE));
        log('Rollback successful! Reverted to last checkpoint.', 'warn-msg');
        updateSystem();
        detectDeadlock();
    } else {
        log('Rollback unavailable: No saved checkpoint found. Click SAVE first.', 'warn-msg');
    }
}

function resetSystem() {
    STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
    STATE.need = [];
    STATE.request = Array.from({ length: STATE.numProcesses }, () => Array(STATE.numResources).fill(0));
    STATE.deadlockedProcesses = [];
    STATE.deadlockedEdges = [];
    STATE.isDeadlocked = false;
    STATE.safeSequence = [];
    STATE.currentCycleStr = "";

    positionsInitialized = false;
    resetStepper();
    log('System has been completely reset to initial default state.', 'warn-msg');
    
    // Hide all analysis panels
    document.getElementById('safe-sequence-display').style.display = 'none';
    document.getElementById('deadlock-cycle-display').style.display = 'none';
    document.getElementById('unsafe-explanation-display').style.display = 'none';
    
    statusDot.className = 'status-indicator';
    statusText.innerText = 'SYSTEM IDLE';
    
    updateSystem();
}

// MODULE 2: Banker's Algorithm
function runBankersAlgorithm() {
    log("Running Banker's Algorithm...");
    let work = [...STATE.available];
    let finish = new Array(STATE.numProcesses).fill(false);
    
    // Distinguish active processes from terminated/inactive ones
    let activeProcesses = 0;
    for(let i = 0; i < STATE.numProcesses; i++) {
        const isInactive = STATE.allocation[i].every(v => v === 0) && STATE.max[i].every(v => v === 0);
        if (isInactive) {
            finish[i] = true;
        } else {
            activeProcesses++;
        }
    }

    let safeSeq = [];
    let count = 0;
    while(count < activeProcesses) {
        let found = false;
        for(let i=0; i<STATE.numProcesses; i++) {
            if(!finish[i]) {
                let canAllocate = true;
                for(let j=0; j<STATE.numResources; j++) {
                    if(STATE.need[i][j] > work[j]) {
                        canAllocate = false;
                        break;
                    }
                }
                if(canAllocate) {
                    for(let j=0; j<STATE.numResources; j++) work[j] += STATE.allocation[i][j];
                    safeSeq.push(`P${i}`);
                    finish[i] = true;
                    found = true;
                    count++;
                }
            }
        }
        if(!found) break; // unsafe
    }

    if(count === activeProcesses && activeProcesses > 0) {
        log(`System is SAFE — Safe Sequence: ${safeSeq.join(' → ')}`, 'success-msg');
        statusDot.className = 'status-indicator safe';
        statusText.innerText = 'SYSTEM IS SAFE';
        seqPanel.style.display = 'block';
        seqPath.innerText = safeSeq.join(' → ');
        cyclePanel.style.display = 'none';
        unsafePanel.style.display = 'none';
        STATE.isDeadlocked = false;
        STATE.deadlockedProcesses = [];
        STATE.deadlockedEdges = [];
        STATE.safeSequence = safeSeq;
        triggerSuccessGlow();
    } else {
        log("System is UNSAFE! No safe sequence exists.", 'error-msg');
        statusDot.className = 'status-indicator unsafe';
        statusText.innerText = 'SYSTEM UNSAFE';
        seqPanel.style.display = 'none';
        unsafePanel.style.display = 'block';
        STATE.safeSequence = [];
    }
    
    // Prime interactive stepper with the calculated Banker's result
    if (typeof generateBankerSteps === 'function') {
        STEP_STATE.mode = 'bankers';
        STEP_STATE.steps = generateBankerSteps();
        STEP_STATE.idx = Math.max(0, STEP_STATE.steps.length - 1);
        STEP_STATE.active = true;
        const prevBtn = document.getElementById('btn-step-prev');
        if (prevBtn) prevBtn.disabled = false;
        const badgeEl = document.getElementById('step-badge');
        const textEl = document.getElementById('step-text');
        if (badgeEl && STEP_STATE.steps[STEP_STATE.idx]) badgeEl.textContent = STEP_STATE.steps[STEP_STATE.idx].badge;
        if (textEl && STEP_STATE.steps[STEP_STATE.idx]) textEl.textContent = STEP_STATE.steps[STEP_STATE.idx].text;
    }

    drawRAG();
    updateTelemetry();
    renderProcessTable();
}

// MODULE 2 Extension: Resource Request Algorithm
function submitResourceRequest() {
    let p = parseInt(document.getElementById('req-process').value);
    if (isNaN(p) || !STATE.need[p]) {
        log('Error: Invalid process selected.', 'error-msg');
        return;
    }

    let req = [];
    for(let j=0; j<STATE.numResources; j++) {
        let inp = document.getElementById(`req-r${j}`);
        let val = inp ? (parseInt(inp.value) || 0) : 0;
        req.push(val);
    }

    log(`Resource Request Algorithm triggered for P${p}: [${req.join(', ')}]`, 'sys-msg');

    for(let j=0; j<STATE.numResources; j++) {
        if(req[j] > STATE.need[p][j]) {
            log(`Error: P${p} has exceeded its maximum claim! Request Denied.`, 'error-msg');
            return;
        }
    }

    for(let j=0; j<STATE.numResources; j++) {
        if(req[j] > STATE.available[j]) {
            log(`P${p} must wait. Resources are not currently available.`, 'warn-msg');
            return;
        }
    }

    let oldAlloc = JSON.parse(JSON.stringify(STATE.allocation));
    let oldAvail = JSON.parse(JSON.stringify(STATE.available));
    let oldNeed = JSON.parse(JSON.stringify(STATE.need));

    for(let j=0; j<STATE.numResources; j++) {
        STATE.available[j] -= req[j];
        STATE.allocation[p][j] += req[j];
        STATE.need[p][j] -= req[j];
    }

    let work = [...STATE.available];
    let finish = new Array(STATE.numProcesses).fill(false);
    let activeProcesses = 0;
    for(let i=0; i<STATE.numProcesses; i++) {
        if(STATE.allocation[i].every(v => v === 0) && STATE.max[i].every(v => v === 0)) {
            finish[i] = true;
        } else {
            activeProcesses++;
        }
    }

    let count = 0;
    while(count < activeProcesses) {
        let found = false;
        for(let i=0; i<STATE.numProcesses; i++) {
            if(!finish[i]) {
                let canAlloc = true;
                for(let j=0; j<STATE.numResources; j++) {
                    if(STATE.need[i][j] > work[j]) { canAlloc = false; break; }
                }
                if(canAlloc) {
                    for(let j=0; j<STATE.numResources; j++) work[j] += STATE.allocation[i][j];
                    finish[i] = true; found = true; count++;
                }
            }
        }
        if(!found) break;
    }

    if(count === activeProcesses) {
        log(`Request granted safely for P${p}. Applying changes.`, 'success-msg');
        updateSystem();
        runBankersAlgorithm();
    } else {
        log(`Request DENIED. Granting would lead to unsafe state. Rolling back...`, 'error-msg');
        STATE.allocation = oldAlloc;
        STATE.available = oldAvail;
        STATE.need = oldNeed;
        updateSystem();
    }
}

// MODULE 3: Rigorous Deadlock Detection (Multi-Instance Reduction & Single-Instance DFS)
function detectDeadlock() {
    log("Running Deadlock Detection Analysis...", "sys-msg");
    
    // 1. Build Adjacency List for RAG Visualization & Cycle Checking
    let adj = {};
    for(let i=0; i<STATE.numProcesses; i++) adj[`P${i}`] = [];
    for(let j=0; j<STATE.numResources; j++) adj[`R${j}`] = [];
    
    for(let i=0; i<STATE.numProcesses; i++) {
        for(let j=0; j<STATE.numResources; j++) {
            if(STATE.allocation[i][j] > 0) adj[`R${j}`].push(`P${i}`);
            if(STATE.request[i][j] > 0) adj[`P${i}`].push(`R${j}`);
        }
    }

    // 2. DFS to detect graph cycles for visual edge highlighting
    let visited = new Set();
    let recStack = new Set();
    let cycleNodes = new Set();
    STATE.deadlockedEdges = [];
    let cyclePathFound = "";

    function findCycles(u, path) {
        visited.add(u);
        recStack.add(u);
        path.push(u);

        for(let v of adj[u]) {
            if(!visited.has(v)) {
                findCycles(v, path);
            } else if(recStack.has(v)) {
                let inCycle = false;
                let cycleTemp = [];
                for(let node of path) {
                    if(node === v) inCycle = true;
                    if(inCycle) {
                        cycleNodes.add(node);
                        cycleTemp.push(node);
                    }
                }
                for(let k=0; k<cycleTemp.length; k++) {
                    let from = cycleTemp[k];
                    let to = (k === cycleTemp.length - 1) ? v : cycleTemp[k+1];
                    STATE.deadlockedEdges.push({ from, to });
                }
                if (!cyclePathFound) {
                    cyclePathFound = cycleTemp.join(' → ') + ' → ' + v;
                }
            }
        }
        path.pop();
        recStack.delete(u);
    }

    for(let i=0; i<STATE.numProcesses; i++) if(!visited.has(`P${i}`)) findCycles(`P${i}`, []);
    for(let j=0; j<STATE.numResources; j++) if(!visited.has(`R${j}`)) findCycles(`R${j}`, []);

    // 3. Check Resource Type Multiplicity
    let isSingleInstance = true;
    for(let j=0; j<STATE.numResources; j++) {
        let total = STATE.available[j] + STATE.allocation.reduce((sum, row) => sum + row[j], 0);
        if(total > 1) {
            isSingleInstance = false;
            break;
        }
    }

    let deadlockedProcesses = [];

    if(isSingleInstance) {
        // In single-instance systems, a RAG cycle is necessary and sufficient for deadlock
        cycleNodes.forEach(n => {
            if(n.startsWith('P')) deadlockedProcesses.push(parseInt(n.substring(1)));
        });
        STATE.currentCycleStr = cyclePathFound;
    } else {
        // Multi-instance reduction algorithm (Silberschatz/Havender)
        let work = [...STATE.available];
        let finish = new Array(STATE.numProcesses).fill(false);

        for(let i=0; i<STATE.numProcesses; i++) {
            let hasAllocation = STATE.allocation[i].some(v => v > 0);
            if(!hasAllocation) finish[i] = true;
        }

        let progress = true;
        while(progress) {
            progress = false;
            for(let i=0; i<STATE.numProcesses; i++) {
                if(!finish[i]) {
                    let canSatisfy = true;
                    for(let j=0; j<STATE.numResources; j++) {
                        if(STATE.request[i][j] > work[j]) {
                            canSatisfy = false;
                            break;
                        }
                    }
                    if(canSatisfy) {
                        for(let j=0; j<STATE.numResources; j++) work[j] += STATE.allocation[i][j];
                        finish[i] = true;
                        progress = true;
                    }
                }
            }
        }

        for(let i=0; i<STATE.numProcesses; i++) {
            if(!finish[i]) deadlockedProcesses.push(i);
        }

        STATE.currentCycleStr = cyclePathFound || (deadlockedProcesses.map(p => `P${p}`).join(' ↔ '));
    }

    deadlockedProcesses.sort();
    STATE.deadlockedProcesses = deadlockedProcesses;

    if(STATE.deadlockedProcesses.length > 0) {
        let ps = STATE.deadlockedProcesses.map(p => `P${p}`).join(', ');
        log(`DEADLOCK DETECTED! Deadlocked processes: {${ps}}`, 'error-msg');
        statusDot.className = 'status-indicator unsafe';
        statusText.innerText = 'DEADLOCK DETECTED';
        seqPanel.style.display = 'none';
        unsafePanel.style.display = 'none';
        cyclePanel.style.display = 'block';
        cyclePath.innerText = STATE.currentCycleStr;
        STATE.isDeadlocked = true;
        btnRecoverAbort.disabled = false;
        btnRecoverVictim.disabled = false;
        btnRecoverPreempt.disabled = false;
    } else {
        if (cycleNodes.size > 0 && !isSingleInstance) {
            log(`Cycle present in RAG, but multiple resource instances satisfy requests. System is NOT deadlocked.`, 'success-msg');
        } else {
            log(`No deadlock detected. System is operational.`, 'success-msg');
        }
        statusDot.className = 'status-indicator safe';
        statusText.innerText = 'NO DEADLOCK';
        cyclePanel.style.display = 'none';
        STATE.deadlockedEdges = [];
        STATE.isDeadlocked = false;
        btnRecoverAbort.disabled = true;
        btnRecoverVictim.disabled = true;
        btnRecoverPreempt.disabled = true;
    }
    
    // Prime interactive stepper with the calculated Deadlock detection result
    if (typeof generateDeadlockSteps === 'function') {
        STEP_STATE.mode = 'deadlock';
        STEP_STATE.steps = generateDeadlockSteps();
        STEP_STATE.idx = Math.max(0, STEP_STATE.steps.length - 1);
        STEP_STATE.active = true;
        const prevBtn = document.getElementById('btn-step-prev');
        if (prevBtn) prevBtn.disabled = false;
        const badgeEl = document.getElementById('step-badge');
        const textEl = document.getElementById('step-text');
        if (badgeEl && STEP_STATE.steps[STEP_STATE.idx]) badgeEl.textContent = STEP_STATE.steps[STEP_STATE.idx].badge;
        if (textEl && STEP_STATE.steps[STEP_STATE.idx]) textEl.textContent = STEP_STATE.steps[STEP_STATE.idx].text;
    }

    drawRAG();
    updateTelemetry();
    renderProcessTable();
}

// MODULE 4: Recovery Module
function runRecovery(strategy) {
    if(!STATE.isDeadlocked) return;
    
    if(strategy === 'terminate') {
        log(`[Strategy A] ABORTING ALL deadlocked processes...`, 'error-msg');
        let aborted = [...STATE.deadlockedProcesses];
        for(let p of aborted) {
            for(let j=0; j<STATE.numResources; j++) {
                STATE.available[j] += STATE.allocation[p][j];
                STATE.allocation[p][j] = 0;
                STATE.max[p][j] = 0; 
                STATE.need[p][j] = 0; 
                STATE.request[p][j] = 0; // Clear requests on termination
            }
        }
        log(`Aborted processes: {${aborted.map(p=>`P${p}`).join(', ')}}. Resources returned to pool.`, 'success-msg');
        
    } else if(strategy === 'victim') {
        let victim = Math.max(...STATE.deadlockedProcesses);
        log(`[Strategy C] TERMINATING least priority victim: P${victim}`, 'error-msg');
        
        for(let j=0; j<STATE.numResources; j++) {
            STATE.available[j] += STATE.allocation[victim][j];
            STATE.allocation[victim][j] = 0;
            STATE.max[victim][j] = 0;
            STATE.need[victim][j] = 0;
            STATE.request[victim][j] = 0; // Clear requests on termination
        }
        log(`Process P${victim} terminated. Resources released.`, 'success-msg');

    } else if(strategy === 'preempt') {
        let maxHold = -1;
        let targetProcess = -1;
        for(let p of STATE.deadlockedProcesses) {
            let hold = STATE.allocation[p].reduce((a,b)=>a+b,0);
            if(hold > maxHold) { maxHold = hold; targetProcess = p; }
        }
        
        log(`[Strategy B] PREEMPTING ALL resources from P${targetProcess} (Resource Rollback)`, 'warn-msg');
        
        for(let j=0; j<STATE.numResources; j++) {
            let amount = STATE.allocation[targetProcess][j];
            if(amount > 0) {
                STATE.available[j] += amount;
                STATE.allocation[targetProcess][j] = 0;
                STATE.need[targetProcess][j] = STATE.max[targetProcess][j];
                STATE.request[targetProcess][j] = 0; // Clear pending request
                log(`Recovered ${amount} units of R${String.fromCharCode(65+j)} from P${targetProcess}.`, 'sys-msg');
                
                const resNode = document.querySelector(`g[data-id="R${j}"] .node-shape`);
                if(resNode) {
                    resNode.classList.add('flash-green');
                    setTimeout(() => resNode.classList.remove('flash-green'), 800);
                }
            }
        }
        log(`P${targetProcess} has been rolled back to initial state.`, 'success-msg');
    }
    
    updateSystem();
    setTimeout(detectDeadlock, 300);
}

// ==========================================
// MODULE 5: Interactive Stepper Engine & Audio Feedback
// ==========================================

let audioCtx = null;
function playHapticBeep(badge) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        let freq = 480;
        let dur = 0.05;
        const b = String(badge || '').toUpperCase();
        if (b.includes('SAFE') || b.includes('FINISH') || b.includes('RELEASE') || b.includes('RESOLVED')) {
            freq = 660;
            dur = 0.1;
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        } else if (b.includes('DEADLOCK') || b.includes('UNSAFE') || b.includes('WAIT')) {
            freq = 220;
            dur = 0.12;
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        } else {
            freq = 520;
            dur = 0.04;
            gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        }
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    } catch (e) {
        // Audio policy: silently pass if blocked
    }
}

function generateBankerSteps() {
    calculateNeed();
    const steps = [];
    const work = [...STATE.available];
    const finish = new Array(STATE.numProcesses).fill(false);
    const safeSeq = [];
    
    let activeProcesses = 0;
    for(let i = 0; i < STATE.numProcesses; i++) {
        const isInactive = STATE.allocation[i].every(v => v === 0) && STATE.max[i].every(v => v === 0);
        if (isInactive) finish[i] = true;
        else activeProcesses++;
    }

    steps.push({
        badge: "INIT",
        text: `Starting Banker's Safety Algorithm. Available Work = [${work.join(', ')}]. Active processes = ${activeProcesses}.`,
        work: [...work],
        finish: [...finish],
        highlightProcess: null,
        safeSeq: []
    });

    let count = 0;
    while(count < activeProcesses) {
        let found = false;
        for(let i = 0; i < STATE.numProcesses; i++) {
            if(!finish[i]) {
                const pNeed = STATE.need[i];
                let canAllocate = true;
                for(let j = 0; j < STATE.numResources; j++) {
                    if(pNeed[j] > work[j]) {
                        canAllocate = false;
                        break;
                    }
                }
                
                if(canAllocate) {
                    steps.push({
                        badge: `CHECK P${i}`,
                        text: `Testing P${i}: Need [${pNeed.join(', ')}] ≤ Work [${work.join(', ')}]. Criteria SATISFIED! P${i} can proceed.`,
                        work: [...work],
                        finish: [...finish],
                        highlightProcess: i,
                        safeSeq: [...safeSeq]
                    });

                    for(let j = 0; j < STATE.numResources; j++) work[j] += STATE.allocation[i][j];
                    finish[i] = true;
                    safeSeq.push(`P${i}`);
                    found = true;
                    count++;

                    steps.push({
                        badge: `FINISH P${i}`,
                        text: `P${i} executes & releases allocation [${STATE.allocation[i].join(', ')}]. New Work = [${work.join(', ')}]. Safe seq: <${safeSeq.join(', ')}>.`,
                        work: [...work],
                        finish: [...finish],
                        highlightProcess: i,
                        safeSeq: [...safeSeq]
                    });
                } else {
                    steps.push({
                        badge: `WAIT P${i}`,
                        text: `Testing P${i}: Need [${pNeed.join(', ')}] > Work [${work.join(', ')}]. Insufficient resources; P${i} must wait.`,
                        work: [...work],
                        finish: [...finish],
                        highlightProcess: i,
                        safeSeq: [...safeSeq]
                    });
                }
            }
        }
        if(!found) break;
    }

    if(count === activeProcesses && activeProcesses > 0) {
        steps.push({
            badge: "SAFE",
            text: `System is in a SAFE STATE! Safe execution sequence found: <${safeSeq.join(' → ')}>. No deadlock possible.`,
            work: [...work],
            finish: [...finish],
            highlightProcess: null,
            safeSeq: [...safeSeq],
            isSafe: true
        });
    } else {
        const stuck = [];
        for(let i = 0; i < STATE.numProcesses; i++) if(!finish[i]) stuck.push(`P${i}`);
        steps.push({
            badge: "UNSAFE",
            text: `System is in an UNSAFE STATE! No process can satisfy remaining need with Work [${work.join(', ')}]. Blocked: {${stuck.join(', ')}}.`,
            work: [...work],
            finish: [...finish],
            highlightProcess: null,
            safeSeq: [...safeSeq],
            isSafe: false
        });
    }

    return steps;
}

function generateDeadlockSteps() {
    const steps = [];
    let isSingleInstance = true;
    for(let j = 0; j < STATE.numResources; j++) {
        let total = STATE.available[j] + STATE.allocation.reduce((sum, row) => sum + row[j], 0);
        if(total > 1) {
            isSingleInstance = false;
            break;
        }
    }

    if (isSingleInstance) {
        steps.push({
            badge: "INIT (DFS)",
            text: `Single-instance resource model detected. A cycle in the Resource Allocation Graph is necessary and sufficient for deadlock.`,
            highlightProcess: null
        });

        let adj = {};
        for(let i=0; i<STATE.numProcesses; i++) adj[`P${i}`] = [];
        for(let j=0; j<STATE.numResources; j++) adj[`R${j}`] = [];
        for(let i=0; i<STATE.numProcesses; i++) {
            for(let j=0; j<STATE.numResources; j++) {
                if(STATE.allocation[i][j] > 0) adj[`R${j}`].push(`P${i}`);
                if(STATE.request[i][j] > 0) adj[`P${i}`].push(`R${j}`);
            }
        }

        let visited = new Set();
        let recStack = new Set();
        let cycleTemp = [];
        let foundCycle = false;

        function dfs(u, path) {
            if (foundCycle) return;
            visited.add(u);
            recStack.add(u);
            path.push(u);

            for (let v of adj[u] || []) {
                if (!visited.has(v)) {
                    dfs(v, path);
                } else if (recStack.has(v)) {
                    foundCycle = true;
                    let idx = path.indexOf(v);
                    cycleTemp = path.slice(idx);
                    cycleTemp.push(v);
                    return;
                }
            }
            path.pop();
            recStack.delete(u);
        }

        for(let i=0; i<STATE.numProcesses && !foundCycle; i++) {
            if(!visited.has(`P${i}`)) dfs(`P${i}`, []);
        }

        if (foundCycle) {
            for(let k = 0; k < cycleTemp.length - 1; k++) {
                const from = cycleTemp[k];
                const to = cycleTemp[k+1];
                const pIdx = from.startsWith('P') ? parseInt(from.substring(1)) : (to.startsWith('P') ? parseInt(to.substring(1)) : null);
                steps.push({
                    badge: `CYCLE HOP ${k+1}`,
                    text: `Cycle link discovered: ${from} ➔ ${to}. Process ${from.startsWith('P') ? from : to} is in circular dependency.`,
                    highlightProcess: pIdx
                });
            }
            steps.push({
                badge: "DEADLOCK",
                text: `DEADLOCK CONFIRMED: Circular wait detected along path <${cycleTemp.join(' ➔ ')}>. Recovery required!`,
                highlightProcess: null,
                isDeadlock: true
            });
        } else {
            steps.push({
                badge: "NO CYCLE",
                text: `DFS graph traversal completed. No circular wait detected in the RAG. All processes operational.`,
                highlightProcess: null,
                isDeadlock: false
            });
        }
    } else {
        let work = [...STATE.available];
        let finish = new Array(STATE.numProcesses).fill(false);

        for(let i=0; i<STATE.numProcesses; i++) {
            let hasAllocation = STATE.allocation[i].some(v => v > 0);
            if(!hasAllocation) finish[i] = true;
        }

        steps.push({
            badge: "INIT (REDUCTION)",
            text: `Multi-instance model detected. Initiating Silberschatz reduction algorithm. Available Work = [${work.join(', ')}].`,
            work: [...work],
            finish: [...finish],
            highlightProcess: null
        });

        let progress = true;
        while(progress) {
            progress = false;
            for(let i=0; i<STATE.numProcesses; i++) {
                if(!finish[i]) {
                    let canSatisfy = true;
                    for(let j=0; j<STATE.numResources; j++) {
                        if(STATE.request[i][j] > work[j]) {
                            canSatisfy = false;
                            break;
                        }
                    }

                    if(canSatisfy) {
                        steps.push({
                            badge: `REDUCE P${i}`,
                            text: `Process P${i} has Request [${STATE.request[i].join(', ')}] ≤ Work [${work.join(', ')}]. It can execute without deadlocking.`,
                            work: [...work],
                            finish: [...finish],
                            highlightProcess: i
                        });

                        for(let j=0; j<STATE.numResources; j++) work[j] += STATE.allocation[i][j];
                        finish[i] = true;
                        progress = true;

                        steps.push({
                            badge: `RELEASE P${i}`,
                            text: `P${i} completes and returns allocation [${STATE.allocation[i].join(', ')}]. Updated Work = [${work.join(', ')}].`,
                            work: [...work],
                            finish: [...finish],
                            highlightProcess: i
                        });
                    }
                }
            }
        }

        let deadlocked = [];
        for(let i=0; i<STATE.numProcesses; i++) {
            if(!finish[i]) deadlocked.push(i);
        }

        if(deadlocked.length > 0) {
            steps.push({
                badge: "DEADLOCK",
                text: `DEADLOCK CONFIRMED: Processes {${deadlocked.map(p => `P${p}`).join(', ')}} cannot be reduced. System is deadlocked.`,
                highlightProcess: null,
                isDeadlock: true
            });
        } else {
            steps.push({
                badge: "RESOLVED",
                text: `All processes successfully reduced. System is free of deadlock (even if harmless cycles were present).`,
                highlightProcess: null,
                isDeadlock: false
            });
        }
    }

    return steps;
}

function initStepper(mode) {
    if (STEP_STATE.timer) {
        clearInterval(STEP_STATE.timer);
        STEP_STATE.timer = null;
        const playBtn = document.getElementById('btn-step-play');
        if (playBtn) playBtn.textContent = '▶ Auto Play';
    }
    
    STEP_STATE.mode = mode || 'bankers';
    STEP_STATE.steps = (STEP_STATE.mode === 'deadlock') ? generateDeadlockSteps() : generateBankerSteps();
    STEP_STATE.idx = 0;
    STEP_STATE.active = true;
    STEP_STATE.highlightProcess = null;

    const prevBtn = document.getElementById('btn-step-prev');
    if (prevBtn) prevBtn.disabled = false;

    if (STEP_STATE.steps.length > 0) {
        applyStep(STEP_STATE.steps[0]);
    }
}

function applyStep(step) {
    if (!step) return;
    
    const badgeEl = document.getElementById('step-badge');
    const textEl = document.getElementById('step-text');
    if (badgeEl) badgeEl.textContent = step.badge;
    if (textEl) textEl.textContent = step.text;

    STEP_STATE.highlightProcess = (typeof step.highlightProcess === 'number') ? step.highlightProcess : null;

    playHapticBeep(step.badge);
    drawRAG();

    log(`[${step.badge}] ${step.text}`, step.isDeadlock ? 'error-msg' : (step.isSafe ? 'success-msg' : 'sys-msg'));
}

function stepNext() {
    if (!STEP_STATE.active || STEP_STATE.steps.length === 0 || STEP_STATE.idx >= STEP_STATE.steps.length - 1) {
        initStepper(STEP_STATE.mode || 'bankers');
        return;
    }

    STEP_STATE.idx++;
    applyStep(STEP_STATE.steps[STEP_STATE.idx]);
}

function stepPlay() {
    const playBtn = document.getElementById('btn-step-play');
    if (STEP_STATE.timer) {
        clearInterval(STEP_STATE.timer);
        STEP_STATE.timer = null;
        if (playBtn) playBtn.textContent = '▶ Auto Play';
        log("Auto Play paused.", "sys-msg");
    } else {
        if (!STEP_STATE.active || STEP_STATE.steps.length === 0 || STEP_STATE.idx >= STEP_STATE.steps.length - 1) {
            initStepper(STEP_STATE.mode || 'bankers');
        }
        if (playBtn) playBtn.textContent = '⏸ Pause';
        STEP_STATE.timer = setInterval(() => {
            if (STEP_STATE.idx < STEP_STATE.steps.length - 1) {
                stepNext();
            } else {
                clearInterval(STEP_STATE.timer);
                STEP_STATE.timer = null;
                if (playBtn) playBtn.textContent = '▶ Auto Play';
            }
        }, 1100);
        log("Auto Play started.", "sys-msg");
    }
}

function resetStepper() {
    if (STEP_STATE.timer) {
        clearInterval(STEP_STATE.timer);
        STEP_STATE.timer = null;
    }
    STEP_STATE.active = false;
    STEP_STATE.idx = 0;
    STEP_STATE.steps = [];
    STEP_STATE.highlightProcess = null;
    
    const playBtn = document.getElementById('btn-step-play');
    if (playBtn) playBtn.textContent = '▶ Auto Play';
    const prevBtn = document.getElementById('btn-step-prev');
    if (prevBtn) prevBtn.disabled = true;
    const badgeEl = document.getElementById('step-badge');
    const textEl = document.getElementById('step-text');
    if (badgeEl) badgeEl.textContent = 'READY';
    if (textEl) textEl.textContent = "Click Banker's, Detect, or Step Next to analyze.";
    
    drawRAG();
    updateTelemetry();
    renderProcessTable();
}

function generateRandomScenario() {
    const numP = Math.floor(Math.random() * 3) + 3; // 3 to 5 processes
    const numR = Math.floor(Math.random() * 2) + 3; // 3 to 4 resources
    
    STATE.numProcesses = numP;
    STATE.numResources = numR;
    
    const makeDeadlock = Math.random() < 0.5;
    
    STATE.allocation = [];
    STATE.max = [];
    STATE.request = [];
    STATE.available = [];
    
    for(let i = 0; i < numP; i++) {
        const allocRow = [];
        const maxRow = [];
        const reqRow = [];
        for(let j = 0; j < numR; j++) {
            const alloc = Math.floor(Math.random() * 3);
            const extra = Math.floor(Math.random() * 3);
            allocRow.push(alloc);
            maxRow.push(alloc + extra);
            reqRow.push(0);
        }
        STATE.allocation.push(allocRow);
        STATE.max.push(maxRow);
        STATE.request.push(reqRow);
    }
    
    for(let j = 0; j < numR; j++) {
        STATE.available.push(makeDeadlock ? 0 : Math.floor(Math.random() * 3) + 1);
    }

    if (makeDeadlock) {
        STATE.allocation[0][0] = 1;
        STATE.request[0][1] = 1;
        STATE.allocation[1][1] = 1;
        STATE.request[1][0] = 1;
        STATE.available[0] = 0;
        STATE.available[1] = 0;
    }
    
    positionsInitialized = false;
    resetStepper();
    updateSystem();
    
    log(`🎲 Generated random workbench: ${numP} processes, ${numR} resources. ${makeDeadlock ? 'Potential deadlock configured.' : 'Balanced state generated.'}`, "sys-msg");
}

// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    themeIcon.innerText = isLight ? '☀️' : '🌙';
    localStorage.setItem('deadlock-theme', isLight ? 'light' : 'dark');
}

// Load saved theme
if (localStorage.getItem('deadlock-theme') === 'light') {
    document.body.classList.add('light-mode');
    themeIcon.innerText = '☀️';
}

themeToggle.addEventListener('click', toggleTheme);

// Welcome Modal Logic
const welcomeModal = document.getElementById('welcome-modal');
const btnStart = document.getElementById('btn-start');

btnStart.addEventListener('click', () => {
    welcomeModal.style.display = 'none';
    log("Welcome! User has accepted terms and entered the simulator.", "success-msg");
});

// About Modal Logic
const aboutModal = document.getElementById('about-modal');
const btnAbout = document.getElementById('btn-about');
const btnCloseAbout = document.getElementById('btn-close-about');

const projectModal = document.getElementById('project-modal');
const btnProject = document.getElementById('btn-project');
const btnCloseProject = document.getElementById('btn-close-project');
const langSelect = document.getElementById('lang-select');
const algoSelect = document.getElementById('algo-select');
const codeDisplay = document.getElementById('code-display');
const presetSelect = document.getElementById('preset-select');

btnAbout.addEventListener('click', () => { aboutModal.style.display = 'flex'; });
btnCloseAbout.addEventListener('click', () => { aboutModal.style.display = 'none'; });

btnProject.addEventListener('click', () => { 
    projectModal.style.display = 'flex'; 
    updateCodeViewer(); // Initial load
});
btnCloseProject.addEventListener('click', () => { projectModal.style.display = 'none'; });

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
    if (e.target === projectModal) projectModal.style.display = 'none';
});

const CODE_SNIPPETS = {
    bankers: {
        c: `// Banker's Safety in C
bool isSafe(int avail[], int max[][R], int alloc[][R]) {
    int need[P][R]; calculateNeed(need, max, alloc);
    bool finish[P] = {0}; int work[R];
    for (int i=0; i<R; i++) work[i] = avail[i];
    int count = 0;
    while (count < P) {
        bool found = false;
        for (int p=0; p<P; p++) {
            if (!finish[p]) {
                int j;
                for (j=0; j<R; j++) if (need[p][j] > work[j]) break;
                if (j == R) {
                    for (int k=0; k<R; k++) work[k] += alloc[p][k];
                    finish[p] = true; found = true; count++;
                }
            }
        }
        if (!found) return false;
    }
    return true;
}`,
        cpp: `// Banker's Safety in C++
bool isSafe(vector<int> avail, vector<vector<int>> max, vector<vector<int>> alloc) {
    int P = alloc.size(), R = avail.size();
    vector<vector<int>> need(P, vector<int>(R));
    for(int i=0; i<P; i++) for(int j=0; j<R; j++) need[i][j] = max[i][j] - alloc[i][j];
    vector<bool> finish(P, false); vector<int> work = avail;
    int count = 0;
    while(count < P) {
        bool found = false;
        for(int p=0; p<P; p++) {
            if(!finish[p]) {
                bool canFinish = true;
                for(int j=0; j<R; j++) if(need[p][j] > work[j]) { canFinish = false; break; }
                if(canFinish) {
                    for(int k=0; k<R; k++) work[k] += alloc[p][k];
                    finish[p] = true; found = true; count++;
                }
            }
        }
        if(!found) return false;
    }
    return true;
}`,
        java: `// Banker's Safety in Java
public boolean isSafe(int[] avail, int[][] max, int[][] alloc) {
    int P = alloc.length, R = avail.length;
    int[][] need = new int[P][R];
    for(int i=0; i<P; i++) for(int j=0; j<R; j++) need[i][j] = max[i][j] - alloc[i][j];
    boolean[] finish = new boolean[P]; int[] work = avail.clone();
    int count = 0;
    while(count < P) {
        boolean found = false;
        for(int p=0; p<P; p++) {
            if(!finish[p]) {
                int j;
                for(j=0; j<R; j++) if(need[p][j] > work[j]) break;
                if(j == R) {
                    for(int k=0; k<R; k++) work[k] += alloc[p][k];
                    finish[p] = true; found = true; count++;
                }
            }
        }
        if(!found) return false;
    }
    return true;
}`,
        python: `# Banker's Safety in Python
def is_safe(avail, max_m, alloc):
    P, R = len(alloc), len(avail)
    need = [[max_m[i][j] - alloc[i][j] for j in range(R)] for i in range(P)]
    finish, work = [False] * P, avail[:]
    count = 0
    while count < P:
        found = False
        for p in range(P):
            if not finish[p] and all(need[p][j] <= work[j] for j in range(R)):
                for k in range(R): work[k] += alloc[p][k]
                finish[p], found, count = True, True, count + 1
        if not found: return False
    return True`,
        js: `// Banker's Safety in JavaScript
function isSafe(avail, max, alloc) {
    const P = alloc.length, R = avail.length;
    const need = alloc.map((row, i) => row.map((val, j) => max[i][j] - val));
    let finish = new Array(P).fill(false), work = [...avail], count = 0;
    while (count < P) {
        let found = false;
        for (let p = 0; p < P; p++) {
            if (!finish[p] && need[p].every((val, j) => val <= work[j])) {
                work = work.map((w, j) => w + alloc[p][j]);
                finish[p] = true; found = true; count++;
            }
        }
        if (!found) return false;
    }
    return true;
}`,
        csharp: `// Banker's Safety in C#
public bool IsSafe(int[] avail, int[,] max, int[,] alloc) {
    int P = alloc.GetLength(0), R = avail.Length;
    int[,] need = new int[P, R];
    for(int i=0; i<P; i++) for(int j=0; j<R; j++) need[i,j] = max[i,j] - alloc[i,j];
    bool[] finish = new bool[P]; int[] work = (int[])avail.Clone();
    int count = 0;
    while(count < P) {
        bool found = false;
        for(int p=0; p<P; p++) {
            if(!finish[p]) {
                int j;
                for(j=0; j<R; j++) if(need[p,j] > work[j]) break;
                if(j == R) {
                    for(int k=0; k<R; k++) work[k] += alloc[p,k];
                    finish[p] = true; found = true; count++;
                }
            }
        }
        if(!found) return false;
    }
    return true;
}`,
        ruby: `# Banker's Safety in Ruby
def is_safe(avail, max_m, alloc)
  p_size, r_size = alloc.length, avail.length
  need = Array.new(p_size) { |i| Array.new(r_size) { |j| max_m[i][j] - alloc[i][j] } }
  finish, work, count = Array.new(p_size, false), avail.dup, 0
  while count < p_size
    found = false
    p_size.times do |p|
      if !finish[p] && (0...r_size).all? { |j| need[p][j] <= work[j] }
        (0...r_size).each { |k| work[k] += alloc[p][k] }
        finish[p], found, count = true, true, count + 1
      end
    end
    return false unless found
  end
  true
end`,
        go: `// Banker's Safety in Go
func isSafe(avail []int, max [][]int, alloc [][]int) bool {
    P, R := len(alloc), len(avail)
    need := make([][]int, P); finish := make([]bool, P); work := append([]int(nil), avail...)
    for i := range need {
        need[i] = make([]int, R)
        for j := range need[i] { need[i][j] = max[i][j] - alloc[i][j] }
    }
    count := 0
    for count < P {
        found := false
        for p := 0; p < P; p++ {
            if !finish[p] {
                canFinish := true
                for j := 0; j < R; j++ { if need[p][j] > work[j] { canFinish = false; break } }
                if canFinish {
                    for k := 0; k < R; k++ { work[k] += alloc[p][k] }
                    finish[p] = true; found = true; count++
                }
            }
        }
        if !found { return false }
    }
    return true
}`,
        rust: `// Banker's Safety in Rust
fn is_safe(avail: &Vec<i32>, max: &Vec<Vec<i32>>, alloc: &Vec<Vec<i32>>) -> bool {
    let (p_len, r_len) = (alloc.len(), avail.len());
    let mut need = vec![vec![0; r_len]; p_len];
    for i in 0..p_len { for j in 0..r_len { need[i][j] = max[i][j] - alloc[i][j]; } }
    let (mut finish, mut work, mut count) = (vec![false; p_len], avail.clone(), 0);
    while count < p_len {
        let mut found = false;
        for p in 0..p_len {
            if !finish[p] && (0..r_len).all(|j| need[p][j] <= work[j]) {
                for k in 0..r_len { work[k] += alloc[p][k]; }
                finish[p] = true; found = true; count += 1;
            }
        }
        if !found { return false; }
    }
    true
}`,
        php: `// Banker's Safety in PHP
function isSafe($avail, $max, $alloc) {
    $P = count($alloc); $R = count($avail); $need = [];
    for($i=0; $i<$P; $i++) for($j=0; $j<$R; $j++) $need[$i][$j] = $max[$i][$j] - $alloc[$i][$j];
    $finish = array_fill(0, $P, false); $work = $avail; $count = 0;
    while($count < $P) {
        $found = false;
        for($p=0; $p<$P; $p++) {
            if(!$finish[$p]) {
                $canGrant = true;
                for($j=0; $j<$R; $j++) if($need[$p][$j] > $work[$j]) { $canGrant = false; break; }
                if($canGrant) {
                    for($k=0; $k<$R; $k++) $work[$k] += $alloc[$p][$k];
                    $finish[$p] = true; $found = true; $count++;
                }
            }
        }
        if(!$found) return false;
    }
    return true;
}`
    },
    request: {
        c: `// Resource Request Algorithm in C
void requestResource(int p, int request[], int avail[], int need[][R], int alloc[][R]) {
    for (int j=0; j<R; j++) {
        if (request[j] > need[p][j] || request[j] > avail[j]) return error;
    }
    for (int j=0; j<R; j++) {
        avail[j] -= request[j];
        alloc[p][j] += request[j];
        need[p][j] -= request[j];
    }
    if (!isSafe(avail, need, alloc)) {
        // Rollback...
    }
}`,
        python: `# Resource Request Algorithm in Python
def request_resource(p, request, avail, need, alloc):
    if any(request[j] > need[p][j] or request[j] > avail[j] for j in range(R)):
        return False # Error
    for j in range(R):
        avail[j] -= request[j]
        alloc[p][j] += request[j]
        need[p][j] -= request[j]
    if not is_safe(avail, need, alloc):
        # Rollback...
        return False
    return True`,
        js: `// Resource Request in JS
function requestResources(p, request, state) {
    if (request.some((r, j) => r > state.need[p][j] || r > state.available[j])) return false;
    request.forEach((r, j) => {
        state.available[j] -= r;
        state.allocation[p][j] += r;
        state.need[p][j] -= r;
    });
    return isSafe(state);
}`,
        cpp: `// Resource Request in C++
bool requestResource(int p, vector<int> req, vector<int>& avail, vector<vector<int>>& need, vector<vector<int>>& alloc) {
    for(int j=0; j<avail.size(); j++) if(req[j] > need[p][j] || req[j] > avail[j]) return false;
    for(int j=0; j<avail.size(); j++) {
        avail[j] -= req[j]; alloc[p][j] += req[j]; need[p][j] -= req[j];
    }
    return isSafe(avail, need, alloc);
}`,
        java: `// Resource Request in Java
public boolean requestResource(int p, int[] req, int[] avail, int[][] need, int[][] alloc) {
    for(int j=0; j<avail.length; j++) if(req[j] > need[p][j] || req[j] > avail[j]) return false;
    for(int j=0; j<avail.length; j++) {
        avail[j] -= req[j]; alloc[p][j] += req[j]; need[p][j] -= req[j];
    }
    return isSafe(avail, need, alloc);
}`,
        csharp: `// Resource Request in C#
public bool RequestResource(int p, int[] req, int[] avail, int[,] need, int[,] alloc) {
    for(int j=0; j<avail.Length; j++) if(req[j] > need[p,j] || req[j] > avail[j]) return false;
    for(int j=0; j<avail.Length; j++) {
        avail[j] -= req[j]; alloc[p,j] += req[j]; need[p,j] -= req[j];
    }
    return IsSafe(avail, need, alloc);
}`,
        ruby: `# Resource Request in Ruby
def request_resource(p, req, avail, need, alloc)
  return false if (0...req.length).any? { |j| req[j] > need[p][j] || req[j] > avail[j] }
  (0...req.length).each do |j|
    avail[j] -= req[j]; alloc[p][j] += req[j]; need[p][j] -= req[j]
  end
  is_safe(avail, need, alloc)
end`,
        go: `// Resource Request in Go
func requestResource(p int, req []int, avail []int, need [][]int, alloc [][]int) bool {
    for j := range avail { if req[j] > need[p][j] || req[j] > avail[j] { return false } }
    for j := range avail {
        avail[j] -= req[j]; alloc[p][j] += req[j]; need[p][j] -= req[j]
    }
    return isSafe(avail, need, alloc)
}`,
        rust: `// Resource Request in Rust
fn request_resource(p: usize, req: &Vec<i32>, avail: &mut Vec<i32>, need: &mut Vec<Vec<i32>>, alloc: &mut Vec<Vec<i32>>) -> bool {
    for j in 0..avail.len() { if req[j] > need[p][j] || req[j] > avail[j] { return false; } }
    for j in 0..avail.len() {
        avail[j] -= req[j]; alloc[p][j] += req[j]; need[p][j] -= req[j];
    }
    is_safe(avail, need, alloc)
}`,
        php: `// Resource Request in PHP
function requestResource($p, $req, &$avail, &$need, &$alloc) {
    for($j=0; $j<count($avail); $j++) if($req[$j] > $need[$p][$j] || $req[$j] > $avail[$j]) return false;
    for($j=0; $j<count($avail); $j++) {
        $avail[$j] -= $req[$j]; $alloc[$p][$j] += $req[$j]; $need[$p][$j] -= $req[$j];
    }
    return isSafe($avail, $need, $alloc);
}`
    },
    detect: {
        c: `// Cycle Detection (DFS) in C
bool isCyclic(int u, int visited[], int recStack[]) {
    visited[u] = 1; recStack[u] = 1;
    for(int v=0; v<nodes; v++) {
        if(adj[u][v]) {
            if(!visited[v] && isCyclic(v, visited, recStack)) return true;
            else if(recStack[v]) return true;
        }
    }
    recStack[u] = 0; return false;
}`,
        python: `# Cycle Detection (DFS) in Python
def has_cycle(u, visited, rec_stack):
    visited[u] = rec_stack[u] = True
    for v in adj[u]:
        if not visited[v]:
            if has_cycle(v, visited, rec_stack): return True
        elif rec_stack[v]: return True
    rec_stack[u] = False
    return False`,
        js: `// Cycle Detection in JS
function hasCycle(u, visited, recStack) {
    visited.add(u); recStack.add(u);
    for (let v of adj[u]) {
        if (!visited.has(v)) {
            if (hasCycle(v, visited, recStack)) return true;
        } else if (recStack.has(v)) return true;
    }
    recStack.delete(u); return false;
}`,
        cpp: `// Cycle Detection in C++
bool hasCycle(int u, vector<bool>& visited, vector<bool>& recStack) {
    visited[u] = recStack[u] = true;
    for(int v : adj[u]) {
        if(!visited[v] && hasCycle(v, visited, recStack)) return true;
        else if(recStack[v]) return true;
    }
    recStack[u] = false; return false;
}`,
        java: `// Cycle Detection in Java
boolean hasCycle(int u, boolean[] visited, boolean[] recStack) {
    visited[u] = recStack[u] = true;
    for(int v : adj.get(u)) {
        if(!visited[v] && hasCycle(v, visited, recStack)) return true;
        else if(recStack[v]) return true;
    }
    recStack[u] = false; return false;
}`,
        csharp: `// Cycle Detection in C#
bool HasCycle(int u, bool[] visited, bool[] recStack) {
    visited[u] = recStack[u] = true;
    foreach(int v in adj[u]) {
        if(!visited[v] && HasCycle(v, visited, recStack)) return true;
        else if(recStack[v]) return true;
    }
    recStack[u] = false; return false;
}`,
        ruby: `# Cycle Detection in Ruby
def has_cycle(u, visited, rec_stack)
  visited[u] = rec_stack[u] = true
  adj[u].each do |v|
    return true if !visited[v] && has_cycle(v, visited, rec_stack)
    return true if rec_stack[v]
  end
  rec_stack[u] = false; false
end`,
        go: `// Cycle Detection in Go
func hasCycle(u int, visited []bool, recStack []bool) bool {
    visited[u] = true; recStack[u] = true
    for _, v := range adj[u] {
        if !visited[v] && hasCycle(v, visited, recStack) { return true }
        if recStack[v] { return true }
    }
    recStack[u] = false; return false
}`,
        rust: `// Cycle Detection in Rust
fn has_cycle(u: usize, visited: &mut Vec<bool>, rec_stack: &mut Vec<bool>, adj: &Vec<Vec<usize>>) -> bool {
    visited[u] = true; rec_stack[u] = true;
    for &v in &adj[u] {
        if !visited[v] && has_cycle(v, visited, rec_stack, adj) { return true; }
        else if rec_stack[v] { return true; }
    }
    rec_stack[u] = false; false
}`,
        php: `// Cycle Detection in PHP
function hasCycle($u, &$visited, &$recStack, $adj) {
    $visited[$u] = true; $recStack[$u] = true;
    foreach($adj[$u] as $v) {
        if(!$visited[$v] && hasCycle($v, $visited, $recStack, $adj)) return true;
        else if($recStack[$v]) return true;
    }
    $recStack[$u] = false; return false;
}`
    },
    recovery: {
        c: `// Recovery Strategies in C
void recover(int strategy) {
    if(strategy == ABORT) {
        int victim = findLeastPriority();
        releaseResources(victim);
    } else if(strategy == PREEMPT) {
        int victim = findMostHolding();
        rollback(victim);
    }
}`,
        python: `# Recovery Strategies in Python
def recover(strategy):
    if strategy == 'ABORT':
        victim = min_priority_process()
        terminate(victim)
    elif strategy == 'PREEMPT':
        victim = max_resource_holder()
        rollback(victim)`,
        js: `// Recovery Strategies in JS
function recover(strategy) {
    const victim = strategy === 'abort' ? getLeastPriority() : getMostHolding();
    if (strategy === 'abort') terminate(victim);
    else rollback(victim);
}`,
        cpp: `// Recovery Strategies in C++
void recover(string strategy) {
    int victim = (strategy == "abort") ? getLeastPriority() : getMostHolding();
    if(strategy == "abort") terminate(victim);
    else rollback(victim);
}`,
        java: `// Recovery Strategies in Java
void recover(String strategy) {
    int victim = strategy.equals("abort") ? getLeastPriority() : getMostHolding();
    if(strategy.equals("abort")) terminate(victim);
    else rollback(victim);
}`,
        csharp: `// Recovery Strategies in C#
void Recover(string strategy) {
    int victim = (strategy == "abort") ? GetLeastPriority() : GetMostHolding();
    if(strategy == "abort") Terminate(victim);
    else Rollback(victim);
}`,
        ruby: `# Recovery Strategies in Ruby
def recover(strategy)
  victim = strategy == 'abort' ? get_least_priority : get_most_holding
  strategy == 'abort' ? terminate(victim) : rollback(victim)
end`,
        go: `// Recovery Strategies in Go
func recover(strategy string) {
    victim := 0
    if strategy == "abort" { victim = getLeastPriority() } else { victim = getMostHolding() }
    if strategy == "abort" { terminate(victim) } else { rollback(victim) }
}`,
        rust: `// Recovery Strategies in Rust
fn recover(strategy: &str) {
    let victim = if strategy == "abort" { get_least_priority() } else { get_most_holding() };
    if strategy == "abort" { terminate(victim); } else { rollback(victim); }
}`,
        php: `// Recovery Strategies in PHP
function recover($strategy) {
    $victim = ($strategy == 'abort') ? getLeastPriority() : getMostHolding();
    if($strategy == 'abort') terminate($victim);
    else rollback($victim);
}`
    }
};

function updateCodeViewer() {
    const algo = algoSelect.value;
    const lang = langSelect.value;
    if (CODE_SNIPPETS[algo] && CODE_SNIPPETS[algo][lang]) {
        codeDisplay.innerText = CODE_SNIPPETS[algo][lang];
    } else {
        codeDisplay.innerText = "// Code snippet not available for this selection.";
    }
}

langSelect.addEventListener('change', updateCodeViewer);
algoSelect.addEventListener('change', updateCodeViewer);

// Scenario Presets Logic
const SCENARIOS = {
    safe: {
        allocation: [[0,1,0], [2,0,0], [3,0,2], [2,1,1], [0,0,2]],
        max: [[7,5,3], [3,2,2], [9,0,2], [2,2,2], [4,3,3]],
        request: [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0]],
        available: [3,3,2]
    },
    deadlock: {
        allocation: [[1,0,0], [0,1,0], [0,0,0], [0,0,0], [0,0,0]],
        max: [[1,1,0], [1,1,0], [0,0,0], [0,0,0], [0,0,0]],
        request: [[0,1,0], [1,0,0], [0,0,0], [0,0,0], [0,0,0]],
        available: [0,0,10]
    },
    harmless_cycle: {
        allocation: [[1,0], [0,1], [1,0]],
        max: [[1,1], [1,1], [1,0]],
        request: [[0,1], [1,0], [0,0]],
        available: [0,0]
    },
    unsafe: {
        allocation: [[1,0,0], [0,1,0], [3,0,2], [2,1,1], [0,0,2]],
        max: [[5,5,5], [3,3,3], [9,0,2], [2,2,2], [4,3,3]],
        request: [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0]],
        available: [0,0,1]
    },
    dining: {
        allocation: [
            [1,0,0,0],
            [0,1,0,0],
            [0,0,1,0],
            [0,0,0,1]
        ],
        max: [
            [1,1,0,0],
            [0,1,1,0],
            [0,0,1,1],
            [1,0,0,1]
        ],
        request: [
            [0,1,0,0],
            [0,0,1,0],
            [0,0,0,1],
            [1,0,0,0]
        ],
        available: [0,0,0,0]
    }
};

function loadScenario(type) {
    const data = SCENARIOS[type];
    if(!data) return;

    STATE.allocation = JSON.parse(JSON.stringify(data.allocation));
    STATE.max = JSON.parse(JSON.stringify(data.max));
    STATE.available = JSON.parse(JSON.stringify(data.available));
    STATE.numProcesses = data.allocation.length;
    STATE.numResources = data.allocation[0].length;
    if(data.request) {
        STATE.request = JSON.parse(JSON.stringify(data.request));
    } else {
        STATE.request = Array.from({ length: STATE.numProcesses }, () => Array(STATE.numResources).fill(0));
    }
    
    positionsInitialized = false;
    resetStepper();
    log(`Scenario Loaded: ${type.toUpperCase()}`, "success-msg");
    
    // Hide panels on new load
    document.getElementById('safe-sequence-display').style.display = 'none';
    document.getElementById('deadlock-cycle-display').style.display = 'none';
    document.getElementById('unsafe-explanation-display').style.display = 'none';

    updateSystem();
    
    // Auto-run analysis if tutorial is on
    if(tutorialToggle.checked) {
        if(type === 'deadlock' || type === 'harmless_cycle' || type === 'dining') detectDeadlock();
        else runBankersAlgorithm();
    }
}

presetSelect.addEventListener('change', (e) => {
    loadScenario(e.target.value);
    e.target.value = ""; // Reset dropdown
});

// Interactive Lab Guidance Toast Logic
const win7Toast = document.getElementById('win7-toast');
const win7Title = document.getElementById('win7-title');
const win7Message = document.getElementById('win7-message');
const tutorialToggle = document.getElementById('tutorial-toggle');
let toastTimeout = null;

function showTutorial(title, message) {
    if (!tutorialToggle.checked) return;
    
    // Reset existing toast
    clearTimeout(toastTimeout);
    win7Toast.style.display = 'none';
    win7Toast.classList.remove('active', 'fade-out');
    void win7Toast.offsetWidth; // Trigger reflow

    win7Title.textContent = title;
    win7Message.textContent = message;
    win7Toast.style.display = 'block';
    win7Toast.classList.add('active');

    toastTimeout = setTimeout(() => {
        win7Toast.classList.add('fade-out');
        setTimeout(() => {
            win7Toast.style.display = 'none';
            win7Toast.classList.remove('active', 'fade-out');
        }, 500); // Wait for exit animation
    }, 5000); // 5 seconds duration
}

const TUTORIALS = {
    bankers: {
        title: "Banker's Algorithm Guide",
        msg: "The system is checking if every process can finish. It simulates granting all requests and looks for a 'Safe Sequence'. If one is found, your system is secure!"
    },
    detect: {
        title: "Deadlock Detection Guide",
        msg: "The system is using DFS (Depth First Search) to find cycles in the Resource Allocation Graph. A cycle means processes are stuck waiting for each other indefinitely!"
    },
    terminate: {
        title: "Process Termination Guide",
        msg: "Recovery initiated! Every process involved in the deadlock cycle has been aborted. This releases all held resources and immediately restores system safety."
    },
    preempt: {
        title: "Resource Preemption Guide",
        msg: "Recovery initiated! The process holding the most resources has been 'Rolled Back'. Its resources are returned to the pool so others can break the deadlock."
    },
    victim: {
        title: "Victim Termination Guide",
        msg: "Recovery initiated! The process with the least priority (highest ID) involved in the deadlock has been terminated. This selectively breaks the cycle."
    },
    request: {
        title: "Resource Request Guide",
        msg: "A process is asking for more resources. The system will only grant this if the resulting state remains 'Safe' according to the Banker's Algorithm."
    },
    reset: {
        title: "System Reset Guide",
        msg: "Everything has been cleared! All matrices and the graph are reset to their default state. Time for a fresh start!"
    }
};

// Event Listeners
document.getElementById('btn-bankers').addEventListener('click', () => {
    runBankersAlgorithm();
    showTutorial(TUTORIALS.bankers.title, TUTORIALS.bankers.msg);
});
document.getElementById('btn-detect').addEventListener('click', () => {
    detectDeadlock();
    showTutorial(TUTORIALS.detect.title, TUTORIALS.detect.msg);
});
btnRecoverAbort.addEventListener('click', () => {
    runRecovery('terminate');
    showTutorial(TUTORIALS.terminate.title, TUTORIALS.terminate.msg);
});
btnRecoverPreempt.addEventListener('click', () => {
    runRecovery('preempt');
    showTutorial(TUTORIALS.preempt.title, TUTORIALS.preempt.msg);
});
btnRecoverVictim.addEventListener('click', () => {
    runRecovery('victim');
    showTutorial(TUTORIALS.victim.title, TUTORIALS.victim.msg);
});
document.getElementById('btn-submit-req').addEventListener('click', () => {
    submitResourceRequest();
    showTutorial(TUTORIALS.request.title, TUTORIALS.request.msg);
});
document.getElementById('btn-export').addEventListener('click', () => {
    // Populate Print Metadata
    const printDate = document.getElementById('print-date');
    const printEnv = document.getElementById('print-env');
    
    if(printDate) printDate.innerText = new Date().toLocaleString();
    if(printEnv) {
        const ua = navigator.userAgent;
        let os = "Windows NT 10.0";
        if(ua.indexOf("Mac") != -1) os = "macOS Kernel";
        if(ua.indexOf("Linux") != -1) os = "Linux x86_64";
        printEnv.innerText = `${os} | Browser: ${navigator.vendor || 'Generic'}`;
    }
    
    window.print();
});
document.getElementById('btn-reset').addEventListener('click', () => {
    resetSystem();
    showTutorial(TUTORIALS.reset.title, TUTORIALS.reset.msg);
});
document.getElementById('btn-checkpoint').addEventListener('click', saveCheckpoint);
document.getElementById('btn-rollback').addEventListener('click', rollbackSystem);

// Stepper Engine Event Listeners
const btnStepPrev = document.getElementById('btn-step-prev');
const btnStepNext = document.getElementById('btn-step-next');
const btnStepPlay = document.getElementById('btn-step-play');
const btnRandomChaos = document.getElementById('btn-random-chaos');

if (btnStepPrev) btnStepPrev.addEventListener('click', resetStepper);
if (btnStepNext) btnStepNext.addEventListener('click', stepNext);
if (btnStepPlay) btnStepPlay.addEventListener('click', stepPlay);
if (btnRandomChaos) btnRandomChaos.addEventListener('click', generateRandomScenario);

window.addEventListener('resize', () => { 
    if(positionsInitialized) {
        drawRAG();
    } else {
        initNodePositions();
        drawRAG();
    }
});

// Diagnostics and Clock logic for Welcome Modal
function initWelcomeDiagnostics() {
    const osSpan = document.getElementById('diag-os');
    const browserSpan = document.getElementById('diag-browser');
    const clockSpan = document.getElementById('live-clock');

    const ua = navigator.userAgent;
    let os = "Desktop Client";
    if (ua.indexOf("Win") != -1) os = "Windows NT";
    else if (ua.indexOf("Mac") != -1) os = "macOS";
    else if (ua.indexOf("Linux") != -1) os = "Linux";
    else if (ua.indexOf("Android") != -1) os = "Android";
    else if (ua.indexOf("iPhone") != -1 || ua.indexOf("iPad") != -1) os = "iOS";

    let browser = "Web Client";
    if (ua.indexOf("Chrome") != -1 && ua.indexOf("Edg") == -1) browser = "Chrome";
    else if (ua.indexOf("Firefox") != -1) browser = "Firefox";
    else if (ua.indexOf("Safari") != -1 && ua.indexOf("Chrome") == -1) browser = "Safari";
    else if (ua.indexOf("Edg") != -1) browser = "Edge";

    if(osSpan) osSpan.innerText = os;
    if(browserSpan) browserSpan.innerText = browser;

    setInterval(() => {
        const now = new Date();
        if(clockSpan) clockSpan.innerText = now.toTimeString().split(' ')[0];
    }, 1000);
}

// Keyboard Shortcuts & Modal Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = ['welcome-modal', 'theory-modal', 'project-modal', 'about-modal'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none') el.style.display = 'none';
        });
        return;
    }

    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

    const modals = ['welcome-modal', 'theory-modal', 'project-modal', 'about-modal'];
    const anyModalOpen = modals.some(id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none' && window.getComputedStyle(el).display !== 'none';
    });
    if (anyModalOpen) return;

    const key = e.key.toLowerCase();
    if (key === 'd') loadScenario('deadlock');
    if (key === 's') loadScenario('safe');
    if (key === 'u') loadScenario('unsafe');
    if (key === 'r') resetSystem();
    if (e.code === 'Space') {
        e.preventDefault();
        stepPlay();
    }
    if (key === 'n' || key === 'arrowright') {
        e.preventDefault();
        stepNext();
    }
});

// Modal Helpers
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Stable simulator status
const footerLoad = document.getElementById('footer-load');
if (footerLoad) {
    footerLoad.innerText = `SIM ENGINE: ACTIVE | v2.1`;
}

// Export Current Configuration to JSON
function exportConfig() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "deadlock_config.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    log("System configuration exported as JSON.", "sys-msg");
}

// Trigger Import File Dialog
function importConfig() {
    document.getElementById('import-input').click();
}

// Handle Import File Selection with Comprehensive Schema Validation
document.getElementById('import-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedState.allocation) || !Array.isArray(importedState.max) || !Array.isArray(importedState.available)) {
                throw new Error("Invalid Configuration File: Must contain allocation, max, and available arrays.");
            }
            if (importedState.allocation.length === 0 || !Array.isArray(importedState.allocation[0])) {
                throw new Error("Invalid Configuration File: Allocation matrix cannot be empty.");
            }

            STATE = importedState;
            STATE.numProcesses = STATE.allocation.length;
            STATE.numResources = STATE.allocation[0].length;

            if (!Array.isArray(STATE.request) || STATE.request.length !== STATE.numProcesses) {
                STATE.request = Array.from({ length: STATE.numProcesses }, () => Array(STATE.numResources).fill(0));
            }
            
            STATE.deadlockedProcesses = [];
            STATE.deadlockedEdges = [];
            STATE.isDeadlocked = false;
            STATE.safeSequence = [];
            
            updateSystem();
            log(`Configuration imported successfully (${STATE.numProcesses}P, ${STATE.numResources}R).`, "success-msg");
        } catch (err) {
            log("Import Error: " + (err.message || "Failed to parse JSON"), "error-msg");
        }
    };
    reader.readAsText(file);
});

// Init
updateSystem();
initWelcomeDiagnostics();
log("Simulator Engine: ONLINE | CORE_VER: 2.1.0", 'success-msg');

// Set up Clear Logs button in Terminal
const btnClearLogs = document.getElementById('btn-clear-logs');
if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
        const term = document.getElementById('terminal-output');
        if (term) {
            term.innerHTML = '<p class="sys-msg">[SYSTEM] Terminal logs reset. Workbench ready for analysis.</p>';
            if (typeof playHapticBeep === 'function') playHapticBeep('READY');
        }
    });
}

// Load initial textbook safe scenario and execute verification immediately
setTimeout(() => {
    loadScenario('safe');
    runBankersAlgorithm();
}, 250);
