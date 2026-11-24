import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Menu,
  Package,
  PawPrint,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import type {
  DB,
  CITA,
  MASCOTA,
  PRODUCTO,
  FICHA_CLINICA,
} from "@/types/domain";
import { loadDB, nextId, saveDB } from "@/services/storage";
import { seedDB } from "@/data/seed";

const money = (n: number | string | null | undefined) => {
  const num = typeof n === "number" ? n : parseFloat(String(n ?? 0));
  const val = isNaN(num) ? 0 : num;
  return `S/ ${val.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const date = (s: string | null | undefined) => {
  if (!s) return "—";
  try {
    const str = String(s).trim();
    const d = str.includes("T") || str.includes("Z") ? new Date(str) : new Date(`${str}T12:00:00`);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("es-PE");
  } catch {
    return String(s);
  }
};

const status: Record<string, string> = {
  P: "Programada",
  C: "Confirmada",
  A: "Atendida",
  X: "Cancelada",
  CONFIRMADA: "Confirmada",
  PENDIENTE: "Pendiente",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
};

const nav = [
  { label: "Inicio", path: "/", icon: LayoutDashboard },
  { label: "Clientes", path: "/clientes", icon: Users },
  { label: "Mascotas", path: "/mascotas", icon: PawPrint },
  { label: "Agenda de citas", path: "/citas", icon: CalendarDays },
  { label: "Historia clínica", path: "/historia-clinica", icon: Stethoscope },
  { label: "Inventario", path: "/inventario", icon: Package },
  { label: "Compras", path: "/compras", icon: ShoppingCart },
  { label: "Ventas", path: "/ventas", icon: DollarSign },
  { label: "Caja", path: "/caja", icon: ClipboardList },
  { label: "Promociones", path: "/promociones", icon: Settings },
  { label: "Personal y seguridad", path: "/personal", icon: Users },
  { label: "Reportes", path: "/reportes", icon: ClipboardList },
];

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${value === "Cancelada" ? "badge-red" : value === "Atendida" || value === "Confirmada" || value === "Abierta" ? "badge-green" : "badge-blue"}`}
    >
      {status[value] ?? value}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function Select({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <PawPrint size={28} />
      <p>{text}</p>
    </div>
  );
}

function Dashboard({ db, go }: { db: DB; go: (p: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const cards = [
    {
      label: "Ventas del periodo",
      value: money(
        (db.VENTA || []).reduce(
          (s, v) => s + (Number(v.TOTAL) || 0),
          0,
        ),
      ),
      icon: DollarSign,
      tint: "blue",
    },
    {
      label: "Citas programadas",
      value: (db.CITA || []).filter((c) => c.ESTADO_CITA === "P").length,
      icon: CalendarDays,
      tint: "violet",
    },
    {
      label: "Pacientes activos",
      value: (db.MASCOTA || []).length,
      icon: PawPrint,
      tint: "green",
    },
    {
      label: "Alertas de stock",
      value: (db.PRODUCTO || []).filter((p) => (Number(p.STOCK) || 0) <= (Number(p.STOCK_MINIMO) || 15)).length,
      icon: Package,
      tint: "orange",
    },
  ];

  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">MIÉRCOLES, 18 DE NOVIEMBRE DE 2026</p>
          <h1>Buenos días, equipo 👋</h1>
          <p className="muted">
            Aquí tienes un resumen de la operación de hoy.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => go("/citas")}>
          <Plus size={17} /> Nueva cita
        </button>
      </div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-icon ${c.tint}`}>
              <c.icon size={20} />
            </div>
            <div>
              <p>{c.label}</p>
              <strong>{c.value}</strong>
              <small>Actualizado ahora</small>
            </div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Agenda de hoy</h2>
              <p className="muted">Próximas atenciones</p>
            </div>
            <button className="text-btn" onClick={() => go("/citas")}>
              Ver agenda <ChevronRight size={15} />
            </button>
          </div>
          {(db.CITA || []).slice(0, 5).map((c) => {
            const pet = (db.MASCOTA || []).find((m) => m.IDMASCOTA === c.IDMASCOTA);
            const owner = (db.PERSONA || []).find((p) => p.IDPERSONA === pet?.IDPERSONA);
            const petName = pet?.NOMBRE || `Mascota #${c.IDMASCOTA}`;
            const ownerName = owner ? `${owner.NOMBRES || ''} ${owner.APELLIDOS || ''}`.trim() : 'Cliente general';
            return (
              <div className="appointment" key={c.IDCITA}>
                <div className="time">{c.HORA}</div>
                <div className="avatar">
                  {petName[0] ?? "M"}
                </div>
                <div className="grow">
                  <strong>{petName}</strong>
                  <span>{c.MOTIVO} · {ownerName}</span>
                </div>
                <Badge value={c.ESTADO_CITA} />
              </div>
            );
          })}
        </section>
        
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Productos por reponer</h2>
              <p className="muted">Stock bajo el mínimo definido</p>
            </div>
            <button className="text-btn" onClick={() => go("/inventario")}>
              Ver inventario <ChevronRight size={15} />
            </button>
          </div>
          {(db.PRODUCTO || [])
            .filter((p) => (Number(p.STOCK) || 0) <= (Number(p.STOCK_MINIMO) || 15))
            .slice(0, 5)
            .map((p) => (
              <div className="stock-row" key={p.IDPRODUCTO}>
                <div className="product-dot">
                  <Package size={16} />
                </div>
                <div className="grow">
                  <strong>{p.NOMBRE || ('Producto #' + p.IDPRODUCTO)}</strong>
                  <span>SKU {p.CODIGO} · Mínimo: {p.STOCK_MINIMO || 15}</span>
                </div>
                <span className="stock-low">{p.STOCK} und.</span>
              </div>
            ))}
        </section>
      </div>
    </>
  );
}

