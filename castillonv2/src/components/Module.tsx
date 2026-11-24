import {
  ChefHat,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { resetData } from "@/services/storageService";
import { nextId } from "@/services/crudService";

import PageHead from "./PageHead";
import FormActions from "./FormActions";
import SearchBox from "./SearchBox";
import Modal from "./Modal";
import type { View } from "./App";
import type { Database } from "@/types/database";
import { useState } from "react";
import badge from "./Badge";
import Table from "./Table";
import Stat from "./Stat";
import { money } from "@/helpers/formatMoney";
import { date } from "@/helpers/formatDate";

function Module({
  view,
  db,
  setDb,
  query,
  setQuery,
  modal,
  setModal,
  clientName,
  personName,
  go,
}: {
  view: View;
  db: Database;
  setDb: (d: Database) => void;
  query: string;
  setQuery: (s: string) => void;
  modal: string | null;
  setModal: (s: string | null) => void;
  clientName: (id: number) => string;
  personName: (id: number) => string;
  go: (v: View) => void;
}) {
  const [tab, setTab] = useState("Todos");
  const active = (s: string) => s.toLowerCase().includes(query.toLowerCase());
  const addClient = (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      id = nextId(db.CLIENTE, "IDCLIENTE"),
      pid = nextId(db.PERSONA, "IDPERSONA");
    const next = {
      ...db,
      PERSONA: [
        ...db.PERSONA,
        {
          IDPERSONA: pid,
          IDDISTRITO: 1,
          NOMBRES: String(f.get("nombre")),
          APEPATERNO: String(f.get("apellido")),
          APEMATERNO: "Demo",
          EST_CIVIL: "S",
          DNI: String(f.get("dni")),
          DIRECCION: "Dirección de demostración",
          CELULAR: "999999999",
          FECNAC: "1990-01-01",
          CORREO: String(f.get("correo")),
          ESTADO: "A",
        },
      ],
      CLIENTE: [
        ...db.CLIENTE,
        { IDCLIENTE: id, IDPERSONA: pid, IDEMPRESA: null, ESTADO: "A" },
      ],
    };
    setDb(next);
    setModal(null);
  };
  const addProduct = (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      id = nextId(db.PRODUCTO, "IDPRODUCTO");
    setDb({
      ...db,
      PRODUCTO: [
        ...db.PRODUCTO,
        {
          IDPRODUCTO: id,
          IDCATEGORIA: Number(f.get("cat")),
          NOMPRODUCTO: String(f.get("nombre")),
          DESCRIPCION: String(f.get("descripcion")),
          PRECIO: Number(f.get("precio")),
          MARCA: String(f.get("marca")),
          ESTADO: "A",
        },
      ],
    });
    setModal(null);
  };
  const filteredClients = db.CLIENTE.filter(
    (c) =>
      active(clientName(c.IDCLIENTE)) ||
      active(db.PERSONA.find((p) => p.IDPERSONA === c.IDPERSONA)?.DNI || "") ||
      active(db.EMPRESA.find((x) => x.IDEMPRESA === c.IDEMPRESA)?.RUC || ""),
  );
  const filteredProducts = db.PRODUCTO.filter(
    (p) => active(p.NOMPRODUCTO) || active(p.MARCA),
  );
  if (view === "clientes")
    return (
      <PageHead
        title="Clientes"
        desc="Personas naturales y empresas registradas"
        action="Nuevo cliente"
        onAction={() => setModal("client")}
      >
        <div className="filterbar">
          <SearchBox
            value={query}
            setValue={setQuery}
            placeholder="Buscar por nombre, DNI o RUC"
          />
          <select value={tab} onChange={(e) => setTab(e.target.value)}>
            <option>Todos</option>
            <option>Activos</option>
            <option>Inactivos</option>
          </select>
        </div>
        <div className="card table-card">
          <Table
            headers={[
              "Cliente",
              "Tipo",
              "Documento",
              "Contacto",
              "Estado",
              "Acciones",
            ]}
            rows={filteredClients.map((c) => {
              const p = c.IDPERSONA
                ? db.PERSONA.find((x) => x.IDPERSONA === c.IDPERSONA)
                : null;
              const emp = c.IDEMPRESA
                ? db.EMPRESA.find((x) => x.IDEMPRESA === c.IDEMPRESA)
                : null;
              return [
                <b>{p ? `${p.NOMBRES} ${p.APEPATERNO}` : emp?.RAZON_SOCIAL}</b>,
                p ? "Persona natural" : "Empresa",
                p?.DNI || emp?.RUC,
                p?.CORREO || emp?.TELEFONO,
                badge(c.ESTADO),
                <button className="dots">•••</button>,
              ];
            })}
          />
        </div>
        {modal === "client" && (
          <Modal title="Registrar cliente" close={() => setModal(null)}>
            <form onSubmit={addClient}>
              <div className="form-grid">
                <label>
                  Nombres
                  <input name="nombre" required />
                </label>
                <label>
                  Apellidos
                  <input name="apellido" required />
                </label>
                <label>
                  DNI
                  <input
                    name="dni"
                    pattern="[0-9]{8}"
                    required
                    placeholder="8 dígitos"
                  />
                </label>
                <label>
                  Correo
                  <input type="email" name="correo" required />
                </label>
              </div>
              <FormActions close={() => setModal(null)} />
            </form>
          </Modal>
        )}
      </PageHead>
    );
  if (view === "productos")
    return (
      <PageHead
        title="Productos"
        desc="Catálogo de productos y categorías"
        action="Nuevo producto"
        onAction={() => setModal("product")}
      >
        <div className="filterbar">
          <SearchBox
            value={query}
            setValue={setQuery}
            placeholder="Buscar producto o marca"
          />
          <select>
            <option>Todas las categorías</option>
            {db.CATEGORIA.slice(0, 5).map((c) => (
              <option key={c.IDCATEGORIA}>{c.NOMCATEGORIA}</option>
            ))}
          </select>
        </div>
        <div className="product-grid">
          {filteredProducts.map((p) => (
            <div className="product-card" key={p.IDPRODUCTO}>
              <div className="product-image">
                <ChefHat size={24} />
                <span>
                  {
                    db.CATEGORIA.find((c) => c.IDCATEGORIA === p.IDCATEGORIA)
                      ?.NOMCATEGORIA
                  }
                </span>
              </div>
              <div className="product-info">
                <h3>{p.NOMPRODUCTO}</h3>
                <p>{p.DESCRIPCION}</p>
                <div>
                  <b>{money(p.PRECIO)}</b>
                  <span>{badge(p.ESTADO)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {modal === "product" && (
          <Modal title="Registrar producto" close={() => setModal(null)}>
            <form onSubmit={addProduct}>
              <label>
                Nombre del producto
                <input name="nombre" required />
              </label>
              <div className="form-grid">
                <label>
                  Categoría
                  <select name="cat">
                    {db.CATEGORIA.slice(0, 8).map((c) => (
                      <option value={c.IDCATEGORIA} key={c.IDCATEGORIA}>
                        {c.NOMCATEGORIA}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Precio
                  <input
                    name="precio"
                    type="number"
                    min="0"
                    step=".01"
                    required
                  />
                </label>
                <label>
                  Marca
                  <input name="marca" defaultValue="Castillón" />
                </label>
              </div>
              <label>
                Descripción
                <textarea name="descripcion" required />
              </label>
              <FormActions close={() => setModal(null)} />
            </form>
          </Modal>
        )}
      </PageHead>
    );
  if (view === "operacion")
    return (
      <PageHead
        title="Mesas y pedidos"
        desc="Control operativo del salón"
        action="Crear pedido"
        onAction={() => setModal("order")}
      >
        <div className="table-card card mb-6">
          <div className="section-head">
            <div>
              <h3>Estado de mesas</h3>
              <p>Distribución actual por piso</p>
            </div>
            <button className="btn outline">
              <Plus size={16} /> Nueva mesa
            </button>
          </div>
          <div className="mesa-grid">
            {db.MESAS.map((m) => (
              <div
                className={`mesa ${m.ESTADO === "O" ? "occupied" : ""}`}
                key={m.IDMESA}
              >
                <span>Mesa {m.NUNMESA}</span>
                <b>{m.ESTADO === "O" ? "Ocupada" : "Disponible"}</b>
                <small>Piso {m.NUMPISO}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="card table-card">
          <div className="section-head">
            <div>
              <h3>Pedidos registrados</h3>
              <p>Los estados son códigos de demostración: C, P y F.</p>
            </div>
            <SearchBox
              value={query}
              setValue={setQuery}
              placeholder="Buscar pedido"
            />
          </div>
          <Table
            headers={[
              "Pedido",
              "Mesa",
              "Fecha",
              "Importe calculado",
              "Estado",
              "Acciones",
            ]}
            rows={db.PEDIDOS.filter((p) =>
              String(p.IDPEDIDO).includes(query),
            ).map((p) => {
              const amount = db.DETALLE_PEDIDO.filter(
                (d) => d.IDPEDIDO === p.IDPEDIDO,
              ).reduce((a, d) => a + d.CANTIDAD * d.PRECIO, 0);
              return [
                <b>#{String(p.IDPEDIDO).padStart(4, "0")}</b>,
                `Mesa ${db.MESAS.find((m) => m.IDMESA === p.IDMESA)?.NUNMESA}`,
                date(p.FECHA),
                money(amount),
                badge(p.ESTADO),
                <button
                  className="link"
                  onClick={() => alert("Detalle del pedido y sus productos")}
                >
                  Consultar
                </button>,
              ];
            })}
          />
        </div>
      </PageHead>
    );
  if (view === "ventas")
    return (
      <PageHead
        title="Ventas"
        desc="Ventas relacionadas a pedidos completos"
        action="Registrar venta"
        onAction={() => setModal("sale")}
      >
        <div className="stats compact">
          <Stat
            icon={CircleDollarSign}
            label="Total vendido"
            value={money((db.VENTAS || []).reduce((a, v) => a + (Number(v.TOTALPAGAR) || 0), 0))}
            note="IGV configurable: 18%"
            color="purple"
          />
          <Stat
            icon={ShoppingBag}
            label="Transacciones"
            value={db.VENTAS.length}
            note="Pedidos completos"
            color="blue"
          />
        </div>
        <div className="card table-card">
          <div className="filterbar">
            <SearchBox
              value={query}
              setValue={setQuery}
              placeholder="Buscar venta o cliente"
            />
          </div>
          <Table
            headers={[
              "Venta",
              "Fecha",
              "Cliente",
              "Documento",
              "Subtotal",
              "IGV",
              "Total a pagar",
            ]}
            rows={db.VENTAS.filter(
              (v) =>
                active(String(v.IDVENTAS)) || active(clientName(v.IDCLIENTE)),
            ).map((v) => [
              <b>#{String(v.IDVENTAS).padStart(5, "0")}</b>,
              date(v.FECHAVENTA),
              clientName(v.IDCLIENTE),
              v.DOCUMENTO,
              money(v.SUBTOTOTAL),
              money(v.IGV),
              <strong>{money(v.TOTALPAGAR)}</strong>,
            ])}
          />
        </div>
        {modal === "sale" && (
          <Modal title="Registrar venta" close={() => setModal(null)}>
            <p className="notice">
              Regla provisional: una venta corresponde a un pedido completo y no
              se permiten ventas parciales.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModal(null);
                alert("Venta registrada.");
              }}
            >
              <label>
                Pedido
                <select>
                  {db.PEDIDOS.filter(
                    (p) => !db.VENTAS.some((v) => v.IDPEDIDO === p.IDPEDIDO),
                  )
                    .slice(0, 10)
                    .map((p) => (
                      <option key={p.IDPEDIDO}>Pedido #{p.IDPEDIDO}</option>
                    ))}
                </select>
              </label>
              <label>
                Cliente
                <select>
                  {db.CLIENTE.slice(0, 10).map((c) => (
                    <option key={c.IDCLIENTE}>{clientName(c.IDCLIENTE)}</option>
                  ))}
                </select>
              </label>
              <label>
                Método de pago
                <select>
                  {db.METODO_PAGO.slice(0, 8).map((m) => (
                    <option key={m.IDMETODO_PAGO}>{m.NOMMETODO}</option>
                  ))}
                </select>
              </label>
              <FormActions close={() => setModal(null)} />
            </form>
          </Modal>
        )}
      </PageHead>
    );
  if (view === "comprobantes")
    return (
      <PageHead
        title="Comprobantes"
        desc="Emisión simulada vinculada a ventas"
        action="Generar comprobante"
        onAction={() =>
          alert("Selecciona una venta para generar un comprobante simulado.")
        }
      >
        <div className="card table-card">
          <Table
            headers={[
              "Tipo",
              "Serie - número",
              "Venta",
              "Fecha emisión",
              "Estado",
              "Acciones",
            ]}
            rows={[
              ...db.BOLETA.map((b) => [
                "Boleta",
                `${b.SERIE} - ${b.NUMERO}`,
                `#${b.IDVENTAS}`,
                date(b.FECHAEMISION),
                badge(b.ESTADO),
                <button className="link">Imprimir</button>,
              ]),
              ...db.FACTURA.map((f) => [
                "Factura",
                `${f.SERIE} - ${f.NUMERO}`,
                `#${f.IDVENTAS}`,
                date(f.FECHAEMISION),
                badge(f.ESTADO),
                <button className="link">Imprimir</button>,
              ]),
            ].slice(0, 20)}
          />
        </div>
      </PageHead>
    );
  if (view === "finanzas")
    return (
      <PageHead
        title="Finanzas"
        desc="Deudas, ingresos, egresos y catálogos financieros"
      >
        <div className="stats compact">
          <Stat
            icon={CircleDollarSign}
            label="Ingresos relacionados"
            value={db.INGRESO.length}
            note="Importe derivado de ventas"
            color="green"
          />
          <Stat
            icon={Wallet}
            label="Egresos registrados"
            value={money((db.EGRESO || []).reduce((a, e) => a + (Number(e.TOTAL) || 0), 0))}
            note="Según EGRESO.TOTAL"
            color="orange"
          />
        </div>
        <div className="card table-card">
          <div className="section-head">
            <div>
              <h3>Movimientos recientes</h3>
              <p>No se simulan saldos ni pagos parciales.</p>
            </div>
          </div>
          <Table
            headers={["Tipo", "Referencia", "Fecha", "Estado"]}
            rows={db.INGRESO.slice(0, 12).map((i) => [
              "Ingreso",
              `Deuda #${i.IDDEUDA_GENERADA}`,
              date(i.FECHAPAGO),
              badge(i.ESTADO),
            ])}
          />
        </div>
      </PageHead>
    );
  if (view === "personal" || view === "ubicacion")
    return (
      <PageHead
        title={view === "personal" ? "Personal y acceso" : "Ubicación"}
        desc={
          view === "personal"
            ? "Empleados, usuarios y tipos de usuario"
            : "Catálogos geográficos relacionados"
        }
      >
        <div className="catalog-grid">
          {(view === "personal"
            ? [
                ["Empleados", db.EMPLEADO.length],
                ["Usuarios", db.USUARIO.length],
                ["Cargos", db.CARGO.length],
                ["Contratos", db.CONTRATO.length],
                ["Tipos de usuario", db.TIPO_USUARIO.length],
              ]
            : [
                ["Departamentos", db.DEPARTAMENTO.length],
                ["Provincias", db.PROVINCIA.length],
                ["Distritos", db.DISTRITO.length],
              ]
          ).map((x) => (
            <div className="catalog-card" key={x[0]}>
              <div className="round-icon purple">
                <MapPin size={19} />
              </div>
              <div>
                <b>{x[0]}</b>
                <strong>{x[1]}</strong>
                <small>registros activos</small>
              </div>
              <ChevronRight size={18} />
            </div>
          ))}
        </div>
        <div className="card table-card">
          <h3>
            {view === "personal"
              ? "Empleados registrados"
              : "Departamentos registrados"}
          </h3>
          <Table
            headers={
              view === "personal"
                ? [
                    "Empleado",
                    "Cargo",
                    "Contrato",
                    "Salario",
                    "Turno",
                    "Estado",
                  ]
                : ["ID", "Departamento", "Estado"]
            }
            rows={
              view === "personal"
                ? db.EMPLEADO.slice(0, 12).map((e) => [
                    personName(e.IDPERSONA),
                    db.CARGO.find((c) => c.IDCARGO === e.IDCARGO)?.NOMCARGO,
                    db.CONTRATO.find((c) => c.IDCONTRATO === e.IDCONTRATO)
                      ?.NOMCONTRATO,
                    money(e.SALARIO),
                    e.TURNO,
                    badge(e.ESTADO),
                  ])
                : db.DEPARTAMENTO.slice(0, 12).map((d) => [
                    d.IDDepartamento,
                    d.NOMDEPARTAMENTO,
                    badge(d.ESTADO),
                  ])
            }
          />
        </div>
      </PageHead>
    );
  if (view === "reportes")
    return (
      <PageHead
        title="Reportes"
        desc="Indicadores calculados desde los registros actuales"
      >
        <div className="stats">
          <Stat
            icon={CircleDollarSign}
            label="Ventas acumuladas"
            value={money((db.VENTAS || []).reduce((a, v) => a + (Number(v.TOTALPAGAR) || 0), 0))}
            note="Total a pagar"
            color="purple"
          />
          <Stat
            icon={ClipboardList}
            label="Pedidos"
            value={db.PEDIDOS.length}
            note="Todos los estados"
            color="orange"
          />
          <Stat
            icon={Wallet}
            label="Ingresos"
            value={db.INGRESO.length}
            note="Relacionados a deudas"
            color="green"
          />
        </div>
        <div className="grid-two">
          <div className="card report-bars">
            <h3>Ventas por método de pago</h3>
            {db.METODO_PAGO.slice(0, 5).map((m) => {
              const n = db.VENTAS.filter(
                (v) => v.IDMETODO_PAGO === m.IDMETODO_PAGO,
              ).length;
              return (
                <div className="report-line" key={m.IDMETODO_PAGO}>
                  <span>{m.NOMMETODO}</span>
                  <div>
                    <i style={{ width: `${Math.max(8, n * 20)}%` }} />
                  </div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
          <div className="card report-bars">
            <h3>Pedidos por estado</h3>
            {["C", "P", "F"].map((s) => (
              <div className="report-line" key={s}>
                <span>Código {s}</span>
                <div>
                  <i
                    className="orange-bar"
                    style={{
                      width: `${(db.PEDIDOS.filter((p) => p.ESTADO === s).length / 30) * 100}%`,
                    }}
                  />
                </div>
                <b>{db.PEDIDOS.filter((p) => p.ESTADO === s).length}</b>
              </div>
            ))}
          </div>
        </div>
      </PageHead>
    );
  return (
    <PageHead title="Configuración" desc="Preferencias de la demostración">
      <div className="card settings">
        <h3>Datos de demostración</h3>
        <p>
          Los registros se guardan en localStorage del navegador. Las
          credenciales no son reales y el campo CLAVE no almacena contraseñas.
        </p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm("¿Restablecer todos los datos?")) setDb(resetData());
          }}
        >
          <RefreshCcw size={16} /> Restablecer datos demo
        </button>
      </div>
    </PageHead>
  );
}

export default Module;
