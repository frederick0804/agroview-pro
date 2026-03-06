// ─── Shared Module-Definition Config (V3 System) ──────────────────────────────
// This file is the source of truth for which CONFIG_DEFINICIONES belong to each
// module, their minimum access level (nivel_minimo), and their demo data.
// Used by: Sidebar (expandable sub-items), module pages (Definiciones tab).

export type TipoConfig = "estructura_campo" | "calibres" | "datos_personal" | "asistencia" | "lab_analisis";
export type TipoDato   = "Texto" | "Número" | "Fecha" | "Sí/No" | "Lista";

export interface ModDef {
  id: string;
  tipo: TipoConfig;
  nombre: string;
  descripcion: string;
  version: string;
  /** Nivel jerárquico mínimo para acceder (1–6) */
  nivel_minimo: number;
  /** Módulo al que pertenece (coincide con la clave de rolePermissions y la ruta) */
  modulo: string;
}

export interface ModParam {
  id: string;
  definicion_id: string;
  nombre: string;
  tipo_dato: TipoDato;
  obligatorio: boolean;
  orden: number;
}

export interface ModDato {
  id: string;
  definicion_id: string;
  referencia: string;
  fecha: string;
  valores: string; // JSON híbrido (columnas + JSONB)
}

// ─── Definiciones por módulo ─────────────────────────────────────────────────

export const DEFINICIONES: ModDef[] = [
  {
    id: "1", tipo: "estructura_campo",
    nombre: "Estructura de Campo v2.0",
    descripcion: "Jerarquía Bloque → Macrotúnel → Nave",
    version: "2.0", nivel_minimo: 2, modulo: "cultivo",
  },
  {
    id: "2", tipo: "calibres",
    nombre: "Calibres Arándano Azul",
    descripcion: "Rangos de calibre en mm para selección de fruta",
    version: "1.0", nivel_minimo: 2, modulo: "cosecha",
  },
  {
    id: "3", tipo: "datos_personal",
    nombre: "Ficha de Personal v3.0",
    descripcion: "Datos dinámicos de trabajadores de campo",
    version: "3.0", nivel_minimo: 3, modulo: "recursos-humanos",
  },
  {
    id: "4", tipo: "asistencia",
    nombre: "Control de Asistencia",
    descripcion: "Registro de timbrado y jornada laboral (QR/bio)",
    version: "1.5", nivel_minimo: 3, modulo: "recursos-humanos",
  },
  {
    id: "5", tipo: "lab_analisis",
    nombre: "Análisis de Laboratorio",
    descripcion: "Parámetros de análisis físico-químico y biológico",
    version: "1.0", nivel_minimo: 1, modulo: "laboratorio",
  },
];

// ─── Parámetros (campos) por definición ──────────────────────────────────────

export const PARAMETROS: ModParam[] = [
  // def 1: estructura_campo
  { id: "1",  definicion_id: "1", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "2",  definicion_id: "1", nombre: "nivel",             tipo_dato: "Número", obligatorio: true,  orden: 2 },
  { id: "3",  definicion_id: "1", nombre: "capacidad_plantas", tipo_dato: "Número", obligatorio: false, orden: 3 },
  // def 2: calibres
  { id: "4",  definicion_id: "2", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "5",  definicion_id: "2", nombre: "mm_minimo",         tipo_dato: "Número", obligatorio: true,  orden: 2 },
  { id: "6",  definicion_id: "2", nombre: "mm_maximo",         tipo_dato: "Número", obligatorio: true,  orden: 3 },
  { id: "7",  definicion_id: "2", nombre: "peso_g_minimo",     tipo_dato: "Número", obligatorio: false, orden: 4 },
  // def 3: datos_personal
  { id: "8",  definicion_id: "3", nombre: "rut",               tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "9",  definicion_id: "3", nombre: "nombre_completo",   tipo_dato: "Texto",  obligatorio: true,  orden: 2 },
  { id: "10", definicion_id: "3", nombre: "cargo",             tipo_dato: "Lista",  obligatorio: true,  orden: 3 },
  { id: "11", definicion_id: "3", nombre: "telefono",          tipo_dato: "Texto",  obligatorio: false, orden: 4 },
  { id: "12", definicion_id: "3", nombre: "fecha_ingreso",     tipo_dato: "Fecha",  obligatorio: true,  orden: 5 },
  { id: "13", definicion_id: "3", nombre: "tipo_contrato",     tipo_dato: "Lista",  obligatorio: true,  orden: 6 },
  // def 4: asistencia
  { id: "14", definicion_id: "4", nombre: "empleado_id",       tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "15", definicion_id: "4", nombre: "tipo_marca",        tipo_dato: "Lista",  obligatorio: true,  orden: 2 },
  { id: "16", definicion_id: "4", nombre: "hora",              tipo_dato: "Texto",  obligatorio: true,  orden: 3 },
  { id: "17", definicion_id: "4", nombre: "ubicacion_gps",     tipo_dato: "Texto",  obligatorio: false, orden: 4 },
  // def 5: lab_analisis
  { id: "18", definicion_id: "5", nombre: "muestra",           tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "19", definicion_id: "5", nombre: "tipo_prueba",       tipo_dato: "Lista",  obligatorio: true,  orden: 2 },
  { id: "20", definicion_id: "5", nombre: "cultivo",           tipo_dato: "Texto",  obligatorio: true,  orden: 3 },
  { id: "21", definicion_id: "5", nombre: "resultado",         tipo_dato: "Texto",  obligatorio: true,  orden: 4 },
  { id: "22", definicion_id: "5", nombre: "unidad",            tipo_dato: "Texto",  obligatorio: false, orden: 5 },
  { id: "23", definicion_id: "5", nombre: "estado",            tipo_dato: "Lista",  obligatorio: true,  orden: 6 },
];

