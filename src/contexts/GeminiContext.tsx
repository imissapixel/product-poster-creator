import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface GeminiContextValue {
  apiKey: string | null;
  isConfigured: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const GEMINI_STORAGE_KEY = 'ppc-gemini-api-key';

const GeminiContext = createContext<GeminiContextValue | undefined>(undefined);

export const GeminiProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(GEMINI_STORAGE_KEY);
      return stored && stored.trim().length > 0 ? stored : null;
    } catch (error) {
      console.warn('Unable to read stored Gemini API key. Starting without one.', error);
      return null;
    }
  });

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key.trim());
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKeyState(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (apiKey && apiKey.length > 0) {
        window.localStorage.setItem(GEMINI_STORAGE_KEY, apiKey);
      } else {
        window.localStorage.removeItem(GEMINI_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Unable to persist Gemini API key.', error);
    }
  }, [apiKey]);

  const value = useMemo<GeminiContextValue>(
    () => ({
      apiKey,
      isConfigured: Boolean(apiKey),
      setApiKey,
      clearApiKey,
    }),
    [apiKey, clearApiKey, setApiKey]
  );

  return <GeminiContext.Provider value={value}>{children}</GeminiContext.Provider>;
};

export const useGeminiConfig = () => {
  const context = useContext(GeminiContext);
  if (!context) {
    throw new Error('useGeminiConfig must be used within GeminiProvider');
  }

  return context;
};
