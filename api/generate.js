const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  // Dozvoljavamo isključivo POST zahtev
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
      return res.status(500).json({ error: 'API ključ nije podešen u Vercel environment promenljivama.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Inicijalizujemo stabilni model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ output: text });
  } catch (error) {
    console.error('Greška pri komunikaciji sa Gemini API:', error);
    return res.status(500).json({ error: error.message || 'Greška na serveru' });
  }
};
