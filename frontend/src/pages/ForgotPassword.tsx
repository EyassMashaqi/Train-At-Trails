import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

// Import images
import LighthouseLogo from '../assets/Lighthouse.png';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email });

      if (response.data) {
        setMessage(response.data.message);
        setEmail(''); // Clear form
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.error || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <span className="text-green-400 text-lg mr-2">✅</span>
                <p className="text-sm text-green-600">{message}</p>
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">📧</span>
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <span className="text-lg">⏳</span>
                  <span className="ml-2">Sending Reset Link...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">📧</span>
                  Send Reset Link
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
