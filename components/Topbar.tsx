'use client';

import { useScope } from '@/lib/scope-context';

export default function Topbar() {
  const {
    scopeName,
    sprintDuration,
    version,
    isDirty,
    incrementVersion,
  } = useScope();

  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#E5E7EB]">
          {scopeName || 'Product Scope Workspace'}
        </h1>
        {sprintDuration && (
          <span className="px-2 py-1 text-xs rounded-md bg-[#1C212B] text-[#9CA3AF] border border-[#262C36]">
            Sprint: {sprintDuration}
          </span>
        )}
        <span className="px-2 py-1 text-xs rounded-md bg-[#1C212B] text-[#9CA3AF] border border-[#262C36]">
          v{version}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {isDirty && (
          <button
            onClick={incrementVersion}
            className="px-3 py-1 text-sm font-medium rounded-md bg-[#3F46E1] text-white border border-[#3F46E1] hover:bg-[#4F51E1] focus:outline-none focus:ring-1 focus:ring-[#3F46E1] focus:ring-offset-1 focus:ring-offset-[#0F1115] transition-colors"
          >
            Save Snapshot
          </button>
        )}
        
        <div className={`text-sm flex items-center gap-2 ${
          isDirty ? 'text-[#FBBF24]' : 'text-[#10B981]'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current"></span>
          {isDirty ? 'Unsaved Changes' : 'Clean'}
        </div>
      </div>
    </div>
  );
}