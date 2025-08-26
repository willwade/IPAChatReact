# IPA Chat React

A Progressive Web App for exploring IPA (International Phonetic Alphabet) phonemes with speech synthesis support. WIP. 

## Features

- Interactive IPA keyboard with customizable buttons
- Two modes of operation:
  - Babble mode: Immediate phoneme playback
  - Message mode: Compose and speak IPA sequences
- Language and voice selection
- SSML support for accurate phoneme pronunciation
- Customizable IPA buttons (supports images and label hiding)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Azure Speech Services:
   - Create a `.env` file in the root directory
   - Add your Azure credentials:
```
REACT_APP_AZURE_KEY=your_azure_key_here
REACT_APP_AZURE_REGION=your_azure_region_here
```

3. Start the development server:
```bash
npm start
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
