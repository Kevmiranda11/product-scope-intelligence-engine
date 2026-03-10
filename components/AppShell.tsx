'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { ScopeProvider } from '@/lib/scope-context';

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isLoginRoute = pathname === '/login';

  if (isLoginRoute) {
    return <main className="min-h-screen bg-[#0F1115] text-[#E5E7EB]">{children}</main>;
  }

  return (
    <ScopeProvider>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-[#262C36] bg-[#151922]">
          <Sidebar />
        </aside>
        <div className="flex-1 flex flex-col bg-[#0F1115]">
          <header className="h-16 shrink-0 border-b border-[#262C36] bg-[#151922] px-6 flex items-center justify-between">
            <Topbar />
          </header>
          <main className="flex-1 overflow-auto p-8 bg-[#0F1115]">{children}</main>
        </div>
      </div>
    </ScopeProvider>
  );
}
