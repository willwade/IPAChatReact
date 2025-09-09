import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, TextField, Button, CircularProgress, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { config } from './config';
import ttsService from './services/TTSService';
import notificationService from './services/NotificationService';
import NotificationDisplay from './components/NotificationDisplay';

// CSS for the overlay fade animation
const overlayStyles = `
  @keyframes overlayFadeOut {
    0% { opacity: 1; }
    66% { opacity: 1; }
    100% { opacity: 0; }
  }
  .overlay-fade {
    animation: overlayFadeOut 3s ease-in-out forwards;
  }
`;

// Add styles to document head (only once)
if (typeof document !== 'undefined' && !document.getElementById('overlay-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'overlay-styles';
  styleSheet.textContent = overlayStyles;
  document.head.appendChild(styleSheet);
}

const App = () => {
  const textFieldRef = useRef(null);
  const [message, setMessage] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-GB-LibbyNeural');
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [isLoading, setIsLoading] = useState(false);
  const [speakOnButtonPress, setSpeakOnButtonPress] = useState(() => {
    const saved = localStorage.getItem('speakOnButtonPress');
    return saved ? JSON.parse(saved) : false;
  });
  const [speakWholeUtterance, setSpeakWholeUtterance] = useState(() => {
    const saved = localStorage.getItem('speakWholeUtterance');
    return saved ? JSON.parse(saved) : false;
  });
  const [clearPhraseOnPlay, setClearPhraseOnPlay] = useState(() => {
    const saved = localStorage.getItem('clearPhraseOnPlay');
    return saved ? JSON.parse(saved) : true; // Default to true since that's current behavior
  });
  const [babbleMode, setBabbleMode] = useState(() => {
    const saved = localStorage.getItem('babbleMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [overlayMessage, setOverlayMessage] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);

  // Initialize TTS service
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        // Test basic connectivity
        await config.api.get('/api/test');
        console.log('✅ Backend connected');
      } catch (error) {
        console.warn('⚠️ Backend not available, TTS may not work:', error.message);
      }
    };
    
    initializeTTS();
  }, []);

  // Save speech settings to localStorage
  useEffect(() => {
    localStorage.setItem('speakOnButtonPress', JSON.stringify(speakOnButtonPress));
  }, [speakOnButtonPress]);

  useEffect(() => {
    localStorage.setItem('speakWholeUtterance', JSON.stringify(speakWholeUtterance));
  }, [speakWholeUtterance]);

  useEffect(() => {
    localStorage.setItem('clearPhraseOnPlay', JSON.stringify(clearPhraseOnPlay));
  }, [clearPhraseOnPlay]);

  useEffect(() => {
    localStorage.setItem('babbleMode', JSON.stringify(babbleMode));
  }, [babbleMode]);

  // Function for playing single phonemes
  const playPhoneme = useCallback(async (phoneme) => {
    try {
      await ttsService.synthesizePhonemeSequence(phoneme, selectedVoice, selectedLanguage);
    } catch (error) {
      console.error('Phoneme playback failed:', error);
    }
  }, [selectedVoice, selectedLanguage]);

  // Function for speaking whole utterance
  const speakWholeUtteranceText = useCallback(async (text) => {
    if (!text || !selectedVoice) return;

    try {
      await ttsService.synthesizePhonemeSequence(text, selectedVoice, selectedLanguage);
    } catch (error) {
      console.error('Whole utterance TTS failed:', error);
      throw error;
    }
  }, [selectedVoice, selectedLanguage]);

  // Handle text changes with phoneme reading logic
  const handleMessageChange = (newText) => {
    const previousMessage = message;
    
    // In babble mode, don't update the message, just play the sound
    if (babbleMode) {
      if (newText.length > previousMessage.length) {
        const addedChar = newText.slice(-1);
        // Always play phoneme in babble mode, regardless of other settings
        playPhoneme(addedChar);
      }
      return; // Don't update the message state
    }

    setMessage(newText);

    // If text was added (not deleted), check if we should play audio
    if (newText.length > previousMessage.length) {
      const addedChar = newText.slice(-1);
      
      // Only speak individual phoneme if:
      // 1. speakOnButtonPress is enabled AND
      // 2. Either speakWholeUtterance is disabled OR this is the first phoneme (no previous message)
      if (speakOnButtonPress && (!speakWholeUtterance || !previousMessage)) {
        playPhoneme(addedChar);
      }
    }
  };

  // Add effect to speak whole utterance when message changes
  useEffect(() => {
    if (speakWholeUtterance && message) {
      // Add a small delay to avoid speaking on every character when typing
      const timeoutId = setTimeout(() => {
        speakWholeUtteranceText(message);
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    }
  }, [message, speakWholeUtterance, speakWholeUtteranceText]);

  const speak = useCallback(async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      // Use TTS service for phoneme sequence synthesis
      await ttsService.synthesizePhonemeSequence(message, selectedVoice, selectedLanguage);
      
      // Clear the message after successful speech if setting is enabled
      if (clearPhraseOnPlay) {
        setMessage('');
      }
      
      // Refocus the text field after speaking
      setTimeout(() => {
        if (textFieldRef.current) {
          textFieldRef.current.focus();
          // Also try clicking on it to ensure focus
          textFieldRef.current.click();
        }
      }, 10);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      notificationService.showTTSError(error, 'speech synthesis');
    } finally {
      setIsLoading(false);
    }
  }, [message, selectedVoice, selectedLanguage]);

  // Handle Enter key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      speak();
    }
  };

  // Function to show confirmatory overlay
  const showOverlay = useCallback((message) => {
    setOverlayMessage(message);
    // Clear overlay after 3 seconds to match the fade animation
    setTimeout(() => {
      setOverlayMessage('');
    }, 3000);
  }, []);

  // Toggle functions for settings
  const toggleSpeakOnButtonPress = useCallback(() => {
    const newValue = !speakOnButtonPress;
    setSpeakOnButtonPress(newValue);
    showOverlay(`Read each button: ${newValue ? 'ON' : 'OFF'}`);
  }, [speakOnButtonPress, showOverlay]);

  const toggleSpeakWholeUtterance = useCallback(() => {
    const newValue = !speakWholeUtterance;
    setSpeakWholeUtterance(newValue);
    showOverlay(`Read whole utterance: ${newValue ? 'ON' : 'OFF'}`);
  }, [speakWholeUtterance, showOverlay]);

  const toggleClearPhraseOnPlay = useCallback(() => {
    const newValue = !clearPhraseOnPlay;
    setClearPhraseOnPlay(newValue);
    showOverlay(`Clear phrase on play: ${newValue ? 'ON' : 'OFF'}`);
  }, [clearPhraseOnPlay, showOverlay]);

  const toggleBabbleMode = useCallback(() => {
    const newValue = !babbleMode;
    setBabbleMode(newValue);
    showOverlay(`Babble mode: ${newValue ? 'ON' : 'OFF'}`);
    // Clear the message when entering babble mode
    if (newValue) {
      setMessage('');
    }
  }, [babbleMode, showOverlay]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive font size based on content length
  const calculateFontSize = useCallback(() => {
    const currentText = babbleMode ? 'BABBLE MODE' : (message || 'Type IPA phonemes here...');
    const baseSize = 24; // Base font size in px
    const minSize = 12;  // Minimum font size in px
    const maxSize = 48;  // Maximum font size in px
    
    // Calculate ideal size based on text length and viewport
    let fontSize = Math.min(baseSize, windowWidth / (currentText.length * 0.6));
    
    // Clamp between min and max
    fontSize = Math.max(minSize, Math.min(maxSize, fontSize));
    
    return `${fontSize}px`;
  }, [message, babbleMode, windowWidth]);

  // Global keydown handler to focus text field when typing and handle shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            toggleSpeakOnButtonPress();
            return;
          case '2':
            event.preventDefault();
            toggleSpeakWholeUtterance();
            return;
          case '3':
            event.preventDefault();
            toggleClearPhraseOnPlay();
            return;
          case 'b':
          case 'B':
            event.preventDefault();
            toggleBabbleMode();
            return;
        }
      }

      // Don't interfere with special keys or if already focused on an input
      if (event.ctrlKey || event.altKey || event.metaKey || 
          event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA') {
        return;
      }

      // If it's a printable character, focus the text field
      if (event.key.length === 1 && textFieldRef.current) {
        textFieldRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleSpeakOnButtonPress, toggleSpeakWholeUtterance, toggleClearPhraseOnPlay, toggleBabbleMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: 1
      }}>
        {/* Input area */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          width: '100%',
          minHeight: 0
        }}>
          <TextField
            inputRef={textFieldRef}
            fullWidth
            value={babbleMode ? '' : message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={babbleMode ? "BABBLE MODE" : "Type IPA phonemes here..."}
            variant="outlined"
            size="large"
            autoFocus
            sx={{
              '& .MuiInputBase-root': {
                fontSize: calculateFontSize(),
                fontFamily: 'monospace',
                padding: '8px 12px',
                minHeight: 'auto',
                ...(babbleMode && {
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '2px dashed #ff9800',
                  fontStyle: 'italic'
                })
              },
              '& .MuiInputBase-input': {
                textAlign: 'center',
                padding: 0
              },
              '& .MuiInputBase-input::placeholder': {
                fontSize: calculateFontSize(),
                textAlign: 'center',
                ...(babbleMode ? {
                  color: '#ff9800',
                  fontWeight: 'bold',
                  opacity: 1
                } : {})
              }
            }}
            disabled={isLoading}
          />
        </Box>
      </Box>

      {/* Settings Confirmation Overlay */}
      {overlayMessage && (
        <Box 
          className="overlay-fade"
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: `${Math.min(20, windowWidth / 30)}px`,
            fontWeight: 'bold',
            zIndex: 9999,
            maxWidth: '90vw',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}>
          {overlayMessage}
        </Box>
      )}

      {/* Notification Display */}
      <NotificationDisplay />
    </ThemeProvider>
  );
};

export default App;
