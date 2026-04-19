import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useVisionBoardState, hasLocalStorageData, clearLocalStorageData } from './hooks/useVisionBoardState';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { useTierLimits } from './hooks/useTierLimits';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import AuthScreen from './components/AuthScreen';
import Nav from './components/Nav';
import PageHeader from './components/PageHeader';
import HubSection from './components/HubSection';
import AchievementsSection from './components/AchievementsSection';
import TrackSection from './components/TrackSection';
import ShopSection from './components/ShopSection';
import HolidaySection from './components/HolidaySection';
import HabitsSection from './components/HabitsSection';
import SettingsSection from './components/SettingsSection';
import { SCHEMES, applyScheme, applyTheme } from './components/SettingsSection';
import { useSubscriptionContext } from './context/SubscriptionContext';
import Modals from './components/Modals';
import PaywallModal from './components/PaywallModal';
import HubFooter from './components/HubFooter';
import CoinToast from './components/CoinToast';
import ConnectToast from './components/ConnectToast';
import CommandPalette from './components/CommandPalette';
import ShortcutsModal from './components/ShortcutsModal';
import LegalPage from './components/LegalPage';
import CookieBanner from './components/CookieBanner';
import InstallPrompt from './components/InstallPrompt';
import { useCapacitor, haptic } from './hooks/useCapacitor';

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

// ── Background helpers (device-local, not synced) ─────────────────────────
function loadBgs() {
  try { return JSON.parse(localStorage.getItem('vb4_bg') || '{}'); } catch { return {}; }
}
function saveBgs(bgs) {
  localStorage.setItem('vb4_bg', JSON.stringify(bgs));
}

// Maps add-modal IDs to the free-tier cap key + a fn that counts current items
// for that key. Anything not listed here is unmetered.
const MODAL_CAPS = {
  addLinkModal:        { key: 'links',        count: S => (S.links || []).length },
  addAchievementModal: { key: 'achievements', count: S => (S.achievements || []).length },
  addTrackerModal:     { key: 'trackers',     count: S => (S.trackers || []).length },
  addShopModal:        { key: 'shopItems',    count: S => (S.shopItems || []).length },
  addHolidayModal:     { key: 'holidays',     count: S => (S.holidays || []).length },
  addHabitModal:       { key: 'habits',       count: S => (S.habits || []).length },
};

