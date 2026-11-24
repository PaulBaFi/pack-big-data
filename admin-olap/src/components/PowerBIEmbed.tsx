import React, { useState } from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface PowerBIEmbedProps {
  title: string;
  description: string;
  embedUrl: string;
  externalUrl: string;
  requiresAuth?: boolean;
}

export const PowerBIEmbed: React.FC<PowerBIEmbedProps> = ({
  title, description, embedUrl, externalUrl, requiresAuth = false,
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <section className="flex flex-col flex-1 min-h-0 w-full gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-mono text-cyan-400 mb-1">
            Business Intelligence / Power BI
          </p>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button"
            onClick={() => { setLoading(true); setReloadKey(value => value + 1); }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> Recargar
          </button>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 border border-cyan-500 hover:bg-cyan-500 transition-colors">
            <ExternalLink className="w-4 h-4" /> Abrir en Power BI
          </a>
        </div>
      </div>
      {requiresAuth && (
        <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Este reporte puede requerir inicio de sesión y permisos de Power BI. Si no se muestra dentro del sistema, utiliza «Abrir en Power BI». Para incrustación segura, configura el enlace «Sitio web o portal» de Power BI.</span>
        </div>
      )}
      <div className="relative flex-1 min-h-[480px] rounded-xl overflow-hidden border border-slate-800 bg-[#0c1222]">
        {loading && (
          <div className="absolute top-3 right-3 z-10 text-xs text-slate-300 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 pointer-events-none">
            Cargando visualización…
          </div>
        )}
        <iframe key={reloadKey} title={title} src={embedUrl}
          className="block w-full h-full min-h-[480px] border-0" allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoading(false)} />
      </div>
      <p className="text-xs text-slate-500 shrink-0">
        Si Power BI bloquea la incrustación, muestra inicio de sesión o queda en blanco, utiliza el botón «Abrir en Power BI».
      </p>
    </section>
  );
};
