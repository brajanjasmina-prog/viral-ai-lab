const { GoogleGenAI } = require('@google/genai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt je obavezan!' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API ključ nije podešen.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Koristimo aktuelni stabilni model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ output: response.text });
  } catch (error) {
    console.error('Greška pri komunikaciji sa Gemini API:', error);
    return res.status(500).json({ error: error.message || 'Greška na serveru' });
  }
};
