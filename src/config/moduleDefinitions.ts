// ─── Shared Module-Definition Config (V3 System) ──────────────────────────────
// Arquitectura alineada al ERD:
//   Parametros           → biblioteca global de campos reutilizables
//   ModDef               → Definicion_registro (formulario asignado a un módulo)
//   ModParam             → Campos_configurados (campos de una definición)
//   ModDato              → Datos_registro (registros con JSONB)

export type TipoConfig =
  | "estructura_campo"
  | "calibres"
  | "datos_personal"
  | "asistencia"
  | "lab_analisis"
  | "produccion"
  | "cosecha_registro"
  | "fitosanitario"
  | "riego"
  | "trazabilidad"
  | "inventario"
  | "personalizado";
export type TipoDato   = "Texto" | "Número" | "Fecha" | "Sí/No" | "Lista";
export type EstadoDef  = "activo" | "borrador" | "archivado";

// ─── Parametro — Biblioteca Global ────────────────────────────────────────────
// Equivale a la tabla `Parametros` del ERD.
// Es un catálogo de campos reutilizables a través de múltiples definiciones.

export interface Parametro {
  id:                  string;
  nombre:              string;   // snake_case interno: "temperatura", "calibre_mm"
  codigo:              string;   // clave corta: "TEMP", "CAL_MM"
  tipo_dato:           TipoDato;
  unidad_medida:       string;   // "°C", "mm", "gr", ""
  descripcion:         string;
  obligatorio_default: boolean;
  activo:              boolean;
}

// ─── ModDef — Definicion_registro ─────────────────────────────────────────────

export interface ModDef {
  id:           string;
  tipo:         TipoConfig;
  nombre:       string;
  descripcion:  string;
  version:      string;
  nivel_minimo: number;
  modulo:       string;
  estado:       EstadoDef;
  cultivo_id?:  string;  // null = aplica a todos los cultivos (global)
  cliente_id?:  number;  // null = global (super admin)
  updated_at?:  string;  // ISO timestamp de última modificación
  updated_by?:  string;  // nombre del usuario que realizó el cambio
}

// ─── DefSnapshot — Historial de versiones ─────────────────────────────────────
// Cada snapshot captura el estado completo de una definición y sus campos
// en un momento dado, permitiendo diff visual entre versiones.

export interface DefSnapshot {
  id:            string;
  definicion_id: string;
  version:       string;
  timestamp:     string;   // ISO
  usuario:       string;
  cambio:        string;   // descripción breve del cambio
  definicion:    Omit<ModDef, 'updated_at' | 'updated_by'>;
  campos:        ModParam[];
}

// ─── Tipos auxiliares para configuración avanzada de campos ───────────────────

export interface CampoValidaciones {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  pattern_message?: string;
}

export interface CampoDependencia {
  campo_id: string;
  operador: "=" | "!=" | ">" | "<" | "contiene";
  valor: string;
  accion: "mostrar" | "ocultar" | "requerir";
}

export interface CampoOpcion {
  value: string;
  label: string;
}

// ─── ModParam — Campos_configurados ───────────────────────────────────────────
// Vincula una definición con parámetros de la biblioteca.
// `nombre` coincide con Parametro.nombre para búsquedas en los módulos.

export interface ModParam {
  id:                        string;
  definicion_id:             string;
  parametro_id:              string;
  nombre:                    string;
  tipo_dato:                 TipoDato;
  obligatorio:               boolean;
  orden:                     number;
  visible?:                  boolean;
  editable_campo?:           boolean;
  etiqueta_personalizada?:   string;
  valor_default?:            string;
  opciones?:                 CampoOpcion[] | null;
  validaciones_adicionales?: CampoValidaciones | null;
  dependencias?:             CampoDependencia | null;
  /** Fórmula que referencia otros campos. Ej: "produccion / area" */
  formula?:                  string | null;
}

// ─── ModDato — Datos_registro ─────────────────────────────────────────────────

