'use client';

import React, { useState } from 'react';
import { useScope } from '@/lib/scope-context';
import DeleteProjectModal from './DeleteProjectModal';

const STEPS = [
  { id: 'context', label: 'Context' },
  { id: 'story', label: 'Story Breakdown' },
  { id: 'selection', label: 'Selection' },
  { id: 'refinement', label: 'Refinement' },
  { id: 'output', label: 'Output' },
];

export default function WorkspaceStepper() {
  const {
    activeProject,
    setScopeName,
    setSprintDuration,
    setTeam,
    setActiveStep,
    generateStoryCandidates,
    toggleStorySelection,
    addCustomStory,
    removeCustomStory,
    deleteActiveProject,
  } = useScope();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!activeProject) {
    return <div className="text-[#9CA3AF]">Loading project...</div>;
  }

  // normalize project fields to avoid undefined lookups
  const project = {
    ...activeProject,
    refinementQuestionsByStoryId: activeProject.refinementQuestionsByStoryId ?? {},
    refinedOutputByStoryId: activeProject.refinedOutputByStoryId ?? {},
    storyCandidates: activeProject.storyCandidates ?? [],
    customStories: activeProject.customStories ?? [],
    selectedStoryIds: activeProject.selectedStoryIds ?? [],
  };

  const currentStep = project.activeStep;

  const handlePrevious = () => {
    if (currentStep > 0) {
      setActiveStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setActiveStep(currentStep + 1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project actions */}
          {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-colors ${
                  index <= currentStep
                    ? 'bg-[#3F46E1] text-white'
                    : 'bg-[#1C212B] text-[#6B7280] border border-[#262C36]'
                }`}
              >
                {index + 1}
              </div>

              {/* Step Label */}
              <div className="ml-3">
                <p
                  className={`text-sm font-medium transition-colors ${
                    index === currentStep
                      ? 'text-white'
                      : index < currentStep
                      ? 'text-[#9CA3AF]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition-colors ${
                    index < currentStep ? 'bg-[#3F46E1]' : 'bg-[#262C36]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        {currentStep === 0 && <StepContext />}
        {currentStep === 1 && <StepStoryBreakdown />}
        {currentStep === 2 && <StepSelection />}
        {currentStep === 3 && <StepRefinement />}
        {currentStep === 4 && <StepOutput />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8 pt-6 border-t border-[#262C36]">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentStep === 0
              ? 'bg-[#1C212B] text-[#6B7280] border border-[#262C36] cursor-not-allowed'
              : 'bg-[#1C212B] text-[#E5E7EB] border border-[#262C36] hover:border-[#3F46E1] hover:text-white'
          }`}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={
            currentStep === STEPS.length - 1 ||
            (currentStep === 3 && Object.keys(project.refinedOutputByStoryId).length === 0)
          }
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentStep === STEPS.length - 1 ||
            (currentStep === 3 && 
              (!activeProject || Object.keys(activeProject?.refinedOutputByStoryId ?? {}).length === 0))
              ? 'bg-[#1C212B] text-[#6B7280] border border-[#262C36] cursor-not-allowed'
              : 'bg-[#3F46E1] text-white border border-[#3F46E1] hover:bg-[#4F51E1]'
          }`}
        >
          Next
        </button>
      </div>
      {showDeleteModal && project && (
        <DeleteProjectModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            deleteActiveProject();
            setShowDeleteModal(false);
            window.location.href = '/';
          }}
        />
      )}
    </div>
  );
}

