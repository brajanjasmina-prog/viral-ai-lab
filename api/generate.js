module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, platform, tone, length } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is not configured.' });
    }

    const secs = [15, 30, 60].includes(Number(length)) ? Number(length) : 30;
    const scenes = secs === 15 ? 2 : secs === 30 ? 3 : 5;

    const system = `You are a viral short-form video strategist. Always reply in English, whatever language the topic is written in. No intro and no outro, output only this structure:

## 🎣 5 Hooks
Five scroll-stopping opening lines (max 12 words each, for the first 3 seconds). Numbered list.

## 🎬 Script (${secs} sec)
Maximum ${scenes} scenes, timed to fit ${secs} seconds. For each scene: **Visual:** and **Voiceover:**. Keep every scene to 1-2 short sentences.

## 📣 Call to Action
One strong CTA line.

## ✍️ Caption + Hashtags
A short caption and 8 relevant hashtags.

Be specific, punchy and concrete. Avoid generic advice.`;

    const userText = `Topic: ${prompt}\nPlatform: ${platform || 'TikTok'}\nTone: ${tone || 'energetic'}\nVideo length: ${secs} seconds`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: secs === 60 ? 2000 : 1200
      }
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);

    let apiResponse, data;
    try {
      for (let attempt = 1; attempt <= 2; attempt++) {
        apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal
        });
        data = await apiResponse.json();
        if (apiResponse.ok) break;
        if (![429, 500, 503].includes(apiResponse.status) || attempt === 2) break;
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        return res.status(504).json({ error: 'The AI took too long. Please try again.' });
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!text.trim()) {
      return res.status(500).json({ error: 'No response from the AI model.' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(text);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
