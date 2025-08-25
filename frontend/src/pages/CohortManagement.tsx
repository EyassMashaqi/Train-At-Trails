import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import * as XLSX from 'xlsx';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface Cohort {
  id: string;
  cohortNumber: number;
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
  cohortNumber: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface CopyCohortData {
  newName: string;
  newCohortNumber: string;
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
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [copyingCohort, setCopyingCohort] = useState<Cohort | null>(null);
  const [formData, setFormData] = useState<CreateCohortData>({
    cohortNumber: '',
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [editFormData, setEditFormData] = useState<CreateCohortData>({
    cohortNumber: '',
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [copyFormData, setCopyFormData] = useState<CopyCohortData>({
    newName: '',
    newCohortNumber: ''
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'number' | 'created'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCohort, setDeletingCohort] = useState<Cohort | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null
      };
      
      // Add cohortNumber if provided
      if (formData.cohortNumber.trim()) {
        payload.cohortNumber = parseInt(formData.cohortNumber.trim());
      }

      await api.post('/admin/cohorts', payload);

      toast.success('Cohort created successfully!');
      setShowCreateModal(false);
      setFormData({ cohortNumber: '', name: '', description: '', startDate: '', endDate: '' });
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
      cohortNumber: cohort.cohortNumber?.toString() || '',
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
      const payload: any = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || null,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate || null
      };
      
      // Add cohortNumber if provided
      if (editFormData.cohortNumber.trim()) {
        payload.cohortNumber = parseInt(editFormData.cohortNumber.trim());
      }

      await api.patch(`/admin/cohorts/${editingCohort.id}`, payload);

      toast.success('Cohort updated successfully!');
      setShowEditModal(false);
      setEditingCohort(null);
      setEditFormData({ cohortNumber: '', name: '', description: '', startDate: '', endDate: '' });
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort';
      toast.error(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCopyCohort = (cohort: Cohort) => {
    setCopyingCohort(cohort);
    setCopyFormData({ 
      newName: `${cohort.name}`, 
      newCohortNumber: (cohort.cohortNumber + 1).toString() 
    });
    setShowCopyModal(true);
  };

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!copyingCohort) return;

    if (!copyFormData.newName.trim() || !copyFormData.newCohortNumber.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCopyLoading(true);
      const payload = {
        newName: copyFormData.newName.trim(),
        newCohortNumber: parseInt(copyFormData.newCohortNumber.trim())
      };

      await api.post(`/admin/cohorts/${copyingCohort.id}/copy`, payload);

      toast.success('Cohort copied successfully!');
      setShowCopyModal(false);
      setCopyingCohort(null);
      setCopyFormData({ newName: '', newCohortNumber: '' });
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to copy cohort';
      toast.error(errorMessage);
    } finally {
      setCopyLoading(false);
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

  const handleDeleteCohort = (cohort: Cohort) => {
    setDeletingCohort(cohort);
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const confirmDeleteCohort = async () => {
    if (!deletingCohort) return;

    // Validate confirmation
    if (deleteConfirmation !== deletingCohort.name) {
      toast.error('Cohort name does not match');
      return;
    }

    try {
      setDeleteLoading(true);
      await api.delete(`/admin/cohorts/${deletingCohort.id}`);
      toast.success('Cohort deleted successfully');
      setShowDeleteModal(false);
      setDeletingCohort(null);
      setDeleteConfirmation('');
      await loadCohorts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete cohort';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCohort = async (cohort: Cohort) => {
    try {
      setExportLoading(cohort.id);
      toast.loading('Preparing export data...');
      
      const response = await api.get(`/admin/cohorts/${cohort.id}/export`);
      const { cohort: cohortData, userData } = response.data;

      if (!userData || userData.length === 0) {
        toast.dismiss();
        toast.error('No users found in this cohort');
        return;
      }

      // Generate Excel files for each user
      for (const userInfo of userData) {
        const user = userInfo.user;
        const answers = userInfo.answers || [];
        const miniAnswers = userInfo.miniAnswers || [];
        const membershipInfo = userInfo.membershipInfo;

        // Create filename: UserName_CohortName_C#
        const cleanUserName = user.fullName.replace(/[^a-zA-Z0-9]/g, '');
        const cleanCohortName = cohortData.name.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${cleanUserName}_${cleanCohortName}_C${cohortData.cohortNumber}.xlsx`;

        // Prepare user info sheet
        const userInfoData = [
          ['User Information', ''],
          ['Full Name', user.fullName],
          ['Email', user.email],
          ['Train Name', user.trainName || 'N/A'],
          ['User Created', new Date(user.createdAt).toLocaleString()],
          ['Joined Cohort', new Date(membershipInfo.joinedAt).toLocaleString()],
          ['Status', membershipInfo.status],
          ['Active', membershipInfo.isActive ? 'Yes' : 'No'],
          ['Current Step', user.currentStep || 0],
          ['', ''],
          ['Cohort Information', ''],
          ['Cohort Name', cohortData.name],
          ['Cohort Number', cohortData.cohortNumber],
          ['Description', cohortData.description || 'N/A'],
          ['Start Date', new Date(cohortData.startDate).toLocaleDateString()],
          ['End Date', cohortData.endDate ? new Date(cohortData.endDate).toLocaleDateString() : 'N/A']
        ];

        // Prepare assignments/questions data
        const assignmentsData = [
          ['Question ID', 'Question Title', 'Module/Topic', 'Category', 'Answer', 'Status', 'Grade', 'Submitted At', 'Late Submission']
        ];

        answers.forEach((answer: any) => {
          const submittedAt = new Date(answer.submittedAt);
          const isLate = answer.isLateSubmission || false;
          
          assignmentsData.push([
            answer.question.id,
            answer.question.title,
            answer.question.module?.title || 'Self Learning',
            answer.question.category || 'General',
            answer.content || 'N/A',
            answer.status,
            answer.grade || 'Not Graded',
            submittedAt.toLocaleString(),
            isLate ? 'Yes' : 'No'
          ]);
        });

        // Prepare mini questions data
        const miniQuestionsData = [
          ['Mini Question ID', 'Title', 'Question Text', 'Answer', 'Submitted At']
        ];

        miniAnswers.forEach((miniAnswer: any) => {
          miniQuestionsData.push([
            miniAnswer.miniQuestion.id,
            miniAnswer.miniQuestion.title || 'N/A',
            miniAnswer.miniQuestion.question,
            miniAnswer.linkUrl || 'N/A',
            new Date(miniAnswer.submittedAt).toLocaleString()
          ]);
        });

        // Create workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        // Add user info sheet
        const userInfoSheet = XLSX.utils.aoa_to_sheet(userInfoData);
        XLSX.utils.book_append_sheet(workbook, userInfoSheet, 'User Info');

        // Add assignments sheet
        const assignmentsSheet = XLSX.utils.aoa_to_sheet(assignmentsData);
        XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Assignments & Questions');

        // Add mini questions sheet
        const miniQuestionsSheet = XLSX.utils.aoa_to_sheet(miniQuestionsData);
        XLSX.utils.book_append_sheet(workbook, miniQuestionsSheet, 'Mini Questions');

        // Download the file
        XLSX.writeFile(workbook, fileName);
      }

      toast.dismiss();
      toast.success(`Exported ${userData.length} user file(s) successfully`);

    } catch (error: any) {
      toast.dismiss();
      const errorMessage = error.response?.data?.message || 'Failed to export cohort data';
      toast.error(errorMessage);
    } finally {
      setExportLoading(null);
    }
  };

  // Filter and sort cohorts
  const filteredCohorts = React.useMemo(() => {
    let filtered = cohorts.filter(cohort => {
      const matchesSearch = cohort.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cohort.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cohort.cohortNumber.toString().includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && cohort.isActive) ||
                           (statusFilter === 'inactive' && !cohort.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Sort cohorts
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'number':
          comparison = a.cohortNumber - b.cohortNumber;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [cohorts, searchTerm, statusFilter, sortBy, sortOrder]);

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
              <span>Manage Participants</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Cohorts
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, description, or number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'number' | 'created')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="number">Number</option>
                  <option value="name">Name</option>
                  <option value="created">Created Date</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredCohorts.length} of {cohorts.length} cohorts
          </div>
        </div>

        {/* Cohorts Grid */}
        {filteredCohorts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl mx-auto">
              <span className="text-8xl mb-6 block">
                {cohorts.length === 0 ? '🏫' : '🔍'}
              </span>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {cohorts.length === 0 ? 'No Cohorts Yet' : 'No Cohorts Found'}
              </h2>
              <p className="text-gray-600 mb-8">
                {cohorts.length === 0 
                  ? 'Get started by creating your first training cohort. Each cohort can have its own modules, questions, and member progress tracking.'
                  : 'No cohorts match your current search criteria. Try adjusting your filters or search terms.'
                }
              </p>
              {cohorts.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg"
                >
                  Create Your First Cohort
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCohorts.map((cohort) => (
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
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">
                        {cohort.isActive ? '🏫' : '🚫'}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 leading-tight">
                          <span className="text-sm text-gray-500 font-medium">#{cohort.cohortNumber}</span> {cohort.name}
                        </h3>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium mt-1 ${
                          cohort.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cohort.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-center space-x-1 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCohort(cohort);
                        }}
                        disabled={exportLoading === cohort.id}
                        className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export User Data"
                      >
                        {exportLoading === cohort.id ? '⏳' : '⬇️'}
                      </button>
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
                          handleCopyCohort(cohort);
                        }}
                        className="p-2 rounded-full text-purple-600 hover:bg-purple-100 transition-colors"
                        title="Copy Cohort"
                      >
                        📋
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCohort(cohort);
                        }}
                        className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete Cohort"
                      >
                        🗑️
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
                      <div className="text-xs text-gray-500">Participants</div>
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
                      Cohort Number (optional)
                    </label>
                    <input
                      type="number"
                      value={formData.cohortNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, cohortNumber: e.target.value }))}
                      placeholder="Leave empty for auto-assignment"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      If not provided, the next available number will be assigned automatically
                    </p>
                  </div>

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
                      setEditFormData({ cohortNumber: '', name: '', description: '', startDate: '', endDate: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateCohort} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cohort Number *
                    </label>
                    <input
                      type="number"
                      value={editFormData.cohortNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, cohortNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter cohort number"
                      min="1"
                      required
                    />
                  </div>

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
                        setEditFormData({ cohortNumber: '', name: '', description: '', startDate: '', endDate: '' });
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

        {/* Copy Cohort Modal */}
        {showCopyModal && copyingCohort && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Copy Cohort</h2>
                  <button
                    onClick={() => {
                      setShowCopyModal(false);
                      setCopyingCohort(null);
                      setCopyFormData({ newName: '', newCohortNumber: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Copying from:</p>
                  <p className="font-medium text-gray-800">#{copyingCohort.cohortNumber} {copyingCohort.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This will copy all modules, questions, and mini questions but not users or answers.
                  </p>
                </div>

                <form onSubmit={handleCopySubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Cohort Name *
                    </label>
                    <input
                      type="text"
                      value={copyFormData.newName}
                      onChange={(e) => setCopyFormData({...copyFormData, newName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter new cohort name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Cohort Number *
                    </label>
                    <input
                      type="number"
                      value={copyFormData.newCohortNumber}
                      onChange={(e) => setCopyFormData({...copyFormData, newCohortNumber: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter new cohort number"
                      min="1"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCopyModal(false);
                        setCopyingCohort(null);
                        setCopyFormData({ newName: '', newCohortNumber: '' });
                      }}
                      className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={copyLoading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-50"
                    >
                      {copyLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Copying...</span>
                        </div>
                      ) : (
                        'Copy Cohort'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Cohort Modal */}
        {showDeleteModal && deletingCohort && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-red-600">Delete Cohort</h2>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCohort(null);
                      setDeleteConfirmation('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <p className="font-medium text-red-800">Warning: This action cannot be undone!</p>
                      <p className="text-sm text-red-600">
                        All data associated with this cohort will be permanently deleted.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="font-medium text-gray-800 mb-2">
                      #{deletingCohort.cohortNumber} {deletingCohort.name}
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• {deletingCohort._count?.cohortMembers || 0} participants will lose access</p>
                      <p>• {deletingCohort._count?.modules || 0} modules will be deleted</p>
                      <p>• {deletingCohort._count?.questions || 0} questions will be deleted</p>
                      <p>• All answers and progress will be permanently lost</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    To confirm deletion, please type the cohort name: <strong>{deletingCohort.name}</strong>
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    placeholder={`Type "${deletingCohort.name}" to confirm`}
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCohort(null);
                      setDeleteConfirmation('');
                    }}
                    className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCohort}
                    disabled={deleteLoading || deleteConfirmation !== deletingCohort.name}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      'Delete Cohort'
                    )}
                  </button>
                </div>
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
