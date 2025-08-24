import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

const WelcomeModal = ({ open, onClose }) => {
  const examples = [
    { name: 'Example 1', file: 'example1', thumb: '/examples/example1.svg' },
    { name: 'Example 2', file: 'example2', thumb: '/examples/example2.svg' },
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
    >
      <DialogTitle sx={{ pb: 1 }}>
        Welcome to IPA Chat (Beta)
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            This is a demonstration of how Speech Sounds (Phonemes) could be used for Augmentative and Alternative Communication (AAC), offering an alternative to symbol based AAC.
          </Typography>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Get started with:
          </Typography>
          <List dense sx={{ pl: 2 }}>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon>
                <BuildIcon />
              </ListItemIcon>
              <ListItemText primary="Build mode - create speech directly with phonemes" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon>
                <MusicNoteIcon />
              </ListItemIcon>
              <ListItemText primary="Babble mode - explore and play with sounds" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon>
                <SearchIcon />
              </ListItemIcon>
              <ListItemText primary="Search mode - find phonemes for specific words" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText primary="Edit mode - personalize sounds with images or colors" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon>
                <SportsEsportsIcon />
              </ListItemIcon>
              <ListItemText primary="Game mode - learn AAC through interactive challenges" />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Or try an example setup:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {examples.map((ex) => (
              <Box
                key={ex.name}
                onClick={() => handleExampleSelect(ex)}
                sx={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <img src={ex.thumb} alt={ex.name} width={80} height={80} />
                <Typography variant="caption">{ex.name}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Currently supporting English (UK and US) phonemes. This is a beta demonstration and not yet intended for daily communication needs.
        </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeModal; 
