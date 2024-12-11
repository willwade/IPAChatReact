import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Slider, FormControlLabel, Switch } from '@mui/material';
import { phoneticData, voicesByLanguage } from '../data/phonemes';

const Settings = ({ 
  open, 
  onClose, 
  selectedLanguage,
  selectedVoice,
  onLanguageChange,
  onVoiceChange,
  buttonScale,
  onButtonScaleChange,
  buttonSpacing,
  onButtonSpacingChange,
  voices,
  voiceType,
  onVoiceTypeChange,
  autoScale,
  onAutoScaleChange
}) => {
  const languages = Object.keys(phoneticData).map(code => ({
    code,
    name: phoneticData[code].name
  }));

  const getAvailableVoices = () => {
    if (voiceType === 'azure') {
      return voicesByLanguage[selectedLanguage] || [];
    } else {
      // Filter browser voices by language code (e.g., 'en-US', 'en-GB')
      return voices.filter(voice => {
        const voiceLang = voice.lang.toLowerCase();
        return voiceLang.startsWith(selectedLanguage.toLowerCase());
      });
    }
  };

  const availableVoices = getAvailableVoices();

  const handleLanguageChange = (event) => {
    onLanguageChange(event.target.value);
    // Reset selected voice when changing language
    onVoiceChange('');
  };

  const handleVoiceTypeChange = (event) => {
    onVoiceTypeChange(event.target.value);
    // Reset selected voice when changing voice type
    onVoiceChange('');
  };

  const handleVoiceChange = (event) => {
    onVoiceChange(event.target.value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Voice Type</InputLabel>
          <Select
            value={voiceType}
            onChange={handleVoiceTypeChange}
            label="Voice Type"
          >
            <MenuItem value="azure">Azure TTS</MenuItem>
            <MenuItem value="browser">Browser TTS</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            label="Language"
          >
            {languages.map(lang => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Voice</InputLabel>
          <Select
            value={selectedVoice}
            onChange={handleVoiceChange}
            label="Voice"
          >
            {availableVoices.map(voice => (
              <MenuItem 
                key={voiceType === 'azure' ? voice.name : voice.voiceURI} 
                value={voiceType === 'azure' ? voice.name : voice.name}
              >
                {voiceType === 'azure' ? voice.displayName : `${voice.name} (${voice.lang})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={autoScale}
              onChange={(e) => onAutoScaleChange(e.target.checked)}
            />
          }
          label="Auto-scale buttons to fit window"
          sx={{ mt: 2, mb: 1, display: 'block' }}
        />

        {!autoScale && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Button Scale</InputLabel>
            <Slider
              value={parseFloat(buttonScale)}
              onChange={(_, value) => onButtonScaleChange(value.toString())}
              min={0.5}
              max={3}
              step={0.1}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1, label: '1x' },
                { value: 2, label: '2x' },
                { value: 3, label: '3x' }
              ]}
              valueLabelDisplay="auto"
            />
          </FormControl>
        )}

        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel>Button Spacing</InputLabel>
          <Slider
            value={parseInt(buttonSpacing)}
            onChange={(_, value) => onButtonSpacingChange(value.toString())}
            min={0}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Settings;
