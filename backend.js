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

// Voice data
const voiceData = {
  'en-GB': [
    { name: 'en-GB-SoniaNeural', displayName: 'Sonia (Female)', locale: 'en-GB' },
    { name: 'en-GB-RyanNeural', displayName: 'Ryan (Male)', locale: 'en-GB' },
    { name: 'en-GB-LibbyNeural', displayName: 'Libby (Female)', locale: 'en-GB' },
  ],
  'en-US': [
    { name: 'en-US-JennyNeural', displayName: 'Jenny (Female)', locale: 'en-US' },
    { name: 'en-US-GuyNeural', displayName: 'Guy (Male)', locale: 'en-US' },
    { name: 'en-US-AriaNeural', displayName: 'Aria (Female)', locale: 'en-US' },
  ],
};

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Endpoint to get available voices
app.get('/api/voices', (req, res) => {
  try {
    // Log the response for debugging
    console.log('Sending voice data:', voiceData);
    res.json(voiceData);
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({ error: 'Failed to get voices' });
  }
});

// IPA Game Mode Phases and Words
const gamePhases = {
  phase1: {
    name: "Single-Syllable Words (Simple Phonemes)",
    words: {
      "mum": "mʌm",
      "dad": "dæd",
      "cat": "kæt",
      "dog": "dɒg",
      "bus": "bʌs",
      "pig": "pɪg",
      "sun": "sʌn",
      "bird": "bɜːd"
    }
  },
  phase2: {
    name: "Two-Syllable Words (Adding Variety)",
    words: {
      "happy": "ˈhæpi",
      "banana": "bəˈnɑːnə",
      "tickle": "ˈtɪkəl",
      "butter": "ˈbʌtə",
      "hammer": "ˈhæmə",
      "desert": "ˈdezət"
    }
  },
  phase3: {
    name: "Two-Word Phrases",
    words: {
      "hello mum": "həˈləʊ mʌm",
      "bye dad": "baɪ dæd",
      "pig cat": "pɪg kæt",
      "run fast": "rʌn fɑːst",
      "good dog": "gʊd dɒg",
      "say hi": "seɪ haɪ"
    }
  }
};

// Simple English phoneme mapping
const englishPhonemeMap = {
  'hello': 'həˈləʊ',
  'dog': 'dɒg',
  'cat': 'kæt',
  'bird': 'bɜːd',
  'fish': 'fɪʃ',
  'book': 'bʊk',
  'tree': 'triː',
  'house': 'haʊs',
  'mouse': 'maʊs',
  'car': 'kɑː',
  'star': 'stɑː',
  'sun': 'sʌn',
  'moon': 'muːn',
  'rain': 'reɪn',
  'snow': 'snəʊ',
  'play': 'pleɪ',
  'day': 'deɪ',
  'night': 'naɪt',
  'light': 'laɪt',
  'time': 'taɪm'
};

// Game Mode endpoints
app.get('/api/game/phases', (req, res) => {
  try {
    console.log('Fetching phases...');
    const phases = Object.entries(gamePhases).map(([id, phase]) => ({
      id,
      name: phase.name,
      wordCount: Object.keys(phase.words).length
    }));
    console.log('Returning phases:', phases);
    res.json(phases);
  } catch (error) {
    console.error('Error getting phases:', error);
    res.status(500).json({ error: 'Failed to get phases' });
  }
});

app.get('/api/game/phase/:phaseId', (req, res) => {
  console.log('Fetching phase:', req.params.phaseId);
  const phase = gamePhases[req.params.phaseId];
  if (!phase) {
    console.log('Phase not found:', req.params.phaseId);
    return res.status(404).json({ error: 'Phase not found' });
  }
  console.log('Returning phase:', phase);
  res.json(phase);
});

app.get('/api/game/word/:word', (req, res) => {
  const word = req.params.word.toLowerCase();
  let foundWord = null;
  let foundPhase = null;

  // Search through all phases for the word
  for (const [phaseId, phase] of Object.entries(gamePhases)) {
    if (phase.words[word]) {
      foundWord = {
        word: word,
        ipa: phase.words[word],
        phonemes: Array.from(phase.words[word]).filter(char => char.trim())
      };
      foundPhase = phaseId;
      break;
    }
  }

  if (!foundWord) {
    return res.status(404).json({ error: 'Word not found' });
  }

  res.json({
    ...foundWord,
    phase: foundPhase
  });
});

app.get('/api/words', (req, res) => {
  try {
    // Convert the gamePhases words into a flat array
    const allWords = Object.values(gamePhases).reduce((words, phase) => {
      const phaseWords = Object.entries(phase.words).map(([word, ipa]) => ({
        word,
        ipa,
        phonemes: Array.from(ipa.replace(/[ˈˌ]/g, '')) // Remove stress marks and convert to array
      }));
      return [...words, ...phaseWords];
    }, []);
    
    res.json(allWords);
  } catch (error) {
    console.error('Error getting words:', error);
    res.status(500).json({ error: 'Failed to get words' });
  }
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

// Phonemization endpoint
app.post('/api/phonemize', async (req, res) => {
  const { text } = req.body;
  console.log('Phonemize request:', text);

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // If text is 'dummy', return the list of available words
    if (text === 'dummy') {
      const wordList = Object.keys(englishPhonemeMap).join(', ');
      console.log('Returning word list:', wordList);
      return res.status(404).json({ 
        error: 'Word not found', 
        message: 'Try one of these words: ' + wordList
      });
    }

    const word = text.toLowerCase().trim();
    if (!englishPhonemeMap[word]) {
      return res.status(404).json({ 
        error: 'Word not found', 
        message: 'Try one of these words: ' + Object.keys(englishPhonemeMap).join(', ')
      });
    }

    const ipa = englishPhonemeMap[word];
    const phonemes = Array.from(ipa).filter(p => p.trim());

    res.json({ 
      word: text,
      ipa: ipa,
      phonemes
    });

  } catch (error) {
    console.error('Error getting phonemes:', error);
    res.status(500).json({ 
      error: 'Failed to get phonemes',
      details: error.message 
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
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    port: port,
    publicPath: path.join(__dirname, 'public')
  });
});