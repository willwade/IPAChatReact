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
  const [isDragging, setIsDragging] = useState(false);

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
    if (!autoScale) {
      setCalculatedScale(buttonScale);
      return;
    }

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      // Get container dimensions
      const rect = container.getBoundingClientRect();
      
      // Account for top elements (assuming ~120px for top elements)
      const topOffset = 120;
      const availableHeight = window.innerHeight - topOffset;
      const containerWidth = rect.width - 32; // 2rem padding
      const containerHeight = Math.min(rect.height - 32, availableHeight);

      if (containerWidth <= 0 || containerHeight <= 0) return;

      // Get total buttons for the current language
      const totalButtons = Object.values(phoneticData[selectedLanguage].groups)
        .reduce((sum, group) => sum + group.phonemes.length, 0);

      if (totalButtons <= 0) return;

      // Calculate optimal grid
      const aspectRatio = containerWidth / containerHeight;
      const cols = Math.ceil(Math.sqrt(totalButtons * aspectRatio));
      const rows = Math.ceil(totalButtons / cols);

      // Calculate the maximum possible scale
      const scaleX = (containerWidth - (cols - 1) * buttonSpacing) / (cols * 60);
      const scaleY = (containerHeight - (rows - 1) * buttonSpacing) / (rows * 60);
      
      // Use the smaller scale with a safety margin
      const newScale = Math.min(scaleX, scaleY) * 0.9;
      
      // Clamp scale between 0.5 and 1.5
      const clampedScale = Math.min(Math.max(newScale, 0.5), 1.5);

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

    // Also observe window resize for mobile orientation changes
    window.addEventListener('resize', debouncedUpdateScale);

    return () => {
      clearTimeout(resizeTimeout);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdateScale);
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
      onPhonemeClick(phoneme);
    }
  };

  const handleDragStart = (result) => {
    setIsDragging(true);
    // Trigger haptic feedback if available
    if (hapticFeedback && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);
    if (!result.destination) return;

    // Trigger haptic feedback if available
    if (hapticFeedback && window.navigator.vibrate) {
      window.navigator.vibrate([30, 30, 30]);
    }

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

  useEffect(() => {
    if (!touchDwellEnabled || !currentPhoneme || isJiggling) return;

    let startTime = Date.now();
    let animationId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / touchDwellTime, 1);
      setDwellProgress(progress);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        handleLongPress(currentPhoneme);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentPhoneme, touchDwellEnabled, touchDwellTime, isJiggling]);

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

    return (
      <Box
        key={phoneme}
        sx={{
          position: 'relative',
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          backgroundColor: customization.customColor || groupColor,
          border: '2px solid',
          borderColor: 'transparent',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          fontSize: `${16 * calculatedScale}px`,
          fontFamily: "'Noto Sans', 'DejaVu Sans', 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif",
          userSelect: 'none',
          '&:hover': {
            borderColor: mode === 'edit' ? 'primary.main' : 'transparent',
            filter: 'brightness(0.9)'
          }
        }}
        onClick={() => !isJiggling && !isDisabled && handlePhonemeClick(phoneme)}
      >
        {!customization.hideLabel && (
          <Box sx={{ 
            position: 'relative',
            zIndex: 2,
            fontSize: `${24 * calculatedScale}px`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textTransform: 'none'
          }}>
            {displayPhoneme}
          </Box>
        )}
        {customization.image && (
          <img 
            src={customization.image} 
            alt={phoneme}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '80%',
              maxHeight: '80%',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        )}
      </Box>
    );
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        touchAction: 'none', // Prevent default touch behaviors
      }}
    >
      {/* Remove the old spacing box that was adding extra space */}
      {/* Keyboard area */}
      <Box sx={{
        flex: 1,
        minHeight: 0,
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
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
                  position: 'relative'
                }}
              >
                {Object.values(phoneticData[selectedLanguage].groups)
                  .flatMap(group => group.phonemes)
                  .sort((a, b) => (phonemeOrder[a] || 0) - (phonemeOrder[b] || 0))
                  .map((phoneme, index) => {
                    const isDisabled = disabledPhonemes && disabledPhonemes(phoneme);
                    const customization = customizations[phoneme] || {};
                    if (customization.hideButton) return null;

                    return (
                      <Draggable 
                        key={phoneme} 
                        draggableId={phoneme} 
                        index={index}
                        isDragDisabled={!isJiggling}
                      >
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onMouseDown={(e) => handleMouseDown(e, phoneme)}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={(e) => handleTouchStartButton(e, phoneme)}
                            onTouchEnd={handleTouchEndButton}
                            onClick={(e) => handlePhonemeClick(phoneme, e)}
                            sx={{
                              position: 'relative',
                              width: `${60 * calculatedScale}px`,
                              height: `${60 * calculatedScale}px`,
                              backgroundColor: customization.customColor || getPhonemeColor(phoneme),
                              border: '2px solid',
                              borderColor: 'transparent',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isDisabled ? 'not-allowed' : (isJiggling ? 'grab' : 'pointer'),
                              opacity: isDisabled ? 0.5 : 1,
                              fontSize: `${16 * calculatedScale}px`,
                              fontFamily: 'Arial',
                              userSelect: 'none',
                              transition: isJiggling ? 'transform 0.1s ease-in-out' : 'none',
                              animation: isJiggling ? 'jiggle 0.2s infinite' : 'none',
                              transform: snapshot.isDragging ? 'scale(1.1)' : 'none',
                              '@keyframes jiggle': {
                                '0%, 100%': { transform: 'rotate(-2deg)' },
                                '50%': { transform: 'rotate(2deg)' }
                              },
                              '&:hover': {
                                borderColor: mode === 'edit' ? 'primary.main' : 'transparent'
                              },
                              ...getDwellStyles(phoneme)
                            }}
                          >
                            {!customization.hideLabel && (
                              <Box sx={{ 
                                position: 'relative',
                                zIndex: 2 
                              }}>
                                {phoneme}
                              </Box>
                            )}
                            {mode === 'edit' && isJiggling && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                  borderRadius: '50%',
                                  padding: '2px',
                                  zIndex: 3
                                }}
                              >
                                <DragIndicatorIcon 
                                  sx={{ 
                                    fontSize: `${16 * calculatedScale}px`,
                                    color: 'rgba(0, 0, 0, 0.5)',
                                    transform: 'rotate(90deg)'
                                  }} 
                                />
                              </Box>
                            )}
                            {customization.image && (
                              <img 
                                src={customization.image} 
                                alt={phoneme}
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  maxWidth: '80%',
                                  maxHeight: '80%',
                                  objectFit: 'contain',
                                  pointerEvents: 'none',
                                  zIndex: 1
                                }}
                              />
                            )}
                          </Box>
                        )}
                      </Draggable>
                    );
                  })}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
        
        {selectedPhoneme && (
          <EditPhonemeDialog
            open={Boolean(selectedPhoneme)}
            onClose={() => setSelectedPhoneme(null)}
            phoneme={selectedPhoneme}
          />
        )}
      </Box>
    </Box>
  );
};

export default IPAKeyboard;
