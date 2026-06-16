"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Thread (SpaceLoom)
   Render del hilo de mensajes (user/assistant) con estilos del mock.
   Estados loading/error explícitos. Muestra indicador de "escribiendo".
   ════════════════════════════════════════════════════════════════════ */

import type { MessageOut } from "@/services/types";
import type { LoadStatus } from "@/components/shell/ShellProvider";

interface ThreadProps {
  messages: MessageOut[];
  status: LoadStatus;
  pending: boolean;
  agentLabel: string;
  errorMsg: string | null;
  onRetry: () => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Thread({
  messages,
  status,
  pending,
  agentLabel,
  errorMsg,
  onRetry,
}: ThreadProps) {
  if (status === "loading") {
    return (
      <div className="dataState">
        <span className="dataSpin" /> Cargando mensajes…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="dataState err">
        {errorMsg ?? "Error al cargar los mensajes."}{" "}
        <span
          role="button"
          tabIndex={0}
          style={{ textDecoration: "underline", cursor: "pointer" }}
          onClick={onRetry}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRetry();
          }}
        >
          Reintentar
        </span>
      </div>
    );
  }

  return (
    <>
      {messages.map((m) => {
        if (m.role === "user") {
          return (
            <div className="qmsg me" key={m.id}>
              <div className="who">Alvaro · {fmtTime(m.created_at)}</div>
              <div className="bub">{m.content}</div>
            </div>
          );
        }
        // assistant / system
        return (
          <div className="qmsg ai" key={m.id}>
            <div className="who">
              <span style={{ color: "var(--coral)" }}>{agentLabel}</span>
            </div>
            <div className="bub">{m.content}</div>
            <div className="msgmeta">
              {m.model_tier ? (
                <span>
                  <b>modelo:</b> {m.model_tier}
                </span>
              ) : null}
              <span>
                <b>grounding:</b>{" "}
                {m.is_grounded ? "trazado" : "placeholder"}
              </span>
            </div>
          </div>
        );
      })}

      {pending ? (
        <div className="qmsg ai">
          <div className="who">
            <span style={{ color: "var(--coral)" }}>{agentLabel}</span>
          </div>
          <div className="bub">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
