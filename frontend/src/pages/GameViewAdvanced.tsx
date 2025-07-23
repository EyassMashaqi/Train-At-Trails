import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { useNavigate } from 'react-router-dom';

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
  question: Question;
}

interface TrailProgress {
  currentStep: number;
  totalSteps: number;
  answers: Answer[];
}

const GameView: React.FC = () => {
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTrainAnimation, setShowTrainAnimation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const response = await gameService.getProgress();
      const data = response.data;
      
      // Extract progress and current question from the single response
      setProgress({
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answers: data.answers
      });
      setCurrentQuestion(data.currentQuestion);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !answer.trim()) return;

    try {
      setSubmitting(true);
      await gameService.submitAnswer(answer);
      toast.success('Answer submitted successfully! Waiting for admin approval.');
      setAnswer('');
      setShowTrainAnimation(true);
      setTimeout(() => setShowTrainAnimation(false), 3000);
      await loadGameData(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit answer');
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
                answer.status === 'approved'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : answer.status === 'rejected'
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                  : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {answer.status === 'approved' ? '✅' : answer.status === 'rejected' ? '❌' : '⏳'}
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
              <p className="text-gray-700 italic">"{answer.content}"</p>
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

        {/* Trail Progress */}
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
