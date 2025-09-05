import { config } from '../config';
import notificationService from './NotificationService';

/**
 * TTS Service with clear separation of concerns
 *
 * Architecture:
 * - Frontend: Handles cached audio playback for single phonemes
 * - TTS Service: Handles Azure TTS synthesis for multi-phoneme sequences
 * - No browser TTS fallback (unreliable and lacks SSML support)
 *
 * Responsibilities:
 * - Single phoneme TTS synthesis (fallback when cached audio fails)
 * - Multi-phoneme sequence synthesis (always uses Azure TTS for proper blending)
 * - Error handling with user notifications
 * - Retry logic for network issues
 */
class TTSService {
  constructor() {
    this.isLoading = false;
  }



  /**
   * Synthesize a single phoneme using Azure TTS (fallback for cached audio failure)
   * Sends IPA symbols directly to Azure TTS - no intermediate mapping needed
   */
  async synthesizeSinglePhoneme(phoneme, selectedVoice, selectedLanguage = 'en-GB') {
    try {
      const response = await config.api.post('/api/tts', {
        text: phoneme,
        voice: selectedVoice,
        language: selectedLanguage,
        usePhonemes: true,
        isWholeUtterance: false
      });

      if (response.data && response.data.audio) {
        const audioFormat = response.data.format === 'riff-48khz-16bit-mono-pcm' ?
          'audio/wav' : 'audio/mp3';
        
        const audio = new Audio(`data:${audioFormat};base64,${response.data.audio}`);
        await audio.play();
      }
    } catch (error) {
      console.error(`TTS synthesis failed for single phoneme "${phoneme}":`, error.message);
      notificationService.showTTSError(error, 'single phoneme synthesis');
    }
  }

  /**
   * Synthesize a multi-phoneme sequence using Azure TTS
   * This is for combined phoneme sequences that need proper blending
   * NEVER uses cached audio - always synthesizes for natural blending
   * Sends IPA sequences directly to Azure TTS for optimal pronunciation
   */
  async synthesizePhonemeSequence(phonemeSequence, selectedVoice, selectedLanguage = 'en-GB') {
    if (!phonemeSequence || phonemeSequence.length === 0) {
      return;
    }

    console.log('Synthesizing phoneme sequence via Azure TTS:', phonemeSequence);

    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.isLoading = true;
        
        const response = await config.api.post('/api/tts', {
          text: phonemeSequence, // Send IPA sequence as-is for proper blending
          voice: selectedVoice,
          language: selectedLanguage,
          usePhonemes: true,
          isWholeUtterance: true // Important: This ensures proper blending
        });

        if (response.data && response.data.audio) {
          const audioFormat = response.data.format === 'riff-48khz-16bit-mono-pcm' ?
            'audio/wav' : 'audio/mp3';
          
          const audio = new Audio(`data:${audioFormat};base64,${response.data.audio}`);
          await audio.play();
          console.log(`Phoneme sequence synthesized successfully (attempt ${attempt})`);
          return;
        } else {
          throw new Error('No audio data received from TTS service');
        }
        
      } catch (error) {
        console.warn(`TTS attempt ${attempt}/${maxRetries} failed for sequence:`, error.message);
        
        if (attempt < maxRetries && this.isRetryableError(error)) {
          await this.delay(retryDelay * attempt); // Exponential backoff
          continue;
        }
        
        // Final attempt failed
        console.error(`TTS synthesis failed for phoneme sequence after ${maxRetries} attempts:`, error.message);
        notificationService.showTTSError(error, 'phoneme sequence synthesis');
        throw error;
        
      } finally {
        this.isLoading = false;
      }
    }
  }

  /**
   * Determine if an error is retryable (network/timeout issues)
   */
  isRetryableError(error) {
    return error.code === 'ECONNABORTED' || 
           error.code === 'ERR_NETWORK' || 
           (error.response?.status >= 500 && error.response?.status < 600);
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  /**
   * Get loading state
   */
  getLoadingState() {
    return this.isLoading;
  }
}

// Create singleton instance
const ttsService = new TTSService();

export default ttsService;
