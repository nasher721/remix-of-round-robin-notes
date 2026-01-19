import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type SortBy = 'number' | 'room' | 'name';

interface SettingsContextType {
  // Font size
  globalFontSize: number;
  setGlobalFontSize: (size: number) => void;
  
  // Todos visibility
  todosAlwaysVisible: boolean;
  setTodosAlwaysVisible: (visible: boolean) => void;
  
  // Sort preferences
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [globalFontSize, setGlobalFontSizeState] = useState(() => {
    const saved = localStorage.getItem('globalFontSize');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [todosAlwaysVisible, setTodosAlwaysVisibleState] = useState(() => {
    return localStorage.getItem('todosAlwaysVisible') === 'true';
  });

  const [sortBy, setSortByState] = useState<SortBy>(() => {
    const saved = localStorage.getItem('patientSortBy');
    return (saved as SortBy) || 'room';
  });

  // Persist font size
  useEffect(() => {
    localStorage.setItem('globalFontSize', String(globalFontSize));
  }, [globalFontSize]);

  // Persist todos visibility
  useEffect(() => {
    localStorage.setItem('todosAlwaysVisible', String(todosAlwaysVisible));
  }, [todosAlwaysVisible]);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem('patientSortBy', sortBy);
  }, [sortBy]);

  const setGlobalFontSize = useCallback((size: number) => {
    setGlobalFontSizeState(size);
  }, []);

  const setTodosAlwaysVisible = useCallback((visible: boolean) => {
    setTodosAlwaysVisibleState(visible);
  }, []);

  const setSortBy = useCallback((sort: SortBy) => {
    setSortByState(sort);
  }, []);

  const value: SettingsContextType = {
    globalFontSize,
    setGlobalFontSize,
    todosAlwaysVisible,
    setTodosAlwaysVisible,
    sortBy,
    setSortBy,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
