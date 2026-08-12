import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import CommandCenter from '@/pages/CommandCenter';
import NewInspection from '@/pages/NewInspection';
import History from '@/pages/History';
import QualityReports from '@/pages/QualityReports';
import SystemSettings from '@/pages/SystemSettings';
import Landing from '@/pages/Landing';
import type { Page } from '@/types';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  if (page === 'landing') {
    return <Landing onEnter={setPage} />;
  }

  return (
    <div className="flex min-h-screen bg-[#1a1a1f]">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {page === 'command-center' && <CommandCenter onNavigate={setPage} />}
          {page === 'new-inspection' && <NewInspection />}
          {page === 'history' && <History />}
          {page === 'quality-reports' && <QualityReports />}
          {page === 'system-settings' && <SystemSettings />}
        </main>
      </div>
    </div>
  );
}
