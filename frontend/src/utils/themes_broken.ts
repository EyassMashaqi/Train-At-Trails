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
    primaryColor: 'primary', // Using your base color #0F3460
    secondaryColor: 'secondary', // Using your base color #FFC107
    accentColor: 'accent' // Using your base color #F8F8F8
  },
  {
    id: 'planes',
    name: 'Planes',
    icon: '✈️',
    primaryColor: 'primary', // Using your base color #0F3460
    secondaryColor: 'secondary', // Using your base color #FFC107
    accentColor: 'accent' // Using your base color #F8F8F8
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    icon: '⛵',
    primaryColor: 'primary', // Using your base color #0F3460
    secondaryColor: 'secondary', // Using your base color #FFC107
    accentColor: 'accent' // Using your base color #F8F8F8
  },
  {
    id: 'cars',
    name: 'Cars',
    icon: '🚗',
    primaryColor: 'primary', // Using your base color #0F3460
    secondaryColor: 'secondary', // Using your base color #FFC107
    accentColor: 'accent' // Using your base color #F8F8F8
  },
  {
    id: 'f1',
    name: 'F1',
    icon: '🏎️',
    primaryColor: 'primary', // Using your base color #0F3460
    secondaryColor: 'secondary', // Using your base color #FFC107
    accentColor: 'accent' // Using your base color #F8F8F8
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
    // Backgrounds - using your brand colors prominently
    primaryBg: `bg-${primaryColor}-500`,
    primaryBgHover: `hover:bg-${primaryColor}-600`,
    primaryBgGradient: `bg-gradient-to-r from-${primaryColor}-500 to-${secondaryColor}-500`,
    primaryBgGradientHover: `hover:from-${primaryColor}-600 hover:to-${secondaryColor}-600`,
    
    secondaryBg: `bg-${secondaryColor}-500`,
    secondaryBgHover: `hover:bg-${secondaryColor}-600`,
    secondaryBgGradient: `bg-gradient-to-r from-${secondaryColor}-500 to-${primaryColor}-500`,
    
    accentBg: `bg-${accentColor}-100`,
    accentBgHover: `hover:bg-${accentColor}-200`,
    
    // Card and container backgrounds - using brand colors instead of white
    cardBg: `bg-gradient-to-br from-${accentColor}-50 via-${accentColor}-100 to-${primaryColor}-50`,
    containerBg: `bg-gradient-to-r from-${accentColor}-100 to-${accentColor}-50`,
    modalBg: `bg-gradient-to-br from-${accentColor}-100 to-${primaryColor}-50`,
    
    // Text colors - ensuring visibility on brand backgrounds
    primaryText: `text-${primaryColor}-700`,
    secondaryText: `text-${secondaryColor}-700`,
    accentText: `text-gray-600`,
    
    // Safe text colors for better visibility
    primaryTextDark: `text-gray-900`,
    primaryTextMedium: `text-gray-800`,
    primaryTextLight: `text-gray-700`,
    secondaryTextDark: `text-gray-800`,
    secondaryTextMedium: `text-gray-700`,
    secondaryTextLight: `text-gray-600`,
    accentTextSafe: `text-gray-800`,
    accentTextSafeLight: `text-gray-700`, 
    accentTextSafeMedium: `text-gray-600`,
    
    // Additional text colors using brand colors
    textPrimary: `text-gray-900`,
    textSecondary: `text-gray-700`,
    textMuted: `text-gray-600`,
    textSubtle: `text-gray-500`,
    textBrand: `text-${primaryColor}-600`,
    textBrandSecondary: `text-${secondaryColor}-600`,
    
    // Border colors - using brand colors
    primaryBorder: `border-${primaryColor}-300`,
    secondaryBorder: `border-${secondaryColor}-300`,
    accentBorder: `border-${accentColor}-300`,
    brandBorder: `border-${primaryColor}-200`,
    
    // Progress bars - CONSISTENT BRAND COLORS for all themes
    progressBg: `bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600`,
    progressBorder: `border-primary-400`,
    progressContainer: `bg-accent-200`,
    
    // Buttons - CONSISTENT BRAND COLORS for all themes
    primaryButton: `bg-gradient-to-r from-primary-500 to-primary-600 text-white`,
    primaryButtonHover: `hover:from-primary-600 hover:to-primary-700`,
    
    secondaryButton: `bg-gradient-to-r from-secondary-500 to-secondary-600 text-gray-900`,
    secondaryButtonHover: `hover:from-secondary-600 hover:to-secondary-700`,
    
    accentButton: `bg-gradient-to-r from-accent-200 to-accent-300 text-gray-900 border border-primary-200`,
    accentButtonHover: `hover:from-accent-300 hover:to-accent-400`,
    
    // Button text colors
    buttonText: `text-gray-900`,
    buttonTextDark: `text-gray-900`,
    buttonTextLight: `text-white`,
    buttonTextBrand: `text-${primaryColor}-700`,
    
    // Enhanced backgrounds for different sections
    headerBg: `bg-gradient-to-r from-${primaryColor}-500 to-${secondaryColor}-500`,
    sidebarBg: `bg-gradient-to-b from-${accentColor}-100 to-${accentColor}-200`,
    contentBg: `bg-gradient-to-br from-${accentColor}-50 to-${primaryColor}-50`,
    
    // Theme-specific leaderboard backgrounds and terminology
    leaderboardBg: getLeaderboardBackground(theme),
    leaderboardTitle: getLeaderboardTitle(theme),
    pathDescription: getPathDescription(theme),
    trackStyling: getThemeTrackStyling(theme),
    
    // Focus states - using brand colors
    focusRing: `focus:ring-${primaryColor}-500 focus:border-${primaryColor}-500`,
    focusBrand: `focus:ring-${primaryColor}-400 focus:ring-opacity-50`,
  };
};

