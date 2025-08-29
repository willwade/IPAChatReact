const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  if (req.body) {
    console.log('Request Body:', req.body);
  }
  next();
});

// In-memory storage (replace with a database in production)
let appState = null;

// Import centralized TTS configuration
const ttsConfig = require('./config/tts-config');

// Voice data
const voiceData = {
  'en-GB': [
    { name: 'en-GB-LibbyNeural', displayName: 'Libby (Female)', locale: 'en-GB' },
    { name: 'en-GB-RyanNeural', displayName: 'Ryan (Male)', locale: 'en-GB' },
    { name: 'en-GB-SoniaNeural', displayName: 'Sonia (Female)', locale: 'en-GB' },
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

// Test endpoint for connectivity
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit - API connectivity working');
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Azure credentials validation endpoint
app.get('/api/azure/status', (req, res) => {
  console.log('Azure status check requested');

  const status = {
    configured: !!ttsConfig.azureKey && !!ttsConfig.azureRegion,
    hasKey: !!ttsConfig.azureKey,
    hasRegion: !!ttsConfig.azureRegion,
    region: ttsConfig.azureRegion || 'not configured',
    keyLength: ttsConfig.azureKey ? ttsConfig.azureKey.length : 0,
    endpoint: ttsConfig.azureRegion ? ttsConfig.getAzureEndpoint() : 'not available'
  };

  console.log('Azure configuration status:', {
    ...status,
    keyPreview: ttsConfig.azureKey ? `${ttsConfig.azureKey.substring(0, 8)}...` : 'not set'
  });

  res.json(status);
});

// Azure connectivity test endpoint
app.post('/api/azure/test', async (req, res) => {
  console.log('Azure connectivity test requested');

  try {
    const result = await ttsConfig.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Azure TTS service test failed'
    });
  }
});

// Endpoint to get available voices
app.get('/api/voices', (req, res) => {
  try {
    console.log('📢 Voices endpoint hit by:', req.ip);
    console.log('Request headers:', req.headers);
    console.log('Sending voice data:', voiceData);

    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    res.json(voiceData);
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({ error: 'Failed to get voices', details: error.message });
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
    text: req.body.text,
    voice: req.body.voice,
    language: req.body.language,
    usePhonemes: req.body.usePhonemes,
    isWholeUtterance: req.body.isWholeUtterance,
    hasKey: !!ttsConfig.azureKey,
    hasRegion: !!ttsConfig.azureRegion,
    region: ttsConfig.azureRegion
  });

  const { text, voice, language, usePhonemes = true, isWholeUtterance = false } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // Use the centralized TTS configuration service
    const result = await ttsConfig.makeRequest(text, voice, language, {
      usePhonemes,
      isWholeUtterance
    });

    // Return the result from the TTS configuration service
    res.json({
      audio: result.audio,
      format: result.format
    });
  } catch (error) {
    console.error('TTS request failed:', error.message);

    res.status(500).json({
      error: 'Speech synthesis failed',
      details: error.message,
      code: error.code,
      statusCode: error.response?.status
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

// Catch-all handler to serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
});
