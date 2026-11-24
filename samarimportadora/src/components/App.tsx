import { useEffect, useState } from "react";
import {
  Plus,
  Users,
  Package,
  Receipt,
  TrendingUp,
  Trash2,
  Edit3,
  Eye,
  Save,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Button from "./ui/Button";
import SearchInput from "./ui/SearchInput";
import StatCard from "./ui/StatCard";
import DataTable from "./ui/DataTable";
import Modal from "./ui/Modal";
import PageHeader from "./layout/PageHeader";
import { useStore } from "../hooks/useLocalStorage";
import { money, date } from "../utils/formatters";
import { lineTotal, saleTotals } from "../utils/calculations";

const Card = ({ children }: { children: any }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    {children}
  </div>
);
function Form({
  fields,
  onSave,
  onCancel,
}: {
  fields: { label: string; name: string; type?: string; value?: any; options?: { value: string | number; label: string }[] }[];
  onSave: (v: any) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<any>(
    Object.fromEntries(fields.map((f) => [f.name, f.value ?? ""])),
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.name} className="text-sm font-medium text-slate-600">
          {f.label}
          {f.options ? <select value={v[f.name]} required onChange={(e) => setV({ ...v, [f.name]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 font-normal"> <option value="">Seleccione…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input type={f.type || "text"} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 font-normal outline-none focus:border-emerald-500" />}
        </label>
      ))}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button
          type="button"
          onClick={onCancel}
          className="border border-slate-200 bg-white text-slate-600"
        >
          Cancelar
        </Button>
        <Button type="button" onClick={() => onSave(v)}>
          <Save size={16} className="mr-2 inline" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
function CrudPage({
  kind,
  title,
  description,
}: {
  kind: "clientes" | "articulos" | "vendedores" | "sucursales" | "prospectos" | "clientesBuey";
  title: string;
  description: string;
}) {
  const [store, , state] = useStore();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const data = (store[kind] as any[]).filter((x) =>
    JSON.stringify(x).toLowerCase().includes(q.toLowerCase()),
  );
  const fields =
    kind === "clientes"
      ? [
          ["ID_CLIENTE", "ID Cliente"],
          ["NOMBRE", "Nombre"],
          ["APELLIDO", "Apellido"],
          ["EDAD", "Edad"],
          ["ESTADO_CIVIL", "Estado civil"],
          ["RESIDENCIA", "Residencia"],
          ["ORIGEN", "Origen"],
        ]
      : kind === "articulos"
        ? [
            ["CODIGO_PRODUCTO", "Código"],
            ["NOMBRE", "Nombre"],
            ["CATEGORIA", "Categoría"],
            ["PRECIO_UNITARIO", "Precio unitario"],
            ["COSTO_UNITARIO", "Costo unitario"],
          ]
        : kind === "vendedores"
          ? [
              ["ID_VENDEDOR", "ID Vendedor"],
              ["Nombre", "Nombre"],
              ["Apellido", "Apellido"],
              ["TIPO_ CAPACITACION", "Tipo capacitación"],
              ["HORAS_CAPACITACION", "Horas capacitación"],
            ]
          : kind === "sucursales" ? [
              ["SUCURSAL_ID", "ID Sucursal"],
              ["NOMBRE_SUCURSAL", "Nombre sucursal"],
              ["COMUNA_ID", "ID Comuna"],
            ] : kind === "prospectos" ? [
              ["NRO_CLIENTE", "N.º interno"], ["ID_CLIENTE", "Código comercial"], ["NOMBRE", "Nombre"], ["APELLIDO", "Apellido"], ["EMAIL", "Email"], ["EDAD", "Edad"], ["RESIDENCIA", "Residencia"], ["ORIGEN", "Origen"], ["FIDELIDAD", "Fidelidad"],
            ] : [
              ["ID_CLIENTE", "ID Cliente"], ["NOMBRE", "Nombre"], ["APELLIDO", "Apellido"], ["EDAD", "Edad"], ["LUGAR ORIGEN", "Lugar de origen"], ["PREFERENCIA COLOR", "Color preferido"], ["TIPO DE COMIDA", "Tipo de comida"], ["ESTADO CIVIL", "Estado civil"], ["CANTIDAD DE HIJOS", "Cantidad de hijos"], ["FIDELIDAD", "Fidelidad"], ["COMPRABUEY", "Compra Buey"],
            ];
  const [message, setMessage] = useState("");
  const save = async (v: any) => {
    const normalized = { ...v };
    for (const key of [
      "EDAD",
      "PRECIO_UNITARIO",
      "COSTO_UNITARIO",
      "ID_VENDEDOR",
      "HORAS_CAPACITACION",
      "SUCURSAL_ID",
      "COMUNA_ID",
      "NRO_CLIENTE",
      "CANTIDAD DE HIJOS",
    ])
      if (normalized[key] !== "") normalized[key] = Number(normalized[key]);
    setMessage("");
    const response = await fetch('/api/data', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: kind, row: normalized, id: editing?.[fields[0][0]] }) });
    const result = await response.json();
    if (!response.ok || !result.ok) { setMessage(result.error || 'No se pudo guardar'); return; }
    await state.reload(); setModal(false); setEditing(null); setMessage('Registro guardado en PostgreSQL');
  };
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={17} className="mr-2 inline" />
            Nuevo registro
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput value={q} onChange={setQ} />
      </div>
      {message && <p className={`mb-4 rounded-lg p-3 text-sm ${message.includes('guardado') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message}</p>}
      <DataTable
        headers={fields.map((f) => f[1]).concat(["Acciones"])}
        rows={data.map((x: any) =>
          fields
            .map((f) => <span>{x[f[0]] ?? "—"}</span>)
            .concat(
              <span className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(x);
                    setModal(true);
                  }}
                  className="text-emerald-700"
                >
                  <Edit3 size={16} />
                </button>
              </span>,
            ),
        )}
      />
      {modal && (
        <Modal
          title={editing ? "Editar registro" : "Nuevo registro"}
          onClose={() => {
            setModal(false);
            setEditing(null);
          }}
        >
          <Form
            fields={fields.slice(1).map((f) => ({
              name: f[0],
              label: f[1],
              value: editing?.[f[0]],
              options: kind === 'sucursales' && f[0] === 'COMUNA_ID' ? store.comunas.map((c) => ({ value: c.COMUNA_ID, label: c.COMUNA_NOMBRE || String(c.COMUNA_ID) })) : undefined,
              type: [
                "EDAD",
                "PRECIO_UNITARIO",
                "COSTO_UNITARIO",
                "ID_VENDEDOR",
                "HORAS_CAPACITACION",
                "SUCURSAL_ID",
                "COMUNA_ID",
                "NRO_CLIENTE",
                "CANTIDAD DE HIJOS",
              ].includes(f[0])
                ? "number"
                : undefined,
            }))}
            onSave={save}
            onCancel={() => setModal(false)}
          />
        </Modal>
      )}
    </>
  );
}

function Dashboard({ store }: { store: any }) {
  const [metrics, setMetrics] = useState<any>({ summary: { ventas: 0, total: 0, clientes: 0, articulos: 0 }, monthly: [] });
  useEffect(() => { fetch('/api/dashboard').then((r) => r.json()).then((result) => { if (result.ok) setMetrics(result.data); }); }, []);
  const monthly = metrics.monthly.map((row: any) => ({ name: row.periodo, total: Number(row.total) }));
  return (
    <>
      <PageHeader
        title="Resumen general"
        description="Indicadores de operación y ventas de demostración"
        action={
          <Button onClick={() => (location.href = "/ventas/nueva")}>
            <Plus size={17} className="mr-2 inline" />
            Nueva venta
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de ventas"
          value={metrics.summary.ventas}
          icon={<Receipt size={18} />}
        />
        <StatCard
          label="Importe vendido"
          value={money(Number(metrics.summary.total))}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Clientes"
          value={metrics.summary.clientes}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Artículos"
          value={metrics.summary.articulos}
          icon={<Package size={18} />}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Evolución mensual</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: any) => money(v)} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#059669"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Últimas ventas</h2>
          <div className="space-y-3">
            {store.ventas
              .slice(-5)
              .reverse()
              .map((v: any) => (
                <div className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                  <span>
                    <b>{v.DOCUMENTO}</b>
                    <br />
                    <small className="text-slate-400">{date(v.FECHA)}</small>
                  </span>
                  <strong>{money(v.TOTAL_DOCUMENTO)}</strong>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Sales({ store }: { store: any }) {
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const rows = store.ventas.filter((v: any) =>
    v.DOCUMENTO.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Ventas"
        description="Consulta de documentos y totales"
        action={
          <Button onClick={() => (location.href = "/ventas/nueva")}>
            <Plus size={17} className="mr-2 inline" />
            Nueva venta
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por documento"
        />
      </div>
      <DataTable
        headers={[
          "Documento",
          "Fecha",
          "Cliente",
          "Tipo",
          "Vendedor",
          "Total",
          "Detalle",
        ]}
        rows={rows.map((v: any) => [
          v.DOCUMENTO,
          date(v.FECHA),
          v.ID_CLIENTE,
          v.TIPO_DOCUMENTO,
          `#${v.ID_VENDEDOR}`,
          money(v.TOTAL_DOCUMENTO),
          <button onClick={() => setDetail(v)} className="text-emerald-700">
            <Eye size={17} />
          </button>,
        ])}
      />
      {detail && (
        <Modal
          title={`Detalle ${detail.DOCUMENTO}`}
          onClose={() => setDetail(null)}
        >
          <p className="mb-4 text-sm text-slate-500">
            {date(detail.FECHA)} · {detail.TIPO_DOCUMENTO} · Cliente{" "}
            {detail.ID_CLIENTE}
          </p>
          <div className="space-y-2">
            {store.detalleVentas
              .filter((d: any) => d.DOCUMENTO === detail.DOCUMENTO)
              .map((d: any) => (
                <div className="flex justify-between text-sm">
                  <span>
                    {d.CODIGO_PRODUCTO} × {d.CANTIDAD}
                  </span>
                  <b>{money(d.TOTAL)}</b>
                </div>
              ))}
          </div>
          <div className="mt-5 border-t pt-3 text-right font-bold">
            {money(detail.TOTAL_DOCUMENTO)}
          </div>
        </Modal>
      )}
    </>
  );
}

