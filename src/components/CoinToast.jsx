export default function CoinToast({ message, type, visible }) {
  // type: 'earn' | 'spend' | 'error'
  return (
    <div id="coinToast" className={`${type || ''} ${visible ? 'show' : ''}`}>
      {message}
    </div>
  );
}
