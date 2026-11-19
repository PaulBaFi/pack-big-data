import {
  Users,
  ChefHat,
  Plus,
  ChevronRight,
  ClipboardList,
  CircleDollarSign,
} from "lucide-react";

import type { Database } from "@/types/database";
import type { View } from "./App";
import { money } from "@/helpers/formatMoney";
import { date } from "@/helpers/formatDate";

import badge from "./Badge";
import Stat from "./Stat";
import Table from "./Table";

function Dashboard({
  db,
  total,
  go,
  clientName,
}: {
  db: Database;
  total: number;
  go: (v: View) => void;
  clientName: (id: number) => string;
}) {
  const recent = db.VENTAS.slice(-5).reverse();
  return (
    <>
      <div className="welcome">
        <div>
          <h2>
            Buenos días, Administrador <span>✦</span>
          </h2>
          <p>Aquí tienes el resumen de tu restaurante para hoy.</p>
        </div>
        <button className="btn primary" onClick={() => go("operacion")}>
          <Plus size={17} /> Nuevo pedido
        </button>
      </div>
      <div className="stats">
        <Stat
          icon={CircleDollarSign}
          label="Ventas del periodo"
          value={money(total)}
          note="+12.5% vs. periodo anterior"
          color="purple"
        />
        <Stat
          icon={ClipboardList}
          label="Pedidos registrados"
          value={db.PEDIDOS.length}
          note="8 pendientes de atención"
          color="orange"
        />
        <Stat
          icon={Users}
          label="Clientes activos"
          value={db.CLIENTE.length}
          note="+4 nuevos este mes"
          color="blue"
        />
        <Stat
          icon={ChefHat}
          label="Productos activos"
          value={db.PRODUCTO.length}
          note="En 5 categorías"
          color="green"
        />
      </div>
      <div className="grid-two">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <h3>Rendimiento de ventas</h3>
              <p>Ingresos generados en los últimos meses</p>
            </div>
            <select>
              <option>Últimos 6 meses</option>
            </select>
          </div>
          <div className="chart">
            <div className="ylabels">
              <span>S/ 3k</span>
              <span>S/ 2k</span>
              <span>S/ 1k</span>
              <span>S/ 0</span>
            </div>
            <div className="bars">
              {[45, 62, 52, 74, 68, 91].map((h, i) => (
                <div className="bar-wrap" key={i}>
                  <div className="bar" style={{ height: `${h}%` }}>
                    <em>{money(850 + i * 170)}</em>
                  </div>
                  <span>{["Jun", "Jul", "Ago", "Sep", "Oct", "Nov"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Pedidos recientes</h3>
              <p>Actividad de hoy</p>
            </div>
            <button className="link" onClick={() => go("operacion")}>
              Ver todos
            </button>
          </div>
          <div className="mini-list">
            {db.PEDIDOS.slice(-4)
              .reverse()
              .map((p) => (
                <div className="mini-row" key={p.IDPEDIDO}>
                  <div className="round-icon orange">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <b>Pedido #{String(p.IDPEDIDO).padStart(4, "0")}</b>
                    <small>
                      Mesa{" "}
                      {db.MESAS.find((m) => m.IDMESA === p.IDMESA)?.NUNMESA} ·{" "}
                      {date(p.FECHA)}
                    </small>
                  </div>
                  <div className="right">{badge(p.ESTADO)}</div>
                </div>
              ))}
          </div>
        </section>
      </div>
      <section className="card table-card">
        <div className="section-head">
          <div>
            <h3>Últimas ventas</h3>
            <p>Transacciones más recientes</p>
          </div>
          <button className="link" onClick={() => go("ventas")}>
            Ver todas las ventas <ChevronRight size={15} />
          </button>
        </div>
        <Table
          headers={[
            "Venta",
            "Cliente",
            "Fecha",
            "Método de pago",
            "Total",
            "Estado",
          ]}
          rows={recent.map((v) => [
            <b>#{String(v.IDVENTAS).padStart(5, "0")}</b>,
            clientName(v.IDCLIENTE),
            date(v.FECHAVENTA),
            db.METODO_PAGO.find((m) => m.IDMETODO_PAGO === v.IDMETODO_PAGO)
              ?.NOMMETODO,
            money(v.TOTALPAGAR),
            badge(v.ESTADO),
          ])}
        />
      </section>
    </>
  );
}

export default Dashboard;
