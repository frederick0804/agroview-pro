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

// ─── Lote ─────────────────────────────────────────────────────────────────────

export interface InvLote {
  id:                  string;
  catalogo_id:         string;
  numero_lote:         string;
  fecha_fabricacion?:  string;   // ISO date, opcional
  fecha_vencimiento:   string;   // ISO date, obligatorio
  certificado_origen?: string;
  proveedor_id?:       string;
  precio_unitario?:    number;
  cantidad_inicial:    number;
  cantidad_actual:     number;
  campos_extra?:       InvCampoConValor[]; // valores de los campos personalizados del producto, capturados para ESTE lote
  notas?:              string;
  /** true si, al desactivarse, su cantidad fue excluida del stock total disponible
   *  (mediante un movimiento de merma) — se usa para restituirla automáticamente al reactivar,
   *  SIN tocar la cantidad propia del lote (que se conserva como registro). */
  stock_descontado?:   boolean;
  activo:              boolean;
  created_at:          string;
}

export type InvMovimientoTipo    = "entrada" | "salida" | "ajuste";
export type InvMovimientoSubtipo =
  | "compra" | "uso_produccion" | "aplicacion_campo"
  | "merma"  | "devolucion"     | "conteo_fisico"
  | "transferencia";

/** Campo personalizado con su valor — específico por producto */
export interface InvCampoConValor {
  nombre:      string;        // snake_case key interno
  etiqueta:    string;        // label visible
  tipo:        InvCampoTipo;
  valor:       string;        // valor del campo para este producto
  opciones?:   string[];      // solo tipo Lista
}

export interface InvCatalogo {
  id: string;
  cliente_id: string;
  productor_id: string;
  modulo_ids: string[];
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
  campos_extra: InvCampoConValor[]; // campos propios de ESTE producto
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
  // Campos exclusivos de transferencias
  modulo_origen?:    string;
  modulo_destino?:   string;
  transfer_pair_id?: string;
  // Trazabilidad por lote
  lote_id?:          string;
  lote_numero?:      string;
  // Trazabilidad por ubicación de campo
  bloque_ref?:       string;   // ej: "Bloque A-1", "Nave 3", "Sector Norte" — extraído del formulario
  cultivo_id?:       string;   // FK → Cultivos — qué cultivo se estaba tratando
}

// ─── Tipo para campos personalizados por producto ─────────────────────────────

export type InvCampoTipo = "Texto" | "Número" | "Fecha" | "Lista" | "Sí/No";

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

// ─── Evaluador seguro de fórmulas de cantidad ────────────────────────────────
// Reemplaza el viejo enfoque `new Function("return (" + expr + ")")`, que
// ejecutaba código arbitrario: si un campo del formulario contenía texto como
// `1; fetch('https://evil')` o si la fórmula traía algo más que aritmética,
// se ejecutaba tal cual (riesgo de inyección de código / XSS).
//
// Este evaluador es un parser recursivo-descendente que SOLO entiende:
//   números, identificadores (variables → se sustituyen por su valor numérico),
//   + - * /, paréntesis y signo unario. Cualquier otro carácter o construcción
//   (punto y coma, llamadas a función, `=>`, `new`, corchetes, etc.) se rechaza
//   antes de evaluar — nunca se ejecuta JavaScript proveniente del usuario.
const FORMULA_TOKEN_RE = /\s*(?:([0-9]+(?:\.[0-9]+)?)|([a-zA-Z_]\w*)|([+\-*/()]))/y;

type FormulaToken = { tipo: "num"; valor: number } | { tipo: "var"; nombre: string } | { tipo: "op"; valor: string };

function tokenizarFormula(formula: string): FormulaToken[] | null {
  const tokens: FormulaToken[] = [];
  FORMULA_TOKEN_RE.lastIndex = 0;
  let pos = 0;
  while (pos < formula.length) {
    FORMULA_TOKEN_RE.lastIndex = pos;
    const m = FORMULA_TOKEN_RE.exec(formula);
    if (!m || m[0].length === 0) return null; // carácter no reconocido → fórmula inválida/insegura
    if (m[1] !== undefined)      tokens.push({ tipo: "num", valor: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ tipo: "var", nombre: m[2] });
    else if (m[3] !== undefined) tokens.push({ tipo: "op",  valor: m[3] });
    pos = FORMULA_TOKEN_RE.lastIndex;
  }
  return tokens;
}

/**
 * Evalúa una fórmula aritmética simple (ej. "dosis * area_aplicada") sustituyendo
 * los identificadores por los valores numéricos presentes en `datos`.
 * Devuelve `null` si la fórmula contiene algo que no sea aritmética válida —
 * en ese caso el llamador debe omitir la regla en lugar de arriesgarse a ejecutar
 * algo no controlado.
 */
export function evaluarFormulaCantidad(formula: string, datos: Record<string, unknown>): number | null {
  const tokens = tokenizarFormula(formula);
  if (!tokens || tokens.length === 0) return null;

  let i = 0;
  const peek = () => tokens[i];
  const consumirOp = (valores: string[]) => {
    const t = peek();
    if (t && t.tipo === "op" && valores.includes(t.valor)) { i++; return t.valor; }
    return null;
  };

  function parsePrimario(): number | null {
    const t = peek();
    if (!t) return null;
    if (t.tipo === "num") { i++; return t.valor; }
    if (t.tipo === "var") {
      i++;
      const v = datos[t.nombre];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      return isNaN(n) ? 0 : n;
    }
    if (t.tipo === "op" && t.valor === "(") {
      i++;
      const valor = parseExpr();
      if (valor === null) return null;
      if (consumirOp([")"]) === null) return null; // paréntesis sin cerrar
      return valor;
    }
    return null;
  }

  function parseUnario(): number | null {
    const signo = consumirOp(["+", "-"]);
    const valor = parsePrimario();
    if (valor === null) return null;
    return signo === "-" ? -valor : valor;
  }

  function parseTermino(): number | null {
    let valor = parseUnario();
    if (valor === null) return null;
    let op: string | null;
    while ((op = consumirOp(["*", "/"])) !== null) {
      const der = parseUnario();
      if (der === null) return null;
      valor = op === "*" ? valor * der : valor / der;
    }
    return valor;
  }

  function parseExpr(): number | null {
    let valor = parseTermino();
    if (valor === null) return null;
    let op: string | null;
    while ((op = consumirOp(["+", "-"])) !== null) {
      const der = parseTermino();
      if (der === null) return null;
      valor = op === "+" ? valor + der : valor - der;
    }
    return valor;
  }

  const resultado = parseExpr();
  if (resultado === null || i !== tokens.length) return null; // tokens sobrantes → expresión inválida
  return resultado;
}

