import React, { useState, useEffect } from 'react';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction, TextField, Button, Select, MenuItem, FormControl, Typography } from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import IPAKeyboard from './components/IPAKeyboard';
import EditMode from './components/EditMode';
import Settings from './components/Settings';
import GameMode from './components/GameMode';
import { voicesByLanguage } from './data/phonemes';
import { config } from './config';

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

  const handlePhonemeSpeak = async (text) => {
    if (!text || !selectedVoice) return;

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
      console.error('Error in speech synthesis:', error);
      alert(error.message);
    }
  };

  const handlePhonemeClick = (phoneme) => {
    if (mode === 'build') {
      setMessage(prev => {
        const newMessage = prev + phoneme;
        return newMessage;
      });
    } else if (mode === 'babble') {
      handlePhonemeSpeak(phoneme);
    } else if (mode === 'game') {
      // Let GameMode handle the phoneme click
      // onPhonemeClick(phoneme);
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

  const renderMessageBar = () => {
    if (mode === 'build' || mode === 'babble') {
      return (
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}>
          <TextField
            fullWidth
            value={message}
            onChange={(e) => mode === 'build' && setMessage(e.target.value)}
            placeholder="Type or click IPA symbols..."
            disabled={mode === 'babble'}
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
          >
            <VolumeUpIcon />
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setMessage('')}
            disabled={!message || mode === 'babble'}
          >
            <ClearIcon />
          </Button>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Mode selector and settings */}
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'flex-end',
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}>
        <SpeedDial
          ariaLabel="Mode selector"
          sx={{ 
            position: 'relative',
            '& .MuiSpeedDial-fab': { width: 40, height: 40 }
          }}
          icon={<SpeedDialIcon icon={<MoreVertIcon />} />}
          direction="left"
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Box>

      {/* Message bar */}
      {renderMessageBar()}

      {/* Main content area */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {mode === 'edit' ? (
          <Box sx={{ height: '100%' }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              gap: 2,
              alignItems: 'center'
            }}>
              <Typography variant="body1" color="text.secondary">
                Edit Mode: Click and drag buttons to reorder, or click a button to customize it
              </Typography>
            </Box>
            <IPAKeyboard
              mode="edit"
              selectedLanguage={selectedLanguage}
              buttonScale={buttonScale}
              buttonSpacing={buttonSpacing}
              autoScale={autoScale}
              touchDwellEnabled={touchDwellEnabled}
              touchDwellTime={touchDwellTime}
              dwellIndicatorType={dwellIndicatorType}
              dwellIndicatorColor={dwellIndicatorColor}
              hapticFeedback={hapticFeedback}
            />
          </Box>
        ) : mode === 'game' ? (
          <GameMode
            onPhonemeClick={handlePhonemeClick}
            onSpeakRequest={handleSpeakRequest}
            selectedLanguage={selectedLanguage}
            voices={availableVoices}
            onLanguageChange={handleLanguageChange}
            onVoiceChange={setSelectedVoice}
            selectedVoice={selectedVoice}
          />
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
  );
};

export default App;
