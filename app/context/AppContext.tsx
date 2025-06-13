'use client';

import { useSession } from 'next-auth/react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/frontend/userFunctions';
import { User } from '../lib/types';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface AppContextType {
  user: User | null;
  isLoadingUser: boolean;
  refreshUser: () => Promise<void>;
  
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
  // All useState hooks first
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
    show: boolean;
  }>({
    message: '',
    type: 'info',
    show: false,
  });

  // All functions next
  const refreshUser = async () => {
    if (isLoadingUser) return; // Prevent multiple simultaneous calls
    
    setIsLoadingUser(true);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      showNotification('Failed to fetch user data', 'error');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

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

  const {data:session, status} = useSession()


  useEffect(() => {
    console.log("session", session);
    if(session && !user)
    refreshUser();
  }, [session]);

  const value = {
    user,
    isLoadingUser,
    refreshUser,
    isDarkMode,
    toggleDarkMode,
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