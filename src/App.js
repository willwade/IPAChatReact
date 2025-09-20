import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, TextField, Button, CircularProgress, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { config } from './config';
import ttsService from './services/TTSService';
import notificationService from './services/NotificationService';
import NotificationDisplay from './components/NotificationDisplay';
import PhonemeIconRow from './components/PhonemeIconRow';
import { processPhonemeInputChange, getDisplayText, removeLastPhoneme, tokenizePhonemes } from './utils/phonemeUtils';

// CSS for the overlay fade animation and scrollbar hiding
const overlayStyles = `
  @keyframes overlayFadeOut {
    0% { opacity: 1; }
    66% { opacity: 1; }
    100% { opacity: 0; }
  }
  .overlay-fade {
    animation: overlayFadeOut 3s ease-in-out forwards;
  }
  .phoneme-container::-webkit-scrollbar {
    display: none;
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
  const [overlayType, setOverlayType] = useState('info'); // 'info' or 'error'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);
  const [phonemes, setPhonemes] = useState([]); // Array of complete phonemes ["a", "tʃ", "b"]
  const [partialPhoneme, setPartialPhoneme] = useState(''); // Current incomplete phoneme "/tʃ"
  const [babblePartial, setBabblePartial] = useState(''); // Track partial phoneme in babble mode
  const [hasEverTyped, setHasEverTyped] = useState(false); // Track if user has ever typed anything
  const [isOverflowing, setIsOverflowing] = useState(false); // Track if text is overflowing
  const textContainerRef = useRef(null);

  // Undo stack state and management
  const [undoStack, setUndoStack] = useState([]);
  const undoStackRef = useRef([]);
  const [lastUndoAction, setLastUndoAction] = useState(null);
  const [multiPhonemeStartState, setMultiPhonemeStartState] = useState(null); // Track start of multi-phoneme
  const maxUndoStackSize = 50; // Limit undo history

  // Action types for undo stack
  const UNDO_ACTION_TYPES = {
    ADD_PHONEME: 'ADD_PHONEME',
    START_MULTI_PHONEME: 'START_MULTI_PHONEME',
    COMPLETE_MULTI_PHONEME: 'COMPLETE_MULTI_PHONEME',
    REMOVE_PHONEME: 'REMOVE_PHONEME',
    CLEAR_ALL: 'CLEAR_ALL',
    SPEAK_CLEAR: 'SPEAK_CLEAR'
  };

  // Helper function to add action to undo stack
  const addToUndoStack = useCallback((actionType, previousState, currentState) => {
    if (babbleMode) return; // Don't track undo in babble mode

    const undoAction = {
      type: actionType,
      timestamp: Date.now(),
      previousState: {
        phonemes: [...previousState.phonemes],
        partialPhoneme: previousState.partialPhoneme
      },
      currentState: {
        phonemes: [...currentState.phonemes],
        partialPhoneme: currentState.partialPhoneme
      }
    };

    setUndoStack(prev => {
      const newStack = [...prev, undoAction];
      // Limit stack size
      const finalStack = newStack.length > maxUndoStackSize ? newStack.slice(-maxUndoStackSize) : newStack;
      undoStackRef.current = finalStack; // Keep ref in sync
      return finalStack;
    });
  }, [babbleMode, maxUndoStackSize]);

  // Undo function
  const performUndo = useCallback(() => {
    const currentStack = undoStackRef.current;

    // Special case: if we're in the middle of a multi-phoneme, undo to start state
    if (partialPhoneme.startsWith('/') && multiPhonemeStartState) {
      setPhonemes(multiPhonemeStartState.phonemes);
      setPartialPhoneme(multiPhonemeStartState.partialPhoneme);
      setMultiPhonemeStartState(null);
      setLastUndoAction(UNDO_ACTION_TYPES.START_MULTI_PHONEME);
      return;
    }

    if (babbleMode || currentStack.length === 0) return;

    const lastAction = currentStack[currentStack.length - 1];

    // Restore previous state
    setPhonemes(lastAction.previousState.phonemes);
    setPartialPhoneme(lastAction.previousState.partialPhoneme);

    // Remove the undone action from stack
    const newStack = currentStack.slice(0, -1);
    setUndoStack(newStack);
    undoStackRef.current = newStack;

    // Set the undo action for overlay feedback
    setLastUndoAction(lastAction.type);
  }, [babbleMode, partialPhoneme, multiPhonemeStartState]);

  // Computed values for display and TTS
  const completedText = phonemes.join(''); // "atʃb" - for TTS (no spaces)
  const displayText = phonemes.join(' ') + (partialPhoneme ? ' ' + partialPhoneme.replace(/^\//, '') : ''); // "a tʃ b" - with spaces for display

  // Render phonemes with alternating colors (CSS will handle truncation)
  const renderPhonemes = () => {
    const colors = ['#003366', '#5577aa']; // Dark blue, light blue (alternating)

    return (
      <>
        { phonemes.map((phoneme, index) => (
          <span
            key={index}
            style={{
              color: colors[index % colors.length],
              fontSize: calculateFontSize(),
              fontFamily: 'monospace',
              marginRight: '4px'
            }}
          >
            {phoneme}
          </span>
        ))}
        { partialPhoneme && (
          <span style={{
            color: '#ff9800',
            fontStyle: 'italic',
            fontSize: calculateFontSize(),
            fontFamily: 'monospace',
            marginLeft: phonemes.length > 0 ? '4px' : '0'
          }}>
            {partialPhoneme.replace(/^\//, '')}
          </span>
        )}
      </>
    );
  };

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

  // Function to show confirmatory overlay
  const showOverlay = useCallback((message, type = 'info') => {
    console.log(`🎯 showOverlay called: "${message}" (${type})`);
    setOverlayMessage(message);
    setOverlayType(type);
    // Clear overlay after 3 seconds to match the fade animation
    setTimeout(() => {
      setOverlayMessage('');
      setOverlayType('info');
    }, 3000);
  }, []);

  // Helper function to get short TTS error messages
  const getTTSErrorMessage = useCallback((error) => {
    const errorData = error.response?.data;

    // Check for invalid phonemes
    if (errorData?.error === 'Speech synthesis failed' &&
        (errorData?.statusCode === 400 || errorData?.details?.includes('400'))) {
      return 'Error: Invalid IPA';
    }

    // Other error types
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'ERROR: Request timeout';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'ERROR: Network error';
    }

    if (error.response?.status >= 500) {
      return 'ERROR: Server error';
    }

    return 'ERROR: text-to-speech failed';
  }, []);

  // Function for playing single phonemes
  const playPhoneme = useCallback(async (phoneme) => {
    try {
      await ttsService.synthesizePhonemeSequence(phoneme, selectedVoice, selectedLanguage);
    } catch (error) {
      console.error('Phoneme playback failed:', error);
      showOverlay(getTTSErrorMessage(error), 'error');
    }
  }, [selectedVoice, selectedLanguage, showOverlay, getTTSErrorMessage]);

  // Function for speaking whole utterance
  const speakWholeUtteranceText = useCallback(async (text) => {
    if (!text || !selectedVoice) return;

    try {
      await ttsService.synthesizePhonemeSequence(text, selectedVoice, selectedLanguage);
    } catch (error) {
      console.error('Whole utterance TTS failed:', error);
      showOverlay(getTTSErrorMessage(error), 'error');
      throw error;
    }
  }, [selectedVoice, selectedLanguage, showOverlay, getTTSErrorMessage]);

  // Handle text changes with phoneme array processing
  const handleMessageChange = (newText) => {
    // In babble mode, we need to handle the full text replacement differently
    if (babbleMode) {
      // Mark that user has typed something (removes placeholder permanently)
      if (!hasEverTyped) {
        setHasEverTyped(true);
      }

      // Start with any existing partial from babble mode
      let currentPartial = '';
      let currentPhonemes = [];

      // If we had a partial phoneme and the new text doesn't start with '/',
      // then this is likely a paste operation that should continue the partial
      if (babblePartial.startsWith('/') && !newText.startsWith('/')) {
        currentPartial = babblePartial;
        // Process the new text as if it's being added to the partial
        for (const char of newText) {
          currentPartial += char;
        }
        setBabblePartial(currentPartial);
        return;
      }

      // If we had a partial phoneme and the new text is just "/",
      // then this is likely completing the phoneme
      if (babblePartial.startsWith('/') && newText === '/') {
        const newPhoneme = babblePartial.slice(1); // Remove leading /
        if (newPhoneme) {
          playPhoneme(newPhoneme).catch(() => {
            // Error is already handled in playPhoneme, just prevent unhandled rejection
          });
        }
        setBabblePartial(''); // Clear the partial
        return;
      }

      // Otherwise, process the entire text from scratch
      for (const char of newText) {
        if (char === '/') {
          if (currentPartial.startsWith('/')) {
            // Closing slash - complete the phoneme
            const newPhoneme = currentPartial.slice(1); // Remove leading /
            if (newPhoneme) {
              currentPhonemes.push(newPhoneme);
              playPhoneme(newPhoneme).catch(() => {
                // Error is already handled in playPhoneme, just prevent unhandled rejection
              });
            }
            currentPartial = '';
          } else {
            // Opening slash - start new phoneme
            currentPartial = '/';
          }
        } else {
          if (currentPartial.startsWith('/')) {
            // Inside a multi-character phoneme - just accumulate characters, don't play them
            currentPartial += char;
          } else {
            // Single character phoneme - add to completed phonemes and play
            currentPhonemes.push(char);
            playPhoneme(char).catch(() => {
              // Error is already handled in playPhoneme, just prevent unhandled rejection
            });
          }
        }
      }

      setBabblePartial(currentPartial); // Update babble partial state
      return;
    }

    // Normal mode processing (not babble mode)
    // Detect if text was added or if we should ignore this change
    if (newText.length < displayText.length) {
      // Text was deleted - ignore this change, backspace handler will deal with it
      return;
    }

    // Check if this is just a re-render of current state
    if (newText === displayText) {
      return;
    }

    // Detect what was actually added
    const addedText = newText.slice(displayText.length);

    if (!addedText) {
      return;
    }

    // Mark that user has typed something (removes placeholder permanently)
    if (!hasEverTyped) {
      setHasEverTyped(true);
    }

    // Store previous state for undo
    const previousState = {
      phonemes: [...phonemes],
      partialPhoneme: partialPhoneme
    };

    // Process the added text
    let currentPartial = partialPhoneme;
    let currentPhonemes = [...phonemes];

    for (const char of addedText) {
      if (char === '/') {
        if (currentPartial.startsWith('/')) {
          // Closing slash - complete the phoneme
          const newPhoneme = currentPartial.slice(1); // Remove leading /
          if (newPhoneme) {
            currentPhonemes.push(newPhoneme);
            // Play phoneme if settings allow (babble mode handled above)
            if (speakOnButtonPress) {
              playPhoneme(newPhoneme).catch(() => {
                // Error is already handled in playPhoneme, just prevent unhandled rejection
              });
            }

            // Create undo action for the entire multi-phoneme sequence
            if (multiPhonemeStartState) {
              const currentState = {
                phonemes: [...currentPhonemes],
                partialPhoneme: ''
              };
              addToUndoStack(UNDO_ACTION_TYPES.COMPLETE_MULTI_PHONEME, multiPhonemeStartState, currentState);
              setMultiPhonemeStartState(null); // Clear the start state
            }
          }
          currentPartial = '';
        } else {
          // Opening slash - start new phoneme, record the starting state
          setMultiPhonemeStartState({
            phonemes: [...currentPhonemes],
            partialPhoneme: currentPartial
          });
          currentPartial = '/';
        }
      } else {
        if (currentPartial.startsWith('/')) {
          // Inside a multi-character phoneme - just accumulate characters, don't play them
          currentPartial += char;
        } else {
          // Single character phoneme - add to completed phonemes and play
          currentPhonemes.push(char);
          // Play phoneme if settings allow (babble mode handled above)
          if (speakOnButtonPress) {
            playPhoneme(char).catch(() => {
              // Error is already handled in playPhoneme, just prevent unhandled rejection
            });
          }

          // Create undo action for single character
          const previousState = {
            phonemes: [...phonemes],
            partialPhoneme: partialPhoneme
          };
          const currentState = {
            phonemes: [...currentPhonemes],
            partialPhoneme: currentPartial
          };
          addToUndoStack(UNDO_ACTION_TYPES.ADD_PHONEME, previousState, currentState);
        }
      }
    }

    // Update state (not babble mode)
    setPhonemes(currentPhonemes);
    setPartialPhoneme(currentPartial);
  };

  // Add effect to speak whole utterance when completed text changes
  useEffect(() => {
    if (speakWholeUtterance && completedText) {
      // Don't speak whole utterance if speakOnButtonPress is also enabled and there's only one phoneme
      // (to avoid double speech of the same phoneme)
      if (speakOnButtonPress && phonemes.length === 1) {
        return;
      }

      // Add a small delay to avoid speaking on every character when typing
      const timeoutId = setTimeout(async () => {
        try {
          await speakWholeUtteranceText(completedText);
        } catch (error) {
          // Error is already handled in speakWholeUtteranceText, just prevent unhandled rejection
          console.log('Whole utterance TTS error caught in useEffect');
        }
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    }
  }, [completedText, speakWholeUtterance, speakWholeUtteranceText, speakOnButtonPress, phonemes.length]);

  const speak = useCallback(async () => {
    if (!completedText.trim()) return;

    // Store previous state before clearing (if we're going to clear)
    const previousState = clearPhraseOnPlay ? {
      phonemes: [...phonemes],
      partialPhoneme: partialPhoneme
    } : null;

    setIsLoading(true);
    try {
      // Use TTS service for phoneme sequence synthesis
      await ttsService.synthesizePhonemeSequence(completedText, selectedVoice, selectedLanguage);

      // Clear the completed text after successful speech if setting is enabled
      if (clearPhraseOnPlay) {
        setPhonemes([]);
        setPartialPhoneme('');

        // Add to undo stack
        const currentState = {
          phonemes: [],
          partialPhoneme: ''
        };
        addToUndoStack(UNDO_ACTION_TYPES.SPEAK_CLEAR, previousState, currentState);
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
      showOverlay(getTTSErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [completedText, selectedVoice, selectedLanguage, clearPhraseOnPlay, phonemes, partialPhoneme, addToUndoStack, UNDO_ACTION_TYPES.SPEAK_CLEAR, showOverlay, getTTSErrorMessage]);

  // Handle special key presses (Enter and Backspace)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      speak();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault(); // Override default backspace behavior
      handlePhonemeBackspace();
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      speak();
    }
  };

  // Handle phoneme-aware backspace
  const handlePhonemeBackspace = () => {
    if (babbleMode) {
      return; // Don't handle backspace in babble mode
    }

    // Store previous state for undo
    const previousState = {
      phonemes: [...phonemes],
      partialPhoneme: partialPhoneme
    };

    // If we have a partial phoneme, remove that first
    if (partialPhoneme) {
      setPartialPhoneme('');

      // Add to undo stack
      const currentState = {
        phonemes: [...phonemes],
        partialPhoneme: ''
      };
      addToUndoStack(UNDO_ACTION_TYPES.REMOVE_PHONEME, previousState, currentState);
      return;
    }

    // If we have completed phonemes, remove the last one
    if (phonemes.length > 0) {
      const newPhonemes = phonemes.slice(0, -1);
      setPhonemes(newPhonemes);

      // Add to undo stack
      const currentState = {
        phonemes: newPhonemes,
        partialPhoneme: partialPhoneme
      };
      addToUndoStack(UNDO_ACTION_TYPES.REMOVE_PHONEME, previousState, currentState);
      return;
    }
  };

  // Effect to show undo feedback
  useEffect(() => {
    if (lastUndoAction) {
      const actionMessages = {
        [UNDO_ACTION_TYPES.ADD_PHONEME]: 'Undid phoneme addition',
        [UNDO_ACTION_TYPES.START_MULTI_PHONEME]: 'Undid multi-phoneme start',
        [UNDO_ACTION_TYPES.COMPLETE_MULTI_PHONEME]: 'Undid multi-phoneme',
        [UNDO_ACTION_TYPES.REMOVE_PHONEME]: 'Undid phoneme deletion',
        [UNDO_ACTION_TYPES.CLEAR_ALL]: 'Undid clear all',
        [UNDO_ACTION_TYPES.SPEAK_CLEAR]: 'Undid speak clear'
      };
      //showOverlay(actionMessages[lastUndoAction] || 'Undid last action');
      setLastUndoAction(null); // Clear the trigger
    }
  }, [lastUndoAction, showOverlay, UNDO_ACTION_TYPES]);

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
      setPhonemes([]);
      setPartialPhoneme('');
      setBabblePartial('');
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

  // Calculate font size 
  const calculateFontSize = useCallback(() => {
    const baseSize = 48; // Base font size in px
    const minSize = 36;  // Minimum readable font size in px
    const maxSize = 64;  // Maximum font size in px

    // For short text, allow larger fonts, but don't shrink below minimum
    const currentText = babbleMode ? 'Babble Mode' : (displayText || 'Type sounds...');
    
    if (currentText.length < 10) {
      let fontSize = Math.min(baseSize, windowWidth / (currentText.length * 0.6));
      return `${Math.max(minSize, Math.min(maxSize, fontSize))}px`;
    }

    return `${baseSize}px`;
  }, [displayText, babbleMode, windowWidth]);

  // Check if text is overflowing and update alignment
  const checkOverflow = useCallback(() => {
    if (textContainerRef.current) {
      const container = textContainerRef.current;
      const isCurrentlyOverflowing = container.scrollWidth > container.clientWidth;
      setIsOverflowing(isCurrentlyOverflowing);
    }
  }, []);

  // Check overflow whenever content changes
  useEffect(() => {
    checkOverflow();
  }, [phonemes, partialPhoneme, windowWidth, checkOverflow]);

  // Maintain focus on text input
  useEffect(() => {
    const maintainFocus = () => {
      if (textFieldRef.current && document.activeElement !== textFieldRef.current) {
        textFieldRef.current.focus();
      }
    };

    // Focus immediately
    maintainFocus();

    // Set up interval to check focus periodically
    const focusInterval = setInterval(maintainFocus, 100);

    return () => clearInterval(focusInterval);
  }, [phonemes, partialPhoneme]);

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
          case 'Backspace':
            event.preventDefault();
            if (!babbleMode) {
              // Store previous state for undo
              const previousState = {
                phonemes: [...phonemes],
                partialPhoneme: partialPhoneme
              };

              setPhonemes([]);
              setPartialPhoneme('');

              // Add to undo stack if there was something to clear
              if (previousState.phonemes.length > 0 || previousState.partialPhoneme) {
                const currentState = {
                  phonemes: [],
                  partialPhoneme: ''
                };
                addToUndoStack(UNDO_ACTION_TYPES.CLEAR_ALL, previousState, currentState);
              }
            }
            return;
          case 'z':
          case 'Z':
            event.preventDefault();
            const currentStack = undoStackRef.current;
            if (!babbleMode && currentStack.length > 0) {
              performUndo();
            }
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
        backgroundColor: '#f5f5f5'
        // padding: 0
      }}>
        {/* Input area */}
        <Box sx={{
          display: 'flex',
          // gap: 1,
          alignItems: 'stretch', // Changed from 'center' to 'stretch'
          width: '100%',
          flex: 1, // Take all available space in the column
          backgroundColor: 'transparent' // INPUT AREA CONTAINER
        }}>
          {babbleMode ? (
            <TextField
              inputRef={textFieldRef}
              fullWidth
              value=""
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
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
                  padding: 0,
                  caretColor: 'transparent'
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
                position: 'relative',
                height: '100%',
                width: '100%',
                backgroundColor: 'transparent' // PHONEME CONTAINER WRAPPER
              }}
              onClick={() => {
                if (textFieldRef.current) {
                  textFieldRef.current.focus();
                }
              }}
            >
              <PhonemeIconRow
                style={{ height: '100%' }}
                phonemes={phonemes}
                partialPhoneme={partialPhoneme}
                windowWidth={windowWidth}
                onPhonemePlay={(phoneme) => {
                  if (!babbleMode) {
                    playPhoneme(phoneme).catch(() => {
                      // Error handled in playPhoneme
                    });
                  }
                }}
                onPhonemeClick={(phoneme, index) => {
                  // Refocus the input after clicking a phoneme
                  setTimeout(() => {
                    if (textFieldRef.current) {
                      textFieldRef.current.focus();
                    }
                  }, 0);
                  console.log('Phoneme clicked:', phoneme, 'at index:', index);
                }}
                iconSize={Math.min(
                  Math.max(60, window.innerHeight * 0.9), // 90% of viewport height for 95% row
                  windowWidth / 8 // Allow wider icons for better utilization
                )}
              />

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
                  background: 'transparent',
                  pointerEvents: 'none'
                }}
                value={displayText}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyPress={handleKeyPress}
                placeholder=""
                disabled={isLoading}
                autoFocus
              />
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
            backgroundColor: overlayType === 'error' ? 'rgba(211, 47, 47, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: `${Math.min(20, windowWidth / 30)}px`,
            fontWeight: 'bold',
            zIndex: 9999,
            maxWidth: '90vw',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            // gap: '8px'
          }}>
          {overlayType === 'error' ? (
            <ErrorOutlineIcon sx={{ fontSize: `${Math.min(20, windowWidth / 30)}px` }} />
          ) : (
            <InfoOutlinedIcon sx={{ fontSize: `${Math.min(20, windowWidth / 30)}px` }} />
          )}
          {overlayMessage}
        </Box>
      )}

      {/* Notification Display */}
      <NotificationDisplay minimal={window.innerWidth < 500 || window.innerHeight < 400} />
    </ThemeProvider>
  );
};

export default App;