// ─── Vencimiento helpers ──────────────────────────────────────────────────────

export type VencimientoStatus = "vencido" | "critico" | "proximo";
// vencido = ya expiró · critico = vence en ≤ 30 días · proximo = vence en ≤ 90 días

export interface AlertaVencimiento {
  producto:         InvCatalogo;
  fechaVencimiento: string;    // ISO date string
  diasRestantes:    number;    // negativo si ya venció
  estado:           VencimientoStatus;
}

/** Lee el campo de tipo Fecha cuyo nombre contenga "vencim" o "expir" */
export function getCampoVencimiento(p: InvCatalogo): string | null {
  const c = (p.campos_extra ?? []).find(f =>
    f.tipo === "Fecha" &&
    (f.nombre.toLowerCase().includes("vencim") || f.nombre.toLowerCase().includes("expir")),
  );
  return c?.valor ?? null;
}

export function getVencimientoStatus(diasRestantes: number): VencimientoStatus {
  if (diasRestantes < 0)  return "vencido";
  if (diasRestantes <= 30) return "critico";
  return "proximo";
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
    modulo_ids: ["post-cosecha"], codigo: "EMP-CLAM-125",
    nombre: "Clamshell 125g", categoria: "Empaque",
    cantidad_actual: 8700, cantidad_minima: 2000, cantidad_maxima: 20000,
    unidad_medida: "unidades", precio_unitario: 0.05,
    ubicacion_fisica: "Bodega B, Estante 3", proveedor_id: "PackMaster Ltda.",
    campos_extra: [], activo: true,
    created_at: "2026-01-01T08:00:00Z", updated_at: "2026-05-24T10:00:00Z",
  },
  {
    id: "INV-002", cliente_id: "1", productor_id: "1",
    modulo_ids: ["post-cosecha"], codigo: "EMP-CAJA-EXP",
    nombre: "Cajas exportación", categoria: "Empaque",
    cantidad_actual: 320,    // BAJO (min: 500)
    cantidad_minima: 500, cantidad_maxima: 5000,
    unidad_medida: "unidades", precio_unitario: 1.50,
    ubicacion_fisica: "Bodega B, Estante 1", proveedor_id: "PackMaster Ltda.",
    campos_extra: [], activo: true,
    created_at: "2026-01-01T08:00:00Z", updated_at: "2026-05-25T10:00:00Z",
  },
  {
    id: "INV-003", cliente_id: "1", productor_id: "1",
    modulo_ids: ["cultivo"], codigo: "FIT-AZOX-1L",
    nombre: "Azoxystrobin 1L", categoria: "Fungicidas",
    cantidad_actual: 66.5, cantidad_minima: 10, cantidad_maxima: 100,
    unidad_medida: "litros", precio_unitario: 45.00,
    ubicacion_fisica: "Bodega A, Sector Fitosanitarios", proveedor_id: "AgroquímPro S.A.",
    campos_extra: [
      { nombre: "numero_lote",       etiqueta: "Nº de lote",     tipo: "Texto", valor: "AZ-2026-05" },
      { nombre: "vencimiento",       etiqueta: "Vencimiento",    tipo: "Fecha", valor: "2026-07-15" }, // vence pronto — demo
      { nombre: "concentracion",     etiqueta: "Concentración (g/L)", tipo: "Número", valor: "250" },
      { nombre: "modo_accion",       etiqueta: "Modo de acción", tipo: "Lista",
        opciones: ["Sistémico","Contacto","Translaminar","Preventivo"], valor: "Sistémico" },
    ],
    activo: true,
    created_at: "2026-01-15T08:00:00Z", updated_at: "2026-05-17T09:00:00Z",
  },
  {
    id: "INV-004", cliente_id: "1", productor_id: "1",
    modulo_ids: ["cultivo", "vivero"], codigo: "FER-NPK-20KG",
    nombre: "Fertilizante NPK 20-20-20", categoria: "Fertilizantes",
    cantidad_actual: 45, cantidad_minima: 20, cantidad_maxima: 200,
    unidad_medida: "kg", precio_unitario: 1.20,
    ubicacion_fisica: "Bodega A, Sector Fertilizantes", proveedor_id: "NutriAgro Chile",
    campos_extra: [
      { nombre: "grado",        etiqueta: "Grado NPK",    tipo: "Texto", valor: "20-20-20" },
      { nombre: "presentacion", etiqueta: "Presentación", tipo: "Lista",
        opciones: ["Saco 25 kg","Saco 50 kg","Granel","Líquido"], valor: "Saco 50 kg" },
    ],
    activo: true,
    created_at: "2026-01-15T08:00:00Z", updated_at: "2026-05-21T11:00:00Z",
  },
  {
    id: "INV-005", cliente_id: "1", productor_id: "2",
    modulo_ids: ["vivero"], codigo: "SUS-COCO-FIB",
    nombre: "Sustrato fibra de coco", categoria: "Sustratos",
    cantidad_actual: 180,
    cantidad_minima: 200, cantidad_maxima: 1000,
    unidad_medida: "kg", precio_unitario: 0.80,
    ubicacion_fisica: "Vivero Central, Zona Sustratos", proveedor_id: "CocoTec Ltda.",
    campos_extra: [
      { nombre: "humedad_max",   etiqueta: "Humedad máx.",  tipo: "Texto",  valor: "50%" },
      { nombre: "ph",            etiqueta: "pH",            tipo: "Número", valor: "5.5-6.5" },
      { nombre: "granulometria", etiqueta: "Granulometría", tipo: "Lista",
        opciones: ["Fino","Medio","Grueso"], valor: "Medio" },
    ],
    activo: true,
    created_at: "2026-02-01T08:00:00Z", updated_at: "2026-05-19T14:00:00Z",
  },
  {
    id: "INV-006", cliente_id: "1", productor_id: "1",
    modulo_ids: ["laboratorio"], codigo: "REA-MS-1L",
    nombre: "Medio MS estéril 1L", categoria: "Reactivos",
    cantidad_actual: 12, cantidad_minima: 5, cantidad_maxima: 50,
    unidad_medida: "litros", precio_unitario: 89.00,
    ubicacion_fisica: "Laboratorio, Refrigerador 1", proveedor_id: "BioScience Ltda.",
    campos_extra: [
      { nombre: "temperatura_almacen", etiqueta: "Temp. almacenamiento", tipo: "Texto",  valor: "4°C" },
      { nombre: "numero_lote",         etiqueta: "Nº de lote",           tipo: "Texto",  valor: "MS-26-04" },
      { nombre: "vencimiento",         etiqueta: "Vencimiento",          tipo: "Fecha",  valor: "2026-06-10" }, // vence muy pronto — demo
    ],
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
    lote_id: "LOT-001", lote_numero: "AZX-2024-089",
    fecha: "2026-05-01", usuario_id: "1", created_at: "2026-05-01T08:00:00Z" },
  { id: "MOV-012", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 8,   cantidad_anterior: 80,   cantidad_nueva: 72,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación bloques B1-B3",
    lote_id: "LOT-001", lote_numero: "AZX-2024-089",
    fecha: "2026-05-05", usuario_id: "4", created_at: "2026-05-05T07:00:00Z" },
  { id: "MOV-013", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 3.5, cantidad_anterior: 72,   cantidad_nueva: 68.5,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación bloque B4",
    lote_id: "LOT-001", lote_numero: "AZX-2024-089",
    fecha: "2026-05-10", usuario_id: "4", created_at: "2026-05-10T07:30:00Z" },
  { id: "MOV-014", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 2,   cantidad_anterior: 68.5, cantidad_nueva: 66.5,
    registro_origen_tipo: "APLICACION_FITOSANITARIA", observaciones: "Aplicación preventiva sector C",
    lote_id: "LOT-001", lote_numero: "AZX-2024-089",
    fecha: "2026-05-17", usuario_id: "4", created_at: "2026-05-17T06:45:00Z" },
  { id: "MOV-015", catalogo_id: "INV-003", cliente_id: "1", productor_id: "1",
    tipo: "ajuste",   subtipo: "conteo_fisico",     cantidad: 66.5, cantidad_anterior: 66.5, cantidad_nueva: 66.5,
    observaciones: "Conteo físico mensual — sin diferencias",
    lote_id: "LOT-001", lote_numero: "AZX-2024-089",
    fecha: "2026-05-22", usuario_id: "1", created_at: "2026-05-22T16:00:00Z" },

  // INV-004 Fertilizante NPK
  { id: "MOV-016", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "entrada",  subtipo: "compra",           cantidad: 100, cantidad_anterior: 0,   cantidad_nueva: 100,
    precio_unitario: 1.20, proveedor_id: "NutriAgro Chile",
    lote_id: "LOT-003", lote_numero: "NPK-2025-003",
    fecha: "2026-05-01", usuario_id: "1", created_at: "2026-05-01T08:30:00Z" },
  { id: "MOV-017", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 20,  cantidad_anterior: 100, cantidad_nueva: 80,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    lote_id: "LOT-003", lote_numero: "NPK-2025-003",
    fecha: "2026-05-06", usuario_id: "4", created_at: "2026-05-06T08:00:00Z" },
  { id: "MOV-018", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 15,  cantidad_anterior: 80,  cantidad_nueva: 65,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    lote_id: "LOT-003", lote_numero: "NPK-2025-003",
    fecha: "2026-05-11", usuario_id: "4", created_at: "2026-05-11T07:30:00Z" },
  { id: "MOV-019", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 10,  cantidad_anterior: 65,  cantidad_nueva: 55,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    lote_id: "LOT-003", lote_numero: "NPK-2025-003",
    fecha: "2026-05-16", usuario_id: "4", created_at: "2026-05-16T07:00:00Z" },
  { id: "MOV-020", catalogo_id: "INV-004", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "aplicacion_campo",  cantidad: 10,  cantidad_anterior: 55,  cantidad_nueva: 45,
    registro_origen_tipo: "APLICACION_FITOSANITARIA",
    lote_id: "LOT-003", lote_numero: "NPK-2025-003",
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
    lote_id: "LOT-004", lote_numero: "MS-2024-041",
    fecha: "2026-04-25", usuario_id: "1", created_at: "2026-04-25T09:00:00Z" },
  { id: "MOV-027", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 4,  cantidad_anterior: 20, cantidad_nueva: 16,
    observaciones: "Cultivo in vitro batch 1",
    lote_id: "LOT-004", lote_numero: "MS-2024-041",
    fecha: "2026-05-05", usuario_id: "3", created_at: "2026-05-05T10:00:00Z" },
  { id: "MOV-028", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 2,  cantidad_anterior: 16, cantidad_nueva: 14,
    observaciones: "Micropropagación fresas",
    lote_id: "LOT-004", lote_numero: "MS-2024-041",
    fecha: "2026-05-10", usuario_id: "3", created_at: "2026-05-10T10:30:00Z" },
  { id: "MOV-029", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "salida",   subtipo: "uso_produccion", cantidad: 2,  cantidad_anterior: 14, cantidad_nueva: 12,
    observaciones: "Cultivo in vitro batch 2",
    lote_id: "LOT-004", lote_numero: "MS-2024-041",
    fecha: "2026-05-15", usuario_id: "3", created_at: "2026-05-15T11:00:00Z" },
  { id: "MOV-030", catalogo_id: "INV-006", cliente_id: "1", productor_id: "1",
    tipo: "ajuste",   subtipo: "conteo_fisico", cantidad: 12,  cantidad_anterior: 12, cantidad_nueva: 12,
    observaciones: "Verificación refrigerador — OK",
    lote_id: "LOT-004", lote_numero: "MS-2024-041",
    fecha: "2026-05-22", usuario_id: "1", created_at: "2026-05-22T16:30:00Z" },
];

