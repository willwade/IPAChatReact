import React, { useState, useEffect } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  Stack,
  Slide,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import notificationService from '../services/NotificationService';

const SlideTransition = (props) => {
  return <Slide {...props} direction="up" />;
};

const NotificationDisplay = ({ minimal = false }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for notification updates
    const handleNotificationUpdate = (updatedNotifications) => {
      setNotifications(updatedNotifications);
    };

    notificationService.addListener(handleNotificationUpdate);

    // Initialize with current notifications
    setNotifications(notificationService.getNotifications());

    // Cleanup listener on unmount
    return () => {
      notificationService.removeListener(handleNotificationUpdate);
    };
  }, []);

  const handleClose = (notificationId) => {
    notificationService.removeNotification(notificationId);
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  };

  const getTitle = (type) => {
    switch (type) {
      case 'success':
        return 'Success';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      case 'info':
      default:
        return 'Information';
    }
  };

  if (minimal) {
    return (
      <Stack
        spacing={0.5}
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          right: 8,
          zIndex: 9999,
          maxWidth: '100%'
        }}
      >
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            severity={getSeverity(notification.type)}
            variant="filled"
            onClose={() => handleClose(notification.id)}
            sx={{
              fontSize: 12,
              minHeight: 'auto',
              padding: '4px 8px',
              '& .MuiAlert-message': {
                padding: 0,
                fontSize: 12
              },
              '& .MuiAlert-action': {
                padding: 0,
                marginRight: 0
              },
              '& .MuiAlert-icon': {
                fontSize: 16,
                padding: 0,
                marginRight: '4px'
              }
            }}
          >
            {notification.message}
          </Alert>
        ))}
      </Stack>
    );
  }

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
        width: '100%'
      }}
    >
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          TransitionComponent={SlideTransition}
          sx={{
            position: 'relative',
            transform: 'none !important',
            left: 'auto !important',
            right: 'auto !important',
            top: 'auto !important',
            bottom: 'auto !important'
          }}
        >
          <Alert
            severity={getSeverity(notification.type)}
            variant="filled"
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => handleClose(notification.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            sx={{
              width: '100%',
              boxShadow: 3,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <AlertTitle>{getTitle(notification.type)}</AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default NotificationDisplay;
