'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type NavigationPosition = 'auto' | 'top' | 'left' | 'bottom';
export type FontSize = 80 | 90 | 100 | 110 | 120 | 130 | 150;

interface SettingsContextType {
  navigationPosition: NavigationPosition;
  setNavigationPosition: (position: NavigationPosition) => void;
  hideNavigation: boolean;
  setHideNavigation: (hide: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const VALID_FONT_SIZES: FontSize[] = [80, 90, 100, 110, 120, 130, 150];

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [navigationPosition, setNavigationPositionState] = useState<NavigationPosition>('auto');
  const [hideNavigation, setHideNavigation] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSize>(100);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ローカルストレージから設定を読み込む
    const savedPosition = localStorage.getItem('navigationPosition') as NavigationPosition;
    if (savedPosition && ['auto', 'top', 'left', 'bottom'].includes(savedPosition)) {
      setNavigationPositionState(savedPosition);
    }

    // フォントサイズを読み込む
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      const parsedSize = parseInt(savedFontSize, 10) as FontSize;
      if (VALID_FONT_SIZES.includes(parsedSize)) {
        setFontSizeState(parsedSize);
      }
    }
    setIsLoaded(true);
  }, []);

  const setNavigationPosition = (position: NavigationPosition) => {
    setNavigationPositionState(position);
    localStorage.setItem('navigationPosition', position);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', String(size));
  };

  if (!isLoaded) {
    return null; // ローディング中は何も表示しない
  }

  return (
    <SettingsContext.Provider value={{ navigationPosition, setNavigationPosition, hideNavigation, setHideNavigation, fontSize, setFontSize }}>
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
