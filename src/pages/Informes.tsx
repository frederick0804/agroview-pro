import { useState, useMemo } from "react";
import { InformesBuilder, type BuilderConfig } from "./InformesBuilder";
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
  Calendar,
  Mail,
  X,
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
}

interface InformeGeneracion {
  id: string;
  informe_id: string;
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
    usuario: "Ana García",
    fecha: "2025-03-12T10:00:00",
    parametros: { lote: "Todos", variedad: "Biloxi" },
    formato: "pdf",
    estado: "error",
    registros_procesados: 0,
    tiempo_ms: 320,
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
  onClick: () => void;
  onToggleFavorite: () => void;
}

function InformeRow({ informe, canAccess, selected, onClick, onToggleFavorite }: InformeRowProps) {
  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const estado = ESTADO_CONFIG[informe.estado];
  const CatIcon = cat.icon;
  const TipoIcon = tipo.icon;
  const EstadoIcon = estado.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left flex items-center gap-3 px-4 py-3",
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
    </button>
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
}: DetailPanelProps) {
  const [tab, setTab] = useState("info");
  const [formato, setFormato] = useState<FormatoExport>("excel");
  const [fechaDesde, setFechaDesde] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [generando, setGenerando] = useState(false);
  const [generacionOk, setGeneracionOk] = useState(false);

  // Scheduling state
  const [schedEnabled, setSchedEnabled] = useState(informe.es_programado);
  const [schedFrecuencia, setSchedFrecuencia] = useState<"diaria" | "semanal" | "mensual">(
    informe.frecuencia_programacion ?? "semanal",
  );
  const [schedHora, setSchedHora] = useState(informe.hora_envio ?? "08:00");
  const [schedDestinatarios, setSchedDestinatarios] = useState(
    (informe.destinatarios_programados ?? []).join(", "),
  );
  const [schedFormato, setSchedFormato] = useState<FormatoExport>(informe.formato_preferido ?? "pdf");
  const [schedSaved, setSchedSaved] = useState(false);

  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const estado = ESTADO_CONFIG[informe.estado];
  const CatIcon = cat.icon;
  const TipoIcon = tipo.icon;
  const EstadoIcon = estado.icon;

  const historiales = generaciones.filter((g) => g.informe_id === informe.id);

  const handleGenerar = () => {
    if (!canExport) return;
    setGenerando(true);
    setGeneracionOk(false);
    setTimeout(() => {
      setGenerando(false);
      setGeneracionOk(true);
      setTimeout(() => setGeneracionOk(false), 4000);
    }, 2200);
  };

  const handleGuardarSchedule = () => {
    onUpdateSchedule?.({
      es_programado: schedEnabled,
      frecuencia_programacion: schedEnabled ? schedFrecuencia : undefined,
      hora_envio: schedEnabled ? schedHora : undefined,
      destinatarios_programados: schedEnabled
        ? schedDestinatarios.split(",").map((e) => e.trim()).filter(Boolean)
        : [],
      formato_preferido: schedEnabled ? schedFormato : undefined,
    });
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
        <div className="mx-4 mt-3 mb-0 flex items-center gap-2">
          <TabsList className="bg-muted h-8 p-0.5 rounded-lg flex-1">
            <TabsTrigger value="info" className="text-xs gap-1.5 h-7 rounded-md">
              <Info className="w-3 h-3" /> Info
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
          </TabsList>
          {canCreate && (
            <button
              onClick={onConfigure}
              title="Editar configuración del informe"
              className="h-8 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Editar
            </button>
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

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Período
                  </Label>
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
                </div>
              </div>

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

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Destinatarios
                  </Label>
                  <textarea
                    value={schedDestinatarios}
                    onChange={(e) => setSchedDestinatarios(e.target.value)}
                    disabled={!schedEnabled}
                    placeholder={"email1@empresa.com\nemail2@empresa.com"}
                    rows={3}
                    className="w-full text-xs px-2 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Un email por línea o separados por coma.</p>
                </div>
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
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 opacity-60" />
                        <span>{informe.destinatarios_programados.length} destinatario{informe.destinatarios_programados.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
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

const Informes = () => {
  const { role, hasPermission } = useRole();
  const userLevel = ROLE_LEVELS[role];
  const canExport = hasPermission("informes", "exportar");
  const canCreate = hasPermission("informes", "crear");

  const [informes, setInformes] = useState<Informe[]>(INFORMES_DEMO);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [activeNav, setActiveNav] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        prev.map((i) =>
          i.id === cfg.id
            ? {
                ...i,
                nombre: cfg.nombre || i.nombre,
                descripcion: cfg.descripcion || i.descripcion,
                categoria: cfg.categoria as Informe["categoria"],
                builderConfig: cfg,
              }
            : i,
        ),
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

  const selectedInforme = informes.find((i) => i.id === selectedId) ?? null;

  // Nav counts
  const navCounts = useMemo(() => {
    const result: Record<string, number> = {
      all: informes.length,
      favoritos: informes.filter((i) => i.es_favorito).length,
      programados: informes.filter((i) => i.es_programado).length,
    };
    CATEGORIES.forEach((cat) => {
      result[cat] = informes.filter((i) => i.categoria === cat).length;
    });
    return result;
  }, [informes]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = informes;

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
  }, [informes, activeNav, search, filterTipo, filterEstado]);

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

  return (
    <MainLayout>
      <PageHeader
        title="Informes"
        description="Generación, consulta y programación de informes operacionales."
        actions={
          canCreate ? (
            <Button size="sm" className="gap-1.5" onClick={() => openBuilder()}>
              <Plus className="w-4 h-4" />
              Nuevo informe
            </Button>
          ) : undefined
        }
      />

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
              count={navCounts.all}
              active={activeNav === "all"}
              onClick={() => changeNav("all")}
            />
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

            <div className="pt-3 pb-1 px-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Módulos
              </p>
            </div>

            {CATEGORIES.map((cat) => {
              const cfg = CATEGORIA_CONFIG[cat];
              return (
                <NavItem
                  key={cat}
                  icon={cfg.icon}
                  label={cfg.label}
                  count={navCounts[cat]}
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
              {filtered.length} informe{filtered.length !== 1 ? "s" : ""}
              {(search.trim() || hasActiveFilters) && (
                <span className="text-muted-foreground/60"> · filtrado</span>
              )}
            </span>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-7 text-xs w-[110px] bg-background">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(["tabla", "grafico", "mixto", "resumen"] as TipoInforme[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_CONFIG[t].label}
                  </SelectItem>
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
                  <SelectItem key={e} value={e}>
                    {ESTADO_CONFIG[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterTipo("all");
                  setFilterEstado("all");
                }}
                className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>

          {/* List content */}
          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <BarChart2 className="w-10 h-10 text-muted-foreground/20" />
                <div>
                  <p className="font-medium text-sm">Sin resultados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajusta los filtros para ver informes disponibles.
                  </p>
                </div>
                {(search.trim() || hasActiveFilters) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterTipo("all");
                      setFilterEstado("all");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            ) : isGroupedAll ? (
              // ── Grouped by category ──
              CATEGORIES.map((cat) => {
                const catInformes = filtered.filter((i) => i.categoria === cat);
                if (catInformes.length === 0) return null;
                const catCfg = CATEGORIA_CONFIG[cat];
                const CatIcon = catCfg.icon;
                return (
                  <div key={cat}>
                    {/* Section header */}
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 border-b border-border",
                        catCfg.bg,
                      )}
                    >
                      <CatIcon className={cn("w-3.5 h-3.5", catCfg.color)} />
                      <span className={cn("text-xs font-semibold", catCfg.color)}>
                        {catCfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {catInformes.length}
                      </span>
                    </div>
                    {/* Rows */}
                    {catInformes.map((inf) => (
                      <InformeRow
                        key={inf.id}
                        informe={inf}
                        canAccess={canAccessInforme(inf)}
                        selected={inf.id === selectedId}
                        onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                        onToggleFavorite={() => toggleFavorite(inf.id)}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              // ── Flat list ──
              filtered.map((inf) => (
                <InformeRow
                  key={inf.id}
                  informe={inf}
                  canAccess={canAccessInforme(inf)}
                  selected={inf.id === selectedId}
                  onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                  onToggleFavorite={() => toggleFavorite(inf.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right detail panel ── */}
        {selectedInforme && (
          <div className="w-[340px] flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden sticky top-4 h-[calc(100vh-6rem)] flex flex-col">
            <DetailPanel
              key={selectedInforme.id}
              informe={selectedInforme}
              generaciones={GENERACIONES_DEMO}
              canAccess={canAccessInforme(selectedInforme)}
              canExport={canExport}
              canCreate={canCreate}
              onToggleFavorite={() => toggleFavorite(selectedInforme.id)}
              onClose={() => setSelectedId(null)}
              onConfigure={() => openBuilder(selectedInforme)}
              onUpdateSchedule={(changes) =>
                setInformes((prev) =>
                  prev.map((i) => (i.id === selectedInforme.id ? { ...i, ...changes } : i)),
                )
              }
            />
          </div>
        )}
      </div>

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
    </MainLayout>
  );
};

export default Informes;
