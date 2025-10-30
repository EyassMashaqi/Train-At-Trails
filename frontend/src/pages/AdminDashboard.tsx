import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminService, gameService, api } from '../services/api';
import toast from 'react-hot-toast';
import MiniAnswersView from '../components/MiniAnswersView';
import MasteryPointsModal from '../components/GradingModal';
import RichTextEditor from '../components/RichTextEditor';
import HtmlEditorModal from '../components/HtmlEditorModal';
import Pagination from '../components/Pagination';
import { defaultEmailTemplates } from '../utils/defaultEmailTemplates';

// Import the dashboard icon
import DashboardIcon from '../assets/dashboard-icon.png';

interface User {
  id: number;
  fullName: string;
  email: string;
  trainName: string;
  currentStep: number;
  createdAt: string;
  totalPoints?: number; // Add points field
  // Cohort-specific fields
  cohortStatus?: 'ENROLLED' | 'GRADUATED' | 'SUSPENDED' | 'REMOVED';
  status?: 'ENROLLED' | 'GRADUATED' | 'SUSPENDED' | 'REMOVED'; // Add status property
  joinedAt?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  graduatedAt?: string;
  graduatedBy?: string;
  isCurrentCohort?: boolean;
  isActive?: boolean;
}

interface PendingAnswer {
  id: number;
  content: string;
  notes?: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hasAttachment: boolean;
  attachmentInfo?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  user: {
    id: number;
    fullName: string;
    trainName: string;
  };
  question?: {
    id: number;
    questionNumber: number;
    title: string;
  };
  topic?: {
    id: number;
    topicNumber: number;
    title: string;
    module: {
      title: string;
    };
  };
}

interface ResubmissionRequest {
  id: number;
  content: string;
  notes?: string;
  submittedAt: string;
  status: 'APPROVED' | 'REJECTED';
  grade: string;
  feedback?: string;
  resubmissionRequested: boolean;
  resubmissionRequestedAt: string;
  resubmissionApproved: boolean | null;
  hasAttachment: boolean;
  attachmentInfo?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  user: {
    id: number;
    fullName: string;
    trainName: string;
  };
  question?: {
    id: number;
    questionNumber: number;
    title: string;
  };
  topic?: {
    id: number;
    topicNumber: number;
    title: string;
    module: {
      id: number;
      moduleNumber: number;
      title: string;
    };
  };
}

interface GameStats {
  totalUsers: number;
  totalAnswers: number;
  pendingAnswers: number;
  averageProgress: number;
}

// Remove unused Cohort interface - using any[] for cohorts state instead
// interface Cohort {
//   id: string;
//   name: string;
//   description?: string;
//   startDate: string;
//   endDate?: string;
//   defaultTheme: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

interface Module {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  theme: string;
  isActive: boolean;
  isReleased: boolean;
  releaseDate?: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  topicNumber: number;
  title: string;
  content: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  isActive: boolean;
  isReleased: boolean;
  releaseDate?: string;
  answers?: TopicAnswer[];
  contents?: ContentSection[];
}

interface TopicAnswer {
  id: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  feedback?: string;
  pointsAwarded?: number;
  user: {
    id: string;
    fullName: string;
    trainName: string;
    email: string;
  };
}

interface MiniQuestion {
  id?: string;
  title: string;
  description: string;
  resourceUrl?: string; // NEW: URL for learning resource
  orderIndex: number;
  releaseDate?: string;
}

interface ContentSection {
  id?: string;
  title: string;
  content: string;
  description: string;
  resourceUrl?: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
  releaseDate?: string;
}

interface TopicFormData {
  topicNumber: number;
  title: string;
  content: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  contents: ContentSection[];
}

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface ModuleFormData {
  moduleNumber: number;
  title: string;
  description: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedCohortId = searchParams.get('cohort');
  
  // Helper function to download attachment
  const downloadAttachment = async (answerId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/admin/answer/${answerId}/attachment`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        await response.text();
        let errorMessage = 'Failed to download attachment';
        
        if (response.status === 403) {
          errorMessage = 'Access denied. Admin privileges required to download attachments.';
        } else if (response.status === 404) {
          errorMessage = 'Attachment not found or has been deleted.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please login again.';
        }
        
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${fileName} successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download attachment');
    }
  };
  
  const [users, setUsers] = useState<User[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [resubmissionRequests, setResubmissionRequests] = useState<ResubmissionRequest[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSteps, setTotalSteps] = useState(12); // Dynamic total steps from database
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'answers' | 'modules' | 'mini-questions' | 'cohort-config'>('overview');
  const [cohortConfigTab, setCohortConfigTab] = useState<'theme' | 'email-templates' | 'cohort-settings'>('theme');
  
  // Email configuration state (from EmailSetupCohort)
  const [emailConfigs, setEmailConfigs] = useState<any[]>([]);
  const [expandedEmailConfig, setExpandedEmailConfig] = useState<string | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [previewEmailConfig, setPreviewEmailConfig] = useState<any | null>(null);
  const [showCopyGlobalConfirmation, setShowCopyGlobalConfirmation] = useState(false);
  const [copyingGlobalTemplates, setCopyingGlobalTemplates] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    name: '',
    description: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    backgroundColor: '#F8FAFC',
    textColor: '#1F2937',
    buttonColor: '#3B82F6',
    isActive: true
  });
  
  // Cohort management state (from EmailSetupCohort)
  const [editingCohort, setEditingCohort] = useState(false);
  const [cohortFormData, setCohortFormData] = useState({
    cohortNumber: '',
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  
  // User status filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store unfiltered users
  
  // Mastery Points modal state
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingAnswer, setGradingAnswer] = useState<PendingAnswer | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);

  // Module and topic management state
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  
  // Module management
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormData>({
    moduleNumber: 1,
    title: '',
    description: ''
  });

  // Topic management
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  const [showEditTopicModal, setShowEditTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedModuleForTopic, setSelectedModuleForTopic] = useState<string>('');
  const [topicForm, setTopicForm] = useState<TopicFormData>({
    topicNumber: 1,
    title: '',
    content: '',
    description: '',
    deadline: '',
    points: 100,
    bonusPoints: 50,
    contents: []
  });

  // Validation states
  const [createFormValidation, setCreateFormValidation] = useState<{ isValid: boolean; errorMessage?: string }>({ isValid: true });
  const [editFormValidation, setEditFormValidation] = useState<{ isValid: boolean; errorMessage?: string }>({ isValid: true });

  // Cohort state
  const [allCohorts, setAllCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [paginationInfo, setPaginationInfo] = useState<any>(null);

  // Memoized values for performance optimization
  const availableThemes = useMemo(() => [
    { id: 'trains', name: 'Trains', icon: '🚂', description: 'Classic train theme with stations and tracks' },
    { id: 'planes', name: 'Planes', icon: '✈️', description: 'Aviation theme with airports and flight paths' },
    { id: 'sailboat', name: 'Sailboat', icon: '⛵', description: 'Maritime theme with harbors and sailing routes' },
    { id: 'cars', name: 'Cars', icon: '🚗', description: 'Automotive theme with roads and destinations' },
    { id: 'f1', name: 'Formula 1', icon: '🏎️', description: 'High-speed racing theme with circuits and pit stops' }
  ], []);

  const currentCohort = useMemo(() => 
    allCohorts.find(c => c.id === selectedCohortId), 
    [allCohorts, selectedCohortId]
  );

  // Remove unused filteredUsers memoization since it's handled differently
  // const filteredUsers = useMemo(() => {
  //   if (statusFilter === 'all') return users;
  //   return users.filter(user => user.status === statusFilter);
  // }, [users, statusFilter]);

  const loadAdminData = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      
      // First load cohorts to get cohort details
      const cohortsResponse = await adminService.getAllCohorts();
      setAllCohorts(cohortsResponse.data.cohorts || []);
      
      // Find selected cohort details
      let currentCohort = null;
      if (selectedCohortId) {
        currentCohort = cohortsResponse.data.cohorts?.find((c: any) => c.id === selectedCohortId);
        setSelectedCohort(currentCohort);
        
        // Set cohort form data when cohort is loaded
        if (currentCohort) {
          setCohortFormData({
            cohortNumber: currentCohort.cohortNumber.toString(),
            name: currentCohort.name,
            description: currentCohort.description || '',
            startDate: currentCohort.startDate ? currentCohort.startDate.split('T')[0] : '',
            endDate: currentCohort.endDate ? currentCohort.endDate.split('T')[0] : ''
          });
        }
      }

      // Load data based on whether a cohort is selected
      let usersResponse, pendingResponse, resubmissionResponse, statsResponse;
      if (selectedCohortId) {
        // Load cohort-specific data
        [usersResponse, pendingResponse, resubmissionResponse, statsResponse] = await Promise.all([
          adminService.getCohortUsers(selectedCohortId, statusFilter === 'all' ? undefined : statusFilter, page, usersPerPage).catch(err => {
            throw err;
          }),
          adminService.getPendingAnswers(selectedCohortId).catch(err => {
            throw err;
          }),
          adminService.getResubmissionRequests(selectedCohortId).catch(err => {
            throw err;
          }),
          adminService.getGameStats(selectedCohortId).catch(err => {
            throw err;
          }),
        ]);
      } else {
        // Load all data
        [usersResponse, pendingResponse, resubmissionResponse, statsResponse] = await Promise.all([
          adminService.getAllUsers(page, usersPerPage),
          adminService.getPendingAnswers(),
          adminService.getResubmissionRequests(),
          adminService.getGameStats(),
        ]);
      }

      const [modulesResponse, progressResponse] = await Promise.all([
        adminService.getAllModules(selectedCohortId || undefined).catch(err => {
          throw err;
        }),
        gameService.getProgress().catch(err => {
          throw err;
        }) // Get totalSteps
      ]);



      const allUsersData = usersResponse.data.members || usersResponse.data.users || usersResponse.data.cohortUsers || [];
      setAllUsers(allUsersData);
      setUsers(allUsersData); // Initially show all users
      
      // Set pagination info
      setPaginationInfo(usersResponse.data.pagination || null);
      
      // Extract available statuses for filtering (only for cohort-specific data)
      if (selectedCohortId && usersResponse.data.filters?.availableStatuses) {
        setAvailableStatuses(usersResponse.data.filters.availableStatuses);
      } else {
        setAvailableStatuses([]);
      }
      
      setPendingAnswers(pendingResponse.data.pendingAnswers);
      setResubmissionRequests(resubmissionResponse.data.resubmissionRequests);
      setStats(statsResponse.data);
      setModules(modulesResponse.data.modules || []);
      
      // Set dynamic total steps from progress response
      if (progressResponse.data.totalSteps) {
        setTotalSteps(progressResponse.data.totalSteps);
      }

      // Load email configurations if a cohort is selected
      if (selectedCohortId) {
        try {
          const emailResponse = await api.get(`/admin/email-setup/cohorts/${selectedCohortId}/email-configs`);
          setEmailConfigs(emailResponse.data.configs || []);
        } catch (emailError) {
          console.warn('Failed to load email configurations:', emailError);
          setEmailConfigs([]);
        }
      } else {
        setEmailConfigs([]);
      }

    } catch (error: unknown) {
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
  }, [user?.email, user?.isAdmin, selectedCohortId, currentPage, statusFilter, usersPerPage]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Validation function to check if assignment deadline is before any mini question release date
  const validateAssignmentDeadline = (deadline: string, contents: any[]): { isValid: boolean; errorMessage?: string; conflictingIndices?: number[] } => {
    if (!deadline || !contents || contents.length === 0) {
      return { isValid: true };
    }

    const assignmentDeadline = new Date(deadline);
    const conflictingIndices: number[] = [];
    let firstConflictMessage = '';
    
    // Check all self learning activities for release dates that are after the assignment deadline
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      // Handle both nested structure (from API) and flat structure (from forms)
      const miniQuestions = content.miniQuestions || [content];
      
      for (const miniQuestion of miniQuestions) {
        if (miniQuestion.releaseDate) {
          const releaseDate = new Date(miniQuestion.releaseDate);
          if (releaseDate > assignmentDeadline) {
            conflictingIndices.push(i);
            if (!firstConflictMessage) {
              const formattedReleaseDate = releaseDate.toLocaleDateString();
              const formattedDeadline = assignmentDeadline.toLocaleDateString();
              firstConflictMessage = `Assignment deadline (${formattedDeadline}) cannot be before mini question release date (${formattedReleaseDate}). Please adjust the deadline or the self-learning release dates.`;
            }
          }
        }
      }
    }
    
    if (conflictingIndices.length > 0) {
      return {
        isValid: false,
        errorMessage: firstConflictMessage,
        conflictingIndices
      };
    }
    
    return { isValid: true };
  };

  // Function to check if a specific mini question has a date conflict
  const validateMiniQuestionDate = (deadline: string, releaseDate: string): boolean => {
    if (!deadline || !releaseDate) return true;
    const assignmentDeadline = new Date(deadline);
    const miniReleaseDate = new Date(releaseDate);
    return miniReleaseDate <= assignmentDeadline;
  };

  // Real-time validation for create form
  const validateCreateForm = useCallback(() => {
    const validation = validateAssignmentDeadline(topicForm.deadline, topicForm.contents);
    setCreateFormValidation(validation);
  }, [topicForm.deadline, topicForm.contents]);

  // Real-time validation for edit form
  const validateEditForm = useCallback(() => {
    if (selectedTopic) {
      const validation = validateAssignmentDeadline(selectedTopic.deadline, selectedTopic.contents || []);
      setEditFormValidation(validation);
    }
  }, [selectedTopic?.deadline, selectedTopic?.contents]);

  // Trigger validation when forms change
  useEffect(() => {
    validateCreateForm();
  }, [validateCreateForm]);

  useEffect(() => {
    validateEditForm();
  }, [validateEditForm]);

  const handleAssignMasteryPoints = (answer: PendingAnswer) => {
    setGradingAnswer(answer);
    setShowGradingModal(true);
  };

  const handleResubmissionRequest = async (answerId: number, approve: boolean) => {
    try {
      await adminService.handleResubmissionRequest(answerId, approve);
      toast.success(`Resubmission request ${approve ? 'approved' : 'rejected'} successfully!`);
      await loadAdminData(); // Refresh data
    } catch (error: unknown) {
      let errorMessage = 'Failed to handle resubmission request';
      if (
        error && 
        typeof error === 'object' && 
        'response' in error && 
        error.response && 
        typeof error.response === 'object' && 
        'data' in error.response && 
        error.response.data && 
        typeof error.response.data === 'object' && 
        'error' in error.response.data &&
        typeof error.response.data.error === 'string'
      ) {
        errorMessage = error.response.data.error;
      }
      toast.error(errorMessage);
    }
  };

  const submitGrade = async (grade: string, feedback: string) => {
    if (!gradingAnswer) return;

    setGradingLoading(true);
    try {
      await adminService.gradeAnswer(gradingAnswer.id, grade, feedback);
      toast.success(`Mastery points assigned as ${grade} successfully!`);
      setShowGradingModal(false);
      setGradingAnswer(null);
      await loadAdminData(); // Refresh data
    } catch (error: unknown) {
      let errorMessage = 'Failed to assign mastery points';
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
    } finally {
      setGradingLoading(false);
    }
  };

  const handleStatusFilter = useCallback(async (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
    
    if (!selectedCohortId) {
      // For all users (non-cohort view), reload with new filter
      loadAdminData(1);
      return;
    }

    try {
      // Fetch users with the selected status filter
      const response = await adminService.getCohortUsers(selectedCohortId, status === 'all' ? undefined : status, 1, usersPerPage);
      const filteredUsers = response.data.members || [];
      setUsers(filteredUsers);
      setPaginationInfo(response.data.pagination || null);
    } catch (error) {
      toast.error('Failed to filter users');
      // Fallback to client-side filtering
      if (status === 'all') {
        setUsers(allUsers);
      } else {
        const filtered = allUsers.filter(user => user.cohortStatus === status);
        setUsers(filtered);
      }
    }
  }, [selectedCohortId, allUsers, usersPerPage, loadAdminData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Reset pagination when switching tabs or cohorts
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setPaginationInfo(null);
  }, []);

  // Reset pagination when changing cohorts or tabs
  useEffect(() => {
    resetPagination();
  }, [selectedCohortId, activeTab, resetPagination]);

  const renderOverview = () => {
    if (!stats) return null;

    // Use cohort-specific counts if a cohort is selected
    const displayStats = selectedCohortId ? {
      totalUsers: users.length,
      totalAnswers: stats.totalAnswers, // TODO: filter by cohort when backend supports it
      pendingAnswers: pendingAnswers.length,
      resubmissionRequests: resubmissionRequests.length,
      averageProgress: stats.averageProgress
    } : {
      ...stats,
      pendingAnswers: pendingAnswers.length,
      resubmissionRequests: resubmissionRequests.length
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-primary-600 text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-primary-600">
                  {selectedCohortId ? 'Cohort Participants' : 'Total Users'}
                </p>
                <p className="text-2xl font-bold text-primary-900">{displayStats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-accent-600 text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-accent-600">Total Answers</p>
                <p className="text-2xl font-bold text-accent-900">{displayStats.totalAnswers}</p>
              </div>
            </div>
          </div>

          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-secondary-600 text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-secondary-900">{displayStats.pendingAnswers}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-orange-600 text-2xl">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-600">Resubmission Requests</p>
                <p className="text-2xl font-bold text-orange-900">{displayStats.resubmissionRequests}</p>
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
                  {displayStats.averageProgress ? displayStats.averageProgress.toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {pendingAnswers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">In Review</h3>
            <div className="space-y-4">
              {pendingAnswers.slice(0, 3).map((answer) => (
                <div key={answer.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {answer.user.fullName} ({answer.user.trainName})
                      </h4>
                      <p className="text-sm text-gray-600">
                        {answer.question ? (
                          `Question ${answer.question.questionNumber}: ${answer.question.title}`
                        ) : answer.topic ? (
                          `${answer.topic.module.title} - Assignment ${answer.topic.topicNumber}: ${answer.topic.title}`
                        ) : (
                          'Unknown assignment'
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAssignMasteryPoints(answer)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <span>🎯</span>
                        <span>Assign Points</span>
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm">
                      <strong>Link:</strong>
                      <a 
                        href={answer.content} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ml-1 text-blue-600 hover:text-blue-800 underline"
                      >
                        {answer.content}
                      </a>
                    </div>
                    {answer.notes && (
                      <div className="text-sm mt-1">
                        <strong>Notes:</strong>
                        <span className="ml-1 text-gray-700">{answer.notes}</span>
                      </div>
                    )}
                  </div>
                  
                  {answer.hasAttachment && answer.attachmentInfo && (
                    <div className="flex items-center space-x-2 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-sm">📎</span>
                      <span className="text-sm text-blue-700">{answer.attachmentInfo.fileName}</span>
                      <button
                        onClick={() => downloadAttachment(answer.id.toString(), answer.attachmentInfo!.fileName)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                      >
                        Download
                      </button>
                    </div>
                  )}
                  
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
                  className="text-primary-600 hover:text-primary-800 font-medium"
                >
                  View all {pendingAnswers.length} pending answers →
                </button>
              </div>
            )}
          </div>
        )}

        {resubmissionRequests.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-orange-800 mb-4">🔄 Resubmission Requests</h3>
            <div className="space-y-4">
              {resubmissionRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="bg-white border border-orange-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {request.user.fullName} ({request.user.trainName})
                      </h4>
                      <p className="text-sm text-gray-600">
                        {request.question ? (
                          `Question ${request.question.questionNumber}: ${request.question.title}`
                        ) : (
                          'Unknown assignment'
                        )}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Current Mastery Points: {request.grade} | Requested: {new Date(request.resubmissionRequestedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResubmissionRequest(request.id, true)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                      >
                        <span>✅</span>
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleResubmissionRequest(request.id, false)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                      >
                        <span>❌</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm">
                      <strong>Original Answer:</strong>
                      <a 
                        href={request.content} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="ml-1 text-blue-600 hover:text-blue-800 underline"
                      >
                        {request.content}
                      </a>
                    </div>
                    {request.notes && (
                      <div className="text-sm mt-1">
                        <strong>Notes:</strong>
                        <span className="ml-1 text-gray-700">{request.notes}</span>
                      </div>
                    )}
                    {request.feedback && (
                      <div className="text-sm mt-1">
                        <strong>Previous Feedback:</strong>
                        <span className="ml-1 text-gray-700 italic">"{request.feedback}"</span>
                      </div>
                    )}
                  </div>
                  
                  {request.hasAttachment && request.attachmentInfo && (
                    <div className="flex items-center space-x-2 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-sm">📎</span>
                      <span className="text-sm text-blue-700">{request.attachmentInfo.fileName}</span>
                      <button
                        onClick={() => downloadAttachment(request.id.toString(), request.attachmentInfo!.fileName)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {resubmissionRequests.length > 3 && (
              <div className="mt-4 text-center">
                <span className="text-orange-600 font-medium">
                  {resubmissionRequests.length - 3} more resubmission requests pending...
                </span>
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
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">
              {selectedCohortId ? 'Cohort Participants' : 'All Users'}
            </h3>
            {/* Status Filter - only show for cohort view */}
            {selectedCohortId && availableStatuses.length > 0 && (
              <div className="flex items-center space-x-2">
                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  Filter by Status:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Statuses</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lighthouse Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points Earned
                </th>
                {/* Status column - only show for cohort view */}
                {selectedCohortId && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={selectedCohortId ? 6 : 5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-4xl mb-2">👥</div>
                      <p>No {selectedCohortId ? 'participants' : 'users'} found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                        <div className="text-sm text-gray-900">Step {user.currentStep}/{totalSteps}</div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${(user.currentStep / totalSteps) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {user.totalPoints !== undefined ? user.totalPoints : '---'} pts
                      </div>
                    </td>
                    {/* Status column - only show for cohort view */}
                    {selectedCohortId && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.cohortStatus === 'ENROLLED' 
                            ? 'bg-green-100 text-green-800'
                            : user.cohortStatus === 'GRADUATED'
                            ? 'bg-blue-100 text-blue-800'
                            : user.cohortStatus === 'SUSPENDED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.cohortStatus === 'REMOVED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.cohortStatus === 'ENROLLED' && '✅ Active'}
                          {user.cohortStatus === 'GRADUATED' && '🎓 Graduated'}
                          {user.cohortStatus === 'SUSPENDED' && '⏸️ Suspended'}
                          {user.cohortStatus === 'REMOVED' && '❌ Removed'}
                          {!user.cohortStatus && '❓ Unknown'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {paginationInfo && paginationInfo.totalPages > 1 && (
          <Pagination
            currentPage={paginationInfo.currentPage}
            totalPages={paginationInfo.totalPages}
            totalItems={selectedCohortId ? paginationInfo.totalMembers : paginationInfo.totalUsers}
            startIndex={paginationInfo.startIndex}
            endIndex={paginationInfo.endIndex}
            hasNextPage={paginationInfo.hasNextPage}
            hasPrevPage={paginationInfo.hasPrevPage}
            onPageChange={handlePageChange}
            itemName={selectedCohortId ? 'participants' : 'users'}
          />
        )}
      </div>
    );
  };

  const renderPendingAnswers = () => {
    if (pendingAnswers.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <span className="text-4xl">🎉</span>
          <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No answers to review.</p>
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
                  {answer.question ? (
                    `Question ${answer.question.questionNumber}: ${answer.question.title}`
                  ) : answer.topic ? (
                    `${answer.topic.module.title} - Assignment ${answer.topic.topicNumber}: ${answer.topic.title}`
                  ) : (
                    'Unknown assignment'
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAssignMasteryPoints(answer)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>🎯</span>
                  <span>Mastery Points Assignment</span>
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Submitted Work:</h5>
              <div className="mb-3">
                <strong className="text-gray-700">Link:</strong>
                <a 
                  href={answer.content} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  {answer.content}
                </a>
              </div>
              {answer.notes && (
                <div>
                  <strong className="text-gray-700">Notes:</strong>
                  <p className="mt-1 text-gray-700">{answer.notes}</p>
                </div>
              )}
            </div>

            {answer.hasAttachment && answer.attachmentInfo && (
              <div className="bg-blue-50 rounded-md p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📎</span>
                    <div>
                      <h5 className="font-medium text-blue-900">Attachment:</h5>
                      <p className="text-sm text-blue-700">{answer.attachmentInfo.fileName}</p>
                      <p className="text-xs text-blue-600">
                        {formatFileSize(answer.attachmentInfo.fileSize)} • {answer.attachmentInfo.mimeType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadAttachment(answer.id.toString(), answer.attachmentInfo!.fileName)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-400">
              Submitted: {new Date(answer.submittedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderModules = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Module Management</h3>
          <button
            onClick={() => {
              // Calculate the next available module number
              const usedNumbers = modules.map(m => m.moduleNumber).sort((a, b) => a - b);
              let nextNumber = 1;
              for (const num of usedNumbers) {
                if (num === nextNumber) {
                  nextNumber++;
                } else {
                  break;
                }
              }
              
              setModuleForm({
                moduleNumber: nextNumber,
                title: '',
                description: ''
              });
              setShowCreateModuleModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center"
          >
            <span className="mr-2">➕</span>
            Create Module
          </button>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">�</span>
              <p className="mt-2 text-gray-500">No modules found</p>
            </div>
          ) : (
            modules.map((module) => (
              <div key={module.id} className="border rounded-lg">
                {/* Module Header - Foldable */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {expandedModule === module.id ? '📖' : '📚'}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{module.title}</h4>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                              module.isReleased 
                                ? 'bg-accent-100 text-accent-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {module.isReleased ? '✅ Released' : '⏳ Draft'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{module.description}</p>
                          <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                            <span>Module {module.moduleNumber}</span>
                            <span>Assignments: {module.topics?.length || 0}</span>
                            <span>Total Points: {module.topics?.reduce((sum, topic) => sum + topic.points, 0) || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModule(module);
                          setShowEditModuleModal(true);
                        }}
                        className="bg-secondary-500 text-white px-3 py-1 rounded text-sm hover:bg-secondary-600 transition-colors"
                      >
                        ✏️ Manage
                      </button>
                      <span className="text-sm text-gray-400">
                        {expandedModule === module.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Module Assignments - Expandable */}
                {expandedModule === module.id && (
                  <div className="border-t-2 border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100">
                    <div className="p-6 border-l-4 border-primary-400">
                      <h5 className="font-medium text-gray-900 mb-4 flex items-center bg-white/70 rounded-lg p-3 shadow-sm">
                        <span className="mr-2 text-lg">📋</span>
                        <span className="text-primary-800 font-semibold">Assignments ({module.topics?.length || 0})</span>
                      </h5>
                      
                      {!module.topics || module.topics.length === 0 ? (
                        <div className="text-center py-6 bg-white/60 rounded-lg border-2 border-dashed border-blue-300">
                          <div className="bg-white rounded-lg p-4 shadow-sm max-w-sm mx-auto">
                            <p className="text-gray-600 text-sm mb-4">No assignments created yet</p>
                            <button
                              onClick={() => {
                                // Calculate the next available assignment number for this module
                                const usedNumbers = module.topics?.map(t => t.topicNumber).sort((a, b) => a - b) || [];
                                let nextNumber = 1;
                                for (const num of usedNumbers) {
                                  if (num === nextNumber) {
                                    nextNumber++;
                                  } else {
                                    break;
                                  }
                                }
                                
                                setSelectedModuleForTopic(module.id);
                                setTopicForm({
                                  topicNumber: nextNumber,
                                  title: '',
                                  content: '',
                                  description: '',
                                  deadline: '',
                                  points: 100,
                                  bonusPoints: 50,
                                  contents: []
                                });
                                setShowCreateTopicModal(true);
                              }}
                              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors shadow-md"
                            >
                              ➕ Create First Assignment
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {module.topics.map((topic) => (
                            <div key={topic.id} className="bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              {/* Assignment Header - Foldable */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-blue-50 transition-colors rounded-t-lg"
                                onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                        Assignment {topic.topicNumber}
                                      </span>
                                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                                        topic.isReleased 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {topic.isReleased ? '✅ Released' : '⏳ Draft'}
                                      </span>
                                    </div>
                                    <h6 className="font-medium text-gray-900">{topic.title}</h6>
                                    <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                                    <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                                      <span>Points: {topic.points}</span>
                                      <span>Bonus: {topic.bonusPoints}</span>
                                      <span>Deadline: {new Date(topic.deadline).toLocaleString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTopic({
                                          ...topic,
                                          contents: topic.contents || []
                                        });
                                        setShowEditTopicModal(true);
                                      }}
                                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                                    >
                                      ✏️ Manage
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedTopic(expandedTopic === topic.id ? null : topic.id);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                      {expandedTopic === topic.id ? 'Hide' : 'Show'} Answers ({topic.answers?.length || 0})
                                    </button>
                                    <span className="text-sm text-gray-400">
                                      {expandedTopic === topic.id ? '▲' : '▼'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Assignment Answers - Expandable */}
                              {expandedTopic === topic.id && (
                                <div className="border-t-2 border-gray-200 bg-gray-50 p-4 rounded-b-lg">
                                  <h6 className="font-medium text-gray-900 mb-2 flex items-center">
                                    <span className="mr-2">💬</span>
                                    Answers ({topic.answers?.length || 0})
                                  </h6>
                                  {!topic.answers || topic.answers.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No answers submitted yet</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {topic.answers.map((answer) => (
                                        <div key={answer.id} className="bg-white rounded border p-3">
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">
                                              {answer.user.fullName} ({answer.user.trainName})
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                              answer.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                              answer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                              'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {answer.status}
                                            </span>
                                          </div>
                                          {answer.content && (
                                            answer.content.startsWith('http://') || answer.content.startsWith('https://') ? (
                                              <a 
                                                href={answer.content} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                              >
                                                {answer.content}
                                              </a>
                                            ) : (
                                              <p className="text-sm text-gray-700">{answer.content}</p>
                                            )
                                          )}
                                          <p className="text-xs text-gray-500 mt-1">
                                            Submitted: {new Date(answer.submittedAt).toLocaleString()}
                                          </p>
                                          {answer.feedback && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                              <span className="font-medium text-blue-800">Admin Feedback:</span>
                                              <p className="text-blue-700">{answer.feedback}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Add Assignment Button */}
                          <div className="text-center pt-4">
                            <div className="bg-white/60 rounded-lg border-2 border-dashed border-blue-300 p-4">
                              <button
                                onClick={() => {
                                  // Calculate the next available assignment number for this module
                                  const usedNumbers = module.topics?.map(t => t.topicNumber).sort((a, b) => a - b) || [];
                                  let nextNumber = 1;
                                  for (const num of usedNumbers) {
                                    if (num === nextNumber) {
                                      nextNumber++;
                                    } else {
                                      break;
                                    }
                                  }
                                  
                                  setSelectedModuleForTopic(module.id);
                                  setTopicForm({
                                    topicNumber: nextNumber,
                                    title: '',
                                    content: '',
                                    description: '',
                                    deadline: '',
                                    points: 100,
                                    bonusPoints: 50,
                                    contents: []
                                  });
                                  setShowCreateTopicModal(true);
                                }}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors shadow-md"
                              >
                                ➕ Add Another Assignment
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Theme management handlers
  const handleDefaultThemeFromModule = useCallback(async (moduleId: string) => {
    try {
      if (!moduleId) {
        // Reset to fixed theme if no module selected
        if (selectedCohortId) {
          await adminService.updateCohort(selectedCohortId, {
            defaultTheme: 'trains'
          });
          toast.success('Cohort default theme reset to Trains');
        }
      } else {
        const selectedModule = modules.find(m => m.id === moduleId);
        if (!selectedModule) {
          toast.error('Module not found');
          return;
        }

        if (selectedCohortId) {
          await adminService.updateCohort(selectedCohortId, {
            defaultTheme: selectedModule.theme || 'trains'
          });
          toast.success(`Cohort default theme set to match Module ${selectedModule.moduleNumber}`);
        }
      }
      
      // Update cohorts state to reflect the change
      if (selectedCohortId) {
        setAllCohorts(prevCohorts => 
          prevCohorts.map(cohort => 
            cohort.id === selectedCohortId 
              ? { ...cohort, defaultTheme: moduleId ? modules.find(m => m.id === moduleId)?.theme || 'trains' : 'trains' }
              : cohort
          )
        );
      }
    } catch (error) {
      toast.error('Failed to update cohort default theme');
    }
  }, [selectedCohortId, modules]);

  const handleModuleThemeUpdate = useCallback(async (moduleId: string, newTheme: string) => {
    try {
      const oldModule = modules.find(m => m.id === moduleId);
      const wasLinkedToDefault = oldModule && currentCohort?.defaultTheme === oldModule.theme;
      
      await adminService.updateModuleTheme(moduleId, newTheme);
      
      // If this module's theme was being used as the cohort default, update the cohort too
      if (wasLinkedToDefault && selectedCohortId) {
        await adminService.updateCohort(selectedCohortId, {
          defaultTheme: newTheme
        });
        
        // Update cohorts state
        if (selectedCohortId) {
          setAllCohorts(prevCohorts => 
            prevCohorts.map(cohort => 
              cohort.id === selectedCohortId 
                ? { ...cohort, defaultTheme: newTheme }
                : cohort
            )
          );
        }
        
        toast.success('Module theme and cohort default theme updated successfully');
      } else {
        toast.success('Module theme updated successfully');
      }
      
      // Update the modules state directly
      setModules(prevModules => 
        prevModules.map(module => 
          module.id === moduleId 
            ? { ...module, theme: newTheme }
            : module
        )
      );
    } catch (error) {
      toast.error('Failed to update module theme');
    }
  }, [modules, currentCohort, selectedCohortId]);

  // Helper functions for email configurations (from EmailSetupCohort)
  const getConfigIcon = (emailType: string) => {
    const icons: Record<string, string> = {
      WELCOME: '👋',
      PASSWORD_RESET: '🔑',
      ANSWER_SUBMISSION: '📝',
      ANSWER_FEEDBACK: '📊',
      NEW_QUESTION: '🆕',
      MINI_QUESTION_RELEASE: '📚',
      MINI_ANSWER_RESUBMISSION: '🔄',
      RESUBMISSION_APPROVAL: '✅',
      USER_ASSIGNED_TO_COHORT: '🚂',
      USER_GRADUATED: '🎓',
      USER_REMOVED_FROM_COHORT: '📋',
      USER_SUSPENDED: '⚠️'
    };
    return icons[emailType] || '📧';
  };

  const getConfigDisplayName = (emailType: string) => {
    const names: Record<string, string> = {
      WELCOME: 'Welcome Email',
      PASSWORD_RESET: 'Password Reset',
      ANSWER_SUBMISSION: 'Answer Submission',
      ANSWER_FEEDBACK: 'Answer Feedback',
      NEW_QUESTION: 'New Assignment Release',
      MINI_QUESTION_RELEASE: 'Self-Learning Release',
      MINI_ANSWER_RESUBMISSION: 'Resubmission Request',
      RESUBMISSION_APPROVAL: 'Resubmission Approval',
      USER_ASSIGNED_TO_COHORT: 'User Assigned to Cohort',
      USER_GRADUATED: 'User Graduated',
      USER_REMOVED_FROM_COHORT: 'User Removed from Cohort',
      USER_SUSPENDED: 'User Suspended'
    };
    return names[emailType] || emailType;
  };

  // Email configuration functions (from EmailSetupCohort)
  const handleEditEmailConfig = (config: any) => {
    setEditingEmailId(config.id);
    setEmailFormData({
      name: config.name,
      description: config.description || '',
      subject: config.subject,
      htmlContent: config.htmlContent,
      textContent: config.textContent || '',
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      buttonColor: config.buttonColor,
      isActive: config.isActive
    });
  };

  const handleSaveEmailConfig = async (config: any) => {
    if (!emailFormData.name.trim() || !emailFormData.subject.trim() || !emailFormData.htmlContent.trim()) {
      toast.error('Name, subject, and HTML content are required');
      return;
    }

    if (!selectedCohortId) return;

    try {
      // Include emailType in the request body as required by backend validation
      const requestData = {
        ...emailFormData,
        emailType: config.emailType
      };
      
      await api.put(`/admin/email-setup/cohorts/${selectedCohortId}/email-configs/${config.emailType}`, requestData);
      toast.success('Email configuration updated successfully');
      setEditingEmailId(null);
      loadAdminData(); // Reload data
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update email configuration';
      toast.error(errorMessage);
    }
  };

  const handleCancelEmailEdit = () => {
    setEditingEmailId(null);
    setEmailFormData({
      name: '',
      description: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#F8FAFC',
      textColor: '#1F2937',
      buttonColor: '#3B82F6',
      isActive: true
    });
  };

  // Load default template function (from EmailSetupCohort)
  const loadDefaultTemplate = (templateType: keyof typeof defaultEmailTemplates) => {
    const template = defaultEmailTemplates[templateType];
    if (template) {
      setEmailFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent
      }));
      toast.success(`Loaded ${template.name} template`);
    }
  };

  // Copy global templates function
  const handleCopyGlobalTemplates = async () => {
    if (!selectedCohortId) return;
    
    try {
      setCopyingGlobalTemplates(true);
      
      // Copy global templates to this cohort with overwrite flag
      const response = await api.post(`/admin/email-setup/cohorts/${selectedCohortId}/copy-global-templates`, {
        overwrite: true
      });
      
      toast.success(`Global templates copied successfully! ${response.data.count} templates added.`);
      setShowCopyGlobalConfirmation(false);
      
      // Reload the data
      loadAdminData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to copy global templates';
      toast.error(errorMessage);
    } finally {
      setCopyingGlobalTemplates(false);
    }
  };

  // Cohort management functions (from EmailSetupCohort)
  const handleUpdateCohort = async () => {
    if (!selectedCohort || !selectedCohortId) return;

    try {
      const payload: any = {
        name: cohortFormData.name.trim(),
        description: cohortFormData.description.trim(),
        startDate: cohortFormData.startDate,
        endDate: cohortFormData.endDate || null
      };

      if (cohortFormData.cohortNumber.trim()) {
        payload.cohortNumber = parseInt(cohortFormData.cohortNumber.trim());
      }

      await api.patch(`/admin/cohorts/${selectedCohortId}`, payload);
      toast.success('Cohort updated successfully');
      setEditingCohort(false);
      loadAdminData(); // Reload data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort';
      toast.error(errorMessage);
    }
  };

  const handleToggleCohortStatus = async (cohortId: string, newStatus: boolean) => {
    if (!cohortId) return;

    try {
      await api.patch(`/admin/cohorts/${cohortId}/toggle-status`);
      toast.success(`Cohort ${newStatus ? 'activated' : 'deactivated'} successfully`);
      loadAdminData(); // Reload data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort status';
      toast.error(errorMessage);
    }
  };

  const renderCohortConfig = () => {
    if (!selectedCohortId) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cohort Selected</h3>
            <p className="text-gray-600">Please select a cohort from the dropdown above to configure themes.</p>
          </div>
        </div>
      );
    }

    if (!currentCohort) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cohort Not Found</h3>
            <p className="text-gray-600">The selected cohort could not be found.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Sub-Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setCohortConfigTab('theme')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                cohortConfigTab === 'theme'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">🎨</span>
                <span>Theme</span>
              </div>
            </button>
            <button
              onClick={() => setCohortConfigTab('email-templates')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                cohortConfigTab === 'email-templates'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">📧</span>
                <span>Email Templates</span>
              </div>
            </button>
            <button
              onClick={() => setCohortConfigTab('cohort-settings')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                cohortConfigTab === 'cohort-settings'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">⚙️</span>
                <span>Cohort Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Sub-Tab Content */}
        {cohortConfigTab === 'theme' ? (
        <div className="space-y-6">
        {/* Default Theme Source Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="text-2xl mr-3">🎨</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Cohort Default Theme</h3>
              <p className="text-sm text-gray-600">
                Select which module's theme should be used as the default for this cohort.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <select
              value={modules.find(m => m.theme === currentCohort.defaultTheme)?.id || ''}
              onChange={(e) => handleDefaultThemeFromModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">🚂 Use Fixed Theme (Trains)</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {availableThemes.find(t => t.id === module.theme)?.icon || '🚂'} Module {module.moduleNumber}: {module.title} ({availableThemes.find(t => t.id === module.theme)?.name || 'Trains'})
                </option>
              ))}
            </select>
          </div>

          {/* Current Default Theme Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">
                {availableThemes.find(t => t.id === currentCohort.defaultTheme)?.icon || '🚂'}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  Current Default: {availableThemes.find(t => t.id === currentCohort.defaultTheme)?.name || 'Trains'}
                </h4>
                <p className="text-sm text-gray-600">
                  {modules.find(m => m.theme === currentCohort.defaultTheme) 
                    ? `Linked to Module ${modules.find(m => m.theme === currentCohort.defaultTheme)?.moduleNumber}`
                    : 'Fixed theme (not linked to any module)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Theme Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="text-2xl mr-3">📚</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Module Themes</h3>
              <p className="text-sm text-gray-600">
                Configure the theme for each module. If a module is selected as the cohort default above, 
                changing its theme will also update the cohort default.
              </p>
            </div>
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-600">No modules found for this cohort.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => {
                const isLinkedToDefault = module.theme === currentCohort.defaultTheme;
                return (
                  <div key={module.id} className={`border rounded-lg p-4 ${isLinkedToDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            Module {module.moduleNumber}: {module.title}
                          </h4>
                          {isLinkedToDefault && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              🎯 Cohort Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        {isLinkedToDefault && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⚡ This module's theme is used as the cohort default
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Theme:</span>
                        <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
                          <span className="text-lg">
                            {availableThemes.find(t => t.id === module.theme)?.icon || '🚂'}
                          </span>
                          <span className="text-sm font-medium">
                            {availableThemes.find(t => t.id === module.theme)?.name || 'Trains'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {availableThemes.map((theme) => (
                        <button
                          key={theme.id}
                          className={`relative border rounded-lg p-3 text-center transition-all hover:border-primary-300 ${
                            module.theme === theme.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleModuleThemeUpdate(module.id, theme.id)}
                        >
                          <div className="text-2xl mb-1">{theme.icon}</div>
                          <div className="text-xs font-medium text-gray-900">{theme.name}</div>
                          {module.theme === theme.id && (
                            <div className="absolute top-1 right-1">
                              <div className="bg-primary-500 text-white rounded-full p-0.5">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        ) : cohortConfigTab === 'email-templates' ? (
        <div className="space-y-6">
          {/* Email Configuration Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📧</div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Email Templates</h3>
                  <p className="text-sm text-gray-600">
                    Configure email templates for this cohort. Click on any template to customize it.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyGlobalConfirmation(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>🌐</span>
                <span>Copy Global Templates</span>
              </button>
            </div>
          </div>

          {/* Email Configurations List */}
          <div className="space-y-6">
            {emailConfigs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Email Configurations</h3>
                <p className="text-gray-600 mb-6">
                  You can copy global templates to create email configurations for this cohort.
                </p>

              </div>
            ) : (
              emailConfigs.map((config: any) => (
                <div key={config.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Config Header */}
                  <div 
                    className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedEmailConfig(expandedEmailConfig === config.emailType ? null : config.emailType)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl">{getConfigIcon(config.emailType)}</span>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{getConfigDisplayName(config.emailType)}</h3>
                          <p className="text-gray-600">{config.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex items-center space-x-2">
                          {editingEmailId === config.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEmailConfig(config);
                                }}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEmailEdit();
                                }}
                                className="text-gray-600 hover:text-gray-700 font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewEmailConfig(config);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Preview
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEmailConfig(config);
                                }}
                                className="text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            expandedEmailConfig === config.emailType ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedEmailConfig === config.emailType && (
                    <div className="p-6 bg-gray-50">
                      {editingEmailId === config.id ? (
                        // Edit form
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subject
                                </label>
                                <input
                                  type="text"
                                  value={emailFormData.subject}
                                  onChange={(e) => setEmailFormData(prev => ({ ...prev, subject: e.target.value }))}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`active-${config.id}`}
                                  checked={emailFormData.isActive}
                                  onChange={(e) => setEmailFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`active-${config.id}`} className="ml-2 block text-sm text-gray-900">
                                  Active
                                </label>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Theme Colors</h4>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="color"
                                      value={emailFormData.primaryColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={emailFormData.primaryColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="color"
                                      value={emailFormData.secondaryColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={emailFormData.secondaryColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="color"
                                      value={emailFormData.textColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, textColor: e.target.value }))}
                                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={emailFormData.textColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, textColor: e.target.value }))}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Color</label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="color"
                                      value={emailFormData.buttonColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, buttonColor: e.target.value }))}
                                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={emailFormData.buttonColor}
                                      onChange={(e) => setEmailFormData(prev => ({ ...prev, buttonColor: e.target.value }))}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Start Templates */}
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-md font-semibold text-blue-900 mb-3">🎨 Quick Start Templates</h4>
                            <p className="text-sm text-blue-700 mb-3">Choose a professionally designed template to get started quickly:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {Object.entries(defaultEmailTemplates).map(([key, template]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => loadDefaultTemplate(key as keyof typeof defaultEmailTemplates)}
                                  className="text-left p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                >
                                  <div className="font-medium text-blue-900 text-sm">{template.name}</div>
                                  <div className="text-xs text-blue-600 mt-1">{template.description}</div>
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-3">
                              💡 Templates include professional styling and variable placeholders. You can customize them further using the rich text editor.
                            </p>
                          </div>
                          
                          {/* Email Content Editor with Live Preview */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Content *</label>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Editor */}
                              <div>
                                <RichTextEditor
                                  value={emailFormData.htmlContent}
                                  onChange={(content) => setEmailFormData(prev => ({ ...prev, htmlContent: content }))}
                                  placeholder="Enter your email content here..."
                                  colors={{
                                    primaryColor: emailFormData.primaryColor,
                                    secondaryColor: emailFormData.secondaryColor,
                                    textColor: emailFormData.textColor,
                                    buttonColor: emailFormData.buttonColor,
                                    backgroundColor: emailFormData.backgroundColor
                                  }}
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                  Use the toolbar to format your text and insert variables like userName, dashboardUrl, etc.
                                </p>
                              </div>
                              
                              {/* Live Preview */}
                              <div>
                                <div className="border border-gray-300 rounded-lg">
                                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 text-sm font-medium text-gray-700">
                                    Live Preview
                                  </div>
                                  <div 
                                    className="p-4 min-h-[400px] bg-white overflow-auto"
                                    style={{ backgroundColor: emailFormData.backgroundColor }}
                                  >
                                    <div 
                                      className="max-w-full"
                                      dangerouslySetInnerHTML={{ 
                                        __html: emailFormData.htmlContent
                                          .replace(/\{\{userName\}\}/g, 'John Doe')
                                          .replace(/\{\{dashboardUrl\}\}/g, '#')
                                          .replace(/\{\{questionTitle\}\}/g, 'Sample Question')
                                          .replace(/\{\{questionNumber\}\}/g, '1')
                                          .replace(/\{\{grade\}\}/g, 'Excellent')
                                          .replace(/\{\{feedback\}\}/g, 'Great work!')
                                          .replace(/\{\{primaryColor\}\}/g, emailFormData.primaryColor)
                                          .replace(/\{\{secondaryColor\}\}/g, emailFormData.secondaryColor)
                                          .replace(/\{\{backgroundColor\}\}/g, emailFormData.backgroundColor)
                                          .replace(/\{\{textColor\}\}/g, emailFormData.textColor)
                                          .replace(/\{\{buttonColor\}\}/g, emailFormData.buttonColor)
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Preview mode
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Template Details</h4>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium">Subject:</span> {config.subject}</div>
                              <div><span className="font-medium">Primary Color:</span> <span className="inline-block w-4 h-4 rounded ml-2" style={{backgroundColor: config.primaryColor}}></span> {config.primaryColor}</div>
                              <div><span className="font-medium">Secondary Color:</span> <span className="inline-block w-4 h-4 rounded ml-2" style={{backgroundColor: config.secondaryColor}}></span> {config.secondaryColor}</div>
                              <div><span className="font-medium">Background:</span> <span className="inline-block w-4 h-4 rounded ml-2" style={{backgroundColor: config.backgroundColor}}></span> {config.backgroundColor}</div>
                              <div><span className="font-medium">Text Color:</span> <span className="inline-block w-4 h-4 rounded ml-2" style={{backgroundColor: config.textColor}}></span> {config.textColor}</div>
                              <div><span className="font-medium">Button Color:</span> <span className="inline-block w-4 h-4 rounded ml-2" style={{backgroundColor: config.buttonColor}}></span> {config.buttonColor}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">HTML Content Preview</h4>
                            <div className="bg-white border rounded-lg p-4 max-h-32 overflow-auto">
                              <div className="text-xs text-gray-600">
                                {config.htmlContent.length > 200 
                                  ? `${config.htmlContent.substring(0, 200)}...` 
                                  : config.htmlContent}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        ) : cohortConfigTab === 'cohort-settings' ? (
        <div className="space-y-6">
          {/* Cohort Information and Edit Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3">⚙️</div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Cohort Settings</h3>
                  <p className="text-sm text-gray-600">
                    Manage this cohort's details, participants, and configuration.
                  </p>
                </div>
              </div>
              
              {!editingCohort && (
                <button
                  onClick={() => setEditingCohort(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Cohort
                </button>
              )}
            </div>

            {selectedCohort && (
              <>
                {editingCohort ? (
                  // Edit Form
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cohort Number
                        </label>
                        <input
                          type="number"
                          value={cohortFormData.cohortNumber}
                          onChange={(e) => setCohortFormData(prev => ({ ...prev, cohortNumber: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cohort Name
                        </label>
                        <input
                          type="text"
                          value={cohortFormData.name}
                          onChange={(e) => setCohortFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={cohortFormData.startDate}
                          onChange={(e) => setCohortFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={cohortFormData.endDate}
                          onChange={(e) => setCohortFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={cohortFormData.description}
                        onChange={(e) => setCohortFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter cohort description..."
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCohort.isActive}
                            onChange={(e) => handleToggleCohortStatus(selectedCohort.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">Active Cohort</span>
                        </label>
                      </div>
                      
                      <div className="space-x-3">
                        <button
                          onClick={handleUpdateCohort}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setEditingCohort(false);
                            // Reset form data to current cohort values
                            setCohortFormData({
                              cohortNumber: selectedCohort.cohortNumber.toString(),
                              name: selectedCohort.name,
                              description: selectedCohort.description || '',
                              startDate: selectedCohort.startDate ? selectedCohort.startDate.split('T')[0] : '',
                              endDate: selectedCohort.endDate ? selectedCohort.endDate.split('T')[0] : ''
                            });
                          }}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Name:</span> {selectedCohort.name}</p>
                        <p><span className="font-medium">Number:</span> #{selectedCohort.cohortNumber}</p>
                        <p><span className="font-medium">Status:</span> 
                          <span className={`ml-1 font-medium ${selectedCohort.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedCohort.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Dates</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Start:</span> {new Date(selectedCohort.startDate).toLocaleDateString()}</p>
                        {selectedCohort.endDate && (
                          <p><span className="font-medium">End:</span> {new Date(selectedCohort.endDate).toLocaleDateString()}</p>
                        )}
                        <p><span className="font-medium">Created:</span> {new Date(selectedCohort.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Statistics</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Participants:</span> {users.length}</p>
                        <p><span className="font-medium">Modules:</span> {modules.length}</p>
                        <p><span className="font-medium">Email Templates:</span> {emailConfigs.length}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Cohort Description */}
                {!editingCohort && selectedCohort?.description && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                    <p className="text-gray-600">{selectedCohort.description}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg transition-colors flex items-center space-x-3"
              >
                <span className="text-2xl">👥</span>
                <div className="text-left">
                  <div className="font-medium">Manage Participants</div>
                  <div className="text-sm opacity-75">{users.length} participants</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('modules')}
                className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg transition-colors flex items-center space-x-3"
              >
                <span className="text-2xl">📚</span>
                <div className="text-left">
                  <div className="font-medium">Manage Modules</div>
                  <div className="text-sm opacity-75">{modules.length} modules</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('answers')}
                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 p-4 rounded-lg transition-colors flex items-center space-x-3"
              >
                <span className="text-2xl">📝</span>
                <div className="text-left">
                  <div className="font-medium">Pending Answers</div>
                  <div className="text-sm opacity-75">{pendingAnswers.length} pending</div>
                </div>
              </button>

              <button
                onClick={() => setCohortConfigTab('email-templates')}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-4 rounded-lg transition-colors flex items-center space-x-3"
              >
                <span className="text-2xl">📧</span>
                <div className="text-left">
                  <div className="font-medium">Email Templates</div>
                  <div className="text-sm opacity-75">{emailConfigs.length} templates</div>
                </div>
              </button>
            </div>
          </div>
        </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-100 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-100">   
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img 
                src={DashboardIcon} 
                alt="Admin Dashboard" 
                className="w-16 h-16 mr-4 drop-shadow-lg"
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-lg text-gray-600">
                  Manage participants and review answers
                  {selectedCohort && <span className="ml-2 text-primary-600 font-medium">• Cohort: {selectedCohort.name} - {selectedCohort.cohortNumber}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/cohorts')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center shadow-lg"
              >
                <span className="mr-2">🎯</span>
                Change Cohort
              </button>
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
              { id: 'users', name: 'Participants', icon: '👥' },
              { id: 'answers', name: 'Pending Answers', icon: '📝', badge: pendingAnswers.length },
              { id: 'modules', name: 'Manage Modules', icon: '📚' },
              { id: 'mini-questions', name: 'Self Learning', icon: '🎯' },
              { id: 'cohort-config', name: 'Cohort Configuration', icon: '🛠️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'users' | 'answers' | 'modules' | 'mini-questions' | 'cohort-config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
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
          {activeTab === 'modules' && renderModules()}
          {activeTab === 'mini-questions' && (
            <MiniAnswersView 
              selectedCohortId={selectedCohortId || undefined}
              cohortUsers={selectedCohortId ? users : undefined}
            />
          )}
          {activeTab === 'cohort-config' && renderCohortConfig()}
        </div>
      </div>

      {/* Feedback Modal */}
      {/* Mastery Points Modal */}
      {showGradingModal && gradingAnswer && (
        <MasteryPointsModal
          isOpen={showGradingModal}
          onClose={() => {
            setShowGradingModal(false);
            setGradingAnswer(null);
          }}
          onGrade={submitGrade}
          answer={gradingAnswer}
          isLoading={gradingLoading}
        />
      )}

      {/* Create Topic Modal */}
      {showCreateTopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-4">
                  Creating assignment for module: <strong>{modules.find(m => m.id === selectedModuleForTopic)?.title || 'Unknown Module'}</strong>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Number
                </label>
                <input
                  type="number"
                  value={topicForm.topicNumber}
                  onChange={(e) => setTopicForm({...topicForm, topicNumber: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={topicForm.points}
                  onChange={(e) => setTopicForm({...topicForm, points: parseInt(e.target.value) || 100})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Points
                </label>
                <input
                  type="number"
                  value={topicForm.bonusPoints}
                  onChange={(e) => setTopicForm({...topicForm, bonusPoints: parseInt(e.target.value) || 50})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={topicForm.deadline}
                  onChange={(e) => setTopicForm({...topicForm, deadline: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    !createFormValidation.isValid 
                      ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                />
                {!createFormValidation.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {createFormValidation.errorMessage}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                value={topicForm.title}
                onChange={(e) => setTopicForm({...topicForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter topic title..."
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Description
              </label>
              <textarea
                value={topicForm.description}
                onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Enter topic description..."
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Content
              </label>
              <textarea
                value={topicForm.content}
                onChange={(e) => setTopicForm({...topicForm, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                placeholder="Enter detailed topic content, instructions, and requirements..."
                required
              />
            </div>

            {/* Self Learning Section */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Self Learning
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newMiniQuestion = {
                      id: `temp-${Date.now()}`,
                      title: '',
                      description: '',
                      resourceUrl: '',
                      orderIndex: topicForm.contents.length,
                      releaseDate: ''
                    };
                    
                    // Create a simple content section if none exists
                    if (topicForm.contents.length === 0) {
                      const newContent = {
                        id: `content-${Date.now()}`,
                        title: 'Learning Material',
                        content: '',
                        description: '',
                        orderIndex: 0,
                        miniQuestions: [newMiniQuestion]
                      };
                      setTopicForm({ ...topicForm, contents: [newContent] });
                    } else {
                      // Add to first content section
                      const updatedContents = [...topicForm.contents];
                      updatedContents[0] = {
                        ...updatedContents[0],
                        miniQuestions: [...updatedContents[0].miniQuestions, newMiniQuestion]
                      };
                      setTopicForm({ ...topicForm, contents: updatedContents });
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm rounded-md hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md flex items-center"
                >
                  <span className="mr-2">➕</span>
                  Add New
                </button>
              </div>

              {topicForm.contents.length > 0 && topicForm.contents[0].miniQuestions.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Material
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Question
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Resource URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Release Date
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topicForm.contents[0].miniQuestions.map((miniQuestion, index) => (
                        <tr key={miniQuestion.id} className="hover:bg-blue-50 transition-colors duration-200">
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="text"
                              value={miniQuestion.title}
                              onChange={(e) => {
                                const updatedContents = [...topicForm.contents];
                                updatedContents[0].miniQuestions[index] = {
                                  ...miniQuestion,
                                  title: e.target.value
                                };
                                setTopicForm({ ...topicForm, contents: updatedContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Material content..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="text"
                              value={miniQuestion.description}
                              onChange={(e) => {
                                const updatedContents = [...topicForm.contents];
                                updatedContents[0].miniQuestions[index] = {
                                  ...miniQuestion,
                                  description: e.target.value
                                };
                                setTopicForm({ ...topicForm, contents: updatedContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Question..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="url"
                              value={miniQuestion.resourceUrl || ''}
                              onChange={(e) => {
                                const updatedContents = [...topicForm.contents];
                                updatedContents[0].miniQuestions[index] = {
                                  ...miniQuestion,
                                  resourceUrl: e.target.value
                                };
                                setTopicForm({ ...topicForm, contents: updatedContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="https://example.com/resource..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="datetime-local"
                              value={(() => {
                                if (!miniQuestion.releaseDate) return '';
                                
                                // If it's already in datetime-local format (YYYY-MM-DDTHH:MM), use as-is
                                if (typeof miniQuestion.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(miniQuestion.releaseDate)) {
                                  return miniQuestion.releaseDate;
                                }
                                
                                // Convert from ISO string or Date to datetime-local format
                                const date = new Date(miniQuestion.releaseDate);
                                if (isNaN(date.getTime())) return '';
                                
                                // Format for datetime-local input (local time)
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                
                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                              })()}
                              onChange={(e) => {
                                const updatedContents = [...topicForm.contents];
                                updatedContents[0].miniQuestions[index] = {
                                  ...miniQuestion,
                                  releaseDate: e.target.value
                                };
                                setTopicForm({ ...topicForm, contents: updatedContents });
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                                miniQuestion.releaseDate && !validateMiniQuestionDate(topicForm.deadline, miniQuestion.releaseDate)
                                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                              }`}
                            />
                            {miniQuestion.releaseDate && !validateMiniQuestionDate(topicForm.deadline, miniQuestion.releaseDate) && (
                              <p className="mt-1 text-xs text-red-600">
                                Release date must be before assignment deadline
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedContents = [...topicForm.contents];
                                    const miniQuestions = [...updatedContents[0].miniQuestions];
                                    [miniQuestions[index], miniQuestions[index - 1]] = [miniQuestions[index - 1], miniQuestions[index]];
                                    miniQuestions.forEach((mq, idx) => mq.orderIndex = idx);
                                    updatedContents[0].miniQuestions = miniQuestions;
                                    setTopicForm({ ...topicForm, contents: updatedContents });
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              {index < topicForm.contents[0].miniQuestions.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedContents = [...topicForm.contents];
                                    const miniQuestions = [...updatedContents[0].miniQuestions];
                                    [miniQuestions[index], miniQuestions[index + 1]] = [miniQuestions[index + 1], miniQuestions[index]];
                                    miniQuestions.forEach((mq, idx) => mq.orderIndex = idx);
                                    updatedContents[0].miniQuestions = miniQuestions;
                                    setTopicForm({ ...topicForm, contents: updatedContents });
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this self learning activity?')) {
                                    const updatedContents = [...topicForm.contents];
                                    updatedContents[0].miniQuestions = updatedContents[0].miniQuestions
                                      .filter((_, idx) => idx !== index)
                                      .map((mq, idx) => ({ ...mq, orderIndex: idx }));
                                    setTopicForm({ ...topicForm, contents: updatedContents });
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-700 flex items-center">
                      <span className="text-blue-600 mr-2">💡</span>
                      Students will submit links for each self learning activity as part of their enhanced learning process.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="mb-4">
                    <span className="text-4xl">📝</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600 mb-2">No self learning activities added yet</p>
                  <p className="text-sm text-gray-500">Click "Add New" to create your first self learning activity for enhanced learning content.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateTopicModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!selectedModuleForTopic) {
                      toast.error('Please select a module first');
                      return;
                    }

                    // Validate required fields
                    if (!topicForm.title.trim()) {
                      toast.error('Assignment title is required');
                      return;
                    }
                    if (!topicForm.content.trim()) {
                      toast.error('Assignment content is required');
                      return;
                    }
                    if (!topicForm.description.trim()) {
                      toast.error('Assignment description is required');
                      return;
                    }
                    if (!topicForm.deadline.trim()) {
                      toast.error('Assignment deadline is required');
                      return;
                    }
                    if (!topicForm.points || topicForm.points <= 0) {
                      toast.error('Assignment points must be greater than 0');
                      return;
                    }

                    // Validate deadline against mini question release dates
                    const validationResult = validateAssignmentDeadline(topicForm.deadline, topicForm.contents);
                    if (!validationResult.isValid) {
                      toast.error(validationResult.errorMessage || 'Validation failed');
                      return;
                    }

                    // Transform the data to match API expectations
                    const topicData = {
                      ...topicForm,
                      contents: topicForm.contents.map(content => ({
                        title: content.title,
                        material: content.content, // API expects 'material' instead of 'content'
                        miniQuestions: content.miniQuestions.map(mq => ({
                          title: mq.title,
                          question: mq.description, // API expects 'question' instead of 'description'
                          description: mq.description,
                          resourceUrl: mq.resourceUrl,
                          releaseDate: mq.releaseDate
                        }))
                      }))
                    };

                    const response = await adminService.createTopic(selectedModuleForTopic, topicData);
                    const newTopic = response.data;
                    
                    // Update modules state with new topic
                    setModules(prevModules => 
                      prevModules.map(module => 
                        module.id === selectedModuleForTopic 
                          ? { ...module, topics: [...(module.topics || []), newTopic] }
                          : module
                      )
                    );
                    
                    toast.success('Assignment created successfully!');
                    setShowCreateTopicModal(false);
                    setTopicForm({
                      topicNumber: 1,
                      title: '',
                      content: '',
                      description: '',
                      deadline: '',
                      points: 100,
                      bonusPoints: 50,
                      contents: []
                    });
                    setSelectedModuleForTopic('');
                  } catch (error) {
                    toast.error('Failed to create assignment');
                  }
                }}
                disabled={!createFormValidation.isValid}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  createFormValidation.isValid
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {showEditModuleModal && selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Module</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module Number
                </label>
                <input
                  type="number"
                  value={selectedModule.moduleNumber}
                  onChange={(e) => setSelectedModule({...selectedModule, moduleNumber: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Released Status
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedModule.isReleased}
                    onChange={async (e) => {
                      const newReleased = e.target.checked;
                      
                      // If unchecking Released, we need to make sure all topics are also unreleased
                      if (!newReleased) {
                        const updatedModule = {
                          ...selectedModule,
                          isReleased: false,
                          topics: selectedModule.topics.map(topic => ({
                            ...topic,
                            isReleased: false
                          }))
                        };
                        setSelectedModule(updatedModule);
                      } else {
                        // If checking Released, make all topics released too
                        const updatedModule = {
                          ...selectedModule,
                          isReleased: true,
                          topics: selectedModule.topics.map(topic => ({
                            ...topic,
                            isReleased: true
                          }))
                        };
                        setSelectedModule(updatedModule);
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Released</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Title
              </label>
              <input
                type="text"
                value={selectedModule.title}
                onChange={(e) => setSelectedModule({...selectedModule, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter module title..."
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Description
              </label>
              <textarea
                value={selectedModule.description}
                onChange={(e) => setSelectedModule({...selectedModule, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter module description..."
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModuleModal(false);
                  setSelectedModule(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await adminService.updateModule(selectedModule.id, {
                      moduleNumber: selectedModule.moduleNumber,
                      title: selectedModule.title,
                      description: selectedModule.description,
                      isReleased: selectedModule.isReleased
                    });
                    
                    // The response should contain the updated module with all its data
                    const updatedModule = response.data;
                    
                    // Update modules state, preserving existing topics if they're not in the response
                    setModules(prevModules => 
                      prevModules.map(module => 
                        module.id === selectedModule.id 
                          ? { ...updatedModule, topics: updatedModule.topics || module.topics }
                          : module
                      )
                    );
                    
                    toast.success('Module updated successfully!');
                    setShowEditModuleModal(false);
                    setSelectedModule(null);
                    
                    // Refresh data to ensure consistency
                    await loadAdminData();
                  } catch (error) {
                    toast.error('Failed to update module');
                  }
                }}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
              >
                Save Changes
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this module? This will also delete all assignments within it.')) {
                    try {
                      await adminService.deleteModule(selectedModule.id);
                      
                      // Remove module from state
                      setModules(prevModules => 
                        prevModules.filter(module => module.id !== selectedModule.id)
                      );
                      
                      toast.success('Module deleted successfully!');
                      setShowEditModuleModal(false);
                      setSelectedModule(null);
                    } catch (error) {
                      toast.error('Failed to delete module');
                    }
                  }
                }}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
              >
                Delete Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {showEditTopicModal && selectedTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Number
                </label>
                <input
                  type="number"
                  value={selectedTopic.topicNumber}
                  onChange={(e) => setSelectedTopic({...selectedTopic, topicNumber: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Released Status
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTopic.isReleased}
                    onChange={(e) => setSelectedTopic({...selectedTopic, isReleased: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Released</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={selectedTopic.points}
                  onChange={(e) => setSelectedTopic({...selectedTopic, points: parseInt(e.target.value) || 100})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Points
                </label>
                <input
                  type="number"
                  value={selectedTopic.bonusPoints}
                  onChange={(e) => setSelectedTopic({...selectedTopic, bonusPoints: parseInt(e.target.value) || 50})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={selectedTopic.deadline.substring(0, 16)}
                  onChange={(e) => setSelectedTopic({...selectedTopic, deadline: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    !editFormValidation.isValid 
                      ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {!editFormValidation.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {editFormValidation.errorMessage}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Title
              </label>
              <input
                type="text"
                value={selectedTopic.title}
                onChange={(e) => setSelectedTopic({...selectedTopic, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter topic title..."
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Description
              </label>
              <textarea
                value={selectedTopic.description}
                onChange={(e) => setSelectedTopic({...selectedTopic, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter topic description..."
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Content
              </label>
              <textarea
                value={selectedTopic.content}
                onChange={(e) => setSelectedTopic({...selectedTopic, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                placeholder="Enter detailed topic content, instructions, and requirements..."
                required
              />
            </div>

            {/* Self Learning Section for Edit */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Self Learning
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const currentContents = selectedTopic.contents || [];
                    setSelectedTopic({
                      ...selectedTopic,
                      contents: [...currentContents, { 
                        content: '', 
                        description: '',
                        resourceUrl: '',
                        title: '',
                        orderIndex: currentContents.length,
                        miniQuestions: [],
                        releaseDate: ''
                      }]
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm rounded-md hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md flex items-center"
                >
                  <span className="mr-2">➕</span>
                  Add New
                </button>
              </div>
              
              {selectedTopic.contents && selectedTopic.contents.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Material
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Question
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Resource URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Release Date
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedTopic.contents.map((contentItem, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors duration-200">
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="text"
                              value={contentItem.content}
                              onChange={(e) => {
                                const newContents = [...(selectedTopic.contents || [])];
                                newContents[index] = { ...newContents[index], content: e.target.value };
                                setSelectedTopic({ ...selectedTopic, contents: newContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Material content..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="text"
                              value={contentItem.description}
                              onChange={(e) => {
                                const newContents = [...(selectedTopic.contents || [])];
                                newContents[index] = { ...newContents[index], description: e.target.value };
                                setSelectedTopic({ ...selectedTopic, contents: newContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Question..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="url"
                              value={contentItem.resourceUrl || ''}
                              onChange={(e) => {
                                const newContents = [...(selectedTopic.contents || [])];
                                newContents[index] = { ...newContents[index], resourceUrl: e.target.value };
                                setSelectedTopic({ ...selectedTopic, contents: newContents });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="https://example.com/resource..."
                            />
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <input
                              type="datetime-local"
                              value={(() => {
                                if (!contentItem.releaseDate) return '';
                                
                                // If it's already in datetime-local format (YYYY-MM-DDTHH:MM), use as-is
                                if (typeof contentItem.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(contentItem.releaseDate)) {
                                  return contentItem.releaseDate;
                                }
                                
                                // Convert from ISO string or Date to datetime-local format
                                const date = new Date(contentItem.releaseDate);
                                if (isNaN(date.getTime())) return '';
                                
                                // Format for datetime-local input (local time)
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                
                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                              })()}
                              onChange={(e) => {
                                const newContents = [...(selectedTopic.contents || [])];
                                newContents[index] = { ...newContents[index], releaseDate: e.target.value };
                                setSelectedTopic({ ...selectedTopic, contents: newContents });
                              }}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                                contentItem.releaseDate && selectedTopic && !validateMiniQuestionDate(selectedTopic.deadline, contentItem.releaseDate)
                                  ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                              }`}
                            />
                            {contentItem.releaseDate && selectedTopic && !validateMiniQuestionDate(selectedTopic.deadline, contentItem.releaseDate) && (
                              <p className="mt-1 text-xs text-red-600">
                                Release date must be before assignment deadline
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newContents = [...(selectedTopic.contents || [])];
                                    [newContents[index], newContents[index - 1]] = [newContents[index - 1], newContents[index]];
                                    setSelectedTopic({ ...selectedTopic, contents: newContents });
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              {index < (selectedTopic.contents?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newContents = [...(selectedTopic.contents || [])];
                                    [newContents[index], newContents[index + 1]] = [newContents[index + 1], newContents[index]];
                                    setSelectedTopic({ ...selectedTopic, contents: newContents });
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const newContents = (selectedTopic.contents || []).filter((_, i) => i !== index);
                                  setSelectedTopic({ ...selectedTopic, contents: newContents });
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                                title="Delete"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-700 flex items-center">
                      <span className="text-blue-600 mr-2">💡</span>
                      Students will submit links for each self learning activity as part of their enhanced learning process.
                    </p>
                  </div>
                </div>
              )}
              
              {(!selectedTopic.contents || selectedTopic.contents.length === 0) && (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="mb-4">
                    <span className="text-4xl">📝</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600 mb-2">No self learning activities added yet</p>
                  <p className="text-sm text-gray-500">Click "Add New" to create your first self learning activity for enhanced learning content.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditTopicModal(false);
                  setSelectedTopic(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Validate deadline against mini question release dates
                    const validationResult = validateAssignmentDeadline(selectedTopic.deadline, selectedTopic.contents || []);
                    if (!validationResult.isValid) {
                      toast.error(validationResult.errorMessage || 'Validation failed');
                      return;
                    }

                    // Transform contents to the format expected by the backend
                    const transformedContents = selectedTopic.contents 
                      ? selectedTopic.contents.map(item => ({
                          material: item.content,
                          question: item.description,
                          resourceUrl: item.resourceUrl,
                          releaseDate: item.releaseDate ? (() => {
                            // Handle datetime-local format (YYYY-MM-DDTHH:MM)
                            if (typeof item.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(item.releaseDate)) {
                              // Create a Date object from the datetime-local string
                              // This treats it as local time and will send the ISO string to backend
                              const localDate = new Date(item.releaseDate);
                              return localDate.toISOString();
                            }
                            // If it's already an ISO string or other format, pass it through
                            return item.releaseDate;
                          })() : undefined
                        }))
                      : [];

                    const response = await adminService.updateTopic(selectedTopic.id, {
                      topicNumber: selectedTopic.topicNumber,
                      title: selectedTopic.title,
                      content: selectedTopic.content,
                      description: selectedTopic.description,
                      deadline: selectedTopic.deadline,
                      points: selectedTopic.points,
                      bonusPoints: selectedTopic.bonusPoints,
                      isReleased: selectedTopic.isReleased,
                      contents: transformedContents
                    });
                    
                    const updatedTopic = response.data;
                    
                    // Update modules state with updated topic
                    setModules(prevModules => 
                      prevModules.map(module => ({
                        ...module,
                        topics: module.topics.map(topic => 
                          topic.id === selectedTopic.id ? { ...updatedTopic, answers: topic.answers } : topic
                        )
                      }))
                    );
                    
                    toast.success('Assignment updated successfully!');
                    setShowEditTopicModal(false);
                    setSelectedTopic(null);
                    
                    // Refresh data to ensure consistency
                    await loadAdminData();
                  } catch (error) {
                    toast.error('Failed to update assignment');
                  }
                }}
                disabled={!editFormValidation.isValid}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  editFormValidation.isValid
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this assignment?')) {
                    try {
                      await adminService.deleteTopic(selectedTopic.id);
                      
                      // Remove topic from state
                      setModules(prevModules => 
                        prevModules.map(module => ({
                          ...module,
                          topics: module.topics.filter(topic => topic.id !== selectedTopic.id)
                        }))
                      );
                      
                      toast.success('Assignment deleted successfully!');
                      setShowEditTopicModal(false);
                      setSelectedTopic(null);
                    } catch (error) {
                      toast.error('Failed to delete assignment');
                    }
                  }
                }}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Module Modal */}
      {showCreateModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Module</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module Number
                </label>
                <input
                  type="number"
                  value={moduleForm.moduleNumber}
                  onChange={(e) => setModuleForm({...moduleForm, moduleNumber: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Title
              </label>
              <input
                type="text"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter module title..."
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Description
              </label>
              <textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter module description..."
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModuleModal(false);
                  setModuleForm({
                    moduleNumber: 1,
                    title: '',
                    description: ''
                  });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!selectedCohortId) {
                      toast.error('Please select a cohort first before creating modules');
                      return;
                    }

                    const response = await adminService.createModule({
                      ...moduleForm,
                      cohortId: selectedCohortId
                    });
                    const newModule = response.data;
                    
                    // Add new module to state
                    setModules(prevModules => [...prevModules, newModule]);
                    
                    toast.success('Module created successfully!');
                    setShowCreateModuleModal(false);
                    setModuleForm({
                      moduleNumber: 1,
                      title: '',
                      description: ''
                    });
                  } catch (error) {
                    toast.error('Failed to create module');
                  }
                }}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                Create Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Preview Modal */}
      <HtmlEditorModal
        isOpen={!!previewEmailConfig}
        onClose={() => setPreviewEmailConfig(null)}
        htmlContent={previewEmailConfig?.htmlContent || ''}
        onSave={() => setPreviewEmailConfig(null)} // Just close the modal
        readOnly={true}
        colors={{
          primaryColor: previewEmailConfig?.primaryColor || '#3B82F6',
          secondaryColor: previewEmailConfig?.secondaryColor || '#1E40AF',
          textColor: previewEmailConfig?.textColor || '#1F2937',
          buttonColor: previewEmailConfig?.buttonColor || '#3B82F6',
          backgroundColor: previewEmailConfig?.backgroundColor || '#F8FAFC'
        }}
      />

      {/* Copy Global Templates Confirmation Modal */}
      {showCopyGlobalConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <span className="text-2xl">🌐</span>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Copy Global Email Templates
                </h3>
                <div className="text-sm text-gray-500 mb-4">
                  {emailConfigs.length > 0 ? (
                    <>
                      <p className="mb-2">This will:</p>
                      <ul className="text-left space-y-1">
                        <li>• Delete all existing email configurations ({emailConfigs.length} templates)</li>
                        <li>• Copy all global templates to this cohort</li>
                        <li>• Replace current settings with global defaults</li>
                      </ul>
                      <p className="mt-3 font-medium text-amber-600">
                        ⚠️ This action cannot be undone!
                      </p>
                    </>
                  ) : (
                    <p>This will copy all global email templates to this cohort.</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCopyGlobalConfirmation(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={copyingGlobalTemplates}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopyGlobalTemplates}
                  disabled={copyingGlobalTemplates}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {copyingGlobalTemplates ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Copying...</span>
                    </>
                  ) : (
                    <span>{emailConfigs.length > 0 ? 'Replace Templates' : 'Copy Templates'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
