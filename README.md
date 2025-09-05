# IPA Chat React

A Progressive Web App for exploring IPA (International Phonetic Alphabet) phonemes with speech synthesis support. Perfect for language learners, teachers, and speech professionals.

## Features

- **Multiple Modes**: Build, Search, Babble, Edit, and Game modes
- **Interactive IPA Keyboard**: Customizable phoneme buttons with audio feedback
- **Speech Synthesis**: Azure TTS integration with high-quality voices
- **Flexible UI**: Multiple interface modes (full, simplified, minimal, kiosk)
- **Configuration Loading**: Load settings from URLs or files
- **Accessibility**: Touch dwell, haptic feedback, and keyboard shortcuts
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **PWA Support**: Install as a Progressive Web App

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Azure Speech Services:**
   - Create a `.env` file in the root directory
   - Add your Azure credentials:
```bash
REACT_APP_AZURE_KEY=your_azure_speech_key_here
REACT_APP_AZURE_REGION=your_azure_region_here
```

3. **Start the development server:**
```bash
npm run dev
```

The app will be available at http://localhost:3000 (frontend) and the API at http://localhost:3001 (backend).

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete user documentation
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup and development instructions
- **[UI Modes](docs/UI_MODES.md)** - Interface customization options

## Usage Examples

### Basic Usage
```
https://yourapp.com/                    # Full interface
https://yourapp.com/?ui=simplified      # Simplified interface
https://yourapp.com/?ui=kiosk          # Kiosk mode
```

### Load Configurations
```
https://yourapp.com/?config=example1                    # Local config
https://yourapp.com/?config=https://example.com/my.json # Remote config
```

### Custom Toolbar
```
https://yourapp.com/?toolbar=build,settings,search      # Specific buttons only
```

## Pull Request Preview Deployments

This repository includes a GitHub Actions workflow that deploys every pull
request to a temporary DigitalOcean App Platform app. The workflow comments on
the PR with the preview URL.

To enable preview deployments:

1. Create a DigitalOcean API token with access to manage apps.
2. Add it to the repository secrets as `DO_API_TOKEN`.
3. Add the existing Azure environment values as GitHub repository secrets. These
   should match the values already configured in the DigitalOcean app:
   - `REACT_APP_AZURE_KEY`
   - `REACT_APP_AZURE_REGION`
   - `REACT_APP_PHONEMIZE_API`

No changes are required to the production app. Preview apps are created with a
unique name per pull request and removed when the PR is closed.

## Customizing IPA Buttons

Each IPA button can be customized with:
- Custom images
- Hidden labels
- Different colors or styles

## Example Presets

Four sample configurations are bundled with the app. You can load any of these
from the Settings screen or the onboarding dialog to quickly explore different
phoneme layouts.

## Technology Stack

- React 18
- Material-UI
- Azure Cognitive Services Speech SDK
- Web Speech API (fallback)
