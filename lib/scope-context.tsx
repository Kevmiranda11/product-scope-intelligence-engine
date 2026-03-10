'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useRef, ReactNode } from 'react';

interface StoryCandidate {
  id: string;
  title: string;
  summary?: string;
}

interface MissingScopeSignal {
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface SuggestedStory {
  title: string;
  summary: string;
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
  openQuestions: string[];
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
  suggestedStories: SuggestedStory[];
  scopeScoreExplanation: string | null;
  lastSelectionAnalysisStateKey: string | null;
  refinementQuestionsByStoryId: Record<string, RefinementQuestion[]>;
  refinedOutputByStoryId: Record<string, RefinedOutput>;
  finalOutputByStoryId: Record<string, RefinedOutput>;
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
  generateStoryCandidates: () => Promise<void>;
  isGeneratingStoryCandidates: boolean;
  analyzeSelectionCoverage: () => Promise<void>;
  isAnalyzingSelectionCoverage: boolean;
  generateScopeScoreExplanation: () => Promise<void>;
  isGeneratingScopeScoreExplanation: boolean;
  
  // Story selection and custom stories
  toggleStorySelection: (storyId: string) => void;
  addCustomStory: (title: string) => void;
  removeCustomStory: (storyId: string) => void;
  
  // Refinement
  generateQuestionsForStoryAction: (storyId: string) => Promise<void>;
  isGeneratingRefinementQuestionsForStoryId: string | null;
  updateQuestionAnswer: (storyId: string, questionId: string, answer: string) => void;
  analyzeAnswers: () => Promise<void>;
  isAnalyzingRefinementAnswers: boolean;
  generateFinalOutput: () => Promise<void>;
  isGeneratingFinalOutput: boolean;
  
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
      title: 'Inadequate Context Provided',
      description: 'Context brief is very short. More details needed for accurate story generation.',
      severity: 'high',
    });
  }

  const errorKeywords = ['error', 'fail', 'retry', 'message', 'validation', 'invalid'];
  const hasErrorHandling = errorKeywords.some((kw) => briefLower.includes(kw));
  if (!hasErrorHandling) {
    signals.push({
      title: 'Error Handling & Messages',
      description: 'Context brief does not mention error handling or validation messages.',
      severity: 'medium',
    });
  }

  const permKeywords = ['role', 'admin', 'permission', 'access', 'authorized', 'privilege'];
  const hasPermissions = permKeywords.some((kw) => briefLower.includes(kw));
  if (!hasPermissions) {
    signals.push({
      title: 'Permissions & Access Control',
      description: 'No mention of roles, permissions, or access control.',
      severity: 'low',
    });
  }

  // Calculate confidence score
  let confidence = 100;
  signals.forEach((signal) => {
    if (signal.severity === 'high') confidence -= 25;
    else if (signal.severity === 'medium') confidence -= 15;
    else if (signal.severity === 'low') confidence -= 8;
  });
  confidence = Math.max(0, Math.min(100, confidence));

  return { signals, confidence };
}

