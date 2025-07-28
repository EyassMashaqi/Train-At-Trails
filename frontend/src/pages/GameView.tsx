import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Question {
  id: number;
  title: string;
  content: string;
  questionNumber: number;
  releaseDate: string;
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
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTrainAnimation, setShowTrainAnimation] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

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
      
      // Extract progress and current question from the single response
      setProgress({
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answers: data.answers
      });
      setCurrentQuestion(data.currentQuestion);
      
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

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !answer.trim()) return;

    // Check if this is a resubmission (user has rejected answers for this question)
    const hasRejectedAnswers = progress?.answers?.some(
      answer => answer.question.questionNumber === currentQuestion.questionNumber && 
                answer.status === 'REJECTED'
    );

    try {
      setSubmitting(true);
      await gameService.submitAnswer(answer);
      
      if (hasRejectedAnswers) {
        toast.success('Answer resubmitted successfully! Waiting for admin review.');
      } else {
        toast.success('Answer submitted successfully! Waiting for admin approval.');
      }
      
      setAnswer('');
      setShowTrainAnimation(true);
      setTimeout(() => setShowTrainAnimation(false), 3000);
      await loadGameData(); // Refresh data
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to submit answer');
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
            className={`absolute top-2 transition-all duration-1000 ease-out ${
              showTrainAnimation ? 'transform scale-110' : ''
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
              <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step <= progress.currentStep
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

  const renderCurrentQuestion = () => {
    if (!currentQuestion) {
      return (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-yellow-800 mb-2">
            No Active Questions
          </h3>
          <p className="text-yellow-700 mb-4">
            Great job! Either you've completed all available questions or new ones will be released soon.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    // Check for rejected answers for this question
    const rejectedAnswers = progress?.answers?.filter(
      answer => answer.question.questionNumber === currentQuestion.questionNumber && 
                answer.status === 'REJECTED'
    ) || [];

    const latestRejectedAnswer = rejectedAnswers.length > 0 ? rejectedAnswers[0] : null;

    if (currentQuestion.hasAnswered) {
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 shadow-lg">
          <div className="flex items-center mb-6">
            <span className="text-4xl mr-4">✅</span>
            <div>
              <h3 className="text-2xl font-bold text-green-800">Question {currentQuestion.questionNumber}</h3>
              <p className="text-green-600">Answer submitted - awaiting review</p>
            </div>
          </div>
          <h4 className="text-xl font-semibold text-green-800 mb-3">{currentQuestion.title}</h4>
          <p className="text-green-700 mb-6">{currentQuestion.content}</p>
          <div className="bg-green-100 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              🎯 Your answer has been submitted and is being reviewed by our administrators. 
              You'll be notified once it's approved and you can move to the next station!
            </p>
          </div>
        </div>
      );
    }

    // If there's a rejected answer, show it and allow resubmission
    if (latestRejectedAnswer) {
      return (
        <div className="space-y-6">
          {/* Rejected Answer Display */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <span className="text-4xl mr-4">❌</span>
              <div>
                <h3 className="text-2xl font-bold text-red-800">Question {currentQuestion.questionNumber}</h3>
                <p className="text-red-600">Previous answer was not approved</p>
              </div>
            </div>
            <h4 className="text-xl font-semibold text-red-800 mb-3">{currentQuestion.title}</h4>
            <p className="text-red-700 mb-4">{currentQuestion.content}</p>
            
            {/* Show rejected answer */}
            <div className="bg-red-100 rounded-lg p-4 mb-4">
              <h5 className="font-semibold text-red-800 mb-2">Your Previous Answer:</h5>
              <p className="text-red-700 italic mb-2">"{latestRejectedAnswer.content}"</p>
              <p className="text-sm text-red-600">
                Submitted: {new Date(latestRejectedAnswer.submittedAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="bg-orange-100 rounded-lg p-4">
              <p className="text-orange-800 font-medium">
                📝 Your answer needs improvement. Please review the question and provide a new answer below.
              </p>
            </div>
          </div>

          {/* New Answer Form */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <span className="text-4xl mr-4">🔄</span>
              <div>
                <h3 className="text-2xl font-bold text-blue-800">Resubmit Your Answer</h3>
                <p className="text-blue-600">Try again with a better response</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Your New Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Share your thoughts and experiences... (Try to be more detailed and thoughtful)"
                  rows={6}
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 px-6 rounded-lg hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 font-medium text-lg shadow-lg"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <span className="animate-spin text-2xl mr-2">🔄</span>
                    <span>Resubmitting Answer...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🔄</span>
                    <span>Resubmit Answer</span>
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 shadow-lg">
        <div className="flex items-center mb-6">
          <span className="text-4xl mr-4">❓</span>
          <div>
            <h3 className="text-2xl font-bold text-blue-800">Question {currentQuestion.questionNumber}</h3>
            <p className="text-blue-600">Ready for your answer</p>
          </div>
        </div>
        
        <h4 className="text-xl font-semibold text-blue-800 mb-3">{currentQuestion.title}</h4>
        <p className="text-blue-700 mb-6 leading-relaxed">{currentQuestion.content}</p>
        
        <form onSubmit={handleSubmitAnswer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Your Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Share your thoughts and experiences..."
              rows={6}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 font-medium text-lg shadow-lg"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <span className="animate-spin text-2xl mr-2">🔄</span>
                <span>Submitting Answer...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-2">🚀</span>
                <span>Submit Answer</span>
              </div>
            )}
          </button>
        </form>
      </div>
    );
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
            {Array.from({ length: 12 }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className="absolute top-8 w-1 h-16 bg-amber-800 opacity-70"
                style={{ left: `${(step / 12) * 100}%` }}
              ></div>
            ))}
            
            {/* Station Markers */}
            {Array.from({ length: 12 }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className="absolute top-2 transform -translate-x-1/2"
                style={{ left: `${(step / 12) * 100}%` }}
              >
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-gray-300">
                  <span className="text-xs font-bold text-gray-600">{step}</span>
                </div>
              </div>
            ))}

            {/* All User Trains */}
            {leaderboard.map((user, index) => {
              const position = Math.max(1, user.currentStep) / 12 * 100;
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
                      <div className="text-xs font-semibold text-blue-600">Step {user.currentStep}/12</div>
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
                    className={`px-6 py-4 transition-colors ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className={`font-semibold flex items-center ${
                            isCurrentUser ? 'text-blue-800' : 'text-gray-800'
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
                        <div className={`font-bold text-lg ${
                          isCurrentUser ? 'text-blue-700' : 'text-blue-600'
                        }`}>
                          {user.currentStep}/12
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.round((user.currentStep / 12) * 100)}% Complete
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
                className={`rounded-xl shadow-lg border transition-all duration-300 ${
                  isReleased
                    ? 'bg-white border-blue-200 hover:shadow-xl'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                {/* Module Header */}
                <div
                  className={`p-6 ${
                    isReleased 
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
                        <h3 className={`text-xl font-bold ${
                          isReleased ? 'text-blue-800' : 'text-gray-500'
                        }`}>
                          Module {module.moduleNumber}: {module.title}
                        </h3>
                        <p className={`text-sm ${
                          isReleased ? 'text-blue-600' : 'text-gray-400'
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
                          <div className={`transform transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
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
                        Topics in this Module
                      </h4>
                      {module.topics.length > 0 ? (
                        <div className="space-y-3">
                          {module.topics.map((topic) => {
                            const topicIsReleased = topic.isReleased;
                            return (
                              <div
                                key={topic.id}
                                className={`rounded-lg p-4 border transition-all duration-200 ${
                                  topicIsReleased
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
                                      <h5 className={`font-medium ${
                                        topicIsReleased ? 'text-green-800' : 'text-gray-500'
                                      }`}>
                                        Topic {topic.topicNumber}: {topic.title}
                                      </h5>
                                      <p className={`text-sm ${
                                        topicIsReleased ? 'text-green-600' : 'text-gray-400'
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
              className={`rounded-xl p-6 shadow-lg border transition-all duration-200 hover:shadow-xl ${
                answer.status === 'APPROVED'
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
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                  answer.status === 'APPROVED' 
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
          <div className="flex justify-center items-center mb-4">
            <span className="text-6xl mr-4">🚂</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Train at Trails
              </h1>
              <p className="text-xl text-gray-600">Your Adventure Journey</p>
            </div>
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

        {/* Current Question */}
        {renderCurrentQuestion()}

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
