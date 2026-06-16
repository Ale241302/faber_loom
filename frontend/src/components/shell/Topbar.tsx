"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Topbar
   Port 1:1 del mock: logo Faber*loom, cmdk, budgetChip, toolset,
   ThemeSwitcher y toggles de rails (izq/der).
   ════════════════════════════════════════════════════════════════════ */

import { useShell } from "@/components/shell/ShellProvider";
import ThemeSwitcher from "@/components/shell/ThemeSwitcher";

export default function Topbar() {
  const { toggleRailLeft, toggleRailRight } = useShell();

  return (
    <div className="topbar">
      <button
        className="ceja"
        onClick={toggleRailLeft}
        title="Panel izquierdo ([)"
        aria-label="Alternar panel izquierdo"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1.5" y="2.5" width="13" height="11" rx="2.5" />
          <line x1="6" y1="2.5" x2="6" y2="13.5" />
        </svg>
      </button>

      <div className="logo">
        <div className="mark">F</div>
        <div>
          <span className="name">
            Faber<span style={{ color: "var(--coral)" }}>*</span>loom
          </span>
          <small>tenant · MWT</small>
        </div>
      </div>

      <div
        className="cmdk"
        tabIndex={0}
        role="button"
        aria-label="Buscar o ejecutar"
      >
        <span>&#8981;</span>{" "}
        <span className="cmdk-label">Buscar o ejecutar…</span>{" "}
        <kbd>&#8984;K</kbd>
      </div>

      <div className="topRight">
        <div className="budgetChip" title="Presupuesto del tenant">
          <div className="bbar">
            <div className="bfill" />
          </div>
          <span className="bnum">$12.40 / $45</span>
        </div>
        <button
          className="ceja"
          onClick={toggleRailRight}
          title="Toolset"
          aria-label="Abrir toolset"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="2" y="2" width="5" height="5" rx="1.2" />
            <rect x="9" y="2" width="5" height="5" rx="1.2" />
            <rect x="2" y="9" width="5" height="5" rx="1.2" />
            <rect x="9" y="9" width="5" height="5" rx="1.2" />
          </svg>
        </button>
        <ThemeSwitcher />
        <button
          className="ceja"
          onClick={toggleRailRight}
          title="Panel derecho (])"
          aria-label="Alternar panel derecho"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="1.5" y="2.5" width="13" height="11" rx="2.5" />
            <line x1="10" y1="2.5" x2="10" y2="13.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
