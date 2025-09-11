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
  const [partialIPA, setPartialIPA] = useState('');
  const [completedText, setCompletedText] = useState('');

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

  // Handle text changes with IPA slash parsing logic
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

    // Parse IPA slashes to handle multi-character phonemes
    const parseIPA = (text) => {
      let completed = '';
      let partial = '';
      let inIPA = false;
      let currentIPA = '';
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '/') {
          if (inIPA) {
            // Closing slash - complete the IPA chunk
            completed += currentIPA;
            currentIPA = '';
            inIPA = false;
          } else {
            // Opening slash - start new IPA chunk
            inIPA = true;
            currentIPA = '';
          }
        } else {
          if (inIPA) {
            // Inside IPA chunk
            currentIPA += char;
          } else {
            // Outside IPA, treat as regular text
            completed += char;
          }
        }
      }
      
      // If we're still in an IPA chunk, it's partial
      if (inIPA && currentIPA) {
        partial = '/' + currentIPA;
      }
      
      return { completed, partial };
    };

    const { completed, partial } = parseIPA(newText);
    setCompletedText(completed);
    setPartialIPA(partial);
    setMessage(completed + partial);

    // Check if a new IPA chunk was just completed
    const prevParsed = parseIPA(previousMessage);
    const newCompletedLength = completed.length;
    const prevCompletedLength = prevParsed.completed.length;
    
    if (newCompletedLength > prevCompletedLength) {
      // New phoneme(s) were completed
      const newPhonemes = completed.slice(prevCompletedLength);
      
      // Only speak if settings allow
      if (speakOnButtonPress && (!speakWholeUtterance || !prevParsed.completed)) {
        playPhoneme(newPhonemes);
      }
    }
  };

  // Add effect to speak whole utterance when completed text changes
  useEffect(() => {
    if (speakWholeUtterance && completedText) {
      // Add a small delay to avoid speaking on every character when typing
      const timeoutId = setTimeout(() => {
        speakWholeUtteranceText(completedText);
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    }
  }, [completedText, speakWholeUtterance, speakWholeUtteranceText]);

  const speak = useCallback(async () => {
    if (!completedText.trim()) return;

    setIsLoading(true);
    try {
      // Use TTS service for phoneme sequence synthesis
      await ttsService.synthesizePhonemeSequence(completedText, selectedVoice, selectedLanguage);
      
      // Clear the completed text after successful speech if setting is enabled
      if (clearPhraseOnPlay) {
        setCompletedText('');
        setPartialIPA('');
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
  }, [completedText, selectedVoice, selectedLanguage, clearPhraseOnPlay]);

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
    // Clear all text when entering babble mode
    if (newValue) {
      setMessage('');
      setCompletedText('');
      setPartialIPA('');
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
          {babbleMode ? (
            <TextField
              inputRef={textFieldRef}
              fullWidth
              value=""
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="BABBLE MODE"
              variant="outlined"
              size="large"
              autoFocus
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: calculateFontSize(),
                  fontFamily: 'monospace',
                  padding: '8px 12px',
                  minHeight: 'auto',
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '2px dashed #ff9800',
                  fontStyle: 'italic'
                },
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  padding: 0
                },
                '& .MuiInputBase-input::placeholder': {
                  fontSize: calculateFontSize(),
                  textAlign: 'center',
                  color: '#ff9800',
                  fontWeight: 'bold',
                  opacity: 1
                }
              }}
              disabled={isLoading}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80px',
                height: 'auto',
                border: '1px solid rgba(0, 0, 0, 0.23)',
                borderRadius: '4px',
                padding: '16px 12px',
                fontSize: calculateFontSize(),
                fontFamily: 'monospace',
                textAlign: 'center',
                position: 'relative',
                backgroundColor: 'white',
                cursor: 'text',
                width: '100%',
                flexGrow: 1,
                '&:hover': {
                  border: '1px solid rgba(0, 0, 0, 0.87)'
                },
                '&:focus-within': {
                  border: '2px solid #1976d2',
                  padding: '15px 11px'
                }
              }}
              onClick={() => textFieldRef.current?.focus()}
            >
              {/* Completed text in black */}
              <span style={{ 
                color: 'black',
                fontSize: calculateFontSize(),
                fontFamily: 'monospace'
              }}>
                {completedText}
              </span>
              {/* Partial IPA text in orange */}
              <span style={{ 
                color: '#ff9800', 
                fontWeight: 'bold',
                fontSize: calculateFontSize(),
                fontFamily: 'monospace'
              }}>
                {partialIPA}
              </span>
              {/* Hidden input for text entry */}
              <input
                ref={textFieldRef}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'text',
                  fontSize: calculateFontSize(),
                  border: 'none',
                  outline: 'none',
                  background: 'transparent'
                }}
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={!completedText && !partialIPA ? "Type IPA phonemes here..." : ""}
                disabled={isLoading}
                autoFocus
              />
              {/* Placeholder text when empty */}
              {!completedText && !partialIPA && (
                <span style={{ 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: calculateFontSize(),
                  position: 'absolute',
                  pointerEvents: 'none'
                }}>
                  Type IPA phonemes here...
                </span>
              )}
            </Box>
          )}
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
