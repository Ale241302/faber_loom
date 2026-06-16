"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Composer (SpaceLoom)
   textarea (placeholder del mock) + pedal Eco/Balanceado/Sport+ +
   indicador @cotizador activo + botón enviar. Port 1:1 del mock.
   ════════════════════════════════════════════════════════════════════ */

import { useRef, useState } from "react";
import type { ModelTier } from "@/services/types";

interface PedalDef {
  tier: ModelTier;
  label: string;
  /** etiqueta completa para el modelpill del ctxstrip */
  modelLabel: string;
}

const PEDALS: ReadonlyArray<PedalDef> = [
  { tier: "eco", label: "Eco", modelLabel: "Eco · haiku" },
  { tier: "balanced", label: "Balanceado", modelLabel: "Balanceado · sonnet" },
  { tier: "sport", label: "Sport+", modelLabel: "Sport+ · opus" },
];

interface ComposerProps {
  tier: ModelTier;
  onTierChange: (tier: ModelTier, modelLabel: string) => void;
  onSend: (text: string) => void;
  sending: boolean;
}

export default function Composer({
  tier,
  onTierChange,
  onSend,
  sending,
}: ComposerProps) {
  const [value, setValue] = useState<string>("");
  const [focused, setFocused] = useState<boolean>(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const ready = value.trim().length > 0 && !sending;

  function autosize(): void {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  function doSend(): void {
    const txt = value.trim();
    if (!txt || sending) return;
    onSend(txt);
    setValue("");
    const ta = taRef.current;
    if (ta) ta.style.height = "24px";
  }

  return (
    <div className="composer">
      <div className={`box${focused ? " focus" : ""}`} id="box">
        <textarea
          ref={taRef}
          id="ta"
          rows={1}
          placeholder="Iterá, investigá, o pedí a un agente… (@agente para invocar)"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autosize();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              doSend();
            }
          }}
        />
        <div className="row">
          <div className="pedal">
            {PEDALS.map((p) => (
              <button
                key={p.tier}
                className={tier === p.tier ? "on" : undefined}
                onClick={() => onTierChange(p.tier, p.modelLabel)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span>
            <b style={{ color: "var(--coral)" }}>@cotizador</b> activo
          </span>
          <button
            className={`send-btn${ready ? " ready" : ""}`}
            id="sendBtn"
            onClick={doSend}
            disabled={!ready}
            aria-label="Enviar mensaje"
          >
            &#8593;
          </button>
        </div>
      </div>
      <div className="hintc">
        Chat universal · cada workspace lo hereda · toolset en el panel derecho
      </div>
    </div>
  );
}
