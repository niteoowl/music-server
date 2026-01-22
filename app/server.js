const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Middleware - Fully open CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

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
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`${instance}/trending?region=KR`, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.ok) {
                currentPipedIndex = index;
                return instance;
            }
        } catch (e) {
            // Ignore
        }
    }
    return PIPED_INSTANCES[0];
}

// --- Routes ---
// IMPORTANT: Vercel routes all /api/... requests here
// But req.url might still contain /api/... prefix depending on Vercel's behavior
// We will clean it up manually to be safe

function cleanUrl(url) {
    if (url.startsWith('/api/')) return url.slice(4); // Remove /api
    if (url.startsWith('/')) return url;
    return '/' + url;
}

// 1. Piped Proxy
app.get('/api/piped/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const instance = await getPipedInstance();

        const targetUrl = `${instance}/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) return res.status(response.status).json({ error: 'Piped API Error' });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// 2. Deezer Proxy
app.get('/api/deezer/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://api.deezer.com/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        if (!response.ok) return res.status(response.status).json({ error: 'Deezer API Error' });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// 3. LRCLIB Proxy
app.get('/api/lrclib/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://lrclib.net/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        if (!response.ok) return res.status(response.status).json({ error: 'LRCLIB API Error' });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// Health check
app.get('/api', (req, res) => {
    res.send('Apple Music Clone API is Running');
});

// Start Server (only if run directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
