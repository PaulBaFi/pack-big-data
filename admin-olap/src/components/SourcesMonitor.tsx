import React, { useState, useEffect } from 'react';
import { Server, Database, CheckCircle, AlertTriangle, RotateCw, Eye, ArrowRight, Zap, Building2, Store, ShoppingBag, Landmark } from 'lucide-react';

interface SourceSystem {
  id: string;
  nombre: string;
  estrato: string;
  rubro: string;
  tablaOrigen: string;
  tablaDestino: string;
  oltpCount: number;
  olapCount: number;
  pendingCount: number;
  isSynced: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  latencyMs: number;
  lastOltpDate: string | null;
  lastOlapDate: string | null;
  dbName: string;
}

export const SourcesMonitor: React.FC = () => {
  const [sources, setSources] = useState<SourceSystem[]>([]);
  const [globalStats, setGlobalStats] = useState({
    globalSyncPercentage: 100,
    totalOltp: 0,
    totalOlap: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('castillonv2');
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [syncingSource, setSyncingSource] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (selectedSource) {
      loadPreview(selectedSource);
    }
  }, [selectedSource]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sources/status');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
        setGlobalStats({
          globalSyncPercentage: data.globalSyncPercentage,
          totalOltp: data.totalOltp,
          totalOlap: data.totalOlap,
          totalPending: data.totalPending,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (sourceId: string) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/sources/preview?source=${sourceId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewRecords(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncingSource(true);
    try {
      await fetch('/api/etl/run', { method: 'POST' });
      await fetchStatus();
      if (selectedSource) {
        await loadPreview(selectedSource);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingSource(false);
    }
  };

  const getSourceIcon = (id: string) => {
    switch (id) {
      case 'castillonv2':
        return <Store className="w-5 h-5 text-amber-400" />;
      case 'veterinaria':
        return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'samar':
        return <ShoppingBag className="w-5 h-5 text-blue-400" />;
      case 'siga':
        return <Landmark className="w-5 h-5 text-purple-400" />;
      default:
        return <Server className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Total Registros OLTP</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-white">
              {globalStats.totalOltp.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-mono">4 Fuentes</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Total Hechos en DW OLAP</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {globalStats.totalOlap.toLocaleString()}
            </span>
            <span className="text-xs text-cyan-500 font-mono">Consolidados</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Nuevos Pendientes de Subir</span>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                globalStats.totalPending === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {globalStats.totalPending.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-mono">Deltas</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Tasa Global de Sincronización</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {globalStats.globalSyncPercentage}%
            </span>
            <span className="text-xs text-emerald-500 font-mono">Certificado</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de las 4 Empresas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <span>Monitoreo de Sistemas Transaccionales en Vivo (Aiven Cloud)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compara en tiempo real la cantidad de registros en cada base transaccional contra los hechos consolidados en el Data Warehouse.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Métricas</span>
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncingSource}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold shadow-md shadow-cyan-950 transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 ${syncingSource ? 'animate-bounce' : ''}`} />
            <span>{syncingSource ? 'Sincronizando...' : 'Sincronizar Todo'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {sources.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedSource(s.id)}
            className={`cursor-pointer rounded-2xl border transition-all p-5 flex flex-col justify-between ${
              selectedSource === s.id
                ? 'bg-gradient-to-b from-[#131d33] to-[#0f172a] border-cyan-500/80 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/40'
                : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              {/* Header de la Tarjeta */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                  {getSourceIcon(s.id)}
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {s.latencyMs}ms
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">{s.nombre}</h3>
                <p className="text-[11px] font-medium text-cyan-400">{s.estrato}</p>
                <p className="text-[10px] text-slate-400 line-clamp-1">{s.rubro}</p>
              </div>

              {/* Métricas Comparativas OLTP vs OLAP */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Origen ({s.tablaOrigen}):</span>
                  <span className="font-mono font-bold text-white">{s.oltpCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">En Data Warehouse:</span>
                  <span className="font-mono font-bold text-cyan-400">{s.olapCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300 font-medium">Nuevos Pendientes:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      s.pendingCount === 0
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800/50 animate-pulse'
                    }`}
                  >
                    {s.pendingCount === 0 ? '0 (Al Día)' : `+${s.pendingCount} pendientes`}
                  </span>
                </div>
              </div>
            </div>

            {/* Estado Badge */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono text-[10px]">
                {s.lastOltpDate ? `Últ: ${s.lastOltpDate}` : 'N/A'}
              </span>
              <span className="text-cyan-400 flex items-center gap-1 font-medium hover:underline text-[11px]">
                Explorar <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Explorador de Transacciones en Vivo para la Fuente Seleccionada */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Eye className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Explorador de Transacciones Recientes:{' '}
                <span className="text-cyan-400">
                  {sources.find((s) => s.id === selectedSource)?.nombre || selectedSource}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoría en vivo de los últimos registros transaccionales y su correspondencia en DW_Empresas_OLAP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              Base de Datos: <strong className="text-slate-200">{sources.find((s) => s.id === selectedSource)?.dbName}</strong>
            </span>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <th className="py-2.5 px-3">ID / Clave</th>
                <th className="py-2.5 px-3">Documento</th>
                <th className="py-2.5 px-3">Fecha Transacción</th>
                <th className="py-2.5 px-3">Referencia / Cliente</th>
                <th className="py-2.5 px-3 text-right">Monto (S/.)</th>
                <th className="py-2.5 px-3 text-center">Estado de Sincronización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loadingPreview ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-2" />
                    Consultando registros en vivo...
                  </td>
                </tr>
              ) : previewRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron registros para esta fuente.
                  </td>
                </tr>
              ) : (
                previewRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-cyan-400 text-[11px]">#{r.id}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">{r.documento}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{r.fecha}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">{r.referencia}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      S/ {r.total}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                        <CheckCircle className="w-3 h-3" /> Sincronizado en DW
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
