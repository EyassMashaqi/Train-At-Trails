import React, { useState } from 'react';

export interface MiniQuestion {
  id?: string;
  title: string;
  description: string;
  orderIndex: number;
}

export interface ContentSection {
  id?: string;
  title: string;
  content: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
}

interface MiniQuestionManagerProps {
  contents: ContentSection[];
  onChange: (contents: ContentSection[]) => void;
}

const MiniQuestionManager: React.FC<MiniQuestionManagerProps> = ({ contents, onChange }) => {
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editingMiniQuestion, setEditingMiniQuestion] = useState<string | null>(null);

  const addContentSection = () => {
    const newContent: ContentSection = {
      id: `temp-${Date.now()}`,
      title: '',
      content: '',
      orderIndex: contents.length,
      miniQuestions: []
    };
    onChange([...contents, newContent]);
    setEditingContent(newContent.id!);
  };

  const updateContentSection = (contentId: string, updates: Partial<ContentSection>) => {
    const updatedContents = contents.map(content =>
      content.id === contentId ? { ...content, ...updates } : content
    );
    onChange(updatedContents);
  };

  const deleteContentSection = (contentId: string) => {
    if (confirm('Are you sure you want to delete this content section and all its mini-questions?')) {
      const updatedContents = contents
        .filter(content => content.id !== contentId)
        .map((content, index) => ({ ...content, orderIndex: index }));
      onChange(updatedContents);
    }
  };

  const moveContentSection = (contentId: string, direction: 'up' | 'down') => {
    const index = contents.findIndex(content => content.id === contentId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === contents.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedContents = [...contents];
    [updatedContents[index], updatedContents[newIndex]] = [updatedContents[newIndex], updatedContents[index]];
    
    // Update order indices
    updatedContents.forEach((content, idx) => {
      content.orderIndex = idx;
    });
    
    onChange(updatedContents);
  };

  const addMiniQuestion = (contentId: string) => {
    const content = contents.find(c => c.id === contentId);
    if (!content) return;

    const newMiniQuestion: MiniQuestion = {
      id: `temp-mq-${Date.now()}`,
      title: '',
      description: '',
      orderIndex: content.miniQuestions.length
    };

    updateContentSection(contentId, {
      miniQuestions: [...content.miniQuestions, newMiniQuestion]
    });
    setEditingMiniQuestion(newMiniQuestion.id!);
  };

  const updateMiniQuestion = (contentId: string, miniQuestionId: string, updates: Partial<MiniQuestion>) => {
    const content = contents.find(c => c.id === contentId);
    if (!content) return;

    const updatedMiniQuestions = content.miniQuestions.map(mq =>
      mq.id === miniQuestionId ? { ...mq, ...updates } : mq
    );

    updateContentSection(contentId, { miniQuestions: updatedMiniQuestions });
  };

  const deleteMiniQuestion = (contentId: string, miniQuestionId: string) => {
    if (confirm('Are you sure you want to delete this mini-question?')) {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      const updatedMiniQuestions = content.miniQuestions
        .filter(mq => mq.id !== miniQuestionId)
        .map((mq, index) => ({ ...mq, orderIndex: index }));

      updateContentSection(contentId, { miniQuestions: updatedMiniQuestions });
    }
  };

  const moveMiniQuestion = (contentId: string, miniQuestionId: string, direction: 'up' | 'down') => {
    const content = contents.find(c => c.id === contentId);
    if (!content) return;

    const index = content.miniQuestions.findIndex(mq => mq.id === miniQuestionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === content.miniQuestions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedMiniQuestions = [...content.miniQuestions];
    [updatedMiniQuestions[index], updatedMiniQuestions[newIndex]] = 
      [updatedMiniQuestions[newIndex], updatedMiniQuestions[index]];
    
    // Update order indices
    updatedMiniQuestions.forEach((mq, idx) => {
      mq.orderIndex = idx;
    });
    
    updateContentSection(contentId, { miniQuestions: updatedMiniQuestions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Self Learning Content
        </label>
        <button
          type="button"
          onClick={addContentSection}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          + Add Content Section
        </button>
      </div>

      {contents.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <span className="text-gray-500">No content sections yet. Click "Add Content Section" to start.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content, contentIndex) => (
            <div key={content.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">
                  Content Section {contentIndex + 1}
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => moveContentSection(content.id!, 'up')}
                    disabled={contentIndex === 0}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveContentSection(content.id!, 'down')}
                    disabled={contentIndex === contents.length - 1}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingContent(editingContent === content.id ? null : content.id!)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {editingContent === content.id ? 'Done' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteContentSection(content.id!)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingContent === content.id ? (
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Content section title..."
                    value={content.title}
                    onChange={(e) => updateContentSection(content.id!, { title: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <textarea
                    placeholder="Content section text (learning material, instructions, etc.)..."
                    value={content.content}
                    onChange={(e) => updateContentSection(content.id!, { content: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : content.title ? (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700">{content.title}</h5>
                  {content.content && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{content.content}</p>
                  )}
                </div>
              ) : (
                <div className="mb-4 text-sm text-gray-500 italic">
                  Click "Edit" to add title and content
                </div>
              )}

              {/* Mini Questions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Mini Questions ({content.miniQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => addMiniQuestion(content.id!)}
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                  >
                    + Add Mini Question
                  </button>
                </div>

                {content.miniQuestions.length === 0 ? (
                  <div className="text-xs text-gray-500 italic border border-gray-200 rounded p-3 bg-white">
                    No mini-questions yet. Add mini-questions for students to submit links.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {content.miniQuestions.map((miniQuestion, mqIndex) => (
                      <div key={miniQuestion.id} className="border border-gray-200 rounded p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            Mini Question {mqIndex + 1}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => moveMiniQuestion(content.id!, miniQuestion.id!, 'up')}
                              disabled={mqIndex === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMiniQuestion(content.id!, miniQuestion.id!, 'down')}
                              disabled={mqIndex === content.miniQuestions.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMiniQuestion(
                                editingMiniQuestion === miniQuestion.id ? null : miniQuestion.id!
                              )}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              {editingMiniQuestion === miniQuestion.id ? 'Done' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMiniQuestion(content.id!, miniQuestion.id!)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Del
                            </button>
                          </div>
                        </div>

                        {editingMiniQuestion === miniQuestion.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Mini question title..."
                              value={miniQuestion.title}
                              onChange={(e) => updateMiniQuestion(
                                content.id!, 
                                miniQuestion.id!, 
                                { title: e.target.value }
                              )}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <textarea
                              placeholder="Mini question description or instruction..."
                              value={miniQuestion.description}
                              onChange={(e) => updateMiniQuestion(
                                content.id!, 
                                miniQuestion.id!, 
                                { description: e.target.value }
                              )}
                              rows={2}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ) : (
                          <div>
                            {miniQuestion.title ? (
                              <>
                                <div className="text-sm font-medium text-gray-700">{miniQuestion.title}</div>
                                {miniQuestion.description && (
                                  <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                                    {miniQuestion.description}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                Click "Edit" to add title and description
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MiniQuestionManager;
