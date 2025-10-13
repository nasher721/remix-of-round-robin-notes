export interface Patient {
  id: number;
  name: string;
  bed: string;
  clinicalSummary: string;
  intervalEvents: string;
  systems: {
    neuro: string;
    cv: string;
    resp: string;
    renalGU: string;
    gi: string;
    endo: string;
    heme: string;
    infectious: string;
    skinLines: string;
    dispo: string;
  };
  createdAt: string;
  lastModified: string;
  collapsed: boolean;
}

export interface SettingsType {
  fontSize: string;
  orientation: string;
  margins: string;
  includeSystems: string;
  includeTimestamps: string;
  theme: string;
  cardView: string;
  autoSaveInterval: number;
}
