import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const DIFFICULTY_LEVELS = {
  LEVEL1: { id: 1, name: "All Cues", description: "Written model, Spoken model, Greyed-out incorrect buttons" },
  LEVEL2: { id: 2, name: "Written & Spoken", description: "Written and Spoken models only" },
  LEVEL3: { id: 3, name: "Written & Hints", description: "Written model and Greyed-out incorrect buttons" },
  LEVEL4: { id: 4, name: "Written Only", description: "Written model only" },
  LEVEL5: { id: 5, name: "No Cues", description: "Free construction" }
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
  const handlePhonemeClick = (phoneme) => {
    if (!currentWord) return;

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
      setTimeout(() => {
        handleNextWord();
      }, 1000);
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
        const response = await fetch('http://localhost:3001/api/words');
        if (!response.ok) {
          throw new Error('Failed to fetch words');
        }
        const words = await response.json();
        setWordList(words);
        // Start with first word
        if (words.length > 0) {
          setCurrentWord(words[0]);
          setShowWordCue(true); // Show the first word automatically
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
    }
  }, [gameStarted, currentWord]);

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
    // Show word cue when difficulty changes
    setShowWordCue(true);
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
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
        <IconButton 
          onClick={() => setShowWordCue(true)}
          sx={{ 
            bgcolor: 'background.paper', 
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'background.paper',
              opacity: 0.9
            }
          }}
        >
          <HelpOutlineIcon />
        </IconButton>
      </Box>

      {/* Difficulty button in top right */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <IconButton 
          onClick={() => setShowSettings(true)}
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
          <SchoolIcon />
        </IconButton>
      </Box>

      {/* Main content area */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        gap: 2,
        p: 2 
      }}>
        {/* Game content */}
        <Box sx={{ flexGrow: 1 }}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {/* Word display area */}
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                {showWordCue && currentWord && (
                  <>
                    <Typography variant="h4" gutterBottom>
                      {currentWord.word}
                    </Typography>
                    {showIPACue && (
                      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Target IPA: {currentWord.ipa}
                      </Typography>
                    )}
                  </>
                )}
                <Typography variant="h5" color="primary">
                  {userInput}
                </Typography>
                {showFeedback && (
                  <Alert 
                    severity={feedbackType === 'success' ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    {feedbackType === 'success' ? 'Correct! Well done!' : 'Try again!'}
                  </Alert>
                )}
              </Box>

              {/* IPA Keyboard */}
              <Box sx={{ mt: 2 }}>
                <IPAKeyboard
                  mode="game"
                  onPhonemeClick={handlePhonemeClick}
                  buttonScale={buttonScale}
                  buttonSpacing={buttonSpacing}
                  selectedLanguage={selectedLanguage}
                  autoScale={autoScale}
                  disabledPhonemes={shouldDisablePhoneme}
                />
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={!userInput}
                    sx={{ minWidth: 120 }}
                  >
                    Backspace
                  </Button>
                </Box>
              </Box>
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
