import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { SketchPicker } from 'react-color';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const EditMode = ({ open, onClose, phoneme, onSave, currentCustomization, defaultColor, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight }) => {
  const [hideLabel, setHideLabel] = useState(currentCustomization?.label || false);
  const [hideButton, setHideButton] = useState(currentCustomization?.hidden || false);
  const [imageUrl, setImageUrl] = useState(currentCustomization?.image || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [customColor, setCustomColor] = useState(currentCustomization?.customColor || defaultColor);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      label: hideLabel,
      hideLabel,
      hidden: hideButton,
      image: imageUrl,
      customColor,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton 
              onClick={onMoveLeft} 
              disabled={!canMoveLeft}
              size="small"
            >
              <KeyboardArrowLeftIcon />
            </IconButton>
            <Typography variant="h6">Edit Button: {phoneme}</Typography>
            <IconButton 
              onClick={onMoveRight} 
              disabled={!canMoveRight}
              size="small"
            >
              <KeyboardArrowRightIcon />
            </IconButton>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
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
            <Box
              sx={{
                width: '100%',
                height: '40px',
                backgroundColor: customColor,
                cursor: 'pointer',
                border: '1px solid #ccc',
                borderRadius: 1,
                mb: 1
              }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <SketchPicker
                  color={customColor}
                  onChange={(color) => setCustomColor(color.hex)}
                />
              </Box>
            )}
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
            Save Changes
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EditMode;
