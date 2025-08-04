import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

// Import images
import LighthouseLogo from '../assets/Lighthouse.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async () => {
    setLoading(true);
    setErrors(prev => ({ ...prev, general: '' })); // Clear previous errors
    
    try {
      const success = await login('admin@traintrails.com', 'admin123');
      if (success) {
        setErrors({ email: '', password: '', general: '' }); // Clear all errors
        navigate('/cohorts');
      } else {
        setErrors(prev => ({ ...prev, general: 'Admin login failed. Please try again.' }));
        // Note: AuthContext already shows a toast with the specific error message
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setErrors(prev => ({ ...prev, general: 'Failed to login as admin. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔵 Form submitted, preventing default behavior');
    
    // Clear previous general errors but keep field-specific errors if they exist
    setErrors(prev => ({ ...prev, general: '' }));
    
    // Client-side validation
    const newErrors = { email: '', password: '', general: '' };
    
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    if (!password) {
      newErrors.password = 'Please enter your password';
    }

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      if (newErrors.email) toast.error(newErrors.email);
      if (newErrors.password) toast.error(newErrors.password);
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔵 About to call login function');
      const success = await login(email.trim(), password);
      console.log('🔵 Login function returned:', success);
      
      if (success) {
        // Clear errors on successful login
        console.log('✅ Login successful, clearing errors and navigating');
        setErrors({ email: '', password: '', general: '' });
        // Navigate to dashboard after successful login
        navigate('/dashboard');
      } else {
        // Set a general error that will persist - this happens when login() returns false
        console.log('🔴 Login failed - setting error state');
        setErrors(prev => ({ ...prev, general: 'Login failed. Please check your credentials and try again.' }));
        // Note: AuthContext already shows a toast with the specific error message
      }
    } catch (error: unknown) {
      console.error('Unexpected login error:', error);
      setErrors(prev => ({ ...prev, general: 'An unexpected error occurred. Please try again.' }));
    } finally {
      setLoading(false);
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
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue your lighthouse journey
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          
          
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
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: '' }));
                    }
                    if (errors.general) {
                      setErrors(prev => ({ ...prev, general: '' }));
                    }
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }));
                    }
                    if (errors.general) {
                      setErrors(prev => ({ ...prev, general: '' }));
                    }
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <span className="text-red-400 text-lg mr-2">⚠️</span>
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            </div>
          )}


          <div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <span className="text-lg">⏳</span>
                  <span className="ml-2">Signing In...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">👤</span>
                  Sign In
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign up here
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Demo Accounts:</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <p><strong>Admin:</strong> admin@traintrails.com / admin123</p>
              <p><strong>User:</strong> alice@traintrails.com / password123</p>
              <p><strong>User:</strong> bob@traintrails.com / password123</p>
              <p><strong>User:</strong> test@traintrails.com / test123</p>
            </div>
            {import.meta.env.DEV && (
              <div className="mt-4">
                <button
                  onClick={handleAdminLogin}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-primary-300 text-sm font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  Quick Admin Login
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
