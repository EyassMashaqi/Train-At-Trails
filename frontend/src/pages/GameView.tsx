import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getThemeClasses, getVehicleIcon } from '../utils/themes';

interface Question {
  id: string | number; // Allow both string and number for compatibility
  title: string;
  content: string;
  description?: string;
  questionNumber: number;
  releaseDate: string;
  deadline?: string;
  points?: number;
  bonusPoints?: number;
  hasAnswered?: boolean;
}

interface Answer {
  id: number;
  content: string;
  status: string;
  submittedAt: string;
  feedback?: string;
  question: Question;
  topic?: Topic;
}

interface Topic {
  id: string;
  topicNumber: number;
  title: string;
  content: string;
  description: string;
  deadline: string;
  points: number;
  bonusPoints: number;
  isReleased: boolean;
  module: Module;
  contents?: Content[];
  questionNumber?: number;
}

interface Content {
  id: string;
  title: string;
  material: string;
  orderIndex: number;
  miniQuestions: MiniQuestion[];
}

interface Module {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  deadline: string;
  isReleased: boolean;
  topics: Topic[];
}

interface MiniQuestion {
  id: string;
  title: string;
  question: string;
  description: string;
  orderIndex: number;
  isReleased: boolean;
  releaseDate: string;
  hasAnswer: boolean;
  answer?: {
    id: string;
    linkUrl: string;
    notes: string;
    submittedAt: string;
  };
  contentId: string;
  contentTitle: string;
  questionId?: string;
  questionTitle?: string;
  questionNumber?: number;
}

interface TrailProgress {
  currentStep: number;
  totalSteps: number;
  answers: Answer[];
}

interface LeaderboardUser {
  id: string;
  fullName: string;
  trainName: string;
  currentStep: number;
  createdAt: string;
}

