import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Target, 
  Award,
  Lock,
  BookOpen,
  ExternalLink,
  Send,
  Loader2
} from 'lucide-react';

interface MiniQuestion {
  id: string;
  title: string;
  question: string;
  description?: string;
  orderIndex: number;
  isReleased: boolean;
  releaseDate?: string;
  hasAnswer: boolean;
  answer?: {
    id: string;
    linkUrl: string;
    notes?: string;
    submittedAt: string;
  };
}

interface Content {
  id: string;
  title: string;
  material: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
}

interface MainAnswer {
  id: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  feedback?: string;
}

interface Question {
  id: string;
  questionNumber: number;
  title: string;
  content: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  status: 'locked' | 'mini_questions_required' | 'available' | 'submitted' | 'completed';
  canSolveMainQuestion: boolean;
  hasMainAnswer: boolean;
  mainAnswer?: MainAnswer;
  miniQuestionProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  contents: Content[];
}

interface User {
  id: string;
  fullName: string;
  trainName: string;
  currentStep: number;
  createdAt: string;
}

interface ProgressData {
  user: User;
  currentStep: number;
  totalSteps: number;
  totalQuestions: number;
  isComplete: boolean;
  questions: Question[];
}

const GameViewEnhanced: React.FC = () => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMini, setSubmittingMini] = useState<string | null>(null);
  const [submittingMain, setSubmittingMain] = useState(false);
  const [miniAnswers, setMiniAnswers] = useState<{ [key: string]: { linkUrl: string; notes: string } }>({});
  const [mainAnswerContent, setMainAnswerContent] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await gameService.getProgress();
      console.log('Progress API response:', response.data); // Debug log
      setProgressData(response.data);
      
      // Auto-select the first available question if questions exist
      if (response.data && response.data.questions && response.data.questions.length > 0) {
        const availableQuestion = response.data.questions.find((q: Question) => 
          q.status === 'mini_questions_required' || q.status === 'available'
        );
        if (availableQuestion) {
          setSelectedQuestion(availableQuestion);
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error('Failed to load progress');
      // Set default empty state to prevent undefined errors
      setProgressData({
        user: null,
        currentStep: 0,
        totalSteps: 12,
        totalQuestions: 0,
        isComplete: false,
        questions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMiniAnswerChange = (miniQuestionId: string, field: 'linkUrl' | 'notes', value: string) => {
    setMiniAnswers(prev => ({
      ...prev,
      [miniQuestionId]: {
        ...prev[miniQuestionId],
        [field]: value
      }
    }));
  };

  const submitMiniAnswer = async (miniQuestionId: string) => {
    const answerData = miniAnswers[miniQuestionId];
    if (!answerData?.linkUrl?.trim()) {
      toast.error('Please provide a link URL');
      return;
    }

    try {
      setSubmittingMini(miniQuestionId);
      await gameService.submitMiniAnswer({
        miniQuestionId,
        linkUrl: answerData.linkUrl.trim(),
        notes: answerData.notes?.trim() || ''
      });
      
      toast.success('Mini answer submitted successfully!');
      await fetchProgress(); // Refresh data
      
      // Clear the form
      setMiniAnswers(prev => ({
        ...prev,
        [miniQuestionId]: { linkUrl: '', notes: '' }
      }));
    } catch (error: any) {
      console.error('Error submitting mini answer:', error);
      toast.error(error.response?.data?.error || 'Failed to submit mini answer');
    } finally {
      setSubmittingMini(null);
    }
  };

  const submitMainAnswer = async () => {
    if (!mainAnswerContent.trim()) {
      toast.error('Please provide your answer');
      return;
    }

    if (!selectedQuestion) {
      toast.error('No question selected');
      return;
    }

    try {
      setSubmittingMain(true);
      await gameService.submitAnswer(mainAnswerContent.trim());
      
      toast.success('Answer submitted successfully!');
      await fetchProgress(); // Refresh data
      setMainAnswerContent('');
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast.error(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmittingMain(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'available': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'mini_questions_required': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'locked': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'submitted': return <Clock className="w-5 h-5" />;
      case 'available': return <Target className="w-5 h-5" />;
      case 'mini_questions_required': return <BookOpen className="w-5 h-5" />;
      case 'locked': return <Lock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'submitted': return 'Submitted';
      case 'available': return 'Available';
      case 'mini_questions_required': return 'Complete Mini Questions First';
      case 'locked': return 'Locked';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load progress data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🚂 Train at Trails</h1>
          <p className="text-xl text-gray-600">Welcome aboard, {progressData?.user?.fullName || 'Trainee'}!</p>
          <div className="mt-4 flex justify-center items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Train: {progressData?.user?.trainName || 'Loading...'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                Step: {progressData?.currentStep || 0}/{progressData?.totalSteps || 12}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Questions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Learning Assignments</h2>
              <div className="space-y-3">
                {progressData && progressData.questions ? progressData.questions.map((question) => (
                  <div
                    key={question.id}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md
                      ${selectedQuestion?.id === question.id ? 'ring-2 ring-blue-500 border-blue-300' : ''}
                      ${getStatusColor(question.status)}
                    `}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(question.status)}
                          <span className="font-medium text-sm">Q{question.questionNumber}</span>
                        </div>
                        <h3 className="font-semibold text-sm leading-tight">{question.title}</h3>
                        <p className="text-xs mt-1 opacity-75">{getStatusText(question.status)}</p>
                        
                        {/* Mini Question Progress */}
                        {question.miniQuestionProgress.total > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>Mini Questions</span>
                              <span>{question.miniQuestionProgress.completed}/{question.miniQuestionProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${question.miniQuestionProgress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Points */}
                        <div className="flex items-center space-x-2 mt-2 text-xs">
                          <Award className="w-3 h-3" />
                          <span>{question.points} pts</span>
                          {question.bonusPoints > 0 && (
                            <span className="text-yellow-600">+{question.bonusPoints} bonus</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No questions available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question Details */}
          <div className="lg:col-span-2">
            {selectedQuestion ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Q{selectedQuestion.questionNumber}: {selectedQuestion.title}
                    </h2>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedQuestion.status)}`}>
                      {getStatusIcon(selectedQuestion.status)}
                      <span className="ml-2">{getStatusText(selectedQuestion.status)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{selectedQuestion.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(selectedQuestion.deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4" />
                      <span>{selectedQuestion.points} points</span>
                    </div>
                  </div>
                </div>

                {/* Mini Questions Section */}
                {selectedQuestion.contents.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📚 Learning Activities</h3>
                    <div className="space-y-6">
                      {selectedQuestion.contents.map((content) => (
                        <div key={content.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-800 mb-2">{content.title}</h4>
                          <div className="text-gray-600 mb-4 whitespace-pre-wrap">{content.material}</div>
                          
                          {content.miniQuestions.length > 0 && (
                            <div className="space-y-4">
                              {content.miniQuestions.map((miniQ) => (
                                <div key={miniQ.id} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-800 mb-1">{miniQ.title}</h5>
                                      <p className="text-gray-600 text-sm">{miniQ.question}</p>
                                      {miniQ.description && (
                                        <p className="text-gray-500 text-xs mt-1">{miniQ.description}</p>
                                      )}
                                    </div>
                                    {miniQ.hasAnswer && (
                                      <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                                    )}
                                  </div>
                                  
                                  {miniQ.hasAnswer && miniQ.answer ? (
                                    <div className="bg-green-50 border border-green-200 rounded p-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-800">Submitted</span>
                                        <span className="text-xs text-green-600">
                                          {new Date(miniQ.answer.submittedAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <ExternalLink className="w-4 h-4 text-blue-600" />
                                        <a 
                                          href={miniQ.answer.linkUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline text-sm break-all"
                                        >
                                          {miniQ.answer.linkUrl}
                                        </a>
                                      </div>
                                      {miniQ.answer.notes && (
                                        <p className="text-sm text-gray-600 mt-2">
                                          <strong>Notes:</strong> {miniQ.answer.notes}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Link URL *
                                        </label>
                                        <input
                                          type="url"
                                          placeholder="https://example.com/your-resource"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          value={miniAnswers[miniQ.id]?.linkUrl || ''}
                                          onChange={(e) => handleMiniAnswerChange(miniQ.id, 'linkUrl', e.target.value)}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Notes (Optional)
                                        </label>
                                        <textarea
                                          placeholder="Add any additional notes or comments..."
                                          rows={2}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          value={miniAnswers[miniQ.id]?.notes || ''}
                                          onChange={(e) => handleMiniAnswerChange(miniQ.id, 'notes', e.target.value)}
                                        />
                                      </div>
                                      <button
                                        onClick={() => submitMiniAnswer(miniQ.id)}
                                        disabled={submittingMini === miniQ.id || !miniAnswers[miniQ.id]?.linkUrl?.trim()}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        {submittingMini === miniQ.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                        <span>Submit</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Assignment Section */}
                {selectedQuestion.canSolveMainQuestion ? (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Main Assignment</h3>
                    
                    {selectedQuestion.hasMainAnswer && selectedQuestion.mainAnswer ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          {selectedQuestion.mainAnswer.status === 'APPROVED' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : selectedQuestion.mainAnswer.status === 'REJECTED' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-blue-600" />
                          )}
                          <span className="font-medium">
                            {selectedQuestion.mainAnswer.status === 'APPROVED' ? 'Approved' :
                             selectedQuestion.mainAnswer.status === 'REJECTED' ? 'Rejected' : 'Under Review'}
                          </span>
                          <span className="text-sm text-gray-500">
                            Submitted {new Date(selectedQuestion.mainAnswer.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="bg-white rounded p-3 mb-3">
                          <p className="text-gray-800 whitespace-pre-wrap">{selectedQuestion.mainAnswer.content}</p>
                        </div>
                        
                        {selectedQuestion.mainAnswer.feedback && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-sm font-medium text-yellow-800 mb-1">Feedback:</p>
                            <p className="text-yellow-700">{selectedQuestion.mainAnswer.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-700 mb-4">{selectedQuestion.content}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Answer *
                          </label>
                          <textarea
                            rows={8}
                            placeholder="Write your detailed answer here..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={mainAnswerContent}
                            onChange={(e) => setMainAnswerContent(e.target.value)}
                          />
                        </div>
                        
                        <button
                          onClick={submitMainAnswer}
                          disabled={submittingMain || !mainAnswerContent.trim()}
                          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submittingMain ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                          <span>Submit Assignment</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t pt-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                      <BookOpen className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-orange-800 mb-2">Complete Learning Activities First</h3>
                      <p className="text-orange-700">
                        You need to complete all mini questions above before you can submit the main assignment.
                      </p>
                      <div className="mt-3 text-sm text-orange-600">
                        Progress: {selectedQuestion.miniQuestionProgress.completed}/{selectedQuestion.miniQuestionProgress.total} completed
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Select an Assignment</h3>
                <p className="text-gray-500">Choose an assignment from the list to start learning</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameViewEnhanced;
