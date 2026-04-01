import { useState, useMemo, useRef, useEffect } from "react";
import { InformesBuilder, type BuilderConfig, type CampoEncabezado, type FuenteCampo } from "./InformesBuilder";
import { InformeVersionDialog } from "@/components/dashboard/InformeVersionDialog";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useRole, ROLE_LEVELS } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";
import {
  BarChart2,
  FileText,
  Table2,
  TrendingUp,
  Search,
  Star,
  Lock,
  FlaskConical,
  Sprout,
  Leaf,
  Scissors,
  Package,
  Globe,
  Loader2,
  Check,
  CheckCircle2,
  Clock,
  Archive,
  Play,
  History,
  Info,
  FileSpreadsheet,
  FileBarChart,
  FileType,
  Zap,
  AlertTriangle,
  Plus,
  Download,
  RefreshCw,
  Layers,
  Settings2,
  Sliders,
  Calendar,
  Mail,
  X,
  Users,
  User,
  UserPlus,
  ChevronDown,
  Eye,
  Pencil,
  GitBranch,
  Trash2,
  FilePlus,
  RotateCcw,
  ArrowLeftRight,
  Copy,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoInforme = "tabla" | "grafico" | "mixto" | "resumen";
type CategoriaInforme =
  | "laboratorio"
  | "vivero"
  | "siembra"
  | "cosecha"
  | "poscosecha"
  | "general";
type EstadoInforme = "activo" | "borrador" | "archivado";
type FormatoExport = "pdf" | "excel" | "csv" | "word";
type EstadoGeneracion = "completado" | "error" | "procesando";

interface Informe {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  tipo_informe: TipoInforme;
  categoria: CategoriaInforme;
  nivel_acceso_minimo: number;
  roles_permitidos?: string[];
  estado: EstadoInforme;
  es_favorito: boolean;
  es_programado: boolean;
  frecuencia_programacion?: "diaria" | "semanal" | "mensual";
  hora_envio?: string;
  destinatarios_programados?: string[];
  formato_preferido?: FormatoExport;
  veces_generado: number;
  ultimo_uso?: string;
  cliente_id?: number;
  created_at: string;
  fuentes: string[];
  builderConfig?: BuilderConfig;
  versiones?: InformeSnapshot[];
}

interface InformeSnapshot {
  id: string;
  informe_id: string;
  version: string;
  timestamp: string;
  usuario: string;
  cambio: string;
  nombre: string;
  descripcion: string;
  builderConfig?: BuilderConfig;
}

interface InformeGeneracion {
  id: string;
  informe_id: string;
  informe_nombre: string;
  categoria: CategoriaInforme;
  usuario: string;
  fecha: string;
  parametros: Record<string, unknown>;
  formato: FormatoExport;
  estado: EstadoGeneracion;
  registros_procesados?: number;
  tiempo_ms?: number;
}

// ─── Datos demo ───────────────────────────────────────────────────────────────

const INFORMES_DEMO: Informe[] = [
  // ── Laboratorio
  {
    id: "inf-01",
    codigo: "LAB-001",
    nombre: "Trazabilidad de Lotes de Laboratorio",
    descripcion:
      "Seguimiento completo del ciclo de vida de cada lote desde importación de material hasta salida del laboratorio. Incluye lotes de introducción, multiplicación y aclimatación con sus eventos de seguimiento.",
    tipo_informe: "tabla",
    categoria: "laboratorio",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: true,
    es_programado: false,
    veces_generado: 47,
    ultimo_uso: "2025-03-12",
    created_at: "2024-08-01",
    fuentes: [
      "LOTE_INTRODUCCION",
      "SEGUIMIENTO_LOTE",
      "LOTE_MULTIPLICACION",
      "LOTE_ACLIMATACION",
    ],
    versiones: [
      {
        id: "isnap-1",
        informe_id: "inf-01",
        version: "1.0",
        timestamp: "2025-01-15T10:00:00Z",
        usuario: "Ana García",
        cambio: "Versión inicial",
        nombre: "Trazabilidad de Lotes de Laboratorio",
        descripcion: "Seguimiento completo del ciclo de vida de cada lote desde importación de material hasta salida del laboratorio. Incluye lotes de introducción, multiplicación y aclimatación con sus eventos de seguimiento.",
      },
      {
        id: "isnap-2",
        informe_id: "inf-01",
        version: "2.0",
        timestamp: "2025-02-20T14:30:00Z",
        usuario: "Ana García",
        cambio: "Ajuste de métricas y fuentes",
        nombre: "Trazabilidad de Lotes de Laboratorio",
        descripcion: "Seguimiento completo del ciclo de vida de cada lote desde importación de material hasta salida del laboratorio. Incluye lotes de introducción, multiplicación y aclimatación con sus eventos de seguimiento.",
      },
    ],
  },
  {
    id: "inf-02",
    codigo: "LAB-002",
    nombre: "Estado de Propagación de Material Vegetal",
    descripcion:
      "Vista consolidada del estado actual de todos los lotes en propagación. Muestra tasas de multiplicación, rendimientos de aclimatación y calidad por variedad.",
    tipo_informe: "mixto",
    categoria: "laboratorio",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: false,
    es_programado: true,
    frecuencia_programacion: "semanal",
    veces_generado: 24,
    ultimo_uso: "2025-03-10",
    created_at: "2024-08-15",
    fuentes: [
      "LOTE_MULTIPLICACION",
      "TASA_MULTIPLICACION",
      "LOTE_ACLIMATACION",
      "RENDIMIENTO_ACLIMATACION",
      "CALIDAD_ACLIMATACION",
    ],
    versiones: [
      {
        id: "isnap-3",
        informe_id: "inf-02",
        version: "1.0",
        timestamp: "2025-01-20T09:00:00Z",
        usuario: "Roberto Silva",
        cambio: "Versión inicial",
        nombre: "Estado de Propagación de Material Vegetal",
        descripcion: "Vista consolidada del estado actual de todos los lotes en propagación. Muestra tasas de multiplicación, rendimientos de aclimatación y calidad por variedad.",
      },
      {
        id: "isnap-4",
        informe_id: "inf-02",
        version: "2.0",
        timestamp: "2025-03-01T11:00:00Z",
        usuario: "Roberto Silva",
        cambio: "Ajuste de métricas y fuentes",
        nombre: "Estado de Propagación de Material Vegetal",
        descripcion: "Vista consolidada del estado actual de todos los lotes en propagación. Muestra tasas de multiplicación, rendimientos de aclimatación y calidad por variedad.",
      },
    ],
  },
  {
    id: "inf-03",
    codigo: "LAB-003",
    nombre: "Monitoreo MIPE — Laboratorio y Vivero",
    descripcion:
      "Registro y análisis de hallazgos MIPE (Manejo Integrado de Plagas y Enfermedades) en laboratorio. Incluye tipo de plaga, severidad, acciones correctivas y evolución temporal.",
    tipo_informe: "tabla",
    categoria: "laboratorio",
    nivel_acceso_minimo: 3,
    roles_permitidos: ["super_admin", "cliente_admin", "jefe_area"],
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 12,
    ultimo_uso: "2025-02-28",
    created_at: "2024-09-01",
    fuentes: ["MONITOREO_MIPE", "HALLAZGO_MIPE"],
  },

  // ── Vivero
  {
    id: "inf-04",
    codigo: "VIV-001",
    nombre: "Rendimiento de Lotes en Vivero",
    descripcion:
      "Análisis del rendimiento y calidad de lotes en la fase de engorde en vivero. Permite comparar rendimientos entre lotes, variedades y períodos para optimizar procesos.",
    tipo_informe: "grafico",
    categoria: "vivero",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: true,
    es_programado: false,
    veces_generado: 31,
    ultimo_uso: "2025-03-08",
    created_at: "2024-08-20",
    fuentes: [
      "LOTE_ENGORDE",
      "SEGUIMIENTO_ENGORDE",
      "RENDIMIENTO_ENGORDE",
      "CALIDAD_ENGORDE",
    ],
  },
  {
    id: "inf-05",
    codigo: "VIV-002",
    nombre: "Registro de Salidas de Vivero",
    descripcion:
      "Control de plantas entregadas desde vivero al módulo de siembra. Incluye totales por variedad, destino, fecha y responsable de despacho.",
    tipo_informe: "tabla",
    categoria: "vivero",
    nivel_acceso_minimo: 1,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 18,
    ultimo_uso: "2025-03-05",
    created_at: "2024-08-20",
    fuentes: ["SALIDA_VIVERO"],
  },

  // ── Siembra
  {
    id: "inf-06",
    codigo: "SIE-001",
    nombre: "Curva de Producción por Cultivo",
    descripcion:
      "Visualización de la curva de producción esperada vs. real por cultivo, variedad y período. Herramienta clave para planificación de cosecha y recursos.",
    tipo_informe: "grafico",
    categoria: "siembra",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: true,
    es_programado: true,
    frecuencia_programacion: "mensual",
    veces_generado: 36,
    ultimo_uso: "2025-03-01",
    created_at: "2024-07-15",
    fuentes: ["CURVA_PRODUCCION", "REGISTRO_PROYECCION", "REGISTRO_CONTEO"],
  },
  {
    id: "inf-07",
    codigo: "SIE-002",
    nombre: "Aplicaciones Fitosanitarias y Fertilización",
    descripcion:
      "Historial de aplicaciones de productos fitosanitarios y fertilizantes por cultivo, lote y período. Incluye dosis, productos utilizados y cumplimiento de intervalos de seguridad.",
    tipo_informe: "tabla",
    categoria: "siembra",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 22,
    ultimo_uso: "2025-02-20",
    created_at: "2024-09-10",
    fuentes: ["APLICACION_FITOSANITARIA", "APLICACION_FERTILIZANTE"],
  },
  {
    id: "inf-08",
    codigo: "SIE-003",
    nombre: "Lecturas de pH y Conductividad Eléctrica",
    descripcion:
      "Registro y evolución de lecturas de pH y CE del sustrato/solución nutritiva por módulo de cultivo. Permite identificar desviaciones y tendencias.",
    tipo_informe: "mixto",
    categoria: "siembra",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 15,
    ultimo_uso: "2025-03-07",
    created_at: "2024-10-01",
    fuentes: ["LECTURA_PH_CE", "REVISION_SUSTRATO"],
  },
  {
    id: "inf-09",
    codigo: "SIE-004",
    nombre: "MIPE en Campo — Visitas y Aplicaciones",
    descripcion:
      "Consolidado de visitas MIPE en campo, hallazgos detectados y medidas correctivas implementadas. Cruce con aplicaciones fitosanitarias asociadas.",
    tipo_informe: "tabla",
    categoria: "siembra",
    nivel_acceso_minimo: 3,
    estado: "borrador",
    es_favorito: false,
    es_programado: false,
    veces_generado: 3,
    ultimo_uso: "2025-01-15",
    created_at: "2024-11-01",
    fuentes: ["VISITA_MIPE", "HALLAZGO_MIPE"],
  },

  // ── Cosecha
  {
    id: "inf-10",
    codigo: "COS-001",
    nombre: "Rendimiento de Cosecha por Operario",
    descripcion:
      "Análisis detallado del rendimiento individual de cada operario de cosecha: kilos cosechados, horas trabajadas, eficiencia y calidad del producto cosechado.",
    tipo_informe: "tabla",
    categoria: "cosecha",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 28,
    ultimo_uso: "2025-03-11",
    created_at: "2024-07-01",
    fuentes: ["REGISTRO_COSECHA", "DETALLE_COSECHA_OPERARIO"],
  },
  {
    id: "inf-11",
    codigo: "COS-002",
    nombre: "Inspecciones de Liberación de Cosecha",
    descripcion:
      "Registro de inspecciones de control de calidad para liberación de cosecha. Incluye parámetros evaluados, resultados y estado de aprobación por lote.",
    tipo_informe: "tabla",
    categoria: "cosecha",
    nivel_acceso_minimo: 3,
    roles_permitidos: ["super_admin", "cliente_admin", "jefe_area"],
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 9,
    ultimo_uso: "2025-03-09",
    created_at: "2024-09-20",
    fuentes: ["INSPECCION_LIBERACION"],
  },

  // ── Poscosecha
  {
    id: "inf-12",
    codigo: "POS-001",
    nombre: "Movimientos y Stock de Bodega",
    descripcion:
      "Control de inventario en tiempo real: ingresos, movimientos internos, reclasificaciones y stock disponible por categoría, variedad y cámara.",
    tipo_informe: "tabla",
    categoria: "poscosecha",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: true,
    es_programado: true,
    frecuencia_programacion: "diaria",
    veces_generado: 89,
    ultimo_uso: "2025-03-14",
    created_at: "2024-07-01",
    fuentes: ["STOCK_MENSUAL", "MOVIMIENTO_BODEGA", "INGRESO_FRUTA", "RECLASIFICACION_LOTE"],
  },
  {
    id: "inf-13",
    codigo: "POS-002",
    nombre: "Índices de Calidad y Madurez",
    descripcion:
      "Análisis de índices de madurez, calidad e inocuidad por lote y período. Incluye pesos, calibres, temperatura del producto y parámetros de inocuidad.",
    tipo_informe: "mixto",
    categoria: "poscosecha",
    nivel_acceso_minimo: 2,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 41,
    ultimo_uso: "2025-03-12",
    created_at: "2024-08-05",
    fuentes: [
      "INDICES_MADUREZ",
      "INDICES_CALIDAD",
      "PESOS_CALIBRES",
      "TEMPERATURA_PRODUCTO",
      "PARAMETROS_INOCUIDAD",
    ],
  },
  {
    id: "inf-14",
    codigo: "POS-003",
    nombre: "Despachos de Exportación",
    descripcion:
      "Registro completo de despachos de exportación con packing list, temperaturas de cámara, gasificación y trazabilidad por pallet. Indispensable para auditorías.",
    tipo_informe: "tabla",
    categoria: "poscosecha",
    nivel_acceso_minimo: 3,
    estado: "activo",
    es_favorito: false,
    es_programado: true,
    frecuencia_programacion: "semanal",
    veces_generado: 19,
    ultimo_uso: "2025-03-10",
    created_at: "2024-07-15",
    fuentes: [
      "DESPACHO_EXPORTACION",
      "DETALLE_EXPORTACION",
      "PACKING_LIST",
      "PROCESO_GASIFICACION",
      "REGISTRO_TEMPERATURA",
    ],
  },

  // ── General
  {
    id: "inf-15",
    codigo: "GEN-001",
    nombre: "Resumen Ejecutivo de Producción",
    descripcion:
      "Informe de alto nivel para gerencia: KPIs principales de producción, cosecha, calidad y exportación en el período. Incluye comparativa con período anterior.",
    tipo_informe: "resumen",
    categoria: "general",
    nivel_acceso_minimo: 4,
    roles_permitidos: ["super_admin", "cliente_admin", "productor"],
    estado: "activo",
    es_favorito: true,
    es_programado: true,
    frecuencia_programacion: "mensual",
    veces_generado: 14,
    ultimo_uso: "2025-03-01",
    created_at: "2024-07-01",
    fuentes: ["Todos los módulos"],
  },
  {
    id: "inf-16",
    codigo: "GEN-002",
    nombre: "KPIs Operacionales",
    descripcion:
      "Dashboard operacional con indicadores clave de rendimiento por módulo. Visualización de eficiencias, alertas y métricas comparativas entre períodos.",
    tipo_informe: "grafico",
    categoria: "general",
    nivel_acceso_minimo: 3,
    estado: "activo",
    es_favorito: false,
    es_programado: false,
    veces_generado: 33,
    ultimo_uso: "2025-03-13",
    created_at: "2024-08-01",
    fuentes: [
      "REGISTRO_COSECHA",
      "STOCK_MENSUAL",
      "LOTE_ENGORDE",
      "CURVA_PRODUCCION",
    ],
  },
];

const GENERACIONES_DEMO: InformeGeneracion[] = [
  {
    id: "gen-01",
    informe_id: "inf-01",
    informe_nombre: "Análisis de resultados de laboratorio",
    categoria: "laboratorio",
    usuario: "Ana García",
    fecha: "2025-03-12T09:14:00",
    parametros: { fecha_desde: "2025-01-01", fecha_hasta: "2025-03-12", cultivo: "Arándanos" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 142,
    tiempo_ms: 1840,
  },
  {
    id: "gen-02",
    informe_id: "inf-01",
    informe_nombre: "Análisis de resultados de laboratorio",
    categoria: "laboratorio",
    usuario: "Roberto Silva",
    fecha: "2025-03-05T14:30:00",
    parametros: { fecha_desde: "2025-02-01", fecha_hasta: "2025-03-05" },
    formato: "pdf",
    estado: "completado",
    registros_procesados: 87,
    tiempo_ms: 2310,
  },
  {
    id: "gen-03",
    informe_id: "inf-01",
    informe_nombre: "Análisis de resultados de laboratorio",
    categoria: "laboratorio",
    usuario: "María López",
    fecha: "2025-02-28T08:55:00",
    parametros: { fecha_desde: "2025-02-01", fecha_hasta: "2025-02-28" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 64,
    tiempo_ms: 1120,
  },
  {
    id: "gen-04",
    informe_id: "inf-06",
    informe_nombre: "Rendimiento por hectárea",
    categoria: "siembra",
    usuario: "Ana García",
    fecha: "2025-03-01T07:00:00",
    parametros: { periodo: "Febrero 2025", cultivo: "Todos" },
    formato: "pdf",
    estado: "completado",
    registros_procesados: 210,
    tiempo_ms: 3450,
  },
  {
    id: "gen-05",
    informe_id: "inf-12",
    informe_nombre: "Control de temperatura en cámaras",
    categoria: "poscosecha",
    usuario: "Sistema (programado)",
    fecha: "2025-03-14T06:00:00",
    parametros: { fecha: "2025-03-14", camara: "Todas" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 318,
    tiempo_ms: 980,
  },
  {
    id: "gen-06",
    informe_id: "inf-12",
    informe_nombre: "Control de temperatura en cámaras",
    categoria: "poscosecha",
    usuario: "Sistema (programado)",
    fecha: "2025-03-13T06:00:00",
    parametros: { fecha: "2025-03-13", camara: "Todas" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 301,
    tiempo_ms: 950,
  },
  {
    id: "gen-07",
    informe_id: "inf-15",
    informe_nombre: "Resumen ejecutivo mensual",
    categoria: "general",
    usuario: "Carlos Mendoza",
    fecha: "2025-03-01T08:00:00",
    parametros: { periodo: "Febrero 2025" },
    formato: "pdf",
    estado: "completado",
    registros_procesados: 1204,
    tiempo_ms: 8200,
  },
  {
    id: "gen-08",
    informe_id: "inf-10",
    informe_nombre: "Inventario de plantas por lote",
    categoria: "vivero",
    usuario: "Juan Pérez",
    fecha: "2025-03-11T17:45:00",
    parametros: { fecha_desde: "2025-03-01", fecha_hasta: "2025-03-11" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 56,
    tiempo_ms: 760,
  },
  {
    id: "gen-09",
    informe_id: "inf-13",
    informe_nombre: "Seguimiento de siembra por variedad",
    categoria: "siembra",
    usuario: "Ana García",
    fecha: "2025-03-12T10:00:00",
    parametros: { lote: "Todos", variedad: "Biloxi" },
    formato: "pdf",
    estado: "error",
    registros_procesados: 0,
    tiempo_ms: 320,
  },
  // ── Generaciones de Juan Pérez (supervisor cultivo → categoría siembra) ──
  {
    id: "gen-10",
    informe_id: "inf-06",
    informe_nombre: "Rendimiento por hectárea",
    categoria: "siembra",
    usuario: "Juan Pérez",
    fecha: "2025-03-15T08:30:00",
    parametros: { fecha_desde: "2025-03-01", fecha_hasta: "2025-03-15", lote: "Lote A" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 92,
    tiempo_ms: 1340,
  },
  {
    id: "gen-11",
    informe_id: "inf-13",
    informe_nombre: "Seguimiento de siembra por variedad",
    categoria: "siembra",
    usuario: "Juan Pérez",
    fecha: "2025-03-10T14:00:00",
    parametros: { lote: "Lote B", variedad: "Biloxi" },
    formato: "pdf",
    estado: "completado",
    registros_procesados: 48,
    tiempo_ms: 890,
  },
  {
    id: "gen-12",
    informe_id: "inf-06",
    informe_nombre: "Rendimiento por hectárea",
    categoria: "siembra",
    usuario: "Juan Pérez",
    fecha: "2025-03-01T09:00:00",
    parametros: { fecha_desde: "2025-02-01", fecha_hasta: "2025-02-28", lote: "Todos" },
    formato: "excel",
    estado: "completado",
    registros_procesados: 115,
    tiempo_ms: 1620,
  },
  // ── María López (jefe_area cultivo) ──
  {
    id: "gen-13",
    informe_id: "inf-06",
    informe_nombre: "Rendimiento por hectárea",
    categoria: "siembra",
    usuario: "María López",
    fecha: "2025-03-18T07:00:00",
    parametros: { fecha_desde: "2025-03-01", fecha_hasta: "2025-03-18", cultivo: "Arándanos" },
    formato: "pdf",
    estado: "completado",
    registros_procesados: 204,
    tiempo_ms: 2800,
  },
];

// ─── Mapas de color / icono ───────────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<
  CategoriaInforme,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  laboratorio: {
    label: "Laboratorio",
    icon: FlaskConical,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  vivero: {
    label: "Vivero",
    icon: Sprout,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  siembra: {
    label: "Siembra",
    icon: Leaf,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  cosecha: {
    label: "Cosecha",
    icon: Scissors,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  poscosecha: {
    label: "Poscosecha",
    icon: Package,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  general: {
    label: "General",
    icon: Globe,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
};

const TIPO_CONFIG: Record<TipoInforme, { label: string; icon: React.ElementType; color: string }> =
  {
    tabla: { label: "Tabla", icon: Table2, color: "text-slate-600" },
    grafico: { label: "Gráfico", icon: TrendingUp, color: "text-blue-600" },
    mixto: { label: "Mixto", icon: Layers, color: "text-indigo-600" },
    resumen: { label: "Resumen", icon: FileText, color: "text-rose-600" },
  };

const ESTADO_CONFIG: Record<EstadoInforme, { label: string; icon: React.ElementType; badge: string }> = {
  activo: { label: "Activo", icon: CheckCircle2, badge: "bg-success/10 text-success border-success/25" },
  borrador: { label: "Borrador", icon: Clock, badge: "bg-amber-100 text-amber-700 border-amber-200" },
  archivado: { label: "Archivado", icon: Archive, badge: "bg-muted text-muted-foreground border-border" },
};

const FORMATO_CONFIG: Record<FormatoExport, { label: string; icon: React.ElementType; color: string }> = {
  pdf:   { label: "PDF",   icon: FileBarChart,   color: "text-rose-500" },
  excel: { label: "Excel", icon: FileSpreadsheet, color: "text-green-600" },
  csv:   { label: "CSV",   icon: FileText,        color: "text-slate-500" },
  word:  { label: "Word",  icon: FileType,        color: "text-blue-600" },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  cliente_admin: "Admin",
  productor: "Productor",
  jefe_area: "Jefe de Área",
  supervisor: "Supervisor",
  lector: "Lector",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  iconClass?: string;
}

function NavItem({ icon: Icon, label, count, active, onClick, iconClass }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 flex-shrink-0",
          active ? "text-primary" : (iconClass ?? "text-muted-foreground"),
        )}
      />
      <span className="flex-1 truncate text-xs">{label}</span>
      <span
        className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums",
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── InformeRow ───────────────────────────────────────────────────────────────

interface InformeRowProps {
  informe: Informe;
  canAccess: boolean;
  selected: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onPreview?: () => void;
  onEditBuilder?: () => void;
  onDelete?: () => void;
}

function InformeRow({
  informe,
  canAccess,
  selected,
  canCreate,
  canDelete,
  onClick,
  onToggleFavorite,
  onPreview,
  onEditBuilder,
  onDelete,
}: InformeRowProps) {
  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const estado = ESTADO_CONFIG[informe.estado];
  const CatIcon = cat.icon;
  const TipoIcon = tipo.icon;
  const EstadoIcon = estado.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={cn(
        "group w-full text-left flex items-center gap-3 px-4 py-3 cursor-pointer",
        "border-b border-border last:border-b-0 transition-colors duration-100",
        selected
          ? "bg-primary/5 border-l-[3px] border-l-primary"
          : "hover:bg-muted/40 border-l-[3px] border-l-transparent",
        !canAccess && "opacity-60",
      )}
    >
      {/* Category icon */}
      <div className={cn("p-1.5 rounded-lg border flex-shrink-0", cat.bg, cat.border)}>
        <CatIcon className={cn("w-3.5 h-3.5", cat.color)} />
      </div>

      {/* Main text — title + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-sm font-medium truncate leading-snug", selected && "text-primary")}>
            {informe.nombre}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 flex-shrink-0">
            {informe.codigo}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
          {informe.descripcion}
        </p>
      </div>

      {/* Badges */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
            estado.badge,
          )}
        >
          <EstadoIcon className="w-2.5 h-2.5" />
          {estado.label}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
          <TipoIcon className={cn("w-2.5 h-2.5", tipo.color)} />
          {tipo.label}
        </span>
        {informe.es_programado && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <Zap className="w-2.5 h-2.5" />
            Auto
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="hidden lg:flex flex-col items-end gap-0.5 flex-shrink-0 w-24 text-[10px] text-muted-foreground">
        {!canAccess ? (
          <span className="flex items-center gap-1 text-rose-500">
            <Lock className="w-3 h-3" />
            Restringido
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              {informe.veces_generado}x generado
            </span>
            {informe.ultimo_uso && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(informe.ultimo_uso)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {onPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
            title="Vista previa"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {canCreate && informe.builderConfig && onEditBuilder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditBuilder();
            }}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            title="Editar plantilla"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="p-1.5 rounded-md hover:bg-amber-50 transition-colors flex-shrink-0"
        title={informe.es_favorito ? "Quitar de favoritos" : "Marcar como favorito"}
      >
        <Star
          className={cn(
            "w-3.5 h-3.5 transition-colors",
            informe.es_favorito
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/25 group-hover:text-muted-foreground/50",
          )}
        />
      </button>

      {/* Delete */}
      {canDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
          title="Eliminar informe"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-destructive" />
        </button>
      )}
    </div>
  );
}

// ─── ConfirmDeleteModal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  nombre,
  onConfirm,
  onCancel,
}: {
  nombre: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold">¿Eliminar informe?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Se eliminará <span className="font-semibold text-foreground">«{nombre}»</span> y todas sus versiones e historial de generaciones.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm} className="h-8 text-xs gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── GeneracionRow ───────────────────────────────────────────────────────────

function GeneracionRow({
  gen,
  informeNombre,
  categoriaCfg,
  onClick,
}: {
  gen: InformeGeneracion;
  informeNombre: string;
  categoriaCfg: (typeof CATEGORIA_CONFIG)[CategoriaInforme];
  onClick?: () => void;
}) {
  const CatIcon = categoriaCfg.icon;
  const estadoCfg: Record<EstadoGeneracion, { label: string; color: string; icon: React.ElementType }> = {
    completado: { label: "Completado", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
    error: { label: "Error", color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle },
    procesando: { label: "Procesando", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Loader2 },
  };
  const est = estadoCfg[gen.estado];
  const EstIcon = est.icon;
  const formatoCfg: Record<FormatoExport, { label: string; icon: React.ElementType }> = {
    pdf: { label: "PDF", icon: FileBarChart },
    excel: { label: "Excel", icon: FileSpreadsheet },
    csv: { label: "CSV", icon: FileType },
    word: { label: "Word", icon: FileText },
  };
  const fmt = formatoCfg[gen.formato];
  const FmtIcon = fmt.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className="group w-full text-left flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
    >
      {/* Category icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", categoriaCfg.bg, categoriaCfg.border)}>
        <CatIcon className={cn("w-4 h-4", categoriaCfg.color)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{informeNombre}</span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {gen.usuario} · {new Date(gen.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border", est.color)}>
          <EstIcon className={cn("w-2.5 h-2.5", gen.estado === "procesando" && "animate-spin")} />
          {est.label}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
          <FmtIcon className="w-2.5 h-2.5" />
          {fmt.label}
        </span>
      </div>

      {/* Stats */}
      <div className="hidden lg:flex flex-col items-end gap-0.5 flex-shrink-0 w-20 text-[10px] text-muted-foreground">
        {gen.registros_procesados !== undefined && (
          <span>{gen.registros_procesados} registros</span>
        )}
        {gen.tiempo_ms !== undefined && (
          <span>{(gen.tiempo_ms / 1000).toFixed(1)}s</span>
        )}
      </div>
    </div>
  );
}

// ─── VersionesTabContent ──────────────────────────────────────────────────────

interface VersionesTabContentProps {
  sorted: InformeSnapshot[];
  latestSnap?: InformeSnapshot;
  informe: Informe;
  onRestoreVersion?: (snap: InformeSnapshot) => void;
  onCopyVersionAsNew?: (snap: InformeSnapshot) => void;
  onArchiveVersion?: (snapId: string) => void;
  onDeleteVersion?: (snapId: string) => void;
}

function VersionesTabContent({
  sorted, latestSnap, informe,
  onRestoreVersion, onCopyVersionAsNew, onArchiveVersion, onDeleteVersion,
}: VersionesTabContentProps) {
  const [diffLeftIdx, setDiffLeftIdx]   = useState<number | null>(null);
  const [diffRightIdx, setDiffRightIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSelectForDiff = (idx: number) => {
    if (diffLeftIdx === null) {
      setDiffLeftIdx(idx);
    } else if (diffRightIdx === null && idx !== diffLeftIdx) {
      setDiffRightIdx(idx);
    } else {
      // Reset and start new selection
      setDiffLeftIdx(idx);
      setDiffRightIdx(null);
    }
  };

  const leftSnap  = diffLeftIdx  !== null ? sorted[diffLeftIdx]  : null;
  const rightSnap = diffRightIdx !== null ? sorted[diffRightIdx] : null;

  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const CatIcon = cat.icon;

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="p-3 rounded-full bg-muted/50">
          <GitBranch className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Sin historial de versiones</p>
        <p className="text-xs text-muted-foreground">
          Las versiones se crean automáticamente cada vez que guardas cambios en la plantilla.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Actions bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 flex-1">
          <GitBranch className="w-3 h-3" />
          {sorted.length} versión{sorted.length !== 1 ? "es" : ""}
        </p>
        {sorted.length >= 2 && (
          <button
            onClick={() => { setDiffLeftIdx(1); setDiffRightIdx(0); }}
            className={cn(
              "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors",
              diffLeftIdx !== null ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <ArrowLeftRight className="w-3 h-3" /> Comparar
          </button>
        )}
        <button
          onClick={() => setShowPreview(p => !p)}
          className={cn(
            "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors",
            showPreview ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Eye className="w-3 h-3" /> Vista previa
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className="space-y-2">
        {sorted.map((snap, i) => {
          const isLatest = snap.id === latestSnap?.id;
          const isDiffLeft = diffLeftIdx === i;
          const isDiffRight = diffRightIdx === i;
          const bloqueCount = snap.builderConfig?.bloques?.length ?? 0;

          return (
            <div
              key={snap.id}
              className={cn(
                "rounded-xl border p-3 space-y-1.5 transition-all",
                isLatest ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                isDiffLeft && "ring-2 ring-blue-400/50",
                isDiffRight && "ring-2 ring-green-400/50",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                    isLatest
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  v{snap.version}
                </div>
                {isLatest && (
                  <span className="text-[9px] font-semibold text-primary uppercase tracking-wide">
                    Actual
                  </span>
                )}
                {isDiffLeft && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-bold">A</span>}
                {isDiffRight && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 font-bold">B</span>}
                <span className="flex-1" />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(snap.timestamp).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs font-medium">{snap.cambio}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <User className="w-2.5 h-2.5" />
                {snap.usuario}
                {bloqueCount > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span>{bloqueCount} bloque{bloqueCount !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {diffLeftIdx !== null && (
                  <button
                    onClick={() => handleSelectForDiff(i)}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    <ArrowLeftRight className="w-2.5 h-2.5" /> Diff
                  </button>
                )}
                {!isLatest && snap.builderConfig && onRestoreVersion && (
                  <button
                    onClick={() => onRestoreVersion(snap)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                  </button>
                )}
                {onCopyVersionAsNew && (
                  <button
                    onClick={() => onCopyVersionAsNew(snap)}
                    className="text-[10px] text-violet-600 hover:underline flex items-center gap-0.5"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copiar
                  </button>
                )}
                {!isLatest && onArchiveVersion && (
                  <button
                    onClick={() => onArchiveVersion(snap.id)}
                    className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"
                  >
                    <Archive className="w-2.5 h-2.5" /> Archivar
                  </button>
                )}
                {onDeleteVersion && (
                  <button
                    onClick={() => setConfirmDeleteId(snap.id)}
                    className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-0.5"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Diff panel ── */}
      {leftSnap && rightSnap && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              v{leftSnap.version} ↔ v{rightSnap.version}
            </p>
            <button onClick={() => { setDiffLeftIdx(null); setDiffRightIdx(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Prop diffs */}
          <div className="space-y-1.5 text-[10px]">
            {leftSnap.nombre !== rightSnap.nombre && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold w-16 shrink-0">Nombre</span>
                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded line-through truncate max-w-[100px]">{leftSnap.nombre}</span>
                <span>→</span>
                <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded truncate max-w-[100px]">{rightSnap.nombre}</span>
              </div>
            )}
            {leftSnap.descripcion !== rightSnap.descripcion && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold w-16 shrink-0">Desc.</span>
                <span className="text-amber-600">Descripción modificada</span>
              </div>
            )}
          </div>
          {/* Bloques diff */}
          {leftSnap.builderConfig && rightSnap.builderConfig && (
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-1">
                <p className="font-semibold text-blue-700 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[8px] font-bold">A</span>
                  v{leftSnap.version} — {leftSnap.builderConfig.bloques.length} bloques
                </p>
                {leftSnap.builderConfig.bloques.map(b => (
                  <div key={b.id} className="flex items-center gap-1 text-muted-foreground">
                    {b.tipo === "grafico" ? <BarChart2 className="w-2.5 h-2.5" /> : <Table2 className="w-2.5 h-2.5" />}
                    <span className="truncate">{b.titulo || b.tipo}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-green-700 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-[8px] font-bold">B</span>
                  v{rightSnap.version} — {rightSnap.builderConfig.bloques.length} bloques
                </p>
                {rightSnap.builderConfig.bloques.map(b => (
                  <div key={b.id} className="flex items-center gap-1 text-muted-foreground">
                    {b.tipo === "grafico" ? <BarChart2 className="w-2.5 h-2.5" /> : <Table2 className="w-2.5 h-2.5" />}
                    <span className="truncate">{b.titulo || b.tipo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Document Preview ── */}
      {showPreview && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              Vista previa — {informe.nombre}
            </h4>
            <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-border">
              <div className={cn("inline-flex p-2 rounded-xl border mb-2", cat.bg, cat.border)}>
                <CatIcon className={cn("w-5 h-5", cat.color)} />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Informe</p>
              <h3 className="text-base font-bold text-foreground">{informe.nombre}</h3>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{informe.codigo}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">Categoría</span>
                <span className={cn("font-medium", cat.color)}>{cat.label}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">{tipo.label}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">Estado</span>
                <span className="font-medium">{ESTADO_CONFIG[informe.estado].label}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-muted-foreground">Generado</span>
                <span className="font-medium">{informe.veces_generado}x</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Descripción</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{informe.descripcion}</p>
            </div>

            {/* Fuentes */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Fuentes de datos ({informe.fuentes.length})</p>
              <div className="flex flex-wrap gap-1">
                {informe.fuentes.map(f => (
                  <span key={f} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Schedule */}
            {informe.es_programado && (
              <div className="text-[10px] bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center gap-2">
                <Zap className="w-3 h-3 text-blue-600 shrink-0" />
                Programado: {informe.frecuencia_programacion} {informe.hora_envio ? `a las ${informe.hora_envio}` : ""}
              </div>
            )}

            {/* Versions summary */}
            <div className="pt-2 border-t border-dashed border-border text-center text-[10px] text-muted-foreground">
              {sorted.length} versión{sorted.length !== 1 ? "es" : ""}
              {informe.ultimo_uso ? ` · Último uso: ${formatDate(informe.ultimo_uso)}` : ""}
              {informe.created_at ? ` · Creado: ${formatDate(informe.created_at)}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete overlay ── */}
      {confirmDeleteId && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-xs font-semibold">¿Eliminar esta versión?</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Esta acción no se puede deshacer.</p>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1 text-[10px] rounded-md border border-border hover:bg-muted">Cancelar</button>
            <button
              onClick={() => { onDeleteVersion?.(confirmDeleteId); setConfirmDeleteId(null); }}
              className="px-3 py-1 text-[10px] rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-3 h-3 inline mr-1" /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

interface DetailPanelProps {
  informe: Informe;
  generaciones: InformeGeneracion[];
  canAccess: boolean;
  canExport: boolean;
  canCreate: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onConfigure: () => void;
  onUpdateSchedule?: (changes: Partial<Pick<Informe, "es_programado" | "frecuencia_programacion" | "hora_envio" | "destinatarios_programados" | "formato_preferido">>) => void;
  onDeleteTemplate?: () => void;
  onRestoreVersion?: (snap: InformeSnapshot) => void;
  onCopyVersionAsNew?: (snap: InformeSnapshot) => void;
  onArchiveVersion?: (snapId: string) => void;
  onDeleteVersion?: (snapId: string) => void;
}

function DetailPanel({
  informe,
  generaciones,
  canAccess,
  canExport,
  canCreate,
  onToggleFavorite,
  onClose,
  onConfigure,
  onUpdateSchedule,
  onDeleteTemplate,
  onRestoreVersion,
  onCopyVersionAsNew,
  onArchiveVersion,
  onDeleteVersion,
}: DetailPanelProps) {
  const [tab, setTab] = useState("info");
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [formato, setFormato] = useState<FormatoExport>("excel");
  const [fechaDesde, setFechaDesde] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [generando, setGenerando] = useState(false);
  const [generacionOk, setGeneracionOk] = useState(false);

  // ── Filtros avanzados ──────────────────────────────────────────────────────
  const [granularidad, setGranularidad] = useState<"dia" | "semana" | "mes" | "trimestre" | "año">("mes");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("todos");
  const [productorSeleccionado, setProductorSeleccionado] = useState<string>("todos");
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState<string>("todos");
  const [definicionesSeleccionadas, setDefinicionesSeleccionadas] = useState<string[]>([]);

  // ── Filtros jerárquicos del cultivo seleccionado ──────────────────────────────
  // Selección EXCLUSIVA: solo UN nivel a la vez puede filtrarse
  const [nivelEstructuraActivo, setNivelEstructuraActivo] = useState<string | null>(null);
  const [valorEstructuraActivo, setValorEstructuraActivo] = useState<string>("todos");
  // Derivado: estructuraFiltros solo contiene el nivel activo si tiene valor real
  const estructuraFiltros: Record<string, string> = useMemo(() => {
    if (!nivelEstructuraActivo || valorEstructuraActivo === "todos") return {};
    return { [nivelEstructuraActivo]: valorEstructuraActivo };
  }, [nivelEstructuraActivo, valorEstructuraActivo]);

  // ── Estados para granularidades específicas ───────────────────────────────────
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [añoSeleccionado, setAñoSeleccionado] = useState(currentYear);
  const [mesSeleccionado, setMesSeleccionado] = useState(currentMonth);
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(Math.ceil(currentMonth / 3));

  // Scheduling state
  const [schedEnabled, setSchedEnabled] = useState(informe.es_programado);
  const [schedFrecuencia, setSchedFrecuencia] = useState<"diaria" | "semanal" | "mensual">(
    informe.frecuencia_programacion ?? "semanal",
  );
  const [schedHora, setSchedHora] = useState(informe.hora_envio ?? "08:00");
  const [schedDestinatarios, setSchedDestinatarios] = useState<string[]>(
    informe.destinatarios_programados ?? [],
  );
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const { users, currentUser, clientes, productores } = useRole();
  const { cultivos, definiciones } = useConfig();
  const [schedFormato, setSchedFormato] = useState<FormatoExport>(informe.formato_preferido ?? "pdf");
  const [schedSaved, setSchedSaved] = useState(false);

  // ── Lógica de filtrado jerárquico contextual por roles ────────────────────

  // Cliente efectivo para filtros/exportación: cliente_admin siempre queda fijado a su empresa.
  const clienteSeleccionadoEfectivo = useMemo(() => {
    if (currentUser?.role === "cliente_admin" && currentUser.clienteId !== undefined) {
      return String(currentUser.clienteId);
    }
    return clienteSeleccionado;
  }, [currentUser, clienteSeleccionado]);

  // Auto-configurar filtros según el rol del usuario
  useEffect(() => {
    if (!currentUser) return;

    // Para cliente_admin: fijar SIEMPRE su cliente (hard lock, evita override manual)
    if (currentUser.role === "cliente_admin") {
      const ownClienteId = String(currentUser.clienteId);
      if (clienteSeleccionado !== ownClienteId) {
        setClienteSeleccionado(ownClienteId);
      }
    }

    // Para productor: auto-seleccionar su cliente y productor
    if (currentUser.role === "productor") {
      if (clienteSeleccionado === "todos") {
        setClienteSeleccionado(String(currentUser.clienteId));
      }
      if (productorSeleccionado === "todos" && currentUser.productorId) {
        setProductorSeleccionado(currentUser.productorId);
      }
    }
  }, [currentUser, clienteSeleccionado, productorSeleccionado]);

  const getProductorClienteId = (p: any): number | undefined => p?.clienteId ?? p?.cliente_id;

  const productoresFiltrados = useMemo(() => {
    if (clienteSeleccionadoEfectivo === "todos") return productores;
    const clienteId = parseInt(clienteSeleccionadoEfectivo, 10);
    return productores.filter(p => getProductorClienteId(p) === clienteId);
  }, [clienteSeleccionadoEfectivo, productores]);

  // Productores disponibles según el rol
  const productoresDisponibles = useMemo(() => {
    if (!currentUser) return [];

    // Super admin ve todos los productores filtrados por cliente seleccionado
    if (currentUser.role === "super_admin") {
      return productoresFiltrados;
    }

    // Cliente admin ve solo productores de su empresa
    if (currentUser.role === "cliente_admin") {
      return productores.filter(p => getProductorClienteId(p) === currentUser.clienteId);
    }

    // Productor no ve selector de productores (solo el suyo)
    return [];
  }, [currentUser, productoresFiltrados, productores]);

  // Cultivos disponibles según permisos del usuario
  const cultivosDisponibles = useMemo(() => {
    if (!currentUser) return [];

    // Super admin y cliente_admin ven todos los cultivos
    if (currentUser.role === "super_admin" || currentUser.role === "cliente_admin") {
      return cultivos;
    }

    // Productor ve solo cultivos de su área/permisos
    // TODO: filtrar por cultivos habilitados para el productor
    return cultivos; // Por ahora todos, pero aquí se debería filtrar por permisos
  }, [currentUser, cultivos]);

  // Obtener estructura jerárquica del cultivo seleccionado
  const estructuraCultivoSeleccionado = useMemo(() => {
    if (cultivoSeleccionado === "todos") return [];
    const cultivo = cultivosDisponibles.find(c => c.id === cultivoSeleccionado);
    return cultivo?.estructura?.filter(e => e.activo) ?? [];
  }, [cultivoSeleccionado, cultivosDisponibles]);

  // Resetear filtros de estructura cuando cambia el cultivo
  useEffect(() => {
    setNivelEstructuraActivo(null);
    setValorEstructuraActivo("todos");
  }, [cultivoSeleccionado]);

  // Resetear productor si cambia cliente
  useEffect(() => {
    if (clienteSeleccionadoEfectivo !== "todos") {
      const productoExists = productoresDisponibles.some(p => p.id === productorSeleccionado);
      if (!productoExists) setProductorSeleccionado("todos");
    }
  }, [clienteSeleccionadoEfectivo, productoresDisponibles, productorSeleccionado]);

  // Definiciones relacionadas con la categoría del informe
  const definicionesDisponibles = useMemo(() => {
    // Mapeo de categoría de informe a módulo
    const categoriaAModulo: Record<CategoriaInforme, string> = {
      laboratorio: "laboratorio",
      vivero: "vivero",
      siembra: "siembra",
      cosecha: "cosecha",
      poscosecha: "poscosecha",
      general: "general",
    };
    const moduloKey = categoriaAModulo[informe.categoria];
    return definiciones.filter(d =>
      d.modulo === moduloKey &&
      d.estado === "activo" &&
      d.tipo_formulario !== "evento"
    );
  }, [definiciones, informe.categoria]);

  // Indicador de filtros activos (diferentes a los valores por defecto)
  const hayFiltrosActivos = useMemo(() => {
    // Para roles restringidos, no considerar como "activo" si están auto-configurados
    const clienteEsActivo = currentUser?.role === "super_admin" && clienteSeleccionado !== "todos";
    const productorEsActivo = (currentUser?.role === "super_admin" || currentUser?.role === "cliente_admin") && productorSeleccionado !== "todos";

    // Verificar si hay filtros de estructura jerárquica activos
    const hayEstructuraActiva = Object.values(estructuraFiltros).some(valor => valor !== "todos" && valor !== "");

    return (
      granularidad !== "mes" ||
      clienteEsActivo ||
      productorEsActivo ||
      cultivoSeleccionado !== "todos" ||
      definicionesSeleccionadas.length > 0 ||
      hayEstructuraActiva
    );
  }, [granularidad, clienteSeleccionado, productorSeleccionado, cultivoSeleccionado, definicionesSeleccionadas, estructuraFiltros, currentUser]);

  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const estado = ESTADO_CONFIG[informe.estado];
  const CatIcon = cat.icon;
  const TipoIcon = tipo.icon;
  const EstadoIcon = estado.icon;

  const historiales = generaciones.filter((g) => g.informe_id === informe.id);

  const handleGenerar = () => {
    if (!canExport) return;

    // Construir período adaptativo según granularidad
    let periodo: any = { granularidad };
    if (granularidad === "dia" || granularidad === "semana") {
      periodo.desde = fechaDesde;
      periodo.hasta = fechaHasta;
    } else if (granularidad === "mes") {
      periodo.mes = mesSeleccionado;
      periodo.año = añoSeleccionado;
    } else if (granularidad === "trimestre") {
      periodo.trimestre = trimestreSeleccionado;
      periodo.año = añoSeleccionado;
    } else {
      periodo.año = añoSeleccionado;
    }

    // Construir objeto de filtros aplicados
    const filtrosAplicados = {
      formato,
      periodo,
      organizacion: {
        clienteId: clienteSeleccionadoEfectivo !== "todos" ? clienteSeleccionadoEfectivo : null,
        productorId: productorSeleccionado !== "todos" ? productorSeleccionado : null,
      },
      cultivoId: cultivoSeleccionado !== "todos" ? cultivoSeleccionado : null,
      definiciones: definicionesSeleccionadas.length > 0 ? definicionesSeleccionadas : null,
      // Incluir filtros jerárquicos del cultivo
      estructuraJerarquica: Object.keys(estructuraFiltros).length > 0 ? estructuraFiltros : null,
    };

    console.log("📊 Generando informe con filtros:", filtrosAplicados);

    // TODO: Aquí se debería llamar al servicio real de generación de informes
    // Ejemplo: await generarInforme(informe.id, filtrosAplicados);

    setGenerando(true);
    setGeneracionOk(false);
    setTimeout(() => {
      setGenerando(false);
      setGeneracionOk(true);
      setTimeout(() => setGeneracionOk(false), 4000);
    }, 2200);
  };

  const handleGuardarSchedule = () => {
    // Construir filtros para el envío automático (mismos que se usan en generar)
    let filtrosAutomaticos = undefined;
    if (schedEnabled) {
      // Construir período adaptativo según granularidad
      let periodo: any = { granularidad };
      if (granularidad === "dia" || granularidad === "semana") {
        periodo.desde = fechaDesde;
        periodo.hasta = fechaHasta;
      } else if (granularidad === "mes") {
        periodo.mes = mesSeleccionado;
        periodo.año = añoSeleccionado;
      } else if (granularidad === "trimestre") {
        periodo.trimestre = trimestreSeleccionado;
        periodo.año = añoSeleccionado;
      } else {
        periodo.año = añoSeleccionado;
      }

      filtrosAutomaticos = {
        periodo,
        organizacion: {
          clienteId: clienteSeleccionadoEfectivo !== "todos" ? clienteSeleccionadoEfectivo : null,
          productorId: productorSeleccionado !== "todos" ? productorSeleccionado : null,
        },
        cultivoId: cultivoSeleccionado !== "todos" ? cultivoSeleccionado : null,
        definiciones: definicionesSeleccionadas.length > 0 ? definicionesSeleccionadas : null,
        // Incluir filtros jerárquicos del cultivo
        estructuraJerarquica: Object.keys(estructuraFiltros).length > 0 ? estructuraFiltros : null,
      };
    }

    onUpdateSchedule?.({
      es_programado: schedEnabled,
      frecuencia_programacion: schedEnabled ? schedFrecuencia : undefined,
      hora_envio: schedEnabled ? schedHora : undefined,
      destinatarios_programados: schedEnabled ? schedDestinatarios : [],
      formato_preferido: schedEnabled ? schedFormato : undefined,
      // Incluir filtros configurados
      filtros_automaticos: filtrosAutomaticos,
    });

    if (schedEnabled) {
      console.log("🤖 Configuración de envío automático guardada:", {
        frecuencia: schedFrecuencia,
        hora: schedHora,
        formato: schedFormato,
        destinatarios: schedDestinatarios.length,
        filtros: filtrosAutomaticos,
      });
    }

    setSchedSaved(true);
    setTimeout(() => setSchedSaved(false), 2500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl border", cat.bg, cat.border)}>
              <CatIcon className={cn("w-5 h-5", cat.color)} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                  {informe.codigo}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                    estado.badge,
                  )}
                >
                  <EstadoIcon className="w-2.5 h-2.5" />
                  {estado.label}
                </span>
              </div>
              <h2 className="font-semibold text-sm mt-0.5 leading-snug">{informe.nombre}</h2>
            </div>
          </div>
          <button
            onClick={onToggleFavorite}
            className={cn(
              "p-1.5 rounded-lg border transition-all flex-shrink-0",
              informe.es_favorito
                ? "bg-amber-50 border-amber-200 text-amber-500"
                : "border-border text-muted-foreground hover:border-amber-200 hover:text-amber-400",
            )}
            title={informe.es_favorito ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Star className={cn("w-4 h-4", informe.es_favorito && "fill-amber-400")} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
              cat.bg,
              cat.border,
              cat.color,
            )}
          >
            <CatIcon className="w-3 h-3" />
            {cat.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
            <TipoIcon className={cn("w-3 h-3", tipo.color)} />
            {tipo.label}
          </span>
          {informe.es_programado && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600">
              <Zap className="w-3 h-3" />
              Auto · {informe.frecuencia_programacion}
            </span>
          )}
          {!canAccess && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-500">
              <Lock className="w-3 h-3" />
              Acceso restringido
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="mx-4 mt-3 mb-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <TabsList className="bg-muted h-8 p-0.5 rounded-lg shrink-0">
            <TabsTrigger value="info" className="text-xs gap-1.5 h-7 rounded-md">
              <Info className="w-3 h-3" /> Info
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs gap-1.5 h-7 rounded-md relative">
              <Sliders className="w-3 h-3" /> Config
              {hayFiltrosActivos && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="generar"
              className="text-xs gap-1.5 h-7 rounded-md"
              disabled={!canAccess}
            >
              <Play className="w-3 h-3" /> Generar
            </TabsTrigger>
            <TabsTrigger value="historial" className="text-xs gap-1.5 h-7 rounded-md">
              <History className="w-3 h-3" />
              Historial
              {historiales.length > 0 && (
                <span className="ml-0.5 text-[9px] bg-primary/10 text-primary px-1 py-px rounded-full">
                  {historiales.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="programar" className="text-xs gap-1.5 h-7 rounded-md">
              <Calendar className="w-3 h-3" />
              Auto
              {informe.es_programado && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="versiones" className="text-xs gap-1.5 h-7 rounded-md">
              <GitBranch className="w-3 h-3" />
              Versiones
              {informe.versiones && informe.versiones.length > 0 && (
                <span className="ml-0.5 text-[9px] bg-primary/10 text-primary px-1 py-px rounded-full">
                  {informe.versiones.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          {canCreate && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onConfigure}
                title="Editar configuración del informe"
                className="h-8 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Editar
              </button>
              {informe.builderConfig && onDeleteTemplate && (
                <button
                  onClick={onDeleteTemplate}
                  title="Eliminar plantilla"
                  className="h-8 px-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-all flex items-center gap-1 text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* INFO */}
        <TabsContent
          value="info"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0"
        >
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Descripción
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{informe.descripcion}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Generaciones totales</p>
              <p className="text-xl font-bold">{informe.veces_generado}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Último uso</p>
              <p className="text-sm font-semibold">
                {informe.ultimo_uso ? formatDate(informe.ultimo_uso) : "—"}
              </p>
            </div>
          </div>

          {/* Access control */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Control de acceso
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border">
                <span className="text-muted-foreground">Nivel mínimo requerido</span>
                <span className="font-semibold">Nv{informe.nivel_acceso_minimo}+</span>
              </div>
              {informe.roles_permitidos && informe.roles_permitidos.length > 0 && (
                <div className="py-1.5 border-b border-dashed border-border">
                  <p className="text-muted-foreground mb-1.5">Roles permitidos</p>
                  <div className="flex flex-wrap gap-1">
                    {informe.roles_permitidos.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Fuentes de datos
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {informe.fuentes.map((f) => (
                <span
                  key={f}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground/60 pt-1">
            Creado el {formatDate(informe.created_at)}
          </div>
        </TabsContent>

        {/* CONFIG */}
        <TabsContent
          value="config"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0"
        >
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <Sliders className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900">Configuración de filtros</p>
              <p className="text-[10px] text-blue-700 mt-0.5">
                Estos filtros se aplicarán tanto para la generación manual como para los envíos automáticos programados.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Período - adaptativo según granularidad */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Período
                <span className="ml-1 text-[9px] normal-case text-primary font-normal">
                  ({granularidad})
                </span>
              </Label>

              {granularidad === "dia" || granularidad === "semana" ? (
                // Fechas específicas para día y semana
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full h-8 text-xs px-2 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full h-8 text-xs px-2 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : granularidad === "mes" ? (
                // Selector de mes/año
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Mes</label>
                    <Select value={String(mesSeleccionado)} onValueChange={(v) => setMesSeleccionado(parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Enero</SelectItem>
                        <SelectItem value="2">Febrero</SelectItem>
                        <SelectItem value="3">Marzo</SelectItem>
                        <SelectItem value="4">Abril</SelectItem>
                        <SelectItem value="5">Mayo</SelectItem>
                        <SelectItem value="6">Junio</SelectItem>
                        <SelectItem value="7">Julio</SelectItem>
                        <SelectItem value="8">Agosto</SelectItem>
                        <SelectItem value="9">Septiembre</SelectItem>
                        <SelectItem value="10">Octubre</SelectItem>
                        <SelectItem value="11">Noviembre</SelectItem>
                        <SelectItem value="12">Diciembre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Año</label>
                    <Select value={String(añoSeleccionado)} onValueChange={(v) => setAñoSeleccionado(parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : granularidad === "trimestre" ? (
                // Selector de trimestre/año
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Trimestre</label>
                    <Select value={String(trimestreSeleccionado)} onValueChange={(v) => setTrimestreSeleccionado(parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1 (Ene-Mar)</SelectItem>
                        <SelectItem value="2">Q2 (Abr-Jun)</SelectItem>
                        <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                        <SelectItem value="4">Q4 (Oct-Dic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Año</label>
                    <Select value={String(añoSeleccionado)} onValueChange={(v) => setAñoSeleccionado(parseInt(v))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                // Solo selector de año
                <div className="w-1/2">
                  <label className="text-[10px] text-muted-foreground mb-1 block">Año</label>
                  <Select value={String(añoSeleccionado)} onValueChange={(v) => setAñoSeleccionado(parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Granularidad temporal */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Granularidad
              </Label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["dia", "semana", "mes", "trimestre", "año"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularidad(g)}
                    className={cn(
                      "py-2 px-1 rounded-md border text-[10px] font-medium transition-all",
                      granularidad === g
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Estructura jerárquica - contextual por rol */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Filtros de organización
                <span className="ml-1 text-[9px] normal-case text-primary font-normal">
                  ({currentUser?.role === "super_admin" ? "completo" :
                    currentUser?.role === "cliente_admin" ? "empresa" : "personal"})
                </span>
              </Label>

              {/* Cliente - Solo para super_admin */}
              {currentUser?.role === "super_admin" && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Cliente</label>
                  <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos los clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los clientes</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Info para cliente_admin */}
              {currentUser?.role === "cliente_admin" && (
                <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
                  <p className="text-[10px] font-medium text-blue-800">
                    📊 Datos filtrados por tu empresa: {clientes.find(c => c.id === currentUser.clienteId)?.nombre}
                  </p>
                </div>
              )}

              {/* Productor - Para super_admin y cliente_admin */}
              {(currentUser?.role === "super_admin" || currentUser?.role === "cliente_admin") && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">
                    Productor
                    {currentUser?.role === "super_admin" && clienteSeleccionado !== "todos" && (
                      <span className="ml-1 text-[9px] text-primary">(filtrado por cliente)</span>
                    )}
                    {currentUser?.role === "cliente_admin" && (
                      <span className="ml-1 text-[9px] text-blue-600">(tu empresa)</span>
                    )}
                  </label>
                  <Select
                    value={productorSeleccionado}
                    onValueChange={setProductorSeleccionado}
                    disabled={productoresDisponibles.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos los productores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los productores</SelectItem>
                      {productoresDisponibles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Info para productor */}
              {currentUser?.role === "productor" && (
                <div className="p-2 rounded-md bg-green-50 border border-green-200">
                  <p className="text-[10px] font-medium text-green-800">
                    🌱 Datos filtrados por tu área: {productores.find(p => p.id === currentUser.productorId)?.nombre}
                  </p>
                </div>
              )}

              {/* Cultivo - Para todos, pero filtrado según permisos */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Cultivo
                  {currentUser?.role === "productor" && (
                    <span className="ml-1 text-[9px] text-green-600">(habilitados)</span>
                  )}
                </label>
                <Select value={cultivoSeleccionado} onValueChange={setCultivoSeleccionado}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos los cultivos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los cultivos</SelectItem>
                    {cultivosDisponibles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estructura jerárquica del cultivo seleccionado — selección exclusiva por nivel */}
            {estructuraCultivoSeleccionado.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Estructura del cultivo
                    <span className="ml-1 text-[9px] normal-case text-green-600 font-normal">
                      ({cultivosDisponibles.find(c => c.id === cultivoSeleccionado)?.nombre})
                    </span>
                  </Label>
                  {nivelEstructuraActivo && (
                    <button
                      onClick={() => { setNivelEstructuraActivo(null); setValorEstructuraActivo("todos"); }}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
                    >
                      <X className="w-2.5 h-2.5" /> Quitar
                    </button>
                  )}
                </div>

                {/* Pills exclusivos — uno solo a la vez */}
                <div className="flex gap-1.5 flex-wrap">
                  {estructuraCultivoSeleccionado
                    .sort((a, b) => a.nivel - b.nivel)
                    .filter(e => e && e.label)
                    .map((nivelEstructura) => {
                      const nivelKey = `nivel_${nivelEstructura.nivel}`;
                      const isActive = nivelEstructuraActivo === nivelKey;
                      return (
                        <button
                          key={nivelKey}
                          onClick={() => {
                            if (isActive) {
                              setNivelEstructuraActivo(null);
                              setValorEstructuraActivo("todos");
                            } else {
                              setNivelEstructuraActivo(nivelKey);
                              setValorEstructuraActivo("todos");
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {nivelEstructura.label}
                          <span className={cn("text-[9px]", isActive ? "opacity-70" : "opacity-40")}>
                            niv.{nivelEstructura.nivel}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Dropdown del nivel activo */}
                {nivelEstructuraActivo && (() => {
                  const nivelNumero = nivelEstructuraActivo.replace("nivel_", "");
                  const nivelEstructura = estructuraCultivoSeleccionado.find(e => String(e.nivel) === nivelNumero);
                  if (!nivelEstructura) return null;
                  const nombreNivel = nivelEstructura.label.toLowerCase();
                  return (
                    <Select value={valorEstructuraActivo} onValueChange={setValorEstructuraActivo}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={`Filtrar por ${nombreNivel}…`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los {nombreNivel}s</SelectItem>
                        {/* TODO: cargar opciones reales del cultivo */}
                        <SelectItem value="ejemplo_1">Ejemplo 1</SelectItem>
                        <SelectItem value="ejemplo_2">Ejemplo 2</SelectItem>
                        <SelectItem value="ejemplo_3">Ejemplo 3</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                })()}

                {/* Jerarquía configurada */}
                <div className="p-2 rounded-md bg-green-50 border border-green-200">
                  <p className="text-[10px] font-medium text-green-800 mb-1">
                    🏗️ Jerarquía configurada:
                  </p>
                  <p className="text-[9px] text-green-700">
                    {estructuraCultivoSeleccionado
                      .sort((a, b) => a.nivel - b.nivel)
                      .filter(e => e && e.label)
                      .map(e => e.label)
                      .join(" → ")}
                  </p>
                </div>
              </div>
            )}

            {/* Formularios/Definiciones específicas */}
            {definicionesDisponibles.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Formularios incluidos
                  <span className="ml-1 text-[9px] normal-case text-primary font-normal">
                    ({informe.categoria})
                  </span>
                </Label>
                <div className="space-y-1 max-h-32 overflow-y-auto p-2 rounded-md border border-border bg-muted/20">
                  <button
                    onClick={() => setDefinicionesSeleccionadas([])}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-left transition-colors",
                      definicionesSeleccionadas.length === 0
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                      definicionesSeleccionadas.length === 0
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}>
                      {definicionesSeleccionadas.length === 0 && (
                        <Check className="w-2 h-2 text-white" />
                      )}
                    </div>
                    Todos los formularios
                  </button>
                  {definicionesDisponibles.map((def) => {
                    const isSelected = definicionesSeleccionadas.includes(def.id);
                    return (
                      <button
                        key={def.id}
                        onClick={() => {
                          setDefinicionesSeleccionadas(prev => {
                            // Si hay selección múltiple, toggle
                            if (prev.length > 0) {
                              if (isSelected) {
                                return prev.filter(id => id !== def.id);
                              } else {
                                return [...prev, def.id];
                              }
                            }
                            // Si no hay selección (todos), crear selección excluyendo este
                            return definicionesDisponibles
                              .filter(d => d.id !== def.id)
                              .map(d => d.id);
                          });
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-left transition-colors",
                          isSelected || definicionesSeleccionadas.length === 0
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                          isSelected || definicionesSeleccionadas.length === 0
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}>
                          {(isSelected || definicionesSeleccionadas.length === 0) && (
                            <Check className="w-2 h-2 text-white" />
                          )}
                        </div>
                        {def.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary de filtros activos - contextual por rol */}
          {hayFiltrosActivos && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] font-semibold text-primary mb-1.5">Filtros activos:</p>
              <div className="flex flex-wrap gap-1">
                {/* Mostrar período según granularidad */}
                {granularidad === "dia" || granularidad === "semana" ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    📅 {granularidad}: {fechaDesde} → {fechaHasta}
                  </span>
                ) : granularidad === "mes" ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    📅 {["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][mesSeleccionado]} {añoSeleccionado}
                  </span>
                ) : granularidad === "trimestre" ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    📅 Q{trimestreSeleccionado} {añoSeleccionado}
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    📅 {añoSeleccionado}
                  </span>
                )}
                {/* Solo mostrar cliente si es super_admin y tiene selección */}
                {currentUser?.role === "super_admin" && clienteSeleccionado !== "todos" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    🏢 {clientes.find(c => String(c.id) === clienteSeleccionado)?.nombre}
                  </span>
                )}
                {/* Solo mostrar productor si puede seleccionarlo y tiene selección */}
                {(currentUser?.role === "super_admin" || currentUser?.role === "cliente_admin") &&
                 productorSeleccionado !== "todos" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    👤 {productoresDisponibles.find(p => p.id === productorSeleccionado)?.nombre}
                  </span>
                )}
                {cultivoSeleccionado !== "todos" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    🌱 {cultivosDisponibles.find(c => c.id === cultivoSeleccionado)?.nombre}
                  </span>
                )}
                {definicionesSeleccionadas.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    📋 {definicionesSeleccionadas.length} formulario(s)
                  </span>
                )}
                {/* Mostrar filtros de estructura jerárquica activos */}
                {Object.entries(estructuraFiltros).map(([nivelKey, valor]) => {
                  if (valor === "todos" || valor === "") return null;

                  const nivelNumero = nivelKey.replace("nivel_", "");
                  const nivelEstructura = estructuraCultivoSeleccionado.find(e => String(e.nivel) === nivelNumero);
                  const nombreNivel = nivelEstructura?.label || `Nivel ${nivelNumero}`;

                  return (
                    <span
                      key={nivelKey}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      🏗️ {nombreNivel}: {valor}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* GENERAR */}
        <TabsContent
          value="generar"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0"
        >
          {!canAccess ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="p-3 rounded-full bg-rose-50 border border-rose-100">
                <Lock className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Sin acceso</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este informe requiere nivel {informe.nivel_acceso_minimo}+ para generarse.
                </p>
              </div>
            </div>
          ) : !canExport ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="p-3 rounded-full bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Sin permiso de exportar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu rol no incluye la acción "exportar". Contacta a tu administrador para
                  habilitar este permiso.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Referencia a configuración de filtros */}
              {hayFiltrosActivos && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Sliders className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900">Filtros configurados</p>
                    <p className="text-[10px] text-blue-700">
                      Se aplicarán los filtros definidos en la pestaña Config.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("config")}
                    className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
                  >
                    Ver config
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Formato de salida
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["excel", "pdf", "word", "csv"] as FormatoExport[]).map((f) => {
                      const fc = FORMATO_CONFIG[f];
                      const FIcon = fc.icon;
                      return (
                        <button
                          key={f}
                          onClick={() => setFormato(f)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all",
                            formato === f
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary/30",
                          )}
                        >
                          <FIcon className={cn("w-5 h-5", formato === f ? "text-primary" : fc.color)} />
                          {fc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!hayFiltrosActivos && (
                <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground">Sin filtros configurados</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    El informe incluirá todos los datos disponibles. Configura filtros específicos para acotar los resultados.
                  </p>
                  <button
                    onClick={() => setTab("config")}
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Configurar filtros
                  </button>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleGenerar}
                  disabled={generando}
                  className="w-full gap-2"
                  size="sm"
                >
                  {generando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generando…
                    </>
                  ) : generacionOk ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> ¡Informe generado!
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Generar informe
                    </>
                  )}
                </Button>
                {generacionOk && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Download className="w-3.5 h-3.5" />
                      Descargar {FORMATO_CONFIG[formato].label}
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground/60 text-center">
                Los resultados se registran automáticamente en el historial.
              </p>

              {canCreate && (
                <button
                  onClick={() => setTab("programar")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs text-muted-foreground hover:text-blue-600"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">
                    {informe.es_programado
                      ? `Programado · ${informe.frecuencia_programacion} a las ${informe.hora_envio ?? "08:00"}`
                      : "Configurar envío automático…"}
                  </span>
                  {informe.es_programado && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              )}
            </>
          )}
        </TabsContent>

        {/* HISTORIAL */}
        <TabsContent
          value="historial"
          className="flex-1 overflow-y-auto px-4 py-3 mt-0"
        >
          {historiales.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <History className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin generaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historiales.map((g) => {
                const fc = FORMATO_CONFIG[g.formato];
                const FIcon = fc.icon;
                const isError = g.estado === "error";
                return (
                  <div
                    key={g.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      isError
                        ? "bg-rose-50/50 border-rose-200"
                        : "bg-card border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 p-1.5 rounded-md",
                        isError ? "bg-rose-100" : "bg-muted",
                      )}
                    >
                      <FIcon
                        className={cn("w-3.5 h-3.5", isError ? "text-rose-500" : fc.color)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{g.usuario}</span>
                        <span
                          className={cn(
                            "text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                            isError
                              ? "bg-rose-100 text-rose-600"
                              : "bg-success/10 text-success",
                          )}
                        >
                          {isError ? "Error" : "OK"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateTime(g.fecha)}
                      </p>
                      {!isError && (
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>{g.registros_procesados?.toLocaleString()} registros</span>
                          {g.tiempo_ms && <span>{formatMs(g.tiempo_ms)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PROGRAMAR */}
        <TabsContent
          value="programar"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 mt-0"
        >
          {!canCreate ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="p-3 rounded-full bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium">Sin permiso de configurar</p>
              <p className="text-xs text-muted-foreground">Solo administradores pueden programar envíos automáticos.</p>
            </div>
          ) : (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", schedEnabled ? "bg-blue-100" : "bg-muted")}>
                    <Zap className={cn("w-3.5 h-3.5", schedEnabled ? "text-blue-600" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Envío automático</p>
                    <p className="text-[10px] text-muted-foreground">
                      {schedEnabled ? "Activo" : "Desactivado"}
                    </p>
                  </div>
                </div>
                <Switch checked={schedEnabled} onCheckedChange={setSchedEnabled} />
              </div>

              {/* Filtros aplicados */}
              {hayFiltrosActivos ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Sliders className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900">Filtros configurados</p>
                    <p className="text-[10px] text-blue-700">
                      Los envíos automáticos usarán los filtros de la pestaña Config.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("config")}
                    className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
                  >
                    Ver config
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/20">
                  <Sliders className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Sin filtros configurados</p>
                    <p className="text-[10px] text-muted-foreground">
                      Los envíos automáticos incluirán todos los datos disponibles.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("config")}
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Configurar
                  </button>
                </div>
              )}

              {/* Config fields */}
              <div className={cn("space-y-3 transition-opacity", !schedEnabled && "opacity-40 pointer-events-none")}>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Frecuencia
                  </Label>
                  <Select
                    value={schedFrecuencia}
                    onValueChange={(v) => setSchedFrecuencia(v as "diaria" | "semanal" | "mensual")}
                    disabled={!schedEnabled}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diaria</SelectItem>
                      <SelectItem value="semanal">Semanal (lunes)</SelectItem>
                      <SelectItem value="mensual">Mensual (día 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Hora de envío
                    </Label>
                    <input
                      type="time"
                      value={schedHora}
                      onChange={(e) => setSchedHora(e.target.value)}
                      disabled={!schedEnabled}
                      className="w-full h-9 text-xs px-2 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Formato
                    </Label>
                    <Select
                      value={schedFormato}
                      onValueChange={(v) => setSchedFormato(v as FormatoExport)}
                      disabled={!schedEnabled}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["pdf", "excel", "word", "csv"] as FormatoExport[]).map((f) => {
                          const fc = FORMATO_CONFIG[f];
                          const FIcon = fc.icon;
                          return (
                            <SelectItem key={f} value={f}>
                              <span className="flex items-center gap-1.5">
                                <FIcon className={cn("w-3 h-3", fc.color)} />
                                {fc.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── Destinatarios builder ── */}
                {(() => {
                  // Role config: label, icon color, bg
                  const ROLES_DISPONIBLES: Array<{ key: string; label: string; singular: string; color: string; bg: string; border: string }> = [
                    { key: "supervisor",    label: "Supervisores",     singular: "Supervisor",    color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800" },
                    { key: "jefe_area",     label: "Jefes de área",    singular: "Jefe de área",  color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800" },
                    { key: "productor",     label: "Productores",      singular: "Productor",     color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
                    { key: "cliente_admin", label: "Admins empresa",   singular: "Admin empresa", color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800" },
                    { key: "lector",        label: "Lectores",         singular: "Lector",        color: "text-slate-700 dark:text-slate-300",   bg: "bg-slate-50 dark:bg-slate-950/30",  border: "border-slate-200 dark:border-slate-800" },
                  ];

                  // Users visible to current user (same clienteId, or all for super_admin)
                  const visibleUsers = users.filter(u =>
                    u.activo !== false &&
                    (currentUser?.role === "super_admin" || u.clienteId === currentUser?.clienteId) &&
                    u.id !== currentUser?.id,
                  );

                  // Count users per role
                  const countByRole = (roleKey: string) =>
                    visibleUsers.filter(u => u.role === roleKey).length;

                  const toggleRole = (roleKey: string) => {
                    const token = `role:${roleKey}`;
                    setSchedDestinatarios(prev =>
                      prev.includes(token) ? prev.filter(t => t !== token) : [...prev, token],
                    );
                  };

                  const addUser = (email: string) => {
                    const token = `user:${email}`;
                    if (!schedDestinatarios.includes(token)) {
                      setSchedDestinatarios(prev => [...prev, token]);
                    }
                    setUserSearchQuery("");
                    setShowUserSearch(false);
                  };

                  const removeItem = (token: string) => {
                    setSchedDestinatarios(prev => prev.filter(t => t !== token));
                  };

                  // Expand selections into actual user count
                  const estimatedCount = (() => {
                    const counted = new Set<string>();
                    for (const token of schedDestinatarios) {
                      if (token.startsWith("role:")) {
                        const roleKey = token.slice(5);
                        visibleUsers.filter(u => u.role === roleKey).forEach(u => counted.add(u.email));
                      } else if (token.startsWith("user:")) {
                        counted.add(token.slice(5));
                      }
                    }
                    return counted.size;
                  })();

                  // Filtered users for search
                  const searchResults = userSearchQuery.length >= 1
                    ? visibleUsers.filter(u =>
                        (u.nombre.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
                        !schedDestinatarios.includes(`user:${u.email}`),
                      ).slice(0, 6)
                    : [];

                  return (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Destinatarios
                      </Label>

                      {/* — Por rol — */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> Por grupo de rol
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES_DISPONIBLES.map(r => {
                            const count = countByRole(r.key);
                            const active = schedDestinatarios.includes(`role:${r.key}`);
                            if (count === 0) return null;
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => toggleRole(r.key)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                                  active
                                    ? cn(r.bg, r.border, r.color, "shadow-sm")
                                    : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                                )}
                              >
                                <Users className="w-3 h-3" />
                                {r.label}
                                <span className={cn(
                                  "text-[9px] px-1 rounded-full font-bold",
                                  active ? "bg-white/60 dark:bg-black/20" : "bg-muted",
                                )}>
                                  {count}
                                </span>
                                {active && <X className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* — Usuario específico — */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> Usuario específico
                        </p>
                        <div ref={userSearchRef} className="relative">
                          <div className="flex items-center gap-1.5 h-8 px-2 rounded-md border border-border bg-background text-xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary/50">
                            <UserPlus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <input
                              value={userSearchQuery}
                              onChange={e => { setUserSearchQuery(e.target.value); setShowUserSearch(true); }}
                              onFocus={() => setShowUserSearch(true)}
                              onBlur={() => setTimeout(() => setShowUserSearch(false), 150)}
                              placeholder="Buscar por nombre o email…"
                              className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground/60"
                            />
                            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          </div>
                          {showUserSearch && searchResults.length > 0 && (
                            <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                              {searchResults.map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onMouseDown={() => addUser(u.email)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                                >
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 h-3 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{u.nombre}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    {u.role.replace("_", " ")}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {showUserSearch && userSearchQuery.length >= 1 && searchResults.length === 0 && (
                            <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md px-3 py-2">
                              <p className="text-xs text-muted-foreground">Sin resultados para "{userSearchQuery}"</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* — Selección actual — */}
                      {schedDestinatarios.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted-foreground">Selección actual</p>
                          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-border min-h-[36px]">
                            {schedDestinatarios.map(token => {
                              if (token.startsWith("role:")) {
                                const roleKey = token.slice(5);
                                const r = ROLES_DISPONIBLES.find(x => x.key === roleKey);
                                const count = countByRole(roleKey);
                                if (!r) return null;
                                return (
                                  <span key={token} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium", r.bg, r.border, r.color)}>
                                    <Users className="w-2.5 h-2.5" />
                                    {r.label}
                                    <span className="opacity-60">({count})</span>
                                    <button type="button" onClick={() => removeItem(token)} className="ml-0.5 hover:opacity-100 opacity-50 transition-opacity">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                );
                              }
                              if (token.startsWith("user:")) {
                                const email = token.slice(5);
                                const u = visibleUsers.find(x => x.email === email);
                                return (
                                  <span key={token} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-[11px] font-medium text-foreground">
                                    <User className="w-2.5 h-2.5 text-primary" />
                                    {u?.nombre ?? email}
                                    <button type="button" onClick={() => removeItem(token)} className="ml-0.5 hover:text-destructive opacity-50 hover:opacity-100 transition-all">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                          {estimatedCount > 0 && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" />
                              ~{estimatedCount} destinatario{estimatedCount !== 1 ? "s" : ""} recibirán este informe
                            </p>
                          )}
                        </div>
                      )}

                      {schedDestinatarios.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">
                          Selecciona al menos un rol o usuario para el envío automático.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Button
                size="sm"
                className={cn("w-full gap-1.5", schedSaved && "bg-green-600 hover:bg-green-700")}
                onClick={handleGuardarSchedule}
              >
                {schedSaved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Programación guardada</>
                ) : (
                  <><Calendar className="w-3.5 h-3.5" /> Guardar programación</>
                )}
              </Button>

              {/* Current schedule summary */}
              {informe.es_programado && informe.frecuencia_programacion && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Programación activa
                  </p>
                  <div className="text-[11px] text-blue-800 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 opacity-60" />
                      <span className="capitalize">{informe.frecuencia_programacion} — {informe.hora_envio ?? "08:00"}</span>
                    </div>
                    {informe.formato_preferido && (
                      <div className="flex items-center gap-1.5">
                        {(() => { const fc = FORMATO_CONFIG[informe.formato_preferido]; const FIcon = fc.icon; return <FIcon className={cn("w-3 h-3", fc.color)} />; })()}
                        <span>{FORMATO_CONFIG[informe.formato_preferido].label}</span>
                      </div>
                    )}
                    {informe.destinatarios_programados && informe.destinatarios_programados.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Mail className="w-3 h-3 opacity-60 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {informe.destinatarios_programados.map(token => (
                            <span key={token} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {token.startsWith("role:") ? `Todos: ${token.slice(5).replace("_", " ")}` : token.startsWith("user:") ? token.slice(5) : token}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* VERSIONES */}
        <TabsContent value="versiones" className="flex-1 overflow-y-auto px-5 py-4 space-y-3 mt-0">
          {(() => {
            const snaps = informe.versiones ?? [];
            const sorted = [...snaps].sort((a, b) => {
              const [aMaj = 0] = (a.version ?? "1.0").split(".").map(Number);
              const [bMaj = 0] = (b.version ?? "1.0").split(".").map(Number);
              return bMaj - aMaj;
            });
            const latestSnap = sorted[0];
            const cat = CATEGORIA_CONFIG[informe.categoria];
            const tipo = TIPO_CONFIG[informe.tipo_informe];
            const CatIcon = cat.icon;

            if (sorted.length === 0) {
              return (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="p-3 rounded-full bg-muted/50">
                    <GitBranch className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Sin historial de versiones</p>
                  <p className="text-xs text-muted-foreground">
                    Las versiones se crean automáticamente cada vez que guardas cambios en la plantilla.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* Actions bar */}
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 flex-1">
                    <GitBranch className="w-3 h-3" />
                    {sorted.length} versión{sorted.length !== 1 ? "es" : ""}
                  </p>
                  <button
                    onClick={() => setShowVersionDialog(true)}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Control de versiones
                  </button>
                </div>

                {/* Timeline preview (compact) */}
                <div className="space-y-1.5">
                  {sorted.slice(0, 5).map((snap, i) => {
                    const isLatest = snap.id === latestSnap?.id;
                    const bloqueCount = snap.builderConfig?.bloques?.length ?? 0;
                    return (
                      <div
                        key={snap.id}
                        className={cn(
                          "rounded-xl border p-2.5 space-y-1 transition-all cursor-pointer hover:shadow-sm",
                          isLatest ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                        )}
                        onClick={() => setShowVersionDialog(true)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                              isLatest
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border",
                            )}
                          >
                            v{snap.version}
                          </div>
                          {isLatest && (
                            <span className="text-[9px] font-semibold text-primary uppercase tracking-wide">
                              Actual
                            </span>
                          )}
                          <span className="flex-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(snap.timestamp).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium truncate">{snap.cambio}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <User className="w-2.5 h-2.5" />
                          {snap.usuario}
                          {bloqueCount > 0 && (
                            <>
                              <span className="text-border">·</span>
                              <span>{bloqueCount} bloque{bloqueCount !== 1 ? "s" : ""}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sorted.length > 5 && (
                  <button
                    onClick={() => setShowVersionDialog(true)}
                    className="w-full text-[10px] text-primary hover:underline text-center py-1"
                  >
                    Ver todas las {sorted.length} versiones →
                  </button>
                )}

                {/* Document preview card */}
                <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Eye className="w-3 h-3 text-sky-600" />
                    <span className="text-[10px] font-semibold">Vista previa del documento</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="text-center pb-2 border-b border-dashed border-border">
                      <div className={cn("inline-flex p-1.5 rounded-lg border mb-1.5", cat.bg, cat.border)}>
                        <CatIcon className={cn("w-4 h-4", cat.color)} />
                      </div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Informe</p>
                      <h4 className="text-xs font-bold text-foreground">{informe.nombre}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground">{informe.codigo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoría</span>
                        <span className={cn("font-medium", cat.color)}>{cat.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-medium">{tipo.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado</span>
                        <span className="font-medium">{ESTADO_CONFIG[informe.estado].label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Generado</span>
                        <span className="font-medium">{informe.veces_generado}x</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Fuentes</p>
                      <div className="flex flex-wrap gap-0.5">
                        {informe.fuentes.slice(0, 4).map(f => (
                          <span key={f} className="text-[8px] font-mono px-1 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                            {f}
                          </span>
                        ))}
                        {informe.fuentes.length > 4 && (
                          <span className="text-[8px] text-muted-foreground">+{informe.fuentes.length - 4}</span>
                        )}
                      </div>
                    </div>
                    {informe.es_programado && (
                      <div className="text-[9px] bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                        {informe.frecuencia_programacion} {informe.hora_envio ? `· ${informe.hora_envio}` : ""}
                      </div>
                    )}
                    <div className="text-center text-[9px] text-muted-foreground pt-1 border-t border-dashed border-border">
                      {sorted.length} versión{sorted.length !== 1 ? "es" : ""}
                      {informe.created_at ? ` · Creado: ${formatDate(informe.created_at)}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ── InformeVersionDialog ── */}
      <InformeVersionDialog
        open={showVersionDialog}
        onClose={() => setShowVersionDialog(false)}
        snapshots={informe.versiones ?? []}
        informeNombre={informe.nombre}
        onRestore={(snap) => { onRestoreVersion?.(snap); setShowVersionDialog(false); }}
        onCopyAsNew={(snap) => { onCopyVersionAsNew?.(snap); setShowVersionDialog(false); }}
        onArchive={(snapId) => onArchiveVersion?.(snapId)}
        onDelete={(snapId) => onDeleteVersion?.(snapId)}
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const CATEGORIES: CategoriaInforme[] = [
  "laboratorio",
  "vivero",
  "siembra",
  "cosecha",
  "poscosecha",
  "general",
];

// ─── Module → Informe category mapping ───────────────────────────────────────

const moduleToCategorias: Record<string, CategoriaInforme[]> = {
  laboratorio: ["laboratorio"],
  vivero: ["vivero"],
  cultivo: ["siembra"],
  "post-cosecha": ["poscosecha", "cosecha"],
};

const Informes = () => {
  const { role, hasPermission, currentUser, productores, clientes } = useRole();
  const { cultivos, variedades } = useConfig();
  const userLevel = ROLE_LEVELS[role];
  const canExport = hasPermission("informes", "exportar");

  // Area restriction for area-bound roles
  const area = currentUser?.area_asignada as string | undefined;
  const allowedCategorias = area ? moduleToCategorias[area] ?? [] : [];
  const isAreaRestricted = !!area && allowedCategorias.length > 0;

  // ── Acceso global a informes (sin restricción de área) ──
  // Super admin / cliente_admin / productor ven TODO.
  // Roles de área con override "configurar" en informes también ven todo.
  const hasGlobalInformesAccess =
    ["super_admin", "cliente_admin", "productor"].includes(role) ||
    hasPermission("informes", "configurar");

  // ── Gestión de plantillas ──
  // super_admin / cliente_admin / productor: CRUD completo (según sus acciones base)
  // jefe_area: puede crear/editar plantillas de su área (tiene "editar" base)
  // supervisor/lector: solo si tienen override especial "editar" o "configurar" en informes
  const canManageTemplates =
    ["super_admin", "cliente_admin", "productor"].includes(role) ||
    role === "jefe_area" ||
    hasPermission("informes", "editar") ||
    hasPermission("informes", "configurar");

  // ¿Puede editar ESTA plantilla específica?
  const canEditInformeTemplate = (inf: Informe): boolean => {
    if (!canManageTemplates) return false;
    if (["super_admin", "cliente_admin", "productor"].includes(role)) return true;
    // Roles de área: solo su categoría
    if (isAreaRestricted && !allowedCategorias.includes(inf.categoria)) return false;
    return true;
  };

  // ¿Puede eliminar ESTA plantilla específica?
  const canDeleteInformeTemplate = (inf: Informe): boolean => {
    if (!hasPermission("informes", "eliminar")) return false;
    if (["super_admin", "cliente_admin"].includes(role)) return true;
    // Roles de área: solo su categoría
    if (isAreaRestricted && !allowedCategorias.includes(inf.categoria)) return false;
    return true;
  };

  const [informes, setInformes] = useState<Informe[]>(INFORMES_DEMO);
  const [generaciones] = useState<InformeGeneracion[]>(GENERACIONES_DEMO);
  const [mainView, setMainView] = useState<"plantillas" | "generados">("plantillas");
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [activeNav, setActiveNav] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Informe | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTarget, setBuilderTarget] = useState<{
    id?: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    builderConfig?: BuilderConfig;
  } | null>(null);

  const openBuilder = (inf?: Informe) => {
    setBuilderTarget(
      inf
        ? { id: inf.id, nombre: inf.nombre, descripcion: inf.descripcion, categoria: inf.categoria, builderConfig: inf.builderConfig }
        : { nombre: "", descripcion: "", categoria: "general" },
    );
    setBuilderOpen(true);
  };

  const handleBuilderSave = (cfg: BuilderConfig) => {
    if (cfg.id) {
      setInformes((prev) =>
        prev.map((i) => {
          if (i.id !== cfg.id) return i;
          const nextVersionNum = (i.versiones?.length ?? 0) + 1;
          const newSnap: InformeSnapshot = {
            id: `isnap-${Date.now()}`,
            informe_id: cfg.id!,
            version: `${nextVersionNum}.0`,
            timestamp: new Date().toISOString(),
            usuario: "Usuario actual",
            cambio: nextVersionNum === 1 ? "Versión inicial" : "Actualización de plantilla",
            nombre: cfg.nombre || i.nombre,
            descripcion: cfg.descripcion || i.descripcion,
            builderConfig: cfg,
          };
          return {
            ...i,
            nombre: cfg.nombre || i.nombre,
            descripcion: cfg.descripcion || i.descripcion,
            categoria: cfg.categoria as Informe["categoria"],
            builderConfig: cfg,
            versiones: [...(i.versiones ?? []), newSnap],
          };
        }),
      );
    } else {
      const newId = `inf-${Date.now()}`;
      const cat = (cfg.categoria as CategoriaInforme) || "general";
      const newInforme: Informe = {
        id: newId,
        codigo: `USR-${String(informes.length + 1).padStart(3, "0")}`,
        nombre: cfg.nombre || "Nuevo informe",
        descripcion: cfg.descripcion || "",
        tipo_informe: "grafico",
        categoria: cat,
        nivel_acceso_minimo: 1,
        estado: "borrador",
        es_favorito: false,
        es_programado: false,
        veces_generado: 0,
        created_at: new Date().toISOString().split("T")[0],
        fuentes: [...new Set(cfg.bloques.flatMap((b) => b.fuentesSeleccionadas))],
        builderConfig: { ...cfg, id: newId },
        versiones: [
          {
            id: `isnap-${Date.now()}`,
            informe_id: newId,
            version: "1.0",
            timestamp: new Date().toISOString(),
            usuario: "Usuario actual",
            cambio: "Creación inicial",
            nombre: cfg.nombre || "Nuevo informe",
            descripcion: cfg.descripcion || "",
            builderConfig: { ...cfg, id: newId },
          },
        ],
      };
      setInformes((prev) => [...prev, newInforme]);
      setSelectedId(newId);
    }
    setBuilderOpen(false);
  };

  const canAccessInforme = (inf: Informe): boolean => {
    if (userLevel < inf.nivel_acceso_minimo) return false;
    if (inf.roles_permitidos && inf.roles_permitidos.length > 0) {
      return inf.roles_permitidos.includes(role);
    }
    return true;
  };

  // ── Version action handlers ──
  const restoreVersion = (snap: InformeSnapshot) => {
    if (!snap.builderConfig) return;
    setInformes(prev => prev.map(i => {
      if (i.id !== snap.informe_id) return i;
      const nextV = (i.versiones?.length ?? 0) + 1;
      const newSnap: InformeSnapshot = {
        id: `isnap-${Date.now()}`,
        informe_id: i.id,
        version: `${nextV}.0`,
        timestamp: new Date().toISOString(),
        usuario: "Usuario actual",
        cambio: `Restaurado desde v${snap.version}`,
        nombre: snap.nombre,
        descripcion: snap.descripcion,
        builderConfig: snap.builderConfig,
      };
      return {
        ...i,
        nombre: snap.nombre,
        descripcion: snap.descripcion,
        builderConfig: snap.builderConfig,
        versiones: [...(i.versiones ?? []), newSnap],
      };
    }));
  };

  const copyVersionAsNew = (snap: InformeSnapshot) => {
    const newId = `inf-${Date.now()}`;
    const cat = (snap.builderConfig?.categoria as CategoriaInforme) ?? "general";
    const newInforme: Informe = {
      id: newId,
      codigo: `USR-${String(informes.length + 1).padStart(3, "0")}`,
      nombre: `${snap.nombre} (copia)`,
      descripcion: snap.descripcion,
      tipo_informe: "grafico",
      categoria: cat,
      nivel_acceso_minimo: 1,
      estado: "borrador",
      es_favorito: false,
      es_programado: false,
      veces_generado: 0,
      created_at: new Date().toISOString().split("T")[0],
      fuentes: snap.builderConfig
        ? [...new Set(snap.builderConfig.bloques.flatMap(b => b.fuentesSeleccionadas))]
        : [],
      builderConfig: snap.builderConfig ? { ...snap.builderConfig, id: newId } : undefined,
      versiones: [{
        id: `isnap-${Date.now()}`,
        informe_id: newId,
        version: "1.0",
        timestamp: new Date().toISOString(),
        usuario: "Usuario actual",
        cambio: `Copiado desde v${snap.version} de "${snap.nombre}"`,
        nombre: `${snap.nombre} (copia)`,
        descripcion: snap.descripcion,
        builderConfig: snap.builderConfig ? { ...snap.builderConfig, id: newId } : undefined,
      }],
    };
    setInformes(prev => [...prev, newInforme]);
    setSelectedId(newId);
  };

  const archiveVersion = (snapId: string) => {
    setInformes(prev => prev.map(i => ({
      ...i,
      versiones: (i.versiones ?? []).filter(v => v.id !== snapId),
    })));
  };

  const deleteVersion = (snapId: string) => {
    setInformes(prev => prev.map(i => ({
      ...i,
      versiones: (i.versiones ?? []).filter(v => v.id !== snapId),
    })));
  };

  const selectedInforme = informes.find((i) => i.id === selectedId) ?? null;
  const previewInforme = informes.find((i) => i.id === previewId) ?? null;

  // Nav counts (aplica misma restricción de área que filtered)
  const navCounts = useMemo(() => {
    let base = informes;
    if (isAreaRestricted && !hasGlobalInformesAccess) {
      base = base.filter((i) => allowedCategorias.includes(i.categoria) || i.categoria === "general");
    }
    const result: Record<string, number> = {
      all: base.length,
      favoritos: base.filter((i) => i.es_favorito).length,
      programados: base.filter((i) => i.es_programado).length,
    };
    CATEGORIES.forEach((cat) => {
      result[cat] = base.filter((i) => i.categoria === cat).length;
    });
    return result;
  }, [informes, isAreaRestricted, hasGlobalInformesAccess, allowedCategorias]);

  // Filtered list (plantillas)
  const filtered = useMemo(() => {
    let list = informes;

    // Restricción por área: roles de área solo ven su categoría (+ general)
    if (isAreaRestricted && !hasGlobalInformesAccess) {
      list = list.filter((i) => allowedCategorias.includes(i.categoria) || i.categoria === "general");
    }

    if (activeNav === "favoritos") list = list.filter((i) => i.es_favorito);
    else if (activeNav === "programados") list = list.filter((i) => i.es_programado);
    else if (activeNav !== "all") list = list.filter((i) => i.categoria === activeNav);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          i.codigo.toLowerCase().includes(q) ||
          i.descripcion.toLowerCase().includes(q),
      );
    }
    if (filterTipo !== "all") list = list.filter((i) => i.tipo_informe === filterTipo);
    if (filterEstado !== "all") list = list.filter((i) => i.estado === filterEstado);

    return list;
  }, [informes, activeNav, search, filterTipo, filterEstado, isAreaRestricted, hasGlobalInformesAccess, allowedCategorias]);

  const toggleFavorite = (id: string) => {
    setInformes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, es_favorito: !i.es_favorito } : i)),
    );
  };

  const changeNav = (nav: string) => {
    setActiveNav(nav);
    setSelectedId(null);
  };

  // Is "grouped all" mode: all + no search/type/estado filters
  const isGroupedAll =
    activeNav === "all" &&
    !search.trim() &&
    filterTipo === "all" &&
    filterEstado === "all";

  const hasActiveFilters = filterTipo !== "all" || filterEstado !== "all";

  // ── Reglas para generados ──
  // super_admin / cliente_admin / productor → ven TODOS los generados
  // jefe_area → ve todos los generados de su área (cualquier usuario)
  // supervisor / lector → SOLO ven SUS propias generaciones de su área
  //   EXCEPCIÓN: si tienen override "configurar" en informes → ven todo (hasGlobalInformesAccess)
  const isUserRestricted = ["supervisor", "lector"].includes(role) && !hasGlobalInformesAccess;

  // ── Filtered generaciones (role-restricted) ──
  const filteredGeneraciones = useMemo(() => {
    let list = generaciones;

    // Restricción global de área
    if (isAreaRestricted && !hasGlobalInformesAccess) {
      list = list.filter((g) => allowedCategorias.includes(g.categoria) || g.categoria === "general");
    }

    // Supervisor / lector: solo sus propias generaciones (dentro de su área)
    if (isUserRestricted && currentUser?.nombre) {
      list = list.filter((g) => g.usuario === currentUser.nombre);
    }

    // Nav filter
    if (activeNav !== "all" && activeNav !== "favoritos" && activeNav !== "programados") {
      list = list.filter((g) => g.categoria === activeNav);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.informe_nombre.toLowerCase().includes(q) ||
          g.usuario.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [generaciones, activeNav, search, isAreaRestricted, hasGlobalInformesAccess, allowedCategorias, isUserRestricted, currentUser?.nombre]);

  const genNavCounts = useMemo(() => {
    let base = generaciones;
    if (isAreaRestricted && !hasGlobalInformesAccess) {
      base = base.filter((g) => allowedCategorias.includes(g.categoria) || g.categoria === "general");
    }
    if (isUserRestricted && currentUser?.nombre) {
      base = base.filter((g) => g.usuario === currentUser.nombre);
    }
    const result: Record<string, number> = { all: base.length };
    CATEGORIES.forEach((cat) => {
      result[cat] = base.filter((g) => g.categoria === cat).length;
    });
    return result;
  }, [generaciones, isAreaRestricted, hasGlobalInformesAccess, allowedCategorias, isUserRestricted, currentUser?.nombre]);

  const handleDeleteInforme = (inf: Informe) => {
    setInformes((prev) => prev.filter((i) => i.id !== inf.id));
    if (selectedId === inf.id) setSelectedId(null);
    setDeleteTarget(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Informes"
        description="Generación, consulta y programación de informes operacionales."
        actions={
          <div className="flex items-center gap-2">
            {/* ── Plantillas / Generados toggle ── */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                onClick={() => { setMainView("plantillas"); setActiveNav("all"); setSearch(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  mainView === "plantillas"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                Plantillas
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                  mainView === "plantillas" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {navCounts.all}
                </span>
              </button>
              <button
                onClick={() => { setMainView("generados"); setActiveNav("all"); setSearch(""); setSelectedId(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  mainView === "generados"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FilePlus className="w-3.5 h-3.5" />
                Generados
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                  mainView === "generados" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {genNavCounts.all}
                </span>
              </button>
            </div>

            {/* Botón nuevo informe solo en vista plantillas y si puede gestionar */}
            {mainView === "plantillas" && canManageTemplates && (
              <Button size="sm" className="gap-1.5" onClick={() => openBuilder()}>
                <Plus className="w-4 h-4" />
                Nueva plantilla
              </Button>
            )}
          </div>
        }
      />

      {/* Banner informativo para roles con restricción de área */}
      {isAreaRestricted && (
        <div className="flex items-start gap-2 px-4 py-2.5 mb-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p>
              Estás viendo informes del área de <span className="font-semibold">{area}</span>.
              {canManageTemplates
                ? " Puedes gestionar plantillas y generaciones de tu área."
                : " Solo puedes consultar y generar informes de tu módulo."}
            </p>
            {isUserRestricted && (
              <p className="text-blue-600 dark:text-blue-400">
                En «Generados» solo verás tus propias generaciones.
                {hasPermission("informes", "configurar") === false && " Solicita acceso ampliado al administrador si necesitas ver otros módulos."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3-pane layout */}
      <div className="flex items-start gap-4">
        {/* ── Left sidebar ── */}
        <aside className="w-48 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden sticky top-4 max-h-[calc(100vh-6rem)] flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-border bg-muted/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <NavItem
              icon={BarChart2}
              label="Todos"
              count={mainView === "plantillas" ? navCounts.all : genNavCounts.all}
              active={activeNav === "all"}
              onClick={() => changeNav("all")}
            />
            {/* Favoritos y Programados solo en vista plantillas */}
            {mainView === "plantillas" && (
              <>
                <NavItem
                  icon={Star}
                  label="Favoritos"
                  count={navCounts.favoritos}
                  active={activeNav === "favoritos"}
                  onClick={() => changeNav("favoritos")}
                  iconClass="text-amber-500"
                />
                <NavItem
                  icon={Zap}
                  label="Programados"
                  count={navCounts.programados}
                  active={activeNav === "programados"}
                  onClick={() => changeNav("programados")}
                  iconClass="text-blue-500"
                />
              </>
            )}

            <div className="pt-3 pb-1 px-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Módulos
              </p>
            </div>

            {CATEGORIES.map((cat) => {
              const counts = mainView === "plantillas" ? navCounts : genNavCounts;
              const cnt = counts[cat] ?? 0;
              // En vista generados, ocultar categorías sin elementos (para área restringida)
              if (mainView === "generados" && cnt === 0) return null;
              const cfg = CATEGORIA_CONFIG[cat];
              return (
                <NavItem
                  key={cat}
                  icon={cfg.icon}
                  label={cfg.label}
                  count={cnt}
                  active={activeNav === cat}
                  onClick={() => changeNav(cat)}
                  iconClass={cfg.color}
                />
              );
            })}
          </nav>
        </aside>

        {/* ── Center list ── */}
        <div
          className={cn(
            "flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden transition-all",
          )}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
            <span className="text-xs text-muted-foreground flex-1">
              {mainView === "plantillas"
                ? `${filtered.length} plantilla${filtered.length !== 1 ? "s" : ""}`
                : `${filteredGeneraciones.length} generación${filteredGeneraciones.length !== 1 ? "es" : ""}`}
              {(search.trim() || hasActiveFilters) && (
                <span className="text-muted-foreground/60"> · filtrado</span>
              )}
            </span>

            {/* Filtros solo en vista plantillas */}
            {mainView === "plantillas" && (
              <>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="h-7 text-xs w-[110px] bg-background">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {(["tabla", "grafico", "mixto", "resumen"] as TipoInforme[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="h-7 text-xs w-[110px] bg-background">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {(["activo", "borrador", "archivado"] as EstadoInforme[]).map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_CONFIG[e].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilterTipo("all"); setFilterEstado("all"); }}
                    className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </>
            )}
          </div>

          {/* List content */}
          <div>
            {mainView === "plantillas" ? (
              // ════════════════ VISTA PLANTILLAS ════════════════
              filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BarChart2 className="w-10 h-10 text-muted-foreground/20" />
                  <div>
                    <p className="font-medium text-sm">Sin resultados</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajusta los filtros para ver plantillas disponibles.
                    </p>
                  </div>
                  {(search.trim() || hasActiveFilters) && (
                    <button
                      onClick={() => { setSearch(""); setFilterTipo("all"); setFilterEstado("all"); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Limpiar todos los filtros
                    </button>
                  )}
                </div>
              ) : isGroupedAll ? (
                // ── Agrupado por categoría ──
                CATEGORIES.map((cat) => {
                  const catInformes = filtered.filter((i) => i.categoria === cat);
                  if (catInformes.length === 0) return null;
                  const catCfg = CATEGORIA_CONFIG[cat];
                  const CatIcon = catCfg.icon;
                  return (
                    <div key={cat}>
                      <div className={cn("flex items-center gap-2 px-4 py-1.5 border-b border-border", catCfg.bg)}>
                        <CatIcon className={cn("w-3.5 h-3.5", catCfg.color)} />
                        <span className={cn("text-xs font-semibold", catCfg.color)}>{catCfg.label}</span>
                        <span className="text-[10px] text-muted-foreground">{catInformes.length}</span>
                      </div>
                      {catInformes.map((inf) => (
                        <InformeRow
                          key={inf.id}
                          informe={inf}
                          canAccess={canAccessInforme(inf)}
                          selected={inf.id === selectedId}
                          canCreate={canEditInformeTemplate(inf)}
                          canDelete={canDeleteInformeTemplate(inf)}
                          onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                          onToggleFavorite={() => toggleFavorite(inf.id)}
                          onPreview={() => setPreviewId(inf.id)}
                          onEditBuilder={canEditInformeTemplate(inf) ? () => openBuilder(inf) : undefined}
                          onDelete={canDeleteInformeTemplate(inf) ? () => setDeleteTarget(inf) : undefined}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                // ── Lista plana ──
                filtered.map((inf) => (
                  <InformeRow
                    key={inf.id}
                    informe={inf}
                    canAccess={canAccessInforme(inf)}
                    selected={inf.id === selectedId}
                    canCreate={canEditInformeTemplate(inf)}
                    canDelete={canDeleteInformeTemplate(inf)}
                    onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                    onToggleFavorite={() => toggleFavorite(inf.id)}
                    onPreview={() => setPreviewId(inf.id)}
                    onEditBuilder={canEditInformeTemplate(inf) ? () => openBuilder(inf) : undefined}
                    onDelete={canDeleteInformeTemplate(inf) ? () => setDeleteTarget(inf) : undefined}
                  />
                ))
              )
            ) : (
              // ════════════════ VISTA GENERADOS ════════════════
              filteredGeneraciones.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <FilePlus className="w-10 h-10 text-muted-foreground/20" />
                  <div>
                    <p className="font-medium text-sm">Sin informes generados</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isUserRestricted
                        ? "Aún no has generado ningún informe."
                        : isAreaRestricted
                          ? "No hay informes generados para tu área."
                          : "Todavía no se han generado informes."}
                    </p>
                  </div>
                </div>
              ) : (
                // ── Agrupado por categoría o plano según nav ──
                activeNav === "all" && !search.trim() ? (
                  CATEGORIES.map((cat) => {
                    const catGens = filteredGeneraciones.filter((g) => g.categoria === cat);
                    if (catGens.length === 0) return null;
                    const catCfg = CATEGORIA_CONFIG[cat];
                    const CatIcon = catCfg.icon;
                    return (
                      <div key={cat}>
                        <div className={cn("flex items-center gap-2 px-4 py-1.5 border-b border-border", catCfg.bg)}>
                          <CatIcon className={cn("w-3.5 h-3.5", catCfg.color)} />
                          <span className={cn("text-xs font-semibold", catCfg.color)}>{catCfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">{catGens.length}</span>
                        </div>
                        {catGens.map((gen) => (
                          <GeneracionRow
                            key={gen.id}
                            gen={gen}
                            informeNombre={gen.informe_nombre}
                            categoriaCfg={catCfg}
                          />
                        ))}
                      </div>
                    );
                  })
                ) : (
                  filteredGeneraciones.map((gen) => (
                    <GeneracionRow
                      key={gen.id}
                      gen={gen}
                      informeNombre={gen.informe_nombre}
                      categoriaCfg={CATEGORIA_CONFIG[gen.categoria]}
                    />
                  ))
                )
              )
            )}
          </div>
        </div>

        {/* ── Right detail panel ── */}
        {selectedInforme && (
          <div className="w-[340px] flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden sticky top-4 h-[calc(100vh-6rem)] flex flex-col">
            <DetailPanel
              key={selectedInforme.id}
              informe={selectedInforme}
              generaciones={filteredGeneraciones}
              canAccess={canAccessInforme(selectedInforme)}
              canExport={canExport}
              canCreate={canEditInformeTemplate(selectedInforme)}
              onToggleFavorite={() => toggleFavorite(selectedInforme.id)}
              onClose={() => setSelectedId(null)}
              onConfigure={() => openBuilder(selectedInforme)}
              onUpdateSchedule={(changes) =>
                setInformes((prev) =>
                  prev.map((i) => (i.id === selectedInforme.id ? { ...i, ...changes } : i)),
                )
              }
              onDeleteTemplate={() => {
                setInformes((prev) =>
                  prev.map((i) =>
                    i.id === selectedInforme?.id ? { ...i, builderConfig: undefined } : i,
                  ),
                );
              }}
              onRestoreVersion={restoreVersion}
              onCopyVersionAsNew={copyVersionAsNew}
              onArchiveVersion={archiveVersion}
              onDeleteVersion={deleteVersion}
            />
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewInforme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const c = CATEGORIA_CONFIG[previewInforme.categoria];
                  const CIcon = c.icon;
                  return (
                    <div className={cn("p-2 rounded-lg border", c.bg, c.border)}>
                      <CIcon className={cn("w-4 h-4", c.color)} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-sm font-bold">{previewInforme.nombre}</h2>
                  <p className="text-xs text-muted-foreground">
                    {previewInforme.codigo} · {previewInforme.descripcion}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewId(null)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body — Document preview */}
            <div className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-900">
              {previewInforme.builderConfig ? (() => {
                // ── Auto-fill data from system ──
                const productor = productores.find(p => p.id === currentUser?.productorId);
                const cliente   = clientes.find(c => c.id === currentUser?.clienteId);
                const finca     = productor?.nombre ?? cliente?.nombre ?? "—";
                const ubicacion = productor ? `${productor.pais}` : (cliente?.pais ?? "—");
                const primerCultivo = cultivos[0];
                const cultivoNombre = primerCultivo?.nombre ?? "—";
                const primeraVariedad = primerCultivo
                  ? variedades.find(v => v.cultivo_id === primerCultivo.id)?.nombre ?? "—"
                  : "—";
                const fechaInicio = previewInforme.created_at
                  ? new Date(previewInforme.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
                  : new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
                const revision   = previewInforme.versiones?.length ?? 1;
                const codigo     = previewInforme.codigo;
                const docTitle   = (previewInforme.builderConfig.titulo || previewInforme.nombre).toUpperCase();

                return (
                  <div className="p-4 min-h-full">
                    {/* A4-like paper */}
                    <div className="bg-white dark:bg-zinc-800 shadow-xl border border-zinc-300 dark:border-zinc-600 max-w-3xl mx-auto text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "Arial, sans-serif" }}>

                      {/* ── Document header (like the image) ── */}
                      <table className="w-full border-collapse text-[10px]" style={{ borderBottom: "2px solid #c00" }}>
                        <tbody>
                          <tr>
                            {/* Logo cell */}
                            <td className="border border-zinc-400 dark:border-zinc-500 p-2 align-middle" style={{ width: 90 }} rowSpan={3}>
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-14 h-10 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                                  <span className="text-primary font-bold text-xs">{(cliente?.nombre ?? "AW").slice(0, 3).toUpperCase()}</span>
                                </div>
                                <p className="text-[9px] font-semibold text-center leading-tight text-zinc-600 dark:text-zinc-400">
                                  {cliente?.nombre ?? "AgroView Pro"}
                                </p>
                              </div>
                            </td>
                            {/* Title cell */}
                            <td className="border border-zinc-400 dark:border-zinc-500 text-center font-bold text-[13px] py-2 px-3 uppercase tracking-wide" colSpan={5}>
                              {docTitle}
                            </td>
                            {/* Revision meta box */}
                            <td className="border border-zinc-400 dark:border-zinc-500 p-0 align-top" style={{ width: 140 }} rowSpan={3}>
                              <table className="w-full border-collapse text-[9px]">
                                <tbody>
                                  <tr>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-semibold uppercase text-zinc-500">REVISIÓN:</td>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-bold">{revision}</td>
                                  </tr>
                                  <tr>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-semibold uppercase text-zinc-500">FECHA DE INICIO:</td>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1">{fechaInicio}</td>
                                  </tr>
                                  <tr>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-semibold uppercase text-zinc-500">CÓDIGO:</td>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-mono font-bold">{codigo}</td>
                                  </tr>
                                  <tr>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1 font-semibold uppercase text-zinc-500">SUPERFICIE:</td>
                                    <td className="border-b border-zinc-300 dark:border-zinc-600 px-1.5 py-1">{primerCultivo?.marco_plantacion ? `${(primerCultivo.marco_plantacion / 10000).toFixed(1)} ha` : "—"}</td>
                                  </tr>
                                  <tr>
                                    <td className="px-1.5 py-1 font-semibold uppercase text-zinc-500">PRODUCTOR:</td>
                                    <td className="px-1.5 py-1 truncate">{productor?.nombre ?? "—"}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-400 dark:border-zinc-500 text-center text-[10px] py-1 text-zinc-500 uppercase tracking-widest" colSpan={5}>
                              Registro del Productor
                            </td>
                          </tr>
                          {/* Meta row: FINCA, CULTIVO, UBICACIÓN, VARIEDAD */}
                          <tr>
                            <td className="border border-zinc-400 dark:border-zinc-500 px-2 py-1.5 text-center" style={{ width: "20%" }}>
                              <span className="font-bold uppercase text-zinc-500 text-[9px] block">Finca</span>
                              <span className="font-semibold text-[10px]">{finca}</span>
                            </td>
                            <td className="border border-zinc-400 dark:border-zinc-500 px-2 py-1.5 text-center" style={{ width: "20%" }}>
                              <span className="font-bold uppercase text-zinc-500 text-[9px] block">Cultivo</span>
                              <span className="font-semibold text-[10px]">{cultivoNombre}</span>
                            </td>
                            <td className="border border-zinc-400 dark:border-zinc-500 px-2 py-1.5 text-center" style={{ width: "20%" }}>
                              <span className="font-bold uppercase text-zinc-500 text-[9px] block">Variedad</span>
                              <span className="font-semibold text-[10px]">{primeraVariedad}</span>
                            </td>
                            <td className="border border-zinc-400 dark:border-zinc-500 px-2 py-1.5 text-center" style={{ width: "20%" }}>
                              <span className="font-bold uppercase text-zinc-500 text-[9px] block">Ubicación</span>
                              <span className="font-semibold text-[10px]">{ubicacion}</span>
                            </td>
                            <td className="border border-zinc-400 dark:border-zinc-500 px-2 py-1.5 text-center" style={{ width: "20%" }}>
                              <span className="font-bold uppercase text-zinc-500 text-[9px] block">Categoría</span>
                              <span className="font-semibold text-[10px] capitalize">{previewInforme.categoria}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* ── Blocks ── */}
                      <div className="p-4 space-y-6">
                        {previewInforme.builderConfig.bloques.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic text-center py-8">Sin bloques configurados</p>
                        ) : previewInforme.builderConfig.bloques.map((bloque, idx) => {
                          const isGrafico = bloque.tipo === "grafico";
                          const gb = bloque as { tipoGrafico: string; metricas?: string[] };
                          return (
                            <div key={bloque.id}>
                              {/* Block title */}
                              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 border-b border-zinc-300 dark:border-zinc-600 pb-1 mb-2">
                                {idx + 1}. {bloque.titulo || (isGrafico ? "Gráfico" : "Tabla")}
                                <span className="ml-2 normal-case font-normal text-zinc-400 text-[9px]">({bloque.fuentesSeleccionadas.join(", ")})</span>
                              </p>

                              {isGrafico ? (
                                /* Chart placeholder */
                                <div className="border border-zinc-300 dark:border-zinc-600 rounded bg-zinc-50 dark:bg-zinc-700/30" style={{ height: 120 }}>
                                  <div className="h-full flex flex-col">
                                    {/* Y-axis lines */}
                                    <div className="flex-1 relative px-8 pt-3 pb-2">
                                      {[75, 50, 25].map(pct => (
                                        <div key={pct} className="absolute left-0 right-0 border-t border-dashed border-zinc-200 dark:border-zinc-600" style={{ top: `${100 - pct}%` }}>
                                          <span className="absolute -left-0.5 -top-2 text-[8px] text-zinc-400 pl-1">{pct}%</span>
                                        </div>
                                      ))}
                                      {/* Bars */}
                                      <div className="absolute bottom-2 left-8 right-4 flex items-end gap-1 h-[80px]">
                                        {[68, 42, 87, 54, 73, 39, 91, 61, 45, 78].slice(0, 8).map((h, i) => (
                                          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: `hsl(${160 + i * 15}, 60%, ${45 + i % 2 * 10}%)`, opacity: 0.7 }} />
                                        ))}
                                      </div>
                                    </div>
                                    {/* X-axis label */}
                                    <div className="px-8 pb-1 flex justify-between">
                                      {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"].map(m => (
                                        <span key={m} className="text-[8px] text-zinc-400">{m}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-center text-[9px] text-zinc-400 pb-1 -mt-1 capitalize">
                                    {gb.tipoGrafico?.replace("_", " ")} — datos simulados
                                  </p>
                                </div>
                              ) : (
                                /* Table placeholder */
                                <table className="w-full border-collapse text-[9px]">
                                  <thead>
                                    <tr className="bg-zinc-100 dark:bg-zinc-700">
                                      {(bloque.fuentesSeleccionadas.length > 0
                                        ? ["Fecha", "Variedad", "Bloque", "Valor A", "Valor B", "% Resultado"]
                                        : ["Col. A", "Col. B", "Col. C", "Col. D", "Col. E", "Col. F"]
                                      ).map(col => (
                                        <th key={col} className="border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-left font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...Array(4)].map((_, ri) => (
                                      <tr key={ri} className={ri % 2 === 0 ? "" : "bg-zinc-50 dark:bg-zinc-700/20"}>
                                        {[...Array(6)].map((_, ci) => (
                                          <td key={ci} className="border border-zinc-200 dark:border-zinc-600 px-2 py-1.5">
                                            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-600" style={{ width: `${40 + (ri * 3 + ci * 7) % 55}%` }} />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Document footer */}
                      <div className="px-4 py-2 border-t border-zinc-300 dark:border-zinc-600 flex items-center justify-between bg-zinc-50 dark:bg-zinc-700/30">
                        <span className="text-[8px] text-zinc-400">
                          {cliente?.nombre ?? "AgroView Pro"} · {previewInforme.nombre} · {previewInforme.codigo}
                        </span>
                        <span className="text-[8px] text-zinc-400">
                          Revisión {revision} · {fechaInicio} · Página 1 de 1
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="flex flex-col items-center gap-3 py-10 text-center p-5">
                  <div className="p-3 rounded-full bg-muted/50">
                    <Eye className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Sin plantilla configurada</p>
                  <p className="text-xs text-muted-foreground">
                    Abre el editor para diseñar la estructura visual de este informe.
                  </p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const s = ESTADO_CONFIG[previewInforme.estado];
                  const SIcon = s.icon;
                  return (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border",
                        s.badge,
                      )}
                    >
                      <SIcon className="w-3 h-3" />
                      {s.label}
                    </span>
                  );
                })()}
                {previewInforme.es_programado && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Programado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canCreate && previewInforme.builderConfig && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => {
                      setPreviewId(null);
                      openBuilder(previewInforme);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => {
                    setPreviewId(null);
                    setSelectedId(previewInforme.id);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> Ver detalle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder overlay */}
      {builderOpen && builderTarget && (
        <InformesBuilder
          key={builderTarget.id ?? "new"}
          informe={
            builderTarget.id
              ? {
                  id: builderTarget.id,
                  nombre: builderTarget.nombre,
                  descripcion: builderTarget.descripcion,
                  categoria: builderTarget.categoria,
                }
              : undefined
          }
          existingConfig={builderTarget.builderConfig}
          onClose={() => setBuilderOpen(false)}
          onSave={handleBuilderSave}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteTarget && (
        <ConfirmDeleteModal
          nombre={deleteTarget.nombre}
          onConfirm={() => handleDeleteInforme(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </MainLayout>
  );
};

export default Informes;
