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
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import type { Database } from "@/types/database";
import type { CastillonUser } from "@/lib/auth";
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
  ["productos", "Productos (Carta)", ChefHat],
  ["operacion", "Mesas y pedidos", Grid3X3],
  ["ventas", "Ventas", ShoppingBag],
  ["comprobantes", "Comprobantes", Receipt],
  ["finanzas", "Finanzas", Wallet],
  ["personal", "Personal y acceso", UserRoundCog],
  ["ubicacion", "Ubicación", MapPin],
  ["reportes", "Reportes", BarChart3],
];

export default function App({ currentUser }: { currentUser?: CastillonUser }) {
  const [user, setUser] = useState<CastillonUser | null>(currentUser || null);

  const routeView = (): View => {
    if (typeof window === "undefined") return "dashboard";
    const p = window.location.pathname;
    const map: Record<string, View> = {
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

  // Si no se proveyó usuario vía SSR, consultar sesión
  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.user) {
            setUser(res.user);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Cargar base de datos desde PostgreSQL
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

  // Vistas permitidas según el rol del usuario autenticado
  const allowedViews = user?.vistasPermitidas || [
    "dashboard",
    "clientes",
    "productos",
    "operacion",
    "ventas",
    "comprobantes",
    "finanzas",
    "personal",
    "ubicacion",
    "reportes",
    "configuracion",
  ];

  const filteredNav = nav.filter(([key]) => allowedViews.includes(key));

  // Redireccionar a vista permitida si intenta acceder a un módulo prohibido
  useEffect(() => {
    if (user && user.vistasPermitidas && user.vistasPermitidas.length > 0) {
      if (!user.vistasPermitidas.includes(view)) {
        const fallback = (user.vistasPermitidas[0] || "dashboard") as View;
        go(fallback);
      }
    }
  }, [user, view]);

  const go = (v: View) => {
    setView(v);
    setQuery("");
    setMenu(false);
    if (typeof window !== "undefined")
      window.history.replaceState({}, "", v === "dashboard" ? "/" : `/${v}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    window.location.href = "/login";
  };

  const personName = (id: number) => {
    const p = (db.PERSONA || []).find((x) => x.IDPERSONA === id);
    return p ? `${p.NOMBRES || ""} ${p.APEPATERNO || ""}`.trim() : "";
  };

  const clientName = (id: number) => {
    const c = (db.CLIENTE || []).find((x) => x.IDCLIENTE === id);
    return c?.IDPERSONA
      ? personName(c.IDPERSONA)
      : (db.EMPRESA || []).find((e) => e.IDEMPRESA === c?.IDEMPRESA)?.RAZON_SOCIAL ||
          "—";
  };

  const total = (db.VENTAS || []).reduce(
    (a, v) => a + (Number(v.TOTALPAGAR) || 0),
    0
  );

  const title = nav.find((n) => n[0] === view)?.[1] || "Resumen";

  const userInitials = user?.nombre
    ? user.nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

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

        {/* Rol y Módulos Autorizados */}
        {user && (
          <div
            style={{
              padding: "8px 12px",
              margin: "6px 0 12px",
              background: "rgba(124, 58, 237, 0.12)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              borderRadius: "10px",
              fontSize: "11px",
              color: "#c4b5fd",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={14} color="#a78bfa" />
            <span>
              Rol: <b>{user.labelRol}</b> ({filteredNav.length} módulos)
            </span>
          </div>
        )}

        <nav>
          {filteredNav.map(([key, label, Icon]) => (
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
          {allowedViews.includes("configuracion") && (
            <button onClick={() => go("configuracion")}>
              <Settings size={18} /> Configuración
            </button>
          )}

          <div className="profile" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="avatar">{userInitials}</div>
              <div>
                <b style={{ fontSize: "12px", display: "block" }}>
                  {user?.nombre || "Administrador"}
                </b>
                <small style={{ fontSize: "10.5px", color: "#a78bfa" }}>
                  {user?.labelRol || "Sesión activa"}
                </small>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "6px 8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <LogOut size={13} /> Salir
            </button>
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
            <div className="header-user" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="avatar">{userInitials}</div>
              <div>
                <b>{user?.nombre || "Administrador"}</b>
                <small>{user?.labelRol || "Sesión activa"}</small>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11.5px",
                  cursor: "pointer",
                  marginLeft: "6px",
                }}
              >
                <LogOut size={13} /> Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <div className="content">
          {view === "dashboard" ? (
            <Dashboard
              db={db}
              total={total}
              go={go}
              clientName={clientName}
              setModal={setModal}
              user={user}
            />
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
