const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(express.json());

// Inicijalizacija Gemini API-ja sa ključem iz environment promenljivih
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Ruta za generisanje sadržaja
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt je obavezan!' });
    }

    // Koristimo gemini-pro model koji je u potpunosti podržan
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

// Serviranje statičnih fajlova (index.html) za sve ostale rute
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Eksportovanje aplikacije za Vercel serverless okruženje
module.exports = app;
