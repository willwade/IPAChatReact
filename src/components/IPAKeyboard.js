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

    const calculateOptimalScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth - 40; // Account for padding
      const containerHeight = container.clientHeight - 40;

      // Get the total number of visible buttons
      const visibleButtons = Object.values(phoneticData[selectedLanguage].groups)
        .flatMap(group => group.phonemes)
        .filter(phoneme => {
          const customization = customizations[phoneme] || {};
          return !customization.hidden;
        });

      const totalButtons = visibleButtons.length;
      const aspectRatio = containerWidth / containerHeight;
      
      // Calculate optimal number of columns based on aspect ratio
      const optimalCols = Math.ceil(Math.sqrt(totalButtons * aspectRatio));
      const optimalRows = Math.ceil(totalButtons / optimalCols);

      // Base button size (without scale)
      const baseSize = 60;
      
      // Calculate scales based on width and height
      const scaleX = (containerWidth - (buttonSpacing * (optimalCols - 1))) / (baseSize * optimalCols);
      const scaleY = (containerHeight - (buttonSpacing * (optimalRows - 1))) / (baseSize * optimalRows);

      // Use the smaller scale to ensure buttons fit
      const optimalScale = Math.min(scaleX, scaleY);
      
      // Set scale with reasonable limits
      setCalculatedScale(Math.min(Math.max(optimalScale, 0.5), 3));
    };

    // Calculate initial scale
    calculateOptimalScale();

    // Recalculate on window resize
    const handleResize = () => {
      calculateOptimalScale();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoScale, buttonScale, buttonSpacing, selectedLanguage, customizations]);

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
    
    const items = Object.values(phoneticData[selectedLanguage].groups)
      .flatMap(group => group.phonemes);
    
    const newOrder = Array.from(items);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);
    
    setPhonemeOrder({
      ...phonemeOrder,
      [selectedLanguage]: { all: newOrder }
    });
    localStorage.setItem('phonemeOrder', JSON.stringify({
      ...phonemeOrder,
      [selectedLanguage]: { all: newOrder }
    }));
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

  const renderPhonemeButton = (phoneme, index) => {
    const customization = customizations[phoneme] || {};
    const baseColor = customization.customColor || getPhonemeColor(phoneme);
    
    if (customization.hidden) {
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
          opacity: mode === 'edit' ? 0.7 : 1,
          pointerEvents: 'none', // Prevent image drag
        }} 
      />
    ) : (
      customization.hideLabel ? '' : (customization.label || phoneme)
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
        sx={{
          backgroundColor: customization.image ? 'transparent' : baseColor,
          minWidth: 'unset',
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          margin: `${buttonSpacing/2}px`,
          fontSize: `${Math.max(16 * calculatedScale, 14)}px`,
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

    return mode === 'edit' && isJiggling ? (
      <Draggable key={phoneme} draggableId={phoneme} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              opacity: snapshot.isDragging ? 0.5 : 1,
              cursor: 'grab',
            }}
          >
            {button}
          </div>
        )}
      </Draggable>
    ) : button;
  };

  const EditDialog = ({ open, onClose, phoneme }) => {
    const [label, setLabel] = useState(customizations[phoneme]?.label || '');
    const [hideLabel, setHideLabel] = useState(customizations[phoneme]?.hideLabel || false);
    const [color, setColor] = useState(customizations[phoneme]?.customColor || getPhonemeColor(phoneme));
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [image, setImage] = useState(customizations[phoneme]?.image || '');

    const handleSave = () => {
      const newCustomizations = {
        ...customizations,
        [phoneme]: {
          ...customizations[phoneme],
          label: label || undefined,
          hideLabel: hideLabel || undefined,
          customColor: color !== getPhonemeColor(phoneme) ? color : undefined,
          image: image || undefined,
        }
      };
      setCustomizations(newCustomizations);
      localStorage.setItem('ipaCustomizations', JSON.stringify(newCustomizations));
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
        <DialogTitle>Edit Button: {phoneme}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Custom Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hideLabel}
                  onChange={(e) => setHideLabel(e.target.checked)}
                />
              }
              label="Hide Label"
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
                  color={color}
                  onChange={(color) => setColor(color.hex)}
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
    <DragDropContext onDragEnd={(result) => {
      handleDragEnd(result);
      // Don't disable jiggling after drag to allow for multiple moves
    }}>
      <Box 
        ref={containerRef}
        sx={{ 
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {isJiggling && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              width: '100%',
              backgroundColor: 'background.paper',
              p: 1,
              display: 'flex',
              justifyContent: 'center',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setIsJiggling(false);
                setDragEnabled(false);
              }}
            >
              Done
            </Button>
          </Box>
        )}
        <Droppable droppableId="all-phonemes" direction="horizontal">
          {(provided) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: buttonSpacing,
                padding: 2,
                minHeight: 80 * calculatedScale,
                flex: 1,
                alignContent: 'flex-start',
                backgroundColor: mode === 'edit' && isJiggling ? 'rgba(0,0,0,0.03)' : 'transparent',
              }}
            >
              {(phonemeOrder[selectedLanguage]?.all || 
                Object.values(phoneticData[selectedLanguage].groups)
                  .flatMap(group => group.phonemes)
              ).map((phoneme, index) => 
                renderPhonemeButton(phoneme, index)
              )}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
        <EditDialog
          open={editMode}
          onClose={() => setEditMode(false)}
          phoneme={selectedPhoneme}
        />
      </Box>
    </DragDropContext>
  );
};

export default IPAKeyboard;
