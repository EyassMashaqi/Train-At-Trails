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
  const [loading, setLoading] = useState(true);
  const [showTrainAnimation] = useState(false); // Static false - animation triggered by main questions which are disabled
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  // Mini questions state
  const [miniQuestions, setMiniQuestions] = useState<MiniQuestion[]>([]);
  const [miniAnswers, setMiniAnswers] = useState<Record<string, { linkUrl: string; notes: string }>>({});
  const [submittingMini, setSubmittingMini] = useState<string | null>(null);
  
  const navigate = useNavigate();

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

    // Default to 12 if no released questions found (fallback)
    return Math.max(totalReleased, 12);
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

      // Set mini questions if available
      console.log('Checking currentQuestionMiniQuestions:', data.currentQuestionMiniQuestions);
      if (data.currentQuestionMiniQuestions) {
        console.log('Setting mini questions:', data.currentQuestionMiniQuestions.length);
        setMiniQuestions(data.currentQuestionMiniQuestions);
        
        // Initialize mini answers state with existing answers
        const initialMiniAnswers: Record<string, { linkUrl: string; notes: string }> = {};
        data.currentQuestionMiniQuestions.forEach((mq: MiniQuestion) => {
          if (mq.hasAnswer && mq.answer) {
            initialMiniAnswers[mq.id] = {
              linkUrl: mq.answer.linkUrl || '',
              notes: mq.answer.notes || ''
            };
          } else {
            initialMiniAnswers[mq.id] = { linkUrl: '', notes: '' };
          }
        });
        setMiniAnswers(initialMiniAnswers);
      } else {
        console.log('No currentQuestionMiniQuestions in response');
        setMiniQuestions([]);
      }

      // Set current topic data if available
      // Note: currentTopic functionality is disabled as we focus on mini questions only
      // if (data.currentTopicData) {
      //   setCurrentTopic(data.currentTopicData);
      // }

      // Set modules data
      setModules(modulesResponse.data.modules || []);

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
    } catch (error) {
      console.error('Failed to load game data:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load game data');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Mini questions handlers
  const handleMiniAnswerChange = (miniQuestionId: string, field: 'linkUrl' | 'notes', value: string) => {
    setMiniAnswers(prev => ({
      ...prev,
      [miniQuestionId]: {
        ...prev[miniQuestionId],
        [field]: value
      }
    }));
  };

  const handleMiniAnswerSubmit = async (miniQuestionId: string) => {
    try {
      setSubmittingMini(miniQuestionId);
      const answerData = miniAnswers[miniQuestionId];
      
      if (!answerData.linkUrl.trim()) {
        toast.error('Please provide a link URL');
        return;
      }

      await gameService.submitMiniAnswer({
        miniQuestionId,
        linkUrl: answerData.linkUrl.trim(),
        notes: answerData.notes.trim()
      });

      toast.success('Mini question answer submitted successfully!');
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
                  ? 'bg-green-500 border-green-600 text-white shadow-lg'
                  : step === progress.currentStep + 1
                    ? 'bg-blue-500 border-blue-600 text-white animate-pulse shadow-lg'
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
          <div className="bg-white rounded-lg p-4 shadow-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{progress.currentStep}</div>
            <div className="text-sm text-gray-600">Steps Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-lg border border-green-100">
            <div className="text-2xl font-bold text-green-600">{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</div>
            <div className="text-sm text-gray-600">Progress</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-lg border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{progress.totalSteps - progress.currentStep}</div>
            <div className="text-sm text-gray-600">Steps Remaining</div>
          </div>
        </div>
      </div>
    );
  };

  // Render mini questions
  const renderMiniQuestions = () => {
    console.log('renderMiniQuestions called');
    console.log('miniQuestions:', miniQuestions);
    console.log('miniQuestions length:', miniQuestions?.length || 0);
    
    if (!miniQuestions || miniQuestions.length === 0) {
      console.log('No mini questions to render');
      return (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl mr-3">🎯</span>
              <div className="text-center">
                <h3 className="text-xl font-bold text-yellow-800">Learning Activities</h3>
                <p className="text-yellow-600">No mini questions available yet</p>
              </div>
            </div>
            <p className="text-yellow-700 text-center">
              Mini questions will appear here when they are released. Check back soon!
            </p>
          </div>
        </div>
      );
    }

    const completedMiniQuestions = miniQuestions.filter(mq => mq.hasAnswer).length;
    const totalMiniQuestions = miniQuestions.length;
    const allMiniQuestionsCompleted = completedMiniQuestions === totalMiniQuestions;

    return (
      <div className="mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              <div>
                <h3 className="text-xl font-bold text-purple-800">Learning Activities</h3>
                <p className="text-purple-600">Complete these activities by providing relevant links</p>
              </div>
            </div>
            <div className="bg-purple-100 rounded-lg px-3 py-1">
              <span className="text-purple-800 font-semibold">
                {completedMiniQuestions}/{totalMiniQuestions} completed
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-purple-600 mb-1">
              <span>Progress</span>
              <span>{totalMiniQuestions > 0 ? Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalMiniQuestions > 0 ? (completedMiniQuestions / totalMiniQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Mini Questions List */}
          <div className="space-y-4">
            {miniQuestions.map((miniQuestion, index) => (
              <div 
                key={miniQuestion.id}
                className={`border rounded-lg p-4 ${
                  miniQuestion.hasAnswer ? 'bg-green-50 border-green-200' : 'bg-white border-purple-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {miniQuestion.hasAnswer ? '✅' : '❓'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          Q{miniQuestion.questionNumber}: {miniQuestion.questionTitle}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800">
                        #{index + 1}: {miniQuestion.title}
                      </h4>
                      <p className="text-sm text-gray-600">{miniQuestion.question}</p>
                      {miniQuestion.description && (
                        <p className="text-xs text-gray-500 mt-1">{miniQuestion.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {miniQuestion.hasAnswer ? (
                  <div className="bg-green-100 rounded-lg p-3">
                    <p className="text-green-800 font-medium mb-2">✅ Completed</p>
                    <div className="text-sm text-green-700">
                      <p><strong>Link:</strong> <a href={miniQuestion.answer?.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{miniQuestion.answer?.linkUrl}</a></p>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => handleMiniAnswerSubmit(miniQuestion.id)}
                      disabled={submittingMini === miniQuestion.id || !miniAnswers[miniQuestion.id]?.linkUrl?.trim()}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          {allMiniQuestionsCompleted && (
            <div className="mt-6 bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-3">🎉</span>
                <div>
                  <p className="text-green-800 font-medium">Excellent work!</p>
                  <p className="text-green-700 text-sm">You've completed all available mini questions for this assignment.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentQuestion = () => {
    // Hide main questions until mini questions are completed
    // Only show mini questions as per user requirements
    return null;
  };

  const renderLeaderboard = () => {
    console.log('renderLeaderboard called, leaderboard:', leaderboard);
    console.log('leaderboard length:', leaderboard?.length);

    if (!leaderboard || leaderboard.length === 0) {
      console.log('No leaderboard data, returning null');
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
        <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 shadow-xl border border-blue-100">
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
                      <div className="text-xs font-semibold text-blue-600">Step {user.currentStep}/{totalReleasedQuestions}</div>
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
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
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
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                          }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className={`font-semibold flex items-center ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                            🚂 {user.trainName}
                            <span className="ml-2 text-sm text-gray-500">({user.fullName})</span>
                            {isCurrentUser && (
                              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${isCurrentUser ? 'text-blue-700' : 'text-blue-600'
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
            <h3 className="text-2xl font-bold text-yellow-800 mb-2">
              No Assignments Available
            </h3>
            <p className="text-yellow-700">
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
                    ? 'bg-white border-blue-200 hover:shadow-xl'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
              >
                {/* Module Header */}
                <div
                  className={`p-6 ${isReleased
                      ? 'cursor-pointer hover:bg-blue-50'
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
                        <h3 className={`text-xl font-bold ${isReleased ? 'text-blue-800' : 'text-gray-500'
                          }`}>
                          Module {module.moduleNumber}: {module.title}
                        </h3>
                        <p className={`text-sm ${isReleased ? 'text-blue-600' : 'text-gray-400'
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
                            
                            // Get mini questions for this topic/question
                            const topicMiniQuestions = miniQuestions.filter(mq => 
                              mq.questionId === topic.id || mq.questionNumber === topic.topicNumber
                            );
                            
                            const hasMiniQuestions = topicMiniQuestions.length > 0;
                            const completedMiniQuestions = topicMiniQuestions.filter(mq => mq.hasAnswer).length;
                            const allMiniQuestionsCompleted = !hasMiniQuestions || completedMiniQuestions === topicMiniQuestions.length;
                            
                            // Hide main question based on user requirements:
                            // 1. If has mini questions and not all completed: hide completely
                            // 2. If has mini questions and all completed but main not released: hide
                            // 3. If has mini questions and all completed and main released: show as enabled
                            // 4. If no mini questions and main released: show as enabled
                            
                            let shouldShow = false;
                            let isDisabled = false;
                            
                            if (hasMiniQuestions) {
                              if (allMiniQuestionsCompleted && topicIsReleased) {
                                shouldShow = true;
                                isDisabled = false;
                              } else if (allMiniQuestionsCompleted && !topicIsReleased) {
                                shouldShow = false; // Hide until main question is released
                              } else {
                                shouldShow = false; // Hide until all mini questions completed
                              }
                            } else if (topicIsReleased) {
                              shouldShow = true;
                              isDisabled = false;
                            }
                            
                            // For now, hide all main questions as per user's current requirement
                            shouldShow = false;
                            
                            if (!shouldShow) {
                              return null;
                            }
                            
                            return (
                              <div
                                key={topic.id}
                                className={`rounded-lg p-4 border transition-all duration-200 ${
                                  isDisabled 
                                    ? 'bg-yellow-50 border-yellow-200 opacity-75' 
                                    : topicIsReleased
                                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                      : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="text-xl mr-3">
                                      {topicIsReleased ? '📝' : '🔒'}
                                    </span>
                                    <div>
                                      <h5 className={`font-medium ${topicIsReleased ? 'text-green-800' : 'text-gray-500'
                                        }`}>
                                        Topic {topic.topicNumber}: {topic.title}
                                      </h5>
                                      <p className={`text-sm ${topicIsReleased ? 'text-green-600' : 'text-gray-400'
                                        }`}>
                                        {topicIsReleased ? topic.description : 'Topic not yet released'}
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
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {topicIsReleased ? (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      Available
                                    </span>
                                  ) : (
                                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      Locked
                                    </span>
                                  )}
                                </div>
                                {topicIsReleased && topic.content && (
                                  <div className="mt-3 p-3 bg-white rounded border border-green-100">
                                    <p className="text-sm text-gray-700">
                                      {topic.content}
                                    </p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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

        {/* Mini Questions Section */}
        <div id="mini-questions-section">
          {renderMiniQuestions()}
        </div>

        {/* Current Question - Hidden until mini questions completed */}
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
