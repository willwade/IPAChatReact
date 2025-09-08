import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Switch, FormControlLabel, Button, Divider, CircularProgress } from '@mui/material';
import { detailedPhoneticData as phoneticData } from '../data/phoneticData';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EditMode from './EditMode';
import EditPhonemeDialog from './EditPhonemeDialog';
import './PhonemeGrid.css';

const IPAKeyboard = ({
  mode = 'build',
  onPhonemeClick,
  onPhonemeSwap,
  disabledPhonemes,
  buttonSpacing = 1,
  selectedLanguage = 'en-GB',
  minButtonSize = 75,
  layoutMode = 'grid',
  fixedLayout = false,
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
  // Persist phoneme order whenever it changes so edits survive layout switches
  useEffect(() => {
    try {
      localStorage.setItem('phonemeOrder', JSON.stringify(phonemeOrder));
    } catch (err) {
      console.error('Failed to save phoneme order', err);
    }
  }, [phonemeOrder]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [backgroundEditOpen, setBackgroundEditOpen] = useState(false);
  const containerRef = useRef(null);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchPosition, setTouchPosition] = useState(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [currentPhoneme, setCurrentPhoneme] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const animationFrameRef = useRef();
  const longPressTimer = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPhoneme, setDraggedPhoneme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validLanguage, setValidLanguage] = useState('en-GB');
  const [gridConfig, setGridConfig] = useState(null);

  // State for tracking window size for responsive behavior
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Calculate fixed layout columns based on phoneme order structure
  const getFixedLayoutColumns = useCallback(() => {
    if (!fixedLayout) return null;

    const savedOrder = phonemeOrder[validLanguage];
    if (!savedOrder || !Array.isArray(savedOrder)) return null;

    // First, check if there's an explicit column count in gridConfig
    const customConfig = gridConfig?.[validLanguage];
    if (customConfig?.columns) {
      return customConfig.columns;
    }

    // For QWERTY-style layouts, detect the pattern by looking for empty cells
    // and calculating the likely column count
    const hasEmptyCells = savedOrder.includes('');
    if (hasEmptyCells) {
      // Common QWERTY-style layouts typically have 12 columns
      // We can detect this by finding the pattern of non-empty cells
      const totalCells = savedOrder.length;

      // Try common column counts and see which makes most sense
      const possibleColumns = [10, 11, 12, 13, 14, 15];
      for (const cols of possibleColumns) {
        const rows = Math.ceil(totalCells / cols);
        if (rows * cols === totalCells) {
          return cols;
        }
      }

      // Default to 12 for QWERTY-style layouts
      return 12;
    }

    return null;
  }, [fixedLayout, phonemeOrder, validLanguage, gridConfig]);

  // Check if we should use fixed layout
  const shouldUseFixedLayout = useCallback(() => {
    return fixedLayout && getFixedLayoutColumns() !== null;
  }, [fixedLayout, getFixedLayoutColumns]);

  // Helper functions for responsive button sizing
  const getMinButtonSize = useCallback(() => {
    // Use the configurable minimum button size as base, with responsive adjustments
    let baseSize = minButtonSize;

    // For fixed layouts, ensure buttons can fit within the available space
    if (fixedLayout && shouldUseFixedLayout()) {
      const fixedColumns = getFixedLayoutColumns();
      if (fixedColumns) {
        // Calculate available space per button (accounting for gaps and padding)
        const availableWidth = windowWidth - 32; // Account for padding
        const gapSpace = (fixedColumns - 1) * buttonSpacing;
        const maxButtonWidth = (availableWidth - gapSpace) / fixedColumns;

        // Don't let buttons get smaller than 30px, but cap at available space
        baseSize = Math.min(baseSize, Math.max(maxButtonWidth, 30));
      }
    }

    if (windowWidth <= 480) return `${Math.max(baseSize - 15, 30)}px`;
    if (windowWidth <= 768) return `${Math.max(baseSize - 10, 35)}px`;
    if (windowWidth <= 1024) return `${Math.max(baseSize - 5, 40)}px`;
    return `${baseSize}px`;
  }, [minButtonSize, windowWidth, fixedLayout, shouldUseFixedLayout, getFixedLayoutColumns, buttonSpacing]);

  const getMaxButtonSize = useCallback(() => {
    // Calculate max size based on minimum size with better scaling
    let baseSize = minButtonSize;

    // For fixed layouts, ensure buttons can fit within the available space
    if (fixedLayout && shouldUseFixedLayout()) {
      const fixedColumns = getFixedLayoutColumns();
      if (fixedColumns) {
        // Calculate available space per button (accounting for gaps and padding)
        const availableWidth = windowWidth - 32; // Account for padding
        const gapSpace = (fixedColumns - 1) * buttonSpacing;
        const maxButtonWidth = (availableWidth - gapSpace) / fixedColumns;

        // Cap the max size to available space, but allow some growth
        baseSize = Math.min(baseSize, maxButtonWidth);
      }
    }

    if (windowWidth <= 480) return `${baseSize + 5}px`;
    if (windowWidth <= 768) return `${baseSize + 15}px`;
    if (windowWidth <= 1024) return `${baseSize + 25}px`;
    if (windowWidth <= 1440) return `${baseSize + 35}px`;
    return `${baseSize + 45}px`; // Larger buttons for big screens
  }, [minButtonSize, windowWidth, fixedLayout, shouldUseFixedLayout, getFixedLayoutColumns, buttonSpacing]);

  // Check if we should use list layout
  const shouldUseListLayout = useCallback(() => {
    return layoutMode === 'list' && windowWidth <= 480;
  }, [layoutMode, windowWidth]);

  // Get the actual number of columns from the rendered grid
  const getDynamicColumns = useCallback(() => {
    const grid = containerRef.current?.querySelector('.phoneme-grid');
    if (!grid) return null;
    const style = window.getComputedStyle(grid);
    const columns = style.gridTemplateColumns.split(' ').length;
    return columns;
  }, []);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);





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




  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
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
  }, [selectedLanguage, validLanguage]);

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
      setIsDragging(true);
    
    // Add dragging class to element
    element.classList.add('dragging');
  };

  // Add drag end handler to clean up if drop doesn't occur
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
      // Don't call preventDefault() - use touch position flag instead
      // Set a flag to prevent double triggering
      setTouchPosition({ x: event.touches[0].clientX, y: event.touches[0].clientY });
      handlePhonemeClick(phoneme, event);
      return;
    }

    // Edit mode handling
    if (editMode === 'move') {
      // Don't call preventDefault() - React uses passive listeners
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

    // Don't call preventDefault() on React synthetic events
    // React handles this appropriately

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
          // Placeholder for hover logic if needed
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
    }

    cancelDwell();
  };

  const handleLongPress = (phoneme) => {
      if (mode === 'edit') {
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
    // Removed console log to prevent render loop

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

    // Removed console logs to prevent render loop
    return basePhonemes;
  }, [validLanguage, showStressMarkers, phonemeOrder, gridConfig]);

  // Update effect to handle showStressMarkers changes
  useEffect(() => {
    // Get the current phoneme list
    const languageData = phoneticData[validLanguage];
    if (!languageData?.groups) return;

    // Get stress markers list
    const stressMarkers = languageData.groups.stress?.phonemes || [];

    // Get current order or default list
    const currentOrder = phonemeOrder[validLanguage];
    let basePhonemes;

    if (currentOrder && Array.isArray(currentOrder)) {
      basePhonemes = [...currentOrder];
    } else {
      basePhonemes = Object.values(languageData.groups).flatMap(group => group.phonemes);
    }

    // Check if we need to update the phoneme order
    let needsUpdate = false;
    let updatedPhonemes = [...basePhonemes];

    // Update phonemes based on showStressMarkers
    if (showStressMarkers) {
      // Add any missing stress markers
      stressMarkers.forEach(marker => {
        if (!updatedPhonemes.includes(marker)) {
          updatedPhonemes.push(marker);
          needsUpdate = true;
        }
      });
    } else {
      // Remove stress markers
      const filteredPhonemes = updatedPhonemes.filter(phoneme => !stressMarkers.includes(phoneme));
      if (filteredPhonemes.length !== updatedPhonemes.length) {
        updatedPhonemes = filteredPhonemes;
        needsUpdate = true;
      }
    }

    // Only update if there's actually a change to prevent infinite loops
    if (needsUpdate) {
      setPhonemeOrder(prev => ({
        ...prev,
        [validLanguage]: updatedPhonemes
      }));
    }

    // Grid recalculation is handled by other useEffects
  }, [showStressMarkers, validLanguage, phonemeOrder]);

  const handlePhonemeMove = useCallback((phoneme, direction) => {
    // Get current phonemes directly from state to avoid circular dependency
    const currentOrder = phonemeOrder[validLanguage];
    const languageData = phoneticData[validLanguage];

    let currentPhonemes;
    if (currentOrder && Array.isArray(currentOrder)) {
      currentPhonemes = [...currentOrder];
    } else if (languageData?.groups) {
      currentPhonemes = Object.values(languageData.groups).flatMap(group => group.phonemes);
    } else {
      return;
    }

    const currentIndex = currentPhonemes.indexOf(phoneme);
    if (currentIndex === -1) return;

    const newPhonemes = [...currentPhonemes];

    // Calculate grid dimensions for up/down movement
    const fixedColumns = getFixedLayoutColumns();
    const dynamicColumns = getDynamicColumns();
    const columnsPerRow = fixedColumns || dynamicColumns || Math.ceil(Math.sqrt(currentPhonemes.length));

    if (direction === 'left' && currentIndex > 0) {
      [newPhonemes[currentIndex - 1], newPhonemes[currentIndex]] =
      [newPhonemes[currentIndex], newPhonemes[currentIndex - 1]];
    } else if (direction === 'right' && currentIndex < newPhonemes.length - 1) {
      [newPhonemes[currentIndex], newPhonemes[currentIndex + 1]] =
      [newPhonemes[currentIndex + 1], newPhonemes[currentIndex]];
    } else if (direction === 'up' && currentIndex >= columnsPerRow) {
      const upIndex = currentIndex - columnsPerRow;
      [newPhonemes[upIndex], newPhonemes[currentIndex]] =
      [newPhonemes[currentIndex], newPhonemes[upIndex]];
    } else if (direction === 'down' && currentIndex + columnsPerRow < newPhonemes.length) {
      const downIndex = currentIndex + columnsPerRow;
      [newPhonemes[downIndex], newPhonemes[currentIndex]] =
      [newPhonemes[currentIndex], newPhonemes[downIndex]];
    }

    const newPhonemeOrder = {
      ...phonemeOrder,
      [validLanguage]: newPhonemes
    };

    setPhonemeOrder(newPhonemeOrder);

    // Save to localStorage immediately
    localStorage.setItem('phonemeOrder', JSON.stringify(newPhonemeOrder));
  }, [validLanguage, phonemeOrder, getFixedLayoutColumns, getDynamicColumns]);

  const handleStressMarkersToggle = (e) => {
    const newValue = e.target.checked;
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
    // In move mode, add move controls (for both image and text buttons)
    if (mode === 'edit' && editMode === 'move') {
      const currentOrder = phonemeOrder[selectedLanguage] || getAllPhonemes(selectedLanguage);
      const currentIndex = currentOrder.indexOf(phoneme);
      const canMoveLeft = currentIndex > 0;
      const canMoveRight = currentIndex < currentOrder.length - 1;

      // Calculate grid dimensions for up/down movement
      const fixedColumns = getFixedLayoutColumns();
      const dynamicColumns = getDynamicColumns();
      const columnsPerRow = fixedColumns || dynamicColumns || Math.ceil(Math.sqrt(currentOrder.length));
      const canMoveUp = currentIndex >= columnsPerRow;
      const canMoveDown = currentIndex + columnsPerRow < currentOrder.length;

      return (
        <Box sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Render image if available */}
          {customization.image && (
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
          )}
          {/* Render text if no image or if label should be shown */}
          {!customization.image && !customization.hideLabel && (customization.label || phoneme)}

          {/* Up arrow */}
          {canMoveUp && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'up');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                top: -9,
                left: '50%',
                transform: 'translateX(-50%)',
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
              <KeyboardArrowUpIcon fontSize="small" />
            </Box>
          )}

          {/* Down arrow */}
          {canMoveDown && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'down');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                bottom: -9,
                left: '50%',
                transform: 'translateX(-50%)',
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
              <KeyboardArrowDownIcon fontSize="small" />
            </Box>
          )}

          {canMoveLeft && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handlePhonemeMove(phoneme, 'left');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
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

    // If not in move mode, render image or text normally
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

    // If no image and not in move mode, show the phoneme text unless hideLabel is true
    return !customization.hideLabel ? (customization.label || phoneme) : null;
  };

  const renderPhonemeButton = (phoneme, group) => {
    // Handle blank cells - render invisible placeholder
    if (phoneme === '') {
      return (
        <div
          key={`blank-${Math.random()}`}
          className="blank-cell"
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
          width: '100%',
          height: '100%',
          p: 0.5,
          fontSize: '1.1rem',
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
        p: 0  // Removed padding - was Math.round(buttonSpacing)
      }}>
        <div
          className={`phoneme-grid ${shouldUseListLayout() ? 'list-layout' : ''} ${shouldUseFixedLayout() ? 'fixed-layout' : ''}`}
          key={`grid-${showStressMarkers}-${validLanguage}-${windowWidth}-${fixedLayout}`}
          style={{
            '--button-spacing': `${buttonSpacing}px`,
            '--min-button-size': getMinButtonSize(),
            '--max-button-size': getMaxButtonSize(),
            '--fixed-columns': getFixedLayoutColumns() || 'auto',
          }}
        >
          {phoneticData && phoneticData[validLanguage]?.groups && getOrderedPhonemes().map((phoneme) => {
            const group = Object.values(phoneticData[validLanguage]?.groups || {}).find(group => group.phonemes.includes(phoneme));
            return renderPhonemeButton(phoneme, group);
          })}
        </div>
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
            orientation="vertical"
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
          customizations={customizations}
          phonemeOrder={phonemeOrder}
          selectedLanguage={selectedLanguage}
          getAllPhonemes={getAllPhonemes}
          handlePhonemeMove={handlePhonemeMove}
          saveCustomization={saveCustomization}
          getPhonemeColor={getPhonemeColor}
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
