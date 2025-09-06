import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, FormControl, Typography, Tooltip, IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClearIcon from '@mui/icons-material/Clear';
import UndoIcon from '@mui/icons-material/Undo';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { detailedPhoneticData as phoneticData, normalizePhoneme } from './data/phoneticData';
import { config } from './config';
import IPAKeyboard from './components/IPAKeyboard';
import Settings from './components/Settings';
import GameMode from './components/GameMode';
import ttsService from './services/TTSService';
import audioCacheService from './services/AudioCacheService';
import notificationService from './services/NotificationService';
import NotificationDisplay from './components/NotificationDisplay';
import { phonemeToFilename } from './data/phonemeFilenames';
import axios from 'axios';
import WelcomeModal from './components/WelcomeModal';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

const App = () => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('ipaMode');
    if (!saved) return 'build';

    // Try to parse as JSON first (for legacy format), fallback to string
    try {
      return JSON.parse(saved);
    } catch {
      return saved;
    }
  });
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem('selectedLanguage');
    return saved && phoneticData[saved]?.groups ? saved : 'en-GB';
  });
  const [selectedRegion, setSelectedRegion] = useState(() => {
    const savedRegion = localStorage.getItem('selectedRegion');
    if (savedRegion) return savedRegion;
    
    // Set default region based on language
    const language = localStorage.getItem('selectedLanguage') || 'en-GB';
    if (language === 'en-GB') return 'en-GB-london';
    return ''; // No default region for other languages yet
  });
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const saved = localStorage.getItem('selectedVoice');
    if (!saved) return '';

    // Try to parse as JSON first (for legacy format), fallback to string
    try {
      return JSON.parse(saved);
    } catch {
      return saved;
    }
  });
  const [buttonSpacing, setButtonSpacing] = useState(() => parseInt(localStorage.getItem('buttonSpacing')) || 4);
  const [minButtonSize, setMinButtonSize] = useState(() => parseInt(localStorage.getItem('minButtonSize')) || 60);
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'grid');
  const [fixedLayout, setFixedLayout] = useState(() => {
    const saved = localStorage.getItem('fixedLayout');
    return saved === null ? false : saved === 'true';
  });
  const [touchDwellEnabled, setTouchDwellEnabled] = useState(() => localStorage.getItem('touchDwellEnabled') === 'true');
  const [touchDwellTime, setTouchDwellTime] = useState(() => parseInt(localStorage.getItem('touchDwellTime')) || 800);
  const [dwellIndicatorType, setDwellIndicatorType] = useState(() => localStorage.getItem('dwellIndicatorType') || 'border');
  const [dwellIndicatorColor, setDwellIndicatorColor] = useState(() => localStorage.getItem('dwellIndicatorColor') || 'primary');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('hapticFeedback') === 'true');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSpokenMessage, setLastSpokenMessage] = useState('');
  const [lastConvertedText, setLastConvertedText] = useState('');
  const [messageClearedAfterPlay, setMessageClearedAfterPlay] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [audioCache, setAudioCache] = useState({});
  const [cacheLoading, setCacheLoading] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [targetPhonemes, setTargetPhonemes] = useState([]);
  const [currentPhonemeIndex, setCurrentPhonemeIndex] = useState(0);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [showStressMarkers, setShowStressMarkers] = useState(() => {
    const saved = localStorage.getItem('showStressMarkers');
    return saved ? JSON.parse(saved) : true;
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('hasVisitedBefore') !== 'true';
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [convertedText, setConvertedText] = useState('');
  const [showIpaToText, setShowIpaToText] = useState(() => {
    const saved = localStorage.getItem('showIpaToText');
    return saved ? JSON.parse(saved) : true;
  });
  const [speakOnButtonPress, setSpeakOnButtonPress] = useState(() => {
    const saved = localStorage.getItem('speakOnButtonPress');
    return saved ? JSON.parse(saved) : true;
  });
  const [speakWholeUtterance, setSpeakWholeUtterance] = useState(() => {
    const saved = localStorage.getItem('speakWholeUtterance');
    return saved ? JSON.parse(saved) : true;
  });
  const [clearMessageAfterPlay, setClearMessageAfterPlay] = useState(() => {
    const saved = localStorage.getItem('clearMessageAfterPlay');
    return saved ? JSON.parse(saved) : false;
  });
  const [backgroundSettings, setBackgroundSettings] = useState(() => {
    const saved = localStorage.getItem('backgroundSettings');
    return saved ? JSON.parse(saved) : {
      type: 'color',
      color: '#ffffff',
      gradientStart: '#ffffff',
      gradientEnd: '#000000',
      gradientDirection: 'to bottom',
      image: ''
    };
  });
  const [toolbarConfig, setToolbarConfig] = useState(() => {
    const saved = localStorage.getItem('toolbarConfig');
    return saved ? JSON.parse(saved) : {
      showBuild: true,
      showSearch: true,
      showBabble: true,
      showEdit: true,
      showGame: true,
      showSettings: true,
      showSetupWizard: true
    };
  });

  // UI Mode detection from URL parameters
  const getUIMode = () => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for simplified flag
    const simplified = urlParams.get('simplified');
    if (simplified === 'true') return 'simplified';
    if (simplified === 'minimal') return 'minimal';

    // Check for explicit toolbar control
    const toolbar = urlParams.get('toolbar');
    if (toolbar === 'none') return 'kiosk';
    if (toolbar && toolbar !== 'default') {
      // Clean and validate button names
      const buttons = toolbar.split(',')
        .map(btn => btn.trim().toLowerCase())
        .filter(btn => btn.length > 0);
      return { type: 'custom', buttons };
    }

    // Check for UI mode
    const uiMode = urlParams.get('ui');
    if (uiMode) return uiMode;

    return 'full'; // default
  };

  // Apply UI mode to toolbar config without modifying user preferences
  const getToolbarConfigForMode = (uiMode, userToolbarConfig) => {
    // Handle custom toolbar specification
    if (typeof uiMode === 'object' && uiMode.type === 'custom') {
      const customConfig = {
        showBuild: false,
        showSearch: false,
        showBabble: false,
        showEdit: false,
        showGame: false,
        showSettings: false,
        showSetupWizard: false
      };

      // Enable only specified buttons
      uiMode.buttons.forEach(button => {
        // Map button names to config keys
        const buttonMap = {
          'build': 'showBuild',
          'search': 'showSearch',
          'babble': 'showBabble',
          'edit': 'showEdit',
          'game': 'showGame',
          'settings': 'showSettings',
          'setupwizard': 'showSetupWizard'
        };

        const key = buttonMap[button];
        if (key && customConfig.hasOwnProperty(key)) {
          customConfig[key] = true;
        }
      });

      // Always ensure settings is available unless explicitly excluded
      if (!uiMode.buttons.includes('settings') && uiMode.buttons.length > 0) {
        customConfig.showSettings = true;
      }

      return customConfig;
    }

    // Handle predefined UI modes
    switch (uiMode) {
      case 'simplified':
        return {
          ...userToolbarConfig,
          showBuild: true,
          showSettings: true,
          showSearch: false,
          showBabble: false,
          showEdit: false,
          showGame: false,
          showSetupWizard: false
        };
      case 'minimal':
        return {
          ...userToolbarConfig,
          showSettings: true,
          showBuild: false,
          showSearch: false,
          showBabble: false,
          showEdit: false,
          showGame: false,
          showSetupWizard: false
        };
      case 'kiosk':
        return {
          showBuild: false,
          showSearch: false,
          showBabble: false,
          showEdit: false,
          showGame: false,
          showSettings: false,
          showSetupWizard: false
        };
      case 'full':
      default:
        return userToolbarConfig;
    }
  };

  // Get the effective toolbar configuration (URL mode takes precedence)
  const uiMode = getUIMode();
  const effectiveToolbarConfig = getToolbarConfigForMode(uiMode, toolbarConfig);

  // Log UI mode for debugging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 UI Mode:', uiMode);
      console.log('🔧 User Toolbar Config:', toolbarConfig);
      console.log('✅ Effective Toolbar Config:', effectiveToolbarConfig);
    }
  }, [uiMode, toolbarConfig, effectiveToolbarConfig]);

  useEffect(() => {
    const initializeData = () => {
      if (!phoneticData) {
        console.error('phoneticData is not loaded');
        setError('Failed to load phonetic data');
        setDataLoading(false);
        return;
      }

      // Validate the data structure
      if (!phoneticData[selectedLanguage]?.groups) {
        console.warn(`No valid data found for language: ${selectedLanguage}`);
        // Try to fall back to en-GB
        if (phoneticData['en-GB']?.groups) {
          setSelectedLanguage('en-GB');
        } else {
          setError('No valid phonetic data available');
          setDataLoading(false);
          return;
        }
      }

      // Data is valid, set the states
      setIsDataLoaded(true);
      setIsInitialized(true);
      setDataLoading(false);
      setError(null);
    };

    initializeData();
  }, [selectedLanguage]);

  // URL parameter loading effect
  useEffect(() => {
    const loadConfigFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const configParam = urlParams.get('config');

      // Check if we've already loaded this config to prevent infinite loop
      const lastLoadedConfig = localStorage.getItem('lastLoadedConfig');

      if (configParam && lastLoadedConfig !== configParam) {
        try {
          let configData;

          // Check if it's a URL (starts with http/https)
          if (configParam.startsWith('http://') || configParam.startsWith('https://')) {
            // Load from remote URL
            console.log('Loading config from remote URL:', configParam);
            const response = await fetch(configParam);
            configData = await response.json();
          } else {
            // Load from local example file
            console.log('Loading config from local file:', configParam);
            const response = await fetch(`/examples/${configParam}.json`);
            configData = await response.json();
          }

          if (configData) {
            // Apply the configuration
            console.log('Applying configuration:', configData);

            // Reset background settings to default if not included in config
            if (!configData.backgroundSettings) {
              const defaultBackground = {
                type: 'color',
                color: '#ffffff',
                gradientStart: '#ffffff',
                gradientEnd: '#000000',
                gradientDirection: 'to bottom',
                image: ''
              };
              localStorage.setItem('backgroundSettings', JSON.stringify(defaultBackground));
              console.log('Reset background settings to default');
            }

            // Update localStorage with all the configuration
            Object.entries(configData).forEach(([key, value]) => {
              try {
                if (typeof value === 'boolean' || typeof value === 'object') {
                  localStorage.setItem(key, JSON.stringify(value));
                } else {
                  localStorage.setItem(key, value);
                }
              } catch (error) {
                console.warn(`Failed to save ${key} to localStorage:`, error);
              }
            });

            // Mark this config as loaded to prevent infinite loop
            localStorage.setItem('lastLoadedConfig', configParam);

            // Remove the config parameter from URL to prevent reload loop
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('config');
            window.history.replaceState({}, '', newUrl);

            // Show success message
            alert('Configuration loaded successfully! The page will now reload to apply all changes.');

            // Reload the page to apply all changes
            setTimeout(() => {
              window.location.reload();
            }, 200);
          }
        } catch (error) {
          console.error('Error loading configuration:', error);
          alert(`Failed to load configuration: ${error.message}`);
          // Remove the config parameter from URL even on error
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('config');
          window.history.replaceState({}, '', newUrl);
        }
      }
    };

    // Only run once when component mounts
    loadConfigFromUrl();
  }, []);

  // Clean up localStorage from any JSON-stringified simple values on app start
  useEffect(() => {
    const cleanupLocalStorage = () => {
      const keysToClean = ['selectedVoice', 'ipaMode', 'selectedLanguage', 'selectedRegion'];

      keysToClean.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && value.startsWith('"') && value.endsWith('"')) {
          // This is a JSON-stringified simple string, clean it up
          localStorage.setItem(key, value.slice(1, -1));
        }
      });
    };

    cleanupLocalStorage();
  }, []);

  const loadAudioFile = useCallback(async (fileName) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();

      const onLoad = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadstart', onLoadStart);
        resolve(audio);
      };

      const onError = (e) => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadstart', onLoadStart);
        // Don't log individual file loading errors - they're expected for missing files
        reject(new Error(`Audio file not available: ${fileName}`));
      };

      const onLoadStart = () => {
        // Removed verbose logging to reduce console noise
      };

      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onError);
      audio.addEventListener('loadstart', onLoadStart);

      const url = `/audio/phonemes/${fileName}`;
      audio.src = url;
      audio.preload = 'auto';
    });
  }, []);

  const getPhonemeFileName = useCallback((phoneme, voice) => {
    // Use URL-friendly name if available, otherwise use URL-encoded phoneme
    const filenamePart = phonemeToFilename[phoneme] || encodeURIComponent(phoneme);
    const fileName = `${filenamePart}_${voice}.mp3`;

    // Debug logging to check for malformed filenames
    if (voice.includes('"')) {
      console.error('Voice name contains quotes:', voice);
    }

    // Debug logging for diphthongs to verify mapping
    if (phoneme.length > 1 && /[aeiouɑɔəʊɪʊ]/.test(phoneme)) {
      console.log(`Diphthong ${phoneme} → filename: ${fileName}`);
    }

    return fileName;
  }, []);

  // Test function to check if audio files are accessible
  const testAudioAvailability = useCallback(async () => {
    // Removed HEAD requests to reduce console noise
    // Audio availability is now tested during actual loading attempts
  }, []);

  // Function to manually clear audio cache (useful for debugging)
  const clearAudioCache = useCallback(() => {
    setAudioCache({});
    console.log('Audio cache manually cleared - this will force reload of all audio files');
  }, []);

  // Expose cache clear function to global scope for debugging
  useEffect(() => {
    window.clearAudioCache = clearAudioCache;
    return () => {
      delete window.clearAudioCache;
    };
  }, [clearAudioCache]);

  const cachePhonemeAudio = useCallback(async () => {
    if (!selectedVoice || cacheLoading) {
      // Silently return if voice not selected or already caching
      return;
    }

    if (!phoneticData?.[selectedLanguage]?.groups) {
      // Silently return if language data not loaded yet
      return;
    }

    setCacheLoading(true);
    // Clear existing cache when voice changes
    setAudioCache({});

    const newCache = {};

    // Get all phonemes except stress/intonation marks
    const phonemes = Object.values(phoneticData[selectedLanguage].groups)
      .flatMap(group => group.phonemes)
      .filter(phoneme =>
        phoneme &&
        phoneme.trim() &&
        // Skip ALL stress/intonation marks including primary/secondary stress
        !/[↗↘↑↓|‖ˈˌ]/.test(phoneme) &&
        // Skip empty or invalid phonemes
        phoneme !== '�' &&
        // Ensure the phoneme is properly encoded
        encodeURIComponent(phoneme) !== '%EF%BF%BD'
      );

    if (phonemes.length === 0) {
      setCacheLoading(false);
      return;
    }

    try {
      // Load pre-generated audio files in parallel batches
      const batchSize = 5;

      for (let i = 0; i < phonemes.length; i += batchSize) {
        const batch = phonemes.slice(i, i + batchSize);

        await Promise.all(batch.map(async (phoneme) => {
          try {
            // Check if it's a complex phoneme that should use TTS
            const isComplex = /^[aeiouɑɔəʊɪʊ][ɪʊə]$|ː/.test(phoneme);

            if (!isComplex) {
              // Try the exact voice first for single phonemes
              const fileName = getPhonemeFileName(phoneme, selectedVoice);

              try {
                const audio = await loadAudioFile(fileName);
                newCache[phoneme] = audio;
                // Reduced logging to minimize console noise
              } catch (loadError) {
                // If the primary voice fails, try fallback voices
                const fallbackVoices = ['en-GB-RyanNeural', 'en-GB-LibbyNeural', 'en-US-JennyNeural']
                  .filter(v => v !== selectedVoice);

                let fallbackSuccess = false;
                for (const fallbackVoice of fallbackVoices) {
                  try {
                    const fallbackFileName = getPhonemeFileName(phoneme, fallbackVoice);
                    const audio = await loadAudioFile(fallbackFileName);
                    newCache[phoneme] = audio;
                    fallbackSuccess = true;
                    break;
                  } catch (fallbackError) {
                    // Fallback failed - continue to next fallback
                  }
                }
                if (!fallbackSuccess) {
                  // All pre-recorded voices failed - will use TTS fallback during playback
                }
              }
            } else {
              // For complex phonemes, we'll generate them on demand using Azure TTS
            }
          } catch (error) {
            console.warn(`Failed to cache phoneme ${phoneme}:`, error.message);
          }
        }));

        // Small delay between batches to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setAudioCache(newCache);
      // Audio cache completed silently
    } catch (error) {
      console.error('Error in audio caching:', error);
    } finally {
      setCacheLoading(false);
    }
  }, [selectedVoice, selectedLanguage, cacheLoading, getPhonemeFileName, loadAudioFile]);

  // Consolidated audio caching effect
  useEffect(() => {
    if (isInitialized && selectedVoice && selectedLanguage && isDataLoaded) {
      testAudioAvailability();
      cachePhonemeAudio();
    }
  }, [selectedVoice, selectedLanguage, isInitialized, isDataLoaded, testAudioAvailability, cachePhonemeAudio]);

  const handleSearchModeClick = () => {
    if (!isInitialized || !isDataLoaded) {
      alert('Please wait for the application to finish loading.');
      return;
    }
    setMode('search');
    setSearchDialogOpen(true);
  };

  const handleRestartWelcome = () => {
    localStorage.removeItem('hasVisitedBefore');
    setShowWelcome(true);
  };

  const allActions = [
    { icon: <MessageIcon />, name: 'Build Mode', onClick: () => setMode('build'), key: 'showBuild' },
    { icon: <SearchIcon />, name: 'Search Mode', onClick: handleSearchModeClick, key: 'showSearch' },
    { icon: <ChildCareIcon />, name: 'Babble Mode', onClick: () => setMode('babble'), key: 'showBabble' },
    { icon: <EditIcon />, name: 'Edit Mode', onClick: () => setMode('edit'), key: 'showEdit' },
    { icon: <SportsEsportsIcon />, name: 'Game Mode', onClick: () => setMode('game'), key: 'showGame' },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true), key: 'showSettings' },
    { icon: <RestartAltIcon />, name: 'Setup Wizard', onClick: handleRestartWelcome, key: 'showSetupWizard' }
  ];

  // Filter actions based on effective toolbar configuration (URL mode + user preferences)
  const actions = allActions.filter(action => effectiveToolbarConfig[action.key]);

  useEffect(() => {
    const testApiConnectivity = async () => {
      try {
        console.log('🔍 Testing API connectivity to:', config.apiUrl + '/api/test');
        const response = await config.api.get('/api/test');
        console.log('✅ API connectivity test passed:', response.data);
        return true;
      } catch (error) {
        console.error('❌ API connectivity test failed:', error.message);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
        return false;
      }
    };

    const checkAzureStatus = async () => {
      try {
        console.log('🔍 Checking Azure TTS status...');
        const response = await config.api.get('/api/azure/status');
        console.log('Azure status:', response.data);

        if (!response.data.configured) {
          console.warn('⚠️ Azure TTS not configured:', {
            hasKey: response.data.hasKey,
            hasRegion: response.data.hasRegion,
            region: response.data.region
          });
          return false;
        }

        // Test Azure connectivity
        try {
          const testResponse = await config.api.post('/api/azure/test');
          console.log('✅ Azure TTS test passed:', testResponse.data);
          return true;
        } catch (testError) {
          console.error('❌ Azure TTS test failed:', testError.response?.data || testError.message);
          return false;
        }
      } catch (error) {
        console.error('❌ Azure status check failed:', error.message);
        return false;
      }
    };

    const fetchVoices = async () => {
      try {
        console.log('🎤 Attempting to fetch voices from:', config.apiUrl + '/api/voices');
        setVoicesLoading(true);

        // Test basic connectivity first
        const isConnected = await testApiConnectivity();
        if (!isConnected) {
          throw new Error('API connectivity test failed');
        }

        // Check Azure status
        try {
          const azureWorking = await checkAzureStatus();
          if (!azureWorking) {
            console.warn('⚠️ Azure TTS may not be working properly, but continuing with voice setup...');
          }
        } catch (azureError) {
          console.warn('⚠️ Azure status check failed, but continuing with voice setup...', azureError.message);
        }

        const response = await config.api.get('/api/voices');
        console.log('✅ Voice fetch response:', response.status, response.data);

        if (response.data && typeof response.data === 'object') {
          console.log('📋 Voices data received:', response.data);
          setAvailableVoices(response.data);
          // Set default voice if available and none is currently selected
          if (selectedLanguage && response.data[selectedLanguage]?.length > 0 && !selectedVoice) {
            setSelectedVoice(response.data[selectedLanguage][0].name);
          }
        } else {
          throw new Error('Invalid voice data received');
        }
      } catch (error) {
        console.error('❌ Error fetching voices:', error.message);
        console.error('Full error:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          status: error.response?.status,
          statusText: error.response?.statusText,
          timeout: error.code === 'ECONNABORTED',
          networkError: error.code === 'ERR_NETWORK'
        });

        // Fallback to static voice data if network fails
        console.log('🔄 Using fallback voice data...');
        const fallbackVoices = {
          'en-GB': [
            { name: 'en-GB-LibbyNeural', displayName: 'Libby (Female)', locale: 'en-GB' },
            { name: 'en-GB-RyanNeural', displayName: 'Ryan (Male)', locale: 'en-GB' },
            { name: 'en-GB-SoniaNeural', displayName: 'Sonia (Female)', locale: 'en-GB' },
          ],
          'en-US': [
            { name: 'en-US-JennyNeural', displayName: 'Jenny (Female)', locale: 'en-US' },
            { name: 'en-US-GuyNeural', displayName: 'Guy (Male)', locale: 'en-US' },
            { name: 'en-US-AriaNeural', displayName: 'Aria (Female)', locale: 'en-US' },
          ],
        };

        setAvailableVoices(fallbackVoices);
        if (selectedLanguage && fallbackVoices[selectedLanguage]?.length > 0 && !selectedVoice) {
          setSelectedVoice(fallbackVoices[selectedLanguage][0].name);
        }
      } finally {
        setVoicesLoading(false);
      }
    };

    // Only fetch voices if we don't have them yet or if language changed
    if (voicesLoading || Object.keys(availableVoices).length === 0) {
      fetchVoices();
    }
  }, [selectedLanguage, voicesLoading, availableVoices, selectedVoice]);

  // Set initial voice when language changes
  useEffect(() => {
    if (!voicesLoading && availableVoices[selectedLanguage]?.length > 0) {
      const voices = availableVoices[selectedLanguage];
      if (!selectedVoice || !voices.find(v => v.name === selectedVoice)) {
        setSelectedVoice(voices[0].name);
      }
    }
  }, [selectedLanguage, availableVoices, voicesLoading, selectedVoice]);

  useEffect(() => {
    localStorage.setItem('ipaMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem('selectedRegion', selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    localStorage.setItem('selectedVoice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('buttonSpacing', buttonSpacing);
  }, [buttonSpacing]);

  useEffect(() => {
    localStorage.setItem('minButtonSize', minButtonSize);
  }, [minButtonSize]);

  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem('fixedLayout', fixedLayout);
  }, [fixedLayout]);

  useEffect(() => {
    localStorage.setItem('touchDwellEnabled', touchDwellEnabled);
  }, [touchDwellEnabled]);

  useEffect(() => {
    localStorage.setItem('touchDwellTime', touchDwellTime);
  }, [touchDwellTime]);

  useEffect(() => {
    localStorage.setItem('dwellIndicatorType', dwellIndicatorType);
  }, [dwellIndicatorType]);

  useEffect(() => {
    localStorage.setItem('dwellIndicatorColor', dwellIndicatorColor);
  }, [dwellIndicatorColor]);

  useEffect(() => {
    localStorage.setItem('hapticFeedback', hapticFeedback);
  }, [hapticFeedback]);

  // Load saved preferences
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    const savedRegion = localStorage.getItem('selectedRegion');
    if (savedLanguage) setSelectedLanguage(savedLanguage);
    if (savedRegion) setSelectedRegion(savedRegion);
  }, []);

  // Update region when language changes
  useEffect(() => {
    if (selectedLanguage === 'en-GB' && !selectedRegion) {
      setSelectedRegion('en-GB-london');
    } else if (selectedLanguage !== 'en-GB') {
      setSelectedRegion(''); // Clear region for non-UK English
    }
  }, [selectedLanguage, selectedRegion]);

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    localStorage.setItem('selectedRegion', region);
  };

  // Functions moved above to fix hoisting issue

  // Functions moved above to fix hoisting issue

  // Duplicate function removed - defined above



  const handlePhonemeClick = (phoneme) => {
    // In build mode, update the message
    if (mode === 'build') {
      setMessageClearedAfterPlay(false);
      setLastSpokenMessage('');
      setLastConvertedText('');
      setMessage(prev => prev + phoneme);

      // Speak the phoneme if setting is enabled
      if (speakOnButtonPress) {
        playPhoneme(phoneme);
      }
      return;
    }
    
    // In search mode, check if it's the correct next phoneme
    if (mode === 'search' && targetPhonemes.length > 0) {
      const normalizedInput = normalizePhoneme(phoneme);
      // Target phonemes are already normalized
      if (normalizedInput === targetPhonemes[currentPhonemeIndex]) {
        setMessage(prev => prev + phoneme);
        setCurrentPhonemeIndex(prev => prev + 1);
        // Play the phoneme
        playPhoneme(phoneme);
      }
      return;
    }
    
    // In babble mode, play audio immediately from cache
    if (mode === 'babble') {
      playPhoneme(phoneme);
    }
  };

  // Function for playing single phonemes (button clicks) - uses cached audio with TTS fallback
  const playPhoneme = useCallback(
    (phoneme) =>
      audioCacheService.playSinglePhoneme(phoneme, {
        audioCache,
        getPhonemeFileName,
        loadAudioFile,
        selectedVoice,
        selectedLanguage,
      }),
    [audioCache, getPhonemeFileName, loadAudioFile, selectedVoice, selectedLanguage]
  );

  const speak = async () => {
    if (!message) return;

    let converted = '';
    // Only fetch conversion if the feature is enabled
    if (showIpaToText) {
      try {
        const response = await axios.post('https://dolphin-app-62ztl.ondigitalocean.app/ipa-to-text', {
          ipa: message
        });

        if (response.data && response.data.text) {
          converted = response.data.text;
          setConvertedText(converted);
        }
      } catch (error) {
        console.warn('Error converting IPA to text:', error);
        setConvertedText('');
      }
    } else {
      setConvertedText('');
    }

    // Use Azure TTS only - no browser fallback (unreliable and lacks SSML support)
    try {
      // For longer messages, use the whole utterance function with proper blending
      if (message.length > 3) {
        await speakWholeUtteranceText(message);
      } else {
        // For short messages, use single phoneme approach
        await ttsService.synthesizePhonemeSequence(message, selectedVoice, selectedLanguage);
      }

      if (clearMessageAfterPlay) {
        setLastSpokenMessage(message);
        setLastConvertedText(converted);
        setMessage('');
        setConvertedText('');
        setMessageClearedAfterPlay(true);
      }
    } catch (error) {
      console.error('Azure TTS failed:', error);
      // Show user-friendly error message using notification service
      notificationService.showTTSError(error, 'speech synthesis');
    }
  };

  const handleUndo = () => {
    setMessage(lastSpokenMessage);
    setConvertedText(lastConvertedText);
    setMessageClearedAfterPlay(false);
    setLastSpokenMessage('');
    setLastConvertedText('');
  };

  const handleSpeakRequest = async (text) => {
    if (!text || !selectedVoice) return;

    try {
      console.log('Making TTS request:', {
        text,
        voice: selectedVoice,
        language: selectedLanguage,
        usePhonemes: false
      });

      const response = await config.api.post('/api/tts', {
        text,
        voice: selectedVoice,
        language: selectedLanguage,
        usePhonemes: false,  // Explicitly set to false for natural word pronunciation
        isWholeUtterance: false
      });

      console.log('TTS response:', response.data);

      if (response.data && response.data.audio) {
        // Determine audio format based on backend response
        const audioFormat = response.data.format === 'riff-48khz-16bit-mono-pcm' ?
          'audio/wav' : 'audio/mp3';

        const audio = new Audio(`data:${audioFormat};base64,${response.data.audio}`);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name !== 'NotAllowedError') {
              console.error('Error in speech synthesis:', err);
            }
          });
        }
      } else {
        console.error('No audio data in response:', response.data);
      }
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    }
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    // Set default region for UK English
    if (language === 'en-GB') {
      setSelectedRegion('en-GB-london');
    } else {
      setSelectedRegion(''); // Clear region for other languages
    }
    // Reset voice when language changes
    const voices = availableVoices[language] || [];
    if (voices.length > 0) {
      setSelectedVoice(voices[0].name);
    }
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  };



  const handleSearchSubmit = async () => {
    if (!searchWord.trim()) {
      alert('Please enter a word to search');
      return;
    }

    if (!phoneticData?.[selectedLanguage]?.groups) {
      console.warn('Cannot search: missing required data');
      alert('Error: Language data not loaded. Please try again.');
      return;
    }

    try {
      const langCode = selectedLanguage === 'en-GB' ? 'en' : selectedLanguage.toLowerCase();
      const apiUrl = `${process.env.REACT_APP_PHONEMIZE_API || 'https://dolphin-app-62ztl.ondigitalocean.app'}/phonemize`;
      
      console.log('Making phonemize request:', {
        text: searchWord,
        language: langCode,
        url: apiUrl
      });

      const response = await axios.post(apiUrl, {
        text: searchWord,
        language: langCode
      });

      console.log('Phonemize response:', response.data);

      if (response.data && response.data.ipa) {
        let phonemeArray = [];
        let currentPhoneme = '';
        const ipa = response.data.ipa;
        
        console.log('Starting IPA processing. Full IPA string:', ipa);
        console.log('Include stress markers:', showStressMarkers);
        
        // Get all phonemes including their normalized versions
        const allPhonemes = Object.values(phoneticData[selectedLanguage].groups)
          .flatMap(group => {
            // Skip stress markers if they're not included
            if (!showStressMarkers && group.title === 'Stress & Intonation') {
              return [];
            }
            return group.phonemes;
          })
          .reduce((acc, p) => {
            acc.add(p);
            acc.add(normalizePhoneme(p));
            return acc;
          }, new Set());

        // Get valid diphthongs from the phonetic data
        const validDiphthongs = phoneticData[selectedLanguage].groups.diphthongs?.phonemes || [];


        
        // Process the IPA string character by character
        for (let i = 0; i < ipa.length; i++) {
          const char = ipa[i];
          const isStressMarker = /[ˈˌ]/.test(char);
          
          // Handle stress markers based on includeStressMarkers setting
          if (isStressMarker) {
            if (currentPhoneme) {
              const normalizedPhoneme = normalizePhoneme(currentPhoneme);
              phonemeArray.push(normalizedPhoneme);
              currentPhoneme = '';
            }
            if (showStressMarkers) {
              phonemeArray.push(char);
            }
            continue;
          }
          
          // Handle length markers
          if (char === 'ː') {
            if (currentPhoneme) {
              currentPhoneme += char;
            }
            continue;
          }
          
          // Handle diphthongs and other multi-character phonemes
          const potentialDiphthong = currentPhoneme + char;

          if (currentPhoneme && validDiphthongs.includes(potentialDiphthong)) {
            currentPhoneme = potentialDiphthong;
          } else {
            if (currentPhoneme) {
              const normalizedPhoneme = normalizePhoneme(currentPhoneme);
              if (allPhonemes.has(normalizedPhoneme)) {
                phonemeArray.push(normalizedPhoneme);
              }
            }
            currentPhoneme = char;
          }
        }
        
        // Add the last phoneme if there is one
        if (currentPhoneme) {
          const normalizedPhoneme = normalizePhoneme(currentPhoneme);
          if (allPhonemes.has(normalizedPhoneme)) {
            phonemeArray.push(normalizedPhoneme);
          }
        }

        // Filter out any empty strings that might have been added
        phonemeArray = phonemeArray.filter(p => p.trim());

        console.log('Search processed phonemes:', phonemeArray);
        setTargetPhonemes(phonemeArray);
        setCurrentPhonemeIndex(0);
        setSearchDialogOpen(false);
        setMessage('');
      }
    } catch (error) {
      console.error('Error phonemizing word:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      alert(`Error converting word to phonemes: ${error.message}`);
    }
  };

  const handleCloseWelcome = () => {
    localStorage.setItem('hasVisitedBefore', 'true');
    setShowWelcome(false);
  };

  // Removed debug logging to reduce console noise

  // Update localStorage when showStressMarkers changes
  useEffect(() => {
    localStorage.setItem('showStressMarkers', JSON.stringify(showStressMarkers));
  }, [showStressMarkers]);

  const handleStressMarkersChange = (newValue) => {
    console.log('Changing stress markers to:', newValue);
    setShowStressMarkers(newValue);
    localStorage.setItem('showStressMarkers', JSON.stringify(newValue));
  };

  const handleBackgroundSave = (settings) => {
    setBackgroundSettings(settings);
  };

  const getBackgroundStyle = () => {
    if (backgroundSettings.type === 'color') {
      return {
        backgroundColor: backgroundSettings.color
      };
    } else if (backgroundSettings.type === 'gradient') {
      return {
        background: `linear-gradient(${backgroundSettings.gradientDirection}, ${backgroundSettings.gradientStart}, ${backgroundSettings.gradientEnd})`
      };
    } else if (backgroundSettings.type === 'image' && backgroundSettings.image) {
      return {
        backgroundImage: `url(${backgroundSettings.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {};
  };

  // Add effect to save showIpaToText to localStorage
  useEffect(() => {
    localStorage.setItem('showIpaToText', JSON.stringify(showIpaToText));
  }, [showIpaToText]);

  // Add effects to save speech settings to localStorage
  useEffect(() => {
    localStorage.setItem('speakOnButtonPress', JSON.stringify(speakOnButtonPress));
  }, [speakOnButtonPress]);

  useEffect(() => {
    localStorage.setItem('speakWholeUtterance', JSON.stringify(speakWholeUtterance));
  }, [speakWholeUtterance]);

  useEffect(() => {
    localStorage.setItem('clearMessageAfterPlay', JSON.stringify(clearMessageAfterPlay));
  }, [clearMessageAfterPlay]);

  useEffect(() => {
    localStorage.setItem('backgroundSettings', JSON.stringify(backgroundSettings));
  }, [backgroundSettings]);

  useEffect(() => {
    localStorage.setItem('toolbarConfig', JSON.stringify(toolbarConfig));
  }, [toolbarConfig]);

  // Add keyboard shortcut for settings in kiosk mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Shift+S opens settings in kiosk mode
      if (uiMode === 'kiosk' && event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };

    if (uiMode === 'kiosk') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [uiMode]);

  // Function for speaking multi-phoneme sequences - ALWAYS uses Azure TTS for proper blending
  // Function for speaking multi-phoneme sequences - ALWAYS uses Azure TTS for proper blending
  const speakWholeUtteranceText = useCallback(async (text) => {
    if (!text || !selectedVoice) return;

    try {
      // Use TTS service for multi-phoneme sequences (never cached audio)
      await ttsService.synthesizePhonemeSequence(text, selectedVoice, selectedLanguage);
    } catch (error) {
      console.error('Whole utterance TTS failed:', {
        error: error.message,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        voice: selectedVoice
      });
      // Rethrow so the speak function can handle the error
      throw error;
    }
  }, [selectedVoice, selectedLanguage]);

  // Add effect to speak whole utterance when message changes in build mode
  useEffect(() => {
    if (speakWholeUtterance && mode === 'build' && message) {
      console.log('Whole utterance reading triggered:', { message, speakWholeUtterance, mode });

      // Don't speak whole utterance if speakOnButtonPress is enabled (to avoid double-speaking)
      // Only speak whole utterance when speakOnButtonPress is disabled or when explicitly requested
      if (!speakOnButtonPress) {
        // Add a small delay to avoid speaking on every character when typing
        const timeoutId = setTimeout(() => {
          speakWholeUtteranceText(message);
        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);
      }
    }
  }, [message, speakWholeUtterance, mode, speakWholeUtteranceText, speakOnButtonPress]);

  if (dataLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography>Loading phonetic data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height="100vh"
        gap={2}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Welcome Modal */}
        <WelcomeModal 
          open={showWelcome} 
          onClose={handleCloseWelcome} 
        />
        
        {/* Existing content */}
        <Box sx={{
          height: '100vh',
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Vertical navigation sidebar - hidden in kiosk mode */}
          {uiMode !== 'kiosk' && (
            <Box sx={{
              width: '48px',
              borderRight: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 1
            }}>
              {/* Mode selection */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%'
              }}>
                {actions.map((action) => (
                  <Tooltip key={action.name} title={action.name} placement="right">
                    <IconButton
                      onClick={action.onClick}
                      color={mode === action.name.toLowerCase().split(' ')[0] ? 'primary' : 'default'}
                      sx={{
                        mb: 1,
                        width: '40px',
                        height: '40px',
                        backgroundColor: mode === action.name.toLowerCase().split(' ')[0] ? 'action.selected' : 'transparent',
                        '&:hover': {
                          backgroundColor: mode === action.name.toLowerCase().split(' ')[0] ? 'action.selected' : 'action.hover'
                        }
                      }}
                    >
                      {action.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>

              {/* Game mode controls */}
              {mode === 'game' && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  mt: 'auto'
                }}>
                  <Divider sx={{ width: '80%', my: 1 }} />
                  <Tooltip title="Help" placement="right">
                    <IconButton
                      onClick={() => window.dispatchEvent(new CustomEvent('openGameHelp'))}
                      sx={{ mb: 1, width: '40px', height: '40px' }}
                    >
                      <HelpOutlineIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Settings" placement="right">
                    <IconButton
                      onClick={() => window.dispatchEvent(new CustomEvent('openGameSettings'))}
                      sx={{ width: '40px', height: '40px' }}
                    >
                      <SchoolIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          )}

          {/* Main content area */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Message bar - always visible but disabled in edit mode */}
            {(mode === 'build' || mode === 'search' || mode === 'babble' || mode === 'edit') && (
              <Box sx={{ 
                p: 1.5, 
                display: 'flex', 
                gap: 2,
                borderBottom: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                height: '56px'  
              }}>
                <Box sx={{ 
                  position: 'relative', 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <TextField
                    fullWidth
                    value={message}
                    onChange={(e) => {
                      if (mode === 'build') {
                        setMessageClearedAfterPlay(false);
                        setLastSpokenMessage('');
                        setLastConvertedText('');
                        setMessage(e.target.value);
                      }
                    }}
                    placeholder={mode === 'search' ? `Find: ${searchWord}` : "Type or click IPA symbols..."}
                    disabled={mode === 'babble' || mode === 'search' || mode === 'edit'}
                    size="small"
                    sx={{
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: mode === 'edit' ? 'transparent' : 'text.primary',
                        opacity: mode === 'edit' ? 0 : 0.7,
                      }
                    }}
                  />
                  {showIpaToText && convertedText && (
                    <Typography
                      variant="body2"
                      sx={{
                        position: 'absolute',
                        right: 14,
                        color: 'text.disabled',  // Make the text lighter
                        pointerEvents: 'none',
                        maxWidth: '40%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85em',  // Make the text slightly smaller
                        fontStyle: 'italic'  // Add italic style to differentiate it
                      }}
                    >
                      {convertedText}
                    </Typography>
                  )}
                </Box>
                {messageClearedAfterPlay ? (
                  <Button
                    variant="contained"
                    onClick={handleUndo}
                    disabled={mode === 'babble' || mode === 'edit'}
                    size="small"
                    sx={{ visibility: mode === 'edit' ? 'hidden' : 'visible' }}
                  >
                    <UndoIcon />
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={speak}
                    disabled={!message || mode === 'babble' || mode === 'edit'}
                    size="small"
                    sx={{ visibility: mode === 'edit' ? 'hidden' : 'visible' }}
                  >
                    <VolumeUpIcon />
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => {
                    setMessage('');
                    setConvertedText(''); // Clear converted text when clearing message
                    setMessageClearedAfterPlay(false);
                    setLastSpokenMessage('');
                    setLastConvertedText('');
                    if (mode === 'search') {
                      setCurrentPhonemeIndex(0);
                    }
                  }}
                  disabled={!message || mode === 'babble' || mode === 'edit'}
                  size="small"
                  sx={{ visibility: mode === 'edit' ? 'hidden' : 'visible' }}
                >
                  <ClearIcon />
                </Button>
              </Box>
            )}

            {/* Content */}
            <Box sx={{
              flex: 1,
              minHeight: 0,
              ...getBackgroundStyle(),
              position: 'relative'
            }}>
              {/* Kiosk mode help indicator */}
              {uiMode === 'kiosk' && (
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1000,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  opacity: 0.6,
                  '&:hover': { opacity: 1 }
                }}>
                  Press Ctrl+Shift+S for Settings
                </Box>
              )}

              {mode === 'edit' ? (
                <Box sx={{ height: '100%' }}>
                  <IPAKeyboard
                    mode="edit"
                    onPhonemeClick={handlePhonemeClick}
                    buttonSpacing={buttonSpacing}
                    selectedLanguage={selectedLanguage}
                    minButtonSize={minButtonSize}
                    layoutMode={layoutMode}
                    fixedLayout={fixedLayout}
                    touchDwellEnabled={touchDwellEnabled}
                    touchDwellTime={touchDwellTime}
                    dwellIndicatorType={dwellIndicatorType}
                    dwellIndicatorColor={dwellIndicatorColor}
                    hapticFeedback={hapticFeedback}
                    showStressMarkers={showStressMarkers}
                    onStressMarkersChange={handleStressMarkersChange}
                    backgroundSettings={backgroundSettings}
                    onBackgroundSave={handleBackgroundSave}
                  />
                </Box>
              ) : mode === 'game' ? (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <GameMode
                    onSpeakRequest={handleSpeakRequest}
                    selectedLanguage={selectedLanguage}
                    selectedRegion={selectedRegion}
                    voices={availableVoices}
                    onLanguageChange={handleLanguageChange}
                    onVoiceChange={handleVoiceChange}
                    selectedVoice={selectedVoice}
                    playPhoneme={playPhoneme}
                    audioCache={audioCache}
                    showStressMarkers={showStressMarkers}
                  />
                </Box>
              ) : (
                <IPAKeyboard
                  mode={mode}
                  onPhonemeClick={handlePhonemeClick}
                  buttonSpacing={buttonSpacing}
                  selectedLanguage={selectedLanguage}
                  minButtonSize={minButtonSize}
                  layoutMode={layoutMode}
                  fixedLayout={fixedLayout}
                  touchDwellEnabled={touchDwellEnabled}
                  touchDwellTime={touchDwellTime}
                  dwellIndicatorType={dwellIndicatorType}
                  dwellIndicatorColor={dwellIndicatorColor}
                  hapticFeedback={hapticFeedback}
                  disabledPhonemes={mode === 'search' ?
                    Object.values(phoneticData[selectedLanguage].groups)
                      .flatMap(group => group.phonemes)
                      .filter(p => {
                        if (showStressMarkers && /[ˈˌ]/.test(targetPhonemes[currentPhonemeIndex])) {
                          return p !== targetPhonemes[currentPhonemeIndex];
                        }
                        return p !== targetPhonemes[currentPhonemeIndex];
                      })
                    : []}
                  showStressMarkers={showStressMarkers}
                  onStressMarkersChange={handleStressMarkersChange}
                />
              )}
            </Box>

            {/* Settings dialog */}
            <Settings
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              selectedLanguage={selectedLanguage}
              selectedRegion={selectedRegion}
              selectedVoice={selectedVoice}
              onLanguageChange={handleLanguageChange}
              onRegionChange={handleRegionChange}
              onVoiceChange={handleVoiceChange}
              buttonSpacing={buttonSpacing}
              onButtonSpacingChange={(value) => {
                setButtonSpacing(value);
                localStorage.setItem('buttonSpacing', value);
              }}
              minButtonSize={minButtonSize}
              onMinButtonSizeChange={(value) => {
                setMinButtonSize(value);
                localStorage.setItem('minButtonSize', value);
              }}
              layoutMode={layoutMode}
              onLayoutModeChange={(value) => {
                setLayoutMode(value);
                localStorage.setItem('layoutMode', value);
              }}
              fixedLayout={fixedLayout}
              onFixedLayoutChange={(value) => {
                setFixedLayout(value);
                localStorage.setItem('fixedLayout', value);
              }}
              touchDwellEnabled={touchDwellEnabled}
              onTouchDwellEnabledChange={setTouchDwellEnabled}
              touchDwellTime={touchDwellTime}
              onTouchDwellTimeChange={setTouchDwellTime}
              dwellIndicatorType={dwellIndicatorType}
              onDwellIndicatorTypeChange={setDwellIndicatorType}
              dwellIndicatorColor={dwellIndicatorColor}
              onDwellIndicatorColorChange={setDwellIndicatorColor}
              hapticFeedback={hapticFeedback}
              onHapticFeedbackChange={setHapticFeedback}
              voices={availableVoices[selectedLanguage] || []}
              showIpaToText={showIpaToText}
              onShowIpaToTextChange={setShowIpaToText}
              speakOnButtonPress={speakOnButtonPress}
              onSpeakOnButtonPressChange={setSpeakOnButtonPress}
              speakWholeUtterance={speakWholeUtterance}
              onSpeakWholeUtteranceChange={setSpeakWholeUtterance}
              clearMessageAfterPlay={clearMessageAfterPlay}
              onClearMessageAfterPlayChange={setClearMessageAfterPlay}
              mode={mode}
              onModeChange={setMode}
              toolbarConfig={toolbarConfig}
              onToolbarConfigChange={setToolbarConfig}
            />

            {/* Search dialog */}
            <Dialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)}>
              <DialogTitle>Search Word</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Enter a word"
                  fullWidth
                  variant="outlined"
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                />
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showStressMarkers}
                          onChange={(e) => handleStressMarkersChange(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Show Stress Markers"
                    />
                    <Tooltip title="Toggle whether to show stress markers (ˈ, ˌ) in the phoneme sequence" sx={{ ml: 1 }}>
                      <HelpOutlineIcon color="action" fontSize="small" />
                    </Tooltip>
                  </Box>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSearchDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSearchSubmit}>Search</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </Box>

      {/* Notification Display */}
      <NotificationDisplay />
    </ThemeProvider>
  );
};

export default App;
