import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Slider, FormControlLabel, Switch } from '@mui/material';
import { phoneticData } from '../data/phonemes';

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
  autoScale,
  onAutoScaleChange,
  voices = []
}) => {
  const languages = Object.keys(phoneticData).map(code => ({
    code,
    name: phoneticData[code].name
  }));

  const handleLanguageChange = (event) => {
    if (onLanguageChange) {
      onLanguageChange(event.target.value);
    }
  };

  const handleVoiceChange = (event) => {
    if (onVoiceChange) {
      onVoiceChange(event.target.value);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={selectedLanguage}
            label="Language"
            onChange={handleLanguageChange}
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
            label="Voice"
            onChange={handleVoiceChange}
          >
            {voices.map(voice => (
              <MenuItem key={voice.name} value={voice.name}>
                {voice.displayName}
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
            <InputLabel shrink>Button Scale</InputLabel>
            <Slider
              value={typeof buttonScale === 'number' ? buttonScale : 1}
              onChange={(_, value) => onButtonScaleChange(value)}
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
          <InputLabel shrink>Button Spacing</InputLabel>
          <Slider
            value={typeof buttonSpacing === 'number' ? buttonSpacing : 2}
            onChange={(_, value) => onButtonSpacingChange(value)}
            min={0}
            max={20}
            step={1}
            marks={[
              { value: 0, label: '0px' },
              { value: 5, label: '5px' },
              { value: 10, label: '10px' },
              { value: 20, label: '20px' }
            ]}
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
