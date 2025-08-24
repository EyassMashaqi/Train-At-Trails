import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { gameService } from '../services/api';
import { getThemeClasses, getVehicleIcon } from '../utils/themes';

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
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTrainAnimation, setShowTrainAnimation] = useState(false);
  const [activeQuestionsCount, setActiveQuestionsCount] = useState(0);
  const [totalSteps, setTotalSteps] = useState(12); // Default fallback, will be updated from API

  // Get theme-specific classes
  const themeClasses = useMemo(() => getThemeClasses(currentTheme), [currentTheme]);
  const vehicleIcon = useMemo(() => getVehicleIcon(currentTheme), [currentTheme]);

  // Memoized time formatter to reduce re-renders
  const formattedTime = useMemo(() => currentTime.toLocaleTimeString(), [currentTime]);
  const formattedDate = useMemo(() => 
    currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), [currentTime]);

  // Memoized progress percentage
  const progressPercentage = useMemo(() => 
    Math.round((user?.currentStep || 0) / totalSteps * 100), 
    [user?.currentStep, totalSteps]);

  const handleStartGame = useCallback(() => {
    navigate('/game');
  }, [navigate]);

  const handleAdminDashboard = useCallback(() => {
    navigate('/cohorts');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    // Redirect admin users to cohort management
    if (user && user.isAdmin) {
      navigate('/cohorts');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if user has active cohort assignment
    const checkCohortAccess = async () => {
      try {
        const response = await gameService.getCohortHistory();
        const hasActive = response.data.hasActiveCohort;
        
        // Redirect to cohort history if no active cohort or not enrolled
        if (!hasActive) {
          navigate('/cohort-history');
        }
      } catch (error) {
        // If API fails, assume no access and redirect
        navigate('/cohort-history');
      }
    };

    if (user && !user.isAdmin) {
      checkCohortAccess();
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

        // Set total steps from API response
        if (data.totalSteps) {
          setTotalSteps(data.totalSteps);
        }

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
      }
    };

    if (user && !user.isAdmin) {
      fetchActiveQuestions();
    }
  }, [user]);

  // Optimized clock update with reduced frequency for performance
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Welcome animation - memoized to prevent recreation
  useEffect(() => {
    const animationTimer = setTimeout(() => setShowTrainAnimation(true), 500);
    const resetTimer = setTimeout(() => setShowTrainAnimation(false), 3500);
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(resetTimer);
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <p className={themeClasses.textSecondary}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeClasses.cardBg}`}>
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
                <h1 className="text-3xl font-bold text-gray-900">
                  BVisionRY Lighthouse
                </h1>
                <p className={`text-lg ${themeClasses.textSecondary}`}>Welcome back, {user.fullName}!</p>
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
                  className={`${themeClasses.primaryButton} ${themeClasses.buttonText} px-6 py-3 rounded-lg ${themeClasses.primaryButtonHover} transition-all duration-200 flex items-center shadow-lg transform hover:scale-105`}
                >
                  <span className="mr-2">⚙️</span>
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className={`${
                  currentTheme.id === 'planes' 
                    ? 'bg-gradient-to-r from-slate-600 to-blue-700 hover:from-slate-700 hover:to-blue-800 text-white' 
                    : currentTheme.id === 'trains' 
                    ? 'bg-gradient-to-r from-blue-600 to-yellow-600 hover:from-blue-700 hover:to-yellow-700 text-white' 
                    : currentTheme.id === 'sailboat' 
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white' 
                    : currentTheme.id === 'cars' 
                    ? 'bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-700 hover:to-yellow-700 text-white' 
                    : currentTheme.id === 'f1' 
                    ? 'bg-gradient-to-r from-red-600 to-black hover:from-red-700 hover:to-gray-800 text-white' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                } px-6 py-3 rounded-lg transition-all duration-200 flex items-center shadow-lg`}
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
            <div className={`${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} backdrop-blur-sm rounded-2xl shadow-2xl p-8 border ${themeClasses.brandBorder || 'border-primary-200'}`}>
              <div className="flex items-center mb-8">
                <div className="relative">
                  <span className="text-8xl mr-6 drop-shadow-lg">{vehicleIcon}</span>
                  {showTrainAnimation && (
                    <div className="absolute -top-4 -right-4 animate-ping">
                      <span className="text-4xl">💨</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    {user.trainName || `Your ${currentTheme.name.slice(0, -1)}`}
                  </h2>
                  <p className={`text-xl ${themeClasses.textSecondary}`}>Station {user.currentStep} of {totalSteps}</p>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mb-8">
                <div className={`flex justify-between text-lg font-medium ${themeClasses.textSecondary} mb-4`}>
                  <span>Progress</span>
                  <span className={`text-2xl font-bold ${themeClasses.secondaryText}`}>
                    {progressPercentage}%
                  </span>
                </div>
                <div className="relative">
                  <div className={`w-full ${themeClasses.progressContainer || 'bg-accent-200'} rounded-full h-6 shadow-inner border ${themeClasses.accentBorder}`}>
                    <div
                      className={`${themeClasses.progressBg} h-6 rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden border ${themeClasses.primaryBorder}`}
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary-300/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  {/* Progress sparkles */}
                  <div
                    className="absolute top-0 h-6 flex items-center"
                    style={{ left: `${progressPercentage}%` }}
                  >
                    <span className="text-2xl animate-pulse">⭐</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-6">
                <button
                  onClick={handleStartGame}
                  className={`w-full ${
                    currentTheme.id === 'trains' 
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' 
                      : currentTheme.id === 'planes' 
                      ? 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800' 
                      : currentTheme.id === 'sailboat' 
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700' 
                      : currentTheme.id === 'cars' 
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                      : currentTheme.id === 'f1' 
                      ? 'bg-gradient-to-r from-red-600 to-zinc-600 hover:from-red-700 hover:to-zinc-700' 
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                  } text-white py-6 px-8 rounded-xl transition-all duration-200 flex items-center justify-center text-xl font-bold shadow-2xl transform hover:scale-105`}
                >
                  <span className="mr-3 text-3xl">🎮</span>
                  Continue Your Journey
                </button>

                {user.currentStep === totalSteps && (
                  <div className={`bg-gradient-to-br ${themeClasses.accentBg}/10 border-2 ${themeClasses.accentBorder} rounded-xl p-8 text-center shadow-lg`}>
                    <span className="text-8xl mb-4 block animate-bounce">🏆</span>
                    <h3 className={`text-3xl font-bold ${themeClasses.accentText} mb-2`}>
                      Congratulations!
                    </h3>
                    <p className={`text-xl ${themeClasses.accentText}/80`}>
                      You've completed the entire Trail at Trails journey!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Questions Card - Moved from right column */}
            <div className={`${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} backdrop-blur-sm rounded-2xl shadow-xl p-6 border ${themeClasses.brandBorder || 'border-primary-200'} mt-8`}>
              <h3 className={`text-2xl font-bold ${themeClasses.textPrimary} mb-6 flex items-center`}>
                <span className="mr-3">🎯</span>
                Active Questions
              </h3>
              <div className="text-center">
                <div className={`text-5xl font-bold ${themeClasses.accentText} bg-gradient-to-r ${themeClasses.accentBg}/10 p-6 rounded-lg mb-4`}>
                  {activeQuestionsCount}
                </div>
                <div className={`text-lg ${themeClasses.textSecondary} mb-4`}>
                  {activeQuestionsCount === 1
                    ? 'Question Available'
                    : 'Questions Available'}
                </div>
                {activeQuestionsCount > 0 ? (
                  <button
                    onClick={() => navigate('/game')}
                    className={`w-full ${
                      currentTheme.id === 'trains' 
                        ? 'bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800' 
                        : currentTheme.id === 'planes' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800' 
                        : currentTheme.id === 'sailboat' 
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700' 
                        : currentTheme.id === 'cars' 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                        : currentTheme.id === 'f1' 
                        ? 'bg-gradient-to-r from-red-600 to-gray-700 hover:from-red-700 hover:to-gray-800' 
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                    } text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium`}
                  >
                    <span className="mr-2">📝</span>
                    Start Answering
                  </button>
                ) : (
                  <div className={`text-sm ${themeClasses.textMuted}`}>
                    Check back later for new questions!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className={`${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} backdrop-blur-sm rounded-2xl shadow-xl p-6 border ${themeClasses.brandBorder || 'border-primary-200'}`}>
              <h3 className={`text-2xl font-bold ${themeClasses.textPrimary} mb-6 flex items-center`}>
                <span className="mr-3">📊</span>
                Your Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
                  <span className={`${themeClasses.textSecondary} font-medium`}>Current Station</span>
                  <span className="text-2xl font-bold text-primary-600">{user.currentStep}/{totalSteps}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-lg">
                  <span className={`${themeClasses.textSecondary} font-medium`}>Lighthouse Name</span>
                  <span className="font-bold text-secondary-600">🚂 {user.trainName}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-accent-50 to-accent-100 rounded-lg">
                  <span className={`${themeClasses.textSecondary} font-medium`}>Member Since</span>
                  <span className="font-bold text-accent-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Clock */}
            <div className={`${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} backdrop-blur-sm rounded-2xl shadow-xl p-6 border ${themeClasses.brandBorder || 'border-primary-200'}`}>
              <h3 className={`text-2xl font-bold ${themeClasses.textPrimary} mb-6 flex items-center`}>
                <span className="mr-3">🕒</span>
                Current Time
              </h3>
              <div className="text-center">
                <div className={`text-3xl font-mono font-bold ${themeClasses.primaryText} bg-gradient-to-r ${themeClasses.primaryBg}/10 p-4 rounded-lg`}>
                  {formattedTime}
                </div>
                <div className={`text-lg ${themeClasses.textMuted} mt-2`}>
                  {formattedDate}
                </div>
              </div>
            </div>

            {/* Journey Guide */}
            <div className={`${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} backdrop-blur-sm rounded-2xl shadow-xl p-6 border ${themeClasses.brandBorder || 'border-primary-200'}`}>
              <h3 className={`text-2xl font-bold ${themeClasses.textPrimary} mb-6 flex items-center`}>
                <span className="mr-3">🗺️</span>
                Journey Guide
              </h3>
              {user.currentStep < totalSteps ? (
                <div className={`space-y-3 text-sm ${themeClasses.textSecondary}`}>
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
                    <p>Complete all {totalSteps} stations to finish your journey!</p>
                  </div>
                </div>
              ) : (
                <div className={`space-y-3 text-sm ${themeClasses.textSecondary}`}>
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
