import React, { useState, useEffect, useCallback } from 'react';
import { config } from './config';
import './App.css';

const PHONEMES = {
  consonants: [
    { symbol: '/k/', display: 'k', description: '"k" in "cat"' },
    { symbol: '/f/', display: 'f', description: '"f" in "fat"' },
    { symbol: '/t/', display: 't', description: '"t" in "tap"' },
    { symbol: '/ʃ/', display: 'sh', description: '"sh" in "ship"' },
    { symbol: '/r/', display: 'r', description: '"r" in "rat"' },
    { symbol: '/n/', display: 'n', description: '"n" in "nap"' },
    { symbol: '/s/', display: 's', description: '"s" in "sat"' },
    { symbol: '/p/', display: 'p', description: '"p" in "pat"' },
    { symbol: '/l/', display: 'l', description: '"l" in "lap"' }
  ],
  vowels: [
    { symbol: '/ɒ/', display: 'octopus.png', description: '"o" sound like octopus' },
    { symbol: '/iː/', display: 'eagle.png', description: '"ee" sound like eagle' },
    { symbol: '/æ/', display: 'apple.png', description: '"a" sound like apple' },
    { symbol: '/ɪ/', display: 'igloo.png', description: '"i" sound like igloo (short i)' },
    { symbol: '/ɛ/', display: 'elephant.png', description: '"e" sound like elephant' },
    { symbol: '/ɑː/', display: 'aardvark.png', description: '"ah" sound like aardvark' }
  ]
};

