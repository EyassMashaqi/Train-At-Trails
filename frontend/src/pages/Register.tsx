import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    trainName: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.name || !formData.trainName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    const registerData = {
      email: formData.email,
      password: formData.password,
      fullName: formData.name,
      trainName: formData.trainName
    };
    const success = await register(registerData);
    setLoading(false);

    if (success) {
      // Navigate to dashboard after successful registration
      navigate('/dashboard');
    } else {
      toast.error('Registration failed. Please try again.');
    }
  };

  const trainNameSuggestions = [
    'Lightning Express', 'Thunder Bolt', 'Golden Arrow', 'Silver Bullet',
    'Midnight Express', 'Sunset Limited', 'Mountain Explorer', 'Ocean Breeze',
    'Forest Runner', 'Desert Wind', 'Arctic Express', 'Tropical Spirit'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚂</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Join the Trail!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start your journey
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">👤</span>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="trainName" className="block text-sm font-medium text-gray-700">
                Train Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🚂</span>
                </div>
                <input
                  id="trainName"
                  name="trainName"
                  type="text"
                  required
                  value={formData.trainName}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Name your train (e.g., Lightning Express)"
                />
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">Popular train names:</p>
                <div className="flex flex-wrap gap-1">
                  {trainNameSuggestions.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData({ ...formData, trainName: suggestion })}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password || !formData.name || !formData.trainName}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <span className="text-lg">⏳</span>
                  <span className="ml-2">Creating Account...</span>
                </div>
              ) : (
                <>
                  <span className="mr-2">🎟️</span>
                  Create Account
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="bg-blue-50 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">🎮 How it Works:</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Answer 12 questions to complete your trail</li>
                <li>• Each approved answer moves your train forward</li>
                <li>• Admin reviews and approves your answers</li>
                <li>• Track your progress on the interactive trail map</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
