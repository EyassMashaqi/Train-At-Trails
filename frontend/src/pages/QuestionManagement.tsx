import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminService } from '../services/api';

interface MiniQuestion {
  id?: string;
  title: string;
  description: string;
  orderIndex: number;
}

interface ContentSection {
  id?: string;
  title: string;
  content: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
}

interface Question {
  id: number;
  questionNumber: number;
  title: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  isReleased: boolean;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  answers?: Answer[];
}

interface Answer {
  id: number;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  feedback?: string;
  pointsAwarded?: number;
  user: {
    id: number;
    fullName: string;
    trainName: string;
    email: string;
  };
}

interface QuestionFormData {
  questionNumber: number;
  title: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  contents: ContentSection[];
}

const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    questionNumber: 1,
    title: '',
    description: '',
    deadline: '',
    points: 100,
    bonusPoints: 50,
    contents: []
  });

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllQuestions();
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestionAnswers = useCallback(async (questionId: number) => {
    try {
      const response = await adminService.getQuestionAnswers(questionId);
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, answers: response.data.answers || [] }
          : q
      ));
    } catch (error) {
      console.error('Failed to load question answers:', error);
      toast.error('Failed to load answers for this question');
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Transform the data to match API expectations
      const questionData = {
        questionNumber: formData.questionNumber,
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        points: formData.points,
        bonusPoints: formData.bonusPoints,
        contents: formData.contents.map(content => ({
          title: content.title,
          material: content.content, // API expects 'material' instead of 'content'
          miniQuestions: content.miniQuestions.map(mq => ({
            title: mq.title,
            question: mq.description, // API expects 'question' instead of 'description'
            description: mq.description
          }))
        }))
      };

      await adminService.createQuestion(questionData);
      toast.success('Question created successfully!');
      setShowCreateForm(false);
      setFormData({
        questionNumber: questions.length + 1,
        title: '',
        description: '',
        deadline: '',
        points: 100,
        bonusPoints: 50,
        contents: []
      });
      await loadQuestions();
    } catch (error) {
      console.error('Failed to create question:', error);
      toast.error('Failed to create question');
    }
  };

  const handleReleaseQuestion = async (questionId: number) => {
    try {
      await adminService.releaseQuestion(questionId);
      toast.success('Question released successfully!');
      await loadQuestions();
    } catch (error) {
      console.error('Failed to release question:', error);
      toast.error('Failed to release question');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      await adminService.deleteQuestion(questionId);
      toast.success('Question deleted successfully!');
      await loadQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error('Failed to delete question');
    }
  };

  const toggleQuestionExpansion = async (questionId: number) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(questionId);
      const question = questions.find(q => q.id === questionId);
      if (question && !question.answers) {
        await loadQuestionAnswers(questionId);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  const getPointsForAnswer = (answer: Answer, question: Question) => {
    if (answer.status !== 'APPROVED') return 0;
    
    const submittedAt = new Date(answer.submittedAt);
    const deadline = new Date(question.deadline);
    
    if (submittedAt <= deadline) {
      return question.points + question.bonusPoints; // Full points + bonus for on-time submission
    } else {
      return Math.max(question.points * 0.5, 10); // 50% points for late submission, minimum 10 points
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">⏳</span>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <span className="text-6xl mr-4 drop-shadow-lg">❓</span>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Question Management
                </h1>
                <p className="text-lg text-gray-600">Create and manage trail questions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin"
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center shadow-lg"
              >
                <span className="mr-2">←</span>
                Back to Dashboard
              </Link>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center shadow-lg"
              >
                <span className="mr-2">➕</span>
                {showCreateForm ? 'Cancel' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Create Question Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Question</h2>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.questionNumber}
                    onChange={(e) => setFormData({ ...formData, questionNumber: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter question title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter detailed question description..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus Points (On-time)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bonusPoints}
                    onChange={(e) => setFormData({ ...formData, bonusPoints: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Self Learning Content Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Self Learning Content (Activities)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newMiniQuestion = {
                        id: `temp-${Date.now()}`,
                        title: '',
                        description: '',
                        orderIndex: formData.contents.length
                      };
                      
                      // Create a simple content section if none exists
                      if (formData.contents.length === 0) {
                        const newContent = {
                          id: `content-${Date.now()}`,
                          title: 'Learning Material',
                          content: 'Self-learning content for students',
                          orderIndex: 0,
                          miniQuestions: [newMiniQuestion]
                        };
                        setFormData({ ...formData, contents: [newContent] });
                      } else {
                        // Add to first content section
                        const updatedContents = [...formData.contents];
                        updatedContents[0] = {
                          ...updatedContents[0],
                          miniQuestions: [...updatedContents[0].miniQuestions, newMiniQuestion]
                        };
                        setFormData({ ...formData, contents: updatedContents });
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <span className="mr-1">➕</span>
                    Add New Self Learning Activity
                  </button>
                </div>

                {formData.contents.length > 0 && formData.contents[0].miniQuestions.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">Self Learning Activities Table</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Self Learning Activity Title
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description/Instructions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.contents[0].miniQuestions.map((miniQuestion, index) => (
                            <tr key={miniQuestion.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  placeholder="Enter self learning activity title..."
                                  value={miniQuestion.title}
                                  onChange={(e) => {
                                    const updatedContents = [...formData.contents];
                                    updatedContents[0].miniQuestions[index] = {
                                      ...miniQuestion,
                                      title: e.target.value
                                    };
                                    setFormData({ ...formData, contents: updatedContents });
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <textarea
                                  placeholder="Enter instructions for students..."
                                  value={miniQuestion.description}
                                  onChange={(e) => {
                                    const updatedContents = [...formData.contents];
                                    updatedContents[0].miniQuestions[index] = {
                                      ...miniQuestion,
                                      description: e.target.value
                                    };
                                    setFormData({ ...formData, contents: updatedContents });
                                  }}
                                  rows={2}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (index > 0) {
                                        const updatedContents = [...formData.contents];
                                        const miniQuestions = [...updatedContents[0].miniQuestions];
                                        [miniQuestions[index], miniQuestions[index - 1]] = [miniQuestions[index - 1], miniQuestions[index]];
                                        miniQuestions.forEach((mq, idx) => mq.orderIndex = idx);
                                        updatedContents[0].miniQuestions = miniQuestions;
                                        setFormData({ ...formData, contents: updatedContents });
                                      }
                                    }}
                                    disabled={index === 0}
                                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (index < formData.contents[0].miniQuestions.length - 1) {
                                        const updatedContents = [...formData.contents];
                                        const miniQuestions = [...updatedContents[0].miniQuestions];
                                        [miniQuestions[index], miniQuestions[index + 1]] = [miniQuestions[index + 1], miniQuestions[index]];
                                        miniQuestions.forEach((mq, idx) => mq.orderIndex = idx);
                                        updatedContents[0].miniQuestions = miniQuestions;
                                        setFormData({ ...formData, contents: updatedContents });
                                      }
                                    }}
                                    disabled={index === formData.contents[0].miniQuestions.length - 1}
                                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this self learning activity?')) {
                                        const updatedContents = [...formData.contents];
                                        updatedContents[0].miniQuestions = updatedContents[0].miniQuestions
                                          .filter((_, idx) => idx !== index)
                                          .map((mq, idx) => ({ ...mq, orderIndex: idx }));
                                        setFormData({ ...formData, contents: updatedContents });
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600">
                      Students will submit links for each self learning activity as part of their enhanced learning process.
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <span className="text-gray-500">No self learning activities yet. Click "Add New Self Learning Activity" to start creating enhanced learning content.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Question
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <span className="text-4xl">📝</span>
              <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">No Questions Yet</h3>
              <p className="text-gray-600">Create your first question to get started!</p>
            </div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                          Q{question.questionNumber}
                        </span>
                        {question.isReleased ? (
                          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            Released
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                        {isDeadlinePassed(question.deadline) && (
                          <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            Deadline Passed
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mt-2">{question.title}</h3>
                      <p className="text-gray-600 mt-1">{question.description}</p>
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>📅 Deadline: {formatDate(question.deadline)}</span>
                        <span>🎯 Points: {question.points} + {question.bonusPoints} bonus</span>
                        {question.answers && (
                          <span>💬 {question.answers.length} answers</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleQuestionExpansion(question.id)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      >
                        {expandedQuestion === question.id ? '▼ Hide Answers' : '▶ View Answers'}
                      </button>
                      {!question.isReleased && (
                        <button
                          onClick={() => handleReleaseQuestion(question.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Release
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Answers Section */}
                {expandedQuestion === question.id && question.answers && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-4">
                      User Answers ({question.answers.length})
                    </h4>
                    {question.answers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No answers submitted yet</p>
                    ) : (
                      <div className="space-y-4">
                        {question.answers.map((answer) => (
                          <div key={answer.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {answer.user.fullName} ({answer.user.trainName})
                                </h5>
                                <p className="text-sm text-gray-500">{answer.user.email}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    answer.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                    answer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {answer.status}
                                  </span>
                                  {answer.status === 'APPROVED' && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                      {getPointsForAnswer(answer, question)} pts
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  Submitted: {formatDate(answer.submittedAt)}
                                  {new Date(answer.submittedAt) > new Date(question.deadline) && (
                                    <span className="text-red-500 font-medium"> (LATE)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded p-3 mb-2">
                              <p className="text-gray-700">{answer.content}</p>
                            </div>
                            {answer.feedback && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <p className="text-sm font-medium text-yellow-800">Admin Feedback:</p>
                                <p className="text-yellow-700">{answer.feedback}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionManagement;
