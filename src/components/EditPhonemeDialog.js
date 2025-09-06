import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  FormControlLabel,
  Switch,
  Slider
} from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';

const EditPhonemeDialog = ({
  open,
  onClose,
  phoneme,
  customizations,
  phonemeOrder,
  selectedLanguage,
  getAllPhonemes,
  handlePhonemeMove,
  saveCustomization,
  getPhonemeColor
}) => {
  const customization = customizations[phoneme] || {};
  const [hideLabel, setHideLabel] = useState(customization.hideLabel || false);
  const [hideButton, setHideButton] = useState(customization.hideButton || false);
  const [customColor, setCustomColor] = useState(customization.customColor || null);
  const [buttonOpacity, setButtonOpacity] = useState(
    customization.opacity !== undefined ? customization.opacity : 1
  );
  const [previewSrc, setPreviewSrc] = useState(customization.image || '');
  const [customLabel, setCustomLabel] = useState(customization.label || '');

  const currentOrder = phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage);
  const currentIndex = currentOrder.indexOf(phoneme);
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex < currentOrder.length - 1;

  const handleMoveLeft = () => {
    if (canMoveLeft) {
      handlePhonemeMove(phoneme, 'left');
    }
  };

  const handleMoveRight = () => {
    if (canMoveRight) {
      handlePhonemeMove(phoneme, 'right');
    }
  };

  const handleSave = () => {
    const newCustomization = {
      hideLabel,
      hideButton,
      image: previewSrc,
      customColor,
      opacity: buttonOpacity,
      label: customLabel
    };
    saveCustomization(phoneme, newCustomization);
    onClose();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please choose an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const initialMaxWidth = file.size > 1024 * 1024 ? 150 : 200;
          const compressed = await compressImage(reader.result, initialMaxWidth);
          setPreviewSrc(compressed);
        } catch (error) {
          console.error('Error processing image:', error);
          alert('Error processing image. Please try a different image.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setPreviewSrc('');
  };

  const handleColorChange = (event) => {
    setCustomColor(event.target.value);
  };

  const compressImage = (src, maxWidth) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaleFactor = maxWidth / img.width;
        const width = maxWidth;
        const height = img.height * scaleFactor;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = src;
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 3 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={0.5}>
            <IconButton onClick={handleMoveLeft} disabled={!canMoveLeft} size="small">
              <KeyboardArrowLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Customize: {phoneme}
            </Typography>
            <IconButton onClick={handleMoveRight} disabled={!canMoveRight} size="small">
              <KeyboardArrowRightIcon />
            </IconButton>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControlLabel
            control={<Switch checked={hideLabel} onChange={(e) => setHideLabel(e.target.checked)} />}
            label="Hide Label"
          />
          <FormControlLabel
            control={<Switch checked={hideButton} onChange={(e) => setHideButton(e.target.checked)} />}
            label="Hide Button"
          />
          <TextField
            label="Custom Label"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={`Default: ${phoneme}`}
            fullWidth
            size="small"
            sx={{ maxWidth: '100%', overflow: 'hidden' }}
          />
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id={`image-upload-${phoneme}`}
              />
              <label htmlFor={`image-upload-${phoneme}`}>
                <Button variant="outlined" component="span">
                  Upload Image
                </Button>
              </label>
              {previewSrc && (
                <Button variant="outlined" color="error" onClick={handleClearImage}>
                  Clear Image
                </Button>
              )}
            </Box>
            {previewSrc && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={previewSrc}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }}
                />
              </Box>
            )}
          </Box>

          <Box>
            <Typography gutterBottom>Button Color</Typography>
            <input
              type="color"
              value={customColor || getPhonemeColor(phoneme)}
              onChange={handleColorChange}
              style={{
                width: '100%',
                maxWidth: '100%',
                height: '40px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                boxSizing: 'border-box'
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPhonemeDialog;
