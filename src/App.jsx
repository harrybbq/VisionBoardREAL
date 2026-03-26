import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useVisionBoardState, hasLocalStorageData, clearLocalStorageData } from './hooks/useVisionBoardState';
import AuthScreen from './components/AuthScreen';
import Nav from './components/Nav';
import PageHeader from './components/PageHeader';
import SpotifyBar from './components/SpotifyBar';
import HubSection from './components/HubSection';
import AchievementsSection from './components/AchievementsSection';
import TrackSection from './components/TrackSection';
import ShopSection from './components/ShopSection';
import HolidaySection from './components/HolidaySection';
import HabitsSection from './components/HabitsSection';
import Modals from './components/Modals';
import HubFooter from './components/HubFooter';
import CoinToast from './components/CoinToast';
import ConnectToast from './components/ConnectToast';

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

function Board({ userId, onSignOut }) {
  const { S, update, loading, justMigrated, dismissMigrationBanner } = useVisionBoardState(userId);
  const [activeSection, setActiveSection] = useState('hub');
  const [openModal, setOpenModal] = useState(null);
  const [coinToast, setCoinToast] = useState({ message: '', type: '', visible: false });
  const [localDataExists, setLocalDataExists] = useState(() => hasLocalStorageData());
  const [noBanner, setNoBanner] = useState(() => localStorage.getItem('vb4_no_banner') === '1');
  const [backgrounds, setBackgrounds] = useState(() => loadBgs());
  const bgInputRef = useRef(null);
  const coinToastTimer = useRef(null);

  function showCoinToast(msg, isEarn) {
    const type = isEarn ? 'earn' : (msg.includes('Need') ? 'error' : 'spend');
    setCoinToast({ message: msg, type, visible: true });
    clearTimeout(coinToastTimer.current);
    coinToastTimer.current = setTimeout(() => setCoinToast(t => ({ ...t, visible: false })), 2600);
  }

  function navigate(id) { setActiveSection(id); }
  function handleOpenModal(id) { setOpenModal(id); }
  function handleCloseModal() { setOpenModal(null); }

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

  // Nav hover: shift spotify bar
  useEffect(() => {
    const nav = document.querySelector('nav');
    const bar = document.getElementById('spotifyBar');
    if (!nav || !bar) return;
    const onEnter = () => { bar.style.left = '200px'; };
    const onLeave = () => { bar.style.left = '56px'; };
    nav.addEventListener('mouseenter', onEnter);
    nav.addEventListener('mouseleave', onLeave);
    return () => {
      nav.removeEventListener('mouseenter', onEnter);
      nav.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Escape key to cancel connect
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape' && S.connectingFrom) handleCancelConnect();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.connectingFrom]);

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

      {/* Spotify / Last.fm bar */}
      <SpotifyBar
        visible={activeSection === 'hub'}
        username={S.lastfm?.username || ''}
        onSetUsername={name => update(prev => ({ ...prev, lastfm: { ...prev.lastfm, username: name } }))}
      />

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
      />

      {/* Main sections */}
      <AnimatePresence mode="wait">
        {activeSection === 'hub' && (
          <motion.div key="hub" {...pageMotion}>
            <HubSection S={S} update={update} active={true} onOpenModal={handleOpenModal} />
          </motion.div>
        )}
        {activeSection === 'achievements' && (
          <motion.div key="achievements" {...pageMotion}>
            <AchievementsSection S={S} update={update} active={true} onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'track' && (
          <motion.div key="track" {...pageMotion}>
            <TrackSection S={S} update={update} active={true} onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'shop' && (
          <motion.div key="shop" {...pageMotion}>
            <ShopSection S={S} update={update} active={true} onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
          </motion.div>
        )}
        {activeSection === 'holiday' && (
          <motion.div key="holiday" {...pageMotion}>
            <HolidaySection S={S} update={update} active={true} onOpenModal={handleOpenModal} />
          </motion.div>
        )}
        {activeSection === 'habits' && (
          <motion.div key="habits" {...pageMotion}>
            <HabitsSection S={S} update={update} active={true} onOpenModal={handleOpenModal} onShowCoinToast={showCoinToast} />
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
      />

      <ConnectToast onCancel={handleCancelConnect} />
      <HubFooter visible={activeSection === 'hub'} />
      <CoinToast message={coinToast.message} type={coinToast.type} visible={coinToast.visible} />
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

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

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '2px' }}>
        LOADING...
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <Board userId={session.user.id} onSignOut={handleSignOut} />;
}
