import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  Menu,
  X,
  Download,
  CheckCircle2,
} from "lucide-react";

import { list, create } from "../data/repositories/mockRepository";
import { tableDefinitions, type MockRow } from "../data/mock/generators";
import Sidebar from "./layout/Sidebar";
import DataTable from "./data/DataTable";

import { modules } from "../config/modules";
import Dashboard from "./layout/Dashboard";
import { relatedTables } from "@/utils/relatedTables";
import RelatedView from "./layout/RelatedView";

const currentPath = () =>
  typeof window === "undefined"
    ? "dashboard"
    : window.location.pathname.split("/")[1] || "dashboard";

export default function SigaApp() {
  const [path, setPath] = useState(currentPath());
  const [rows, setRows] = useState<MockRow[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "related" | "trace">("list");
  const [selectedRow, setSelectedRow] = useState<MockRow | null>(null);
  const [notice, setNotice] = useState("");

  const mod = modules.find((m) => m.path === path);
  const dashboard = path === "dashboard";

  useEffect(() => {
    setActiveTab("list");
    setSelectedRow(null);
    if (mod) list(mod.table).then(setRows);
  }, [path]);
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      ),
    [rows, query],
  );

  const shown = filtered.slice((page - 1) * 8, page * 8);

  const navigate = (p: string) => {
    window.history.pushState({}, "", p === "dashboard" ? "/" : `/${p}`);
    setPath(p);
    setQuery("");
    setPage(1);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const f = () => setPath(currentPath());
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);

  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!mod) return;

    const data = new FormData(e.currentTarget);

    const fields = tableDefinitions.find((x) => x[0] === mod.table)?.[1] ?? [
      "NOMBRE",
    ];

    const row: MockRow = {};

    fields.forEach((f) => {
      row[f] = String(data.get(f) || `Nuevo registro ${rows.length + 1}`);
    });

    await create(mod.table, row);

    setRows(await list(mod.table));
    setCreateModalOpen(false);
    setNotice("Registro guardado en la persistencia local");
    setTimeout(() => setNotice(""), 2500);
  };

  return (
    <div className="app">
      <Sidebar activePath={path} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X /> : <Menu />}
          </button>
          <div className="crumb">
            SIGA 1646 <ChevronRight size={14} />
            <span>{dashboard ? "Panel principal" : mod?.label}</span>
          </div>
          <div className="top-actions">
            <span className="demo-pill">● Datos de demostración</span>
            <div className="avatar">AD</div>
          </div>
        </header>
        <div className="content">
          {dashboard ? (
            <Dashboard navigate={navigate} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">{mod?.group} / Módulo</div>
                  <h1>{mod?.label}</h1>
                  <p>{mod?.description}</p>
                </div>
                {mod?.canCreate && (
                    <button className="primary" onClick={() => setCreateModalOpen(true)}>
                    <Plus size={17} /> Nuevo registro
                  </button>
                )}
              </div>

              <div className="tabs" role="tablist">
                <button className={`tab ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>Listado principal</button>
                {relatedTables[mod?.table || ""] && <button className={`tab ${activeTab === "related" ? "active" : ""}`} onClick={() => setActiveTab("related")}>Detalle relacionado</button>}
                <button className={`tab ${activeTab === "trace" ? "active" : ""}`} onClick={() => setActiveTab("trace")}>Trazabilidad</button>
              </div>

              <div className="panel">
                {activeTab === "list" && <div className="toolbar">
                  <div className="search">
                    <Search size={17} />
                    <input
                      aria-label="Buscar"
                      placeholder="Buscar en registros..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <span className="muted">
                    {filtered.length} registros mock
                  </span>
                  <button className="secondary" onClick={() => exportCsv(filtered, mod?.table || "exportacion")}>
                    <Download size={16} /> Exportar CSV
                  </button>
                </div>}
                {activeTab === "list" && <DataTable rows={shown} table={mod?.table || ""} onSelect={setSelectedRow} />}
                {activeTab === "related" && <RelatedView row={selectedRow} module={mod} />}
                {activeTab === "trace" && <TraceView table={mod?.table || ""} />}
                {activeTab === "list" && <div className="pagination">
                  <span>
                    Mostrando {shown.length ? (page - 1) * 8 + 1 : 0}–
                    {Math.min(page * 8, filtered.length)} de {filtered.length}
                  </span>
                  <div>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      disabled={page * 8 >= filtered.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>}
              </div>
            </>
          )}{" "}
        </div>
      </main>

      {createModalOpen && mod && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={add}>
            <div className="modal-head">
              <div>
                <h2>{mod.table === "SIG_CONTRATOS" ? "Nuevo contrato" : "Nuevo registro"}</h2>
                <p>{mod.table}</p>
              </div>
              <button type="button" onClick={() => setCreateModalOpen(false)}>
                <X />
              </button>
            </div>
            <div className="form-grid">
              {(
                tableDefinitions.find((x) => x[0] === mod.table)?.[1] || [
                  "NOMBRE",
                ]
              )
                .slice(0, 6)
                .map((f) => {
                  const isContract = mod.table === "SIG_CONTRATOS";
                  const labels: Record<string, string> = {
                    ANO_EJE: "Año de ejecución",
                    SEC_EJEC: "Unidad ejecutora",
                    TIPO_CONTRATO: "Tipo de contrato",
                    NRO_CONTRATO: "Número de contrato",
                    TIPO_BIEN: "Tipo de bien",
                  };

                  return (
                    <label key={f}>
                      {isContract ? labels[f] : f}
                      {isContract && (f === "TIPO_CONTRATO" || f === "TIPO_BIEN") ? (
                        <select name={f} required defaultValue="">
                          <option value="" disabled>Seleccione una opción</option>
                          <option value="B">Bien</option>
                          <option value="S">Servicio</option>
                        </select>
                      ) : (
                        <input
                          name={f}
                          type={isContract && (f === "ANO_EJE" || f === "SEC_EJEC") ? "number" : "text"}
                          min={isContract && f === "ANO_EJE" ? 2000 : undefined}
                          max={isContract && f === "ANO_EJE" ? 2100 : undefined}
                          placeholder={isContract ? `Ingrese ${labels[f].toLowerCase()}` : `Ingrese ${f.toLowerCase()}`}
                          required={
                            isContract ||
                            f === tableDefinitions.find((x) => x[0] === mod.table)?.[1][0]
                          }
                        />
                      )}
                    </label>
                  );
                })}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="primary">Guardar registro</button>
            </div>
          </form>
        </div>
      )}

      {notice && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function exportCsv(rows: MockRow[], fileName: string) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function TraceView({ table }: { table: string }) {
  return <div className="trace-list">{[["Consulta inicial", "Usuario DEMO", "2026-01-15 09:30"], ["Registro de demostración", "Usuario DEMO", "2026-01-15 09:31"], ["Última sincronización mock", "Sistema local", "2026-01-15 09:32"]].map(([action, actor, date]) => <div className="trace-row" key={action}><CheckCircle2 size={17} /><div><strong>{action}</strong><small>{table} · {actor} · {date}</small></div></div>)}</div>;
}

