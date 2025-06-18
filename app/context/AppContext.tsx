'use client';

import { useSession } from 'next-auth/react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Item, User } from '../lib/types';

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
  
  // File viewer state
  viewerItem: Item | null;
  isViewerOpen: boolean;
  openFileViewer: (item: Item) => void;
  closeFileViewer: () => void;
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

  // Add file viewer state
  const [viewerItem, setViewerItem] = useState<Item | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type, show: true });
    // Auto hide after 5 seconds
    const timer = setTimeout(() => {
      hideNotification();
    }, 5000);
    return () => clearTimeout(timer);
  }, [hideNotification]);

  // All functions next
  const refreshUser = useCallback(async () => {
    if (isLoadingUser) return; // Prevent multiple simultaneous calls
    
    try {
      setIsLoadingUser(true);
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        showNotification('Error refreshing user data', 'error');
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      showNotification('Error refreshing user data', 'error');
    } finally {
      setIsLoadingUser(false);
    }
  }, [isLoadingUser, showNotification]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Add file viewer functions
  const openFileViewer = (item: Item) => {
    setViewerItem(item);
    setIsViewerOpen(true);
  };

  const closeFileViewer = () => {
    setIsViewerOpen(false);
    setViewerItem(null);
  };

  const {data:session, status} = useSession()


  useEffect(() => {
    if (session?.user?.id && (!user || user._id !== session.user.id)) {
      refreshUser();
    }
  }, [session, refreshUser, user]);

  const value = {
    user,
    isLoadingUser,
    refreshUser,
    isDarkMode,
    toggleDarkMode,
    notification,
    showNotification,
    hideNotification,
    viewerItem,
    isViewerOpen,
    openFileViewer,
    closeFileViewer,
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