import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Users,
  ChefHat,
  Grid3X3,
  ShoppingBag,
  Receipt,
  Wallet,
  UserRoundCog,
  MapPin,
  BarChart3,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Menu,
  X,
} from "lucide-react";

import type { Database } from "@/types/database";
import { loadData, saveData } from "@/services/storageService";
import { currentDate } from "@/helpers/formatDate";

import Module from "./Module";
import Dashboard from "./Dashboard";

export type View =
  | "dashboard"
  | "clientes"
  | "productos"
  | "operacion"
  | "ventas"
  | "comprobantes"
  | "finanzas"
  | "personal"
  | "ubicacion"
  | "reportes"
  | "configuracion";

export const nav: [View, string, any][] = [
  ["dashboard", "Resumen", LayoutDashboard],
  ["clientes", "Clientes", Users],
  ["productos", "Productos", ChefHat],
  ["operacion", "Mesas y pedidos", Grid3X3],
  ["ventas", "Ventas", ShoppingBag],
  ["comprobantes", "Comprobantes", Receipt],
  ["finanzas", "Finanzas", Wallet],
  ["personal", "Personal y acceso", UserRoundCog],
  ["ubicacion", "Ubicación", MapPin],
  ["reportes", "Reportes", BarChart3],
];

export default function App() {
  const routeView = (): View => {
    if (typeof window === "undefined") return "dashboard";
    const p = window.location.pathname;
    const map: any = {
      clientes: "clientes",
      productos: "productos",
      mesas: "operacion",
      pedidos: "operacion",
      operacion: "operacion",
      ventas: "ventas",
      comprobantes: "comprobantes",
      finanzas: "finanzas",
      personal: "personal",
      ubicacion: "ubicacion",
      configuracion: "configuracion",
      reportes: "reportes",
    };
    return map[p.split("/")[1]] || "dashboard";
  };
  const [db, setDb] = useState<Database>(() => loadData());
  const [view, setView] = useState<View>(routeView);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => saveData(db), [db]);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok && res.data) {
          setDb((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.warn("Using local cache/seed:", err));
  }, []);
  const go = (v: View) => {
    setView(v);
    setQuery("");
    setMenu(false);
    if (typeof window !== "undefined")
      window.history.replaceState({}, "", v === "dashboard" ? "/" : `/${v}`);
  };
  const personName = (id: number) => {
    const p = db.PERSONA.find((x) => x.IDPERSONA === id);
    return p ? `${p.NOMBRES} ${p.APEPATERNO}` : "";
  };
  const clientName = (id: number) => {
    const c = db.CLIENTE.find((x) => x.IDCLIENTE === id);
    return c?.IDPERSONA
      ? personName(c.IDPERSONA)
      : db.EMPRESA.find((e) => e.IDEMPRESA === c?.IDEMPRESA)?.RAZON_SOCIAL ||
          "—";
  };
  const total = db.VENTAS.reduce((a, v) => a + v.TOTALPAGAR, 0);
  const title = nav.find((n) => n[0] === view)?.[1] || "Resumen";
  return (
    <div className="shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <b>
              Castillón<span>V2</span>
            </b>
            <small>Gestión gastronómica</small>
          </div>
          <button className="close" onClick={() => setMenu(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          RESTAURANTE PRINCIPAL <ChevronRight size={14} />
        </div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              className={view === key ? "active" : ""}
              onClick={() => go(key)}
              key={key}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "dashboard" && <i>•</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button onClick={() => go("configuracion")}>
            <Settings size={18} /> Configuración
          </button>
          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              <b>Administrador</b>
              <small>Sesión de demostración</small>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header>
          <button className="mobile-menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div className="header-title">
            <div className="eyebrow">{currentDate}</div>
            <h1>{title}</h1>
          </div>
          <div className="head-actions">
            <div className="header-user">
              <div className="avatar">AD</div>
              <div>
                <b>Administrador</b>
                <small>Sesión activa</small>
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          {view === "dashboard" ? (
            <Dashboard db={db} total={total} go={go} clientName={clientName} />
          ) : (
            <Module
              view={view}
              db={db}
              setDb={setDb}
              query={query}
              setQuery={setQuery}
              modal={modal}
              setModal={setModal}
              clientName={clientName}
              personName={personName}
              go={go}
            />
          )}
        </div>
      </main>
    </div>
  );
}
