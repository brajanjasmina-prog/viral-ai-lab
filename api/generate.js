module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, platform, tone } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt je obavezan!' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API ključ nije podešen.' });
    }

    const system = `You are a viral short-form video strategist. Reply in the same language the topic is written in. No intro and no outro, output only this structure:

## 🎣 5 Hooks
Five scroll-stopping opening lines (max 12 words each, first 3 seconds).

## 🎬 Script (30-40 sec)
Scene-by-scene. For each scene: **Visual:** and **Voiceover:**.

## 📣 Call to action
One strong CTA line.

## ✍️ Caption + hashtags
A short caption and 8 relevant hashtags.

Be specific, punchy and concrete. Avoid generic advice.`;

    const userText = `Topic: ${prompt}\nPlatform: ${platform || 'TikTok'}\nTone: ${tone || 'energetic'}`;

    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: userText }] }],
        generationConfig: { temperature: 1 }
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Greška sa Gemini API servisa');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Nema odgovora od AI modela.');
    }

    return res.status(200).json({ output: text });
  } catch (error) {
    console.error('Serverska greška:', error);
    return res.status(500).json({ error: error.message || 'Greška na serveru' });
  }
};
