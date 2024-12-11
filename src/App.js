import React, { useState, useEffect } from 'react';
import { Box, SpeedDial, SpeedDialAction, TextField, Button, Select, MenuItem, FormControl } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClearIcon from '@mui/icons-material/Clear';
import MessageIcon from '@mui/icons-material/Message';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IPAKeyboard from './components/IPAKeyboard';
import Settings from './components/Settings';
import { voicesByLanguage } from './data/phonemes';

const App = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('ipaMode') || 'babble');
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('selectedLanguage') || 'en-GB');
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const saved = localStorage.getItem('selectedVoice');
    if (saved) return saved;
    const defaultVoices = voicesByLanguage['en-GB'] || [];
    return defaultVoices.length > 0 ? defaultVoices[0].name : '';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [buttonScale, setButtonScale] = useState(() => {
    const saved = localStorage.getItem('buttonScale');
    return saved ? parseFloat(saved) : 1;
  });
  const [buttonSpacing, setButtonSpacing] = useState(() => {
    const saved = localStorage.getItem('buttonSpacing');
    return saved ? parseInt(saved) : 2;
  });
  const [message, setMessage] = useState('');
  const [autoScale, setAutoScale] = useState(() => {
    const saved = localStorage.getItem('autoScale');
    return saved ? JSON.parse(saved) : true;
  });
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  const actions = [
    { icon: <MessageIcon />, name: 'Build Mode', onClick: () => setMode('build') },
    { icon: <ChildCareIcon />, name: 'Babble Mode', onClick: () => setMode('babble') },
    { icon: <EditIcon />, name: 'Edit Mode', onClick: () => setMode('edit') },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true) }
  ];

  useEffect(() => {
    // Fetch available voices from Azure
    const fetchVoices = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const voices = await response.json();
        
        // Group voices by locale
        const voicesByLocale = voices.reduce((acc, voice) => {
          const locale = voice.locale;
          if (!acc[locale]) {
            acc[locale] = [];
          }
          acc[locale].push(voice);
          return acc;
        }, {});
        
        setAvailableVoices(voicesByLocale);
        setVoicesLoading(false);
      } catch (error) {
        console.error('Error fetching voices:', error);
        setVoicesLoading(false);
      }
    };

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
  }, [selectedLanguage, availableVoices, voicesLoading]);

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

  const handlePhonemeSpeak = async (text) => {
    if (!text || !selectedVoice) return;

    try {
      const response = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          language: selectedLanguage
        }),
      });
      
      if (!response.ok) {
        throw new Error('Speech synthesis failed. Please check your Azure settings.');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      URL.revokeObjectURL(audioUrl); // Clean up the URL after playing
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', bgcolor: '#f5f5f5' }}>
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'hidden' }}>
        {mode === 'build' && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              value={message}
              placeholder="Click buttons to build message..."
              aria-label="IPA Message"
              InputProps={{
                readOnly: true,
                style: {
                  fontFamily: "'Noto Sans', 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif",
                  fontSize: '1.2rem'
                },
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setMessage('')}
                      startIcon={<ClearIcon />}
                      aria-label="Clear message"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={speak}
                      startIcon={<VolumeUpIcon />}
                      aria-label="Speak message"
                    >
                      Speak
                    </Button>
                  </Box>
                ),
              }}
            />
          </Box>
        )}
        
        <IPAKeyboard
          mode={mode}
          onPhonemeClick={handlePhonemeClick}
          buttonScale={buttonScale}
          buttonSpacing={buttonSpacing}
          selectedLanguage={selectedLanguage}
          autoScale={autoScale}
        />
      </Box>

      <SpeedDial
        ariaLabel="Mode Selection"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<MoreVertIcon />}
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

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        buttonScale={buttonScale}
        onButtonScaleChange={setButtonScale}
        buttonSpacing={buttonSpacing}
        onButtonSpacingChange={setButtonSpacing}
        voices={availableVoices[selectedLanguage] || []}
        autoScale={autoScale}
        onAutoScaleChange={setAutoScale}
      />
    </Box>
  );
};

export default App;
