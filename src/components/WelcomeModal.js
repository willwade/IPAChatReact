import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, List, ListItem, ListItemText } from '@mui/material';

const WelcomeModal = ({ open, onClose }) => {
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
                <ListItemText primary="Build mode - create speech directly with phonemes" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="Babble mode - explore and play with sounds" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="Search mode - find phonemes for specific words" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="Edit mode - personalize sounds with images or colors" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="Game mode - learn AAC through interactive challenges" />
              </ListItem>
            </List>
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