import React, { createContext, useContext, useState, useEffect } from 'react';
import { gameService } from '../services/api';
import type { ThemeInfo } from '../utils/themes';
import { availableThemes } from '../utils/themes';

interface CohortInfo {
  id: string;
  name: string;
  defaultTheme: string;
}

interface ThemeContextType {
  currentTheme: ThemeInfo;
  currentCohort: CohortInfo | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeInfo>(availableThemes[0]); // Default to trains
  const [currentCohort, setCurrentCohort] = useState<CohortInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCohortTheme = async () => {
    try {
      setIsLoading(true);
      
      // Get user's current cohort information
      const cohortResponse = await gameService.getCohortHistory();
      const activeCohorts = cohortResponse.data.activeCohorts;
      
      if (activeCohorts && activeCohorts.length > 0) {
        const activeCohort = activeCohorts[0]; // Get first active cohort
        
        // Now get the cohort details with theme info
        // We need to create an endpoint to get cohort theme info
        // For now, we'll use the default theme
        const cohortInfo: CohortInfo = {
          id: activeCohort.id,
          name: activeCohort.name,
          defaultTheme: 'trains' // This should come from the API
        };
        
        setCurrentCohort(cohortInfo);
        
        // Find the theme info
        const themeInfo = availableThemes.find(t => t.id === cohortInfo.defaultTheme) || availableThemes[0];
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

  const value: ThemeContextType = {
    currentTheme,
    currentCohort,
    isLoading,
    refreshTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
