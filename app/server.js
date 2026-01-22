const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Middleware - Explicit CORS for all
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Helper: Get working Piped instance with short timeout
async function getPipedInstance() {
    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
        const index = (currentPipedIndex + i) % PIPED_INSTANCES.length;
        const instance = PIPED_INSTANCES[index];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);

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

// Health Check
app.get('/', (req, res) => {
    res.status(200).send('Apple Music Clone API Server is Running');
});
app.get('/api', (req, res) => {
    res.status(200).send('API Endpoint Ready');
});

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

        // Forward headers
        res.set('Content-Type', response.headers.get('content-type'));

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Piped API Error' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Piped Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Piped API' });
    }
});

// 2. Deezer Proxy
app.get('/api/deezer/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://api.deezer.com/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Deezer API Error' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Deezer Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Deezer API' });
    }
});

// 3. LRCLIB Proxy
app.get('/api/lrclib/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const query = req.url.split('?')[1];
        const targetUrl = `https://lrclib.net/${endpoint}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'LRCLIB API Error' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('LRCLIB Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from LRCLIB API' });
    }
});

// Start Server (only if run directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
