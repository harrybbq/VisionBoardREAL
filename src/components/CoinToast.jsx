export default function CoinToast({ message, type, visible }) {
  // type: 'earn' | 'spend' | 'error'
  return (
    <div id="coinToast" className={`${type || ''} ${visible ? 'show' : ''}`}>
      {type === 'earn' && <span className="coin-toast-icon" aria-hidden="true">⬡</span>}
      {message}
    </div>
  );
}
