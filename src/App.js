import React, { useState, useEffect } from 'react';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction, TextField, Button, Select, MenuItem, FormControl } from '@mui/material';
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

const App = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('ipaMode') || 'build');
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
    { icon: <SportsEsportsIcon />, name: 'Game Mode', onClick: () => setMode('game') },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true) }
  ];

  useEffect(() => {
    // Fetch available voices
    const fetchVoices = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const voiceData = await response.json();
        setAvailableVoices(voiceData);
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

  const handleSpeakRequest = (text) => {
    if (!text) return;
    
    // For IPA text, we want to use a specific voice that can handle IPA
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find an English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en-'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 0.8; // Slightly slower for clarity
    window.speechSynthesis.speak(utterance);
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', bgcolor: '#f5f5f5' }}>
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'hidden' }}>
        {mode === 'game' ? (
          <GameMode 
            onPhonemeClick={handlePhonemeClick}
            onSpeakRequest={handleSpeakRequest}
            selectedLanguage={selectedLanguage}
            voices={availableVoices[selectedLanguage] || []}
            onLanguageChange={handleLanguageChange}
            onVoiceChange={handleVoiceChange}
            selectedVoice={selectedVoice}
          />
        ) : mode === 'edit' ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IPAKeyboard
              mode="edit"
              selectedLanguage={selectedLanguage}
              buttonScale={buttonScale}
              buttonSpacing={buttonSpacing}
              autoScale={autoScale}
              onAutoScaleChange={handleAutoScaleChange}
            />
          </Box>
        ) : (
          <>
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
          </>
        )}
      </Box>

      <SpeedDial
        ariaLabel="Menu"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon openIcon={<MoreVertIcon />} />}
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
        selectedVoice={selectedVoice}
        onLanguageChange={handleLanguageChange}
        onVoiceChange={handleVoiceChange}
        buttonScale={buttonScale}
        onButtonScaleChange={(value) => {
          setButtonScale(value);
          localStorage.setItem('buttonScale', value);
        }}
        buttonSpacing={buttonSpacing}
        onButtonSpacingChange={(value) => {
          setButtonSpacing(value);
          localStorage.setItem('buttonSpacing', value);
        }}
        autoScale={autoScale}
        onAutoScaleChange={handleAutoScaleChange}
        voices={availableVoices[selectedLanguage] || []}
      />
    </Box>
  );
};

export default App;
