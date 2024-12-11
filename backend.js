const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  if (req.body) {
    console.log('Request Body:', req.body);
  }
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with a database in production)
let appState = null;

// Azure TTS configuration
const AZURE_KEY = process.env.REACT_APP_AZURE_KEY;
const AZURE_REGION = process.env.REACT_APP_AZURE_REGION;

// Log Azure configuration (without exposing the full key)
console.log('Azure Configuration:', {
  region: AZURE_REGION,
  keyPresent: !!AZURE_KEY,
  keyLength: AZURE_KEY ? AZURE_KEY.length : 0
});

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
  console.log('TTS Request received:', {
    hasText: !!req.body.text,
    voice: req.body.voice,
    language: req.body.language
  });

  const { text, voice, language } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!AZURE_KEY || !AZURE_REGION) {
    console.error('Azure credentials missing:', { 
      hasKey: !!AZURE_KEY, 
      hasRegion: !!AZURE_REGION 
    });
    return res.status(500).json({ error: 'Azure credentials not configured' });
  }

  try {
    const tts_endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    console.log('Using TTS endpoint:', tts_endpoint);

    // Create SSML with proper language context
    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
        <voice name='${voice}'>
          <lang xml:lang='${language}'>
            <phoneme alphabet='ipa' ph='${text}'>
              ${text}
            </phoneme>
          </lang>
        </voice>
      </speak>
    `;
    console.log('Generated SSML:', ssml);

    console.log('Making request to Azure...');
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

    console.log('Azure response received:', {
      status: response.status,
      headers: response.headers
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length
    });

    res.send(response.data);
  } catch (error) {
    console.error('Error in TTS:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Speech synthesis failed',
      details: error.response?.data ? error.response.data.toString() : error.message
    });
  }
});

// Add voices endpoint
app.get('/api/voices', async (req, res) => {
  if (!AZURE_KEY || !AZURE_REGION) {
    return res.status(500).json({ error: 'Azure credentials not configured' });
  }

  try {
    const response = await axios({
      method: 'get',
      url: `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY
      }
    });

    // Filter and format the voices
    const voices = response.data
      .filter(voice => voice.VoiceType === "Neural") // Only get Neural voices
      .map(voice => ({
        name: voice.ShortName,
        displayName: `${voice.LocalName} (${voice.Gender})`,
        gender: voice.Gender,
        locale: voice.Locale
      }));

    res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices from Azure' });
  }
});

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    port: port,
    publicPath: path.join(__dirname, 'public')
  });
});