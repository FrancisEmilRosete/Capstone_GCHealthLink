/**
 * HEARTBEAT ICON
 * ──────────────────────────────────────────────────────────────
 * The app logo icon displayed at the top of the login card.
 * It is an SVG of a heartbeat / pulse line (medical symbol).
 *
 * Usage:
 *   <HeartbeatIcon />
 */

export default function HeartbeatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-7 h-7"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
