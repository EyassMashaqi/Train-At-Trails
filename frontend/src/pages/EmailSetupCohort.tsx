import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import { defaultEmailTemplates } from '../utils/defaultEmailTemplates';

// Import images
import BVisionRYLogo from '../assets/BVisionRY.png';
import LighthouseLogo from '../assets/Lighthouse.png';

interface Cohort {
  id: string;
  cohortNumber: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

interface EmailConfig {
  id: string;
  cohortId: string;
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

interface CohortFormData {
  cohortNumber: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

const EmailSetupCohort: React.FC = () => {
  const navigate = useNavigate();
  const { cohortId } = useParams<{ cohortId: string }>();
  const { user, logout } = useAuth();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'theme' | 'email-templates' | 'cohort-settings'>('email-templates');
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
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
  const [cohortFormData, setCohortFormData] = useState<CohortFormData>({
    cohortNumber: '',
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [cohortSaveLoading, setCohortSaveLoading] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (!cohortId) {
      navigate('/admin/cohorts');
      return;
    }
    loadEmailConfigs();
  }, [user, navigate, cohortId]);

  const loadEmailConfigs = async () => {
    if (!cohortId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/admin/email-setup/cohorts/${cohortId}/email-configs`);
      setConfigs(response.data.configs || []);
      setCohort(response.data.cohort);
      
      // Set cohort form data when cohort is loaded
      if (response.data.cohort) {
        const cohortData = response.data.cohort;
        setCohortFormData({
          cohortNumber: cohortData.cohortNumber.toString(),
          name: cohortData.name,
          description: cohortData.description || '',
          startDate: cohortData.startDate ? cohortData.startDate.split('T')[0] : '',
          endDate: cohortData.endDate ? cohortData.endDate.split('T')[0] : ''
        });
      }
    } catch (error) {
      toast.error('Failed to load email configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (config: EmailConfig) => {
    setEditingConfig(config.emailType);
    setFormData({
      name: config.name,
      description: config.description || '',
      subject: config.subject,
      htmlContent: config.htmlContent,
      textContent: config.textContent || '',
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      buttonColor: config.buttonColor,
      isActive: config.isActive
    });
  };

  const handleSaveConfig = async (emailType: string) => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.htmlContent.trim()) {
      toast.error('Name, subject, and HTML content are required');
      return;
    }

    if (!cohortId) return;

    try {
      setSaveLoading(emailType);
      await api.put(`/admin/email-setup/cohorts/${cohortId}/email-configs/${emailType}`, formData);
      toast.success('Email configuration updated successfully');
      setEditingConfig(null);
      await loadEmailConfigs();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update email configuration';
      toast.error(errorMessage);
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
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

  const handleUpdateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort || !cohortId) return;

    try {
      setCohortSaveLoading(true);
      
      const payload: any = {
        name: cohortFormData.name.trim(),
        description: cohortFormData.description.trim(),
        startDate: cohortFormData.startDate,
        endDate: cohortFormData.endDate || null
      };

      if (cohortFormData.cohortNumber.trim()) {
        payload.cohortNumber = parseInt(cohortFormData.cohortNumber.trim());
      }

      await api.patch(`/admin/cohorts/${cohortId}`, payload);
      toast.success('Cohort updated successfully');
      await loadEmailConfigs(); // Reload to get updated cohort data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort';
      toast.error(errorMessage);
    } finally {
      setCohortSaveLoading(false);
    }
  };

  const handleToggleCohortStatus = async () => {
    if (!cohort || !cohortId) return;

    try {
      await api.patch(`/admin/cohorts/${cohortId}/toggle-status`);
      toast.success(`Cohort ${cohort.isActive ? 'deactivated' : 'activated'} successfully`);
      await loadEmailConfigs(); // Reload to get updated cohort data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cohort status';
      toast.error(errorMessage);
    }
  };

  const generatePreview = async (config: EmailConfig) => {
    try {
      const colors = {
        primaryColor: editingConfig === config.emailType ? formData.primaryColor : config.primaryColor,
        secondaryColor: editingConfig === config.emailType ? formData.secondaryColor : config.secondaryColor,
        backgroundColor: editingConfig === config.emailType ? formData.backgroundColor : config.backgroundColor,
        textColor: editingConfig === config.emailType ? formData.textColor : config.textColor,
        buttonColor: editingConfig === config.emailType ? formData.buttonColor : config.buttonColor
      };

      const htmlContent = editingConfig === config.emailType ? formData.htmlContent : config.htmlContent;

      const response = await api.post('/admin/email-setup/preview', {
        htmlContent,
        colors,
        variables: {} // Using default sample variables from backend
      });

      setPreviewHtml(response.data.previewHtml);
      setShowPreview(config.emailType);
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

  const getConfigIcon = (emailType: string) => {
    const icons: Record<string, string> = {
      WELCOME: '👋',
      PASSWORD_RESET: '🔑',
      ANSWER_SUBMISSION: '📝',
      ANSWER_FEEDBACK: '📊',
      NEW_QUESTION: '🆕',
      MINI_QUESTION_RELEASE: '📚',
      MINI_ANSWER_RESUBMISSION: '🔄',
      RESUBMISSION_APPROVAL: '✅'
    };
    return icons[emailType] || '📧';
  };

  const getConfigDisplayName = (emailType: string) => {
    const names: Record<string, string> = {
      WELCOME: 'Welcome Email',
      PASSWORD_RESET: 'Password Reset',
      ANSWER_SUBMISSION: 'Answer Submission',
      ANSWER_FEEDBACK: 'Answer Feedback',
      NEW_QUESTION: 'New Question Release',
      MINI_QUESTION_RELEASE: 'Mini Question Release',
      MINI_ANSWER_RESUBMISSION: 'Resubmission Request',
      RESUBMISSION_APPROVAL: 'Resubmission Approval'
    };
    return names[emailType] || emailType;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email configurations...</p>
        </div>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cohort Not Found</h2>
          <button
            onClick={() => navigate('/admin/cohorts')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Cohorts
          </button>
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
          <span className="text-3xl opacity-20">⭐</span>
        </div>
        <div className="absolute bottom-32 left-1/4 animate-float delay-500">
          <span className="text-5xl opacity-20">🚂</span>
        </div>
        <div className="absolute bottom-20 right-10 animate-float delay-700">
          <span className="text-4xl opacity-20">🏮</span>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <img 
              src={BVisionRYLogo} 
              alt="BVisionRY Logo" 
              className="w-20 h-20 rounded-full shadow-lg"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Cohort Management - {cohort.name}
              </h1>
              <p className="text-xl text-gray-600">
                Cohort #{cohort.cohortNumber} - Manage cohort settings and email templates
              </p>
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
              onClick={() => navigate(`/admin?cohort=${cohortId}`)}
              className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-6 py-3 rounded-lg hover:from-secondary-700 hover:to-secondary-800 transition-all duration-200 font-medium shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">🔙</span>
              <span>Back</span>
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'theme'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">🎨</span>
                <span>Theme</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('email-templates')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'email-templates'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">📧</span>
                <span>Email Templates</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cohort-settings')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'cohort-settings'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">⚙️</span>
                <span>Cohort Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'theme' ? (
          <>
            {/* Theme Configuration - Placeholder for future implementation */}
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Theme Configuration</h3>
              <p className="text-gray-600 mb-6">
                Theme customization features will be available soon.
              </p>
              <p className="text-sm text-gray-500">
                This will include color schemes, branding, and visual customization options for this cohort.
              </p>
            </div>
          </>
        ) : activeTab === 'email-templates' ? (
          <>
            {/* Cohort Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cohort Information</h3>
                  <p className="text-gray-600">Name: {cohort.name}</p>
                  <p className="text-gray-600">Number: #{cohort.cohortNumber}</p>
                  <p className="text-gray-600">
                    Status: <span className={`font-medium ${cohort.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {cohort.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dates</h3>
                  <p className="text-gray-600">Start: {new Date(cohort.startDate).toLocaleDateString()}</p>
                  {cohort.endDate && (
                    <p className="text-gray-600">End: {new Date(cohort.endDate).toLocaleDateString()}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Templates</h3>
                  <p className="text-gray-600">{configs.length} configurations available</p>
                  <p className="text-gray-600">
                    Active: {configs.filter(c => c.isActive).length} / {configs.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Email Configurations */}
            <div className="space-y-6">
              {configs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-6xl mb-4">📧</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Email Configurations</h3>
                  <p className="text-gray-600 mb-6">
                    Email configurations should be automatically created when you create a cohort.
                  </p>
                  <button
                    onClick={() => navigate('/admin/cohorts')}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Back to Cohorts
                  </button>
                </div>
              ) : (
                configs.map((config) => (
                  <div key={config.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Config Header */}
                    <div 
                      className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedConfig(expandedConfig === config.emailType ? null : config.emailType)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-3xl">{getConfigIcon(config.emailType)}</span>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{getConfigDisplayName(config.emailType)}</h3>
                            <p className="text-gray-600">{config.description || 'No description'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditConfig(config);
                              }}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePreview(config);
                              }}
                              className="text-secondary-600 hover:text-secondary-700 font-medium"
                            >
                              Preview
                            </button>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${
                              expandedConfig === config.emailType ? 'rotate-180' : ''
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
                    {expandedConfig === config.emailType && (
                      <div className="p-6 bg-gray-50">
                        {editingConfig === config.emailType ? (
                          /* Edit Form */
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <input
                                  type="text"
                                  value={formData.description}
                                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                              <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                required
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

                            {/* Color Customization */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="text-md font-semibold text-gray-900 mb-3">Email Colors</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { key: 'primaryColor', label: 'Primary', description: 'Main brand color' },
                                  { key: 'secondaryColor', label: 'Secondary', description: 'Accent color' },
                                  { key: 'textColor', label: 'Text', description: 'Main text color' },
                                  { key: 'buttonColor', label: 'Button', description: 'CTA button color' }
                                ].map(({ key, label, description }) => (
                                  <div key={key} className="text-center">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                    <input
                                      type="color"
                                      value={formData[key as keyof EmailFormData] as string}
                                      onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                                      className="w-12 h-12 mx-auto rounded border border-gray-300 cursor-pointer"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Email Content Editor with Live Preview */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Email Content *</label>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Editor */}
                                <div>
                                  <RichTextEditor
                                    value={formData.htmlContent}
                                    onChange={(value) => setFormData(prev => ({ ...prev, htmlContent: value }))}
                                    placeholder="Enter your email content here..."
                                    colors={{
                                      primaryColor: formData.primaryColor,
                                      secondaryColor: formData.secondaryColor,
                                      textColor: formData.textColor,
                                      buttonColor: formData.buttonColor,
                                      backgroundColor: formData.backgroundColor
                                    }}
                                  />Live Preview

                                  <p className="text-sm text-gray-500 mt-1">
                                    Use the toolbar to format your text and insert variables like userName, dashboardUrl, etc.
                                  </p>
                                </div>
                                
                                {/* Live Preview */}
                                <div>
                                  <div className="border border-gray-300 rounded-lg">
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 text-sm font-medium text-gray-700">
                                      Live Preview
                                    </div>
                                    <div 
                                      className="p-4 min-h-[400px] bg-white overflow-auto"
                                      style={{ backgroundColor: formData.backgroundColor }}
                                    >
                                      <div 
                                        className="max-w-full"
                                        dangerouslySetInnerHTML={{ 
                                          __html: formData.htmlContent
                                            .replace(/\{\{userName\}\}/g, 'John Doe')
                                            .replace(/\{\{dashboardUrl\}\}/g, '#')
                                            .replace(/\{\{questionTitle\}\}/g, 'Sample Question')
                                            .replace(/\{\{questionNumber\}\}/g, '1')
                                            .replace(/\{\{grade\}\}/g, 'Excellent')
                                            .replace(/\{\{feedback\}\}/g, 'Great work!')
                                            .replace(/\{\{primaryColor\}\}/g, formData.primaryColor)
                                            .replace(/\{\{secondaryColor\}\}/g, formData.secondaryColor)
                                            .replace(/\{\{backgroundColor\}\}/g, formData.backgroundColor)
                                            .replace(/\{\{textColor\}\}/g, formData.textColor)
                                            .replace(/\{\{buttonColor\}\}/g, formData.buttonColor)
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                Active template
                              </label>
                            </div>

                            <div className="flex space-x-4">
                              <button
                                onClick={() => handleSaveConfig(config.emailType)}
                                disabled={saveLoading === config.emailType}
                                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                              >
                                {saveLoading === config.emailType ? (
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
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">Subject</h4>
                                <p className="text-gray-600">{config.subject}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Status</h4>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {config.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-gray-900">Colors</h4>
                              <div className="flex space-x-2 mt-2">
                                {[
                                  { color: config.primaryColor, label: 'Primary' },
                                  { color: config.secondaryColor, label: 'Secondary' },
                                  { color: config.backgroundColor, label: 'Background' },
                                  { color: config.textColor, label: 'Text' },
                                  { color: config.buttonColor, label: 'Button' }
                                ].map(({ color, label }) => (
                                  <div key={label} className="text-center">
                                    <div 
                                      className="w-8 h-8 rounded border border-gray-300 mx-auto"
                                      style={{ backgroundColor: color }}
                                    ></div>
                                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-900">HTML Content Preview</h4>
                              <div className="bg-gray-100 p-4 rounded border max-h-40 overflow-auto">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                  {config.htmlContent.substring(0, 500)}
                                  {config.htmlContent.length > 500 ? '...' : ''}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : activeTab === 'cohort-settings' ? (
          <>
            {/* Cohort Management Form */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Cohort Details</h2>
              <form onSubmit={handleUpdateCohort} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="cohortNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Cohort Number *
                    </label>
                    <input
                      type="number"
                      id="cohortNumber"
                      value={cohortFormData.cohortNumber}
                      onChange={(e) => setCohortFormData(prev => ({ ...prev, cohortNumber: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cohortName" className="block text-sm font-medium text-gray-700 mb-2">
                      Cohort Name *
                    </label>
                    <input
                      type="text"
                      id="cohortName"
                      value={cohortFormData.name}
                      onChange={(e) => setCohortFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={cohortFormData.startDate}
                      onChange={(e) => setCohortFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={cohortFormData.endDate}
                      onChange={(e) => setCohortFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={cohortFormData.description}
                    onChange={(e) => setCohortFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter cohort description..."
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="submit"
                    disabled={cohortSaveLoading}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {cohortSaveLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">💾</span>
                        <span>Update Cohort</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleCohortStatus}
                    className={`px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 flex items-center space-x-2 ${
                      cohort.isActive
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                    }`}
                  >
                    <span className="text-xl">{cohort.isActive ? '🔴' : '🟢'}</span>
                    <span>{cohort.isActive ? 'Deactivate Cohort' : 'Activate Cohort'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Current Cohort Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Current Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-primary-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary-900">Cohort Number</h4>
                  <p className="text-2xl font-bold text-primary-600">#{cohort.cohortNumber}</p>
                </div>
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-secondary-900">Status</h4>
                  <p className={`text-2xl font-bold ${cohort.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {cohort.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900">Start Date</h4>
                  <p className="text-lg font-bold text-purple-600">
                    {new Date(cohort.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900">End Date</h4>
                  <p className="text-lg font-bold text-orange-600">
                    {cohort.endDate ? new Date(cohort.endDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
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

export default EmailSetupCohort;