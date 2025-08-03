import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { adminService, gameService } from '../services/api';
import toast from 'react-hot-toast';
import MiniAnswersView from '../components/MiniAnswersView';

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

interface Module {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
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
  orderIndex: number;
  releaseDate?: string;
}

interface ContentSection {
  id?: string;
  title: string;
  content: string;
  description: string;
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

interface ModuleFormData {
  moduleNumber: number;
  title: string;
  description: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSteps, setTotalSteps] = useState(12); // Dynamic total steps from database
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'answers' | 'modules' | 'mini-questions'>('overview');
  
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

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading admin data...', { userEmail: user?.email, isAdmin: user?.isAdmin });
      const [usersResponse, pendingResponse, statsResponse, modulesResponse, progressResponse] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getPendingAnswers(),
        adminService.getGameStats(),
        adminService.getAllModules(),
        gameService.getProgress() // Get totalSteps
      ]);

      setUsers(usersResponse.data.users);
      setPendingAnswers(pendingResponse.data.pendingAnswers);
      setStats(statsResponse.data);
      setModules(modulesResponse.data.modules || []);
      
      // Set dynamic total steps from progress response
      if (progressResponse.data.totalSteps) {
        setTotalSteps(progressResponse.data.totalSteps);
      }
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

  // Validation function to check if assignment deadline is before any mini question release date
  const validateAssignmentDeadline = (deadline: string, contents: any[]): { isValid: boolean; errorMessage?: string; conflictingIndices?: number[] } => {
    if (!deadline || !contents || contents.length === 0) {
      return { isValid: true };
    }

    const assignmentDeadline = new Date(deadline);
    const conflictingIndices: number[] = [];
    let firstConflictMessage = '';
    
    // Check all mini questions for release dates that are after the assignment deadline
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
              firstConflictMessage = `Assignment deadline (${formattedDeadline}) cannot be before mini question release date (${formattedReleaseDate}). Please adjust the deadline or the mini question release dates.`;
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
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-primary-600 text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-primary-600">Total Users</p>
                <p className="text-2xl font-bold text-primary-900">{stats.totalUsers}</p>
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
                <p className="text-2xl font-bold text-accent-900">{stats.totalAnswers}</p>
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
                <p className="text-2xl font-bold text-secondary-900">{stats.pendingAnswers}</p>
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
                        onClick={() => handleReviewAnswer(answer.id, 'approved')}
                        className="bg-accent-600 text-white px-3 py-1 rounded text-sm hover:bg-accent-700"
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
                  className="text-primary-600 hover:text-primary-800 font-medium"
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
                      <div className="text-sm text-gray-900">Step {user.currentStep}/{totalSteps}</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${(user.currentStep / totalSteps) * 100}%` }}
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
                  onClick={() => handleReviewAnswer(answer.id, 'approved')}
                  className="bg-accent-600 text-white px-4 py-2 rounded hover:bg-accent-700 transition-colors"
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
                                          <p className="text-sm text-gray-700">{answer.content}</p>
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
              <span className="text-6xl mr-4 drop-shadow-lg">🔧</span>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-lg text-gray-600">Manage users and review answers</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
              { id: 'modules', name: 'Manage Modules', icon: '📚' },
              { id: 'mini-questions', name: 'Mini Questions', icon: '🎯' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'users' | 'answers' | 'modules' | 'mini-questions')}
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
          {activeTab === 'mini-questions' && <MiniAnswersView />}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

            {/* Mini Questions Section */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Mini Questions
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newMiniQuestion = {
                      id: `temp-${Date.now()}`,
                      title: '',
                      description: '',
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
                              type="datetime-local"
                              value={miniQuestion.releaseDate || ''}
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
                                  if (confirm('Are you sure you want to delete this mini question?')) {
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
                      Students will submit links for each mini question as part of their self-learning process.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="mb-4">
                    <span className="text-4xl">📝</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600 mb-2">No mini questions added yet</p>
                  <p className="text-sm text-gray-500">Click "Add New" to create your first mini question for self-learning content.</p>
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
                    console.error('Error creating topic:', error);
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
                    console.error('Error updating module:', error);
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
                      console.error('Error deleting module:', error);
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

            {/* Mini Questions Section for Edit */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Mini Questions
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
                              type="datetime-local"
                              value={contentItem.releaseDate || ''}
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
                      Students will submit links for each mini question as part of their self-learning process.
                    </p>
                  </div>
                </div>
              )}
              
              {(!selectedTopic.contents || selectedTopic.contents.length === 0) && (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="mb-4">
                    <span className="text-4xl">📝</span>
                  </div>
                  <p className="text-lg font-medium text-gray-600 mb-2">No mini questions added yet</p>
                  <p className="text-sm text-gray-500">Click "Add New" to create your first mini question for self-learning content.</p>
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
                          releaseDate: item.releaseDate
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
                    console.error('Error updating assignment:', error);
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
                      console.error('Error deleting assignment:', error);
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
                    const response = await adminService.createModule(moduleForm);
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
                    console.error('Error creating module:', error);
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
    </div>
  );
};

export default AdminDashboard;
