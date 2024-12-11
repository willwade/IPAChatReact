import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Paper,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Container,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Slider,
  Divider
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowForward as ArrowForwardIcon,
  School as SchoolIcon,
  Star as StarIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import IPAKeyboard from './IPAKeyboard';
import { config } from '../config';

const DIFFICULTY_LEVELS = {
  LEVEL1: { id: 1, name: "All Cues", description: "Written word, IPA model, Audio, and Hints" },
  LEVEL2: { id: 2, name: "Word & Audio", description: "Written word and Audio only" },
  LEVEL3: { id: 3, name: "Audio & Hints", description: "Audio and Greyed-out buttons" },
  LEVEL4: { id: 4, name: "Word Only", description: "Written word only" },
  LEVEL5: { id: 5, name: "Audio Only", description: "Audio cues only" }
};

const GameMode = ({ onPhonemeClick, onSpeakRequest, selectedLanguage, voices, onLanguageChange, onVoiceChange, selectedVoice }) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showWordCue, setShowWordCue] = useState(false);
  const [showCue, setShowCue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem('gameDifficulty');
    return saved ? JSON.parse(saved) : DIFFICULTY_LEVELS.LEVEL1;
  });
  const [error, setError] = useState(null);
  const [buttonScale, setButtonScale] = useState(() => {
    const saved = localStorage.getItem('buttonScale');
    return saved ? parseFloat(saved) : 1;
  });
  const [buttonSpacing, setButtonSpacing] = useState(() => {
    const saved = localStorage.getItem('buttonSpacing');
    return saved ? parseInt(saved) : 4;
  });
  const [autoScale, setAutoScale] = useState(() => {
    const saved = localStorage.getItem('autoScale');
    return saved ? JSON.parse(saved) : true;
  });
  const [currentWord, setCurrentWord] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [wordList, setWordList] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [showIPACue, setShowIPACue] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');

  // Audio feedback
  const errorSound = new Audio('/error.mp3'); // We'll need to add this sound file

  // Handle phoneme click in game mode
  const handlePhonemeClick = async (phoneme) => {
    if (!currentWord) return;

    // Always speak the phoneme when clicked
    await playSound(phoneme);

    const newInput = userInput + phoneme;
    setUserInput(newInput);

    // Check if the new input is a prefix of the target IPA (case-insensitive)
    const targetIPA = currentWord.ipa.toLowerCase();
    const inputIPA = newInput.toLowerCase();
    
    if (!targetIPA.startsWith(inputIPA)) {
      // Wrong input - play error sound and remove the wrong character
      errorSound.play().catch(() => {}); // Ignore errors if sound fails
      setTimeout(() => setUserInput(userInput), 200); // Remove the wrong character after a brief delay
      return;
    }

    // Check if the answer is complete
    if (inputIPA === targetIPA) {
      setShowFeedback(true);
      setFeedbackType('success');
      
      // Play the complete word
      await playSound(currentWord.word);
      
      setTimeout(() => {
        handleNextWord();
      }, 1500); // Increased delay to allow for word playback
    }

    if (onPhonemeClick) {
      onPhonemeClick(phoneme);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    setUserInput(prev => prev.slice(0, -1));
  };

  // Handle next word
  const handleNextWord = () => {
    setCurrentWordIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex < wordList.length) {
        setCurrentWord(wordList[nextIndex]);
        setUserInput('');
        setShowFeedback(false);
        setShowIPACue(true);
        return nextIndex;
      }
      // Game completed
      return prev;
    });
  };

  useEffect(() => {
    // Add keyboard event listener for backspace
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load word list on mount
  useEffect(() => {
    const loadWordList = async () => {
      try {
        const response = await config.api.get('/api/words');
        if (response.data) {
          setWordList(response.data);
          if (response.data.length > 0) {
            setCurrentWord(response.data[0]);
            setShowWordCue(true); // Show the first word automatically
          }
        }
      } catch (error) {
        setError('Failed to load words. Please try again.');
      }
    };
    loadWordList();
  }, []);

  // Show word cue on game start and when difficulty changes
  useEffect(() => {
    if (!gameStarted && currentWord) {
      setShowWordCue(true);
      setGameStarted(true);
      
      // Play the word audio based on difficulty level
      if (difficulty.id !== DIFFICULTY_LEVELS.LEVEL4.id) {
        playSound(currentWord.word);
      }
    }
  }, [gameStarted, currentWord, difficulty]);

  // Check if a phoneme should be disabled based on current word and difficulty
  const shouldDisablePhoneme = (phoneme) => {
    if (!currentWord || difficulty.id !== DIFFICULTY_LEVELS.LEVEL1.id) {
      return false;
    }
    // Convert both strings to lowercase for case-insensitive comparison
    const targetIPA = currentWord.ipa.toLowerCase();
    const testPhoneme = phoneme.toLowerCase();
    return !targetIPA.includes(testPhoneme);
  };

  const handleButtonScaleChange = (newScale) => {
    setButtonScale(newScale);
    localStorage.setItem('buttonScale', newScale);
  };

  const handleButtonSpacingChange = (newSpacing) => {
    setButtonSpacing(newSpacing);
    localStorage.setItem('buttonSpacing', newSpacing);
  };

  const handleAutoScaleChange = (newAutoScale) => {
    setAutoScale(newAutoScale);
    localStorage.setItem('autoScale', JSON.stringify(newAutoScale));
  };

  // Update difficulty and show appropriate cues
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    localStorage.setItem('gameDifficulty', JSON.stringify(newDifficulty));
    
    // Show/hide IPA cue based on difficulty
    setShowIPACue(newDifficulty.id === DIFFICULTY_LEVELS.LEVEL1.id);
    
    // Show word cue when difficulty changes
    setShowWordCue(true);
    
    // Play the word audio for audio-enabled difficulty levels
    if (currentWord && newDifficulty.id !== DIFFICULTY_LEVELS.LEVEL4.id) {
      playSound(currentWord.word);
    }
  };

  const playSound = async (text) => {
    try {
      console.log('Making TTS request:', {
        text,
        voice: selectedVoice,
        language: selectedLanguage
      });

      const response = await config.api.post('/api/tts', { 
        text,
        voice: selectedVoice,
        language: selectedLanguage
      });
      
      console.log('TTS response:', response.data);
      
      if (response.data && response.data.audio) {
        console.log('Creating audio from base64');
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        console.log('Playing audio');
        await audio.play();
        console.log('Audio playback complete');
      } else {
        console.error('No audio data in response:', response.data);
      }
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Progress bar */}
      <Box sx={{ width: '100%', height: '4px', bgcolor: '#e3f2fd' }}>
        <Box
          sx={{
            width: `${(currentWordIndex / (wordList?.length || 1)) * 100}%`,
            height: '100%',
            bgcolor: '#2196f3',
            transition: 'width 0.3s ease'
          }}
        />
      </Box>

      {/* Help button in top left */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
        <IconButton 
          onClick={() => setShowWordCue(true)}
          size="small"
          sx={{ 
            bgcolor: 'background.paper', 
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'background.paper',
              opacity: 0.9
            }
          }}
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Difficulty button in top right */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        <IconButton 
          onClick={() => setShowSettings(true)}
          size="small"
          sx={{ 
            bgcolor: 'background.paper', 
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'background.paper',
              opacity: 0.9
            }
          }}
          aria-label="Difficulty Settings"
        >
          <SchoolIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Main content area */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        p: 1,
        position: 'relative'
      }}>
        {/* Game content */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0 // Important for proper flex behavior
        }}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {/* Word display area */}
              <Box sx={{ mb: 1, textAlign: 'center', flexShrink: 0 }}>
                {showWordCue && currentWord && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {(difficulty.id !== DIFFICULTY_LEVELS.LEVEL5.id) && (
                      <>
                        <Typography variant="h5" component="span">
                          {currentWord.word}
                        </Typography>
                        <IconButton 
                          onClick={() => playSound(currentWord.word)}
                          size="small"
                          aria-label="Play word"
                        >
                          <VolumeUpIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                )}
                {showIPACue && (
                  <Typography variant="body2" color="text.secondary">
                    Target IPA: {currentWord?.ipa}
                  </Typography>
                )}
                <Typography variant="h6" color="primary" sx={{ mt: 0.5 }}>
                  {userInput}
                </Typography>
              </Box>

              {/* IPA Keyboard */}
              <Box sx={{ 
                flexGrow: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <IPAKeyboard
                  mode="game"
                  onPhonemeClick={handlePhonemeClick}
                  buttonScale={buttonScale}
                  buttonSpacing={buttonSpacing}
                  selectedLanguage={selectedLanguage}
                  autoScale={autoScale}
                  disabledPhonemes={shouldDisablePhoneme}
                />
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={!userInput}
                    size="small"
                    sx={{ minWidth: 100 }}
                  >
                    Backspace
                  </Button>
                </Box>
              </Box>

              {/* Feedback Alert - Positioned absolutely */}
              {showFeedback && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    minWidth: '200px',
                    animation: 'fadeInOut 1.5s ease-in-out',
                    '@keyframes fadeInOut': {
                      '0%': { opacity: 0, transform: 'translate(-50%, -40%)' },
                      '15%': { opacity: 1, transform: 'translate(-50%, -50%)' },
                      '85%': { opacity: 1, transform: 'translate(-50%, -50%)' },
                      '100%': { opacity: 0, transform: 'translate(-50%, -60%)' }
                    }
                  }}
                >
                  <Alert 
                    severity={feedbackType === 'success' ? 'success' : 'error'}
                    sx={{
                      boxShadow: 3,
                      '& .MuiAlert-message': {
                        fontSize: '1.1rem',
                        fontWeight: 500
                      }
                    }}
                  >
                    {feedbackType === 'success' ? 'Correct! Well done!' : 'Try again!'}
                  </Alert>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Word Cue Modal */}
      <Dialog open={showCue} onClose={() => setShowCue(false)}>
        <DialogTitle>New Word</DialogTitle>
        <DialogContent>
          <Typography variant="h4" gutterBottom>
            {currentWord?.word}
          </Typography>
          {showIPACue && currentWord && (
            <Typography variant="subtitle1" color="text.secondary">
              Write this word using these IPA characters: {currentWord.ipa}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCue(false)}>Start</Button>
        </DialogActions>
      </Dialog>

      {/* IPA Help Modal */}
      <Dialog
        open={showCue}
        onClose={() => setShowCue(false)}
        sx={{
          '& .MuiDialog-paper': {
            position: 'absolute',
            top: '40%'
          }
        }}
      >
        <DialogTitle>IPA Transcription</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">{currentWord?.ipa}</Typography>
            <IconButton 
              onClick={() => onSpeakRequest?.(currentWord?.ipa)}
              sx={{ mt: 2 }}
            >
              <VolumeUpIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCue(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Difficulty Settings Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            Game Difficulty
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {Object.values(DIFFICULTY_LEVELS).map((level) => (
              <ListItem
                key={level.id}
                button
                selected={difficulty.id === level.id}
                onClick={() => handleDifficultyChange(level)}
              >
                <ListItemText
                  primary={level.name}
                  secondary={level.description}
                />
                {difficulty.id === level.id && <CheckCircleIcon color="primary" />}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            right: 8, 
            zIndex: 1 
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default GameMode;
