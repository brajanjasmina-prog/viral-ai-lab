const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());

let paddleIpsCache = [];
let lastFetchedTime = 0;

async function getPaddleAllowedIps() {
    const now = Date.now();
    if (paddleIpsCache.length === 0 || (now - lastFetchedTime > 24 * 60 * 60 * 1000)) {
        try {
            const response = await fetch('https://api.paddle.com/ips');
            const data = await response.json();
            if (data && data.data && data.data.ipv4_cidrs) {
                paddleIpsCache = data.data.ipv4_cidrs;
                lastFetchedTime = now;
            }
        } catch (error) {
            console.error('Greška pri preuzimanju Paddle IP adresa:', error);
        }
    }
    return paddleIpsCache;
}

function isIpAllowed(clientIp, allowedCidrs) {
    if (!allowedCidrs || allowedCidrs.length === 0) return true;
    const cleanIp = clientIp.replace(/^.*:/, '');
    return allowedCidrs.some(cidr => {
        const ipOnly = cidr.split('/')[0];
        return ipOnly === cleanIp;
    });
}

app.post('/api/generate-content', express.json(), async (req, res) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Server Configuration Error", message: "GEMINI_API_KEY nije podešen." });
    }

    try {
        const { prompt, platform, niche, tone } = req.body;
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        const systemInstruction = `Ti si stručnjak za viralan sadržaj za ${platform || 'TikTok'} u niši ${niche || 'general'} sa tonom ${tone || 'engaging'}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: { systemInstruction, temperature: 0.7 }
        });

        return res.json({ success: true, result: response.text });
    } catch (error) {
        console.error("Gemini API greška:", error);
        return res.status(502).json({ error: "AI generisanje nije uspelo", message: error.message });
    }
});

app.post('/api/paddle-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const allowedCidrs = await getPaddleAllowedIps();
        
        if (!isIpAllowed(clientIp, allowedCidrs)) {
            return res.status(403).send('Forbidden: Invalid IP source');
        }

        const event = JSON.parse(req.body);
        if (event.event_type === 'subscription.activated' || event.event_type === 'transaction.completed') {
            console.log(`[Live Paddle] Uspešna transakcija obrađena.`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(400).send(`Webhook greška: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));