import { useState, useEffect, useCallback, useRef } from 'react';
import { useVisionBoardState } from './hooks/useVisionBoardState';
import Nav from './components/Nav';
import PageHeader from './components/PageHeader';
import SpotifyBar from './components/SpotifyBar';
import HubSection from './components/HubSection';
import AchievementsSection from './components/AchievementsSection';
import TrackSection from './components/TrackSection';
import ShopSection from './components/ShopSection';
import HolidaySection from './components/HolidaySection';
import Modals from './components/Modals';
import HubFooter from './components/HubFooter';
import CoinToast from './components/CoinToast';
import ConnectToast from './components/ConnectToast';

export default function App() {
  const { S, update } = useVisionBoardState();
  const [activeSection, setActiveSection] = useState('hub');
  const [openModal, setOpenModal] = useState(null);
  const [coinToast, setCoinToast] = useState({ message: '', type: '', visible: false });
  const coinToastTimer = useRef(null);

  function showCoinToast(msg, isEarn) {
    const type = isEarn ? 'earn' : (msg.includes('Need') ? 'error' : 'spend');
    setCoinToast({ message: msg, type, visible: true });
    clearTimeout(coinToastTimer.current);
    coinToastTimer.current = setTimeout(() => setCoinToast(t => ({ ...t, visible: false })), 2600);
  }

  function navigate(id) {
    setActiveSection(id);
  }

  function handleOpenModal(id) {
    setOpenModal(id);
  }

  function handleCloseModal(id) {
    setOpenModal(null);
  }

  function handleCancelConnect() {
    update(prev => ({ ...prev, connectingFrom: null }));
    document.getElementById('connectToast').style.display = 'none';
    document.querySelectorAll('.achievement-node').forEach(n => n.style.outline = '');
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

  return (
    <>
      {/* Background layers */}
      <div id="hub-bg" className={activeSection === 'hub' ? 'visible' : ''}></div>
      <div id="hub-overlay" className={activeSection === 'hub' ? 'visible' : ''}></div>
      <div id="shop-bg" className={activeSection === 'shop' ? 'visible' : ''}></div>
      <div id="shop-overlay" className={activeSection === 'shop' ? 'visible' : ''}></div>
      <div id="achievementsBg" className={activeSection === 'achievements' ? 'visible' : ''}></div>

      {/* Spotify / Last.fm bar */}
      <SpotifyBar
        visible={activeSection === 'hub'}
        lastfm={S.lastfm}
        onUpdate={info => update(prev => ({ ...prev, lastfm: { ...prev.lastfm, ...info } }))}
      />

      {/* Sidebar nav */}
      <Nav activeSection={activeSection} onNavigate={navigate} />

      {/* Fixed page header */}
      <PageHeader
        activeSection={activeSection}
        coins={S.coins || 0}
        onOpenCoinHistory={() => handleOpenModal('coinHistoryModal')}
      />

      {/* Main sections */}
      <HubSection
        S={S}
        update={update}
        active={activeSection === 'hub'}
        onOpenModal={handleOpenModal}
      />

      <AchievementsSection
        S={S}
        update={update}
        active={activeSection === 'achievements'}
        onOpenModal={handleOpenModal}
        onShowCoinToast={showCoinToast}
      />

      <TrackSection
        S={S}
        update={update}
        active={activeSection === 'track'}
        onOpenModal={handleOpenModal}
        onShowCoinToast={showCoinToast}
      />

      <ShopSection
        S={S}
        update={update}
        active={activeSection === 'shop'}
        onOpenModal={handleOpenModal}
        onShowCoinToast={showCoinToast}
      />

      <HolidaySection
        S={S}
        update={update}
        active={activeSection === 'holiday'}
        onOpenModal={handleOpenModal}
      />

      {/* Modals */}
      <Modals
        openModal={openModal}
        S={S}
        update={update}
        onClose={handleCloseModal}
        onOpen={handleOpenModal}
        onShowCoinToast={showCoinToast}
      />

      {/* Connect toast (achievements) */}
      <ConnectToast onCancel={handleCancelConnect} />

      {/* Hub year countdown footer */}
      <HubFooter visible={activeSection === 'hub'} />

      {/* Coin toast notification */}
      <CoinToast message={coinToast.message} type={coinToast.type} visible={coinToast.visible} />
    </>
  );
}
