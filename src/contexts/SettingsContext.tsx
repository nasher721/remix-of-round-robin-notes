import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { STORAGE_KEYS, DEFAULT_CONFIG } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserSettings, saveUserSettings, type UserSettingsPayload } from '@/lib/userSettings';

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
  
  // Lab Fishbone toggle
  showLabFishbones: boolean;
  setShowLabFishbones: (show: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const { user } = useAuth();
  const settingsCacheRef = React.useRef<UserSettingsPayload | null>(null);
  const [cloudLoaded, setCloudLoaded] = React.useState(false);
  const [globalFontSize, setGlobalFontSizeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_FONT_SIZE);
    return saved ? parseInt(saved, 10) : DEFAULT_CONFIG.GLOBAL_FONT_SIZE;
  });

  const [todosAlwaysVisible, setTodosAlwaysVisibleState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.TODOS_ALWAYS_VISIBLE) === 'true';
  });

  const [sortBy, setSortByState] = useState<SortBy>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PATIENT_SORT_BY);
    return (saved as SortBy) || DEFAULT_CONFIG.DEFAULT_SORT_BY;
  });

  const [showLabFishbones, setShowLabFishbonesState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_LAB_FISHBONES);
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  useEffect(() => {
    let isActive = true;
    const loadCloudSettings = async () => {
      if (!user) {
        settingsCacheRef.current = null;
        setCloudLoaded(true);
        return;
      }
      const settings = await fetchUserSettings(user.id);
      if (!isActive) return;
      settingsCacheRef.current = settings;
      const cloud = settings?.appSettings;
      if (cloud) {
        if (typeof cloud.globalFontSize === 'number') {
          setGlobalFontSizeState(cloud.globalFontSize);
        }
        if (typeof cloud.todosAlwaysVisible === 'boolean') {
          setTodosAlwaysVisibleState(cloud.todosAlwaysVisible);
        }
        if (typeof cloud.sortBy === 'string') {
          setSortByState(cloud.sortBy as SortBy);
        }
        if (typeof cloud.showLabFishbones === 'boolean') {
          setShowLabFishbonesState(cloud.showLabFishbones);
        }
      }
      setCloudLoaded(true);
    };

    setCloudLoaded(false);
    loadCloudSettings();

    return () => {
      isActive = false;
    };
  }, [user]);

  // Persist font size
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_FONT_SIZE, String(globalFontSize));
  }, [globalFontSize]);

  // Persist todos visibility
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TODOS_ALWAYS_VISIBLE, String(todosAlwaysVisible));
  }, [todosAlwaysVisible]);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATIENT_SORT_BY, sortBy);
  }, [sortBy]);

  // Persist lab fishbones preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOW_LAB_FISHBONES, String(showLabFishbones));
  }, [showLabFishbones]);

  useEffect(() => {
    if (!user || !cloudLoaded) return;
    const timeout = window.setTimeout(async () => {
      const merged = await saveUserSettings(
        user.id,
        {
          appSettings: {
            globalFontSize,
            todosAlwaysVisible,
            sortBy,
            showLabFishbones,
          },
        },
        settingsCacheRef.current
      );
      settingsCacheRef.current = merged;
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [user, cloudLoaded, globalFontSize, todosAlwaysVisible, sortBy, showLabFishbones]);

  const setGlobalFontSize = useCallback((size: number) => {
    setGlobalFontSizeState(size);
  }, []);

  const setTodosAlwaysVisible = useCallback((visible: boolean) => {
    setTodosAlwaysVisibleState(visible);
  }, []);

  const setSortBy = useCallback((sort: SortBy) => {
    setSortByState(sort);
  }, []);

  const setShowLabFishbones = useCallback((show: boolean) => {
    setShowLabFishbonesState(show);
  }, []);

  const value: SettingsContextType = {
    globalFontSize,
    setGlobalFontSize,
    todosAlwaysVisible,
    setTodosAlwaysVisible,
    sortBy,
    setSortBy,
    showLabFishbones,
    setShowLabFishbones,
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
