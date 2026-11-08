const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Security & Defense Headers (OWASP) + Dev Cache Control
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

// JSON body parser for API simulations (Flutter / Agent API parity)
app.use(express.json());

// Health & System Telemetry (Antigravity Agentic Tooling)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'deadlock-simulator',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '2.0.4'
    });
});

// Algorithmic Simulation API: Banker's Safety Sequence Evaluator
app.post('/api/simulate/bankers', (req, res) => {
    try {
        const { allocation, max, available } = req.body || {};
        if (!Array.isArray(allocation) || !Array.isArray(max) || !Array.isArray(available)) {
            return res.status(400).json({ error: 'Missing or invalid allocation, max, or available matrices' });
        }
        const n = allocation.length;
        const m = available.length;
        const need = [];
        for (let i = 0; i < n; i++) {
            need[i] = [];
            for (let j = 0; j < m; j++) {
                need[i][j] = (max[i][j] || 0) - (allocation[i][j] || 0);
                if (need[i][j] < 0) {
                    return res.status(400).json({ error: `Invalid claim: process P${i} allocation exceeds max for resource R${j}` });
                }
            }
        }
        const work = [...available];
        const finish = new Array(n).fill(false);
        const safeSequence = [];
        let count = 0;

        while (count < n) {
            let found = false;
            for (let p = 0; p < n; p++) {
                if (!finish[p]) {
                    let canAllocate = true;
                    for (let j = 0; j < m; j++) {
                        if (need[p][j] > work[j]) {
                            canAllocate = false;
                            break;
                        }
                    }
                    if (canAllocate) {
                        for (let k = 0; k < m; k++) {
                            work[k] += allocation[p][k];
                        }
                        safeSequence.push(p);
                        finish[p] = true;
                        found = true;
                        count++;
                    }
                }
            }
            if (!found) break;
        }

        const isSafe = count === n;
        return res.json({
            isSafe,
            safeSequence: isSafe ? safeSequence : [],
            need,
            work,
            finish,
            message: isSafe
                ? `System is in a safe state with sequence: <${safeSequence.map(p => `P${p}`).join(', ')}>`
                : 'System is in an unsafe state (potential or actual deadlock)'
        });
    } catch (err) {
        return res.status(500).json({ error: 'Internal simulation engine error', details: err.message });
    }
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Send index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let server;
if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 Deadlock Simulator: http://localhost:${PORT}`);
        console.log(`🔄 Standard port: ${PORT} | Universal Node server online`);
        console.log(`=================================================`);
    });

    // Handle server errors (like port already in use)
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use. Please close the other terminal or process running the simulator.`);
            process.exit(1);
        } else {
            console.error(`❌ Server error:`, e);
        }
    });
}

module.exports = app;
