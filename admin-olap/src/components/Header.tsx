import React, { useState } from 'react';
import { Database, LogOut, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  user?: {
    email: string;
    nombre: string;
    rol: string;
  };
  activeSection?: string;
}

export const Header: React.FC<HeaderProps> = ({ user, activeSection }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-full">
          UPSJB Big Data Hub
        </span>
        <span className="text-slate-500">/</span>
        <h1 className="text-sm font-medium text-slate-200">
          {activeSection || 'Panel de Control y Administración'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Indicador de Conexión Cloud */}
        <div className="hidden md:flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Database className="w-3.5 h-3.5" />
          <span>Aiven Cloud (5/5 Online)</span>
        </div>

        {/* Perfil de Usuario */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-semibold text-xs">
              {user?.nombre ? user.nombre.charAt(0) : 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-200">{user?.nombre || 'Administrador'}</p>
              <p className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 inline" /> {user?.rol || 'SUPERADMIN'}
              </p>
            </div>
          </div>

          {/* Botón Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Cerrar Sesión Segura"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
