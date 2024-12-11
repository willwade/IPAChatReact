import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ChromePicker } from 'react-color';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { phoneticData } from '../data/phonemes';

const IPAKeyboard = ({
  mode = 'build',
  onPhonemeClick,
  disabledPhonemes,
  buttonScale = 1,
  buttonSpacing = 4,
  selectedLanguage = 'en-GB',
  autoScale = true,
  touchDwellEnabled = false,
  touchDwellTime = 800,
  dwellIndicatorType = 'border',
  dwellIndicatorColor = 'primary',
  hapticFeedback = false,
}) => {
  const [customizations, setCustomizations] = useState({});
  const [calculatedScale, setCalculatedScale] = useState(buttonScale);
  const [editMode, setEditMode] = useState(false);
  const [selectedPhoneme, setSelectedPhoneme] = useState(null);
  const [phonemeOrder, setPhonemeOrder] = useState(() => {
    const saved = localStorage.getItem('phonemeOrder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const containerRef = useRef(null);
  const [isJiggling, setIsJiggling] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchPosition, setTouchPosition] = useState(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [currentPhoneme, setCurrentPhoneme] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const animationFrameRef = useRef();
  const longPressTimer = useRef(null);
  const [hoveredPhoneme, setHoveredPhoneme] = useState(null);

  useEffect(() => {
    // Clear any stored customizations that might affect case
    localStorage.removeItem('ipaCustomizations');
    localStorage.removeItem('phonemeOrder');
    
    const saved = localStorage.getItem('ipaCustomizations');
    if (saved) {
      setCustomizations(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Reset jiggling state when mode changes
    setIsJiggling(false);
    setDragEnabled(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoScale) {
      setCalculatedScale(buttonScale);
      return;
    }

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width - 32; // 2rem padding
      const containerHeight = rect.height - 32;

      if (containerWidth <= 0 || containerHeight <= 0) return;

      // Get total buttons for the current language
      const totalButtons = Object.values(phoneticData[selectedLanguage].groups)
        .reduce((sum, group) => sum + group.phonemes.length, 0);

      if (totalButtons <= 0) return;

      // Calculate optimal grid
      const aspectRatio = containerWidth / containerHeight;
      const cols = Math.ceil(Math.sqrt(totalButtons * aspectRatio));
      const rows = Math.ceil(totalButtons / cols);

      // Base button size (60px is our reference size)
      const baseSize = 60;
      
      // Calculate scales
      const scaleX = (containerWidth - (cols - 1) * buttonSpacing) / (cols * baseSize);
      const scaleY = (containerHeight - (rows - 1) * buttonSpacing) / (rows * baseSize);
      
      // Use the smaller scale with a safety margin
      const newScale = Math.min(scaleX, scaleY) * 0.9;
      
      // Clamp scale between 0.5 and 2
      const clampedScale = Math.min(Math.max(newScale, 0.5), 2);

      // Only update if the change is significant
      if (Math.abs(clampedScale - calculatedScale) > 0.05) {
        setCalculatedScale(clampedScale);
      }
    };

    // Debounce the resize observer callback
    let resizeTimeout;
    const debouncedUpdateScale = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateScale, 100);
    };

    // Initial update
    updateScale();

    // Setup resize observer with debouncing
    const resizeObserver = new ResizeObserver(debouncedUpdateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [autoScale, buttonScale, buttonSpacing, selectedLanguage]);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Short vibration
    }
  };

  const handleTouchStart = (e, phoneme) => {
    if (!touchDwellEnabled) return;

    e.preventDefault();
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    setCurrentPhoneme(phoneme);
    setIsSelecting(true);
    setDwellProgress(0);

    const animate = () => {
      const now = Date.now();
      const elapsed = now - touchStartTime;
      const progress = Math.min(elapsed / touchDwellTime, 1);
      setDwellProgress(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (hapticFeedback && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
        onPhonemeClick(phoneme);
        setIsSelecting(false);
        setDwellProgress(0);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleTouchMove = (e) => {
    if (!touchDwellEnabled || !isSelecting) return;

    const touch = e.touches[0];
    const moveThreshold = 20;
    const dx = touch.clientX - touchPosition.x;
    const dy = touch.clientY - touchPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > moveThreshold) {
      cancelDwell();
    }
  };

  const handleTouchEnd = () => {
    if (!touchDwellEnabled) return;
    cancelDwell();
  };

  const cancelDwell = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsSelecting(false);
    setDwellProgress(0);
    setCurrentPhoneme(null);
  };

  const getDwellStyles = (phoneme) => {
    if (!isSelecting || currentPhoneme !== phoneme) return {};

    const baseColor = dwellIndicatorColor;
    const progress = dwellProgress * 100;

    switch (dwellIndicatorType) {
      case 'border':
        return {
          background: `linear-gradient(90deg, ${baseColor} ${progress}%, transparent ${progress}%)`,
          borderColor: baseColor,
        };
      case 'fill':
        return {
          background: `linear-gradient(90deg, ${baseColor}${Math.round(progress * 0.5)}%, transparent ${progress}%)`,
        };
      case 'circle':
        return {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${progress}%`,
            height: `${progress}%`,
            borderRadius: '50%',
            backgroundColor: `${baseColor}40`,
            pointerEvents: 'none',
          },
        };
      default:
        return {};
    }
  };

  const handleLongPress = () => {
    if (mode === 'edit') {
      setIsJiggling(true);
      setDragEnabled(true);
    }
  };

  const handleTouchStartButton = (e) => {
    if (mode === 'edit') {
      e.preventDefault(); // Prevent default touch behavior
      longPressTimer.current = setTimeout(handleLongPress, 500);
    }
  };

  const handleTouchEndButton = (e) => {
    if (longPressTimer.current) {
      e.preventDefault(); // Prevent default touch behavior
      clearTimeout(longPressTimer.current);
    }
  };

  const handlePhonemeClick = (phoneme) => {
    if (mode === 'edit') {
      if (!isJiggling) {
        setSelectedPhoneme(phoneme);
        setEditMode(true);
      }
    } else {
      onPhonemeClick(phoneme);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(Object.values(phoneticData[selectedLanguage].groups)
      .flatMap(group => group.phonemes));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Save the new order
    const newOrder = {};
    items.forEach((item, index) => {
      newOrder[item] = index;
    });
    setPhonemeOrder(newOrder);
    localStorage.setItem('phonemeOrder', JSON.stringify(newOrder));
  };

  const getPhonemeColor = (phoneme) => {
    const languageData = phoneticData[selectedLanguage];
    for (const group of Object.values(languageData.groups)) {
      if (group.phonemes.includes(phoneme)) {
        return group.color;
      }
    }
    return '#808080';
  };

  const renderPhonemeButton = (phoneme, index, groupColor) => {
    const customization = customizations[phoneme] || {};
    const isDisabled = mode === 'game' && disabledPhonemes && disabledPhonemes(phoneme);
    
    // Force lowercase for basic Latin characters but preserve special IPA characters
    const displayPhoneme = phoneme.replace(/[A-Z]/g, char => char.toLowerCase());
    const buttonSize = 60 * calculatedScale;

    // Create the button content
    const buttonContent = (
      <Box sx={{ 
        fontSize: `${24 * calculatedScale}px`,
        fontFamily: "'Noto Sans', 'DejaVu Sans', 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity: customization.hidden ? 0.3 : 1,
        userSelect: 'none',
        textTransform: 'none' // Prevent any automatic text transformation
      }}>
        {displayPhoneme}
      </Box>
    );
    
    return (
      <Button
        key={phoneme}
        variant="contained"
        onClick={() => !isJiggling && !isDisabled && handlePhonemeClick(phoneme)}
        disabled={isDisabled}
        onTouchStart={(e) => handleTouchStart(e, phoneme)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        sx={{
          backgroundColor: customization.customColor || groupColor,
          minWidth: 'unset',
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          margin: `${buttonSpacing/2}px`,
          padding: 0,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: customization.customColor || groupColor,
            filter: 'brightness(0.9)'
          },
          opacity: isDisabled ? 0.5 : 1,
          '&.Mui-disabled': {
            backgroundColor: 'grey.300',
            color: 'grey.500',
          },
          ...getDwellStyles(phoneme)
        }}
      >
        {buttonContent}
      </Button>
    );
  };

  const EditDialog = ({ open, onClose, phoneme }) => {
    const [customization, setCustomization] = useState(() => customizations[phoneme] || {});
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [image, setImage] = useState(customization.image || '');
    const [hideLabel, setHideLabel] = useState(customization.hideLabel || false);
    const [hideButton, setHideButton] = useState(customization.hidden || false);

    const handleSave = () => {
      const newCustomizations = {
        ...customizations,
        [phoneme]: {
          ...customization,
          hideLabel,
          hidden: hideButton,
          customColor: customization.customColor,
          image
        }
      };
      setCustomizations(newCustomizations);
      localStorage.setItem('ipaCustomizations', JSON.stringify(newCustomizations));
      onClose();
    };

    const handleColorChange = (color) => {
      setCustomization(prev => ({
        ...prev,
        customColor: color.hex
      }));
    };

    const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleClearImage = () => {
      setImage('');
    };

    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Edit Phoneme: {phoneme}</DialogTitle>
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
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hideButton}
                  onChange={(e) => setHideButton(e.target.checked)}
                />
              }
              label="Hide Button"
            />
            <Button
              variant="outlined"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              {showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}
            </Button>
            {showColorPicker && (
              <Box sx={{ mt: 1 }}>
                <ChromePicker
                  color={customization.customColor || getPhonemeColor(phoneme)}
                  onChange={handleColorChange}
                />
              </Box>
            )}
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
              {image && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={handleClearImage}
                >
                  Clear Image
                </Button>
              )}
            </Box>
            {image && (
              <Box sx={{ mt: 1 }}>
                <img 
                  src={image} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }} 
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        padding: 2,
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="all-phonemes" direction="horizontal">
          {(provided) => (
            <Box
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: buttonSpacing,
                alignContent: 'flex-start',
                backgroundColor: mode === 'edit' && isJiggling ? 'rgba(0,0,0,0.03)' : 'transparent',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                position: 'relative',
                '& > *': {
                  transition: 'none !important' // Disable transitions that might cause jumping
                }
              }}
            >
              {Object.values(phoneticData[selectedLanguage].groups)
                .flatMap(group => 
                  group.phonemes.map((phoneme, groupIndex) => ({
                    phoneme,
                    color: group.color
                  }))
                )
                .map(({ phoneme, color }, index) => (
                  <Draggable
                    key={phoneme}
                    draggableId={phoneme}
                    index={index}
                    isDragDisabled={!isJiggling}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {renderPhonemeButton(phoneme, index, color)}
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
              
              {mode === 'edit' && isJiggling && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setIsJiggling(false)}
                  sx={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000
                  }}
                >
                  Done
                </Button>
              )}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
      
      {selectedPhoneme && (
        <EditDialog
          open={Boolean(selectedPhoneme)}
          onClose={() => setSelectedPhoneme(null)}
          phoneme={selectedPhoneme}
        />
      )}
    </Box>
  );
};

export default IPAKeyboard;
