'use client';

import { useState } from 'react';
import { useScope } from '@/lib/scope-context';
import ScopeHeader from '../../components/ScopeHeader';
import DeleteProjectModal from '../../components/DeleteProjectModal';

export default function ContextPage() {
  const { scopeName, sprintDuration, team, setScopeName, setSprintDuration, setTeam, activeProject, deleteActiveProject } = useScope();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <section>
      <ScopeHeader scopeName="Context" />
      
      <div className="max-w-2xl">
        <p className="text-[#9CA3AF] mb-8">
          Define the scope parameters and team composition that apply to the rest of this workspace.
        </p>

        <div className="space-y-6">
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
        </div>
      </div>
      {/* Delete project action in settings */}
      {activeProject && (
        <div className="mt-12">
          <button
            onClick={() => setShowDelete(true)}
            className="text-sm text-[#EF4444] hover:underline"
          >
            Delete project
          </button>
        </div>
      )}
      {showDelete && activeProject && (
        <DeleteProjectModal
          projectId={activeProject.id}
          projectName={activeProject.name}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            deleteActiveProject();
            setShowDelete(false);
            window.location.href = '/';
          }}
        />
      )}
    </section>
  );
}
