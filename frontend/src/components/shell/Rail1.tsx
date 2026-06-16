"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Rail1 (izquierda)
   modebar (Operar/Aprender/Admin) + acordeones de navegación + userfoot.
   En Operar: SpaceLoom, Entrada (Inbox/WorkLoom), My Workspaces,
   Shared Workspaces, Historial. Los workspaces y el historial se pueblan
   desde la API (estados loading/error obligatorios).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useShell,
  COLOR_VAR,
  type ShellMode,
} from "@/components/shell/ShellProvider";
import type { WorkspaceOut } from "@/services/types";

interface AccordionState {
  spaceloom: boolean;
  entrada: boolean;
  myws: boolean;
  shared: boolean;
  historial: boolean;
}

export default function Rail1() {
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang =
    typeof params.lang === "string" && params.lang.length > 0
      ? params.lang
      : "es";

  const {
    mode,
    setMode,
    railLeftHidden,
    activeContext,
    setContextById,
    workspaces,
    conversations,
    workspacesStatus,
    conversationsStatus,
    reloadData,
  } = useShell();

  const [acc, setAcc] = useState<AccordionState>({
    spaceloom: true,
    entrada: true,
    myws: false,
    shared: false,
    historial: false,
  });

  function toggleAcc(key: keyof AccordionState): void {
    setAcc((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function navTo(view: string): void {
    router.push(`/${lang}/${view}`);
  }

  function pickContext(ws: WorkspaceOut): void {
    setContextById(ws.id);
    router.push(`/${lang}/space`);
  }

  const myWorkspaces = workspaces.filter((w) => w.kind !== "shared");
  const sharedWorkspaces = workspaces.filter((w) => w.kind === "shared");

  function renderWsList(list: WorkspaceOut[], status: typeof workspacesStatus) {
    if (status === "loading") {
      return (
        <div className="dataState">
          <span className="dataSpin" /> Cargando…
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="dataState err">
          Error al cargar.{" "}
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={reloadData}
            onKeyDown={(e) => {
              if (e.key === "Enter") reloadData();
            }}
          >
            Reintentar
          </span>
        </div>
      );
    }
    if (list.length === 0) {
      return <div className="dataState">Sin workspaces</div>;
    }
    return list.map((ws) => (
      <div
        key={ws.id}
        className={`it${activeContext.id === ws.id ? " active" : ""}`}
        onClick={() => pickContext(ws)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") pickContext(ws);
        }}
      >
        <span
          className="dot"
          style={{ background: COLOR_VAR[ws.color_token] ?? "var(--text-muted)" }}
        />
        {ws.name}
      </div>
    ));
  }

  function renderHistorial() {
    if (conversationsStatus === "loading") {
      return (
        <div className="dataState">
          <span className="dataSpin" /> Cargando…
        </div>
      );
    }
    if (conversationsStatus === "error") {
      return (
        <div className="dataState err">
          Error al cargar.{" "}
          <span
            role="button"
            tabIndex={0}
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={reloadData}
            onKeyDown={(e) => {
              if (e.key === "Enter") reloadData();
            }}
          >
            Reintentar
          </span>
        </div>
      );
    }
    if (conversations.length === 0) {
      return <div className="dataState">Sin historial</div>;
    }
    return conversations.map((c) => {
      const ws = workspaces.find((w) => w.id === c.workspace_id);
      const color = ws
        ? COLOR_VAR[ws.color_token] ?? "var(--text-muted)"
        : "var(--text-muted)";
      return (
        <div
          key={c.id}
          className="it"
          onClick={() => navTo("space")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") navTo("space");
          }}
        >
          <span className="dot" style={{ background: color }} />
          {c.title}
        </div>
      );
    });
  }

  const modes: ReadonlyArray<{ id: ShellMode; label: string; ico: string }> = [
    { id: "operar", label: "Operar", ico: "○" },
    { id: "aprender", label: "Aprender", ico: "◙" },
    { id: "admin", label: "Admin", ico: "⚙" },
  ];

  return (
    <aside className={`rail1${railLeftHidden ? " hidden" : ""}`} id="rail1">
      <div className="navwrap">
        <div className="modebar-2" id="modebar">
          {modes.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "on" : undefined}
              data-m={m.id}
              onClick={() => setMode(m.id)}
            >
              <span className="ico">{m.ico}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* ░░ MODO OPERAR ░░ */}
        <div className={`navmode${mode === "operar" ? " on" : ""}`} id="nm-operar">
          <div className="acc">
            <div className="accHead" onClick={() => toggleAcc("spaceloom")}>
              <span className={`chev${acc.spaceloom ? " rot" : ""}`}>&#9656;</span>
              SpaceLoom<span className="cnt">1</span>
            </div>
            <div className={`accBody${acc.spaceloom ? " open" : ""}`}>
              <div
                className="it active"
                data-v="space"
                onClick={() => navTo("space")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navTo("space");
                }}
              >
                <span className="ico">&#10047;</span>SpaceLoom
              </div>
            </div>
          </div>

          <div className="acc">
            <div className="accHead" onClick={() => toggleAcc("entrada")}>
              <span className={`chev${acc.entrada ? " rot" : ""}`}>&#9656;</span>
              Entrada<span className="cnt">2</span>
            </div>
            <div className={`accBody${acc.entrada ? " open" : ""}`}>
              <div
                className="it"
                data-v="inbox"
                onClick={() => navTo("inbox")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navTo("inbox");
                }}
              >
                <span className="ico">&#9993;</span>Inbox
                <span className="b op">12</span>
              </div>
              <div
                className="it"
                data-v="workloom"
                onClick={() => navTo("workloom")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navTo("workloom");
                }}
              >
                <span className="ico">&#9707;</span>WorkLoom
                <span className="b crit">1</span>
              </div>
            </div>
          </div>

          <div className="acc">
            <div className="accHead" onClick={() => toggleAcc("myws")}>
              <span className={`chev${acc.myws ? " rot" : ""}`}>&#9656;</span>
              My Workspaces
              <span className="cnt">{myWorkspaces.length}</span>
            </div>
            <div className={`accBody${acc.myws ? " open" : ""}`}>
              {renderWsList(myWorkspaces, workspacesStatus)}
            </div>
          </div>

          <div className="acc">
            <div className="accHead" onClick={() => toggleAcc("shared")}>
              <span className={`chev${acc.shared ? " rot" : ""}`}>&#9656;</span>
              Shared Workspaces
              <span className="cnt">{sharedWorkspaces.length}</span>
            </div>
            <div className={`accBody${acc.shared ? " open" : ""}`}>
              {renderWsList(sharedWorkspaces, workspacesStatus)}
            </div>
          </div>

          <div className="acc">
            <div className="accHead" onClick={() => toggleAcc("historial")}>
              <span className={`chev${acc.historial ? " rot" : ""}`}>&#9656;</span>
              Historial
              <span className="cnt">{conversations.length}</span>
            </div>
            <div className={`accBody${acc.historial ? " open" : ""}`}>
              {renderHistorial()}
            </div>
          </div>
        </div>

        {/* ░░ MODO APRENDER ░░ (placeholder) */}
        <div className={`navmode${mode === "aprender" ? " on" : ""}`} id="nm-aprender">
          <div className="acc">
            <div className="accHead">
              <span className="chev rot">&#9656;</span>Cola
              <span className="cnt">5</span>
            </div>
            <div className="accBody open">
              <div
                className="it"
                onClick={() => navTo("aprender")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navTo("aprender");
                }}
              >
                <span className="ico">&#9636;</span>StackLoom
                <span className="b op">5</span>
              </div>
            </div>
          </div>
        </div>

        {/* ░░ MODO ADMIN ░░ (placeholder) */}
        <div className={`navmode${mode === "admin" ? " on" : ""}`} id="nm-admin">
          <div className="acc">
            <div className="accHead">
              <span className="chev rot">&#9656;</span>Tenant
              <span className="cnt">4</span>
            </div>
            <div className="accBody open">
              <div
                className="it"
                onClick={() => navTo("routing")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navTo("routing");
                }}
              >
                <span className="ico">&#127899;</span>IA: modelos y ruteo
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="userfoot">
        <div className="avatar">AA</div>
        <div style={{ fontSize: "12px", lineHeight: 1.2 }}>
          Alvaro
          <span
            style={{
              color: "var(--text-muted)",
              display: "block",
              fontSize: "10px",
            }}
          >
            OWNER · MWT
          </span>
        </div>
      </div>
    </aside>
  );
}
