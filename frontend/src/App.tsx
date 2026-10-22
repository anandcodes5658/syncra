import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreatePostPage } from './pages/CreatePostPage';
import { LiveStatusPage } from './pages/LiveStatusPage';
import { ConnectAccountsPage } from './pages/ConnectAccountsPage';
import { PostHistoryPage } from './pages/PostHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConnectedAccount } from './types';
import { getAccounts } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'status' | 'history' | 'accounts' | 'settings'>('create');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [hasActiveJobs, setHasActiveJobs] = useState(false);

  const fetchAccountsList = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.warn('Could not load accounts:', err);
    }
  };

  useEffect(() => {
    fetchAccountsList();
  }, []);

  const handlePublishSuccess = (draftId: string) => {
    setActiveDraftId(draftId);
    setHasActiveJobs(true);
    setActiveTab('status');
  };

  const handleSelectDraft = (draftId: string) => {
    setActiveDraftId(draftId);
    setActiveTab('status');
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasActiveJobs={hasActiveJobs}
      />

      {/* Main Screen Content */}
      <main className="flex-1">
        {activeTab === 'create' && (
          <CreatePostPage
            accounts={accounts}
            onPublishSuccess={handlePublishSuccess}
          />
        )}

        {activeTab === 'status' && (
          <LiveStatusPage
            activeDraftId={activeDraftId}
            onSelectDraft={setActiveDraftId}
            onCreateNew={() => setActiveTab('create')}
          />
        )}

        {activeTab === 'history' && (
          <PostHistoryPage onSelectDraft={handleSelectDraft} />
        )}

        {activeTab === 'accounts' && (
          <ConnectAccountsPage
            accounts={accounts}
            onRefreshAccounts={fetchAccountsList}
          />
        )}

        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
        <p>Syncra Social Auto Poster • Official APIs for Instagram, Facebook, LinkedIn, YouTube & X</p>
      </footer>
    </div>
  );
}

export default App;
