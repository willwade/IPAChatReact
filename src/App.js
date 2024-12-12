import React, { useState, useEffect } from 'react';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction, TextField, Button, Select, MenuItem, FormControl, Typography, Tooltip, IconButton, Divider } from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SchoolIcon from '@mui/icons-material/School';
import { voicesByLanguage } from './data/phonemes';
import { phoneticData } from './data/phonemes';
import { config } from './config';
import IPAKeyboard from './components/IPAKeyboard';
import EditMode from './components/EditMode';
import Settings from './components/Settings';
import GameMode from './components/GameMode';

const App = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('ipaMode') || 'build');
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('selectedLanguage') || 'en-GB');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('selectedVoice') || '');
  const [buttonScale, setButtonScale] = useState(() => parseFloat(localStorage.getItem('buttonScale')) || 1);
  const [buttonSpacing, setButtonSpacing] = useState(() => parseInt(localStorage.getItem('buttonSpacing')) || 4);
  const [autoScale, setAutoScale] = useState(() => localStorage.getItem('autoScale') === 'true');
  const [touchDwellEnabled, setTouchDwellEnabled] = useState(() => localStorage.getItem('touchDwellEnabled') === 'true');
  const [touchDwellTime, setTouchDwellTime] = useState(() => parseInt(localStorage.getItem('touchDwellTime')) || 800);
  const [dwellIndicatorType, setDwellIndicatorType] = useState(() => localStorage.getItem('dwellIndicatorType') || 'border');
  const [dwellIndicatorColor, setDwellIndicatorColor] = useState(() => localStorage.getItem('dwellIndicatorColor') || 'primary');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('hapticFeedback') === 'true');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [audioCache, setAudioCache] = useState({});
  const [cacheLoading, setCacheLoading] = useState(false);

  const actions = [
    { icon: <MessageIcon />, name: 'Build Mode', onClick: () => setMode('build') },
    { icon: <ChildCareIcon />, name: 'Babble Mode', onClick: () => setMode('babble') },
    { icon: <EditIcon />, name: 'Edit Mode', onClick: () => setMode('edit') },
    { icon: <SportsEsportsIcon />, name: 'Game Mode', onClick: () => setMode('game') },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true) }
  ];

  const fetchVoices = async () => {
    try {
      const response = await config.api.get('/api/voices');
      if (response.data) {
        setAvailableVoices(response.data);
        // Set default voice if available
        if (response.data.length > 0) {
          setSelectedVoice(response.data[0].name);
        }
        setVoicesLoading(false);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      setVoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  // Set initial voice when language changes
  useEffect(() => {
    if (!voicesLoading && availableVoices[selectedLanguage]?.length > 0) {
      const voices = availableVoices[selectedLanguage];
      if (!selectedVoice || !voices.find(v => v.name === selectedVoice)) {
        setSelectedVoice(voices[0].name);
      }
    }
  }, [selectedLanguage, availableVoices, voicesLoading, selectedVoice]);

  useEffect(() => {
    localStorage.setItem('ipaMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem('selectedVoice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('buttonScale', buttonScale);
  }, [buttonScale]);

  useEffect(() => {
    localStorage.setItem('buttonSpacing', buttonSpacing);
  }, [buttonSpacing]);

  useEffect(() => {
    localStorage.setItem('autoScale', autoScale);
  }, [autoScale]);

  useEffect(() => {
    localStorage.setItem('touchDwellEnabled', touchDwellEnabled);
  }, [touchDwellEnabled]);

  useEffect(() => {
    localStorage.setItem('touchDwellTime', touchDwellTime);
  }, [touchDwellTime]);

  useEffect(() => {
    localStorage.setItem('dwellIndicatorType', dwellIndicatorType);
  }, [dwellIndicatorType]);

  useEffect(() => {
    localStorage.setItem('dwellIndicatorColor', dwellIndicatorColor);
  }, [dwellIndicatorColor]);

  useEffect(() => {
    localStorage.setItem('hapticFeedback', hapticFeedback);
  }, [hapticFeedback]);

  // Cache phoneme audio for the current language
  const cachePhonemeAudio = async () => {
    if (!selectedVoice || cacheLoading) return;
    
    setCacheLoading(true);
    const newCache = {};
    
    // Get all phonemes except stress/intonation marks
    const phonemes = Object.values(phoneticData[selectedLanguage].groups)
      .flatMap(group => {
        // Skip the stress group
        if (group.title === 'Stress & Intonation') return [];
        return group.phonemes;
      })
      .filter(phoneme => 
        // Include all IPA characters but exclude arrows and other special marks
        !/[↗↘↑↓|‖]/.test(phoneme)
      );

    console.log('Starting cache for phonemes:', phonemes);
    
    try {
      // Create batches of 3 phonemes to reduce server load
      const batchSize = 3;
      for (let i = 0; i < phonemes.length; i += batchSize) {
        const batch = phonemes.slice(i, i + batchSize);
        await Promise.all(batch.map(async phoneme => {
          try {
            const response = await config.api.post('/api/tts', {
              text: phoneme,
              voice: selectedVoice,
              language: selectedLanguage
            });

            if (response.data?.audio) {
              const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
              // Preload the audio
              await new Promise((resolve, reject) => {
                audio.oncanplaythrough = resolve;
                audio.onerror = reject;
                audio.load();
              });
              newCache[phoneme] = audio;
              console.log(`Cached phoneme: ${phoneme}`);
            }
          } catch (error) {
            console.warn(`Failed to cache phoneme ${phoneme}:`, error.message);
          }
        }));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setAudioCache(newCache);
      console.log('Audio cache completed. Cached phonemes:', Object.keys(newCache).join(', '));
    } catch (error) {
      console.error('Error in audio caching:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  // Update cache when voice or language changes
  useEffect(() => {
    cachePhonemeAudio();
  }, [selectedVoice, selectedLanguage]);

  const handlePhonemeSpeak = async (text) => {
    if (!text || !selectedVoice) return;

    // Skip only special marks
    if (/[↗↘↑↓|‖]/.test(text)) {
      return;
    }

    // Check cache first
    if (audioCache[text]) {
      try {
        // Clone the audio to allow multiple simultaneous playback
        const audioClone = audioCache[text].cloneNode();
        await audioClone.play();
        return;
      } catch (error) {
        console.warn('Error playing cached audio:', error);
      }
    }

    // Fallback to API call if not cached
    try {
      const response = await config.api.post('/api/tts', { 
        text,
        voice: selectedVoice,
        language: selectedLanguage
      });
      
      if (response.data && response.data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        await audio.play();
      }
    } catch (error) {
      console.warn('Error in speech synthesis:', error);
    }
  };

  const handlePhonemeClick = (phoneme) => {
    // Provide immediate UI feedback first
    if (mode === 'build') {
      setMessage(prev => prev + phoneme);
    }
    
    // Then handle the speech synthesis asynchronously
    if (mode === 'babble') {
      // Use requestIdleCallback for non-critical speech synthesis
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => handlePhonemeSpeak(phoneme));
      } else {
        setTimeout(() => handlePhonemeSpeak(phoneme), 0);
      }
    }
  };

  const handleModeChange = (event) => {
    setMode(event.target.value);
    // Clear message when switching from build mode
    if (event.target.value !== 'build') {
      setMessage('');
    }
  };

  const speak = () => {
    handlePhonemeSpeak(message);
  };

  const handleSpeakRequest = async (text) => {
    if (!text || !selectedVoice) return;

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

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    // Reset voice when language changes
    const voices = availableVoices[language] || [];
    if (voices.length > 0) {
      setSelectedVoice(voices[0].name);
    }
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  };

  const handleAutoScaleChange = (autoScale) => {
    setAutoScale(autoScale);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Vertical navigation sidebar */}
      <Box sx={{
        width: '48px',
        borderRight: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1
      }}>
        {/* Mode selection */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}>
          {actions.map((action) => (
            <Tooltip key={action.name} title={action.name} placement="right">
              <IconButton
                onClick={action.onClick}
                color={mode === action.name.toLowerCase().split(' ')[0] ? 'primary' : 'default'}
                sx={{
                  mb: 1,
                  width: '40px',
                  height: '40px',
                  backgroundColor: mode === action.name.toLowerCase().split(' ')[0] ? 'action.selected' : 'transparent',
                  '&:hover': {
                    backgroundColor: mode === action.name.toLowerCase().split(' ')[0] ? 'action.selected' : 'action.hover'
                  }
                }}
              >
                {action.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        {/* Game mode controls */}
        {mode === 'game' && (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            mt: 'auto'
          }}>
            <Divider sx={{ width: '80%', my: 1 }} />
            <Tooltip title="Help" placement="right">
              <IconButton 
                onClick={() => window.dispatchEvent(new CustomEvent('openGameHelp'))}
                sx={{ mb: 1, width: '40px', height: '40px' }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings" placement="right">
              <IconButton 
                onClick={() => window.dispatchEvent(new CustomEvent('openGameSettings'))}
                sx={{ width: '40px', height: '40px' }}
              >
                <SchoolIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Message bar */}
        {mode === 'build' || mode === 'babble' ? (
          <Box sx={{ 
            p: 1.5, 
            display: 'flex', 
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            height: '56px'  
          }}>
            <TextField
              fullWidth
              value={message}
              onChange={(e) => mode === 'build' && setMessage(e.target.value)}
              placeholder="Type or click IPA symbols..."
              disabled={mode === 'babble'}
              size="small"
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: 'text.primary',
                  opacity: 0.7,
                }
              }}
            />
            <Button 
              variant="contained" 
              onClick={speak}
              disabled={!message || mode === 'babble'}
              size="small"
            >
              <VolumeUpIcon />
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setMessage('')}
              disabled={!message || mode === 'babble'}
              size="small"
            >
              <ClearIcon />
            </Button>
          </Box>
        ) : mode === 'edit' ? (
          <Box sx={{ 
            p: 1.5, 
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            height: '56px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Typography variant="body1" color="text.secondary">
              Edit Mode: Click and drag buttons to reorder, or click a button to customize it
            </Typography>
          </Box>
        ) : null}

        {/* Content */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {mode === 'edit' ? (
            <Box sx={{ height: '100%' }}>
              <IPAKeyboard
                mode="edit"
                onPhonemeClick={handlePhonemeClick}
                buttonScale={buttonScale}
                buttonSpacing={buttonSpacing}
                selectedLanguage={selectedLanguage}
                autoScale={autoScale}
                touchDwellEnabled={touchDwellEnabled}
                touchDwellTime={touchDwellTime}
                dwellIndicatorType={dwellIndicatorType}
                dwellIndicatorColor={dwellIndicatorColor}
                hapticFeedback={hapticFeedback}
              />
            </Box>
          ) : mode === 'game' ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <GameMode
                onPhonemeClick={handlePhonemeClick}
                onSpeakRequest={handleSpeakRequest}
                selectedLanguage={selectedLanguage}
                voices={availableVoices}
                onLanguageChange={handleLanguageChange}
                onVoiceChange={setSelectedVoice}
                selectedVoice={selectedVoice}
              />
            </Box>
          ) : (
            <IPAKeyboard
              mode={mode}
              onPhonemeClick={handlePhonemeClick}
              buttonScale={buttonScale}
              buttonSpacing={buttonSpacing}
              selectedLanguage={selectedLanguage}
              autoScale={autoScale}
              touchDwellEnabled={touchDwellEnabled}
              touchDwellTime={touchDwellTime}
              dwellIndicatorType={dwellIndicatorType}
              dwellIndicatorColor={dwellIndicatorColor}
              hapticFeedback={hapticFeedback}
            />
          )}
        </Box>

        {/* Settings dialog */}
        <Settings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          selectedLanguage={selectedLanguage}
          selectedVoice={selectedVoice}
          onLanguageChange={handleLanguageChange}
          onVoiceChange={handleVoiceChange}
          buttonScale={buttonScale}
          onButtonScaleChange={setButtonScale}
          buttonSpacing={buttonSpacing}
          onButtonSpacingChange={setButtonSpacing}
          autoScale={autoScale}
          onAutoScaleChange={setAutoScale}
          touchDwellEnabled={touchDwellEnabled}
          onTouchDwellEnabledChange={setTouchDwellEnabled}
          touchDwellTime={touchDwellTime}
          onTouchDwellTimeChange={setTouchDwellTime}
          dwellIndicatorType={dwellIndicatorType}
          onDwellIndicatorTypeChange={setDwellIndicatorType}
          dwellIndicatorColor={dwellIndicatorColor}
          onDwellIndicatorColorChange={setDwellIndicatorColor}
          hapticFeedback={hapticFeedback}
          onHapticFeedbackChange={setHapticFeedback}
          voices={availableVoices[selectedLanguage] || []}
        />
      </Box>
    </Box>
  );
};

export default App;
