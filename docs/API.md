# API Documentation

## Overview

The IPA Chat React backend provides REST API endpoints for text-to-speech synthesis, voice management, and system status checking.

**Base URL**: `http://localhost:3001` (development) or your deployed URL

## Authentication

No authentication required for current endpoints.

## Endpoints

### System Status

#### GET `/api/test`
Test basic API connectivity.

**Response:**
```json
{
  "status": "ok",
  "message": "API is working",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET `/api/azure/status`
Check Azure TTS configuration status.

**Response:**
```json
{
  "configured": true,
  "hasKey": true,
  "hasRegion": true,
  "region": "uksouth",
  "keyLength": 32,
  "endpoint": "https://uksouth.tts.speech.microsoft.com/cognitiveservices/v1"
}
```

#### POST `/api/azure/test`
Test Azure TTS connectivity with a sample synthesis.

**Response:**
```json
{
  "success": true,
  "message": "Azure TTS service is reachable and working",
  "status": 200,
  "audioGenerated": true
}
```

### Voice Management

#### GET `/api/voices`
Get available TTS voices by language.

**Response:**
```json
{
  "en-GB": [
    {
      "name": "en-GB-LibbyNeural",
      "displayName": "Libby (Female)",
      "locale": "en-GB"
    },
    {
      "name": "en-GB-RyanNeural",
      "displayName": "Ryan (Male)",
      "locale": "en-GB"
    }
  ],
  "en-US": [
    {
      "name": "en-US-JennyNeural",
      "displayName": "Jenny (Female)",
      "locale": "en-US"
    }
  ]
}
```

### Text-to-Speech

#### POST `/api/tts`
Synthesize speech from text or IPA phonemes.

**Request Body:**
```json
{
  "text": "həˈloʊ wɜːrld",
  "voice": "en-GB-LibbyNeural",
  "language": "en-GB",
  "usePhonemes": true,
  "isWholeUtterance": false
}
```

**Parameters:**
- `text` (string, required): Text or IPA phonemes to synthesize
- `voice` (string, required): Voice name from `/api/voices`
- `language` (string, optional): Language code (default: "en-GB")
- `usePhonemes` (boolean, optional): Whether text contains IPA phonemes (default: false)
- `isWholeUtterance` (boolean, optional): Whether to optimize for whole utterance (default: false)

**Response:**
```json
{
  "audio": "base64-encoded-audio-data",
  "format": "audio-48khz-192kbitrate-mono-mp3",
  "text": "həˈloʊ wɜːrld",
  "voice": "en-GB-LibbyNeural",
  "duration": 1.5
}
```

**Error Response:**
```json
{
  "error": "TTS synthesis failed",
  "details": "Invalid voice name",
  "code": "INVALID_VOICE"
}
```

### Application State

#### GET `/api/state`
Get current application state (if any).

**Response:**
```json
{
  "state": null
}
```

#### POST `/api/state`
Save application state.

**Request Body:**
```json
{
  "selectedLanguage": "en-GB",
  "selectedVoice": "en-GB-LibbyNeural",
  "buttonScale": 1.2
}
```

**Response:**
```json
{
  "success": true,
  "message": "State saved successfully"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error
- `503` - Service Unavailable (Azure TTS issues)

Error responses include:
```json
{
  "error": "Error description",
  "details": "Detailed error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

No rate limiting currently implemented. Azure TTS has its own quotas and limits.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.

## Environment Variables

The API requires these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_AZURE_KEY` | Yes | Azure Speech Services key |
| `REACT_APP_AZURE_REGION` | Yes | Azure region (e.g., 'uksouth') |
| `REACT_APP_PHONEMIZE_API` | No | Phonemization service URL |
| `PORT` | No | Server port (default: 3001) |

## Usage Examples

### JavaScript/Fetch
```javascript
// Test connectivity
const response = await fetch('/api/test');
const data = await response.json();

// Synthesize speech
const ttsResponse = await fetch('/api/tts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'həˈloʊ',
    voice: 'en-GB-LibbyNeural',
    usePhonemes: true
  })
});

const audioData = await ttsResponse.json();
const audio = new Audio(`data:audio/mp3;base64,${audioData.audio}`);
await audio.play();
```

### cURL
```bash
# Test API
curl http://localhost:3001/api/test

# Get voices
curl http://localhost:3001/api/voices

# Synthesize speech
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "həˈloʊ",
    "voice": "en-GB-LibbyNeural",
    "usePhonemes": true
  }'
```

## Audio Formats

The API returns audio in the following formats:
- **Default**: `audio-48khz-192kbitrate-mono-mp3`
- **Alternative**: `riff-48khz-16bit-mono-pcm` (WAV)

Audio is returned as base64-encoded data that can be played directly in browsers using the Data URL scheme.

## Troubleshooting

### Common Issues

1. **"Azure TTS not configured"**
   - Check environment variables are set
   - Verify Azure resource is active

2. **"Invalid voice name"**
   - Use exact voice names from `/api/voices`
   - Ensure voice supports the target language

3. **"TTS synthesis failed"**
   - Check Azure quota and billing
   - Verify network connectivity
   - Check text length limits

### Debug Endpoints

- `GET /api/azure/status` - Check configuration
- `POST /api/azure/test` - Test Azure connectivity
- Check server logs for detailed error messages
