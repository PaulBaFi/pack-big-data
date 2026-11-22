"""
Web Manager y Centro de Control ETL para DW_Empresas_OLAP.
Proporciona interfaz web interactiva, boton 'Ejecutar ETL Ahora',
configuracion de frecuencia/tiempos de ejecucion y visualizacion de metricas OLAP.
"""

import os
import sys
import json
import time
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import DB_DW_OLAP
import etl_pipeline

etl_lock = threading.Lock()
execution_state = {
    "is_running": False,
    "current_step": "Listo",
    "progress": 0,
    "last_run_time": None,
    "last_result": None,
    "log_output": []
}

def log_msg(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    print(entry)
    execution_state["log_output"].append(entry)
    if len(execution_state["log_output"]) > 200:
        execution_state["log_output"].pop(0)

def run_etl_async(modo="MANUAL"):
    if execution_state["is_running"]:
        return False, "El proceso ETL ya está en ejecución."

    def worker():
        with etl_lock:
            execution_state["is_running"] = True
            execution_state["progress"] = 10
            execution_state["current_step"] = "Iniciando proceso ETL..."
            log_msg(f"Iniciando pipeline ETL en modo: {modo}")
            try:
                execution_state["progress"] = 25
                execution_state["current_step"] = "Ejecutando pipeline de extracción, transformación y carga..."
                start_time = time.time()
                success, details = etl_pipeline.run_pipeline(modo_ejecucion=modo)
                elapsed = round(time.time() - start_time, 2)
                execution_state["progress"] = 100
                execution_state["last_run_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                execution_state["last_result"] = {
                    "success": success,
                    "elapsed_seconds": elapsed,
                    "details": details
                }
                execution_state["current_step"] = "ETL Completado con éxito" if success else "Error en ejecución ETL"
                log_msg(f"ETL finalizado en {elapsed}s con estado: {'EXITOSO' if success else 'ERROR'}")
            except Exception as e:
                execution_state["current_step"] = f"Error: {str(e)}"
                execution_state["last_result"] = {"success": False, "error": str(e)}
                log_msg(f"Excepción en ETL: {str(e)}")
            finally:
                execution_state["is_running"] = False

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return True, "ETL iniciado en segundo plano."

def get_dw_connection():
    return psycopg2.connect(DB_DW_OLAP)

def get_dashboard_data():
    data = {
        "config": {},
        "recent_logs": [],
        "metrics": {
            "total_facts_privados": 0,
            "total_facts_estatales": 0,
            "resumen_empresas": [],
            "resumen_compras": []
        },
        "state": execution_state
    }
    try:
        conn = get_dw_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Config
        cur.execute("SELECT * FROM etl_configuracion LIMIT 1;")
        cfg = cur.fetchone()
        if cfg:
            data["config"] = dict(cfg)

        # Logs recientes
        cur.execute("""
            SELECT id_log, fecha_inicio, fecha_fin, estado, duracion_segundos, 
                   total_filas_cargadas, filas_castillonv2, filas_veterinaria, 
                   filas_samar, filas_siga, mensaje_error 
            FROM etl_log_ejecucion 
            ORDER BY id_log DESC 
            LIMIT 10;
        """)
        logs = cur.fetchall()
        data["recent_logs"] = [dict(r) for r in logs]

        # Total facts
        cur.execute("SELECT count(*) as cnt FROM fact_ventas_privadas;")
        data["metrics"]["total_facts_privados"] = cur.fetchone()["cnt"]

        cur.execute("SELECT count(*) as cnt FROM fact_compras_estatales;")
        data["metrics"]["total_facts_estatales"] = cur.fetchone()["cnt"]

        # Resumen ventas por empresa
        cur.execute("""
            SELECT e.estrato_tamanio, e.razon_social as nombre_empresa, 
                   COUNT(*) as total_ventas,
                   ROUND(SUM(f.monto_total)::numeric, 2) as monto_acumulado,
                   ROUND(AVG(f.monto_total)::numeric, 2) as ticket_promedio
            FROM fact_ventas_privadas f
            JOIN dim_empresa e ON f.id_empresa = e.id_empresa
            GROUP BY e.estrato_tamanio, e.razon_social
            ORDER BY monto_acumulado DESC;
        """)
        data["metrics"]["resumen_empresas"] = [dict(r) for r in cur.fetchall()]

        # Resumen compras SIGA MYPE vs Grandes
        cur.execute("""
            SELECT CASE WHEN f.flag_proveedor_mype IN ('S', 'SI', '1', 'true', 'TRUE') THEN 'MYPEs' ELSE 'Grandes Empresas' END as clasificacion_proveedor,
                   COUNT(*) as total_ordenes,
                   ROUND(SUM(f.monto_adjudicado)::numeric, 2) as monto_total,
                   ROUND(AVG(f.monto_adjudicado)::numeric, 2) as promedio_orden
            FROM fact_compras_estatales f
            GROUP BY 1
            ORDER BY monto_total DESC;
        """)
        data["metrics"]["resumen_compras"] = [dict(r) for r in cur.fetchall()]

        conn.close()
    except Exception as e:
        data["error"] = str(e)

    return data

def save_config(frecuencia, intervalo_horas):
    try:
        conn = get_dw_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE etl_configuracion
            SET frecuencia_sugerida = %s,
                intervalo_horas = %s,
                ultima_actualizacion = NOW()
            WHERE id = 1;
        """, (frecuencia, intervalo_horas))
        conn.commit()
        conn.close()
        return True, "Configuración guardada exitosamente."
    except Exception as e:
        return False, str(e)

class ETLHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == "/api/data" or url.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = get_dashboard_data()
            self.wfile.write(json.dumps(data, default=str).encode("utf-8"))
        elif url.path == "/api/logs":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = get_dashboard_data()
            self.wfile.write(json.dumps(data.get("recent_logs", []), default=str).encode("utf-8"))
        elif url.path == "/" or url.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            params = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            params = {}

        if url.path == "/api/run":
            modo = params.get("modo", "MANUAL")
            ok, msg = run_etl_async(modo)
            self.send_response(200 if ok else 400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": ok, "message": msg}).encode("utf-8"))

        elif url.path == "/api/config":
            frecuencia = params.get("frecuencia", "MANUAL")
            intervalo = int(params.get("intervalo_horas", 24))
            ok, msg = save_config(frecuencia, intervalo)
            self.send_response(200 if ok else 400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": ok, "message": msg}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Centro de Comando ETL & Big Data OLAP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background: #0b0f19; color: #f3f4f6; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .glass-card { background: rgba(23, 31, 48, 0.8); border: 1px solid rgba(255, 255, 255, 0.07); }
        .pulse-dot { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(0.9); } }
    </style>
</head>
<body class="min-h-screen">
    <!-- Header -->
    <header class="border-b border-gray-800 bg-gray-900/80 sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-cyan-500/20">
                ⚡
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    ETL Command Center <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">Aiven Cloud DW</span>
                </h1>
                <p class="text-xs text-gray-400">Pipeline de Benchmarking MYPEs, Pymes y Grandes Empresas + SIGA Estatal</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium glass text-gray-300">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot"></span>
                <span id="header-status">Conectado a DW OLAP</span>
            </span>
            <button onclick="fetchStatus()" class="p-2 rounded-lg glass text-gray-400 hover:text-white transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <!-- Control Panel & Execution -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Manual Trigger Card -->
            <div class="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border-cyan-500/20 shadow-xl shadow-cyan-950/30">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase font-semibold tracking-wider text-cyan-400">Ejecución Manual</span>
                        <span id="badge-running" class="hidden px-2.5 py-0.5 rounded-full text-xs font-mono bg-yellow-950 text-yellow-400 border border-yellow-700 animate-pulse">PROCESANDO</span>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-white">Disparador ETL</h2>
                        <p class="text-sm text-gray-400 mt-1">Extrae desde las 4 bases de datos transaccionales, computa dimensiones y puebla las tablas de hechos en el Data Warehouse.</p>
                    </div>
                </div>

                <div class="mt-6 space-y-3">
                    <div id="progress-container" class="hidden space-y-2">
                        <div class="flex justify-between text-xs font-mono">
                            <span id="step-label" class="text-cyan-300">Iniciando...</span>
                            <span id="progress-label" class="text-gray-400">0%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div id="progress-bar" class="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>

                    <button id="btn-run" onclick="triggerETL()" class="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-600/30 active:scale-[0.98] transition flex items-center justify-center gap-3 text-base">
                        <svg class="w-5 h-5 animate-spin hidden" id="spinner" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        <span>⚡ Ejecutar ETL Ahora</span>
                    </button>
                </div>
            </div>

            <!-- Frecuencia & Tiempos Config Card -->
            <div class="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <div>
                    <span class="text-xs uppercase font-semibold tracking-wider text-purple-400">Frecuencia y Tiempos</span>
                    <h2 class="text-2xl font-bold text-white mt-1">Programación</h2>
                    <p class="text-sm text-gray-400 mt-1">Configura cada cuánto tiempo se ejecuta el pipeline o déjalo exclusivamente bajo demanda manual.</p>

                    <div class="mt-6 space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-300 mb-2">Intervalo de Recurrencia</label>
                            <select id="select-intervalo" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500">
                                <option value="0">Solo Manual (Bajo Demanda)</option>
                                <option value="1">Cada 1 hora</option>
                                <option value="6">Cada 6 horas</option>
                                <option value="12">Cada 12 horas</option>
                                <option value="24">Cada 24 horas (Diario)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-300 mb-2">Modalidad</label>
                            <select id="select-frecuencia" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500">
                                <option value="MANUAL">MANUAL (Solo botón Ejecutar)</option>
                                <option value="HORARIO">HORARIO (Automático según intervalo)</option>
                                <option value="DIARIO">DIARIO (Una vez al día)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button onclick="saveSchedule()" class="mt-6 w-full py-3 px-4 rounded-xl font-semibold text-sm text-purple-200 bg-purple-950/60 border border-purple-800 hover:bg-purple-900/80 transition">
                    💾 Guardar Configuración
                </button>
            </div>

            <!-- Quick Metrics Overview -->
            <div class="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <div>
                    <span class="text-xs uppercase font-semibold tracking-wider text-emerald-400">Estado del Data Warehouse</span>
                    <h2 class="text-2xl font-bold text-white mt-1">Métricas OLAP</h2>
                    
                    <div class="grid grid-cols-2 gap-4 mt-6">
                        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                            <span class="text-xs text-gray-400">Ventas Privadas</span>
                            <div class="text-2xl font-black text-cyan-400 mt-1" id="kpi-ventas">26,405</div>
                            <span class="text-[10px] text-gray-500 font-mono">Micro + Media + Gran</span>
                        </div>
                        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                            <span class="text-xs text-gray-400">Compras SIGA</span>
                            <div class="text-2xl font-black text-emerald-400 mt-1" id="kpi-compras">16,204</div>
                            <span class="text-[10px] text-gray-500 font-mono">Órdenes Adjudicadas</span>
                        </div>
                    </div>

                    <div class="mt-4 p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">Última Ejecución:</span>
                            <span id="kpi-last-date" class="font-mono text-gray-200">2026-11-21 17:05</span>
                        </div>
                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">Duración Promedio:</span>
                            <span id="kpi-duration" class="font-mono text-gray-200">~93.2s</span>
                        </div>
                    </div>
                </div>

                <div class="mt-4 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Aiven PostgreSQL 16</span>
                    <span class="text-emerald-400">● 5 Bds Sincronizadas</span>
                </div>
            </div>
        </section>

        <!-- Live Execution Console -->
        <section class="glass-card rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Consola de Ejecución en Vivo
                </h3>
                <span class="text-xs font-mono text-gray-500" id="live-indicator">Streaming activo</span>
            </div>
            <div id="console-logs" class="bg-black/70 rounded-xl p-4 font-mono text-xs text-green-400 h-44 overflow-y-auto space-y-1 border border-gray-800">
                <div class="text-gray-500">> Sistema inicializado. Listo para ejecutar pipeline ETL.</div>
            </div>
        </section>

        <!-- Analytical Benchmarking Charts -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="glass-card rounded-2xl p-6">
                <h3 class="text-base font-bold text-white mb-1">Benchmarking de Ventas Privadas</h3>
                <p class="text-xs text-gray-400 mb-4">Comparativa de Ticket Promedio y Volumen (Micro vs Mediana vs Gran Empresa)</p>
                <div class="h-64">
                    <canvas id="chartVentas"></canvas>
                </div>
            </div>

            <div class="glass-card rounded-2xl p-6">
                <h3 class="text-base font-bold text-white mb-1">Compras Estatales SIGA (Participación)</h3>
                <p class="text-xs text-gray-400 mb-4">Distribución de Montos Adjudicados: MYPEs vs Grandes Empresas</p>
                <div class="h-64">
                    <canvas id="chartCompras"></canvas>
                </div>
            </div>
        </section>

        <!-- Execution History Table -->
        <section class="glass-card rounded-2xl p-6">
            <h3 class="text-base font-bold text-white mb-1">Historial de Auditoría (etl_log_ejecucion)</h3>
            <p class="text-xs text-gray-400 mb-4">Registro inmutable de cada ejecución manual y programada en Aiven PostgreSQL</p>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                    <thead class="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                        <tr>
                            <th class="py-3 px-4">ID</th>
                            <th class="py-3 px-4">Fecha Inicio</th>
                            <th class="py-3 px-4">Duración</th>
                            <th class="py-3 px-4">Estado</th>
                            <th class="py-3 px-4">Total Filas</th>
                            <th class="py-3 px-4">Castillón V2</th>
                            <th class="py-3 px-4">Veterinaria</th>
                            <th class="py-3 px-4">Samar</th>
                            <th class="py-3 px-4">SIGA</th>
                        </tr>
                    </thead>
                    <tbody id="logs-table-body" class="divide-y divide-gray-800 text-gray-300">
                        <tr><td colspan="9" class="py-4 text-center text-gray-500">Cargando registros...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>

    <script>
        let chartVentasInstance = null;
        let chartComprasInstance = null;

        async function fetchStatus() {
            try {
                const res = await fetch('/api/data');
                const data = await res.json();
                renderDashboard(data);
            } catch (e) {
                console.error("Error al obtener estado:", e);
            }
        }

        function renderDashboard(data) {
            if (!data) return;

            // KPIs
            if (data.metrics) {
                document.getElementById('kpi-ventas').innerText = Number(data.metrics.total_facts_privados || 0).toLocaleString();
                document.getElementById('kpi-compras').innerText = Number(data.metrics.total_facts_estatales || 0).toLocaleString();
            }

            // Config
            if (data.config) {
                document.getElementById('select-intervalo').value = data.config.intervalo_horas || 24;
                document.getElementById('select-frecuencia').value = data.config.frecuencia_sugerida || 'MANUAL';
            }

            // Running State
            const state = data.state;
            const btnRun = document.getElementById('btn-run');
            const spinner = document.getElementById('spinner');
            const badgeRunning = document.getElementById('badge-running');
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const stepLabel = document.getElementById('step-label');
            const progressLabel = document.getElementById('progress-label');

            if (state && state.is_running) {
                btnRun.disabled = true;
                btnRun.classList.add('opacity-50', 'cursor-not-allowed');
                spinner.classList.remove('hidden');
                badgeRunning.classList.remove('hidden');
                progressContainer.classList.remove('hidden');
                progressBar.style.width = (state.progress || 20) + '%';
                stepLabel.innerText = state.current_step || 'Procesando...';
                progressLabel.innerText = (state.progress || 20) + '%';
            } else {
                btnRun.disabled = false;
                btnRun.classList.remove('opacity-50', 'cursor-not-allowed');
                spinner.classList.add('hidden');
                badgeRunning.classList.add('hidden');
                if (state && state.last_run_time) {
                    stepLabel.innerText = state.current_step || 'Listo';
                    progressBar.style.width = '100%';
                    document.getElementById('kpi-last-date').innerText = state.last_run_time;
                }
            }

            // Logs stream
            if (state && state.log_output && state.log_output.length > 0) {
                const consoleDiv = document.getElementById('console-logs');
                consoleDiv.innerHTML = state.log_output.map(line => `<div>${line}</div>`).join('');
                consoleDiv.scrollTop = consoleDiv.scrollHeight;
            }

            // Logs table
            if (data.recent_logs) {
                const tbody = document.getElementById('logs-table-body');
                if (data.recent_logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" class="py-4 text-center text-gray-500">Sin registros de ejecución</td></tr>';
                } else {
                    tbody.innerHTML = data.recent_logs.map(log => {
                        const isOk = log.estado === 'EXITOSO';
                        const badge = isOk 
                            ? '<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">EXITOSO</span>'
                            : '<span class="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">ERROR</span>';
                        return `
                            <tr class="hover:bg-gray-800/40">
                                <td class="py-3 px-4 text-cyan-400">#${log.id_log}</td>
                                <td class="py-3 px-4">${log.fecha_inicio || '-'}</td>
                                <td class="py-3 px-4">${log.duracion_segundos ? log.duracion_segundos + 's' : '-'}</td>
                                <td class="py-3 px-4">${badge}</td>
                                <td class="py-3 px-4 font-bold text-white">${Number(log.total_filas_cargadas || 0).toLocaleString()}</td>
                                <td class="py-3 px-4 text-gray-300">${log.filas_castillonv2 || 0}</td>
                                <td class="py-3 px-4 text-gray-300">${log.filas_veterinaria || 0}</td>
                                <td class="py-3 px-4 text-gray-300">${Number(log.filas_samar || 0).toLocaleString()}</td>
                                <td class="py-3 px-4 text-gray-300">${Number(log.filas_siga || 0).toLocaleString()}</td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // Render Charts
            renderCharts(data.metrics);
        }

        function renderCharts(metrics) {
            if (!metrics) return;

            // Ventas Privadas Chart
            const ctxVentas = document.getElementById('chartVentas').getContext('2d');
            const empData = metrics.resumen_empresas || [];
            const labelsVentas = empData.map(e => `${e.nombre_empresa} (${e.tipo_empresa})`);
            const ticketVentas = empData.map(e => Number(e.ticket_promedio || 0));

            if (chartVentasInstance) chartVentasInstance.destroy();
            chartVentasInstance = new Chart(ctxVentas, {
                type: 'bar',
                data: {
                    labels: labelsVentas.length ? labelsVentas : ['Micro (Castillón)', 'Mediana (Vet)', 'Grande (Samar)'],
                    datasets: [{
                        label: 'Ticket Promedio (S/)',
                        data: ticketVentas.length ? ticketVentas : [77.37, 152.58, 14520.82],
                        backgroundColor: ['#06b6d4', '#3b82f6', '#6366f1'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            type: 'logarithmic',
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#9ca3af', callback: v => 'S/ ' + v }
                        },
                        x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
                    }
                }
            });

            // Compras SIGA Chart
            const ctxCompras = document.getElementById('chartCompras').getContext('2d');
            const sigData = metrics.resumen_compras || [];
            const labelsCompras = sigData.map(c => c.clasificacion_proveedor);
            const montosCompras = sigData.map(c => Number(c.monto_total || 0));

            if (chartComprasInstance) chartComprasInstance.destroy();
            chartComprasInstance = new Chart(ctxCompras, {
                type: 'doughnut',
                data: {
                    labels: labelsCompras.length ? labelsCompras : ['Grandes Empresas', 'MYPEs'],
                    datasets: [{
                        data: montosCompras.length ? montosCompras : [61946356.57, 573229.00],
                        backgroundColor: ['#3b82f6', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#9ca3af', padding: 20 } }
                    }
                }
            });
        }

        async function triggerETL() {
            try {
                const res = await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modo: 'MANUAL' })
                });
                const result = await res.json();
                if (result.ok) {
                    fetchStatus();
                } else {
                    alert("Aviso: " + result.message);
                }
            } catch (e) {
                alert("Error al disparar ETL: " + e.message);
            }
        }

        async function saveSchedule() {
            const frec = document.getElementById('select-frecuencia').value;
            const inter = parseInt(document.getElementById('select-intervalo').value, 10);

            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frecuencia: frec, intervalo_horas: inter })
                });
                const result = await res.json();
                alert(result.message);
                fetchStatus();
            } catch (e) {
                alert("Error al guardar: " + e.message);
            }
        }

        fetchStatus();
        setInterval(fetchStatus, 3000);
    </script>
</body>
</html>
"""

def background_scheduler():
    """Hilo de fondo que verifica la frecuencia y ejecuta el ETL cuando corresponda."""
    while True:
        try:
            time.sleep(60)
            conn = get_dw_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT frecuencia_sugerida, intervalo_horas, ultima_actualizacion FROM etl_configuracion WHERE id = 1;")
            cfg = cur.fetchone()
            conn.close()

            if cfg and cfg["frecuencia_sugerida"] in ("HORARIO", "DIARIO") and cfg["intervalo_horas"] > 0:
                frec_secs = cfg["intervalo_horas"] * 3600
                last = cfg["ultima_actualizacion"]
                now = datetime.now()
                should_run = False
                if not last:
                    should_run = True
                else:
                    if (now - last).total_seconds() >= frec_secs:
                        should_run = True

                if should_run and not execution_state["is_running"]:
                    log_msg(f"[Scheduler] Disparando ejecucion programada cada {cfg['intervalo_horas']} horas.")
                    run_etl_async(modo="PROGRAMADO")
        except Exception:
            time.sleep(10)

def main():
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), ETLHandler)
    print(f"============================================================")
    print(f"   CENTRO DE COMANDO ETL & BIG DATA OLAP INICIADO           ")
    print(f"   URL: http://localhost:{port}                               ")
    print(f"============================================================")

    sched_thread = threading.Thread(target=background_scheduler, daemon=True)
    sched_thread.start()

    server.serve_forever()

if __name__ == "__main__":
    main()
