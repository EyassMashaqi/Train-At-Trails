import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrade: (grade: string, feedback: string) => void;
  answer: {
    id: string | number;
    content: string;
    notes?: string;
    user: {
      fullName: string;
      trainName: string;
    };
    question?: {
      title: string;
      questionNumber: number;
    };
  };
  isLoading: boolean;
}

const GradingModal: React.FC<GradingModalProps> = ({
  isOpen,
  onClose,
  onGrade,
  answer,
  isLoading
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  const grades = [
    {
      id: 'GOLD',
      name: 'Gold Medal 🥇',
      description: 'Exceptional work - exceeds expectations',
      points: 100,
      color: 'from-yellow-400 to-yellow-600',
      textColor: 'text-yellow-800'
    },
    {
      id: 'SILVER',
      name: 'Silver Medal 🥈',
      description: 'Good work - meets expectations well',
      points: 85,
      color: 'from-gray-300 to-gray-500',
      textColor: 'text-gray-800'
    },
    {
      id: 'COPPER',
      name: 'Copper Medal 🥉',
      description: 'Satisfactory work - meets basic requirements',
      points: 70,
      color: 'from-orange-400 to-orange-600',
      textColor: 'text-orange-800'
    },
    {
      id: 'NEEDS_RESUBMISSION',
      name: 'Needs Resubmission ❌',
      description: 'Work needs improvement - requires resubmission',
      points: 0,
      color: 'from-red-400 to-red-600',
      textColor: 'text-red-800'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGrade && feedback.trim()) {
      onGrade(selectedGrade, feedback.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Grade Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Student Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Student Information</h3>
            <p><strong>Name:</strong> {answer.user.fullName}</p>
            <p><strong>Train Name:</strong> {answer.user.trainName}</p>
            {answer.question && (
              <p><strong>Assignment:</strong> Q{answer.question.questionNumber}: {answer.question.title}</p>
            )}
          </div>

          {/* Submitted Work */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Submitted Work</h3>
            <div className="mb-3">
              <strong>Link:</strong>
              <a 
                href={answer.content} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                {answer.content}
              </a>
            </div>
            {answer.notes && (
              <div>
                <strong>Notes:</strong>
                <p className="mt-1 text-gray-700">{answer.notes}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Mastery Points Selection */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Select Mastery Points</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grades.map((grade) => (
                  <label
                    key={grade.id}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      selectedGrade === grade.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="grade"
                      value={grade.id}
                      checked={selectedGrade === grade.id}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${grade.color} ${grade.textColor} mb-2`}>
                      {grade.name}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{grade.description}</p>
                    <p className="text-sm font-medium text-gray-900">Mastery Points: {grade.points}/100</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="mb-6">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Feedback (Required)
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide constructive feedback for the student..."
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedGrade || !feedback.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Assigning Points...' : 'Submit Mastery Points'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GradingModal;
