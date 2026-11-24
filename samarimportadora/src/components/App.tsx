import { useState } from "react";
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
import type {
  Venta,
  DetalleVenta,
} from "../types/database";

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
  fields: { label: string; name: string; type?: string; value?: any }[];
  onSave: (v: any) => void;
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
          <input
            type={f.type || "text"}
            value={v[f.name]}
            onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 font-normal outline-none focus:border-emerald-500"
          />
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
  kind: "clientes" | "articulos" | "vendedores" | "sucursales";
  title: string;
  description: string;
}) {
  const [store, setStore] = useStore();
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
          : [
              ["SUCURSAL_ID", "ID Sucursal"],
              ["NOMBRE_SUCURSAL", "Nombre sucursal"],
              ["COMUNA_ID", "ID Comuna"],
            ];
  const save = (v: any) => {
    const normalized = { ...v };
    for (const key of [
      "EDAD",
      "PRECIO_UNITARIO",
      "COSTO_UNITARIO",
      "ID_VENDEDOR",
      "HORAS_CAPACITACION",
      "SUCURSAL_ID",
      "COMUNA_ID",
    ])
      if (normalized[key] !== "") normalized[key] = Number(normalized[key]);
    const list = [...(store[kind] as any[])];
    const idx = editing
      ? list.findIndex(
          (x) => String(x[fields[0][0]]) === String(editing[fields[0][0]]),
        )
      : -1;
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
    setStore({ ...store, [kind]: list });
    setModal(false);
    setEditing(null);
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
                <button
                  onClick={() =>
                    setStore({
                      ...store,
                      [kind]: (store[kind] as any[]).filter((y) => y !== x),
                    })
                  }
                  className="text-red-500"
                >
                  <Trash2 size={16} />
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
            fields={fields.map((f) => ({
              name: f[0],
              label: f[1],
              value: editing?.[f[0]],
              type: [
                "EDAD",
                "PRECIO_UNITARIO",
                "COSTO_UNITARIO",
                "ID_VENDEDOR",
                "HORAS_CAPACITACION",
                "SUCURSAL_ID",
                "COMUNA_ID",
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

function Dashboard({ store, setStore }: { store: any; setStore: any }) {
  const total = store.ventas.reduce(
    (s: any, v: any) => s + (v.TOTAL_DOCUMENTO || 0),
    0,
  );
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    name: [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ][i],
    total: store.ventas
      .filter((v: any) => new Date(v.FECHA).getMonth() === i)
      .reduce((s: any, v: any) => s + (v.TOTAL_DOCUMENTO || 0), 0),
  }));
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
          value={store.ventas.length}
          icon={<Receipt size={18} />}
        />
        <StatCard
          label="Importe vendido"
          value={money(total)}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Clientes"
          value={store.clientes.length}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Artículos"
          value={store.articulos.length}
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

function Sales({ store, setStore }: { store: any; setStore: any }) {
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

function NewSale({ store, setStore }: { store: any; setStore: any }) {
  const [doc, setDoc] = useState(
    `VTA-${String(store.ventas.length + 1).padStart(4, "0")}`,
  );
  const [client, setClient] = useState(store.clientes[0]?.ID_CLIENTE || "");
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
  const save = () => {
    if (
      !doc ||
      !client ||
      !lines.length ||
      lines.some((l) => l.CANTIDAD <= 0 || l.PRECIO_UNITARIO < 0)
    )
      return;
    const v: Venta = {
      DOCUMENTO: doc,
      FECHA: new Date().toISOString(),
      ID_CLIENTE: client,
      TIPO_DOCUMENTO: "Factura",
      ID_VENDEDOR: 1,
      TOTAL_NETO: totals.TOTAL_NETO,
      IMPUESTO: totals.IMPUESTO,
      TOTAL_DOCUMENTO: totals.TOTAL_DOCUMENTO,
      SUCURSAL_ID: 1,
    };
    const ds: DetalleVenta[] = lines.map((l) => ({
      ...l,
      DOCUMENTO: doc,
      TOTAL: lineTotal(l.PRECIO_UNITARIO, l.CANTIDAD),
    }));
    setStore({
      ...store,
      ventas: [...store.ventas, v],
      detalleVentas: [...store.detalleVentas, ...ds],
    });
    location.href = "/ventas";
  };
  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="El impuesto es un supuesto configurable de demostración (18%)"
      />
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-600">
            DOCUMENTO
            <input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            ID_CLIENTE
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
            TIPO_DOCUMENTO
            <select className="mt-1 w-full rounded-lg border border-slate-200 p-2.5">
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
  const chart = store.ventas.reduce((a: any, v: any) => {
    const k = v.ID_VENDEDOR;
    a[k] = (a[k] || 0) + (v.TOTAL_DOCUMENTO || 0);
    return a;
  }, {});
  const data = Object.entries(chart)
    .slice(0, 10)
    .map(([name, total]) => ({ name: `Vendedor ${name}`, total }));
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
              Documentos: <b>{store.ventas.length}</b>
            </p>
            <p>
              Ingresos:{" "}
              <b>
                {money(
                  store.ventas.reduce(
                    (s: any, v: any) => s + v.TOTAL_DOCUMENTO,
                    0,
                  ),
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
  const [store, setStore] = useStore();
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
      <ReadOnly
        kind="prospectos"
        title="Prospectos"
        description="Datos ficticios de contacto y preferencias"
        headers={["ID", "Nombre", "EMAIL", "ORIGEN"]}
      />
    ) : path === "/clientes-buey" ? (
      <ReadOnly
        kind="clientesBuey"
        title="ClientesBuey"
        description="Segmento de consulta con datos personales y preferencias ficticios"
        headers={["ID", "Nombre", "FIDELIDAD", "PREFERENCIA COLOR"]}
      />
    ) : path === "/ventas" ? (
      <Sales store={store} setStore={setStore} />
    ) : path === "/ventas/nueva" ? (
      <NewSale store={store} setStore={setStore} />
    ) : path === "/reportes" ? (
      <Reports store={store} />
    ) : path === "/geografia" ? (
      <Geo store={store} />
    ) : (
      <Dashboard store={store} setStore={setStore} />
    );
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
