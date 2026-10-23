import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CreatePostPage } from './pages/CreatePostPage';
import { LiveStatusPage } from './pages/LiveStatusPage';
import { ConnectAccountsPage } from './pages/ConnectAccountsPage';
import { PostHistoryPage } from './pages/PostHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PasswordGate } from './components/PasswordGate';
import { ConnectedAccount } from './types';
import { getAccounts, checkAuth, clearAuthToken } from './services/api';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'status' | 'history' | 'accounts' | 'settings'>('create');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [hasActiveJobs, setHasActiveJobs] = useState(false);

  useEffect(() => {
    checkAuth().then((auth) => {
      setIsAuthenticated(auth);
      if (auth) {
        fetchAccountsList();
      }
    });

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('syncra:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('syncra:unauthorized', handleUnauthorized);
  }, []);

  const fetchAccountsList = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.warn('Could not load accounts:', err);
    }
  };

  const handlePublishSuccess = (draftId: string) => {
    setActiveDraftId(draftId);
    setHasActiveJobs(true);
    setActiveTab('status');
  };

  const handleSelectDraft = (draftId: string) => {
    setActiveDraftId(draftId);
    setActiveTab('status');
  };

  const handleLock = () => {
    clearAuthToken();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PasswordGate
        onAuthenticated={() => {
          setIsAuthenticated(true);
          fetchAccountsList();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasActiveJobs={hasActiveJobs}
        onLock={handleLock}
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
