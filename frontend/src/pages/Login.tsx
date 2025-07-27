import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async () => {
    setLoading(true);
    const success = await login('admin@traintrails.com', 'admin123');
    setLoading(false);

    if (success) {
      navigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({ email: '', password: '' });
    
    // Client-side validation
    const newErrors = { email: '', password: '' };
    
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
      const success = await login(email.trim(), password);
      if (success) {
        // Navigate to dashboard after successful login
        navigate('/dashboard');
      }
      // Error handling is done in the login function
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚂</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue your trail journey
          </p>
        </div>

        {/* Test Accounts Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-lg">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Test Accounts</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-1">
                  <strong>Admin:</strong> admin@traintrails.com / admin123
                </p>
                <p>
                  <strong>User:</strong> test@traintrails.com / test123
                </p>
              </div>
            </div>
          </div>
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
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
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
                  }}
                  className={`appearance-none relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:z-10 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up here
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Demo Accounts:</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <p><strong>Admin:</strong> admin@traintrails.com / admin123</p>
              <p><strong>User:</strong> alice@example.com / password123</p>
              <p><strong>User:</strong> bob@example.com / password123</p>
            </div>
            {import.meta.env.DEV && (
              <div className="mt-4">
                <button
                  onClick={handleAdminLogin}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
