import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';

interface Question {
  id: number;
  title: string;
  content: string;
  questionNumber: number;
  releaseDate: string;
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
      await loadGameData(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTrail = () => {
    if (!progress) return null;

    const steps = Array.from({ length: progress.totalSteps }, (_, i) => i + 1);

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">🚂 Trail Progress</h2>
        <div className="flex items-center justify-center overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`trail-step ${
                  step < progress.currentStep
                    ? 'completed'
                    : step === progress.currentStep
                    ? 'current'
                    : ''
                }`}
              >
                {step <= progress.currentStep ? (
                  step < progress.currentStep ? '✅' : '🚂'
                ) : (
                  step
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`trail-connection ${
                    step < progress.currentStep ? 'completed' : ''
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center mt-4">
          <p className="text-lg text-gray-700">
            Step {progress.currentStep} of {progress.totalSteps}
          </p>
        </div>
      </div>
    );
  };

  const renderCurrentQuestion = () => {
    if (!currentQuestion) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">No Question Available</h3>
          <p className="text-gray-600">
            Either you've completed all questions or the next question hasn't been released yet.
          </p>
        </div>
      );
    }

    const hasSubmittedAnswer = progress?.answers.some(
      answer => answer.question.id === currentQuestion.id
    );

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Question {currentQuestion.questionNumber}
          </h3>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Step {currentQuestion.questionNumber}
          </span>
        </div>
        
        <h4 className="text-lg font-medium text-gray-900 mb-3">
          {currentQuestion.title}
        </h4>
        
        <div className="prose max-w-none mb-6">
          <p className="text-gray-700">{currentQuestion.content}</p>
        </div>

        {hasSubmittedAnswer ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⏳</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Answer Submitted
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Your answer is waiting for admin approval. You'll be notified once it's reviewed!</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitAnswer}>
            <div className="mb-4">
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <textarea
                id="answer"
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your answer here..."
                required
                disabled={submitting}
              />
            </div>
            
            <button
              type="submit"
              disabled={submitting || !answer.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <span className="text-lg">⏳</span>
                  <span className="ml-2">Submitting...</span>
                </div>
              ) : (
                'Submit Answer'
              )}
            </button>
          </form>
        )}
      </div>
    );
  };

  const renderAnswerHistory = () => {
    if (!progress?.answers.length) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Answer History</h3>
        <div className="space-y-4">
          {progress.answers.map((answer) => (
            <div key={answer.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  Question {answer.question.questionNumber}: {answer.question.title}
                </h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    answer.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : answer.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {answer.status.charAt(0).toUpperCase() + answer.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{answer.content}</p>
              <p className="text-xs text-gray-400">
                Submitted: {new Date(answer.submittedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">⏳</span>
          <p className="mt-4 text-gray-600">Loading your trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🚂 Train at Trails</h1>
          <p className="text-lg text-gray-600">Answer questions to move your train forward!</p>
        </div>

        {renderTrail()}

        <div className="space-y-6">
          {renderCurrentQuestion()}
          {renderAnswerHistory()}
        </div>
      </div>
    </div>
  );
};

export default GameView;
