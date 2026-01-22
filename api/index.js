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
    'https://pipedapi.kavin.rocks', // Primary
    'https://api.piped.yt',         // Backup 1
    'https://piped-api.lunar.icu',  // Backup 2
    'https://pipedapi.drgns.space', // Backup 3
    'https://pa.il.ax'              // Backup 4 (Israel)
];

let currentPipedIndex = 0;

// Removed getPipedInstance async wrapper as we use direct rotation now

// --- API Router ---
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Apple Music Clone API Server' });
});

// Piped Proxy
// Enhanced Piped Proxy with Rotation
router.get('/piped/*', async (req, res) => {
    const urlPath = req.params[0];
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';

    let lastError = null;

    // Try up to 3 instances
    for (let i = 0; i < 3; i++) {
        try {
            // Get current instance and rotate for next time
            const instance = PIPED_INSTANCES[currentPipedIndex];
            currentPipedIndex = (currentPipedIndex + 1) % PIPED_INSTANCES.length;

            console.log(`[Piped Proxy] Trying instance: ${instance} (Attemp ${i + 1})`);

            const targetUrl = `${instance}/${urlPath}${query ? '?' + query : ''}`;

            // Set timeout for fetch
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`Instance returned ${response.status}`);
            }

            const data = await response.json();
            return res.json(data); // Success!

        } catch (e) {
            console.error(`[Piped Proxy] Error with instance: ${e.message}`);
            lastError = e;
            // Continue to next loop iteration/instance
        }
    }

    // All attempts failed
    res.status(500).json({ error: 'All Piped instances failed', details: lastError?.message });
});

// Deezer Proxy
router.get('/deezer/*', async (req, res) => {
    try {
        const urlPath = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const targetUrl = `https://api.deezer.com/${urlPath}${query ? '?' + query : ''}`;

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
        const urlPath = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const targetUrl = `https://lrclib.net/${urlPath}${query ? '?' + query : ''}`;

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
