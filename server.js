const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt je obavezan!' });
    }

    // Eksplicitno pozivamo gemini-pro koji sigurno odgovara na v1 endpointu
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ output: text });
  } catch (error) {
    console.error('Greška pri komunikaciji sa Gemini API:', error);
    res.status(500).json({ error: error.message || 'Greška na serveru' });
  }
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
