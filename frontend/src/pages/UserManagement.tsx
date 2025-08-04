import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api, adminService } from '../services/api';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface User {
  id: string;
  email: string;
  fullName: string;
  trainName?: string;
  isAdmin: boolean;
  createdAt: string;
  cohortMembers: CohortMember[];
}

interface CohortMember {
  id: string;
  cohortId: string;
  currentStep: number;
  joinedAt: string;
  isActive: boolean;
  cohort: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

interface Cohort {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      navigate('/cohorts');
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [usersResponse, cohortsResponse] = await Promise.all([
        api.get('/admin/cohorts/users/all'),
        api.get('/admin/cohorts')
      ]);
      
      // Filter out admin users from the user list
      const nonAdminUsers = (usersResponse.data.users || []).filter((user: User) => !user.isAdmin);
      setUsers(nonAdminUsers);
      setCohorts(cohortsResponse.data.cohorts || []);
      
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      toast.error('Failed to load users and cohorts');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToCohort = async () => {
    if (!selectedUser || !selectedCohortId) {
      toast.error('Please select a user and cohort');
      return;
    }

    try {
      setAssignLoading(true);
      await api.post(`/admin/cohorts/${selectedCohortId}/members`, {
        userId: selectedUser.id
      });

      toast.success(`User assigned to cohort successfully!`);
      setShowAssignModal(false);
      setSelectedUser(null);
      setSelectedCohortId('');
      await loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign user to cohort';
      toast.error(errorMessage);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveFromCohort = async (userId: string, cohortId: string, cohortName: string) => {
    if (!confirm(`Are you sure you want to remove this user from "${cohortName}"? Their progress in this cohort will be preserved but they won't be able to access it.`)) {
      return;
    }

    try {
      await api.delete(`/admin/cohorts/${cohortId}/members/${userId}`);
      toast.success('User removed from cohort successfully!');
      await loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove user from cohort';
      toast.error(errorMessage);
    }
  };

  const handleGraduateUser = async (userId: string, cohortId: string, cohortName: string, userName: string) => {
    if (!confirm(`Are you sure you want to graduate "${userName}" from "${cohortName}"? This action will mark their training as complete and they will no longer have active access to this cohort.`)) {
      return;
    }

    try {
      const response = await adminService.graduateUser(userId, cohortId);
      toast.success(response.data.message || 'User graduated successfully!');
      await loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to graduate user';
      toast.error(errorMessage);
    }
  };

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setSelectedCohortId('');
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">👥</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-4xl">✨</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                User Management
              </h1>
              <p className="text-xl text-gray-600">Manage users and their cohort assignments</p>
            </div>
            <img 
              src={LighthouseLogo} 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>

          <button
            onClick={() => navigate('/cohorts')}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg"
          >
            ← Back to Cohorts
          </button>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="mr-2">👥</span>
              All Users ({users.length})
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">👤</span>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Users Found</h3>
              <p className="text-gray-600">No users have registered yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        user.isAdmin ? 'bg-red-500' : 'bg-primary-500'
                      }`}>
                        {user.isAdmin ? '👑' : '👤'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                          {user.fullName}
                          {user.isAdmin && (
                            <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
                              ADMIN
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-600">{user.email}</p>
                        {user.trainName && (
                          <p className="text-sm text-primary-600">🚂 {user.trainName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Cohort Assignments */}
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Cohort Assignments ({user.cohortMembers.length})
                        </div>
                        {user.cohortMembers.length === 0 ? (
                          <span className="text-xs text-gray-500 italic">Not assigned to any cohort</span>
                        ) : (
                          <div className="space-y-1">
                            {user.cohortMembers.map((member) => (
                              <div
                                key={member.id}
                                className={`flex items-center space-x-2 text-xs ${
                                  member.isActive ? 'text-green-700' : 'text-gray-500'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${
                                  member.isActive && member.cohort.isActive ? 'bg-green-500' : 'bg-gray-400'
                                }`}></span>
                                <span className="font-medium">{member.cohort.name}</span>
                                <span className="text-gray-500">
                                  (Step {member.currentStep})
                                </span>
                                {member.isActive && !member.isGraduated && (
                                  <button
                                    onClick={() => handleGraduateUser(user.id, member.cohortId, member.cohort.name, user.fullName)}
                                    className="text-green-600 hover:text-green-800 ml-1"
                                    title="Graduate from cohort"
                                  >
                                    🎓
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveFromCohort(user.id, member.cohortId, member.cohort.name)}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                  title="Remove from cohort"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => openAssignModal(user)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        Assign to Cohort
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign to Cohort Modal */}
        {showAssignModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-3 text-3xl">👥</span>
                    Assign User to Cohort
                  </h2>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Selected User:</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                      👤
                    </div>
                    <div>
                      <p className="font-medium">{selectedUser.fullName}</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Cohort to Assign
                  </label>
                  <select
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Choose a cohort...</option>
                    {cohorts
                      .filter(cohort => 
                        cohort.isActive && 
                        !selectedUser.cohortMembers.some(member => member.cohortId === cohort.id && member.isActive)
                      )
                      .map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} - Started {new Date(cohort.startDate).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                  {cohorts.filter(cohort => 
                    cohort.isActive && 
                    !selectedUser.cohortMembers.some(member => member.cohortId === cohort.id && member.isActive)
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No available cohorts to assign. User may already be in all active cohorts.
                    </p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignToCohort}
                    disabled={assignLoading || !selectedCohortId}
                    className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {assignLoading ? (
                      <div className="flex items-center justify-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Assigning...
                      </div>
                    ) : (
                      'Assign to Cohort'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
