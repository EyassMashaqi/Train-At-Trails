import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Question {
  id: number;
  title: string;
  content: string;
  description?: string;
  questionNumber: number;
  releaseDate: string;
  deadline?: string;
  points?: number;
  bonusPoints?: number;
  hasAnswered?: boolean;
}

interface Answer {
  id: number;
  content: string;
  status: string;
  submittedAt: string;
  feedback?: string;
  question: Question;
  topic?: Topic;
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
  isReleased: boolean;
  module: Module;
}

interface Module {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  deadline: string;
  isReleased: boolean;
  topics: Topic[];
}

interface MiniQuestion {
  id: string;
  title: string;
  question: string;
  description: string;
  orderIndex: number;
  isReleased: boolean;
  releaseDate: string;
  hasAnswer: boolean;
  answer?: {
    id: string;
    linkUrl: string;
    notes: string;
    submittedAt: string;
  };
  contentId: string;
  contentTitle: string;
  questionId?: string;
  questionTitle?: string;
  questionNumber?: number;
}

interface TrailProgress {
  currentStep: number;
  totalSteps: number;
  answers: Answer[];
}

interface LeaderboardUser {
  id: string;
  fullName: string;
  trainName: string;
  currentStep: number;
  createdAt: string;
}

const GameView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTrainAnimation] = useState(false); // Static false - animation triggered by main questions which are disabled
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  
  // Self learning activities state
  const [miniQuestions, setMiniQuestions] = useState<MiniQuestion[]>([]);
  const [miniAnswers, setMiniAnswers] = useState<Record<string, { linkUrl: string; notes: string }>>({});
  const [submittingMini, setSubmittingMini] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{[key: string]: {isValid: boolean, message: string}}>({});
  
  // Main question answer state
  const [answerContent, setAnswerContent] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();

  // URL validation function
  const validateUrl = (url: string): {isValid: boolean, message: string} => {
    if (!url.trim()) {
      return { isValid: false, message: '' };
    }

    try {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const isValidPattern = urlPattern.test(url);
      
      if (!isValidPattern) {
        return { isValid: false, message: 'Please enter a valid URL (e.g., https://example.com)' };
      }
      
      // Check if URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { isValid: true, message: 'URL looks good! (Protocol will be added automatically)' };
      }
      
      return { isValid: true, message: 'Valid URL format ✓' };
    } catch (error) {
      return { isValid: false, message: 'Invalid URL format' };
    }
  };

  // Helper function to calculate total released questions
  const getTotalReleasedQuestions = (): number => {
    // Use progress.totalSteps if available (from backend calculation)
    if (progress?.totalSteps) {
      return progress.totalSteps;
    }

    // Fallback: count released questions from modules and current question
    let totalReleased = 0;

    // Count released topics from modules
    modules.forEach(module => {
      if (module.isReleased) {
        module.topics.forEach(topic => {
          if (topic.isReleased) {
            totalReleased++;
          }
        });
      }
    });

    // Add current question if no modules exist (legacy mode)
    if (currentQuestion && (!modules || modules.length === 0)) {
      totalReleased = Math.max(totalReleased, currentQuestion.questionNumber);
    }

    // Return calculated total or minimum of 1 (no hardcoded fallback to 12)
    return Math.max(totalReleased, 1);
  };

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const [progressResponse, leaderboardResponse, modulesResponse] = await Promise.all([
        gameService.getProgress(),
        gameService.getLeaderboard(),
        gameService.getModules()
      ]);

      const data = progressResponse.data;

      // Debug logging to understand the duplication issue
      console.log('Progress data:', data);
      console.log('Current question:', data.currentQuestion);
      console.log('Modules:', modulesResponse.data.modules);

      // Extract progress and current question from the single response
      setProgress({
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answers: data.answers
      });
      setCurrentQuestion(data.currentQuestion);

      // Set self learning activities if available
      console.log('Checking currentQuestionMiniQuestions:', data.currentQuestionMiniQuestions);
      if (data.currentQuestionMiniQuestions) {
        console.log('Setting self learning activities:', data.currentQuestionMiniQuestions.length);
        setMiniQuestions(data.currentQuestionMiniQuestions);
        
        // Initialize mini answers state with existing answers, preserving current form state
        setMiniAnswers(prevMiniAnswers => {
          const updatedMiniAnswers: Record<string, { linkUrl: string; notes: string }> = { ...prevMiniAnswers };
          
          data.currentQuestionMiniQuestions.forEach((mq: MiniQuestion) => {
            // Only update if we don't already have form data for this question
            if (!updatedMiniAnswers[mq.id]) {
              if (mq.hasAnswer && mq.answer) {
                updatedMiniAnswers[mq.id] = {
                  linkUrl: mq.answer.linkUrl || '',
                  notes: mq.answer.notes || ''
                };
              } else {
                updatedMiniAnswers[mq.id] = { linkUrl: '', notes: '' };
              }
            }
          });
          
          return updatedMiniAnswers;
        });
      } else {
        console.log('No currentQuestionMiniQuestions in response');
        setMiniQuestions([]);
      }

      // Set current topic data if available
      // Note: currentTopic functionality is disabled as we focus on self learning activities only
      // if (data.currentTopicData) {
      //   setCurrentTopic(data.currentTopicData);
      // }

      // Set modules data
      setModules(modulesResponse.data.modules || []);
      console.log('Modules loaded:', modulesResponse.data.modules?.length || 0);
      
      // Debug first module topics
      if (modulesResponse.data.modules && modulesResponse.data.modules.length > 0) {
        const firstModule = modulesResponse.data.modules[0];
        console.log('First module:', firstModule.title, 'Topics:', firstModule.topics?.length || 0);
        if (firstModule.topics && firstModule.topics.length > 0) {
          console.log('First topic:', firstModule.topics[0]);
        }
      }

      // Auto-expand released modules
      const initialExpanded: Record<string, boolean> = {};
      modulesResponse.data.modules?.forEach((module: Module) => {
        if (module.isReleased) {
          initialExpanded[module.id] = true;
        }
      });
      setExpandedModules(initialExpanded);

      // Debug leaderboard data
      console.log('Full leaderboard response:', leaderboardResponse);
      console.log('Response data:', leaderboardResponse.data);

      // Check all possible property names
      const possibleData = leaderboardResponse.data.users ||
        leaderboardResponse.data.leaderboard ||
        (Array.isArray(leaderboardResponse.data) ? leaderboardResponse.data : []);

      console.log('Extracted leaderboard data:', possibleData);
      setLeaderboard(possibleData);
      setLeaderboardLoading(false);
    } catch (error) {
      console.error('Failed to load game data:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load game data');
      toast.error(errorMessage);
      setLeaderboardLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Self learning activity handlers
  const handleMiniAnswerChange = (miniQuestionId: string, field: 'linkUrl' | 'notes', value: string) => {
    setMiniAnswers(prev => ({
      ...prev,
      [miniQuestionId]: {
        ...prev[miniQuestionId],
        [field]: value
      }
    }));

    // Validate URL in real-time if it's the linkUrl field
    if (field === 'linkUrl') {
      const validation = validateUrl(value);
      setUrlValidation(prev => ({
        ...prev,
        [miniQuestionId]: validation
      }));
    }
  };

  const handleMiniAnswerSubmit = async (miniQuestionId: string) => {
    try {
      setSubmittingMini(miniQuestionId);
      const answerData = miniAnswers[miniQuestionId];
      
      if (!answerData.linkUrl.trim()) {
        toast.error('Please provide a link URL');
        return;
      }

      // Auto-add protocol if missing
      let linkUrl = answerData.linkUrl.trim();
      if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
        linkUrl = 'https://' + linkUrl;
      }

      await gameService.submitMiniAnswer({
        miniQuestionId,
        linkUrl: linkUrl,
        notes: answerData.notes.trim()
      });

      toast.success('Self learning activity answer submitted successfully!');
      await loadGameData(); // Refresh data
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit mini answer';
      toast.error(errorMessage);
    } finally {
      setSubmittingMini(null);
    }
  };

  // Main question submission handler
  const handleMainAnswerSubmit = async () => {
    if (!answerContent.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    try {
      setSubmitting(true);
      await gameService.submitAnswer(answerContent.trim(), answerFile);
      toast.success('Answer submitted successfully!');
      
      // Clear form
      setAnswerContent('');
      setAnswerFile(null);
      
      // Refresh data
      await loadGameData();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit answer';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTrailProgress = () => {
    if (!progress) return null;

    const steps = Array.from({ length: progress.totalSteps }, (_, i) => i + 1);

    return (
      <div className="relative mb-8">
        {/* Railway Track */}
        <div className="relative h-24 bg-gradient-to-r from-amber-100 to-amber-50 rounded-lg overflow-hidden shadow-inner">
          {/* Rails */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
          <div className="absolute top-14 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>

          {/* Railway Ties */}
          {steps.map((step) => (
            <div
              key={step}
              className="absolute top-6 w-1 h-12 bg-amber-800 opacity-70"
              style={{ left: `${(step / progress.totalSteps) * 100}%` }}
            ></div>
          ))}

          {/* Train */}
          <div
            className={`absolute top-2 transition-all duration-1000 ease-out ${showTrainAnimation ? 'transform scale-110' : ''
              }`}
            style={{
              left: `${(progress.currentStep / progress.totalSteps) * 95}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="relative">
              <span className="text-6xl drop-shadow-lg">🚂</span>
              {showTrainAnimation && (
                <div className="absolute -top-2 -right-2 animate-ping">
                  <span className="text-2xl">💨</span>
                </div>
              )}
            </div>
          </div>

          {/* Station Markers */}
          {steps.map((step) => (
            <div
              key={step}
              className="absolute top-16 transform -translate-x-1/2"
              style={{ left: `${(step / progress.totalSteps) * 100}%` }}
            >
              <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center text-xs font-bold transition-all duration-300 ${step <= progress.currentStep
                  ? 'bg-accent-500 border-accent-600 text-white shadow-lg'
                  : step === progress.currentStep + 1
                    ? 'bg-secondary-500 border-secondary-600 text-white animate-pulse shadow-lg'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                {step}
              </div>
              <div className="text-xs text-center mt-1 font-medium text-gray-600">
                {step <= progress.currentStep ? '✓' : step === progress.currentStep + 1 ? '⭐' : '○'}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-lg border border-primary-100">
            <div className="text-2xl font-bold text-primary-600">{progress.currentStep}</div>
            <div className="text-sm text-gray-600">Steps Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-lg border border-green-100">
            <div className="text-2xl font-bold text-accent-600">{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</div>
            <div className="text-sm text-gray-600">Progress</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-lg border border-primary-100">
            <div className="text-2xl font-bold text-primary-600">{progress.totalSteps - progress.currentStep}</div>
            <div className="text-sm text-gray-600">Steps Remaining</div>
          </div>
        </div>
      </div>
    );
  };

  // Render self learning activities grouped by main question
  const renderMiniQuestions = () => {
    console.log('renderMiniQuestions called');
    console.log('miniQuestions:', miniQuestions);
    console.log('miniQuestions length:', miniQuestions?.length || 0);
    
    if (!miniQuestions || miniQuestions.length === 0) {
      console.log('No self learning activities to render');
      return (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl mr-3">🎯</span>
              <div className="text-center">
                <h3 className="text-xl font-bold text-secondary-800">Learning Activities</h3>
                <p className="text-secondary-600">No self learning activities available yet</p>
              </div>
            </div>
            <p className="text-secondary-700 text-center">
              Self learning activities will appear here when they are released. Check back soon!
            </p>
          </div>
        </div>
      );
    }

    // Group self learning activities by their main question
    const groupedMiniQuestions = miniQuestions.reduce((groups, miniQuestion) => {
      const questionKey = `Q${miniQuestion.questionNumber}`;
      const questionTitle = miniQuestion.questionTitle || `Question ${miniQuestion.questionNumber}`;
      
      if (!groups[questionKey]) {
        groups[questionKey] = {
          questionNumber: miniQuestion.questionNumber ?? 0,
          questionTitle: questionTitle,
          miniQuestions: []
        };
      }
      
      groups[questionKey].miniQuestions.push(miniQuestion);
      return groups;
    }, {} as Record<string, { questionNumber: number; questionTitle: string; miniQuestions: MiniQuestion[] }>);

    // Auto-expand the first question group by default
    const firstQuestionKey = Object.keys(groupedMiniQuestions)[0];
    if (firstQuestionKey && expandedQuestions[firstQuestionKey] === undefined) {
      setExpandedQuestions(prev => ({ ...prev, [firstQuestionKey]: true }));
    }

    const completedMiniQuestions = miniQuestions.filter(mq => mq.hasAnswer).length;
    const totalMiniQuestions = miniQuestions.length;
    const allMiniQuestionsCompleted = completedMiniQuestions === totalMiniQuestions;

    const toggleQuestionGroup = (questionKey: string) => {
      setExpandedQuestions(prev => ({
        ...prev,
        [questionKey]: !prev[questionKey]
      }));
    };

    return (
      <div className="mb-8">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              <div>
                <h3 className="text-xl font-bold text-primary-800">Learning Activities</h3>
                <p className="text-primary-600">Complete these activities by providing relevant links</p>
              </div>
            </div>
            <div className="bg-primary-100 rounded-lg px-3 py-1">
              <span className="text-primary-800 font-semibold">
                {completedMiniQuestions}/{totalMiniQuestions} completed
              </span>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-primary-600 mb-1">
              <span>Overall Progress</span>
              <span>{totalMiniQuestions > 0 ? Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalMiniQuestions > 0 ? (completedMiniQuestions / totalMiniQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Grouped Self Learning Activities */}
          <div className="space-y-4">
            {Object.entries(groupedMiniQuestions).map(([questionKey, group]) => {
              const isExpanded = expandedQuestions[questionKey];
              const groupCompleted = group.miniQuestions.filter(mq => mq.hasAnswer).length;
              const groupTotal = group.miniQuestions.length;
              const isFullyCompleted = groupCompleted === groupTotal;

              return (
                <div key={questionKey} className="border border-primary-200 rounded-lg overflow-hidden">
                  {/* Question Group Header */}
                  <div
                    className={`p-4 cursor-pointer transition-colors ${
                      isFullyCompleted 
                        ? 'bg-accent-50 hover:bg-accent-100 border-accent-200' 
                        : 'bg-white hover:bg-primary-50'
                    }`}
                    onClick={() => toggleQuestionGroup(questionKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">
                          {isFullyCompleted ? '✅' : '📝'}
                        </span>
                        <div>
                          <h4 className={`font-semibold ${
                            isFullyCompleted ? 'text-accent-800' : 'text-primary-800'
                          }`}>
                            {questionKey}: {group.questionTitle}
                          </h4>
                          <p className={`text-sm ${
                            isFullyCompleted ? 'text-accent-600' : 'text-primary-600'
                          }`}>
                            {groupCompleted}/{groupTotal} activities completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Progress indicator */}
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isFullyCompleted ? 'bg-accent-500' : 'bg-primary-500'
                              }`}
                              style={{ width: `${(groupCompleted / groupTotal) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 min-w-[3rem]">
                            {Math.round((groupCompleted / groupTotal) * 100)}%
                          </span>
                        </div>
                        {/* Expand/Collapse Icon */}
                        <div className={`transform transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}>
                          <span className="text-primary-600 text-xl">▼</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Group Content */}
                  {isExpanded && (
                    <div className="border-t border-primary-100 bg-gray-50">
                      <div className="p-4 space-y-3">
                        {group.miniQuestions.map((miniQuestion, index) => (
                          <div 
                            key={miniQuestion.id}
                            className={`border rounded-lg p-4 ${
                              miniQuestion.hasAnswer ? 'bg-accent-50 border-accent-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">
                                  {miniQuestion.hasAnswer ? '✅' : '❓'}
                                </span>
                                <div>
                                  <h5 className="font-semibold text-gray-800">
                                    #{index + 1}: {miniQuestion.title}
                                  </h5>
                                  <p className="text-sm text-gray-600">{miniQuestion.question}</p>
                                  {miniQuestion.description && (
                                    <p className="text-xs text-gray-500 mt-1">{miniQuestion.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {miniQuestion.hasAnswer ? (
                              <div className="bg-accent-100 rounded-lg p-3">
                                <p className="text-accent-800 font-medium mb-2">✅ Completed</p>
                                <div className="text-sm text-accent-700">
                                  <p><strong>Link:</strong> <a href={miniQuestion.answer?.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{miniQuestion.answer?.linkUrl}</a></p>
                                  {miniQuestion.answer?.notes && (
                                    <p className="mt-1"><strong>Notes:</strong> {miniQuestion.answer.notes}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Link URL *
                                  </label>
                                  <input
                                    type="url"
                                    value={miniAnswers[miniQuestion.id]?.linkUrl || ''}
                                    onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'linkUrl', e.target.value)}
                                    placeholder="https://example.com/article"
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                                      urlValidation[miniQuestion.id]?.isValid === false && miniAnswers[miniQuestion.id]?.linkUrl
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : urlValidation[miniQuestion.id]?.isValid === true
                                          ? 'border-accent-300 focus:ring-accent-500 focus:border-accent-500'
                                          : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                    }`}
                                  />
                                  {urlValidation[miniQuestion.id]?.message && (
                                    <p className={`text-xs mt-1 ${
                                      urlValidation[miniQuestion.id]?.isValid 
                                        ? 'text-accent-600' 
                                        : 'text-red-500'
                                    }`}>
                                      {urlValidation[miniQuestion.id]?.message}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (optional)
                                  </label>
                                  <textarea
                                    value={miniAnswers[miniQuestion.id]?.notes || ''}
                                    onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'notes', e.target.value)}
                                    placeholder="Add any additional notes or thoughts..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  />
                                </div>
                                <button
                                  onClick={() => handleMiniAnswerSubmit(miniQuestion.id)}
                                  disabled={submittingMini === miniQuestion.id || !miniAnswers[miniQuestion.id]?.linkUrl?.trim()}
                                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {submittingMini === miniQuestion.id ? (
                                    <div className="flex items-center">
                                      <span className="animate-spin mr-2">⏳</span>
                                      Submitting...
                                    </div>
                                  ) : (
                                    'Submit Answer'
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allMiniQuestionsCompleted && (
            <div className="mt-6 bg-accent-100 border border-accent-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-accent-600 text-xl mr-3">🎉</span>
                <div>
                  <p className="text-accent-800 font-medium">Excellent work!</p>
                  <p className="text-accent-700 text-sm">You've completed all available self learning activities for this assignment.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentQuestion = () => {
    // Check if all self learning activities are completed
    const completedMiniQuestions = miniQuestions.filter(mq => mq.hasAnswer).length;
    const totalMiniQuestions = miniQuestions.length;
    const allMiniQuestionsCompleted = totalMiniQuestions > 0 && completedMiniQuestions === totalMiniQuestions;

    // Only show main question form if all self learning activities are completed
    if (!allMiniQuestionsCompleted || !currentQuestion || totalMiniQuestions === 0) {
      return null;
    }

    // Check if user has already answered this question
    const hasAnswered = progress?.answers?.some(answer => 
      answer.question.id === currentQuestion.id
    );

    return (
      <div className="mb-8">
        <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">📝</span>
              <div>
                <h3 className="text-xl font-bold text-accent-800">Main Assignment</h3>
                <p className="text-accent-600">Ready to submit your main answer</p>
              </div>
            </div>
            <div className="bg-accent-100 rounded-lg px-3 py-1">
              <span className="text-accent-800 font-semibold">
                {hasAnswered ? 'Completed' : 'Available'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 border border-accent-200">
            <h4 className="font-semibold text-gray-800 mb-2">
              Question {currentQuestion.questionNumber}: {currentQuestion.title}
            </h4>
            <p className="text-gray-700 mb-2">{currentQuestion.description}</p>
            {currentQuestion.content && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className="text-sm text-gray-600">{currentQuestion.content}</p>
              </div>
            )}
          </div>

          {hasAnswered ? (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-3">✅</span>
                <div>
                  <p className="text-green-800 font-medium">Answer Submitted</p>
                  <p className="text-green-700 text-sm">Your answer has been submitted and is awaiting review.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer *
                </label>
                <textarea
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  placeholder="Write your detailed answer here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment (optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                {answerFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {answerFile.name} ({Math.round(answerFile.size / 1024)} KB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
                </p>
              </div>

              <button
                onClick={handleMainAnswerSubmit}
                disabled={submitting || !answerContent.trim()}
                className="bg-accent-600 text-white px-6 py-3 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting Answer...
                  </div>
                ) : (
                  'Submit Main Answer'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    console.log('renderLeaderboard called, leaderboard:', leaderboard);
    console.log('leaderboard length:', leaderboard?.length);

    if (leaderboardLoading) {
      return (
        <div className="mt-12 mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center flex items-center justify-center">
            <span className="mr-3">🏆</span>
            Trail Leaderboard
            <span className="ml-3">🚂</span>
          </h3>
          <div className="text-center text-gray-500">
            Loading leaderboard...
          </div>
        </div>
      );
    }

    if (!leaderboard || leaderboard.length === 0) {
      console.log('No leaderboard data, showing empty state');
      return (
        <div className="mt-12 mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center flex items-center justify-center">
            <span className="mr-3">🏆</span>
            Trail Leaderboard
            <span className="ml-3">🚂</span>
          </h3>
          <div className="text-center py-12 bg-gradient-to-r from-primary-50 via-primary-100 to-secondary-50 rounded-2xl shadow-xl border border-primary-100">
            <div className="text-6xl mb-4">🚂</div>
            <h4 className="text-xl font-semibold text-gray-700 mb-2">All Trains Are Still at the Station!</h4>
            <p className="text-gray-600 max-w-md mx-auto">
              The journey hasn't begun yet. Be the first to answer questions and start your adventure on the trail!
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium">
              <span>🎯</span>
              <span className="ml-2">Ready to embark? Answer your first question below!</span>
            </div>
          </div>
        </div>
      );
    }

    console.log('Rendering leaderboard with', leaderboard.length, 'users');

    const totalReleasedQuestions = getTotalReleasedQuestions();

    return (
      <div className="mt-12 mb-8">
        <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center flex items-center justify-center">
          <span className="mr-3">🏆</span>
          Trail Leaderboard
          <span className="ml-3">🚂</span>
        </h3>

        {/* Leaderboard Railway Track */}
        <div className="relative bg-gradient-to-r from-primary-50 via-primary-100 to-secondary-50 rounded-2xl p-8 shadow-xl border border-primary-100">
          <div className="relative h-32 bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl overflow-hidden shadow-inner">
            {/* Rails */}
            <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
            <div className="absolute top-18 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>

            {/* Railway Ties */}
            {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className="absolute top-8 w-1 h-16 bg-amber-800 opacity-70"
                style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
              ></div>
            ))}

            {/* Station Markers */}
            {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className="absolute top-2 transform -translate-x-1/2"
                style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
              >
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-gray-300">
                  <span className="text-xs font-bold text-gray-600">{step}</span>
                </div>
              </div>
            ))}

            {/* All User Trains */}
            {leaderboard.map((user, index) => {
              const position = Math.max(1, user.currentStep) / totalReleasedQuestions * 100;
              const isCurrentUser = currentUser && user.id === currentUser.id;

              return (
                <div
                  key={user.id}
                  className="absolute transform -translate-x-1/2 transition-all duration-1000"
                  style={{
                    left: `${position}%`,
                    top: `${24 + (index * 8)}px`, // Stack trains vertically if at same position
                    zIndex: isCurrentUser ? 20 : 10
                  }}
                >
                  <div className={`relative ${isCurrentUser ? 'animate-bounce' : ''}`}>
                    {/* Train Emoji */}
                    <span className={`text-2xl ${isCurrentUser ? 'filter drop-shadow-lg' : ''}`}>
                      🚂
                    </span>

                    {/* User Info Tooltip */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 min-w-max">
                      <div className="text-xs font-bold text-gray-800">{user.trainName}</div>
                      <div className="text-xs text-gray-600">{user.fullName}</div>
                      <div className="text-xs font-semibold text-primary-600">Step {user.currentStep}/{totalReleasedQuestions}</div>
                    </div>

                    {/* Rank Badge */}
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table */}
          <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
              <h4 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">📊</span>
                Current Rankings
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.map((user, index) => {
                const isCurrentUser = currentUser && user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    className={`px-6 py-4 transition-colors ${isCurrentUser
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 border-l-4 border-primary-500'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${index === 0 ? 'bg-secondary-500' :
                            index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-secondary-600' : 'bg-primary-500'
                          }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className={`font-semibold flex items-center ${isCurrentUser ? 'text-primary-800' : 'text-gray-800'
                            }`}>
                            🚂 {user.trainName}
                            <span className="ml-2 text-sm text-gray-500">({user.fullName})</span>
                            {isCurrentUser && (
                              <span className="ml-2 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${isCurrentUser ? 'text-primary-700' : 'text-primary-600'
                          }`}>
                          {user.currentStep}/{totalReleasedQuestions}
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.round((user.currentStep / totalReleasedQuestions) * 100)}% Complete
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModules = () => {
    if (!modules || modules.length === 0) {
      return (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center flex items-center justify-center">
            <span className="mr-3">📚</span>
            Released Assignments
          </h2>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-secondary-800 mb-2">
              No Assignments Available
            </h3>
            <p className="text-secondary-700">
              Assignments will be released soon. Check back later!
            </p>
          </div>
        </div>
      );
    }

    const toggleModule = (moduleId: string) => {
      setExpandedModules(prev => ({
        ...prev,
        [moduleId]: !prev[moduleId]
      }));
    };

    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center flex items-center justify-center">
          <span className="mr-3">📚</span>
          Released Assignments
        </h2>
        <div className="space-y-6">
          {modules.map((module) => {
            const isExpanded = expandedModules[module.id];
            const isReleased = module.isReleased;

            return (
              <div
                key={module.id}
                className={`rounded-xl shadow-lg border transition-all duration-300 ${isReleased
                    ? 'bg-white border-primary-200 hover:shadow-xl'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
              >
                {/* Module Header */}
                <div
                  className={`p-6 ${isReleased
                      ? 'cursor-pointer hover:bg-primary-50'
                      : 'cursor-not-allowed'
                    } transition-colors duration-200`}
                  onClick={() => isReleased && toggleModule(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-3xl mr-4">
                        {isReleased ? '📘' : '🔒'}
                      </span>
                      <div>
                        <h3 className={`text-xl font-bold ${isReleased ? 'text-primary-800' : 'text-gray-500'
                          }`}>
                          Module {module.moduleNumber}: {module.title}
                        </h3>
                        <p className={`text-sm ${isReleased ? 'text-primary-600' : 'text-gray-400'
                          }`}>
                          {isReleased ? module.description : 'Module not yet released'}
                        </p>
                        {isReleased && (
                          <p className="text-xs text-gray-500 mt-1">
                            Deadline: {new Date(module.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isReleased && (
                        <>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                            {module.topics.length} Topic{module.topics.length !== 1 ? 's' : ''}
                          </span>
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}>
                            <span className="text-xl text-blue-600">▼</span>
                          </div>
                        </>
                      )}
                      {!isReleased && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Module Topics (Collapsible) */}
                {isReleased && isExpanded && (
                  <div className="border-t border-blue-100 bg-blue-25">
                    <div className="p-6 space-y-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📋</span>
                        Assignments in this Module
                      </h4>
                      {module.topics.length > 0 ? (
                        <div className="space-y-3">
                          {module.topics.map((topic) => {
                            const topicIsReleased = topic.isReleased;
                            
                            // Get self learning activities for this topic/question
                            const topicMiniQuestions = miniQuestions.filter(mq => 
                              mq.questionId === topic.id || 
                              mq.questionNumber === topic.topicNumber ||
                              mq.contentId === topic.id
                            );
                            
                            const hasMiniQuestions = topicMiniQuestions.length > 0;
                            const completedMiniQuestions = topicMiniQuestions.filter(mq => mq.hasAnswer).length;
                            const allMiniQuestionsCompleted = !hasMiniQuestions || completedMiniQuestions === topicMiniQuestions.length;
                            
                            // Fixed logic: Show first question in first module if released, 
                            // enable if self learning activities completed or no self learning activities
                            let shouldShow = false;
                            let isDisabled = false;
                            
                            if (topicIsReleased) {
                              shouldShow = true; // Always show if the topic is released
                              
                              // Only disable if there are self learning activities AND they're not all completed
                              if (hasMiniQuestions && !allMiniQuestionsCompleted) {
                                isDisabled = true; // Disable if has self learning activities but not all completed
                              } else {
                                isDisabled = false; // Enable if no self learning activities or all completed
                              }
                            }
                            
                            // Debug logging for Topic 1 only (can be removed later)
                            if (topic.topicNumber === 1) {
                              console.log('✅ Topic 1 Status:', {
                                title: topic.title,
                                hasContent: !!topic.content,
                                contentLength: topic.content?.length || 0,
                                isReleased: topicIsReleased,
                                isDisabled: isDisabled,
                                miniQuestionsCompleted: `${completedMiniQuestions}/${topicMiniQuestions.length}`,
                                willShowContent: topicIsReleased && topic.content && !isDisabled
                              });
                            }
                            
                            if (!shouldShow) {
                              return null;
                            }
                            
                            return (
                              <div
                                key={topic.id}
                                className={`rounded-lg p-4 border transition-all duration-200 ${
                                  isDisabled 
                                    ? 'bg-orange-50 border-orange-200 opacity-90' 
                                    : topicIsReleased
                                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                      : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="text-xl mr-3">
                                      {isDisabled ? '🔐' : topicIsReleased ? '📝' : '🔒'}
                                    </span>
                                    <div>
                                      <h5 className={`font-medium ${
                                        isDisabled 
                                          ? 'text-orange-800' 
                                          : topicIsReleased 
                                            ? 'text-green-800' 
                                            : 'text-gray-500'
                                      }`}>
                                        Topic {topic.topicNumber}: {topic.title}
                                      </h5>
                                      <p className={`text-sm ${
                                        isDisabled 
                                          ? 'text-orange-600' 
                                          : topicIsReleased 
                                            ? 'text-green-600' 
                                            : 'text-gray-400'
                                      }`}>
                                        {isDisabled 
                                          ? `Complete ${topicMiniQuestions.length - completedMiniQuestions} more activity${topicMiniQuestions.length - completedMiniQuestions !== 1 ? 'ies' : 'y'} to unlock`
                                          : topicIsReleased 
                                            ? topic.description 
                                            : 'Topic not yet released'
                                        }
                                      </p>
                                      {topicIsReleased && (
                                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                                          <span>Deadline: {new Date(topic.deadline).toLocaleDateString()}</span>
                                          <span>Points: {topic.points}</span>
                                          {topic.bonusPoints > 0 && (
                                            <span className="text-amber-600">
                                              Bonus: {topic.bonusPoints}
                                            </span>
                                          )}
                                          {hasMiniQuestions && (
                                            <span className={`font-medium ${
                                              allMiniQuestionsCompleted 
                                                ? 'text-green-600' 
                                                : 'text-orange-600'
                                            }`}>
                                              Self Learning: {completedMiniQuestions}/{topicMiniQuestions.length}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isDisabled ? (
                                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      Locked
                                    </span>
                                  ) : topicIsReleased ? (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      Available
                                    </span>
                                  ) : (
                                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      Locked
                                    </span>
                                  )}
                                </div>
                                {topicIsReleased && topic.content && !isDisabled && (
                                  <div className="mt-3 p-3 bg-white rounded border border-green-100">
                                    <p className="text-sm text-gray-700">
                                      {topic.content}
                                    </p>
                                  </div>
                                )}
                                {topicIsReleased && isDisabled && hasMiniQuestions && (
                                  <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-200">
                                    <div className="flex items-center text-orange-800 text-sm font-medium mb-2">
                                      <span className="mr-2">🎯</span>
                                      Complete Self Learning Activities First
                                    </div>
                                    <p className="text-xs text-orange-700">
                                      You need to complete all {topicMiniQuestions.length} self learning activities above before you can access this main question.
                                    </p>
                                    <div className="mt-2">
                                      <div className="w-full bg-orange-200 rounded-full h-2">
                                        <div
                                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${(completedMiniQuestions / topicMiniQuestions.length) * 100}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-orange-600 mt-1">
                                        Progress: {completedMiniQuestions}/{topicMiniQuestions.length} activities completed
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl mb-2 block">📝</span>
                          <p>No topics available in this module yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnswerHistory = () => {
    if (!progress?.answers || progress.answers.length === 0) return null;

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-3">📚</span>
          Your Journey History
        </h3>
        <div className="space-y-4">
          {progress.answers.map((answer) => (
            <div
              key={answer.id}
              className={`rounded-xl p-6 shadow-lg border transition-all duration-200 hover:shadow-xl ${answer.status === 'APPROVED'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : answer.status === 'REJECTED'
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {answer.status === 'APPROVED' ? '✅' : answer.status === 'REJECTED' ? '❌' : '⏳'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Question {answer.question.questionNumber}
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      Status: {answer.status}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(answer.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">"{answer.content}"</p>

              {/* Show feedback if available */}
              {answer.feedback && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${answer.status === 'APPROVED'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                  }`}>
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Admin Feedback:
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    "{answer.feedback}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    console.log('GameView: Still loading...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">🚂</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-4xl">💨</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading your trail adventure...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  console.log('GameView: Rendering main content');
  console.log('GameView: miniQuestions length:', miniQuestions?.length || 0);

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
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4 space-x-8">
            <img 
              src="./src/assets/BVisionRY.png" 
              alt="BVisionRY Company Logo" 
              className="w-44 h-16 px-3 py-2 bvisionary-logo"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                BVisionRY Lighthouse
              </h1>
              <p className="text-xl text-gray-600">Your Adventure Journey</p>
            </div>
            <img 
              src="./src/assets/Lighthouse.png" 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Leaderboard - All Users' Train Progress */}
        {renderLeaderboard()}

        {/* Released Assignments (Modules) */}
        {renderModules()}

        {/* Individual Trail Progress */}
        {renderTrailProgress()}

        {/* Active Questions Section - Hidden as per user requirements */}
        {/* {renderActiveQuestions()} */}

        {/* Self Learning Activities Section */}
        <div id="mini-questions-section">
          {renderMiniQuestions()}
        </div>

        {/* Current Question - Hidden until self learning activities completed */}
        <div id="current-question-section">
          {renderCurrentQuestion()}
        </div>

        {/* Answer History */}
        {renderAnswerHistory()}
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

export default GameView;
