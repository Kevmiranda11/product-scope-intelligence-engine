'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('next') || '/'
      : '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Login failed.');
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-[#262C36] bg-[#151922] p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-[#E5E7EB] mb-2">Sign In</h1>
        <p className="text-sm text-[#9CA3AF] mb-6">Use your email and password to access the workspace.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#E5E7EB] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#E5E7EB] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#3F46E1]"
            />
          </div>

          {error && <p className="text-sm text-[#F87171]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
              loading
                ? 'bg-[#1C212B] text-[#6B7280] border-[#262C36] cursor-not-allowed'
                : 'bg-[#3F46E1] text-white border-[#3F46E1] hover:bg-[#4F51E1]'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </section>
  );
}
