import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import ToastStack from '../common/Toast.jsx';
import LevelUpModal from '../common/LevelUpModal.jsx';
import QuestConfirmModal from '../quest/QuestConfirmModal.jsx';
import { isEmbedMode } from '../../utils/embedMode.js';

// Shared frame for every student-facing page: sidebar (rail/drawer) + header + main.
// `aiPanel` slot renders the right-hand AI panel on wide layouts (Dashboard only).
// When loaded as `?mode=embed=...` (inside the university iframe), the `.is-embed`
// class trims header chrome so the compact iframe viewport isn't wasted on it.
export default function AppShell({ activePath, navigate, title, subtitle, aiPanel, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const embed = isEmbedMode();

  return (
    <div className={`career-app ${aiPanel ? '' : 'no-ai-panel'} ${embed ? 'is-embed' : ''}`}>
      <Sidebar
        activePath={activePath}
        navigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="career-main">
        <Header title={title} subtitle={subtitle} onHamburgerClick={() => setSidebarOpen(true)} compact={embed} />
        {children}
      </main>
      {aiPanel}
      <ToastStack />
      <LevelUpModal />
      <QuestConfirmModal />
    </div>
  );
}
