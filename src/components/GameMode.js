import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
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
  ListItemIcon
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  School as SchoolIcon,
  Star as StarIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import IPAKeyboard from './IPAKeyboard';
import Confetti from 'react-confetti';
import { gamePhases, getWordVariation } from '../data/gamePhases';

const DIFFICULTY_LEVELS = {
  LEVEL1: { id: 1, name: "All Cues", description: "Written word, IPA model, Audio, and Hints" },
  LEVEL2: { id: 2, name: "Word & Audio", description: "Written word and Audio only" },
  LEVEL3: { id: 3, name: "Audio & Hints", description: "Audio and Greyed-out buttons" },
  LEVEL4: { id: 4, name: "Word Only", description: "Written word only" },
  LEVEL5: { id: 5, name: "Audio Only", description: "Audio cues only" }
};

const GameMode = ({
  onSpeakRequest,
  selectedLanguage,
  selectedRegion,
  voices,
  onLanguageChange,
  onVoiceChange,
  selectedVoice,
  playPhoneme
}) => {
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
  const [buttonSpacing] = useState(() => {
    const saved = localStorage.getItem('buttonSpacing');
    return saved ? parseInt(saved) : 4;
  });
  const [minButtonSize] = useState(() => {
    const saved = localStorage.getItem('minButtonSize');
    return saved ? parseInt(saved) : 60;
  });
  const [layoutMode] = useState(() => {
    const saved = localStorage.getItem('layoutMode');
    return saved || 'grid';
  });
  const [fixedLayout] = useState(() => {
    const saved = localStorage.getItem('fixedLayout');
    return saved === null ? false : saved === 'true';
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
  const [overallProgress, setOverallProgress] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

  // Audio feedback
  const errorSound = new Audio('/error.mp3'); // We'll need to add this sound file

  // Handle phoneme click in game mode
  const handlePhonemeClick = async (phoneme) => {
    if (!currentWord) return;

    // Always speak the phoneme using shared playback logic
    playPhoneme(phoneme);

    const newInput = userInput + phoneme;
    setUserInput(newInput);

    // Get the current word variation with all its accepted forms
    const phase = `phase${currentPhase + 1}`;
    const words = Object.keys(gamePhases[phase].words);
    const variation = getWordVariation(words[currentWordIndex], phase, selectedRegion);
    
    if (!variation) {
      return;
    }

    // Get all accepted IPA forms for this word
    const acceptedForms = [variation.ipa, ...variation.alternatives].map(form => form.toLowerCase());
    const inputIPA = newInput.toLowerCase();

    // Check if the input is a valid prefix of any accepted form
    const isValidPrefix = acceptedForms.some(form => form.startsWith(inputIPA));
    
    if (!isValidPrefix) {
      // Wrong input - play error sound and remove the wrong character
      errorSound.play().catch(() => {}); // Ignore errors if sound fails
      setTimeout(() => setUserInput(userInput), 200); // Remove the wrong character after a brief delay
      setConsecutiveCorrect(0);
      setStreakCount(0);
      return;
    }

    // Check if the answer matches any complete form
    const isComplete = acceptedForms.includes(inputIPA);
    
    if (isComplete) {
      setShowFeedback(true);
      setFeedbackType('success');
      setShowConfetti(true);
      
      // Update mastery and progress
      const newMastery = {
        ...wordMastery,
        [getCurrentWord()]: (wordMastery[getCurrentWord()] || 0) + 1
      };
      setWordMastery(newMastery);
      localStorage.setItem('wordMastery', JSON.stringify(newMastery));

      // Update consecutive correct answers and streak
      const newConsecutiveCorrect = consecutiveCorrect + 1;
      const newStreak = streakCount + 1;
      setConsecutiveCorrect(newConsecutiveCorrect);
      setStreakCount(newStreak);
      
      // Play the complete word
      await playWord(getCurrentWord());
      
      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);

      // Move to next word after a delay
      setTimeout(() => {
        handleNextWord();
      }, 1000);
    }
  };

  // Handle backspace
  // Initialize game state
  useEffect(() => {
    const initializeGame = () => {
      const phase = `phase${currentPhase + 1}`;
      if (gamePhases[phase]) {
        const words = Object.keys(gamePhases[phase].words);
        setWordList(words);
        setCurrentWordIndex(0);
        setCurrentWord(words[0]);
        setShowWordCue(true);
        setUserInput('');
      }
    };
    
    initializeGame();
  }, [currentPhase]);

  // Handle next word and phase transitions
  const handleNextWord = () => {
    setCurrentWordIndex(prev => {
      const nextIndex = prev + 1;
      const currentPhaseWords = Object.keys(gamePhases[`phase${currentPhase + 1}`].words);
      
      if (nextIndex < currentPhaseWords.length) {
        // Move to next word in current phase
        setCurrentWord(currentPhaseWords[nextIndex]);
        setUserInput('');
        setShowFeedback(false);
        setShowIPACue(true);
        return nextIndex;
      } else {
        // Move to next phase
        const nextPhase = currentPhase + 1;
        if (gamePhases[`phase${nextPhase + 1}`]) {
          setCurrentPhase(nextPhase);
          setCurrentWordIndex(0);
          const nextPhaseWords = Object.keys(gamePhases[`phase${nextPhase + 1}`].words);
          setCurrentWord(nextPhaseWords[0]);
          setUserInput('');
          setShowFeedback(false);
          setShowIPACue(true);
          return 0;
        }
        // Game completed
        return prev;
      }
    });
  };

    const shouldDisablePhoneme = useCallback((phoneme) => {
    if (!currentWord || difficulty.id !== DIFFICULTY_LEVELS.LEVEL1.id) {
      return false;
    }
    const phase = `phase${currentPhase + 1}`;
    const words = Object.keys(gamePhases[phase].words);
    const variation = getWordVariation(words[currentWordIndex], phase, selectedRegion);
    
    if (!variation) {
      return false;
    }

    // Use the validPhonemes array to determine which phonemes should be enabled
    return !variation.validPhonemes.includes(phoneme);
  }, [currentWord, difficulty.id, currentPhase, currentWordIndex, selectedRegion]);

  const getCurrentWord = useCallback(() => {
    const phase = `phase${currentPhase + 1}`;
    const words = Object.keys(gamePhases[phase].words);
    const variation = getWordVariation(words[currentWordIndex], phase, selectedRegion);
    return variation ? variation.word : words[currentWordIndex];
  }, [currentPhase, currentWordIndex, selectedRegion]);

  const getCurrentIPA = useCallback(() => {
    const phase = `phase${currentPhase + 1}`;
    const words = Object.keys(gamePhases[phase].words);
    const variation = getWordVariation(words[currentWordIndex], phase, selectedRegion);
    return variation ? variation.ipa : '';
  }, [currentPhase, currentWordIndex, selectedRegion]);

  // Update difficulty and show appropriate cues
  const handleDifficultyChange = useCallback((newDifficulty) => {
    setDifficulty(newDifficulty);
    localStorage.setItem('gameDifficulty', JSON.stringify(newDifficulty));

    setShowIPACue(newDifficulty.id === DIFFICULTY_LEVELS.LEVEL1.id);
    setShowWordCue(true);

    if (currentWord && newDifficulty.id !== DIFFICULTY_LEVELS.LEVEL4.id) {
      onSpeakRequest(getCurrentWord());
    }
  }, [currentWord, onSpeakRequest, getCurrentWord]);

  const playWord = useCallback(async (text) => {
    try {
      await onSpeakRequest(text);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  }, [onSpeakRequest]);

    useEffect(() => {
      if (!gameStarted && currentWord) {
        setShowWordCue(true);
        setGameStarted(true);

      if (difficulty.id !== DIFFICULTY_LEVELS.LEVEL4.id) {
        playWord(getCurrentWord());
      }
    }
    }, [gameStarted, currentWord, difficulty, playWord, getCurrentWord]);

  // Effect to handle adaptive difficulty
  useEffect(() => {
    if (consecutiveCorrect >= 5) {
      const currentLevel = difficulty.id;
      if (currentLevel < DIFFICULTY_LEVELS.LEVEL5.id) {
        handleDifficultyChange(DIFFICULTY_LEVELS[`LEVEL${currentLevel + 1}`]);
      }
      setConsecutiveCorrect(0);
    }
  }, [consecutiveCorrect, difficulty.id, handleDifficultyChange]);

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
                {getCurrentWord()}
                <IconButton
                  size="small"
                  onClick={() => playWord(getCurrentWord())}
                >
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Typography>
              {/* Add IPA model for Level 1 */}
              {difficulty.id === DIFFICULTY_LEVELS.LEVEL1.id && (
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  IPA: {getCurrentIPA()}
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
          buttonSpacing={buttonSpacing}
          selectedLanguage={selectedLanguage}
          minButtonSize={minButtonSize}
          layoutMode={layoutMode}
          fixedLayout={fixedLayout}
          disabledPhonemes={shouldDisablePhoneme}
        />
      </Box>

      {/* Dialogs */}
      {/* Word Cue Modal */}
      <Dialog open={showCue} onClose={() => setShowCue(false)}>
        <DialogTitle>New Word</DialogTitle>
        <DialogContent>
          <Typography variant="h4" gutterBottom>
            {getCurrentWord()}
          </Typography>
          {showIPACue && (
            <Typography variant="subtitle1" color="text.secondary">
              Write this word using these IPA characters: {getCurrentIPA()}
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
            <Typography variant="h4">{getCurrentIPA()}</Typography>
            <IconButton 
              onClick={() => onSpeakRequest?.(getCurrentIPA())}
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
