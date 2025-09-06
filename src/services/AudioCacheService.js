import ttsService from './TTSService';

/**
 * Audio Cache Service - Handles cached audio playback for single phonemes
 * 
 * Responsibilities:
 * - Managing cached audio files for single phoneme button clicks
 * - Loading and caching phoneme audio files
 * - Fallback to TTS when cached audio fails
 * - Clear separation from multi-phoneme TTS synthesis
 */
class AudioCacheService {
  constructor() {
    this.cache = {};
    this.loadingPromises = new Map(); // Prevent duplicate loading requests
  }

  /**
   * Play a single phoneme using cached audio with TTS fallback
   * This is the main method for single phoneme button clicks
   */
  async playSinglePhoneme(phoneme, { 
    audioCache, 
    getPhonemeFileName, 
    loadAudioFile, 
    selectedVoice, 
    selectedLanguage = 'en-GB' 
  }) {
    // Skip special marks and stress markers
    if (/[↗↘↑↓|‖ˈˌ]/.test(phoneme)) {
      return Promise.resolve();
    }

    try {
      // First, try to play from cache
      if (audioCache[phoneme]) {
        const audioClone = audioCache[phoneme].cloneNode();
        await audioClone.play();
        return;
      }

      // If not cached, try to load and cache the audio file
      const fileName = getPhonemeFileName(phoneme, selectedVoice);
      
      // Check if we're already loading this file to prevent duplicates
      if (this.loadingPromises.has(fileName)) {
        const audio = await this.loadingPromises.get(fileName);
        await audio.play();
        return;
      }

      // Start loading the audio file
      const loadingPromise = loadAudioFile(fileName);
      this.loadingPromises.set(fileName, loadingPromise);

      try {
        const audio = await loadingPromise;
        audioCache[phoneme] = audio;
        await audio.play();
        // Successfully played cached audio
      } finally {
        // Clean up the loading promise
        this.loadingPromises.delete(fileName);
      }
      
    } catch (error) {
      // Cached audio failed - fallback to TTS synthesis (expected behavior)
      await ttsService.synthesizeSinglePhoneme(phoneme, selectedVoice, selectedLanguage);
    }
  }

  /**
   * Clear the audio cache
   */
  clearCache(audioCache) {
    Object.keys(audioCache).forEach(key => {
      delete audioCache[key];
    });
    console.log('Audio cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(audioCache) {
    const cachedPhonemes = Object.keys(audioCache);
    const totalSize = cachedPhonemes.reduce((size, phoneme) => {
      const audio = audioCache[phoneme];
      // Estimate size based on duration (rough approximation)
      return size + (audio.duration || 1) * 32; // ~32KB per second for MP3
    }, 0);

    return {
      count: cachedPhonemes.length,
      phonemes: cachedPhonemes,
      estimatedSizeKB: Math.round(totalSize),
      loadingInProgress: this.loadingPromises.size
    };
  }

  /**
   * Test audio availability for a specific voice
   */
  async testAudioAvailability(testPhonemes, { getPhonemeFileName, loadAudioFile, selectedVoice }) {
    const results = [];
    
    for (const phoneme of testPhonemes.slice(0, 3)) { // Test first 3 phonemes
      const fileName = getPhonemeFileName(phoneme, selectedVoice);
      
      try {
        await loadAudioFile(fileName);
        results.push({ phoneme, available: true });
        console.log(`Audio available for ${phoneme} with voice ${selectedVoice}`);
      } catch (error) {
        results.push({ phoneme, available: false, error: error.message });
        console.warn(`Audio not available for ${phoneme} with voice ${selectedVoice}:`, error.message);
      }
    }

    const availableCount = results.filter(r => r.available).length;
    const availability = availableCount / results.length;

    console.log(`Audio availability for ${selectedVoice}: ${(availability * 100).toFixed(1)}%`);
    
    return {
      availability,
      results,
      hasAudio: availability > 0
    };
  }
}

// Create singleton instance
const audioCacheService = new AudioCacheService();

export default audioCacheService;
