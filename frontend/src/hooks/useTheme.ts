import { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import type { ThemeInfo } from '../utils/themes';
import { availableThemes } from '../utils/themes';

interface CohortInfo {
  id: string;
  name: string;
  defaultTheme: string;
}

interface UseThemeReturn {
  currentTheme: ThemeInfo;
  currentCohort: CohortInfo | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

export const useTheme = (): UseThemeReturn => {
  const [currentTheme, setCurrentTheme] = useState<ThemeInfo>(availableThemes[0]); // Default to trains
  const [currentCohort, setCurrentCohort] = useState<CohortInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCohortTheme = async () => {
    try {
      setIsLoading(true);
      
      const response = await gameService.getCohortInfo();
      const { cohort, theme } = response.data;
      
      if (cohort) {
        setCurrentCohort(cohort);
        
        // Find the theme info
        const themeInfo = availableThemes.find(t => t.id === theme) || availableThemes[0];
        setCurrentTheme(themeInfo);
      } else {
        // No active cohort, use default theme
        setCurrentCohort(null);
        setCurrentTheme(availableThemes[0]);
      }
    } catch (error) {
      console.error('Failed to fetch cohort theme:', error);
      // Use default theme on error
      setCurrentTheme(availableThemes[0]);
      setCurrentCohort(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortTheme();
  }, []);

  const refreshTheme = async () => {
    await fetchCohortTheme();
  };

  return {
    currentTheme,
    currentCohort,
    isLoading,
    refreshTheme
  };
};