// Special function for theme-based vehicle icons
export const getVehicleIcon = (theme: ThemeInfo) => {
  return theme.icon;
};

// Theme-specific leaderboard backgrounds - using brand colors consistently
export const getLeaderboardBackground = (_theme: ThemeInfo) => {
  // All themes use your brand color scheme with accent as base
  return 'from-accent-100 via-primary-50 to-secondary-50'; // Using your brand colors
};

// Theme-specific track/path styling for the leaderboard container
export const getThemeTrackStyling = (theme: ThemeInfo) => {
  switch (theme.id) {
    case 'trains':
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-stone-300 to-stone-400';
    case 'planes':
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-sky-100 to-sky-200';
    case 'sailboat':
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-blue-200 to-cyan-300';
    case 'cars':
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-gray-400 to-gray-500';
    case 'f1':
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-red-200 to-yellow-200';
    default:
      return 'relative h-40 rounded-xl overflow-visible shadow-inner bg-gradient-to-b from-stone-300 to-stone-400';
  }
};

// Theme-specific leaderboard titles
export const getLeaderboardTitle = (theme: ThemeInfo) => {
  switch (theme.id) {
    case 'trains':
      return 'Trail Leaderboard';
    case 'planes':
      return 'Sky Leaderboard';
    case 'sailboat':
      return 'Ocean Leaderboard';
    case 'cars':
      return 'Road Leaderboard';
    case 'f1':
      return 'Race Track Leaderboard';
    default:
      return 'Trail Leaderboard';
  }
};

// Theme-specific path descriptions
export const getPathDescription = (theme: ThemeInfo) => {
  switch (theme.id) {
    case 'trains':
      return 'journey on the trail';
    case 'planes':
      return 'flight through the sky';
    case 'sailboat':
      return 'voyage across the ocean';
    case 'cars':
      return 'road trip adventure';
    case 'f1':
      return 'race on the track';
    default:
      return 'journey on the trail';
  }
};
