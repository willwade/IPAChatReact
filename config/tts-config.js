const axios = require('axios');

/**
 * Centralized TTS Configuration Service
 * Handles Azure TTS credentials, validation, and connection testing
 */
class TTSConfig {
  constructor() {
    this.azureKey = process.env.AZURE_TTS_KEY;
    this.azureRegion = process.env.AZURE_TTS_REGION;
    this.phonemizeApiUrl = process.env.PHONEMIZE_API_URL;
    
    this.validateConfig();
  }

  /**
   * Validate that all required configuration is present
   */
  validateConfig() {
    const missing = [];
    
    if (!this.azureKey) {
      missing.push('AZURE_TTS_KEY');
    }
    
    if (!this.azureRegion) {
      missing.push('AZURE_TTS_REGION');
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate key format (basic check)
    if (this.azureKey.length < 32) {
      console.warn('Azure TTS key appears to be too short - please verify it is correct');
    }

    console.log('TTS Configuration validated:', {
      region: this.azureRegion,
      keyPresent: !!this.azureKey,
      keyLength: this.azureKey ? this.azureKey.length : 0,
      phonemizeApiConfigured: !!this.phonemizeApiUrl
    });
  }

  /**
   * Get the Azure TTS endpoint URL
   */
  getAzureEndpoint() {
    return `https://${this.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }

  /**
   * Get Azure request headers
   */
  getAzureHeaders(audioFormat = 'audio-48khz-192kbitrate-mono-mp3') {
    return {
      'Ocp-Apim-Subscription-Key': this.azureKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': audioFormat,
      'User-Agent': 'IPAChat-TTS'
    };
  }

  /**
   * Test Azure TTS connection on startup
   */
  async testConnection() {
    const testSSML = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="en-GB-LibbyNeural">
          test
        </voice>
      </speak>
    `.trim();

    try {
      console.log('Testing Azure TTS connectivity...');
      
      const response = await axios({
        method: 'post',
        url: this.getAzureEndpoint(),
        headers: this.getAzureHeaders(),
        data: testSSML,
        responseType: 'arraybuffer',
        timeout: 10000
      });

      console.log('Azure TTS connection test successful:', {
        status: response.status,
        audioLength: response.data?.length || 0
      });

      return {
        success: true,
        message: 'Azure TTS service is reachable and working',
        status: response.status,
        audioGenerated: response.data?.length > 0
      };

    } catch (error) {
      console.error('Azure TTS connection test failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      throw new Error(`Azure TTS service connection failed: ${error.message}`);
    }
  }

  /**
   * Generate SSML for different types of TTS requests
   * NOTE: Azure TTS handles IPA symbols directly - no intermediate mapping needed
   */
  generateSSML(text, voice, language, options = {}) {
    const {
      usePhonemes = true,
      isWholeUtterance = false,
      rate = 'medium',
      pitch = 'medium'
    } = options;

    if (usePhonemes && isWholeUtterance) {
      // For whole utterances, use proper SSML with the IPA sequence for blending
      return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}">
      <phoneme alphabet="ipa" ph="${text}"/>
    </prosody>
  </voice>
</speak>`;
    } else if (usePhonemes) {
      // For individual phonemes, use simpler SSML
      return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
  <voice name="${voice}">
    <prosody rate="slow" pitch="${pitch}">
      <phoneme alphabet="ipa" ph="${text}"/>
    </prosody>
  </voice>
</speak>`;
    } else {
      // For regular text
      return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
  <voice name="${voice}">
    ${text}
  </voice>
</speak>`;
    }
  }

  /**
   * Make a TTS request to Azure
   */
  async makeRequest(text, voice, language, options = {}) {
    const ssml = this.generateSSML(text, voice, language, options);
    const audioFormat = options.isWholeUtterance ?
      'riff-48khz-16bit-mono-pcm' :  // PCM for whole utterances
      'audio-48khz-192kbitrate-mono-mp3';  // MP3 for individual phonemes

    console.log('Making Azure TTS request:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      voice,
      language,
      audioFormat,
      options
    });

    try {
      const response = await axios({
        method: 'post',
        url: this.getAzureEndpoint(),
        headers: this.getAzureHeaders(audioFormat),
        data: ssml,
        responseType: 'arraybuffer',
        timeout: 25000
      });

      console.log('Azure TTS request successful:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        format: audioFormat
      });

      return {
        audio: Buffer.from(response.data).toString('base64'),
        format: audioFormat,
        status: response.status
      };

    } catch (error) {
      console.error('Azure TTS request failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        endpoint: this.getAzureEndpoint()
      });

      throw error;
    }
  }
}

// Create and export singleton instance
const ttsConfig = new TTSConfig();

module.exports = ttsConfig;
