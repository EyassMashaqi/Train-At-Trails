import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNetworkStatus, getNetworkErrorType } from '../hooks/useNetworkStatus';
import type { NetworkErrorType } from '../hooks/useNetworkStatus';
import NetworkErrorPage from '../pages/NetworkErrorPage';

interface NetworkContextType {
  hasConnection: boolean;
  isOnline: boolean;
  isServerReachable: boolean;
  showErrorPage: boolean;
  setShowErrorPage: (show: boolean) => void;
  checkConnection: () => Promise<boolean>;
  error: string | null;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  autoShowErrorPage?: boolean;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ 
  children, 
  serverUrl = 'http://localhost:3000/api/health',
  autoShowErrorPage = true
}) => {
  const networkStatus = useNetworkStatus(serverUrl);
  const [showErrorPage, setShowErrorPage] = useState(false);
  const [errorType, setErrorType] = useState<NetworkErrorType>('offline');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastErrorCheck, setLastErrorCheck] = useState<Date | null>(null);

  useEffect(() => {
    // Debounce error checking to avoid rapid state changes
    const now = new Date();
    if (lastErrorCheck && (now.getTime() - lastErrorCheck.getTime()) < 5000) {
      return; // Skip if we checked less than 5 seconds ago
    }

    // Show error page if we have consecutive failures and auto-show is enabled
    if (autoShowErrorPage) {
      if (!networkStatus.hasConnection) {
        setConsecutiveFailures(prev => prev + 1);
        setLastErrorCheck(now);
        
        // Show error page after 3 consecutive failures (to avoid flickering)
        if (consecutiveFailures >= 2) {
          const errorType = getNetworkErrorType({ 
            message: networkStatus.error,
            name: networkStatus.error?.includes('timeout') ? 'AbortError' : 'NetworkError'
          });
          setErrorType(errorType);
          setShowErrorPage(true);
        }
      } else {
        // Reset failures when connection is restored
        setConsecutiveFailures(0);
        setShowErrorPage(false);
        setLastErrorCheck(null);
      }
    }
  }, [networkStatus.hasConnection, networkStatus.error, autoShowErrorPage, consecutiveFailures, lastErrorCheck]);

  const handleRetry = async () => {
    try {
      const isConnected = await networkStatus.checkServer();
      if (isConnected) {
        setShowErrorPage(false);
        setConsecutiveFailures(0);
      }
      return isConnected;
    } catch (error) {
      console.error('Network retry failed:', error);
      return false;
    }
  };

  const contextValue: NetworkContextType = {
    hasConnection: networkStatus.hasConnection,
    isOnline: networkStatus.isOnline,
    isServerReachable: networkStatus.isServerReachable,
    showErrorPage,
    setShowErrorPage,
    checkConnection: networkStatus.checkServer,
    error: networkStatus.error
  };

  // Show network error page if needed
  if (showErrorPage) {
    return (
      <NetworkErrorPage
        errorType={errorType}
        errorMessage={networkStatus.error || undefined}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};
