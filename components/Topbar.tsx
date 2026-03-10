'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useScope } from '@/lib/scope-context';

export default function Topbar() {
  const {
    scopeName,
    sprintDuration,
    version,
    isDirty,
    incrementVersion,
  } = useScope();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: 'admin' | 'user' } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = (await res.json()) as { user?: { email: string; role: 'admin' | 'user' } };
        if (mounted && payload.user) {
          setUser(payload.user);
        }
      } catch {
        // noop
      }
    };
    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

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
        {user && (
          <div className="text-xs text-[#9CA3AF]">
            {user.email}
            {user.role === 'admin' && (
              <Link href="/admin" className="ml-3 text-[#93C5FD] hover:text-[#BFDBFE]">
                Admin
              </Link>
            )}
          </div>
        )}
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
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`text-sm px-3 py-1 rounded-md border transition-colors ${
            loggingOut
              ? 'text-[#6B7280] border-[#262C36] cursor-not-allowed'
              : 'text-[#E5E7EB] border-[#262C36] hover:border-[#3F46E1]'
          }`}
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
