import React, { useState } from 'react';
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
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { regions } from '../data/gamePhases';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import { phoneticData } from '../data/phonemes';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { exampleLayouts } from '../data/exampleLayouts';

const Settings = ({
  open,
  onClose,
  selectedLanguage,
  selectedVoice,
  onLanguageChange,
  onVoiceChange,
  selectedRegion,
  onRegionChange,
  buttonSpacing,
  onButtonSpacingChange,
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
  showIpaToText,
  onShowIpaToTextChange,
  speakOnButtonPress,
  onSpeakOnButtonPressChange,
  speakWholeUtterance,
  onSpeakWholeUtteranceChange,
  mode,
  onModeChange,
  toolbarConfig,
  onToolbarConfigChange,
}) => {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Helper function to safely update toolbar config
  const handleToolbarConfigChange = (key, value) => {
    if (!value) {
      // Count how many toolbar items are currently visible (excluding settings which is always visible)
      const visibleCount = Object.entries(toolbarConfig || {})
        .filter(([k, v]) => k !== 'showSettings' && v !== false)
        .length;

      // Don't allow disabling if it would leave less than 1 visible item
      if (visibleCount <= 1) {
        return;
      }
    }

    onToolbarConfigChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLanguageChange = (event) => {
    onLanguageChange(event.target.value);
  };

  const handleVoiceChange = (event) => {
    onVoiceChange(event.target.value);
  };

  const handleBackup = async () => {
    try {
      // Collect all localStorage data
      const backupData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          // Try to parse the value as JSON
          backupData[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          // If parsing fails, store as is
          backupData[key] = localStorage.getItem(key);
        }
      }

      // Convert to JSON and create blob
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ipa-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup. Please try again.');
    }
  };

  const validateBackupData = (data) => {
    // Check if it's an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file format');
    }

    // Check for required settings
    const requiredKeys = [
      'selectedLanguage',
      'selectedVoice',
      'buttonScale',
      'buttonSpacing',
      'autoScale'
    ];

    const missingKeys = requiredKeys.filter(key => {
      const value = data[key];
      return value === undefined || value === null;
    });

    if (missingKeys.length > 0) {
      throw new Error(`Missing required settings: ${missingKeys.join(', ')}`);
    }

    // Validate language setting
    if (!phoneticData[data.selectedLanguage]) {
      throw new Error(`Invalid language setting: ${data.selectedLanguage}`);
    }

    return true;
  };

  const applySettings = (backupData) => {
    // Update language first
    if (backupData.selectedLanguage) {
      onLanguageChange(backupData.selectedLanguage);
    }

    // Update voice
    if (backupData.selectedVoice) {
      onVoiceChange(backupData.selectedVoice);
    }

    // Update region
    if (backupData.selectedRegion) {
      onRegionChange(backupData.selectedRegion);
    }

    // Update scale settings
    if (typeof backupData.buttonSpacing === 'number') {
      onButtonSpacingChange(backupData.buttonSpacing);
    }

    // Update accessibility settings
    if (typeof backupData.touchDwellEnabled === 'boolean') {
      onTouchDwellEnabledChange(backupData.touchDwellEnabled);
    }
    if (typeof backupData.touchDwellTime === 'number') {
      onTouchDwellTimeChange(backupData.touchDwellTime);
    }
    if (backupData.dwellIndicatorType) {
      onDwellIndicatorTypeChange(backupData.dwellIndicatorType);
    }
    if (backupData.dwellIndicatorColor) {
      onDwellIndicatorColorChange(backupData.dwellIndicatorColor);
    }
    if (typeof backupData.hapticFeedback === 'boolean') {
      onHapticFeedbackChange(backupData.hapticFeedback);
    }

    // Update speech settings
    if (typeof backupData.speakOnButtonPress === 'boolean') {
      onSpeakOnButtonPressChange(backupData.speakOnButtonPress);
    }
    if (typeof backupData.speakWholeUtterance === 'boolean') {
      onSpeakWholeUtteranceChange(backupData.speakWholeUtterance);
    }

    // Update mode
    if (backupData.ipaMode) {
      onModeChange(backupData.ipaMode);
    }
  };

  const handleRestoreClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setRestoreFile(file);
      setRestoreDialogOpen(true);
    };

    input.click();
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    setRestoreError(null);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target.result);
          
          // Validate backup data
          validateBackupData(backupData);

          // First update language and essential settings
          if (backupData.selectedLanguage) {
            localStorage.setItem('selectedLanguage', JSON.stringify(backupData.selectedLanguage));
            onLanguageChange(backupData.selectedLanguage);
          }

          // Wait a moment for language change to take effect
          await new Promise(resolve => setTimeout(resolve, 100));

          // Reset background settings to default if not included in backup
          if (!backupData.backgroundSettings) {
            const defaultBackground = {
              type: 'color',
              color: '#ffffff',
              gradientStart: '#ffffff',
              gradientEnd: '#000000',
              gradientDirection: 'to bottom',
              image: ''
            };
            localStorage.setItem('backgroundSettings', JSON.stringify(defaultBackground));
            console.log('Reset background settings to default during restore');
          }

          // Then update the rest of localStorage
          Object.entries(backupData).forEach(([key, value]) => {
            if (key !== 'selectedLanguage') { // Skip language since we already set it
              try {
                // Only JSON.stringify objects and booleans, store strings directly
                if (typeof value === 'boolean' || typeof value === 'object') {
                  localStorage.setItem(key, JSON.stringify(value));
                } else {
                  localStorage.setItem(key, value);
                }
              } catch {
                localStorage.setItem(key, value);
              }
            }
          });

          // Then update the state through props
          applySettings(backupData);

          // Close dialog and show loading message
          setRestoreDialogOpen(false);
          
          // Show success message
          alert('Settings restored successfully! The page will now reload to apply all changes.');
          
          // Reload the page after a delay
          setTimeout(() => {
            window.location.reload();
          }, 200);

        } catch (error) {
          console.error('Error restoring backup:', error);
          setRestoreError(error.message || 'Failed to restore backup. The file might be corrupted.');
          setIsRestoring(false);
        }
      };

      reader.readAsText(restoreFile);
    } catch (error) {
      console.error('Error reading backup file:', error);
      setRestoreError('Failed to read backup file.');
      setIsRestoring(false);
    }
  };

  const handleExampleLoad = async (example) => {
    try {
      const response = await fetch(`/examples/${example}.json`);
      const data = await response.json();
      validateBackupData(data);

      // First update language and essential settings
      if (data.selectedLanguage) {
        localStorage.setItem('selectedLanguage', JSON.stringify(data.selectedLanguage));
        onLanguageChange(data.selectedLanguage);
      }

      // Wait a moment for language change to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reset background settings to default if not included in example
      if (!data.backgroundSettings) {
        const defaultBackground = {
          type: 'color',
          color: '#ffffff',
          gradientStart: '#ffffff',
          gradientEnd: '#000000',
          gradientDirection: 'to bottom',
          image: ''
        };
        localStorage.setItem('backgroundSettings', JSON.stringify(defaultBackground));
        console.log('Reset background settings to default when loading example');
      }

      // Then update the rest of localStorage, but force mode to "build"
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'selectedLanguage') { // Skip language since we already set it
          try {
            // Force mode to "build" when loading examples
            const finalValue = key === 'ipaMode' ? 'build' : value;
            // Only JSON.stringify objects and booleans, store strings directly
            if (typeof finalValue === 'boolean' || typeof finalValue === 'object') {
              localStorage.setItem(key, JSON.stringify(finalValue));
              if (key === 'ipaCustomizations') {
                console.log('Stored IPA customizations for example:', Object.keys(finalValue).length, 'phonemes');
              }
            } else {
              localStorage.setItem(key, finalValue);
            }
          } catch {
            // Force mode to "build" when loading examples
            const finalValue = key === 'ipaMode' ? 'build' : value;
            localStorage.setItem(key, finalValue);
          }
        }
      });

      // Force mode to build when loading examples
      onModeChange('build');

      // Then update the state through props, but force mode to "build"
      const modifiedData = { ...data, ipaMode: 'build' };
      applySettings(modifiedData);

      // Close settings dialog if open
      onClose();

      // Show success message
      alert('Example loaded successfully into build mode! The page will now reload to apply all changes.');

      // Reload the page after a delay to ensure IPA customizations are applied
      setTimeout(() => {
        window.location.reload();
      }, 200);

    } catch (error) {
      console.error('Error loading example:', error);
      alert('Failed to load example.');
    }
  };

  const handleRestoreCancel = () => {
    setRestoreDialogOpen(false);
    setRestoreFile(null);
    setRestoreError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <List>
            {/* Backup & Restore */}
            <ListItem>
              <Box sx={{ width: '100%', display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<BackupIcon />}
                  onClick={handleBackup}
                  fullWidth
                >
                  Backup Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  onClick={handleRestoreClick}
                  fullWidth
                >
                  Restore Settings
                </Button>
              </Box>
            </ListItem>

            <ListItem>
              <Box sx={{ width: '100%' }}>
                <Card
                  variant="outlined"
                  sx={{
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 600
                      }}
                    >
                      📁 Load Example Configurations
                    </Typography>

                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 1.5,
                      justifyItems: 'center',
                      '@media (max-width: 600px)': {
                        gridTemplateColumns: 'repeat(2, 1fr)'
                      }
                    }}>
                      {exampleLayouts.map((ex, idx) => (
                        <Box
                          key={ex.file}
                          onClick={() => handleExampleLoad(ex.file)}
                          sx={{
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'scale(1.05)'
                            },
                            '&:active': {
                              transform: 'scale(0.95)'
                            }
                          }}
                        >
                          <Box
                            sx={{
                              width: 70,
                              height: 70,
                              borderRadius: 2,
                              overflow: 'hidden',
                              mb: 0.5,
                              border: '2px solid',
                              borderColor: 'primary.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'background.paper',
                              '@media (max-width: 600px)': {
                                width: 60,
                                height: 60
                              }
                            }}
                          >
                            <img
                              src={ex.thumb}
                              alt={ex.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            {ex.name}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </ListItem>

            <Divider />

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
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Layout
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Buttons automatically scale to fit your screen for optimal viewing
                </Typography>
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

            {/* Add IPA-to-Text toggle before the Accessibility section */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Display Settings
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showIpaToText}
                      onChange={(e) => onShowIpaToTextChange(e.target.checked)}
                    />
                  }
                  label="Show text conversion"
                />
                <Tooltip title="Display converted text when speaking IPA symbols">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Speech Settings
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={speakOnButtonPress}
                      onChange={(e) => onSpeakOnButtonPressChange(e.target.checked)}
                    />
                  }
                  label="Read each button as you press it (Build Mode)"
                />
                <Tooltip title="Automatically speak each phoneme when clicked in build mode">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={speakWholeUtterance}
                      onChange={(e) => onSpeakWholeUtteranceChange(e.target.checked)}
                    />
                  }
                  label="Read whole utterance as it's built"
                />
                <Tooltip title="Automatically speak the entire message when the message bar is updated in build mode">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Typography variant="h6" gutterBottom>Accessibility</Typography>

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

            <Divider />

            <Typography variant="h6" gutterBottom sx={{ mt: 3, px: 2 }}>Advanced Settings</Typography>

            <ListItem>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Toolbar Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Control which toolbar buttons are visible in the app
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showBuild !== false}
                        onChange={(e) => handleToolbarConfigChange('showBuild', e.target.checked)}
                      />
                    }
                    label="Build Mode"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showSearch !== false}
                        onChange={(e) => handleToolbarConfigChange('showSearch', e.target.checked)}
                      />
                    }
                    label="Search Mode"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showBabble !== false}
                        onChange={(e) => handleToolbarConfigChange('showBabble', e.target.checked)}
                      />
                    }
                    label="Babble Mode"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showEdit !== false}
                        onChange={(e) => handleToolbarConfigChange('showEdit', e.target.checked)}
                      />
                    }
                    label="Edit Mode"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showGame !== false}
                        onChange={(e) => handleToolbarConfigChange('showGame', e.target.checked)}
                      />
                    }
                    label="Game Mode"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={true}
                        disabled={true}
                      />
                    }
                    label="Settings (Always Visible)"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={toolbarConfig?.showSetupWizard !== false}
                        onChange={(e) => handleToolbarConfigChange('showSetupWizard', e.target.checked)}
                      />
                    }
                    label="Setup Wizard"
                  />
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Note: At least one toolbar button must remain visible. The Settings button cannot be hidden.
                  </Typography>
                </Alert>
              </Box>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog 
        open={restoreDialogOpen} 
        onClose={handleRestoreCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore Settings</DialogTitle>
        <DialogContent>
          {restoreError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {restoreError}
            </Alert>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                Are you sure you want to restore settings from backup? This will replace all current settings.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                File: {restoreFile?.name}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleRestoreCancel} 
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRestoreConfirm}
            variant="contained"
            disabled={isRestoring || !!restoreError}
            startIcon={isRestoring ? <CircularProgress size={20} /> : null}
          >
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Settings;