function Listing({
  db,
  setDb,
  section,
}: {
  db: DB;
  setDb: (d: DB) => void;
  section: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const size = 8;
  const [form, setForm] = useState<Record<string, string>>({});
  const update = (patch: Partial<DB>) => {
    const d = { ...db, ...patch };
    setDb(d);
    saveDB(d);
  };
  const title =
    section === "clientes"
      ? "Clientes"
      : section === "mascotas"
        ? "Mascotas"
        : section === "citas"
          ? "Agenda de citas"
          : section === "historia-clinica"
            ? "Historia clínica"
            : section === "inventario"
              ? "Inventario"
              : section === "ventas"
                ? "Ventas"
                : section === "compras"
                  ? "Compras"
                  : section === "caja"
                    ? "Caja"
                    : section === "promociones"
                      ? "Promociones"
                      : "Personal y seguridad";
  const rows =
    section === "clientes"
      ? (db.CLIENTE || [])
      : section === "mascotas"
        ? (db.MASCOTA || [])
        : section === "citas"
          ? (db.CITA || [])
          : section === "historia-clinica"
            ? (db.FICHA_CLINICA || [])
            : section === "inventario"
              ? (db.PRODUCTO || [])
              : section === "ventas"
                ? (db.VENTA || [])
                : section === "compras"
                  ? (db.COMPRA || [])
                  : section === "caja"
                    ? (db.APERTURA_CIERRE_CAJA || [])
                    : section === "promociones"
                      ? (db.PROMOCION || [])
                      : (db.EMPLEADO || []);
  const filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  const shown = filtered.slice((page - 1) * size, page * size);
  const person = (id: number) => (db.PERSONA || []).find((p) => p.IDPERSONA === id);
  const cols =
    section === "clientes"
      ? ["Cliente", "Tipo", "Contacto", "Estado"]
      : section === "mascotas"
        ? ["Mascota", "Responsable", "Raza", "Peso"]
        : section === "citas"
          ? ["Fecha / hora", "Mascota", "Profesional", "Motivo", "Estado"]
          : section === "historia-clinica"
            ? ["Fecha", "Mascota", "Diagnóstico", "Tratamiento"]
            : section === "inventario"
              ? ["Producto", "Categoría", "Precio", "Stock", "Estado"]
              : section === "ventas"
                ? ["Venta", "Cliente", "Fecha", "Total", "Estado"]
                : section === "compras"
                  ? ["Documento", "Proveedor", "Fecha", "Total", "Estado"]
                  : section === "caja"
                    ? ["Caja", "Apertura", "Monto inicial", "Estado"]
                    : section === "promociones"
                      ? ["Promoción", "Tipo", "Valor", "Vigencia", "Estado"]
                      : [
                          "Empleado",
                          "Código",
                          "Especialidad",
                          "Cargo",
                          "Estado",
                        ];
  const add = () => {
    if (section === "mascotas") {
      if (!form.nombre || !form.persona) {
        alert("Completa nombre y responsable");
        return;
      }
      const item: MASCOTA = {
        IDMASCOTA: nextId(db.MASCOTA, "IDMASCOTA"),
        IDPERSONA: Number(form.persona),
        IDRAZA: 1,
        NOMBRE: form.nombre,
        GENERO: (form.genero as MASCOTA["GENERO"]) || "Macho",
        COLOR: form.color || "Marrón",
        FECHANACIMIENTO: form.nacimiento || "2024-01-01",
        PESO: Number(form.peso) || 1,
      };
      update({ MASCOTA: [...db.MASCOTA, item] });
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'MASCOTA', row: item }),
      }).catch(console.error);
    } else if (section === "citas") {
      if (!form.fecha || !form.mascota || !form.hora) {
        alert("Completa fecha, mascota y hora");
        return;
      }
      if (
        (db.CITA || []).some(
          (c) =>
            c.IDEMPLEADO === Number(form.empleado || 1) &&
            c.FECHA === form.fecha &&
            c.HORA === form.hora &&
            c.ESTADO_CITA !== "X",
        )
      ) {
        alert("El profesional ya tiene una cita activa en ese horario.");
        return;
      }
      const item: CITA = {
        IDCITA: nextId(db.CITA, "IDCITA"),
        IDMASCOTA: Number(form.mascota),
        IDEMPLEADO: Number(form.empleado || 1),
        FECHA: form.fecha,
        HORA: form.hora,
        MOTIVO: form.motivo || "Consulta general",
        ESTADO_CITA: "P",
      };
      update({ CITA: [...db.CITA, item] });
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'CITA', row: item }),
      }).catch(console.error);
    } else if (section === "inventario") {
      if (!form.nombre) {
        alert("Completa el nombre");
        return;
      }
      const item: PRODUCTO = {
        IDPRODUCTO: nextId(db.PRODUCTO, "IDPRODUCTO"),
        IDCATEGORIA: 1,
        IDUNIDAD: 1,
        CODIGO: `NUEVO-${Date.now().toString().slice(-4)}`,
        NOMBRE: form.nombre,
        PRECIO_VENTA: Number(form.precio) || 0,
        COSTO: Number(form.costo) || 0,
        STOCK: Number(form.stock) || 0,
        STOCK_MINIMO: 5,
        ACTIVO: true,
      };
      update({ PRODUCTO: [...db.PRODUCTO, item] });
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'PRODUCTO', row: item }),
      }).catch(console.error);
    } else if (section === "historia-clinica") {
      if (!form.mascota || !form.diagnostico) {
        alert("Completa mascota y diagnóstico");
        return;
      }
      const item: FICHA_CLINICA = {
        IDFICHA: nextId(db.FICHA_CLINICA, "IDFICHA"),
        IDMASCOTA: Number(form.mascota),
        IDEMPLEADO: 1,
        MOTIVO_CONSULTA: form.motivo || "Consulta",
        SINTOMAS: form.sintomas || "",
        TEMPERATURA: Number(form.temperatura) || 38,
        DIAGNOSTICO: form.diagnostico,
        TRATAMIENTO: form.tratamiento || "",
        FECHA: new Date().toISOString().slice(0, 10),
      };
      update({ FICHA_CLINICA: [...db.FICHA_CLINICA, item] });
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'FICHA_CLINICA', row: item }),
      }).catch(console.error);
    } else if (section === "ventas") {
      const tot = Number(form.total) || 60;
      const sub = Number((tot / 1.18).toFixed(2));
      const igv = Number((tot - sub).toFixed(2));
      const item: VENTA = {
        IDVENTA: nextId(db.VENTA, "IDVENTA"),
        IDCLIENTE: Number(form.cliente || 1),
        FECHA: new Date().toISOString().slice(0, 10),
        SUBTOTAL: sub,
        DESCUENTO: 0,
        IGV: igv,
        TOTAL: tot,
        ESTADO: "CONFIRMADA",
      };
      update({ VENTA: [...(db.VENTA || []), item] });
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'VENTA',
          row: {
            IDVENTA: item.IDVENTA,
            IDCLIENTE: item.IDCLIENTE,
            FECH_VENTA: new Date().toISOString(),
            TOTAL: tot,
            TOTALAAPAGAR: tot,
            SUBTOTAL: sub,
            IGV: igv,
            TIPO_COMPROBANTE: form.tipo || 'B',
            ESTADO: '1'
          }
        }),
      }).catch(console.error);
    }
    setModal(false);
    setForm({});
  };
  const statusValue = (r: Record<string, any>) =>
    r.ESTADO_CITA ?? r.ESTADO ?? (r.ACTIVO ? "Activo" : "Inactivo");
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">GESTIÓN OPERATIVA</p>
          <h1>{title}</h1>
          <p className="muted">
            {filtered.length} registros relacionados en el sistema
          </p>
        </div>
        {["mascotas", "citas", "historia-clinica", "inventario", "ventas"].includes(
          section,
        ) && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={17} /> Nuevo registro
          </button>
        )}
      </div>
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={`Buscar en ${title.toLowerCase()}...`}
          />
        </div>
        <button className="btn btn-ghost">
          Filtros <Settings size={15} />
        </button>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r: any) => (
              <tr
                key={
                  r.IDCLIENTE ??
                  r.IDMASCOTA ??
                  r.IDCITA ??
                  r.IDFICHA ??
                  r.IDPRODUCTO ??
                  r.IDVENTA ??
                  r.IDCOMPRA ??
                  r.IDAPERTURA ??
                  r.IDPROMOCION ??
                  r.IDEMPLEADO
                }
              >
                {section === "clientes" && (
                  <>
                    <td>
                      <strong>
                        {r.TIPO === "Persona"
                          ? `${person(r.IDPERSONA)?.NOMBRES} ${person(r.IDPERSONA)?.APELLIDOS}`
                          : db.EMPRESA.find((e) => e.IDEMPRESA === r.IDEMPRESA)
                              ?.RAZON_SOCIAL}
                      </strong>
                      <span className="cell-sub">
                        ID cliente #{r.IDCLIENTE}
                      </span>
                    </td>
                    <td>{r.TIPO}</td>
                    <td>
                      {r.IDPERSONA ? person(r.IDPERSONA)?.TELEFONO : "Empresa"}
                    </td>
                    <td>
                      <Badge value={r.ACTIVO ? "Activo" : "Inactivo"} />
                    </td>
                  </>
                )}
                {section === "mascotas" && (
                  <>
                    <td>
                      <strong>{r.NOMBRE}</strong>
                      <span className="cell-sub">
                        ID mascota #{r.IDMASCOTA}
                      </span>
                    </td>
                    <td>
                      {person(r.IDPERSONA)?.NOMBRES}{" "}
                      {person(r.IDPERSONA)?.APELLIDOS}
                    </td>
                    <td>
                      {db.RAZA.find((x) => x.IDRAZA === r.IDRAZA)?.NOMRAZA}
                    </td>
                    <td>{r.PESO} kg</td>
                  </>
                )}
                {section === "citas" && (
                  <>
                    <td>
                      <strong>{date(r.FECHA)}</strong>
                      <span className="cell-sub">{r.HORA}</span>
                    </td>
                    <td>
                      {
                        db.MASCOTA.find((x) => x.IDMASCOTA === r.IDMASCOTA)
                          ?.NOMBRE
                      }
                    </td>
                    <td>
                      {
                        person(
                          db.EMPLEADO.find((x) => x.IDEMPLEADO === r.IDEMPLEADO)
                            ?.IDPERSONA || 0,
                        )?.NOMBRES
                      }
                    </td>
                    <td>{r.MOTIVO}</td>
                    <td>
                      <Badge value={r.ESTADO_CITA} />
                    </td>
                  </>
                )}
                {section === "historia-clinica" && (
                  <>
                    <td>{date(r.FECHA)}</td>
                    <td>
                      {
                        db.MASCOTA.find((x) => x.IDMASCOTA === r.IDMASCOTA)
                          ?.NOMBRE
                      }
                    </td>
                    <td>
                      <strong>{r.DIAGNOSTICO}</strong>
                    </td>
                    <td>{r.TRATAMIENTO}</td>
                  </>
                )}
                {section === "inventario" && (
                  <>
                    <td>
                      <strong>{r.NOMBRE}</strong>
                      <span className="cell-sub">{r.CODIGO}</span>
                    </td>
                    <td>
                      {
                        db.CATEGORIA.find(
                          (x) => x.IDCATEGORIA === r.IDCATEGORIA,
                        )?.NOMCATEGORIA
                      }
                    </td>
                    <td>{money(r.PRECIO_VENTA)}</td>
                    <td>
                      <span
                        className={r.STOCK <= r.STOCK_MINIMO ? "stock-low" : ""}
                      >
                        {r.STOCK} und.
                      </span>
                    </td>
                    <td>
                      <Badge
                        value={
                          r.STOCK <= r.STOCK_MINIMO
                            ? "Stock bajo"
                            : "Disponible"
                        }
                      />
                    </td>
                  </>
                )}
                {section === "ventas" && (
                  <>
                    <td>Venta #{r.IDVENTA}</td>
                    <td>{r.IDCLIENTE}</td>
                    <td>{date(r.FECHA)}</td>
                    <td>
                      <strong>{money(r.TOTAL)}</strong>
                    </td>
                    <td>
                      <Badge value={r.ESTADO} />
                    </td>
                  </>
                )}
                {section === "compras" && (
                  <>
                    <td>
                      <strong>{r.DOCUMENTO}</strong>
                    </td>
                    <td>
                      {
                        db.EMPRESA.find((e) => e.IDEMPRESA === r.IDEMPRESA)
                          ?.RAZON_SOCIAL
                      }
                    </td>
                    <td>{date(r.FECHA)}</td>
                    <td>{money(r.TOTAL)}</td>
                    <td>
                      <Badge value={r.ESTADO} />
                    </td>
                  </>
                )}
                {section === "caja" && (
                  <>
                    <td>
                      {db.CAJA.find((x) => x.IDCAJA === r.IDCAJA)?.NOMBRE}
                    </td>
                    <td>{date(r.FECHA_APERTURA)}</td>
                    <td>{money(r.MONTO_APERTURA)}</td>
                    <td>
                      <Badge value={r.ESTADO} />
                    </td>
                  </>
                )}
                {section === "promociones" && (
                  <>
                    <td>
                      <strong>{r.NOMBRE}</strong>
                    </td>
                    <td>{r.TIPO}</td>
                    <td>{r.VALOR}%</td>
                    <td>
                      {date(r.DESDE)} – {date(r.HASTA)}
                    </td>
                    <td>
                      <Badge value={r.ACTIVA ? "Activo" : "Inactivo"} />
                    </td>
                  </>
                )}
                {section === "personal" && (
                  <>
                    <td>
                      <strong>
                        {person(r.IDPERSONA)?.NOMBRES}{" "}
                        {person(r.IDPERSONA)?.APELLIDOS}
                      </strong>
                    </td>
                    <td>{r.CODEMPLEADO}</td>
                    <td>
                      {
                        db.ESPECIALIDAD.find(
                          (x) => x.IDESPECIALIDAD === r.IDESPECIALIDAD,
                        )?.NOMESPECIALIDAD
                      }
                    </td>
                    <td>{r.CARGO}</td>
                    <td>
                      <Badge value={r.ACTIVO ? "Activo" : "Inactivo"} />
                    </td>
                  </>
                )}
                <td>
                  <button className="icon-btn">•••</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <Empty text="No hay registros que coincidan con tu búsqueda." />
        )}
        <div className="pagination">
          <span>
            Mostrando {shown.length} de {filtered.length}
          </span>
          <div>
            <button
              className="icon-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-num">{page}</span>
            <button
              className="icon-btn"
              disabled={page >= Math.ceil(filtered.length / size)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      {modal && (
        <Modal
          title={`Nuevo registro · ${title}`}
          onClose={() => setModal(false)}
        >
          <div className="form-grid">
            {section === "mascotas" && (
              <>
                <Input
                  label="Nombre *"
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <Select
                  label="Responsable *"
                  value={form.persona || ""}
                  onChange={(e) =>
                    setForm({ ...form, persona: e.target.value })
                  }
                >
                  <option value="">Seleccionar...</option>
                  {db.PERSONA.slice(0, 30).map((p) => (
                    <option key={p.IDPERSONA} value={p.IDPERSONA}>
                      {p.NOMBRES} {p.APELLIDOS}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Género"
                  value={form.genero || "Macho"}
                  onChange={(e) => setForm({ ...form, genero: e.target.value })}
                >
                  <option>Macho</option>
                  <option>Hembra</option>
                </Select>
                <Input
                  label="Color"
                  value={form.color || ""}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <Input
                  label="Nacimiento"
                  type="date"
                  value={form.nacimiento || ""}
                  onChange={(e) =>
                    setForm({ ...form, nacimiento: e.target.value })
                  }
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  value={form.peso || ""}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                />
              </>
            )}
            {section === "citas" && (
              <>
                <Select
                  label="Mascota *"
                  value={form.mascota || ""}
                  onChange={(e) =>
                    setForm({ ...form, mascota: e.target.value })
                  }
                >
                  <option value="">Seleccionar...</option>
                  {db.MASCOTA.map((m) => (
                    <option key={m.IDMASCOTA} value={m.IDMASCOTA}>
                      {m.NOMBRE}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Veterinario"
                  value={form.empleado || "1"}
                  onChange={(e) =>
                    setForm({ ...form, empleado: e.target.value })
                  }
                >
                  {db.EMPLEADO.filter(
                    (e) => e.CARGO === "Médico veterinario",
                  ).map((e) => (
                    <option key={e.IDEMPLEADO} value={e.IDEMPLEADO}>
                      {person(e.IDPERSONA)?.NOMBRES}{" "}
                      {person(e.IDPERSONA)?.APELLIDOS}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Fecha *"
                  type="date"
                  value={form.fecha || ""}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
                <Input
                  label="Hora *"
                  type="time"
                  value={form.hora || ""}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
                <Input
                  label="Motivo"
                  value={form.motivo || ""}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </>
            )}
            {section === "inventario" && (
              <>
                <Input
                  label="Nombre *"
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <Input
                  label="Precio venta"
                  type="number"
                  value={form.precio || ""}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                />
                <Input
                  label="Costo"
                  type="number"
                  value={form.costo || ""}
                  onChange={(e) => setForm({ ...form, costo: e.target.value })}
                />
                <Input
                  label="Stock inicial"
                  type="number"
                  value={form.stock || ""}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </>
            )}
            {section === "historia-clinica" && (
              <>
                <Select
                  label="Mascota *"
                  value={form.mascota || ""}
                  onChange={(e) =>
                    setForm({ ...form, mascota: e.target.value })
                  }
                >
                  <option value="">Seleccionar...</option>
                  {db.MASCOTA.map((m) => (
                    <option key={m.IDMASCOTA} value={m.IDMASCOTA}>
                      {m.NOMBRE}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Motivo"
                  value={form.motivo || ""}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
                <Input
                  label="Síntomas"
                  value={form.sintomas || ""}
                  onChange={(e) =>
                    setForm({ ...form, sintomas: e.target.value })
                  }
                />
                <Input
                  label="Temperatura"
                  type="number"
                  value={form.temperatura || ""}
                  onChange={(e) =>
                    setForm({ ...form, temperatura: e.target.value })
                  }
                />
                <Input
                  label="Diagnóstico *"
                  value={form.diagnostico || ""}
                  onChange={(e) =>
                    setForm({ ...form, diagnostico: e.target.value })
                  }
                />
                <Input
                  label="Tratamiento"
                  value={form.tratamiento || ""}
                  onChange={(e) =>
                    setForm({ ...form, tratamiento: e.target.value })
                  }
                />
              </>
            )}
            {section === "ventas" && (
              <>
                <Select
                  label="Cliente *"
                  value={form.cliente || "1"}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                >
                  {(db.CLIENTE || []).map((c) => {
                    const p = (db.PERSONA || []).find((per) => per.IDPERSONA === c.IDPERSONA);
                    return (
                      <option key={c.IDCLIENTE} value={c.IDCLIENTE}>
                        {p ? `${p.NOMBRES} ${p.APELLIDOS}` : `Cliente #${c.IDCLIENTE}`}
                      </option>
                    );
                  })}
                </Select>
                <Input
                  label="Total venta (S/) *"
                  type="number"
                  value={form.total || ""}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  placeholder="Ej: 120.00"
                />
                <Select
                  label="Tipo Comprobante"
                  value={form.tipo || "B"}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="B">Boleta</option>
                  <option value="F">Factura</option>
                </Select>
              </>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={add}>
              Guardar registro
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Reports({ db }: { db: DB }) {
  const confirmed = (db.VENTA || []).filter((v) => v.ESTADO === "CONFIRMADA");
  const total = confirmed.reduce((s, v) => s + (Number(v.TOTAL) || 0), 0);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">INTELIGENCIA OPERATIVA</p>
          <h1>Reportes</h1>
          <p className="muted">
            Indicadores calculados con la información actual.
          </p>
        </div>
        <button className="btn btn-ghost">Últimos 30 días</button>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <DollarSign size={20} />
          </div>
          <div>
            <p>Ventas confirmadas</p>
            <strong>{money(total)}</strong>
            <small>{confirmed.length} operaciones</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet">
            <CalendarDays size={20} />
          </div>
          <div>
            <p>Citas atendidas</p>
            <strong>
              {(db.CITA || []).filter((c) => c.ESTADO_CITA === "A").length}
            </strong>
            <small>de {(db.CITA || []).length} registradas</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Package size={20} />
          </div>
          <div>
            <p>Valor inventario</p>
            <strong>
              {money((db.PRODUCTO || []).reduce((s, p) => s + (Number(p.STOCK) || 0) * (Number(p.COSTO) || 0), 0))}
            </strong>
            <small>{(db.PRODUCTO || []).length} productos</small>
          </div>
        </div>
      </div>
      <section className="panel chart">
        <div className="panel-head">
          <div>
            <h2>Ventas por operación</h2>
            <p className="muted">
              Resumen demostrativo del periodo seleccionado
            </p>
          </div>
        </div>
        <div className="bars">
          {(db.VENTA || []).slice(0, 12).map((v, i) => (
            <div className="bar-wrap" key={v.IDVENTA}>
              <div
                className="bar"
                style={{ height: `${Math.max(18, ((Number(v.TOTAL) || 0) / 250) * 100)}px` }}
                title={money(v.TOTAL)}
              ></div>
              <small>{i + 1}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function VetApp() {
  const [db, setDb] = useState<DB>(() => seedDB());
  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setDb(loadDB(seedDB));
    fetch('/api/data')
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok && res.data) {
          setDb((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(res.data)) {
              if (Array.isArray(v) && v.length > 0) {
                (next as any)[k] = v;
              }
            }
            saveDB(next);
            return next;
          });
        }
      })
      .catch((err) => console.warn('Using local cache/seed:', err));
  }, []);
  const current = path.split("/").filter(Boolean)[0] || "";
  const go = (p: string) => {
    setPath(p);
    setMobile(false);
    window.history.pushState({}, "", p);
  };
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  const content =
    path === "/ " ? (
      <Dashboard db={db} go={go} />
    ) : path === "/" ? (
      <Dashboard db={db} go={go} />
    ) : current === "reportes" ? (
      <Reports db={db} />
    ) : (
      <Listing db={db} setDb={setDb} section={current} />
    );
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            <PawPrint size={22} />
          </div>
          <div>
            <strong>Castillón</strong>
            <span>Veterinaria</span>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.path}
              className={path === n.path ? "nav-item active" : "nav-item"}
              onClick={() => go(n.path)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="live-dot"></span>
            <div>
              <strong>Aiven PostgreSQL</strong>
              <small>BD en la nube conectada</small>
            </div>
          </div>
          <button className="nav-item">
            <Settings size={18} />
            <span>Configuración</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          <div className="context-search">
            <Search size={17} />
            <input placeholder="Buscar en el sistema..." />
          </div>
          <div className="top-actions">
            <span className="role">Administrador demo</span>
            <div className="user-avatar">AD</div>
          </div>
        </header>
        <div className="content">{content}</div>
        <footer className="footer">
          Castillón Veterinaria · Prototipo funcional local · Sin emisión
          electrónica SUNAT
        </footer>
      </main>
    </div>
  );
}
