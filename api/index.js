const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// 1. GLOBAL CORS MIDDLEWARE
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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

async function getPipedInstance() {
    return PIPED_INSTANCES[0];
}

// Helper to strip /api prefix if present
const stripApiPrefix = (url) => {
    // Matches /api/service/rest or /service/rest
    // Captures the part after the service name
    // Service names: piped, deezer, lrclib
    const match = url.match(/(?:\/api)?\/(?:piped|deezer|lrclib)\/(.*)/);
    return match ? match[1] : '';
};

// 2. ROUTES
// Piped
app.get('/api/piped/*', async (req, res) => {
    try {
        const pathPart = stripApiPrefix(req.url);
        const [pathOnly, queryPart] = pathPart.split('?');

        if (!pathOnly && !queryPart) return res.json({ status: 'ok', service: 'piped' });

        const instance = await getPipedInstance();
        const targetUrl = `${instance}/${pathOnly}${queryPart ? '?' + queryPart : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Deezer
app.get('/api/deezer/*', async (req, res) => {
    try {
        const pathPart = stripApiPrefix(req.url);
        const [pathOnly, queryPart] = pathPart.split('?');

        const targetUrl = `https://api.deezer.com/${pathOnly}${queryPart ? '?' + queryPart : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// LRCLIB
app.get('/api/lrclib/*', async (req, res) => {
    try {
        const pathPart = stripApiPrefix(req.url);
        const [pathOnly, queryPart] = pathPart.split('?');

        const targetUrl = `https://lrclib.net/${pathOnly}${queryPart ? '?' + queryPart : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Health & 404
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'Apple Music Clone API Ready' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.url });
});

module.exports = app;
