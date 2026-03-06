'use client';

import { useState } from 'react';
import { useScope } from '@/lib/scope-context';
import DeleteProjectModal from './DeleteProjectModal';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const { projects, activeProjectId, setActiveProject, createProject, deleteProjectById } = useScope();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  };

  return (
    <>
      <nav className="h-full flex flex-col p-4 space-y-4">
        {/* Projects Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide">Projects</h2>
          <button
            onClick={() => setIsCreatingProject(!isCreatingProject)}
            className="text-xs font-medium text-[#3F46E1] hover:text-[#4F51E1] transition-colors"
          >
            + New
          </button>
        </div>

        {/* New Project Input */}
        {isCreatingProject && (
          <div className="mb-3 p-2 rounded-md bg-[#1C212B] border border-[#262C36]">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="Project name"
              autoFocus
              className="w-full px-2 py-1 text-xs rounded bg-[#0F1115] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1] focus:ring-1 focus:ring-[#3F46E1] transition-colors mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                className="flex-1 px-2 py-1 text-xs font-medium rounded bg-[#3F46E1] text-white hover:bg-[#4F51E1] transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingProject(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-2 py-1 text-xs font-medium rounded bg-[#1C212B] text-[#9CA3AF] border border-[#262C36] hover:text-[#E5E7EB] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {projects.map((project) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveProject(project.id);
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                activeProjectId === project.id
                  ? 'bg-[#1C212B] border border-[#3F46E1] text-[#E5E7EB]'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C212B]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{project.name}</span>
                  {project.isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] flex-shrink-0" title="Unsaved" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingProject({ id: project.id, name: project.name });
                    }}
                    title="Delete project"
                    className="text-[#EF4444] hover:text-[#F87171] ml-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden navigation items for future use */}
      {/* <Link
        href="/context"
        className="block px-3 py-2 rounded hover:bg-accent/20"
      >
        Context
      </Link>

      <Link
        href="/stories"
        className="block px-3 py-2 rounded hover:bg-accent/20"
      >
        Stories
      </Link>

      <Link
        href="/gap-analysis"
        className="block px-3 py-2 rounded hover:bg-accent/20"
      >
        Gap Analysis
      </Link>

      <Link
        href="/drafting"
        className="block px-3 py-2 rounded hover:bg-accent/20"
      >
        Drafting
      </Link>

      <Link
        href="/refinement"
        className="block px-3 py-2 rounded hover:bg-accent/20"
      >
        Refinement
      </Link> */}
      </nav>
      {deletingProject && (
        <DeleteProjectModal
          projectId={deletingProject.id}
          projectName={deletingProject.name}
          onClose={() => setDeletingProject(null)}
          onDeleted={() => {
            // remove project locally then navigate away
            deleteProjectById(deletingProject.id);
            setDeletingProject(null);
            router.push('/');
          }}
        />
      )}
    </>
  );
}
