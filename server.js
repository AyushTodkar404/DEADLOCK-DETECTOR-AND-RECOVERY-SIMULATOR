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

// Serve static files from the current directory
app.use(express.static(__dirname));

// Send index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
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
