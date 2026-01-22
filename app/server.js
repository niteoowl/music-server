const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// 1. GLOBAL CORS MIDDLEWARE (MUST be first)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow ALL origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle Preflight immediately
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// --- Configuration ---
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.yt',
    'https://piped-api.lunar.icu',
    'https://pipedapi.drgns.space'
];

let currentPipedIndex = 0;

async function getPipedInstance() {
    // Quick check logic...
    return PIPED_INSTANCES[0]; // Fallback for speed in serverless
}

// --- API Router ---
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Apple Music Clone API Server' });
});

// Piped Proxy
router.get('/piped/*', async (req, res) => {
    try {
        // Extract path after /piped/
        const path = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const instance = await getPipedInstance();

        const targetUrl = `${instance}/${path}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Deezer Proxy
router.get('/deezer/*', async (req, res) => {
    try {
        const path = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const targetUrl = `https://api.deezer.com/${path}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// LRCLIB Proxy
router.get('/lrclib/*', async (req, res) => {
    try {
        const path = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const targetUrl = `https://lrclib.net/${path}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. MOUNT ROUTER (Dual Mount Strategy)
// Vercel might strip /api or might not, so we handle both.
app.use('/api', router);
app.use('/', router);

// 3. 404 HANDLER (Must be last)
// Returns JSON instead of HTML to prevent syntax errors
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: 'Ensure request starts with /api/deezer, /api/piped etc.'
    });
});

// Start if local
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;
