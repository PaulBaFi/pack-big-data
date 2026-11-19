import type { ElementType } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { modules, navigationGroups } from "@/config/modules";

const icons: Record<string, ElementType> = {
  Catálogos: Boxes,
  Planificación: ClipboardList,
  Abastecimiento: ShoppingCart,
  Contrataciones: FileText,
  Presupuesto: WalletCards,
  Almacén: Warehouse,
  Patrimonio: Landmark,
  Seguridad: ShieldCheck,
  Reportes: BarChart3,
};

export default function Sidebar({
  activePath,
  open,
  onNavigate,
}: {
  activePath: string;
  open: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "visible" : ""}`}>
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong className="-mb-2">SIGA</strong>
          <small>Gestión administrativa</small>
        </div>
      </div>
      <nav aria-label="Navegación principal">
        <a
          className={`nav-item ${activePath === "dashboard" ? "active" : ""}`}
          href="/"
          onClick={onNavigate}
        >
          <LayoutDashboard size={18} /> Panel principal
        </a>
        {navigationGroups.map((group) => {
          const Icon = icons[group];
          return (
            <section key={group}>
              <p className="nav-group">{group}</p>
              {modules
                .filter((item) => item.group === group)
                .map((item) => (
                  <a
                    className={`nav-item ${activePath === item.path ? "active" : ""}`}
                    href={`/${item.path}`}
                    key={item.path}
                    onClick={onNavigate}
                  >
                    <Icon size={17} />
                    {item.label}
                  </a>
                ))}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
