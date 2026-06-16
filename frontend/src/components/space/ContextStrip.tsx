"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · ContextStrip (SpaceLoom)
   dot + nombre de contexto + sub + tipo + agentpill + modelpill.
   El modelpill refleja el pedal activo del composer.
   ════════════════════════════════════════════════════════════════════ */

import { useShell } from "@/components/shell/ShellProvider";

interface ContextStripProps {
  agentHandle: string;
  modelLabel: string;
}

export default function ContextStrip({
  agentHandle,
  modelLabel,
}: ContextStripProps) {
  const { activeContext } = useShell();

  return (
    <div className="ctxstrip" id="ctxstrip">
      <span
        className="ctxdot"
        id="ctxDot"
        style={{ background: activeContext.color }}
      />
      <div>
        <div className="ctxname" id="ctxName">
          {activeContext.name}
        </div>
        <div className="ctxsub" id="ctxSub">
          {activeContext.sub}
        </div>
      </div>
      <span className="ctxtype" id="ctxType">
        {activeContext.type}
      </span>
      <div className="ctxmeta">
        <span className="agentpill">
          <span>&#9670;</span>
          <span id="ctxAgent">{agentHandle}</span>
        </span>
        <span className="modelpill" id="ctxModel">
          <span>&#9707;</span>
          {modelLabel}
        </span>
      </div>
    </div>
  );
}
