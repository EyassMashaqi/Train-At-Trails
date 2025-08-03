import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (user?.isAdmin) {
      navigate('/admin');
    } else if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center px-4">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-float">
          <span className="text-4xl opacity-20">☁️</span>
        </div>
        <div className="absolute top-40 right-20 animate-float-delayed">
          <span className="text-3xl opacity-20">🌤️</span>
        </div>
        <div className="absolute bottom-40 left-20 animate-float-slow">
          <span className="text-2xl opacity-20">🌲</span>
        </div>
        <div className="absolute bottom-60 right-10 animate-float-delayed">
          <span className="text-3xl opacity-20">🏔️</span>
        </div>
        {/* Additional scattered elements */}
        <div className="absolute top-1/3 left-1/4 animate-float-slow">
          <span className="text-xl opacity-15">🦅</span>
        </div>
        <div className="absolute top-2/3 right-1/3 animate-float">
          <span className="text-2xl opacity-15">🌿</span>
        </div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Main 404 Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-primary-200 p-12 mb-8">
          {/* Derailed Train Animation */}
          <div className="mb-8 relative">
            <div className="flex justify-center items-end space-x-2">
              {/* Broken Rails */}
              <div className="relative">
                <div className="w-20 h-2 bg-amber-800 transform rotate-12 opacity-60"></div>
                <div className="w-16 h-2 bg-amber-800 transform -rotate-6 opacity-60 mt-2"></div>
              </div>
              
              {/* Derailed Train */}
              <div className="relative animate-wobble">
                <span className="text-8xl transform rotate-12 inline-block">🚂</span>
                <div className="absolute -top-2 -right-2">
                  <span className="text-3xl animate-ping">💥</span>
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <span className="text-2xl animate-bounce">💨</span>
                </div>
              </div>

              {/* More Broken Rails */}
              <div className="relative">
                <div className="w-16 h-2 bg-amber-800 transform -rotate-12 opacity-60"></div>
                <div className="w-20 h-2 bg-amber-800 transform rotate-6 opacity-60 mt-2"></div>
              </div>
            </div>

            {/* Scattered Railway Elements */}
            <div className="absolute -left-8 top-12 animate-bounce">
              <span className="text-xl opacity-60">🔧</span>
            </div>
            <div className="absolute -right-8 top-8 animate-bounce delay-500">
              <span className="text-xl opacity-60">⚙️</span>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-primary-800 mb-4">
              4<span className="text-secondary-600">0</span>4
            </h1>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Oops! Train Derailed!
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Looks like this train took a wrong turn on the trail.
            </p>
            <p className="text-lg text-gray-500">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Trail Map (Visual Indicator) */}
          <div className="mb-8 relative">
            <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl p-6 border-2 border-dashed border-amber-300">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-2xl">🗺️</span>
                <div className="text-center">
                  <p className="text-amber-800 font-semibold">Trail Map</p>
                  <p className="text-amber-600 text-sm">You are here: Unknown Territory</p>
                </div>
                <span className="text-2xl">📍</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoHome}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl hover:from-primary-700 hover:to-primary-800 transform hover:scale-105 transition-all duration-200 shadow-lg font-semibold text-lg flex items-center justify-center space-x-2"
            >
              <span className="text-2xl">🏠</span>
              <span>
                {user?.isAdmin ? 'Back to Admin Dashboard' : user ? 'Back to Dashboard' : 'Go to Login'}
              </span>
            </button>
            
            <button
              onClick={handleGoBack}
              className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-8 py-4 rounded-xl hover:from-secondary-700 hover:to-secondary-800 transform hover:scale-105 transition-all duration-200 shadow-lg font-semibold text-lg flex items-center justify-center space-x-2"
            >
              <span className="text-2xl">↩️</span>
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Additional Help Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="text-3xl">🧭</span>
            <h3 className="text-xl font-bold text-gray-800">Need Help Finding Your Way?</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <span className="text-lg">🎯</span>
              <span>Check the URL for typos</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <span className="text-lg">🔄</span>
              <span>Try refreshing the page</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <span className="text-lg">📞</span>
              <span>Contact support if needed</span>
            </div>
          </div>
        </div>

        {/* User Info (if logged in) */}
        {user && (
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Logged in as: <span className="font-semibold text-primary-600">{user.fullName}</span>
              {user.trainName && (
                <span className="ml-2">
                  🚂 <span className="font-semibold text-secondary-600">{user.trainName}</span>
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes wobble {
            0%, 100% { transform: rotate(12deg); }
            25% { transform: rotate(8deg); }
            75% { transform: rotate(16deg); }
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          
          .animate-float-delayed {
            animation: float-delayed 5s ease-in-out infinite 1s;
          }
          
          .animate-float-slow {
            animation: float-slow 8s ease-in-out infinite 2s;
          }
          
          .animate-wobble {
            animation: wobble 2s ease-in-out infinite;
          }
        `
      }} />
    </div>
  );
};

export default NotFound;
