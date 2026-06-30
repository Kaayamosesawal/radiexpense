import { useState, useCallback } from 'react';

/**
 * Custom hook for managing in-app toast notifications.
 * Handles success, error, and info messages with auto-dismiss logic.
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Add new notification to the stack
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-remove after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    showNotification,
    removeNotification
  };
};