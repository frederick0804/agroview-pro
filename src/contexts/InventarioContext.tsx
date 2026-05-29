/**
 * InventarioContext.tsx
 *
 * In-memory inventory management for AgroView Pro.
 * No backend — all state lives in React useState.
 */

import {
  createContext, useContext, useState, useCallback, useMemo,
  type ReactNode,
} from "react";
import { useRole, ROLE_LEVELS } from "@/contexts/RoleContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvMovimientoTipo    = "entrada" | "salida" | "ajuste";
export type InvMovimientoSubtipo =
  | "compra" | "uso_produccion" | "aplicacion_campo"
  | "merma"  | "devolucion"     | "conteo_fisico";

export interface InvCatalogo {
  id: string;
  cliente_id: string;
  productor_id: string;
  modulo_id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad_actual: number;
  cantidad_minima: number;
  cantidad_maxima: number;
  unidad_medida: string;
  precio_unitario: number;
  ubicacion_fisica?: string;
  proveedor_id?: string;
  datos_extra: Record<string, unknown>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvMovimiento {
  id: string;
  catalogo_id: string;
  cliente_id: string;
  productor_id: string;
  tipo: InvMovimientoTipo;
  subtipo: InvMovimientoSubtipo;
  cantidad: number;
  cantidad_anterior: number;
  cantidad_nueva: number;
  precio_unitario?: number;
  proveedor_id?: string;
  registro_origen_tipo?: string;
  fecha: string;
  observaciones?: string;
  usuario_id: string;
  created_at: string;
}

export interface InvFormularioMapa {
  id: string;
  cliente_id: string;
  tabla_origen: string;     // nombre exacto del ModDef que dispara el movimiento
  catalogo_id: string;      // ID fijo del producto del inventario que se mueve
  campo_jsonb_cantidad: string; // campo numérico del registro que tiene la cantidad
  tipo_movimiento: InvMovimientoTipo;
  subtipo: InvMovimientoSubtipo;
  formula_cantidad?: string; // expresión opcional; usa nombres de campo como variables
  activo: boolean;
}

// ─── Stock helpers (exported for reuse in UI) ─────────────────────────────────

export type StockStatus = "ok" | "bajo" | "critico";

export function getStockStatus(p: InvCatalogo): StockStatus {
  if (p.cantidad_actual <= p.cantidad_minima * 0.5) return "critico";
  if (p.cantidad_actual <= p.cantidad_minima)       return "bajo";
  return "ok";
}

export function getStockPct(p: InvCatalogo): number {
  if (p.cantidad_maxima === 0) return 0;
  return Math.min(100, (p.cantidad_actual / p.cantidad_maxima) * 100);
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_CATALOGOS: InvCatalogo[] = [
  {
    id: "INV-001", cliente_id: "1", productor_id: "1",
    modulo_id: "post-cosecha", codigo: "EMP-CLAM-125",
    nombre: "Clamshell 125g", categoria: "Empaque",
    cantidad_actual: 8700, cantidad_minima: 2000, cantidad_maxima: 20000,
    unidad_medida: "unidades", precio_unitario: 0.05,
    ubicacion_fisica: "Bodega B, Estante 3", proveedor_id: "PackMaster Ltda.",
    datos_extra: {}, activo: true,
    created_at: "2026-01-01T08:00:00Z", updated_at: "2026-05-24T10:00:00Z",
  },
  {
    id: "INV-002", cliente_id: "1", productor_id: "1",
    modulo_id: "post-cosecha", codigo: "EMP-CAJA-EXP",
    nombre: "Cajas exportación", categoria: "Empaque",
    cantidad_actual: 320,    // BAJO (min: 500)
    cantidad_minima: 500, cantidad_maxima: 5000,
    unidad_medida: "unidades", precio_unitario: 1.50,
    ubicacion_fisica: "Bodega B, Estante 1", proveedor_id: "PackMaster Ltda.",
    datos_extra: {}, activo: true,
    created_at: "2026-01-01T08:00:00Z", updated_at: "2026-05-25T10:00:00Z",
  },
  {
    id: "INV-003", cliente_id: "1", productor_id: "1",
    modulo_id: "cultivo", codigo: "FIT-AZOX-1L",
    nombre: "Azoxystrobin 1L", categoria: "Fungicidas",
    cantidad_actual: 66.5, cantidad_minima: 10, cantidad_maxima: 100,
    unidad_medida: "litros", precio_unitario: 45.00,
    ubicacion_fisica: "Bodega A, Sector Fitosanitarios", proveedor_id: "AgroquímPro S.A.",
    datos_extra: { numero_lote: "AZ-2026-05", vencimiento: "2027-12-31" },
    activo: true,
    created_at: "2026-01-15T08:00:00Z", updated_at: "2026-05-17T09:00:00Z",
  },
  {
    id: "INV-004", cliente_id: "1", productor_id: "1",
    modulo_id: "cultivo", codigo: "FER-NPK-20KG",
    nombre: "Fertilizante NPK 20-20-20", categoria: "Fertilizantes",
    cantidad_actual: 45, cantidad_minima: 20, cantidad_maxima: 200,
    unidad_medida: "kg", precio_unitario: 1.20,
    ubicacion_fisica: "Bodega A, Sector Fertilizantes", proveedor_id: "NutriAgro Chile",
    datos_extra: { grado: "20-20-20", presentacion: "sacos 50kg" },
    activo: true,
    created_at: "2026-01-15T08:00:00Z", updated_at: "2026-05-21T11:00:00Z",
  },
  {
    id: "INV-005", cliente_id: "1", productor_id: "2",
    modulo_id: "vivero", codigo: "SUS-COCO-FIB",
    nombre: "Sustrato fibra de coco", categoria: "Sustratos",
    cantidad_actual: 180,   // BAJO (min: 200)
    cantidad_minima: 200, cantidad_maxima: 1000,
    unidad_medida: "kg", precio_unitario: 0.80,
    ubicacion_fisica: "Vivero Central, Zona Sustratos", proveedor_id: "CocoTec Ltda.",
    datos_extra: { humedad_max: "50%", ph: "5.5-6.5" },
    activo: true,
    created_at: "2026-02-01T08:00:00Z", updated_at: "2026-05-19T14:00:00Z",
  },
  {
    id: "INV-006", cliente_id: "1", productor_id: "1",
    modulo_id: "laboratorio", codigo: "REA-MS-1L",
    nombre: "Medio MS estéril 1L", categoria: "Reactivos",
    cantidad_actual: 12, cantidad_minima: 5, cantidad_maxima: 50,
    unidad_medida: "litros", precio_unitario: 89.00,
    ubicacion_fisica: "Laboratorio, Refrigerador 1", proveedor_id: "BioScience Ltda.",
    datos_extra: { temperatura_almacen: "4°C", numero_lote: "MS-26-04" },
    activo: true,
    created_at: "2026-02-15T08:00:00Z", updated_at: "2026-05-15T16:00:00Z",
  },
];

const DEMO_MOVIMIENTOS: InvMovimiento[] = [
  // INV-001 Clamshell 125g
  { id: "MOV-001", catalogo_id: "INV-001", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",         cantidad: 15000, cantidad_anterior: 0,     cantidad_nueva: 15000,
    precio_unitario: 0.05, proveedor_id: "PackMaster Ltda.",
    fecha: "2026-04-30", usuario_id: "3", created_at: "2026-04-30T08:00:00Z" },
  { id: "MOV-002", catalogo_id: "INV-001", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 2500,  cantidad_anterior: 15000, cantidad_nueva: 12500,
    registro_origen_tipo: "PACKING_LIST",
    fecha: "2026-05-07", usuario_id: "3", created_at: "2026-05-07T10:00:00Z" },
  { id: "MOV-003", catalogo_id: "INV-001", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 1800,  cantidad_anterior: 12500, cantidad_nueva: 10700,
    registro_origen_tipo: "PACKING_LIST",
    fecha: "2026-05-12", usuario_id: "3", created_at: "2026-05-12T09:00:00Z" },
  { id: "MOV-004", catalogo_id: "INV-001", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 1200,  cantidad_anterior: 10700, cantidad_nueva: 9500,
    registro_origen_tipo: "PACKING_LIST",
    fecha: "2026-05-18", usuario_id: "3", created_at: "2026-05-18T11:00:00Z" },
  { id: "MOV-005", catalogo_id: "INV-001", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 800,   cantidad_anterior: 9500,  cantidad_nueva: 8700,
    registro_origen_tipo: "PACKING_LIST",
    fecha: "2026-05-24", usuario_id: "3", created_at: "2026-05-24T10:00:00Z" },

  // INV-002 Cajas exportación
  { id: "MOV-006", catalogo_id: "INV-002", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",         cantidad: 1000, cantidad_anterior: 0,    cantidad_nueva: 1000,
    precio_unitario: 1.50, proveedor_id: "PackMaster Ltda.",
    fecha: "2026-04-30", usuario_id: "3", created_at: "2026-04-30T08:30:00Z" },
  { id: "MOV-007", catalogo_id: "INV-002", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 200,  cantidad_anterior: 1000, cantidad_nueva: 800,
    registro_origen_tipo: "MOVIMIENTO_BODEGA",
    fecha: "2026-05-05", usuario_id: "3", created_at: "2026-05-05T09:00:00Z" },
  { id: "MOV-008", catalogo_id: "INV-002", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 200,  cantidad_anterior: 800,  cantidad_nueva: 600,
    registro_origen_tipo: "MOVIMIENTO_BODEGA",
    fecha: "2026-05-12", usuario_id: "3", created_at: "2026-05-12T09:30:00Z" },
  { id: "MOV-009", catalogo_id: "INV-002", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 180,  cantidad_anterior: 600,  cantidad_nueva: 420,
    fecha: "2026-05-18", usuario_id: "3", created_at: "2026-05-18T11:30:00Z" },
  { id: "MOV-010", catalogo_id: "INV-002", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "merma",          cantidad: 100,  cantidad_anterior: 420,  cantidad_nueva: 320,
    observaciones: "Cajas dañadas durante descarga",
    fecha: "2026-05-25", usuario_id: "3", created_at: "2026-05-25T14:00:00Z" },

  // INV-003 Azoxystrobin
  { id: "MOV-011", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",           cantidad: 80,  cantidad_anterior: 0,    cantidad_nueva: 80,
    precio_unitario: 45.00, proveedor_id: "AgroquímPro S.A.",
    fecha: "2026-05-01", usuario_id: "1", created_at: "2026-05-01T08:00:00Z" },
  { id: "MOV-012", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 8,   cantidad_anterior: 80,   cantidad_nueva: 72,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación bloques B1-B3",
    fecha: "2026-05-05", usuario_id: "4", created_at: "2026-05-05T07:00:00Z" },
  { id: "MOV-013", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 3.5, cantidad_anterior: 72,   cantidad_nueva: 68.5,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación bloque B4",
    fecha: "2026-05-10", usuario_id: "4", created_at: "2026-05-10T07:30:00Z" },
  { id: "MOV-014", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 2,   cantidad_anterior: 68.5, cantidad_nueva: 66.5,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación preventiva sector C",
    fecha: "2026-05-17", usuario_id: "4", created_at: "2026-05-17T06:45:00Z" },
  { id: "MOV-015", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "ajuste",   subtipo: "conteo_fisico",     cantidad: 66.5, cantidad_anterior: 66.5, cantidad_nueva: 66.5,
    observaciones: "Conteo físico mensual — sin diferencias",
    fecha: "2026-05-22", usuario_id: "1", created_at: "2026-05-22T16:00:00Z" },

  // INV-004 Fertilizante NPK
  { id: "MOV-016", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",           cantidad: 100, cantidad_anterior: 0,   cantidad_nueva: 100,
    precio_unitario: 1.20, proveedor_id: "NutriAgro Chile",
    fecha: "2026-05-01", usuario_id: "1", created_at: "2026-05-01T08:30:00Z" },
  { id: "MOV-017", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 20,  cantidad_anterior: 100, cantidad_nueva: 80,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    fecha: "2026-05-06", usuario_id: "4", created_at: "2026-05-06T08:00:00Z" },
  { id: "MOV-018", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 15,  cantidad_anterior: 80,  cantidad_nueva: 65,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    fecha: "2026-05-11", usuario_id: "4", created_at: "2026-05-11T07:30:00Z" },
  { id: "MOV-019", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 10,  cantidad_anterior: 65,  cantidad_nueva: 55,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    fecha: "2026-05-16", usuario_id: "4", created_at: "2026-05-16T07:00:00Z" },
  { id: "MOV-020", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 10,  cantidad_anterior: 55,  cantidad_nueva: 45,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    fecha: "2026-05-21", usuario_id: "4", created_at: "2026-05-21T07:15:00Z" },

  // INV-005 Sustrato (productor 2)
  { id: "MOV-021", catalogo_id: "INV-005", cliente_id: "1", productor_id: "2",
    tipo: "entrada",  subtipo: "compra",         cantidad: 300, cantidad_anterior: 0,   cantidad_nueva: 300,
    precio_unitario: 0.80, proveedor_id: "CocoTec Ltda.",
    fecha: "2026-04-28", usuario_id: "1", created_at: "2026-04-28T08:00:00Z" },
  { id: "MOV-022", catalogo_id: "INV-005", cliente_id: "1", productor_id: "2",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 50,  cantidad_anterior: 300, cantidad_nueva: 250,
    observaciones: "Llenado bandejas germinación",
    fecha: "2026-05-05", usuario_id: "7", created_at: "2026-05-05T09:00:00Z" },
  { id: "MOV-023", catalogo_id: "INV-005", cliente_id: "1", productor_id: "2",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 40,  cantidad_anterior: 250, cantidad_nueva: 210,
    observaciones: "Trasplante batch mayo",
    fecha: "2026-05-12", usuario_id: "7", created_at: "2026-05-12T10:00:00Z" },
  { id: "MOV-024", catalogo_id: "INV-005", cliente_id: "1", productor_id: "2",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 30,  cantidad_anterior: 210, cantidad_nueva: 180,
    observaciones: "Reposición macetas vivero norte",
    fecha: "2026-05-19", usuario_id: "7", created_at: "2026-05-19T11:00:00Z" },
  { id: "MOV-025", catalogo_id: "INV-005", cliente_id: "1", productor_id: "2",
    tipo: "ajuste",   subtipo: "conteo_fisico", cantidad: 180,  cantidad_anterior: 180, cantidad_nueva: 180,
    observaciones: "Inventario mensual — stock BAJO, solicitar reposición",
    fecha: "2026-05-25", usuario_id: "1", created_at: "2026-05-25T16:00:00Z" },

  // INV-006 Medio MS
  { id: "MOV-026", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",         cantidad: 20, cantidad_anterior: 0,  cantidad_nueva: 20,
    precio_unitario: 89.00, proveedor_id: "BioScience Ltda.",
    fecha: "2026-04-25", usuario_id: "1", created_at: "2026-04-25T09:00:00Z" },
  { id: "MOV-027", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 4,  cantidad_anterior: 20, cantidad_nueva: 16,
    observaciones: "Cultivo in vitro batch 1",
    fecha: "2026-05-05", usuario_id: "3", created_at: "2026-05-05T10:00:00Z" },
  { id: "MOV-028", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 2,  cantidad_anterior: 16, cantidad_nueva: 14,
    observaciones: "Micropropagación fresas",
    fecha: "2026-05-10", usuario_id: "3", created_at: "2026-05-10T10:30:00Z" },
  { id: "MOV-029", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 2,  cantidad_anterior: 14, cantidad_nueva: 12,
    observaciones: "Cultivo in vitro batch 2",
    fecha: "2026-05-15", usuario_id: "3", created_at: "2026-05-15T11:00:00Z" },
  { id: "MOV-030", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "ajuste",   subtipo: "conteo_fisico", cantidad: 12,  cantidad_anterior: 12, cantidad_nueva: 12,
    observaciones: "Verificación refrigerador — OK",
    fecha: "2026-05-22", usuario_id: "1", created_at: "2026-05-22T16:30:00Z" },
];

const DEMO_FORMULARIO_MAPAS: InvFormularioMapa[] = [
  {
    // TablaInsumos: cada fila lleva su propio catalogo_id + cantidad
    // catalogo_id queda vacío porque el producto viene de cada fila de la tabla
    id: "FM-001", cliente_id: "1",
    tabla_origen: "APLICACION_FITOSANITARIA",
    catalogo_id: "",
    campo_jsonb_cantidad: "productos_aplicados", // campo TablaInsumos del formulario
    tipo_movimiento: "salida", subtipo: "aplicacion_campo", activo: true,
  },
  {
    // Regla simple: recepción de bodega → Cajas exportación (producto fijo)
    id: "FM-002", cliente_id: "1",
    tabla_origen: "MOVIMIENTO_BODEGA",
    catalogo_id: "INV-002",
    campo_jsonb_cantidad: "cantidad",
    tipo_movimiento: "entrada", subtipo: "compra", activo: true,
  },
  {
    // TablaInsumos: insumos de empaque usados en packing
    id: "FM-003", cliente_id: "1",
    tabla_origen: "PACKING_LIST",
    catalogo_id: "",
    campo_jsonb_cantidad: "insumos_usados", // campo TablaInsumos del formulario
    tipo_movimiento: "salida", subtipo: "uso_produccion", activo: true,
  },
];

// ─── Context interface ────────────────────────────────────────────────────────

export interface RegistrarMovimientoOpciones {
  precio_unitario?: number;
  proveedor_id?: string;
  observaciones?: string;
  registro_origen_tipo?: string;
}

interface InventarioContextValue {
  catalogos: InvCatalogo[];
  movimientos: InvMovimiento[];
  formularioMapas: InvFormularioMapa[];
  agregarProducto:    (p: Omit<InvCatalogo, "id" | "created_at" | "updated_at">) => void;
  editarProducto:     (id: string, cambios: Partial<Omit<InvCatalogo, "id" | "created_at">>) => void;
  desactivarProducto: (id: string) => void;
  /** Returns false if stock validation fails (insufficient stock for salida) */
  registrarMovimiento: (
    catalogoId: string,
    tipo: InvMovimientoTipo,
    subtipo: InvMovimientoSubtipo,
    cantidad: number,
    opciones?: RegistrarMovimientoOpciones,
  ) => boolean;
  // Reglas de mapa (INV_FORMULARIO_MAPA CRUD)
  agregarRegla:   (r: Omit<InvFormularioMapa, "id">) => void;
  editarRegla:    (id: string, cambios: Partial<Omit<InvFormularioMapa, "id">>) => void;
  toggleRegla:    (id: string) => void;
  eliminarRegla:  (id: string) => void;
  getProductosByModulo:    (moduloId: string) => InvCatalogo[];
  getAllProductos:          () => InvCatalogo[];
  getMovimientosByProducto:(catalogoId: string) => InvMovimiento[];
  getAlertas:              () => InvCatalogo[];
  getStockCritico:         () => InvCatalogo[];
  simularTrigger:          (tablaNombre: string, datos: Record<string, unknown>) => void;
}

const InventarioContext = createContext<InventarioContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function InventarioProvider({ children }: { children: ReactNode }) {
  const { role, currentUser } = useRole();

  const [catalogos,     setCatalogos]     = useState<InvCatalogo[]>(DEMO_CATALOGOS);
  const [movimientos,   setMovimientos]   = useState<InvMovimiento[]>(DEMO_MOVIMIENTOS);
  const [formularioMapas, setFormularioMapas] = useState<InvFormularioMapa[]>(DEMO_FORMULARIO_MAPAS);

  // ── Scope ──────────────────────────────────────────────────────────────────
  const clienteIdStr   = currentUser?.clienteId   ? String(currentUser.clienteId)   : null;
  const productorIdStr = currentUser?.productorId ? String(currentUser.productorId) : null;

  const scopeFilter = useCallback((p: InvCatalogo) => {
    if (role === "super_admin") return true;
    if (clienteIdStr   && p.cliente_id   !== clienteIdStr)   return false;
    if (productorIdStr && p.productor_id !== productorIdStr) return false;
    return true;
  }, [role, clienteIdStr, productorIdStr]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const agregarProducto = useCallback((
    p: Omit<InvCatalogo, "id" | "created_at" | "updated_at">,
  ) => {
    const now = new Date().toISOString();
    setCatalogos(prev => [...prev, { ...p, id: `INV-${Date.now()}`, created_at: now, updated_at: now }]);
  }, []);

  const editarProducto = useCallback((
    id: string,
    cambios: Partial<Omit<InvCatalogo, "id" | "created_at">>,
  ) => {
    const now = new Date().toISOString();
    setCatalogos(prev => prev.map(p => p.id === id ? { ...p, ...cambios, updated_at: now } : p));
  }, []);

  const desactivarProducto = useCallback((id: string) => {
    editarProducto(id, { activo: false });
  }, [editarProducto]);

  const registrarMovimiento = useCallback((
    catalogoId: string,
    tipo: InvMovimientoTipo,
    subtipo: InvMovimientoSubtipo,
    cantidad: number,
    opciones: RegistrarMovimientoOpciones = {},
  ): boolean => {
    let producto: InvCatalogo | undefined;
    setCatalogos(prev => { producto = prev.find(p => p.id === catalogoId); return prev; });
    // Re-read directly from state for accuracy
    producto = catalogos.find(p => p.id === catalogoId);
    if (!producto) return false;

    const anterior = producto.cantidad_actual;
    let nueva: number;

    if (tipo === "entrada")     nueva = anterior + cantidad;
    else if (tipo === "salida") {
      if (anterior < cantidad) return false;
      nueva = anterior - cantidad;
    } else {
      nueva = cantidad; // ajuste = absolute
    }

    const now = new Date().toISOString();
    const mov: InvMovimiento = {
      id: `MOV-${Date.now()}`,
      catalogo_id: catalogoId,
      cliente_id:   producto.cliente_id,
      productor_id: producto.productor_id,
      tipo, subtipo,
      cantidad:           tipo === "ajuste" ? Math.abs(nueva - anterior) : cantidad,
      cantidad_anterior:  anterior,
      cantidad_nueva:     nueva,
      precio_unitario:    opciones.precio_unitario,
      proveedor_id:       opciones.proveedor_id,
      observaciones:      opciones.observaciones,
      registro_origen_tipo: opciones.registro_origen_tipo,
      fecha:      now.substring(0, 10),
      usuario_id: currentUser ? String(currentUser.id) : "1",
      created_at: now,
    };

    setMovimientos(prev => [...prev, mov]);
    setCatalogos(prev => prev.map(p =>
      p.id === catalogoId ? { ...p, cantidad_actual: nueva, updated_at: now } : p,
    ));
    return true;
  }, [catalogos, currentUser]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const getProductosByModulo = useCallback((moduloId: string) =>
    catalogos.filter(p => p.activo && p.modulo_id === moduloId && scopeFilter(p)),
  [catalogos, scopeFilter]);

  const getAllProductos = useCallback(() =>
    catalogos.filter(p => p.activo && scopeFilter(p)),
  [catalogos, scopeFilter]);

  const getMovimientosByProducto = useCallback((catalogoId: string) =>
    movimientos
      .filter(m => m.catalogo_id === catalogoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at)),
  [movimientos]);

  const getAlertas = useCallback(() =>
    getAllProductos().filter(p => p.cantidad_actual <= p.cantidad_minima),
  [getAllProductos]);

  const getStockCritico = useCallback(() =>
    getAllProductos().filter(p => p.cantidad_actual <= p.cantidad_minima * 0.5),
  [getAllProductos]);

  // ── Reglas CRUD ────────────────────────────────────────────────────────────
  const agregarRegla = useCallback((r: Omit<InvFormularioMapa, "id">) => {
    setFormularioMapas(prev => [...prev, { ...r, id: `FM-${Date.now()}` }]);
  }, []);

  const editarRegla = useCallback((id: string, cambios: Partial<Omit<InvFormularioMapa, "id">>) => {
    setFormularioMapas(prev => prev.map(r => r.id === id ? { ...r, ...cambios } : r));
  }, []);

  const toggleRegla = useCallback((id: string) => {
    setFormularioMapas(prev => prev.map(r => r.id === id ? { ...r, activo: !r.activo } : r));
  }, []);

  const eliminarRegla = useCallback((id: string) => {
    setFormularioMapas(prev => prev.filter(r => r.id !== id));
  }, []);

  const simularTrigger = useCallback((
    tablaNombre: string,
    datos: Record<string, unknown>,
  ) => {
    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    const mapas = formularioMapas.filter(m =>
      m.activo &&
      m.tabla_origen === tablaNombre &&
      (filtroCliente === null || m.cliente_id === filtroCliente)
    );
    for (const mapa of mapas) {
      const rawValor = datos[mapa.campo_jsonb_cantidad];

      // ── Detectar campo TablaInsumos (JSON array de filas) ──────────────────
      let tablaRows: Array<{ catalogo_id: string; cantidad: number }> | null = null;
      try {
        const parsed = typeof rawValor === "string" ? JSON.parse(rawValor) : rawValor;
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          typeof parsed[0] === "object" &&
          "catalogo_id" in parsed[0]
        ) {
          tablaRows = parsed as Array<{ catalogo_id: string; cantidad: number }>;
        }
      } catch { /* not a table */ }

      if (tablaRows) {
        // TablaInsumos: un movimiento por cada fila de la tabla
        for (const row of tablaRows) {
          const rowCant = Number(row.cantidad);
          if (!row.catalogo_id || isNaN(rowCant) || rowCant <= 0) continue;
          registrarMovimiento(row.catalogo_id, mapa.tipo_movimiento, mapa.subtipo, rowCant, {
            registro_origen_tipo: tablaNombre,
            observaciones: `Automático desde ${tablaNombre}`,
          });
        }
        continue; // siguiente regla
      }

      // ── Regla simple: producto fijo en la regla ────────────────────────────
      const cid = mapa.catalogo_id;
      if (!cid) continue;

      let cant: number;
      if (mapa.formula_cantidad) {
        // Evalúa expresión reemplazando nombres de campo por sus valores
        const expr = mapa.formula_cantidad.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
          const val = datos[match];
          return val !== undefined ? String(val) : match;
        });
        try {
          // eslint-disable-next-line no-new-func
          cant = Number(new Function(`"use strict"; return (${expr})`)());
        } catch { continue; }
      } else {
        cant = parseFloat(String(datos[mapa.campo_jsonb_cantidad] ?? 0));
      }

      if (isNaN(cant) || cant <= 0) continue;
      registrarMovimiento(cid, mapa.tipo_movimiento, mapa.subtipo, cant, {
        registro_origen_tipo: tablaNombre,
        observaciones: `Automático desde ${tablaNombre}`,
      });
    }
  }, [formularioMapas, registrarMovimiento, role, clienteIdStr]);

  const value = useMemo<InventarioContextValue>(() => ({
    catalogos, movimientos, formularioMapas,
    agregarProducto, editarProducto, desactivarProducto, registrarMovimiento,
    agregarRegla, editarRegla, toggleRegla, eliminarRegla,
    getProductosByModulo, getAllProductos, getMovimientosByProducto,
    getAlertas, getStockCritico, simularTrigger,
  }), [
    catalogos, movimientos, formularioMapas,
    agregarProducto, editarProducto, desactivarProducto, registrarMovimiento,
    agregarRegla, editarRegla, toggleRegla, eliminarRegla,
    getProductosByModulo, getAllProductos, getMovimientosByProducto,
    getAlertas, getStockCritico, simularTrigger,
  ]);

  return <InventarioContext.Provider value={value}>{children}</InventarioContext.Provider>;
}

export function useInventario(): InventarioContextValue {
  const ctx = useContext(InventarioContext);
  if (!ctx) throw new Error("useInventario must be used within InventarioProvider");
  return ctx;
}

// Keep ROLE_LEVELS import used for guard helper
export { ROLE_LEVELS };
