import { useState, useEffect, useCallback } from 'react';
import type { ColumnConfig, ColumnWidthsType, PrintPreset } from './types';
import { defaultColumns, defaultColumnWidths, fontFamilies } from './constants';
import { useToast } from '@/hooks/use-toast';
import { STORAGE_KEYS, DEFAULT_CONFIG } from '@/constants/config';

export const usePrintState = () => {
  const { toast } = useToast();
  
  const [columnWidths, setColumnWidths] = useState<ColumnWidthsType>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_COLUMN_WIDTHS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultColumnWidths, ...parsed };
      } catch {
        return defaultColumnWidths;
      }
    }
    return defaultColumnWidths;
  });
  
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_COLUMN_PREFS);
    if (saved) {
      try {
        const savedCols = JSON.parse(saved) as ColumnConfig[];
        return defaultColumns.map(col => {
          const savedCol = savedCols.find(s => s.key === col.key);
          return savedCol ? { ...col, enabled: savedCol.enabled } : col;
        });
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });
  
  const [printFontSize, setPrintFontSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_FONT_SIZE);
    return saved ? parseInt(saved, 10) : DEFAULT_CONFIG.PRINT_FONT_SIZE;
  });
  
  const [printFontFamily, setPrintFontFamily] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.PRINT_FONT_FAMILY) || DEFAULT_CONFIG.PRINT_FONT_FAMILY;
  });
  
  const [onePatientPerPage, setOnePatientPerPage] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.PRINT_ONE_PATIENT_PER_PAGE) === 'true';
  });
  
  const [autoFitFontSize, setAutoFitFontSize] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.PRINT_AUTO_FIT_FONT_SIZE) === 'true';
  });
  
  const [combinedColumns, setCombinedColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_COMBINED_COLUMNS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [systemsReviewColumnCount, setSystemsReviewColumnCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_SYSTEMS_REVIEW_COLUMN_COUNT);
    return saved ? parseInt(saved, 10) : DEFAULT_CONFIG.SYSTEMS_REVIEW_COLUMN_COUNT;
  });
  
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.PRINT_ORIENTATION) as 'portrait' | 'landscape') || DEFAULT_CONFIG.PRINT_ORIENTATION;
  });
  
  const [customPresets, setCustomPresets] = useState<PrintPreset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRINT_CUSTOM_PRESETS);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_ONE_PATIENT_PER_PAGE, onePatientPerPage.toString());
  }, [onePatientPerPage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_AUTO_FIT_FONT_SIZE, autoFitFontSize.toString());
  }, [autoFitFontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_COMBINED_COLUMNS, JSON.stringify(combinedColumns));
  }, [combinedColumns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_SYSTEMS_REVIEW_COLUMN_COUNT, systemsReviewColumnCount.toString());
  }, [systemsReviewColumnCount]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_ORIENTATION, printOrientation);
  }, [printOrientation]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_CUSTOM_PRESETS, JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_FONT_SIZE, printFontSize.toString());
    localStorage.setItem(STORAGE_KEYS.PRINT_FONT_FAMILY, printFontFamily);
  }, [printFontSize, printFontFamily]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRINT_COLUMN_WIDTHS, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const getFontFamilyCSS = useCallback(() => {
    return fontFamilies.find(f => f.value === printFontFamily)?.css || fontFamilies[0].css;
  }, [printFontFamily]);

  const toggleColumn = useCallback((key: string) => {
    setColumns(prev => {
      const updated = prev.map(col => 
        col.key === key ? { ...col, enabled: !col.enabled } : col
      );
      localStorage.setItem(STORAGE_KEYS.PRINT_COLUMN_PREFS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const selectAllColumns = useCallback(() => {
    setColumns(prev => {
      const updated = prev.map(col => ({ ...col, enabled: true }));
      localStorage.setItem(STORAGE_KEYS.PRINT_COLUMN_PREFS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deselectAllColumns = useCallback(() => {
    setColumns(prev => {
      const updated = prev.map(col => 
        col.key === "patient" ? col : { ...col, enabled: false }
      );
      localStorage.setItem(STORAGE_KEYS.PRINT_COLUMN_PREFS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleColumnCombination = useCallback((combinationKey: string) => {
    setCombinedColumns(prev => {
      if (prev.includes(combinationKey)) {
        return prev.filter(k => k !== combinationKey);
      } else {
        return [...prev, combinationKey];
      }
    });
  }, []);

  const isColumnEnabled = useCallback((key: string): boolean => {
    return columns.find(c => c.key === key)?.enabled ?? false;
  }, [columns]);

  const saveCurrentAsPreset = useCallback((name: string) => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your preset.",
        variant: "destructive"
      });
      return false;
    }
    
    const preset: PrintPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      columns: columns,
      combinedColumns: combinedColumns,
      printOrientation: printOrientation,
      printFontSize: printFontSize,
      printFontFamily: printFontFamily,
      onePatientPerPage: onePatientPerPage,
      autoFitFontSize: autoFitFontSize,
      columnWidths: columnWidths,
      createdAt: new Date().toISOString()
    };
    
    setCustomPresets(prev => [...prev, preset]);
    
    toast({
      title: "Preset saved",
      description: `"${preset.name}" has been saved for quick access.`
    });
    return true;
  }, [columns, combinedColumns, printOrientation, printFontSize, printFontFamily, onePatientPerPage, autoFitFontSize, columnWidths, toast]);

  const loadPreset = useCallback((preset: PrintPreset) => {
    setColumns(preset.columns);
    setCombinedColumns(preset.combinedColumns);
    setPrintOrientation(preset.printOrientation);
    setPrintFontSize(preset.printFontSize);
    setPrintFontFamily(preset.printFontFamily);
    setOnePatientPerPage(preset.onePatientPerPage);
    setAutoFitFontSize(preset.autoFitFontSize);
    setColumnWidths(preset.columnWidths);
    
    toast({
      title: "Preset loaded",
      description: `"${preset.name}" settings applied.`
    });
  }, [toast]);

  const deletePreset = useCallback((presetId: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== presetId));
    toast({
      title: "Preset deleted",
      description: "The preset has been removed."
    });
  }, [toast]);

  const exportPreset = useCallback((preset: PrintPreset) => {
    const exportData = {
      ...preset,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `print-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Preset exported",
      description: `"${preset.name}" saved as JSON file.`
    });
  }, [toast]);

  const importPreset = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.name || !data.columns) {
          throw new Error('Invalid preset format');
        }
        const newPreset: PrintPreset = {
          id: Date.now().toString(),
          name: data.name + (customPresets.some(p => p.name === data.name) ? ' (imported)' : ''),
          columns: data.columns,
          combinedColumns: data.combinedColumns || [],
          printOrientation: data.printOrientation || 'portrait',
          printFontSize: data.printFontSize || 9,
          printFontFamily: data.printFontFamily || 'system',
          onePatientPerPage: data.onePatientPerPage || false,
          autoFitFontSize: data.autoFitFontSize || false,
          columnWidths: data.columnWidths || defaultColumnWidths,
          createdAt: new Date().toISOString()
        };
        setCustomPresets(prev => [...prev, newPreset]);
        toast({
          title: "Preset imported",
          description: `"${newPreset.name}" has been added.`
        });
      } catch {
        toast({
          title: "Import failed",
          description: "The file could not be parsed as a valid preset.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  }, [customPresets, toast]);

  return {
    columnWidths,
    setColumnWidths,
    columns,
    setColumns,
    printFontSize,
    setPrintFontSize,
    printFontFamily,
    setPrintFontFamily,
    onePatientPerPage,
    setOnePatientPerPage,
    autoFitFontSize,
    setAutoFitFontSize,
    combinedColumns,
    setCombinedColumns,
    systemsReviewColumnCount,
    setSystemsReviewColumnCount,
    printOrientation,
    setPrintOrientation,
    customPresets,
    setCustomPresets,
    getFontFamilyCSS,
    toggleColumn,
    selectAllColumns,
    deselectAllColumns,
    toggleColumnCombination,
    isColumnEnabled,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    exportPreset,
    importPreset,
  };
};
