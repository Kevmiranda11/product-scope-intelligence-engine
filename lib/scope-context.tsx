'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';

interface StoryCandidate {
  id: string;
  title: string;
}

interface MissingScopeSignal {
  id: string;
  title: string;
  reason: string;
  severity: 'low' | 'med' | 'high';
}

interface RefinementQuestion {
  id: string;
  role: 'Frontend' | 'Backend' | 'QA';
  question: string;
  answer: string;
}

interface RefinedOutput {
  storyTitle: string;
  userStoryStatement: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
  notIncluded: string[];
  assumptions: string[];
}

interface Project {
  id: string;
  name: string;
  scopeName: string;
  sprintDuration: string;
  team: string;
  contextBrief: string;
  version: number;
  isDirty: boolean;
  activeStep: number;
  storyCandidates: StoryCandidate[];
  lastGeneratedAt?: string;
  selectedStoryIds: string[];
  customStories: StoryCandidate[];
  scopeConfidence: number;
  missingScopeSignals: MissingScopeSignal[];
  refinementQuestionsByStoryId: Record<string, RefinementQuestion[]>;
  refinedOutputByStoryId: Record<string, RefinedOutput>;
  ownerId?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

interface ScopeContextType {
  // Multi-project state
  projects: Project[];
  activeProjectId: string;
  activeProject: Project | undefined;
  
  // Derived active project properties (for convenience)
  scopeName: string;
  sprintDuration: string;
  team: string;
  contextBrief: string;
  version: number;
  isDirty: boolean;
  activeStep: number;
  
  // Setters for active project (mark dirty)
  setScopeName: (name: string) => void;
  setSprintDuration: (duration: string) => void;
  setTeam: (team: string) => void;
  setContextBrief: (brief: string) => void;
  
  // Version management for active project
  incrementVersion: () => void;
  markDirty: () => void;
  clearDirty: () => void;
  
  // Step management for active project
  setActiveStep: (stepIndex: number) => void;
  
  // Story generation
  generateStoryCandidates: () => void;
  
  // Story selection and custom stories
  toggleStorySelection: (storyId: string) => void;
  addCustomStory: (title: string) => void;
  removeCustomStory: (storyId: string) => void;
  
  // Refinement
  generateQuestionsForStoryAction: (storyId: string) => void;
  updateQuestionAnswer: (storyId: string, questionId: string, answer: string) => void;
  analyzeAnswers: () => void;
  
