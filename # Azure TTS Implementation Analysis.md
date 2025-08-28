# Azure TTS Implementation Analysis

How TTS is Currently Implemented

Backend Implementation (backend.js:244-354):
- Direct REST API calls to Azure Cognitive Services TTS endpoint
- SSML generation with phoneme markup for IPA symbols
- Base64 audio encoding/decoding
- Hardcoded voice data for en-GB and en-US locales
- Rate limiting with exponential backoff (429 handling)

Frontend Implementation (App.js:463-549):
- Three-tier fallback system:
  a. Pre-cached audio files from /audio/phonemes/
  b. Real-time Azure TTS via backend API
  c. Fallback voice attempts for missing phoneme files
- Audio caching mechanism for performance
- Complex phoneme detection logic (diphthongs, length markers)

Audio Generation Script (scripts/generate-phoneme-audio.js):
- Batch pre-generation of phoneme audio files
- FFmpeg post-processing (silence removal, volume normalization)
- File corruption detection using ffprobe
- Retry logic with rate limiting

Frontend/Backend Communication

API Endpoints:
- POST /api/tts - Real-time TTS synthesis
- GET /api/voices - Available voice enumeration
- GET /api/test - Connectivity testing

Data Flow:
1. Frontend attempts cached audio playback
2. On cache miss, calls backend /api/tts with phoneme + voice
3. Backend generates SSML and calls Azure API
4. Returns base64-encoded MP3 to frontend
5. Frontend plays audio directly from data URI

Configuration (src/config.js):
- Environment-aware API URL resolution
- 5-second timeout with custom error handling
- Response/request interceptors for debugging

Implementation Quality Assessment

Strengths:
- Comprehensive error handling with fallbacks
- Good separation of concerns (utility functions)
- Performance optimization through caching
- Extensive logging for debugging
- Rate limiting and retry mechanisms

Issues:
- Tight coupling: Azure-specific SSML hardcoded throughout
- Mixed responsibilities: Frontend handles both caching and TTS logic
- Configuration scattered: Azure credentials in multiple files
- No abstraction: Direct Azure API calls prevent easy service swapping
- Complex fallback logic: Makes debugging difficult
- Hardcoded phoneme mappings: Not easily extensible

Robustness & Self-Containment Improvements

Current Fragility Points:
- Network timeouts cause immediate fallback to different voices
- No circuit breaker pattern for failed Azure calls
- Audio cache can become stale/corrupted without detection
- Missing environment variables cause silent failures

Recommended Improvements:
1. Circuit Breaker Pattern: Prevent cascading failures when Azure is down
2. Health Checks: Periodic Azure API connectivity verification
3. Cache Invalidation: TTL-based audio cache with corruption detection
4. Configuration Validation: Startup checks for required environment variables
5. Graceful Degradation: Web Speech API fallback when Azure is unavailable
6. Request Queuing: Batch similar TTS requests to reduce API calls

TTS Service Abstraction Design

// Proposed abstraction layer
interface TTSService {
  synthesize(text, voice, options): Promise<AudioBuffer>
  getVoices(): Promise<Voice[]>
  isHealthy(): Promise<boolean>
}

class AzureTTSService implements TTSService {
  // Azure-specific implementation
}

class WebSpeechTTSService implements TTSService {
  // Browser Web Speech API fallback
}

class TTSServiceManager {
  constructor(services: TTSService[]) {
    this.services = services // Priority-ordered list
  }

  async synthesize(text, voice, options) {
    for (const service of this.services) {
      if (await service.isHealthy()) {
        try {
          return await service.synthesize(text, voice, options)
        } catch (error) {
          // Try next service
        }
      }
    }
    throw new Error('All TTS services unavailable')
  }
}

Recommendations & Suspicious Items

High Priority:
1. Extract TTS Service Layer: Create pluggable TTS interface
2. Add Circuit Breaker: Prevent repeated Azure failures
3. Implement Request Batching: Reduce API calls for similar phonemes
4. Add Comprehensive Logging: Track latency and failure patterns

Medium Priority:
5. Cache Warming: Pre-load commonly used phonemes
6. Service Worker: Enable offline phoneme playback
7. Progressive Enhancement: Start with Web Speech API, upgrade to Azure

Suspicious/Concerning:
- Credential Exposure Risk: Azure keys logged in multiple places (backend.js:38-42)
- Hardcoded Timeouts: 5s timeout may be too aggressive for TTS
- Missing Validation: No input sanitization for TTS text
- Memory Leaks: Audio elements not properly disposed in cache
- Rate Limit Logic: Current backoff strategy may be too aggressive

Architecture Red Flags:
- Frontend makes direct assumptions about backend TTS capabilities
- No strategy for handling quota exhaustion
- Audio cache grows unbounded without cleanup
- Complex phoneme parsing logic duplicated between frontend/backend

The implementation works but lacks the flexibility and robustness needed for a production TTS system with
variable latency and occasional service issues.