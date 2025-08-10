export interface ThemeInfo {
  id: string;
  name: string;
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const availableThemes: ThemeInfo[] = [
  {
    id: 'trains',
    name: 'Trains',
    icon: '🚂',
    primaryColor: 'primary',
    secondaryColor: 'secondary',
    accentColor: 'accent'
  },
  {
    id: 'planes',
    name: 'Planes',
    icon: '✈️',
    primaryColor: 'sky',
    secondaryColor: 'blue',
    accentColor: 'cyan'
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    icon: '⛵',
    primaryColor: 'blue',
    secondaryColor: 'teal',
    accentColor: 'emerald'
  },
  {
    id: 'cars',
    name: 'Cars',
    icon: '🚗',
    primaryColor: 'red',
    secondaryColor: 'orange',
    accentColor: 'yellow'
  },
  {
    id: 'f1',
    name: 'F1',
    icon: '🏎️',
    primaryColor: 'red',
    secondaryColor: 'black',
    accentColor: 'white'
  }
];

export const getThemeColors = (themeId: string) => {
  const theme = availableThemes.find(t => t.id === themeId);
  if (!theme) return availableThemes[0]; // default to trains
  return theme;
};

// Helper function to get theme-specific CSS classes
export const getThemeClasses = (theme: ThemeInfo) => {
  const { primaryColor, secondaryColor, accentColor } = theme;
  
  return {
    // Backgrounds
    primaryBg: `bg-${primaryColor}-600`,
    primaryBgHover: `hover:bg-${primaryColor}-700`,
    primaryBgGradient: `bg-gradient-to-r from-${primaryColor}-600 to-${primaryColor}-700`,
    primaryBgGradientHover: `hover:from-${primaryColor}-700 hover:to-${primaryColor}-800`,
    
    secondaryBg: `bg-${secondaryColor}-600`,
    secondaryBgHover: `hover:bg-${secondaryColor}-700`,
    secondaryBgGradient: `bg-gradient-to-r from-${secondaryColor}-600 to-${secondaryColor}-700`,
    
    accentBg: `bg-${accentColor}-600`,
    accentBgHover: `hover:bg-${accentColor}-700`,
    
    // Text colors
    primaryText: `text-${primaryColor}-600`,
    secondaryText: `text-${secondaryColor}-600`,
    accentText: `text-${accentColor}-600`,
    
    // Safe text colors for better visibility - ALWAYS DARK ON WHITE
    primaryTextDark: `text-gray-800`,
    primaryTextMedium: `text-gray-700`,
    primaryTextLight: `text-gray-600`,
    secondaryTextDark: `text-gray-800`,
    secondaryTextMedium: `text-gray-700`,
    secondaryTextLight: `text-gray-600`,
    accentTextSafe: `text-gray-800`,
    accentTextSafeLight: `text-gray-700`, 
    accentTextSafeMedium: `text-gray-600`,
    
    // Additional text colors for different contrast needs - ALWAYS DARK FOR WHITE BACKGROUNDS
    textPrimary: `text-gray-900`,        // Very dark for headings
    textSecondary: `text-gray-700`,      // Dark for secondary text
    textMuted: `text-gray-600`,          // Medium dark for muted text
    textSubtle: `text-gray-500`,         // Lighter but still visible
    
    // Border colors
    primaryBorder: `border-${primaryColor}-200`,
    secondaryBorder: `border-${secondaryColor}-200`,
    accentBorder: `border-${accentColor}-200`,
    
    // Progress bars
    progressBg: `bg-gradient-to-r from-${primaryColor}-500 to-${secondaryColor}-500`,
    progressBorder: `border-${primaryColor}-300`,
    
    // Buttons - Light backgrounds for dark text visibility
    primaryButton: `bg-gradient-to-r from-${primaryColor}-200 to-${secondaryColor}-200`,
    primaryButtonHover: `hover:from-${primaryColor}-300 hover:to-${secondaryColor}-300`,
    
    secondaryButton: `bg-gradient-to-r from-${secondaryColor}-200 to-${secondaryColor}-300`,
    secondaryButtonHover: `hover:from-${secondaryColor}-300 hover:to-${secondaryColor}-400`,
    
    accentButton: `bg-gradient-to-r from-${accentColor}-200 to-${accentColor}-300`,
    accentButtonHover: `hover:from-${accentColor}-300 hover:to-${accentColor}-400`,
    
    // Button text colors - ALWAYS DARK FOR VISIBILITY
    buttonText: `text-gray-900`,         // Dark text for ALL button backgrounds
    buttonTextDark: `text-gray-900`,     // Dark text alternative
    
    // Card backgrounds
    cardBg: `from-slate-50 via-${primaryColor}-50 to-${secondaryColor}-50`,
    
    // Focus states
    focusRing: `focus:ring-${primaryColor}-500 focus:border-${primaryColor}-500`,
  };
};

// Special function for theme-based vehicle icons
export const getVehicleIcon = (theme: ThemeInfo) => {
  return theme.icon;
};
