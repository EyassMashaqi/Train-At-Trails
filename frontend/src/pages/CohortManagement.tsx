import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface Cohort {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    cohortMembers: number;
    modules: number;
    questions: number;
  };
}

interface CreateCohortData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

// Remove unused interface
// interface EditCohortData extends CreateCohortData {
//   id: string;
// }

const CohortManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [formData, setFormData] = useState<CreateCohortData>({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [editFormData, setEditFormData] = useState<CreateCohortData>({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadCohorts();
  }, [user, navigate]);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/cohorts');
      setCohorts(response.data.cohorts || []);
    } catch (error) {
      console.error('Failed to load cohorts:', error);
      toast.error('Failed to load cohorts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Cohort name is required');
      return;
    }

    if (!formData.startDate) {
      toast.error('Start date is required');
      return;
    }

    try {
      setCreateLoading(true);
      await api.post('/admin/cohorts', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null
      });

      toast.success('Cohort created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', startDate: '', endDate: '' });
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create cohort';
      toast.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSelectCohort = (cohortId: string) => {
    // Navigate to admin dashboard with selected cohort
    navigate(`/admin?cohort=${cohortId}`);
  };

  const handleEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setEditFormData({
      name: cohort.name,
      description: cohort.description || '',
      startDate: cohort.startDate ? new Date(cohort.startDate).toISOString().slice(0, 16) : '',
      endDate: cohort.endDate ? new Date(cohort.endDate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCohort) return;

    if (!editFormData.name.trim()) {
      toast.error('Cohort name is required');
      return;
    }

    if (!editFormData.startDate) {
      toast.error('Start date is required');
      return;
    }

    try {
      setEditLoading(true);
      await api.patch(`/admin/cohorts/${editingCohort.id}`, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || null,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate || null
      });

      toast.success('Cohort updated successfully!');
      setShowEditModal(false);
      setEditingCohort(null);
      setEditFormData({ name: '', description: '', startDate: '', endDate: '' });
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort';
      toast.error(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const toggleCohortStatus = async (cohortId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/cohorts/${cohortId}`, { isActive: !isActive });
      toast.success(`Cohort ${!isActive ? 'activated' : 'deactivated'} successfully`);
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort status';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">🏫</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-4xl">✨</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading cohorts...</p>
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
                Cohort Management
              </h1>
              <p className="text-xl text-gray-600">Manage training cohorts and their progress</p>
            </div>
            <img 
              src={LighthouseLogo} 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">➕</span>
              <span>Create New Cohort</span>
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-6 py-3 rounded-lg hover:from-secondary-700 hover:to-secondary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">👥</span>
              <span>Manage Users</span>
            </button>
          </div>
        </div>

        {/* Cohorts Grid */}
        {cohorts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl mx-auto">
              <span className="text-8xl mb-6 block">🏫</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Cohorts Yet</h2>
              <p className="text-gray-600 mb-8">
                Get started by creating your first training cohort. Each cohort can have its own modules, 
                questions, and member progress tracking.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg"
              >
                Create Your First Cohort
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${
                  cohort.isActive 
                    ? 'border-primary-200 hover:border-primary-400' 
                    : 'border-gray-200 opacity-75'
                }`}
                onClick={() => handleSelectCohort(cohort.id)}
              >
                <div className="p-6">
                  {/* Cohort Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">
                        {cohort.isActive ? '🏫' : '🚫'}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {cohort.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cohort.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cohort.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCohort(cohort);
                        }}
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Edit Cohort"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCohortStatus(cohort.id, cohort.isActive);
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          cohort.isActive 
                            ? 'text-red-600 hover:bg-red-100' 
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={cohort.isActive ? 'Deactivate Cohort' : 'Activate Cohort'}
                      >
                        {cohort.isActive ? '🚫' : '▶️'}
                      </button>
                    </div>
                  </div>

                  {/* Cohort Description */}
                  {cohort.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {cohort.description}
                    </p>
                  )}

                  {/* Cohort Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary-600">
                        {cohort._count?.cohortMembers || 0}
                      </div>
                      <div className="text-xs text-gray-500">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-secondary-600">
                        {cohort._count?.modules || 0}
                      </div>
                      <div className="text-xs text-gray-500">Modules</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent-600">
                        {cohort._count?.questions || 0}
                      </div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </div>
                  </div>

                  {/* Cohort Dates */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span>{new Date(cohort.startDate).toLocaleDateString()}</span>
                    </div>
                    {cohort.endDate && (
                      <div className="flex justify-between">
                        <span>Ends:</span>
                        <span>{new Date(cohort.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Hint */}
                  <div className="mt-4 text-center">
                    <span className="text-xs text-primary-600 font-medium">
                      Click to open this cohort →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Cohort Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-90vh overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-3 text-3xl">🏫</span>
                    Create New Cohort
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateCohort} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cohort Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Spring 2025 Leadership Training"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this cohort's purpose and goals..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        min={formData.startDate}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                    >
                      {createLoading ? (
                        <div className="flex items-center justify-center">
                          <span className="animate-spin mr-2">⏳</span>
                          Creating...
                        </div>
                      ) : (
                        'Create Cohort'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Cohort Modal */}
        {showEditModal && editingCohort && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-90vh overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Edit Cohort</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCohort(null);
                      setEditFormData({ name: '', description: '', startDate: '', endDate: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateCohort} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cohort Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter cohort name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter cohort description (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="datetime-local"
                        value={editFormData.startDate}
                        onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="datetime-local"
                        value={editFormData.endDate}
                        onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingCohort(null);
                        setEditFormData({ name: '', description: '', startDate: '', endDate: '' });
                      }}
                      className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50"
                    >
                      {editLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </div>
                      ) : (
                        'Update Cohort'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .line-clamp-2 {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
        `
      }} />
    </div>
  );
};

export default CohortManagement;
