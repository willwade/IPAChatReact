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
    { symbol: '/ɪ/', display: 'igloo.png', description: '"i" sound like igloo' },
    { symbol: '/ɛ/', display: 'elephant.png', description: '"e" sound like elephant' },
    { symbol: '/aː/', display: 'aardvark.png', description: '"ah" sound like aardvark' }
  ]
};

const App = () => {
  const [wordQueue, setWordQueue] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('en-GB-LibbyNeural');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchVoices();
  }, []);

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
      const cleanPhoneme = phonemeText.replace(/[\/ː]/g, '');
      const response = await config.api.post('/api/tts', {
        text: cleanPhoneme,
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
  }, [selectedVoice, isPlaying]);

  const handlePhonemeClick = (phoneme) => {
    // Single click - add to queue and play whole word
    const newQueue = [...wordQueue, phoneme.symbol];
    setWordQueue(newQueue);
    playWord(newQueue);
  };

  const playWord = async (queue = wordQueue) => {
    if (queue.length === 0 || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const wordText = queue.map(p => p.replace(/[\/ː]/g, '')).join('');
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
                {wordQueue.length > 0 ? wordQueue.join('') : 'Build your word...'}
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