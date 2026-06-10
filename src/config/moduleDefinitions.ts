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
export type TipoDato   = "Texto" | "Número" | "Fecha" | "Sí/No" | "Lista" | "Foto" | "Archivo" | "Relación" | "TablaInsumos" | "SelectorBloque";
/** Fila de una TablaInsumos — se serializa como JSON en ModDato.valores */
export interface TablaInsumosRow { catalogo_id: string; cantidad: number; }
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
  // ── Tipo "Relación": lookup a registros de otra definición ──────────────────
  /** ID de la ModDef fuente de donde se traen los registros */
  relacion_def_id?:       string | null;
  /** Nombre del campo que se muestra como label en el dropdown */
  relacion_campo_label?:  string | null;
  /** Nombre del campo que se guarda como valor */
  relacion_campo_valor?:  string | null;
  /** Campos de la fuente que se usarán para filtrar por coincidencia de nombre en la definición destino */
  relacion_filtros_comunes?: string[] | null;
  /** Campo de la fuente para agrupar visualmente opciones en el dropdown */
  relacion_agrupar_por?: string | null;
  /** Estrategia de origen para construir opciones desde la fuente vinculada */
  relacion_origen_operacion?: "valores_unicos" | "valor_especifico" | "suma" | "promedio" | "maximo" | "minimo" | null;
  /** Valor puntual cuando relacion_origen_operacion = valor_especifico */
  relacion_origen_valor_especifico?: string | null;
}

// ─── ModDef — Definicion_registro ─────────────────────────────────────────────

export interface ModDef {
  id:                  string;
  tipo:                TipoConfig;
  nombre:              string;
  descripcion:         string;
  version:             string;
  nivel_minimo:        number;       // nivel jerárquico mínimo para acceder (1=Lector … 6=SuperAdmin)
  roles_excluidos?:    string[];     // roles (UserRoleT keys) explícitamente sin acceso; undefined = ninguno
  modulo:              string;
  estado:              EstadoDef;
  cultivo_id?:         string;       // undefined = global (todos los cultivos)
  origen_id?:          string;       // undefined = raíz; asignado = apunta al id raíz de la familia
  cliente_id?:         number;       // undefined = global (super admin)
  productor_id?:       number;       // undefined = nivel cliente; asignado = formulario exclusivo del productor
  // ── Tipo formulario (registro = principal / evento = hijo) ──
  tipo_formulario?:    "registro" | "evento"; // undefined = "registro" (compatibilidad)
  registro_padre_id?:  string;       // solo si tipo_formulario = "evento"; apunta al id del registro padre
  updated_at?:         string;       // ISO timestamp de última modificación
  updated_by?:         string;       // nombre del usuario que realizó el cambio
}

// ─── DefinicionAccesoUsuario — Override por usuario en una definición ─────────
// Equivale a un USUARIO_DEFINICION_ACCESO en el ERD (extensión del patrón
// USUARIO_MODULO_ACCION_PERSONALIZADO, pero a nivel de definición específica).
// Prioridad: este override gana sobre nivel_minimo y roles_excluidos.

export interface DefinicionAccesoUsuario {
  id:               string;
  definicion_id:    string;   // ID de la ModDef a la que aplica
  usuario_id:       number;   // ID del usuario (hardcodedUsers.id)
  habilitado:       boolean;  // true = acceso concedido; false = acceso bloqueado
  justificacion:    string;
  created_at:       string;   // ISO timestamp
}

export const ACCESOS_DEFINICION_DEMO: DefinicionAccesoUsuario[] = [
  // Usuario 4 (Supervisor) puede acceder a "Ficha de Personal" aunque su rol esté excluido
  {
    id: "da-1", definicion_id: "3", usuario_id: 4,
    habilitado: true,
    justificacion: "Supervisor de RRHH necesita acceso para validar fichas de su área",
    created_at: "2025-03-01T08:00:00Z",
  },
  // Usuario 5 (Productor) bloqueado explícitamente de "Análisis de Laboratorio"
  {
    id: "da-2", definicion_id: "5", usuario_id: 5,
    habilitado: false,
    justificacion: "Productor externo — datos de laboratorio son confidenciales para este contrato",
    created_at: "2025-03-10T10:30:00Z",
  },
];

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
  unico?: boolean;
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
  /** Columna Número: muestra botón de filtro con rango ≥ / ≤ en la tabla */
  filtrable_rango?:          boolean;
  /** Columna Texto/Lista/Fecha: muestra botón de búsqueda en la tabla */
  filtrable_busqueda?:       boolean;
  /** Permite ordenar la columna ascendente / descendente al hacer clic en el header */
  ordenable?:                boolean;
  /** Fuente de datos del campo. "manual" = entrada del usuario (default), "ia" = IA genera, "ia_editable" = IA sugiere, "ml" = Machine Learning, "ml_editable" = ML sugiere */
  fuente_datos?:             "manual" | "ia" | "ia_editable" | "ml" | "ml_editable";
  /** Instrucción para la IA: qué dato debe extraer del input (foto, texto, etc.). Ej: "Identificar plagas visibles en la imagen" */
  ia_instruccion?:           string;
  // ── Machine Learning / Visión Computacional ─────────────────────────────────
  /** Modelo ML a usar: "color_detection", "fruit_counter", "quality_classifier", "defect_detector", "size_estimator", "ripeness_detector", "custom" */
  ml_modelo?:                string | null;
  /** Instrucción personalizada para el modelo ML (usado con modelo "custom" o para ajustar otros) */
  ml_instruccion?:           string | null;
  /** ID del campo de tipo Foto del que se tomará la imagen para analizar */
  ml_campo_imagen?:          string | null;
  // ── Tipo "Relación": lookup a registros de otra definición ──────────────────
  /** ID de la ModDef fuente de donde se traen los registros */
  relacion_def_id?:          string | null;
  /** Nombre del campo de los registros fuente que se muestra como label en el dropdown */
  relacion_campo_label?:     string | null;
  /** Nombre del campo de los registros fuente que se guarda como valor (default: mismo que label) */
  relacion_campo_valor?:     string | null;
  /** Campos comunes (mismo nombre) usados para filtrar registros de la fuente por coincidencia */
  relacion_filtros_comunes?: string[] | null;
  /** Campo de la fuente para agrupar visualmente opciones de relación */
  relacion_agrupar_por?:     string | null;
  /**
   * Estrategia para construir opciones desde la fuente de relación:
   * - valores_unicos: lista única de valores del campo seleccionado
   * - valor_especifico: solo deja disponible un valor puntual
   * - suma/promedio/maximo/minimo: agrega valores numéricos de la fuente
   */
  relacion_origen_operacion?: "valores_unicos" | "valor_especifico" | "suma" | "promedio" | "maximo" | "minimo" | null;
  /** Valor puntual permitido cuando relacion_origen_operacion = valor_especifico */
  relacion_origen_valor_especifico?: string | null;
  // ── Tipo "Número" calculado: operaciones sobre otros campos ─────────────────
  /** Si es true, este campo se calcula automáticamente desde otros campos */
  es_calculado?:             boolean;
  /** Tipo de cálculo: suma, promedio, etc. */
  calculo_tipo?:             "suma" | "promedio" | "maximo" | "minimo" | "formula_personalizada";
  /** Campos de otros formularios que participan en el cálculo */
  calculo_campos?:           {
    definicion_id: string;
    campo_nombre: string;
    /** Campos comunes (mismo nombre) usados para filtrar filas de la definición fuente */
    filtros_comunes?: string[];
    /** Campo opcional para agrupar filas de la fuente antes de agregar */
    agrupar_por?: string | null;
  }[];
  /** Fórmula personalizada (solo si calculo_tipo = "formula_personalizada") */
  calculo_formula?:          string;
  // ── Tipo "TablaInsumos" ──────────────────────────────────────────────────────
  /** Filtra los productos del inventario por área (modulo_id). Si está vacío, muestra todos. */
  tabla_insumos_area?:       string | null;
}

// ─── ModDato — Datos_registro ─────────────────────────────────────────────────

