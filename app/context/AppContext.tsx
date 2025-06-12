'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Session } from 'next-auth';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface AppContextType {
  // Auth state
  session: Session | null;
  setSession: (session: Session | null) => void;
  
  // Theme state
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Notification state
  notification: {
    message: string;
    type: NotificationType;
    show: boolean;
  };
  showNotification: (message: string, type: NotificationType) => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  
  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
    show: boolean;
  }>({
    message: '',
    type: 'info',
    show: false,
  });

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ message, type, show: true });
    // Auto hide after 5 seconds
    setTimeout(() => {
      hideNotification();
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const value = {
    // Auth
    session,
    setSession,
    
    // Theme
    isDarkMode,
    toggleDarkMode,
    
    // Notifications
    notification,
    showNotification,
    hideNotification,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 