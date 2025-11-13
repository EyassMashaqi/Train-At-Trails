import React, { useState, useRef, useEffect } from 'react';
import HtmlEditorModal from './HtmlEditorModal';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  colors?: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    buttonColor: string;
    backgroundColor?: string;
  };
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Enter your email content...",
  colors = {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    textColor: '#1F2937',
    buttonColor: '#3B82F6',
    backgroundColor: '#F8FAFC'
  }
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleHtmlSave = (htmlContent: string) => {
    onChange(htmlContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  const updateActiveFormats = () => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('justifyLeft')) formats.add('left');
    if (document.queryCommandState('justifyCenter')) formats.add('center');
    if (document.queryCommandState('justifyRight')) formats.add('right');
    
    setActiveFormats(formats);
  };

  const handleSelectionChange = () => {
    updateActiveFormats();
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const buttonClass = (format: string) => 
    `px-3 py-2 rounded border transition-colors ${
      activeFormats.has(format)
        ? 'bg-primary-600 text-white border-primary-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`;

  const insertVariable = (variable: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.textContent = `{{${variable}}}`;
      span.className = 'bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm';
      range.deleteContents();
      range.insertNode(span);
      
      // Move cursor after the inserted variable
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // If no selection, insert at the end
      if (editorRef.current) {
        const span = document.createElement('span');
        span.textContent = `{{${variable}}}`;
        span.className = 'bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm';
        editorRef.current.appendChild(span);
      }
    }
    handleInput();
  };

  const commonVariables = [
    'userName', 'dashboardUrl', 'questionTitle', 'questionNumber', 
    'grade', 'feedback', 'resetUrl', 'miniQuestionTitle', 'contentTitle',
    'cohortName', 'cohortDescription', 'submissionTime', 'questionUrl',
    'companyName', 'gradePoints', 'primaryColor', 'secondaryColor',
    'textColor', 'buttonColor', 'backgroundColor'
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 p-3 border-b border-gray-300">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Text Formatting */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => execCommand('bold')}
              className={buttonClass('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className={buttonClass('italic')}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => execCommand('underline')}
              className={buttonClass('underline')}
              title="Underline"
            >
              <u>U</u>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Alignment */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => execCommand('justifyLeft')}
              className={buttonClass('left')}
              title="Align Left"
            >
              ⬅️
            </button>
            <button
              type="button"
              onClick={() => execCommand('justifyCenter')}
              className={buttonClass('center')}
              title="Align Center"
            >
              ↔️
            </button>
            <button
              type="button"
              onClick={() => execCommand('justifyRight')}
              className={buttonClass('right')}
              title="Align Right"
            >
              ➡️
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Colors */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => execCommand('foreColor', colors.primaryColor)}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              title="Primary Color"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-400"
                style={{ backgroundColor: colors.primaryColor }}
              ></div>
            </button>
            <button
              type="button"
              onClick={() => execCommand('foreColor', colors.secondaryColor)}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              title="Secondary Color"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-400"
                style={{ backgroundColor: colors.secondaryColor }}
              ></div>
            </button>
            <button
              type="button"
              onClick={() => execCommand('foreColor', colors.textColor)}
              className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              title="Text Color"
            >
              <div 
                className="w-4 h-4 rounded border border-gray-400"
                style={{ backgroundColor: colors.textColor }}
              ></div>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Font Size */}
          <select
            onChange={(e) => execCommand('fontSize', e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
            defaultValue="3"
          >
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Extra Large</option>
          </select>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Variables Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  insertVariable(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
              defaultValue=""
            >
              <option value="">Insert Variable</option>
              {commonVariables.map(variable => (
                <option key={variable} value={variable}>
                  {'{{'}{variable}{'}}'}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* HTML Editor */}
          <button
            type="button"
            onClick={() => setIsHtmlModalOpen(true)}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            title="Edit HTML Code"
          >
            {'</>'}
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => execCommand('removeFormat')}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            title="Clear Formatting"
          >
            🧹
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[200px] focus:outline-none editor-content"
        style={{ 
          color: colors.textColor,
          lineHeight: '1.6'
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          .editor-content:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
          }
        `
      }} />

      {/* HTML Editor Modal */}
      <HtmlEditorModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        htmlContent={value}
        onSave={handleHtmlSave}
        colors={{
          primaryColor: colors.primaryColor,
          secondaryColor: colors.secondaryColor,
          textColor: colors.textColor,
          buttonColor: colors.buttonColor,
          backgroundColor: colors.backgroundColor || '#F8FAFC'
        }}
      />
    </div>
  );
};

export default RichTextEditor;