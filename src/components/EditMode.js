import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const EditMode = ({ open, onClose, phoneme, onSave, currentCustomization, defaultColor, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, backgroundSettings, onBackgroundSave }) => {
  const [hideLabel, setHideLabel] = useState(currentCustomization?.label || false);
  const [hideButton, setHideButton] = useState(currentCustomization?.hidden || false);
  const [imageUrl, setImageUrl] = useState(currentCustomization?.image || '');
  const [customColor, setCustomColor] = useState(currentCustomization?.customColor || defaultColor);
  const [buttonOpacity, setButtonOpacity] = useState(currentCustomization?.opacity !== undefined ? currentCustomization.opacity : 1);
  
  // Background customization states
  const [backgroundType, setBackgroundType] = useState(backgroundSettings?.type || 'color');
  const [backgroundColor, setBackgroundColor] = useState(backgroundSettings?.color || '#ffffff');
  const [gradientStart, setGradientStart] = useState(backgroundSettings?.gradientStart || '#ffffff');
  const [gradientEnd, setGradientEnd] = useState(backgroundSettings?.gradientEnd || '#000000');
  const [gradientDirection, setGradientDirection] = useState(backgroundSettings?.gradientDirection || 'to bottom');
  const [backgroundImage, setBackgroundImage] = useState(backgroundSettings?.image || '');
  const [activeTab, setActiveTab] = useState(phoneme ? 'button' : 'background');

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (phoneme) {
      onSave({
        label: hideLabel,
        hideLabel,
        hidden: hideButton,
        image: imageUrl,
        customColor,
        opacity: buttonOpacity,
      });
    }
    onClose();
  };

  const handleBackgroundSave = () => {
    onBackgroundSave({
      type: backgroundType,
      color: backgroundColor,
      gradientStart,
      gradientEnd,
      gradientDirection,
      image: backgroundImage
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            {phoneme && (
              <>
                <IconButton 
                  onClick={onMoveLeft} 
                  disabled={!canMoveLeft}
                  size="small"
                  sx={{ 
                    width: '24px', 
                    height: '24px',
                    '& .MuiSvgIcon-root': {
                      fontSize: '16px'
                    }
                  }}
                >
                  <KeyboardArrowLeftIcon />
                </IconButton>
                <Typography variant="h6">Edit Button: {phoneme}</Typography>
                <IconButton 
                  onClick={onMoveRight} 
                  disabled={!canMoveRight}
                  size="small"
                  sx={{ 
                    width: '24px', 
                    height: '24px',
                    '& .MuiSvgIcon-root': {
                      fontSize: '16px'
                    }
                  }}
                >
                  <KeyboardArrowRightIcon />
                </IconButton>
              </>
            )}
            {!phoneme && (
              <Typography variant="h6">Edit Background</Typography>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {(phoneme && onBackgroundSave) && (
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
              <Tab label="Button Settings" value="button" />
              <Tab label="Background Settings" value="background" />
            </Tabs>
          )}

          {/* Button customization tab */}
          {(!phoneme || activeTab === 'button') && phoneme && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={hideLabel}
                    onChange={(e) => setHideLabel(e.target.checked)}
                  />
                }
                label="Hide Label"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={hideButton}
                    onChange={(e) => setHideButton(e.target.checked)}
                  />
                }
                label="Hide this IPA Character"
                sx={{ mb: 2, display: 'block' }}
              />

              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>Button Color</Typography>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="body2" gutterBottom>
                    Opacity
                  </Typography>
                  <Slider
                    value={buttonOpacity}
                    onChange={(e, newValue) => setButtonOpacity(newValue)}
                    min={0}
                    max={1}
                    step={0.1}
                    size="small"
                    sx={{ mb: 0.5 }}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageChange}
                />
                <label htmlFor="image-upload">
                  <Button variant="contained" component="span">
                    Choose Image
                  </Button>
                </label>
              </Box>

              {imageUrl && (
                <Box sx={{ mb: 2 }}>
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    style={{ maxWidth: '100%', maxHeight: '200px' }} 
                  />
                  <Button 
                    onClick={() => setImageUrl('')} 
                    color="error" 
                    sx={{ mt: 1 }}
                  >
                    Remove Image
                  </Button>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                fullWidth
              >
                Save Button Changes
              </Button>
            </>
          )}

          {/* Background customization tab */}
          {(!phoneme || activeTab === 'background') && onBackgroundSave && (
            <>
              <Typography variant="h6" gutterBottom>
                Background Settings
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Background Type</InputLabel>
                <Select
                  value={backgroundType}
                  label="Background Type"
                  onChange={(e) => setBackgroundType(e.target.value)}
                >
                  <MenuItem value="color">Solid Color</MenuItem>
                  <MenuItem value="gradient">Gradient</MenuItem>
                  <MenuItem value="image">Image</MenuItem>
                </Select>
              </FormControl>

              {backgroundType === 'color' && (
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>Background Color</Typography>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                  />
                </Box>
              )}

              {backgroundType === 'gradient' && (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Gradient Direction</InputLabel>
                    <Select
                      value={gradientDirection}
                      label="Gradient Direction"
                      onChange={(e) => setGradientDirection(e.target.value)}
                    >
                      <MenuItem value="to bottom">Top to Bottom</MenuItem>
                      <MenuItem value="to right">Left to Right</MenuItem>
                      <MenuItem value="to bottom right">Top-Left to Bottom-Right</MenuItem>
                      <MenuItem value="to bottom left">Top-Right to Bottom-Left</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>Start Color</Typography>
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>End Color</Typography>
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                      }}
                    />
                  </Box>
                </>
              )}

              {backgroundType === 'image' && (
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="background-image-upload"
                    type="file"
                    onChange={handleBackgroundImageChange}
                  />
                  <label htmlFor="background-image-upload">
                    <Button variant="contained" component="span">
                      Choose Background Image
                    </Button>
                  </label>
                  
                  {backgroundImage && (
                    <Box sx={{ mt: 2 }}>
                      <img 
                        src={backgroundImage} 
                        alt="Background Preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }} 
                      />
                      <Button 
                        onClick={() => setBackgroundImage('')} 
                        color="error" 
                        sx={{ mt: 1 }}
                      >
                        Remove Background Image
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackgroundSave}
                fullWidth
              >
                Save Background
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EditMode;
