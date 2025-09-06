import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, TextField, Button, CircularProgress, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { config } from './config';
import ttsService from './services/TTSService';
import notificationService from './services/NotificationService';
import NotificationDisplay from './components/NotificationDisplay';

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
      
      // Clear the message after successful speech
      setMessage('');
      
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

  // Global keydown handler to focus text field when typing
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
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
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: 3
      }}>
        {/* Input area */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          maxWidth: '600px',
          width: '100%'
        }}>
          <TextField
            inputRef={textFieldRef}
            fullWidth
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type IPA phonemes here..."
            variant="outlined"
            size="large"
            autoFocus
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '1.2rem',
                fontFamily: 'monospace'
              }
            }}
            disabled={isLoading}
          />
        </Box>
      </Box>

      {/* Notification Display */}
      <NotificationDisplay />
    </ThemeProvider>
  );
};

export default App;
