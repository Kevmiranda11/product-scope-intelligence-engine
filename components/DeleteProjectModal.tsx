"use client";

import React, { useState } from 'react';
import { useScope } from '@/lib/scope-context';
import { useRouter } from 'next/navigation';

interface Props {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function DeleteProjectModal({ projectId, projectName, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useScope();

  const canSubmit = !loading;

  const handleDelete = async () => {
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : undefined;
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('currentUserRole') : undefined;

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-role': userRole || '',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || 'Failed to delete project');
        setLoading(false);
        return;
      }

      // success: show toast + redirect to root (project list)
      showToast(`Project '${projectName}' deleted.`);
      onDeleted && onDeleted();
      onClose();
      router.push('/');
    } catch (e) {
      setError('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg p-6 bg-[#0F1115] rounded-md border border-[#262C36]">
        <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Delete project</h3>
        <p className="text-sm text-[#9CA3AF] mb-4">
          Are you sure you want to delete the project "{projectName}"?
        </p>

        {error && <p className="text-sm text-[#F87171] mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-[#1C212B] text-[#9CA3AF] border border-[#262C36]">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={!canSubmit || loading}
            className={`px-4 py-2 rounded font-medium ${canSubmit ? 'bg-[#EF4444] text-white' : 'bg-[#1C212B] text-[#6B7280] cursor-not-allowed'}`}
          >
            {loading ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      </div>
    </div>
  );
}
