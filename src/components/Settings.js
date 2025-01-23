import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  FormHelperText,
} from '@mui/material';
import { regions } from '../data/gamePhases';

const Settings = ({
  open,
  onClose,
  selectedLanguage,
  selectedVoice,
  onLanguageChange,
  onVoiceChange,
  selectedRegion,
  onRegionChange,
  buttonScale,
  onButtonScaleChange,
  buttonSpacing,
  onButtonSpacingChange,
  autoScale,
  onAutoScaleChange,
  touchDwellEnabled,
  onTouchDwellEnabledChange,
  touchDwellTime,
  onTouchDwellTimeChange,
  dwellIndicatorType,
  onDwellIndicatorTypeChange,
  dwellIndicatorColor,
  onDwellIndicatorColorChange,
  hapticFeedback,
  onHapticFeedbackChange,
  voices = [],
}) => {
  const handleLanguageChange = (event) => {
    onLanguageChange(event.target.value);
  };

  const handleVoiceChange = (event) => {
    onVoiceChange(event.target.value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <List>
          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select value={selectedLanguage} onChange={handleLanguageChange} label="Language">
                <MenuItem value="en-GB">English (UK)</MenuItem>
                <MenuItem value="en-US">English (US)</MenuItem>
              </Select>
            </FormControl>
          </ListItem>

          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
              >
                {Object.entries(regions).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Regional variations will affect word choices and pronunciations in game mode
              </FormHelperText>
            </FormControl>
          </ListItem>

          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Voice</InputLabel>
              <Select value={selectedVoice} onChange={handleVoiceChange} label="Voice">
                {Array.isArray(voices) && voices.map((voice) => (
                  <MenuItem key={voice.name} value={voice.name}>
                    {voice.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </ListItem>

          <Divider />

          {/* Layout Settings */}
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={autoScale}
                  onChange={(e) => onAutoScaleChange(e.target.checked)}
                />
              }
              label="Auto-scale buttons to screen"
            />
          </ListItem>

          <ListItem>
            <Box sx={{ width: '100%' }}>
              <Typography gutterBottom>Button Scale</Typography>
              <Slider
                value={buttonScale}
                onChange={(_, value) => onButtonScaleChange(value)}
                min={0.5}
                max={2}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                disabled={autoScale}
              />
            </Box>
          </ListItem>

          <ListItem>
            <Box sx={{ width: '100%' }}>
              <Typography gutterBottom>Button Spacing (px)</Typography>
              <Slider
                value={buttonSpacing}
                onChange={(_, value) => onButtonSpacingChange(value)}
                min={0}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </ListItem>

          <Divider />

          {/* Accessibility Settings */}
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={touchDwellEnabled}
                  onChange={(e) => onTouchDwellEnabledChange(e.target.checked)}
                />
              }
              label="Enable Touch Dwell Selection"
            />
          </ListItem>

          <ListItem>
            <Box sx={{ width: '100%' }}>
              <Typography gutterBottom>Dwell Time (ms)</Typography>
              <Slider
                value={touchDwellTime}
                onChange={(_, value) => onTouchDwellTimeChange(value)}
                min={200}
                max={2000}
                step={100}
                marks
                valueLabelDisplay="auto"
                disabled={!touchDwellEnabled}
              />
            </Box>
          </ListItem>

          <ListItem>
            <FormControl fullWidth disabled={!touchDwellEnabled}>
              <InputLabel>Dwell Indicator Style</InputLabel>
              <Select
                value={dwellIndicatorType}
                onChange={(e) => onDwellIndicatorTypeChange(e.target.value)}
                label="Dwell Indicator Style"
              >
                <MenuItem value="border">Border</MenuItem>
                <MenuItem value="fill">Fill</MenuItem>
                <MenuItem value="circle">Circle</MenuItem>
              </Select>
            </FormControl>
          </ListItem>

          <ListItem>
            <FormControl fullWidth disabled={!touchDwellEnabled}>
              <InputLabel>Dwell Indicator Color</InputLabel>
              <Select
                value={dwellIndicatorColor}
                onChange={(e) => onDwellIndicatorColorChange(e.target.value)}
                label="Dwell Indicator Color"
              >
                <MenuItem value="primary">Primary</MenuItem>
                <MenuItem value="secondary">Secondary</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
              </Select>
            </FormControl>
          </ListItem>

          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={hapticFeedback}
                  onChange={(e) => onHapticFeedbackChange(e.target.checked)}
                  disabled={!touchDwellEnabled}
                />
              }
              label="Enable Haptic Feedback"
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Settings;
