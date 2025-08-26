import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';

const WelcomeModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const examples = [
    { name: 'Example 1', file: 'example1', thumb: '/examples/example1.png' },
    { name: 'Example 2', file: 'example2', thumb: '/examples/example2.png' },
    { name: 'Example 3', file: 'example3', thumb: '/examples/example3.svg' },
    { name: 'Example 4', file: 'example4', thumb: '/examples/example4.svg' }
  ];

  const handleExampleSelect = async (ex) => {
    try {
      const response = await fetch(`/examples/${ex.file}.json`);
      const data = await response.json();
      Object.entries(data).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          localStorage.setItem(key, value);
        }
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to load example', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '90vh',
          m: isMobile ? 0 : 2,
          borderRadius: isMobile ? 0 : 2
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        textAlign: 'center',
        fontSize: isMobile ? '1.25rem' : '1.5rem'
      }}>
        Welcome to IPA Chat
      </DialogTitle>
      
      <DialogContent sx={{ 
        px: isMobile ? 2 : 3,
        pt: 1
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* Compressed intro */}
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: 'center',
              color: 'text.secondary',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          >
            Create speech using phonemes for AAC communication
          </Typography>

          {/* Examples section - prioritized for mobile */}
          <Card 
            variant="outlined" 
            sx={{ 
              mt: 1,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  textAlign: 'center',
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                  fontWeight: 600
                }}
              >
                🚀 Quick Start - Try an Example
              </Typography>
              
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 1.5,
                justifyItems: 'center'
              }}>
                {examples.map((ex) => (
                  <Box
                    key={ex.name}
                    onClick={() => handleExampleSelect(ex)}
                    sx={{ 
                      cursor: 'pointer', 
                      textAlign: 'center',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      },
                      '&:active': {
                        transform: 'scale(0.95)'
                      }
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 60 : 70,
                        height: isMobile ? 60 : 70,
                        borderRadius: 2,
                        overflow: 'hidden',
                        mb: 0.5,
                        border: '2px solid',
                        borderColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.paper'
                      }}
                    >
                      <img 
                        src={ex.thumb} 
                        alt={ex.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }} 
                      />
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 500
                      }}
                    >
                      {ex.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Compact mode descriptions */}
          <Box sx={{ mt: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1,
                fontWeight: 500,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            >
              Or explore these modes:
            </Typography>
            
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 1,
              fontSize: isMobile ? '0.8rem' : '0.875rem'
            }}>
              <Typography variant="body2" color="text.secondary">
                🔧 <strong>Build:</strong> Create speech with phonemes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🎵 <strong>Babble:</strong> Explore and play with sounds
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🔍 <strong>Search:</strong> Find phonemes for words
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ✏️ <strong>Edit:</strong> Customize with images/colors
              </Typography>
              {!isMobile && (
                <Typography variant="body2" color="text.secondary" sx={{ gridColumn: 'span 2' }}>
                  🎮 <strong>Game:</strong> Learn through interactive challenges
                </Typography>
              )}
              {isMobile && (
                <Typography variant="body2" color="text.secondary">
                  🎮 <strong>Game:</strong> Interactive challenges
                </Typography>
              )}
            </Box>
          </Box>

          {/* Compressed disclaimer */}
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              textAlign: 'center',
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              mt: 1
            }}
          >
            Beta version • English phonemes • For demonstration purposes
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        px: isMobile ? 2 : 3,
        pb: isMobile ? 2 : 2
      }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          fullWidth={isMobile}
          size={isMobile ? "large" : "medium"}
          sx={{
            py: isMobile ? 1.5 : 1
          }}
        >
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeModal;
