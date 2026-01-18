'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type NavigationPosition = 'auto' | 'top' | 'left' | 'bottom';
export type FontSize = 80 | 90 | 100 | 110 | 120 | 130 | 150;
export type AiModel = 'claude-sonnet-4.5' | 'claude-haiku-4.5' | 'claude-sonnet-4' | 'claude-haiku-3.5';

interface SettingsContextType {
  navigationPosition: NavigationPosition;
  setNavigationPosition: (position: NavigationPosition) => void;
  hideNavigation: boolean;
  setHideNavigation: (hide: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  aiModel: AiModel;
  setAiModel: (model: AiModel) => void;
  voiceInputEnabled: boolean;
  setVoiceInputEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const VALID_FONT_SIZES: FontSize[] = [80, 90, 100, 110, 120, 130, 150];
const VALID_AI_MODELS: AiModel[] = ['claude-sonnet-4.5', 'claude-haiku-4.5', 'claude-sonnet-4', 'claude-haiku-3.5'];

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [navigationPosition, setNavigationPositionState] = useState<NavigationPosition>('auto');
  const [hideNavigation, setHideNavigation] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSize>(100);
  const [aiModel, setAiModelState] = useState<AiModel>('claude-haiku-4.5');
  const [voiceInputEnabled, setVoiceInputEnabledState] = useState<boolean>(false); // 初期値: 無効
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

    // AIモデルを読み込む
    const savedAiModel = localStorage.getItem('aiModel') as AiModel;
    if (savedAiModel && VALID_AI_MODELS.includes(savedAiModel)) {
      setAiModelState(savedAiModel);
    }

    // 音声入力設定を読み込む
    const savedVoiceInput = localStorage.getItem('voiceInputEnabled');
    if (savedVoiceInput !== null) {
      setVoiceInputEnabledState(savedVoiceInput === 'true');
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

  const setAiModel = (model: AiModel) => {
    setAiModelState(model);
    localStorage.setItem('aiModel', model);
  };

  const setVoiceInputEnabled = (enabled: boolean) => {
    setVoiceInputEnabledState(enabled);
    localStorage.setItem('voiceInputEnabled', String(enabled));
  };

  if (!isLoaded) {
    return null; // ローディング中は何も表示しない
  }

  return (
    <SettingsContext.Provider value={{ navigationPosition, setNavigationPosition, hideNavigation, setHideNavigation, fontSize, setFontSize, aiModel, setAiModel, voiceInputEnabled, setVoiceInputEnabled }}>
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
