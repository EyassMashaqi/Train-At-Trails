import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  fullName: string;
  trainName: string;
  email: string;
}

interface MiniQuestion {
  id: string;
  title: string;
  question: string;
  description: string;
  resourceUrl?: string; // NEW: URL for learning resource
  content: {
    id: string;
    title: string;
    question: {
      id: string;
      questionNumber: number;
      title: string;
    };
  };
}

interface MiniAnswer {
  id: string;
  linkUrl: string;
  notes: string;
  submittedAt: string;
  user: User;
  miniQuestion: MiniQuestion;
}

interface UserWithMiniQuestions {
  user: User;
  miniQuestions: {
    id: string;
    title: string;
    question: string;
    description: string;
    contentTitle: string;
    questionNumber: number;
    questionTitle: string;
    hasAnswer: boolean;
    answer?: {
      id: string;
      linkUrl: string;
      notes: string;
      submittedAt: string;
    };
  }[];
}

interface MiniAnswersViewProps {
  selectedCohortId?: string;
  cohortUsers?: User[];
}

const MiniAnswersView: React.FC<MiniAnswersViewProps> = ({ selectedCohortId, cohortUsers }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allMiniAnswers, setAllMiniAnswers] = useState<MiniAnswer[]>([]);
  const [allReleasedMiniQuestions, setAllReleasedMiniQuestions] = useState<MiniQuestion[]>([]);
  const [userMiniQuestions, setUserMiniQuestions] = useState<UserWithMiniQuestions[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<MiniAnswer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use provided cohort users or load all users if no cohort is selected
      let usersData: User[] = [];
      if (selectedCohortId && cohortUsers) {
        usersData = cohortUsers;
      } else {
        const usersResponse = await adminService.getAllUsers();
        usersData = usersResponse.data.users;
      }


      const [miniAnswersResponse, questionsResponse] = await Promise.all([
        adminService.getAllMiniAnswers(selectedCohortId),
        adminService.getAllQuestions(selectedCohortId)
      ]);

      const miniAnswersData = miniAnswersResponse.data.miniAnswers;
      const questionsData = questionsResponse.data.questions;

      // Extract all released self learning activities from released questions only
      const releasedMiniQuestions: MiniQuestion[] = [];
      questionsData.forEach((question: any) => {
        
        // Only process self learning activities if the parent main question is also released
        if (question.isReleased && question.contents) {
          question.contents.forEach((content: any) => {
            if (content.miniQuestions) {
              content.miniQuestions.forEach((miniQ: any) => {
                if (miniQ.isReleased) {
                  releasedMiniQuestions.push({
                    id: miniQ.id,
                    title: miniQ.title,
                    question: miniQ.question,
                    description: miniQ.description,
                    content: {
                      id: content.id,
                      title: content.title,
                      question: {
                        id: question.id,
                        questionNumber: question.questionNumber,
                        title: question.title
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });


      // Create user-self-learning mapping
      const userMiniQuestionsMap: UserWithMiniQuestions[] = usersData.map((user: User) => {
        const userMiniQuestions = releasedMiniQuestions.map((miniQ) => {
          const userAnswer = miniAnswersData.find(
            (answer: MiniAnswer) => answer.user.id === user.id && answer.miniQuestion.id === miniQ.id
          );

          return {
            id: miniQ.id,
            title: miniQ.title,
            question: miniQ.question,
            description: miniQ.description,
            contentTitle: miniQ.content.title,
            questionNumber: miniQ.content.question.questionNumber,
            questionTitle: miniQ.content.question.title,
            hasAnswer: !!userAnswer,
            answer: userAnswer ? {
              id: userAnswer.id,
              linkUrl: userAnswer.linkUrl,
              notes: userAnswer.notes,
              submittedAt: userAnswer.submittedAt
            } : undefined
          };
        });

        return {
          user,
          miniQuestions: userMiniQuestions
        };
      });

      setUsers(usersData);
      setAllMiniAnswers(miniAnswersData);
      setAllReleasedMiniQuestions(releasedMiniQuestions);
      setUserMiniQuestions(userMiniQuestionsMap);
    } catch (error) {
      toast.error('Failed to load self learning data');
    } finally {
      setLoading(false);
    }
  }, [selectedCohortId, cohortUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredUserMiniQuestions = userMiniQuestions.filter(item =>
    item.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.trainName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading mini answers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Self Learning Overview</h2>
          <p className="text-gray-600">View all users and their self learning submissions</p>
        </div>
        <div className="bg-primary-50 rounded-lg px-4 py-2">
          <div className="text-sm text-primary-800">
            <div>Total Users: <span className="font-semibold">{users.length}</span></div>
            <div>Released Self Learning: <span className="font-semibold">{allReleasedMiniQuestions.length}</span></div>
            <div>Total Submissions: <span className="font-semibold">{allMiniAnswers.length}</span></div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name, lighthouse name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUserMiniQuestions.map((item) => {
          const isExpanded = expandedUsers.has(item.user.id);
          const completedCount = item.miniQuestions.filter(mq => mq.hasAnswer).length;
          const totalCount = item.miniQuestions.length;
          const hasAnySubmissions = completedCount > 0;

          return (
            <div
              key={item.user.id}
              className={`bg-white rounded-lg border-2 transition-all ${
                hasAnySubmissions ? 'border-green-200 hover:border-green-300' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* User Header */}
              <div
                className={`p-4 cursor-pointer ${
                  hasAnySubmissions ? 'bg-accent-50 hover:bg-accent-100' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => toggleUserExpansion(item.user.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      hasAnySubmissions ? 'bg-accent-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.user.fullName}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>🚂 {item.user.trainName || 'No lighthouse name'}</span>
                        <span>•</span>
                        <span>📧 {item.user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {completedCount}/{totalCount}
                      </div>
                      <div className="text-sm text-gray-600">completed</div>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Self Learning List */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="p-4 space-y-3">
                    {item.miniQuestions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No released self learning activities available
                      </div>
                    ) : (
                      item.miniQuestions.map((miniQ) => (
                        <div
                          key={miniQ.id}
                          className={`border rounded-lg p-3 ${
                            miniQ.hasAnswer ? 'bg-accent-50 border-accent-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-primary-600">
                                  Q{miniQ.questionNumber}
                                </span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{miniQ.contentTitle}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{miniQ.questionTitle}</span>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">
                                {miniQ.title}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {miniQ.question}
                              </p>
                              {miniQ.hasAnswer && miniQ.answer && (
                                <div className="mt-2 p-2 bg-white rounded border border-green-200">
                                  <div className="text-xs text-accent-600 font-medium mb-1">
                                    Submitted on {formatDate(miniQ.answer.submittedAt)}
                                  </div>
                                  <div className="text-sm">
                                    <div className="mb-1">
                                      <span className="font-medium">Link: </span>
                                      <a
                                        href={miniQ.answer.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:underline break-all"
                                      >
                                        {miniQ.answer.linkUrl}
                                      </a>
                                    </div>
                                    {miniQ.answer.notes && (
                                      <div>
                                        <span className="font-medium">Notes: </span>
                                        <span className="text-gray-700">{miniQ.answer.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <button
                                disabled={!miniQ.hasAnswer}
                                onClick={() => {
                                  if (miniQ.answer) {
                                    const fullAnswer: MiniAnswer = {
                                      id: miniQ.answer.id,
                                      linkUrl: miniQ.answer.linkUrl,
                                      notes: miniQ.answer.notes,
                                      submittedAt: miniQ.answer.submittedAt,
                                      user: item.user,
                                      miniQuestion: {
                                        id: miniQ.id,
                                        title: miniQ.title,
                                        question: miniQ.question,
                                        description: miniQ.description,
                                        content: {
                                          id: '',
                                          title: miniQ.contentTitle,
                                          question: {
                                            id: '',
                                            questionNumber: miniQ.questionNumber,
                                            title: miniQ.questionTitle
                                          }
                                        }
                                      }
                                    };
                                    setSelectedAnswer(fullAnswer);
                                  }
                                }}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                  miniQ.hasAnswer
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {miniQ.hasAnswer ? 'Show Answer' : 'No Answer'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredUserMiniQuestions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Answer Detail Modal */}
      {selectedAnswer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Self Learning Activity Answer</h3>
                  <p className="text-gray-600">
                    {selectedAnswer.user.fullName} ({selectedAnswer.user.trainName})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAnswer(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Question</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600 mb-1">
                      Q{selectedAnswer.miniQuestion.content.question.questionNumber} • {selectedAnswer.miniQuestion.content.title}
                    </div>
                    <h5 className="font-medium text-gray-900 mb-1">
                      {selectedAnswer.miniQuestion.title}
                    </h5>
                    <p className="text-gray-700">{selectedAnswer.miniQuestion.question}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Answer</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="font-medium text-gray-900">Link: </span>
                      <a
                        href={selectedAnswer.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {selectedAnswer.linkUrl}
                      </a>
                    </div>
                    {selectedAnswer.notes && (
                      <div className="mb-3">
                        <span className="font-medium text-gray-900">Notes: </span>
                        <p className="text-gray-700 mt-1">{selectedAnswer.notes}</p>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Submitted on {formatDate(selectedAnswer.submittedAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedAnswer(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniAnswersView;