// ─── Datos demo — Lotes ───────────────────────────────────────────────────────

const DEMO_LOTES: InvLote[] = [
  // INV-003 Azoxystrobin — 2 lotes (FEFO: el primero vence antes)
  {
    id: "LOT-001", catalogo_id: "INV-003",
    numero_lote: "AZX-2024-089",
    fecha_fabricacion: "2024-03-01",
    fecha_vencimiento: "2026-09-01",
    certificado_origen: "SAG-CL-2024-089",
    proveedor_id: "Agroquímica del Sur",
    precio_unitario: 45.50,
    cantidad_inicial: 40, cantidad_actual: 36.2,
    activo: true, created_at: "2024-04-30T08:00:00Z",
  },
  {
    id: "LOT-002", catalogo_id: "INV-003",
    numero_lote: "AZX-2025-012",
    fecha_vencimiento: "2027-03-15",
    precio_unitario: 47.00,
    cantidad_inicial: 30, cantidad_actual: 30,
    activo: true, created_at: "2025-01-15T08:00:00Z",
  },
  // INV-004 Fertilizante NPK — 1 lote
  {
    id: "LOT-003", catalogo_id: "INV-004",
    numero_lote: "NPK-2025-003",
    fecha_vencimiento: "2028-06-30",
    certificado_origen: "ANMAT-2025-FER-003",
    proveedor_id: "NutriAg SpA",
    precio_unitario: 3.20,
    cantidad_inicial: 60, cantidad_actual: 49,
    activo: true, created_at: "2025-02-10T08:00:00Z",
  },
  // INV-006 Medio MS estéril — lote próximo a vencer (demo alertas)
  {
    id: "LOT-004", catalogo_id: "INV-006",
    numero_lote: "MS-2024-041",
    fecha_fabricacion: "2024-06-01",
    fecha_vencimiento: "2026-06-10",
    certificado_origen: "BioScience-2024-041",
    proveedor_id: "BioScience Ltda.",
    precio_unitario: 89.00,
    cantidad_inicial: 20, cantidad_actual: 9,
    notas: "Conservar entre 2°C y 8°C",
    activo: true, created_at: "2024-06-15T08:00:00Z",
  },
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
    // Regla "producto fijo": el formulario MOVIMIENTO_BODEGA no usa TablaInsumos —
    // siempre mueve el mismo producto del catálogo (Cajas exportación), y la
    // cantidad real se CALCULA con una fórmula a partir de dos campos numéricos
    // del formulario: bultos_recibidos * unidades_por_bulto.
    // Este es el caso de uso real de "campo de cantidad" / "fórmula".
    id: "FM-002", cliente_id: "1",
    tabla_origen: "MOVIMIENTO_BODEGA",
    catalogo_id: "INV-002",
    campo_jsonb_cantidad: "bultos_recibidos", // fallback si no hay fórmula
    formula_cantidad: "bultos_recibidos * unidades_por_bulto",
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
  precio_unitario?:      number;
  proveedor_id?:         string;
  observaciones?:        string;
  registro_origen_tipo?: string;
  lote_id?:              string;
  lote_numero?:          string;
  bloque_ref?:           string;   // ubicación en el mapa del campo (extraído del formulario)
  cultivo_id?:           string;   // cultivo al que pertenece el registro origen
}

