# IPA Minimal Frontend

A simplified version of the IPA Chat React app with a minimal 4x3 grid interface for basic phoneme learning.

## Features

- **Simplified Grid Layout**: 4 columns × 3 rows with 10 essential phonemes
- **Two-State Interaction**: Click once to hear, click again to add to word
- **Word Building**: Build up phoneme sequences and play them as words
- **Essential Phonemes**: 
  - 4 Vowels: /i/, /ɑ/, /u/, /ɛ/
  - 6 Consonants: /p/, /t/, /k/, /s/, /m/, /l/

## How to Run

### Option 1: Quick Start (Recommended)

From the main project directory:
```bash
npm run dev:minimal
```
This will automatically start both the backend and minimal frontend.

### Option 2: Manual Setup

#### Prerequisites
1. Make sure the main backend is running (from the parent directory):
   ```bash
   cd ..
   npm run dev:backend
   ```

#### Running the Minimal Frontend
1. Install dependencies:
   ```bash
   cd minimal
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3002`

### Alternative: Run Both Manually

```bash
# Terminal 1 - Backend (from parent directory)  
cd .. && npm run dev:backend

# Terminal 2 - Minimal Frontend
cd minimal && npm install && npm run dev
```

## Usage

1. **Single Click**: Click any phoneme button to hear the sound and select it (button turns blue)
2. **Double Click**: Click the selected button again to add it to your word queue
3. **Play Button (▶)**: Plays the current word sequence
4. **Reset Button (⟲)**: Clears the word queue
5. **Word Building**: The current word appears at the top as you build it

## Grid Layout

```
/i/  /p/  /ɑ/  /t/
/k/  ▶   ⟲   /s/
/u/  /m/  /ɛ/  /l/
```

The Play and Reset buttons are styled differently (green and red respectively) to distinguish them from phoneme buttons.

## Technical Details

- Uses the same backend API as the full app
- Simplified React app without Material-UI dependencies  
- Responsive design that works on mobile devices
- Shares audio caching and TTS functionality with the main app