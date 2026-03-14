const SECTION_LABELS = {
  hub: 'Hub',
  achievements: 'Achievements',
  track: 'Track',
  shop: 'Shopping',
  holiday: 'Holiday',
};

export default function PageHeader({ activeSection, coins, onOpenCoinHistory }) {
  return (
    <div id="pageHeader">
      <span id="pageHeader-title">Vision Board</span>
      <span id="pageHeader-sub">// my space</span>
      <span id="pageHeader-section">{SECTION_LABELS[activeSection] || ''}</span>
      <div id="coinWallet" onClick={onOpenCoinHistory} title="Your coins — click for history">
        <span className="cw-icon">⬡</span>
        <div>
          <div className="cw-amount" id="coinAmount">{coins}</div>
          <div className="cw-label">Coins</div>
        </div>
      </div>
    </div>
  );
}
