import { NavLink } from "./NavLink";
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  UserRound,
  Store,
  Map,
  BarChart3,
  UserSearch,
  Beef,
  RotateCcw,
} from "lucide-react";

interface SidebarProps {
  pathname: string;
}

export default function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 bg-[#073b35] text-white md:flex md:flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-400 p-2 text-[#073b35]">
            <Store size={20} />
          </div>
          <div>
            <b>Samar</b>
            <p className="text-xs text-emerald-200">Importadora</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavLink
          href="/"
          icon={<LayoutDashboard size={18} />}
          text="Dashboard"
          isActive={pathname === "/"}
        />
        <NavLink
          href="/clientes"
          icon={<Users size={18} />}
          text="Clientes"
          isActive={pathname === "/clientes"}
        />
        <NavLink
          href="/prospectos"
          icon={<UserSearch size={18} />}
          text="Prospectos"
          isActive={pathname === "/prospectos"}
        />
        <NavLink
          href="/clientes-buey"
          icon={<Beef size={18} />}
          text="ClientesBuey"
          isActive={pathname === "/clientes-buey"}
        />
        <NavLink
          href="/articulos"
          icon={<Package size={18} />}
          text="Artículos"
          isActive={pathname === "/articulos"}
        />
        <NavLink
          href="/ventas"
          icon={<Receipt size={18} />}
          text="Ventas"
          isActive={pathname === "/ventas"}
        />
        <NavLink
          href="/vendedores"
          icon={<UserRound size={18} />}
          text="Vendedores"
          isActive={pathname === "/vendedores"}
        />
        <NavLink
          href="/sucursales"
          icon={<Store size={18} />}
          text="Sucursales"
          isActive={pathname === "/sucursales"}
        />
        <NavLink
          href="/geografia"
          icon={<Map size={18} />}
          text="Geografía"
          isActive={pathname === "/geografia"}
        />
        <NavLink
          href="/reportes"
          icon={<BarChart3 size={18} />}
          text="Reportes"
          isActive={pathname === "/reportes"}
        />
      </nav>

      <button
        onClick={() => {
          if (confirm("¿Restablecer los datos de demostración?")) {
            localStorage.removeItem("samar-importadora-store");
            location.reload();
          }
        }}
        className="border-t border-emerald-900 p-5 text-left text-xs text-emerald-200"
      >
        <RotateCcw size={14} className="mr-2 inline" />
        Restablecer demo
      </button>
    </aside>
  );
}
