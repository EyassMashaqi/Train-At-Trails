import React, { useState, useEffect } from 'react';

interface NetworkErrorPageProps {
  onRetry?: () => void;
  errorType?: 'offline' | 'server_error' | 'timeout' | 'unknown';
  errorMessage?: string;
}

const NetworkErrorPage: React.FC<NetworkErrorPageProps> = ({ 
  onRetry, 
  errorType = 'offline',
  errorMessage 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry behavior - reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorInfo = () => {
    switch (errorType) {
      case 'offline':
        return {
          icon: '🌐',
          title: 'No Internet Connection',
          description: 'Please check your internet connection and try again.',
          suggestion: 'Make sure you\'re connected to WiFi or mobile data.'
        };
      case 'server_error':
        return {
          icon: '🔧',
          title: 'Server Connection Error',
          description: 'Unable to connect to the BVisionRY Lighthouse servers.',
          suggestion: 'The server might be temporarily unavailable. Please try again in a few moments.'
        };
      case 'timeout':
        return {
          icon: '⏰',
          title: 'Connection Timeout',
          description: 'The request took too long to complete.',
          suggestion: 'This might be due to a slow connection. Please try again.'
        };
      case 'unknown':
        return {
          icon: '⚠️',
          title: 'Connection Issue',
          description: errorMessage || 'An unexpected connection error occurred.',
          suggestion: 'Please check your connection and try again.'
        };
      default:
        return {
          icon: '❌',
          title: 'Connection Error',
          description: errorMessage || 'Something went wrong with the connection.',
          suggestion: 'Please check your connection and try again.'
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="text-8xl mb-4 animate-bounce">
              {errorInfo.icon}
            </div>
            <div className="flex justify-center items-center space-x-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Device Online' : 'Device Offline'}
              </span>
            </div>
          </div>

          {/* Error Content */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {errorInfo.title}
            </h1>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {errorInfo.description}
            </p>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              💡 {errorInfo.suggestion}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 px-6 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Retrying...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🔄</span>
                  <span>Try Again</span>
                </div>
              )}
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🏠</span>
                <span>Go to Homepage</span>
              </div>
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              BVisionRY Lighthouse • Network Status Monitor
            </p>
          </div>
        </div>

        {/* Network Status Indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-lg">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              Network: {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkErrorPage;
