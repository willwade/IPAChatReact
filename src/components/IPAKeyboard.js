import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Grid, Button, IconButton, Divider, CircularProgress, Typography, Slider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { detailedPhoneticData as phoneticData } from '../data/phoneticData';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import EditMode from './EditMode';

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
  backgroundSettings,
  onBackgroundSave,
  dwellIndicatorType = 'border',
  dwellIndicatorColor = 'primary',
  hapticFeedback = false,
  showStressMarkers = false,
  onStressMarkersChange,
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
  const [backgroundEditOpen, setBackgroundEditOpen] = useState(false);
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
  const [gridColumns, setGridColumnsState] = useState(8);
  
  const setGridColumns = setGridColumnsState;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validLanguage, setValidLanguage] = useState('en-GB');
  const [gridConfig, setGridConfig] = useState(null);

  const calculateOptimalGrid = useCallback(() => {
    const container = containerRef.current;
    if (!container || !phoneticData || !phoneticData[validLanguage]) return;

    // Check if there's a custom grid configuration for this language
    const customConfig = gridConfig?.[validLanguage];
    if (customConfig?.columns) {
      setGridColumns(customConfig.columns);
      return;
    }

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
  }, [buttonSpacing, validLanguage, gridConfig]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        // Only recalculate on resize if we don't have custom columns
        const customConfig = gridConfig?.[validLanguage];
        if (!customConfig?.columns) {
          calculateOptimalGrid();
        }
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
  }, [calculateOptimalGrid, gridConfig, validLanguage]);

  useEffect(() => {
    // Only recalculate when scaling changes if we don't have custom columns
    const customConfig = gridConfig?.[validLanguage];
    if (!customConfig?.columns) {
      calculateOptimalGrid();
    }
  }, [calculateOptimalGrid, autoScale, buttonScale, gridConfig, validLanguage]);

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

    // Load grid configuration
    const savedGridConfig = localStorage.getItem('gridConfig');
    if (savedGridConfig) {
      try {
        const parsedGridConfig = JSON.parse(savedGridConfig);
        setGridConfig(parsedGridConfig);
      } catch (e) {
        console.error('Error loading grid config:', e);
      }
    }

  }, []);

  // Apply grid configuration when it changes
  useEffect(() => {
    if (gridConfig) {
      const customConfig = gridConfig[validLanguage];
      if (customConfig?.columns) {
        setGridColumns(customConfig.columns);
      } else {
        calculateOptimalGrid();
      }
    }
  }, [gridConfig, validLanguage, calculateOptimalGrid]);

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

    // Get total phonemes for current language
    const orderedPhonemes = getOrderedPhonemes();
    const totalButtons = orderedPhonemes.length;

    if (totalButtons === 0) return;

    // Fixed button dimensions
    const buttonWidth = 60;
    const buttonHeight = 60;
    const gap = Math.round(buttonSpacing);

    // Check if there's a custom grid configuration
    const customConfig = gridConfig?.[validLanguage];
    let cols;

    if (customConfig?.columns) {
      cols = customConfig.columns;
    } else {
      // Calculate optimal grid layout
      const maxPossibleCols = Math.floor((containerWidth + gap) / (buttonWidth + gap));
      const targetAspectRatio = containerWidth / containerHeight;
      cols = Math.min(maxPossibleCols, Math.ceil(Math.sqrt(totalButtons * targetAspectRatio)));

      // Ensure we have at least 1 column and don't exceed total buttons
      cols = Math.max(1, Math.min(cols, totalButtons));
      setGridColumns(cols);
    }

    const rows = Math.ceil(totalButtons / cols);

    // Calculate total grid dimensions
    const totalGridWidth = Math.floor((cols * buttonWidth) + ((cols - 1) * gap));
    const totalGridHeight = Math.floor((rows * buttonHeight) + ((rows - 1) * gap));

    // Calculate scale to fit in container
    const scaleX = containerWidth / totalGridWidth;
    const scaleY = containerHeight / totalGridHeight;
    const newScale = Math.min(scaleX, scaleY, 2.0) * 0.95; // Cap at 2x scale with 5% margin

    setCalculatedScale(newScale);
  }, [buttonSpacing, validLanguage, gridConfig, getOrderedPhonemes]);

  // Auto-scale effect - simplified and more reliable
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial scale calculation
    const timer = setTimeout(() => {
      updateScale();
    }, 50);

    // Set up ResizeObserver for responsive scaling
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        updateScale();
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [updateScale]);

  // Update scale when dependencies change
  useEffect(() => {
    if (containerRef.current) {
      updateScale();
    }
  }, [validLanguage, showStressMarkers, buttonSpacing, updateScale]);

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
    const languageData = phoneticData[validLanguage];
    
    if (!languageData || !languageData.groups) {
      console.warn(`No phonetic data found for language: ${language}`);
      return [];
    }

    // Get all phonemes first
    const allPhonemes = [];
    // Get stress markers list for filtering
    const stressMarkers = languageData.groups['Stress & Intonation']?.phonemes || [];
    
    Object.values(languageData.groups).forEach(group => {
      allPhonemes.push(...group.phonemes);
    });

    // Get the saved order if it exists
    const savedOrder = phonemeOrder[validLanguage];
    const phonemeList = savedOrder && Array.isArray(savedOrder) ? savedOrder : allPhonemes;

    // Filter out stress markers if needed
    return phonemeList.filter(phoneme => {
      if (!showStressMarkers && stressMarkers.includes(phoneme)) {
        console.log('Filtering out stress marker:', phoneme);
        return false;
      }
      return true;
    });
  };

  const getOrderedPhonemes = useCallback(() => {
    const languageData = phoneticData[validLanguage];
    if (!languageData?.groups) return [];

    // Get stress markers list
    const stressMarkers = languageData.groups.stress?.phonemes || [];
    console.log('Available stress markers:', stressMarkers);

    // Get base phoneme list (either from saved order or default)
    const savedOrder = phonemeOrder[validLanguage];
    let basePhonemes;
    
    if (savedOrder && Array.isArray(savedOrder)) {
      basePhonemes = savedOrder;
    } else {
      // If no saved order, get all phonemes including stress markers
      basePhonemes = Object.values(languageData.groups).flatMap(group => group.phonemes);
    }

    // Check if blank cells are allowed for this language
    const customConfig = gridConfig?.[validLanguage];
    const allowBlankCells = customConfig?.allowBlankCells || false;

    // If showing stress markers, ensure they're included in the list
    if (showStressMarkers) {
      // Add any missing stress markers
      stressMarkers.forEach(marker => {
        if (!basePhonemes.includes(marker)) {
          basePhonemes.push(marker);
        }
      });
    } else {
      // Filter out stress markers
      basePhonemes = basePhonemes.filter(phoneme => !stressMarkers.includes(phoneme));
    }

    // If blank cells are not allowed, filter out empty strings
    if (!allowBlankCells) {
      basePhonemes = basePhonemes.filter(phoneme => phoneme !== '');
    }

    console.log('Showing stress markers:', showStressMarkers);
    console.log('Allow blank cells:', allowBlankCells);
    console.log('Filtered phonemes:', basePhonemes);
    return basePhonemes;
  }, [validLanguage, showStressMarkers, phonemeOrder, gridConfig]);

  // Update effect to handle showStressMarkers changes
  useEffect(() => {
    console.log('showStressMarkers changed:', showStressMarkers);
    
    // Get the current phoneme list
    const languageData = phoneticData[validLanguage];
    if (!languageData?.groups) return;

    // Get stress markers list
    const stressMarkers = languageData.groups.stress?.phonemes || [];
    console.log('Stress markers from data:', stressMarkers);
    
    // Get current order or default list
    const currentOrder = phonemeOrder[validLanguage];
    let basePhonemes;
    
    if (currentOrder && Array.isArray(currentOrder)) {
      basePhonemes = [...currentOrder];
    } else {
      basePhonemes = Object.values(languageData.groups).flatMap(group => group.phonemes);
    }

    // Update phonemes based on showStressMarkers
    if (showStressMarkers) {
      // Add any missing stress markers
      stressMarkers.forEach(marker => {
        if (!basePhonemes.includes(marker)) {
          basePhonemes.push(marker);
        }
      });
    } else {
      // Remove stress markers
      basePhonemes = basePhonemes.filter(phoneme => !stressMarkers.includes(phoneme));
    }

    console.log('Setting new phoneme order. Show stress markers:', showStressMarkers);
    console.log('Updated phonemes:', basePhonemes);

    // Update the phoneme order
    setPhonemeOrder(prev => ({
      ...prev,
      [validLanguage]: basePhonemes
    }));

    // Force grid recalculation only if not using custom config
    const customConfig = gridConfig?.[validLanguage];
    if (!customConfig?.columns) {
      calculateOptimalGrid();
    }
  }, [showStressMarkers, validLanguage, gridConfig, calculateOptimalGrid]);

  const handlePhonemeMove = useCallback((phoneme, direction) => {
    const currentPhonemes = getOrderedPhonemes();
    const currentIndex = currentPhonemes.indexOf(phoneme);
    
    if (currentIndex === -1) return;
    
    const newPhonemes = [...currentPhonemes];
    if (direction === 'left' && currentIndex > 0) {
      [newPhonemes[currentIndex - 1], newPhonemes[currentIndex]] = 
      [newPhonemes[currentIndex], newPhonemes[currentIndex - 1]];
    } else if (direction === 'right' && currentIndex < newPhonemes.length - 1) {
      [newPhonemes[currentIndex], newPhonemes[currentIndex + 1]] = 
      [newPhonemes[currentIndex + 1], newPhonemes[currentIndex]];
    }
    
    setPhonemeOrder(prev => ({
      ...prev,
      [validLanguage]: newPhonemes
    }));
  }, [validLanguage, getOrderedPhonemes]);

  const handleStressMarkersToggle = (e) => {
    const newValue = e.target.checked;
    console.log('Toggle stress markers:', newValue);
    if (onStressMarkersChange) {
      onStressMarkersChange(newValue);
    }
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
          {!customization.hideLabel && (customization.label || phoneme)}
          {canMoveLeft && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'left');
              }}
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: -9,
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                boxShadow: 2,
                opacity: 1,
                zIndex: 10,
                padding: '3px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                width: '18px',
                height: '18px',
                '& .MuiSvgIcon-root': {
                  fontSize: '14px'
                },
                '&:hover': { 
                  backgroundColor: 'white',
                  opacity: 0.9,
                  boxShadow: 3
                }
              }}
            >
              <KeyboardArrowLeftIcon fontSize="small" />
            </Box>
          )}
          {canMoveRight && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'right');
              }}
              sx={{ 
                position: 'absolute',
                top: '50%',
                right: -9,
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                boxShadow: 2,
                opacity: 1,
                zIndex: 10,
                padding: '3px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                width: '18px',
                height: '18px',
                '& .MuiSvgIcon-root': {
                  fontSize: '14px'
                },
                '&:hover': { 
                  backgroundColor: 'white',
                  opacity: 0.9,
                  boxShadow: 3
                }
              }}
            >
              <KeyboardArrowRightIcon fontSize="small" />
            </Box>
          )}
        </Box>
      );
    }

    // If no image and not in move mode, show the phoneme text unless hideLabel is true
    return !customization.hideLabel ? (customization.label || phoneme) : null;
  };

  const renderPhonemeButton = (phoneme, group) => {
    // Handle blank cells - render invisible placeholder
    if (phoneme === '') {
      return (
        <div
          key={`blank-${Math.random()}`}
          style={{
            width: '60px',
            height: '60px',
            visibility: 'hidden',
          }}
        />
      );
    }

    const isDisabled = typeof disabledPhonemes === 'function' 
      ? disabledPhonemes(phoneme) 
      : disabledPhonemes?.includes(phoneme);
    const customization = customizations[phoneme] || {};
    const color = customization.customColor || getPhonemeColor(phoneme);
    
    // Calculate opacity based on mode and button state
    const getOpacity = () => {
      // Use custom opacity if set, otherwise use default behavior
      const baseOpacity = customization.opacity !== undefined ? customization.opacity : 1;

      if (mode === 'edit') {
        return customization.hideButton ? 0.3 : baseOpacity;
      }
      return customization.hideButton ? 0 : (isDisabled ? 0.5 : baseOpacity);
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
            opacity: (() => {
              const baseOpacity = customization.opacity !== undefined ? customization.opacity : 1;
              const hoverOpacity = Math.min(baseOpacity * 0.9, 0.9); // Reduce opacity slightly on hover

              if (mode === 'edit') {
                return customization.hideButton ? 0.4 : hoverOpacity;
              }
              return isDisabled ? 0.5 : hoverOpacity;
            })(),
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
    const [customColor, setCustomColor] = useState(customization.customColor || null);
    const [buttonOpacity, setButtonOpacity] = useState(customization.opacity !== undefined ? customization.opacity : 1);
    const [previewSrc, setPreviewSrc] = useState(customization.image || '');
    const [customLabel, setCustomLabel] = useState(customization.label || '');

    // Get current order and position for move controls
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
        label: customLabel,
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

    const handleColorChange = (event) => {
      setCustomColor(event.target.value);
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
              <IconButton
                onClick={handleMoveLeft}
                disabled={!canMoveLeft}
                size="small"
              >
                <KeyboardArrowLeftIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Customize: {phoneme}
              </Typography>
              <IconButton
                onClick={handleMoveRight}
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
          key={`grid-${showStressMarkers}-${validLanguage}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, ${60}px)`,
            gap: `${Math.round(buttonSpacing)}px`,
            justifyContent: 'center',
            alignContent: 'center',
            height: 'auto',
            maxHeight: '100%',
            transform: `scale(${calculatedScale})`,
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
          bottom: { xs: 8, sm: 16 },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          p: { xs: 0.5, sm: 1 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 0.5, sm: 1 },
          alignItems: 'center',
          maxWidth: { xs: '95vw', sm: 'auto' }
        }}>
          <Box sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            flexWrap: { xs: 'nowrap', sm: 'wrap' }
          }}>
            <Button
              variant={editMode === 'move' ? 'contained' : 'outlined'}
              onClick={() => {
                setEditMode('move');
              }}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'auto' }, px: { xs: 1, sm: 2 } }}
            >
              Move
            </Button>
            <Button
              variant={editMode === 'customize' ? 'contained' : 'outlined'}
              onClick={() => {
                setEditMode('customize');
              }}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'auto' }, px: { xs: 1, sm: 2 } }}
            >
              Customize
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setBackgroundEditOpen(true);
              }}
              size="small"
              sx={{ minWidth: { xs: 'auto', sm: 'auto' }, px: { xs: 1, sm: 2 } }}
            >
              Background
            </Button>
          </Box>

          <Divider
            orientation={{ xs: 'horizontal', sm: 'vertical' }}
            flexItem
            sx={{
              mx: { xs: 0, sm: 1 },
              my: { xs: 0.5, sm: 0 },
              width: { xs: '100%', sm: 'auto' }
            }}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showStressMarkers}
                onChange={handleStressMarkersToggle}
              />
            }
            label="Stress"
            sx={{
              ml: 0,
              '& .MuiFormControlLabel-label': {
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }
            }}
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

      <EditMode
        open={backgroundEditOpen}
        onClose={() => setBackgroundEditOpen(false)}
        phoneme={null}
        backgroundSettings={backgroundSettings}
        onBackgroundSave={onBackgroundSave}
      />
    </Box>
  );
};

export default IPAKeyboard;
