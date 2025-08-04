import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface CohortInfo {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  joinedAt: string;
  currentStep?: number;
  graduatedAt?: string;
  graduatedBy?: string;
  finalStep?: number;
  isActive?: boolean;
}

interface CohortHistoryData {
  activeCohorts: CohortInfo[];
  graduatedCohorts: CohortInfo[];
  hasActiveCohort: boolean;
  hasGraduatedCohorts: boolean;
  totalCohorts: number;
}

const CohortHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cohortHistory, setCohortHistory] = useState<CohortHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCohortHistory();
  }, [user, navigate]);

  const loadCohortHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/game/cohort-history');
      setCohortHistory(response.data);
    } catch (error) {
      console.error('Failed to load cohort history:', error);
      toast.error('Failed to load cohort history');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">🎓</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-4xl">✨</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading your training journey...</p>
        </div>
      </div>
    );
  }

  // If user has no cohorts at all
  if (cohortHistory?.totalCohorts === 0) {
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
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6 space-x-8">
              <img 
                src={BVisionRYLogo} 
                alt="BVisionRY Company Logo" 
                className="w-44 h-16 px-3 py-2 bvisionary-logo"
              />
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Your Training Journey
                </h1>
                <p className="text-xl text-gray-600">Track your cohort progress and achievements</p>
              </div>
              <img 
                src={LighthouseLogo} 
                alt="Lighthouse Logo" 
                className="w-28 h-28 lighthouse-logo"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
              >
                <span className="text-xl">🏠</span>
                <span>Return to Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
              >
                <span className="text-xl">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* No Cohorts Message */}
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl mx-auto">
              <span className="text-8xl mb-6 block">⏳</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Waiting for Cohort Assignment</h2>
              <p className="text-gray-600 mb-8">
                You haven't been assigned to any training cohorts yet. Please wait for an administrator 
                to assign you to a cohort to begin your training journey.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>What happens next?</strong><br />
                  An admin will assign you to a training cohort where you'll participate in modules, 
                  answer questions, and track your progress through the training program.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg"
              >
                Return to Dashboard
              </button>
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
          `
        }} />
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6 space-x-8">
            <img 
              src={BVisionRYLogo} 
              alt="BVisionRY Company Logo" 
              className="w-44 h-16 px-3 py-2 bvisionary-logo"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Your Training Journey
              </h1>
              <p className="text-xl text-gray-600">Track your cohort progress and achievements</p>
            </div>
            <img 
              src={LighthouseLogo} 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">🏠</span>
              <span>Return to Dashboard</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {/* Active Cohorts */}
          {cohortHistory?.hasActiveCohort && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3 text-3xl">🚂</span>
                Active Training Cohorts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cohortHistory.activeCohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="bg-white rounded-xl shadow-lg border-2 border-green-200 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer"
                    onClick={() => navigate('/dashboard')}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">🏫</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {cohort.name}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>

                      {cohort.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {cohort.description}
                        </p>
                      )}

                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Started:</span>
                          <span>{new Date(cohort.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Joined:</span>
                          <span>{new Date(cohort.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Step:</span>
                          <span>{cohort.currentStep || 0}</span>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="text-xs text-green-600 font-medium">
                          Click to continue training →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graduated Cohorts */}
          {cohortHistory?.hasGraduatedCohorts && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3 text-3xl">🎓</span>
                Graduated Cohorts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cohortHistory.graduatedCohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="bg-white rounded-xl shadow-lg border-2 border-gold-200 transition-all duration-300 hover:shadow-xl"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">🏆</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {cohort.name}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
                              Graduated
                            </span>
                          </div>
                        </div>
                      </div>

                      {cohort.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {cohort.description}
                        </p>
                      )}

                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Started:</span>
                          <span>{new Date(cohort.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Joined:</span>
                          <span>{new Date(cohort.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Graduated:</span>
                          <span>{new Date(cohort.graduatedAt!).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Final Step:</span>
                          <span>{cohort.finalStep || 0}</span>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="text-xs text-yellow-600 font-medium">
                          ✨ Training Completed ✨
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          .line-clamp-2 {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
          .border-gold-200 {
            border-color: #fde68a;
          }
        `
      }} />
    </div>
  );
};

export default CohortHistory;