interface InventarioContextValue {
  catalogos: InvCatalogo[];
  movimientos: InvMovimiento[];
  lotes: InvLote[];
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
  // Lotes CRUD
  agregarLote:    (lote: Omit<InvLote, "id" | "created_at">) => InvLote;
  editarLote:     (id: string, cambios: Partial<Omit<InvLote, "id" | "created_at">>) => void;
  getLotesByProducto: (catalogoId: string) => InvLote[];
  /** Devuelve lotes activos de un producto ordenados por FEFO (vencimiento más próximo primero) */
  getLotesFEFO:       (catalogoId: string) => InvLote[];
  proveedores:             string[];
  agregarProveedor:        (nombre: string) => void;
  getProductosByModulo:    (moduloId: string) => InvCatalogo[];
  getAllProductos:          () => InvCatalogo[];
  getMovimientosByProducto:(catalogoId: string) => InvMovimiento[];
  getAlertas:              () => InvCatalogo[];
  getStockCritico:         () => InvCatalogo[];
  getAlertasVencimiento:   () => AlertaVencimiento[];
  simularTrigger:          (tablaNombre: string, datos: Record<string, unknown>, contexto?: { cultivo_id?: string }) => void;
  /** Preview de qué se revertiría al borrar un registro */
  previewReversion:        (tablaNombre: string, datos: Record<string, unknown>) => Array<{ nombre: string; cantidad: number; tipoOriginal: InvMovimientoTipo }>;
  /** Crea movimientos inversos al borrar un registro */
  revertirMovimientos:     (tablaNombre: string, datos: Record<string, unknown>) => void;
  /**
   * Edición inteligente de TablaInsumos: solo registra el DELTA entre los valores
   * anteriores y los nuevos. Si usabas 40L y corriges a 30L → devolución de 10L.
   * Nunca hace revert total + re-apply.
   */
  ajustarMovimientosTablaInsumos: (
    tablaNombre: string,
    oldDatos:    Record<string, unknown>,
    newDatos:    Record<string, unknown>,
    contexto?:   { cultivo_id?: string },
  ) => void;
  /**
   * Edición inteligente para reglas de "producto fijo" (sin TablaInsumos):
   * calcula el delta entre la cantidad anterior y la nueva (usando la fórmula
   * si existe) y registra solo la diferencia. Si subiste de 20 a 40 → +20 más.
   * Si bajaste de 20 a 10 → devolución de 10.
   */
  ajustarMovimientosProductoFijo: (
    tablaNombre: string,
    oldDatos:    Record<string, unknown>,
    newDatos:    Record<string, unknown>,
    contexto?:   { cultivo_id?: string },
  ) => void;
  /**
   * Registra una transferencia entre áreas/módulos.
   * Crea dos movimientos vinculados (salida del origen + entrada al destino).
   * El saldo neto del producto no cambia — es un movimiento logístico.
   */
  realizarTransferencia: (
    catalogoId:    string,
    cantidad:      number,
    moduloOrigen:  string,
    moduloDestino: string,
    observaciones?: string,
  ) => boolean;
}

