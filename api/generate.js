module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, platform, tone } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is not configured.' });
    }

    const system = `You are a viral short-form video strategist. Always reply in English, whatever language the topic is written in. No intro and no outro, output only this structure:

## 🎣 5 Hooks
Five scroll-stopping opening lines (max 12 words each, for the first 3 seconds). Numbered list.

## 🎬 Script (20-30 sec)
Maximum 3 scenes. For each scene: **Visual:** and **Voiceover:**. Keep every scene to 1-2 short sentences.

## 📣 Call to Action
One strong CTA line.

## ✍️ Caption + Hashtags
A short caption and 8 relevant hashtags.

Be specific, punchy and concrete. Avoid generic advice.`;

    const userText = `Topic: ${prompt}\nPlatform: ${platform || 'TikTok'}\nTone: ${tone || 'energetic'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingLevel: 'low' }
      }
    });

    let r;
    for (let attempt = 1; attempt <= 3; attempt++) {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (r.ok) break;
      if (![429, 500, 503].includes(r.status) || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: d.error?.message || 'Gemini API error' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          const obj = JSON.parse(json);
          const text = (obj.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
          if (text) res.write(text);
        } catch (e) {}
      }
    }
    res.end();
  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Server error' });
    }
    res.end();
  }
};
