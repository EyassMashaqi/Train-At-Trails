import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isServerReachable: boolean;
  lastChecked: Date | null;
  error: string | null;
}

export const useNetworkStatus = (serverUrl: string = '/api/health', checkInterval: number = 120000) => { // Increased to 2 minutes
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isServerReachable: false,
    lastChecked: null,
    error: null
  });

  const checkServerReachability = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced to 3 seconds

      const response = await fetch(serverUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        setNetworkStatus(prev => ({
          ...prev,
          isServerReachable: true,
          lastChecked: new Date(),
          error: null
        }));
        return true;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setNetworkStatus(prev => ({
        ...prev,
        isServerReachable: false,
        lastChecked: new Date(),
        error: errorMessage
      }));
      return false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      checkServerReachability();
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        isOnline: false, 
        isServerReachable: false,
        error: 'Device is offline'
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial server check
    if (navigator.onLine) {
      checkServerReachability();
    }

    // Set up periodic server checks
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkServerReachability();
      }
    }, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [serverUrl, checkInterval]);

  return {
    ...networkStatus,
    checkServer: checkServerReachability,
    hasConnection: networkStatus.isOnline && networkStatus.isServerReachable
  };
};

// Network Error Types
export type NetworkErrorType = 'offline' | 'server_error' | 'timeout' | 'unknown';

export const getNetworkErrorType = (error: any): NetworkErrorType => {
  if (!navigator.onLine) return 'offline';
  
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return 'timeout';
  }
  
  if (error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('ERR_NETWORK')) {
    return 'server_error';
  }
  
  return 'unknown';
};
