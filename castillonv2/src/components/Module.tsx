import { useState, useMemo } from "react";
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
  Trash2,
  CreditCard,
  Receipt,
  FileText,
  DollarSign,
  UserCheck,
  Minus,
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

interface OrderLineItem {
  id: string;
  prodId: number;
  nombre: string;
  precio: number;
  qty: number;
}

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
  user,
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
  user?: any;
}) {
  const [tab, setTab] = useState("Todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderToCharge, setOrderToCharge] = useState<any | null>(null);
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
    items?: { nombre: string; cant: number; pu: number; sub: number }[];
  } | null>(null);
  const [clientActionTarget, setClientActionTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Estados para creación de pedido con múltiples productos
  const [newOrderItems, setNewOrderItems] = useState<OrderLineItem[]>([]);
  const [builderProdId, setBuilderProdId] = useState<number>(0);
  const [builderQty, setBuilderQty] = useState<number>(1);
  const [selectedAttendant, setSelectedAttendant] = useState<string>(
    user?.nombre || "Thiago Alejandro Ramírez"
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const active = (s: string) => (s || "").toLowerCase().includes(query.toLowerCase());

  // Nombre de quien atiende por defecto
  const currentAttendantName = user?.nombre || "Thiago Alejandro Ramírez";

  // Lista de personal disponible para atender pedidos
  const attendantsList = useMemo(() => {
    const list: string[] = [currentAttendantName];
    (db.EMPLEADO || []).forEach((e) => {
      const name = personName(e.IDPERSONA);
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  }, [db.EMPLEADO, db.PERSONA, currentAttendantName]);

  // Manejo de productos dinámicos en el constructor de pedidos
  const handleAddProductToBuilder = () => {
    const prodId = builderProdId || (db.PRODUCTO?.[0]?.IDPRODUCTO ?? 1);
    const prod = (db.PRODUCTO || []).find((p) => p.IDPRODUCTO === prodId);
    if (!prod) return;

    const existingIndex = newOrderItems.findIndex((it) => it.prodId === prodId);
    if (existingIndex >= 0) {
      const updated = [...newOrderItems];
      updated[existingIndex].qty += builderQty;
      setNewOrderItems(updated);
    } else {
      setNewOrderItems((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          prodId: prod.IDPRODUCTO,
          nombre: prod.NOMPRODUCTO,
          precio: Number(prod.PRECIO) || 0,
          qty: builderQty,
        },
      ]);
    }
    setBuilderQty(1);
  };

  const handleRemoveBuilderItem = (id: string) => {
    setNewOrderItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateBuilderQty = (id: string, delta: number) => {
    setNewOrderItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const totalOrderBuilder = useMemo(() => {
    return newOrderItems.reduce((acc, it) => acc + it.qty * it.precio, 0);
  }, [newOrderItems]);

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
      ESTADO: "D",
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

  // 5. OPERACION: Crear pedido con múltiples productos
  const addOrder = async (e: any) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const mesaId = Number(f.get("mesaId") || selectedMesaForOrder || (db.MESAS?.[0]?.IDMESA ?? 1));
    const attendantName = String(f.get("attendant") || selectedAttendant || currentAttendantName);

    // Si la lista de productos agregados está vacía, incluir al menos el producto del selector actual
    let itemsToSave = [...newOrderItems];
    if (itemsToSave.length === 0) {
      const prodId = builderProdId || (db.PRODUCTO?.[0]?.IDPRODUCTO ?? 1);
      const prod = (db.PRODUCTO || []).find((p) => p.IDPRODUCTO === prodId);
      if (prod) {
        itemsToSave.push({
          id: "default-1",
          prodId: prod.IDPRODUCTO,
          nombre: prod.NOMPRODUCTO,
          precio: Number(prod.PRECIO) || 0,
          qty: builderQty || 1,
        });
      }
    }

    if (itemsToSave.length === 0) {
      showToast("Por favor agrega al menos un producto a la comanda.");
      return;
    }

    const orderId = nextId(db.PEDIDOS || [], "IDPEDIDO");
    let nextDetailId = nextId(db.DETALLE_PEDIDO || [], "IDDETALLE_PEDIDO");
    const todayStr = new Date().toISOString().split("T")[0];

    const newOrder = {
      IDPEDIDO: orderId,
      IDMESA: mesaId,
      FECHA: todayStr,
      ESTADO: "P", // Pendiente
    };

    const detailsToInsert: any[] = [];
    const operations: { table: string; row: any }[] = [{ table: "PEDIDOS", row: newOrder }];

    for (const item of itemsToSave) {
      const det = {
        IDDETALLE_PEDIDO: nextDetailId++,
        IDPEDIDO: orderId,
        IDPRODUCTO: item.prodId,
        IDAREA: 1,
        IDUSUARIO: user?.id || 1,
        CANTIDAD: item.qty,
        PRECIO: item.precio,
        ESTADO: "P",
      };
      detailsToInsert.push(det);
      operations.push({ table: "DETALLE_PEDIDO", row: det });
    }

    // Actualizar mesa a ocupada
    const nextMesas = (db.MESAS || []).map((m) =>
      m.IDMESA === mesaId ? { ...m, ESTADO: "O" } : m
    );

    const nextDb: Database = {
      ...db,
      PEDIDOS: [...(db.PEDIDOS || []), newOrder],
      DETALLE_PEDIDO: [...(db.DETALLE_PEDIDO || []), ...detailsToInsert],
      MESAS: nextMesas,
    };

    setDb(nextDb);
    saveData(nextDb);
    setModal(null);
    setSelectedMesaForOrder(null);
    setNewOrderItems([]);
    showToast(
      `Pedido #${orderId} registrado (${itemsToSave.length} productos) para Mesa ${
        db.MESAS?.find((m) => m.IDMESA === mesaId)?.NUNMESA || mesaId
      } por ${attendantName}`
    );

    await insertOperations(operations);
    await updateRecord("MESAS", "IDMESA", mesaId, { ESTADO: "O" });
  };

  // 6. OPERACION: Cambiar estado de pedido (Pendiente -> Atendido)
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
    const label = newStatus === "C" ? "Atendido" : newStatus === "P" ? "Pendiente" : "Cobrado";
    showToast(`Pedido #${orderId} actualizado a estado "${label}"`);

    await updateRecord("PEDIDOS", "IDPEDIDO", orderId, { ESTADO: newStatus });
  };

  // 7. VENTAS / COBRAR: Liquidar pedido y generar comprobante
  const handleExecuteChargeOrder = async (e: any) => {
    e.preventDefault();
    if (!orderToCharge) return;

    const f = new FormData(e.currentTarget);
    const clienteId = Number(f.get("clienteId") || (db.CLIENTE?.[0]?.IDCLIENTE ?? 1));
    const metodoId = Number(f.get("metodoId") || (db.METODO_PAGO?.[0]?.IDMETODO_PAGO ?? 1));
    const tipoComprobante = String(f.get("tipoComprobante") || "BOLETA");

    // Calcular el consumo real del pedido
    const orderItems = (db.DETALLE_PEDIDO || []).filter(
      (d) => d.IDPEDIDO === orderToCharge.IDPEDIDO
    );
    let totalConsumo = orderItems.reduce(
      (acc, d) => acc + (Number(d.CANTIDAD) || 1) * (Number(d.PRECIO) || 0),
      0
    );
    if (totalConsumo <= 0) {
      totalConsumo = parseFloat(String(f.get("totalManual") || "35.00"));
    }

    const subtotal = parseFloat((totalConsumo / 1.18).toFixed(2));
    const igv = parseFloat((totalConsumo - subtotal).toFixed(2));
    const total = totalConsumo;

    const saleId = nextId(db.VENTAS || [], "IDVENTAS");
    const docNum = `${tipoComprobante === "FACTURA" ? "F001" : "B001"}-${String(saleId).padStart(6, "0")}`;
    const todayStr = new Date().toISOString().split("T")[0];

    const newSale = {
      IDVENTAS: saleId,
      IDMETODO_PAGO: metodoId,
      IDPEDIDO: orderToCharge.IDPEDIDO,
      IDUSUARIO: user?.id || 1,
      IDCLIENTE: clienteId,
      FECHAVENTA: todayStr,
      DOCUMENTO: docNum,
      SUBTOTOTAL: subtotal,
      IGV: igv,
      TOTALPAGAR: total,
      ESTADO: "C", // Confirmado / Cobrado
    };

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

    // Actualizar estado del pedido a 'F' (Facturado) y liberar la mesa a 'D' (Disponible)
    const mesaId = orderToCharge.IDMESA;
    const nextPedidos = (db.PEDIDOS || []).map((p) =>
      p.IDPEDIDO === orderToCharge.IDPEDIDO ? { ...p, ESTADO: "F" } : p
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

    const chargedOrderId = orderToCharge.IDPEDIDO;
    setOrderToCharge(null);
    setSelectedOrder(null);
    setModal(null);

    showToast(`Pedido #${chargedOrderId} cobrado exitosamente con comprobante ${docNum}`);

    // Abrir de inmediato la vista previa para imprimir el comprobante térmico
    const cliNombre = clientName(clienteId);
    setSelectedPrintItem({
      tipo: tipoComprobante === "FACTURA" ? "Factura Electrónica" : "Boleta Electrónica",
      serie: tipoComprobante === "FACTURA" ? "F001" : "B001",
      numero: String(saleId).padStart(6, "0"),
      idVenta: saleId,
      fecha: new Date().toISOString(),
      estado: "A",
      total,
      cliente: cliNombre,
      items: orderItems.map((d) => {
        const prod = (db.PRODUCTO || []).find((p) => p.IDPRODUCTO === d.IDPRODUCTO);
        const cant = Number(d.CANTIDAD) || 1;
        const pu = Number(d.PRECIO) || 0;
        return {
          nombre: prod?.NOMPRODUCTO || `Producto #${d.IDPRODUCTO}`,
          cant,
          pu,
          sub: cant * pu,
        };
      }),
    });
    setModal("print-receipt");

    await insertOperations(operations);
    await updateRecord("PEDIDOS", "IDPEDIDO", chargedOrderId, { ESTADO: "F" });
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

    let items: { nombre: string; cant: number; pu: number; sub: number }[] = [];
    if (sale && sale.IDPEDIDO) {
      const orderItems = (db.DETALLE_PEDIDO || []).filter((d) => d.IDPEDIDO === sale.IDPEDIDO);
      items = orderItems.map((d) => {
        const prod = (db.PRODUCTO || []).find((p) => p.IDPRODUCTO === d.IDPRODUCTO);
        const cant = Number(d.CANTIDAD) || 1;
        const pu = Number(d.PRECIO) || 0;
        return {
          nombre: prod?.NOMPRODUCTO || `Platillo #${d.IDPRODUCTO}`,
          cant,
          pu,
          sub: cant * pu,
        };
      });
    }

    setSelectedPrintItem({
      tipo,
      serie: item.SERIE,
      numero: item.NUMERO,
      idVenta: item.IDVENTAS,
      fecha: item.FECHAEMISION,
      estado: item.ESTADO,
      total,
      cliente: cli,
      items: items.length > 0 ? items : undefined,
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

  // Cálculos proporcionales seguros para reportes (evitar barras de 400% o texto desbordado)
  const maxVentasPorMetodo = useMemo(() => {
    const counts = (db.METODO_PAGO || []).map((m) =>
      (db.VENTAS || []).filter((v) => v.IDMETODO_PAGO === m.IDMETODO_PAGO).length
    );
    return Math.max(...counts, 1);
  }, [db.METODO_PAGO, db.VENTAS]);

  const reportStatusCounts = useMemo(() => {
    const p = (db.PEDIDOS || []).filter((x) => x.ESTADO === "P").length;
    const c = (db.PEDIDOS || []).filter((x) => x.ESTADO === "C" || x.ESTADO === "1").length;
    const f = (db.PEDIDOS || []).filter((x) => x.ESTADO === "F").length;
    const max = Math.max(p, c, f, 1);
    return { p, c, f, max };
  }, [db.PEDIDOS]);

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
          desc="Control operativo del salón en vivo. Haz clic en una mesa para alternar entre Disponible y Ocupada."
          action="Crear pedido"
          onAction={() => {
            setSelectedMesaForOrder(null);
            setNewOrderItems([]);
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
                <p>Estados: Pendiente (en cocina), Atendido (en mesa), Cobrado (facturado)</p>
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="link"
                        onClick={() => {
                          setSelectedOrder(p);
                          setModal("order-detail");
                        }}
                      >
                        Consultar detalle
                      </button>
                      {p.ESTADO !== "F" && (
                        <button
                          className="btn primary"
                          style={{
                            padding: "3px 8px",
                            fontSize: 11,
                            background: "#10b981",
                            borderRadius: 6,
                          }}
                          onClick={() => {
                            setOrderToCharge(p);
                            setModal("charge-order");
                          }}
                        >
                          Cobrar
                        </button>
                      )}
                    </div>,
                  ];
                })}
            />
          </div>

          {/* MODAL CREAR PEDIDO CON MULTIPLES PRODUCTOS */}
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
                    Mozo / Atendido por *
                    <select
                      name="attendant"
                      value={selectedAttendant}
                      onChange={(e) => setSelectedAttendant(e.target.value)}
                    >
                      {attendantsList.map((att) => (
                        <option key={att} value={att}>
                          {att} {att === currentAttendantName ? "(Tú)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* CONSTRUCTOR DE ITEMS / PRODUCTOS */}
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 14,
                    padding: 14,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                    Agregar productos a la comanda
                  </h4>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontSize: 12, display: "block", marginBottom: 4, color: "#64748b" }}>
                        Seleccionar plato o bebida
                      </label>
                      <select
                        value={builderProdId || db.PRODUCTO?.[0]?.IDPRODUCTO}
                        onChange={(e) => setBuilderProdId(Number(e.target.value))}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                      >
                        {(db.PRODUCTO || []).map((p) => (
                          <option key={p.IDPRODUCTO} value={p.IDPRODUCTO}>
                            {p.NOMPRODUCTO} — {money(p.PRECIO)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 85 }}>
                      <label style={{ fontSize: 12, display: "block", marginBottom: 4, color: "#64748b" }}>
                        Porciones
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={builderQty}
                        onChange={(e) => setBuilderQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ padding: "8px 14px", height: 38, fontSize: 12 }}
                      onClick={handleAddProductToBuilder}
                    >
                      <Plus size={15} /> Añadir plato
                    </button>
                  </div>

                  {/* LISTADO DE PRODUCTOS AÑADIDOS AL PEDIDO */}
                  <div style={{ marginTop: 14 }}>
                    {newOrderItems.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                        Aún no has agregado productos. Selecciona un plato arriba y pulsa "Añadir plato".
                      </p>
                    ) : (
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", color: "#64748b" }}>
                            <th style={{ padding: "6px 4px" }}>Plato</th>
                            <th style={{ padding: "6px 4px", width: 90, textAlign: "center" }}>Cant.</th>
                            <th style={{ padding: "6px 4px", width: 80, textAlign: "right" }}>P. Unit</th>
                            <th style={{ padding: "6px 4px", width: 80, textAlign: "right" }}>Subtotal</th>
                            <th style={{ padding: "6px 4px", width: 36 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {newOrderItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 4px", fontWeight: 600 }}>{item.nombre}</td>
                              <td style={{ padding: "8px 4px", textAlign: "center" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBuilderQty(item.id, -1)}
                                    style={{
                                      padding: "1px 5px",
                                      background: "#e2e8f0",
                                      borderRadius: 4,
                                      fontSize: 11,
                                    }}
                                  >
                                    -
                                  </button>
                                  <span style={{ minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBuilderQty(item.id, 1)}
                                    style={{
                                      padding: "1px 5px",
                                      background: "#e2e8f0",
                                      borderRadius: 4,
                                      fontSize: 11,
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: "8px 4px", textAlign: "right" }}>{money(item.precio)}</td>
                              <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>
                                {money(item.qty * item.precio)}
                              </td>
                              <td style={{ padding: "8px 4px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBuilderItem(item.id)}
                                  title="Quitar plato"
                                  style={{ color: "#ef4444", padding: 2 }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} style={{ padding: "10px 4px 4px 4px", textAlign: "right", fontWeight: 700 }}>
                              Total Comanda ({newOrderItems.reduce((acc, i) => acc + i.qty, 0)} ítems):
                            </td>
                            <td style={{ padding: "10px 4px 4px 4px", textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: 14 }}>
                              {money(totalOrderBuilder)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
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
                      <option value="3">Piso 3 (Salón Eventos)</option>
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
                  | <b>Fecha:</b> {date(selectedOrder.FECHA)} | <b>Estado:</b>{" "}
                  {badge(selectedOrder.ESTADO)}
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

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
                    style={{ background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={() => {
                      setOrderToCharge(selectedOrder);
                      setModal("charge-order");
                    }}
                  >
                    <DollarSign size={16} /> Cobrar y generar venta
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

      {/* ================= MODAL GLOBAL: COBRAR PEDIDO Y EMITIR COMPROBANTE ================= */}
      {modal === "charge-order" && orderToCharge && (
        <Modal
          title={`Cobrar Pedido #${String(orderToCharge.IDPEDIDO).padStart(4, "0")} — Mesa ${
            db.MESAS?.find((m) => m.IDMESA === orderToCharge.IDMESA)?.NUNMESA || orderToCharge.IDMESA
          }`}
          close={() => {
            setOrderToCharge(null);
            setModal(null);
          }}
        >
          {(() => {
            const items = (db.DETALLE_PEDIDO || []).filter(
              (d) => d.IDPEDIDO === orderToCharge.IDPEDIDO
            );
            const totalConsumo = items.reduce(
              (a, d) => a + (Number(d.CANTIDAD) || 1) * (Number(d.PRECIO) || 0),
              0
            ) || 35.0;
            const subtotal = parseFloat((totalConsumo / 1.18).toFixed(2));
            const igv = parseFloat((totalConsumo - subtotal).toFixed(2));

            return (
              <form onSubmit={handleExecuteChargeOrder}>
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#334155" }}>
                    Resumen del consumo a cobrar
                  </h4>
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#64748b" }}>Subtotal neto:</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#64748b" }}>IGV (18%):</span>
                      <span>{money(igv)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 6,
                        borderTop: "1px solid #cbd5e1",
                        fontWeight: 800,
                        fontSize: 15,
                        color: "#0f172a",
                      }}
                    >
                      <span>TOTAL A PAGAR:</span>
                      <span style={{ color: "#10b981" }}>{money(totalConsumo)}</span>
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    Cliente a facturar *
                    <select name="clienteId" defaultValue={db.CLIENTE?.[0]?.IDCLIENTE}>
                      {(db.CLIENTE || []).map((c) => (
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
                    Tipo de comprobante electrónico *
                    <select name="tipoComprobante">
                      <option value="BOLETA">Boleta Electrónica (B001)</option>
                      <option value="FACTURA">Factura Electrónica (F001)</option>
                    </select>
                  </label>
                  <label>
                    Atendido / Cobrado por
                    <input defaultValue={currentAttendantName} readOnly />
                  </label>
                </div>

                <input type="hidden" name="totalManual" value={totalConsumo} />

                <div className="form-actions" style={{ marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => {
                      setOrderToCharge(null);
                      setModal(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn primary"
                    style={{ background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }}
                    type="submit"
                  >
                    <CheckCircle2 size={16} /> Confirmar cobro y emitir comprobante
                  </button>
                </div>
              </form>
            );
          })()}
        </Modal>
      )}

      {/* ================= VISTA VENTAS ================= */}
      {view === "ventas" && (
        <PageHead
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
              <form onSubmit={handleExecuteChargeOrder}>
                <label>
                  Pedido a liquidar *
                  <select
                    name="pedidoId"
                    required
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const p = (db.PEDIDOS || []).find((x) => x.IDPEDIDO === id);
                      if (p) setOrderToCharge(p);
                    }}
                  >
                    {(db.PEDIDOS || []).slice(-20).reverse().map((p) => {
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
                    Importe total estimado (S/)
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
                {selectedPrintItem.items && selectedPrintItem.items.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {selectedPrintItem.items.map((it, idx) => (
                      <div key={idx} className="ticket-row" style={{ fontSize: 11 }}>
                        <span>{it.cant}x {it.nombre}</span>
                        <span>{money(it.sub)}</span>
                      </div>
                    ))}
                    <div className="ticket-divider" />
                  </div>
                )}
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
                const pct = Math.min(100, Math.max(6, Math.round((n / maxVentasPorMetodo) * 100)));
                return (
                  <div className="report-line" key={m.IDMETODO_PAGO}>
                    <span title={m.NOMMETODO}>{m.NOMMETODO}</span>
                    <div>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <b>{n} transac.</b>
                  </div>
                );
              })}
            </div>
            <div className="card report-bars">
              <h3>Pedidos por estado de atención</h3>
              {[
                { label: "Pendientes en cocina", count: reportStatusCounts.p, colorClass: "orange-bar" },
                { label: "Atendidos en salón", count: reportStatusCounts.c, colorClass: "blue-bar" },
                { label: "Cobrados / Facturados", count: reportStatusCounts.f, colorClass: "green-bar" },
              ].map((s) => {
                const pct = Math.min(100, Math.max(6, Math.round((s.count / reportStatusCounts.max) * 100)));
                return (
                  <div className="report-line" key={s.label}>
                    <span title={s.label}>{s.label}</span>
                    <div>
                      <i
                        className={s.colorClass}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <b>{s.count} pedidos</b>
                  </div>
                );
              })}
            </div>
          </div>
        </PageHead>
      )}

      {/* ================= VISTA CONFIGURACION ================= */}
      {view === "configuracion" && (
        <PageHead desc="Opciones y sincronización del sistema">
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
