import { createContext, useContext, useRef } from 'react';

type ResetHandler = () => void;

interface ResetContextValue {
  setResetHandler: (handler: ResetHandler) => void;
  reset: () => void;
}

const ResetContext = createContext<ResetContextValue | undefined>(undefined);

export const ResetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlerRef = useRef<ResetHandler>(() => {});

  const setResetHandler = (handler: ResetHandler) => {
    handlerRef.current = handler;
  };

  const reset = () => {
    handlerRef.current();
  };

  return (
    <ResetContext.Provider value={{ setResetHandler, reset }}>
      {children}
    </ResetContext.Provider>
  );
};

export const useResetForm = () => {
  const ctx = useContext(ResetContext);
  if (!ctx) {
    throw new Error('useResetForm must be used within ResetProvider');
  }
  return ctx.reset;
};

export const useResetContext = () => {
  const ctx = useContext(ResetContext);
  if (!ctx) {
    throw new Error('useResetContext must be used within ResetProvider');
  }
  return ctx;
};
