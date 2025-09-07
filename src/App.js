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

// Configuration for vowel image options
const VOWEL_IMAGE_OPTIONS = {
  '/ɒ/': ['octopus.png', 'pop.png', 'fox.png', 'miss-polly.png'], // "o" sounds
  '/iː/': ['eagle.png', 'bee.png', 'sheep.png', 'squeak.png'], // "ee" sounds  
  '/æ/': ['apple.png', 'cat-on-mat.png', 'nan.png', 'splash.png'], // "a" sounds
  '/ɪ/': ['igloo.png', 'incy.png', 'six.png', 'thwip.png'], // short "i" sounds
  '/ɛ/': ['elephant.png', 'red.png', 'head.png', 'squelch.png'], // "e" sounds
  '/ɑː/': ['aardvark.png', 'aargh.png', 'car.png', 'bart.png'] // "ah" sounds
};

// Configuration for cached vowel preferences
const CACHED_VOWEL_PREFERENCES = {
  'ɪ': {
    paddingBefore: 0,
    paddingAfter: 9,
    extensionFactor: 2.0,
    comparisonVowels: ['ɒ', 'æ']  // Compare "bit" with "bot" and "bat"
  }
  // Additional vowels can be added here as needed
};

const App = () => {
  const [wordQueue, setWordQueue] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('en-GB-LibbyNeural');
  const [isPlaying, setIsPlaying] = useState(false);
  const [vowelCache, setVowelCache] = useState({});
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [mode, setMode] = useState('babble'); // 'babble' or 'speech'
  const [editMode, setEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState({
    '/ɒ/': 0, '/iː/': 0, '/æ/': 0, '/ɪ/': 0, '/ɛ/': 0, '/ɑː/': 0
  });

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
    
    // Collect all vowels to cache: target vowels + their comparison vowels
    const targetVowels = Object.keys(CACHED_VOWEL_PREFERENCES);
    const comparisonVowels = new Set();
    
    targetVowels.forEach(vowel => {
      const prefs = CACHED_VOWEL_PREFERENCES[vowel];
      if (prefs.comparisonVowels) {
        prefs.comparisonVowels.forEach(comp => comparisonVowels.add(comp));
      }
    });
    
    const vowelsToCache = [...targetVowels, ...Array.from(comparisonVowels)];
    console.log('Caching target vowels:', targetVowels);
    console.log('Caching comparison vowels:', Array.from(comparisonVowels));
    console.log('Total vowels to cache:', vowelsToCache);
    
    for (const vowel of vowelsToCache) {
      const word = vowelWords[vowel];
      if (!word) {
        console.warn(`No context word defined for vowel: ${vowel}`);
        continue;
      }
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

  // Initialize AudioContext on first user interaction
  const initAudioContext = async () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
      
      // Resume context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx;
    }
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    return audioContext;
  };

  const extractVowelFromAudio = async (targetPhoneme) => {
    try {
      // Get comparison vowels from preferences
      const preferences = CACHED_VOWEL_PREFERENCES[targetPhoneme];
      if (!preferences) {
        throw new Error(`No preferences found for ${targetPhoneme}`);
      }
      
      const targetAudio = vowelCache[targetPhoneme];
      const comparisons = preferences.comparisonVowels || [];
      
      if (!targetAudio) {
        throw new Error(`No cached audio for ${targetPhoneme}`);
      }
      
      console.log(`Extracting ${targetPhoneme} by comparing with ${comparisons.join(', ')}`);
      
      // Decode target audio
      const ctx = await initAudioContext();
      const targetBuffer = await decodeAudioData(ctx, targetAudio.audio);
      
      // Find the region with maximum difference from comparison audio
      const differences = [];
      
      for (const comparePhoneme of comparisons) {
        if (vowelCache[comparePhoneme]) {
          const compareBuffer = await decodeAudioData(ctx, vowelCache[comparePhoneme].audio);
          const diff = findAudioDifference(targetBuffer, compareBuffer);
          differences.push(diff);
        }
      }
      
      // Use the region with highest average difference across all comparisons
      const coreRegion = findBestDifferenceRegion(differences, targetBuffer.length);
      
      // Add padding around the core vowel region using preferences
      const paddingBefore = Math.floor((coreRegion.end - coreRegion.start) * preferences.paddingBefore);
      const paddingAfter = Math.floor((coreRegion.end - coreRegion.start) * preferences.paddingAfter);  
      
      const bestRegion = {
        start: Math.max(0, coreRegion.start - paddingBefore),
        end: Math.min(targetBuffer.length, coreRegion.end + paddingAfter)
      };
      
      console.log(`Found vowel core: ${coreRegion.start} to ${coreRegion.end} (${Math.round(coreRegion.start/targetBuffer.length*100)}% - ${Math.round(coreRegion.end/targetBuffer.length*100)}%)`);
      console.log(`With padding: ${bestRegion.start} to ${bestRegion.end} (${Math.round(bestRegion.start/targetBuffer.length*100)}% - ${Math.round(bestRegion.end/targetBuffer.length*100)}%)`);
      
      // Extract and extend the padded region
      const originalLength = bestRegion.end - bestRegion.start;
      const extensionFactor = preferences.extensionFactor;
      const extractedLength = Math.floor(originalLength * extensionFactor);
      
      const extractedBuffer = ctx.createBuffer(
        targetBuffer.numberOfChannels,
        extractedLength,
        targetBuffer.sampleRate
      );
      
      // Copy the vowel portion to the new buffer with smooth fade-out
      for (let channel = 0; channel < targetBuffer.numberOfChannels; channel++) {
        const originalData = targetBuffer.getChannelData(channel);
        const extractedData = extractedBuffer.getChannelData(channel);
        
        // Get the first and last samples for padding
        const firstSample = originalData[bestRegion.start];
        const lastSample = originalData[bestRegion.end - 1];
        
        for (let i = 0; i < extractedLength; i++) {
          let sample;
          
          // Determine which part of the extended audio we're in
          const paddingLength = Math.floor((extractedLength - originalLength) / 2);
          
          if (i < paddingLength) {
            // Beginning padding - use first sample value
            sample = firstSample;
          } else if (i >= paddingLength + originalLength) {
            // End padding - use last sample value
            sample = lastSample;
          } else {
            // Original audio in the middle
            const originalIndex = i - paddingLength;
            sample = originalData[bestRegion.start + originalIndex];
          }
          
          // Apply smooth fade-in to the first 20% of the extended audio
          const fadeInLength = Math.floor(extractedLength * 0.2);
          if (i < fadeInLength) {
            const fadePosition = i / fadeInLength; // 0.0 to 1.0
            const fadeMultiplier = Math.pow(fadePosition, 0.5); // Smooth curve
            sample *= fadeMultiplier;
          }
          
          // Apply smooth fade-out to the last 50% of the extended audio
          const fadeOutLength = Math.floor(extractedLength * 0.5);
          if (i >= extractedLength - fadeOutLength) {
            const fadePosition = (extractedLength - i) / fadeOutLength; // 1.0 to 0.0
            const fadeMultiplier = Math.pow(fadePosition, 0.5); // Smooth curve
            sample *= fadeMultiplier;
          }
          
          extractedData[i] = sample;
        }
      }
      
      // Convert back to base64
      const extractedArrayBuffer = await audioBufferToArrayBuffer(extractedBuffer);
      const extractedBase64 = arrayBufferToBase64(extractedArrayBuffer);
      
      return extractedBase64;
    } catch (error) {
      console.warn('Error with audio diffing, using original:', error);
      return vowelCache[targetPhoneme]?.audio; // Fallback to original audio
    }
  };
  
  // Helper function to decode audio data
  const decodeAudioData = async (ctx, base64Audio) => {
    const binaryString = atob(base64Audio);
    const arrayBuffer = new ArrayBuffer(binaryString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    return await ctx.decodeAudioData(arrayBuffer);
  };
  
  // Find regions where two audio buffers differ most
  const findAudioDifference = (buffer1, buffer2) => {
    const minLength = Math.min(buffer1.length, buffer2.length);
    const windowSize = Math.floor(minLength / 100); // 1% windows
    const differences = [];
    
    for (let start = 0; start < minLength - windowSize; start += windowSize) {
      let totalDiff = 0;
      let samples = 0;
      
      for (let channel = 0; channel < Math.min(buffer1.numberOfChannels, buffer2.numberOfChannels); channel++) {
        const data1 = buffer1.getChannelData(channel);
        const data2 = buffer2.getChannelData(channel);
        
        for (let i = start; i < start + windowSize && i < minLength; i++) {
          totalDiff += Math.abs(data1[i] - data2[i]);
          samples++;
        }
      }
      
      differences.push({
        start: start,
        end: start + windowSize,
        avgDifference: samples > 0 ? totalDiff / samples : 0
      });
    }
    
    return differences;
  };
  
  // Find the best region by combining multiple difference analyses
  const findBestDifferenceRegion = (allDifferences, audioLength) => {
    if (allDifferences.length === 0) {
      // Fallback to middle region
      return {
        start: Math.floor(audioLength * 0.25),
        end: Math.floor(audioLength * 0.55)
      };
    }
    
    // Average differences across all comparisons
    const avgDifferences = [];
    const maxWindows = Math.min(...allDifferences.map(diff => diff.length));
    
    for (let i = 0; i < maxWindows; i++) {
      let totalDiff = 0;
      let count = 0;
      
      allDifferences.forEach(diffArray => {
        if (diffArray[i]) {
          totalDiff += diffArray[i].avgDifference;
          count++;
        }
      });
      
      if (count > 0) {
        avgDifferences.push({
          start: allDifferences[0][i].start,
          end: allDifferences[0][i].end,
          avgDifference: totalDiff / count
        });
      }
    }
    
    // Find the region with highest difference (likely the vowel)
    const bestWindow = avgDifferences.reduce((best, current) => 
      current.avgDifference > best.avgDifference ? current : best
    );
    
    return {
      start: bestWindow.start,
      end: bestWindow.end
    };
  };
  
  // Helper function to convert AudioBuffer to ArrayBuffer
  const audioBufferToArrayBuffer = async (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2; // 16-bit audio
    const arrayBuffer = new ArrayBuffer(44 + length); // WAV header is 44 bytes
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };
  
  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
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
      
      // Check if we have a cached vowel
      console.log(`Checking cache for: ${cleanPhoneme}`, {
        hasCache: !!vowelCache[cleanPhoneme],
        cacheInitialized: cacheInitialized,
        cacheKeys: Object.keys(vowelCache)
      });
      
      if (vowelCache[cleanPhoneme] && cacheInitialized && CACHED_VOWEL_PREFERENCES[cleanPhoneme]) {
        console.log(`Playing cached vowel: ${cleanPhoneme}`);
        const cached = vowelCache[cleanPhoneme];
        const mimeType = cached.format === 'wav' ? 'audio/wav' : 'audio/mp3';
        
        try {
          const extractedAudio = await extractVowelFromAudio(cleanPhoneme);
          const audio = new Audio(`data:${mimeType};base64,${extractedAudio}`);
          
          // Handle autoplay restrictions
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (audioError) {
          console.warn('Error with extracted audio, falling back to original:', audioError);
          // Fallback to original cached audio
          const audio = new Audio(`data:${mimeType};base64,${cached.audio}`);
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        }
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
    if (editMode && VOWEL_IMAGE_OPTIONS[phoneme.symbol]) {
      // In edit mode, cycle vowel images
      cycleVowelImage(phoneme.symbol);
      return;
    }
    
    if (mode === 'babble') {
      // In babble mode, just play the phoneme without adding to queue
      playPhoneme(phoneme.symbol);
    } else {
      // In speech mode, add to queue and play word
      const newQueue = [...wordQueue, phoneme.symbol];
      setWordQueue(newQueue);
      
      // If it's a single phoneme, play it individually (with cached vowels if available)
      if (newQueue.length === 1) {
        playPhoneme(phoneme.symbol);
      } else {
        // Play the whole word
        playWord(newQueue);
      }
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

  const toggleMode = () => {
    setMode(prev => prev === 'babble' ? 'speech' : 'babble');
    // Clear word queue when switching to babble mode
    if (mode === 'speech') {
      setWordQueue([]);
    }
  };

  const toggleEditMode = () => {
    setEditMode(prev => !prev);
  };

  const cycleVowelImage = (vowelSymbol) => {
    const options = VOWEL_IMAGE_OPTIONS[vowelSymbol];
    if (options) {
      setSelectedImages(prev => ({
        ...prev,
        [vowelSymbol]: (prev[vowelSymbol] + 1) % options.length
      }));
    }
  };

  const getCurrentImage = (vowelSymbol) => {
    const options = VOWEL_IMAGE_OPTIONS[vowelSymbol];
    if (options) {
      return options[selectedImages[vowelSymbol]];
    }
    return null;
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
      {!editMode ? (
        <div className="button-group">
          <button 
            className="mode-toggle-button left-button"
            onClick={toggleMode}
            disabled={isPlaying}
          >
            {mode === 'babble' ? 'Switch to Speech Mode' : 'Switch to Babble Mode'}
          </button>
          <button 
            className="edit-button right-button"
            onClick={toggleEditMode}
            disabled={isPlaying}
          >
            Edit Images
          </button>
        </div>
      ) : (
        <div className="edit-mode-controls">
          <p className="edit-instruction left-element">Click a vowel to change the image</p>
          <button 
            className="save-button right-button"
            onClick={toggleEditMode}
          >
            Save
          </button>
        </div>
      )}
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
            } ${(item.display && item.display.endsWith('.png')) || getCurrentImage(item.symbol) ? 'image-button' : ''} ${isPlaying ? 'disabled' : ''} ${
              mode === 'babble' && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play' || item.type === 'word-display') ? 'babble-disabled' : ''
            } ${
              editMode && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play' || item.type === 'word-display' || !VOWEL_IMAGE_OPTIONS[item.symbol]) ? 'edit-disabled' : ''
            }`}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (isPlaying) return;
              if (item.type === 'word-display' || item.type === 'empty') return;
              if (mode === 'babble' && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play')) return;
              if (editMode && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play' || !VOWEL_IMAGE_OPTIONS[item.symbol])) return;
              if (item.action) {
                item.action();
              } else {
                handlePhonemeClick(item);
              }
            }}
            onClick={() => {
              if (isPlaying) return;
              if (item.type === 'word-display' || item.type === 'empty') return;
              if (mode === 'babble' && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play')) return;
              if (editMode && (item.type === 'reset' || item.type === 'backspace' || item.type === 'play' || !VOWEL_IMAGE_OPTIONS[item.symbol])) return;
              if (item.action) {
                item.action();
              } else {
                handlePhonemeClick(item);
              }
            }}
            title={item.description || (
              item.type === 'play' ? 'Play current word' : 
              item.type === 'reset' ? 'Reset word' : 
              item.type === 'backspace' ? 'Delete last phoneme' : 
              ''
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
            ) : (getCurrentImage(item.symbol) || (item.display && item.display.endsWith('.png'))) ? (
              <img 
                src={`/images/${getCurrentImage(item.symbol) || item.display}`} 
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