const GameView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  
  // Get theme-specific classes
  const themeClasses = useMemo(() => getThemeClasses(currentTheme), [currentTheme]);
  const vehicleIcon = useMemo(() => getVehicleIcon(currentTheme), [currentTheme]);
  
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTrainAnimation] = useState(false); // Static false - animation triggered by main questions which are disabled
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [userCohortInfo, setUserCohortInfo] = useState<{id: string, name: string, description?: string} | null>(null);
  
  // Self learning activities state
  const [miniQuestions, setMiniQuestions] = useState<MiniQuestion[]>([]);
  const [miniAnswers, setMiniAnswers] = useState<Record<string, { linkUrl: string; notes: string }>>({});
  const [submittingMini, setSubmittingMini] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{[key: string]: {isValid: boolean, message: string}}>({});
  
  // Main question answer state
  const [answerContent, setAnswerContent] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Target question state for main assignment
  const [targetQuestion, setTargetQuestion] = useState<Question | null>(null);

  // URL validation function
  const validateUrl = (url: string): {isValid: boolean, message: string} => {
    if (!url.trim()) {
      return { isValid: false, message: '' };
    }

    try {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const isValidPattern = urlPattern.test(url);
      
      if (!isValidPattern) {
        return { isValid: false, message: 'Please enter a valid URL (e.g., https://example.com)' };
      }
      
      // Check if URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { isValid: true, message: 'URL looks good! (Protocol will be added automatically)' };
      }
      
      return { isValid: true, message: 'Valid URL format ✓' };
    } catch (error) {
      return { isValid: false, message: 'Invalid URL format' };
    }
  };

  // Helper function to calculate total released questions
  const getTotalReleasedQuestions = (): number => {
    // Use progress.totalSteps if available (from backend calculation)
    if (progress?.totalSteps) {
      return progress.totalSteps;
    }

    // Fallback: count released questions from modules and current question
    let totalReleased = 0;

    // Count released topics from modules
    modules.forEach(module => {
      if (module.isReleased) {
        module.topics.forEach(topic => {
          if (topic.isReleased) {
            totalReleased++;
          }
        });
      }
    });

    // Add current question if no modules exist (legacy mode)
    if (currentQuestion && (!modules || modules.length === 0)) {
      totalReleased = Math.max(totalReleased, currentQuestion.questionNumber);
    }

    // Return calculated total or minimum of 1 (no hardcoded fallback to 12)
    return Math.max(totalReleased, 1);
  };

  useEffect(() => {
    // Check cohort enrollment before loading game data
    checkCohortEnrollment();
  }, []);

  const checkCohortEnrollment = async () => {
    try {
      const response = await gameService.checkCohortStatus();
      const { isEnrolled } = response.data;
      
      if (!isEnrolled) {
        console.log('🎯 User not enrolled in any cohort, redirecting to cohort selection...');
        navigate('/cohort-history');
        return;
      }
      
      // If enrolled, proceed to load game data
      loadGameData();
    } catch (error) {
      console.error('Failed to check cohort status:', error);
      // If we can't check cohort status, still try to load game data
      // The error will be handled in loadGameData
      loadGameData();
    }
  };

  // Calculate target question based on current progress and modules
  const calculateTargetQuestion = useMemo(() => {
    if (!progress || !modules || modules.length === 0) return null;

    const userCurrentStep = progress.currentStep;
    
    let foundTargetQuestion = null;
    
    // Look through modules to find a question where the user can submit the main assignment
    // This should be a question where:
    // 1. The question is released
    // 2. Either no mini-questions exist OR all mini-questions are completed
    // 3. The user hasn't already answered this question
    
    for (const module of modules) {
      if (module.isReleased) {
        for (const topic of module.topics) {
          if (topic.isReleased) {
            const topicNumber = topic.questionNumber || topic.topicNumber;
            
            // Check if backend says this topic is available (it handles all future mini-questions logic)
            const isTopicAvailable = topic.status === 'available';
            
            // Get mini-questions for this topic (for display purposes)
            const topicMiniQuestions = miniQuestions.filter(mq => 
              mq.questionNumber === topicNumber
            );
            
            const completedMiniQuestions = topicMiniQuestions.filter(mq => mq.hasAnswer).length;
            const allMiniQuestionsCompleted = topicMiniQuestions.length === 0 || completedMiniQuestions === topicMiniQuestions.length;
            
            // Check if user has already answered this question
            const hasAnswered = progress?.answers?.some(answer => 
              answer.question.questionNumber === topicNumber
            );
            
            // Check if there are future mini-questions by comparing backend progress data
            const hasFutureMiniQuestions = topic.miniQuestionProgress?.hasFutureMiniQuestions || false;
            
            console.log(`🔍 Checking topic ${topicNumber}:`, {
              topicTitle: topic.title,
              topicNumber,
              userCurrentStep,
              totalMiniQuestions: topicMiniQuestions.length,
              completedMiniQuestions,
              allMiniQuestionsCompleted,
              hasAnswered,
              isTopicAvailable,
              hasFutureMiniQuestions,
              backendStatus: topic.status,
              isAvailable: isTopicAvailable && !hasAnswered
            });
            
            // Use backend status to determine if this topic is available
            if (isTopicAvailable && !hasAnswered) {
              foundTargetQuestion = {
                id: topic.id, // Keep as string, don't convert to int
                questionNumber: topicNumber,
                title: topic.title,
                description: topic.description,
                content: topic.content || '',
                releaseDate: topic.deadline,
                hasAnswered: false
              };
              console.log('🎯 Found target question:', foundTargetQuestion);
              break;
            }
          }
        }
        if (foundTargetQuestion) break;
      }
    }
    
    // Fallback to currentQuestion if no topic found (legacy mode)
    if (!foundTargetQuestion && currentQuestion) {
      foundTargetQuestion = currentQuestion;
      console.log('🔄 Using fallback currentQuestion:', foundTargetQuestion);
    }
    
    console.log('📝 Final target question result:', foundTargetQuestion);
    return foundTargetQuestion;
  }, [progress, modules, currentQuestion, miniQuestions]);

  // Update target question state when calculated value changes
  useEffect(() => {
    console.log('🎯 Target question calculation:', {
      calculateTargetQuestion,
      userCurrentStep: progress?.currentStep,
      modulesCount: modules?.length,
      miniQuestionsCount: miniQuestions?.length
    });
    setTargetQuestion(calculateTargetQuestion);
  }, [calculateTargetQuestion]);

  const loadGameData = async () => {
    try {
      setLoading(true);
      console.log('🎮 GameView: Loading game data...');
      
      const [progressResponse, leaderboardResponse, modulesResponse] = await Promise.all([
        gameService.getProgress(),
        gameService.getLeaderboard(),
        gameService.getModules()
      ]);

      console.log('🎮 GameView: Raw API responses:', {
        progress: progressResponse.data,
        leaderboard: leaderboardResponse.data,
        modules: modulesResponse.data
      });

      const data = progressResponse.data;

      // Extract progress and current question from the single response
      setProgress({
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answers: data.answers
      });
      setCurrentQuestion(data.currentQuestion);

      // Extract cohort information if available
      if (data.cohort) {
        setUserCohortInfo({
          id: data.cohort.id,
          name: data.cohort.name,
          description: data.cohort.description
        });
      }

      // Collect all mini-questions from all released topics in modules
      let allMiniQuestions: MiniQuestion[] = [];
      const modulesData = modulesResponse.data.modules || [];
      
      modulesData.forEach((module: Module) => {
        if (module.isReleased) {
          module.topics.forEach((topic: Topic) => {
            if (topic.isReleased && topic.contents) {
              topic.contents.forEach((content: Content) => {
                if (content.miniQuestions) {
                  content.miniQuestions.forEach((mq: any) => {
                    // Check if mini-question is released based on its release date
                    const releaseDate = new Date(mq.releaseDate);
                    const currentDate = new Date();
                    
                    // Only include mini-questions that are both marked as released AND have a release date in the past
                    if (mq.isReleased && releaseDate <= currentDate) {
                      allMiniQuestions.push({
                        ...mq,
                        questionNumber: topic.questionNumber || topic.topicNumber,
                        questionTitle: topic.title,
                        contentId: content.id,
                        contentTitle: content.title
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });

      // Set all mini-questions (from modules + legacy current question if any)
      if (allMiniQuestions.length > 0) {
        setMiniQuestions(allMiniQuestions);
        
        // Initialize mini answers state with existing answers
        setMiniAnswers(prevMiniAnswers => {
          const updatedMiniAnswers: Record<string, { linkUrl: string; notes: string }> = { ...prevMiniAnswers };
          
          allMiniQuestions.forEach((mq: MiniQuestion) => {
            // Only update if we don't already have form data for this question
            if (!updatedMiniAnswers[mq.id]) {
              if (mq.hasAnswer && mq.answer) {
                updatedMiniAnswers[mq.id] = {
                  linkUrl: mq.answer.linkUrl || '',
                  notes: mq.answer.notes || ''
                };
              } else {
                updatedMiniAnswers[mq.id] = { linkUrl: '', notes: '' };
              }
            }
          });
          
          return updatedMiniAnswers;
        });
      } else {
        // Fallback to legacy current question mini-questions if no modules mini-questions
        if (data.currentQuestionMiniQuestions) {
          setMiniQuestions(data.currentQuestionMiniQuestions);
          
          // Initialize mini answers state with existing answers, preserving current form state
          setMiniAnswers(prevMiniAnswers => {
            const updatedMiniAnswers: Record<string, { linkUrl: string; notes: string }> = { ...prevMiniAnswers };
            
            data.currentQuestionMiniQuestions.forEach((mq: MiniQuestion) => {
              // Only update if we don't already have form data for this question
              if (!updatedMiniAnswers[mq.id]) {
                if (mq.hasAnswer && mq.answer) {
                  updatedMiniAnswers[mq.id] = {
                    linkUrl: mq.answer.linkUrl || '',
                    notes: mq.answer.notes || ''
                  };
                } else {
                  updatedMiniAnswers[mq.id] = { linkUrl: '', notes: '' };
                }
              }
            });
            
            return updatedMiniAnswers;
          });
        } else {
          setMiniQuestions([]);
        }
      }

      // Set current topic data if available
      // Note: currentTopic functionality is disabled as we focus on self learning activities only
      // if (data.currentTopicData) {
      //   setCurrentTopic(data.currentTopicData);
      // }

      // Set modules data
      setModules(modulesResponse.data.modules || []);

      // Auto-expand released modules
      const initialExpanded: Record<string, boolean> = {};
      modulesResponse.data.modules?.forEach((module: Module) => {
        if (module.isReleased) {
          initialExpanded[module.id] = true;
        }
      });
      setExpandedModules(initialExpanded);

      // Check all possible property names
      const possibleData = leaderboardResponse.data.users ||
        leaderboardResponse.data.leaderboard ||
        (Array.isArray(leaderboardResponse.data) ? leaderboardResponse.data : []);

      setLeaderboard(possibleData);
      setLeaderboardLoading(false);
    } catch (error) {
      console.error('Failed to load game data:', error);
      
      // Check if the error is due to user not being enrolled in any cohort
      const axiosError = error as any;
      if (axiosError?.response?.status === 400 && 
          (axiosError?.response?.data?.error?.includes('not enrolled in any active cohort') ||
           axiosError?.response?.data?.error?.includes('not enrolled in any cohort'))) {
        console.log('🎯 User not enrolled in any cohort, redirecting to cohort selection...');
        navigate('/cohort-history');
        return;
      }
      
      const errorMessage = error instanceof Error
        ? error.message
        : ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load game data');
      toast.error(errorMessage);
      setLeaderboardLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Self learning activity handlers
  const handleMiniAnswerChange = (miniQuestionId: string, field: 'linkUrl' | 'notes', value: string) => {
    setMiniAnswers(prev => ({
      ...prev,
      [miniQuestionId]: {
        ...prev[miniQuestionId],
        [field]: value
      }
    }));

    // Validate URL in real-time if it's the linkUrl field
    if (field === 'linkUrl') {
      const validation = validateUrl(value);
      setUrlValidation(prev => ({
        ...prev,
        [miniQuestionId]: validation
      }));
    }
  };

  const handleMiniAnswerSubmit = async (miniQuestionId: string) => {
    try {
      setSubmittingMini(miniQuestionId);
      const answerData = miniAnswers[miniQuestionId];
      
      if (!answerData.linkUrl.trim()) {
        toast.error('Please provide a link URL');
        return;
      }

      // Auto-add protocol if missing
      let linkUrl = answerData.linkUrl.trim();
      if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
        linkUrl = 'https://' + linkUrl;
      }

      await gameService.submitMiniAnswer({
        miniQuestionId,
        linkUrl: linkUrl,
        notes: answerData.notes.trim()
      });

      toast.success('Self learning activity answer submitted successfully!');
      await loadGameData(); // Refresh data
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit mini answer';
      toast.error(errorMessage);
    } finally {
      setSubmittingMini(null);
    }
  };

  // Main question submission handler
  const handleMainAnswerSubmit = async () => {
    if (!answerContent.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    if (!targetQuestion) {
      toast.error('No target question available');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Submitting answer with target question:', {
        id: targetQuestion.id,
        questionNumber: targetQuestion.questionNumber,
        title: targetQuestion.title
      });
      
      // Pass as questionId since the backend recognizes questionId parameter
      await gameService.submitAnswer(
        answerContent.trim(), 
        targetQuestion.id.toString(), // questionId
        answerFile
      );
      toast.success('Answer submitted successfully!');
      
      // Clear form
      setAnswerContent('');
      setAnswerFile(null);
      
      // Refresh data
      await loadGameData();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit answer';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTrailProgress = () => {
    if (!progress) return null;

    const steps = Array.from({ length: progress.totalSteps }, (_, i) => i + 1);

    // Get theme-specific track rendering
    const renderTrack = () => {
      switch (currentTheme.id) {
        case 'trains':
          return (
            <>
              {/* Railway Track */}
              <div className="relative h-24 bg-gradient-to-r from-amber-100 to-amber-50 rounded-lg overflow-hidden shadow-inner">
                {/* Rails */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
                <div className="absolute top-14 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>

                {/* Railway Ties */}
                {steps.map((step) => (
                  <div
                    key={step}
                    className="absolute top-6 w-1 h-12 bg-amber-800 opacity-70"
                    style={{ left: `${(step / progress.totalSteps) * 100}%` }}
                  ></div>
                ))}
              </div>
            </>
          );

        case 'planes':
          return (
            <>
              {/* Sky with Clouds */}
              <div className="relative h-24 bg-gradient-to-r from-sky-300 via-blue-200 to-cyan-300 rounded-lg overflow-hidden shadow-inner">
                {/* Cloud layer */}
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute top-2 left-4 w-8 h-4 bg-white rounded-full opacity-60"></div>
                  <div className="absolute top-1 left-6 w-6 h-3 bg-white rounded-full opacity-50"></div>
                  <div className="absolute top-4 left-20 w-10 h-5 bg-white rounded-full opacity-70"></div>
                  <div className="absolute top-3 left-22 w-7 h-4 bg-white rounded-full opacity-60"></div>
                  <div className="absolute top-5 left-40 w-9 h-4 bg-white rounded-full opacity-65"></div>
                  <div className="absolute top-2 left-60 w-8 h-4 bg-white rounded-full opacity-55"></div>
                  <div className="absolute top-6 left-80 w-11 h-5 bg-white rounded-full opacity-75"></div>
                </div>
                
                {/* Flight path (dotted line) */}
                <div className="absolute top-10 left-0 right-0 h-0.5 border-t-2 border-dashed border-white opacity-60"></div>
                
                {/* Wind currents */}
                <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
                <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
              </div>
            </>
          );

        case 'sailboat':
          return (
            <>
              {/* Ocean Water */}
              <div className="relative h-24 bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 rounded-lg overflow-hidden shadow-inner">
                {/* Water waves */}
                <div className="absolute inset-0">
                  <svg className="w-full h-full" viewBox="0 0 400 96" preserveAspectRatio="none">
                    <path
                      d="M0,32 Q100,16 200,32 T400,32 L400,96 L0,96 Z"
                      fill="rgba(59, 130, 246, 0.3)"
                    />
                    <path
                      d="M0,48 Q100,32 200,48 T400,48 L400,96 L0,96 Z"
                      fill="rgba(20, 184, 166, 0.2)"
                    />
                    <path
                      d="M0,64 Q100,48 200,64 T400,64 L400,96 L0,96 Z"
                      fill="rgba(16, 185, 129, 0.1)"
                    />
                  </svg>
                </div>

                {/* Sailing route */}
                <div className="absolute top-10 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-white to-blue-200 opacity-50"></div>
                
                {/* Water ripples at stations */}
                {steps.map((step) => (
                  <div
                    key={step}
                    className="absolute top-8 w-3 h-3 border border-white rounded-full opacity-30"
                    style={{ left: `${(step / progress.totalSteps) * 100}%`, transform: 'translateX(-50%)' }}
                  ></div>
                ))}
              </div>
            </>
          );

        case 'cars':
          return (
            <>
              {/* Road */}
              <div className="relative h-24 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-lg overflow-hidden shadow-inner">
                {/* Road surface */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700"></div>
                
                {/* Lane markings */}
                <div className="absolute top-9 left-0 right-0 h-1 bg-yellow-300"></div>
                <div className="absolute top-13 left-0 right-0 h-0.5 bg-white opacity-60"></div>
                
                {/* Dashed center line */}
                <div className="absolute top-11 left-0 right-0 h-0.5 flex">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-t-2 border-dashed border-yellow-200 mr-1"
                    ></div>
                  ))}
                </div>

                {/* Road markers at stations */}
                {steps.map((step) => (
                  <div
                    key={step}
                    className="absolute top-6 w-2 h-12 bg-yellow-400 opacity-70"
                    style={{ left: `${(step / progress.totalSteps) * 100}%`, transform: 'translateX(-50%)' }}
                  ></div>
                ))}
              </div>
            </>
          );

        case 'f1':
          return (
            <>
              {/* F1 Racing Track */}
              <div className="relative h-24 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-inner">
                {/* Track surface */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-800 to-black opacity-90"></div>
                
                {/* Racing lines */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-red-500"></div>
                <div className="absolute top-14 left-0 right-0 h-1 bg-red-500"></div>
                
                {/* Checkered pattern */}
                <div className="absolute top-10 left-0 right-0 h-2 flex">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 ${i % 2 === 0 ? 'bg-white' : 'bg-black'}`}
                    ></div>
                  ))}
                </div>

                {/* Racing markers */}
                {steps.map((step) => (
                  <div
                    key={step}
                    className="absolute top-6 w-1 h-12 bg-red-400 opacity-80"
                    style={{ left: `${(step / progress.totalSteps) * 100}%` }}
                  ></div>
                ))}
                
                {/* Tire marks */}
                <div className="absolute top-16 left-0 right-0 h-0.5 bg-gray-400 opacity-30"></div>
                <div className="absolute top-18 left-0 right-0 h-0.5 bg-gray-400 opacity-30"></div>
              </div>
            </>
          );

        default:
          return (
            <div className="relative h-24 bg-gradient-to-r from-amber-100 to-amber-50 rounded-lg overflow-hidden shadow-inner">
              <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
              <div className="absolute top-14 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
            </div>
          );
      }
    };

    return (
      <div className="relative mb-8">
        {/* Theme-specific track/path */}
        {renderTrack()}

        {/* Vehicle */}
        <div
          className={`absolute top-2 transition-all duration-1000 ease-out ${showTrainAnimation ? 'transform scale-110' : ''
            }`}
          style={{
            left: `${(progress.currentStep / progress.totalSteps) * 95}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="relative">
            <span className="text-6xl drop-shadow-lg filter">{vehicleIcon}</span>
            {showTrainAnimation && (
              <div className="absolute -top-2 -right-2 animate-ping">
                <span className="text-2xl">💨</span>
              </div>
            )}
          </div>
        </div>

        {/* Station/Checkpoint Markers */}
        {steps.map((step) => (
          <div
            key={step}
            className="absolute top-16 transform -translate-x-1/2"
            style={{ left: `${(step / progress.totalSteps) * 100}%` }}
          >
            <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center text-xs font-bold transition-all duration-300 ${step <= progress.currentStep
                ? `${themeClasses.accentButton} ${themeClasses.accentBorder} ${themeClasses.buttonText} shadow-lg`
                : step === progress.currentStep + 1
                  ? `${themeClasses.secondaryButton} ${themeClasses.secondaryBorder} ${themeClasses.buttonText} animate-pulse shadow-lg`
                  : 'bg-gray-300 border-gray-400 text-gray-700'
              }`}>
              {step}
            </div>
            <div className={`text-xs text-center mt-1 font-medium ${themeClasses.textSecondary}`}>
              {step <= progress.currentStep ? '✓' : step === progress.currentStep + 1 ? '⭐' : '○'}
            </div>
          </div>
        ))}

        {/* Progress Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className={`bg-white rounded-lg p-4 shadow-lg border ${themeClasses.primaryBorder}`}>
            <div className={`text-2xl font-bold ${themeClasses.primaryText}`}>{progress.currentStep}</div>
            <div className={`text-sm ${themeClasses.textSecondary}`}>Steps Completed</div>
          </div>
          <div className={`bg-white rounded-lg p-4 shadow-lg border ${themeClasses.accentBorder}`}>
            <div className={`text-2xl font-bold ${themeClasses.accentText}`}>{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</div>
            <div className={`text-sm ${themeClasses.textSecondary}`}>Progress</div>
          </div>
          <div className={`bg-white rounded-lg p-4 shadow-lg border ${themeClasses.primaryBorder}`}>
            <div className={`text-2xl font-bold ${themeClasses.primaryText}`}>{progress.totalSteps - progress.currentStep}</div>
            <div className={`text-sm ${themeClasses.textSecondary}`}>Steps Remaining</div>
          </div>
        </div>
      </div>
    );
  };

  // Render self learning activities grouped by main question
  const renderMiniQuestions = () => {
    if (!miniQuestions || miniQuestions.length === 0) {
      return (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl mr-3">🎯</span>
              <div className="text-center">
                <h3 className="text-xl font-bold text-secondary-800">Learning Activities</h3>
                <p className="text-secondary-600">No self learning activities available yet</p>
              </div>
            </div>
            <p className="text-secondary-700 text-center">
              Self learning activities will appear here when they are released. Check back soon!
            </p>
          </div>
        </div>
      );
    }

    // Group self learning activities by their main question
    const groupedMiniQuestions = miniQuestions.reduce((groups, miniQuestion) => {
      const questionNumber = miniQuestion.questionNumber || 1; // Fallback to 1 if undefined
      const questionKey = `Q${questionNumber}`;
      const questionTitle = miniQuestion.questionTitle || `Question ${questionNumber}`;
      
      if (!groups[questionKey]) {
        groups[questionKey] = {
          questionNumber: questionNumber,
          questionTitle: questionTitle,
          miniQuestions: []
        };
      }
      
      groups[questionKey].miniQuestions.push(miniQuestion);
      return groups;
    }, {} as Record<string, { questionNumber: number; questionTitle: string; miniQuestions: MiniQuestion[] }>);

    // Auto-expand incomplete question groups and fold completed ones
    const initialExpanded: Record<string, boolean> = {};
    Object.entries(groupedMiniQuestions).forEach(([questionKey, group]) => {
      const groupCompleted = group.miniQuestions.filter(mq => mq.hasAnswer).length;
      const groupTotal = group.miniQuestions.length;
      const isFullyCompleted = groupCompleted === groupTotal;
      
      // Expand if incomplete, fold if completed
      initialExpanded[questionKey] = !isFullyCompleted;
    });
    
    // Only set initial state if not already set
    const currentExpandedKeys = Object.keys(expandedQuestions);
    const groupedKeys = Object.keys(groupedMiniQuestions);
    const needsInitialization = groupedKeys.some(key => !currentExpandedKeys.includes(key));
    
    if (needsInitialization) {
      setExpandedQuestions(prev => ({ ...prev, ...initialExpanded }));
    }

    const completedMiniQuestions = miniQuestions.filter(mq => mq.hasAnswer).length;
    const totalMiniQuestions = miniQuestions.length;
    const allMiniQuestionsCompleted = completedMiniQuestions === totalMiniQuestions;

    const toggleQuestionGroup = (questionKey: string) => {
      setExpandedQuestions(prev => ({
        ...prev,
        [questionKey]: !prev[questionKey]
      }));
    };

    return (
      <div className="mb-8">
        <div className={`bg-gradient-to-br ${themeClasses.cardBg} border ${themeClasses.primaryBorder} rounded-xl p-6 shadow-lg`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              <div>
                <h3 className={`text-xl font-bold ${themeClasses.primaryText}`}>Learning Activities</h3>
                <p className={`${themeClasses.primaryText} opacity-80`}>Complete these activities by providing relevant links</p>
              </div>
            </div>
            <div className={`${themeClasses.accentBg} rounded-lg px-3 py-1`}>
              <span className="text-primary-800 font-semibold">
                {completedMiniQuestions}/{totalMiniQuestions} completed
              </span>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className={`flex justify-between text-sm ${themeClasses.primaryText} mb-1`}>
              <span>Overall Progress</span>
              <span>{totalMiniQuestions > 0 ? Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0}%</span>
            </div>
            <div className={`w-full ${themeClasses.primaryBg} rounded-full h-2`}>
              <div
                className={`${themeClasses.primaryButton} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${totalMiniQuestions > 0 ? (completedMiniQuestions / totalMiniQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Grouped Self Learning Activities */}
          <div className="space-y-4">
            {Object.entries(groupedMiniQuestions).map(([questionKey, group]) => {
              const isExpanded = expandedQuestions[questionKey];
              const groupCompleted = group.miniQuestions.filter(mq => mq.hasAnswer).length;
              const groupTotal = group.miniQuestions.length;
              const isFullyCompleted = groupCompleted === groupTotal;

              return (
                <div key={questionKey} className={`border ${themeClasses.primaryBorder} rounded-lg overflow-hidden`}>
                  {/* Question Group Header */}
                  <div
                    className={`p-4 cursor-pointer transition-colors ${
                      isFullyCompleted 
                        ? `${themeClasses.accentBg} ${themeClasses.accentBgHover} ${themeClasses.accentBorder}` 
                        : `bg-white hover:${themeClasses.accentBg}`
                    }`}
                    onClick={() => toggleQuestionGroup(questionKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">
                          {isFullyCompleted ? '✅' : '📝'}
                        </span>
                        <div>
                          <h4 className={`font-semibold ${
                            isFullyCompleted ? themeClasses.accentTextSafe : themeClasses.primaryTextDark
                          }`}>
                            {questionKey}: {group.questionTitle}
                          </h4>
                          <p className={`text-sm ${
                            isFullyCompleted ? themeClasses.accentText : themeClasses.primaryText
                          }`}>
                            {groupCompleted}/{groupTotal} activities completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Progress indicator */}
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isFullyCompleted ? themeClasses.accentButton : themeClasses.primaryButton
                              }`}
                              style={{ width: `${(groupCompleted / groupTotal) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs ${themeClasses.textMuted} min-w-[3rem]`}>
                            {Math.round((groupCompleted / groupTotal) * 100)}%
                          </span>
                        </div>
                        {/* Expand/Collapse Icon */}
                        <div className={`transform transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}>
                          <span className={`${themeClasses.primaryText} text-xl`}>▼</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Group Content */}
                  {isExpanded && (
                    <div className={`border-t ${themeClasses.primaryBorder} bg-gray-50`}>
                      <div className="p-4 space-y-3">
                        {group.miniQuestions.map((miniQuestion, index) => (
                          <div 
                            key={miniQuestion.id}
                            className={`border rounded-lg p-4 ${
                              miniQuestion.hasAnswer ? `${themeClasses.accentBg} ${themeClasses.accentBorder}` : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">
                                  {miniQuestion.hasAnswer ? '✅' : '❓'}
                                </span>
                                <div>
                                  <h5 className={`font-semibold ${themeClasses.textPrimary}`}>
                                    #{index + 1}: {miniQuestion.title}
                                  </h5>
                                  {miniQuestion.description && (
                                    <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>{miniQuestion.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {miniQuestion.hasAnswer ? (
                              <div className={`${themeClasses.accentBg} rounded-lg p-3`}>
                                <p className={`${themeClasses.accentTextSafe} font-medium mb-2`}>✅ Completed</p>
                                <div className={`text-sm ${themeClasses.accentTextSafeLight}`}>
                                  <p><strong>Link:</strong> <a href={miniQuestion.answer?.linkUrl} target="_blank" rel="noopener noreferrer" className={`${themeClasses.primaryText} hover:underline`}>{miniQuestion.answer?.linkUrl}</a></p>
                                  {miniQuestion.answer?.notes && (
                                    <p className="mt-1"><strong>Notes:</strong> {miniQuestion.answer.notes}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                                    Link URL *
                                  </label>
                                  <input
                                    type="url"
                                    value={miniAnswers[miniQuestion.id]?.linkUrl || ''}
                                    onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'linkUrl', e.target.value)}
                                    placeholder="https://example.com/article"
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                                      urlValidation[miniQuestion.id]?.isValid === false && miniAnswers[miniQuestion.id]?.linkUrl
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : urlValidation[miniQuestion.id]?.isValid === true
                                          ? 'border-accent-300 focus:ring-accent-500 focus:border-accent-500'
                                          : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                    }`}
                                  />
                                  {urlValidation[miniQuestion.id]?.message && (
                                    <p className={`text-xs mt-1 ${
                                      urlValidation[miniQuestion.id]?.isValid 
                                        ? themeClasses.accentTextSafeMedium 
                                        : 'text-red-500'
                                    }`}>
                                      {urlValidation[miniQuestion.id]?.message}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                                    Notes (optional)
                                  </label>
                                  <textarea
                                    value={miniAnswers[miniQuestion.id]?.notes || ''}
                                    onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'notes', e.target.value)}
                                    placeholder="Add any additional notes or thoughts..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  />
                                </div>
                                <button
                                  onClick={() => handleMiniAnswerSubmit(miniQuestion.id)}
                                  disabled={submittingMini === miniQuestion.id || !miniAnswers[miniQuestion.id]?.linkUrl?.trim()}
                                  className={`${themeClasses.primaryButton} ${themeClasses.buttonText} px-4 py-2 rounded-lg ${themeClasses.primaryButtonHover} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                                >
                                  {submittingMini === miniQuestion.id ? (
                                    <div className="flex items-center">
                                      <span className="animate-spin mr-2">⏳</span>
                                      Submitting...
                                    </div>
                                  ) : (
                                    'Submit Answer'
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allMiniQuestionsCompleted && (
            <div className={`mt-6 ${themeClasses.accentBg} border ${themeClasses.accentBorder} rounded-lg p-4`}>
              <div className="flex items-center">
                <span className={`${themeClasses.accentTextSafeMedium} text-xl mr-3`}>🎉</span>
                <div>
                  <p className={`${themeClasses.accentTextSafe} font-medium`}>Excellent work!</p>
                  <p className={`${themeClasses.accentTextSafeLight} text-sm`}>You've completed all available self learning activities for this assignment.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentQuestion = () => {
    if (!progress || !targetQuestion) return null;

    // Get mini-questions specifically for this question/topic
    const questionMiniQuestions = miniQuestions.filter(mq => 
      mq.questionNumber === targetQuestion.questionNumber
    );
    
    const completedQuestionMiniQuestions = questionMiniQuestions.filter(mq => mq.hasAnswer).length;
    const totalQuestionMiniQuestions = questionMiniQuestions.length;
    const questionMiniQuestionsCompleted = totalQuestionMiniQuestions === 0 || completedQuestionMiniQuestions === totalQuestionMiniQuestions;

    // Check if there are future mini-questions by looking at the backend progress data
    const relatedTopic = modules?.flatMap(m => m.topics)?.find(t => 
      t.questionNumber === targetQuestion.questionNumber || t.topicNumber === targetQuestion.questionNumber
    );
    const hasFutureMiniQuestions = relatedTopic?.miniQuestionProgress?.hasFutureMiniQuestions || false;
    const totalAllMiniQuestions = relatedTopic?.miniQuestionProgress?.totalAll || totalQuestionMiniQuestions;
    const completedAllMiniQuestions = relatedTopic?.miniQuestionProgress?.completedAll || completedQuestionMiniQuestions;

    // Main assignment is locked if there are any incomplete mini-questions (current or future)
    const isMainAssignmentLocked = totalAllMiniQuestions > 0 && completedAllMiniQuestions < totalAllMiniQuestions;

    // Only show main question form if:
    // 1. All mini-questions (including future ones) are completed
    // 2. User hasn't already answered this question
    if (isMainAssignmentLocked) {
      const remainingMiniQuestions = totalAllMiniQuestions - completedAllMiniQuestions;
      const futureQuestionsText = hasFutureMiniQuestions 
        ? " (including upcoming activities not yet available)" 
        : "";
      
      return (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <span className="text-3xl mr-3">🔐</span>
                <div>
                  <h3 className="text-xl font-bold text-orange-800">Main Assignment Locked</h3>
                  <p className="text-orange-600">Complete all self-learning activities first</p>
                </div>
              </div>
              <div className="bg-orange-100 rounded-lg px-3 py-1">
                <span className="text-orange-800 font-semibold">Locked</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-6 border border-orange-200">
              <h4 className={`font-semibold ${themeClasses.textPrimary} mb-2`}>
                Question {targetQuestion.questionNumber}: {targetQuestion.title}
              </h4>
              <p className={`${themeClasses.textSecondary} mb-2`}>{targetQuestion.description}</p>
            </div>
            
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-orange-600 text-xl mr-3">🎯</span>
                <div>
                  <p className="text-orange-800 font-medium">Self-Learning Required</p>
                  <p className="text-orange-700 text-sm">
                    Complete {remainingMiniQuestions} more self-learning activities to unlock this assignment{futureQuestionsText}.
                  </p>
                  <div className="mt-2">
                    <div className="w-full bg-orange-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalAllMiniQuestions > 0 ? (completedAllMiniQuestions / totalAllMiniQuestions) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-orange-600 mt-1">
                      Progress: {completedAllMiniQuestions}/{totalAllMiniQuestions} activities completed
                      {hasFutureMiniQuestions && ` (${totalQuestionMiniQuestions} currently available)`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if user has already answered this question
    const hasAnswered = progress?.answers?.some(answer => 
      answer.question.id === targetQuestion.id || 
      answer.question.questionNumber === targetQuestion.questionNumber
    );

    return (
      <div className="mb-8">
        <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">📝</span>
              <div>
                <h3 className={`text-xl font-bold ${themeClasses.accentTextSafe}`}>Main Assignment</h3>
                <p className={`${themeClasses.accentTextSafeMedium}`}>Ready to submit your answer</p>
              </div>
            </div>
            <div className={`${themeClasses.accentBg} rounded-lg px-3 py-1`}>
              <span className={`${themeClasses.accentTextSafe} font-semibold`}>
                {hasAnswered ? 'Completed' : 'Available'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6 border border-accent-200">
            <h4 className={`font-semibold ${themeClasses.textPrimary} mb-2`}>
              Question {targetQuestion.questionNumber}: {targetQuestion.title}
            </h4>
            <p className={`${themeClasses.textSecondary} mb-2`}>{targetQuestion.description}</p>
            {targetQuestion.content && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className={`text-sm ${themeClasses.textSecondary}`}>{targetQuestion.content}</p>
              </div>
            )}
          </div>

          {hasAnswered ? (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-3">✅</span>
                <div>
                  <p className="text-green-800 font-medium">Answer Submitted</p>
                  <p className="text-green-700 text-sm">Your answer has been submitted and is awaiting review.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                  Your Answer *
                </label>
                <textarea
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  placeholder="Write your detailed answer here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                  Attachment (optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                {answerFile && (
                  <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                    Selected: {answerFile.name} ({Math.round(answerFile.size / 1024)} KB)
                  </p>
                )}
                <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
                </p>
              </div>

              <button
                onClick={handleMainAnswerSubmit}
                disabled={submitting || !answerContent.trim()}
                className={`${themeClasses.accentButton} ${themeClasses.buttonText} px-6 py-3 rounded-lg ${themeClasses.accentButtonHover} disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium`}
              >
                {submitting ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting Answer...
                  </div>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    if (leaderboardLoading) {
      return (
        <div className="mt-12 mb-8">
          <h3 className={`text-3xl font-bold mb-8 text-center flex items-center justify-center ${themeClasses.primaryText}`}>
            <span className="mr-3">🏆</span>
            {themeClasses.leaderboardTitle}
            <span className="ml-3">{vehicleIcon}</span>
          </h3>
          <div className={`text-center ${themeClasses.textMuted}`}>
            Loading leaderboard...
          </div>
        </div>
      );
    }

    if (!leaderboard || leaderboard.length === 0) {
      return (
        <div className="mt-12 mb-8">
          <h3 className={`text-3xl font-bold mb-8 text-center flex items-center justify-center ${themeClasses.primaryText}`}>
            <span className="mr-3">🏆</span>
            {themeClasses.leaderboardTitle}
            <span className="ml-3">{vehicleIcon}</span>
          </h3>
          <div className={`text-center py-12 bg-gradient-to-r ${themeClasses.leaderboardBg} rounded-2xl shadow-xl border ${themeClasses.primaryBorder}`}>
            <div className="text-6xl mb-4">{vehicleIcon}</div>
            <h4 className={`text-xl font-semibold mb-2 ${themeClasses.primaryText}`}>All {currentTheme?.name} Are Still at the Station!</h4>
            <p className={`${themeClasses.textSecondary} max-w-md mx-auto`}>
              The journey hasn't begun yet. Be the first to answer questions and start your {themeClasses.pathDescription}!
            </p>
            <div className={`mt-6 inline-flex items-center px-4 py-2 ${themeClasses.accentBg} ${themeClasses.accentText} rounded-full text-sm font-medium`}>
              <span>🎯</span>
              <span className="ml-2">Ready to embark? Answer your first question below!</span>
            </div>
          </div>
        </div>
      );
    }

    const totalReleasedQuestions = getTotalReleasedQuestions();

    return (
      <div className="mt-12 mb-8">
        <h3 className={`text-3xl font-bold mb-8 text-center flex items-center justify-center ${themeClasses.primaryText}`}>
          <span className="mr-3">🏆</span>
          {themeClasses.leaderboardTitle}
          <span className="ml-3">{vehicleIcon}</span>
        </h3>

        {/* Theme-specific Path Background */}
        <div className={`relative bg-gradient-to-r ${themeClasses.leaderboardBg} rounded-2xl p-8 shadow-xl border ${themeClasses.primaryBorder} overflow-visible`}>
          <div className="relative h-40 rounded-xl overflow-visible shadow-inner">
            {/* Theme-specific track rendering for leaderboard */}
            {(() => {
              switch (currentTheme.id) {
                case 'trains':
                  return (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-amber-50/50 rounded-xl"></div>
                      <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
                      <div className="absolute top-22 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-12 w-1 h-16 bg-amber-800 opacity-70"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'planes':
                  return (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-300/70 via-blue-200/70 to-cyan-300/70 rounded-xl"></div>
                      {/* Clouds in leaderboard */}
                      <div className="absolute inset-0 opacity-40 rounded-xl">
                        <div className="absolute top-6 left-10 w-12 h-6 bg-white rounded-full opacity-60"></div>
                        <div className="absolute top-8 left-30 w-16 h-8 bg-white rounded-full opacity-70"></div>
                        <div className="absolute top-5 left-50 w-14 h-7 bg-white rounded-full opacity-65"></div>
                        <div className="absolute top-9 left-70 w-18 h-9 bg-white rounded-full opacity-75"></div>
                      </div>
                      <div className="absolute top-18 left-0 right-0 h-1 border-t-2 border-dashed border-white opacity-60"></div>
                    </>
                  );

                case 'sailboat':
                  return (
                    <>
                      {/* Ocean water with deeper blue gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-300/80 via-blue-400/70 to-blue-600/80 rounded-xl"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-400/60 via-blue-400/40 to-emerald-500/60 rounded-xl"></div>
                      
                      {/* Animated wave layers */}
                      <svg className="absolute inset-0 w-full h-full rounded-xl" viewBox="0 0 400 160" preserveAspectRatio="none">
                        {/* Deep water waves */}
                        <path d="M0,70 Q50,50 100,70 T200,70 T300,70 T400,70 L400,160 L0,160 Z" fill="rgba(59, 130, 246, 0.4)"/>
                        <path d="M0,90 Q75,70 150,90 T300,90 T400,90 L400,160 L0,160 Z" fill="rgba(20, 184, 166, 0.3)"/>
                        <path d="M0,110 Q100,90 200,110 T400,110 L400,160 L0,160 Z" fill="rgba(16, 185, 129, 0.2)"/>
                        
                        {/* Surface ripples */}
                        <path d="M0,50 Q60,35 120,50 T240,50 T360,50 T400,50" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
                        <path d="M0,55 Q80,40 160,55 T320,55 T400,55" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none"/>
                      </svg>
                      
                      {/* Sailing route with wake effect */}
                      <div className="absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-blue-100/60 via-white/80 to-blue-100/60 opacity-70"></div>
                      <div className="absolute top-21 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                      
                      {/* Floating elements - seaweed/debris */}
                      <div className="absolute top-16 left-1/4 w-1 h-1 bg-green-400/50 rounded-full"></div>
                      <div className="absolute top-24 left-2/3 w-1 h-1 bg-green-500/40 rounded-full"></div>
                      <div className="absolute top-18 right-1/4 w-0.5 h-0.5 bg-brown-400/60 rounded-full"></div>
                      
                      {/* Lighthouse/buoy markers at stations */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-14 w-1 h-3 bg-red-400/70 opacity-80 rounded-sm"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'cars':
                  return (
                    <>
                      {/* Road surface with realistic asphalt look */}
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-700 via-gray-600 to-gray-700 rounded-xl"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-800/50 via-transparent to-gray-800/50 rounded-xl"></div>
                      
                      {/* Main yellow center line */}
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-yellow-300 transform -translate-y-1/2"></div>
                      
                      {/* Dashed center line directly below yellow line */}
                      <div className="absolute left-0 right-0 h-0.5 flex transform -translate-y-1/2" style={{ top: 'calc(50% + 6px)' }}>
                        {Array.from({ length: 30 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-t-2 border-dashed border-yellow-200 mr-1"
                          ></div>
                        ))}
                      </div>

                      {/* Road edge lines */}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-white opacity-40"></div>
                      <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-white opacity-40"></div>

                      {/* Road markers at stations */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-1/2 w-1 h-8 bg-yellow-400 opacity-80 transform -translate-y-1/2"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'f1':
                  return (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-gray-800/70 to-black/70 rounded-xl"></div>
                      <div className="absolute top-15 left-0 right-0 h-2 bg-red-500"></div>
                      <div className="absolute top-21 left-0 right-0 h-2 bg-red-500"></div>
                      <div className="absolute top-18 left-0 right-0 h-3 flex">
                        {Array.from({ length: 60 }).map((_, i) => (
                          <div key={i} className={`w-2 h-3 ${i % 2 === 0 ? 'bg-white' : 'bg-black'}`}></div>
                        ))}
                      </div>
                    </>
                  );

                default:
                  return (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-white/10 rounded-xl"></div>
                      <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
                      <div className="absolute top-22 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-500"></div>
                    </>
                  );
              }
            })()}

            {/* Station/Checkpoint Markers */}
            {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className="absolute top-8 transform -translate-x-1/2"
                style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
              >
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-gray-300">
                  <span className={`text-xs font-bold ${themeClasses.textSecondary}`}>{step}</span>
                </div>
              </div>
            ))}

            {/* All User Trains */}
            {leaderboard.map((user, index) => {
              const position = Math.max(1, user.currentStep) / totalReleasedQuestions * 100;
              const isCurrentUser = currentUser && user.id === currentUser.id;

              return (
                <div
                  key={user.id}
                  className="absolute transform -translate-x-1/2 transition-all duration-1000"
                  style={{
                    left: `${position}%`,
                    top: `${50 + (index * 8)}px`, // More space for user name tooltips
                    zIndex: isCurrentUser ? 20 : 10
                  }}
                >
                  <div className={`relative ${isCurrentUser ? 'animate-bounce' : ''}`}>
                    {/* Vehicle Emoji */}
                    <span className={`text-2xl ${isCurrentUser ? 'filter drop-shadow-lg' : ''}`}>
                      {vehicleIcon}
                    </span>

                    {/* User Info Tooltip */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 min-w-max z-50">
                      <div className={`text-xs font-bold ${themeClasses.textPrimary}`}>{user.trainName}</div>
                      <div className={`text-xs ${themeClasses.textSecondary}`}>{user.fullName}</div>
                      <div className={`text-xs font-semibold ${themeClasses.primaryText}`}>Step {user.currentStep}/{totalReleasedQuestions}</div>
                    </div>

                    {/* Rank Badge */}
                    <div className={`absolute -top-1 -right-1 ${themeClasses.accentButton} ${themeClasses.buttonText} rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg`}>
                      {index + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table */}
          <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className={`${themeClasses.primaryButton} px-6 py-4`}>
              <h4 className={`text-xl font-bold ${themeClasses.buttonText} flex items-center`}>
                <span className="mr-2">📊</span>
                {themeClasses.leaderboardTitle} Rankings
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.map((user, index) => {
                const isCurrentUser = currentUser && user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    className={`px-6 py-4 transition-colors ${isCurrentUser
                        ? `bg-gradient-to-r ${themeClasses.cardBg} border-l-4 ${themeClasses.primaryBorder}`
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${themeClasses.buttonText} font-bold mr-4 ${index === 0 ? themeClasses.secondaryButton :
                            index === 1 ? 'bg-gray-400' :
                              index === 2 ? themeClasses.secondaryButton : themeClasses.primaryButton
                          }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className={`font-semibold flex items-center ${isCurrentUser ? themeClasses.primaryTextDark : themeClasses.textPrimary
                            }`}>
                            {vehicleIcon} {user.trainName}
                            <span className={`ml-2 text-sm ${themeClasses.textMuted}`}>({user.fullName})</span>
                            {isCurrentUser && (
                              <span className={`ml-2 ${themeClasses.accentBg} ${themeClasses.primaryText} px-2 py-1 rounded-full text-xs font-bold`}>
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${isCurrentUser ? themeClasses.primaryText : themeClasses.primaryText} opacity-90`}>
                          {user.currentStep}/{totalReleasedQuestions}
                        </div>
                        <div className={`text-sm ${themeClasses.textMuted}`}>
                          {Math.round((user.currentStep / totalReleasedQuestions) * 100)}% Complete
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModules = () => {
    if (!modules || modules.length === 0) {
      return (
        <div className="mb-12">
          <h2 className={`text-3xl font-bold ${themeClasses.textPrimary} mb-8 text-center flex items-center justify-center`}>
            <span className="mr-3">📚</span>
            Released Assignments
          </h2>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-secondary-800 mb-2">
              No Assignments Available
            </h3>
            <p className="text-secondary-700">
              Assignments will be released soon. Check back later!
            </p>
          </div>
        </div>
      );
    }

    const toggleModule = (moduleId: string) => {
      setExpandedModules(prev => ({
        ...prev,
        [moduleId]: !prev[moduleId]
      }));
    };

    return (
      <div className="mb-12">
        <h2 className={`text-3xl font-bold ${themeClasses.textPrimary} mb-8 text-center flex items-center justify-center`}>
          <span className="mr-3">📚</span>
          Released Assignments
        </h2>
        <div className="space-y-6">
          {modules.map((module) => {
            const isExpanded = expandedModules[module.id];
            const isReleased = module.isReleased;

            return (
              <div
                key={module.id}
                className={`rounded-xl shadow-lg border transition-all duration-300 ${isReleased
                    ? `bg-white ${themeClasses.primaryBorder} hover:shadow-xl`
                    : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
              >
                {/* Module Header */}
                <div
                  className={`p-6 ${isReleased
                      ? `cursor-pointer hover:${themeClasses.accentBg}`
                      : 'cursor-not-allowed'
                    } transition-colors duration-200`}
                  onClick={() => isReleased && toggleModule(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-3xl mr-4">
                        {isReleased ? '📘' : '🔒'}
                      </span>
                      <div>
                        <h3 className={`text-xl font-bold ${isReleased ? themeClasses.primaryTextDark : themeClasses.textMuted
                          }`}>
                          Module {module.moduleNumber}: {module.title}
                        </h3>
                        <p className={`text-sm ${isReleased ? themeClasses.primaryText : themeClasses.textSubtle
                          }`}>
                          {isReleased ? module.description : 'Module not yet released'}
                        </p>
                        {isReleased && (
                          <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                            Deadline: {new Date(module.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isReleased && (
                        <>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                            {module.topics.length} Topic{module.topics.length !== 1 ? 's' : ''}
                          </span>
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}>
                            <span className="text-xl text-blue-600">▼</span>
                          </div>
                        </>
                      )}
                      {!isReleased && (
                        <span className={`bg-gray-100 ${themeClasses.textMuted} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Module Topics (Collapsible) */}
                {isReleased && isExpanded && (
                  <div className="border-t border-blue-100 bg-blue-25">
                    <div className="p-6 space-y-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📋</span>
                        Assignments in this Module
                      </h4>
                      {module.topics.length > 0 ? (
                        <div className="space-y-3">
                          {module.topics.map((topic) => {
                            const topicIsReleased = topic.isReleased;
                            
                            // Get self learning activities for this topic/question
                            const topicMiniQuestions = topic.contents?.flatMap(content => 
                              content.miniQuestions || []
                            ) || [];
                            
                            const hasMiniQuestions = topicMiniQuestions.length > 0;
                            const completedMiniQuestions = topicMiniQuestions.filter(mq => mq.hasAnswer).length;
                            
                            // Check if there are future mini-questions
                            const hasFutureMiniQuestions = topic.miniQuestionProgress?.hasFutureMiniQuestions || false;
                            const totalAllMiniQuestions = topic.miniQuestionProgress?.totalAll || topicMiniQuestions.length;
                            const completedAllMiniQuestions = topic.miniQuestionProgress?.completedAll || completedMiniQuestions;
                            
                            // Determine topic status with frontend override logic
                            let topicStatus = topic.status || 'locked';
                            
                            // Check if user has already answered this question
                            const hasAnswered = progress?.answers?.some(answer => 
                              answer.question.id === topic.id || 
                              answer.question.questionNumber === topic.questionNumber ||
                              answer.question.topicNumber === topic.topicNumber
                            );
                            
                            // Override backend status based on frontend calculations
                            if (hasAnswered) {
                              // Check the answer status
                              const userAnswer = progress?.answers?.find(answer => 
                                answer.question.id === topic.id || 
                                answer.question.questionNumber === topic.questionNumber ||
                                answer.question.topicNumber === topic.topicNumber
                              );
                              if (userAnswer?.status === 'APPROVED') {
                                topicStatus = 'completed';
                              } else {
                                topicStatus = 'submitted';
                              }
                            } else if (totalAllMiniQuestions > 0 && completedAllMiniQuestions < totalAllMiniQuestions) {
                              // Still have mini-questions to complete
                              topicStatus = 'mini_questions_required';
                            } else if (topicIsReleased) {
                              // All mini-questions completed (or no mini-questions) and topic is released
                              topicStatus = 'available';
                            }
                            
                            const isAvailable = topicStatus === 'available';
                            const isLocked = topicStatus === 'locked' || topicStatus === 'mini_questions_required';
                            const isCompleted = topicStatus === 'completed';
                            const isSubmitted = topicStatus === 'submitted';
                            
                            // Debug logging for topic status
                            console.log(`🔍 Topic ${topic.topicNumber} Status Debug:`, {
                              topicTitle: topic.title,
                              originalBackendStatus: topic.status,
                              finalStatus: topicStatus,
                              totalAllMiniQuestions,
                              completedAllMiniQuestions,
                              hasAnswered,
                              isAvailable,
                              isLocked,
                              isCompleted,
                              isSubmitted
                            });
                            
                            // Assignment display logic: Show released topics
                            if (!topicIsReleased) {
                              return null;
                            }
                            
                            // Determine display styling based on backend status
                            let bgColor, borderColor, textColor, statusIcon, statusText, statusBg;
                            
                            if (isCompleted) {
                              bgColor = 'bg-blue-50';
                              borderColor = 'border-blue-200';
                              textColor = 'text-blue-800';
                              statusIcon = '✅';
                              statusText = 'Completed';
                              statusBg = 'bg-blue-100 text-blue-800';
                            } else if (isSubmitted) {
                              bgColor = 'bg-purple-50';
                              borderColor = 'border-purple-200';
                              textColor = 'text-purple-800';
                              statusIcon = '📤';
                              statusText = 'Submitted';
                              statusBg = 'bg-purple-100 text-purple-800';
                            } else if (isAvailable) {
                              bgColor = 'bg-green-50';
                              borderColor = 'border-green-200 hover:bg-green-100';
                              textColor = 'text-green-800';
                              statusIcon = '📝';
                              statusText = 'Available';
                              statusBg = 'bg-green-100 text-green-800';
                            } else if (isLocked) {
                              bgColor = 'bg-orange-50';
                              borderColor = 'border-orange-200';
                              textColor = 'text-orange-800';
                              statusIcon = '🔐';
                              statusText = topicStatus === 'mini_questions_required' ? 'Self-Learning Required' : 'Locked';
                              statusBg = 'bg-orange-100 text-orange-800';
                            } else {
                              bgColor = 'bg-gray-50';
                              borderColor = 'border-gray-200';
                              textColor = 'text-gray-800';
                              statusIcon = '🔒';
                              statusText = 'Locked';
                              statusBg = 'bg-gray-100 text-gray-600';
                            }
                            
                            return (
                              <div
                                key={topic.id}
                                className={`rounded-lg p-4 border transition-all duration-200 ${bgColor} ${borderColor} opacity-90`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="text-xl mr-3">{statusIcon}</span>
                                    <div>
                                      <h5 className={`font-medium ${textColor}`}>
                                        Topic {topic.topicNumber}: {topic.title}
                                      </h5>
                                      <p className={`text-sm ${textColor.replace('800', '600')}`}>
                                        {isLocked && topicStatus === 'mini_questions_required'
                                          ? `Complete ${totalAllMiniQuestions - completedAllMiniQuestions} more activity${totalAllMiniQuestions - completedAllMiniQuestions !== 1 ? 'ies' : 'y'} to unlock${hasFutureMiniQuestions ? ' (including upcoming activities)' : ''}`
                                          : topic.description
                                        }
                                      </p>
                                      {topicIsReleased && (
                                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                                          <span>Deadline: {new Date(topic.deadline).toLocaleDateString()}</span>
                                          <span>Points: {topic.points}</span>
                                          {topic.bonusPoints > 0 && (
                                            <span className="text-amber-600">
                                              Bonus: {topic.bonusPoints}
                                            </span>
                                          )}
                                          {(hasMiniQuestions || hasFutureMiniQuestions) && (
                                            <span className={`font-medium ${
                                              completedAllMiniQuestions === totalAllMiniQuestions
                                                ? 'text-green-600' 
                                                : 'text-orange-600'
                                            }`}>
                                              Self Learning: {completedAllMiniQuestions}/{totalAllMiniQuestions}
                                              {hasFutureMiniQuestions && ` (${completedMiniQuestions}/${topicMiniQuestions.length} available)`}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBg}`}>
                                    {statusText}
                                  </span>
                                </div>
                                {topicIsReleased && topic.content && isAvailable && (
                                  <div className="mt-3 p-3 bg-white rounded border border-green-100">
                                    <p className="text-sm text-gray-700">
                                      {topic.content}
                                    </p>
                                  </div>
                                )}
                                {topicIsReleased && isLocked && topicStatus === 'mini_questions_required' && (
                                  <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-200">
                                    <div className="flex items-center text-orange-800 text-sm font-medium mb-2">
                                      <span className="mr-2">🎯</span>
                                      Complete Self Learning Activities First
                                    </div>
                                    <p className="text-xs text-orange-700">
                                      You need to complete all {totalAllMiniQuestions} self learning activities{hasFutureMiniQuestions ? ' (including upcoming ones)' : ''} before you can access this main assignment.
                                    </p>
                                    <div className="mt-2">
                                      <div className="w-full bg-orange-200 rounded-full h-2">
                                        <div
                                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${totalAllMiniQuestions > 0 ? (completedAllMiniQuestions / totalAllMiniQuestions) * 100 : 0}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-orange-600 mt-1">
                                        Progress: {completedAllMiniQuestions}/{totalAllMiniQuestions} activities completed
                                        {hasFutureMiniQuestions && ` (${completedMiniQuestions}/${topicMiniQuestions.length} currently available)`}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl mb-2 block">📝</span>
                          <p>No topics available in this module yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnswerHistory = () => {
    if (!progress?.answers || progress.answers.length === 0) return null;

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-3">📚</span>
          Your Journey History
        </h3>
        <div className="space-y-4">
          {progress.answers.map((answer) => (
            <div
              key={answer.id}
              className={`rounded-xl p-6 shadow-lg border transition-all duration-200 hover:shadow-xl ${answer.status === 'APPROVED'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : answer.status === 'REJECTED'
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {answer.status === 'APPROVED' ? '✅' : answer.status === 'REJECTED' ? '❌' : '⏳'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Question {answer.question.questionNumber}
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      Status: {answer.status}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(answer.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">"{answer.content}"</p>

              {/* Show feedback if available */}
              {answer.feedback && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${answer.status === 'APPROVED'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                  }`}>
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Admin Feedback:
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    "{answer.feedback}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${themeClasses.cardBg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="relative">
            <span className="text-8xl animate-bounce">{vehicleIcon}</span>
            <div className="absolute -top-2 -right-2 animate-ping">
              <span className="text-4xl">💨</span>
            </div>
          </div>
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading your {themeClasses.pathDescription.toLowerCase()} adventure...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeClasses.cardBg}`}>
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4 space-x-8">
            <img 
              src="./src/assets/BVisionRY.png" 
              alt="BVisionRY Company Logo" 
              className="w-44 h-16 px-3 py-2 bvisionary-logo"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900">
                BVisionRY Lighthouse
              </h1>
              <p className="text-xl text-gray-600">Your Adventure Journey</p>
            </div>
            <img 
              src="./src/assets/Lighthouse.png" 
              alt="Lighthouse Logo" 
              className="w-28 h-28 lighthouse-logo"
            />
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className={`${themeClasses.primaryButton} ${themeClasses.buttonText} px-6 py-3 rounded-lg ${themeClasses.primaryButtonHover} transition-all duration-200 font-medium shadow-lg`}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Leaderboard - All Users' Train Progress */}
        {renderLeaderboard()}

        {/* Released Assignments (Modules) */}
        {renderModules()}

        {/* Individual Progress */}
        {renderTrailProgress()}

        {/* Active Questions Section - Hidden as per user requirements */}
        {/* {renderActiveQuestions()} */}

        {/* Self Learning Activities Section */}
        <div id="mini-questions-section">
          {renderMiniQuestions()}
        </div>

        {/* Current Question - Hidden until self learning activities completed */}
        <div id="current-question-section">
          {renderCurrentQuestion()}
        </div>

        {/* Answer History */}
        {renderAnswerHistory()}
      </div>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `
      }} />
    </div>
  );
};

export default GameView;
