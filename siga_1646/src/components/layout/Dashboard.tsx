import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

function Dashboard({ navigate }: { navigate: (p: string) => void }) {
  const cards = [
    ["Necesidades registradas", "20", "+12.4%", "blue"],
    ["Órdenes de adquisición", "20", "+8.1%", "violet"],
    ["Contratos activos", "15", "+4.6%", "green"],
    ["Stock en almacenes", "20", "-2.3%", "orange"],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Vista general</div>
          <h1>Panel principal</h1>
          <p>Resumen operativo de la gestión administrativa institucional.</p>
        </div>
        <span className="date-chip">Ejercicio 2026</span>
      </div>
      <div className="kpis">
        {cards.map(([a, b, c, d]) => (
          <div className="kpi" key={a}>
            <div className={`kpi-icon ${d}`}>
              <BarChart3 size={18} />
            </div>
            <span>{a}</span>
            <strong>{b}</strong>
            <small className={c.startsWith("-") ? "down" : ""}>
              {c} <em>vs. periodo anterior</em>
            </small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>Accesos rápidos</h2>
              <p>Continúa una operación frecuente</p>
            </div>
          </div>
          <div className="quick-grid">
            {[
              ["necesidades", "Registrar necesidad", ClipboardList],
              ["pedidos", "Crear pedido interno", ShoppingCart],
              ["almacenes", "Gestionar almacén", Warehouse],
              ["reportes", "Ver reportes", BarChart3],
            ].map(([p, l, I]: any) => (
              <button key={p} onClick={() => navigate(p)}>
                <I size={20} />
                <span>{l}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </div>
        <div className="panel activity">
          <div className="panel-title">
            <div>
              <h2>Actividad reciente</h2>
              <p>Eventos del entorno de demostración</p>
            </div>
          </div>
          {[
            "Cuadro de necesidad CN-00020 actualizado",
            "Pedido PE-00019 registrado",
            "Kardex de almacén sincronizado",
            "Reporte de certificaciones generado",
          ].map((x, i) => (
            <div className="activity-row" key={x}>
              <div className="activity-dot"></div>
              <div>
                <strong>{x}</strong>
                <small>
                  Hace {i + 1} hora{i ? "s" : ""} · Usuario DEMO
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="simulation-note">
        <span>i</span>
        <div>
          <strong>Entorno de demostración</strong>
          <p>
            Todos los datos son ficticios y reproducibles. Las aprobaciones,
            reglas presupuestales y auditoría se muestran como simulación
            pendiente de validación normativa.
          </p>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
