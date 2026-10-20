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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingLevel: 'low' }
      }
    });

    let apiResponse, data;
    for (let attempt = 1; attempt <= 4; attempt++) {
      apiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      data = await apiResponse.json();
      if (apiResponse.ok) break;
      if (![429, 500, 503].includes(apiResponse.status) || attempt === 4) break;
      await new Promise(r => setTimeout(r, attempt * 1500));
    }

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Gemini API error');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from the AI model.');
    }

    return res.status(200).json({ output: text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
