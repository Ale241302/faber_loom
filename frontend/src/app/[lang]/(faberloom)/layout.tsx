/* ════════════════════════════════════════════════════════════════════
   FaberLoom · layout del grupo (faberloom)
   Renderiza el Shell: topbar + rail1 + canvas con {children}.
   Provee el ShellProvider (tema/modo/rails/contexto/datos).
   ════════════════════════════════════════════════════════════════════ */

import { ShellProvider } from "@/components/shell/ShellProvider";
import Topbar from "@/components/shell/Topbar";
import Rail1 from "@/components/shell/Rail1";

export default function FaberLoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShellProvider>
      <Topbar />
      <div className="frame">
        <Rail1 />
        <main className="canvas" id="canvas">
          {children}
        </main>
      </div>
    </ShellProvider>
  );
}