function NewSale({ store }: { store: any }) {
  const [client, setClient] = useState(store.clientes[0]?.ID_CLIENTE || "");
  const [seller, setSeller] = useState(store.vendedores[0]?.ID_VENDEDOR || "");
  const [branch, setBranch] = useState(store.sucursales[0]?.SUCURSAL_ID || "");
  const [documentType, setDocumentType] = useState("Factura");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!client && store.clientes[0]) setClient(store.clientes[0].ID_CLIENTE); if (!seller && store.vendedores[0]) setSeller(store.vendedores[0].ID_VENDEDOR); if (!branch && store.sucursales[0]) setBranch(store.sucursales[0].SUCURSAL_ID); }, [store, client, seller, branch]);
  const [lines, setLines] = useState<any[]>([
    {
      CODIGO_PRODUCTO: store.articulos[0]?.CODIGO_PRODUCTO,
      CANTIDAD: 1,
      PRECIO_UNITARIO: store.articulos[0]?.PRECIO_UNITARIO || 0,
    },
  ]);
  const totals = saleTotals(lines);
  const add = () =>
    setLines([
      ...lines,
      {
        CODIGO_PRODUCTO: store.articulos[0]?.CODIGO_PRODUCTO,
        CANTIDAD: 1,
        PRECIO_UNITARIO: store.articulos[0]?.PRECIO_UNITARIO || 0,
      },
    ]);
  const save = async () => {
    if (
      !client ||
      !seller ||
      !branch ||
      !lines.length ||
      lines.some((l) => l.CANTIDAD <= 0 || l.PRECIO_UNITARIO < 0)
    ) { setMessage('Complete cliente, vendedor, sucursal y detalle válido'); return; }
    setMessage('');
    const response = await fetch('/api/ventas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID_CLIENTE: client, ID_VENDEDOR: seller, SUCURSAL_ID: branch, TIPO_DOCUMENTO: documentType, lines: lines.map(({ CODIGO_PRODUCTO, CANTIDAD }) => ({ CODIGO_PRODUCTO, CANTIDAD })) }) });
    const result = await response.json();
    if (!response.ok || !result.ok) { setMessage(result.error || 'No se pudo guardar la venta'); return; }
    location.href = "/ventas";
  };
  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="El impuesto es un supuesto configurable de demostración (18%)"
      />
      <Card>
        {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-600">
            Cliente
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
            >
              {store.clientes.map((c: any) => (
                <option value={c.ID_CLIENTE}>
                  {c.ID_CLIENTE} · {c.NOMBRE} {c.APELLIDO}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Vendedor
            <select value={seller} onChange={(e) => setSeller(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5">
              {store.vendedores.map((v: any) => <option key={v.ID_VENDEDOR} value={v.ID_VENDEDOR}>{v.Nombre} {v.Apellido}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Sucursal
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5">
              {store.sucursales.map((s: any) => <option key={s.SUCURSAL_ID} value={s.SUCURSAL_ID}>{s.NOMBRE_SUCURSAL}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Tipo de documento
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5">
              <option>Factura</option>
              <option>Boleta</option>
            </select>
          </label>
        </div>
        <h2 className="mb-3 mt-8 font-semibold">Detalle de venta</h2>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div className="grid items-end gap-3 sm:grid-cols-4">
              <label className="text-xs text-slate-500 sm:col-span-2">
                Artículo
                <select
                  value={l.CODIGO_PRODUCTO}
                  onChange={(e) => {
                    const a = store.articulos.find(
                      (x: any) => x.CODIGO_PRODUCTO === e.target.value,
                    );
                    const z = [...lines];
                    z[i] = {
                      ...z[i],
                      CODIGO_PRODUCTO: e.target.value,
                      PRECIO_UNITARIO: a.PRECIO_UNITARIO,
                    };
                    setLines(z);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm"
                >
                  {store.articulos.map((a: any) => (
                    <option value={a.CODIGO_PRODUCTO}>
                      {a.CODIGO_PRODUCTO} · {a.NOMBRE}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Cantidad
                <input
                  type="number"
                  min="1"
                  value={l.CANTIDAD}
                  onChange={(e) => {
                    const z = [...lines];
                    z[i] = { ...z[i], CANTIDAD: Number(e.target.value) };
                    setLines(z);
                  }}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {money(lineTotal(l.PRECIO_UNITARIO, l.CANTIDAD))}
                </span>
                <button
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  className="text-red-500"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={add}
          className="mt-4 border border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          + Agregar línea
        </Button>
        <div className="mt-8 ml-auto max-w-xs space-y-2 border-t border-slate-200 pt-4 text-right text-sm">
          <div className="flex gap-2 items-center justify-between">
            <span>Neto:</span>
            <b>{money(totals.TOTAL_NETO)}</b>
          </div>
          <div className="flex gap-2 items-center justify-between">
            <span>Impuesto 18%:</span> 
            <b>{money(totals.IMPUESTO)}</b>
          </div>
          <div className="text-lg flex gap-2 items-center justify-between">
            <span>Total:</span> 
            <b>{money(totals.TOTAL_DOCUMENTO)}</b>
          </div>
          <Button onClick={save} className="mt-3 w-full bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 duration-100">
            Guardar venta
          </Button>
        </div>
      </Card>
    </>
  );
}

function ReadOnly({
  kind,
  title,
  headers,
  description,
}: {
  kind: "prospectos" | "clientesBuey";
  title: string;
  headers: string[];
  description: string;
}) {
  const [store] = useStore();
  const [q, setQ] = useState("");
  const data = (store[kind] as any[]).filter((x) =>
    JSON.stringify(x).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="mb-4 max-w-md">
        <SearchInput value={q} onChange={setQ} />
      </div>
      <DataTable
        headers={headers}
        rows={data.map((x: any) =>
          headers.map((h, i) =>
            i === 0
              ? x.ID_CLIENTE || x.NRO_CLIENTE
              : i === 1
                ? `${x.NOMBRE || ""} ${x.APELLIDO || ""}`
                : (x[h] ?? x[["EMAIL", "ORIGEN", "FIDELIDAD"][i - 2]] ?? "—"),
          ),
        )}
      />
    </>
  );
}
function Reports({ store }: { store: any }) {
  const [metrics, setMetrics] = useState<any>({ summary: { ventas: 0, total: 0 }, sellers: [] });
  useEffect(() => { fetch('/api/dashboard').then((r) => r.json()).then((result) => { if (result.ok) setMetrics(result.data); }); }, []);
  const data = metrics.sellers.map((row: any) => ({ name: row.nombre || `Vendedor ${row.ID_VENDEDOR}`, total: Number(row.total) }));
  return (
    <>
      <PageHeader
        title="Reportes comerciales"
        description="Indicadores calculados sobre los datos guardados"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Ventas por vendedor</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Resumen</h2>
          <div className="space-y-4 text-sm">
            <p>
              Documentos: <b>{metrics.summary.ventas}</b>
            </p>
            <p>
              Ingresos:{" "}
              <b>
                {money(
                  Number(metrics.summary.total),
                )}
              </b>
            </p>
            <p>
              Artículos vendidos:{" "}
              <b>
                {store.detalleVentas.reduce(
                  (s: any, d: any) => s + d.CANTIDAD,
                  0,
                )}
              </b>
            </p>
            <p>Detalle de impuesto: supuesto 18% para demostración.</p>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function App() {
  const [store, , state] = useStore();
  const path = typeof window === "undefined" ? "/" : location.pathname;
  const view =
    path === "/clientes" ? (
      <CrudPage
        kind="clientes"
        title="Clientes"
        description="Gestión de clientes y sus datos de contacto"
      />
    ) : path === "/articulos" ? (
      <CrudPage
        kind="articulos"
        title="Artículos"
        description="Catálogo de productos de la importadora"
      />
    ) : path === "/vendedores" ? (
      <CrudPage
        kind="vendedores"
        title="Vendedores"
        description="Equipo comercial y capacitación"
      />
    ) : path === "/sucursales" ? (
      <CrudPage
        kind="sucursales"
        title="Sucursales"
        description="Puntos de atención relacionados a geografía"
      />
    ) : path === "/prospectos" ? (
      <CrudPage
        kind="prospectos"
        title="Prospectos"
        description="Registro y edición de prospectos"
      />
    ) : path === "/clientes-buey" ? (
      <CrudPage
        kind="clientesBuey"
        title="ClientesBuey"
        description="Registro y edición del segmento ClientesBuey"
      />
    ) : path === "/ventas" ? (
      <Sales store={store} />
    ) : path === "/ventas/nueva" ? (
      <NewSale store={store} />
    ) : path === "/reportes" ? (
      <Reports store={store} />
    ) : path === "/geografia" ? (
      <Geo store={store} />
    ) : (
      <Dashboard store={store} />
    );
  if (state.loading) return <Card><p className="text-slate-600">Cargando datos desde PostgreSQL…</p></Card>;
  if (state.error) return <Card><h2 className="font-semibold text-red-700">No se pudo conectar con PostgreSQL</h2><p className="mt-2 text-sm text-slate-600">{state.error}</p><Button className="mt-4" onClick={() => state.reload()}>Reintentar</Button></Card>;
  return view;
}
function Geo({ store }: { store: any }) {
  return (
    <>
      <PageHeader
        title="Geografía"
        description="Jerarquía región → provincia → comuna → sucursal"
      />
      <DataTable
        headers={["Región", "Provincia", "Comuna", "Sucursal"]}
        rows={store.comunas.map((c: any) => {
          const p = store.provincias.find(
              (x: any) => x.PROVINCIA_ID === c.PROVINCIA_ID,
            ),
            r = store.regiones.find((x: any) => x.REGION_ID === p?.REGION_ID),
            s = store.sucursales.find((x: any) => x.COMUNA_ID === c.COMUNA_ID);
          return [
            r?.REGION,
            p?.PROVINCIA_NOMBRE,
            c.COMUNA_NOMBRE,
            s?.NOMBRE_SUCURSAL || "—",
          ];
        })}
      />
    </>
  );
}
