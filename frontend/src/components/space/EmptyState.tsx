"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · EmptyState (SpaceLoom)
   seMark "F" + título + párrafo + 4 seChips (dots de color por token)
   + línea de seguridad HITL con candado. Port 1:1 del mock.
   ════════════════════════════════════════════════════════════════════ */

import { useRouter, useParams } from "next/navigation";
import { useShell } from "@/components/shell/ShellProvider";
import type { WorkspaceColorToken } from "@/services/types";

interface ChipDef {
  token: WorkspaceColorToken | "slate";
  title: string;
  sub: string;
  /** id de workspace al que apunta, si aplica */
  contextHint?: string;
}

const CHIPS: ReadonlyArray<ChipDef> = [
  {
    token: "coral",
    title: "Cotizar RFQ · Sondel SA",
    sub: "500 pares 50S5BR · DDP",
    contextHint: "Sondel SA",
  },
  {
    token: "amber",
    title: "Revisar cobranza F-1102",
    sub: "interna · 31d vencida",
    contextHint: "Sondel SA",
  },
  {
    token: "sage",
    title: "Seguimiento · Rana Walk",
    sub: "reposición FBA Q3",
    contextHint: "Rana Walk",
  },
  {
    token: "slate",
    title: "Ver inbox",
    sub: "12 sin procesar",
  },
];

const TOKEN_VAR: Record<string, string> = {
  coral: "var(--coral)",
  amber: "var(--amber)",
  sage: "var(--sage)",
  slate: "var(--slate)",
  vino: "var(--vino)",
};

export default function EmptyState() {
  const { workspaces, setContextById } = useShell();
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang =
    typeof params.lang === "string" && params.lang.length > 0
      ? params.lang
      : "es";

  function onChip(chip: ChipDef): void {
    if (chip.contextHint) {
      const ws = workspaces.find((w) => w.name === chip.contextHint);
      if (ws) {
        setContextById(ws.id);
      }
      router.push(`/${lang}/space`);
    } else {
      router.push(`/${lang}/inbox`);
    }
  }

  return (
    <div className="spaceEmpty" id="welcomeMsg">
      <div className="seMark">F</div>
      <div>
        <h3>SpaceLoom · chat universal</h3>
        <p>
          Empezá por un pendiente real o escribí abajo. Todo se ancla al
          contexto del workspace y nada se envía sin tu aprobación.
        </p>
      </div>
      <div className="seChips">
        {CHIPS.map((chip) => (
          <div
            key={chip.title}
            className="seChip"
            onClick={() => onChip(chip)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") onChip(chip);
            }}
          >
            <span
              className="seDot"
              style={{ background: TOKEN_VAR[chip.token] ?? "var(--text-muted)" }}
            />
            <span>
              <b>{chip.title}</b>
              <small>{chip.sub}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="seSafe">
        <span className="lk">&#128274;</span> HITL obligatorio · ningún correo
        sale sin tu doble confirmación
      </div>
    </div>
  );
}
