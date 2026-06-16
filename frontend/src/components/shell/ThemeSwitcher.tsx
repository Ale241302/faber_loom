"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · ThemeSwitcher
   Popover con los 7 temas y sus swatches (port 1:1 del mock).
   Cambia document.documentElement.dataset.theme vía ShellProvider.
   Los hex de los swatches son sólo muestras de UI del propio selector
   (igual que en el mock); el resto de la app usa var() exclusivamente.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { useShell, type ThemeId } from "@/components/shell/ShellProvider";

interface ThemeDef {
  id: ThemeId;
  label: string;
  bg: string;
  acc: string;
}

const DARK_THEMES: ReadonlyArray<ThemeDef> = [
  { id: "warm", label: "Faber Warm", bg: "#1C1A17", acc: "#E8896A" },
  { id: "slate", label: "Slate Pro", bg: "#1B1F26", acc: "#5E9CE8" },
  { id: "mono", label: "Mono Contrast", bg: "#0B0B0C", acc: "#FF6A3D" },
  { id: "indigo", label: "Indigo Night", bg: "#1E1B2D", acc: "#B07CF0" },
];

const LIGHT_THEMES: ReadonlyArray<ThemeDef> = [
  { id: "paper", label: "Paper (cálido)", bg: "#F1EBE0", acc: "#CF6238" },
  { id: "cloud", label: "Cloud (neutro)", bg: "#EBEEF2", acc: "#DE6F49" },
  { id: "mist", label: "Mist (azulado)", bg: "#E7EDF4", acc: "#3B7AD0" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useShell();
  const [open, setOpen] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent): void {
      if (
        rootRef.current &&
        e.target instanceof Node &&
        !rootRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  function pick(id: ThemeId): void {
    setTheme(id);
    setOpen(false);
  }

  function renderOpt(t: ThemeDef) {
    return (
      <div
        key={t.id}
        className={`themeOpt${theme === t.id ? " on" : ""}`}
        data-theme={t.id}
        onClick={() => pick(t.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick(t.id);
          }
        }}
      >
        <span className="sw" style={{ background: t.bg }}>
          <span className="acc" style={{ background: t.acc }} />
        </span>
        <span className="tn">{t.label}</span>
        <span className="chk">&#10003;</span>
      </div>
    );
  }

  return (
    <div className="themeBtn" ref={rootRef}>
      <button
        className="ceja"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Estilo visual"
        aria-label="Cambiar estilo"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2v12M2.7 5h10.6M2.7 11h10.6" />
        </svg>
      </button>
      <div className={`themePop${open ? " open" : ""}`} id="themePop">
        <div className="tph">Oscuros</div>
        {DARK_THEMES.map(renderOpt)}
        <div className="tph" style={{ marginTop: "4px" }}>
          Claros
        </div>
        {LIGHT_THEMES.map(renderOpt)}
      </div>
    </div>
  );
}
