const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (replace with a database in production)
let appState = null;

// Azure TTS configuration
const AZURE_KEY = process.env.REACT_APP_AZURE_KEY;
const AZURE_REGION = process.env.REACT_APP_AZURE_REGION;

// Routes
app.post('/api/save', (req, res) => {
  appState = req.body;
  res.json({ message: 'State saved successfully' });
});

app.get('/api/load', (req, res) => {
  if (appState) {
    res.json(appState);
  } else {
    res.status(404).json({ message: 'No saved state found' });
  }
});

app.post('/api/tts', async (req, res) => {
  const { text, voice, language } = req.body;

  if (!AZURE_KEY || !AZURE_REGION) {
    return res.status(500).json({ error: 'Azure credentials not configured' });
  }

  try {
    const tts_endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
        <voice name='${voice || `${language}-AriaNeural`}'>
          <phoneme alphabet='ipa' ph='${text}'>${text}</phoneme>
        </voice>
      </speak>
    `;

    const response = await axios({
      method: 'post',
      url: tts_endpoint,
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      data: ssml,
      responseType: 'arraybuffer'
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length
    });

    res.send(response.data);
  } catch (error) {
    console.error('Azure TTS error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Speech synthesis failed',
      details: error.response?.data ? Buffer.from(error.response.data).toString() : error.message
    });
  }
});

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});