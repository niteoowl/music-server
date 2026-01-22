const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 강력한 CORS 설정
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
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
    'https://piped-api.lunar.icu'
];

async function getPipedInstance() {
    return PIPED_INSTANCES[Math.floor(Math.random() * PIPED_INSTANCES.length)];
}

// --- API Router ---
const router = express.Router();

// 기본 상태 체크
router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API Server is running' });
});

// Piped Proxy
router.get('/piped/*', async (req, res) => {
    try {
        const path = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const instance = await getPipedInstance();
        const targetUrl = `${instance}/${path}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Piped Proxy Error', details: e.message });
    }
});

// Deezer Proxy
router.get('/deezer/*', async (req, res) => {
    try {
        const path = req.params[0];
        const query = req.url.includes('?') ? req.url.split('?')[1] : '';
        const targetUrl = `https://api.deezer.com/${path}${query ? '?' + query : ''}`;

        const response = await fetch(targetUrl);
        // Deezer가 가끔 HTML 에러를 뱉을 수 있으므로 JSON 확인
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            res.json(data);
        } else {
            const text = await response.text();
            throw new Error(`Invalid response from Deezer: ${text.substring(0, 100)}`);
        }
    } catch (e) {
        res.status(500).json({ error: 'Deezer Proxy Error', details: e.message });
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
        res.status(500).json({ error: 'LRCLIB Proxy Error', details: e.message });
    }
});

// 2. MOUNT ROUTER
// Vercel rewrites 환경에서 경로가 꼬이지 않도록 이중 마운트
app.use('/api', router);
app.use('/', router);

// 3. 404 HANDLER (HTML 대신 무조건 JSON 반환)
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        suggestion: 'Check if your URL starts with /api/deezer/ or /api/piped/'
    });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;
