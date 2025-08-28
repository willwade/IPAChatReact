const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const { CircuitBreaker } = require('./utils/circuitBreaker');
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

// Azure TTS configuration
const AZURE_KEY = process.env.REACT_APP_AZURE_KEY;
const AZURE_REGION = process.env.REACT_APP_AZURE_REGION;

// Initialize circuit breaker for Azure TTS calls
const azureTTSCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,      // Open after 3 failures
  resetTimeout: 30000,      // Try again after 30 seconds
  monitoringPeriod: 60000   // Track calls over 1 minute window
});

// Log Azure configuration (without exposing the full key)
console.log('Azure Configuration:', {
  region: AZURE_REGION,
  keyPresent: !!AZURE_KEY,
  keyLength: AZURE_KEY ? AZURE_KEY.length : 0
});

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

// Helper function to make Azure TTS API call
async function callAzureTTS(ssml, tts_endpoint) {
  const response = await axios({
    method: 'post',
    url: tts_endpoint,
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'IPAChat'
    },
    data: ssml,
    responseType: 'arraybuffer',
    timeout: 10000 // 10 second timeout for Azure calls
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('Empty response from Azure TTS');
  }

  return response;
}

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
    hasKey: !!AZURE_KEY,
    hasRegion: !!AZURE_REGION,
    region: AZURE_REGION
  });

  const { text, voice, language, usePhonemes = true } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!AZURE_KEY || !AZURE_REGION) {
    console.error('Azure credentials missing:', { 
      hasKey: !!AZURE_KEY, 
      hasRegion: !!AZURE_REGION,
      region: AZURE_REGION 
    });
    return res.status(500).json({ error: 'Azure credentials not configured' });
  }

  try {
    const tts_endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    console.log('Using TTS endpoint:', tts_endpoint);

    // Generate SSML based on usePhonemes flag
    const ssml = usePhonemes ? `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${voice}">
          <prosody rate="slow" pitch="medium">
            <phoneme alphabet="ipa" ph="${text}">
              ${text === 'p' ? 'puh' : text === 'f' ? 'fuh' : '_'}
            </phoneme>
          </prosody>
        </voice>
      </speak>
    `.trim() : `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${voice}">
          ${text}
        </voice>
      </speak>
    `.trim();
    
    console.log('Generated SSML:', ssml);

    console.log('Making request to Azure through circuit breaker...');
    
    // Use circuit breaker to call Azure TTS
    const response = await azureTTSCircuitBreaker.call(callAzureTTS, ssml, tts_endpoint);

    console.log('Azure response received:', {
      status: response.status,
      headers: response.headers,
      dataLength: response.data?.length || 0
    });

    // Convert audio buffer to base64
    const base64Audio = Buffer.from(response.data).toString('base64');
    console.log('Audio converted to base64, length:', base64Audio.length);

    res.json({
      audio: base64Audio
    });
  } catch (error) {
    // Handle circuit breaker specific errors
    if (error.code === 'CIRCUIT_BREAKER_OPEN') {
      console.log('Circuit breaker is OPEN - blocking Azure TTS request');
      const stats = azureTTSCircuitBreaker.getStats();
      return res.status(503).json({
        error: 'Azure TTS service temporarily unavailable',
        details: 'Circuit breaker is OPEN due to recent failures',
        circuitBreakerState: stats.state,
        retryAfter: Math.ceil(stats.timeUntilNextAttempt / 1000),
        stats: {
          failureCount: stats.failureCount,
          successRate: stats.successRate
        }
      });
    }

    // Log the full error object
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Log detailed error information
    console.error('Error in TTS:', {
      message: error.message,
      code: error.code,
      circuitBreakerState: azureTTSCircuitBreaker.getStats().state,
      response: {
        data: error.response?.data ? error.response.data.toString() : null,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      },
      requestData: {
        text: text,
        voice: voice,
        language: language,
        endpoint: `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`
      }
    });

    res.status(500).json({ 
      error: 'Speech synthesis failed',
      details: error.response?.data ? error.response.data.toString() : error.message,
      circuitBreakerState: azureTTSCircuitBreaker.getStats().state,
      requestInfo: {
        text: text,
        voice: voice,
        language: language
      }
    });
  }
});

// Circuit breaker status and control endpoints
app.get('/api/tts/circuit-breaker/status', (req, res) => {
  const stats = azureTTSCircuitBreaker.getStats();
  console.log('Circuit breaker status requested:', stats);
  res.json(stats);
});

app.post('/api/tts/circuit-breaker/reset', (req, res) => {
  console.log('Manual circuit breaker reset requested');
  azureTTSCircuitBreaker.forceReset();
  const stats = azureTTSCircuitBreaker.getStats();
  res.json({
    message: 'Circuit breaker reset successfully',
    stats: stats
  });
});

app.post('/api/tts/circuit-breaker/trip', (req, res) => {
  console.log('Manual circuit breaker trip requested');
  azureTTSCircuitBreaker.forceOpen();
  const stats = azureTTSCircuitBreaker.getStats();
  res.json({
    message: 'Circuit breaker tripped successfully',
    stats: stats
  });
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