function StepContext() {
  const { scopeName, sprintDuration, team, contextBrief, setScopeName, setSprintDuration, setTeam, setContextBrief } = useScope();

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">Define Context</h2>
      <p className="text-[#9CA3AF] mb-8">
        Define the scope parameters and team composition that apply to the rest of this workspace.
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Scope Name Field */}
        <div>
          <label htmlFor="scopeName" className="block text-sm font-medium text-[#E5E7EB] mb-2">
            Scope Name
          </label>
          <input
            id="scopeName"
            type="text"
            value={scopeName}
            onChange={(e) => setScopeName(e.target.value)}
            placeholder="e.g., Mobile App MVP"
            className="w-full px-4 py-2 rounded-md bg-[#1C212B] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors"
          />
        </div>

        {/* Sprint Duration Field */}
        <div>
          <label htmlFor="sprintDuration" className="block text-sm font-medium text-[#E5E7EB] mb-2">
            Sprint Duration
          </label>
          <input
            id="sprintDuration"
            type="text"
            value={sprintDuration}
            onChange={(e) => setSprintDuration(e.target.value)}
            placeholder="e.g., 2 weeks"
            className="w-full px-4 py-2 rounded-md bg-[#1C212B] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors"
          />
        </div>

        {/* Team Composition Field */}
        <div>
          <label htmlFor="team" className="block text-sm font-medium text-[#E5E7EB] mb-2">
            Team Composition
          </label>
          <input
            id="team"
            type="text"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g., 3 engineers, 1 designer, 1 PM"
            className="w-full px-4 py-2 rounded-md bg-[#1C212B] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors"
          />
        </div>

        {/* Context Brief Textarea */}
        <div>
          <label htmlFor="contextBrief" className="block text-sm font-medium text-[#E5E7EB] mb-2">
            Context Brief
          </label>
          <p className="text-xs text-[#6B7280] mb-3">
            Describe the feature/functionality, rules, constraints, and what's not included. This will be used to generate user stories.
          </p>
          <textarea
            id="contextBrief"
            value={contextBrief}
            onChange={(e) => setContextBrief(e.target.value)}
            placeholder="e.g., Build a mobile app for users to track daily expenses. Must support multiple currencies and categories. Offline sync not required. Mobile only (no web). Uses existing API."
            className="w-full px-4 py-2 rounded-md bg-[#1C212B] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors resize-none"
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}

