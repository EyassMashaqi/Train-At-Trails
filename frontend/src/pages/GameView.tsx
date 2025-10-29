import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { gameService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getThemeClasses, getVehicleIcon, getVehicleIconStyle } from '../utils/themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

interface Question {
  id: string | number; // Allow both string and number for compatibility
  title: string;
  content: string;
  description?: string;
  questionNumber: number;
  topicNumber?: number; // Add topicNumber property
  releaseDate: string;
  deadline?: string;
  points?: number;
  bonusPoints?: number;
  hasAnswered?: boolean;
}

interface Answer {
  id: number;
  content: string;
  linkUrl?: string;
  notes?: string;
  status: string;
  grade?: string; // New: GOLD, SILVER, COPPER, NEEDS_RESUBMISSION
  submittedAt: string;
  feedback?: string;
  resubmissionRequested?: boolean; // Add resubmission status
  resubmissionApproved?: boolean;
  resubmissionRequestedAt?: string;
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
  status?: string; // Add status property for backend compatibility
  module: Module;
  contents?: Content[];
  questionNumber?: number;
  userAnswer?: Answer; // Add userAnswer property
  miniQuestionProgress?: {
    hasFutureMiniQuestions: boolean;
    totalAll: number;
    completedAll: number;
  };
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
  resourceUrl?: string; // NEW: URL for learning resource
  orderIndex: number;
  isReleased: boolean;
  releaseDate: string;
  hasAnswer: boolean;
  answer?: {
    id: string;
    linkUrl: string;
    notes: string;
    submittedAt: string;
    resubmissionRequested?: boolean;
    resubmissionRequestedAt?: string;
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

// Helper function to get theme-specific background classes
const getThemeSpecificBg = (themeId: string): string => {
  switch (themeId) {
    case 'trains':
      return 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100';
    case 'planes':
      return 'bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100';
    case 'sailboat':
      return 'bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-100';
    case 'cars':
      return 'bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100';
    case 'f1':
      return 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-200';
    default:
      return 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50';
  }
};

const GameView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  
  // Get theme-specific classes
  const themeClasses = useMemo(() => getThemeClasses(currentTheme), [currentTheme]);
  const vehicleIcon = useMemo(() => getVehicleIcon(currentTheme), [currentTheme]);
  const vehicleIconStyle = useMemo(() => {
    const style = getVehicleIconStyle(currentTheme.id);
    console.log('Vehicle Icon Style for theme', currentTheme.id, ':', style);
    return style;
  }, [currentTheme.id]);
  
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTrainAnimation] = useState(false); // Static false - animation triggered by main questions which are disabled
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  // Remove unused userCohortInfo state
  // const [userCohortInfo, setUserCohortInfo] = useState<{id: string, name: string, description?: string} | null>(null);
  
  // Self learning activities state
  const [miniQuestions, setMiniQuestions] = useState<MiniQuestion[]>([]);
  const [miniAnswers, setMiniAnswers] = useState<Record<string, { linkUrl: string; notes: string }>>({});
  const [submittingMini, setSubmittingMini] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{[key: string]: {isValid: boolean, message: string}}>({});
  
