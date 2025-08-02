import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { adminService } from '../services/api';

interface MiniAnswer {
  id: string;
  linkUrl: string;
  notes?: string;
  submittedAt: string;
  user: {
    id: string;
    fullName: string;
    trainName: string;
    email: string;
  };
  miniQuestion: {
    id: string;
    title: string;
    question: string;
    description?: string;
    content: {
      id: string;
      title: string;
      question: {
        id: string;
        questionNumber: number;
        title: string;
      };
    };
  };
}

export const MiniAnswersView: React.FC = () => {
  const [miniAnswers, setMiniAnswers] = useState<MiniAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');

  useEffect(() => {
    loadMiniAnswers();
  }, []);

  const loadMiniAnswers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllMiniAnswers();
      setMiniAnswers(response.data.miniAnswers);
    } catch (error) {
      console.error('Failed to load mini answers:', error);
      toast.error('Failed to load mini question answers');
    } finally {
      setLoading(false);
    }
  };

  // Get unique questions for filtering
  const uniqueQuestions = Array.from(
    new Set(
      miniAnswers.map(answer => 
        `${answer.miniQuestion.content.question.questionNumber} - ${answer.miniQuestion.content.question.title}`
      )
    )
  );

  // Filter answers based on search term and selected question
  const filteredAnswers = miniAnswers.filter(answer => {
    const matchesSearch = 
      answer.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.user.trainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.miniQuestion.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesQuestion = selectedQuestion === 'all' || 
      `${answer.miniQuestion.content.question.questionNumber} - ${answer.miniQuestion.content.question.title}` === selectedQuestion;
    
    return matchesSearch && matchesQuestion;
  });

  // Group answers by user
  const answersByUser = filteredAnswers.reduce((acc, answer) => {
    const userId = answer.user.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: answer.user,
        answers: []
      };
    }
    acc[userId].answers.push(answer);
    return acc;
  }, {} as Record<string, { user: MiniAnswer['user']; answers: MiniAnswer[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Mini Question Submissions</h2>
        <p className="text-purple-100">
          View and manage all mini question answers submitted by users.
        </p>
        <div className="mt-4 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">
            {filteredAnswers.length} submission{filteredAnswers.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, train name, or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Question
            </label>
            <select
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Questions</option>
              {uniqueQuestions.map(question => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {Object.keys(answersByUser).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedQuestion !== 'all' 
              ? 'Try adjusting your search filters.' 
              : 'Users haven\'t submitted any mini question answers yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(answersByUser).map(({ user, answers }) => (
            <div key={user.id} className="bg-white rounded-lg shadow border overflow-hidden">
              {/* User Header */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {user.fullName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Train: {user.trainName} • {user.email}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {answers.length} submission{answers.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* User's Answers */}
              <div className="p-6">
                <div className="space-y-4">
                  {answers.map(answer => (
                    <div
                      key={answer.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            Q{answer.miniQuestion.content.question.questionNumber}: {answer.miniQuestion.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {answer.miniQuestion.question}
                          </p>
                          <p className="text-xs text-gray-500">
                            Content: {answer.miniQuestion.content.title}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 ml-4">
                          {new Date(answer.submittedAt).toLocaleDateString()} at {' '}
                          {new Date(answer.submittedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Submitted Link:
                          </label>
                          <a
                            href={answer.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                          >
                            {answer.linkUrl}
                          </a>
                        </div>

                        {answer.notes && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes:
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {answer.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MiniAnswersView;
