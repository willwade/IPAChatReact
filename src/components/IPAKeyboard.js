import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Grid, Button } from '@mui/material';
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
      const buttonHeight = 60;  // Changed from 40 to match actual button height
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
      const newScale = Math.min(scaleX, scaleY) * 0.95;  // Increased safety margin from 0.98 to 0.95
      
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
    // Only prevent default for edit mode or dwell enabled
    if (mode === 'edit' || touchDwellEnabled) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (editMode === 'move') {
      handleDragStart(event.touches[0], phoneme, event.currentTarget, true);
      return;
    }

    if (touchDwellEnabled) {
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
    } else {
      // For regular touch input, just trigger the click
      handleButtonClick(phoneme);
    }
  };

  const handleTouchMove = (event) => {
    // Only prevent default for edit mode or dwell enabled
    if ((mode === 'edit' || touchDwellEnabled) && isSelecting) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isDragging && editMode === 'move') {
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
    // Only prevent default for edit mode or dwell enabled
    if (mode === 'edit' || touchDwellEnabled) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isDragging && editMode === 'move') {
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

    if (touchDwellEnabled) {
      cancelDwell();
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
      onPhonemeClick?.(phoneme);
    }
  };

  const handleButtonClick = (phoneme) => {
    if (mode === 'edit') {
      if (editMode === 'customize') {
        setSelectedPhoneme(phoneme);
        setEditDialogOpen(true);
      } else if (editMode === 'move') {
        // Handle move mode if needed
      }
    } else {
      // Play audio immediately
      onPhonemeClick?.(phoneme);
      
      // Visual feedback after audio starts
      requestAnimationFrame(() => {
        const button = document.querySelector(`[data-phoneme="${phoneme}"]`);
        if (button) {
          button.style.transform = 'scale(0.95)';
          setTimeout(() => {
            button.style.transform = 'none';
          }, 100);
        }
      });
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

  const compressImage = (base64String, maxWidth = 200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Using JPEG with 70% quality
      };
    });
  };

  const estimateStorageSize = (obj) => {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  };

  const saveCustomization = async (phoneme, customization) => {
    try {
      console.log('Saving customization for', phoneme, customization);
      const newCustomizations = {
        ...customizations,
        [phoneme]: customization
      };
      localStorage.setItem('ipaCustomizations', JSON.stringify(newCustomizations));
      setCustomizations(newCustomizations);
      console.log('Saved customizations:', newCustomizations);
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Error saving customization. Please try again.');
    }
  };

  const handleImageUploadBase = async (event, setFieldValue) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size before processing
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image is too large. Please choose an image under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Start with more aggressive compression for larger files
          const initialMaxWidth = file.size > 1024 * 1024 ? 150 : 200;
          const compressed = await compressImage(reader.result, initialMaxWidth);
          
          // Check if the compressed result would fit
          const testCustomizations = {
            ...customizations,
            test: { image: compressed }
          };
          
          if (estimateStorageSize(testCustomizations) > 4.5 * 1024 * 1024) {
            alert('Even after compression, this image would be too large. Please try a smaller image.');
            return;
          }
          
          setFieldValue('image', compressed);
        } catch (error) {
          console.error('Error processing image:', error);
          alert('Error processing image. Please try a different image.');
        }
      };
      reader.readAsDataURL(file);
    }
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

  const renderPhonemeButton = (phoneme, group) => {
    const isDisabled = typeof disabledPhonemes === 'function' 
      ? disabledPhonemes(phoneme) 
      : disabledPhonemes?.includes(phoneme);
    const customization = customizations[phoneme] || {};
    const color = customization.customColor || getPhonemeColor(phoneme);
    
    // Debug log to check customization data
    console.log(`Button ${phoneme} customization:`, customization);
    
    // Calculate opacity based on mode and button state
    const getOpacity = () => {
      if (mode === 'edit') {
        return customization.hideButton ? 0.3 : 1;
      }
      return customization.hideButton ? 0 : (isDisabled ? 0.5 : 1);
    };

    // Determine what to render inside the button
    const renderButtonContent = () => {
      if (customization.image) {
        console.log(`Rendering image for ${phoneme}:`, customization.image.substring(0, 50) + '...');
        return (
          <img 
            src={customization.image} 
            alt={phoneme} 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: getOpacity(),
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }} 
          />
        );
      }
      // If no image, show the phoneme text unless hideLabel is true
      return !customization.hideLabel ? phoneme : null;
    };

    return (
      <Button
        key={phoneme}
        data-phoneme={phoneme}
        onClick={() => handleButtonClick(phoneme)}
        onTouchStart={(e) => handleTouchStart(e, phoneme)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => handleMouseDown(e, phoneme)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={isDisabled}
        disableRipple={true}
        sx={(theme) => ({
          minWidth: 'unset',
          width: '60px',
          height: '60px',
          p: 0.5,
          fontSize: '1rem',
          fontFamily: '"Noto Sans", sans-serif',
          backgroundColor: color,
          color: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.87)' : '#fff',
          border: '1px solid',
          borderColor: mode === 'edit' && customization.hideButton ? 'rgba(0, 0, 0, 0.3)' : 'divider',
          transform: isJiggling ? 'rotate(-2deg)' : 'none',
          animation: isJiggling ? 'jiggle 0.5s infinite' : 'none',
          transition: 'transform 0.1s ease-in-out',
          textTransform: 'none',
          opacity: getOpacity(),
          visibility: mode === 'edit' || !customization.hideButton ? 'visible' : 'hidden',
          pointerEvents: mode === 'edit' || !customization.hideButton ? 'auto' : 'none',
          cursor: mode === 'edit' ? (editMode === 'move' ? 'grab' : 'pointer') : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          '&:hover': {
            backgroundColor: color,
            opacity: mode === 'edit' ? (customization.hideButton ? 0.4 : 0.9) : (isDisabled ? 0.5 : 0.9),
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          '&.Mui-disabled': {
            color: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
            backgroundColor: color,
          },
          ...getDwellStyles(phoneme),
          ...(hoveredPhoneme === phoneme && {
            outline: `2px solid ${dwellIndicatorColor}`,
            outlineOffset: '2px',
          }),
        })}
      >
        {renderButtonContent()}
      </Button>
    );
  };

  const EditPhonemeDialog = ({ open, onClose, phoneme }) => {
    const customization = customizations[phoneme] || {};
    const [hideLabel, setHideLabel] = useState(customization.hideLabel || false);
    const [hideButton, setHideButton] = useState(customization.hideButton || false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState(customization.customColor || null);
    const [previewSrc, setPreviewSrc] = useState(customization.image || '');

    const handleSave = () => {
      const newCustomization = {
        hideLabel,
        hideButton,
        image: previewSrc,
        customColor,
      };
      console.log('Saving new customization:', newCustomization);
      saveCustomization(phoneme, newCustomization);
      onClose();
    };

    const handleImageUpload = async (event) => {
      const file = event.target.files[0];
      if (file) {
        // Check file size before processing
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert('Image is too large. Please choose an image under 5MB.');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            // Start with more aggressive compression for larger files
            const initialMaxWidth = file.size > 1024 * 1024 ? 150 : 200;
            const compressed = await compressImage(reader.result, initialMaxWidth);
            
            // Set both the image state and preview source
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

    const handleColorChange = (color) => {
      setCustomColor(color.hex);
    };

    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Customize Phoneme: {phoneme}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: '300px', mt: 2 }}>
            <FormControlLabel
              control={<Switch checked={hideLabel} onChange={(e) => setHideLabel(e.target.checked)} />}
              label="Hide Label"
            />
            <FormControlLabel
              control={<Switch checked={hideButton} onChange={(e) => setHideButton(e.target.checked)} />}
              label="Hide Button"
            />
            
            {/* Image Upload Section */}
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
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleClearImage}
                  >
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

            {/* Color Picker Section */}
            <Box>
              <Button
                variant="outlined"
                onClick={() => setShowColorPicker(!showColorPicker)}
                sx={{ mb: 1 }}
              >
                {showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}
              </Button>
              {showColorPicker && (
                <Box sx={{ position: 'relative', zIndex: 1000 }}>
                  <ChromePicker
                    color={customColor || getPhonemeColor(phoneme)}
                    onChange={handleColorChange}
                    disableAlpha={true}
                  />
                </Box>
              )}
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
          willChange: 'transform',
          '& .MuiGrid-item': {
            width: '60px !important',
            height: '60px !important',  
            padding: '0 !important',
            margin: '0 !important',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        {(phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage)).map((phoneme) => {
          const group = Object.values(phoneticData[selectedLanguage].groups).find(group => group.phonemes.includes(phoneme));
          return renderPhonemeButton(phoneme, group);
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