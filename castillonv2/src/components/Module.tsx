import { useState } from "react";
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
  Printer,
  CheckCircle2,
  Clock,
  Check,
  Eye,
  MoreVertical,
  Receipt,
  FileText,
  DollarSign,
} from "lucide-react";
import { resetData, saveData } from "@/services/storageService";
import {
  nextId,
  insertRecord,
  insertOperations,
  updateRecord,
} from "@/services/crudService";

import PageHead from "./PageHead";
import FormActions from "./FormActions";
import SearchBox from "./SearchBox";
import Modal from "./Modal";
import type { View } from "./App";
import type { Database } from "@/types/database";
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
  setDb: (d: Database | ((prev: Database) => Database)) => void;
  query: string;
  setQuery: (s: string) => void;
  modal: string | null;
  setModal: (s: string | null) => void;
  clientName: (id: number) => string;
  personName: (id: number) => string;
  go: (v: View) => void;
}) {
  const [tab, setTab] = useState("Todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedMesaForOrder, setSelectedMesaForOrder] = useState<number | null>(null);
  const [selectedPrintItem, setSelectedPrintItem] = useState<{
    tipo: string;
    serie: string;
    numero: string;
    idVenta: number;
    fecha: string;
    estado: string;
    total: number;
    cliente: string;
  } | null>(null);
  const [clientActionTarget, setClientActionTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const active = (s: string) => (s || "").toLowerCase().includes(query.toLowerCase());

  // 1. CLIENTES: Agregar nuevo cliente
  const addClient = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pid = nextId(db.PERSONA || [], "IDPERSONA");
    const cid = nextId(db.CLIENTE || [], "IDCLIENTE");

    const newPersona = {
      IDPERSONA: pid,
      IDDISTRITO: 1,
      NOMBRES: String(f.get("nombre") || ""),
      APEPATERNO: String(f.get("apellido") || ""),
      APEMATERNO: "Demo",
      EST_CIVIL: "S",
      DNI: String(f.get("dni") || ""),
      DIRECCION: String(f.get("direccion") || "Dirección de demostración"),
      CELULAR: String(f.get("celular") || "999999999"),
      FECNAC: "1990-01-01",
      CORREO: String(f.get("correo") || ""),
      ESTADO: "A",
    };

    const newCliente = {
      IDCLIENTE: cid,
      IDPERSONA: pid,
      IDEMPRESA: null,
      ESTADO: "A",
    };

    const nextDb: Database = {
      ...db,
      PERSONA: [...(db.PERSONA || []), newPersona],
      CLIENTE: [...(db.CLIENTE || []), newCliente],
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    showToast("Cliente registrado y guardado con éxito");

    await insertOperations([
      { table: "PERSONA", row: newPersona },
      { table: "CLIENTE", row: newCliente },
    ]);
  };

  // Alternar estado de cliente (Activo / Inactivo)
  const toggleClientStatus = async (c: any) => {
    const newStatus = c.ESTADO === "A" ? "I" : "A";
    const nextCliente = (db.CLIENTE || []).map((item) =>
      item.IDCLIENTE === c.IDCLIENTE ? { ...item, ESTADO: newStatus } : item
    );
    const nextDb = { ...db, CLIENTE: nextCliente };
    setDb(nextDb);
    saveData(nextDb);
    setClientActionTarget(null);
    showToast(`Cliente marcado como ${newStatus === "A" ? "Activo" : "Inactivo"}`);

    await updateRecord("CLIENTE", "IDCLIENTE", c.IDCLIENTE, { ESTADO: newStatus });
  };

  // 2. PRODUCTOS: Agregar nuevo producto
  const addProduct = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = nextId(db.PRODUCTO || [], "IDPRODUCTO");

    const newProduct = {
      IDPRODUCTO: id,
      IDCATEGORIA: Number(f.get("cat") || 1),
      NOMPRODUCTO: String(f.get("nombre") || ""),
      DESCRIPCION: String(f.get("descripcion") || ""),
      PRECIO: parseFloat(String(f.get("precio") || "0")),
      MARCA: String(f.get("marca") || "Castillón"),
      ESTADO: "A",
    };

    const nextDb: Database = {
      ...db,
      PRODUCTO: [...(db.PRODUCTO || []), newProduct],
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    showToast("Producto agregado al menú con éxito");

    await insertRecord("PRODUCTO", newProduct);
  };

  // 3. OPERACION: Nueva mesa
  const addTable = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = nextId(db.MESAS || [], "IDMESA");
    const numMesa = String(f.get("num") || id);
    const piso = String(f.get("piso") || "1");

    const newMesa = {
      IDMESA: id,
      NUMPISO: piso,
      NUNMESA: numMesa,
      ESTADO: "D", // Disponible
    };

    const nextDb: Database = {
      ...db,
      MESAS: [...(db.MESAS || []), newMesa],
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    showToast(`Mesa ${numMesa} creada en Piso ${piso}`);

    await insertRecord("MESAS", newMesa);
  };

  // 4. OPERACION: Alternar estado de mesa (Clic directo en la mesa)
  const toggleMesa = async (mesa: any) => {
    const newStatus = mesa.ESTADO === "O" ? "D" : "O";
    const nextMesas = (db.MESAS || []).map((m) =>
      m.IDMESA === mesa.IDMESA ? { ...m, ESTADO: newStatus } : m
    );
    const nextDb = { ...db, MESAS: nextMesas };
    setDb(nextDb);
    saveData(nextDb);
    showToast(`Mesa ${mesa.NUNMESA} marcada como ${newStatus === "O" ? "Ocupada" : "Disponible"}`);

    await updateRecord("MESAS", "IDMESA", mesa.IDMESA, { ESTADO: newStatus });
  };

  // 5. OPERACION: Crear pedido
  const addOrder = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const mesaId = Number(f.get("mesaId") || selectedMesaForOrder || (db.MESAS?.[0]?.IDMESA ?? 1));
    const prodId = Number(f.get("prodId") || (db.PRODUCTO?.[0]?.IDPRODUCTO ?? 1));
    const qty = Math.max(1, parseInt(String(f.get("qty") || "1"), 10));

    const product = (db.PRODUCTO || []).find((p) => p.IDPRODUCTO === prodId);
    const price = product ? Number(product.PRECIO) || 0 : 15;

    const orderId = nextId(db.PEDIDOS || [], "IDPEDIDO");
    const detailId = nextId(db.DETALLE_PEDIDO || [], "IDDETALLE_PEDIDO");
    const todayStr = new Date().toISOString().split("T")[0];

    const newOrder = {
      IDPEDIDO: orderId,
      IDMESA: mesaId,
      FECHA: todayStr,
      ESTADO: "P", // Pendiente
    };

    const newDetail = {
      IDDETALLE_PEDIDO: detailId,
      IDPEDIDO: orderId,
      IDPRODUCTO: prodId,
      IDAREA: 1,
      IDUSUARIO: 1,
      CANTIDAD: qty,
      PRECIO: price,
      ESTADO: "P",
    };

    // Actualizar mesa a ocupada
    const nextMesas = (db.MESAS || []).map((m) =>
      m.IDMESA === mesaId ? { ...m, ESTADO: "O" } : m
    );

    const nextDb: Database = {
      ...db,
      PEDIDOS: [...(db.PEDIDOS || []), newOrder],
      DETALLE_PEDIDO: [...(db.DETALLE_PEDIDO || []), newDetail],
      MESAS: nextMesas,
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    setSelectedMesaForOrder(null);
    showToast(`Pedido #${orderId} registrado para Mesa ${db.MESAS?.find((m) => m.IDMESA === mesaId)?.NUNMESA || mesaId}`);

    await insertOperations([
      { table: "PEDIDOS", row: newOrder },
      { table: "DETALLE_PEDIDO", row: newDetail },
    ]);
    await updateRecord("MESAS", "IDMESA", mesaId, { ESTADO: "O" });
  };

  // 6. OPERACION: Cambiar estado de pedido (Pendiente -> Completado / Atendido)
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    const nextPedidos = (db.PEDIDOS || []).map((p) =>
      p.IDPEDIDO === orderId ? { ...p, ESTADO: newStatus } : p
    );
    const nextDb = { ...db, PEDIDOS: nextPedidos };
    setDb(nextDb);
    saveData(nextDb);
    if (selectedOrder && selectedOrder.IDPEDIDO === orderId) {
      setSelectedOrder({ ...selectedOrder, ESTADO: newStatus });
    }
    showToast(`Pedido #${orderId} actualizado a estado "${newStatus}"`);

    await updateRecord("PEDIDOS", "IDPEDIDO", orderId, { ESTADO: newStatus });
  };

  // 7. VENTAS: Registrar venta a partir de pedido
  const addSale = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pedidoId = Number(f.get("pedidoId"));
    const clienteId = Number(f.get("clienteId") || (db.CLIENTE?.[0]?.IDCLIENTE ?? 1));
    const metodoId = Number(f.get("metodoId") || (db.METODO_PAGO?.[0]?.IDMETODO_PAGO ?? 1));
    const tipoComprobante = String(f.get("tipoComprobante") || "BOLETA");

    // Calcular importe desde DETALLE_PEDIDO o monto ingresado
    const orderItems = (db.DETALLE_PEDIDO || []).filter((d) => d.IDPEDIDO === pedidoId);
    let subtotalCalculado = orderItems.reduce((acc, d) => acc + (Number(d.CANTIDAD) || 1) * (Number(d.PRECIO) || 0), 0);
    if (subtotalCalculado <= 0) {
      subtotalCalculado = parseFloat(String(f.get("totalManual") || "35.00"));
    }

    const subtotal = parseFloat((subtotalCalculado / 1.18).toFixed(2));
    const igv = parseFloat((subtotalCalculado - subtotal).toFixed(2));
    const total = subtotalCalculado;

    const saleId = nextId(db.VENTAS || [], "IDVENTAS");
    const docNum = `${tipoComprobante === "FACTURA" ? "F001" : "B001"}-${String(saleId).padStart(6, "0")}`;
    const todayStr = new Date().toISOString().split("T")[0];

    const newSale = {
      IDVENTAS: saleId,
      IDMETODO_PAGO: metodoId,
      IDPEDIDO: pedidoId,
      IDUSUARIO: 1,
      IDCLIENTE: clienteId,
      FECHAVENTA: todayStr,
      DOCUMENTO: docNum,
      SUBTOTOTAL: subtotal,
      IGV: igv,
      TOTALPAGAR: total,
      ESTADO: "C", // Cobrado / Confirmado
    };

    // Crear comprobante electronico
    const operations: { table: string; row: any }[] = [{ table: "VENTAS", row: newSale }];
    let nextBoleta = [...(db.BOLETA || [])];
    let nextFactura = [...(db.FACTURA || [])];

    if (tipoComprobante === "FACTURA") {
      const fid = nextId(db.FACTURA || [], "IDFACTURA");
      const newFactura = {
        IDFACTURA: fid,
        IDVENTAS: saleId,
        FECHAEMISION: new Date().toISOString(),
        NUMERO: String(saleId).padStart(6, "0"),
        SERIE: "F001",
        ESTADO: "A",
      };
      nextFactura.push(newFactura);
      operations.push({ table: "FACTURA", row: newFactura });
    } else {
      const bid = nextId(db.BOLETA || [], "IDBOLETA");
      const newBoleta = {
        IDBOLETA: bid,
        IDVENTAS: saleId,
        FECHAEMISION: new Date().toISOString(),
        NUMERO: String(saleId).padStart(6, "0"),
        SERIE: "B001",
        ESTADO: "A",
      };
      nextBoleta.push(newBoleta);
      operations.push({ table: "BOLETA", row: newBoleta });
    }

    // Actualizar estado del pedido a 'F' (Facturado) y liberar la mesa
    const pedidoObj = (db.PEDIDOS || []).find((p) => p.IDPEDIDO === pedidoId);
    const mesaId = pedidoObj?.IDMESA;

    const nextPedidos = (db.PEDIDOS || []).map((p) =>
      p.IDPEDIDO === pedidoId ? { ...p, ESTADO: "F" } : p
    );
    const nextMesas = mesaId
      ? (db.MESAS || []).map((m) => (m.IDMESA === mesaId ? { ...m, ESTADO: "D" } : m))
      : (db.MESAS || []);

    const nextDb: Database = {
      ...db,
      VENTAS: [...(db.VENTAS || []), newSale],
      BOLETA: nextBoleta,
      FACTURA: nextFactura,
      PEDIDOS: nextPedidos,
      MESAS: nextMesas,
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    showToast(`Venta #${saleId} registrada con comprobante ${docNum}`);

    await insertOperations(operations);
    await updateRecord("PEDIDOS", "IDPEDIDO", pedidoId, { ESTADO: "F" });
    if (mesaId) {
      await updateRecord("MESAS", "IDMESA", mesaId, { ESTADO: "D" });
    }
  };

  // 8. COMPROBANTES: Generar comprobante manual para venta existente
  const generateManualReceipt = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const saleId = Number(f.get("saleId"));
    const tipo = String(f.get("tipoComprobante") || "BOLETA");

    const sale = (db.VENTAS || []).find((v) => v.IDVENTAS === saleId);
    if (!sale) return;

    if (tipo === "FACTURA") {
      const fid = nextId(db.FACTURA || [], "IDFACTURA");
      const newFactura = {
        IDFACTURA: fid,
        IDVENTAS: saleId,
        FECHAEMISION: new Date().toISOString(),
        NUMERO: String(fid).padStart(6, "0"),
        SERIE: "F001",
        ESTADO: "A",
      };
      const nextDb = { ...db, FACTURA: [...(db.FACTURA || []), newFactura] };
      setDb(nextDb);
      saveData(nextDb);
      await insertRecord("FACTURA", newFactura);
    } else {
      const bid = nextId(db.BOLETA || [], "IDBOLETA");
      const newBoleta = {
        IDBOLETA: bid,
        IDVENTAS: saleId,
        FECHAEMISION: new Date().toISOString(),
        NUMERO: String(bid).padStart(6, "0"),
        SERIE: "B001",
        ESTADO: "A",
      };
      const nextDb = { ...db, BOLETA: [...(db.BOLETA || []), newBoleta] };
      setDb(nextDb);
      saveData(nextDb);
      await insertRecord("BOLETA", newBoleta);
    }

    setModal(null);
    showToast(`Comprobante ${tipo} generado exitosamente`);
  };

  // 9. COMPROBANTES: Imprimir ticket térmico
  const handlePrint = (item: any, tipo: string) => {
    const sale = (db.VENTAS || []).find((v) => v.IDVENTAS === item.IDVENTAS);
    const cli = sale ? clientName(sale.IDCLIENTE) : "Cliente General";
    const total = sale ? Number(sale.TOTALPAGAR) || 0 : 0;

    setSelectedPrintItem({
      tipo,
      serie: item.SERIE,
      numero: item.NUMERO,
      idVenta: item.IDVENTAS,
      fecha: item.FECHAEMISION,
      estado: item.ESTADO,
      total,
      cliente: cli,
    });
    setModal("print-receipt");
  };

  // ================= FILTROS =================
  const filteredClients = (db.CLIENTE || []).filter((c) => {
    const p = c.IDPERSONA ? (db.PERSONA || []).find((x) => x.IDPERSONA === c.IDPERSONA) : null;
    const emp = c.IDEMPRESA ? (db.EMPRESA || []).find((x) => x.IDEMPRESA === c.IDEMPRESA) : null;
    const matchesSearch =
      active(clientName(c.IDCLIENTE)) ||
      active(p?.DNI || "") ||
      active(emp?.RUC || "");

    if (tab === "Activos") return matchesSearch && c.ESTADO === "A";
    if (tab === "Inactivos") return matchesSearch && c.ESTADO !== "A";
    return matchesSearch;
  });

  const filteredProducts = (db.PRODUCTO || []).filter((p) => {
    const matchesQuery = active(p.NOMPRODUCTO) || active(p.MARCA || "");
    if (selectedCategory === "Todas") return matchesQuery;
    const cat = (db.CATEGORIA || []).find((c) => c.IDCATEGORIA === p.IDCATEGORIA);
    return matchesQuery && cat?.NOMCATEGORIA === selectedCategory;
  });

  return (
    <>
      {/* TOAST FLOTANTE DE NOTIFICACION */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#1e1d31",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            borderLeft: "4px solid #10b981",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toast}</span>
        </div>
      )}

      {/* ================= VISTA CLIENTES ================= */}
      {view === "clientes" && (
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
              <option value="Todos">Todos ({db.CLIENTE?.length || 0})</option>
              <option value="Activos">Activos ({db.CLIENTE?.filter((c) => c.ESTADO === "A").length || 0})</option>
              <option value="Inactivos">Inactivos ({db.CLIENTE?.filter((c) => c.ESTADO !== "A").length || 0})</option>
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
                  ? (db.PERSONA || []).find((x) => x.IDPERSONA === c.IDPERSONA)
                  : null;
                const emp = c.IDEMPRESA
                  ? (db.EMPRESA || []).find((x) => x.IDEMPRESA === c.IDEMPRESA)
                  : null;
                return [
                  <b>{p ? `${p.NOMBRES} ${p.APEPATERNO}` : emp?.RAZON_SOCIAL || "—"}</b>,
                  p ? "Persona natural" : "Empresa",
                  p?.DNI || emp?.RUC || "—",
                  p?.CORREO || emp?.TELEFONO || p?.CELULAR || "—",
                  badge(c.ESTADO),
                  <button
                    className="btn outline"
                    style={{ padding: "4px 8px", fontSize: 11 }}
                    onClick={() => {
                      setClientActionTarget(c);
                      setModal("client-action");
                    }}
                  >
                    Opciones
                  </button>,
                ];
              })}
            />
          </div>

          {modal === "client" && (
            <Modal title="Registrar nuevo cliente" close={() => setModal(null)}>
              <form onSubmit={addClient}>
                <div className="form-grid">
                  <label>
                    Nombres *
                    <input name="nombre" required placeholder="Ej. Carlos Juan" />
                  </label>
                  <label>
                    Apellidos *
                    <input name="apellido" required placeholder="Ej. Mendoza Castro" />
                  </label>
                  <label>
                    DNI *
                    <input
                      name="dni"
                      pattern="[0-9]{8}"
                      required
                      placeholder="8 dígitos numéricos"
                      maxLength={8}
                    />
                  </label>
                  <label>
                    Correo electrónico *
                    <input type="email" name="correo" required placeholder="cliente@correo.com" />
                  </label>
                  <label>
                    Celular
                    <input name="celular" defaultValue="987654321" />
                  </label>
                  <label>
                    Dirección
                    <input name="direccion" defaultValue="Av. Principal 123, Lima" />
                  </label>
                </div>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}

          {modal === "client-action" && clientActionTarget && (
            <Modal title="Gestionar cliente" close={() => setModal(null)}>
              <div style={{ padding: "10px 0" }}>
                <p style={{ margin: "0 0 16px 0", fontSize: 14 }}>
                  Cliente: <b>{clientName(clientActionTarget.IDCLIENTE)}</b> (Estado actual:{" "}
                  {clientActionTarget.ESTADO === "A" ? "Activo" : "Inactivo"})
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`btn ${clientActionTarget.ESTADO === "A" ? "danger" : "primary"}`}
                    onClick={() => toggleClientStatus(clientActionTarget)}
                  >
                    {clientActionTarget.ESTADO === "A" ? "Desactivar cliente" : "Activar cliente"}
                  </button>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => setModal(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </PageHead>
      )}

      {/* ================= VISTA PRODUCTOS ================= */}
      {view === "productos" && (
        <PageHead
          title="Productos"
          desc="Catálogo de platos, bebidas y categorías gastronómicas"
          action="Nuevo producto"
          onAction={() => setModal("product")}
        >
          <div className="filterbar">
            <SearchBox
              value={query}
              setValue={setQuery}
              placeholder="Buscar producto o marca"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="Todas">Todas las categorías ({db.PRODUCTO?.length || 0})</option>
              {(db.CATEGORIA || []).map((c) => (
                <option key={c.IDCATEGORIA} value={c.NOMCATEGORIA}>
                  {c.NOMCATEGORIA}
                </option>
              ))}
            </select>
          </div>
          <div className="product-grid">
            {filteredProducts.map((p) => (
              <div className="product-card" key={p.IDPRODUCTO}>
                <div className="product-image">
                  <ChefHat size={24} />
                  <span>
                    {(db.CATEGORIA || []).find((c) => c.IDCATEGORIA === p.IDCATEGORIA)
                      ?.NOMCATEGORIA || "General"}
                  </span>
                </div>
                <div className="product-info">
                  <h3>{p.NOMPRODUCTO}</h3>
                  <p>{p.DESCRIPCION || "Delicioso platillo tradicional preparado al instante."}</p>
                  <div>
                    <b>{money(p.PRECIO)}</b>
                    <span>{badge(p.ESTADO)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {modal === "product" && (
            <Modal title="Registrar nuevo producto gastronómico" close={() => setModal(null)}>
              <form onSubmit={addProduct}>
                <label>
                  Nombre del producto *
                  <input name="nombre" required placeholder="Ej. Lomo Saltado Criollo" />
                </label>
                <div className="form-grid">
                  <label>
                    Categoría *
                    <select name="cat">
                      {(db.CATEGORIA || []).map((c) => (
                        <option value={c.IDCATEGORIA} key={c.IDCATEGORIA}>
                          {c.NOMCATEGORIA}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Precio de venta (S/) *
                    <input
                      name="precio"
                      type="number"
                      min="0.5"
                      step="0.10"
                      required
                      placeholder="0.00"
                    />
                  </label>
                  <label>
                    Marca / Origen
                    <input name="marca" defaultValue="Castillón Gourmet" />
                  </label>
                </div>
                <label>
                  Descripción de preparación
                  <textarea
                    name="descripcion"
                    required
                    placeholder="Detalla los ingredientes y presentación..."
                  />
                </label>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}
        </PageHead>
      )}

      {/* ================= VISTA MESAS Y PEDIDOS ================= */}
      {view === "operacion" && (
        <PageHead
          title="Mesas y pedidos"
          desc="Control operativo del salón en vivo. Haz clic en una mesa para alternar su estado."
          action="Crear pedido"
          onAction={() => {
            setSelectedMesaForOrder(null);
            setModal("order");
          }}
        >
          <div className="table-card card mb-6">
            <div className="section-head">
              <div>
                <h3>Estado de mesas ({db.MESAS?.length || 0})</h3>
                <p>Haz clic en cualquier mesa para alternar entre Disponible y Ocupada</p>
              </div>
              <button
                className="btn outline"
                onClick={() => setModal("table")}
                type="button"
              >
                <Plus size={16} /> Nueva mesa
              </button>
            </div>
            <div className="mesa-grid">
              {(db.MESAS || []).map((m) => (
                <div
                  className={`mesa ${m.ESTADO === "O" ? "occupied" : ""}`}
                  key={m.IDMESA}
                  onClick={() => toggleMesa(m)}
                  title="Haz clic para cambiar estado de mesa"
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
                <p>Estados: P (Pendiente), C (Completado/Servido), F (Facturado/Cobrado)</p>
              </div>
              <SearchBox
                value={query}
                setValue={setQuery}
                placeholder="Buscar por # de pedido"
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
              rows={(db.PEDIDOS || [])
                .filter((p) => String(p.IDPEDIDO).includes(query))
                .slice()
                .reverse()
                .map((p) => {
                  const items = (db.DETALLE_PEDIDO || []).filter(
                    (d) => d.IDPEDIDO === p.IDPEDIDO
                  );
                  const amount = items.reduce(
                    (a, d) => a + (Number(d.CANTIDAD) || 1) * (Number(d.PRECIO) || 0),
                    0
                  );
                  const mesaNum =
                    (db.MESAS || []).find((m) => m.IDMESA === p.IDMESA)?.NUNMESA || p.IDMESA;
                  return [
                    <b>#{String(p.IDPEDIDO).padStart(4, "0")}</b>,
                    `Mesa ${mesaNum}`,
                    date(p.FECHA),
                    money(amount > 0 ? amount : 35),
                    badge(p.ESTADO),
                    <button
                      className="link"
                      onClick={() => {
                        setSelectedOrder(p);
                        setModal("order-detail");
                      }}
                    >
                      Consultar detalle
                    </button>,
                  ];
                })}
            />
          </div>

          {/* MODAL CREAR PEDIDO */}
          {modal === "order" && (
            <Modal title="Crear nuevo pedido de salón" close={() => setModal(null)}>
              <form onSubmit={addOrder}>
                <div className="form-grid">
                  <label>
                    Mesa a asignar *
                    <select
                      name="mesaId"
                      defaultValue={selectedMesaForOrder || db.MESAS?.[0]?.IDMESA}
                    >
                      {(db.MESAS || []).map((m) => (
                        <option key={m.IDMESA} value={m.IDMESA}>
                          Mesa {m.NUNMESA} (Piso {m.NUMPISO}) -{" "}
                          {m.ESTADO === "O" ? "Ocupada" : "Disponible"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Plato / Producto principal *
                    <select name="prodId">
                      {(db.PRODUCTO || []).map((p) => (
                        <option key={p.IDPRODUCTO} value={p.IDPRODUCTO}>
                          {p.NOMPRODUCTO} — {money(p.PRECIO)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Cantidad de porciones *
                    <input
                      name="qty"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue="1"
                      required
                    />
                  </label>
                  <label>
                    Mozo / Usuario
                    <input defaultValue="Administrador / Turno Mañana" readOnly />
                  </label>
                </div>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}

          {/* MODAL NUEVA MESA */}
          {modal === "table" && (
            <Modal title="Agregar mesa al plano operativo" close={() => setModal(null)}>
              <form onSubmit={addTable}>
                <div className="form-grid">
                  <label>
                    Número o identificador de mesa *
                    <input
                      name="num"
                      required
                      placeholder="Ej. 13"
                      defaultValue={String((db.MESAS?.length || 0) + 1)}
                    />
                  </label>
                  <label>
                    Número de piso *
                    <select name="piso">
                      <option value="1">Piso 1 (Salón Principal)</option>
                      <option value="2">Piso 2 (Terraza / VIP)</option>
                    </select>
                  </label>
                </div>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}

          {/* MODAL CONSULTAR DETALLE DE PEDIDO */}
          {modal === "order-detail" && selectedOrder && (
            <Modal
              title={`Detalle de Pedido #${String(selectedOrder.IDPEDIDO).padStart(4, "0")}`}
              close={() => {
                setSelectedOrder(null);
                setModal(null);
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: "4px 0", fontSize: 13 }}>
                  <b>Mesa:</b>{" "}
                  {db.MESAS?.find((m) => m.IDMESA === selectedOrder.IDMESA)?.NUNMESA ||
                    selectedOrder.IDMESA}{" "}
                  | <b>Fecha:</b> {date(selectedOrder.FECHA)} | <b>Estado actual:</b>{" "}
                  {selectedOrder.ESTADO === "P"
                    ? "Pendiente en cocina"
                    : selectedOrder.ESTADO === "C"
                    ? "Completado / Servido"
                    : "Facturado"}
                </p>
              </div>

              <div className="card table-card" style={{ marginBottom: 16 }}>
                <Table
                  headers={["Producto", "Cant.", "P. Unitario", "Subtotal"]}
                  rows={(db.DETALLE_PEDIDO || [])
                    .filter((d) => d.IDPEDIDO === selectedOrder.IDPEDIDO)
                    .map((d) => {
                      const prod = (db.PRODUCTO || []).find(
                        (p) => p.IDPRODUCTO === d.IDPRODUCTO
                      );
                      const cant = Number(d.CANTIDAD) || 1;
                      const pu = Number(d.PRECIO) || 0;
                      return [
                        prod?.NOMPRODUCTO || `Producto #${d.IDPRODUCTO}`,
                        cant,
                        money(pu),
                        money(cant * pu),
                      ];
                    })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedOrder.ESTADO === "P" && (
                  <button
                    className="btn primary"
                    onClick={() => updateOrderStatus(selectedOrder.IDPEDIDO, "C")}
                  >
                    Marcar como Atendido (Completado)
                  </button>
                )}
                {selectedOrder.ESTADO !== "F" && (
                  <button
                    className="btn primary"
                    style={{ background: "#10b981" }}
                    onClick={() => {
                      setModal("sale");
                    }}
                  >
                    Cobrar y generar venta
                  </button>
                )}
                <button
                  className="btn outline"
                  onClick={() => {
                    setSelectedOrder(null);
                    setModal(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </Modal>
          )}
        </PageHead>
      )}

      {/* ================= VISTA VENTAS ================= */}
      {view === "ventas" && (
        <PageHead
          title="Ventas"
          desc="Transacciones comerciales y facturación a clientes"
          action="Registrar venta"
          onAction={() => setModal("sale")}
        >
          <div className="stats compact">
            <Stat
              icon={CircleDollarSign}
              label="Total vendido"
              value={money(
                (db.VENTAS || []).reduce(
                  (a, v) => a + (Number(v.TOTALPAGAR) || 0),
                  0
                )
              )}
              note="IGV 18% incluido"
              color="purple"
            />
            <Stat
              icon={ShoppingBag}
              label="Transacciones"
              value={db.VENTAS?.length || 0}
              note="Comprobantes emitidos"
              color="blue"
            />
          </div>
          <div className="card table-card">
            <div className="filterbar">
              <SearchBox
                value={query}
                setValue={setQuery}
                placeholder="Buscar venta, comprobante o cliente"
              />
            </div>
            <Table
              headers={[
                "Venta",
                "Fecha",
                "Cliente",
                "Comprobante",
                "Subtotal",
                "IGV",
                "Total a pagar",
                "Estado",
              ]}
              rows={(db.VENTAS || [])
                .filter(
                  (v) =>
                    active(String(v.IDVENTAS)) ||
                    active(clientName(v.IDCLIENTE)) ||
                    active(v.DOCUMENTO || "")
                )
                .slice()
                .reverse()
                .map((v) => [
                  <b>#{String(v.IDVENTAS).padStart(5, "0")}</b>,
                  date(v.FECHAVENTA),
                  clientName(v.IDCLIENTE),
                  v.DOCUMENTO || `TICK-${v.IDVENTAS}`,
                  money(v.SUBTOTOTAL),
                  money(v.IGV),
                  <strong>{money(v.TOTALPAGAR)}</strong>,
                  badge(v.ESTADO),
                ])}
            />
          </div>

          {modal === "sale" && (
            <Modal title="Registrar venta de salón" close={() => setModal(null)}>
              <form onSubmit={addSale}>
                <label>
                  Pedido a liquidar *
                  <select name="pedidoId" required>
                    {(db.PEDIDOS || []).slice(-15).reverse().map((p) => {
                      const mesa = (db.MESAS || []).find((m) => m.IDMESA === p.IDMESA)?.NUNMESA || p.IDMESA;
                      const hasVenta = (db.VENTAS || []).some((v) => v.IDPEDIDO === p.IDPEDIDO);
                      return (
                        <option key={p.IDPEDIDO} value={p.IDPEDIDO}>
                          Pedido #{p.IDPEDIDO} (Mesa {mesa} - {p.ESTADO === "F" || hasVenta ? "Ya cobrado" : "Por cobrar"})
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Cliente *
                    <select name="clienteId">
                      {(db.CLIENTE || []).slice(0, 15).map((c) => (
                        <option key={c.IDCLIENTE} value={c.IDCLIENTE}>
                          {clientName(c.IDCLIENTE)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Método de pago *
                    <select name="metodoId">
                      {(db.METODO_PAGO || []).map((m) => (
                        <option key={m.IDMETODO_PAGO} value={m.IDMETODO_PAGO}>
                          {m.NOMMETODO}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Tipo de comprobante *
                    <select name="tipoComprobante">
                      <option value="BOLETA">Boleta de Venta Electrónica</option>
                      <option value="FACTURA">Factura Electrónica</option>
                    </select>
                  </label>
                  <label>
                    Monto total estimado (S/)
                    <input
                      name="totalManual"
                      type="number"
                      step="0.10"
                      min="1"
                      defaultValue="45.00"
                    />
                  </label>
                </div>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}
        </PageHead>
      )}

      {/* ================= VISTA COMPROBANTES ================= */}
      {view === "comprobantes" && (
        <PageHead
          title="Comprobantes"
          desc="Emisión y reimpresión de Boletas y Facturas electrónicas"
          action="Generar comprobante"
          onAction={() => setModal("receipt")}
        >
          <div className="card table-card">
            <Table
              headers={[
                "Tipo",
                "Serie - Número",
                "Venta asociada",
                "Fecha de emisión",
                "Estado",
                "Acciones",
              ]}
              rows={[
                ...(db.BOLETA || []).map((b) => [
                  "Boleta",
                  `${b.SERIE} - ${b.NUMERO}`,
                  `#${b.IDVENTAS}`,
                  date(b.FECHAEMISION),
                  badge(b.ESTADO),
                  <button
                    className="link"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => handlePrint(b, "Boleta Electrónica")}
                  >
                    <Printer size={14} /> Imprimir
                  </button>,
                ]),
                ...(db.FACTURA || []).map((f) => [
                  "Factura",
                  `${f.SERIE} - ${f.NUMERO}`,
                  `#${f.IDVENTAS}`,
                  date(f.FECHAEMISION),
                  badge(f.ESTADO),
                  <button
                    className="link"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => handlePrint(f, "Factura Electrónica")}
                  >
                    <Printer size={14} /> Imprimir
                  </button>,
                ]),
              ]
                .slice()
                .reverse()
                .slice(0, 30)}
            />
          </div>

          {/* MODAL GENERAR COMPROBANTE MANUAL */}
          {modal === "receipt" && (
            <Modal title="Emitir comprobante de pago" close={() => setModal(null)}>
              <form onSubmit={generateManualReceipt}>
                <label>
                  Seleccionar venta registrada *
                  <select name="saleId" required>
                    {(db.VENTAS || []).slice(-15).reverse().map((v) => (
                      <option key={v.IDVENTAS} value={v.IDVENTAS}>
                        Venta #{v.IDVENTAS} — {clientName(v.IDCLIENTE)} — {money(v.TOTALPAGAR)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Tipo de documento *
                    <select name="tipoComprobante">
                      <option value="BOLETA">Boleta Electrónica (B001)</option>
                      <option value="FACTURA">Factura Electrónica (F001)</option>
                    </select>
                  </label>
                  <label>
                    Punto de emisión
                    <input defaultValue="Caja Principal Salón 01" readOnly />
                  </label>
                </div>
                <FormActions close={() => setModal(null)} />
              </form>
            </Modal>
          )}

          {/* MODAL IMPRIMIR TICKET */}
          {modal === "print-receipt" && selectedPrintItem && (
            <Modal
              title={`Vista de Impresión · ${selectedPrintItem.tipo}`}
              close={() => {
                setSelectedPrintItem(null);
                setModal(null);
              }}
            >
              <div className="ticket-container">
                <div className="ticket-header">
                  <h4>RESTAURANTE CASTILLÓN S.A.C.</h4>
                  <p>RUC: 20601234567</p>
                  <p>Av. Gastronómica 1234 - Lima</p>
                  <p>Telf: (01) 456-7890</p>
                  <h4 style={{ marginTop: 8 }}>{selectedPrintItem.tipo.toUpperCase()}</h4>
                  <p><b>{selectedPrintItem.serie} - {selectedPrintItem.numero}</b></p>
                </div>
                <div className="ticket-row">
                  <span>Fecha:</span>
                  <span>{date(selectedPrintItem.fecha)}</span>
                </div>
                <div className="ticket-row">
                  <span>Cliente:</span>
                  <span>{selectedPrintItem.cliente}</span>
                </div>
                <div className="ticket-row">
                  <span>Venta Ref.:</span>
                  <span>#{selectedPrintItem.idVenta}</span>
                </div>
                <div className="ticket-divider" />
                <div className="ticket-row">
                  <span>Consumo de Salón:</span>
                  <span>{money(selectedPrintItem.total / 1.18)}</span>
                </div>
                <div className="ticket-row">
                  <span>IGV (18%):</span>
                  <span>{money(selectedPrintItem.total - selectedPrintItem.total / 1.18)}</span>
                </div>
                <div className="ticket-divider" />
                <div className="ticket-total">
                  <span>TOTAL A PAGAR:</span>
                  <span>{money(selectedPrintItem.total)}</span>
                </div>
                <div className="ticket-header" style={{ borderBottom: "none", marginTop: 14 }}>
                  <p>¡Gracias por su preferencia!</p>
                  <small style={{ fontSize: 10, color: "#94a3b8" }}>Representación impresa de Comprobante de Pago Electrónico</small>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Imprimir comprobante
                </button>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => {
                    setSelectedPrintItem(null);
                    setModal(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </Modal>
          )}
        </PageHead>
      )}

      {/* ================= VISTA FINANZAS ================= */}
      {view === "finanzas" && (
        <PageHead
          title="Finanzas"
          desc="Deudas, ingresos, egresos y balances de restaurante"
        >
          <div className="stats compact">
            <Stat
              icon={CircleDollarSign}
              label="Ingresos relacionados"
              value={db.INGRESO?.length || 0}
              note="Importe derivado de ventas"
              color="green"
            />
            <Stat
              icon={Wallet}
              label="Egresos registrados"
              value={money((db.EGRESO || []).reduce((a, e) => a + (Number(e.TOTAL) || 0), 0))}
              note="Según balance contable"
              color="orange"
            />
          </div>
          <div className="card table-card">
            <div className="section-head">
              <div>
                <h3>Movimientos recientes</h3>
                <p>Registro de pagos y liquidaciones</p>
              </div>
            </div>
            <Table
              headers={["Tipo", "Referencia", "Fecha", "Estado"]}
              rows={(db.INGRESO || []).slice(0, 12).map((i) => [
                "Ingreso",
                `Deuda #${i.IDDEUDA_GENERADA}`,
                date(i.FECHAPAGO),
                badge(i.ESTADO),
              ])}
            />
          </div>
        </PageHead>
      )}

      {/* ================= VISTA PERSONAL Y UBICACION ================= */}
      {(view === "personal" || view === "ubicacion") && (
        <PageHead
          title={view === "personal" ? "Personal y acceso" : "Ubicación"}
          desc={
            view === "personal"
              ? "Empleados, usuarios del sistema y turnos asignados"
              : "Catálogos geográficos y sedes"
          }
        >
          <div className="catalog-grid">
            {(view === "personal"
              ? [
                  ["Empleados", db.EMPLEADO?.length || 0],
                  ["Usuarios", db.USUARIO?.length || 0],
                  ["Cargos", db.CARGO?.length || 0],
                  ["Contratos", db.CONTRATO?.length || 0],
                  ["Tipos de usuario", db.TIPO_USUARIO?.length || 0],
                ]
              : [
                  ["Departamentos", db.DEPARTAMENTO?.length || 0],
                  ["Provincias", db.PROVINCIA?.length || 0],
                  ["Distritos", db.DISTRITO?.length || 0],
                ]
            ).map((x) => (
              <div className="catalog-card" key={String(x[0])}>
                <div className="round-icon purple">
                  <MapPin size={19} />
                </div>
                <div>
                  <b>{x[0]}</b>
                  <strong>{x[1]}</strong>
                  <small>registros en base de datos</small>
                </div>
                <ChevronRight size={18} />
              </div>
            ))}
          </div>
          <div className="card table-card">
            <h3>
              {view === "personal" ? "Personal activo" : "Departamentos registrados"}
            </h3>
            <Table
              headers={
                view === "personal"
                  ? ["Empleado", "Cargo", "Contrato", "Salario", "Turno", "Estado"]
                  : ["ID", "Departamento", "Estado"]
              }
              rows={
                view === "personal"
                  ? (db.EMPLEADO || []).slice(0, 12).map((e) => [
                      personName(e.IDPERSONA),
                      (db.CARGO || []).find((c) => c.IDCARGO === e.IDCARGO)?.NOMCARGO || "Colaborador",
                      (db.CONTRATO || []).find((c) => c.IDCONTRATO === e.IDCONTRATO)?.NOMCONTRATO || "Indeterminado",
                      money(e.SALARIO),
                      e.TURNO || "Mañana",
                      badge(e.ESTADO),
                    ])
                  : (db.DEPARTAMENTO || []).slice(0, 12).map((d) => [
                      d.IDDepartamento,
                      d.NOMDEPARTAMENTO,
                      badge(d.ESTADO),
                    ])
              }
            />
          </div>
        </PageHead>
      )}

      {/* ================= VISTA REPORTES ================= */}
      {view === "reportes" && (
        <PageHead
          title="Reportes"
          desc="Métricas y estadísticas calculadas en tiempo real"
        >
          <div className="stats">
            <Stat
              icon={CircleDollarSign}
              label="Ventas acumuladas"
              value={money((db.VENTAS || []).reduce((a, v) => a + (Number(v.TOTALPAGAR) || 0), 0))}
              note="Total general facturado"
              color="purple"
            />
            <Stat
              icon={ClipboardList}
              label="Pedidos registrados"
              value={db.PEDIDOS?.length || 0}
              note="Histórico de comandas"
              color="orange"
            />
            <Stat
              icon={Wallet}
              label="Ingresos liquidados"
              value={db.INGRESO?.length || 0}
              note="Relacionados a deudas"
              color="green"
            />
          </div>
          <div className="grid-two">
            <div className="card report-bars">
              <h3>Ventas por método de pago</h3>
              {(db.METODO_PAGO || []).slice(0, 5).map((m) => {
                const n = (db.VENTAS || []).filter(
                  (v) => v.IDMETODO_PAGO === m.IDMETODO_PAGO
                ).length;
                return (
                  <div className="report-line" key={m.IDMETODO_PAGO}>
                    <span>{m.NOMMETODO}</span>
                    <div>
                      <i style={{ width: `${Math.max(8, n * 20)}%` }} />
                    </div>
                    <b>{n} transacciones</b>
                  </div>
                );
              })}
            </div>
            <div className="card report-bars">
              <h3>Pedidos por estado de atención</h3>
              {[
                { code: "P", label: "Pendientes en cocina" },
                { code: "C", label: "Completados / Servidos" },
                { code: "F", label: "Facturados / Cobrados" },
              ].map((s) => {
                const count = (db.PEDIDOS || []).filter((p) => p.ESTADO === s.code).length;
                const total = db.PEDIDOS?.length || 1;
                return (
                  <div className="report-line" key={s.code}>
                    <span>{s.label} ({s.code})</span>
                    <div>
                      <i
                        className="orange-bar"
                        style={{ width: `${Math.max(5, (count / total) * 100)}%` }}
                      />
                    </div>
                    <b>{count}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </PageHead>
      )}

      {/* ================= VISTA CONFIGURACION ================= */}
      {view === "configuracion" && (
        <PageHead title="Configuración" desc="Opciones y sincronización del sistema">
          <div className="card settings">
            <h3>Datos y persistencia</h3>
            <p>
              El sistema sincroniza automáticamente las operaciones en la base de datos PostgreSQL de producción
              y mantiene una copia local rápida en el navegador.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <button
                className="btn danger"
                onClick={() => {
                  if (confirm("¿Deseas restablecer la memoria local del navegador a los datos iniciales?")) {
                    setDb(resetData());
                    showToast("Caché local restablecida");
                  }
                }}
              >
                <RefreshCcw size={16} /> Restablecer caché local
              </button>
            </div>
          </div>
        </PageHead>
      )}
    </>
  );
}

export default Module;
