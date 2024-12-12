import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Grid } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ChromePicker } from 'react-color';
import { phoneticData } from '../data/phonemes';

const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

const IPAKeyboard = ({
  mode = 'build',
  onPhonemeClick,
  onPhonemeSwap,
  disabledPhonemes,
  buttonScale = 1,
  buttonSpacing = 1,
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
  const [editMode, setEditMode] = useState('move'); 
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPhoneme, setDraggedPhoneme] = useState(null);
  const [draggedElement, setDraggedElement] = useState(null);
  const [gridColumns, setGridColumns] = useState(8);

  const calculateOptimalGrid = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Account for container padding
    const effectiveWidth = containerWidth - (buttonSpacing * 4);  // 2x padding on each side
    const effectiveHeight = containerHeight - (buttonSpacing * 4);
    
    // Get total number of buttons
    const totalButtons = Object.values(phoneticData[selectedLanguage].groups)
      .reduce((sum, group) => sum + group.phonemes.length, 0);

    // Calculate button size including spacing
    const buttonSizeWithSpacing = 60 + (buttonSpacing * 2);

    // Calculate maximum possible columns that fit in width
    const maxColumns = Math.floor(effectiveWidth / buttonSizeWithSpacing);
    
    let bestColumns = maxColumns;
    let bestRatio = Infinity;
    
    for (let cols = 1; cols <= maxColumns; cols++) {
      const rows = Math.ceil(totalButtons / cols);
      const gridWidth = cols * buttonSizeWithSpacing;
      const gridHeight = rows * buttonSizeWithSpacing;
      
      // Compare with effective container dimensions
      const ratio = Math.abs((gridWidth / gridHeight) - (effectiveWidth / effectiveHeight));
      
      if (ratio < bestRatio && gridHeight <= effectiveHeight) {  // Ensure grid fits in height
        bestRatio = ratio;
        bestColumns = cols;
      }
    }

    // Calculate final scale to fit within container
    const gridWidth = bestColumns * buttonSizeWithSpacing;
    const rows = Math.ceil(totalButtons / bestColumns);
    const gridHeight = rows * buttonSizeWithSpacing;
    
    setGridColumns(bestColumns);
  }, [buttonSpacing, selectedLanguage]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        calculateOptimalGrid();
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial calculation
    calculateOptimalGrid();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateOptimalGrid]);

  useEffect(() => {
    calculateOptimalGrid();
  }, [calculateOptimalGrid, autoScale, buttonScale]);

  useEffect(() => {
    const saved = localStorage.getItem('ipaCustomizations');
    if (saved) {
      try {
        const parsedCustomizations = JSON.parse(saved);
        setCustomizations(parsedCustomizations);
      } catch (e) {
        console.error('Error loading customizations:', e);
      }
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
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll('.MuiButton-root');
    if (buttons.length > 1) {
      const button1 = buttons[0].getBoundingClientRect();
      const button2 = buttons[1].getBoundingClientRect();
      const actualSpacing = button2.left - (button1.left + button1.width);
      console.log('Actual spacing between buttons:', actualSpacing);
    }
  }, [buttonSpacing, gridColumns]);

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
      const padding = Math.round(buttonSpacing);
      const containerWidth = Math.floor(rect.width - (padding * 2));
      const containerHeight = Math.floor(rect.height - (padding * 2));

      if (containerWidth <= 0 || containerHeight <= 0) return;

      // Get total buttons for the current language
      const totalButtons = Object.values(phoneticData[selectedLanguage].groups)
        .reduce((sum, group) => sum + group.phonemes.length, 0);

      if (totalButtons <= 0) return;

      // Calculate grid dimensions
      const buttonWidth = 60;
      const buttonHeight = 40;
      const gap = Math.round(buttonSpacing);
      
      // Calculate optimal grid based on container size
      const maxPossibleCols = Math.floor((containerWidth + gap) / (buttonWidth + gap));
      
      // Try to make grid more square-like for better visual appearance
      const targetAspectRatio = containerWidth / containerHeight;
      const cols = Math.min(maxPossibleCols, Math.ceil(Math.sqrt(totalButtons * targetAspectRatio)));
      const rows = Math.ceil(totalButtons / cols);

      // Calculate total grid size including gaps
      const totalGridWidth = Math.floor((cols * buttonWidth) + ((cols - 1) * gap));
      const totalGridHeight = Math.floor((rows * buttonHeight) + ((rows - 1) * gap));

      // Calculate the maximum possible scale
      const scaleX = containerWidth / totalGridWidth;
      const scaleY = containerHeight / totalGridHeight;
      
      // Use the smaller scale with a safety margin
      const newScale = Math.min(scaleX, scaleY) * 0.98;
      
      console.log('Scale calculation:', {
        containerWidth,
        containerHeight,
        totalGridWidth,
        totalGridHeight,
        cols,
        rows,
        scaleX,
        scaleY,
        newScale,
        gap
      });

      requestAnimationFrame(() => {
        setCalculatedScale(newScale);
        setGridColumns(cols);
      });
    };

    const debouncedUpdateScale = debounce(updateScale, 150);

    updateScale();
    window.addEventListener('resize', debouncedUpdateScale);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateScale);
    };
  }, [autoScale, buttonScale, buttonSpacing, selectedLanguage]);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Short vibration
    }
  };

  const handleDragStart = (event, phoneme, element, isTouch = false) => {
    if (editMode !== 'move') return;
    
    if (!isTouch) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setDraggedPhoneme(phoneme);
    setDraggedElement(element);
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    if (!isDragging || editMode !== 'move') return;
    
    event.preventDefault();
    event.stopPropagation();

    const targetButton = event.target.closest('[data-phoneme]');
    if (!targetButton) return;

    const targetPhoneme = targetButton.dataset.phoneme;
    if (targetPhoneme !== draggedPhoneme) {
      setHoveredPhoneme(targetPhoneme);
    }
  };

  const handleDrop = (event) => {
    if (!isDragging || editMode !== 'move') return;
    
    event.preventDefault();
    event.stopPropagation();

    const targetButton = event.target.closest('[data-phoneme]');
    if (!targetButton) return;

    const targetPhoneme = targetButton.dataset.phoneme;
    if (targetPhoneme !== draggedPhoneme) {
      onPhonemeSwap?.(draggedPhoneme, targetPhoneme);
    }

    setIsDragging(false);
    setDraggedPhoneme(null);
    setDraggedElement(null);
    setHoveredPhoneme(null);
  };

  const handleTouchStart = (event, phoneme) => {
    if (editMode === 'move') {
      event.preventDefault();
      event.stopPropagation();
      handleDragStart(event.touches[0], phoneme, event.currentTarget, true);
      return;
    }

    if (!touchDwellEnabled) return;

    const touch = event.touches[0];
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
        onPhonemeClick?.(phoneme);
        setIsSelecting(false);
        setDwellProgress(0);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleTouchMove = (event) => {
    if (isDragging && editMode === 'move') {
      event.preventDefault();
      event.stopPropagation();
      
      const touch = event.touches[0];
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetElement) return;

      const targetButton = targetElement.closest('[data-phoneme]');
      if (!targetButton) return;

      const targetPhoneme = targetButton.dataset.phoneme;
      if (targetPhoneme !== draggedPhoneme) {
        setHoveredPhoneme(targetPhoneme);
      }
      return;
    }

    if (!touchDwellEnabled || !isSelecting) return;

    const touch = event.touches[0];
    const moveThreshold = 20;
    const dx = touch.clientX - touchPosition.x;
    const dy = touch.clientY - touchPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > moveThreshold) {
      cancelDwell();
    }
  };

  const handleTouchEnd = (event) => {
    if (isDragging && editMode === 'move') {
      event.preventDefault();
      event.stopPropagation();

      const touch = event.changedTouches[0];
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetElement) return;

      const targetButton = targetElement.closest('[data-phoneme]');
      if (!targetButton) return;

      const targetPhoneme = targetButton.dataset.phoneme;
      if (targetPhoneme !== draggedPhoneme) {
        onPhonemeSwap?.(draggedPhoneme, targetPhoneme);
      }

      setIsDragging(false);
      setDraggedPhoneme(null);
      setDraggedElement(null);
      setHoveredPhoneme(null);
      return;
    }

    if (!touchDwellEnabled) return;
    cancelDwell();
  };

  const handleLongPress = (phoneme) => {
    if (mode === 'edit') {
      setIsJiggling(true);
      setDragEnabled(true);
      // Clear any existing timers
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleMouseDown = (e, phoneme) => {
    if (mode === 'edit') {
      e.preventDefault();
      e.stopPropagation();
      setCurrentPhoneme(phoneme);
      longPressTimer.current = setTimeout(() => handleLongPress(phoneme), 500);
    }
  };

  const handleMouseUp = (e) => {
    if (mode === 'edit') {
      e.preventDefault();
      e.stopPropagation();
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      setCurrentPhoneme(null);
    }
  };

  const handleMouseLeave = (e) => {
    if (mode === 'edit') {
      e.preventDefault();
      e.stopPropagation();
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      setCurrentPhoneme(null);
    }
  };

  const handleTouchStartButton = (e, phoneme) => {
    if (mode === 'edit') {
      e.preventDefault(); // Prevent default touch behavior
      e.stopPropagation(); // Stop event bubbling
      setCurrentPhoneme(phoneme);
      longPressTimer.current = setTimeout(() => handleLongPress(phoneme), 500);
    }
  };

  const handleTouchEndButton = (e) => {
    if (mode === 'edit') {
      e.preventDefault();
      e.stopPropagation();
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      setCurrentPhoneme(null);
    }
  };

  const handlePhonemeClick = (phoneme, e) => {
    if (mode === 'edit') {
      if (!isJiggling) {
        setSelectedPhoneme(phoneme);
        setEditMode(true);
      }
    } else {
      onPhonemeClick?.(phoneme);
    }
  };

  const handleButtonClick = (phoneme) => {
    if (mode === 'edit') {
      if (editMode === 'customize') {
        setSelectedPhoneme(phoneme);
        setEditDialogOpen(true);
      }
    } else {
      onPhonemeClick?.(phoneme);
    }
  };

  const getAllPhonemes = (language) => {
    return Object.values(phoneticData[language].groups)
      .flatMap(group => group.phonemes);
  };

  const getPhonemeColor = (phoneme) => {
    const groups = phoneticData[selectedLanguage].groups;
    for (const group of Object.values(groups)) {
      if (group.phonemes.includes(phoneme)) {
        return group.color;
      }
    }
    return 'inherit';
  };

  const saveCustomization = (phoneme, customization) => {
    const newCustomizations = {
      ...customizations,
      [phoneme]: customization
    };
    setCustomizations(newCustomizations);
    localStorage.setItem('ipaCustomizations', JSON.stringify(newCustomizations));
    setEditMode(false);
    setSelectedPhoneme(null);
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

  const EditPhonemeDialog = ({ open, onClose, phoneme }) => {
    const customization = customizations[phoneme] || {};
    const [hideLabel, setHideLabel] = useState(customization.hideLabel || false);
    const [hideButton, setHideButton] = useState(customization.hideButton || false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [image, setImage] = useState(customization.image || '');
    const [customColor, setCustomColor] = useState(customization.customColor || null);

    const handleColorChange = (color) => {
      setCustomColor(color.hex);
    };

    const handleSave = () => {
      const newCustomization = {
        ...customization,
        hideLabel,
        hideButton,
        image,
        customColor
      };
      saveCustomization(phoneme, newCustomization);
      onClose();
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
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        p: Math.round(buttonSpacing),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Grid 
        container
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, ${60}px)`,
          gap: `${Math.round(buttonSpacing)}px`,
          justifyContent: 'center',
          alignContent: 'center',
          padding: `${Math.round(buttonSpacing)}px`,
          height: 'auto',
          maxHeight: '100%',
          transform: `scale(${autoScale ? calculatedScale : buttonScale})`,
          transformOrigin: 'center center',
          '& .MuiGrid-item': {
            width: '60px !important',
            height: '40px !important',
            padding: '0 !important',
            margin: '0 !important',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        {(phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage)).map((phoneme) => {
          const customization = customizations[phoneme] || {};
          const isDragged = draggedPhoneme === phoneme;
          const groupColor = getPhonemeColor(phoneme);
          const isDisabled = typeof disabledPhonemes === 'function' ? disabledPhonemes(phoneme) : disabledPhonemes?.includes(phoneme);
          
          return (
            <Grid item key={phoneme}>
              <Button
                data-phoneme={phoneme}
                onClick={() => handleButtonClick(phoneme)}
                onMouseDown={(e) => editMode === 'move' && handleDragStart(e, phoneme, e.currentTarget)}
                onTouchStart={(e) => handleTouchStart(e, phoneme)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggable={false}
                disableRipple
                disableTouchRipple
                disableFocusRipple
                disableElevation
                disabled={isDisabled}
                sx={{
                  backgroundColor: customization.customColor || groupColor,
                  color: 'inherit',
                  opacity: isDragged ? 0.3 : (isDisabled ? 0.5 : 1),
                  cursor: isDisabled ? 'not-allowed' : (editMode === 'move' ? 'grab' : 'pointer'),
                  width: '100%',
                  height: '100%',
                  minWidth: 'unset',
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none !important',
                  transform: 'none !important',
                  transition: 'opacity 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                  touchAction: 'none',
                  fontFamily: '"Noto Sans", sans-serif',
                  fontSize: '16px',
                  fontWeight: 400,
                  '&:hover': {
                    backgroundColor: customization.customColor || groupColor,
                    opacity: isDisabled ? 0.5 : 0.8,
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none !important',
                    transform: 'none !important'
                  },
                  '&:active': {
                    cursor: isDisabled ? 'not-allowed' : (editMode === 'move' ? 'grabbing' : 'pointer'),
                    opacity: isDisabled ? 0.5 : 0.6,
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none !important',
                    transform: 'none !important'
                  },
                  '&:focus': {
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none !important',
                    transform: 'none !important'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: customization.customColor || groupColor,
                    opacity: 0.5,
                    color: 'inherit',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none !important',
                    transform: 'none !important'
                  },
                  '&::after, &::before': {
                    display: 'none'
                  },
                  textTransform: 'none'
                }}
              >
                {customization.hideLabel ? (
                  customization.image ? (
                    <img src={customization.image} alt={phoneme} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  ) : null
                ) : (
                  phoneme
                )}
              </Button>
            </Grid>
          );
        })}
      </Grid>

      {mode === 'edit' && (
        <Box sx={{ 
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          p: 1,
          display: 'flex',
          gap: 1
        }}>
          <Button
            variant={editMode === 'move' ? 'contained' : 'outlined'}
            onClick={() => {
              setEditMode('move');
            }}
            size="small"
          >
            Move
          </Button>
          <Button
            variant={editMode === 'customize' ? 'contained' : 'outlined'}
            onClick={() => {
              setEditMode('customize');
            }}
            size="small"
          >
            Customize
          </Button>
        </Box>
      )}

      {selectedPhoneme && (
        <EditPhonemeDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          phoneme={selectedPhoneme}
        />
      )}
    </Box>
  );
};

export default IPAKeyboard;
