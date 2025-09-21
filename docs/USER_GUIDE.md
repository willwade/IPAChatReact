# IPA Chat React - User Guide

## Overview

IPA Chat React is a Progressive Web App for exploring and practicing International Phonetic Alphabet (IPA) phonemes with speech synthesis support. It's designed for language learners, teachers, and speech professionals.

## Getting Started

### Basic Usage

1. **Visit the App**: Open the app in your web browser
2. **Choose a Mode**: Select from Build, Search, Babble, Edit, or Game modes
3. **Select Language**: Choose your target language (currently supports English variants)
4. **Pick a Voice**: Select from available Azure TTS voices
5. **Start Exploring**: Click phoneme buttons to hear pronunciations

### Interface Modes

The app supports different interface modes for various use cases:

#### Full Mode (Default)
- Complete interface with all features
- Access: Default or `?ui=full`

#### Simplified Mode
- Reduced interface for focused learning
- Shows only Build mode and Settings
- Access: `?ui=simplified`

#### Minimal Mode
- Bare minimum interface
- Only settings available
- Access: `?ui=minimal`

#### Kiosk Mode
- No visible toolbar for public displays
- Access settings with `Ctrl+Shift+S`
- Access: `?ui=kiosk`

#### Custom Mode
- Specify exactly which buttons to show
- Access: `?toolbar=build,settings,search`

## App Modes

### 1. Build Mode
**Purpose**: Compose IPA sequences and hear them pronounced

**How to Use**:
1. Click phoneme buttons to build a sequence
2. See your sequence in the message area
3. Click the speaker button to hear the full sequence
4. Use the clear button to start over

**Features**:
- Real-time sequence building
- Whole utterance pronunciation
- IPA to text conversion (when enabled)

### 2. Search Mode
**Purpose**: Practice phoneme recognition by typing words

**How to Use**:
1. Click the search button
2. Enter a word in the dialog
3. The app converts it to IPA phonemes
4. Click the correct phonemes in sequence
5. Visual feedback shows your progress

**Features**:
- Automatic word-to-IPA conversion
- Progressive phoneme matching
- Visual progress indicators

### 3. Babble Mode
**Purpose**: Immediate phoneme playback for exploration

**How to Use**:
1. Simply click any phoneme button
2. Hear immediate pronunciation
3. No sequence building - each click plays instantly

**Features**:
- Instant audio feedback
- Perfect for phoneme exploration
- No message composition

### 4. Edit Mode
**Purpose**: Customize the interface and phoneme buttons

**How to Use**:
1. Toggle edit mode on/off
2. Customize button appearances
3. Upload custom images for phonemes
4. Adjust layout settings

**Features**:
- Button customization
- Image uploads
- Layout modifications
- Export/import configurations

### 5. Game Mode
**Purpose**: Interactive learning games and exercises

**How to Use**:
1. Select difficulty level
2. Follow game instructions
3. Practice phoneme recognition
4. Track your progress

**Features**:
- Multiple difficulty levels
- Progress tracking
- Interactive exercises
- Gamified learning

## Configuration Loading

### Loading Predefined Configurations

Load example configurations:
```
https://yourapp.com/?config=example1
https://yourapp.com/?config=beginner-english
```

### Loading Remote Configurations

Load from any URL:
```
https://yourapp.com/?config=https://example.com/my-config.json
```

### Configuration Format

Configurations are JSON files that can include:

```json
{
  "selectedLanguage": "en-GB",
  "selectedVoice": "en-GB-LibbyNeural",
  "buttonScale": 1.2,
  "autoScale": true,
  "showStressMarkers": true,
  "backgroundSettings": {
    "type": "color",
    "color": "#f0f8ff"
  },
  "toolbarConfig": {
    "showBuild": true,
    "showSearch": true,
    "showBabble": false,
    "showEdit": false,
    "showGame": true,
    "showSettings": true
  }
}
```

## Settings

### Audio Settings
- **Voice Selection**: Choose from available TTS voices
- **Speak on Button Press**: Enable/disable immediate phoneme playback
- **Speak Whole Utterance**: Enable/disable automatic sequence reading

### Display Settings
- **Button Scale**: Adjust phoneme button size
- **Auto Scale**: Automatically adjust buttons to fit screen
- **Button Spacing**: Control spacing between buttons
- **Show Stress Markers**: Include/exclude stress and intonation marks

### Accessibility Settings
- **Touch Dwell**: Enable dwell-time clicking for accessibility
- **Dwell Time**: Adjust hover time required for dwell clicking
- **Haptic Feedback**: Enable vibration feedback on supported devices

### Background Settings
- **Solid Color**: Set a solid background color
- **Gradient**: Create gradient backgrounds
- **Image**: Upload custom background images

## Tips and Best Practices

### For Language Learners
1. Start with Babble mode to explore individual sounds
2. Use Search mode to practice word pronunciation
3. Build sequences in Build mode to practice connected speech
4. Enable "Speak on Button Press" for immediate feedback

### For Teachers
1. Use Kiosk mode for classroom displays
2. Create custom configurations for different lessons
3. Use Game mode for interactive exercises
4. Load remote configurations for consistent setups

### For Speech Professionals
1. Use precise IPA notation with stress markers
2. Customize button layouts for specific client needs
3. Create specialized configurations for different disorders
4. Use Edit mode to add visual cues and images

## Troubleshooting

### Audio Not Playing
1. Check browser audio permissions
2. Ensure speakers/headphones are connected
3. Try refreshing the page
4. Check if Azure TTS is configured properly

### Buttons Not Responding
1. Disable any ad blockers
2. Check if touch dwell is enabled (may cause delays)
3. Try a different browser
4. Clear browser cache

### Configuration Not Loading
1. Check the configuration URL is accessible
2. Verify JSON format is valid
3. Ensure all required fields are present
4. Check browser console for error messages

## Keyboard Shortcuts

- **Kiosk Mode**: `Ctrl+Shift+S` - Open settings
- **General**: `Escape` - Close dialogs
- **Build Mode**: `Enter` - Speak current sequence
- **Search Mode**: `Enter` - Submit search word

## Browser Compatibility

- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Android Chrome
- **Features**: Requires modern browser with Web Audio API support
- **PWA**: Can be installed as a Progressive Web App on mobile devices

## Privacy and Data

- **Local Storage**: Settings and preferences stored locally
- **No Tracking**: No analytics or user tracking
- **Audio Processing**: TTS processing handled by Azure (see Azure privacy policy)
- **Offline**: Basic functionality available offline (cached audio only)
