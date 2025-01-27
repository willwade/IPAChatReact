import React, { useState, useEffect } from 'react';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction, TextField, Button, Select, MenuItem, FormControl, Typography, Tooltip, IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch } from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import { voicesByLanguage } from './data/phonemes';
import { phoneticData } from './data/phonemes';
import { config } from './config';
import { regions } from './data/gamePhases';
import IPAKeyboard from './components/IPAKeyboard';
import EditMode from './components/EditMode';
import Settings from './components/Settings';
import GameMode from './components/GameMode';
import { phonemeToFilename } from './data/phonemeFilenames';
import axios from 'axios';

const App = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('ipaMode') || 'build');
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('selectedLanguage') || 'en-GB');
  const [selectedRegion, setSelectedRegion] = useState(() => {
    const savedRegion = localStorage.getItem('selectedRegion');
    if (savedRegion) return savedRegion;
    
    // Set default region based on language
    const language = localStorage.getItem('selectedLanguage') || 'en-GB';
    if (language === 'en-GB') return 'en-GB-london';
    return ''; // No default region for other languages yet
  });
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('selectedVoice') || '');
  const [buttonScale, setButtonScale] = useState(() => parseFloat(localStorage.getItem('buttonScale')) || 1);
  const [buttonSpacing, setButtonSpacing] = useState(() => parseInt(localStorage.getItem('buttonSpacing')) || 4);
  const [autoScale, setAutoScale] = useState(() => {
    const saved = localStorage.getItem('autoScale');
    return saved === null ? true : saved === 'true';
  });
  const [touchDwellEnabled, setTouchDwellEnabled] = useState(() => localStorage.getItem('touchDwellEnabled') === 'true');
  const [touchDwellTime, setTouchDwellTime] = useState(() => parseInt(localStorage.getItem('touchDwellTime')) || 800);
  const [dwellIndicatorType, setDwellIndicatorType] = useState(() => localStorage.getItem('dwellIndicatorType') || 'border');
  const [dwellIndicatorColor, setDwellIndicatorColor] = useState(() => localStorage.getItem('dwellIndicatorColor') || 'primary');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('hapticFeedback') === 'true');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [audioCache, setAudioCache] = useState({});
  const [cacheLoading, setCacheLoading] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [targetPhonemes, setTargetPhonemes] = useState([]);
  const [currentPhonemeIndex, setCurrentPhonemeIndex] = useState(0);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [includeStressMarkers, setIncludeStressMarkers] = useState(false);

  const actions = [
    { icon: <MessageIcon />, name: 'Build Mode', onClick: () => setMode('build') },
    { icon: <SearchIcon />, name: 'Search Mode', onClick: () => { setMode('search'); setSearchDialogOpen(true); } },
    { icon: <ChildCareIcon />, name: 'Babble Mode', onClick: () => setMode('babble') },
    { icon: <EditIcon />, name: 'Edit Mode', onClick: () => setMode('edit') },
    { icon: <SportsEsportsIcon />, name: 'Game Mode', onClick: () => setMode('game') },
    { icon: <SettingsIcon />, name: 'Settings', onClick: () => setSettingsOpen(true) }
  ];

  const fetchVoices = async () => {
    try {
      const response = await config.api.get('/api/voices');
      if (response.data) {
        setAvailableVoices(response.data);
        // Set default voice if available
        if (response.data.length > 0) {
          setSelectedVoice(response.data[0].name);
        }
        setVoicesLoading(false);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      setVoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

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
    localStorage.setItem('buttonScale', buttonScale);
  }, [buttonScale]);

  useEffect(() => {
    localStorage.setItem('buttonSpacing', buttonSpacing);
  }, [buttonSpacing]);

  useEffect(() => {
    localStorage.setItem('autoScale', autoScale);
  }, [autoScale]);

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
  }, [selectedLanguage]);

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    localStorage.setItem('selectedRegion', region);
  };

  const loadAudioFile = async (fileName) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const onLoad = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        resolve(audio);
      };
      
      const onError = (e) => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        console.error(`Failed to load audio file: ${fileName}`);
        console.error(`Full URL: ${new URL(`/audio/phonemes/${fileName}`, window.location.href).href}`);
        reject(new Error(`Failed to load audio: ${e.message}`));
      };
      
      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onError);
      
      const url = `/audio/phonemes/${fileName}`;
      console.log(`Attempting to load audio from: ${url}`);
      audio.src = url;
      audio.preload = 'auto';
    });
  };

  const getPhonemeFileName = (phoneme, voice) => {
    // Use URL-friendly name if available, otherwise use URL-encoded phoneme
    const filenamePart = phonemeToFilename[phoneme] || encodeURIComponent(phoneme);
    return `${filenamePart}_${voice}.mp3`;
  };

  const cachePhonemeAudio = async () => {
    if (!selectedVoice || cacheLoading) return;
    
    setCacheLoading(true);
    // Clear existing cache when voice changes
    setAudioCache({});
    console.log(`Clearing cache for previous voice and loading new cache for ${selectedVoice}`);
    
    const newCache = {};
    
    // Get all phonemes except stress/intonation marks
    const phonemes = Object.values(phoneticData[selectedLanguage].groups)
      .flatMap(group => {
        // Skip the stress group and filter out problematic characters
        if (group.title === 'Stress & Intonation') return [];
        return group.phonemes;
      })
      .filter(phoneme => 
        // Include all IPA characters but exclude arrows, special marks, and problematic characters
        !/[↗↘↑↓|‖]/.test(phoneme) && 
        // Ensure the phoneme is properly encoded
        encodeURIComponent(phoneme) !== '%EF%BF%BD'
      );

    console.log(`Starting cache for ${phonemes.length} phonemes with voice: ${selectedVoice}`);
    
    try {
      // Load pre-generated audio files in parallel batches
      const batchSize = 5;
      let loadedCount = 0;
      
      for (let i = 0; i < phonemes.length; i += batchSize) {
        const batch = phonemes.slice(i, i + batchSize);
        await Promise.all(batch.map(async phoneme => {
          try {
            // Only treat diphthongs and length-marked vowels as complex
            const isComplex = /^[aeiouɑɔəʊɪʊ][ɪʊə]$|ː/.test(phoneme);
            
            if (!isComplex) {
              // Try the exact voice first for single phonemes
              const fileName = getPhonemeFileName(phoneme, selectedVoice);
              console.log(`Attempting to load: ${fileName} for phoneme: ${phoneme}`);
              
              try {
                const audio = await loadAudioFile(fileName);
                newCache[phoneme] = audio;
                loadedCount++;
                console.log(`Successfully cached phoneme: ${phoneme} (${loadedCount}/${phonemes.length})`);
              } catch (loadError) {
                console.warn(`Primary voice failed for ${phoneme}:`, loadError.message);
                // If the primary voice fails, try fallback voices
                const fallbackVoices = ['en-GB-RyanNeural', 'en-GB-LibbyNeural', 'en-US-JennyNeural']
                  .filter(v => v !== selectedVoice);
                
                let fallbackSuccess = false;
                for (const fallbackVoice of fallbackVoices) {
                  try {
                    const fallbackFileName = getPhonemeFileName(phoneme, fallbackVoice);
                    console.log(`Trying fallback: ${fallbackFileName}`);
                    const audio = await loadAudioFile(fallbackFileName);
                    newCache[phoneme] = audio;
                    loadedCount++;
                    console.log(`Cached phoneme ${phoneme} using fallback voice ${fallbackVoice} (${loadedCount}/${phonemes.length})`);
                    fallbackSuccess = true;
                    break;
                  } catch (fallbackError) {
                    console.warn(`Fallback ${fallbackVoice} failed for ${phoneme}:`, fallbackError.message);
                  }
                }
                if (!fallbackSuccess) {
                  console.error(`All voices failed for phoneme: ${phoneme}`);
                }
              }
            } else {
              // For complex phonemes, we'll generate them on demand using Azure TTS
              console.log(`Complex phoneme ${phoneme} will be generated on demand`);
            }
          } catch (error) {
            console.error(`Failed to cache phoneme ${phoneme}:`, error.message);
          }
        }));
        
        // Small delay between batches to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setAudioCache(newCache);
      const cachedPhonemes = Object.keys(newCache);
      console.log(`Audio cache completed for ${selectedVoice}.`);
      console.log(`Successfully cached ${cachedPhonemes.length} phonemes:`, cachedPhonemes);
      console.log('Complex phonemes that will use TTS:', phonemes.filter(p => /^[aeiouɑɔəʊɪʊ][ɪʊə]$|ː/.test(p)));
      console.log('Failed phonemes:', phonemes.filter(p => !(/^[aeiouɑɔəʊɪʊ][ɪʊə]$|ː/.test(p)) && !cachedPhonemes.includes(p)));
    } catch (error) {
      console.error('Error in audio caching:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  // Update cache when voice or language changes
  useEffect(() => {
    cachePhonemeAudio();
  }, [selectedVoice, selectedLanguage]);

  const handlePhonemeSpeak = async (text) => {
    if (!text || !selectedVoice) return;

    // Skip only special marks
    if (/[↗↘↑↓|‖]/.test(text)) {
      return;
    }

    // Check if the text is a valid IPA phoneme
    const isIpaPhoneme = Object.values(phoneticData[selectedLanguage].groups)
      .some(group => group.phonemes.includes(text));

    if (!isIpaPhoneme) {
      // If it's not an IPA phoneme, use the TTS API directly
      try {
        const response = await config.api.post('/api/tts', { 
          text,
          voice: selectedVoice,
          language: selectedLanguage
        });
        
        if (response.data && response.data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
          await audio.play();
        }
      } catch (error) {
        console.warn('Error in speech synthesis:', error);
      }
      return;
    }

    // For non-complex phonemes, use the cached audio files
    const isComplex = /^[aeiouɑɔəʊɪʊ][ɪʊə]$|ː/.test(text);
    if (!isComplex) {
      if (audioCache[text]) {
        try {
          // Clone the audio to allow multiple simultaneous playback
          const audioClone = audioCache[text].cloneNode();
          await audioClone.play();
          return;
        } catch (error) {
          console.warn('Error playing cached audio:', error);
        }
      }

      // Try to load from pre-generated files if not in cache
      try {
        const fileName = getPhonemeFileName(text, selectedVoice);
        const audio = await loadAudioFile(fileName);
        await audio.play();
        return;
      } catch (primaryError) {
        console.warn('Error playing primary voice audio:', primaryError);
        
        // Try fallback voices
        const fallbackVoices = ['en-GB-RyanNeural', 'en-GB-LibbyNeural', 'en-US-JennyNeural']
          .filter(v => v !== selectedVoice);
        
        for (const fallbackVoice of fallbackVoices) {
          try {
            const fallbackFileName = getPhonemeFileName(text, fallbackVoice);
            const audio = await loadAudioFile(fallbackFileName);
            await audio.play();
            return;
          } catch (fallbackError) {
            console.warn(`Fallback ${fallbackVoice} failed:`, fallbackError);
          }
        }
      }
    }

    // For complex phonemes or if all else fails, use Azure TTS
    try {
      const response = await config.api.post('/api/tts', { 
        text,
        voice: selectedVoice,
        language: selectedLanguage
      });
      
      if (response.data && response.data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        await audio.play();
      }
    } catch (error) {
      console.warn('Error in speech synthesis:', error);
    }
  };

  const handlePhonemeClick = (phoneme) => {
    // In build mode, update the message
    if (mode === 'build') {
      setMessage(prev => prev + phoneme);
      return;
    }
    
    // In search mode, check if it's the correct next phoneme
    if (mode === 'search' && targetPhonemes.length > 0) {
      if (phoneme === targetPhonemes[currentPhonemeIndex]) {
        setMessage(prev => prev + phoneme);
        setCurrentPhonemeIndex(prev => prev + 1);
        // Play the phoneme
        if (audioCache[phoneme]) {
          const audioClone = audioCache[phoneme].cloneNode();
          audioClone.play().catch(error => {
            console.warn('Error playing cached audio:', error);
            handlePhonemeSpeak(phoneme);
          });
        } else {
          handlePhonemeSpeak(phoneme);
        }
      }
      return;
    }
    
    // In babble mode, play audio immediately from cache if available
    if (mode === 'babble') {
      if (audioCache[phoneme]) {
        const audioClone = audioCache[phoneme].cloneNode();
        audioClone.play().catch(error => {
          console.warn('Error playing cached audio:', error);
          handlePhonemeSpeak(phoneme);
        });
      } else {
        handlePhonemeSpeak(phoneme);
      }
    }
  };

  const handleModeChange = (event) => {
    setMode(event.target.value);
    // Clear message when switching from build mode
    if (event.target.value !== 'build') {
      setMessage('');
    }
  };

  const speak = () => {
    handlePhonemeSpeak(message);
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
        usePhonemes: false  // Explicitly set to false for natural word pronunciation
      });
      
      console.log('TTS response:', response.data);
      
      if (response.data && response.data.audio) {
        console.log('Creating audio from base64');
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        console.log('Playing audio');
        await audio.play();
        console.log('Audio playback complete');
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

  const handleAutoScaleChange = (autoScale) => {
    setAutoScale(autoScale);
  };

  const handleSearchSubmit = async () => {
    try {
      const langCode = selectedLanguage === 'en-GB' ? 'en' : selectedLanguage.toLowerCase();
      const apiUrl = `${process.env.REACT_APP_PHONEMIZE_API}/phonemize`;
      
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
        
        // Process the IPA string character by character
        for (let i = 0; i < ipa.length; i++) {
          const char = ipa[i];
          
          // Handle stress markers
          if (/[ˈˌ]/.test(char)) {
            if (includeStressMarkers) {
              if (currentPhoneme) {
                phonemeArray.push(currentPhoneme);
                currentPhoneme = '';
              }
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
          if (['ʊ', 'ə', 'ɪ'].includes(char) && 
              currentPhoneme && 
              /[aeiouɑɔəʊɪʊ]/.test(currentPhoneme)) {
            currentPhoneme += char;
          } else {
            if (currentPhoneme) {
              phonemeArray.push(currentPhoneme);
            }
            currentPhoneme = char;
          }
        }
        
        // Add the last phoneme if there is one
        if (currentPhoneme) {
          phonemeArray.push(currentPhoneme);
        }

        console.log('Processed phonemes:', phonemeArray);
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

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Vertical navigation sidebar */}
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
            <TextField
              fullWidth
              value={message}
              onChange={(e) => mode === 'build' && setMessage(e.target.value)}
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
            <Button 
              variant="contained" 
              onClick={speak}
              disabled={!message || mode === 'babble' || mode === 'edit'}
              size="small"
              sx={{ visibility: mode === 'edit' ? 'hidden' : 'visible' }}
            >
              <VolumeUpIcon />
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => {
                setMessage('');
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
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {mode === 'edit' ? (
            <Box sx={{ height: '100%' }}>
              <IPAKeyboard
                mode="edit"
                onPhonemeClick={handlePhonemeClick}
                buttonScale={buttonScale}
                buttonSpacing={buttonSpacing}
                selectedLanguage={selectedLanguage}
                autoScale={autoScale}
                touchDwellEnabled={touchDwellEnabled}
                touchDwellTime={touchDwellTime}
                dwellIndicatorType={dwellIndicatorType}
                dwellIndicatorColor={dwellIndicatorColor}
                hapticFeedback={hapticFeedback}
              />
            </Box>
          ) : mode === 'game' ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <GameMode
                onPhonemeClick={handlePhonemeClick}
                onSpeakRequest={handleSpeakRequest}
                selectedLanguage={selectedLanguage}
                selectedRegion={selectedRegion}
                voices={availableVoices}
                onLanguageChange={handleLanguageChange}
                onVoiceChange={handleVoiceChange}
                selectedVoice={selectedVoice}
              />
            </Box>
          ) : (
            <IPAKeyboard
              mode={mode}
              onPhonemeClick={handlePhonemeClick}
              buttonScale={buttonScale}
              buttonSpacing={buttonSpacing}
              selectedLanguage={selectedLanguage}
              autoScale={autoScale}
              touchDwellEnabled={touchDwellEnabled}
              touchDwellTime={touchDwellTime}
              dwellIndicatorType={dwellIndicatorType}
              dwellIndicatorColor={dwellIndicatorColor}
              hapticFeedback={hapticFeedback}
              disabledPhonemes={mode === 'search' ? 
                Object.values(phoneticData[selectedLanguage].groups)
                  .flatMap(group => group.phonemes)
                  .filter(p => {
                    // If we're including stress markers, check if the current target is a stress marker
                    if (includeStressMarkers && /[ˈˌ]/.test(targetPhonemes[currentPhonemeIndex])) {
                      return p !== targetPhonemes[currentPhonemeIndex];
                    }
                    // Otherwise, enable the next expected phoneme
                    return p !== targetPhonemes[currentPhonemeIndex];
                  })
                : []}
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
          buttonScale={buttonScale}
          onButtonScaleChange={setButtonScale}
          buttonSpacing={buttonSpacing}
          onButtonSpacingChange={setButtonSpacing}
          autoScale={autoScale}
          onAutoScaleChange={setAutoScale}
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
                      checked={includeStressMarkers}
                      onChange={(e) => setIncludeStressMarkers(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Include stress markers"
                />
                <Tooltip title="Toggle whether to include stress markers (ˈ, ˌ) in the phoneme sequence" sx={{ ml: 1 }}>
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
  );
};

export default App;
