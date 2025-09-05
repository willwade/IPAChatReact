# Development Guide

## Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Azure Speech Services subscription (for TTS functionality)

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/willwade/IPAChatReact.git
cd IPAChatReact
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Azure Speech Services (Required for TTS)
REACT_APP_AZURE_KEY=your_azure_speech_key_here
REACT_APP_AZURE_REGION=your_azure_region_here

# Phonemization API (Optional - has fallback)
REACT_APP_PHONEMIZE_API=https://your-phonemize-api.com

# Development (Optional)
PORT=3001
NODE_ENV=development
```

#### Azure Speech Services Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Speech Services" resource
3. Copy the **Key** and **Region** from the resource
4. Add them to your `.env` file as shown above

**Important**: Use `REACT_APP_AZURE_KEY` and `REACT_APP_AZURE_REGION` (the backend supports both old and new naming conventions for backward compatibility).

### 3. Development Server

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately:
npm run dev:backend    # Backend only (port 3001)
npm run dev:frontend   # Frontend only (port 3000)
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Project Structure

```
IPAChatReact/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── data/              # Phonetic data and configurations
│   ├── services/          # Frontend services (TTS, Audio Cache, etc.)
│   └── utils/             # Utility functions
├── config/                # Backend configuration
├── docs/                  # Documentation
├── public/                # Static assets
│   ├── audio/phonemes/    # Pre-generated phoneme audio files
│   └── examples/          # Configuration examples
├── scripts/               # Build and utility scripts
└── backend.js             # Express backend server
```

## Key Features

### TTS Architecture

The app uses a hybrid approach for audio:

1. **Single Phonemes**: Uses cached pre-generated audio files when available
2. **Multi-phoneme Sequences**: Always uses Azure TTS for proper blending
3. **Fallback**: Azure TTS synthesis when cached audio is unavailable

### UI Modes

The app supports multiple UI modes via URL parameters:

- `?ui=full` - Full interface (default)
- `?ui=simplified` - Simplified interface with fewer buttons
- `?ui=minimal` - Minimal interface (settings only)
- `?ui=kiosk` - Kiosk mode (no toolbar, Ctrl+Shift+S for settings)
- `?toolbar=build,settings` - Custom toolbar with specific buttons

### Configuration Loading

Load configurations via URL:
- `?config=example1` - Load from `/public/examples/example1.json`
- `?config=https://example.com/config.json` - Load from remote URL

## Testing

```bash
# Run tests
npm test

# Run tests in CI mode
CI=true npm test -- --passWithNoTests

# Build for production
npm run build
```

## Common Development Tasks

### Adding New Phonemes

1. Add phoneme to `src/data/phoneticData.js`
2. Generate audio: `npm run generate-audio`
3. Update filename mappings in `src/data/phonemeFilenames.js`

### Debugging TTS Issues

1. Check Azure credentials: Visit `/api/azure/status`
2. Test connectivity: POST to `/api/azure/test`
3. Enable debug logging in browser console

### Creating Custom Configurations

1. Create JSON file in `public/examples/`
2. Include any app settings (see existing examples)
3. Test with `?config=your-config-name`

## Troubleshooting

### TTS Not Working

1. Verify Azure credentials in `.env`
2. Check Azure resource is active and has quota
3. Ensure correct region format (e.g., `uksouth`, `eastus`)

### Audio Files Missing

1. Run `npm run generate-audio` to create phoneme audio
2. Check `public/audio/phonemes/` directory
3. Verify Azure TTS is working for generation

### Build Errors

1. Clear cache: `npm run clean`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_AZURE_KEY` | Yes | Azure Speech Services key | `abc123def456...` |
| `REACT_APP_AZURE_REGION` | Yes | Azure region | `uksouth` |
| `REACT_APP_PHONEMIZE_API` | No | Phonemization service URL | `https://api.example.com` |
| `PORT` | No | Backend server port | `3001` |
| `NODE_ENV` | No | Environment mode | `development` |