export interface ModDato {
  id:                     string;
  definicion_id:          string;
  cultivo_id?:            string; // qué cultivo generó este registro (obligatorio en formas globales)
  registro_padre_dato_id?: string; // para eventos: ID específico del dato del registro padre
  referencia:             string;
  fecha:                  string;
  valores:                string; // JSONB: { [campo]: valor }
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
  // Relaciones (lookup a otras definiciones)
  { id: "p-rel-01", nombre: "personal_siembra",    codigo: "PER_SIE",  tipo_dato: "Relación", unidad_medida: "", descripcion: "Personal que realizó la siembra (lookup a registro de Personal)", obligatorio_default: false, activo: true },
  { id: "p-rel-02", nombre: "personal_cosecha",     codigo: "PER_COS",  tipo_dato: "Relación", unidad_medida: "", descripcion: "Personal que realizó la cosecha (lookup a registro de Personal)", obligatorio_default: false, activo: true },
  { id: "p-rel-03", nombre: "personal_aplicacion",  codigo: "PER_APL",  tipo_dato: "Relación", unidad_medida: "", descripcion: "Personal que realizó la aplicación (lookup a registro de Personal)", obligatorio_default: false, activo: true },
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
    // Global — aplica a todos los cultivos del cliente
    id: "1", tipo: "estructura_campo",
    nombre: "Estructura de Campo v2.0",
    descripcion: "Jerarquía Bloque → Macrotúnel → Nave",
    version: "2.0", modulo: "cultivo", estado: "activo",
    // Acceso: desde Supervisor (2) en adelante; Lector no puede ver ni editar
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-01-10T09:30:00Z", updated_by: "Admin",
  },
  {
    // Específico Arándano — solo cosecha de ese cultivo
    id: "2", tipo: "calibres",
    nombre: "Calibres Arándano Azul",
    descripcion: "Rangos de calibre en mm para selección de fruta",
    version: "1.0", modulo: "cosecha", estado: "activo", cultivo_id: "c-02",
    // Acceso: Supervisor+; sin restricciones de rol adicionales
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2025-01-10T10:15:00Z", updated_by: "Admin",
  },
  {
    // Global RRHH — datos sensibles de personal
    id: "3", tipo: "datos_personal",
    nombre: "Ficha de Personal v3.0",
    descripcion: "Datos dinámicos de trabajadores de campo",
    version: "3.0", modulo: "recursos-humanos", estado: "activo",
    // Datos sensibles: mínimo Jefe de Área (3); Lector y Supervisor excluidos
    nivel_minimo: 3, roles_excluidos: ["lector", "supervisor"],
    cliente_id: 1,
    updated_at: "2025-02-01T14:00:00Z", updated_by: "María López",
  },
  {
    // Global RRHH — control de asistencia operativo (PRODUCTOR 1)
    id: "4", tipo: "asistencia",
    nombre: "Control de Asistencia Fundo Los Andes",
    descripcion: "Registro de timbrado y jornada laboral (QR/bio)",
    version: "1.5", modulo: "recursos-humanos", estado: "activo",
    // Operativo: Jefe de Área (3)+; solo Lector excluido
    nivel_minimo: 3, roles_excluidos: ["lector"],
    cliente_id: 1, productor_id: 1,
    updated_at: "2025-03-06T08:00:00Z", updated_by: "Admin",
  },
  {
    // Global — laboratorio abierto (PRODUCTOR 1)
    id: "5", tipo: "lab_analisis",
    nombre: "Análisis de Laboratorio Fundo Los Andes",
    descripcion: "Parámetros de análisis físico-químico y biológico",
    version: "1.0", modulo: "laboratorio", estado: "activo",
    // Acceso abierto: cualquier rol puede consultar resultados
    nivel_minimo: 1, roles_excluidos: [],
    cliente_id: 1, productor_id: 1,
    updated_at: "2025-01-28T11:30:00Z", updated_by: "Carlos Ruiz",
  },
  {
    // Específico Fresa — cosecha del cultivo fresa
    id: "6", tipo: "calibres",
    nombre: "Calibres Fresa",
    descripcion: "Rangos de calibre en mm y gramos para selección de fresas",
    version: "1.0", modulo: "cosecha", estado: "activo", cultivo_id: "c-01",
    // Acceso: Supervisor+; sin exclusiones adicionales
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2025-01-10T10:30:00Z", updated_by: "Admin",
  },
  // ── Frutas del Valle (cliente 2) ──────────────────────────────────────────
  {
    id: "7", tipo: "estructura_campo",
    nombre: "Estructura Fundo Valle",
    descripcion: "Organización de parcelas y sectores",
    version: "1.0", modulo: "cultivo", estado: "activo",
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 2,
    updated_at: "2025-02-15T08:00:00Z", updated_by: "Laura Torres",
  },
  {
    // En borrador — solo Productor+ puede verlo mientras se define
    id: "8", tipo: "cosecha_registro",
    nombre: "Registro de Cosecha Valle",
    descripcion: "Control de cosecha diario por parcela",
    version: "1.0", modulo: "cosecha", estado: "borrador",
    nivel_minimo: 4, roles_excluidos: ["lector", "supervisor", "jefe_area"],
    cliente_id: 2,
    updated_at: "2025-02-20T09:00:00Z", updated_by: "Laura Torres",
  },
  // ── Eventos (hijos de registros) ──────────────────────────────────────────
  {
    id: "evt-1", tipo: "personalizado",
    nombre: "Seguimiento Semanal",
    descripcion: "Evento de seguimiento periódico del estado del campo",
    version: "1.0", modulo: "cultivo", estado: "activo",
    nivel_minimo: 1, roles_excluidos: [],
    cliente_id: 1,
    tipo_formulario: "evento",
    registro_padre_id: "1",
    updated_at: "2025-03-01T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "evt-2", tipo: "personalizado",
    nombre: "Registro de Anomalía",
    descripcion: "Documenta anomalías o incidencias detectadas durante el seguimiento",
    version: "1.0", modulo: "cultivo", estado: "borrador",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    tipo_formulario: "evento",
    registro_padre_id: "1",
    updated_at: "2025-03-05T10:30:00Z", updated_by: "Admin",
  },
  {
    id: "evt-3", tipo: "personalizado",
    nombre: "Resultado Complementario",
    descripcion: "Análisis adicional que complementa el resultado principal del laboratorio",
    version: "1.0", modulo: "laboratorio", estado: "activo",
    nivel_minimo: 1, roles_excluidos: [],
    cliente_id: 1,
    tipo_formulario: "evento",
    registro_padre_id: "5",
    updated_at: "2025-03-10T09:00:00Z", updated_by: "Carlos Ruiz",
  },
  // ── Vivero ────────────────────────────────────────────────────────────────
  {
    id: "v-1", tipo: "fitosanitario",
    nombre: "Registro de Propagación",
    descripcion: "Control de enraizamiento, esquejes y plántulas en vivero",
    version: "1.0", modulo: "vivero", estado: "activo",
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-02-01T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "v-2", tipo: "fitosanitario",
    nombre: "Control Fitosanitario Vivero",
    descripcion: "Seguimiento de plagas y enfermedades en etapa de almácigo",
    version: "1.0", modulo: "vivero", estado: "activo",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2025-02-10T09:30:00Z", updated_by: "Admin",
  },
  {
    id: "v-3", tipo: "riego",
    nombre: "Plan de Riego Vivero",
    descripcion: "Parámetros de riego por etapa de desarrollo de la planta",
    version: "1.0", modulo: "vivero", estado: "borrador",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2025-03-01T10:00:00Z", updated_by: "Admin",
  },
  // ── Cultivo — Registro de Cosecha (fuente de trazabilidad) ──────────────
  {
    id: "cul-cos-1", tipo: "cosecha_registro",
    nombre: "Registro de Cosecha",
    descripcion: "Registro diario de cosecha por bloque y operario — fuente de trazabilidad aguas abajo",
    version: "1.0", modulo: "cultivo", estado: "activo",
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-01-15T07:00:00Z", updated_by: "Admin",
  },
  // ── Post-cosecha ──────────────────────────────────────────────────────────
  {
    id: "pc-1", tipo: "trazabilidad",
    nombre: "Trazabilidad de Pallet",
    descripcion: "Registro de trazabilidad desde cosecha hasta despacho",
    version: "2.0", modulo: "post-cosecha", estado: "activo",
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-01-20T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "pc-2", tipo: "calibres",
    nombre: "Control de Calidad Embalaje",
    descripcion: "Parámetros de calidad en línea de embalaje: calibre, color, brix",
    version: "1.5", modulo: "post-cosecha", estado: "activo",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2025-02-05T11:00:00Z", updated_by: "Admin",
  },
  {
    id: "pc-3", tipo: "inventario",
    nombre: "Inventario de Cámara Fría",
    descripcion: "Stock en cámaras frigoríficas por variedad y categoría",
    version: "1.0", modulo: "post-cosecha", estado: "activo",
    nivel_minimo: 3, roles_excluidos: ["lector", "supervisor"],
    cliente_id: 1,
    updated_at: "2025-02-15T09:00:00Z", updated_by: "Admin",
  },
  // ── Producción ────────────────────────────────────────────────────────────
  {
    id: "pr-1", tipo: "produccion",
    nombre: "Rendimiento Diario de Producción",
    descripcion: "Registro de rendimiento por línea, turno y operario",
    version: "1.0", modulo: "produccion", estado: "activo",
    nivel_minimo: 2, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-01-15T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "pr-2", tipo: "inventario",
    nombre: "Inventario de Insumos",
    descripcion: "Control de stock de cajas, bandejas, etiquetas y material de embalaje",
    version: "1.0", modulo: "produccion", estado: "activo",
    nivel_minimo: 3, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-02-01T10:00:00Z", updated_by: "Admin",
  },
  // ── Comercial ─────────────────────────────────────────────────────────────
  {
    id: "com-1", tipo: "personalizado",
    nombre: "Ficha de Cliente Comercial",
    descripcion: "Datos de clientes, contratos y condiciones comerciales",
    version: "1.0", modulo: "comercial", estado: "activo",
    nivel_minimo: 4, roles_excluidos: ["lector", "supervisor", "jefe_area"],
    cliente_id: 1,
    updated_at: "2025-01-10T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "com-2", tipo: "personalizado",
    nombre: "Orden de Despacho",
    descripcion: "Registro de despachos: destino, volumen, condición de venta",
    version: "1.0", modulo: "comercial", estado: "activo",
    nivel_minimo: 3, roles_excluidos: ["lector"],
    cliente_id: 1,
    updated_at: "2025-02-20T09:00:00Z", updated_by: "Admin",
  },
  {
    id: "com-3", tipo: "trazabilidad",
    nombre: "Seguimiento de Exportación",
    descripcion: "Trazabilidad de contenedores y documentación de exportación",
    version: "1.0", modulo: "comercial", estado: "borrador",
    nivel_minimo: 4, roles_excluidos: ["lector", "supervisor"],
    cliente_id: 1,
    updated_at: "2025-03-05T08:00:00Z", updated_by: "Admin",
  },
  // ── Formularios vinculados a inventario (TablaInsumos) ──────────────────────
  {
    id: "inv-fit-1", tipo: "fitosanitario",
    nombre: "APLICACION_FITOSANITARIA",
    descripcion: "Registro de aplicaciones fitosanitarias — puede mezclar varios productos",
    version: "1.0", modulo: "cultivo", estado: "activo",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2026-01-10T08:00:00Z", updated_by: "Admin",
  },
  {
    id: "inv-pack-1", tipo: "cosecha_registro",
    nombre: "PACKING_LIST",
    descripcion: "Registro de packing — insumos de empaque utilizados por lote",
    version: "1.0", modulo: "post-cosecha", estado: "activo",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2026-01-10T08:00:00Z", updated_by: "Admin",
  },
  {
    // Formulario SIN TablaInsumos: mueve siempre el mismo producto (catalogo_id fijo
    // en la regla FM-002). Sirve para demostrar el modo "producto fijo + campo/fórmula".
    id: "inv-bod-1", tipo: "trazabilidad",
    nombre: "MOVIMIENTO_BODEGA",
    descripcion: "Recepción de cajas de exportación en bodega — registro simple (un solo producto)",
    version: "1.0", modulo: "comercial", estado: "activo",
    nivel_minimo: 2, roles_excluidos: [],
    cliente_id: 1,
    updated_at: "2026-02-01T08:00:00Z", updated_by: "Admin",
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
  // evt-1: seguimiento semanal
  { id: "e1-1", definicion_id: "evt-1", parametro_id: "p-26", nombre: "temperatura",    tipo_dato: "Número", obligatorio: false, orden: 1 },
  { id: "e1-2", definicion_id: "evt-1", parametro_id: "p-27", nombre: "humedad",        tipo_dato: "Número", obligatorio: false, orden: 2 },
  { id: "e1-3", definicion_id: "evt-1", parametro_id: "p-30", nombre: "observaciones",  tipo_dato: "Texto",  obligatorio: false, orden: 3 },
  // evt-2: registro de anomalía
  { id: "e2-1", definicion_id: "evt-2", parametro_id: "p-25", nombre: "tipo_anomalia",  tipo_dato: "Lista",  obligatorio: true,  orden: 1 },
  { id: "e2-2", definicion_id: "evt-2", parametro_id: "p-30", nombre: "descripcion",    tipo_dato: "Texto",  obligatorio: true,  orden: 2 },
  // evt-3: resultado complementario
  { id: "e3-1", definicion_id: "evt-3", parametro_id: "p-21", nombre: "tipo_prueba",    tipo_dato: "Lista",  obligatorio: true,  orden: 1 },
  { id: "e3-2", definicion_id: "evt-3", parametro_id: "p-23", nombre: "resultado",      tipo_dato: "Texto",  obligatorio: true,  orden: 2 },
  { id: "e3-3", definicion_id: "evt-3", parametro_id: "p-30", nombre: "observaciones",  tipo_dato: "Texto",  obligatorio: false, orden: 3 },
  // ── inv-fit-1: Aplicación Fitosanitaria ─────────────────────────────────────
  { id: "invf-1", definicion_id: "inv-fit-1", parametro_id: "p-04", nombre: "bloque",              tipo_dato: "SelectorBloque", obligatorio: true,  orden: 1, etiqueta_personalizada: "Bloque / Sector" },
  { id: "invf-2", definicion_id: "inv-fit-1", parametro_id: "p-18", nombre: "fecha_aplicacion",    tipo_dato: "Fecha",         obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de aplicación" },
  { id: "invf-3", definicion_id: "inv-fit-1", parametro_id: "p-30", nombre: "responsable",         tipo_dato: "Texto",         obligatorio: true,  orden: 3, etiqueta_personalizada: "Responsable" },
  { id: "invf-4", definicion_id: "inv-fit-1", parametro_id: "p-03", nombre: "area_tratada_ha",     tipo_dato: "Número",        obligatorio: false, orden: 4, etiqueta_personalizada: "Área tratada (ha)" },
  { id: "invf-5", definicion_id: "inv-fit-1", parametro_id: "p-30", nombre: "productos_aplicados", tipo_dato: "TablaInsumos",  obligatorio: true,  orden: 5, etiqueta_personalizada: "Productos aplicados",       tabla_insumos_area: "cultivo" },
  { id: "invf-6", definicion_id: "inv-fit-1", parametro_id: "p-30", nombre: "observaciones",       tipo_dato: "Texto",         obligatorio: false, orden: 6, etiqueta_personalizada: "Observaciones" },
  // ── inv-pack-1: Packing List ─────────────────────────────────────────────────
  { id: "invp-1", definicion_id: "inv-pack-1", parametro_id: "p-01", nombre: "lote",               tipo_dato: "Texto",         obligatorio: true,  orden: 1, etiqueta_personalizada: "Número de lote" },
  { id: "invp-2", definicion_id: "inv-pack-1", parametro_id: "p-18", nombre: "fecha_packing",      tipo_dato: "Fecha",         obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de packing" },
  { id: "invp-3", definicion_id: "inv-pack-1", parametro_id: "p-03", nombre: "kilos_procesados",   tipo_dato: "Número",        obligatorio: true,  orden: 3, etiqueta_personalizada: "Kilos procesados" },
  { id: "invp-4", definicion_id: "inv-pack-1", parametro_id: "p-30", nombre: "insumos_usados",     tipo_dato: "TablaInsumos",  obligatorio: true,  orden: 4, etiqueta_personalizada: "Insumos de empaque usados", tabla_insumos_area: "post-cosecha" },
  // ── com-1: Ficha de Cliente Comercial ───────────────────────────────────────
  { id: "com1-1", definicion_id: "com-1", parametro_id: "p-01", nombre: "nombre_cliente",     tipo_dato: "Texto",  obligatorio: true,  orden: 1, etiqueta_personalizada: "Nombre del cliente" },
  { id: "com1-2", definicion_id: "com-1", parametro_id: "p-25", nombre: "tipo_cliente",       tipo_dato: "Lista",  obligatorio: true,  orden: 2, etiqueta_personalizada: "Tipo de cliente",   opciones: [{ value: "exportador", label: "Exportador" }, { value: "mayorista", label: "Mayorista" }, { value: "retail", label: "Retail" }, { value: "distribuidor", label: "Distribuidor" }] },
  { id: "com1-3", definicion_id: "com-1", parametro_id: "p-04", nombre: "pais_destino",       tipo_dato: "Texto",  obligatorio: false, orden: 3, etiqueta_personalizada: "País / Destino" },
  { id: "com1-4", definicion_id: "com-1", parametro_id: "p-11", nombre: "contacto",           tipo_dato: "Texto",  obligatorio: false, orden: 4, etiqueta_personalizada: "Nombre de contacto" },
  { id: "com1-5", definicion_id: "com-1", parametro_id: "p-04", nombre: "email",              tipo_dato: "Texto",  obligatorio: false, orden: 5, etiqueta_personalizada: "Email" },
  { id: "com1-6", definicion_id: "com-1", parametro_id: "p-13", nombre: "telefono",           tipo_dato: "Texto",  obligatorio: false, orden: 6, etiqueta_personalizada: "Teléfono" },
  { id: "com1-7", definicion_id: "com-1", parametro_id: "p-25", nombre: "condicion_venta",    tipo_dato: "Lista",  obligatorio: false, orden: 7, etiqueta_personalizada: "Condición de venta", opciones: [{ value: "FOB", label: "FOB" }, { value: "CIF", label: "CIF" }, { value: "EXW", label: "EXW" }, { value: "DDP", label: "DDP" }] },
  { id: "com1-8", definicion_id: "com-1", parametro_id: "p-30", nombre: "observaciones",      tipo_dato: "Texto",  obligatorio: false, orden: 8, etiqueta_personalizada: "Notas / Condiciones" },
  // ── com-2: Orden de Despacho ─────────────────────────────────────────────────
  { id: "com2-1", definicion_id: "com-2", parametro_id: "p-01", nombre: "numero_orden",       tipo_dato: "Texto",  obligatorio: true,  orden: 1, etiqueta_personalizada: "N° Orden",          validaciones_adicionales: { unique: true } },
  { id: "com2-2", definicion_id: "com-2", parametro_id: "p-25", nombre: "tipo_despacho",      tipo_dato: "Lista",  obligatorio: true,  orden: 2, etiqueta_personalizada: "Tipo de despacho",  opciones: [{ value: "exportacion", label: "Exportación" }, { value: "nacional", label: "Nacional" }, { value: "mercado_interno", label: "Mercado interno" }] },
  { id: "com2-3", definicion_id: "com-2", parametro_id: "p-01", nombre: "cliente",            tipo_dato: "Texto",  obligatorio: true,  orden: 3, etiqueta_personalizada: "Cliente" },
  { id: "com2-4", definicion_id: "com-2", parametro_id: "p-25", nombre: "presentacion",       tipo_dato: "Lista",  obligatorio: true,  orden: 4, etiqueta_personalizada: "Presentación",      opciones: [{ value: "caja_5kg", label: "Caja 5 kg" }, { value: "caja_2kg", label: "Caja 2 kg" }, { value: "clamshell_500g", label: "Clamshell 500 g" }, { value: "bandeja_1kg", label: "Bandeja 1 kg" }, { value: "granel", label: "A granel" }] },
  { id: "com2-5", definicion_id: "com-2", parametro_id: "p-03", nombre: "cantidad",           tipo_dato: "Número", obligatorio: true,  orden: 5, etiqueta_personalizada: "Cantidad (unidades)" },
  { id: "com2-6", definicion_id: "com-2", parametro_id: "p-03", nombre: "precio_unitario",    tipo_dato: "Número", obligatorio: false, orden: 6, etiqueta_personalizada: "Precio unitario (USD)" },
  { id: "com2-7", definicion_id: "com-2", parametro_id: "p-03", nombre: "total_usd",          tipo_dato: "Número", obligatorio: false, orden: 7, etiqueta_personalizada: "Total (USD)",        formula: "cantidad * precio_unitario", editable_campo: false },
  { id: "com2-8", definicion_id: "com-2", parametro_id: "p-04", nombre: "destino",            tipo_dato: "Texto",  obligatorio: false, orden: 8, etiqueta_personalizada: "Destino / Puerto" },
  { id: "com2-9", definicion_id: "com-2", parametro_id: "p-31", nombre: "responsable",        tipo_dato: "Texto",  obligatorio: false, orden: 9, etiqueta_personalizada: "Responsable" },
  { id: "com2-10",definicion_id: "com-2", parametro_id: "p-30", nombre: "observaciones",      tipo_dato: "Texto",  obligatorio: false, orden: 10, etiqueta_personalizada: "Observaciones" },
  // ── com-3: Seguimiento de Exportación ───────────────────────────────────────
  { id: "com3-1", definicion_id: "com-3", parametro_id: "p-01", nombre: "numero_contenedor",  tipo_dato: "Texto",  obligatorio: true,  orden: 1, etiqueta_personalizada: "N° Contenedor" },
  { id: "com3-2", definicion_id: "com-3", parametro_id: "p-04", nombre: "numero_orden_ref",   tipo_dato: "Texto",  obligatorio: false, orden: 2, etiqueta_personalizada: "N° Orden ref." },
  { id: "com3-3", definicion_id: "com-3", parametro_id: "p-14", nombre: "fecha_embarque",     tipo_dato: "Fecha",  obligatorio: false, orden: 3, etiqueta_personalizada: "Fecha de embarque" },
  { id: "com3-4", definicion_id: "com-3", parametro_id: "p-04", nombre: "puerto_destino",     tipo_dato: "Texto",  obligatorio: false, orden: 4, etiqueta_personalizada: "Puerto destino" },
  { id: "com3-5", definicion_id: "com-3", parametro_id: "p-25", nombre: "estado_embarque",    tipo_dato: "Lista",  obligatorio: true,  orden: 5, etiqueta_personalizada: "Estado",            opciones: [{ value: "preparacion", label: "En preparación" }, { value: "embarcado", label: "Embarcado" }, { value: "en_transito", label: "En tránsito" }, { value: "entregado", label: "Entregado" }, { value: "cerrado", label: "Cerrado" }] },
  { id: "com3-6", definicion_id: "com-3", parametro_id: "p-26", nombre: "temperatura_transporte", tipo_dato: "Número", obligatorio: false, orden: 6, etiqueta_personalizada: "Temp. transporte (°C)" },
  { id: "com3-7", definicion_id: "com-3", parametro_id: "p-30", nombre: "observaciones",      tipo_dato: "Texto",  obligatorio: false, orden: 7, etiqueta_personalizada: "Observaciones" },
  // ── cul-cos-1: Registro de Cosecha ──────────────────────────────────────────
  { id: "cos-1",  definicion_id: "cul-cos-1", parametro_id: "p-01", nombre: "numero_lote",     tipo_dato: "Texto",  obligatorio: true,  orden: 1, etiqueta_personalizada: "N° Lote", validaciones_adicionales: { unique: true } },
  { id: "cos-2",  definicion_id: "cul-cos-1", parametro_id: "p-18", nombre: "fecha_cosecha",   tipo_dato: "Fecha",  obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de cosecha" },
  { id: "cos-3",  definicion_id: "cul-cos-1", parametro_id: "p-04", nombre: "bloque_sector",   tipo_dato: "SelectorBloque", obligatorio: true, orden: 3, etiqueta_personalizada: "Bloque / Sector" },
  { id: "cos-4",  definicion_id: "cul-cos-1", parametro_id: "p-25", nombre: "variedad",        tipo_dato: "Lista",  obligatorio: true,  orden: 4, etiqueta_personalizada: "Variedad", opciones: [{ value: "festival", label: "Festival" }, { value: "san_andreas", label: "San Andreas" }, { value: "camarosa", label: "Camarosa" }, { value: "biloxi", label: "Biloxi" }, { value: "oneal", label: "O'Neal" }] },
  { id: "cos-5",  definicion_id: "cul-cos-1", parametro_id: "p-03", nombre: "kg_cosechados",   tipo_dato: "Número", obligatorio: true,  orden: 5, etiqueta_personalizada: "Kg cosechados" },
  { id: "cos-6",  definicion_id: "cul-cos-1", parametro_id: "p-31", nombre: "operario_jefe",   tipo_dato: "Texto",  obligatorio: true,  orden: 6, etiqueta_personalizada: "Jefe de cuadrilla" },
  { id: "cos-7",  definicion_id: "cul-cos-1", parametro_id: "p-03", nombre: "num_operarios",   tipo_dato: "Número", obligatorio: false, orden: 7, etiqueta_personalizada: "N° operarios" },
  { id: "cos-8",  definicion_id: "cul-cos-1", parametro_id: "p-30", nombre: "observaciones",   tipo_dato: "Texto",  obligatorio: false, orden: 8, etiqueta_personalizada: "Observaciones" },
  // ── pc-1: Trazabilidad de Pallet ─────────────────────────────────────────────
  { id: "pc1-1",  definicion_id: "pc-1", parametro_id: "p-01", nombre: "numero_pallet",   tipo_dato: "Texto",    obligatorio: true,  orden: 1, etiqueta_personalizada: "N° Pallet", validaciones_adicionales: { unique: true } },
  { id: "pc1-2",  definicion_id: "pc-1", parametro_id: "p-18", nombre: "fecha_proceso",   tipo_dato: "Fecha",    obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de proceso" },
  { id: "pc1-3",  definicion_id: "pc-1", parametro_id: "p-04", nombre: "lote_cosecha",    tipo_dato: "Relación", obligatorio: true,  orden: 3, etiqueta_personalizada: "Lote de cosecha (origen)",
    relacion_def_id: "cul-cos-1", relacion_campo_label: "numero_lote", relacion_campo_valor: "numero_lote",
    relacion_campos_extra: ["fecha_cosecha", "bloque_sector", "variedad", "kg_cosechados"] },
  { id: "pc1-4",  definicion_id: "pc-1", parametro_id: "p-25", nombre: "linea_proceso",   tipo_dato: "Lista",    obligatorio: true,  orden: 4, etiqueta_personalizada: "Línea de proceso", opciones: [{ value: "linea_1", label: "Línea 1" }, { value: "linea_2", label: "Línea 2" }, { value: "linea_3", label: "Línea 3" }] },
  { id: "pc1-5",  definicion_id: "pc-1", parametro_id: "p-03", nombre: "peso_neto_kg",    tipo_dato: "Número",   obligatorio: true,  orden: 5, etiqueta_personalizada: "Peso neto (kg)" },
  { id: "pc1-6",  definicion_id: "pc-1", parametro_id: "p-26", nombre: "temperatura_ingreso", tipo_dato: "Número", obligatorio: false, orden: 6, etiqueta_personalizada: "Temp. ingreso cámara (°C)" },
  { id: "pc1-7",  definicion_id: "pc-1", parametro_id: "p-31", nombre: "responsable",     tipo_dato: "Texto",    obligatorio: false, orden: 7, etiqueta_personalizada: "Responsable" },
  { id: "pc1-8",  definicion_id: "pc-1", parametro_id: "p-30", nombre: "observaciones",   tipo_dato: "Texto",    obligatorio: false, orden: 8, etiqueta_personalizada: "Observaciones" },
  // ── pc-2: Control de Calidad Embalaje ────────────────────────────────────────
  { id: "pc2-1",  definicion_id: "pc-2", parametro_id: "p-01", nombre: "codigo_control",  tipo_dato: "Texto",    obligatorio: true,  orden: 1, etiqueta_personalizada: "Código de control" },
  { id: "pc2-2",  definicion_id: "pc-2", parametro_id: "p-18", nombre: "fecha_control",   tipo_dato: "Fecha",    obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de control" },
  { id: "pc2-3",  definicion_id: "pc-2", parametro_id: "p-04", nombre: "pallet_ref",      tipo_dato: "Relación", obligatorio: true,  orden: 3, etiqueta_personalizada: "Pallet inspeccionado",
    relacion_def_id: "pc-1", relacion_campo_label: "numero_pallet", relacion_campo_valor: "numero_pallet",
    relacion_campos_extra: ["lote_cosecha", "peso_neto_kg", "linea_proceso"] },
  { id: "pc2-4",  definicion_id: "pc-2", parametro_id: "p-26", nombre: "calibre_prom_mm", tipo_dato: "Número",   obligatorio: true,  orden: 4, etiqueta_personalizada: "Calibre prom. (mm)" },
  { id: "pc2-5",  definicion_id: "pc-2", parametro_id: "p-26", nombre: "brix",            tipo_dato: "Número",   obligatorio: true,  orden: 5, etiqueta_personalizada: "Brix (°Bx)" },
  { id: "pc2-6",  definicion_id: "pc-2", parametro_id: "p-26", nombre: "firmeza_n",       tipo_dato: "Número",   obligatorio: false, orden: 6, etiqueta_personalizada: "Firmeza (N)" },
  { id: "pc2-7",  definicion_id: "pc-2", parametro_id: "p-26", nombre: "pct_descarte",    tipo_dato: "Número",   obligatorio: true,  orden: 7, etiqueta_personalizada: "% Descarte" },
  { id: "pc2-8",  definicion_id: "pc-2", parametro_id: "p-25", nombre: "estado_calidad",  tipo_dato: "Lista",    obligatorio: true,  orden: 8, etiqueta_personalizada: "Resultado", opciones: [{ value: "aprobado", label: "Aprobado" }, { value: "condicional", label: "Aprobado condicional" }, { value: "rechazado", label: "Rechazado" }] },
  { id: "pc2-9",  definicion_id: "pc-2", parametro_id: "p-30", nombre: "observaciones",   tipo_dato: "Texto",    obligatorio: false, orden: 9, etiqueta_personalizada: "Observaciones" },
  // ── pc-3: Inventario Cámara Fría ─────────────────────────────────────────────
  { id: "pc3-1",  definicion_id: "pc-3", parametro_id: "p-01", nombre: "id_registro",     tipo_dato: "Texto",    obligatorio: true,  orden: 1, etiqueta_personalizada: "ID registro" },
  { id: "pc3-2",  definicion_id: "pc-3", parametro_id: "p-04", nombre: "pallet_ref",      tipo_dato: "Relación", obligatorio: true,  orden: 2, etiqueta_personalizada: "Pallet en cámara",
    relacion_def_id: "pc-1", relacion_campo_label: "numero_pallet", relacion_campo_valor: "numero_pallet",
    relacion_campos_extra: ["lote_cosecha", "peso_neto_kg", "temperatura_ingreso"] },
  { id: "pc3-3",  definicion_id: "pc-3", parametro_id: "p-04", nombre: "camara",          tipo_dato: "Lista",    obligatorio: true,  orden: 3, etiqueta_personalizada: "Cámara frigorífica", opciones: [{ value: "cam_1", label: "Cámara 1 (−1°C)" }, { value: "cam_2", label: "Cámara 2 (2°C)" }, { value: "cam_3", label: "Cámara 3 (4°C)" }] },
  { id: "pc3-4",  definicion_id: "pc-3", parametro_id: "p-18", nombre: "fecha_ingreso",   tipo_dato: "Fecha",    obligatorio: true,  orden: 4, etiqueta_personalizada: "Fecha de ingreso" },
  { id: "pc3-5",  definicion_id: "pc-3", parametro_id: "p-26", nombre: "temp_real",       tipo_dato: "Número",   obligatorio: false, orden: 5, etiqueta_personalizada: "Temp. real (°C)" },
  { id: "pc3-6",  definicion_id: "pc-3", parametro_id: "p-25", nombre: "estado",          tipo_dato: "Lista",    obligatorio: true,  orden: 6, etiqueta_personalizada: "Estado", opciones: [{ value: "en_camara", label: "En cámara" }, { value: "despachado", label: "Despachado" }, { value: "merma", label: "Merma" }] },
  // ── com-2: Orden de Despacho — se agrega referencia a pallet ─────────────────
  { id: "com2-0", definicion_id: "com-2", parametro_id: "p-04", nombre: "pallet_origen",  tipo_dato: "Relación", obligatorio: false, orden: 0, etiqueta_personalizada: "Pallet de origen (trazabilidad)",
    relacion_def_id: "pc-1", relacion_campo_label: "numero_pallet", relacion_campo_valor: "numero_pallet",
    relacion_campos_extra: ["lote_cosecha", "peso_neto_kg"] },
  // ── inv-bod-1: Movimiento de Bodega (sin TablaInsumos — producto fijo en la regla) ──
  { id: "invb-1", definicion_id: "inv-bod-1", parametro_id: "p-04", nombre: "bodega",             tipo_dato: "Texto",  obligatorio: true,  orden: 1, etiqueta_personalizada: "Bodega" },
  { id: "invb-2", definicion_id: "inv-bod-1", parametro_id: "p-18", nombre: "fecha_movimiento",   tipo_dato: "Fecha",  obligatorio: true,  orden: 2, etiqueta_personalizada: "Fecha de recepción" },
  { id: "invb-3", definicion_id: "inv-bod-1", parametro_id: "p-30", nombre: "responsable",        tipo_dato: "Texto",  obligatorio: true,  orden: 3, etiqueta_personalizada: "Responsable" },
  { id: "invb-4", definicion_id: "inv-bod-1", parametro_id: "p-03", nombre: "bultos_recibidos",   tipo_dato: "Número", obligatorio: true,  orden: 4, etiqueta_personalizada: "Bultos recibidos" },
  { id: "invb-5", definicion_id: "inv-bod-1", parametro_id: "p-03", nombre: "unidades_por_bulto", tipo_dato: "Número", obligatorio: true,  orden: 5, etiqueta_personalizada: "Unidades por bulto", valor_default: "25" },
  { id: "invb-6", definicion_id: "inv-bod-1", parametro_id: "p-30", nombre: "observaciones",      tipo_dato: "Texto",  obligatorio: false, orden: 6, etiqueta_personalizada: "Observaciones" },
];

// ─── Datos demo ───────────────────────────────────────────────────────────────

export const DATOS_DEMO: ModDato[] = [
  // def 1 — Estructura de Campo (global) — registros etiquetados por cultivo
  { id: "d1",  definicion_id: "1", cultivo_id: "c-01", referencia: "Bloque A-1",          fecha: "2025-01-10", valores: '{"nombre":"Bloque A-1","nivel":1,"capacidad_plantas":4500}' },
  { id: "d2",  definicion_id: "1", cultivo_id: "c-02", referencia: "Macrotúnel Arándano",  fecha: "2025-01-10", valores: '{"nombre":"Macrotúnel Arándano","nivel":2,"capacidad_plantas":900}' },
  // def 2 — Calibres Arándano (específico c-02) — cultivo_id implícito en la def
  { id: "d3",  definicion_id: "2", referencia: "Jumbo",  fecha: "2025-01-10", valores: '{"nombre":"Jumbo","mm_minimo":18,"mm_maximo":20,"peso_g_minimo":5}' },
  { id: "d4",  definicion_id: "2", referencia: "Extra",  fecha: "2025-01-10", valores: '{"nombre":"Extra","mm_minimo":16,"mm_maximo":18,"peso_g_minimo":4}' },
  // def 3 — Datos Personal (global) — etiquetados por cultivo donde trabajan
  // def 3 — Ficha de Personal — plantel completo
  { id: "d5",   definicion_id: "3", referencia: "Pedro Soto",        fecha: "2024-03-01", valores: '{"rut":"12.345.678-9","nombre_completo":"Pedro Soto",        "cargo":"cosechador",    "telefono":"+56912345678","fecha_ingreso":"2024-03-01","tipo_contrato":"plazo_fijo"}' },
  { id: "d6",   definicion_id: "3", referencia: "Carmen Díaz",       fecha: "2023-07-15", valores: '{"rut":"11.222.333-4","nombre_completo":"Carmen Díaz",       "cargo":"cosechador",    "telefono":"+56987654321","fecha_ingreso":"2023-07-15","tipo_contrato":"indefinido"}' },
  { id: "rh-e3",definicion_id: "3", referencia: "Luis Vargas",       fecha: "2023-01-10", valores: '{"rut":"14.567.890-2","nombre_completo":"Luis Vargas",       "cargo":"supervisor",    "telefono":"+56945678901","fecha_ingreso":"2023-01-10","tipo_contrato":"indefinido"}' },
  { id: "rh-e4",definicion_id: "3", referencia: "Ana Torres",        fecha: "2024-08-05", valores: '{"rut":"15.678.901-3","nombre_completo":"Ana Torres",        "cargo":"tecnico",       "telefono":"+56956789012","fecha_ingreso":"2024-08-05","tipo_contrato":"plazo_fijo"}' },
  { id: "rh-e5",definicion_id: "3", referencia: "Roberto Fuentes",   fecha: "2025-01-20", valores: '{"rut":"13.456.789-1","nombre_completo":"Roberto Fuentes",   "cargo":"cosechador",    "telefono":"+56934567891","fecha_ingreso":"2025-01-20","tipo_contrato":"temporal"}' },
  { id: "rh-e6",definicion_id: "3", referencia: "María González",    fecha: "2024-11-03", valores: '{"rut":"16.789.012-4","nombre_completo":"María González",    "cargo":"cosechador",    "telefono":"+56967890124","fecha_ingreso":"2024-11-03","tipo_contrato":"temporal"}' },
  { id: "rh-e7",definicion_id: "3", referencia: "Jorge Espinoza",    fecha: "2022-05-18", valores: '{"rut":"17.890.123-5","nombre_completo":"Jorge Espinoza",    "cargo":"supervisor",    "telefono":"+56978901235","fecha_ingreso":"2022-05-18","tipo_contrato":"indefinido"}' },
  { id: "rh-e8",definicion_id: "3", referencia: "Sandra Morales",    fecha: "2023-09-12", valores: '{"rut":"18.901.234-6","nombre_completo":"Sandra Morales",    "cargo":"administrativo","telefono":"+56989012346","fecha_ingreso":"2023-09-12","tipo_contrato":"indefinido"}' },
  { id: "rh-e9",definicion_id: "3", referencia: "Felipe Castro",     fecha: "2025-03-01", valores: '{"rut":"19.012.345-7","nombre_completo":"Felipe Castro",     "cargo":"tecnico",       "telefono":"+56990123457","fecha_ingreso":"2025-03-01","tipo_contrato":"plazo_fijo"}' },
  { id: "rh-e10",definicion_id:"3", referencia: "Patricia Rojas",    fecha: "2024-06-20", valores: '{"rut":"20.123.456-8","nombre_completo":"Patricia Rojas",    "cargo":"cosechador",    "telefono":"+56901234568","fecha_ingreso":"2024-06-20","tipo_contrato":"temporal"}' },
  { id: "rh-e11",definicion_id:"3", referencia: "Miguel Soto",       fecha: "2023-03-14", valores: '{"rut":"21.234.567-9","nombre_completo":"Miguel Soto",       "cargo":"cosechador",    "telefono":"+56912345679","fecha_ingreso":"2023-03-14","tipo_contrato":"indefinido"}' },
  { id: "rh-e12",definicion_id:"3", referencia: "Valentina Herrera", fecha: "2024-10-01", valores: '{"rut":"22.345.678-0","nombre_completo":"Valentina Herrera", "cargo":"tecnico",       "telefono":"+56923456780","fecha_ingreso":"2024-10-01","tipo_contrato":"plazo_fijo"}' },

  // def 4 — Asistencia — semana 2026-06-02 al 2026-06-06 (lun–vie), 3 marcas por empleado/día
  // ── Lunes 02-jun ──────────────────────────────────────────────────────────────
  { id: "att-0602-01",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / entrada",    fecha:"2026-06-02",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"entrada", "hora":"07:38","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0602-02",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / colación",   fecha:"2026-06-02",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-03",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / salida",     fecha:"2026-06-02",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"salida",  "hora":"17:12","ubicacion_gps":"Portería"}' },
  { id: "att-0602-04",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / entrada",   fecha:"2026-06-02",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"entrada", "hora":"07:45","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0602-05",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / colación",  fecha:"2026-06-02",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-06",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / salida",    fecha:"2026-06-02",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"salida",  "hora":"17:20","ubicacion_gps":"Portería"}' },
  { id: "att-0602-07",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / entrada",   fecha:"2026-06-02",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"entrada", "hora":"07:55","ubicacion_gps":"Oficina"}' },
  { id: "att-0602-08",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / colación",  fecha:"2026-06-02",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-09",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / salida",    fecha:"2026-06-02",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"salida",  "hora":"18:30","ubicacion_gps":"Portería"}' },
  { id: "att-0602-10",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / entrada",    fecha:"2026-06-02",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"entrada", "hora":"08:02","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0602-11",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / colación",   fecha:"2026-06-02",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"colacion","hora":"12:15","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-12",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / salida",     fecha:"2026-06-02",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"salida",  "hora":"17:05","ubicacion_gps":"Portería"}' },
  { id: "att-0602-13",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"entrada", "hora":"07:30","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0602-14",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / colación",fecha:"2026-06-02",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"colacion","hora":"11:55","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-15",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / salida",fecha:"2026-06-02",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0602-16",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"entrada", "hora":"07:42","ubicacion_gps":"Bloque 3"}' },
  { id: "att-0602-17",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / colación",fecha:"2026-06-02",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"colacion","hora":"12:10","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-18",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / salida", fecha:"2026-06-02",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"salida",  "hora":"17:15","ubicacion_gps":"Portería"}' },
  { id: "att-0602-19",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"entrada", "hora":"07:50","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0602-20",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / colación",fecha:"2026-06-02",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"colacion","hora":"12:30","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-21",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / salida", fecha:"2026-06-02",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"salida",  "hora":"18:00","ubicacion_gps":"Portería"}' },
  { id: "att-0602-22",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0602-23",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / colación",fecha:"2026-06-02",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-24",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / salida", fecha:"2026-06-02",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0602-25",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / entrada", fecha:"2026-06-02",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"entrada", "hora":"07:58","ubicacion_gps":"Vivero"}' },
  { id: "att-0602-26",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / colación",fecha:"2026-06-02",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"colacion","hora":"12:20","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-27",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / salida",  fecha:"2026-06-02",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"salida",  "hora":"17:30","ubicacion_gps":"Portería"}' },
  { id: "att-0602-28",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"entrada", "hora":"07:35","ubicacion_gps":"Bloque 4"}' },
  { id: "att-0602-29",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / colación",fecha:"2026-06-02",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-30",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / salida", fecha:"2026-06-02",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"salida",  "hora":"16:55","ubicacion_gps":"Portería"}' },
  { id: "att-0602-31",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / entrada",   fecha:"2026-06-02",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"entrada", "hora":"07:40","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0602-32",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / colación",  fecha:"2026-06-02",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-33",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / salida",    fecha:"2026-06-02",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"salida",  "hora":"17:10","ubicacion_gps":"Portería"}' },
  { id: "att-0602-34",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / entrada",fecha:"2026-06-02",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"entrada", "hora":"08:05","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0602-35",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / colación",fecha:"2026-06-02",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"colacion","hora":"13:10","ubicacion_gps":"Comedor"}' },
  { id: "att-0602-36",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / salida",fecha:"2026-06-02",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"salida",  "hora":"17:45","ubicacion_gps":"Portería"}' },
  // ── Martes 03-jun ─────────────────────────────────────────────────────────────
  { id: "att-0603-01",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / entrada",     fecha:"2026-06-03",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"entrada", "hora":"07:41","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0603-02",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / colación",    fecha:"2026-06-03",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-03",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / salida",      fecha:"2026-06-03",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"salida",  "hora":"17:08","ubicacion_gps":"Portería"}' },
  { id: "att-0603-04",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / entrada",    fecha:"2026-06-03",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"entrada", "hora":"07:52","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0603-05",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / colación",   fecha:"2026-06-03",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"colacion","hora":"12:10","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-06",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / salida",     fecha:"2026-06-03",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"salida",  "hora":"17:22","ubicacion_gps":"Portería"}' },
  { id: "att-0603-07",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / entrada",    fecha:"2026-06-03",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0603-08",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / colación",   fecha:"2026-06-03",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-09",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / salida",     fecha:"2026-06-03",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"salida",  "hora":"18:15","ubicacion_gps":"Portería"}' },
  { id: "att-0603-10",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / entrada",fecha:"2026-06-03",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"entrada", "hora":"07:29","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0603-11",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / colación",fecha:"2026-06-03",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"colacion","hora":"11:58","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-12",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / salida", fecha:"2026-06-03",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"salida",  "hora":"17:02","ubicacion_gps":"Portería"}' },
  { id: "att-0603-13",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / entrada", fecha:"2026-06-03",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"entrada", "hora":"07:47","ubicacion_gps":"Bloque 3"}' },
  { id: "att-0603-14",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / colación",fecha:"2026-06-03",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-15",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / salida",  fecha:"2026-06-03",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"salida",  "hora":"17:18","ubicacion_gps":"Portería"}' },
  { id: "att-0603-16",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / entrada", fecha:"2026-06-03",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"entrada", "hora":"07:55","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0603-17",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / colación",fecha:"2026-06-03",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"colacion","hora":"12:35","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-18",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / salida",  fecha:"2026-06-03",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"salida",  "hora":"18:05","ubicacion_gps":"Portería"}' },
  { id: "att-0603-19",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / entrada", fecha:"2026-06-03",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0603-20",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / colación",fecha:"2026-06-03",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-21",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / salida",  fecha:"2026-06-03",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0603-22",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / entrada",  fecha:"2026-06-03",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"entrada", "hora":"08:01","ubicacion_gps":"Vivero"}' },
  { id: "att-0603-23",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / colación", fecha:"2026-06-03",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"colacion","hora":"12:25","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-24",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / salida",   fecha:"2026-06-03",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"salida",  "hora":"17:35","ubicacion_gps":"Portería"}' },
  { id: "att-0603-25",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / entrada", fecha:"2026-06-03",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"entrada", "hora":"07:33","ubicacion_gps":"Bloque 4"}' },
  { id: "att-0603-26",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / colación",fecha:"2026-06-03",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"colacion","hora":"12:02","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-27",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / salida",  fecha:"2026-06-03",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"salida",  "hora":"16:58","ubicacion_gps":"Portería"}' },
  { id: "att-0603-28",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / entrada",    fecha:"2026-06-03",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"entrada", "hora":"07:44","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0603-29",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / colación",   fecha:"2026-06-03",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"colacion","hora":"12:08","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-30",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / salida",     fecha:"2026-06-03",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"salida",  "hora":"17:12","ubicacion_gps":"Portería"}' },
  { id: "att-0603-31",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / entrada",fecha:"2026-06-03",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"entrada", "hora":"08:03","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0603-32",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / colación",fecha:"2026-06-03",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"colacion","hora":"13:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0603-33",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / salida",fecha:"2026-06-03",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"salida",  "hora":"17:50","ubicacion_gps":"Portería"}' },
  // ── Miércoles 04-jun ──────────────────────────────────────────────────────────
  { id: "att-0604-01",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / entrada",     fecha:"2026-06-04",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"entrada", "hora":"07:36","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0604-02",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / colación",    fecha:"2026-06-04",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-03",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / salida",      fecha:"2026-06-04",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"salida",  "hora":"17:05","ubicacion_gps":"Portería"}' },
  { id: "att-0604-04",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / entrada",    fecha:"2026-06-04",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"entrada", "hora":"07:48","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0604-05",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / colación",   fecha:"2026-06-04",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"colacion","hora":"12:12","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-06",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / salida",     fecha:"2026-06-04",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"salida",  "hora":"17:25","ubicacion_gps":"Portería"}' },
  { id: "att-0604-07",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / entrada",    fecha:"2026-06-04",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"entrada", "hora":"07:58","ubicacion_gps":"Oficina"}' },
  { id: "att-0604-08",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / colación",   fecha:"2026-06-04",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-09",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / salida",     fecha:"2026-06-04",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"salida",  "hora":"18:20","ubicacion_gps":"Portería"}' },
  { id: "att-0604-10",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / entrada",fecha:"2026-06-04",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"entrada", "hora":"07:31","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0604-11",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / colación",fecha:"2026-06-04",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-12",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / salida", fecha:"2026-06-04",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0604-13",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / entrada", fecha:"2026-06-04",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"entrada", "hora":"07:50","ubicacion_gps":"Bloque 3"}' },
  { id: "att-0604-14",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / colación",fecha:"2026-06-04",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"colacion","hora":"12:08","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-15",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / salida",  fecha:"2026-06-04",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"salida",  "hora":"17:10","ubicacion_gps":"Portería"}' },
  { id: "att-0604-16",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / entrada", fecha:"2026-06-04",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"entrada", "hora":"07:52","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0604-17",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / colación",fecha:"2026-06-04",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"colacion","hora":"12:30","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-18",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / salida",  fecha:"2026-06-04",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"salida",  "hora":"17:58","ubicacion_gps":"Portería"}' },
  { id: "att-0604-19",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / entrada", fecha:"2026-06-04",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0604-20",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / colación",fecha:"2026-06-04",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-21",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / salida",  fecha:"2026-06-04",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0604-22",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / entrada",  fecha:"2026-06-04",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"entrada", "hora":"07:59","ubicacion_gps":"Vivero"}' },
  { id: "att-0604-23",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / colación", fecha:"2026-06-04",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"colacion","hora":"12:22","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-24",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / salida",   fecha:"2026-06-04",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"salida",  "hora":"17:28","ubicacion_gps":"Portería"}' },
  { id: "att-0604-25",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / entrada", fecha:"2026-06-04",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"entrada", "hora":"07:37","ubicacion_gps":"Bloque 4"}' },
  { id: "att-0604-26",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / colación",fecha:"2026-06-04",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-27",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / salida",  fecha:"2026-06-04",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"salida",  "hora":"16:52","ubicacion_gps":"Portería"}' },
  { id: "att-0604-28",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / entrada",    fecha:"2026-06-04",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"entrada", "hora":"07:43","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0604-29",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / colación",   fecha:"2026-06-04",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-30",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / salida",     fecha:"2026-06-04",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"salida",  "hora":"17:15","ubicacion_gps":"Portería"}' },
  { id: "att-0604-31",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / entrada",     fecha:"2026-06-04",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"entrada", "hora":"08:04","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0604-32",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / colación",    fecha:"2026-06-04",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"colacion","hora":"12:20","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-33",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / salida",      fecha:"2026-06-04",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"salida",  "hora":"17:10","ubicacion_gps":"Portería"}' },
  { id: "att-0604-34",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / entrada",fecha:"2026-06-04",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"entrada", "hora":"08:06","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0604-35",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / colación",fecha:"2026-06-04",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"colacion","hora":"13:08","ubicacion_gps":"Comedor"}' },
  { id: "att-0604-36",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / salida",fecha:"2026-06-04",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"salida",  "hora":"17:48","ubicacion_gps":"Portería"}' },
  // ── Jueves 05-jun ─────────────────────────────────────────────────────────────
  { id: "att-0605-01",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / entrada",     fecha:"2026-06-05",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"entrada", "hora":"07:39","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0605-02",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / colación",    fecha:"2026-06-05",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"colacion","hora":"12:03","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-03",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / salida",      fecha:"2026-06-05",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0605-04",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / entrada",    fecha:"2026-06-05",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"entrada", "hora":"07:46","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0605-05",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / colación",   fecha:"2026-06-05",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"colacion","hora":"12:08","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-06",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / salida",     fecha:"2026-06-05",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"salida",  "hora":"17:18","ubicacion_gps":"Portería"}' },
  { id: "att-0605-07",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / entrada",    fecha:"2026-06-05",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"entrada", "hora":"08:02","ubicacion_gps":"Oficina"}' },
  { id: "att-0605-08",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / colación",   fecha:"2026-06-05",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-09",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / salida",     fecha:"2026-06-05",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"salida",  "hora":"18:10","ubicacion_gps":"Portería"}' },
  { id: "att-0605-10",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / entrada",fecha:"2026-06-05",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"entrada", "hora":"07:28","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0605-11",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / colación",fecha:"2026-06-05",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"colacion","hora":"11:55","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-12",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / salida", fecha:"2026-06-05",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"salida",  "hora":"17:05","ubicacion_gps":"Portería"}' },
  { id: "att-0605-13",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / entrada", fecha:"2026-06-05",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"entrada", "hora":"07:44","ubicacion_gps":"Bloque 3"}' },
  { id: "att-0605-14",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / colación",fecha:"2026-06-05",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-15",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / salida",  fecha:"2026-06-05",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"salida",  "hora":"17:12","ubicacion_gps":"Portería"}' },
  { id: "att-0605-16",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / entrada", fecha:"2026-06-05",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"entrada", "hora":"07:48","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0605-17",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / colación",fecha:"2026-06-05",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"colacion","hora":"12:28","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-18",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / salida",  fecha:"2026-06-05",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"salida",  "hora":"18:02","ubicacion_gps":"Portería"}' },
  { id: "att-0605-19",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / entrada", fecha:"2026-06-05",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0605-20",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / colación",fecha:"2026-06-05",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-21",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / salida",  fecha:"2026-06-05",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0605-22",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / entrada",  fecha:"2026-06-05",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"entrada", "hora":"07:57","ubicacion_gps":"Vivero"}' },
  { id: "att-0605-23",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / colación", fecha:"2026-06-05",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"colacion","hora":"12:18","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-24",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / salida",   fecha:"2026-06-05",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"salida",  "hora":"17:32","ubicacion_gps":"Portería"}' },
  { id: "att-0605-25",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / entrada", fecha:"2026-06-05",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"entrada", "hora":"07:34","ubicacion_gps":"Bloque 4"}' },
  { id: "att-0605-26",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / colación",fecha:"2026-06-05",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-27",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / salida",  fecha:"2026-06-05",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0605-28",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / entrada",    fecha:"2026-06-05",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"entrada", "hora":"07:41","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0605-29",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / colación",   fecha:"2026-06-05",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"colacion","hora":"12:06","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-30",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / salida",     fecha:"2026-06-05",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"salida",  "hora":"17:08","ubicacion_gps":"Portería"}' },
  { id: "att-0605-31",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / entrada",     fecha:"2026-06-05",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0605-32",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / colación",    fecha:"2026-06-05",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"colacion","hora":"12:18","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-33",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / salida",      fecha:"2026-06-05",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"salida",  "hora":"17:05","ubicacion_gps":"Portería"}' },
  { id: "att-0605-34",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / entrada",fecha:"2026-06-05",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"entrada", "hora":"08:07","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0605-35",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / colación",fecha:"2026-06-05",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"colacion","hora":"13:12","ubicacion_gps":"Comedor"}' },
  { id: "att-0605-36",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / salida",fecha:"2026-06-05",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"salida",  "hora":"17:55","ubicacion_gps":"Portería"}' },
  // ── Viernes 06-jun ────────────────────────────────────────────────────────────
  { id: "att-0606-01",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / entrada",     fecha:"2026-06-06",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"entrada", "hora":"07:40","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0606-02",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / colación",    fecha:"2026-06-06",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-03",definicion_id:"4",cultivo_id:"c-01",referencia:"Pedro Soto / salida",      fecha:"2026-06-06",valores:'{"empleado_id":"12.345.678-9","tipo_marca":"salida",  "hora":"17:02","ubicacion_gps":"Portería"}' },
  { id: "att-0606-04",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / entrada",    fecha:"2026-06-06",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"entrada", "hora":"07:50","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0606-05",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / colación",   fecha:"2026-06-06",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"colacion","hora":"12:10","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-06",definicion_id:"4",cultivo_id:"c-01",referencia:"Carmen Díaz / salida",     fecha:"2026-06-06",valores:'{"empleado_id":"11.222.333-4","tipo_marca":"salida",  "hora":"17:20","ubicacion_gps":"Portería"}' },
  { id: "att-0606-07",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / entrada",    fecha:"2026-06-06",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"entrada", "hora":"07:58","ubicacion_gps":"Oficina"}' },
  { id: "att-0606-08",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / colación",   fecha:"2026-06-06",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-09",definicion_id:"4",cultivo_id:"c-01",referencia:"Luis Vargas / salida",     fecha:"2026-06-06",valores:'{"empleado_id":"14.567.890-2","tipo_marca":"salida",  "hora":"18:05","ubicacion_gps":"Portería"}' },
  { id: "att-0606-10",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / entrada",fecha:"2026-06-06",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"entrada", "hora":"07:32","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0606-11",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / colación",fecha:"2026-06-06",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-12",definicion_id:"4",cultivo_id:"c-01",referencia:"Roberto Fuentes / salida", fecha:"2026-06-06",valores:'{"empleado_id":"13.456.789-1","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0606-13",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / entrada", fecha:"2026-06-06",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"entrada", "hora":"07:45","ubicacion_gps":"Bloque 3"}' },
  { id: "att-0606-14",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / colación",fecha:"2026-06-06",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"colacion","hora":"12:05","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-15",definicion_id:"4",cultivo_id:"c-01",referencia:"María González / salida",  fecha:"2026-06-06",valores:'{"empleado_id":"16.789.012-4","tipo_marca":"salida",  "hora":"17:15","ubicacion_gps":"Portería"}' },
  { id: "att-0606-16",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / entrada", fecha:"2026-06-06",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"entrada", "hora":"07:53","ubicacion_gps":"Bloque 2"}' },
  { id: "att-0606-17",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / colación",fecha:"2026-06-06",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"colacion","hora":"12:32","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-18",definicion_id:"4",cultivo_id:"c-01",referencia:"Jorge Espinoza / salida",  fecha:"2026-06-06",valores:'{"empleado_id":"17.890.123-5","tipo_marca":"salida",  "hora":"17:55","ubicacion_gps":"Portería"}' },
  { id: "att-0606-19",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / entrada", fecha:"2026-06-06",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Oficina"}' },
  { id: "att-0606-20",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / colación",fecha:"2026-06-06",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"colacion","hora":"13:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-21",definicion_id:"4",cultivo_id:"c-01",referencia:"Sandra Morales / salida",  fecha:"2026-06-06",valores:'{"empleado_id":"18.901.234-6","tipo_marca":"salida",  "hora":"17:00","ubicacion_gps":"Portería"}' },
  { id: "att-0606-22",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / entrada",  fecha:"2026-06-06",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"entrada", "hora":"08:00","ubicacion_gps":"Vivero"}' },
  { id: "att-0606-23",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / colación", fecha:"2026-06-06",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"colacion","hora":"12:20","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-24",definicion_id:"4",cultivo_id:"c-01",referencia:"Felipe Castro / salida",   fecha:"2026-06-06",valores:'{"empleado_id":"19.012.345-7","tipo_marca":"salida",  "hora":"17:25","ubicacion_gps":"Portería"}' },
  { id: "att-0606-25",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / entrada", fecha:"2026-06-06",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"entrada", "hora":"07:36","ubicacion_gps":"Bloque 4"}' },
  { id: "att-0606-26",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / colación",fecha:"2026-06-06",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"colacion","hora":"12:00","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-27",definicion_id:"4",cultivo_id:"c-01",referencia:"Patricia Rojas / salida",  fecha:"2026-06-06",valores:'{"empleado_id":"20.123.456-8","tipo_marca":"salida",  "hora":"16:50","ubicacion_gps":"Portería"}' },
  { id: "att-0606-28",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / entrada",    fecha:"2026-06-06",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"entrada", "hora":"07:42","ubicacion_gps":"Bloque 1"}' },
  { id: "att-0606-29",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / colación",   fecha:"2026-06-06",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"colacion","hora":"12:07","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-30",definicion_id:"4",cultivo_id:"c-01",referencia:"Miguel Soto / salida",     fecha:"2026-06-06",valores:'{"empleado_id":"21.234.567-9","tipo_marca":"salida",  "hora":"17:10","ubicacion_gps":"Portería"}' },
  { id: "att-0606-31",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / entrada",     fecha:"2026-06-06",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"entrada", "hora":"08:01","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0606-32",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / colación",    fecha:"2026-06-06",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"colacion","hora":"12:15","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-33",definicion_id:"4",cultivo_id:"c-01",referencia:"Ana Torres / salida",      fecha:"2026-06-06",valores:'{"empleado_id":"15.678.901-3","tipo_marca":"salida",  "hora":"17:08","ubicacion_gps":"Portería"}' },
  { id: "att-0606-34",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / entrada",fecha:"2026-06-06",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"entrada", "hora":"08:05","ubicacion_gps":"Laboratorio"}' },
  { id: "att-0606-35",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / colación",fecha:"2026-06-06",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"colacion","hora":"13:10","ubicacion_gps":"Comedor"}' },
  { id: "att-0606-36",definicion_id:"4",cultivo_id:"c-01",referencia:"Valentina Herrera / salida",fecha:"2026-06-06",valores:'{"empleado_id":"22.345.678-0","tipo_marca":"salida",  "hora":"17:45","ubicacion_gps":"Portería"}' },
  // def 5 — Laboratorio (global) — etiquetados por cultivo del análisis
  { id: "d9",  definicion_id: "5", cultivo_id: "c-01", referencia: "LAB-0112", fecha: "2025-01-28", valores: '{"muestra":"LAB-0112","tipo_prueba":"Brix","cultivo":"Fresas","resultado":"12.5","unidad":"°Brix","estado":"Completado"}' },
  { id: "d10", definicion_id: "5", cultivo_id: "c-01", referencia: "LAB-0113", fecha: "2025-01-28", valores: '{"muestra":"LAB-0113","tipo_prueba":"pH Suelo","cultivo":"Fresas","resultado":"6.2","unidad":"pH","estado":"Completado"}' },
  { id: "d11", definicion_id: "5", cultivo_id: "c-02", referencia: "LAB-0114", fecha: "2025-01-29", valores: '{"muestra":"LAB-0114","tipo_prueba":"Conductividad","cultivo":"Arándanos","resultado":"1.8","unidad":"dS/m","estado":"Completado"}' },
  { id: "d12", definicion_id: "5", cultivo_id: "c-02", referencia: "LAB-0115", fecha: "2025-01-30", valores: '{"muestra":"LAB-0115","tipo_prueba":"Firmeza","cultivo":"Arándanos","resultado":"3.2","unidad":"N","estado":"En proceso"}' },
  // def 6 — Calibres Fresa (específico c-01)
  { id: "d13", definicion_id: "6", referencia: "Premium",  fecha: "2025-01-10", valores: '{"nombre":"Premium","mm_minimo":28,"mm_maximo":32,"peso_g_minimo":18}' },
  { id: "d14", definicion_id: "6", referencia: "Selecta",  fecha: "2025-01-10", valores: '{"nombre":"Selecta","mm_minimo":24,"mm_maximo":28,"peso_g_minimo":14}' },
  { id: "d15", definicion_id: "6", referencia: "Estándar", fecha: "2025-01-10", valores: '{"nombre":"Estándar","mm_minimo":20,"mm_maximo":24,"peso_g_minimo":10}' },
  // def 7 — estructura fundo valle (cliente 2)
  { id: "d16", definicion_id: "7", referencia: "Parcela Norte", fecha: "2025-02-15", valores: '{"nombre":"Parcela Norte","bloque":"Sector A"}' },
  { id: "d17", definicion_id: "7", referencia: "Parcela Sur",   fecha: "2025-02-15", valores: '{"nombre":"Parcela Sur","bloque":"Sector B"}' },

  // ── inv-fit-1: Aplicación Fitosanitaria — datos demo por bloque ──────────────
  { id: "fit-d1", definicion_id: "inv-fit-1", cultivo_id: "c-01", referencia: "Fresa / Bloque 1 — Fungicida", fecha: "2025-03-10", valores: '{"bloque":"Bloque 1","fecha_aplicacion":"2025-03-10","responsable":"Pedro Soto","area_tratada_ha":0.8,"observaciones":"Aplicación preventiva"}' },
  { id: "fit-d2", definicion_id: "inv-fit-1", cultivo_id: "c-01", referencia: "Fresa / Bloque 2 — Insecticida", fecha: "2025-03-15", valores: '{"bloque":"Bloque 2","fecha_aplicacion":"2025-03-15","responsable":"Carmen Díaz","area_tratada_ha":1.2,"observaciones":"Foco de pulgón detectado en HL3"}' },
  { id: "fit-d3", definicion_id: "inv-fit-1", cultivo_id: "c-01", referencia: "Fresa / Bloque 1 — Herbicida", fecha: "2025-04-02", valores: '{"bloque":"Bloque 1","fecha_aplicacion":"2025-04-02","responsable":"Pedro Soto","area_tratada_ha":0.8,"observaciones":"Control de maleza post-lluvia"}' },
  { id: "fit-d4", definicion_id: "inv-fit-1", cultivo_id: "c-02", referencia: "Arándano / Bloque A — Fungicida", fecha: "2025-03-12", valores: '{"bloque":"Bloque A","fecha_aplicacion":"2025-03-12","responsable":"Ana Torres","area_tratada_ha":1.5,"observaciones":"Tratamiento botrytis preventivo"}' },
  { id: "fit-d5", definicion_id: "inv-fit-1", cultivo_id: "c-02", referencia: "Arándano / Bloque B — Insecticida", fecha: "2025-03-20", valores: '{"bloque":"Bloque B","fecha_aplicacion":"2025-03-20","responsable":"Ana Torres","area_tratada_ha":1.8,"observaciones":""}' },

  // ── Eventos demo — asociados a registros padre específicos ──

  // evt-1: seguimiento semanal del bloque "Bloque A-1" (d1)
  { id: "e1-d1-1", definicion_id: "evt-1", cultivo_id: "c-01", registro_padre_dato_id: "d1", referencia: "Seguimiento sem 1", fecha: "2025-01-17", valores: '{"temperatura":"22.5","humedad":"65","observaciones":"Crecimiento normal, sin plagas detectadas"}' },
  { id: "e1-d1-2", definicion_id: "evt-1", cultivo_id: "c-01", registro_padre_dato_id: "d1", referencia: "Seguimiento sem 2", fecha: "2025-01-24", valores: '{"temperatura":"24.1","humedad":"62","observaciones":"Leve aumento de temperatura, plantas se ven saludables"}' },

  // evt-1: seguimiento semanal del "Macrotúnel Arándano" (d2)
  { id: "e1-d2-1", definicion_id: "evt-1", cultivo_id: "c-02", registro_padre_dato_id: "d2", referencia: "Seguimiento sem 1", fecha: "2025-01-18", valores: '{"temperatura":"18.8","humedad":"70","observaciones":"Condiciones óptimas para desarrollo de frutos"}' },

  // evt-2: registro de anomalía en "Bloque A-1" (d1)
  { id: "e2-d1-1", definicion_id: "evt-2", cultivo_id: "c-01", registro_padre_dato_id: "d1", referencia: "Anomalía riego", fecha: "2025-01-20", valores: '{"tipo_anomalia":"Riego irregular","descripcion":"Goteros bloqueados en fila 3, se procedió a limpieza"}' },

  // evt-3: resultado complementario para laboratorio LAB-0112 (d9)
  { id: "e3-d9-1", definicion_id: "evt-3", cultivo_id: "c-01", registro_padre_dato_id: "d9", referencia: "Análisis adicional", fecha: "2025-01-29", valores: '{"tipo_prueba":"Acidez titulable","resultado":"0.8% ácido málico","observaciones":"Dentro del rango esperado para la variedad"}' },

  // ── com-1: Fichas de Clientes Comerciales ───────────────────────────────────
  { id: "com1-d1", definicion_id: "com-1", referencia: "AgroExport S.A.", fecha: "2025-01-10", valores: '{"nombre_cliente":"AgroExport S.A.","tipo_cliente":"exportador","pais_destino":"Estados Unidos","contacto":"Carlos Mendez","email":"cmendez@agroexport.com","telefono":"+1 305 555 0120","condicion_venta":"FOB","observaciones":"Cliente prioritario, pago 30 días. Requiere certificado GlobalGAP."}' },
  { id: "com1-d2", definicion_id: "com-1", referencia: "Supermercados Unidos", fecha: "2025-01-12", valores: '{"nombre_cliente":"Supermercados Unidos","tipo_cliente":"retail","pais_destino":"Chile","contacto":"Valentina Rojas","email":"vrojas@superunidos.cl","telefono":"+56 2 2345 6789","condicion_venta":"EXW","observaciones":"Entrega en planta, pick-up del cliente. Volúmenes semanales acordados."}' },
  { id: "com1-d3", definicion_id: "com-1", referencia: "Fresh Fruits Inc.", fecha: "2025-01-15", valores: '{"nombre_cliente":"Fresh Fruits Inc.","tipo_cliente":"distribuidor","pais_destino":"Canadá","contacto":"John Smith","email":"jsmith@freshfruits.ca","telefono":"+1 416 555 0198","condicion_venta":"CIF","observaciones":"Distribuidor exclusivo Canadá. Requiere phytosanitary certificate y temperatura de cadena de frío documentada."}' },
  { id: "com1-d4", definicion_id: "com-1", referencia: "Mercado Central Mayoristas", fecha: "2025-02-03", valores: '{"nombre_cliente":"Mercado Central Mayoristas","tipo_cliente":"mayorista","pais_destino":"Argentina","contacto":"Ricardo Flores","email":"rflores@mcmayoristas.ar","telefono":"+54 11 4567 8901","condicion_venta":"FOB","observaciones":"Comprador spot, sin contrato fijo. Pagos al contado."}' },

  // ── com-2: Órdenes de Despacho ───────────────────────────────────────────────
  { id: "com2-d1", definicion_id: "com-2", referencia: "OD-2026-001", fecha: "2026-01-20", valores: '{"numero_orden":"OD-2026-001","tipo_despacho":"exportacion","cliente":"AgroExport S.A.","presentacion":"caja_5kg","cantidad":200,"precio_unitario":45,"total_usd":9000,"destino":"Puerto de Miami, FL","responsable":"Ana Torres","observaciones":"Envío aéreo urgente. Frío requerido -1°C a 2°C."}' },
  { id: "com2-d2", definicion_id: "com-2", referencia: "OD-2026-002", fecha: "2026-01-22", valores: '{"numero_orden":"OD-2026-002","tipo_despacho":"nacional","cliente":"Supermercados Unidos","presentacion":"clamshell_500g","cantidad":500,"precio_unitario":8,"total_usd":4000,"destino":"Centro de distribución Santiago","responsable":"Miguel Soto","observaciones":"Entrega en 2 partes: lunes y miércoles."}' },
  { id: "com2-d3", definicion_id: "com-2", referencia: "OD-2026-003", fecha: "2026-02-05", valores: '{"numero_orden":"OD-2026-003","tipo_despacho":"exportacion","cliente":"Fresh Fruits Inc.","presentacion":"caja_2kg","cantidad":350,"precio_unitario":22,"total_usd":7700,"destino":"Puerto de Montreal, QC","responsable":"Ana Torres","observaciones":"Consolidado en contenedor 40 HQ. BL pendiente."}' },
  { id: "com2-d4", definicion_id: "com-2", referencia: "OD-2026-004", fecha: "2026-03-10", valores: '{"numero_orden":"OD-2026-004","tipo_despacho":"exportacion","cliente":"Mercado Central Mayoristas","presentacion":"bandeja_1kg","cantidad":800,"precio_unitario":12,"total_usd":9600,"destino":"Buenos Aires, ARG","responsable":"Luis Vega","observaciones":"Primera orden spot — validar calidad antes de despacho."}' },
  { id: "com2-d5", definicion_id: "com-2", referencia: "OD-2026-005", fecha: "2026-04-18", valores: '{"numero_orden":"OD-2026-005","tipo_despacho":"nacional","cliente":"Supermercados Unidos","presentacion":"caja_5kg","cantidad":120,"precio_unitario":38,"total_usd":4560,"destino":"Centro de distribución Valparaíso","responsable":"Miguel Soto","observaciones":""}' },

  // ── com-3: Seguimiento de Exportación ───────────────────────────────────────
  { id: "com3-d1", definicion_id: "com-3", referencia: "CONT-2026-01", fecha: "2026-01-25", valores: '{"numero_contenedor":"MSCU7843210","numero_orden_ref":"OD-2026-001","fecha_embarque":"2026-01-28","puerto_destino":"Miami, FL","estado_embarque":"entregado","temperatura_transporte":1,"observaciones":"Entregado sin incidencias. Temperatura registrada en rango."}' },
  { id: "com3-d2", definicion_id: "com-3", referencia: "CONT-2026-02", fecha: "2026-02-08", valores: '{"numero_contenedor":"HLCU4521987","numero_orden_ref":"OD-2026-003","fecha_embarque":"2026-02-15","puerto_destino":"Montreal, QC","estado_embarque":"en_transito","temperatura_transporte":2,"observaciones":"En ruta. ETD Montreal 25-Feb."}' },

  // ── cul-cos-1: Registro de Cosecha — fuente de trazabilidad ─────────────────
  { id: "cos-d1", definicion_id: "cul-cos-1", cultivo_id: "c-01", referencia: "LOT-2026-001", fecha: "2026-01-15",
    valores: '{"numero_lote":"LOT-2026-001","fecha_cosecha":"2026-01-15","bloque_sector":"Bloque 1","variedad":"festival","kg_cosechados":380,"operario_jefe":"Pedro Soto","num_operarios":12,"observaciones":"Cosecha matutina, buenas condiciones"}' },
  { id: "cos-d2", definicion_id: "cul-cos-1", cultivo_id: "c-01", referencia: "LOT-2026-002", fecha: "2026-01-16",
    valores: '{"numero_lote":"LOT-2026-002","fecha_cosecha":"2026-01-16","bloque_sector":"Bloque 2","variedad":"san_andreas","kg_cosechados":420,"operario_jefe":"Carmen Díaz","num_operarios":14,"observaciones":""}' },
  { id: "cos-d3", definicion_id: "cul-cos-1", cultivo_id: "c-01", referencia: "LOT-2026-003", fecha: "2026-01-17",
    valores: '{"numero_lote":"LOT-2026-003","fecha_cosecha":"2026-01-17","bloque_sector":"Bloque 1","variedad":"festival","kg_cosechados":310,"operario_jefe":"Pedro Soto","num_operarios":10,"observaciones":"Inicio de cosecha tardío por niebla"}' },
  { id: "cos-d4", definicion_id: "cul-cos-1", cultivo_id: "c-01", referencia: "LOT-2026-004", fecha: "2026-01-20",
    valores: '{"numero_lote":"LOT-2026-004","fecha_cosecha":"2026-01-20","bloque_sector":"Bloque 3","variedad":"festival","kg_cosechados":195,"operario_jefe":"Carmen Díaz","num_operarios":8,"observaciones":"Bloque 3 en fin de temporada"}' },
  { id: "cos-d5", definicion_id: "cul-cos-1", cultivo_id: "c-02", referencia: "LOT-2026-005", fecha: "2026-01-18",
    valores: '{"numero_lote":"LOT-2026-005","fecha_cosecha":"2026-01-18","bloque_sector":"Bloque A","variedad":"biloxi","kg_cosechados":560,"operario_jefe":"Luis Vargas","num_operarios":16,"observaciones":"Excelente calibre este ciclo"}' },
  { id: "cos-d6", definicion_id: "cul-cos-1", cultivo_id: "c-02", referencia: "LOT-2026-006", fecha: "2026-01-22",
    valores: '{"numero_lote":"LOT-2026-006","fecha_cosecha":"2026-01-22","bloque_sector":"Bloque B","variedad":"oneal","kg_cosechados":480,"operario_jefe":"Luis Vargas","num_operarios":15,"observaciones":""}' },

  // ── pc-1: Trazabilidad de Pallet — referencias a lotes de cosecha ────────────
  { id: "pc1-d1", definicion_id: "pc-1", cultivo_id: "c-01", referencia: "PAL-2026-001", fecha: "2026-01-15",
    valores: '{"numero_pallet":"PAL-2026-001","fecha_proceso":"2026-01-15","lote_cosecha":"LOT-2026-001","linea_proceso":"linea_1","peso_neto_kg":368,"temperatura_ingreso":-1,"responsable":"Ana Torres","observaciones":""}' },
  { id: "pc1-d2", definicion_id: "pc-1", cultivo_id: "c-01", referencia: "PAL-2026-002", fecha: "2026-01-16",
    valores: '{"numero_pallet":"PAL-2026-002","fecha_proceso":"2026-01-16","lote_cosecha":"LOT-2026-002","linea_proceso":"linea_2","peso_neto_kg":405,"temperatura_ingreso":-1,"responsable":"Miguel Soto","observaciones":""}' },
  { id: "pc1-d3", definicion_id: "pc-1", cultivo_id: "c-01", referencia: "PAL-2026-003", fecha: "2026-01-17",
    valores: '{"numero_pallet":"PAL-2026-003","fecha_proceso":"2026-01-17","lote_cosecha":"LOT-2026-003","linea_proceso":"linea_1","peso_neto_kg":298,"temperatura_ingreso":0,"responsable":"Ana Torres","observaciones":"Temp. ingreso ligeramente alta, monitorear"}' },
  { id: "pc1-d4", definicion_id: "pc-1", cultivo_id: "c-01", referencia: "PAL-2026-004", fecha: "2026-01-20",
    valores: '{"numero_pallet":"PAL-2026-004","fecha_proceso":"2026-01-20","lote_cosecha":"LOT-2026-004","linea_proceso":"linea_3","peso_neto_kg":188,"temperatura_ingreso":-1,"responsable":"Miguel Soto","observaciones":"Lote pequeño — completar pallet con siguiente cosecha"}' },
  { id: "pc1-d5", definicion_id: "pc-1", cultivo_id: "c-02", referencia: "PAL-2026-005", fecha: "2026-01-18",
    valores: '{"numero_pallet":"PAL-2026-005","fecha_proceso":"2026-01-18","lote_cosecha":"LOT-2026-005","linea_proceso":"linea_1","peso_neto_kg":544,"temperatura_ingreso":-1,"responsable":"Ana Torres","observaciones":""}' },

  // ── pc-2: Control de Calidad — referencias a pallets ────────────────────────
  { id: "pc2-d1", definicion_id: "pc-2", cultivo_id: "c-01", referencia: "QC-2026-001", fecha: "2026-01-15",
    valores: '{"codigo_control":"QC-2026-001","fecha_control":"2026-01-15","pallet_ref":"PAL-2026-001","calibre_prom_mm":29,"brix":11.8,"firmeza_n":3.2,"pct_descarte":2.1,"estado_calidad":"aprobado","observaciones":"Fruta en óptimas condiciones"}' },
  { id: "pc2-d2", definicion_id: "pc-2", cultivo_id: "c-01", referencia: "QC-2026-002", fecha: "2026-01-16",
    valores: '{"codigo_control":"QC-2026-002","fecha_control":"2026-01-16","pallet_ref":"PAL-2026-002","calibre_prom_mm":27,"brix":12.3,"firmeza_n":3.0,"pct_descarte":3.5,"estado_calidad":"aprobado","observaciones":""}' },
  { id: "pc2-d3", definicion_id: "pc-2", cultivo_id: "c-01", referencia: "QC-2026-003", fecha: "2026-01-17",
    valores: '{"codigo_control":"QC-2026-003","fecha_control":"2026-01-17","pallet_ref":"PAL-2026-003","calibre_prom_mm":26,"brix":10.9,"firmeza_n":2.8,"pct_descarte":6.2,"estado_calidad":"condicional","observaciones":"Descarte elevado por fruta pequeña — destinar a mercado interno"}' },

  // ── pc-3: Inventario Cámara Fría — referencias a pallets ────────────────────
  { id: "pc3-d1", definicion_id: "pc-3", cultivo_id: "c-01", referencia: "CAM-2026-001", fecha: "2026-01-15",
    valores: '{"id_registro":"CAM-2026-001","pallet_ref":"PAL-2026-001","camara":"cam_1","fecha_ingreso":"2026-01-15","temp_real":-1,"estado":"despachado"}' },
  { id: "pc3-d2", definicion_id: "pc-3", cultivo_id: "c-01", referencia: "CAM-2026-002", fecha: "2026-01-16",
    valores: '{"id_registro":"CAM-2026-002","pallet_ref":"PAL-2026-002","camara":"cam_1","fecha_ingreso":"2026-01-16","temp_real":-1,"estado":"despachado"}' },
  { id: "pc3-d3", definicion_id: "pc-3", cultivo_id: "c-01", referencia: "CAM-2026-003", fecha: "2026-01-17",
    valores: '{"id_registro":"CAM-2026-003","pallet_ref":"PAL-2026-003","camara":"cam_2","fecha_ingreso":"2026-01-17","temp_real":1,"estado":"en_camara"}' },
  { id: "pc3-d4", definicion_id: "pc-3", cultivo_id: "c-02", referencia: "CAM-2026-004", fecha: "2026-01-18",
    valores: '{"id_registro":"CAM-2026-004","pallet_ref":"PAL-2026-005","camara":"cam_1","fecha_ingreso":"2026-01-18","temp_real":-1,"estado":"en_camara"}' },
];

// ─── Calibre ──────────────────────────────────────────────────────────────────
// Rangos de tamaño/peso para clasificación de fruta por cultivo.

export interface Calibre {
  id:          string;
  nombre:      string;      // "Premium", "Jumbo", "Extra", "Estándar"
  mm_min?:     number;      // diámetro mínimo en mm
  mm_max?:     number;      // diámetro máximo en mm
  peso_g_min?: number;      // peso mínimo en gramos
  peso_g_max?: number;      // peso máximo en gramos
}

// ─── NivelEstructura ──────────────────────────────────────────────────────────
// Define los niveles jerárquicos del campo (Bloque → Macrotúnel → Nave…)

export interface NivelEstructura {
  nivel:  number;   // posición en la jerarquía (1-based)
  label:  string;   // nombre visible: "Bloque", "Macrotúnel", "Nave"
  abrev:  string;   // abreviatura: "BL", "MT", "NV"
  activo: boolean;  // si este nivel aplica a este cultivo
}

// ─── ComponenteCampo — Elementos adicionales (válvulas, sensores, etc.) ───────

export interface ComponenteCampo {
  id:           string;
  tipo:         "valvula" | "sensor" | "bomba" | "filtro" | "medidor" | "otro";
  nombre:       string;       // ej: "Válvula principal", "Sensor pH"
  descripcion?: string;       // info adicional
  estado?:      "activo" | "mantenimiento" | "inactivo";
  ubicacion?:   string;       // descripción de ubicación específica
  modelo?:      string;       // marca/modelo del componente
  notas?:       string;       // notas adicionales
}

// ─── BloqueLayout — Instancias de bloques para el mapa visual ─────────────────
// Representa la posición y configuración de cada bloque en el mapa del campo.
// Los hijos[] anidan recursivamente la siguiente capa de la estructura.

export interface BloqueLayout {
  id:               string;       // uid del bloque
  nombre:           string;       // ej: "Bloque 1", "Hilera A"
  nivelIdx:         number;       // índice en estructura[] (0 = primer nivel activo)
  x:                number;       // posición X en el mapa (px)
  y:                number;       // posición Y en el mapa (px)
  width:            number;       // ancho en px
  height:           number;       // alto en px
  color?:           string;       // color de relleno opcional
  opacity?:         number;       // opacidad 20-100 (porcentaje)
  elementosPorFila?: number;      // cuántos hijos mostrar por fila (para grid layout)
  hijos?:           BloqueLayout[]; // sub-estructuras (hileras dentro de bloque, etc.)
  componentes?:     ComponenteCampo[]; // válvulas, sensores, etc.
}

// ─── MapaCultivo — mapa de campo adicional por módulo ─────────────────────────
// Permite que un cultivo tenga estructuras físicas distintas según el módulo
// (ej: vivero con mesa/bandeja, laboratorio con cámara/estante, vs. campo con bloque/hilera).

export interface MapaCultivo {
  id:          string;
  modulo:      string;           // clave del módulo: "vivero", "laboratorio", etc.
  label:       string;           // ej: "Mapa de invernadero", "Mapa de laboratorio"
  estructura:  NivelEstructura[];
  layout_mapa: BloqueLayout[];
}

// ─── Cultivo ──────────────────────────────────────────────────────────────────
// Equivale a la tabla `Cultivos` del ERD.

export interface Cultivo {
  id:              string;
  nombre:          string;    // ej: "Fresas"
  codigo:          string;    // ej: "FRE"
  descripcion:     string;
  activo:          boolean;
  // Control de acceso multi-tenant:
  // vacío/undefined → visible para todos los clientes/productores
  clientes_ids?:   number[];  // solo estos clientes pueden usar este cultivo
  productores_ids?: number[]; // solo estos productores pueden usar este cultivo
  // Medidas y unidades
  unidad_superficie?: "ha" | "m2" | "acres";  // default: "ha"
  unidad_produccion?: "kg" | "ton" | "cajas"; // default: "kg"
  marco_plantacion?:  number;                 // plantas por ha (opcional)
  // Configuración de calidad
  unidad_calibre?: "mm" | "cm";  // unidad de medida del diámetro de la fruta; default: "mm"
  calibres?: Calibre[];
  // Configuración de campo (mapa raíz — módulo "cultivo")
  estructura?: NivelEstructura[];
  // Mapa visual — instancias de bloques posicionadas en el campo
  layout_mapa?: BloqueLayout[];
  // Mapas adicionales para otros módulos (vivero, laboratorio, etc.)
  mapas_extra?: MapaCultivo[];
}

// ─── Variedad — CAT_VARIEDADES ────────────────────────────────────────────────
// Variedades por cultivo.

export interface Variedad {
  id:           string;
  cultivo_id:   string;
  nombre:       string;    // ej: "Festival"
  codigo:       string;    // ej: "FES"
  descripcion:  string;
  activo:       boolean;
  // Control de acceso multi-tenant (CONFIG_VARIEDADES_HABILITADAS):
  // vacío/undefined → visible a todos los clientes/productores habilitados para el cultivo
  clientes_ids?:    number[];  // solo estos clientes pueden ver esta variedad
  productores_ids?: number[];  // solo estos productores pueden ver esta variedad
}

// ─── Datos iniciales — Cultivos y Variedades ──────────────────────────────────

export const CULTIVOS: Cultivo[] = [
  // Fresas → ambos clientes; productores 1 y 3
  {
    id: "c-01", nombre: "Fresas", codigo: "FRE", descripcion: "Fragaria × ananassa",
    activo: true, clientes_ids: [1, 2], productores_ids: [1, 3],
    unidad_superficie: "ha", unidad_produccion: "kg", marco_plantacion: 40000,
    calibres: [
      { id: "cal-01", nombre: "Premium",  mm_min: 28, mm_max: 32, peso_g_min: 18 },
      { id: "cal-02", nombre: "Selecta",  mm_min: 24, mm_max: 28, peso_g_min: 14 },
      { id: "cal-03", nombre: "Estándar", mm_min: 20, mm_max: 24, peso_g_min: 10 },
      { id: "cal-04", nombre: "Descarte", mm_min: 0,  mm_max: 20, peso_g_min: 0  },
    ],
    estructura: [
      { nivel: 1, label: "Bloque",    abrev: "BL", activo: true  },
      { nivel: 2, label: "Hilera",    abrev: "HL", activo: true  },
      { nivel: 3, label: "Cuadrante", abrev: "CU", activo: true  },
      { nivel: 4, label: "Planta",    abrev: "PL", activo: false },
    ],
    layout_mapa: [
      {
        id: "blk-01", nombre: "Bloque 1", nivelIdx: 0, x: 20, y: 20, width: 180, height: 120,
        hijos: [
          { id: "hl-01", nombre: "HL1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
            { id: "cu-01", nombre: "CU1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-02", nombre: "CU2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-03", nombre: "CU3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-04", nombre: "CU4", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
          ] },
          { id: "hl-02", nombre: "HL2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
            { id: "cu-05", nombre: "CU1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-06", nombre: "CU2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-07", nombre: "CU3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-08", nombre: "CU4", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
          ] },
          { id: "hl-03", nombre: "HL3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
            { id: "cu-09", nombre: "CU1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-10", nombre: "CU2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-11", nombre: "CU3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-12", nombre: "CU4", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
          ] },
        ],
      },
      {
        id: "blk-02", nombre: "Bloque 2", nivelIdx: 0, x: 220, y: 20, width: 180, height: 120,
        hijos: [
          { id: "hl-04", nombre: "HL1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
            { id: "cu-13", nombre: "CU1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-14", nombre: "CU2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-15", nombre: "CU3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
          ] },
          { id: "hl-05", nombre: "HL2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
            { id: "cu-16", nombre: "CU1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-17", nombre: "CU2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
            { id: "cu-18", nombre: "CU3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
          ] },
          { id: "hl-06", nombre: "HL3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-07", nombre: "HL4", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-08", nombre: "HL5", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
      {
        id: "blk-03", nombre: "Bloque 3", nivelIdx: 0, x: 420, y: 20, width: 140, height: 200,
        hijos: [
          { id: "hl-09", nombre: "HL1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-10", nombre: "HL2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
      {
        id: "blk-04", nombre: "Bloque 4", nivelIdx: 0, x: 20, y: 160, width: 380, height: 100,
        hijos: [
          { id: "hl-11", nombre: "HL1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-12", nombre: "HL2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-13", nombre: "HL3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "hl-14", nombre: "HL4", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
    ],
    mapas_extra: [
      {
        id: "mapa-fre-vivero", modulo: "vivero", label: "Vivero",
        estructura: [
          { nivel: 1, label: "Invernadero", abrev: "IN", activo: true  },
          { nivel: 2, label: "Mesa",        abrev: "MS", activo: true  },
          { nivel: 3, label: "Bandeja",     abrev: "BD", activo: true  },
        ],
        layout_mapa: [
          {
            id: "fre-in-01", nombre: "Invernadero 1", nivelIdx: 0, x: 20, y: 20, width: 200, height: 140,
            hijos: [
              { id: "fre-ms-01", nombre: "MS1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "fre-bd-01", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-02", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-03", nombre: "BD3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-04", nombre: "BD4", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
              { id: "fre-ms-02", nombre: "MS2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "fre-bd-05", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-06", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-07", nombre: "BD3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
              { id: "fre-ms-03", nombre: "MS3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "fre-bd-08", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-09", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
            ],
          },
          {
            id: "fre-in-02", nombre: "Invernadero 2", nivelIdx: 0, x: 240, y: 20, width: 200, height: 140,
            hijos: [
              { id: "fre-ms-04", nombre: "MS1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "fre-bd-10", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-11", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
              { id: "fre-ms-05", nombre: "MS2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "fre-bd-12", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "fre-bd-13", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
            ],
          },
        ],
      },
      {
        id: "mapa-fre-lab", modulo: "laboratorio", label: "Laboratorio",
        estructura: [
          { nivel: 1, label: "Zona",    abrev: "ZN", activo: true },
          { nivel: 2, label: "Estante", abrev: "ET", activo: true },
        ],
        layout_mapa: [
          {
            id: "fre-zn-01", nombre: "Zona A", nivelIdx: 0, x: 20, y: 20, width: 160, height: 100,
            hijos: [
              { id: "fre-et-01", nombre: "ET1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "fre-et-02", nombre: "ET2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "fre-et-03", nombre: "ET3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
            ],
          },
          {
            id: "fre-zn-02", nombre: "Zona B", nivelIdx: 0, x: 200, y: 20, width: 160, height: 100,
            hijos: [
              { id: "fre-et-04", nombre: "ET1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "fre-et-05", nombre: "ET2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
            ],
          },
        ],
      },
    ],
  },
  // Arándanos → solo cliente 1; productor 1
  {
    id: "c-02", nombre: "Arándanos", codigo: "ARA", descripcion: "Vaccinium spp.",
    activo: true, clientes_ids: [1], productores_ids: [1],
    unidad_superficie: "ha", unidad_produccion: "kg", marco_plantacion: 3300,
    calibres: [
      { id: "cal-05", nombre: "Jumbo",    mm_min: 18, mm_max: 22, peso_g_min: 5 },
      { id: "cal-06", nombre: "Extra",    mm_min: 16, mm_max: 18, peso_g_min: 4 },
      { id: "cal-07", nombre: "Estándar", mm_min: 13, mm_max: 16, peso_g_min: 2 },
      { id: "cal-08", nombre: "Mirtilo",  mm_min: 10, mm_max: 13 },
    ],
    estructura: [
      { nivel: 1, label: "Bloque",     abrev: "BL", activo: true  },
      { nivel: 2, label: "Macrotúnel", abrev: "MT", activo: true  },
      { nivel: 3, label: "Nave",       abrev: "NV", activo: true  },
      { nivel: 4, label: "Hilera",     abrev: "HL", activo: true  },
      { nivel: 5, label: "Cuadrante",  abrev: "CU", activo: false },
    ],
    layout_mapa: [
      {
        id: "ara-blk-01", nombre: "Bloque A", nivelIdx: 0, x: 20, y: 20, width: 180, height: 140,
        hijos: [
          { id: "ara-mt-01", nombre: "MT1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "ara-mt-02", nombre: "MT2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
      {
        id: "ara-blk-02", nombre: "Bloque B", nivelIdx: 0, x: 220, y: 20, width: 180, height: 140,
        hijos: [
          { id: "ara-mt-03", nombre: "MT1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "ara-mt-04", nombre: "MT2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "ara-mt-05", nombre: "MT3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
      {
        id: "ara-blk-03", nombre: "Bloque C", nivelIdx: 0, x: 20, y: 180, width: 380, height: 100,
        hijos: [
          { id: "ara-mt-06", nombre: "MT1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
          { id: "ara-mt-07", nombre: "MT2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
        ],
      },
    ],
    mapas_extra: [
      {
        id: "mapa-ara-vivero", modulo: "vivero", label: "Vivero",
        estructura: [
          { nivel: 1, label: "Invernadero", abrev: "IN", activo: true },
          { nivel: 2, label: "Mesa",        abrev: "MS", activo: true },
          { nivel: 3, label: "Bandeja",     abrev: "BD", activo: true },
        ],
        layout_mapa: [
          {
            id: "ara-in-01", nombre: "Invernadero 1", nivelIdx: 0, x: 20, y: 20, width: 200, height: 130,
            hijos: [
              { id: "ara-ms-01", nombre: "MS1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "ara-bd-01", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "ara-bd-02", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "ara-bd-03", nombre: "BD3", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
              { id: "ara-ms-02", nombre: "MS2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "ara-bd-04", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "ara-bd-05", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
            ],
          },
          {
            id: "ara-in-02", nombre: "Invernadero 2", nivelIdx: 0, x: 240, y: 20, width: 160, height: 130,
            hijos: [
              { id: "ara-ms-03", nombre: "MS1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0, hijos: [
                { id: "ara-bd-06", nombre: "BD1", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
                { id: "ara-bd-07", nombre: "BD2", nivelIdx: 2, x: 0, y: 0, width: 0, height: 0 },
              ] },
            ],
          },
        ],
      },
      {
        id: "mapa-ara-lab", modulo: "laboratorio", label: "Laboratorio",
        estructura: [
          { nivel: 1, label: "Zona",    abrev: "ZN", activo: true },
          { nivel: 2, label: "Estante", abrev: "ET", activo: true },
        ],
        layout_mapa: [
          {
            id: "ara-zn-01", nombre: "Zona A", nivelIdx: 0, x: 20, y: 20, width: 160, height: 100,
            hijos: [
              { id: "ara-et-01", nombre: "ET1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "ara-et-02", nombre: "ET2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
            ],
          },
          {
            id: "ara-zn-02", nombre: "Zona B", nivelIdx: 0, x: 200, y: 20, width: 160, height: 100,
            hijos: [
              { id: "ara-et-03", nombre: "ET1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "ara-et-04", nombre: "ET2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
            ],
          },
        ],
      },
    ],
  },
  // Frambuesas → solo cliente 2; productor 3
  {
    id: "c-03", nombre: "Frambuesas", codigo: "FRA", descripcion: "Rubus idaeus",
    activo: false, clientes_ids: [2], productores_ids: [3],
    unidad_superficie: "ha", unidad_produccion: "kg",
    calibres: [],
    estructura: [
      { nivel: 1, label: "Bloque", abrev: "BL", activo: true },
      { nivel: 2, label: "Hilera", abrev: "HL", activo: true },
    ],
    mapas_extra: [
      {
        id: "mapa-fra-vivero", modulo: "vivero", label: "Vivero",
        estructura: [
          { nivel: 1, label: "Invernadero", abrev: "IN", activo: true },
          { nivel: 2, label: "Mesa",        abrev: "MS", activo: true },
        ],
        layout_mapa: [
          {
            id: "fra-in-01", nombre: "Invernadero 1", nivelIdx: 0, x: 20, y: 20, width: 180, height: 120,
            hijos: [
              { id: "fra-ms-01", nombre: "MS1", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "fra-ms-02", nombre: "MS2", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
              { id: "fra-ms-03", nombre: "MS3", nivelIdx: 1, x: 0, y: 0, width: 0, height: 0 },
            ],
          },
        ],
      },
    ],
  },
];

export const VARIEDADES: Variedad[] = [
  // Fresas — ambos clientes tienen el cultivo, pero Cliente 2 solo usa Festival
  { id: "v-01", cultivo_id: "c-01", nombre: "Festival",    codigo: "FES", descripcion: "Alta producción, fruto firme",     activo: true,  clientes_ids: [] },        // global → ambos
  { id: "v-02", cultivo_id: "c-01", nombre: "San Andreas", codigo: "SAN", descripcion: "Día neutro, cosecha continua",     activo: true,  clientes_ids: [1] },       // solo Cliente 1
  { id: "v-03", cultivo_id: "c-01", nombre: "Camarosa",    codigo: "CAM", descripcion: "Fruto grande, buen sabor",         activo: false, clientes_ids: [1] },       // solo Cliente 1
  // Arándanos — solo Cliente 1
  { id: "v-04", cultivo_id: "c-02", nombre: "Biloxi",      codigo: "BIL", descripcion: "Baja estratificación, precoz",     activo: true,  clientes_ids: [] },
  { id: "v-05", cultivo_id: "c-02", nombre: "O'Neal",      codigo: "ONE", descripcion: "Alta productividad, buen calibre", activo: true,  clientes_ids: [] },
  { id: "v-06", cultivo_id: "c-02", nombre: "Emerald",     codigo: "EME", descripcion: "Fruto grande y firme",             activo: true,  clientes_ids: [1] },       // solo Cliente 1
  // Frambuesas — solo Cliente 2
  { id: "v-07", cultivo_id: "c-03", nombre: "Autumn Bliss",codigo: "AUT", descripcion: "Remontante de otoño",              activo: false, clientes_ids: [] },
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
  Relación: "text",
  Foto:    "file",
  Archivo: "file",
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
