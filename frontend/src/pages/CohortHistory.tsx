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
  cohortNumber?: number;
  description?: string;
  startDate: string;
  endDate?: string;
  joinedAt: string;
  currentStep?: number;
  finalStep?: number;
  status: 'ENROLLED' | 'GRADUATED' | 'REMOVED' | 'SUSPENDED';
  statusChangedAt: string;
  statusChangedBy?: string;
  isActive?: boolean;
  cohortIsActive?: boolean; // Add cohort activity status
  // Legacy fields for backward compatibility
  graduatedAt?: string;
  graduatedBy?: string;
}

interface CohortHistoryData {
  activeCohorts: CohortInfo[];
  graduatedCohorts: CohortInfo[];
  historyCohorts: CohortInfo[];
  hasActiveCohort: boolean;
  hasGraduatedCohorts: boolean;
  hasHistoryCohorts: boolean;
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ENROLLED': return 'bg-green-100 text-green-800 border-green-200';
      case 'GRADUATED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REMOVED': return 'bg-red-100 text-red-800 border-red-200';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENROLLED': return '✅';
      case 'GRADUATED': return '🎓';
      case 'REMOVED': return '❌';
      case 'SUSPENDED': return '⏸️';
      default: return '❓';
    }
  };

  const getStatusMessage = (status: string, cohortIsActive?: boolean) => {
    switch (status) {
      case 'ENROLLED': 
        if (cohortIsActive === false) {
          return 'Your cohort has been deactivated. You cannot access training materials at this time.';
        }
        return 'You are currently enrolled and can access training materials.';
      case 'GRADUATED': return 'You have successfully completed this training program.';
      case 'REMOVED': return 'You are no longer participating in this cohort.';
      case 'SUSPENDED': return 'Your participation is temporarily suspended.';
      default: return 'Status unknown.';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <span className="text-xl">🏠</span>
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <img src={BVisionRYLogo} alt="BVisionRY" className="h-8 w-auto" />
              <img src={LighthouseLogo} alt="Lighthouse" className="h-8 w-auto" />
            </div>
          </div>

          <div className="text-center">
            <div className="mb-8">
              <span className="text-8xl">⏳</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to BVisionRY Lighthouse!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              You haven't been assigned to any training cohort yet.
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <span className="text-xl">🏠</span>
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <img src={BVisionRYLogo} alt="BVisionRY" className="h-8 w-auto" />
            <img src={LighthouseLogo} alt="Lighthouse" className="h-8 w-auto" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎓 Your Training Journey
          </h1>
          <p className="text-xl text-gray-600">
            Track your progress across all cohorts
          </p>
        </div>

        <div className="grid gap-8">
          {/* Active Cohorts - Show if user has any ENROLLED status, regardless of cohort activity */}
          {cohortHistory?.activeCohorts && cohortHistory.activeCohorts.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-2xl mr-3">🎯</span>
                Current Training
              </h2>
              <div className="grid gap-4">
                {cohortHistory.activeCohorts?.map((cohort) => (
                  <div
                    key={cohort.id}
                    className={`border rounded-lg p-6 transition-colors ${
                      cohort.cohortIsActive === false && cohort.status === 'ENROLLED'
                        ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300' 
                        : 'border-green-200 bg-green-50 hover:border-green-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      // Only allow navigation for ENROLLED users in active cohorts
                      if (cohort.status === 'ENROLLED' && cohort.cohortIsActive !== false) {
                        navigate('/dashboard');
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900">{cohort.name}</h3>
                      <span className="text-lg font-medium text-gray-600">
                        #{cohort.cohortNumber}
                      </span>
                      {/* Only show deactivated badge for ENROLLED users */}
                      {cohort.cohortIsActive === false && cohort.status === 'ENROLLED' && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          Deactivated
                        </span>
                      )}
                    </div>

                    {cohort.description && (
                      <p className="text-gray-600 mb-4">{cohort.description}</p>
                    )}
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className={`text-sm mb-2 ${
                        cohort.cohortIsActive === false && cohort.status === 'ENROLLED' 
                          ? 'text-yellow-800' 
                          : 'text-green-800'
                      }`}>
                        {/* Only pass cohortIsActive for ENROLLED users */}
                        <strong>{getStatusMessage(cohort.status, cohort.status === 'ENROLLED' ? cohort.cohortIsActive : undefined)}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Started:</span> {formatDate(cohort.startDate)}
                        </div>
                        <div>
                          <span className="font-medium">Joined:</span> {formatDate(cohort.joinedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Current Step:</span> {cohort.currentStep || 0}
                        </div>
                        <div>
                          <span className="font-medium">Status Changed:</span> {formatDate(cohort.statusChangedAt)}
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        cohort.status === 'ENROLLED' && cohort.cohortIsActive === false
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : cohort.status === 'ENROLLED'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={cohort.status !== 'ENROLLED' || cohort.cohortIsActive === false}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cohort.status === 'ENROLLED' && cohort.cohortIsActive !== false) {
                          navigate('/dashboard');
                        }
                      }}
                    >
                      {cohort.status === 'ENROLLED' && cohort.cohortIsActive === false 
                        ? '🚫 Training Unavailable' 
                        : cohort.status === 'ENROLLED'
                        ? '📚 Continue Training'
                        : '✅ Completed'
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training History */}
          {cohortHistory?.hasHistoryCohorts && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-2xl mr-3">📚</span>
                Training History
              </h2>
              <div className="grid gap-4">
                {cohortHistory.historyCohorts?.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">{cohort.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(cohort.status)}`}>
                        {getStatusIcon(cohort.status)} {cohort.status}
                      </span>
                    </div>

                    {cohort.description && (
                      <p className="text-gray-600 mb-4">{cohort.description}</p>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>{getStatusMessage(cohort.status)}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Started:</span> {formatDate(cohort.startDate)}
                        </div>
                        <div>
                          <span className="font-medium">Joined:</span> {formatDate(cohort.joinedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Final Step:</span> {cohort.finalStep || cohort.currentStep || 0}
                        </div>
                        <div>
                          <span className="font-medium">Status Changed:</span> {formatDate(cohort.statusChangedAt)}
                        </div>
                        {cohort.statusChangedBy && (
                          <div className="col-span-2">
                            <span className="font-medium">Changed by:</span> {cohort.statusChangedBy}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Special message for graduated cohorts */}
                    {cohort.status === 'GRADUATED' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-800 text-sm">
                          🎉 <strong>Congratulations!</strong> You successfully completed this training program.
                        </p>
                      </div>
                    )}

                    {/* Note for removed/suspended cohorts */}
                    {(cohort.status === 'REMOVED' || cohort.status === 'SUSPENDED') && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800 text-sm">
                          <strong>Note:</strong> Your training data and progress have been preserved for this cohort.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No cohorts fallback message */}
          {(!cohortHistory?.activeCohorts || cohortHistory.activeCohorts.length === 0) && 
           (!cohortHistory?.hasHistoryCohorts) && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Training Cohorts Yet</h2>
              <p className="text-gray-600 mb-6">
                You haven't been assigned to any training cohorts yet. 
                Please contact your administrator to get enrolled in a training program.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Next steps:</strong> Once you're enrolled, you'll see your training materials and progress here.
                </p>
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
        `
      }} />
    </div>
  );
};

export default CohortHistory;
