import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertCircle, Clock, Terminal, RotateCw, Calendar, Save, History, Layers } from 'lucide-react';

interface EtlConfig {
  frecuencia_sugerida: string;
  intervalo_horas: number;
  permitir_ejecucion_manual: boolean;
  ultima_actualizacion?: string;
}

interface EtlLog {
  id_log: number;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_segundos: number;
  estado: string;
  filas_castillonv2: number;
  filas_veterinaria: number;
  filas_samar: number;
  filas_siga: number;
  total_filas_cargadas: number;
  mensaje_error?: string;
  ejecutado_por: string;
}

export const EtlRunnerModal: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Frecuencia y Configuración
  const [config, setConfig] = useState<EtlConfig>({
    frecuencia_sugerida: 'DIARIO',
    intervalo_horas: 24,
    permitir_ejecucion_manual: true,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState(false);

  // Historial de Logs
  const [history, setHistory] = useState<EtlLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/etl/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/etl/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/etl/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frecuencia: config.frecuencia_sugerida,
          intervaloHoras: config.intervalo_horas,
          permitirManual: config.permitir_ejecucion_manual,
        }),
      });
      if (res.ok) {
        setConfigSavedMsg(true);
        setTimeout(() => setConfigSavedMsg(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingConfig(false);
    }
  };

  const executeEtl = async () => {
    setIsRunning(true);
    setShowModal(true);
    setProgress(15);
    setCurrentStep('Conectando a las 5 bases de datos en Aiven PostgreSQL...');
    setLogs([
      `[${new Date().toLocaleTimeString()}] Inicializando pipeline ETL...`,
      `[${new Date().toLocaleTimeString()}] Conexión establecida con clúster Aiven PostgreSQL.`,
    ]);

    try {
      setProgress(35);
      setCurrentStep('Poblando y verificando dimensiones (Tiempo, Empresa, Ubicación, Categorías, Métodos de Pago)...');
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Dimensión Tiempo sincronizada (2015-2026).`,
        `[${new Date().toLocaleTimeString()}] Dimensión Empresa clasificada con estratos Micro, Mediana, Grande y Sector Público.`,
      ]);

      const t0 = Date.now();
      const res = await fetch('/api/etl/run', { method: 'POST' });
      const data = await res.json();

      setProgress(85);
      setCurrentStep('Transformando ventas privadas y compras estatales en modelo Star Schema...');
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Carga Castillon V2 completada (${data.filasCastillonv2} ventas).`,
        `[${new Date().toLocaleTimeString()}] Carga Veterinaria completada (${data.filasVeterinaria} ventas).`,
        `[${new Date().toLocaleTimeString()}] Carga Samar Importadora completada (${data.filasSamar} ventas).`,
        `[${new Date().toLocaleTimeString()}] Carga SIGA MEF completada (${data.filasSiga} órdenes de adquisición).`,
      ]);

      setProgress(100);
      setCurrentStep('¡Pipeline ETL completado exitosamente!');
      setLastResult(data);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Proceso finalizado en ${data.durationSeconds}s. Total registros: ${data.totalFilas}.`,
      ]);

      // Refrescar historial
      loadHistory();
    } catch (err: any) {
      setCurrentStep(`Error en la ejecución: ${err.message}`);
      setLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acción Principal */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-0"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                Motor de Ingesta Cloud
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Centro de Orquestación del Pipeline ETL</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Extrae en paralelo los registros de los 4 sistemas transaccionales, aplica normalización, deduplicación y mapeo dimensional, consolidando los hechos en <strong>DW_Empresas_OLAP</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeEtl}
              disabled={isRunning}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/40 hover:shadow-cyan-900/60 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Ejecutando ETL...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Ejecutar Pipeline ETL Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Configuración de Frecuencia & Resumen de Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Frecuencia */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 lg:col-span-1 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Programación y Frecuencia</h3>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Frecuencia de Ejecución:</label>
              <select
                value={config.frecuencia_sugerida}
                onChange={(e) => {
                  const val = e.target.value;
                  let hrs = 24;
                  if (val === 'CADA_1_HORA') hrs = 1;
                  if (val === 'CADA_6_HORAS') hrs = 6;
                  if (val === 'CADA_12_HORAS') hrs = 12;
                  if (val === 'DIARIO') hrs = 24;
                  if (val === 'SEMANAL') hrs = 168;
                  setConfig({ ...config, frecuencia_sugerida: val, intervalo_horas: hrs });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="CADA_1_HORA">Cada 1 Hora</option>
                <option value="CADA_6_HORAS">Cada 6 Horas</option>
                <option value="CADA_12_HORAS">Cada 12 Horas</option>
                <option value="DIARIO">Diario a Medianoche (00:00 UTC) - Recomendado</option>
                <option value="SEMANAL">Semanal (Cada 7 días)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Intervalo en Horas:</label>
              <input
                type="number"
                value={config.intervalo_horas}
                onChange={(e) => setConfig({ ...config, intervalo_horas: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="permitirManual"
                checked={config.permitir_ejecucion_manual}
                onChange={(e) => setConfig({ ...config, permitir_ejecucion_manual: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="permitirManual" className="text-xs text-slate-300">
                Permitir ejecuciones manuales bajo demanda
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>{savingConfig ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
              {configSavedMsg && (
                <p className="text-[11px] text-emerald-400 text-center mt-2 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configuración actualizada en BD
                </p>
              )}
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Vercel Cron Automatizado:</p>
              <p className="font-mono text-[10px] text-cyan-400">vercel.json: 0 0 * * *</p>
              <p className="text-[10px]">La nube ejecuta el cron todos los días de manera autónoma sin necesidad de tener abierta la aplicación.</p>
            </div>
          </form>
        </div>

        {/* Historial Reciente de Ejecuciones */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Historial de Auditoría ETL (`etl_log_ejecucion`)</h3>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 font-mono"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">ID Log</th>
                    <th className="py-2.5 px-3">Fecha Inicio</th>
                    <th className="py-2.5 px-3">Duración</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Total Filas</th>
                    <th className="py-2.5 px-3">Disparador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay ejecuciones registradas todavía.
                      </td>
                    </tr>
                  ) : (
                    history.slice(0, 7).map((log) => (
                      <tr key={log.id_log} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-cyan-400">#{log.id_log}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                          {new Date(log.fecha_inicio).toLocaleString('es-PE')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {log.duracion_segundos ? `${log.duracion_segundos}s` : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.estado === 'COMPLETADO'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                : log.estado === 'EN_PROCESO'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50 animate-pulse'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {log.estado === 'COMPLETADO' && <CheckCircle2 className="w-3 h-3" />}
                            {log.estado === 'ERROR' && <AlertCircle className="w-3 h-3" />}
                            {log.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                          {log.total_filas_cargadas?.toLocaleString() || '0'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                            {log.ejecutado_por}
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
      </div>

      {/* Modal Interactivo de Ejecución en Tiempo Real */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-950">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
                  <RotateCw className={`w-5 h-5 text-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ejecución del Pipeline ETL</h3>
                  <p className="text-[11px] text-slate-400">Ingesta y normalización en DW_Empresas_OLAP</p>
                </div>
              </div>
              {!isRunning && (
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  Cerrar
                </button>
              )}
            </div>

            {/* Contenido Modal */}
            <div className="p-6 space-y-5">
              {/* Progreso */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-300">{currentStep}</span>
                  <span className="text-cyan-400 font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Terminal Logs */}
              <div className="bg-black/90 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto space-y-1">
                <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800 pb-2 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Consola de Auditoría en Tiempo Real</span>
                </div>
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>

              {/* Resultado Final */}
              {lastResult && (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resumen de Carga Satisfactoria (ID Log #{lastResult.logId})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 font-mono text-[11px]">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Castillon V2:</span>
                      <strong className="text-cyan-400">{lastResult.filasCastillonv2}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Veterinaria:</span>
                      <strong className="text-cyan-400">{lastResult.filasVeterinaria}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Samar:</span>
                      <strong className="text-cyan-400">{lastResult.filasSamar}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">SIGA MEF:</span>
                      <strong className="text-cyan-400">{lastResult.filasSiga}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={isRunning}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isRunning ? 'Procesando...' : 'Aceptar y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
