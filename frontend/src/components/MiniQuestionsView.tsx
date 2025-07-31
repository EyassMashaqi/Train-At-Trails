import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';

interface MiniQuestion {
  id: string;
  title: string;
  question: string;
  description?: string;
  orderIndex: number;
  isReleased: boolean;
  releaseDate?: string;
  hasAnswer: boolean;
  submittedAt?: string;
}

interface ContentSection {
  id: string;
  title: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
}

interface MiniQuestionProgress {
  totalContentSections: number;
  totalMiniQuestions: number;
  completedMiniQuestions: number;
  progressPercentage: number;
  canSolveMainQuestion: boolean;
  contents: ContentSection[];
}

interface MiniQuestionsViewProps {
  questionId: string;
  onProgressUpdate?: (canSolveMainQuestion: boolean) => void;
}

export const MiniQuestionsView: React.FC<MiniQuestionsViewProps> = ({ 
  questionId, 
  onProgressUpdate 
}) => {
  const [progress, setProgress] = useState<MiniQuestionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answerForms, setAnswerForms] = useState<Record<string, { linkUrl: string; notes: string }>>({});

  useEffect(() => {
    loadProgress();
  }, [questionId]);

  useEffect(() => {
    if (progress && onProgressUpdate) {
      onProgressUpdate(progress.canSolveMainQuestion);
    }
  }, [progress, onProgressUpdate]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await gameService.getContentProgress(questionId);
      setProgress(response.data.progress);
      
      // Initialize answer forms for unanswered questions
      const forms: Record<string, { linkUrl: string; notes: string }> = {};
      response.data.progress.contents.forEach((content: ContentSection) => {
        content.miniQuestions.forEach((mq: MiniQuestion) => {
          if (!mq.hasAnswer) {
            forms[mq.id] = { linkUrl: '', notes: '' };
          }
        });
      });
      setAnswerForms(forms);
    } catch (error) {
      console.error('Failed to load progress:', error);
      toast.error('Failed to load mini questions');
    } finally {
      setLoading(false);
    }
  };

  const submitMiniAnswer = async (miniQuestionId: string) => {
    try {
      setSubmittingId(miniQuestionId);
      const formData = answerForms[miniQuestionId];
      
      if (!formData?.linkUrl?.trim()) {
        toast.error('Please provide a link URL');
        return;
      }

      await gameService.submitMiniAnswer({
        miniQuestionId,
        linkUrl: formData.linkUrl.trim(),
        notes: formData.notes?.trim() || ''
      });

      toast.success('Mini question answer submitted successfully!');
      await loadProgress(); // Refresh progress
      
      // Clear the form
      setAnswerForms(prev => ({
        ...prev,
        [miniQuestionId]: { linkUrl: '', notes: '' }
      }));
    } catch (error: any) {
      console.error('Failed to submit mini answer:', error);
      toast.error(error?.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmittingId(null);
    }
  };

  const updateAnswerForm = (miniQuestionId: string, field: 'linkUrl' | 'notes', value: string) => {
    setAnswerForms(prev => ({
      ...prev,
      [miniQuestionId]: {
        ...prev[miniQuestionId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progress || progress.totalMiniQuestions === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">No mini questions available for this assignment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Mini Questions Progress</h3>
          <div className="text-sm text-gray-600">
            {progress.completedMiniQuestions}/{progress.totalMiniQuestions} completed
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress.progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{progress.progressPercentage}% complete</span>
          {progress.canSolveMainQuestion ? (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              ✅ Ready for main question
            </span>
          ) : (
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
              🔒 Complete mini questions first
            </span>
          )}
        </div>
      </div>

      {/* Mini Questions */}
      <div className="space-y-4">
        {progress.contents.map((content) => (
          <div key={content.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-800">{content.title}</h4>
            </div>
            
            <div className="divide-y divide-gray-100">
              {content.miniQuestions.map((miniQuestion) => (
                <div key={miniQuestion.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-800 mb-2">
                        {miniQuestion.title}
                      </h5>
                      <p className="text-gray-600 mb-3">{miniQuestion.question}</p>
                      {miniQuestion.description && (
                        <p className="text-sm text-gray-500 mb-3">{miniQuestion.description}</p>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {miniQuestion.hasAnswer ? (
                        <div className="flex items-center text-green-600">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-orange-600">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Form */}
                  {!miniQuestion.hasAnswer && answerForms[miniQuestion.id] && (
                    <div className="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Link URL *
                        </label>
                        <input
                          type="url"
                          value={answerForms[miniQuestion.id].linkUrl}
                          onChange={(e) => updateAnswerForm(miniQuestion.id, 'linkUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes (optional)
                        </label>
                        <textarea
                          value={answerForms[miniQuestion.id].notes}
                          onChange={(e) => updateAnswerForm(miniQuestion.id, 'notes', e.target.value)}
                          placeholder="Any additional notes..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <button
                        onClick={() => submitMiniAnswer(miniQuestion.id)}
                        disabled={submittingId === miniQuestion.id || !answerForms[miniQuestion.id].linkUrl.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                      >
                        {submittingId === miniQuestion.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          'Submit Answer'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Completion Info */}
                  {miniQuestion.hasAnswer && miniQuestion.submittedAt && (
                    <div className="mt-4 text-sm text-gray-500">
                      Submitted on {new Date(miniQuestion.submittedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
