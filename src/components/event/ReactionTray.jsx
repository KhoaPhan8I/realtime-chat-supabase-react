const EMOJIS = ["❤️", "😂", "😮", "🔥", "🥰"];

export default function ReactionTray({ mediaId, counts, onReact }) {
  if (!mediaId) return null;

  return (
    <div className="locket-reaction-tray">
      {EMOJIS.map((emoji) => (
        <button key={emoji} className="locket-reaction-chip" onClick={() => onReact(emoji)} type="button">
          <span>{emoji}</span>
          {counts[emoji] ? <small>{counts[emoji]}</small> : null}
        </button>
      ))}
    </div>
  );
}