function StepStoryBreakdown() {
  const { activeProject, generateStoryCandidates } = useScope();

  if (!activeProject) return null;

  const { storyCandidates, lastGeneratedAt, contextBrief } = activeProject;
  const isContextBriefValid = contextBrief && contextBrief.trim().length >= 30;

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">Story Breakdown</h2>
      <p className="text-[#9CA3AF] mb-6">
        Generate candidate user stories based on the current context.
      </p>

      {!isContextBriefValid && (
        <div className="mb-6 p-4 rounded-md bg-[#2C1C1C] border border-[#5F2C2C] text-[#F87171]">
          <p className="text-sm">
            Please fill in the Context Brief on Step 1 (at least 30 characters) before generating stories.
          </p>
        </div>
      )}

      <button
        onClick={generateStoryCandidates}
        disabled={!isContextBriefValid}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors mb-6 ${
          isContextBriefValid
            ? 'bg-[#3F46E1] text-white border border-[#3F46E1] hover:bg-[#4F51E1] focus:outline-none focus:ring-1 focus:ring-[#3F46E1]'
            : 'bg-[#1C212B] text-[#6B7280] border border-[#262C36] cursor-not-allowed'
        }`}
      >
        Generate Candidates
      </button>

      {lastGeneratedAt && (
        <p className="text-xs text-[#6B7280] mb-6">
          Last generated: {lastGeneratedAt}
        </p>
      )}

      {storyCandidates.length === 0 ? (
        <div className="text-center py-12 px-6">
          <p className="text-[#9CA3AF] text-sm">
            {isContextBriefValid ? 'No story candidates yet. Click "Generate Candidates" to get started.' : 'Fill in the Context Brief to generate stories.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {storyCandidates.map((story) => (
            <div
              key={story.id}
              className="p-4 rounded-md bg-[#1C212B] border border-[#262C36] text-[#E5E7EB] hover:border-[#3F46E1] transition-colors"
            >
              <p className="text-sm">{story.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepSelection() {
  const { activeProject, toggleStorySelection, addCustomStory, removeCustomStory } = useScope();
  const [customStoryInput, setCustomStoryInput] = useState('');

  if (!activeProject) return null;

  const { storyCandidates, customStories, selectedStoryIds, scopeConfidence, missingScopeSignals } = activeProject;
  const allStories = [...storyCandidates, ...customStories];
  const keptCount = selectedStoryIds.length;

  const handleAddCustomStory = () => {
    if (customStoryInput.trim()) {
      addCustomStory(customStoryInput);
      setCustomStoryInput('');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">Selection</h2>
      <p className="text-[#9CA3AF] mb-8">
        Keep what you want, remove what you don't, and add missing stories.
      </p>

      {/* Summary */}
      <div className="mb-6 p-4 rounded-md bg-[#1C212B] border border-[#262C36]">
        <p className="text-sm text-[#E5E7EB]">
          <span className="font-semibold">Kept {keptCount} of {allStories.length}</span> stories
        </p>
      </div>

      {/* Scope Confidence */}
      <div className="mb-6 p-4 rounded-md bg-[#1C212B] border border-[#262C36]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#E5E7EB]">Scope Confidence</p>
          <span className="text-lg font-semibold text-[#3F46E1]">{scopeConfidence}%</span>
        </div>
        <div className="w-full h-2 bg-[#262C36] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              scopeConfidence >= 75
                ? 'bg-[#10B981]'
                : scopeConfidence >= 50
                ? 'bg-[#FBBF24]'
                : 'bg-[#EF4444]'
            }`}
            style={{ width: `${scopeConfidence}%` }}
          />
        </div>
      </div>

      {/* Story List */}
      {allStories.length === 0 ? (
        <div className="text-center py-8 px-6">
          <p className="text-[#9CA3AF] text-sm">
            No stories yet. Go to Step 2 to generate candidates.
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-sm font-medium text-[#E5E7EB] mb-4">Stories</p>
          <div className="space-y-2">
            {allStories.map((story) => {
              const isCustom = customStories.some((s) => s.id === story.id);
              const isSelected = selectedStoryIds.includes(story.id);

              return (
                <div
                  key={story.id}
                  className={`p-3 rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-[#1C212B] border-[#3F46E1]'
                      : 'bg-[#0F1115] border-[#262C36]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStorySelection(story.id)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E5E7EB]">{story.title}</p>
                      {isCustom && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-[#3F46E1] text-white">
                          Custom
                        </span>
                      )}
                    </div>
                    {isCustom && (
                      <button
                        onClick={() => removeCustomStory(story.id)}
                        className="text-xs text-[#EF4444] hover:text-[#F87171] transition-colors flex-shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Custom Story */}
      <div className="mb-8 p-4 rounded-md bg-[#1C212B] border border-[#262C36]">
        <p className="text-sm font-medium text-[#E5E7EB] mb-3">Add Custom Story</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={customStoryInput}
            onChange={(e) => setCustomStoryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomStory()}
            placeholder="e.g., Set up analytics dashboard"
            className="flex-1 px-3 py-2 text-sm rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors"
          />
          <button
            onClick={handleAddCustomStory}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[#3F46E1] text-white border border-[#3F46E1] hover:bg-[#4F51E1] focus:outline-none focus:ring-1 focus:ring-[#3F46E1] transition-colors flex-shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Missing Scope Signals */}
      {missingScopeSignals.length > 0 && (
        <div className="p-4 rounded-md border border-[#5F2C2C] bg-[#2C1C1C]">
          <p className="text-sm font-medium text-[#F87171] mb-4">Missing Scope Signals</p>
          <div className="space-y-3">
            {missingScopeSignals.map((signal) => (
              <div key={signal.id} className="text-sm">
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                      signal.severity === 'high'
                        ? 'bg-[#EF4444] text-white'
                        : signal.severity === 'med'
                        ? 'bg-[#FBBF24] text-black'
                        : 'bg-[#93C5FD] text-black'
                    }`}
                  >
                    {signal.severity.toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-[#F87171]">{signal.title}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">{signal.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRefinement() {
  const {
    activeProject,
    generateQuestionsForStoryAction,
    updateQuestionAnswer,
    analyzeAnswers,
  } = useScope();

  if (!activeProject) {
    return <div className="text-[#9CA3AF]">Loading project...</div>;
  }

  const { storyCandidates, customStories, selectedStoryIds, refinementQuestionsByStoryId, refinedOutputByStoryId } =
    activeProject;
  const allStories = [...storyCandidates, ...customStories];
  const selectedStories = allStories.filter((s) => selectedStoryIds.includes(s.id));

  const canAnalyze = selectedStories.some((s) => refinementQuestionsByStoryId[s.id]?.length > 0);

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">Refinement</h2>
      <p className="text-[#9CA3AF] mb-8">Answer the team's questions to finalize scope.</p>

      {selectedStories.length === 0 ? (
        <div className="p-6 rounded-md border border-[#262C36] bg-[#1C212B]">
          <p className="text-[#9CA3AF]">No stories selected. Go back to Selection to select stories for refinement.</p>
        </div>
      ) : (
        <>
          {/* Story Cards */}
          <div className="space-y-6 mb-8">
            {selectedStories.map((story) => {
              const questions = refinementQuestionsByStoryId[story.id] || [];
              const isCustom = customStories.some((cs) => cs.id === story.id);

              return (
                <div key={story.id} className="p-6 rounded-md border border-[#262C36] bg-[#1C212B]">
                  <div className="flex gap-4 items-start mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#E5E7EB]">{story.title}</p>
                      {isCustom && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-[#3F46E1] text-white">
                          Custom
                        </span>
                      )}
                    </div>
                    {questions.length === 0 ? (
                      <button
                        onClick={() => generateQuestionsForStoryAction(story.id)}
                        className="px-3 py-2 text-sm font-medium rounded-md bg-[#3F46E1] text-white border border-[#3F46E1] hover:bg-[#4F51E1] focus:outline-none focus:ring-1 focus:ring-[#3F46E1] transition-colors"
                      >
                        Generate Questions
                      </button>
                    ) : (
                      <span className="px-3 py-2 text-sm text-[#10B981] bg-[#064E3B] rounded">
                        {questions.length} questions
                      </span>
                    )}
                  </div>

                  {/* Questions */}
                  {questions.length > 0 && (
                    <div className="space-y-6">
                      {['Frontend', 'Backend', 'QA'].map((role) => {
                        const roleQuestions = questions.filter((q) => q.role === role);
                        if (roleQuestions.length === 0) return null;

                        return (
                          <div key={role}>
                            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-3">{role}</p>
                            <div className="space-y-3">
                              {roleQuestions.map((q) => (
                                <div key={q.id}>
                                  <p className="text-sm text-[#E5E7EB] mb-2">{q.question}</p>
                                  <textarea
                                    value={q.answer}
                                    onChange={(e) => updateQuestionAnswer(story.id, q.id, e.target.value)}
                                    placeholder="Answer the question..."
                                    className="w-full px-3 py-2 text-sm rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors resize-vertical"
                                    rows={3}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Analyze Answers Button */}
          {canAnalyze && (
            <button
              onClick={analyzeAnswers}
              className="px-6 py-3 mb-8 text-sm font-medium rounded-md bg-[#10B981] text-white border border-[#10B981] hover:bg-[#059669] focus:outline-none focus:ring-1 focus:ring-[#10B981] transition-colors"
            >
              Analyze Answers
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StepOutput() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">Output</h2>
      <p className="text-[#9CA3AF]">Generate final scope output and deliverables.</p>
    </div>
  );
}
