import React from "react";
import {
  LayoutDashboard,
  RefreshCw,
  Server,
  DatabaseZap,
  ShieldCheck,
  Activity,
  ChartNoAxesCombined,
  FileText,
} from "lucide-react";

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const navItems = [
    {
      name: "Dashboard General",
      href: "/",
      icon: LayoutDashboard,
      active: currentPath === "/" || currentPath === "",
    },
    {
      name: "Centro de Control ETL",
      href: "/etl",
      icon: RefreshCw,
      active: currentPath.startsWith("/etl"),
    },
    {
      name: "Monitoreo 4 Fuentes OLTP",
      href: "/fuentes",
      icon: Server,
      active: currentPath.startsWith("/fuentes"),
    },
    {
      name: "Auditoría & BD OLAP",
      href: "/olap",
      icon: DatabaseZap,
      active: currentPath.startsWith("/olap"),
    },
    {
      name: "Dashboard Power BI",
      href: "/dashboard-bi",
      icon: ChartNoAxesCombined,
      active: currentPath.startsWith("/dashboard-bi"),
    }
  ];

  return (
    <aside className="w-64 bg-[#0c1222] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0">
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Admin<span className="text-cyan-400">Olap</span>
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Data Warehouse Manager
            </span>
          </div>
        </div>
        <nav className="p-4 space-y-1.5">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Módulos Principales
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  item.active
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${item.active ? "text-cyan-400" : "text-slate-500"}`}
                  />
                  <span>{item.name}</span>
                </div>
              </a>
            );
          })}
        </nav>
        <div className="px-4 py-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400 text-[11px] font-mono">
                Estado DW
              </span>
              <span className="text-emerald-400 text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                100% Sincronizado
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              26,405 hechos cargados y normalizados en Aiven PostgreSQL.
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">v1.0.0 Cloud</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> UPSJB 2026
          </span>
        </div>
      </div>
    </aside>
  );
};
