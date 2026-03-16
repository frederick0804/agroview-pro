import { useState, useMemo } from "react";
import { InformesBuilder, type BuilderConfig } from "./InformesBuilder";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRole, ROLE_LEVELS } from "@/contexts/RoleContext";
import {
  BarChart2,
  FileText,
  Table2,
  TrendingUp,
  LayoutGrid,
  List,
  Search,
  Star,
  Lock,
  Calendar,
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
  Zap,
  AlertTriangle,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  Layers,
  Settings2,
  Pencil,
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
type FormatoExport = "pdf" | "excel" | "csv";
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
  veces_generado: number;
  ultimo_uso?: string;
  cliente_id?: number;
  created_at: string;
  fuentes: string[];
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
  pdf: { label: "PDF", icon: FileBarChart, color: "text-rose-500" },
  excel: { label: "Excel", icon: FileSpreadsheet, color: "text-green-600" },
  csv: { label: "CSV", icon: FileText, color: "text-slate-500" },
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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface InformeCardProps {
  informe: Informe;
  canAccess: boolean;
  selected: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  compact?: boolean;
}

function InformeCard({
  informe,
  canAccess,
  selected,
  onClick,
  onToggleFavorite,
  compact = false,
}: InformeCardProps) {
  const cat = CATEGORIA_CONFIG[informe.categoria];
  const tipo = TIPO_CONFIG[informe.tipo_informe];
  const estado = ESTADO_CONFIG[informe.estado];
  const CatIcon = cat.icon;
  const TipoIcon = tipo.icon;
  const EstadoIcon = estado.icon;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all",
          selected
            ? "bg-primary/5 border-primary/30 shadow-sm"
            : "bg-card border-border hover:border-primary/20 hover:bg-muted/30",
          !canAccess && "opacity-50",
        )}
      >
        <div className={cn("p-1.5 rounded-md flex-shrink-0", cat.bg, cat.border, "border")}>
          <CatIcon className={cn("w-3.5 h-3.5", cat.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{informe.nombre}</p>
          <p className="text-[10px] text-muted-foreground">{informe.codigo}</p>
        </div>
        {!canAccess && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
        {informe.es_favorito && (
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
        {selected && <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card border rounded-xl p-4 cursor-pointer transition-all duration-200",
        selected
          ? "border-primary/50 shadow-md ring-1 ring-primary/20"
          : "border-border hover:border-primary/30 hover:shadow-sm",
        !canAccess && "opacity-60",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg border", cat.bg, cat.border)}>
            <CatIcon className={cn("w-4 h-4", cat.color)} />
          </div>
          <div>
            <span className="text-[10px] font-mono text-muted-foreground">{informe.codigo}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <TipoIcon className={cn("w-3 h-3", tipo.color)} />
              <span className="text-[10px] text-muted-foreground">{tipo.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {informe.es_programado && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"
              title={`Programado: ${informe.frecuencia_programacion}`}
            >
              <Zap className="w-2.5 h-2.5" />
              {informe.frecuencia_programacion}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 rounded-md hover:bg-amber-50 transition-colors"
            title={informe.es_favorito ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            <Star
              className={cn(
                "w-3.5 h-3.5 transition-colors",
                informe.es_favorito
                  ? "text-amber-400 fill-amber-400"
                  : "text-muted-foreground/40 group-hover:text-muted-foreground",
              )}
            />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm leading-snug mb-1.5 line-clamp-2">{informe.nombre}</h3>

      {/* Description */}
      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
        {informe.descripcion}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full border",
              estado.badge,
            )}
          >
            <EstadoIcon className="w-2.5 h-2.5" />
            {estado.label}
          </span>
          <span className={cn("inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full border", cat.bg, cat.border, cat.color)}>
            {cat.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {!canAccess ? (
            <span className="inline-flex items-center gap-0.5 text-rose-500">
              <Lock className="w-3 h-3" /> Sin acceso
            </span>
          ) : (
            <>
              <span className="flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5" />
                {informe.veces_generado}x
              </span>
              {informe.ultimo_uso && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(informe.ultimo_uso)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
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
}: DetailPanelProps) {
  const [tab, setTab] = useState("info");
  const [formato, setFormato] = useState<FormatoExport>("excel");
  const [fechaDesde, setFechaDesde] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [generando, setGenerando] = useState(false);
  const [generacionOk, setGeneracionOk] = useState(false);

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
                  <div className="grid grid-cols-3 gap-2">
                    {(["excel", "pdf", "csv"] as FormatoExport[]).map((f) => {
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
                      <Input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Hasta</label>
                      <Input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        className="h-8 text-xs"
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
      </Tabs>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const Informes = () => {
  const { role, hasPermission } = useRole();
  const userLevel = ROLE_LEVELS[role];
  const canExport = hasPermission("informes", "exportar");
  const canCreate = hasPermission("informes", "crear");

  // Estado local
  const [informes, setInformes] = useState<Informe[]>(INFORMES_DEMO);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTarget, setBuilderTarget] = useState<{ id?: string; nombre: string; descripcion: string; categoria: string } | null>(null);

  const openBuilder = (inf?: Informe) => {
    setBuilderTarget(inf ? { id: inf.id, nombre: inf.nombre, descripcion: inf.descripcion, categoria: inf.categoria } : { nombre: "", descripcion: "", categoria: "general" });
    setBuilderOpen(true);
  };
  const handleBuilderSave = (cfg: BuilderConfig) => {
    if (cfg.id) {
      setInformes(prev => prev.map(i => i.id === cfg.id ? { ...i, nombre: cfg.nombre || i.nombre, descripcion: cfg.descripcion || i.descripcion, categoria: cfg.categoria as Informe["categoria"] } : i));
    }
    setBuilderOpen(false);
  };

  // Check de acceso por informe
  const canAccessInforme = (inf: Informe): boolean => {
    if (userLevel < inf.nivel_acceso_minimo) return false;
    if (inf.roles_permitidos && inf.roles_permitidos.length > 0) {
      return inf.roles_permitidos.includes(role);
    }
    return true;
  };

  // Informe seleccionado
  const selectedInforme = informes.find((i) => i.id === selectedId) ?? null;

  // Filtrado
  const filtered = useMemo(() => {
    let list = informes;
    if (activeTab !== "all") list = list.filter((i) => i.categoria === activeTab);
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
    if (soloFavoritos) list = list.filter((i) => i.es_favorito);
    return list;
  }, [informes, activeTab, search, filterTipo, filterEstado, soloFavoritos]);

  // Stats para el tab activo
  const stats = useMemo(() => {
    const scope = activeTab === "all" ? informes : informes.filter((i) => i.categoria === activeTab);
    return {
      total: scope.length,
      accesibles: scope.filter(canAccessInforme).length,
      favoritos: scope.filter((i) => i.es_favorito).length,
      programados: scope.filter((i) => i.es_programado).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [informes, activeTab, role]);

  const toggleFavorite = (id: string) => {
    setInformes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, es_favorito: !i.es_favorito } : i)),
    );
  };

  const TABS: { value: string; label: string; icon: React.ElementType }[] = [
    { value: "all", label: "Todos", icon: BarChart2 },
    { value: "laboratorio", label: "Laboratorio", icon: FlaskConical },
    { value: "vivero", label: "Vivero", icon: Sprout },
    { value: "siembra", label: "Siembra", icon: Leaf },
    { value: "cosecha", label: "Cosecha", icon: Scissors },
    { value: "poscosecha", label: "Poscosecha", icon: Package },
    { value: "general", label: "General", icon: Globe },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Informes"
        description="Generación, consulta y programación de informes operacionales."
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button size="sm" className="gap-1.5" onClick={() => openBuilder()}>
                <Plus className="w-4 h-4" />
                Nuevo informe
              </Button>
            )}
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Informes totales",
            value: stats.total,
            icon: FileText,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Accesibles",
            value: stats.accesibles,
            icon: CheckCircle2,
            color: "text-success",
            bg: "bg-success/5",
          },
          {
            label: "Favoritos",
            value: stats.favoritos,
            icon: Star,
            color: "text-amber-500",
            bg: "bg-amber-50",
          },
          {
            label: "Programados",
            value: stats.programados,
            icon: Zap,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
        ].map((s) => {
          const SIcon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
            >
              <div className={cn("p-2 rounded-lg", s.bg)}>
                <SIcon className={cn("w-4 h-4", s.color)} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className={cn("flex gap-4 transition-all", selectedInforme ? "items-start" : "")}>
        {/* Left column — list */}
        <div className={cn("flex-1 min-w-0 space-y-4", selectedInforme && "max-w-[calc(100%-340px)]")}>
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v);
              setSelectedId(null);
            }}
          >
            {/* Category tabs */}
            <div className="overflow-x-auto pb-1">
              <TabsList className="bg-muted p-1 rounded-lg h-9 inline-flex gap-0.5 min-w-max">
                {TABS.map((t) => {
                  const TIcon = t.icon;
                  const count =
                    t.value === "all"
                      ? informes.length
                      : informes.filter((i) => i.categoria === t.value).length;
                  return (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="gap-1.5 text-xs h-7 px-3 rounded-md data-[state=active]:shadow-sm"
                    >
                      <TIcon className="w-3.5 h-3.5" />
                      {t.label}
                      <span className="text-[9px] opacity-60">{count}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar informes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 text-xs w-[120px]">
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
                <SelectTrigger className="h-8 text-xs w-[120px]">
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
              <button
                onClick={() => setSoloFavoritos((v) => !v)}
                className={cn(
                  "h-8 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-all",
                  soloFavoritos
                    ? "bg-amber-50 border-amber-300 text-amber-600"
                    : "border-border text-muted-foreground hover:border-amber-200",
                )}
              >
                <Star className={cn("w-3.5 h-3.5", soloFavoritos && "fill-amber-400")} />
                Favoritos
              </button>
              <div className="flex items-center border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content for all tabs (filtered) */}
            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-0">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center bg-card rounded-xl border border-border">
                    <BarChart2 className="w-10 h-10 text-muted-foreground/30" />
                    <div>
                      <p className="font-medium">Sin resultados</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ajusta los filtros para ver informes disponibles.
                      </p>
                    </div>
                    {(search || filterTipo !== "all" || filterEstado !== "all" || soloFavoritos) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setFilterTipo("all");
                          setFilterEstado("all");
                          setSoloFavoritos(false);
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  <div
                    className={cn(
                      "grid gap-3",
                      selectedInforme
                        ? "grid-cols-1 xl:grid-cols-2"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                    )}
                  >
                    {filtered.map((inf) => (
                      <InformeCard
                        key={inf.id}
                        informe={inf}
                        canAccess={canAccessInforme(inf)}
                        selected={inf.id === selectedId}
                        onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                        onToggleFavorite={() => toggleFavorite(inf.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {filtered.map((inf) => (
                      <InformeCard
                        key={inf.id}
                        informe={inf}
                        canAccess={canAccessInforme(inf)}
                        selected={inf.id === selectedId}
                        onClick={() => setSelectedId(inf.id === selectedId ? null : inf.id)}
                        onToggleFavorite={() => toggleFavorite(inf.id)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right panel — detail */}
        {selectedInforme && (
          <div className="w-[320px] flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden sticky top-4 max-h-[calc(100vh-120px)] flex flex-col">
            <DetailPanel
              informe={selectedInforme}
              generaciones={GENERACIONES_DEMO}
              canAccess={canAccessInforme(selectedInforme)}
              canExport={canExport}
              canCreate={canCreate}
              onToggleFavorite={() => toggleFavorite(selectedInforme.id)}
              onClose={() => setSelectedId(null)}
              onConfigure={() => openBuilder(selectedInforme)}
            />
          </div>
        )}
      </div>

      {/* Builder overlay */}
      {builderOpen && builderTarget && (
        <InformesBuilder
          informe={builderTarget.id ? { id: builderTarget.id, nombre: builderTarget.nombre, descripcion: builderTarget.descripcion, categoria: builderTarget.categoria } : undefined}
          onClose={() => setBuilderOpen(false)}
          onSave={handleBuilderSave}
        />
      )}
    </MainLayout>
  );
};

export default Informes;