export interface ModDato {
  id:           string;
  definicion_id: string;
  referencia:   string;
  fecha:        string;
  valores:      string; // JSONB: { [campo]: valor }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS INICIALES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Biblioteca Global de Parámetros ──────────────────────────────────────────

export const PARAMETROS_LIBRARY: Parametro[] = [
  // Estructura / Ubicación
  { id: "p-01", nombre: "nombre",            codigo: "NOM",      tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Nombre identificador del registro",         obligatorio_default: true,  activo: true },
  { id: "p-02", nombre: "nivel",             codigo: "NIV",      tipo_dato: "Número", unidad_medida: "",       descripcion: "Nivel jerárquico (1=bloque, 2=macrotúnel…)", obligatorio_default: true,  activo: true },
  { id: "p-03", nombre: "capacidad_plantas", codigo: "CAP_PL",   tipo_dato: "Número", unidad_medida: "pl",     descripcion: "Capacidad máxima en número de plantas",      obligatorio_default: false, activo: true },
  { id: "p-04", nombre: "bloque",            codigo: "BLOQ",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Bloque o sector del campo",                  obligatorio_default: false, activo: true },
  { id: "p-05", nombre: "nave",              codigo: "NAVE",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Nave o invernadero asignado",                obligatorio_default: false, activo: true },
  { id: "p-06", nombre: "macrotunel",        codigo: "MACT",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Macrotúnel de producción",                   obligatorio_default: false, activo: true },
  // Calibres
  { id: "p-07", nombre: "mm_minimo",         codigo: "MM_MIN",   tipo_dato: "Número", unidad_medida: "mm",     descripcion: "Milímetros mínimos de calibre",              obligatorio_default: true,  activo: true },
  { id: "p-08", nombre: "mm_maximo",         codigo: "MM_MAX",   tipo_dato: "Número", unidad_medida: "mm",     descripcion: "Milímetros máximos de calibre",              obligatorio_default: true,  activo: true },
  { id: "p-09", nombre: "peso_g_minimo",     codigo: "PES_MIN",  tipo_dato: "Número", unidad_medida: "gr",     descripcion: "Peso mínimo en gramos",                      obligatorio_default: false, activo: true },
  // Personal
  { id: "p-10", nombre: "rut",               codigo: "RUT",      tipo_dato: "Texto",  unidad_medida: "",       descripcion: "RUT o DNI del trabajador",                   obligatorio_default: true,  activo: true },
  { id: "p-11", nombre: "nombre_completo",   codigo: "NOM_COMP", tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Nombre completo del trabajador",             obligatorio_default: true,  activo: true },
  { id: "p-12", nombre: "cargo",             codigo: "CARGO",    tipo_dato: "Lista",  unidad_medida: "",       descripcion: "Cargo o puesto de trabajo",                  obligatorio_default: true,  activo: true },
  { id: "p-13", nombre: "telefono",          codigo: "TEL",      tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Número de teléfono de contacto",             obligatorio_default: false, activo: true },
  { id: "p-14", nombre: "fecha_ingreso",     codigo: "FEC_ING",  tipo_dato: "Fecha",  unidad_medida: "",       descripcion: "Fecha de ingreso a la empresa",              obligatorio_default: true,  activo: true },
  { id: "p-15", nombre: "tipo_contrato",     codigo: "CONT",     tipo_dato: "Lista",  unidad_medida: "",       descripcion: "Tipo de contrato laboral",                   obligatorio_default: true,  activo: true },
  // Asistencia
  { id: "p-16", nombre: "empleado_id",       codigo: "EMP_ID",   tipo_dato: "Texto",  unidad_medida: "",       descripcion: "ID interno del empleado",                    obligatorio_default: true,  activo: true },
  { id: "p-17", nombre: "tipo_marca",        codigo: "TIPO_MRC", tipo_dato: "Lista",  unidad_medida: "",       descripcion: "Entrada, salida, pausa…",                    obligatorio_default: true,  activo: true },
  { id: "p-18", nombre: "hora",              codigo: "HORA",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Hora del registro (HH:MM)",                  obligatorio_default: true,  activo: true },
  { id: "p-19", nombre: "ubicacion_gps",     codigo: "GPS",      tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Coordenadas o nombre del punto GPS",         obligatorio_default: false, activo: true },
  // Laboratorio
  { id: "p-20", nombre: "muestra",           codigo: "MUESTRA",  tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Código o ID de la muestra",                  obligatorio_default: true,  activo: true },
  { id: "p-21", nombre: "tipo_prueba",       codigo: "PRUEBA",   tipo_dato: "Lista",  unidad_medida: "",       descripcion: "Tipo de análisis: Brix, pH, EC…",            obligatorio_default: true,  activo: true },
  { id: "p-22", nombre: "cultivo",           codigo: "CULTIV",   tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Cultivo o lote analizado",                   obligatorio_default: true,  activo: true },
  { id: "p-23", nombre: "resultado",         codigo: "RESUL",    tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Valor del resultado obtenido",               obligatorio_default: true,  activo: true },
  { id: "p-24", nombre: "unidad",            codigo: "UNID",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Unidad del resultado: °Brix, pH, dS/m…",     obligatorio_default: false, activo: true },
  { id: "p-25", nombre: "estado",            codigo: "ESTADO",   tipo_dato: "Lista",  unidad_medida: "",       descripcion: "Estado del análisis: Completado, Pendiente", obligatorio_default: true,  activo: true },
  // Generales reutilizables
  { id: "p-26", nombre: "temperatura",       codigo: "TEMP",     tipo_dato: "Número", unidad_medida: "°C",     descripcion: "Temperatura ambiente o del proceso",         obligatorio_default: false, activo: true },
  { id: "p-27", nombre: "humedad",           codigo: "HUM",      tipo_dato: "Número", unidad_medida: "%",      descripcion: "Humedad relativa del ambiente",              obligatorio_default: false, activo: true },
  { id: "p-28", nombre: "ph",                codigo: "PH",       tipo_dato: "Número", unidad_medida: "",       descripcion: "Nivel de pH de suelo o solución",            obligatorio_default: false, activo: true },
  { id: "p-29", nombre: "conductividad_ec",  codigo: "EC",       tipo_dato: "Número", unidad_medida: "mS/cm",  descripcion: "Conductividad eléctrica",                    obligatorio_default: false, activo: true },
  { id: "p-30", nombre: "observaciones",     codigo: "OBS",      tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Observaciones o notas adicionales",          obligatorio_default: false, activo: true },
  { id: "p-31", nombre: "operario",          codigo: "OPER",     tipo_dato: "Texto",  unidad_medida: "",       descripcion: "Nombre del operario responsable",            obligatorio_default: false, activo: true },
];

// ─── Definiciones ─────────────────────────────────────────────────────────────

export const DEFINICIONES: ModDef[] = [
  {
    id: "1", tipo: "estructura_campo",
    nombre: "Estructura de Campo v2.0",
    descripcion: "Jerarquía Bloque → Macrotúnel → Nave",
    version: "2.0", nivel_minimo: 2, modulo: "cultivo", estado: "activo",
    cliente_id: 1,
    updated_at: "2025-01-10T09:30:00Z", updated_by: "Admin",
  },
  {
    id: "2", tipo: "calibres",
    nombre: "Calibres Arándano Azul",
    descripcion: "Rangos de calibre en mm para selección de fruta",
    version: "1.0", nivel_minimo: 2, modulo: "cosecha", estado: "activo", cultivo_id: "c-02",
    cliente_id: 1,
    updated_at: "2025-01-10T10:15:00Z", updated_by: "Admin",
  },
  {
    id: "3", tipo: "datos_personal",
    nombre: "Ficha de Personal v3.0",
    descripcion: "Datos dinámicos de trabajadores de campo",
    version: "3.0", nivel_minimo: 3, modulo: "recursos-humanos", estado: "activo",
    cliente_id: 1,
    updated_at: "2025-02-01T14:00:00Z", updated_by: "María López",
  },
  {
    id: "4", tipo: "asistencia",
    nombre: "Control de Asistencia",
    descripcion: "Registro de timbrado y jornada laboral (QR/bio)",
    version: "1.5", nivel_minimo: 3, modulo: "recursos-humanos", estado: "activo",
    cliente_id: 1,
    updated_at: "2025-03-06T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "5", tipo: "lab_analisis",
    nombre: "Análisis de Laboratorio",
    descripcion: "Parámetros de análisis físico-químico y biológico",
    version: "1.0", nivel_minimo: 1, modulo: "laboratorio", estado: "activo",
    cliente_id: 1,
    updated_at: "2025-01-28T11:30:00Z", updated_by: "Carlos Ruiz",
  },
  {
    id: "6", tipo: "calibres",
    nombre: "Calibres Fresa",
    descripcion: "Rangos de calibre en mm y gramos para selección de fresas",
    version: "1.0", nivel_minimo: 2, modulo: "cosecha", estado: "activo", cultivo_id: "c-01",
    cliente_id: 1,
    updated_at: "2025-01-10T10:30:00Z", updated_by: "Admin",
  },
  // Definiciones de Frutas del Valle (cliente 2)
  {
    id: "7", tipo: "estructura_campo",
    nombre: "Estructura Fundo Valle",
    descripcion: "Organización de parcelas y sectores",
    version: "1.0", nivel_minimo: 2, modulo: "cultivo", estado: "activo",
    cliente_id: 2,
    updated_at: "2025-02-15T08:00:00Z", updated_by: "Laura Torres",
  },
  {
    id: "8", tipo: "cosecha_registro",
    nombre: "Registro de Cosecha Valle",
    descripcion: "Control de cosecha diario por parcela",
    version: "1.0", nivel_minimo: 2, modulo: "cosecha", estado: "borrador",
    cliente_id: 2,
    updated_at: "2025-02-20T09:00:00Z", updated_by: "Laura Torres",
  },
];

// ─── Parámetros (Campos_configurados) ─────────────────────────────────────────

export const PARAMETROS: ModParam[] = [
  // def 1: estructura_campo
  { id: "1",  definicion_id: "1", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "2",  definicion_id: "1", parametro_id: "p-02", nombre: "nivel",             tipo_dato: "Número", obligatorio: true,  orden: 2 },
  { id: "3",  definicion_id: "1", parametro_id: "p-03", nombre: "capacidad_plantas", tipo_dato: "Número", obligatorio: false, orden: 3 },
  // def 2: calibres
  { id: "4",  definicion_id: "2", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "5",  definicion_id: "2", parametro_id: "p-07", nombre: "mm_minimo",         tipo_dato: "Número", obligatorio: true,  orden: 2, validaciones_adicionales: { min: 0, max: 50 } },
  { id: "6",  definicion_id: "2", parametro_id: "p-08", nombre: "mm_maximo",         tipo_dato: "Número", obligatorio: true,  orden: 3, validaciones_adicionales: { min: 0, max: 50 } },
  { id: "7",  definicion_id: "2", parametro_id: "p-09", nombre: "peso_g_minimo",     tipo_dato: "Número", obligatorio: false, orden: 4 },
  // def 3: datos_personal
  { id: "8",  definicion_id: "3", parametro_id: "p-10", nombre: "rut",               tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "9",  definicion_id: "3", parametro_id: "p-11", nombre: "nombre_completo",   tipo_dato: "Texto",  obligatorio: true,  orden: 2 },
  { id: "10", definicion_id: "3", parametro_id: "p-12", nombre: "cargo",             tipo_dato: "Lista",  obligatorio: true,  orden: 3, opciones: [{ value: "cosechador", label: "Cosechador" }, { value: "supervisor", label: "Supervisor" }, { value: "tecnico", label: "Técnico" }, { value: "administrativo", label: "Administrativo" }] },
  { id: "11", definicion_id: "3", parametro_id: "p-13", nombre: "telefono",          tipo_dato: "Texto",  obligatorio: false, orden: 4, validaciones_adicionales: { pattern: "^\\+?[0-9]{8,15}$", pattern_message: "Formato: +56912345678" } },
  { id: "12", definicion_id: "3", parametro_id: "p-14", nombre: "fecha_ingreso",     tipo_dato: "Fecha",  obligatorio: true,  orden: 5 },
  { id: "13", definicion_id: "3", parametro_id: "p-15", nombre: "tipo_contrato",     tipo_dato: "Lista",  obligatorio: true,  orden: 6, opciones: [{ value: "indefinido", label: "Indefinido" }, { value: "plazo_fijo", label: "Plazo fijo" }, { value: "temporal", label: "Temporal" }] },
  // def 4: asistencia
  { id: "14", definicion_id: "4", parametro_id: "p-16", nombre: "empleado_id",       tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "15", definicion_id: "4", parametro_id: "p-17", nombre: "tipo_marca",        tipo_dato: "Lista",  obligatorio: true,  orden: 2, opciones: [{ value: "entrada", label: "Entrada" }, { value: "salida", label: "Salida" }, { value: "colacion", label: "Colación" }] },
  { id: "16", definicion_id: "4", parametro_id: "p-18", nombre: "hora",              tipo_dato: "Texto",  obligatorio: true,  orden: 3 },
  { id: "17", definicion_id: "4", parametro_id: "p-19", nombre: "ubicacion_gps",     tipo_dato: "Texto",  obligatorio: false, orden: 4 },
  // def 5: lab_analisis
  { id: "18", definicion_id: "5", parametro_id: "p-20", nombre: "muestra",           tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "19", definicion_id: "5", parametro_id: "p-21", nombre: "tipo_prueba",       tipo_dato: "Lista",  obligatorio: true,  orden: 2 },
  { id: "20", definicion_id: "5", parametro_id: "p-22", nombre: "cultivo",           tipo_dato: "Texto",  obligatorio: true,  orden: 3 },
  { id: "21", definicion_id: "5", parametro_id: "p-23", nombre: "resultado",         tipo_dato: "Texto",  obligatorio: true,  orden: 4 },
  { id: "22", definicion_id: "5", parametro_id: "p-24", nombre: "unidad",            tipo_dato: "Texto",  obligatorio: false, orden: 5 },
  { id: "23", definicion_id: "5", parametro_id: "p-25", nombre: "estado",            tipo_dato: "Lista",  obligatorio: true,  orden: 6 },
  // def 6: calibres fresa
  { id: "24", definicion_id: "6", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "25", definicion_id: "6", parametro_id: "p-07", nombre: "mm_minimo",         tipo_dato: "Número", obligatorio: true,  orden: 2 },
  { id: "26", definicion_id: "6", parametro_id: "p-08", nombre: "mm_maximo",         tipo_dato: "Número", obligatorio: true,  orden: 3 },
  { id: "27", definicion_id: "6", parametro_id: "p-09", nombre: "peso_g_minimo",     tipo_dato: "Número", obligatorio: false, orden: 4 },
  // campo calculado demo
  { id: "28", definicion_id: "2", parametro_id: "p-calc-1", nombre: "rango_mm",     tipo_dato: "Número", obligatorio: false, orden: 5, formula: "mm_maximo - mm_minimo", editable_campo: false },
  // def 7: estructura fundo valle (cliente 2)
  { id: "29", definicion_id: "7", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "30", definicion_id: "7", parametro_id: "p-04", nombre: "bloque",            tipo_dato: "Texto",  obligatorio: false, orden: 2 },
  // def 8: registro cosecha valle (cliente 2)
  { id: "31", definicion_id: "8", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
  { id: "32", definicion_id: "8", parametro_id: "p-30", nombre: "observaciones",     tipo_dato: "Texto",  obligatorio: false, orden: 2 },
];

// ─── Datos demo ───────────────────────────────────────────────────────────────

export const DATOS_DEMO: ModDato[] = [
  { id: "d1",  definicion_id: "1", referencia: "Bloque A-1",            fecha: "2025-01-10", valores: '{"nombre":"Bloque A-1","nivel":1,"capacidad_plantas":4500}' },
  { id: "d2",  definicion_id: "1", referencia: "Macrotúnel A-1-1",      fecha: "2025-01-10", valores: '{"nombre":"Macrotúnel A-1-1","nivel":2,"capacidad_plantas":900}' },
  { id: "d3",  definicion_id: "2", referencia: "Jumbo",                  fecha: "2025-01-10", valores: '{"nombre":"Jumbo","mm_minimo":18,"mm_maximo":20,"peso_g_minimo":5}' },
  { id: "d4",  definicion_id: "2", referencia: "Extra",                  fecha: "2025-01-10", valores: '{"nombre":"Extra","mm_minimo":16,"mm_maximo":18,"peso_g_minimo":4}' },
  { id: "d5",  definicion_id: "3", referencia: "Pedro Soto",             fecha: "2025-02-01", valores: '{"rut":"12.345.678-9","nombre_completo":"Pedro Soto","cargo":"Cosechador","telefono":"+56912345678","fecha_ingreso":"2024-03-01","tipo_contrato":"plazo_fijo"}' },
  { id: "d6",  definicion_id: "3", referencia: "Carmen Díaz",            fecha: "2025-02-01", valores: '{"rut":"11.222.333-4","nombre_completo":"Carmen Díaz","cargo":"Cosechadora","telefono":"+56987654321","fecha_ingreso":"2023-07-15","tipo_contrato":"Indefinido"}' },
  { id: "d7",  definicion_id: "4", referencia: "Pedro Soto / entrada",   fecha: "2025-03-06", valores: '{"empleado_id":"12345678","tipo_marca":"entrada","hora":"07:42","ubicacion_gps":"Bloque A-1"}' },
  { id: "d8",  definicion_id: "4", referencia: "Carmen Díaz / entrada",  fecha: "2025-03-06", valores: '{"empleado_id":"11222333","tipo_marca":"entrada","hora":"07:45","ubicacion_gps":"Bloque A-2"}' },
  { id: "d9",  definicion_id: "5", referencia: "LAB-0112",               fecha: "2025-01-28", valores: '{"muestra":"LAB-0112","tipo_prueba":"Brix","cultivo":"Fresa Maravilla","resultado":"12.5","unidad":"°Brix","estado":"Completado"}' },
  { id: "d10", definicion_id: "5", referencia: "LAB-0113",               fecha: "2025-01-28", valores: '{"muestra":"LAB-0113","tipo_prueba":"pH Suelo","cultivo":"Bloque A","resultado":"6.2","unidad":"pH","estado":"Completado"}' },
  { id: "d11", definicion_id: "5", referencia: "LAB-0114",               fecha: "2025-01-29", valores: '{"muestra":"LAB-0114","tipo_prueba":"Conductividad","cultivo":"Bloque B","resultado":"1.8","unidad":"dS/m","estado":"Completado"}' },
  { id: "d12", definicion_id: "5", referencia: "LAB-0115",               fecha: "2025-01-30", valores: '{"muestra":"LAB-0115","tipo_prueba":"Firmeza","cultivo":"Fresa San Andreas","resultado":"3.2","unidad":"N","estado":"En proceso"}' },
  // def 6: calibres fresa
  { id: "d13", definicion_id: "6", referencia: "Premium",               fecha: "2025-01-10", valores: '{"nombre":"Premium","mm_minimo":28,"mm_maximo":32,"peso_g_minimo":18}' },
  { id: "d14", definicion_id: "6", referencia: "Selecta",               fecha: "2025-01-10", valores: '{"nombre":"Selecta","mm_minimo":24,"mm_maximo":28,"peso_g_minimo":14}' },
  { id: "d15", definicion_id: "6", referencia: "Estándar",              fecha: "2025-01-10", valores: '{"nombre":"Estándar","mm_minimo":20,"mm_maximo":24,"peso_g_minimo":10}' },
  // def 7: estructura fundo valle (cliente 2)
  { id: "d16", definicion_id: "7", referencia: "Parcela Norte",           fecha: "2025-02-15", valores: '{"nombre":"Parcela Norte","bloque":"Sector A"}' },
  { id: "d17", definicion_id: "7", referencia: "Parcela Sur",             fecha: "2025-02-15", valores: '{"nombre":"Parcela Sur","bloque":"Sector B"}' },
];

// ─── Cultivo ──────────────────────────────────────────────────────────────────
// Equivale a la tabla `Cultivos` del ERD.

export interface Cultivo {
  id:          string;
  nombre:      string;    // ej: "Fresas"
  codigo:      string;    // ej: "FRE"
  descripcion: string;
  activo:      boolean;
}

// ─── Variedad — CAT_VARIEDADES ────────────────────────────────────────────────
// Variedades por cultivo.

export interface Variedad {
  id:          string;
  cultivo_id:  string;
  nombre:      string;    // ej: "Festival"
  codigo:      string;    // ej: "FES"
  descripcion: string;
  activo:      boolean;
}

// ─── Datos iniciales — Cultivos y Variedades ──────────────────────────────────

export const CULTIVOS: Cultivo[] = [
  { id: "c-01", nombre: "Fresas",     codigo: "FRE", descripcion: "Fragaria × ananassa",   activo: true  },
  { id: "c-02", nombre: "Arándanos",  codigo: "ARA", descripcion: "Vaccinium spp.",         activo: true  },
  { id: "c-03", nombre: "Frambuesas", codigo: "FRA", descripcion: "Rubus idaeus",           activo: false },
];

export const VARIEDADES: Variedad[] = [
  // Fresas
  { id: "v-01", cultivo_id: "c-01", nombre: "Festival",     codigo: "FES", descripcion: "Alta producción, fruto firme",     activo: true  },
  { id: "v-02", cultivo_id: "c-01", nombre: "San Andreas",  codigo: "SAN", descripcion: "Día neutro, cosecha continua",     activo: true  },
  { id: "v-03", cultivo_id: "c-01", nombre: "Camarosa",     codigo: "CAM", descripcion: "Fruto grande, buen sabor",         activo: false },
  // Arándanos
  { id: "v-04", cultivo_id: "c-02", nombre: "Biloxi",       codigo: "BIL", descripcion: "Baja estratificación, precoz",     activo: true  },
  { id: "v-05", cultivo_id: "c-02", nombre: "O'Neal",       codigo: "ONE", descripcion: "Alta productividad, buen calibre", activo: true  },
  { id: "v-06", cultivo_id: "c-02", nombre: "Emerald",      codigo: "EME", descripcion: "Fruto grande y firme",             activo: true  },
  // Frambuesas
  { id: "v-07", cultivo_id: "c-03", nombre: "Autumn Bliss", codigo: "AUT", descripcion: "Remontante de otoño",              activo: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getDefsByModulo    = (m: string): ModDef[]   => DEFINICIONES.filter(d => d.modulo === m);
export const getParamsByDef     = (id: string): ModParam[] => PARAMETROS.filter(p => p.definicion_id === id).sort((a, b) => a.orden - b.orden);
export const getDatosByDef      = (id: string): ModDato[]  => DATOS_DEMO.filter(d => d.definicion_id === id);

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
  estructura_campo: "bg-emerald-100 text-emerald-700",
  calibres:         "bg-blue-100 text-blue-700",
  datos_personal:   "bg-violet-100 text-violet-700",
  asistencia:       "bg-orange-100 text-orange-700",
  lab_analisis:     "bg-cyan-100 text-cyan-700",
  produccion:       "bg-lime-100 text-lime-700",
  cosecha_registro: "bg-yellow-100 text-yellow-700",
  fitosanitario:    "bg-red-100 text-red-700",
  riego:            "bg-sky-100 text-sky-700",
  trazabilidad:     "bg-indigo-100 text-indigo-700",
  inventario:       "bg-amber-100 text-amber-700",
  personalizado:    "bg-gray-100 text-gray-700",
};

export const tipoLabels: Record<TipoConfig, string> = {
  estructura_campo: "Estructura Campo",
  calibres:         "Calibres",
  datos_personal:   "Datos Personal",
  asistencia:       "Asistencia",
  lab_analisis:     "Lab. Análisis",
  produccion:       "Producción",
  cosecha_registro: "Cosecha",
  fitosanitario:    "Fitosanitario",
  riego:            "Riego",
  trazabilidad:     "Trazabilidad",
  inventario:       "Inventario",
  personalizado:    "Personalizado",
};

export const estadoBadge: Record<EstadoDef, string> = {
  activo:    "bg-green-100 text-green-700",
  borrador:  "bg-yellow-100 text-yellow-700",
  archivado: "bg-gray-100 text-gray-500",
};

// ─── Snapshots demo — Historial de versiones ──────────────────────────────────

export const SNAPSHOTS_DEMO: DefSnapshot[] = [
  {
    id: "snap-1", definicion_id: "1", version: "1.0",
    timestamp: "2024-11-15T10:00:00Z", usuario: "Admin",
    cambio: "Versión inicial con nombre y nivel",
    definicion: { id: "1", tipo: "estructura_campo", nombre: "Estructura de Campo v1.0", descripcion: "Jerarquía Bloque → Nave", version: "1.0", nivel_minimo: 1, modulo: "cultivo", estado: "activo" },
    campos: [
      { id: "s1-1", definicion_id: "1", parametro_id: "p-01", nombre: "nombre", tipo_dato: "Texto", obligatorio: true, orden: 1 },
      { id: "s1-2", definicion_id: "1", parametro_id: "p-02", nombre: "nivel",  tipo_dato: "Número", obligatorio: true, orden: 2 },
    ],
  },
  {
    id: "snap-2", definicion_id: "1", version: "2.0",
    timestamp: "2025-01-10T09:30:00Z", usuario: "Admin",
    cambio: "Agregado campo capacidad_plantas, nivel mínimo a 2",
    definicion: { id: "1", tipo: "estructura_campo", nombre: "Estructura de Campo v2.0", descripcion: "Jerarquía Bloque → Macrotúnel → Nave", version: "2.0", nivel_minimo: 2, modulo: "cultivo", estado: "activo" },
    campos: [
      { id: "1", definicion_id: "1", parametro_id: "p-01", nombre: "nombre",            tipo_dato: "Texto",  obligatorio: true,  orden: 1 },
      { id: "2", definicion_id: "1", parametro_id: "p-02", nombre: "nivel",             tipo_dato: "Número", obligatorio: true,  orden: 2 },
      { id: "3", definicion_id: "1", parametro_id: "p-03", nombre: "capacidad_plantas", tipo_dato: "Número", obligatorio: false, orden: 3 },
    ],
  },
  {
    id: "snap-3", definicion_id: "3", version: "1.0",
    timestamp: "2024-08-01T08:00:00Z", usuario: "Admin",
    cambio: "Versión inicial: RUT, nombre y cargo",
    definicion: { id: "3", tipo: "datos_personal", nombre: "Ficha de Personal v1.0", descripcion: "Datos básicos de trabajadores", version: "1.0", nivel_minimo: 2, modulo: "recursos-humanos", estado: "activo" },
    campos: [
      { id: "s3-1", definicion_id: "3", parametro_id: "p-10", nombre: "rut",             tipo_dato: "Texto", obligatorio: true, orden: 1 },
      { id: "s3-2", definicion_id: "3", parametro_id: "p-11", nombre: "nombre_completo", tipo_dato: "Texto", obligatorio: true, orden: 2 },
      { id: "s3-3", definicion_id: "3", parametro_id: "p-12", nombre: "cargo",           tipo_dato: "Lista", obligatorio: true, orden: 3 },
    ],
  },
  {
    id: "snap-4", definicion_id: "3", version: "2.0",
    timestamp: "2024-12-10T15:00:00Z", usuario: "María López",
    cambio: "Agregado teléfono y fecha de ingreso",
    definicion: { id: "3", tipo: "datos_personal", nombre: "Ficha de Personal v2.0", descripcion: "Datos de trabajadores con contacto e ingreso", version: "2.0", nivel_minimo: 3, modulo: "recursos-humanos", estado: "activo" },
    campos: [
      { id: "s4-1", definicion_id: "3", parametro_id: "p-10", nombre: "rut",             tipo_dato: "Texto", obligatorio: true,  orden: 1 },
      { id: "s4-2", definicion_id: "3", parametro_id: "p-11", nombre: "nombre_completo", tipo_dato: "Texto", obligatorio: true,  orden: 2 },
      { id: "s4-3", definicion_id: "3", parametro_id: "p-12", nombre: "cargo",           tipo_dato: "Lista", obligatorio: true,  orden: 3 },
      { id: "s4-4", definicion_id: "3", parametro_id: "p-13", nombre: "telefono",        tipo_dato: "Texto", obligatorio: false, orden: 4 },
      { id: "s4-5", definicion_id: "3", parametro_id: "p-14", nombre: "fecha_ingreso",   tipo_dato: "Fecha", obligatorio: true,  orden: 5 },
    ],
  },
  {
    id: "snap-5", definicion_id: "3", version: "3.0",
    timestamp: "2025-02-01T14:00:00Z", usuario: "María López",
    cambio: "Agregado tipo de contrato",
    definicion: { id: "3", tipo: "datos_personal", nombre: "Ficha de Personal v3.0", descripcion: "Datos dinámicos de trabajadores de campo", version: "3.0", nivel_minimo: 3, modulo: "recursos-humanos", estado: "activo" },
    campos: [
      { id: "8",  definicion_id: "3", parametro_id: "p-10", nombre: "rut",             tipo_dato: "Texto", obligatorio: true,  orden: 1 },
      { id: "9",  definicion_id: "3", parametro_id: "p-11", nombre: "nombre_completo", tipo_dato: "Texto", obligatorio: true,  orden: 2 },
      { id: "10", definicion_id: "3", parametro_id: "p-12", nombre: "cargo",           tipo_dato: "Lista", obligatorio: true,  orden: 3 },
      { id: "11", definicion_id: "3", parametro_id: "p-13", nombre: "telefono",        tipo_dato: "Texto", obligatorio: false, orden: 4 },
      { id: "12", definicion_id: "3", parametro_id: "p-14", nombre: "fecha_ingreso",   tipo_dato: "Fecha", obligatorio: true,  orden: 5 },
      { id: "13", definicion_id: "3", parametro_id: "p-15", nombre: "tipo_contrato",   tipo_dato: "Lista", obligatorio: true,  orden: 6 },
    ],
  },
];
