import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ChromePicker } from 'react-color';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { phoneticData } from '../data/phonemes';

const IPAKeyboard = ({ 
  mode, 
  onPhonemeClick, 
  buttonScale = 1, 
  buttonSpacing = 4, 
  selectedLanguage = 'en-GB',
  autoScale = true 
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
  const longPressTimer = useRef(null);

  useEffect(() => {
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
    if (!autoScale) {
      setCalculatedScale(buttonScale);
      return;
    }

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const padding = 32; // 2rem padding
      const containerWidth = container.clientWidth - padding;
      const containerHeight = container.clientHeight - padding;
      
      const totalButtons = Object.values(phoneticData[selectedLanguage].groups)
        .reduce((sum, group) => sum + group.phonemes.length, 0);

      // Start with a reasonable number of columns based on the aspect ratio
      const containerAspectRatio = containerWidth / containerHeight;
      const maxColumns = Math.floor(Math.sqrt(totalButtons * containerAspectRatio));
      
      // Calculate minimum rows needed
      const minRows = Math.ceil(totalButtons / maxColumns);
      
      // Calculate the maximum possible scale that will fit both width and height
      const scaleFromWidth = (containerWidth - (maxColumns - 1) * buttonSpacing) / (maxColumns * 60);
      const scaleFromHeight = (containerHeight - (minRows - 1) * buttonSpacing) / (minRows * 60);
      
      // Use the smaller scale to ensure everything fits
      const finalScale = Math.min(scaleFromWidth, scaleFromHeight);
      
      // Apply scale with limits
      setCalculatedScale(Math.min(Math.max(finalScale * 0.95, 0.5), 3)); // Added 5% margin for safety
    };

    // Update on mount and window resize
    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [autoScale, buttonScale, buttonSpacing, selectedLanguage, phoneticData]);

  const handleLongPress = () => {
    if (mode === 'edit') {
      setIsJiggling(true);
      setDragEnabled(true);
    }
  };

  const handleTouchStart = (e) => {
    if (mode === 'edit') {
      e.preventDefault(); // Prevent default touch behavior
      longPressTimer.current = setTimeout(handleLongPress, 500);
    }
  };

  const handleTouchEnd = (e) => {
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
    const baseColor = customization.customColor || groupColor;
    
    if (customization.hidden && mode !== 'edit') {
      return null;
    }

    const buttonSize = 60 * calculatedScale;
    const buttonContent = customization.image ? (
      <img 
        src={customization.image} 
        alt={phoneme}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          opacity: customization.hidden ? 0.3 : 1
        }} 
      />
    ) : (
      <Box sx={{ 
        fontSize: `${24 * calculatedScale}px`,
        fontFamily: "'Noto Sans', 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity: customization.hidden ? 0.3 : 1
      }}>
        {customization.label || phoneme}
      </Box>
    );
    
    const button = (
      <Button
        key={phoneme}
        variant="contained"
        onClick={() => !isJiggling && handlePhonemeClick(phoneme)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        aria-label={`Phoneme ${phoneme}`}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            !isJiggling && handlePhonemeClick(phoneme);
          }
        }}
        sx={{
          backgroundColor: customization.image ? 'transparent' : baseColor,
          minWidth: 'unset',
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          margin: `${buttonSpacing/2}px`,
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          cursor: isJiggling ? 'grab' : 'pointer',
          animation: isJiggling ? 'jiggle 0.2s infinite ease-in-out' : 'none',
          touchAction: 'none', // Prevent scrolling while dragging
          '@keyframes jiggle': {
            '0%, 100%': {
              transform: 'rotate(-1deg)',
            },
            '50%': {
              transform: 'rotate(1deg)',
            }
          },
          '&:hover': {
            backgroundColor: customization.image ? 'rgba(0,0,0,0.1)' : baseColor,
            filter: 'brightness(0.9)',
            '& .edit-overlay': {
              display: mode === 'edit' && !isJiggling ? 'flex' : 'none'
            }
          },
          '&.dragging': {
            opacity: 0.5,
          }
        }}
      >
        {buttonContent}
        {mode === 'edit' && !isJiggling && (
          <Box
            className="edit-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <EditIcon sx={{ color: 'white' }} />
          </Box>
        )}
      </Button>
    );

    return (
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
            {button}
          </div>
        )}
      </Draggable>
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
        overflow: 'hidden'
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
                justifyContent: 'center', // Center the buttons horizontally
                position: 'relative' // Added for absolute positioning of Done button
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
