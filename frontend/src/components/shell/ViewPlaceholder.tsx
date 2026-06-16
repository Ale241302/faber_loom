/* ════════════════════════════════════════════════════════════════════
   FaberLoom · ViewPlaceholder
   Vista clásica simple para rutas aún no portadas (inbox, workloom, …).
   Usa las clases del mock para mantener fidelidad visual.
   ════════════════════════════════════════════════════════════════════ */

interface ViewPlaceholderProps {
  title: string;
  subtitle: string;
  icon: string;
}

export default function ViewPlaceholder({
  title,
  subtitle,
  icon,
}: ViewPlaceholderProps) {
  return (
    <section className="view on">
      <div className="classic">
        <div className="vhead">
          <div>
            <div className="vtitle">{title}</div>
            <div className="vsub">{subtitle}</div>
          </div>
        </div>
        <div className="empty">
          <div className="eico">{icon}</div>
          <h5>{title}</h5>
          <p>
            Esta vista llega en una próxima entrega. SpaceLoom es la superficie
            activa por defecto.
          </p>
        </div>
      </div>
    </section>
  );
}
