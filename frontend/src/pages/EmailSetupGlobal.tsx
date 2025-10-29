import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import { defaultEmailTemplates } from '../utils/defaultEmailTemplates';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface EmailTemplate {
  id: string;
  emailType: string;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailFormData {
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  isActive: boolean;
}

const EmailSetupGlobal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmailFormData>({
    name: '',
    description: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    backgroundColor: '#F8FAFC',
    textColor: '#1F2937',
    buttonColor: '#3B82F6',
    isActive: true
  });
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadTemplates();
  }, [user, navigate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/email-setup/global-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template.emailType);
    setFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
      buttonColor: template.buttonColor,
      isActive: template.isActive
    });
  };

  const handleSaveTemplate = async (emailType: string) => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.htmlContent.trim()) {
      toast.error('Name, subject, and HTML content are required');
      return;
    }

    try {
      setSaveLoading(emailType);
      // Include emailType in the request body as required by backend validation
      const requestData = {
        ...formData,
        emailType: emailType
      };
      
      await api.put(`/admin/email-setup/global-templates/${emailType}`, requestData);
      toast.success('Template updated successfully');
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update template';
      toast.error(errorMessage);
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#F8FAFC',
      textColor: '#1F2937',
      buttonColor: '#3B82F6',
      isActive: true
    });
  };

  const generatePreview = async (template: EmailTemplate) => {
    try {
      const colors = {
        primaryColor: editingTemplate === template.emailType ? formData.primaryColor : template.primaryColor,
        secondaryColor: editingTemplate === template.emailType ? formData.secondaryColor : template.secondaryColor,
        backgroundColor: editingTemplate === template.emailType ? formData.backgroundColor : template.backgroundColor,
        textColor: editingTemplate === template.emailType ? formData.textColor : template.textColor,
        buttonColor: editingTemplate === template.emailType ? formData.buttonColor : template.buttonColor
      };

      const htmlContent = editingTemplate === template.emailType ? formData.htmlContent : template.htmlContent;

      const response = await api.post('/admin/email-setup/preview', {
        htmlContent,
        colors,
        variables: {} // Using default sample variables from backend
      });

      setPreviewHtml(response.data.previewHtml);
      setShowPreview(template.emailType);
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const loadDefaultTemplate = (templateType: keyof typeof defaultEmailTemplates) => {
    const template = defaultEmailTemplates[templateType];
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent
      }));
      toast.success(`Loaded ${template.name} template`);
    }
  };

  const getTemplateIcon = (emailType: string) => {
    const icons: Record<string, string> = {
      WELCOME: '👋',
      PASSWORD_RESET: '🔑',
      ANSWER_SUBMISSION: '📝',
      ANSWER_FEEDBACK: '📊',
      NEW_QUESTION: '🆕',
      MINI_QUESTION_RELEASE: '📚',
      MINI_ANSWER_RESUBMISSION: '🔄',
      RESUBMISSION_APPROVAL: '✅',
      USER_ASSIGNED_TO_COHORT: '🚂',
      USER_GRADUATED: '🎓',
      USER_REMOVED_FROM_COHORT: '📋',
      USER_SUSPENDED: '⚠️'
    };
    return icons[emailType] || '📧';
  };

  const getTemplateDisplayName = (emailType: string) => {
    const names: Record<string, string> = {
      WELCOME: 'Welcome Email',
      PASSWORD_RESET: 'Password Reset',
      ANSWER_SUBMISSION: 'Answer Submission',
      ANSWER_FEEDBACK: 'Answer Feedback',
      NEW_QUESTION: 'New Assignment Release',
      MINI_QUESTION_RELEASE: 'Self-Learning Release',
      MINI_ANSWER_RESUBMISSION: 'Resubmission Request',
      RESUBMISSION_APPROVAL: 'Resubmission Approval',
      USER_ASSIGNED_TO_COHORT: 'User Assigned to Cohort',
      USER_GRADUATED: 'User Graduated',
      USER_REMOVED_FROM_COHORT: 'User Removed from Cohort',
      USER_SUSPENDED: 'User Suspended'
    };
    return names[emailType] || emailType;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6 space-x-8">
            <img 
              src={BVisionRYLogo} 
              alt="BVisionRY Company Logo" 
              className="w-44 h-16 px-3 py-2 bvisionary-logo"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Global Email Setup
              </h1>
              <p className="text-xl text-gray-600">Manage email templates used as defaults for new cohorts</p>
            </div>
            <img 
              src={LighthouseLogo} 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/cohorts')}
              className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-6 py-3 rounded-lg hover:from-secondary-700 hover:to-secondary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">←</span>
              <span>Back to Cohorts</span>
            </button>
            <button
              onClick={logout}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Email Templates */}
        <div className="space-y-6">
          {templates.map((template) => (
            <div
              key={template.emailType}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              {/* Template Header */}
              <div
                className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedTemplate(expandedTemplate === template.emailType ? null : template.emailType)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{getTemplateIcon(template.emailType)}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-gray-600">{getTemplateDisplayName(template.emailType)}</p>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      template.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
                        expandedTemplate === template.emailType ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedTemplate === template.emailType && (
                <div className="p-6">
                  {editingTemplate === template.emailType ? (
                    /* Edit Form */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900">Basic Information</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Template name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              rows={2}
                              placeholder="Template description"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <input
                              type="text"
                              value={formData.subject}
                              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Email subject"
                            />
                          </div>

                          {/* Default Template Selector */}
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-md font-semibold text-blue-900 mb-3">🎨 Quick Start Templates</h4>
                            <p className="text-sm text-blue-700 mb-3">Choose a professionally designed template to get started quickly:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {Object.entries(defaultEmailTemplates).map(([key, template]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => loadDefaultTemplate(key as keyof typeof defaultEmailTemplates)}
                                  className="text-left p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                >
                                  <div className="font-medium text-blue-900 text-sm">{template.name}</div>
                                  <div className="text-xs text-blue-600 mt-1">{template.description}</div>
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-3">
                              💡 Templates include professional styling and variable placeholders. You can customize them further using the rich text editor.
                            </p>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`active-${template.emailType}`}
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor={`active-${template.emailType}`} className="ml-2 text-sm text-gray-700">
                              Template is active
                            </label>
                          </div>
                        </div>

                        {/* Color Settings */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">Email Colors</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Primary</label>
                              <input
                                type="color"
                                value={formData.primaryColor}
                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                className="w-12 h-12 mx-auto rounded border border-gray-300 cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 mt-1">Main brand color</p>
                            </div>

                            <div className="text-center">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary</label>
                              <input
                                type="color"
                                value={formData.secondaryColor}
                                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                className="w-12 h-12 mx-auto rounded border border-gray-300 cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 mt-1">Accent color</p>
                            </div>

                            <div className="text-center">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                              <input
                                type="color"
                                value={formData.textColor}
                                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                className="w-12 h-12 mx-auto rounded border border-gray-300 cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 mt-1">Main text color</p>
                            </div>

                            <div className="text-center">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Button</label>
                              <input
                                type="color"
                                value={formData.buttonColor}
                                onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                                className="w-12 h-12 mx-auto rounded border border-gray-300 cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 mt-1">CTA button color</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Content Editor */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
                          <RichTextEditor
                            value={formData.htmlContent}
                            onChange={(value) => setFormData({ ...formData, htmlContent: value })}
                            colors={{
                              primaryColor: formData.primaryColor,
                              secondaryColor: formData.secondaryColor,
                              textColor: formData.textColor,
                              buttonColor: formData.buttonColor,
                              backgroundColor: formData.backgroundColor
                            }}
                          />
                        </div>

                        {/* Live Preview */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview</label>
                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-3 border-b border-gray-300 text-sm font-medium text-gray-700">
                              Live Preview
                            </div>
                            <div className="p-4 min-h-[200px] bg-white overflow-auto">
                              <div
                                dangerouslySetInnerHTML={{ 
                                  __html: formData.htmlContent
                                    .replace(/{{userName}}/g, 'John Doe')
                                    .replace(/{{companyName}}/g, 'BVisionRY Lighthouse')
                                    .replace(/{{primaryColor}}/g, formData.primaryColor)
                                    .replace(/{{secondaryColor}}/g, formData.secondaryColor)
                                    .replace(/{{textColor}}/g, formData.textColor)
                                    .replace(/{{buttonColor}}/g, formData.buttonColor)
                                    .replace(/{{backgroundColor}}/g, formData.backgroundColor)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => generatePreview(template)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center space-x-2"
                        >
                          <span>👁️</span>
                          <span>Preview</span>
                        </button>
                        
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveTemplate(template.emailType)}
                            disabled={saveLoading === template.emailType}
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium disabled:opacity-50 flex items-center space-x-2"
                          >
                            {saveLoading === template.emailType ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <span>💾</span>
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Template Information</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Subject:</dt>
                              <dd className="text-sm text-gray-900">{template.subject}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Last Updated:</dt>
                              <dd className="text-sm text-gray-900">
                                {new Date(template.updatedAt).toLocaleDateString()}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Color Scheme</h4>
                          <div className="grid grid-cols-5 gap-2">
                            <div className="text-center">
                              <div 
                                className="w-8 h-8 rounded-full mx-auto mb-1" 
                                style={{ backgroundColor: template.primaryColor }}
                              ></div>
                              <span className="text-xs text-gray-500">Primary</span>
                            </div>
                            <div className="text-center">
                              <div 
                                className="w-8 h-8 rounded-full mx-auto mb-1" 
                                style={{ backgroundColor: template.secondaryColor }}
                              ></div>
                              <span className="text-xs text-gray-500">Secondary</span>
                            </div>
                            <div className="text-center">
                              <div 
                                className="w-8 h-8 rounded-full mx-auto mb-1 border" 
                                style={{ backgroundColor: template.backgroundColor }}
                              ></div>
                              <span className="text-xs text-gray-500">Background</span>
                            </div>
                            <div className="text-center">
                              <div 
                                className="w-8 h-8 rounded-full mx-auto mb-1" 
                                style={{ backgroundColor: template.textColor }}
                              ></div>
                              <span className="text-xs text-gray-500">Text</span>
                            </div>
                            <div className="text-center">
                              <div 
                                className="w-8 h-8 rounded-full mx-auto mb-1" 
                                style={{ backgroundColor: template.buttonColor }}
                              ></div>
                              <span className="text-xs text-gray-500">Button</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => generatePreview(template)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center space-x-2"
                        >
                          <span>👁️</span>
                          <span>Preview</span>
                        </button>
                        
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium flex items-center space-x-2"
                        >
                          <span>✏️</span>
                          <span>Edit Template</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Email Preview</h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div
                className="border border-gray-200 rounded-lg overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSetupGlobal;