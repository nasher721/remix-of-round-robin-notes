import { useMemo, useState } from 'react';
import type { Patient } from '@/types/patient';
import type { SortBy } from '@/contexts/SettingsContext';

export type FilterType = 'all' | 'filled' | 'empty';

interface UsePatientFilterOptions {
  patients: Patient[];
  sortBy: SortBy;
}

export function usePatientFilter({ patients, sortBy }: UsePatientFilterOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          patient.name.toLowerCase().includes(searchLower) ||
          patient.bed.toLowerCase().includes(searchLower) ||
          patient.clinicalSummary.toLowerCase().includes(searchLower) ||
          patient.intervalEvents.toLowerCase().includes(searchLower);

        if (filter === 'filled') {
          const hasSomeContent =
            patient.clinicalSummary ||
            patient.intervalEvents ||
            Object.values(patient.systems).some((v) => v);
          return matchesSearch && hasSomeContent;
        } else if (filter === 'empty') {
          const isEmpty =
            !patient.clinicalSummary &&
            !patient.intervalEvents &&
            !Object.values(patient.systems).some((v) => v);
          return matchesSearch && isEmpty;
        }

        return matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'room':
            return a.bed.localeCompare(b.bed, undefined, { numeric: true, sensitivity: 'base' });
          case 'name':
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          case 'number':
          default:
            return a.patientNumber - b.patientNumber;
        }
      });
  }, [patients, searchQuery, filter, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    filteredPatients,
  };
}
