import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Grid, Button, IconButton, Divider, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ChromePicker } from 'react-color';
import { detailedPhoneticData as phoneticData } from '../data/phoneticData';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

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
  showStressors: propShowStressors = true,
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
  const [showStressors, setShowStressors] = useState(() => {
    const saved = localStorage.getItem('showStressors');
    return saved ? JSON.parse(saved) : propShowStressors;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validLanguage, setValidLanguage] = useState('en-GB');

  const calculateOptimalGrid = useCallback(() => {
    const container = containerRef.current;
    if (!container || !phoneticData || !phoneticData[validLanguage]) return;

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    // Account for container padding
    const effectiveWidth = containerWidth - (buttonSpacing * 4);  // 2x padding on each side
    const effectiveHeight = containerHeight - (buttonSpacing * 4);
    
    // Get total number of buttons
    const totalButtons = Object.values(phoneticData[validLanguage]?.groups || {})
      .reduce((sum, group) => sum + group.phonemes.length, 0);

    if (totalButtons === 0) return;

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
  }, [buttonSpacing, validLanguage]);

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
  }, [mode]);

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

  const updateScale = useCallback(() => {
    if (!containerRef.current || !phoneticData || !phoneticData[validLanguage]?.groups) {
      return;
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const padding = Math.round(buttonSpacing);
    const containerWidth = Math.floor(rect.width - (padding * 2));
    const containerHeight = Math.floor(rect.height - (padding * 2));

    if (containerWidth <= 0 || containerHeight <= 0) return;

    // Get total buttons for the current language
    const totalButtons = Object.values(phoneticData[validLanguage].groups)
      .reduce((sum, group) => {
        if (!group || !group.phonemes || group.title === 'Stress & Intonation') return sum;
        return sum + group.phonemes.length;
      }, 0);

    if (totalButtons === 0) return;

    // Calculate grid dimensions
    const buttonWidth = 60;
    const buttonHeight = 60;
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
    const newScale = Math.min(scaleX, scaleY) * 0.95;  // 0.95 safety margin
    
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

    setCalculatedScale(newScale);
    setGridColumns(cols);
  }, [buttonSpacing, validLanguage]);

  useEffect(() => {
    if (!autoScale) {
      setCalculatedScale(buttonScale);
      return;
    }

    const debouncedUpdateScale = debounce(updateScale, 150);

    // Initial scale calculation with a delay to ensure container is ready
    const initialTimer = setTimeout(() => {
      updateScale();
    }, 100);

    // Add resize listener
    window.addEventListener('resize', debouncedUpdateScale);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateScale);
      clearTimeout(initialTimer);
    };
  }, [updateScale, autoScale, buttonScale, buttonSpacing, selectedLanguage, mode]);

  // Add an additional effect to handle container mounting
  useEffect(() => {
    if (autoScale && containerRef.current) {
      // Force a recalculation after a short delay to ensure container is properly sized
      const timer = setTimeout(() => {
        updateScale();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [containerRef.current, autoScale]);

  useEffect(() => {
    // Update showStressors when localStorage changes
    const handleStorageChange = () => {
      const saved = localStorage.getItem('showStressors');
      if (saved !== null) {
        setShowStressors(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    // Validate phoneticData and language on mount and when selectedLanguage changes
    if (!phoneticData || !phoneticData[selectedLanguage]) {
      setError('Loading phonetic data...');
      setIsLoading(true);
      return;
    }

    const newValidLanguage = phoneticData[selectedLanguage] ? selectedLanguage : 'en-GB';
    if (newValidLanguage !== validLanguage) {
      setValidLanguage(newValidLanguage);
    }
    
    // Only set loading to false if we have valid data
    if (phoneticData[newValidLanguage]?.groups) {
      setIsLoading(false);
      setError(null);
    }
  }, [selectedLanguage, phoneticData]);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Short vibration
    }
  };

  const handleDragStart = (event, phoneme, element) => {
    if (editMode !== 'move') return;
    
    // Don't try to prevent default on touch events
    if (!event.touches) {
      event.preventDefault();
      event.stopPropagation();
      
      // Set drag image for mouse drag only
      if (event.dataTransfer) {
        const rect = element.getBoundingClientRect();
        const ghost = element.cloneNode(true);
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.opacity = '0.7';
        ghost.style.position = 'fixed';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        event.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => document.body.removeChild(ghost), 0);
      }
    }
    
    setDraggedPhoneme(phoneme);
    setDraggedElement(element);
    setIsDragging(true);
    
    // Add dragging class to element
    element.classList.add('dragging');
  };

  const handleDragOver = (event) => {
    if (!isDragging || editMode !== 'move') return;
    
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const targetButton = event.target.closest('[data-phoneme]');
    if (!targetButton) return;

    const targetPhoneme = targetButton.dataset.phoneme;
    if (targetPhoneme !== draggedPhoneme) {
      // Add visual indicator for drop target
      const buttons = document.querySelectorAll('[data-phoneme]');
      buttons.forEach(button => {
        button.classList.remove('drop-target');
        button.classList.remove('drop-target-before');
        button.classList.remove('drop-target-after');
      });

      const rect = targetButton.getBoundingClientRect();
      const isBeforeMiddle = event.clientX < rect.left + rect.width / 2;
      
      targetButton.classList.add('drop-target');
      targetButton.classList.add(isBeforeMiddle ? 'drop-target-before' : 'drop-target-after');
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
      // Get current order
      const currentOrder = phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage);
      const fromIndex = currentOrder.indexOf(draggedPhoneme);
      const toIndex = currentOrder.indexOf(targetPhoneme);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Create new order
        const newOrder = [...currentOrder];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedPhoneme);
        
        // Update order
        setPhonemeOrder(prev => ({
          ...prev,
          [selectedLanguage]: newOrder
        }));
        
        // Save to localStorage
        localStorage.setItem('phonemeOrder', JSON.stringify({
          ...phonemeOrder,
          [selectedLanguage]: newOrder
        }));
      }
    }

    // Clean up
    const buttons = document.querySelectorAll('[data-phoneme]');
    buttons.forEach(button => {
      button.classList.remove('dragging');
      button.classList.remove('drop-target');
      button.classList.remove('drop-target-before');
      button.classList.remove('drop-target-after');
    });

    setIsDragging(false);
    setDraggedPhoneme(null);
    setDraggedElement(null);
    setHoveredPhoneme(null);
  };

  // Add drag end handler to clean up if drop doesn't occur
  const handleDragEnd = (event) => {
    const buttons = document.querySelectorAll('[data-phoneme]');
    buttons.forEach(button => {
      button.classList.remove('dragging');
      button.classList.remove('drop-target');
      button.classList.remove('drop-target-before');
      button.classList.remove('drop-target-after');
    });

    setIsDragging(false);
    setDraggedPhoneme(null);
    setDraggedElement(null);
    setHoveredPhoneme(null);
  };

  // Add styles for drag and drop
  const dragDropStyles = {
    '& .MuiButton-root.dragging': {
      opacity: 0.5,
      cursor: 'grabbing',
    },
    '& .MuiButton-root.drop-target': {
      position: 'relative',
    },
    '& .MuiButton-root.drop-target-before::before': {
      content: '""',
      position: 'absolute',
      left: -4,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: dwellIndicatorColor,
      borderRadius: 2,
    },
    '& .MuiButton-root.drop-target-after::after': {
      content: '""',
      position: 'absolute',
      right: -4,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: dwellIndicatorColor,
      borderRadius: 2,
    }
  };

  const handleTouchStart = (event, phoneme) => {
    // For non-edit modes, immediately trigger the click
    if (mode !== 'edit') {
      event.preventDefault(); // Prevent the subsequent click event
      // Set a flag to prevent double triggering
      setTouchPosition({ x: event.touches[0].clientX, y: event.touches[0].clientY });
      handlePhonemeClick(phoneme, event);
      return;
    }

    // Edit mode handling
    if (editMode === 'move') {
      event.preventDefault(); // Prevent default on the actual event
      const touch = event.touches[0];
      const element = event.currentTarget;
      setTouchPosition({ x: touch.clientX, y: touch.clientY });
      // Create a dummy event object with only the methods we need
      const dummyEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: null,
        touches: [touch]
      };
      handleDragStart(dummyEvent, phoneme, element);
    } else if (touchDwellEnabled) {
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
          handlePhonemeClick(phoneme);
          setIsSelecting(false);
          setDwellProgress(0);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const handlePhonemeClick = (phoneme, e) => {
    // Don't handle click if it was triggered by touch
    if (touchPosition) {
      return;
    }

    // Prevent any default behavior that might interfere
    if (e) {
      e.preventDefault();
    }

    if (mode === 'edit') {
      if (editMode === 'customize') {
        setSelectedPhoneme(phoneme);
        setEditDialogOpen(true);
      }
      // Don't handle clicks in move mode - let drag and drop handle it
    } else {
      // In game mode or other modes, directly trigger the click handler
      onPhonemeClick?.(phoneme);
      
      // Provide haptic feedback if enabled
      if (hapticFeedback && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  };

  // Simplify touch move to only handle drag in edit mode
  const handleTouchMove = (event) => {
    if (mode !== 'edit') return;

    if (isDragging && editMode === 'move') {
      event.preventDefault();
      const touch = event.touches[0];
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetElement) return;

      const targetButton = targetElement.closest('[data-phoneme]');
      if (!targetButton) return;

      const targetPhoneme = targetButton.dataset.phoneme;
      if (targetPhoneme !== draggedPhoneme) {
        setHoveredPhoneme(targetPhoneme);
      }
    }
  };

  // Update the button component to clear touchPosition on touch end
  const handleTouchEnd = (event) => {
    // Clear touch position after a short delay to prevent double triggers
    setTimeout(() => {
      setTouchPosition(null);
    }, 100);

    if (mode !== 'edit') return;

    if (isDragging && editMode === 'move') {
      event.preventDefault();
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
    }

    cancelDwell();
  };

  const handleLongPress = (phoneme) => {
    if (mode === 'edit') {
      setIsJiggling(true);
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

  const handleButtonClick = (phoneme) => {
    // Don't handle click if it was triggered by touch
    if (touchPosition) {
      setTouchPosition(null);
      return;
    }

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
    // Use validLanguage instead of directly accessing with language parameter
    const languageData = phoneticData[validLanguage];
    
    if (!languageData || !languageData.groups) {
      console.warn(`No phonetic data found for language: ${language}`);
      return [];
    }

    const allPhonemes = [];
    Object.values(languageData.groups).forEach(group => {
      if (!showStressors && group.title === 'Stress & Intonation') {
        return;
      }
      allPhonemes.push(...group.phonemes);
    });
    return allPhonemes;
  };

  const getOrderedPhonemes = () => {
    const savedOrder = phonemeOrder[validLanguage];
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
      return savedOrder;
    }
    return getAllPhonemes(validLanguage);
  };

  const getPhonemeColor = (phoneme) => {
    const groups = phoneticData[validLanguage]?.groups;
    if (!groups) return 'inherit';
    
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

  // Add a function to handle phoneme reordering
  const handlePhonemeMove = (phoneme, direction) => {
    const currentOrder = phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage);
    const currentIndex = currentOrder.indexOf(phoneme);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < currentOrder.length) {
      const newOrder = [...currentOrder];
      // Remove from current position
      newOrder.splice(currentIndex, 1);
      // Insert at new position
      newOrder.splice(newIndex, 0, phoneme);
      
      // Update state and localStorage
      setPhonemeOrder(prev => ({
        ...prev,
        [selectedLanguage]: newOrder
      }));
      
      localStorage.setItem('phonemeOrder', JSON.stringify({
        ...phonemeOrder,
        [selectedLanguage]: newOrder
      }));
    }
  };

  const renderButtonContent = (phoneme, customization, getOpacity) => {
    if (customization.image) {
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

    // In move mode, add move controls
    if (mode === 'edit' && editMode === 'move') {
      const currentOrder = phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage);
      const currentIndex = currentOrder.indexOf(phoneme);
      const canMoveLeft = currentIndex > 0;
      const canMoveRight = currentIndex < currentOrder.length - 1;

      return (
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!customization.hideLabel && phoneme}
          {canMoveLeft && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'left');
              }}
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: -12,
                transform: 'translateY(-50%)',
                backgroundColor: 'background.paper',
                boxShadow: 1,
                opacity: 0.8,
                zIndex: 2,
                padding: '4px',
                '&:hover': { 
                  backgroundColor: 'background.paper',
                  opacity: 1 
                }
              }}
            >
              <KeyboardArrowLeftIcon fontSize="small" />
            </IconButton>
          )}
          {canMoveRight && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'right');
              }}
              sx={{ 
                position: 'absolute',
                top: '50%',
                right: -12,
                transform: 'translateY(-50%)',
                backgroundColor: 'background.paper',
                boxShadow: 1,
                opacity: 0.8,
                zIndex: 2,
                padding: '4px',
                '&:hover': { 
                  backgroundColor: 'background.paper',
                  opacity: 1 
                }
              }}
            >
              <KeyboardArrowRightIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
    }

    // If no image and not in move mode, show the phoneme text unless hideLabel is true
    return !customization.hideLabel ? phoneme : null;
  };

  const renderPhonemeButton = (phoneme, group) => {
    const isDisabled = typeof disabledPhonemes === 'function' 
      ? disabledPhonemes(phoneme) 
      : disabledPhonemes?.includes(phoneme);
    const customization = customizations[phoneme] || {};
    const color = customization.customColor || getPhonemeColor(phoneme);
    
    // Calculate opacity based on mode and button state
    const getOpacity = () => {
      if (mode === 'edit') {
        return customization.hideButton ? 0.3 : 1;
      }
      return customization.hideButton ? 0 : (isDisabled ? 0.5 : 1);
    };

    return (
      <Button
        key={phoneme}
        data-phoneme={phoneme}
        onClick={(e) => handlePhonemeClick(phoneme, e)}
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
          cursor: 'pointer',
          transition: 'transform 0.1s ease-in-out, opacity 0.2s ease-in-out',
          opacity: getOpacity(),
          visibility: mode === 'edit' || !customization.hideButton ? 'visible' : 'hidden',
          pointerEvents: mode === 'edit' || !customization.hideButton ? 'auto' : 'none',
          textTransform: 'none !important',
          position: 'relative',
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
        })}
      >
        {renderButtonContent(phoneme, customization, getOpacity)}
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
    const [localShowStressors, setLocalShowStressors] = useState(() => {
      const saved = localStorage.getItem('showStressors');
      return saved ? JSON.parse(saved) : true;
    });

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

    const handleStressorsToggle = (event) => {
      const newValue = event.target.checked;
      setLocalShowStressors(newValue);
      localStorage.setItem('showStressors', JSON.stringify(newValue));
      // Force a re-render of the keyboard
      window.location.reload();
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
            <Divider />
            <FormControlLabel
              control={<Switch checked={localShowStressors} onChange={handleStressorsToggle} />}
              label="Show Stress & Intonation Markers"
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

  // Update the loading UI
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        gap={2}
      >
        <CircularProgress />
        <div>Loading phonetic keyboard...</div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        gap={2}
      >
        <div>{error}</div>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'manipulation',
        ...dragDropStyles
      }}
    >
      {/* Remove spacer since we're keeping message bar */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        p: Math.round(buttonSpacing)
      }}>
        <Grid 
          container
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, ${60}px)`,
            gap: `${Math.round(buttonSpacing)}px`,
            justifyContent: 'center',
            alignContent: 'center',
            height: 'auto',
            maxHeight: '100%',
            transform: `scale(${autoScale ? calculatedScale : buttonScale})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            touchAction: 'manipulation',
            '& .MuiGrid-item': {
              width: '60px !important',
              height: '60px !important',  
              padding: '0 !important',
              margin: '0 !important',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation'
            }
          }}
        >
          {phoneticData && phoneticData[validLanguage]?.groups && getOrderedPhonemes().map((phoneme) => {
            const group = Object.values(phoneticData[validLanguage]?.groups || {}).find(group => group.phonemes.includes(phoneme));
            return renderPhonemeButton(phoneme, group);
          })}
        </Grid>
      </Box>

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
          gap: 1,
          flexShrink: 0,
          alignItems: 'center'
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
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <FormControlLabel
            control={
              <Switch 
                size="small"
                checked={showStressors}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowStressors(newValue);
                  localStorage.setItem('showStressors', JSON.stringify(newValue));
                }}
              />
            }
            label="Stress Markers"
            sx={{ ml: 0 }}
          />
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