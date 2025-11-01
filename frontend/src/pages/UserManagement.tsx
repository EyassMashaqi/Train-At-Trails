import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';


// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface User {
  id: string;
  email: string;
  fullName: string;
  trainName?: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  currentCohort?: {
    cohortNumber: number;
    id: string;
    name: string;
    isActive: boolean;
  };
  allCohorts: CohortMembership[];
}

interface CohortMembership {
  cohortId: string;
  cohortName: string;
  status: 'ENROLLED' | 'GRADUATED' | 'REMOVED' | 'SUSPENDED';
  joinedAt: string;
  statusChangedAt: string;
  statusChangedBy?: string;
  isActive: boolean;
}

interface Cohort {
  id: string;
  name: string;
  cohortNumber: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

interface CohortUser {
  id: string;
  email: string;
  fullName: string;
  trainName?: string;
  currentStep: number;
  createdAt: string;
  currentCohortId?: string;
  cohortStatus: 'ENROLLED' | 'GRADUATED' | 'REMOVED' | 'SUSPENDED';
  joinedAt: string;
  statusChangedAt: string;
  statusChangedBy?: string;
  isCurrentCohort: boolean;
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [cohortUsers, setCohortUsers] = useState<CohortUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCohortUser, setSelectedCohortUser] = useState<CohortUser | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [sendingWelcomeEmails, setSendingWelcomeEmails] = useState(false);

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      navigate('/cohorts');
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (selectedCohortId) {
      loadCohortUsers();
    } else {
      setCohortUsers([]);
    }
  }, [selectedCohortId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [usersResponse, cohortsResponse] = await Promise.all([
        api.get('/admin/users-with-cohorts'),
        api.get('/admin/cohorts')
      ]);

      setUsers(usersResponse.data.users || []);
      setCohorts(cohortsResponse.data.cohorts || []);

    } catch (error) {
      toast.error('Failed to load users and cohorts');
    } finally {
      setLoading(false);
    }
  };

  const loadCohortUsers = async () => {
    if (!selectedCohortId) return;

    try {
      setCohortLoading(true);
      const response = await api.get(`/admin/cohort/${selectedCohortId}/users`);
      setCohortUsers(response.data.members || []);
    } catch (error) {
      toast.error('Failed to load cohort users');
    } finally {
      setCohortLoading(false);
    }
  };

  const handleAssignToCohort = async () => {
    if (!selectedUser || !selectedCohortId) {
      toast.error('Please select a user and cohort');
      return;
    }

    try {
      setAssignLoading(true);
      await api.post('/admin/assign-user-cohort', {
        userId: selectedUser.id,
        cohortId: selectedCohortId
      });

      toast.success(`User assigned to cohort successfully!`);
      setShowAssignModal(false);
      setSelectedUser(null);
      await loadData();
      await loadCohortUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to assign user to cohort';
      toast.error(errorMessage);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedCohortUser || !newStatus || !selectedCohortId) {
      toast.error('Please select a status');
      return;
    }

    try {
      setAssignLoading(true);
      const response = await api.put('/admin/user-cohort-status', {
        userId: selectedCohortUser.id,
        cohortId: selectedCohortId,
        status: newStatus
      });

      toast.success(response.data.message || 'User status updated successfully!');
      setShowStatusModal(false);
      setSelectedCohortUser(null);
      setNewStatus('');
      await loadData();
      await loadCohortUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update user status';
      toast.error(errorMessage);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSendWelcomeEmails = async () => {
    if (!selectedCohortId) {
      toast.error('Please select a cohort first');
      return;
    }

    const enrolledUsers = cohortUsers.filter(user => user.cohortStatus === 'ENROLLED');
    
    if (enrolledUsers.length === 0) {
      toast.error('No enrolled users found in this cohort to send emails to');
      return;
    }

    if (!confirm(`Are you sure you want to send welcome emails to ${enrolledUsers.length} enrolled users in this cohort?`)) {
      return;
    }

    try {
      setSendingWelcomeEmails(true);
      
      let successCount = 0;
      let failureCount = 0;

      // Send welcome emails to each enrolled user
      for (const user of enrolledUsers) {
        try {
          await api.post('/admin/send-welcome-email', {
            userEmail: user.email,
            userName: user.fullName,
            cohortId: selectedCohortId
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send welcome email to ${user.email}:`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Welcome emails sent successfully to ${successCount} users!${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
      } else {
        toast.error('Failed to send welcome emails to any users');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send welcome emails';
      toast.error(errorMessage);
    } finally {
      setSendingWelcomeEmails(false);
    }
  };

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  const openStatusModal = (user: CohortUser) => {
    setSelectedCohortUser(user);
    setNewStatus(user.cohortStatus);
    setShowStatusModal(true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">👥</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-2xl">⚙️</span>
            </div>
          </div>
          <p className="text-lg text-gray-600 mt-4 font-medium">Loading Participants Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/cohorts')}
                className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <span className="text-xl">🏫</span>
                <span className="font-medium">Cohorts</span>
              </button>
              <span className="text-gray-300">|</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">👥</span>
                <h1 className="text-xl font-bold text-gray-900">Participants Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <img src={BVisionRYLogo} alt="BVisionRY" className="h-8 w-auto" />
              <img src={LighthouseLogo} alt="Lighthouse" className="h-8 w-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cohort Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-xl mr-2">🎯</span>
            Select Cohort to Manage
          </h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a cohort...</option>
              {cohorts
                .slice() // make a copy so you don’t mutate the original array
                .sort((a, b) => {
                  // Example: order by cohortNumber ascending
                  return a.cohortNumber - b.cohortNumber;
                })
                .map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name + ' - '} {cohort.cohortNumber} {!cohort.isActive ? '(Inactive)' : ''}
                  </option>
                ))}

            </select>
            {selectedCohortId && (
              <button
                onClick={() => setSelectedCohortId('')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Cohort Users (when cohort is selected) */}
        {selectedCohortId && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">👥</span>
                Cohort Participants
                {cohortLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSendWelcomeEmails}
                  disabled={cohortUsers.filter(u => u.cohortStatus === 'ENROLLED').length === 0 || sendingWelcomeEmails}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  title={`Send welcome emails to ${cohortUsers.filter(u => u.cohortStatus === 'ENROLLED').length} enrolled users`}
                >
                  <span>📧</span>
                  <span>{sendingWelcomeEmails ? 'Sending...' : 'Send Welcome Emails'}</span>
                </button>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Assign Participant</span>
                </button>
              </div>
            </div>

            {cohortUsers.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl">👤</span>
                <p className="text-gray-500 mt-4">No users in this cohort</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {cohortUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.trainName && (
                            <p className="text-sm text-gray-500">🚂 {user.trainName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(user.cohortStatus)}`}>
                        {getStatusIcon(user.cohortStatus)} {user.cohortStatus}
                      </span>

                      {/* Current Cohort Indicator */}
                      {user.isCurrentCohort && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                          🎯 Current
                        </span>
                      )}

                      {/* Status Change Button */}
                      <button
                        onClick={() => openStatusModal(user)}
                        className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-1"
                        title="Change Status"
                      >
                        <span>⚙️</span>
                        <span className="text-sm">Status</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Users Overview */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <span className="text-xl mr-2">📊</span>
            All Participants Overview ({users.length} users)
          </h2>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">👥</span>
              <p className="text-gray-500 mt-4">No users found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">👤</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.trainName && (
                          <p className="text-sm text-gray-500">🚂 {user.trainName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Current Cohort */}
                    {user.currentCohort ? (
                      <div className="text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          🎯 {user.currentCohort.name} - {user.currentCohort.cohortNumber}
                        </span>
                        {!user.currentCohort.isActive && (
                          <p className="text-xs text-red-600 mt-1">⚠️ Inactive Cohort</p>
                        )}
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        📭 No Active Cohort
                      </span>
                    )}

                    {/* All Cohorts Status */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">All Cohorts: {user.allCohorts.length}</p>
                      <div className="flex space-x-1">
                        {user.allCohorts.slice(0, 3).map((cohort, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(cohort.status)}`}
                            title={`${cohort.cohortName}: ${cohort.status}`}
                          >
                            {getStatusIcon(cohort.status)}
                          </span>
                        ))}
                        {user.allCohorts.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{user.allCohorts.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assign Button */}
                    <button
                      onClick={() => openAssignModal(user)}
                      className="px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-1"
                      title="Assign to Cohort"
                    >
                      <span>➕</span>
                      <span className="text-sm">Assign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">➕</span>
                Assign Participant to Cohort
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">✖️</span>
              </button>
            </div>

            {selectedUser && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Participant:</p>
                <p className="font-medium text-gray-900">{selectedUser.fullName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cohort:
              </label>
              <select
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Choose a cohort...</option>
                {cohorts.filter(c => c.isActive).map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} - {cohort.cohortNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignToCohort}
                disabled={!selectedCohortId || assignLoading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedCohortUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">⚙️</span>
                Change User Status
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">✖️</span>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">User:</p>
              <p className="font-medium text-gray-900">{selectedCohortUser.fullName}</p>
              <p className="text-sm text-gray-500">{selectedCohortUser.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Current Status: <span className={`px-2 py-1 rounded ${getStatusBadgeClass(selectedCohortUser.cohortStatus)}`}>
                  {getStatusIcon(selectedCohortUser.cohortStatus)} {selectedCohortUser.cohortStatus}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status:
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ENROLLED">✅ ENROLLED - Active participant</option>
                <option value="GRADUATED">🎓 GRADUATED - Completed training</option>
                <option value="REMOVED">❌ REMOVED - No longer participating</option>
                <option value="SUSPENDED">⏸️ SUSPENDED - Temporarily inactive</option>
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> User data and progress will be preserved. Only their access status will change.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || assignLoading || newStatus === selectedCohortUser.cohortStatus}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {assignLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
