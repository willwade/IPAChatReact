# IPA Chat React

A Progressive Web App for exploring IPA (International Phonetic Alphabet) phonemes with speech synthesis support.

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

## Customizing IPA Buttons

Each IPA button can be customized with:
- Custom images
- Hidden labels
- Different colors or styles

## Technology Stack

- React 18
- Material-UI
- Azure Cognitive Services Speech SDK
- Web Speech API (fallback)
