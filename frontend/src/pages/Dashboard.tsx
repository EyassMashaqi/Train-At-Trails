import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { gameService } from '../services/api';

interface Topic {
  id: string;
  isReleased: boolean;
}

interface Module {
  isReleased: boolean;
  topics: Topic[];
}

interface Answer {
  topic?: { id: string };
  status: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTrainAnimation, setShowTrainAnimation] = useState(false);
  const [activeQuestionsCount, setActiveQuestionsCount] = useState(0);

  useEffect(() => {
    // Redirect admin users to admin dashboard
    if (user && user.isAdmin) {
      navigate('/admin');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Fetch active questions count
    const fetchActiveQuestions = async () => {
      try {
        const [progressResponse, modulesResponse] = await Promise.all([
          gameService.getProgress(),
          gameService.getModules()
        ]);
        
        let count = 0;
        
        const data = progressResponse.data;
        
        // Count ALL released topics that haven't been answered (don't double count)
        const modules = modulesResponse.data.modules || [];
        modules.forEach((module: Module) => {
          if (module.isReleased) {
            module.topics.forEach((topic: Topic) => {
              if (topic.isReleased) {
                const hasAnswered = data.answers?.some((answer: Answer) =>
                  answer.topic?.id === topic.id && 
                  (answer.status === 'APPROVED' || answer.status === 'PENDING')
                );
                if (!hasAnswered) {
                  count++;
                }
              }
            });
          }
        });
        
        // If no module topics available, check for legacy current question
        if (count === 0 && data.currentQuestion && (!modules || modules.length === 0)) {
          count = 1;
        }
        
        setActiveQuestionsCount(count);
      } catch (error) {
        console.error('Failed to fetch active questions:', error);
      }
    };

    if (user && !user.isAdmin) {
      fetchActiveQuestions();
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Welcome animation
    const animationTimer = setTimeout(() => setShowTrainAnimation(true), 500);
    const resetTimer = setTimeout(() => setShowTrainAnimation(false), 3500);
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(resetTimer);
    };
  }, []);

  const handleStartGame = () => {
    navigate('/game');
  };

  const handleAdminDashboard = () => {
    navigate('/admin');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-float">
          <span className="text-4xl opacity-20">☁️</span>
        </div>
        <div className="absolute top-40 right-20 animate-float delay-1000">
          <span className="text-3xl opacity-20">🌤️</span>
        </div>
        <div className="absolute bottom-40 left-20 animate-float delay-2000">
          <span className="text-2xl opacity-20">🌲</span>
        </div>
        <div className="absolute bottom-60 right-10 animate-float delay-1500">
          <span className="text-3xl opacity-20">🏔️</span>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <img 
                src="./src/assets/BVisionRY.png" 
                alt="BVisionRY Company Logo" 
                className="w-40 h-14 px-4 py-2 bvisionary-logo"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  BVisionRY Lighthouse
                </h1>
                <p className="text-lg text-gray-600">Welcome back, {user.fullName}!</p>
              </div>
              <div className={`transition-all duration-1000 ${showTrainAnimation ? 'transform scale-110' : ''}`}>
                <img 
                  src="./src/assets/Lighthouse.png" 
                  alt="Lighthouse Logo" 
                  className="w-24 h-24 lighthouse-logo drop-shadow-lg"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user.isAdmin && (
                <button
                  onClick={handleAdminDashboard}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center shadow-lg transform hover:scale-105"
                >
                  <span className="mr-2">⚙️</span>
                  Admin Panel
                </button>
              )}
              <button
                onClick={logout}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center shadow-lg"
              >
                <span className="mr-2">🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Train Card */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="relative">
                  <span className="text-8xl mr-6 drop-shadow-lg">🚂</span>
                  {showTrainAnimation && (
                    <div className="absolute -top-4 -right-4 animate-ping">
                      <span className="text-4xl">💨</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                    {user.trainName || 'Your Train'}
                  </h2>
                  <p className="text-xl text-gray-600">Station {user.currentStep} of 12</p>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-lg font-medium text-gray-600 mb-4">
                  <span>Trail Progress</span>
                  <span className="text-2xl font-bold text-secondary-600">
                    {Math.round((user.currentStep / 12) * 100)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-secondary-500 h-6 rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
                      style={{ width: `${(user.currentStep / 12) * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  {/* Progress sparkles */}
                  <div 
                    className="absolute top-0 h-6 flex items-center"
                    style={{ left: `${(user.currentStep / 12) * 100}%` }}
                  >
                    <span className="text-2xl animate-pulse">⭐</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-6">
                <button
                  onClick={handleStartGame}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-6 px-8 rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 flex items-center justify-center text-xl font-bold shadow-2xl transform hover:scale-105"
                >
                  <span className="mr-3 text-3xl">🎮</span>
                  Continue Your Journey
                </button>

                {user.currentStep === 12 && (
                  <div className="bg-gradient-to-br from-accent-50 to-accent-100 border-2 border-accent-200 rounded-xl p-8 text-center shadow-lg">
                    <span className="text-8xl mb-4 block animate-bounce">🏆</span>
                    <h3 className="text-3xl font-bold text-accent-800 mb-2">
                      Congratulations!
                    </h3>
                    <p className="text-xl text-accent-600">
                      You've completed the entire Trail at Trails journey!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Questions Card - Moved from right column */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 mt-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🎯</span>
                Active Questions
              </h3>
              <div className="text-center">
                <div className="text-5xl font-bold text-accent-600 bg-gradient-to-r from-accent-50 to-accent-100 p-6 rounded-lg mb-4">
                  {activeQuestionsCount}
                </div>
                <div className="text-lg text-gray-600 mb-4">
                  {activeQuestionsCount === 1 
                    ? 'Question Available' 
                    : 'Questions Available'}
                </div>
                {activeQuestionsCount > 0 ? (
                  <button
                    onClick={() => navigate('/game')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium"
                  >
                    <span className="mr-2">📝</span>
                    Start Answering
                  </button>
                ) : (
                  <div className="text-sm text-gray-500">
                    Check back later for new questions!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">📊</span>
                Your Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
                  <span className="text-gray-700 font-medium">Current Station</span>
                  <span className="text-2xl font-bold text-primary-600">{user.currentStep}/12</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-lg">
                  <span className="text-gray-700 font-medium">Train Name</span>
                  <span className="font-bold text-secondary-600">🚂 {user.trainName}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-accent-50 to-accent-100 rounded-lg">
                  <span className="text-gray-700 font-medium">Member Since</span>
                  <span className="font-bold text-accent-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Clock */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🕒</span>
                Current Time
              </h3>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-primary-600 bg-gradient-to-r from-primary-50 to-primary-100 p-4 rounded-lg">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-lg text-gray-500 mt-2">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>

            {/* Journey Guide */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🗺️</span>
                Journey Guide
              </h3>
              {user.currentStep < 12 ? (
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <span className="mr-2">🎯</span>
                    <p>Answer thoughtful questions to advance your train</p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">⏱️</span>
                    <p>New questions are released every 48 hours</p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">✅</span>
                    <p>Admin approval moves you to the next station</p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">🎉</span>
                    <p>Complete all 12 stations to finish your journey!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <span className="mr-2">🎉</span>
                    <p>Congratulations on completing your journey!</p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">🏆</span>
                    <p>You can review your answers in the game section</p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">📚</span>
                    <p>Share your experience with other travelers</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `
      }} />
    </div>
  );
};

export default Dashboard;
