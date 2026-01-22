const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from current directory

// --- Configurations ---
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.yt',
    'https://piped-api.lunar.icu',
    'https://pipedapi.drgns.space'
];

let currentPipedIndex = 0;

// Helper: Get working Piped instance
async function getPipedInstance() {
    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
        const index = (currentPipedIndex + i) % PIPED_INSTANCES.length;
        const instance = PIPED_INSTANCES[index];
        try {
            const response = await fetch(`${instance}/trending?region=KR`, { timeout: 2000 });
            if (response.ok) {
                currentPipedIndex = index;
                // console.log(`Using Piped Instance: ${instance}`); 
                return instance;
            }
        } catch (e) {
            // console.warn(`Skipping instance ${instance}: ${e.message}`);
        }
    }
    return PIPED_INSTANCES[0]; // Fallback
}

// --- Routes ---

// 1. Piped Proxy (Music Streaming)
app.get('/api/piped/*', async (req, res) => {
    try {
        const endpoint = req.params[0]; // e.g., 'search', 'streams/ID'
        const query = req.url.split('?')[1]; // Query params
        const instance = await getPipedInstance();

        const targetUrl = `${instance}/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`API responded with ${response.status}`);

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Piped Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Piped API' });
    }
});

// 2. Deezer Proxy (Metadata)
app.get('/api/deezer/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://api.deezer.com/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Deezer Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Deezer API' });
    }
});

// 3. LRCLIB Proxy (Lyrics)
app.get('/api/lrclib/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://lrclib.net/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('LRCLIB Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from LRCLIB API' });
    }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server (only if run directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🎵 Apple Music Clone Server running at: http://localhost:${PORT}`);
        console.log(`   - Piped Proxy: /api/piped`);
        console.log(`   - Deezer Proxy: /api/deezer`);
        console.log(`   - LRCLIB Proxy: /api/lrclib`);
        console.log(`\nReady to stream! Open http://localhost:${PORT} in your browser.\n`);
    });
}

module.exports = app;
