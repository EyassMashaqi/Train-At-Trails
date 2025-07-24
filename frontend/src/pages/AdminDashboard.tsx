import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  fullName: string;
  email: string;
  trainName: string;
  currentStep: number;
  createdAt: string;
}

interface PendingAnswer {
  id: number;
  content: string;
  submittedAt: string;
  user: {
    id: number;
    fullName: string;
    trainName: string;
  };
  question: {
    id: number;
    questionNumber: number;
    title: string;
  };
}

interface GameStats {
  totalUsers: number;
  totalAnswers: number;
  pendingAnswers: number;
  averageProgress: number;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'answers'>('overview');
  
  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<{
    answerId: number | null;
    status: 'approved' | 'rejected' | null;
    feedback: string;
  }>({
    answerId: null,
    status: null,
    feedback: ''
  });

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading admin data...', { userEmail: user?.email, isAdmin: user?.isAdmin });
      const [usersResponse, pendingResponse, statsResponse] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getPendingAnswers(),
        adminService.getGameStats()
      ]);

      setUsers(usersResponse.data.users);
      setPendingAnswers(pendingResponse.data.pendingAnswers);
      setStats(statsResponse.data);
    } catch (error: unknown) {
      console.error('Admin data loading error:', error);
      let errorMessage = 'Failed to load admin data';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response: unknown }).response === 'object' &&
        (error as { response: unknown }).response !== null
      ) {
        const response = (error as { response: { data?: { error?: string; message?: string }; status?: number } }).response;
        errorMessage = response.data?.error || response.data?.message || errorMessage;
        if (response.status === 403) {
          toast.error(`Access denied: ${errorMessage}. Please ensure you're logged in as an admin user.`);
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleReviewAnswer = async (answerId: number, status: 'approved' | 'rejected') => {
    // Open feedback modal
    setFeedbackForm({
      answerId,
      status,
      feedback: ''
    });
    setShowFeedbackModal(true);
  };

  const submitReview = async () => {
    if (!feedbackForm.answerId || !feedbackForm.status) return;
    
    if (!feedbackForm.feedback.trim()) {
      toast.error('Feedback is required');
      return;
    }

    try {
      await adminService.reviewAnswer(feedbackForm.answerId, feedbackForm.status, feedbackForm.feedback);
      toast.success(`Answer ${feedbackForm.status} successfully!`);
      setShowFeedbackModal(false);
      setFeedbackForm({ answerId: null, status: null, feedback: '' });
      await loadAdminData(); // Refresh data
    } catch (error: unknown) {
      let errorMessage = `Failed to ${feedbackForm.status} answer`;
      if (
        error && 
        typeof error === 'object' && 
        'response' in error &&
        typeof (error as { response: unknown }).response === 'object' &&
        (error as { response: unknown }).response !== null
      ) {
        const response = (error as { response: { data?: { message?: string } } }).response;
        errorMessage = response.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const renderOverview = () => {
    if (!stats) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-blue-600 text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-green-600 text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Answers</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalAnswers}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pendingAnswers}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-purple-600 text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Avg Progress</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.averageProgress ? stats.averageProgress.toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {pendingAnswers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Pending Answers</h3>
            <div className="space-y-4">
              {pendingAnswers.slice(0, 3).map((answer) => (
                <div key={answer.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {answer.user.fullName} ({answer.user.trainName})
                      </h4>
                      <p className="text-sm text-gray-600">
                        Question {answer.question.questionNumber}: {answer.question.title}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleReviewAnswer(answer.id, 'approved')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewAnswer(answer.id, 'rejected')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{answer.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Submitted: {new Date(answer.submittedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {pendingAnswers.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setActiveTab('answers')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {pendingAnswers.length} pending answers →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Train Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">🚂 {user.trainName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">Step {user.currentStep}/12</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(user.currentStep / 12) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPendingAnswers = () => {
    if (pendingAnswers.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <span className="text-4xl">🎉</span>
          <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending answers to review.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {pendingAnswers.map((answer) => (
          <div key={answer.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {answer.user.fullName} ({answer.user.trainName})
                </h4>
                <p className="text-sm text-gray-600">
                  Question {answer.question.questionNumber}: {answer.question.title}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleReviewAnswer(answer.id, 'approved')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleReviewAnswer(answer.id, 'rejected')}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Answer:</h5>
              <p className="text-gray-700">{answer.content}</p>
            </div>
            
            <p className="text-xs text-gray-400">
              Submitted: {new Date(answer.submittedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <span className="text-4xl">⏳</span>
          </div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">   
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <span className="text-6xl mr-4 drop-shadow-lg">🔧</span>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-lg text-gray-600">Manage users and review answers</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/questions"
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center shadow-lg"
              >
                <span className="mr-2">❓</span>
                Manage Questions
              </Link>
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
      <div className="max-w-7xl mx-auto p-4">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'users', name: 'Users', icon: '👥' },
              { id: 'answers', name: 'Pending Answers', icon: '📝', badge: pendingAnswers.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'users' | 'answers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center">
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-medium">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'answers' && renderPendingAnswers()}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {feedbackForm.status === 'approved' ? 'Approve Answer' : 'Reject Answer'}
            </h3>
            
            <div className="mb-4">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Please provide feedback for ${feedbackForm.status === 'approved' ? 'approving' : 'rejecting'} this answer...`}
                value={feedbackForm.feedback}
                onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackForm({ answerId: null, status: null, feedback: '' });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  feedbackForm.status === 'approved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {feedbackForm.status === 'approved' ? 'Approve with Feedback' : 'Reject with Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