  // Project management
  createProject: (name: string) => void;
  setActiveProject: (projectId: string) => void;
  renameProject: (name: string) => void;
  deleteActiveProject: () => void;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
  deleteProjectById: (id: string) => void;
}

const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

interface ScopeProviderProps {
  children: ReactNode;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function computeMissingScopeSignals(contextBrief: string): { signals: MissingScopeSignal[]; confidence: number } {
  const signals: MissingScopeSignal[] = [];
  const briefLower = (contextBrief || '').toLowerCase();

  if (!contextBrief || contextBrief.trim().length < 30) {
    signals.push({
      id: generateUUID(),
      title: 'Inadequate Context Provided',
      reason: 'Context brief is very short. More details needed for accurate story generation.',
      severity: 'high',
    });
  }

  const errorKeywords = ['error', 'fail', 'retry', 'message', 'validation', 'invalid'];
  const hasErrorHandling = errorKeywords.some((kw) => briefLower.includes(kw));
  if (!hasErrorHandling) {
    signals.push({
      id: generateUUID(),
      title: 'Error Handling & Messages',
      reason: 'Context brief does not mention error handling or validation messages.',
      severity: 'med',
    });
  }

  const permKeywords = ['role', 'admin', 'permission', 'access', 'authorized', 'privilege'];
  const hasPermissions = permKeywords.some((kw) => briefLower.includes(kw));
  if (!hasPermissions) {
    signals.push({
      id: generateUUID(),
      title: 'Permissions & Access Control',
      reason: 'No mention of roles, permissions, or access control.',
      severity: 'low',
    });
  }

  // Calculate confidence score
  let confidence = 100;
  signals.forEach((signal) => {
    if (signal.severity === 'high') confidence -= 25;
    else if (signal.severity === 'med') confidence -= 15;
    else if (signal.severity === 'low') confidence -= 8;
  });
  confidence = Math.max(0, Math.min(100, confidence));

  return { signals, confidence };
}

function generateStoryCandidatesForProject(contextBrief: string): StoryCandidate[] {
  // Keywords to extract from context brief for story themes
  const keywords = [
    { word: 'auth', stories: ['Set up user authentication', 'Implement password reset', 'Add two-factor authentication'] },
    { word: 'user', stories: ['Create user profile page', 'Implement user preferences', 'Add user dashboard'] },
    { word: 'data', stories: ['Design data schema', 'Build data export', 'Create data validation', 'Implement data sync'] },
    { word: 'search', stories: ['Implement search functionality', 'Add search filters', 'Optimize search performance'] },
    { word: 'api', stories: ['Design REST endpoints', 'Implement API documentation', 'Add API rate limiting', 'Create API clients'] },
    { word: 'payment', stories: ['Integrate payment system', 'Implement checkout flow', 'Add payment validation'] },
    { word: 'notification', stories: ['Add email notifications', 'Implement push notifications', 'Create notification preferences'] },
    { word: 'mobile', stories: ['Design mobile UI', 'Implement responsive design', 'Add mobile optimizations'] },
    { word: 'report', stories: ['Create report generator', 'Add report scheduling', 'Implement report export'] },
    { word: 'analytics', stories: ['Set up event tracking', 'Create analytics dashboard', 'Implement metrics reporting'] },
  ];

  const briefLower = contextBrief.toLowerCase();
  const matchedStories: string[] = [];

  // Find relevant stories based on keywords in the brief
  keywords.forEach(({ word, stories }) => {
    if (briefLower.includes(word)) {
      matchedStories.push(...stories);
    }
  });

  // If no matched stories, use generic ones
  if (matchedStories.length === 0) {
    matchedStories.push(
      'Define core functionality',
      'Set up project structure',
      'Create initial documentation',
      'Implement error handling',
      'Add logging and monitoring',
      'Set up testing framework'
    );
  }

  // Shuffle and pick 6-8 unique stories
  const count = Math.min(6 + Math.floor(Math.random() * 3), matchedStories.length);
  const shuffled = [...matchedStories].sort(() => Math.random() - 0.5);
  const unique = Array.from(new Set(shuffled));
  
  return unique.slice(0, count).map((title) => ({
    id: generateUUID(),
    title,
  }));
}

function generateQuestionsForStory(storyTitle: string): RefinementQuestion[] {
  const baseQuestions: Record<'Frontend' | 'Backend' | 'QA', string[]> = {
    'Frontend': [
      'What should happen when the user encounters an error?',
      'How should empty states be displayed?',
      'Which fields require validation feedback?',
      'Should there be permission-based UI hiding?',
      'What loading states need to be shown?',
    ],
    'Backend': [
      'What data model/schema is required?',
      'Which API endpoints are needed?',
      'How should errors be handled and reported?',
      'Are there rate limits or constraints?',
      'What authentication/authorization checks are needed?',
    ],
    'QA': [
      'What are the main happy paths?',
      'What edge cases should be tested?',
      'What happens with invalid inputs?',
      'How should concurrent actions be handled?',
      'What acceptance criteria must pass?',
    ],
  };

  const questions: RefinementQuestion[] = [];
  let id = 0;

  (['Frontend', 'Backend', 'QA'] as const).forEach((role) => {
    baseQuestions[role].forEach((question) => {
      questions.push({
        id: `${role}-${id++}`,
        role,
        question,
        answer: '',
      });
    });
  });

  return questions;
}

function synthesizeRefinedOutput(
  storyTitle: string,
  questions: RefinementQuestion[],
  contextBrief: string
): RefinedOutput {
  // Build a simple refined output from questions and context
  const userStoryStatement = `As a user, I want to ${storyTitle.toLowerCase()} so that I can achieve my goal efficiently.`;

  const acceptanceCriteria: string[] = [];
  const techKeywords = ['api', 'endpoint', 'database', 'db', 'schema', 'request', 'response', 'jwt', 'token', 'sql'];
  const technicalNotes: string[] = [];
  const notIncluded: string[] = [];
  const assumptions: string[] = [];

  questions.forEach((q) => {
    if (!q.answer || q.answer.trim().length === 0) {
      assumptions.push(`Clarify: ${q.question}`);
      return;
    }

    const answer = q.answer.trim();

    const isTechnical = techKeywords.some((kw) => answer.toLowerCase().includes(kw));
    if (isTechnical) {
      technicalNotes.push(`${q.role}: ${answer}`);
    }

    if (answer.toLowerCase().includes('out of scope') || answer.toLowerCase().includes('not included')) {
      notIncluded.push(answer);
    }

    if (acceptanceCriteria.length < 8 && !isTechnical) {
      acceptanceCriteria.push(`${answer.charAt(0).toUpperCase()}${answer.slice(1)}`);
    }
  });

  if (acceptanceCriteria.length === 0) {
    acceptanceCriteria.push(
      'System successfully processes the user request',
      'All validation checks pass',
      'Error messages are clear and actionable'
    );
  }

  return {
    storyTitle,
    userStoryStatement,
    acceptanceCriteria,
    technicalNotes,
    notIncluded,
    assumptions,
  };
}

function getDefaultProjects(): Project[] {
  return [
    {
      id: 'proj-1',
      name: 'Mobile App MVP',
      scopeName: 'Mobile App MVP',
      sprintDuration: '2 weeks',
      team: '3 engineers, 1 designer',
      contextBrief: '',
      version: 1,
      isDirty: false,
      activeStep: 0,
      storyCandidates: [],
      selectedStoryIds: [],
      customStories: [],
      scopeConfidence: 100,
      missingScopeSignals: [],
      refinementQuestionsByStoryId: {},
      refinedOutputByStoryId: {},
      ownerId: 'user-1',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: 'proj-2',
      name: 'Backend API v2',
      scopeName: 'Backend API v2',
      sprintDuration: '3 weeks',
      team: '2 engineers, 1 DevOps',
      contextBrief: '',
      version: 1,
      isDirty: false,
      activeStep: 0,
      storyCandidates: [],
      selectedStoryIds: [],
      customStories: [],
      scopeConfidence: 100,
      missingScopeSignals: [],
      refinementQuestionsByStoryId: {},
      refinedOutputByStoryId: {},
      ownerId: 'user-2',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
  ];
}

const STORAGE_KEY = 'psi_workspace_v1';

export function ScopeProvider({ children }: ScopeProviderProps) {
  const defaultProjects = getDefaultProjects();
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-1');
  const [isHydrated, setIsHydrated] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // normalize a project object so required fields always exist
  function normalizeProject(p: Partial<Project>): Project {
    return {
      id: p.id || generateId(),
      name: p.name || '',
      scopeName: p.scopeName || '',
      sprintDuration: p.sprintDuration || '',
      team: p.team || '',
      contextBrief: p.contextBrief || '',
      version: p.version ?? 1,
      isDirty: p.isDirty ?? false,
      activeStep: p.activeStep ?? 0,
      storyCandidates: p.storyCandidates ?? [],
      selectedStoryIds: p.selectedStoryIds ?? [],
      customStories: p.customStories ?? [],
      scopeConfidence: p.scopeConfidence ?? 100,
      missingScopeSignals: p.missingScopeSignals ?? [],
      refinementQuestionsByStoryId: p.refinementQuestionsByStoryId ?? {},
      refinedOutputByStoryId: p.refinedOutputByStoryId ?? {},
      ownerId: p.ownerId,
      isDeleted: p.isDeleted ?? false,
      deletedAt: p.deletedAt ?? null,
      deletedBy: p.deletedBy ?? null,
    };
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { projects: Partial<Project>[]; activeProjectId: string };
        if (parsed.projects && Array.isArray(parsed.projects) && parsed.activeProjectId) {
          // normalize and filter out soft-deleted projects by default
          const visible = parsed.projects.map(normalizeProject).filter((p) => !p.isDeleted);
          setProjects(visible);
          setActiveProjectId(parsed.activeProjectId);
        }
      }
    } catch (error) {
      console.error('Failed to load workspace from localStorage:', error);
      // Silently fail and use defaults
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage whenever projects or activeProjectId changes
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projects, activeProjectId })
      );
    } catch (error) {
      console.error('Failed to save workspace to localStorage:', error);
      // Silently fail
    }
  }, [projects, activeProjectId, isHydrated]);

  const activeProject = useMemo(
    () => {
      const found = projects.find((p) => p.id === activeProjectId);
      return found ? normalizeProject(found) : undefined;
    },
    [projects, activeProjectId]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helpers to update a specific project
  const updateActiveProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, ...updates } : p
      )
    );
  };

  // Setters for active project (mark dirty)
  const setScopeName = (name: string) => {
    updateActiveProject({ scopeName: name, isDirty: true });
  };

  const setSprintDuration = (duration: string) => {
    updateActiveProject({ sprintDuration: duration, isDirty: true });
  };

  const setTeam = (team: string) => {
    updateActiveProject({ team, isDirty: true });
  };

  const setContextBrief = (brief: string) => {
    updateActiveProject({ contextBrief: brief, isDirty: true });
  };

  // Version management for active project
  const incrementVersion = () => {
    if (activeProject) {
      updateActiveProject({
        version: activeProject.version + 1,
        isDirty: false,
      });
    }
  };

  const markDirty = () => {
    updateActiveProject({ isDirty: true });
  };

  const clearDirty = () => {
    updateActiveProject({ isDirty: false });
  };

  // Project management
  const createProject = (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      scopeName: name,
      sprintDuration: '',
      team: '',
      contextBrief: '',
      version: 1,
      isDirty: false,
      activeStep: 0,
      storyCandidates: [],
      selectedStoryIds: [],
      customStories: [],
      scopeConfidence: 100,
      missingScopeSignals: [],
      refinementQuestionsByStoryId: {},
      refinedOutputByStoryId: {},
      ownerId: typeof window !== 'undefined' ? localStorage.getItem('currentUserId') || undefined : undefined,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const setActiveProject = (projectId: string) => {
    if (projects.some((p) => p.id === projectId)) {
      setActiveProjectId(projectId);
    }
  };

  const renameProject = (name: string) => {
    updateActiveProject({ name, scopeName: name });
  };

  const deleteActiveProject = () => {
    if (activeProject) {
      setProjects((prev) => prev.filter((p) => p.id !== activeProject.id));
      // choose a new active project if any remain
      const remaining = projects.filter((p) => p.id !== activeProject.id);
      if (remaining.length > 0) {
        setActiveProjectId(remaining[0].id);
      }
    }
  };

  const deleteProjectById = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      if (remaining.length > 0) setActiveProjectId(remaining[0].id);
    }
  };

  const setActiveStep = (stepIndex: number) => {
    updateActiveProject({ activeStep: stepIndex });
  };

  const generateStoryCandidates = () => {
    if (activeProject) {
      const { contextBrief } = activeProject;
      
      // Validate context brief length
      if (!contextBrief || contextBrief.trim().length < 30) {
        // Do not generate; let UI handle the validation message
        return;
      }
      
      const candidates = generateStoryCandidatesForProject(contextBrief);
      const now = new Date().toLocaleString();
      
      // Auto-select all generated candidates
      const selectedIds = candidates.map((c) => c.id);
      
      // Compute missing scope signals
      const { signals, confidence } = computeMissingScopeSignals(contextBrief);
      
      updateActiveProject({
        storyCandidates: candidates,
        lastGeneratedAt: now,
        selectedStoryIds: selectedIds,
        scopeConfidence: confidence,
        missingScopeSignals: signals,
      });
    }
  };

  const toggleStorySelection = (storyId: string) => {
    if (activeProject) {
      const { selectedStoryIds } = activeProject;
      const updated = selectedStoryIds.includes(storyId)
        ? selectedStoryIds.filter((id) => id !== storyId)
        : [...selectedStoryIds, storyId];
      updateActiveProject({ selectedStoryIds: updated, isDirty: true });
    }
  };

  const addCustomStory = (title: string) => {
    if (activeProject && title.trim()) {
      const newStory = { id: generateUUID(), title: title.trim() };
      const { customStories, selectedStoryIds } = activeProject;
      updateActiveProject({
        customStories: [...customStories, newStory],
        selectedStoryIds: [...selectedStoryIds, newStory.id],
        isDirty: true,
      });
    }
  };

  const removeCustomStory = (storyId: string) => {
    if (activeProject) {
      const { customStories, selectedStoryIds } = activeProject;
      updateActiveProject({
        customStories: customStories.filter((s) => s.id !== storyId),
        selectedStoryIds: selectedStoryIds.filter((id) => id !== storyId),
        isDirty: true,
      });
    }
  };

  const generateQuestionsForStoryAction = (storyId: string) => {
    if (activeProject) {
      const { storyCandidates, customStories } = activeProject;
      const allStories = [...storyCandidates, ...customStories];
      const story = allStories.find((s) => s.id === storyId);
      
      if (story) {
        const questions = generateQuestionsForStory(story.title);
        const { refinementQuestionsByStoryId } = activeProject;
        updateActiveProject({
          refinementQuestionsByStoryId: {
            ...refinementQuestionsByStoryId,
            [storyId]: questions,
          },
        });
      }
    }
  };

  const updateQuestionAnswer = (storyId: string, questionId: string, answer: string) => {
    if (activeProject) {
      const { refinementQuestionsByStoryId } = activeProject;
      const questions = refinementQuestionsByStoryId[storyId] || [];
      const updated = questions.map((q) =>
        q.id === questionId ? { ...q, answer } : q
      );
      updateActiveProject({
        refinementQuestionsByStoryId: {
          ...refinementQuestionsByStoryId,
          [storyId]: updated,
        },
        isDirty: true,
      });
    }
  };

  const analyzeAnswers = () => {
    if (activeProject) {
      const { refinementQuestionsByStoryId, storyCandidates, customStories, contextBrief } = activeProject;
      const allStories = [...storyCandidates, ...customStories];
      const refinedOutputByStoryId: Record<string, RefinedOutput> = {};

      allStories.forEach((story) => {
        if (refinementQuestionsByStoryId[story.id]) {
          const questions = refinementQuestionsByStoryId[story.id];
          refinedOutputByStoryId[story.id] = synthesizeRefinedOutput(
            story.title,
            questions,
            contextBrief
          );
        }
      });

      updateActiveProject({
        refinedOutputByStoryId,
        isDirty: true,
      });
    }
  };

  const value: ScopeContextType = {
    projects,
    activeProjectId,
    activeProject,
    // Derived properties from active project
    scopeName: activeProject?.scopeName ?? '',
    sprintDuration: activeProject?.sprintDuration ?? '',
    team: activeProject?.team ?? '',
    contextBrief: activeProject?.contextBrief ?? '',
    version: activeProject?.version ?? 1,
    isDirty: activeProject?.isDirty ?? false,
    activeStep: activeProject?.activeStep ?? 0,
    // Setters
    setScopeName,
    setSprintDuration,
    setTeam,
    setContextBrief,
    incrementVersion,
    markDirty,
    clearDirty,
    setActiveStep,
    generateStoryCandidates,
    toggleStorySelection,
    addCustomStory,
    removeCustomStory,
    generateQuestionsForStoryAction,
    updateQuestionAnswer,
    analyzeAnswers,
    createProject,
    setActiveProject,
    renameProject,
    deleteActiveProject,
    deleteProjectById,
    toastMessage,
    showToast,
  };

  return (
    <ScopeContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-[#323232] text-white px-4 py-2 rounded shadow">
          {toastMessage}
        </div>
      )}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const context = useContext(ScopeContext);
  if (context === undefined) {
    throw new Error('useScope must be used within a ScopeProvider');
  }
  return context;
}
