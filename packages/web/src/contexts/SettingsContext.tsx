'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type NavigationPosition = 'auto' | 'top' | 'left' | 'bottom';

interface SettingsContextType {
  navigationPosition: NavigationPosition;
  setNavigationPosition: (position: NavigationPosition) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [navigationPosition, setNavigationPositionState] = useState<NavigationPosition>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ローカルストレージから設定を読み込む
    const savedPosition = localStorage.getItem('navigationPosition') as NavigationPosition;
    if (savedPosition && ['auto', 'top', 'left', 'bottom'].includes(savedPosition)) {
      setNavigationPositionState(savedPosition);
    }
    setIsLoaded(true);
  }, []);

  const setNavigationPosition = (position: NavigationPosition) => {
    setNavigationPositionState(position);
    localStorage.setItem('navigationPosition', position);
  };

  if (!isLoaded) {
    return null; // ローディング中は何も表示しない
  }

  return (
    <SettingsContext.Provider value={{ navigationPosition, setNavigationPosition }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
