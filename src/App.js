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

const voicesByLanguage = {
  'en-GB': [
    { name: 'en-GB-SoniaNeural' },
    { name: 'en-GB-LibbyNeural' },
    // Add more voices for en-GB here...
  ],
  // Add more languages and their corresponding voices here...
};

const App = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('ipaMode') || 'babble');
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceType, setVoiceType] = useState('azure');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [buttonScale, setButtonScale] = useState(() => localStorage.getItem('buttonScale') || '1');
  const [buttonSpacing, setButtonSpacing] = useState(() => localStorage.getItem('buttonSpacing') || '2');
  const [message, setMessage] = useState('');
  const [autoScale, setAutoScale] = useState(() => {
    const saved = localStorage.getItem('autoScale');
    return saved ? JSON.parse(saved) : true;
  });

  const actions = [
    { icon: <MessageIcon />, name: 'Build Mode', onClick: () => setMode('build') },
    { icon: <ChildCareIcon />, name: 'Babble Mode', onClick: () => setMode('babble') },
    { icon: <EditIcon />, name: 'Edit Mode', onClick: () => setMode('edit') },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true) }
  ];

  useEffect(() => {
    // Get browser voices
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
    };
    
    synth.addEventListener('voiceschanged', updateVoices);
    updateVoices();

    return () => synth.removeEventListener('voiceschanged', updateVoices);
  }, []);

  // Set initial voice when language changes or voice type changes
  useEffect(() => {
    if (voiceType === 'azure') {
      const azureVoices = voicesByLanguage[selectedLanguage] || [];
      if (azureVoices.length > 0 && (!selectedVoice || !azureVoices.find(v => v.name === selectedVoice))) {
        setSelectedVoice(azureVoices[0].name);
      }
    } else {
      const browserVoices = availableVoices.filter(voice => 
        voice.lang.toLowerCase().startsWith(selectedLanguage.toLowerCase())
      );
      if (browserVoices.length > 0 && (!selectedVoice || !browserVoices.find(v => v.name === selectedVoice))) {
        setSelectedVoice(browserVoices[0].name);
      }
    }
  }, [selectedLanguage, voiceType, availableVoices]);

  useEffect(() => {
    localStorage.setItem('ipaMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('ipaVoice', selectedVoice);
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
    if (!text) return;

    if (voiceType === 'azure') {
      try {
        const response = await fetch('/api/tts', {
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
          throw new Error(`Speech synthesis failed: ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
      } catch (error) {
        console.error('Error in speech synthesis:', error);
        // Show error to user
        alert('Speech synthesis failed. Please check your Azure settings or try browser speech instead.');
      }
    } else {
      // Browser TTS
      try {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the selected voice or use the first available one
        const voice = availableVoices.find(v => v.name === selectedVoice) || availableVoices[0];
        if (!voice) {
          throw new Error('No voices available for speech synthesis');
        }
        
        utterance.voice = voice;
        utterance.lang = selectedLanguage;
        
        // Cancel any ongoing speech
        synth.cancel();
        
        // Speak the new text
        synth.speak(utterance);
      } catch (error) {
        console.error('Browser speech synthesis error:', error);
        alert('Browser speech synthesis failed. Please try a different browser or use Azure speech.');
      }
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
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setMessage('')}
                      startIcon={<ClearIcon />}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={speak}
                      startIcon={<VolumeUpIcon />}
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
        voices={availableVoices}
        voiceType={voiceType}
        onVoiceTypeChange={setVoiceType}
        autoScale={autoScale}
        onAutoScaleChange={setAutoScale}
      />
    </Box>
  );
};

export default App;