function Board({ userId, userEmail, onSignOut }) {
  const { S, update, loading, justMigrated, dismissMigrationBanner } = useVisionBoardState(userId);
  const { atLimit } = useTierLimits();
  const { isPro } = useSubscriptionContext();
  const [activeSection, setActiveSection] = useState('hub');
  const [openModal, setOpenModal] = useState(null);
  const [coinToast, setCoinToast] = useState({ message: '', type: '', visible: false });
  const [localDataExists, setLocalDataExists] = useState(() => hasLocalStorageData());
  const [noBanner, setNoBanner] = useState(() => localStorage.getItem('vb4_no_banner') === '1');
  const [backgrounds, setBackgrounds] = useState(() => loadBgs());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [legalPage, setLegalPage] = useState(null);

  // Native plugins (no-op on web)
  useCapacitor({
    onPushToken: token => console.info('[Push] Device token:', token),
    onPushMessage: msg => console.info('[Push] Message:', msg),
  });
  const bgInputRef = useRef(null);
  const coinToastTimer = useRef(null);

  // Apply stored colour scheme once state loads
  useEffect(() => {
    if (S.colorScheme) {
      const scheme = SCHEMES.find(s => s.id === S.colorScheme);
      if (scheme) applyScheme(scheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.colorScheme]);

  // Apply stored theme — Pro-gated. If isPro flips false we auto-revert
  // to cream via applyTheme's internal guard, so a lapsed subscriber
  // never gets stranded on the Pro-only surface.
  useEffect(() => {
    applyTheme(S.theme || 'cream', { isPro });
  }, [S.theme, isPro]);

  function showCoinToast(msg, isEarn, duration) {
    const type = isEarn ? 'earn' : (msg.includes('Need') ? 'error' : 'spend');
    // 30-day streak toast stays 4 s; default 2.6 s
    const ms = duration ?? (msg.includes('30 day streak') ? 4000 : 2600);
    if (isEarn) haptic('HEAVY');
    setCoinToast({ message: msg, type, visible: true });
    clearTimeout(coinToastTimer.current);
    coinToastTimer.current = setTimeout(() => setCoinToast(t => ({ ...t, visible: false })), ms);
  }

  function navigate(id) { setActiveSection(id); }
  function handleOpenModal(id) {
    // Intercept add-flows that have a free-tier cap. If the user is over,
    // open the paywall modal instead of the add modal.
    const baseId = typeof id === 'string' ? id.split(':')[0] : id;
    const cap = MODAL_CAPS[baseId];
    if (cap && atLimit(cap.key, cap.count(S))) {
      setOpenModal(`paywall:${cap.key}`);
      return;
    }
    setOpenModal(id);
  }
  function handleCloseModal() { setOpenModal(null); }

  // ── AI Coach verb dispatch ──
  // Called when a Pro user taps an action button inside a coach insight.
  function handleCoachAct(verb) {
    if (!verb) return;
    switch (verb.action) {
      case 'open-modal':
        if (verb.args?.modalId) handleOpenModal(verb.args.modalId);
        break;
      case 'navigate':
        if (verb.args?.section) navigate(verb.args.section);
        break;
      case 'split-achievement': {
        // Auto-creates 3 stepping-stone milestones and connects them
        // to the parent. Shown to the user via a toast so they know
        // something happened and can find them on the board.
        const id = verb.args?.id;
        if (!id) break;
        update(prev => {
          const parent = (prev.achievements || []).find(a => a.id === id);
          if (!parent) return prev;
          const baseCoins = Math.max(10, Math.floor((parent.coins || 60) / 4));
          const baseX = parent.x ?? 60;
          const baseY = parent.y ?? 60;
          const now = Date.now();
          const stones = [1, 2, 3].map(i => ({
            id: `a${now}-${i}`,
            name: `${parent.name} — Step ${i}`,
            desc: `Stepping stone ${i} of 3`,
            icon: '◆',
            x: baseX + i * 40,
            y: baseY + 180,
            completed: false,
            coins: baseCoins,
          }));
          const newConnections = stones.map(s => [s.id, parent.id]);
          return {
            ...prev,
            achievements: [...(prev.achievements || []), ...stones],
            connections: [...(prev.connections || []), ...newConnections],
          };
        });
        showCoinToast('Created 3 stepping-stone milestones', 'earn');
        navigate('achievements');
        break;
      }
      case 'add-habit':
        // For v1, just open the habit modal. Future enhancement: pre-fill
        // the suggested name via a `suggest` URL param read in Modals.jsx.
        handleOpenModal('addHabitModal');
        break;
      default:
        // Unknown verb — silently ignore so future LLM-suggested verbs don't crash
        console.warn('Unknown coach verb:', verb.action);
    }
  }

  function handleCancelConnect() {
    update(prev => ({ ...prev, connectingFrom: null }));
    document.getElementById('connectToast').style.display = 'none';
    document.querySelectorAll('.achievement-node').forEach(n => n.style.outline = '');
  }

  function handleClearLocalStorage() {
    clearLocalStorageData();
    setLocalDataExists(false);
    dismissMigrationBanner();
  }

  function handleNeverShowAgain() {
    localStorage.setItem('vb4_no_banner', '1');
    setNoBanner(true);
  }

  // Background changer
  function handleChangeBgClick() {
    bgInputRef.current?.click();
  }

  function handleBgFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const bgs = { ...backgrounds, [activeSection]: ev.target.result };
      setBackgrounds(bgs);
      saveBgs(bgs);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveBg() {
    const bgs = { ...backgrounds };
    delete bgs[activeSection];
    setBackgrounds(bgs);
    saveBgs(bgs);
  }

  // Escape key to cancel connect
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape' && S.connectingFrom) handleCancelConnect();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.connectingFrom]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    navigate,
    openModal: handleOpenModal,
    activeSection,
    openPalette: () => setPaletteOpen(true),
    openShortcuts: () => setShortcutsOpen(true),
    activeModalId: openModal,
    closeModal: handleCloseModal,
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '2px' }}>
        LOADING...
      </div>
    );
  }

  const showBanner = !noBanner && (justMigrated || localDataExists);
  const currentBg = backgrounds[activeSection];

  return (
    <>
      {/* Migration banner */}
      {showBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--em, #2a9e62)', color: '#fff',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          fontFamily: 'var(--sans)', fontSize: '13px', flexWrap: 'wrap',
        }}>
          <span>
            {justMigrated ? 'Your data was migrated to the cloud.' : 'Old local data found in this browser.'}
            {' '}Safe to clear now.
          </span>
          <button onClick={handleClearLocalStorage} style={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '6px', color: '#fff', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            Clear localStorage
          </button>
          <button onClick={handleNeverShowAgain} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', color: 'rgba(255,255,255,0.85)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>
            Never show again
          </button>
          <button onClick={() => { dismissMigrationBanner(); setLocalDataExists(false); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }} title="Dismiss">×</button>
        </div>
      )}

      {/* Hidden file input for background */}
      <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgFileChange} />

      {/* Custom background image for current section */}
      {currentBg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url(${currentBg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}

      {/* Overlays — only shown when a custom background is active */}
      <div id="hub-overlay" className={activeSection === 'hub' && currentBg ? 'visible' : ''}></div>
      <div id="shop-overlay" className={activeSection === 'shop' && currentBg ? 'visible' : ''}></div>

      {/* Sidebar nav */}
      <Nav activeSection={activeSection} onNavigate={navigate} onSignOut={onSignOut} />

      {/* Fixed page header */}
      <PageHeader
        activeSection={activeSection}
        coins={S.coins || 0}
        onOpenCoinHistory={() => handleOpenModal('coinHistoryModal')}
        profileName={S.profile?.name || ''}
        onChangeBg={handleChangeBgClick}
        onRemoveBg={currentBg ? handleRemoveBg : null}
        onSignOut={onSignOut}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* Main sections */}
      <AnimatePresence mode="wait">
        {activeSection === 'hub' && (
          <motion.div key="hub" {...pageMotion}>
            <HubSection S={S} update={update} active onOpenModal={handleOpenModal} onOpenWaitlist={() => handleOpenModal('waitlistModal')} onNavigateSettings={() => navigate('settings')} onNavigateTrack={() => navigate('track')} onShowCoinToast={showCoinToast} onCoachAct={handleCoachAct} />
          </motion.div>
        )}
        {activeSection === 'achievements' && (
          <motion.div key="achievements" {...pageMotion}>
            <AchievementsSection S={S} update={update} active onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'track' && (
          <motion.div key="track" {...pageMotion}>
            <TrackSection S={S} update={update} active onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} userId={userId} />
          </motion.div>
        )}
        {activeSection === 'shop' && (
          <motion.div key="shop" {...pageMotion}>
            <ShopSection S={S} update={update} active onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'holiday' && (
          <motion.div key="holiday" {...pageMotion}>
            <HolidaySection S={S} update={update} active onOpenModal={handleOpenModal} />
          </motion.div>
        )}
        {activeSection === 'habits' && (
          <motion.div key="habits" {...pageMotion}>
            <HabitsSection S={S} update={update} active onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'settings' && (
          <motion.div key="settings" {...pageMotion}>
            <SettingsSection S={S} update={update} active userId={userId} onOpenLegal={setLegalPage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modals
        openModal={openModal}
        S={S}
        update={update}
        onClose={handleCloseModal}
        onOpen={handleOpenModal}
        onShowCoinToast={showCoinToast}
        userId={userId}
        userEmail={userEmail}
      />

      <PaywallModal
        openId={openModal}
        onClose={handleCloseModal}
        onUpgrade={() => { handleCloseModal(); handleOpenModal('waitlistModal'); }}
      />

      <ConnectToast onCancel={handleCancelConnect} />
      <HubFooter visible={activeSection === 'hub'} onOpenLegal={setLegalPage} />
      <CoinToast message={coinToast.message} type={coinToast.type} visible={coinToast.visible} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        navigate={navigate}
        openModal={handleOpenModal}
        S={S}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CookieBanner onOpenLegal={setLegalPage} />
      <InstallPrompt />
      {legalPage && <LegalPage page={legalPage} onClose={() => setLegalPage(null)} />}
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [legalPage, setLegalPage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If user logged in without "remember me", sign out on next page load
      if (session && localStorage.getItem('vb4_remember') === '0') {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(session);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // Legal page overlay — accessible before login
  if (legalPage) {
    return <LegalPage page={legalPage} onClose={() => setLegalPage(null)} />;
  }

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '2px' }}>
        LOADING...
      </div>
    );
  }

  if (!session) return <AuthScreen onOpenLegal={setLegalPage} />;
  return (
    <SubscriptionProvider userId={session.user.id}>
      <Board userId={session.user.id} userEmail={session.user.email} onSignOut={handleSignOut} />
    </SubscriptionProvider>
  );
}
