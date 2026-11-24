import {
  Users,
  ChefHat,
  Plus,
  ChevronRight,
  ClipboardList,
  CircleDollarSign,
  Grid3X3,
  UtensilsCrossed,
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
  setModal,
  user,
}: {
  db: Database;
  total: number;
  go: (v: View) => void;
  clientName: (id: number) => string;
  setModal?: (s: string | null) => void;
  user?: any;
}) {
  const isKitchenOrWaiter =
    user?.rolEfectivo === "CHEF" ||
    user?.rolEfectivo === "COCINERO" ||
    user?.rolEfectivo === "MOZO";

  const recent = (db.VENTAS || []).slice(-5).reverse();
  const recentOrders = (db.PEDIDOS || []).slice(-5).reverse();

  return (
    <>
      <div className="welcome">
        <div>
          <h2>
            Buenos días, {user?.nombre || "Administrador"} <span>✦</span>
          </h2>
          <p>
            {user?.labelRol
              ? `Sesión operativa activa: [${user.labelRol}] · CastillónV2 Gastronomía`
              : "Aquí tienes el resumen operativo de tu restaurante para hoy."}
          </p>
        </div>
        <button className="btn primary" onClick={() => go("operacion")}>
          <Plus size={17} /> Nuevo pedido
        </button>
      </div>

      <div className="stats">
        {!isKitchenOrWaiter ? (
          <Stat
            icon={CircleDollarSign}
            label="Ventas del periodo"
            value={money(total)}
            note="+12.5% vs. periodo anterior"
            color="purple"
          />
        ) : (
          <Stat
            icon={Grid3X3}
            label="Mesas en salón"
            value={(db.MESAS || []).length}
            note="Salón principal y terraza"
            color="purple"
          />
        )}
        <Stat
          icon={ClipboardList}
          label="Pedidos registrados"
          value={(db.PEDIDOS || []).length}
          note="Comandas en curso"
          color="orange"
        />
        <Stat
          icon={Users}
          label="Clientes registrados"
          value={(db.CLIENTE || []).length}
          note="+4 nuevos este mes"
          color="blue"
        />
        <Stat
          icon={ChefHat}
          label="Platos en carta"
          value={(db.PRODUCTO || []).length}
          note="En 5 categorías"
          color="green"
        />
      </div>

      <div className="grid-two">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <h3>
                {isKitchenOrWaiter
                  ? "Flujo de comandas de cocina"
                  : "Rendimiento de ventas"}
              </h3>
              <p>
                {isKitchenOrWaiter
                  ? "Distribución horaria de órdenes preparadas"
                  : "Ingresos generados en los últimos meses"}
              </p>
            </div>
            <select>
              <option>
                {isKitchenOrWaiter ? "Turno actual" : "Últimos 6 meses"}
              </option>
            </select>
          </div>
          <div className="chart">
            <div className="ylabels">
              <span>{isKitchenOrWaiter ? "30 com" : "S/ 3k"}</span>
              <span>{isKitchenOrWaiter ? "20 com" : "S/ 2k"}</span>
              <span>{isKitchenOrWaiter ? "10 com" : "S/ 1k"}</span>
              <span>0</span>
            </div>
            <div className="bars">
              {[45, 62, 52, 74, 68, 91].map((h, i) => (
                <div className="bar-wrap" key={i}>
                  <div className="bar" style={{ height: `${h}%` }}>
                    <em>
                      {isKitchenOrWaiter
                        ? `${Math.round(h * 0.4)} ordenes`
                        : money(850 + i * 170)}
                    </em>
                  </div>
                  <span>
                    {isKitchenOrWaiter
                      ? ["12:00", "13:00", "14:00", "19:00", "20:00", "21:00"][i]
                      : ["Jun", "Jul", "Ago", "Sep", "Oct", "Nov"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <h3>Pedidos y Comandas</h3>
              <p>Actividad en cocina y salón</p>
            </div>
            <button className="link" onClick={() => go("operacion")}>
              Ver todos
            </button>
          </div>
          <div className="mini-list">
            {(db.PEDIDOS || [])
              .slice(-4)
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
                      {(db.MESAS || []).find((m) => m.IDMESA === p.IDMESA)
                        ?.NUNMESA || "—"}{" "}
                      · {date(p.FECHA)}
                    </small>
                  </div>
                  <div className="right">{badge(p.ESTADO)}</div>
                </div>
              ))}
          </div>
        </section>
      </div>

      {!isKitchenOrWaiter ? (
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
              (db.METODO_PAGO || []).find(
                (m) => m.IDMETODO_PAGO === v.IDMETODO_PAGO
              )?.NOMMETODO || "—",
              money(v.TOTALPAGAR),
              badge(v.ESTADO),
            ])}
          />
        </section>
      ) : (
        <section className="card table-card">
          <div className="section-head">
            <div>
              <h3>Comandas recientes de cocina</h3>
              <p>Órdenes registradas para preparación y despacho</p>
            </div>
            <button className="link" onClick={() => go("operacion")}>
              Ir a Mesas y Pedidos <ChevronRight size={15} />
            </button>
          </div>
          <Table
            headers={["Nro. Pedido", "Mesa asignada", "Fecha de comanda", "Estado de orden"]}
            rows={recentOrders.map((p) => [
              <b>#{String(p.IDPEDIDO).padStart(4, "0")}</b>,
              `Mesa ${(db.MESAS || []).find((m) => m.IDMESA === p.IDMESA)?.NUNMESA || "—"} (Piso ${(db.MESAS || []).find((m) => m.IDMESA === p.IDMESA)?.NUMPISO || "1"})`,
              date(p.FECHA),
              badge(p.ESTADO),
            ])}
          />
        </section>
      )}
    </>
  );
}

export default Dashboard;