function normalizeMissingScopeSignals(
  signals:
    | Array<{ title?: string; description?: string; reason?: string; severity?: string }>
    | undefined
): MissingScopeSignal[] {
  if (!signals) return [];

  return signals.map((signal) => {
    const normalizedSeverity =
      signal.severity === 'high'
        ? 'high'
        : signal.severity === 'medium' || signal.severity === 'med'
        ? 'medium'
        : 'low';

    return {
      title: signal.title ?? 'Untitled gap',
      severity: normalizedSeverity,
      description: signal.description ?? signal.reason ?? '',
    };
  });
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildSelectionAnalysisStateKey(
  contextBrief: string,
  selectedStories: Array<{ title: string; summary: string }>
): string {
  const normalizedStories = selectedStories
    .map((story) => `${story.title.trim().toLowerCase()}::${story.summary.trim().toLowerCase()}`)
    .sort()
    .join('|');
  return `${contextBrief.trim().toLowerCase()}::${normalizedStories}`;
}

function calculateDeterministicBaseScore(params: {
  selectedCount: number;
  generatedCandidateCount: number;
  contextBrief: string;
  missingAreas: MissingScopeSignal[];
}): number {
  const { selectedCount, generatedCandidateCount, contextBrief, missingAreas } = params;

  if (selectedCount === 0) {
    return 0;
  }

  let score = 35;
  score += Math.min(selectedCount, 8) * 5;

  if (generatedCandidateCount > 0) {
    const selectionRatio = Math.min(selectedCount / generatedCandidateCount, 1);
    score += selectionRatio * 20;
  } else {
    score += Math.min(selectedCount, 3) * 3;
  }

  const briefLength = contextBrief.trim().length;
  if (briefLength < 30) score -= 25;
  else if (briefLength < 80) score -= 12;
  else if (briefLength < 140) score -= 6;

  let missingAreaPenalty = 0;
  missingAreas.forEach((area) => {
    if (area.severity === 'high') missingAreaPenalty += 12;
    else if (area.severity === 'medium') missingAreaPenalty += 7;
    else missingAreaPenalty += 4;
  });
  score -= Math.min(missingAreaPenalty, 35);

  if (missingAreas.length === 0) {
    score += 5;
  }

  return clampScore(score);
}

function combineBaseWithAiAdjustment(baseScore: number, aiScopeConfidence: number | undefined): number {
  if (typeof aiScopeConfidence !== 'number' || Number.isNaN(aiScopeConfidence)) {
    return baseScore;
  }

  const clampedAiScore = clampScore(aiScopeConfidence);
  const delta = clampedAiScore - baseScore;
  const dampenedAdjustment = Math.max(-10, Math.min(10, delta * 0.35));
  return clampScore(baseScore + dampenedAdjustment);
}

function normalizeRefinedOutputByStoryId(
  outputs: Record<string, Partial<RefinedOutput>> | undefined
): Record<string, RefinedOutput> {
  if (!outputs) return {};

  const normalized: Record<string, RefinedOutput> = {};
  Object.entries(outputs).forEach(([storyId, output]) => {
    normalized[storyId] = {
      storyTitle: output.storyTitle ?? '',
      userStoryStatement: output.userStoryStatement ?? '',
      acceptanceCriteria: output.acceptanceCriteria ?? [],
      technicalNotes: output.technicalNotes ?? [],
      notIncluded: output.notIncluded ?? [],
      assumptions: output.assumptions ?? [],
      openQuestions: output.openQuestions ?? [],
    };
  });
  return normalized;
}

const CACHE_STORAGE_KEY = 'psi_workspace_cache_v2';
const LEGACY_STORAGE_KEY = 'psi_workspace_v1';
const ACTIVE_PROJECT_STORAGE_KEY = 'psi_active_project_v2';
const LEGACY_IMPORT_MARKER_PREFIX = 'psi_legacy_imported_v1_';

export function ScopeProvider({ children }: ScopeProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingStoryCandidates, setIsGeneratingStoryCandidates] = useState(false);
  const [isAnalyzingSelectionCoverage, setIsAnalyzingSelectionCoverage] = useState(false);
  const [isGeneratingScopeScoreExplanation, setIsGeneratingScopeScoreExplanation] = useState(false);
  const [isGeneratingRefinementQuestionsForStoryId, setIsGeneratingRefinementQuestionsForStoryId] = useState<string | null>(null);
  const [isAnalyzingRefinementAnswers, setIsAnalyzingRefinementAnswers] = useState(false);
  const [isGeneratingFinalOutput, setIsGeneratingFinalOutput] = useState(false);
  const latestSelectionAnalysisRequestIdRef = useRef(0);
  const latestScoreExplanationRequestIdRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      missingScopeSignals: normalizeMissingScopeSignals(
        p.missingScopeSignals as
          | Array<{ title?: string; description?: string; reason?: string; severity?: string }>
          | undefined
      ),
      suggestedStories: (p.suggestedStories ?? []).map((story) => ({
        title: story.title ?? '',
        summary: story.summary ?? '',
      })),
      scopeScoreExplanation: p.scopeScoreExplanation ?? null,
      lastSelectionAnalysisStateKey: p.lastSelectionAnalysisStateKey ?? null,
      refinementQuestionsByStoryId: p.refinementQuestionsByStoryId ?? {},
      refinedOutputByStoryId: normalizeRefinedOutputByStoryId(
        p.refinedOutputByStoryId as Record<string, Partial<RefinedOutput>> | undefined
      ),
      finalOutputByStoryId: normalizeRefinedOutputByStoryId(
        p.finalOutputByStoryId as Record<string, Partial<RefinedOutput>> | undefined
      ),
      ownerId: p.ownerId,
      isDeleted: p.isDeleted ?? false,
      deletedAt: p.deletedAt ?? null,
      deletedBy: p.deletedBy ?? null,
    };
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadProjectsFromServer = async () => {
    try {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to load projects.');
      }
      const payload = (await response.json()) as { projects?: Partial<Project>[] };
      const visible = (payload.projects || []).map(normalizeProject).filter((p) => !p.isDeleted);
      setProjects(visible);
      setActiveProjectId((prevId) => {
        if (prevId && visible.some((p) => p.id === prevId)) return prevId;
        const remembered = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) : null;
        if (remembered && visible.some((p) => p.id === remembered)) return remembered;
        return visible[0]?.id || '';
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load projects.';
      showToast(message);
    }
  };

  const importLegacyWorkspaceIfNeeded = async () => {
    if (typeof window === 'undefined') return false;

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return false;

    const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!meRes.ok) return false;
    const meBody = (await meRes.json()) as { user?: { id: string } };
    const userId = meBody.user?.id;
    if (!userId) return false;

    const markerKey = `${LEGACY_IMPORT_MARKER_PREFIX}${userId}`;
    if (localStorage.getItem(markerKey) === '1') return false;

    try {
      const parsed = JSON.parse(legacy) as { projects?: Partial<Project>[] };
      if (!Array.isArray(parsed.projects) || parsed.projects.length === 0) {
        localStorage.setItem(markerKey, '1');
        return false;
      }

      const importRes = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: parsed.projects }),
      });
      if (!importRes.ok) {
        const body = (await importRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Legacy import failed.');
      }

      localStorage.setItem(markerKey, '1');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Legacy import failed.';
      showToast(message);
      return false;
    }
  };

  const persistProjectToServer = async (project: Project) => {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'Failed to save project.');
    }
    const payload = (await response.json()) as { project?: Partial<Project> };
    if (payload.project) {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? normalizeProject(payload.project as Partial<Project>) : p))
      );
    }
  };

  const scheduleProjectSave = (project: Project) => {
    if (!isHydrated || project.id.startsWith('tmp-')) return;
    const existing = saveTimersRef.current[project.id];
    if (existing) clearTimeout(existing);
    saveTimersRef.current[project.id] = setTimeout(() => {
      void persistProjectToServer(project).catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to save project.';
        showToast(message);
      });
    }, 350);
  };

  // Load from local cache + bootstrap from server
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { projects: Partial<Project>[]; activeProjectId: string };
        if (Array.isArray(parsed.projects)) {
          const visible = parsed.projects.map(normalizeProject).filter((p) => !p.isDeleted);
          setProjects(visible);
          if (parsed.activeProjectId) {
            setActiveProjectId(parsed.activeProjectId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load workspace cache:', error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Bootstrap server state once.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void (async () => {
      await loadProjectsFromServer();
      const imported = await importLegacyWorkspaceIfNeeded();
      if (imported) {
        await loadProjectsFromServer();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timersRef = saveTimersRef;
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (projects.length === 0) {
      if (activeProjectId) setActiveProjectId('');
      return;
    }
    if (!projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // Persist local cache only (optional, not source of truth).
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({ projects, activeProjectId }));
      localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, activeProjectId);
    } catch (error) {
      console.error('Failed to save workspace cache:', error);
    }
  }, [projects, activeProjectId, isHydrated]);

  const activeProject = useMemo(
    () => {
      const found = projects.find((p) => p.id === activeProjectId);
      return found ? normalizeProject(found) : undefined;
    },
    [projects, activeProjectId]
  );

  // Helpers to update a specific project
  const updateActiveProject = (updates: Partial<Project>) => {
    setProjects((prev) => {
      let updatedProject: Project | null = null;
      const next = prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        updatedProject = normalizeProject({ ...p, ...updates });
        return updatedProject;
      });
      if (updatedProject) {
        scheduleProjectSave(updatedProject);
      }
      return next;
    });
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
    const cleanName = name.trim() || 'Untitled Project';
    const tempId = `tmp-${generateId()}`;
    const newProject: Project = {
      id: tempId,
      name: cleanName,
      scopeName: cleanName,
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
      suggestedStories: [],
      scopeScoreExplanation: null,
      lastSelectionAnalysisStateKey: null,
      refinementQuestionsByStoryId: {},
      refinedOutputByStoryId: {},
      finalOutputByStoryId: {},
      ownerId: undefined,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(tempId);

    void (async () => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || 'Failed to create project.');
        }
        const payload = (await response.json()) as { project?: Partial<Project> };
        if (!payload.project) return;
        const created = normalizeProject(payload.project);
        setProjects((prev) => prev.map((p) => (p.id === tempId ? created : p)));
        setActiveProjectId(created.id);
      } catch (error) {
        setProjects((prev) => prev.filter((p) => p.id !== tempId));
        const message = error instanceof Error ? error.message : 'Failed to create project.';
        showToast(message);
      }
    })();
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

  const generateStoryCandidates = async () => {
    if (activeProject) {
      const { contextBrief, name, scopeName, sprintDuration, team } = activeProject;
      
      // Validate context brief length
      if (!contextBrief || contextBrief.trim().length < 30) {
        // Do not generate; let UI handle the validation message
        return;
      }

      if (isGeneratingStoryCandidates) {
        return;
      }

      latestSelectionAnalysisRequestIdRef.current += 1;
      latestScoreExplanationRequestIdRef.current += 1;
      setIsGeneratingStoryCandidates(true);

      try {
        const response = await fetch('/api/ai/story-breakdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectName: name,
            scopeName,
            sprintDuration,
            teamComposition: team,
            contextBrief,
          }),
        });

        if (!response.ok) {
          let message = 'Failed to generate story candidates.';
          try {
            const errorBody = (await response.json()) as { error?: string };
            if (errorBody.error) {
              message = errorBody.error;
            }
          } catch {
            // Keep default message for non-JSON responses
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          storyCandidates: Array<{ id: string; title: string; summary: string }>;
        };

        const candidates = payload.storyCandidates
          .filter((story) => story.id && story.title)
          .map((story) => ({
            id: story.id,
            title: story.title.trim(),
            summary: story.summary.trim(),
          }));

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
          suggestedStories: [],
          scopeScoreExplanation: null,
          lastSelectionAnalysisStateKey: null,
          finalOutputByStoryId: {},
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate story candidates.';
        showToast(message);
      } finally {
        setIsGeneratingStoryCandidates(false);
      }
    }
  };

  const analyzeSelectionCoverage = async () => {
    if (!activeProject) {
      return;
    }

    const { name, scopeName, contextBrief, storyCandidates, customStories, selectedStoryIds } = activeProject;
    const allStories = [...storyCandidates, ...customStories];
    const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const normalizedStoryCandidates = allStories
      .map((story) => ({
        title: normalizeText(story.title),
        summary: normalizeText(story.summary ?? ''),
      }))
      .filter((story) => story.title.length > 0);
    const normalizedSelectedStories = allStories
      .filter((story) => selectedStoryIds.includes(story.id))
      .map((story) => ({
        title: normalizeText(story.title),
        summary: normalizeText(story.summary ?? ''),
      }))
      .filter((story) => story.title.length > 0);
    const analysisStateKey = buildSelectionAnalysisStateKey(contextBrief, normalizedSelectedStories);

    if (normalizedSelectedStories.length === 0) {
      latestSelectionAnalysisRequestIdRef.current += 1;
      console.log('STEP_3_SELECTION_ANALYSIS_SKIP_NO_SELECTED_STORIES', {
        projectId: activeProject.id,
        selectedStoryIdsCount: selectedStoryIds.length,
      });
      updateActiveProject({
        scopeConfidence: 0,
        missingScopeSignals: [],
        suggestedStories: [],
        scopeScoreExplanation: null,
        lastSelectionAnalysisStateKey: analysisStateKey,
      });
      setIsAnalyzingSelectionCoverage(false);
      return;
    }

    if (!contextBrief.trim()) {
      return;
    }

    const requestId = latestSelectionAnalysisRequestIdRef.current + 1;
    latestSelectionAnalysisRequestIdRef.current = requestId;

    setIsAnalyzingSelectionCoverage(true);

    try {
      const requestBody = {
        projectName: normalizeText(name),
        scopeName: normalizeText(scopeName),
        contextBrief: normalizeText(contextBrief),
        storyCandidates: normalizedStoryCandidates,
        selectedStories: normalizedSelectedStories,
      };
      console.log('STEP_3_SELECTION_ANALYSIS_PAYLOAD', requestBody);

      const response = await fetch('/api/ai/selection-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let message = 'Failed to analyze selected stories.';
        let validationDetails: unknown;
        try {
          const errorBody = (await response.json()) as {
            error?: string;
            message?: string;
            validationDetails?: unknown;
          };
          if (errorBody.message) {
            message = errorBody.message;
          } else if (errorBody.error) {
            message = errorBody.error;
          }
          validationDetails = errorBody.validationDetails;
          if (validationDetails) {
            console.error('STEP_3_SELECTION_ANALYSIS_VALIDATION_ERROR', validationDetails);
          }
        } catch {
          // Keep default message for non-JSON responses
        }
        throw new Error(message);
      }

      if (requestId !== latestSelectionAnalysisRequestIdRef.current) {
        return;
      }

      const payload = (await response.json()) as {
        scopeConfidence: number;
        missingAreas: Array<{
          title: string;
          severity: 'low' | 'medium' | 'high';
          description: string;
        }>;
        suggestedStories: Array<{
          title: string;
          summary: string;
        }>;
      };

      const normalizedMissingAreas = payload.missingAreas.map((area) => ({
        title: area.title.trim(),
        severity: area.severity,
        description: area.description.trim(),
      }));
      const baseScore = calculateDeterministicBaseScore({
        selectedCount: normalizedSelectedStories.length,
        generatedCandidateCount: storyCandidates.length,
        contextBrief,
        missingAreas: normalizedMissingAreas,
      });
      const finalScore = combineBaseWithAiAdjustment(baseScore, payload.scopeConfidence);

      updateActiveProject({
        scopeConfidence: finalScore,
        missingScopeSignals: normalizedMissingAreas,
        suggestedStories: payload.suggestedStories.map((story) => ({
          title: story.title.trim(),
          summary: story.summary.trim(),
        })),
        scopeScoreExplanation: null,
        lastSelectionAnalysisStateKey: analysisStateKey,
      });
    } catch (error) {
      if (requestId !== latestSelectionAnalysisRequestIdRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to analyze selected stories.';
      showToast(message);
    } finally {
      if (requestId === latestSelectionAnalysisRequestIdRef.current) {
        setIsAnalyzingSelectionCoverage(false);
      }
    }
  };

  const generateScopeScoreExplanation = async () => {
    if (!activeProject || isGeneratingScopeScoreExplanation) {
      return;
    }

    const { name, scopeName, contextBrief, storyCandidates, customStories, selectedStoryIds, scopeConfidence, missingScopeSignals, suggestedStories } =
      activeProject;
    const allStories = [...storyCandidates, ...customStories];
    const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const selectedStories = allStories
      .filter((story) => selectedStoryIds.includes(story.id))
      .map((story) => ({
        title: normalizeText(story.title),
        summary: normalizeText(story.summary ?? ''),
      }))
      .filter((story) => story.title.length > 0);

    if (selectedStories.length === 0) {
      return;
    }

    const requestId = latestScoreExplanationRequestIdRef.current + 1;
    latestScoreExplanationRequestIdRef.current = requestId;
    setIsGeneratingScopeScoreExplanation(true);

    try {
      const response = await fetch('/api/ai/selection-score-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: normalizeText(name),
          scopeName: normalizeText(scopeName),
          contextBrief: normalizeText(contextBrief),
          selectedStories,
          scopeConfidence,
          missingAreas: missingScopeSignals.map((area) => ({
            title: area.title,
            severity: area.severity,
            description: area.description,
          })),
          suggestedStories: suggestedStories.map((story) => ({
            title: normalizeText(story.title),
            summary: normalizeText(story.summary),
          })),
        }),
      });

      if (!response.ok) {
        let message = 'Failed to generate score explanation.';
        try {
          const errorBody = (await response.json()) as { error?: string };
          if (errorBody.error) {
            message = errorBody.error;
          }
        } catch {
          // Keep default message for non-JSON responses
        }
        throw new Error(message);
      }

      if (requestId !== latestScoreExplanationRequestIdRef.current) {
        return;
      }

      const payload = (await response.json()) as { explanation: string };
      updateActiveProject({
        scopeScoreExplanation: payload.explanation.trim(),
      });
    } catch (error) {
      if (requestId !== latestScoreExplanationRequestIdRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to generate score explanation.';
      showToast(message);
    } finally {
      if (requestId === latestScoreExplanationRequestIdRef.current) {
        setIsGeneratingScopeScoreExplanation(false);
      }
    }
  };

  const toggleStorySelection = (storyId: string) => {
    if (activeProject) {
      latestSelectionAnalysisRequestIdRef.current += 1;
      latestScoreExplanationRequestIdRef.current += 1;
      const { selectedStoryIds } = activeProject;
      const updated = selectedStoryIds.includes(storyId)
        ? selectedStoryIds.filter((id) => id !== storyId)
        : [...selectedStoryIds, storyId];
      updateActiveProject({
        selectedStoryIds: updated,
        scopeScoreExplanation: null,
        lastSelectionAnalysisStateKey: null,
        finalOutputByStoryId: {},
        isDirty: true,
      });
    }
  };

  const addCustomStory = (title: string) => {
    if (activeProject && title.trim()) {
      latestSelectionAnalysisRequestIdRef.current += 1;
      latestScoreExplanationRequestIdRef.current += 1;
      const newStory = { id: generateUUID(), title: title.trim() };
      const { customStories, selectedStoryIds } = activeProject;
      updateActiveProject({
        customStories: [...customStories, newStory],
        selectedStoryIds: [...selectedStoryIds, newStory.id],
        scopeScoreExplanation: null,
        lastSelectionAnalysisStateKey: null,
        finalOutputByStoryId: {},
        isDirty: true,
      });
    }
  };

  const removeCustomStory = (storyId: string) => {
    if (activeProject) {
      latestSelectionAnalysisRequestIdRef.current += 1;
      latestScoreExplanationRequestIdRef.current += 1;
      const { customStories, selectedStoryIds } = activeProject;
      updateActiveProject({
        customStories: customStories.filter((s) => s.id !== storyId),
        selectedStoryIds: selectedStoryIds.filter((id) => id !== storyId),
        scopeScoreExplanation: null,
        lastSelectionAnalysisStateKey: null,
        finalOutputByStoryId: {},
        isDirty: true,
      });
    }
  };

  const generateQuestionsForStoryAction = async (storyId: string) => {
    if (!activeProject || isGeneratingRefinementQuestionsForStoryId) {
      return;
    }

    const { name, scopeName, contextBrief, storyCandidates, customStories, selectedStoryIds, refinementQuestionsByStoryId } =
      activeProject;
    const allStories = [...storyCandidates, ...customStories];
    const story = allStories.find((s) => s.id === storyId);

    if (!story) {
      return;
    }

    const selectedStories = allStories
      .filter((s) => selectedStoryIds.includes(s.id))
      .map((s) => ({
        title: s.title.trim(),
        summary: (s.summary ?? '').trim(),
      }));

    setIsGeneratingRefinementQuestionsForStoryId(storyId);

    try {
      const response = await fetch('/api/ai/refinement-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: name,
          scopeName,
          contextBrief,
          selectedStory: {
            title: story.title.trim(),
            summary: (story.summary ?? '').trim(),
          },
          selectedStories,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to generate refinement questions.';
        try {
          const errorBody = (await response.json()) as { error?: string };
          if (errorBody.error) {
            message = errorBody.error;
          }
        } catch {
          // Keep default message for non-JSON responses.
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        frontendQuestions: string[];
        backendQuestions: string[];
        qaQuestions: string[];
      };

      const questions: RefinementQuestion[] = [
        ...payload.frontendQuestions.map((question, index) => ({
          id: `frontend-${index}`,
          role: 'Frontend' as const,
          question: question.trim(),
          answer: '',
        })),
        ...payload.backendQuestions.map((question, index) => ({
          id: `backend-${index}`,
          role: 'Backend' as const,
          question: question.trim(),
          answer: '',
        })),
        ...payload.qaQuestions.map((question, index) => ({
          id: `qa-${index}`,
          role: 'QA' as const,
          question: question.trim(),
          answer: '',
        })),
      ].filter((q) => q.question.length > 0);

      updateActiveProject({
        refinementQuestionsByStoryId: {
          ...refinementQuestionsByStoryId,
          [storyId]: questions,
        },
        finalOutputByStoryId: {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate refinement questions.';
      showToast(message);
    } finally {
      setIsGeneratingRefinementQuestionsForStoryId(null);
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
        finalOutputByStoryId: {},
        isDirty: true,
      });
    }
  };

  const analyzeAnswers = async () => {
    if (!activeProject || isAnalyzingRefinementAnswers) {
      return;
    }

    const { name, scopeName, contextBrief, refinementQuestionsByStoryId, storyCandidates, customStories, selectedStoryIds } =
      activeProject;
    const allStories = [...storyCandidates, ...customStories];
    const selectedStories = allStories.filter((story) => selectedStoryIds.includes(story.id));

    if (selectedStories.length === 0) {
      return;
    }

    setIsAnalyzingRefinementAnswers(true);

    try {
      const analysisResults = await Promise.all(
        selectedStories.map(async (story) => {
          const questions = refinementQuestionsByStoryId[story.id] ?? [];
          if (questions.length === 0) {
            return null;
          }

          const response = await fetch('/api/ai/refinement-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectName: name,
              scopeName,
              contextBrief,
              selectedStory: {
                title: story.title.trim(),
                summary: (story.summary ?? '').trim(),
              },
              answeredQuestions: questions.map((question) => ({
                role: question.role,
                question: question.question,
                answer: question.answer,
              })),
            }),
          });

          if (!response.ok) {
            let message = `Failed to analyze refinement answers for "${story.title}".`;
            try {
              const errorBody = (await response.json()) as { error?: string };
              if (errorBody.error) {
                message = errorBody.error;
              }
            } catch {
              // Keep default message for non-JSON responses.
            }
            throw new Error(message);
          }

          const payload = (await response.json()) as RefinedOutput;
          return { storyId: story.id, output: payload };
        })
      );

      const refinedOutputByStoryId: Record<string, RefinedOutput> = {};
      analysisResults.forEach((result) => {
        if (result) {
          refinedOutputByStoryId[result.storyId] = result.output;
        }
      });

      updateActiveProject({
        refinedOutputByStoryId,
        finalOutputByStoryId: {},
        isDirty: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze refinement answers.';
      showToast(message);
    } finally {
      setIsAnalyzingRefinementAnswers(false);
    }
  };

  const generateFinalOutput = async () => {
    if (!activeProject || isGeneratingFinalOutput) {
      return;
    }

    const { name, scopeName, contextBrief, storyCandidates, customStories, selectedStoryIds, refinedOutputByStoryId } =
      activeProject;
    const allStories = [...storyCandidates, ...customStories];
    const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const normalizeList = (items: string[]) => items.map((item) => item.trim()).filter((item) => item.length > 0);

    const refinedStories = allStories
      .filter((story) => selectedStoryIds.includes(story.id))
      .map((story) => ({
        storyId: story.id,
        storyTitle: normalizeText(story.title),
        refinedOutput: refinedOutputByStoryId[story.id],
      }))
      .filter((entry) => Boolean(entry.refinedOutput));

    if (refinedStories.length === 0) {
      showToast('No refined stories found. Complete Step 4 first.');
      return;
    }

    setIsGeneratingFinalOutput(true);

    try {
      const finalResults = await Promise.all(
        refinedStories.map(async (entry) => {
          const refinedOutput = entry.refinedOutput as RefinedOutput;
          const payload = {
            projectName: normalizeText(name),
            scopeName: normalizeText(scopeName),
            contextBrief: normalizeText(contextBrief),
            storyTitle: normalizeText(refinedOutput.storyTitle || entry.storyTitle),
            ...(normalizeText(refinedOutput.userStoryStatement)
              ? { userStoryStatement: normalizeText(refinedOutput.userStoryStatement) }
              : {}),
            acceptanceCriteriaDraft: normalizeList(refinedOutput.acceptanceCriteria),
            technicalNotes: normalizeList(refinedOutput.technicalNotes),
            notIncluded: normalizeList(refinedOutput.notIncluded),
            assumptions: normalizeList(refinedOutput.assumptions),
            openQuestions: normalizeList(refinedOutput.openQuestions),
          };

          const response = await fetch('/api/ai/final-output', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            let message = `Failed to generate final output for "${entry.storyTitle}".`;
            try {
              const errorBody = (await response.json()) as { error?: string };
              if (errorBody.error) {
                message = errorBody.error;
              }
            } catch {
              // Keep default message for non-JSON responses.
            }
            throw new Error(message);
          }

          const result = (await response.json()) as RefinedOutput;
          const output: RefinedOutput = {
            storyTitle: normalizeText(result.storyTitle),
            userStoryStatement: normalizeText(result.userStoryStatement),
            acceptanceCriteria: normalizeList(result.acceptanceCriteria ?? []),
            technicalNotes: normalizeList(result.technicalNotes ?? []),
            notIncluded: normalizeList(result.notIncluded ?? []),
            assumptions: normalizeList(result.assumptions ?? []),
            openQuestions: normalizeList(result.openQuestions ?? []),
          };

          return { storyId: entry.storyId, output };
        })
      );

      const finalOutputByStoryId: Record<string, RefinedOutput> = {};
      finalResults.forEach((result) => {
        finalOutputByStoryId[result.storyId] = result.output;
      });

      updateActiveProject({
        finalOutputByStoryId,
        isDirty: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate final output.';
      showToast(message);
    } finally {
      setIsGeneratingFinalOutput(false);
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
    isGeneratingStoryCandidates,
    analyzeSelectionCoverage,
    isAnalyzingSelectionCoverage,
    generateScopeScoreExplanation,
    isGeneratingScopeScoreExplanation,
    toggleStorySelection,
    addCustomStory,
    removeCustomStory,
    generateQuestionsForStoryAction,
    isGeneratingRefinementQuestionsForStoryId,
    updateQuestionAnswer,
    analyzeAnswers,
    isAnalyzingRefinementAnswers,
    generateFinalOutput,
    isGeneratingFinalOutput,
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