const App = () => {
  const [wordQueue, setWordQueue] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('en-GB-LibbyNeural');
  const [isPlaying, setIsPlaying] = useState(false);
  const [vowelCache, setVowelCache] = useState({});
  const [cacheInitialized, setCacheInitialized] = useState(false);

  useEffect(() => {
    fetchVoices();
  }, []);

  // Generate cache after voice is selected
  useEffect(() => {
    if (selectedVoice && !cacheInitialized) {
      generateVowelCache();
    }
  }, [selectedVoice]);

  const generateVowelCache = async () => {
    if (cacheInitialized) return;
    
    console.log('Generating vowel cache...');
    const vowelWords = {
      'ɪ': 'bɪt',     // "bit" 
      'ɛ': 'bɛt',     // "bet"
      'æ': 'bæt',     // "bat"
      'ɒ': 'bɒt',     // "bot"
      'ɑː': 'bɑːt',   // "bart"
      'iː': 'biːt'    // "beat"
    };

    const cache = {};
    
    for (const [vowel, word] of Object.entries(vowelWords)) {
      try {
        console.log(`Caching ${vowel} from ${word}...`);
        const response = await config.api.post('/api/tts', {
          text: word,
          voice: selectedVoice,
          language: 'en-GB',
          usePhonemes: true
        });
        
        if (response.data && response.data.audio) {
          // Store the full word audio - we'll extract vowel portion client-side
          cache[vowel] = {
            audio: response.data.audio,
            format: response.data.format || 'wav',
            word: word
          };
          console.log(`Cached ${vowel} successfully`);
        }
      } catch (error) {
        console.warn(`Failed to cache vowel ${vowel}:`, error);
      }
    }
    
    setVowelCache(cache);
    setCacheInitialized(true);
    console.log('Vowel cache complete:', Object.keys(cache));
  };

  const extractVowelFromAudio = (audioData, format) => {
    // For now, we'll play the full word but crop it to sound more like just the vowel
    // In a more advanced implementation, we could use Web Audio API to:
    // 1. Decode the audio
    // 2. Find the vowel portion (usually middle 30-70% of the word)
    // 3. Extract and return just that segment
    
    // Simple approach: return the middle portion of the audio
    return audioData; // For now, return full audio - we'll improve this
  };

  const fetchVoices = async () => {
    try {
      const response = await config.api.get('/api/voices');
      if (response.data && response.data['en-GB']?.length > 0) {
        setSelectedVoice(response.data['en-GB'][0].name);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const playPhoneme = useCallback(async (phonemeText) => {
    if (!phonemeText || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const cleanPhoneme = phonemeText.replace(/[\/]/g, '');
      
      // Check if we have a cached vowel - use it if available
      console.log(`Checking cache for: ${cleanPhoneme}`, {
        hasCache: !!vowelCache[cleanPhoneme],
        cacheInitialized: cacheInitialized,
        cacheKeys: Object.keys(vowelCache)
      });
      
      if (vowelCache[cleanPhoneme] && cacheInitialized) {
        console.log(`Playing cached vowel: ${cleanPhoneme}`);
        const cached = vowelCache[cleanPhoneme];
        const mimeType = cached.format === 'wav' ? 'audio/wav' : 'audio/mp3';
        const extractedAudio = extractVowelFromAudio(cached.audio, cached.format);
        const audio = new Audio(`data:${mimeType};base64,${extractedAudio}`);
        await audio.play();
        return;
      }
      
      // Fallback to original phoneme for consonants and uncached vowels
      let ttsText = cleanPhoneme;
      
      const response = await config.api.post('/api/tts', {
        text: ttsText,
        voice: selectedVoice,
        language: 'en-GB',
        usePhonemes: true
      });
      
      if (response.data && response.data.audio) {
        const format = response.data.format || 'wav';
        const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mp3';
        const audio = new Audio(`data:${mimeType};base64,${response.data.audio}`);
        await audio.play();
      }
    } catch (error) {
      console.warn('Error playing phoneme:', error);
    } finally {
      setIsPlaying(false);
    }
  }, [selectedVoice, isPlaying, vowelCache, cacheInitialized]);

  const handlePhonemeClick = (phoneme) => {
    // Add to queue
    const newQueue = [...wordQueue, phoneme.symbol];
    setWordQueue(newQueue);
    
    // If it's a single phoneme, play it individually (with cached vowels if available)
    if (newQueue.length === 1) {
      playPhoneme(phoneme.symbol);
    } else {
      // Play the whole word
      playWord(newQueue);
    }
  };

  const playWord = async (queue = wordQueue) => {
    if (queue.length === 0 || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const wordText = queue.map(p => p.replace(/[\/]/g, '')).join('');
      const response = await config.api.post('/api/tts', {
        text: wordText,
        voice: selectedVoice,
        language: 'en-GB',
        usePhonemes: true
      });
      
      if (response.data && response.data.audio) {
        const format = response.data.format || 'wav';
        const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mp3';
        const audio = new Audio(`data:${mimeType};base64,${response.data.audio}`);
        await audio.play();
      }
    } catch (error) {
      console.warn('Error playing word:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setWordQueue([]);
  };

  const handleBackspace = () => {
    if (wordQueue.length > 0) {
      const newQueue = wordQueue.slice(0, -1);
      setWordQueue(newQueue);
    }
  };


  const gridItems = [
    // Row 1 - Controls only: Reset, Word Display (spans 2), Backspace, Play
    { type: 'reset', symbol: '⟲', action: handleReset },
    { type: 'word-display', symbol: '', action: null },
    { type: 'backspace', symbol: '⌫', action: handleBackspace },
    { type: 'play', symbol: '▶', action: () => playWord() },
    
    // Row 2 - Consonants and Vowels  
    PHONEMES.consonants[0], // /p/
    PHONEMES.consonants[1], // /n/
    PHONEMES.consonants[2], // /d/
    PHONEMES.vowels[0], // /i/
    PHONEMES.vowels[1], // /æ/
    
    // Row 3 - More consonants and Vowels
    PHONEMES.consonants[3], // /s/
    PHONEMES.consonants[4], // /f/
    PHONEMES.consonants[5], // /t/
    PHONEMES.vowels[2], // /ɑ/
    PHONEMES.vowels[3], // /u/
    
    // Row 4 - Remaining consonants and Vowels
    PHONEMES.consonants[6], // /k/
    PHONEMES.consonants[7], // /r/
    PHONEMES.consonants[8], // /z/
    PHONEMES.vowels[4], // /oʊ/
    PHONEMES.vowels[5], // /ɪ/
  ];

  return (
    <div className="app">
      <div className="phoneme-grid">
        {gridItems.map((item, index) => (
          <button
            key={index}
            className={`grid-cell ${
              item.type === 'play' ? 'play-button' : 
              item.type === 'reset' ? 'reset-button' : 
              item.type === 'backspace' ? 'backspace-button' :
              item.type === 'word-display' ? 'word-display-button' :
              item.type === 'empty' ? 'empty-button' :
              'phoneme-button'
            } ${item.display && item.display.endsWith('.png') ? 'image-button' : ''} ${isPlaying ? 'disabled' : ''}`}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (isPlaying) return;
              if (item.type === 'word-display' || item.type === 'empty') return;
              if (item.action) {
                item.action();
              } else {
                handlePhonemeClick(item);
              }
            }}
            onClick={() => {
              if (isPlaying) return;
              if (item.type === 'word-display' || item.type === 'empty') return;
              if (item.action) {
                item.action();
              } else {
                handlePhonemeClick(item);
              }
            }}
            title={item.description || (
              item.type === 'play' ? 'Play current word' : 
              item.type === 'reset' ? 'Reset word' : 
              item.type === 'backspace' ? 'Delete last phoneme' : ''
            )}
            disabled={isPlaying}
          >
            {item.type === 'word-display' ? (
              <span 
                className="phoneme-symbol word-text"
                style={{
                  fontSize: wordQueue.length === 0 ? '0.9rem' :
                           wordQueue.length > 8 ? '0.8rem' : 
                           wordQueue.length > 6 ? '1.0rem' : 
                           wordQueue.length > 4 ? '1.1rem' : '1.2rem',
                  opacity: wordQueue.length === 0 ? 0.6 : 1,
                  fontStyle: wordQueue.length === 0 ? 'italic' : 'normal'
                }}
              >
                {wordQueue.length > 0 ? wordQueue.map(p => p.replace(/[\/]/g, '')).join('') : 'Build your word...'}
              </span>
            ) : item.display && item.display.endsWith('.png') ? (
              <img 
                src={`/images/${item.display}`} 
                alt={item.symbol}
                className="phoneme-image"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover'
                }}
              />
            ) : (
              <span className="phoneme-symbol">
                {item.display || item.symbol}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;