'use client';

import { useEffect, useMemo, useState } from 'react';

type UserRecord = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  forcePasswordReset: boolean;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [orgUrl, setOrgUrl] = useState('');
  const [pat, setPat] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState<string>('');

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users]
  );

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, integrationRes] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store' }),
        fetch('/api/admin/integrations/azure-devops', { cache: 'no-store' }),
      ]);

      if (!usersRes.ok) {
        const body = (await usersRes.json()) as { error?: string };
        throw new Error(body.error || 'Failed to load users.');
      }
      if (!integrationRes.ok) {
        const body = (await integrationRes.json()) as { error?: string };
        throw new Error(body.error || 'Failed to load Azure integration settings.');
      }

      const usersBody = (await usersRes.json()) as { users: UserRecord[] };
      const integrationBody = (await integrationRes.json()) as {
        configured: boolean;
        organizationUrl: string;
      };

      setUsers(usersBody.users);
      setOrgUrl(integrationBody.organizationUrl || '');
      setIntegrationStatus(integrationBody.configured ? 'Configured' : 'Not configured');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedPassword(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
        }),
      });
      const body = (await res.json()) as { error?: string; temporaryPassword?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to create user.');
      }
      setCreatedPassword(body.temporaryPassword || null);
      setNewEmail('');
      setNewRole('user');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    }
  };

  const toggleUserStatus = async (user: UserRecord) => {
    setError(null);
    try {
      const nextStatus = user.status === 'active' ? 'disabled' : 'active';
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to update user.');
      }
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  const resetPassword = async (user: UserRecord) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const body = (await res.json()) as { error?: string; temporaryPassword?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to reset password.');
      }
      setCreatedPassword(body.temporaryPassword || null);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    }
  };

  const saveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/integrations/azure-devops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationUrl: orgUrl,
          pat,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to save integration.');
      }
      setPat('');
      setIntegrationStatus('Configured');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration.');
    }
  };

  if (loading) {
    return <div className="text-[#9CA3AF]">Loading admin panel...</div>;
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#E5E7EB]">Admin</h1>
        <p className="text-[#9CA3AF] mt-1">Manage users and Azure DevOps integration.</p>
      </div>

      {error && <div className="p-3 rounded border border-[#5F2C2C] bg-[#2C1C1C] text-[#F87171] text-sm">{error}</div>}
      {createdPassword && (
        <div className="p-3 rounded border border-[#2B4A3B] bg-[#13211B] text-[#A7F3D0] text-sm">
          Temporary password: <span className="font-mono">{createdPassword}</span>
        </div>
      )}

      <div className="p-4 rounded-md border border-[#262C36] bg-[#1C212B]">
        <h2 className="text-lg font-medium text-[#E5E7EB] mb-3">Create User</h2>
        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@company.com"
            required
            className="md:col-span-2 px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB]"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
            className="px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB]"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            className="px-3 py-2 rounded-md bg-[#3F46E1] border border-[#3F46E1] text-white hover:bg-[#4F51E1]"
          >
            Create
          </button>
        </form>
      </div>

      <div className="p-4 rounded-md border border-[#262C36] bg-[#1C212B]">
        <h2 className="text-lg font-medium text-[#E5E7EB] mb-3">Users</h2>
        <div className="space-y-2">
          {sortedUsers.map((user) => (
            <div key={user.id} className="p-3 rounded border border-[#262C36] bg-[#0F1115] flex flex-wrap items-center gap-3 justify-between">
              <div>
                <p className="text-sm text-[#E5E7EB]">{user.email}</p>
                <p className="text-xs text-[#9CA3AF]">
                  {user.role} • {user.status}
                  {user.forcePasswordReset ? ' • password reset required' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void toggleUserStatus(user)}
                  className="px-3 py-1.5 text-xs rounded border border-[#262C36] text-[#E5E7EB] hover:border-[#3F46E1]"
                >
                  {user.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => void resetPassword(user)}
                  className="px-3 py-1.5 text-xs rounded border border-[#262C36] text-[#E5E7EB] hover:border-[#3F46E1]"
                >
                  Reset Password
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-md border border-[#262C36] bg-[#1C212B]">
        <h2 className="text-lg font-medium text-[#E5E7EB] mb-1">Azure DevOps Integration</h2>
        <p className="text-xs text-[#9CA3AF] mb-3">Status: {integrationStatus || 'Unknown'}</p>
        <form onSubmit={saveIntegration} className="space-y-3">
          <input
            type="url"
            value={orgUrl}
            onChange={(e) => setOrgUrl(e.target.value)}
            placeholder="https://dev.azure.com/your-org"
            required
            className="w-full px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB]"
          />
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="Personal Access Token"
            required
            className="w-full px-3 py-2 rounded-md bg-[#0F1115] border border-[#262C36] text-[#E5E7EB]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[#3F46E1] border border-[#3F46E1] text-white hover:bg-[#4F51E1]"
          >
            Save Integration
          </button>
        </form>
      </div>
    </section>
  );
}
