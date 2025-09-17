import React, { useState, useEffect } from 'react';

interface HtmlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onSave: (htmlContent: string) => void;
  colors?: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    buttonColor: string;
    backgroundColor: string;
  };
}

const HtmlEditorModal: React.FC<HtmlEditorModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  onSave,
  colors = {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    textColor: '#1F2937',
    buttonColor: '#3B82F6',
    backgroundColor: '#F8FAFC'
  }
}) => {
  const [editedHtml, setEditedHtml] = useState(htmlContent);

  useEffect(() => {
    setEditedHtml(htmlContent);
  }, [htmlContent, isOpen]);

  const handleSave = () => {
    onSave(editedHtml);
    onClose();
  };

  const handleCancel = () => {
    setEditedHtml(htmlContent); // Reset to original
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">HTML Editor</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          {/* HTML Editor */}
          <div className="flex flex-col h-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML Code
            </label>
            <textarea
              value={editedHtml}
              onChange={(e) => setEditedHtml(e.target.value)}
              className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none overflow-auto"
              placeholder="Enter your HTML code here..."
              spellCheck={false}
              style={{ minHeight: '300px', maxHeight: '500px' }}
            />
            <div className="mt-2 text-xs text-gray-500 flex-shrink-0">
              Use variables like {`{{userName}}`} for dynamic content
            </div>
          </div>

          {/* Live Preview */}
          <div className="flex flex-col h-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Live Preview
            </label>
            <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto border border-gray-300" style={{ minHeight: '300px', maxHeight: '500px' }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: editedHtml
                    .replace(/{{userName}}/g, 'John Doe')
                    .replace(/{{companyName}}/g, 'Your Company')
                    .replace(/{{trainName}}/g, 'Express Train')
                    .replace(/{{cohortName}}/g, 'Sample Cohort')
                    .replace(/{{stepTitle}}/g, 'Step 1: Getting Started')
                    .replace(/{{questionTitle}}/g, 'Sample Question')
                    .replace(/{{answer}}/g, 'This is a sample answer')
                    .replace(/{{feedback}}/g, 'Great work! Keep it up.')
                    .replace(/{{resetLink}}/g, '#')
                    .replace(/{{loginLink}}/g, '#')
                    .replace(/{{primaryColor}}/g, colors.primaryColor)
                    .replace(/{{secondaryColor}}/g, colors.secondaryColor)
                    .replace(/{{textColor}}/g, colors.textColor)
                    .replace(/{{buttonColor}}/g, colors.buttonColor)
                    .replace(/{{backgroundColor}}/g, colors.backgroundColor)
                }}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            💡 Tip: Use the rich text editor for easier formatting, or edit HTML directly here for advanced customization
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HtmlEditorModal;