const InventarioContext = createContext<InventarioContextValue | null>(null);

// ─── Helpers de módulo ────────────────────────────────────────────────────────

const LOCATION_FIELDS = [
  "bloque_sector", "bloque", "sector", "nave", "macrotunel",
  "parcela", "cuartel", "lote_campo", "area_tratada", "ubicacion",
] as const;

export function extractBloqueRef(datos: Record<string, unknown>): string | undefined {
  for (const field of LOCATION_FIELDS) {
    const val = datos[field];
    if (val && typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function InventarioProvider({ children }: { children: ReactNode }) {
  const { role, currentUser } = useRole();

  const [catalogos,       setCatalogos]       = useState<InvCatalogo[]>(DEMO_CATALOGOS);
  const [movimientos,     setMovimientos]     = useState<InvMovimiento[]>(DEMO_MOVIMIENTOS);
  const [formularioMapas, setFormularioMapas] = useState<InvFormularioMapa[]>(DEMO_FORMULARIO_MAPAS);
  const [lotes,           setLotes]           = useState<InvLote[]>(DEMO_LOTES);

  // Lista de proveedores conocidos (se llena desde los productos + nuevos que agrega el admin)
  const proveedoresIniciales = [...new Set(DEMO_CATALOGOS.map(c => c.proveedor_id).filter(Boolean) as string[])];
  const [proveedores, setProveedores] = useState<string[]>(proveedoresIniciales);

  const agregarProveedor = useCallback((nombre: string) => {
    setProveedores(prev => prev.includes(nombre) ? prev : [...prev, nombre].sort());
  }, []);

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

  /** Alterna el estado activo/inactivo del producto */
  const desactivarProducto = useCallback((id: string) => {
    const p = catalogos.find(c => c.id === id);
    if (!p) return;
    editarProducto(id, { activo: !p.activo });
  }, [editarProducto, catalogos]);

  // ── Lotes CRUD + FEFO ─────────────────────────────────────────────────────
  const agregarLote = useCallback((lote: Omit<InvLote, "id" | "created_at">): InvLote => {
    const now   = new Date().toISOString();
    const nuevo = { ...lote, id: `LOT-${Date.now()}`, created_at: now };
    setLotes(prev => [...prev, nuevo]);
    return nuevo;
  }, []);

  const editarLote = useCallback((id: string, cambios: Partial<Omit<InvLote, "id" | "created_at">>) => {
    setLotes(prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l));
  }, []);

  const getLotesByProducto = useCallback((catalogoId: string): InvLote[] =>
    lotes.filter(l => l.catalogo_id === catalogoId),
  [lotes]);

  const getLotesFEFO = useCallback((catalogoId: string): InvLote[] =>
    lotes
      .filter(l => l.catalogo_id === catalogoId && l.activo && l.cantidad_actual > 0)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)),
  [lotes]);

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
      lote_id:            opciones.lote_id,
      lote_numero:        opciones.lote_numero,
      bloque_ref:         opciones.bloque_ref,
      cultivo_id:         opciones.cultivo_id,
      fecha:      now.substring(0, 10),
      usuario_id: currentUser ? String(currentUser.id) : "1",
      created_at: now,
    };

    // Actualizar cantidad del lote si se especificó
    if (opciones.lote_id) {
      setLotes(prev => prev.map(l => {
        if (l.id !== opciones.lote_id) return l;
        const delta = tipo === "entrada" ? cantidad : tipo === "salida" ? -cantidad : (nueva - anterior);
        return { ...l, cantidad_actual: Math.max(0, l.cantidad_actual + delta) };
      }));
    }

    setMovimientos(prev => [...prev, mov]);
    setCatalogos(prev => prev.map(p =>
      p.id === catalogoId ? { ...p, cantidad_actual: nueva, updated_at: now } : p,
    ));
    return true;
  }, [catalogos, currentUser]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const getProductosByModulo = useCallback((moduloId: string) =>
    catalogos.filter(p => p.activo && p.modulo_ids.includes(moduloId) && scopeFilter(p)),
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

  const getAlertasVencimiento = useCallback((): AlertaVencimiento[] => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const resultado: AlertaVencimiento[] = [];

    for (const p of getAllProductos()) {
      const fechaStr = getCampoVencimiento(p);
      if (!fechaStr) continue;
      const fechaVenc = new Date(fechaStr);
      if (isNaN(fechaVenc.getTime())) continue;
      const diasRestantes = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / 86_400_000);
      if (diasRestantes <= 90) {
        resultado.push({
          producto:         p,
          fechaVencimiento: fechaStr,
          diasRestantes,
          estado:           getVencimientoStatus(diasRestantes),
        });
      }
    }
    return resultado.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [getAllProductos]);

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


  // ── Helpers compartidos entre simularTrigger y revertirMovimientos ───────
  const parseTablaInsumos = (raw: unknown): Array<{ catalogo_id: string; cantidad: number }> | null => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0 && "catalogo_id" in parsed[0]) return parsed;
    } catch { /* not a table */ }
    return null;
  };

  /** Devuelve un preview de qué movimientos se crearían/revertirían */
  const previewReversion = useCallback((
    tablaNombre: string,
    datos: Record<string, unknown>,
  ): Array<{ nombre: string; cantidad: number; tipoOriginal: InvMovimientoTipo }> => {
    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    const mapas = formularioMapas.filter(m =>
      m.activo &&
      m.tabla_origen === tablaNombre &&
      (filtroCliente === null || m.cliente_id === filtroCliente)
    );
    const resultado: Array<{ nombre: string; cantidad: number; tipoOriginal: InvMovimientoTipo }> = [];
    for (const mapa of mapas) {
      const rawValor = datos[mapa.campo_jsonb_cantidad];
      const tablaRows = parseTablaInsumos(rawValor);
      if (tablaRows) {
        for (const row of tablaRows) {
          const cant = Number(row.cantidad);
          if (!row.catalogo_id || isNaN(cant) || cant <= 0) continue;
          const prod = catalogos.find(c => c.id === row.catalogo_id);
          resultado.push({ nombre: prod?.nombre ?? row.catalogo_id, cantidad: cant, tipoOriginal: mapa.tipo_movimiento });
        }
      } else {
        const cid = mapa.catalogo_id;
        if (!cid) continue;
        let cant: number;
        if (mapa.formula_cantidad) {
          const evaluada = evaluarFormulaCantidad(mapa.formula_cantidad, datos);
          if (evaluada === null) continue; // fórmula inválida/insegura → se omite la regla
          cant = evaluada;
        } else {
          cant = parseFloat(String(datos[mapa.campo_jsonb_cantidad] ?? 0));
        }
        if (isNaN(cant) || cant <= 0) continue;
        const prod = catalogos.find(c => c.id === cid);
        resultado.push({ nombre: prod?.nombre ?? cid, cantidad: cant, tipoOriginal: mapa.tipo_movimiento });
      }
    }
    return resultado;
  }, [formularioMapas, catalogos, role, clienteIdStr]);

  /** Crea movimientos inversos — se llama cuando el operario borra un registro */
  const revertirMovimientos = useCallback((
    tablaNombre: string,
    datos: Record<string, unknown>,
  ) => {
    const invertir = (t: InvMovimientoTipo): InvMovimientoTipo =>
      t === "entrada" ? "salida" : t === "salida" ? "entrada" : "ajuste";

    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    const mapas = formularioMapas.filter(m =>
      m.activo &&
      m.tabla_origen === tablaNombre &&
      (filtroCliente === null || m.cliente_id === filtroCliente)
    );
    for (const mapa of mapas) {
      const rawValor = datos[mapa.campo_jsonb_cantidad];
      const tablaRows = parseTablaInsumos(rawValor);
      if (tablaRows) {
        for (const row of tablaRows) {
          const cant = Number(row.cantidad);
          if (!row.catalogo_id || isNaN(cant) || cant <= 0) continue;
          registrarMovimiento(row.catalogo_id, invertir(mapa.tipo_movimiento), "devolucion", cant, {
            registro_origen_tipo: tablaNombre,
            observaciones: `Reversión automática — registro eliminado de ${tablaNombre}`,
          });
        }
      } else {
        const cid = mapa.catalogo_id;
        if (!cid) continue;
        let cant: number;
        if (mapa.formula_cantidad) {
          const evaluada = evaluarFormulaCantidad(mapa.formula_cantidad, datos);
          if (evaluada === null) continue; // fórmula inválida/insegura → se omite la regla
          cant = evaluada;
        } else {
          cant = parseFloat(String(datos[mapa.campo_jsonb_cantidad] ?? 0));
        }
        if (isNaN(cant) || cant <= 0) continue;
        registrarMovimiento(cid, invertir(mapa.tipo_movimiento), "devolucion", cant, {
          registro_origen_tipo: tablaNombre,
          observaciones: `Reversión automática — registro eliminado de ${tablaNombre}`,
        });
      }
    }
  }, [formularioMapas, registrarMovimiento, role, clienteIdStr]);

  // Nombres de campos de ubicación en formularios agrícolas (orden de prioridad)
  const simularTrigger = useCallback((
    tablaNombre: string,
    datos: Record<string, unknown>,
    contexto?: { cultivo_id?: string },
  ) => {
    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    // Extraer referencias de ubicación del campo del formulario
    const bloqueRef  = extractBloqueRef(datos);
    const cultivoId  = contexto?.cultivo_id ?? (datos.cultivo_id as string | undefined);
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
        // TablaInsumos: un movimiento por cada fila; aplica FEFO por lote
        for (const row of tablaRows) {
          const rowCant = Number(row.cantidad);
          if (!row.catalogo_id || isNaN(rowCant) || rowCant <= 0) continue;
          const loteFefo = lotes
            .filter(l => l.catalogo_id === row.catalogo_id && l.activo && l.cantidad_actual > 0)
            .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];
          registrarMovimiento(row.catalogo_id, mapa.tipo_movimiento, mapa.subtipo, rowCant, {
            registro_origen_tipo: tablaNombre,
            observaciones:        `Automático desde ${tablaNombre}`,
            lote_id:              loteFefo?.id,
            lote_numero:          loteFefo?.numero_lote,
            bloque_ref:           bloqueRef,
            cultivo_id:           cultivoId,
          });
        }
        continue; // siguiente regla
      }

      // ── Regla simple: producto fijo en la regla ────────────────────────────
      const cid = mapa.catalogo_id;
      if (!cid) continue;

      let cant: number;
      if (mapa.formula_cantidad) {
        const evaluada = evaluarFormulaCantidad(mapa.formula_cantidad, datos);
        if (evaluada === null) continue; // fórmula inválida/insegura → se omite la regla
        cant = evaluada;
      } else {
        cant = parseFloat(String(datos[mapa.campo_jsonb_cantidad] ?? 0));
      }

      if (isNaN(cant) || cant <= 0) continue;
      const loteFefoSimple = lotes
        .filter(l => l.catalogo_id === cid && l.activo && l.cantidad_actual > 0)
        .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];
      registrarMovimiento(cid, mapa.tipo_movimiento, mapa.subtipo, cant, {
        registro_origen_tipo: tablaNombre,
        observaciones:        `Automático desde ${tablaNombre}`,
        lote_id:              loteFefoSimple?.id,
        lote_numero:          loteFefoSimple?.numero_lote,
        bloque_ref:           bloqueRef,
        cultivo_id:           cultivoId,
      });
    }
  }, [formularioMapas, registrarMovimiento, lotes, role, clienteIdStr]);

  // ── Ajuste delta para edición de TablaInsumos ────────────────────────────
  const ajustarMovimientosTablaInsumos = useCallback((
    tablaNombre: string,
    oldDatos:    Record<string, unknown>,
    newDatos:    Record<string, unknown>,
    contexto?:   { cultivo_id?: string },
  ) => {
    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    const bloqueRef  = extractBloqueRef(newDatos);
    const cultivoId  = contexto?.cultivo_id ?? (newDatos.cultivo_id as string | undefined);
    const invertir   = (t: InvMovimientoTipo): InvMovimientoTipo =>
      t === "entrada" ? "salida" : t === "salida" ? "entrada" : "ajuste";

    const mapas = formularioMapas.filter(m =>
      m.activo &&
      m.tabla_origen === tablaNombre &&
      (filtroCliente === null || m.cliente_id === filtroCliente),
    );

    for (const mapa of mapas) {
      const oldRows = parseTablaInsumos(oldDatos[mapa.campo_jsonb_cantidad]) ?? [];
      const newRows = parseTablaInsumos(newDatos[mapa.campo_jsonb_cantidad]) ?? [];

      // Unión de todos los productos que aparecen en alguna versión
      const allIds = new Set([
        ...oldRows.map(r => r.catalogo_id),
        ...newRows.map(r => r.catalogo_id),
      ]);

      for (const catalogoId of allIds) {
        if (!catalogoId) continue;
        const oldQty = oldRows.find(r => r.catalogo_id === catalogoId)?.cantidad ?? 0;
        const newQty = newRows.find(r => r.catalogo_id === catalogoId)?.cantidad ?? 0;
        const delta  = newQty - oldQty;

        if (Math.abs(delta) < 0.0001) continue; // sin cambio

        const loteFefo = lotes
          .filter(l => l.catalogo_id === catalogoId && l.activo && l.cantidad_actual > 0)
          .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];

        const sign = delta > 0 ? `+${delta}` : String(delta);
        const obs  = `Corrección por edición (${sign} ${catalogos.find(c => c.id === catalogoId)?.unidad_medida ?? ""})`;

        if (delta > 0) {
          // Usó MÁS → descuento adicional
          registrarMovimiento(catalogoId, mapa.tipo_movimiento, mapa.subtipo, delta, {
            registro_origen_tipo: tablaNombre,
            observaciones:        obs,
            lote_id:              loteFefo?.id,
            lote_numero:          loteFefo?.numero_lote,
            bloque_ref:           bloqueRef,
            cultivo_id:           cultivoId,
          });
        } else {
          // Usó MENOS → devolución del exceso
          registrarMovimiento(catalogoId, invertir(mapa.tipo_movimiento), "devolucion", Math.abs(delta), {
            registro_origen_tipo: tablaNombre,
            observaciones:        obs,
            lote_id:              loteFefo?.id,
            lote_numero:          loteFefo?.numero_lote,
            bloque_ref:           bloqueRef,
            cultivo_id:           cultivoId,
          });
        }
      }
    }
  }, [formularioMapas, registrarMovimiento, lotes, catalogos, role, clienteIdStr]);

  // ── Ajuste delta para reglas de producto fijo (sin TablaInsumos) ─────────
  const ajustarMovimientosProductoFijo = useCallback((
    tablaNombre: string,
    oldDatos:    Record<string, unknown>,
    newDatos:    Record<string, unknown>,
    contexto?:   { cultivo_id?: string },
  ) => {
    const filtroCliente = role === "super_admin" ? null : clienteIdStr;
    const bloqueRef     = extractBloqueRef(newDatos);
    const cultivoId     = contexto?.cultivo_id ?? (newDatos.cultivo_id as string | undefined);
    const invertir      = (t: InvMovimientoTipo): InvMovimientoTipo =>
      t === "entrada" ? "salida" : t === "salida" ? "entrada" : "ajuste";

    const mapas = formularioMapas.filter(m =>
      m.activo &&
      m.tabla_origen === tablaNombre &&
      m.catalogo_id !== "" &&   // solo reglas de producto fijo
      (filtroCliente === null || m.cliente_id === filtroCliente),
    );

    for (const mapa of mapas) {
      // Calcular cantidad anterior y nueva con la misma lógica que simularTrigger
      const calcCant = (datos: Record<string, unknown>): number => {
        if (mapa.formula_cantidad) {
          const v = evaluarFormulaCantidad(mapa.formula_cantidad, datos);
          return v ?? 0;
        }
        return parseFloat(String(datos[mapa.campo_jsonb_cantidad] ?? 0)) || 0;
      };

      const oldCant = calcCant(oldDatos);
      const newCant = calcCant(newDatos);
      const delta   = newCant - oldCant;

      if (Math.abs(delta) < 0.0001) continue; // sin cambio real

      const cid = mapa.catalogo_id;
      const loteFefo = lotes
        .filter(l => l.catalogo_id === cid && l.activo && l.cantidad_actual > 0)
        .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];

      const unidad = catalogos.find(c => c.id === cid)?.unidad_medida ?? "";
      const sign   = delta > 0 ? `+${delta}` : String(delta);
      const obs    = `Corrección por edición (${sign} ${unidad})`;

      if (delta > 0) {
        // Cantidad aumentó → movimiento adicional en la misma dirección original
        registrarMovimiento(cid, mapa.tipo_movimiento, mapa.subtipo, delta, {
          registro_origen_tipo: tablaNombre,
          observaciones:        obs,
          lote_id:              loteFefo?.id,
          lote_numero:          loteFefo?.numero_lote,
          bloque_ref:           bloqueRef,
          cultivo_id:           cultivoId,
        });
      } else {
        // Cantidad disminuyó → movimiento inverso (devolución/corrección)
        registrarMovimiento(cid, invertir(mapa.tipo_movimiento), "devolucion", Math.abs(delta), {
          registro_origen_tipo: tablaNombre,
          observaciones:        obs,
          lote_id:              loteFefo?.id,
          lote_numero:          loteFefo?.numero_lote,
          bloque_ref:           bloqueRef,
          cultivo_id:           cultivoId,
        });
      }
    }
  }, [formularioMapas, evaluarFormulaCantidad, registrarMovimiento, lotes, catalogos, role, clienteIdStr]);

  // ── Transferencia entre áreas ─────────────────────────────────────────────
  const realizarTransferencia = useCallback((
    catalogoId:    string,
    cantidad:      number,
    moduloOrigen:  string,
    moduloDestino: string,
    observaciones?: string,
  ): boolean => {
    const prod = catalogos.find(c => c.id === catalogoId);
    if (!prod || cantidad <= 0 || cantidad > prod.cantidad_actual) return false;

    const now      = new Date().toISOString();
    const today    = now.substring(0, 10);
    const pairId   = `TR-${Date.now()}`;
    const obs      = observaciones?.trim() || `Transferencia ${moduloOrigen} → ${moduloDestino}`;
    const clienteId  = String(prod.cliente_id);
    const productorId = String(prod.productor_id);
    const usuarioId  = "1"; // TODO: vincular con currentUser cuando esté disponible aquí

    // Movimiento 1: SALIDA del origen
    const salida: InvMovimiento = {
      id: `${pairId}-out`,
      catalogo_id:       catalogoId,
      cliente_id:        clienteId,
      productor_id:      productorId,
      tipo:              "salida",
      subtipo:           "transferencia",
      cantidad,
      cantidad_anterior: prod.cantidad_actual,
      cantidad_nueva:    prod.cantidad_actual - cantidad,
      precio_unitario:   prod.precio_unitario,
      fecha:             today,
      observaciones:     obs,
      usuario_id:        usuarioId,
      created_at:        now,
      modulo_origen:     moduloOrigen,
      modulo_destino:    moduloDestino,
      transfer_pair_id:  pairId,
    };

    // Movimiento 2: ENTRADA al destino (restaura saldo — misma entidad física)
    const entrada: InvMovimiento = {
      id: `${pairId}-in`,
      catalogo_id:       catalogoId,
      cliente_id:        clienteId,
      productor_id:      productorId,
      tipo:              "entrada",
      subtipo:           "transferencia",
      cantidad,
      cantidad_anterior: prod.cantidad_actual - cantidad,
      cantidad_nueva:    prod.cantidad_actual, // saldo final igual al original
      precio_unitario:   prod.precio_unitario,
      fecha:             today,
      observaciones:     obs,
      usuario_id:        usuarioId,
      created_at:        now,
      modulo_origen:     moduloOrigen,
      modulo_destino:    moduloDestino,
      transfer_pair_id:  pairId,
    };

    // Si el destino no está en modulo_ids del producto, lo agregamos
    const nuevoModuloIds = prod.modulo_ids.includes(moduloDestino)
      ? prod.modulo_ids
      : [...prod.modulo_ids, moduloDestino];

    setCatalogos(prev => prev.map(p =>
      p.id === catalogoId
        ? { ...p, modulo_ids: nuevoModuloIds, updated_at: now }
        : p,
    ));

    setMovimientos(prev => [...prev, salida, entrada]);
    return true;
  }, [catalogos]);

  const value = useMemo<InventarioContextValue>(() => ({
    catalogos, movimientos, formularioMapas, lotes,
    proveedores, agregarProveedor,
    agregarProducto, editarProducto, desactivarProducto, registrarMovimiento,
    agregarRegla, editarRegla, toggleRegla, eliminarRegla,
    agregarLote, editarLote, getLotesByProducto, getLotesFEFO,
    getProductosByModulo, getAllProductos, getMovimientosByProducto,
    getAlertas, getStockCritico, getAlertasVencimiento, simularTrigger,
    previewReversion, revertirMovimientos, ajustarMovimientosTablaInsumos, ajustarMovimientosProductoFijo, realizarTransferencia,
  }), [
    catalogos, movimientos, formularioMapas, lotes,
    proveedores, agregarProveedor,
    agregarProducto, editarProducto, desactivarProducto, registrarMovimiento,
    agregarRegla, editarRegla, toggleRegla, eliminarRegla,
    agregarLote, editarLote, getLotesByProducto, getLotesFEFO,
    getProductosByModulo, getAllProductos, getMovimientosByProducto,
    getAlertas, getStockCritico, getAlertasVencimiento, simularTrigger,
    previewReversion, revertirMovimientos, ajustarMovimientosTablaInsumos, ajustarMovimientosProductoFijo, realizarTransferencia,
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
