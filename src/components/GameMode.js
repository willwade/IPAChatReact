import React, { useState, useEffect, useCallback } from 'react';
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
import Confetti from 'react-confetti';

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
  const [showHelp, setShowHelp] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
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
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [wordMastery, setWordMastery] = useState(() => {
    const saved = localStorage.getItem('wordMastery');
    return saved ? JSON.parse(saved) : {};
  });
  const [phaseProgress, setPhaseProgress] = useState(() => {
    const saved = localStorage.getItem('phaseProgress');
    return saved ? JSON.parse(saved) : {};
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

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
      setConsecutiveCorrect(0);
      setStreakCount(0);
      return;
    }

    // Check if the answer is complete
    if (inputIPA === targetIPA) {
      setShowFeedback(true);
      setFeedbackType('success');
      setShowConfetti(true);
      
      // Update mastery and progress
      const newMastery = {
        ...wordMastery,
        [currentWord.word]: (wordMastery[currentWord.word] || 0) + 1
      };
      setWordMastery(newMastery);
      localStorage.setItem('wordMastery', JSON.stringify(newMastery));

      // Update consecutive correct answers and streak
      const newConsecutiveCorrect = consecutiveCorrect + 1;
      const newStreak = streakCount + 1;
      setConsecutiveCorrect(newConsecutiveCorrect);
      setStreakCount(newStreak);
      
      // Play the complete word
      await playSound(currentWord.word);
      
      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
        handleNextWord();
      }, 2000);
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

  useEffect(() => {
    const handleHelp = () => setShowHelp(true);
    const handleSettings = () => setShowSettings(true);
    
    window.addEventListener('openGameHelp', handleHelp);
    window.addEventListener('openGameSettings', handleSettings);
    
    return () => {
      window.removeEventListener('openGameHelp', handleHelp);
      window.removeEventListener('openGameSettings', handleSettings);
    };
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
    return !currentWord.ipa.includes(phoneme);
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

  // Effect to handle adaptive difficulty
  useEffect(() => {
    if (consecutiveCorrect >= 5) {
      const currentLevel = difficulty.id;
      if (currentLevel < DIFFICULTY_LEVELS.LEVEL5.id) {
        handleDifficultyChange(DIFFICULTY_LEVELS[`LEVEL${currentLevel + 1}`]);
      }
      setConsecutiveCorrect(0);
    }
  }, [consecutiveCorrect, difficulty.id]);

  // Effect to update overall progress
  useEffect(() => {
    const calculateProgress = () => {
      const totalWords = wordList.length;
      const masteredWords = Object.values(wordMastery).filter(count => count > 0).length;
      const newProgress = (masteredWords / totalWords) * 100;
      setOverallProgress(newProgress);
    };
    calculateProgress();
  }, [wordMastery, wordList.length]);

  // Update the progress display in the UI
  const progressDisplay = (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      minWidth: '200px'
    }}>
      <Typography variant="body2" color="text.secondary">
        Progress: {Math.round(overallProgress)}%
      </Typography>
      <Chip 
        label={`Streak: ${streakCount}`}
        color={streakCount >= 5 ? "success" : "default"}
        size="small"
      />
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Top section with progress and word display */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: '56px'  // Match message bar height
      }}>
        {/* Left side: Progress */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          minWidth: '100px'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'nowrap',
              color: 'text.secondary'
            }}
          >
            {currentWordIndex + 1}/{wordList.length}
          </Typography>
          
          <LinearProgress 
            variant="determinate" 
            value={(currentWordIndex / wordList.length) * 100} 
            sx={{ 
              width: '60px',
              height: 4, 
              borderRadius: 2
            }}
          />
        </Box>

        {/* Center: Current word */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}>
          {showWordCue && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 1
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '1.1rem'
                }}
              >
                {currentWord?.word || ''}
                {currentWord && (
                  <IconButton
                    size="small"
                    onClick={() => playSound(currentWord.word)}
                  >
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              {/* Add IPA model for Level 1 */}
              {difficulty.id === DIFFICULTY_LEVELS.LEVEL1.id && currentWord && (
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  IPA: {currentWord.ipa}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Right side: User input and feedback */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: '200px',
          justifyContent: 'flex-end'
        }}>
          <Typography 
            variant="h6" 
            color="primary"
            sx={{ 
              minWidth: '80px',
              textAlign: 'center',
              fontSize: '1.1rem'
            }}
          >
            {userInput || ' '}
          </Typography>

          {showFeedback && (
            <Alert 
              icon={feedbackType === 'success' ? <CheckCircleIcon /> : <CancelIcon />}
              severity={feedbackType}
              sx={{ 
                py: 0,
                minWidth: 'auto',
                '& .MuiAlert-message': {
                  p: 0
                }
              }}
            >
              {feedbackType === 'success' ? 'Correct!' : 'Try again!'}
            </Alert>
          )}
          {progressDisplay}
        </Box>
      </Box>

      {/* Keyboard area */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <IPAKeyboard
          mode="game"
          onPhonemeClick={handlePhonemeClick}
          buttonScale={buttonScale}
          buttonSpacing={buttonSpacing}
          selectedLanguage={selectedLanguage}
          autoScale={autoScale}
          disabledPhonemes={shouldDisablePhoneme}
        />
      </Box>

      {/* Dialogs */}
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

      {/* Help Dialog */}
      <Dialog 
        open={showHelp} 
        onClose={() => setShowHelp(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon />
            How to Play
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Welcome to the IPA Game! Here's how to play:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><StarIcon /></ListItemIcon>
              <ListItemText primary="Listen to or read the target word" />
            </ListItem>
            <ListItem>
              <ListItemIcon><StarIcon /></ListItemIcon>
              <ListItemText primary="Click the IPA symbols to spell out the word's pronunciation" />
            </ListItem>
            <ListItem>
              <ListItemIcon><StarIcon /></ListItemIcon>
              <ListItemText primary="Use the difficulty settings to adjust the challenge level" />
            </ListItem>
          </List>
          <Typography>
            Tip: You can click on any IPA symbol to hear how it sounds!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)}>Got it!</Button>
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
      {showConfetti && (
        <Confetti
          count={100}
          size={20}
          gravity={0.1}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1
          }}
        />
      )}
    </Box>
  );
};

export default GameMode;