// ─── Datos demo ───────────────────────────────────────────────────────────────

export const DATOS_DEMO: ModDato[] = [
  // def 1: estructura_campo
  { id: "d1", definicion_id: "1", referencia: "Bloque A-1",       fecha: "2025-01-10", valores: '{"nombre":"Bloque A-1","nivel":1,"capacidad_plantas":4500}' },
  { id: "d2", definicion_id: "1", referencia: "Macrotúnel A-1-1", fecha: "2025-01-10", valores: '{"nombre":"Macrotúnel A-1-1","nivel":2,"capacidad_plantas":900}' },
  // def 2: calibres
  { id: "d3", definicion_id: "2", referencia: "Jumbo",             fecha: "2025-01-10", valores: '{"nombre":"Jumbo","mm_minimo":18,"mm_maximo":20,"peso_g_minimo":5}' },
  { id: "d4", definicion_id: "2", referencia: "Extra",             fecha: "2025-01-10", valores: '{"nombre":"Extra","mm_minimo":16,"mm_maximo":18,"peso_g_minimo":4}' },
  // def 3: datos_personal
  { id: "d5", definicion_id: "3", referencia: "Pedro Soto",        fecha: "2025-02-01", valores: '{"rut":"12.345.678-9","nombre_completo":"Pedro Soto","cargo":"Cosechador","telefono":"+56912345678","fecha_ingreso":"2024-03-01","tipo_contrato":"plazo_fijo"}' },
  { id: "d6", definicion_id: "3", referencia: "Carmen Díaz",       fecha: "2025-02-01", valores: '{"rut":"11.222.333-4","nombre_completo":"Carmen Díaz","cargo":"Cosechadora","telefono":"+56987654321","fecha_ingreso":"2023-07-15","tipo_contrato":"Indefinido"}' },
  // def 4: asistencia
  { id: "d7", definicion_id: "4", referencia: "Pedro Soto / entrada", fecha: "2025-03-06", valores: '{"empleado_id":"12345678","tipo_marca":"entrada","hora":"07:42","ubicacion_gps":"Bloque A-1"}' },
  { id: "d8", definicion_id: "4", referencia: "Carmen Díaz / entrada", fecha: "2025-03-06", valores: '{"empleado_id":"11222333","tipo_marca":"entrada","hora":"07:45","ubicacion_gps":"Bloque A-2"}' },
  // def 5: lab_analisis
  { id: "d9",  definicion_id: "5", referencia: "LAB-0112", fecha: "2025-01-28", valores: '{"muestra":"LAB-0112","tipo_prueba":"Brix","cultivo":"Fresa Maravilla","resultado":"12.5","unidad":"°Brix","estado":"Completado"}' },
  { id: "d10", definicion_id: "5", referencia: "LAB-0113", fecha: "2025-01-28", valores: '{"muestra":"LAB-0113","tipo_prueba":"pH Suelo","cultivo":"Bloque A","resultado":"6.2","unidad":"pH","estado":"Completado"}' },
  { id: "d11", definicion_id: "5", referencia: "LAB-0114", fecha: "2025-01-29", valores: '{"muestra":"LAB-0114","tipo_prueba":"Conductividad","cultivo":"Bloque B","resultado":"1.8","unidad":"dS/m","estado":"Completado"}' },
  { id: "d12", definicion_id: "5", referencia: "LAB-0115", fecha: "2025-01-30", valores: '{"muestra":"LAB-0115","tipo_prueba":"Firmeza","cultivo":"Fresa San Andreas","resultado":"3.2","unidad":"N","estado":"En proceso"}' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getDefsByModulo = (modulo: string): ModDef[] =>
  DEFINICIONES.filter(d => d.modulo === modulo);

export const getParamsByDef = (defId: string): ModParam[] =>
  PARAMETROS.filter(p => p.definicion_id === defId).sort((a, b) => a.orden - b.orden);

export const getDatosByDef = (defId: string): ModDato[] =>
  DATOS_DEMO.filter(d => d.definicion_id === defId);

export const parseValores = (v: string): Record<string, string> => {
  try { return JSON.parse(v) as Record<string, string>; } catch { return {}; }
};

export const tipoDatoInputType: Record<TipoDato, string> = {
  Texto:   "text",
  Número:  "number",
  Fecha:   "date",
  "Sí/No": "text",
  Lista:   "text",
};

export const tipoBadgeColor: Record<TipoConfig, string> = {
  estructura_campo: "bg-green-100 text-green-700",
  calibres:         "bg-blue-100 text-blue-700",
  datos_personal:   "bg-purple-100 text-purple-700",
  asistencia:       "bg-orange-100 text-orange-700",
  lab_analisis:     "bg-cyan-100 text-cyan-700",
};

export const tipoLabels: Record<TipoConfig, string> = {
  estructura_campo: "Estructura Campo",
  calibres:         "Calibres",
  datos_personal:   "Datos Personal",
  asistencia:       "Asistencia",
  lab_analisis:     "Lab. Análisis",
};