  // Main question answer state
  const [answerLink, setAnswerLink] = useState('');
  const [answerNotes, setAnswerNotes] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerLinkValidation, setAnswerLinkValidation] = useState<{isValid: boolean, message: string}>({ isValid: false, message: '' });
  
  // Target question state for main assignment
  const [targetQuestion, setTargetQuestion] = useState<Question | null>(null);

  // URL validation function
  // Debounce function to improve performance during paste operations
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const validateUrl = (url: string): {isValid: boolean, message: string} => {
    if (!url.trim()) {
      return { isValid: false, message: '' };
    }

    try {
      // More permissive URL pattern that handles modern URLs like Google Docs/Sheets
      // This pattern allows for:
      // - Optional protocol (http/https)
      // - Domain names (including subdomains)
      // - Paths with various characters including underscores, equals, question marks, etc.
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\w\/-]*[\w\/])?(\?[;&a-z\d%_.,~#=]*)?(\#[-a-z\d_]*)?$/i;
      
      // Also try using the browser's URL constructor as a fallback
      let isValidPattern = urlPattern.test(url);
      
      // If regex fails, try browser's URL validation (more comprehensive)
      if (!isValidPattern) {
        try {
          const testUrl = url.startsWith('http') ? url : `https://${url}`;
          new URL(testUrl);
          isValidPattern = true;
        } catch {
          // URL constructor also failed
        }
      }
      
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

  // Debounced validation to prevent freezing during paste operations
  const debouncedValidateUrl = useCallback(
    debounce((miniQuestionId: string, url: string) => {
      const validation = validateUrl(url);
      setUrlValidation(prev => ({
        ...prev,
        [miniQuestionId]: validation
      }));
    }, 300), // 300ms delay
    []
  );

  // Handle resubmission request
  const handleResubmissionRequest = async (answerId: number) => {
    try {
      await gameService.requestResubmission(answerId.toString());
      toast.success('Resubmission request sent! Waiting for admin approval.');
      
      // Refresh progress to update answer status
      await loadGameData();
    } catch (error: any) {
      console.error('Error requesting resubmission:', error);
      toast.error(error.response?.data?.error || 'Failed to request resubmission');
    }
  };

  // Get medal icon for mastery points
  // Get medal styling for consistent display across all themes
  const getMedalStyling = (grade: string | null) => {
    switch (grade) {
      case 'GOLD':
        return 'bg-gradient-to-r from-yellow-200 to-yellow-300 border-yellow-400 text-yellow-900';
      case 'SILVER':
        return 'bg-gradient-to-r from-gray-200 to-gray-300 border-gray-400 text-gray-900';
      case 'COPPER':
        return 'bg-gradient-to-r from-orange-200 to-orange-300 border-orange-400 text-orange-900';
      case 'NEEDS_RESUBMISSION':
        return 'bg-gradient-to-r from-red-200 to-red-300 border-red-400 text-red-900';
      default:
        return 'bg-gradient-to-r from-emerald-200 to-emerald-300 border-emerald-400 text-gray-900';
    }
  };

  const getMedalForGrade = (grade?: string | null) => {
    switch (grade) {
      case 'GOLD': return '🥇';
      case 'SILVER': return '🥈';
      case 'COPPER': return '🥉';
      case 'NEEDS_RESUBMISSION': return '❌';
      default: return null;
    }
  };

  // Get rank medal based on leaderboard position
  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      case 4: return '🏅';
      case 5: return '🏅';
      default: return '🎖️';
    }
  };

  // Check if user has answered any questions up to their current step
  const userHasAnswered = (user: LeaderboardUser): boolean => {
    // If user hasn't progressed at all, no answers
    if (user.currentStep === 0) return false;
    
    // If this is the current user, check their progress data
    if (currentUser && user.id === currentUser.id && progress?.answers) {
      // Check if user has any approved answers for steps 1 through their current step
      return progress.answers.some(answer => 
        answer.question?.questionNumber <= user.currentStep && 
        answer.status === 'APPROVED'
      );
    }
    // For other users, we don't have their answer data, so assume they have answered if they progressed
    return user.currentStep > 0;
  };

  // Get rank display (medal or empty circle) based on whether user has answered
  const getRankDisplay = (rank: number, user: LeaderboardUser) => {
    return userHasAnswered(user) ? getRankMedal(rank) : '○';
  };

  // Get the best mastery points for a completed step
  const getBestGradeForStep = (step: number): string | null => {
    if (!progress?.answers) return null;
    
    // Debug: log all answers for this step
    const allStepAnswers = progress.answers.filter(answer => 
      answer.question?.questionNumber === step
    );
    
    console.log(`Step ${step} - All answers:`, allStepAnswers.map(a => ({
      id: a.id,
      status: a.status,
      grade: a.grade,
      questionNumber: a.question?.questionNumber
    })));
    
    const stepAnswers = progress.answers.filter(answer => 
      answer.question?.questionNumber === step && 
      answer.status === 'APPROVED'
    );
    
    if (stepAnswers.length === 0) return null;
    
    // Find the best mastery points (Gold > Silver > Copper)
    const gradeOrder = { 'GOLD': 3, 'SILVER': 2, 'COPPER': 1 };
    let bestGrade: string | null = null;
    let bestScore = 0;
    
    for (const answer of stepAnswers) {
      const score = gradeOrder[answer.grade as keyof typeof gradeOrder] || 0;
      if (score > bestScore) {
        bestScore = score;
        bestGrade = answer.grade || null;
      }
    }
    
    console.log(`Step ${step} - Best mastery points:`, bestGrade);
    return bestGrade;
  };

  // Get medal for user at their current step (for leaderboard display)
  const getUserMedal = (user: LeaderboardUser): string | null => {
    // If user hasn't completed any step, no medal
    if (user.currentStep === 0) return null;
    
    // If this is the current user, use their progress data
    if (currentUser && user.id === currentUser.id) {
      // Check if user has actually answered the question for their current step
      const grade = getBestGradeForStep(user.currentStep);
      // Only show medal if user has answered and got a grade
      return grade ? getMedalForGrade(grade) : null;
    }
    
    // For other users, we don't have their answer data, so we can't show medals
    // In a real implementation, you'd need to fetch user-specific medal data from the backend
    return null;
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
      const { isEnrolled, canAccessGame, message, status } = response.data;
      
      if (!isEnrolled) {
        navigate('/cohort-history');
        return;
      }

      // For ENROLLED users, check if they can access game (handles deactivated cohorts)
      if (status === 'ENROLLED' && !canAccessGame) {
        if (message) {
          toast.error(message);
        }
        navigate('/cohort-history');
        return;
      }

      // For non-ENROLLED users (GRADUATED, REMOVED, SUSPENDED), they shouldn't access game anyway
      if (status !== 'ENROLLED') {
        navigate('/cohort-history');
        return;
      }
      
      // If enrolled and can access game, proceed to load game data
      loadGameData();
    } catch (error) {
      // If we can't check cohort status, still try to load game data
      // The error will be handled in loadGameData
      loadGameData();
    }
  };

  // Calculate ALL available target questions (for multiple assignments)
  const calculateAllAvailableQuestions = useMemo(() => {
    if (!progress || !modules || modules.length === 0) return [];
    
    const availableQuestions: Question[] = [];
    
    // Look through modules to find ALL questions where the user can submit the main assignment
    console.log('Calculate All Available Questions Debug:', {
      modulesCount: modules.length,
      totalTopics: modules.flatMap(m => m.topics).length
    });
    
    // First pass: Look for approved resubmissions (priority)
    for (const module of modules) {
      if (module.isReleased) {
        for (const topic of module.topics) {
          if (topic.isReleased) {
            const topicNumber = topic.questionNumber || topic.topicNumber;
            
            // Check if user has already answered this question
            const userAnswer = progress?.answers?.find(answer => 
              answer.question.questionNumber === topicNumber
            );
            
            // PRIORITY CHECK: Look for approved resubmissions
            const hasApprovedResubmission = userAnswer?.resubmissionRequested && userAnswer?.resubmissionApproved;
            
            if (hasApprovedResubmission) {
              availableQuestions.push({
                id: topic.id,
                questionNumber: topicNumber,
                title: topic.title,
                description: topic.description,
                content: topic.content || '',
                releaseDate: topic.deadline,
                hasAnswered: true // This is a resubmission
              });
              console.log('Found PRIORITY available question (approved resubmission):', topic.title);
            }
          }
        }
      }
    }
    
    // Second pass: Look for normal available questions
    for (const module of modules) {
      if (module.isReleased) {
        for (const topic of module.topics) {
          if (topic.isReleased) {
            const topicNumber = topic.questionNumber || topic.topicNumber;
            
            // Skip if already added as resubmission
            if (availableQuestions.find(q => q.questionNumber === topicNumber)) {
              continue;
            }
            
            // Check if backend says this topic is available (it handles all future mini-questions logic)
            const isTopicAvailable = topic.status === 'available';
            
            // Also check if all mini-questions are completed for this topic (fallback logic)
            const topicMiniQuestions = miniQuestions.filter(mq => mq.questionNumber === topicNumber);
            const allMiniQuestionsCompleted = topicMiniQuestions.length === 0 || 
              topicMiniQuestions.every(mq => mq.hasAnswer);
            
            // Topic is available if either:
            // 1. Backend says it's available, OR
            // 2. All mini-questions for this topic are completed
            const isActuallyAvailable = isTopicAvailable || allMiniQuestionsCompleted;
            
            // Check if user has already answered this question and cannot resubmit
            const userAnswer = progress?.answers?.find(answer => 
              answer.question.questionNumber === topicNumber
            );
            
            // User can submit/resubmit if:
            // 1. No answer exists, OR
            // 2. Mastery Points is NEEDS_RESUBMISSION (new mastery points system), OR
            // 3. Status is REJECTED (legacy system), OR 
            // 4. Resubmission was requested and approved (AWAITING_RESUBMISSION status)
            const canSubmitAnswer = !userAnswer || 
              userAnswer.grade === 'NEEDS_RESUBMISSION' || 
              userAnswer.status === 'REJECTED' ||
              userAnswer.status === 'AWAITING_RESUBMISSION' ||
              (userAnswer.resubmissionRequested && userAnswer.resubmissionApproved);
            
            console.log(`Topic ${topicNumber} (${topic.title}):`, {
              isReleased: topic.isReleased,
              status: topic.status,
              isTopicAvailable,
              allMiniQuestionsCompleted,
              isActuallyAvailable,
              hasAnswered: !!userAnswer,
              canSubmitAnswer
            });
            
            // Use backend status to determine if this topic is available for submission
            if (isActuallyAvailable && canSubmitAnswer) {
              availableQuestions.push({
                id: topic.id,
                questionNumber: topicNumber,
                title: topic.title,
                description: topic.description,
                content: topic.content || '',
                releaseDate: topic.deadline,
                hasAnswered: false
              });
              console.log('Found available question (normal availability):', topic.title);
            }
          }
        }
      }
    }
    
    console.log('calculateAllAvailableQuestions result:', availableQuestions.map(q => q.title));
    return availableQuestions;
  }, [progress, modules, currentQuestion, miniQuestions]);

  // Calculate target question based on current progress and modules
  const calculateTargetQuestion = useMemo(() => {
    if (!progress || !modules || modules.length === 0) return null;
    
    let foundTargetQuestion = null;
    
    // Look through modules to find a question where the user can submit the main assignment
    // This should be a question where:
    // 1. The question is released
    // 2. Either no mini-questions exist OR all mini-questions are completed
    // 3. The user hasn't already answered this question
    
    console.log('Calculate Target Question Debug:', {
      modulesCount: modules.length,
      totalTopics: modules.flatMap(m => m.topics).length
    });
    
    for (const module of modules) {
      if (module.isReleased) {
        for (const topic of module.topics) {
          if (topic.isReleased) {
            const topicNumber = topic.questionNumber || topic.topicNumber;
            
            // Check if user has already answered this question
            const userAnswer = progress?.answers?.find(answer => 
              answer.question.questionNumber === topicNumber
            );
            
            // PRIORITY CHECK: Look for approved resubmissions first
            const hasApprovedResubmission = userAnswer?.resubmissionRequested && userAnswer?.resubmissionApproved;
            
            if (hasApprovedResubmission) {
              foundTargetQuestion = {
                id: topic.id,
                questionNumber: topicNumber,
                title: topic.title,
                description: topic.description,
                content: topic.content || '',
                releaseDate: topic.deadline,
                hasAnswered: true // This is a resubmission
              };
              console.log('Found PRIORITY target question (approved resubmission):', foundTargetQuestion);
              break; // Stop searching once we find an approved resubmission
            }
          }
        }
        if (foundTargetQuestion) break; // Exit outer loop if we found a resubmission
      }
    }
    
    // If no approved resubmissions found, look for normal available questions
    if (!foundTargetQuestion) {
      for (const module of modules) {
        if (module.isReleased) {
          for (const topic of module.topics) {
            if (topic.isReleased) {
              const topicNumber = topic.questionNumber || topic.topicNumber;
              
              // Check if backend says this topic is available (it handles all future mini-questions logic)
              const isTopicAvailable = topic.status === 'available';
              
              // Also check if all mini-questions are completed for this topic (fallback logic)
              const topicMiniQuestions = miniQuestions.filter(mq => mq.questionNumber === topicNumber);
              const allMiniQuestionsCompleted = topicMiniQuestions.length === 0 || 
                topicMiniQuestions.every(mq => mq.hasAnswer);
              
              // Topic is available if either:
              // 1. Backend says it's available, OR
              // 2. All mini-questions for this topic are completed
              const isActuallyAvailable = isTopicAvailable || allMiniQuestionsCompleted;
              
              // Check if user has already answered this question and cannot resubmit
              const userAnswer = progress?.answers?.find(answer => 
                answer.question.questionNumber === topicNumber
              );
              
              // User can submit/resubmit if:
              // 1. No answer exists, OR
              // 2. Mastery Points is NEEDS_RESUBMISSION (new mastery points system), OR
              // 3. Status is REJECTED (legacy system), OR 
              // 4. Resubmission was requested and approved (AWAITING_RESUBMISSION status)
              const canSubmitAnswer = !userAnswer || 
                userAnswer.grade === 'NEEDS_RESUBMISSION' || 
                userAnswer.status === 'REJECTED' ||
                userAnswer.status === 'AWAITING_RESUBMISSION' ||
                (userAnswer.resubmissionRequested && userAnswer.resubmissionApproved);
              
              console.log(`Topic ${topicNumber} (${topic.title}):`, {
                isReleased: topic.isReleased,
                status: topic.status,
                isTopicAvailable,
                allMiniQuestionsCompleted,
                isActuallyAvailable,
                hasAnswered: !!userAnswer,
                canSubmitAnswer,
                answerDetails: userAnswer ? {
                  status: userAnswer.status,
                  grade: userAnswer.grade,
                  resubmissionRequested: userAnswer.resubmissionRequested,
                  resubmissionApproved: userAnswer.resubmissionApproved,
                  resubmissionRequestedAt: userAnswer.resubmissionRequestedAt
                } : null,
                miniQuestionProgress: topic.miniQuestionProgress,
                miniQuestionsCount: topicMiniQuestions.length,
                completedMiniQuestions: topicMiniQuestions.filter(mq => 
                  mq.hasAnswer && !mq.answer?.resubmissionRequested
                ).length
              });
              
              // Use backend status to determine if this topic is available for submission
              if (isActuallyAvailable && canSubmitAnswer) {
                foundTargetQuestion = {
                  id: topic.id, // Keep as string, don't convert to int
                  questionNumber: topicNumber,
                  title: topic.title,
                  description: topic.description,
                  content: topic.content || '',
                  releaseDate: topic.deadline,
                  hasAnswered: false
                };
                console.log('Found target question (normal availability):', foundTargetQuestion);
                break;
              }
            }
          }
          if (foundTargetQuestion) break;
        }
      }
    }
    
    // Fallback to currentQuestion if no topic found (legacy mode)
    if (!foundTargetQuestion && currentQuestion) {
      foundTargetQuestion = currentQuestion;
    }

    console.log('calculateTargetQuestion result:', foundTargetQuestion);
    return foundTargetQuestion;
  }, [progress, modules, currentQuestion, miniQuestions]);

  // Update target question state when calculated value changes
  useEffect(() => {
    setTargetQuestion(calculateTargetQuestion);
  }, [calculateTargetQuestion]);

  // Poll for resubmission approvals every 30 seconds
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined;

    const pollForResubmissionApprovals = async () => {
      try {
        const response = await gameService.getProgress();
        const newData = response.data;
        
        // Check if any resubmission has been newly approved
        let hasNewlyApprovedResubmission = false;
        
        // Check questions from the response for newly approved resubmissions
        if (newData.questions) {
          hasNewlyApprovedResubmission = newData.questions.some((newQ: any) => {
            const currentAnswer = newQ.answers?.[0];
            return currentAnswer?.resubmissionRequested && currentAnswer?.resubmissionApproved;
          });
        }

        if (hasNewlyApprovedResubmission) {
          // Update all state with fresh data
          setProgress({
            currentStep: newData.currentStep,
            totalSteps: newData.totalSteps,
            answers: newData.answers
          });
          setCurrentQuestion(newData.currentQuestion);
          
          // Also update modules data to get latest state
          const modulesResponse = await gameService.getModules();
          setModules(modulesResponse.data);
          
          toast.success('Your resubmission request has been approved! You can now submit a new answer.');
        }
      } catch (error) {
        // Silently handle polling errors to avoid spamming user with notifications
        console.log('Resubmission polling error:', error);
      }
    };

    // Start polling if user has pending resubmission requests in modules
    const hasPendingResubmissions = modules?.some(module => 
      module.topics?.some(topic => 
        topic.userAnswer?.resubmissionRequested && !topic.userAnswer?.resubmissionApproved
      )
    );

    if (hasPendingResubmissions) {
      pollInterval = setInterval(pollForResubmissionApprovals, 30000); // Poll every 30 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [modules]);

  const loadGameData = async () => {
    try {
      setLoading(true);
      
      const [progressResponse, leaderboardResponse, modulesResponse] = await Promise.all([
        gameService.getProgress(),
        gameService.getLeaderboard(),
        gameService.getModules()
      ]);

      const data = progressResponse.data;

      // Extract progress and current question from the single response
      setProgress({
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        answers: data.answers
      });
      setCurrentQuestion(data.currentQuestion);

      // Extract cohort information if available (commented out since not used)
      // if (data.cohort) {
      //   setUserCohortInfo({
      //     id: data.cohort.id,
      //     name: data.cohort.name,
      //     description: data.cohort.description
      //   });
      // }

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
     
      // Check if the error is due to user not being enrolled in any cohort
      const axiosError = error as any;
      if (axiosError?.response?.status === 400 && 
          (axiosError?.response?.data?.error?.includes('not enrolled in any active cohort') ||
           axiosError?.response?.data?.error?.includes('not enrolled in any cohort'))) {
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

    // Use debounced validation for URL field to prevent freezing during paste
    if (field === 'linkUrl') {
      // Clear any existing validation message immediately for better UX
      setUrlValidation(prev => ({
        ...prev,
        [miniQuestionId]: { isValid: false, message: '' }
      }));
      
      // Then run debounced validation
      debouncedValidateUrl(miniQuestionId, value);
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

  // Debounced validation for main answer link
  const debouncedValidateAnswerUrl = useCallback(
    debounce((url: string) => {
      const validation = validateUrl(url);
      setAnswerLinkValidation(validation);
    }, 300), // 300ms delay
    []
  );

  // Handler for main answer link changes with validation
  const handleAnswerLinkChange = (value: string) => {
    setAnswerLink(value);
    
    // Clear existing validation immediately for better UX
    setAnswerLinkValidation({ isValid: false, message: '' });
    
    // Then run debounced validation
    debouncedValidateAnswerUrl(value);
  };

  // Main question submission handler
  const handleMainAnswerSubmit = async (questionToSubmit?: Question) => {
    if (!answerLink.trim()) {
      toast.error('Please provide a link');
      return;
    }

    // Validate URL format
    const urlValidation = validateUrl(answerLink);
    if (!urlValidation.isValid) {
      toast.error('Please provide a valid URL');
      return;
    }

    if (!answerNotes.trim()) {
      toast.error('Please provide notes about your work');
      return;
    }

    const questionForSubmission = questionToSubmit || targetQuestion;
    if (!questionForSubmission) {
      toast.error('No target question available');
      return;
    }

    try {
      setSubmitting(true);

      
      // Submit using link + notes format
      await gameService.submitAnswer(
        answerLink.trim(),
        answerNotes.trim(), 
        questionForSubmission.id.toString(), // questionId
        answerFile
      );
      toast.success('Answer submitted successfully!');
      
      // Clear form
      setAnswerLink('');
      setAnswerNotes('');
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
              <div className="relative h-24 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg overflow-hidden shadow-inner">
                {/* Track surface - cleaner asphalt */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800"></div>
                
                {/* Center racing line - subtle white */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-60 transform -translate-y-1/2"></div>
                
                {/* Track boundaries - minimal kerbs */}
                <div className="absolute top-2 left-0 right-0 h-1 bg-white opacity-40"></div>
                <div className="absolute bottom-2 left-0 right-0 h-1 bg-white opacity-40"></div>
                
                {/* Subtle checkered finish line area (only at end) */}
                <div className="absolute top-0 bottom-0 right-0 w-8 opacity-30">
                  <div className="flex h-full flex-col">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-800'}`}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Track sector markers - minimal */}
                {steps.map((step) => (
                  <div
                    key={step}
                    className="absolute top-1/2 w-0.5 h-4 bg-yellow-300 opacity-50 transform -translate-y-1/2"
                    style={{ left: `${(step / progress.totalSteps) * 100}%` }}
                  ></div>
                ))}
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
            transform: currentTheme.id === 'trains' || currentTheme.id === 'cars' || currentTheme.id === 'f1' 
              ? 'translateX(-50%) scaleX(-1)' 
              : 'translateX(-50%)'
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
            <div className="relative">
              <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center text-xs font-bold transition-all duration-300 ${step <= progress.currentStep
                  ? `${themeClasses.accentButton} ${themeClasses.accentBorder} ${themeClasses.buttonText} shadow-lg`
                  : step === progress.currentStep + 1
                    ? `${themeClasses.secondaryButton} ${themeClasses.secondaryBorder} ${themeClasses.buttonText} animate-pulse shadow-lg`
                    : 'bg-gray-300 border-gray-400 text-gray-700'
                }`}>
                {step}
              </div>
              
              {/* Enhanced Badge beside question number */}
              {(() => {
                const grade = getBestGradeForStep(step);
                const medal = getMedalForGrade(grade);
                const hasAnswer = step <= progress.currentStep;
                
                if (false && hasAnswer) {
                  return (
                    <div className="absolute -top-2 -right-8 flex items-center">
                      {/* Always show medal if available, otherwise show sample medals for testing */}
                      <div className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 ${getMedalStyling(grade)}`}>
                        {medal || (step === 1 ? '🥇' : step === 2 ? '🥈' : step === 3 ? '🥉' : '�')}
                      </div>
                    </div>
                  );
                }
                
                // Future steps - show preview badge
                if (step === progress.currentStep + 1) {
                  return (
                    <div className="absolute -top-2 -right-8">
                      <div className="bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg animate-pulse">
                        ⭐
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}
            </div>
            <div className={`text-sm text-center mt-1 font-medium ${themeClasses.textSecondary}`}>
              {(() => {
                if (step <= progress.currentStep) {
                  const grade = getBestGradeForStep(step);
                  const medal = getMedalForGrade(grade);
                  return medal || (step === 1 ? '🥇' : step === 2 ? '🥈' : step === 3 ? '🥉' : '�');
                } else if (step === progress.currentStep + 1) {
                  return '⭐';
                } else {
                  return '○';
                }
              })()}
            </div>

            {/* User medals at each step (for all users who have completed this step) */}
            {leaderboard && leaderboard.map((user, userIndex) => {
              // Only show medal if user has completed this step and it's their current step
              if (user.currentStep === step && user.currentStep > 0) {
                const userMedal = getUserMedal(user);
                const isCurrentUser = currentUser && user.id === currentUser.id;
                
                return userMedal ? (
                  <div
                    key={`${step}-${user.id}-medal`}
                    className={`absolute top-6 transform -translate-x-1/2 bg-gradient-to-r from-accent-200 to-accent-300 text-gray-900 rounded-full w-4 h-4 flex items-center justify-center shadow-lg ${
                      isCurrentUser ? 'ring-2 ring-yellow-400' : ''
                    }`}
                    style={{ 
                      left: `${(userIndex - Math.floor(leaderboard.length / 2)) * 8}px`,
                      zIndex: isCurrentUser ? 15 : 10
                    }}
                  >
                    <span className="text-xs">{userMedal}</span>
                  </div>
                ) : null;
              }
              return null;
            })}
          </div>
        ))}

        {/* Progress Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className={`${getThemeSpecificBg(currentTheme.id)} rounded-lg p-4 shadow-lg border ${themeClasses.primaryBorder}`}>
            <div className={`text-2xl font-bold ${themeClasses.primaryText}`}>{progress.currentStep}</div>
            <div className={`text-sm ${themeClasses.textSecondary}`}>Steps Completed</div>
          </div>
          <div className={`${getThemeSpecificBg(currentTheme.id)} rounded-lg p-4 shadow-lg border ${themeClasses.accentBorder}`}>
            <div className={`text-2xl font-bold ${themeClasses.accentText}`}>{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</div>
            <div className={`text-sm ${themeClasses.textSecondary}`}>Progress</div>
          </div>
          <div className={`${getThemeSpecificBg(currentTheme.id)} rounded-lg p-4 shadow-lg border ${themeClasses.primaryBorder}`}>
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

    const completedMiniQuestions = miniQuestions.filter(mq => 
      mq.hasAnswer && !mq.answer?.resubmissionRequested
    ).length;
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
            <div className={`w-full ${themeClasses.progressContainer} rounded-full h-2`}>
              <div
                className={`${themeClasses.primaryBg} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${totalMiniQuestions > 0 ? (completedMiniQuestions / totalMiniQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Grouped Self Learning Activities */}
          <div className="space-y-4">
            {Object.entries(groupedMiniQuestions).map(([questionKey, group]) => {
              const isExpanded = expandedQuestions[questionKey];
              const groupCompleted = group.miniQuestions.filter(mq => 
                mq.hasAnswer && !mq.answer?.resubmissionRequested
              ).length;
              const groupTotal = group.miniQuestions.length;
              const isFullyCompleted = groupCompleted === groupTotal;

              return (
                <div key={questionKey} className={`border ${themeClasses.primaryBorder} rounded-lg overflow-hidden`}>
                  {/* Question Group Header */}
                  <div
                    className={`p-4 cursor-pointer transition-colors ${
                      isFullyCompleted 
                        ? `${themeClasses.accentBg} ${themeClasses.accentBgHover} ${themeClasses.accentBorder}` 
                        : `${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} hover:${themeClasses.accentBg}`
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
                          <div className={`w-20 ${themeClasses.progressContainer} rounded-full h-2`}>
                            <div
                              className={`${themeClasses.primaryBg} h-2 rounded-full transition-all duration-300`}
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
                              miniQuestion.hasAnswer ? `${themeClasses.accentBg} ${themeClasses.accentBorder}` : `${themeClasses.cardBg || 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50'} ${themeClasses.brandBorder || 'border-primary-200'}`
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="text-lg mr-2">
                                    {miniQuestion.hasAnswer && !miniQuestion.answer?.resubmissionRequested ? '✅' : '❓'}
                                  </span>
                                  <div className="flex-1">
                                    <h5 className={`font-semibold ${themeClasses.textPrimary}`}>
  #{index + 1}:
  {miniQuestion.resourceUrl ? (
    <a
      href={miniQuestion.resourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`ml-1 ${themeClasses.primaryText} hover:${themeClasses.accentText} hover:underline transition-colors`}
    >
      {miniQuestion.title}
      <FontAwesomeIcon icon={faUpRightFromSquare /* or faExternalLinkAlt */} className="ml-1 align-text-bottom" />
    </a>
  ) : (
    <span className="ml-1">{miniQuestion.title}</span>
  )}
</h5>

                                    {/* Show the question under the title */}
                                    {miniQuestion.question && (
                                      <p className={`text-sm ${themeClasses.textSecondary} mt-1 leading-relaxed`}>
                                        {miniQuestion.question}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {miniQuestion.hasAnswer ? (
                              <div className={`rounded-lg p-3 ${
                                miniQuestion.answer?.resubmissionRequested 
                                  ? 'bg-orange-50 border border-orange-200' 
                                  : `${themeClasses.accentBg}`
                              }`}>
                                {miniQuestion.answer?.resubmissionRequested ? (
                                  <div className="mb-3">
                                    <p className="text-orange-700 font-medium mb-1">🔄 Resubmission Requested</p>
                                    <p className="text-orange-600 text-sm">
                                      Admin has requested you to update this answer. Please provide a new submission below.
                                    </p>
                                    {miniQuestion.answer?.resubmissionRequestedAt && (
                                      <p className="text-orange-500 text-xs mt-1">
                                        Requested on {new Date(miniQuestion.answer.resubmissionRequestedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className={`${themeClasses.accentTextSafe} font-medium mb-2`}>✅ Completed</p>
                                )}
                                
                                <div className={`text-sm mb-3 ${
                                  miniQuestion.answer?.resubmissionRequested 
                                    ? 'text-gray-600' 
                                    : `${themeClasses.accentTextSafeLight}`
                                }`}>
                                  <p><strong>Current Answer:</strong></p>
                                  <p className="ml-2"><strong>Link:</strong> <a href={miniQuestion.answer?.linkUrl} target="_blank" rel="noopener noreferrer" className={`${themeClasses.primaryText} hover:underline`}>{miniQuestion.answer?.linkUrl}</a></p>
                                  {miniQuestion.answer?.notes && (
                                    <p className="ml-2 mt-1"><strong>Notes:</strong> {miniQuestion.answer.notes}</p>
                                  )}
                                  <p className="ml-2 text-xs mt-1 opacity-75">
                                    Submitted on {miniQuestion.answer?.submittedAt ? new Date(miniQuestion.answer.submittedAt).toLocaleDateString() : 'Unknown'}
                                  </p>
                                </div>
                                
                                {miniQuestion.answer?.resubmissionRequested && (
                                  <div className="border-t border-orange-200 pt-3">
                                    <p className="text-orange-700 font-medium mb-2">Provide New Answer:</p>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          New Link URL *
                                        </label>
                                        <input
                                          type="url"
                                          value={miniAnswers[miniQuestion.id]?.linkUrl || ''}
                                          onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'linkUrl', e.target.value)}
                                          onPaste={(e) => {
                                            // Allow paste operation to complete without immediate validation
                                            setTimeout(() => {
                                              const pastedValue = (e.target as HTMLInputElement).value;
                                              debouncedValidateUrl(miniQuestion.id, pastedValue);
                                            }, 50);
                                          }}
                                          placeholder="https://example.com/article"
                                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                                            urlValidation[miniQuestion.id]?.isValid === false && miniAnswers[miniQuestion.id]?.linkUrl
                                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                              : urlValidation[miniQuestion.id]?.isValid === true
                                                ? 'border-accent-300 focus:ring-accent-500 focus:border-accent-500'
                                                : 'border-gray-300 focus:ring-orange-500 focus:border-transparent'
                                          }`}
                                        />
                                        {urlValidation[miniQuestion.id]?.message && (
                                          <p className={`text-xs mt-1 ${
                                            urlValidation[miniQuestion.id]?.isValid 
                                              ? 'text-green-600' 
                                              : 'text-red-500'
                                          }`}>
                                            {urlValidation[miniQuestion.id]?.message}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Updated Notes (optional)
                                        </label>
                                        <textarea
                                          value={miniAnswers[miniQuestion.id]?.notes || ''}
                                          onChange={(e) => handleMiniAnswerChange(miniQuestion.id, 'notes', e.target.value)}
                                          placeholder="Add any additional notes or thoughts..."
                                          rows={3}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                      </div>
                                      <button
                                        onClick={() => handleMiniAnswerSubmit(miniQuestion.id)}
                                        disabled={submittingMini === miniQuestion.id || !miniAnswers[miniQuestion.id]?.linkUrl?.trim()}
                                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        {submittingMini === miniQuestion.id ? (
                                          <div className="flex items-center">
                                            <span className="animate-spin mr-2">⏳</span>
                                            Resubmitting...
                                          </div>
                                        ) : (
                                          'Submit Updated Answer'
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
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
                                    onPaste={(e) => {
                                      // Allow paste operation to complete without immediate validation
                                      setTimeout(() => {
                                        const pastedValue = (e.target as HTMLInputElement).value;
                                        debouncedValidateUrl(miniQuestion.id, pastedValue);
                                      }, 50);
                                    }}
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
                  <p className={`${themeClasses.accentTextSafeLight} text-sm`}>You've completed all available self learning activities for all available assignments.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render answer form for a specific question
  const renderAnswerForm = (question: Question) => {
    const progressUserAnswer = progress?.answers?.find(answer => 
      answer.question.id === question.id || 
      answer.question.questionNumber === question.questionNumber
    );

    const userAnswer = progressUserAnswer;
    const hasAnswered = !!userAnswer;
    const isResubmissionAvailable = userAnswer && (
      userAnswer.grade === 'NEEDS_RESUBMISSION' || 
      userAnswer.status === 'REJECTED' ||
      userAnswer.status === 'AWAITING_RESUBMISSION' ||
      (userAnswer.resubmissionRequested && userAnswer.resubmissionApproved)
    );

    return (
      <div className="space-y-4">
        {/* Show resubmission notice if applicable */}
        {hasAnswered && userAnswer ? (
          userAnswer.status === 'APPROVED' && !isResubmissionAvailable ? (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-3">✅</span>
                <div>
                  <p className="text-green-800 font-medium">Answer Approved</p>
                  <p className="text-green-700 text-sm">Your answer has been approved!</p>
                  {userAnswer.grade && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Grade:</span>
                      <span className="text-lg">{getMedalForGrade(userAnswer.grade)}</span>
                      <span className="text-xs text-gray-500">({userAnswer.grade})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isResubmissionAvailable ? (
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="text-orange-600 text-xl mr-3">🔄</span>
                <div>
                  <p className="text-orange-800 font-medium">Resubmission Available</p>
                  <p className="text-orange-700 text-sm">
                    {userAnswer?.grade === 'NEEDS_RESUBMISSION' 
                      ? 'Admin has requested you to update your answer. Please provide a new submission below.'
                      : userAnswer?.status === 'REJECTED'
                      ? 'Your answer was rejected. You can submit a new answer below.'
                      : 'Your resubmission request has been approved. You can now submit a new answer.'}
                  </p>
                  {userAnswer?.grade && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Previous Grade:</span>
                      <span className="text-lg">{getMedalForGrade(userAnswer.grade)}</span>
                      <span className="text-xs text-gray-500">({userAnswer.grade})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null
        ) : null}
        
        {/* Show form if no answer or resubmission available */}
        {(!hasAnswered || isResubmissionAvailable) && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                Link to Your Work *
              </label>
              <input
                type="url"
                value={answerLink}
                onChange={(e) => handleAnswerLinkChange(e.target.value)}
                onPaste={(e) => {
                  // Allow paste operation to complete without immediate validation
                  setTimeout(() => {
                    const pastedValue = (e.target as HTMLInputElement).value;
                    debouncedValidateAnswerUrl(pastedValue);
                  }, 50);
                }}
                placeholder="https://example.com/article"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  answerLink.trim() && !answerLinkValidation.isValid
                    ? 'border-red-300 focus:ring-red-500'
                    : answerLink.trim() && answerLinkValidation.isValid
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-accent-500'
                }`}
              />
              {answerLink.trim() && answerLinkValidation.message && (
                <p className={`text-xs mt-1 ${
                  answerLinkValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {answerLinkValidation.message}
                </p>
              )}
              <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                Share a link to your work
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                Notes About Your Work *
              </label>
              <textarea
                value={answerNotes}
                onChange={(e) => setAnswerNotes(e.target.value)}
                placeholder="Describe what you built, challenges you faced, what you learned..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-vertical"
              />
              <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                Provide context about your work, the approach you took, and any key insights
              </p>
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
              onClick={() => handleMainAnswerSubmit(question)}
              disabled={submitting || !answerLink.trim() || !answerNotes.trim() || !answerLinkValidation.isValid}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
    );
  };

  // Render multiple main assignments (NEW APPROACH)
  const renderMainAssignments = () => {
    console.log('renderMainAssignments called - progress:', !!progress);
    if (!progress) return null;

    const availableQuestions = calculateAllAvailableQuestions;
    
    if (availableQuestions.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className={`text-3xl font-bold ${themeClasses.textPrimary} mb-8 text-center flex items-center justify-center`}>
          <span className="mr-3">📝</span>
          Main Assignment{availableQuestions.length > 1 ? 's' : ''}
        </h2>
        
        <div className="space-y-8">
          {availableQuestions.map((question) => {
            // Get mini-questions specifically for this question/topic
            const questionMiniQuestions = miniQuestions.filter(mq => 
              mq.questionNumber === question.questionNumber
            );
            
            const completedQuestionMiniQuestions = questionMiniQuestions.filter(mq => 
              mq.hasAnswer && !mq.answer?.resubmissionRequested
            ).length;
            const totalQuestionMiniQuestions = questionMiniQuestions.length;

            // Check if there are future mini-questions by looking at the backend progress data
            const relatedTopic = modules?.flatMap(m => m.topics)?.find(t => 
              t.questionNumber === question.questionNumber || t.topicNumber === question.questionNumber
            );
            const totalAllMiniQuestions = relatedTopic?.miniQuestionProgress?.totalAll || totalQuestionMiniQuestions;
            const completedAllMiniQuestions = relatedTopic?.miniQuestionProgress?.completedAll || completedQuestionMiniQuestions;

            // Main assignment is locked if there are any incomplete mini-questions (current or future)
            // BUT allow access for approved resubmissions regardless of mini-question completion
            const topicUserAnswer = relatedTopic?.userAnswer;
            
            // Check for resubmission approval in both topic answer and progress answers
            const progressUserAnswer = progress?.answers?.find(answer => 
              answer.question.id === question.id || 
              answer.question.questionNumber === question.questionNumber
            );
            
            const isResubmissionApproved = 
              (topicUserAnswer?.resubmissionRequested && topicUserAnswer?.resubmissionApproved) ||
              (progressUserAnswer?.resubmissionRequested && progressUserAnswer?.resubmissionApproved);
              
            const isMainAssignmentLocked = (totalAllMiniQuestions > 0 && completedAllMiniQuestions < totalAllMiniQuestions) && !isResubmissionApproved;

            const hasAnswered = !!progressUserAnswer;

            return (
              <div key={question.id} className={`rounded-xl border overflow-hidden ${
                isMainAssignmentLocked 
                  ? 'border-orange-300 bg-orange-50' 
                  : 'bg-gradient-to-br from-accent-50 via-accent-100 to-primary-50 border-primary-300 shadow-lg'
              }`}>
                {isMainAssignmentLocked ? (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h3 className="text-xl font-bold text-orange-800">Main Assignment Locked</h3>
                    <p className="text-orange-700 mt-2">
                      Complete {totalAllMiniQuestions - completedAllMiniQuestions} more self learning activit{(totalAllMiniQuestions - completedAllMiniQuestions) === 1 ? 'y' : 'ies'} to unlock this assignment
                    </p>
                    <div className="mt-4 bg-orange-100 rounded-lg p-4">
                      <div className="text-sm text-orange-800 font-medium mb-1">Progress</div>
                      <div className="bg-orange-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full transition-all duration-500"
                          style={{ width: `${(completedAllMiniQuestions / totalAllMiniQuestions) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-orange-700 mt-1">
                        {completedAllMiniQuestions}/{totalAllMiniQuestions} activities completed
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-br from-white via-accent-25 to-primary-25">
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-3">📝</div>
                      <h3 className={`text-xl font-bold ${themeClasses.accentTextSafe}`}>Main Assignment</h3>
                      <p className={`${themeClasses.textMuted} mt-1`}>
                        {hasAnswered ? 'Answer submitted' : 'Ready to submit your answer'}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h4 className={`text-lg font-bold ${themeClasses.textPrimary} mb-2`}>
                        Question {question.questionNumber}: {question.title}
                      </h4>
                      <p className={`${themeClasses.textMuted} mb-4`}>
                        {question.description || question.content}
                      </p>
                    </div>

                    {/* Show previous grade if answered */}
                    {hasAnswered && progressUserAnswer && (
                      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Previous Grade:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            progressUserAnswer.grade === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                            progressUserAnswer.grade === 'SILVER' ? 'bg-gray-100 text-gray-800' :
                            progressUserAnswer.grade === 'COPPER' ? 'bg-orange-100 text-orange-800' :
                            progressUserAnswer.status === 'AWAITING_RESUBMISSION' ? 'bg-blue-100 text-blue-800' :
                            progressUserAnswer.grade === 'NEEDS_RESUBMISSION' && progressUserAnswer.resubmissionApproved ? 'bg-blue-100 text-blue-800' :
                            progressUserAnswer.grade === 'NEEDS_RESUBMISSION' ? 'bg-red-100 text-red-800' :
                            progressUserAnswer.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            progressUserAnswer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {progressUserAnswer.status === 'AWAITING_RESUBMISSION'
                              ? 'RESUBMISSION APPROVED'
                              : progressUserAnswer.resubmissionRequested && progressUserAnswer.resubmissionApproved 
                                ? 'RESUBMISSION APPROVED' 
                                : progressUserAnswer.grade || progressUserAnswer.status}
                          </span>
                        </div>
                        {progressUserAnswer.feedback && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            "{progressUserAnswer.feedback}"
                          </p>
                        )}
                      </div>
                    )}

                    {renderAnswerForm(question)}
                  </div>
                )}
              </div>
            );
          })}
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
            <span className="ml-3" style={vehicleIconStyle}>{vehicleIcon}</span>
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
            <span className="ml-3" style={vehicleIconStyle}>{vehicleIcon}</span>
          </h3>
          <div className={`text-center py-12 bg-gradient-to-r ${themeClasses.leaderboardBg} rounded-2xl shadow-xl border ${themeClasses.primaryBorder}`}>
            <div className="text-6xl mb-4" style={vehicleIconStyle}>{vehicleIcon}</div>
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
          <span className="ml-3" style={vehicleIconStyle}>{vehicleIcon}</span>
        </h3>

        {/* Theme-specific Path Background */}
        <div className={`relative bg-gradient-to-r ${themeClasses.leaderboardBg} rounded-2xl p-8 shadow-xl border ${themeClasses.primaryBorder} overflow-visible`}>
          <div className={themeClasses.trackStyling}>
            {/* Theme-specific track rendering for leaderboard */}
            {(() => {
              switch (currentTheme.id) {
                case 'trains':
                  return (
                    <>
                      {/* Railway bed - gravel/ballast background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-stone-300 to-stone-400 rounded-xl"></div>
                      
                      {/* Wooden railway ties/sleepers */}
                      {Array.from({ length: Math.floor(totalReleasedQuestions * 1.5) }, (_, i) => (
                        <div
                          key={`tie-${i}`}
                          className="absolute top-14 w-1.5 h-14 bg-amber-800 opacity-80 rounded-sm"
                          style={{ left: `${(i / (totalReleasedQuestions * 1.5)) * 100}%` }}
                        ></div>
                      ))}
                      
                      {/* Left railway track */}
                      <div className="absolute top-16 left-0 right-0 h-1.5 bg-gradient-to-r from-gray-600 to-gray-700 shadow-sm"></div>
                      
                      {/* Right railway track */}
                      <div className="absolute top-24 left-0 right-0 h-1.5 bg-gradient-to-r from-gray-600 to-gray-700 shadow-sm"></div>
                      
                      {/* Train station markers at each step */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-10 transform -translate-x-1/2"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        >
                          {/* Station platform */}
                          <div className="w-3 h-6 bg-stone-600 rounded-t-sm"></div>
                          {/* Station marker */}
                          <div className="w-1 h-4 bg-red-500 mx-auto rounded-full mt-1"></div>
                        </div>
                      ))}
                    </>
                  );

                case 'planes':
                  return (
                    <>
                      {/* Simple sky gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-sky-200 rounded-xl"></div>
                      
                      {/* Minimal cloud formations */}
                      <div className="absolute inset-0 rounded-xl">
                        <div className="absolute top-4 left-1/4 w-12 h-6 bg-white rounded-full opacity-50"></div>
                        <div className="absolute top-6 left-1/2 w-14 h-7 bg-white rounded-full opacity-50"></div>
                        <div className="absolute top-3 left-3/4 w-10 h-5 bg-white rounded-full opacity-50"></div>
                      </div>
                      
                      {/* Simple flight path */}
                      <div className="absolute top-20 left-0 right-0 h-1 bg-white opacity-50 rounded-full"></div>
                      
                      {/* Airport markers */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-12 w-2 h-2 bg-blue-400 opacity-70 rounded-full"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'sailboat':
                  return (
                    <>
                      {/* Simple ocean gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-200 to-blue-300 rounded-xl"></div>
                      
                      {/* Simple wave effect */}
                      <svg className="absolute inset-0 w-full h-full rounded-xl" viewBox="0 0 400 160" preserveAspectRatio="none">
                        <path d="M0,80 Q100,60 200,80 T400,80 L400,160 L0,160 Z" fill="rgba(59, 130, 246, 0.3)"/>
                      </svg>
                      
                      {/* Sailing route */}
                      <div className="absolute top-20 left-0 right-0 h-1 bg-white opacity-50"></div>
                      
                      {/* Buoy markers */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-14 w-1 h-3 bg-red-400 opacity-60 rounded-sm"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'cars':
                  return (
                    <>
                      {/* Simple road surface */}
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-500 to-gray-600 rounded-xl"></div>
                      
                      {/* Center line */}
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-yellow-300 transform -translate-y-1/2"></div>
                      
                      {/* Road edge lines */}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-white opacity-60"></div>
                      <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-white opacity-60"></div>

                      {/* Road markers */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-1/2 w-1 h-8 bg-yellow-400 opacity-70 transform -translate-y-1/2"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
                    </>
                  );

                case 'f1':
                  return (
                    <>
                      {/* Simple racing track */}
                      <div className="absolute inset-0 bg-gradient-to-b from-gray-600 to-gray-700 rounded-xl"></div>
                      
                      {/* Center racing line */}
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-white opacity-70 transform -translate-y-1/2"></div>
                      
                      {/* Track boundaries */}
                      <div className="absolute top-4 left-0 right-0 h-1 bg-white opacity-50"></div>
                      <div className="absolute bottom-4 left-0 right-0 h-1 bg-white opacity-50"></div>
                      
                      {/* Simple checkered finish area */}
                      <div className="absolute top-0 bottom-0 right-0 w-8 opacity-40">
                        <div className="flex h-full flex-col">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-800'}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Sector markers */}
                      {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => (
                        <div
                          key={step}
                          className="absolute top-1/2 w-1 h-6 bg-yellow-400 opacity-80 transform -translate-y-1/2"
                          style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                        ></div>
                      ))}
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
            {Array.from({ length: totalReleasedQuestions }, (_, i) => i + 1).map((step) => {
              const stepGrade = getBestGradeForStep(step);
              const stepMedal = getMedalForGrade(stepGrade);
              
              return (
                <div
                  key={step}
                  className="absolute top-8 transform -translate-x-1/2"
                  style={{ left: `${(step / totalReleasedQuestions) * 100}%` }}
                >
                  <div className={`rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 ${
                    stepMedal ? getMedalStyling(stepGrade) : 'bg-white border-gray-300'
                  }`}>
                    {stepMedal ? (
                      <span className="text-xs">{stepMedal}</span>
                    ) : (
                      <span className={`text-xs font-bold ${themeClasses.textSecondary}`}>{step}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* All User Trains */}
            {leaderboard.map((user, index) => {
              // Position users based on their current step, including step 0
              const position = user.currentStep === 0 ? 2 : (user.currentStep / totalReleasedQuestions) * 100;
              const isCurrentUser = currentUser && user.id === currentUser.id;
              const userMedal = getUserMedal(user);

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
                    <span className={`text-2xl ${isCurrentUser ? 'filter drop-shadow-lg' : ''}`} style={vehicleIconStyle}>
                      {vehicleIcon}
                    </span>

                    {/* User Info Tooltip */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 min-w-max z-50">
                      <div className={`text-xs font-bold ${themeClasses.textPrimary}`}>{user.trainName}</div>
                      {/* <div className={`text-xs ${themeClasses.textSecondary}`}>{user.fullName}</div>
                      <div className={`text-xs font-semibold ${themeClasses.primaryText}`}>Step {user.currentStep}/{totalReleasedQuestions}</div> */}
                    </div>

                    {/* Rank Badge */}
                    <div className={`absolute -top-1 -right-1 ${
                      currentTheme.id === 'trains' 
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                        : `${themeClasses.accentButton} ${themeClasses.buttonText}`
                    } rounded-full w-6 h-6 flex items-center justify-center text-s font-bold shadow-lg`}>
                      {getRankDisplay(index + 1, user)}
                    </div>

                    {/* Medal Badge (beside the rank badge, only if user has completed a step and has a medal) */}
                    {userMedal && user.currentStep > 0 && (
                      <div className="absolute -top-1 -left-1 bg-gradient-to-r from-accent-200 to-accent-300 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
                        {userMedal}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard Table */}
          <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className={`${themeClasses.primaryButton} px-6 py-4`}>
              <h4 className={`text-xl font-bold ${themeClasses.buttonTextLight} flex items-center`}>
                <span className="mr-2">📊</span>
                {themeClasses.leaderboardTitle} Rankings
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.map((user, index) => {
                const isCurrentUser = currentUser && user.id === currentUser.id;
                const userMedal = getUserMedal(user);
                
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 ${
                          currentTheme.id === 'cars' 
                            ? (index === 0 ? 'bg-red-600 text-white' :
                               index === 1 ? 'bg-gray-400 text-white' :
                               index === 2 ? 'bg-orange-600 text-white' : 'bg-red-500 text-white')
                            : currentTheme.id === 'trains'
                            ? (index === 0 ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white' :
                               index === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' :
                               index === 2 ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white' : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white')
                            : `${themeClasses.buttonText} ${index === 0 ? themeClasses.secondaryButton :
                                index === 1 ? 'bg-gray-400' :
                                  index === 2 ? themeClasses.secondaryButton : themeClasses.primaryButton
                              }`
                        }`}>
                          {getRankDisplay(index + 1, user)}
                        </div>
                        
                        {/* Medal Badge beside rank number (only if user has completed a step and has a medal) */}
                        {userMedal && user.currentStep > 0 && (
                          <div className="bg-gradient-to-r from-accent-200 to-accent-300 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg mr-2">
                            {userMedal}
                          </div>
                        )}
                        
                        <div>
                          <div className={`font-semibold flex items-center ${isCurrentUser ? themeClasses.primaryTextDark : themeClasses.textPrimary
                            }`}>
                            <span style={vehicleIconStyle}>{vehicleIcon}</span> {user.trainName}
                            <span className={`ml-2 text-sm ${themeClasses.textMuted}`}>({user.fullName})</span>
                            {isCurrentUser && (
                              <span className={`ml-2 ${
                                currentTheme.id === 'cars' 
                                  ? 'bg-red-600 text-white' 
                                  : `${themeClasses.accentBg} ${themeClasses.buttonTextDark}`
                              } px-2 py-1 rounded-full text-xs font-bold`}>
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
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isReleased && (
                        <>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
                            {module.topics.length} Assignment{module.topics.length !== 1 ? 's' : ''}
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
                            const completedMiniQuestions = topicMiniQuestions.filter(mq => 
                              mq.hasAnswer && !mq.answer?.resubmissionRequested
                            ).length;
                            
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
                              
                              // Check if this question has approved resubmission
                              const hasApprovedResubmission = userAnswer?.resubmissionRequested && userAnswer?.resubmissionApproved;
                              
                              console.log(`🔍 RESUBMISSION DEBUG - ${topic.title}:`, {
                                hasAnswered,
                                userAnswerStatus: userAnswer?.status,
                                resubmissionRequested: userAnswer?.resubmissionRequested,
                                resubmissionApproved: userAnswer?.resubmissionApproved,
                                hasApprovedResubmission,
                                currentTopicStatus: topicStatus
                              });
                              
                              if (hasApprovedResubmission) {
                                // If resubmission is approved, show as available for re-answering
                                topicStatus = 'available';
                                console.log(`✅ Setting ${topic.title} to AVAILABLE due to approved resubmission`);
                              } else if (userAnswer?.status === 'APPROVED') {
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
                                        Assignment {topic.topicNumber}: {topic.title}
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

  const renderResubmissionSection = () => {
    console.log('🔄 Resubmission Section Debug:', {
      hasProgress: !!progress,
      hasAnswers: !!progress?.answers,
      answersCount: progress?.answers?.length || 0,
      hasModules: !!modules,
      modulesCount: modules?.length || 0
    });

    if (!progress?.answers || !modules) {
      console.log('🔄 Resubmission Section: Early return - missing data');
      return null;
    }

    // Find answers that are approved for resubmission
    const resubmittableAnswers = progress.answers.filter(answer => 
      (answer.grade === 'NEEDS_RESUBMISSION') ||
      (answer.resubmissionRequested && answer.resubmissionApproved)
    );

    console.log('🔄 Resubmission Section: Filtering results:', {
      totalAnswers: progress.answers.length,
      resubmittableCount: resubmittableAnswers.length,
      resubmittableAnswers: resubmittableAnswers.map(a => ({
        id: a.id,
        questionTitle: a.question?.title,
        grade: a.grade,
        resubmissionRequested: a.resubmissionRequested,
        resubmissionApproved: a.resubmissionApproved
      }))
    });

    if (resubmittableAnswers.length === 0) {
      console.log('🔄 Resubmission Section: No resubmittable answers found');
      return null;
    }

    return (
      <div className="mb-12">
        <h2 className={`text-3xl font-bold ${themeClasses.textPrimary} mb-8 text-center flex items-center justify-center`}>
          <span className="mr-3">🔄</span>
          Resubmission Available
        </h2>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">
              You can resubmit the following assignments
            </h3>
            <p className="text-blue-600">
              Your resubmission requests have been approved. Click on any assignment below to submit a new answer.
            </p>
          </div>
          
          <div className="space-y-4">
            {resubmittableAnswers.map((answer) => {
              // Find the related topic from modules
              const relatedTopic = modules?.flatMap(m => m.topics)?.find(t => 
                t.questionNumber === answer.question.questionNumber || 
                t.id === answer.question.id
              );

              const handleResubmit = () => {
                if (relatedTopic) {
                  // Update target question to show submission form
                  setTargetQuestion({
                    id: relatedTopic.id,
                    questionNumber: answer.question.questionNumber,
                    title: answer.question.title,
                    description: relatedTopic.description || '',
                    content: relatedTopic.content || '',
                    releaseDate: relatedTopic.deadline || '',
                    hasAnswered: false
                  });
                  
                  // Scroll to submission form
                  document.getElementById('current-question-section')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }
              };

              return (
                <div
                  key={answer.id}
                  className="bg-white rounded-lg p-4 border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md cursor-pointer"
                  onClick={handleResubmit}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">
                        {answer.question.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Question {answer.question.questionNumber}
                      </p>
                      {answer.grade === 'NEEDS_RESUBMISSION' ? (
                        <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full border border-orange-200 mt-1">
                          Resubmission Required
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 mt-1">
                          Resubmission Approved
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
                        Resubmit Now
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Click to submit new answer
                      </p>
                    </div>
                  </div>
                  
                  {answer.feedback && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm text-gray-700">
                        <strong>Previous Feedback:</strong> {answer.feedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                  : answer.status === 'AWAITING_RESUBMISSION'
                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'  // Blue for approved resubmission
                  : (answer.status === 'REJECTED' || answer.grade === 'NEEDS_RESUBMISSION')
                    ? (answer.resubmissionRequested && answer.resubmissionApproved)
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'  // Approved resubmission - blue
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'   // Rejected - red
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {answer.status === 'APPROVED' 
                      ? '✅' 
                      : answer.status === 'AWAITING_RESUBMISSION'
                        ? '🔄'
                      : answer.status === 'REJECTED' || answer.grade === 'NEEDS_RESUBMISSION'
                        ? '🔄' 
                        : '⏳'}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Question {answer.question.questionNumber}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600 capitalize">
                        Status: {
                          answer.status === 'AWAITING_RESUBMISSION'
                            ? 'RESUBMISSION APPROVED'
                            : answer.resubmissionRequested && answer.resubmissionApproved 
                              ? 'RESUBMISSION APPROVED'
                              : answer.status === 'REJECTED' || answer.grade === 'NEEDS_RESUBMISSION'
                                ? 'NEEDS RESUBMISSION'
                                : answer.status
                        }
                      </p>
                      {/* Show grade medal */}
                      {answer.grade && (
                        <div className="flex items-center space-x-1">
                          <span className="text-sm text-gray-600">Grade:</span>
                          <span className="text-lg">{getMedalForGrade(answer.grade)}</span>
                          <span className="text-xs text-gray-500">({answer.grade})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500">
                    {new Date(answer.submittedAt).toLocaleDateString()}
                  </div>
                  {/* Resubmission request button - allow for approved or graded answers */}
                  {(answer.status === 'APPROVED' || answer.grade) && 
                   answer.status !== 'PENDING' && 
                   !answer.resubmissionRequested && 
                   !answer.resubmissionRequestedAt && (
                    <button
                      onClick={() => handleResubmissionRequest(answer.id)}
                      className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors duration-200 border border-blue-200"
                      title="Request to resubmit this answer"
                    >
                      Request Resubmit
                    </button>
                  )}
                  {/* Show resubmission status if requested */}
                  {answer.resubmissionRequested && (
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      answer.resubmissionApproved === true
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : answer.resubmissionApproved === false
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}>
                      {answer.grade === 'NEEDS_RESUBMISSION' 
                        ? 'Resubmission Required' 
                        : answer.resubmissionApproved === true
                        ? 'Resubmission Approved - You can submit a new answer above!' 
                        : answer.resubmissionApproved === false
                        ? 'Resubmission Request Rejected'
                        : 'Resubmission Request Pending Admin Approval'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                {answer.linkUrl && (
                  <div className="mb-2">
                    <strong className="text-gray-700">Link:</strong>{' '}
                    <a 
                      href={answer.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {answer.linkUrl}
                    </a>
                  </div>
                )}
                {answer.notes && (
                  <div>
                    <strong className="text-gray-700">Notes:</strong>
                    <p className="text-gray-700 italic mt-1">"{answer.notes}"</p>
                  </div>
                )}
                {!answer.linkUrl && !answer.notes && answer.content && (
                  <div>
                    <strong className="text-gray-700">Answer:</strong>{' '}
                    {answer.content.startsWith('http://') || answer.content.startsWith('https://') ? (
                      <a 
                        href={answer.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {answer.content}
                      </a>
                    ) : (
                      <span className="text-gray-700 italic">"{answer.content}"</span>
                    )}
                  </div>
                )}
              </div>

              {/* Show feedback if available */}
              {answer.feedback && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${answer.status === 'APPROVED'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                  }`}>
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      BVisionRY Feedback:
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
            <span className="text-8xl animate-bounce" style={vehicleIconStyle}>{vehicleIcon}</span>
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
            className={`${
              currentTheme.id === 'planes' || currentTheme.id === 'sailboat'
                ? `${themeClasses.primaryButton} ${themeClasses.buttonText} ${themeClasses.primaryButtonHover}`
                : currentTheme.id === 'trains' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white' 
                : currentTheme.id === 'cars' 
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white' 
                : currentTheme.id === 'f1' 
                ? 'bg-gradient-to-r from-red-600 to-gray-600 hover:from-red-700 hover:to-gray-700 text-white' 
                : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
            } px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-lg`}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Resubmission Status Notifications */}
        {progress?.answers?.some(answer => answer.resubmissionRequested) && (
          <div className="mb-6">
            {progress.answers
              .filter(answer => answer.resubmissionRequested)
              .map(answer => (
                <div
                  key={answer.id}
                  className={`mb-3 p-4 rounded-lg border ${
                    answer.resubmissionApproved === true
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : answer.resubmissionApproved === false
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">
                        {answer.resubmissionApproved === true
                          ? '✅'
                          : answer.resubmissionApproved === false
                          ? '❌'
                          : '⏳'
                        }
                      </span>
                      <div>
                        <p className="font-medium">
                          Question {answer.question.questionNumber}: {
                            answer.resubmissionApproved === true
                              ? 'Resubmission Approved!'
                              : answer.resubmissionApproved === false
                              ? 'Resubmission Request Rejected'
                              : 'Resubmission Request Pending'
                          }
                        </p>
                        <p className="text-sm">
                          {answer.resubmissionApproved === true
                            ? 'You can now submit a new answer! Check the Main Assignment section below.'
                            : answer.resubmissionApproved === false
                            ? 'Your resubmission request was rejected. Contact admin for more information.'
                            : 'Your resubmission request is awaiting admin approval.'
                          }
                        </p>
                      </div>
                    </div>
                    {answer.resubmissionApproved === true && (
                      <button
                        onClick={() => document.getElementById('current-question-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Submit New Answer →
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Leaderboard - All Users' Train Progress */}
        {renderLeaderboard()}

        {/* Released Assignments (Modules) */}
        {renderModules()}

        {/* Resubmission Section */}
        {renderResubmissionSection()}

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
          {renderMainAssignments()}
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
