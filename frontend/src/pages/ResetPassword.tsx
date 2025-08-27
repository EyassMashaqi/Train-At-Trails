import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';

// Import images
import LighthouseLogo from '../assets/Lighthouse.png';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new password reset.');
        setIsValidatingToken(false);
        setTokenValid(false);
        return;
      }

      try {
        setIsValidatingToken(true);
        const response = await api.post('/auth/validate-reset-token', { token });
        
        if (response.data.valid) {
          setTokenValid(true);
          setTimeRemaining(response.data.timeRemainingMinutes);
          setError('');
        } else {
          setTokenValid(false);
          setError(response.data.error || 'Invalid or expired reset token.');
        }
      } catch (error: any) {
        setTokenValid(false);
        const errorMessage = error.response?.data?.error || 'Unable to validate reset token. Please try again.';
        setError(errorMessage);
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({ password: '', confirmPassword: '' });
    setError('');
    
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Client-side validation
    const newErrors = { password: '', confirmPassword: '' };
    
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    
    if (newErrors.password || newErrors.confirmPassword) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await api.post('/auth/reset-password', { 
        token,
        newPassword: password 
      });

      if (response.data) {
        setMessage(response.data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Password reset successful. Please log in with your new password.' }
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.error || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex flex-col items-center mb-6 space-y-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                BVisionRY Lighthouse
              </h1>
              <img 
                src={LighthouseLogo} 
                alt="Lighthouse Logo" 
                className="w-32 h-32 lighthouse-logo"
              />
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-center mb-4">
                <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Validating Reset Link</h2>
              <p className="text-gray-600">Please wait while we verify your reset token...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token or no token
  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex flex-col items-center mb-6 space-y-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                BVisionRY Lighthouse
              </h1>
              <img 
                src={LighthouseLogo} 
                alt="Lighthouse Logo" 
                className="w-32 h-32 lighthouse-logo"
              />
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {!token ? 'Invalid Reset Link' : 'Reset Link Expired'}
              </h2>
              <p className="text-gray-600 mb-6">
                {error || 'This password reset link is invalid or has expired. Please request a new password reset.'}
              </p>
              <div className="space-y-3">
                <Link 
                  to="/forgot-password" 
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 px-4 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 font-medium inline-block text-center"
                >
                  Request New Reset Link
                </Link>
                <Link 
                  to="/login" 
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium inline-block text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex flex-col items-center mb-6 space-y-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              BVisionRY Lighthouse
            </h1>
            <img 
              src={LighthouseLogo} 
              alt="Lighthouse Logo" 
              className="w-32 h-32 lighthouse-logo"
            />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
          {timeRemaining !== null && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">
                  This reset link expires in {timeRemaining} minutes
                </span>
              </div>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <span className="text-green-400 text-lg mr-2">✅</span>
                <div>
                  <p className="text-sm text-green-600">{message}</p>
                  <p className="text-green-500 text-xs mt-1">Redirecting to login page...</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <span className="text-red-400 text-lg mr-2">⚠️</span>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Enter your new password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">Password must be at least 6 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Confirm your new password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <span className="text-lg">⏳</span>
                  <span className="ml-2">Resetting Password...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">🔐</span>
                  Reset Password
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;