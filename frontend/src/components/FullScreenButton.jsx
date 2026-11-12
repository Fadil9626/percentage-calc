// Full screen: the whole system fills the screen. Esc, or the button again, leaves it.
// Hidden on browsers that can't do it (an iPhone, for one).
import { useEffect, useState } from "react";

const isFull = () => !!(typeof document !== "undefined" && (document.fullscreenElement || document.webkitFullscreenElement));
const ICON = {
  enter: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
  leave: ["M8 3v3a2 2 0 0 1-2 2H3", "M21 8h-3a2 2 0 0 1-2-2V3", "M3 16h3a2 2 0 0 1 2 2v3", "M16 21v-3a2 2 0 0 1 2-2h3"],
};

export default function FullScreenButton({ className = "", size = 18, label = false, style }) {
  const el = typeof document !== "undefined" ? document.documentElement : null;
  const can = !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
  const [full, setFull] = useState(isFull);
  useEffect(() => {
    const on = () => setFull(isFull());
    document.addEventListener("fullscreenchange", on); document.addEventListener("webkitfullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); document.removeEventListener("webkitfullscreenchange", on); };
  }, []);
  if (!can) return null;
  const toggle = () => {
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (p && p.catch) p.catch(() => {}); }
  };
  const name = full ? "Leave full screen" : "Full screen";
  return (
    <button type="button" onClick={toggle} className={className} style={style}
      title={full ? "Leave full screen (Esc)" : "Full screen"} aria-label={name} aria-pressed={full}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
        {ICON[full ? "leave" : "enter"].map((d) => <path key={d} d={d} />)}
      </svg>
      {label && <span>{name}</span>}
    </button>
  );
}
