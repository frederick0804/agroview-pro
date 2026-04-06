// --------- Informe Builder - Editor visual con soporte de múltiples bloques ---------------------------
// Permite agregar múltiples gráficos y tablas al mismo informe con live preview.

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Save,
  FlaskConical,
  Sprout,
  Leaf,
  Scissors,
  Package,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  BarChart2,
  BarChartHorizontal,
  TrendingUp,
  Waves,
  PieChart as PieIcon,
  Radar as RadarIcon,
  Layers,
  Palette,
  Database,
  SlidersHorizontal,
  Type,
  Globe,
  Eye,
  Shuffle,
  AlignLeft,
  FileEdit,
  Table2,
  Plus,
  Pencil,
  GripVertical,
  Trash2,
  Calculator,
  FunctionSquare,
  Link2,
  Sigma,
  Image,
  FileText,
  Ruler,
  Layout,
  AlignCenter,
  AlignRight,
  Grid3x3,
  Upload,
  LayoutTemplate,
  Filter,
  TreePine,
  Minus,
} from "lucide-react";

// --------- Template constants for better performance ---------------------------------------------------------------------------------------------

const TEMPLATE_DEFINITIONS = {
  rendimiento_semanal: {
    config: {
      nombre: "Rendimiento Semanal",
      descripcion: "Análisis del rendimiento de cosecha por semanas con métricas clave de producción",
      categoria: "cosecha" as const,
      createBloques: () => [{
        id: `grafico_${Date.now()}`,
        tipo: "grafico" as const,
        titulo: "Tendencia de Rendimiento",
        moduloActivo: "cosecha",
        fuentesSeleccionadas: ["cosecha_kg", "cosecha_calidad"],
        dimension: "semana",
        metricas: ["peso_kg", "calidad_promedio"],
        tipoGrafico: "line" as TipoGrafico,
        apilado: false,
        mostrarLeyenda: true,
        mostrarGrid: true,
        mostrarTooltip: true,
      }],
    },
  },
  comparativo_productores: {
    config: {
      nombre: "Comparativo por Productores",
      descripcion: "Comparación de métricas clave entre diferentes productores",
      categoria: "general" as const,
      createBloques: () => [{
        id: `grafico_${Date.now()}`,
        tipo: "grafico" as const,
        titulo: "Rendimiento por Productor",
        moduloActivo: "cosecha",
        fuentesSeleccionadas: ["cosecha_kg"],
        dimension: "productor",
        metricas: ["peso_kg"],
        tipoGrafico: "bar_v" as TipoGrafico,
        apilado: false,
        mostrarLeyenda: false,
        mostrarGrid: true,
        mostrarTooltip: true,
      }],
    },
  },
  analisis_laboratorio: {
    config: {
      nombre: "Análisis de Laboratorio",
      descripcion: "Resultados detallados de análisis químicos y de calidad",
      categoria: "laboratorio" as const,
      createBloques: () => [{
        id: `tabla_${Date.now()}`,
        tipo: "tabla" as const,
        titulo: "Resultados de Análisis",
        moduloActivo: "laboratorio",
        fuentesSeleccionadas: ["suelo_ph", "nutrientes"],
        columnas: ["muestra", "ph", "nitrogeno", "fosforo", "potasio"],
        estilos: { mostrarBordes: true, alternarFilas: true, tamañoFuente: "sm" as const, alineacion: "left" as const, compacta: false },
      }],
    },
  },
  dashboard_completo: {
    config: {
      nombre: "Dashboard Completo",
      descripcion: "Vista integral con múltiples gráficos y tablas para análisis completo",
      categoria: "general" as const,
      createBloques: () => [
        {
          id: `grafico_${Date.now()}_1`,
          tipo: "grafico" as const,
          titulo: "Rendimiento por Semana",
          moduloActivo: "cosecha",
          fuentesSeleccionadas: ["cosecha_kg"],
          dimension: "semana",
          metricas: ["peso_kg"],
          tipoGrafico: "area" as TipoGrafico,
          apilado: false,
          mostrarLeyenda: true,
          mostrarGrid: true,
          mostrarTooltip: true,
        },
        {
          id: `grafico_${Date.now()}_2`,
          tipo: "grafico" as const,
          titulo: "Distribución por Variedad",
          moduloActivo: "siembra",
          fuentesSeleccionadas: ["variedad_plantada"],
          dimension: "variedad",
          metricas: ["superficie_m2"],
          tipoGrafico: "pie" as TipoGrafico,
          apilado: false,
          mostrarLeyenda: true,
          mostrarGrid: false,
          mostrarTooltip: true,
        },
        {
          id: `tabla_${Date.now()}`,
          tipo: "tabla" as const,
          titulo: "Resumen por Productor",
          moduloActivo: "general",
          fuentesSeleccionadas: ["productor_info", "cosecha_kg"],
          columnas: ["productor", "superficie_total", "peso_kg", "rendimiento_kg_m2"],
          estilos: { mostrarBordes: true, alternarFilas: true, tamañoFuente: "sm" as const, alineacion: "left" as const, compacta: false },
        },
      ],
    },
  },
} as const;

type TemplateId = keyof typeof TEMPLATE_DEFINITIONS;

type DesignSectionId =
  | "paleta"
  | "logo"
  | "encabezado"
  | "contenido"
  | "disposicion"
  | "formato"
  | "margenes"
  | "tablas"
  | "graficos";

const DESIGN_SECTION_ORDER: DesignSectionId[] = [
  "paleta",
  "logo",
  "encabezado",
  "contenido",
  "disposicion",
  "formato",
  "margenes",
  "tablas",
  "graficos",
];

const DESIGN_SECTION_LABELS: Record<DesignSectionId, string> = {
  paleta: "Paleta de colores",
  logo: "Logo e imágenes",
  encabezado: "Encabezado",
  contenido: "Contenido del informe",
  disposicion: "Disposición en página",
  formato: "Formato de página",
  margenes: "Márgenes",
  tablas: "Estilo global de tablas",
  graficos: "Estilo global de gráficos",
};

// --------- Tipos ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export type TipoGrafico =
  | "bar_v"
  | "bar_h"
  | "line"
  | "area"
  | "pie"
  | "radar"
  | "composed";

interface CampoInfo {
  id: string;
  label: string;
  tipo: "dimension" | "metrica";
  unidad?: string;
  modulo?: string;
  fuenteId?: string;
  fuenteLabel?: string;
  origenes?: Array<{
    modulo: string;
    fuenteId: string;
    fuenteLabel: string;
  }>;
}

interface FuenteInfo {
  id: string;
  label: string;
  campos: CampoInfo[];
}

interface CampoCalculado {
  id: string;
  label: string;
  tipo: "formula" | "agregacion";
  // Formula mode (A op B)
  operacion: "/" | "+" | "-" | "*" | "pct";
  campoA: string;  // "FUENTE_ID:campo_id"
  campoB: string;  // "FUENTE_ID:campo_id"
  // Aggregation mode (group by dim, aggregate metric)
  agruparPor?: string[];         // Array de "FUENTE_ID:campo_id" de tipo dimension (permite múltiples agrupaciones)
  campoAgregado?: string;        // "FUENTE_ID:campo_id" de tipo metrica
  operacionAgrupacion?: "suma" | "promedio" | "mediana" | "minimo" | "maximo" | "conteo" | "desviacion";
  unidad?: string;
}

// productor/periodo/semana → valor automático del sistema; custom → valor manual fijo
export type FuenteCampo = "productor" | "periodo" | "semana" | "custom";

export interface CampoEncabezado {
  id: string;
  label: string;          // nombre editable del campo
  fuente: FuenteCampo;    // fuente del dato
  valor: string;          // valor manual (solo cuando fuente === "custom")
  zona: "datos" | "meta"; // "datos" = franja inferior; "meta" = tabla lateral derecha
}

export interface PlantillaConfig {
  encabezado: {
    mostrarEmpresa: boolean;
    mostrarFecha: boolean;
    textoPersonalizado: string;
    campos: CampoEncabezado[];  // campos dinámicos ordenables
    colorBorde: string;
    // Configuración avanzada de encabezado
    altura: "sm" | "md" | "lg";
    logoPersonalizado?: string; // URL o base64 de imagen
    posicionLogo: "left" | "center" | "right";
    alineacionTitulo: "left" | "center" | "right";
    separacionElementos: number;
    mostrarLinea: boolean;
  };
  columnas: string[];
  incluirNotas: boolean;
  incluirConclusiones: boolean;
  incluirFirma: boolean;
  piePagina: string;
  // Configuraciones avanzadas
  imagenes?: {
    logoEmpresa?: string;
    imagenFondo?: string;
    marcaAgua?: string;
    opacidadMarcaAgua: number;
  };
  margenes: {
    superior: number;
    inferior: number;
    izquierdo: number;
    derecho: number;
  };
  formato: {
    tamañoPagina: "A4" | "Letter" | "A3";
    orientacion: "portrait" | "landscape";
    numeracionPaginas: boolean;
    posicionNumeracion: "header" | "footer" | "none";
  };
  // Grid layout — keyed by bloqueId, value is the column width for that block
  layoutConfig?: Record<string, ColSpan>;
  // Block height in natural preview px — keyed by bloqueId
  alturaBloques?: Record<string, number>;
  // Global visual style applied to ALL tables in the report
  estiloTablas?: {
    mostrarBordes: boolean;
    alternarFilas: boolean;
    alineacion: "left" | "center" | "right";
    compacta: boolean;
    tipografia: TipografiaBloque;
  };
  // Global visual style applied to ALL charts in the report
  estiloGraficos?: {
    tipografia: TipografiaBloque;
  };
}

export type AgregacionTipo = "suma" | "promedio" | "mediana";

export type ColSpan = "full" | "half" | "third" | "two-thirds";

export interface TipografiaBloque {
  fuente: string;       // CSS font-family string
  tamano: number;       // pt value, e.g. 10
  encabezadoBold: boolean;
  encabezadoItalic: boolean;
  cuerpoBold: boolean;
  cuerpoItalic: boolean;
}

export interface TextoBloque {
  id: string;
  tipo: "texto";
  subtipo: "observaciones" | "conclusiones" | "descripcion" | "libre";
  titulo?: string;
  colSpan?: ColSpan;
  // No content field — text blocks are template placeholders; the end user fills them in the final report
  tipografia?: TipografiaBloque;
}

export interface GraficoBloque {
  id: string;
  tipo: "grafico";
  titulo: string;
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  dimension: string;
  metricas: string[];

  agregaciones?: Record<string, AgregacionTipo>;
  tipoGrafico: TipoGrafico;
  apilado: boolean;
  mostrarLeyenda: boolean;
  mostrarGrid: boolean;
  mostrarTooltip: boolean;
  camposCalculados?: CampoCalculado[];
  filtrosJerarquia?: Record<string, string[]>;
  tipografia?: TipografiaBloque;
}

export interface TablaBloque {
  id: string;
  tipo: "tabla";
  titulo: string;
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  columnas: string[];
  groupBy?: string[];
  agregaciones?: Record<string, AgregacionTipo>;
  filtrosJerarquia?: Record<string, string[]>;
  camposCalculados?: CampoCalculado[];
  // Configuración avanzada de tabla
  estilos?: {
    mostrarBordes: boolean;
    alternarFilas: boolean;
    tamañoFuente: "xs" | "sm" | "base" | "lg";
    alineacion: "left" | "center" | "right";
    compacta: boolean;
    // Tipografía
    fuente?: string;
    encabezadoBold?: boolean;
    encabezadoItalic?: boolean;
    cuerpoItalic?: boolean;
    cuerpoBold?: boolean;
  };
  paginacion?: {
    habilitada: boolean;
    filasPorPagina: number;
    mostrarControles: boolean;
  };
  tipografia?: TipografiaBloque;
}

export type ReporteBloque = GraficoBloque | TablaBloque | TextoBloque;

export interface BuilderConfig {
  id?: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  bloques: ReporteBloque[];
  // Global appearance
  paletaId: string;
  mostrarLogo: boolean;
  titulo: string;
  subtitulo: string;
  // Plantilla
  plantilla?: PlantillaConfig;
}

export interface InformesBuilderProps {
  informe?: { id: string; nombre: string; descripcion: string; categoria: string };
  existingConfig?: BuilderConfig;
  onClose: () => void;
  onSave: (config: BuilderConfig) => void;
}

// --------- Datos de fuentes disponibles ------------------------------------------------------------------------------------------------------------------------------------

const MODULOS_FUENTES: Record<string, { icon: React.ElementType; color: string; fuentes: FuenteInfo[] }> = {
  "Laboratorio / Vivero": {
    icon: FlaskConical,
    color: "text-violet-600",
    fuentes: [
      {
        id: "LOTE_INTRODUCCION",
        label: "Lotes de Introducción",
        campos: [
          { id: "cantidad_plantas", label: "Cantidad de plantas", tipo: "metrica", unidad: "plantas" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "fecha_ingreso", label: "Fecha de ingreso", tipo: "dimension" },
        ],
      },
      {
        id: "LOTE_MULTIPLICACION",
        label: "Lotes de Multiplicación",
        campos: [
          { id: "tasa_multiplicacion", label: "Tasa de multiplicación", tipo: "metrica", unidad: "x" },
          { id: "semanas", label: "Semanas en proceso", tipo: "dimension" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
        ],
      },
      {
        id: "LOTE_ACLIMATACION",
        label: "Aclimatación Lab",
        campos: [
          { id: "rendimiento_pct", label: "Rendimiento (%)", tipo: "metrica", unidad: "%" },
          { id: "calidad_score", label: "Score de calidad", tipo: "metrica" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
      {
        id: "LOTE_ENGORDE",
        label: "Engorde Vivero",
        campos: [
          { id: "plantas_producidas", label: "Plantas producidas", tipo: "metrica", unidad: "plantas" },
          { id: "rendimiento_pct", label: "Rendimiento (%)", tipo: "metrica", unidad: "%" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "semana", label: "Semana", tipo: "dimension" },
        ],
      },
      {
        id: "MONITOREO_MIPE",
        label: "Monitoreo MIPE",
        campos: [
          { id: "hallazgos", label: "Hallazgos", tipo: "metrica" },
          { id: "severidad", label: "Severidad promedio", tipo: "metrica" },
          { id: "tipo_plaga", label: "Tipo de plaga", tipo: "dimension" },
          { id: "sector", label: "Sector", tipo: "dimension" },
        ],
      },
    ],
  },
  "Siembra": {
    icon: Leaf,
    color: "text-green-600",
    fuentes: [
      {
        id: "CURVA_PRODUCCION",
        label: "Curva de Producción",
        campos: [
          { id: "produccion_estimada_kg", label: "Producción estimada (kg)", tipo: "metrica", unidad: "kg" },
          { id: "produccion_real_kg", label: "Producción real (kg)", tipo: "metrica", unidad: "kg" },
          { id: "semana", label: "Semana", tipo: "dimension" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
        ],
      },
      {
        id: "REGISTRO_CONTEO",
        label: "Conteos de Plantas",
        campos: [
          { id: "plantas_contadas", label: "Plantas contadas", tipo: "metrica" },
          { id: "pct_prendimiento", label: "% Prendimiento", tipo: "metrica", unidad: "%" },
          { id: "sector", label: "Sector", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
      {
        id: "APLICACION_FITOSANITARIA",
        label: "Aplicaciones Fitosanitarias",
        campos: [
          { id: "dosis_total", label: "Dosis total (L)", tipo: "metrica", unidad: "L" },
          { id: "count_aplicaciones", label: "N° aplicaciones", tipo: "metrica" },
          { id: "producto", label: "Producto", tipo: "dimension" },
          { id: "mes", label: "Mes", tipo: "dimension" },
          { id: "sector", label: "Sector", tipo: "dimension" },
        ],
      },
      {
        id: "LECTURA_PH_CE",
        label: "pH y Conductividad Eléctrica",
        campos: [
          { id: "ph", label: "pH", tipo: "metrica" },
          { id: "conductividad_electrica", label: "CE (mS/cm)", tipo: "metrica", unidad: "mS/cm" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
          { id: "sector", label: "Sector", tipo: "dimension" },
        ],
      },
      {
        id: "VISITA_MIPE",
        label: "Visitas MIPE",
        campos: [
          { id: "hallazgos_count", label: "Hallazgos", tipo: "metrica" },
          { id: "incidencia_pct", label: "Incidencia (%)", tipo: "metrica", unidad: "%" },
          { id: "sector", label: "Sector", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
    ],
  },
  "Cosecha": {
    icon: Scissors,
    color: "text-amber-600",
    fuentes: [
      {
        id: "REGISTRO_COSECHA",
        label: "Registro de Cosecha",
        campos: [
          { id: "kg_cosechados", label: "Kg cosechados", tipo: "metrica", unidad: "kg" },
          { id: "horas_trabajadas", label: "Horas trabajadas", tipo: "metrica", unidad: "h" },
          { id: "rendimiento_kg_hr", label: "Rendimiento kg/hr", tipo: "metrica", unidad: "kg/h" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "operario", label: "Operario", tipo: "dimension" },
          { id: "semana", label: "Semana", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
      {
        id: "INSPECCION_LIBERACION",
        label: "Inspecciones de Liberación",
        campos: [
          { id: "aprobados", label: "Lotes aprobados", tipo: "metrica" },
          { id: "rechazados", label: "Lotes rechazados", tipo: "metrica" },
          { id: "pct_aprobacion", label: "% Aprobación", tipo: "metrica", unidad: "%" },
          { id: "inspector", label: "Inspector", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
    ],
  },
  "Poscosecha": {
    icon: Package,
    color: "text-orange-600",
    fuentes: [
      {
        id: "INGRESO_FRUTA",
        label: "Ingreso de Fruta",
        campos: [
          { id: "kg_ingresados", label: "Kg ingresados", tipo: "metrica", unidad: "kg" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "categoria", label: "Categoría", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
      {
        id: "INDICES_CALIDAD",
        label: "Índices de Calidad",
        campos: [
          { id: "brix", label: "Brix (°)", tipo: "metrica", unidad: "°" },
          { id: "firmeza", label: "Firmeza (N)", tipo: "metrica", unidad: "N" },
          { id: "color_score", label: "Score de color", tipo: "metrica" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
      {
        id: "STOCK_MENSUAL",
        label: "Stock Mensual",
        campos: [
          { id: "stock_kg", label: "Stock (kg)", tipo: "metrica", unidad: "kg" },
          { id: "variedad", label: "Variedad", tipo: "dimension" },
          { id: "camara", label: "Cámara", tipo: "dimension" },
          { id: "mes", label: "Mes", tipo: "dimension" },
        ],
      },
      {
        id: "DESPACHO_EXPORTACION",
        label: "Despachos de Exportación",
        campos: [
          { id: "kg_despachados", label: "Kg despachados", tipo: "metrica", unidad: "kg" },
          { id: "pallets", label: "Pallets", tipo: "metrica" },
          { id: "destino", label: "Destino", tipo: "dimension" },
          { id: "semana", label: "Semana", tipo: "dimension" },
        ],
      },
      {
        id: "REGISTRO_TEMPERATURA",
        label: "Temperaturas",
        campos: [
          { id: "temp_min", label: "Temperatura mín (°C)", tipo: "metrica", unidad: "°C" },
          { id: "temp_max", label: "Temperatura máx (°C)", tipo: "metrica", unidad: "°C" },
          { id: "temp_media", label: "Temperatura media (°C)", tipo: "metrica", unidad: "°C" },
          { id: "camara", label: "Cámara", tipo: "dimension" },
          { id: "fecha", label: "Fecha", tipo: "dimension" },
        ],
      },
    ],
  },
};

// ─── Estructura jerárquica del cultivo ───────────────────────────────────────

interface NivelJerarquia {
  nivel: string;
  label: string;
  values: Array<{ id: string; label: string; parentId: string | null }>;
}

const ESTRUCTURA_CULTIVO: NivelJerarquia[] = [
  {
    nivel: "finca", label: "Finca",
    values: [
      { id: "finca_norte",   label: "Finca Norte",   parentId: null },
      { id: "finca_sur",     label: "Finca Sur",     parentId: null },
      { id: "finca_central", label: "Finca Central", parentId: null },
    ],
  },
  {
    nivel: "bloque", label: "Bloque",
    values: [
      { id: "bloque_a", label: "Bloque A", parentId: "finca_norte" },
      { id: "bloque_b", label: "Bloque B", parentId: "finca_norte" },
      { id: "bloque_c", label: "Bloque C", parentId: "finca_sur" },
      { id: "bloque_d", label: "Bloque D", parentId: "finca_sur" },
      { id: "bloque_e", label: "Bloque E", parentId: "finca_central" },
    ],
  },
  {
    nivel: "parcela", label: "Parcela",
    values: [
      { id: "parcela_1", label: "Parcela 1", parentId: "bloque_a" },
      { id: "parcela_2", label: "Parcela 2", parentId: "bloque_a" },
      { id: "parcela_3", label: "Parcela 3", parentId: "bloque_b" },
      { id: "parcela_4", label: "Parcela 4", parentId: "bloque_c" },
      { id: "parcela_5", label: "Parcela 5", parentId: "bloque_d" },
      { id: "parcela_6", label: "Parcela 6", parentId: "bloque_e" },
    ],
  },
  {
    nivel: "sector", label: "Sector",
    values: [
      { id: "sector_1a", label: "Sector 1A", parentId: "parcela_1" },
      { id: "sector_1b", label: "Sector 1B", parentId: "parcela_1" },
      { id: "sector_2a", label: "Sector 2A", parentId: "parcela_2" },
      { id: "sector_3a", label: "Sector 3A", parentId: "parcela_3" },
      { id: "sector_4a", label: "Sector 4A", parentId: "parcela_4" },
      { id: "sector_5a", label: "Sector 5A", parentId: "parcela_5" },
      { id: "sector_6a", label: "Sector 6A", parentId: "parcela_6" },
    ],
  },
];

// --------- Paletas de color ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const PALETAS = [
  { id: "ocean",      nombre: "Océano",     colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"] },
  { id: "nature",     nombre: "Naturaleza", colors: ["#16a34a", "#84cc16", "#14b8a6", "#f59e0b", "#6366f1"] },
  { id: "sunset",     nombre: "Atardecer",  colors: ["#f97316", "#ec4899", "#a855f7", "#6366f1", "#3b82f6"] },
  { id: "earth",      nombre: "Tierra",     colors: ["#92400e", "#b45309", "#d97706", "#65a30d", "#15803d"] },
  { id: "agroworkin", nombre: "Agroworkin", colors: ["#22c55e", "#15803d", "#86efac", "#4ade80", "#166534"] },
  { id: "mono",       nombre: "Gris",       colors: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1"] },
];

const DEFAULT_TIPOGRAFIA: TipografiaBloque = {
  fuente: "Calibri, sans-serif",
  tamano: 10,
  encabezadoBold: true,
  encabezadoItalic: false,
  cuerpoBold: false,
  cuerpoItalic: false,
};

const BLOCK_HEIGHT_DEFAULT: Record<ReporteBloque["tipo"], number> = {
  grafico: 220,
  tabla: 228,
  texto: 120,
};

const BLOCK_HEIGHT_MIN: Record<ReporteBloque["tipo"], number> = {
  grafico: 140,
  tabla: 140,
  texto: 90,
};

const BLOCK_HEIGHT_MAX: Record<ReporteBloque["tipo"], number> = {
  grafico: 520,
  tabla: 520,
  texto: 320,
};

const FUENTE_CAMPO_LABEL: Record<FuenteCampo, string> = {
  productor: "Productor",
  periodo:   "Período",
  semana:    "Semana",
  custom:    "Manual",
};

// Demo values shown in the page preview
const FUENTE_DEMO_VALUE: Record<FuenteCampo, string> = {
  productor: "Aaazuli",
  periodo:   "2026-03-09 al 2026-03-15",
  semana:    "2611",
  custom:    "",
};

function getCampoEncabezadoPreviewValue(campo: CampoEncabezado): string | null {
  if (campo.fuente !== "custom") return FUENTE_DEMO_VALUE[campo.fuente];
  return campo.valor?.trim() || null;
}

function clampBlockHeight(tipo: ReporteBloque["tipo"], value: number): number {
  const min = BLOCK_HEIGHT_MIN[tipo];
  const max = BLOCK_HEIGHT_MAX[tipo];
  return Math.max(min, Math.min(max, Math.round(value)));
}

function resolveBlockHeight(
  bloque: ReporteBloque,
  alturaBloques?: Record<string, number>,
): number {
  const configured = alturaBloques?.[bloque.id];
  if (typeof configured !== "number" || Number.isNaN(configured)) {
    return BLOCK_HEIGHT_DEFAULT[bloque.tipo];
  }
  return clampBlockHeight(bloque.tipo, configured);
}

// --------- Tipos de gráfico ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const TIPOS_GRAFICO: { id: TipoGrafico; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "bar_v",    label: "Barras",    icon: BarChart2,          desc: "Vertical" },
  { id: "bar_h",    label: "Barras H",  icon: BarChartHorizontal, desc: "Horizontal" },
  { id: "line",     label: "Líneas",    icon: TrendingUp,         desc: "Tendencias" },
  { id: "area",     label: "Áreas",     icon: Waves,              desc: "Acumulado" },
  { id: "pie",      label: "Circular",  icon: PieIcon,            desc: "Proporciones" },
  { id: "radar",    label: "Radar",     icon: RadarIcon,          desc: "Multi-eje" },
  { id: "composed", label: "Compuesto", icon: Layers,             desc: "Barra+Línea" },
];

// --------- Mock data helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function stableVal(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
  return min + Math.abs(h) % (max - min);
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(expanded, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function aggregateMetricValues(values: number[], mode: AgregacionTipo): number {
  if (values.length === 0) return 0;
  if (mode === "promedio") {
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    return Number(avg.toFixed(2));
  }
  if (mode === "mediana") {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    }
    return Number(sorted[mid].toFixed(2));
  }
  return Number(values.reduce((acc, v) => acc + v, 0).toFixed(2));
}

const DIM_VALUES: Record<string, string[]> = {
  semana:     ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"],
  mes:        ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
  fecha:      ["01/03", "05/03", "10/03", "15/03", "20/03", "25/03", "30/03"],
  fecha_ingreso: ["01/03", "05/03", "10/03", "15/03", "20/03", "25/03", "30/03"],
  semanas:    ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"],
  bloque:     ["A1", "A2", "B1", "B2", "C1", "C2"],
  variedad:   ["Biloxi", "O'Neal", "Festival", "Camarosa", "Emerald"],
  calibre:    ["Super Jumbo", "Jumbo", "Extra", "Mini", "Fruta Roja", "Descarte", "Desecho"],
  operario:   ["J. Pérez", "M. López", "R. Silva", "P. Torres", "C. Gómez"],
  sector:     ["Sector A", "Sector B", "Sector C", "Sector D"],
  camara:     ["Cámara 1", "Cámara 2", "Cámara 3", "Cámara 4"],
  categoria:  ["Extra", "Primera", "Segunda", "Descarte"],
  producto:   ["Fungicida A", "Insecticida B", "Herbicida C", "Acaricida D"],
  tipo_plaga: ["Botrytis", "Araña roja", "Trips", "Oídio"],
  destino:    ["USA", "Europa", "Asia", "Mercado local"],
  inspector:  ["Ana G.", "Carlos M.", "Roberto S.", "María L."],
};

const METRIC_RANGES: Record<string, [number, number]> = {
  kg_cosechados:           [800, 3200],
  horas_trabajadas:        [6, 10],
  rendimiento_kg_hr:       [60, 180],
  kg_ingresados:           [1000, 5000],
  kg_despachados:          [2000, 8000],
  stock_kg:                [500, 4000],
  pallets:                 [8, 40],
  brix:                    [8, 18],
  firmeza:                 [3, 12],
  color_score:             [60, 100],
  ph:                      [55, 70],
  conductividad_electrica: [12, 28],
  temp_min:                [-20, -5],
  temp_max:                [-5, 5],
  temp_media:              [-15, -2],
  rendimiento_pct:         [65, 95],
  tasa_multiplicacion:     [3, 12],
  plantas_producidas:      [500, 4000],
  cantidad_plantas:        [200, 2000],
  calidad_score:           [70, 98],
  pct_prendimiento:        [75, 98],
  plantas_contadas:        [800, 3000],
  dosis_total:             [10, 80],
  count_aplicaciones:      [1, 8],
  hallazgos:               [0, 20],
  hallazgos_count:         [0, 15],
  severidad:               [10, 80],
  incidencia_pct:          [2, 35],
  produccion_estimada_kg:  [1200, 5000],
  produccion_real_kg:      [1000, 4800],
  aprobados:               [8, 25],
  rechazados:              [0, 5],
  pct_aprobacion:          [80, 100],
  semanas:                 [4, 16],
};

// Global label map (all campos from all modules)
const LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.values(MODULOS_FUENTES)
    .flatMap((m) => m.fuentes)
    .flatMap((f) => f.campos)
    .map((c) => [c.id, c.label]),
);

function generateMockData(
  metricas: string[],
  dimension: string,
): Record<string, string | number>[] {
  const labels = DIM_VALUES[dimension] ?? Array.from({ length: 6 }, (_, i) => `Item ${i + 1}`);
  return labels.map((name) => {
    const row: Record<string, string | number> = { name };
    for (const m of metricas) {
      const [lo, hi] = METRIC_RANGES[m] ?? [100, 1000];
      let val = stableVal(`${name}-${m}`, lo, hi);
      if (m === "ph") val = +(val / 10).toFixed(1);
      else if (m === "conductividad_electrica") val = +(val / 10).toFixed(2);
      else if (m === "temp_min" || m === "temp_max" || m === "temp_media") val = +(val).toFixed(1);
      row[m] = val;
    }
    return row;
  });
}

// --------- Helper factories ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let _bCounter = 0;
function nextId(prefix: string) { return `${prefix}-${Date.now()}-${++_bCounter}`; }

function createDefaultGrafico(num: number): GraficoBloque {
  return {
    id: nextId("g"),
    tipo: "grafico",
    titulo: `Gráfico ${num}`,
    moduloActivo: "Cosecha",
    fuentesSeleccionadas: ["REGISTRO_COSECHA"],
    dimension: "semana",
    metricas: ["kg_cosechados", "rendimiento_kg_hr"],
    tipoGrafico: "bar_v",
    apilado: false,
    mostrarLeyenda: true,
    mostrarGrid: true,
    mostrarTooltip: true,
    camposCalculados: [],
  };
}

function createDefaultTabla(num: number): TablaBloque {
  return {
    id: nextId("t"),
    tipo: "tabla",
    titulo: `Tabla ${num}`,
    moduloActivo: "Cosecha",
    fuentesSeleccionadas: ["REGISTRO_COSECHA"],
    columnas: ["semana", "kg_cosechados", "horas_trabajadas", "rendimiento_kg_hr"],
    camposCalculados: [],
  };
}

// Migration: handle old BuilderConfig format (no bloques array)
function migrateConfig(cfg: unknown): BuilderConfig {
  const c = cfg as Record<string, unknown>;
  if (Array.isArray(c.bloques)) return cfg as BuilderConfig;
  // Old single-chart format → wrap in a GraficoBloque
  const bloque: GraficoBloque = {
    id: nextId("g"),
    tipo: "grafico",
    titulo: (c.titulo as string) || (c.nombre as string) || "Gráfico 1",
    moduloActivo: (c.moduloActivo as string) || "Cosecha",
    fuentesSeleccionadas: (c.fuentesSeleccionadas as string[]) || [],
    dimension: (c.dimension as string) || "semana",
    metricas: (c.metricas as string[]) || [],
    tipoGrafico: (c.tipoGrafico as TipoGrafico) || "bar_v",
    apilado: (c.apilado as boolean) ?? false,
    mostrarLeyenda: (c.mostrarLeyenda as boolean) ?? true,
    mostrarGrid: (c.mostrarGrid as boolean) ?? true,
    mostrarTooltip: (c.mostrarTooltip as boolean) ?? true,
  };
  return {
    id: c.id as string | undefined,
    nombre: (c.nombre as string) || "",
    descripcion: (c.descripcion as string) || "",
    categoria: (c.categoria as string) || "general",
    bloques: [bloque],
    paletaId: (c.paletaId as string) || "ocean",
    mostrarLogo: (c.mostrarLogo as boolean) ?? true,
    titulo: (c.titulo as string) || (c.nombre as string) || "",
    subtitulo: (c.subtitulo as string) || "",
    plantilla: c.plantilla as PlantillaConfig | undefined,
  };
}

function sanitizeLegacyBlockNotes(builder: BuilderConfig): BuilderConfig {
  return {
    ...builder,
    bloques: builder.bloques.map((bloque) => {
      if (bloque.tipo === "grafico" || bloque.tipo === "tabla") {
        const { observaciones: _obs, conclusiones: _conc, ...rest } = bloque as any;
        return rest as ReporteBloque;
      }
      return bloque;
    }),
  };
}

// --------- Section accordion component ---------------------------------------------------------------------------------------------------------------------------------------

interface SectionProps {
  num: number;
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}
function Section({ num, title, icon: Icon, open, onToggle, children, badge }: SectionProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          open ? "bg-primary/5 border-b border-border" : "hover:bg-muted/40",
        )}
      >
        <span className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
          open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}>
          {num}
        </span>
        <Icon className={cn("w-4 h-4 shrink-0", open ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-semibold text-sm flex-1", open ? "text-primary" : "")}>{title}</span>
        {badge && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// --------- LiveChart (accepts direct props, no BuilderConfig) ---------------------------------------------------------------------

interface LiveChartProps {
  tipo: TipoGrafico;
  apilado?: boolean;
  mostrarLeyenda?: boolean;
  mostrarGrid?: boolean;
  mostrarTooltip?: boolean;
  data: Record<string, string | number>[];
  metricas: string[];
  colors: string[];
  uid: string; // for unique gradient IDs when multiple charts on page
  labelOverrides?: Record<string, string>; // extra labels for calculated fields
  fontFamily?: string;
  fontSize?: number; // pt
}

function LiveChart({
  tipo, apilado, mostrarLeyenda, mostrarGrid, mostrarTooltip,
  data, metricas, colors, uid, labelOverrides, fontFamily, fontSize,
}: LiveChartProps) {
  const label = (id: string) => labelOverrides?.[id] ?? LABEL_MAP[id] ?? id;
  const chartStyle: React.CSSProperties = {
    fontFamily: fontFamily ?? "inherit",
    fontSize: fontSize ? `${fontSize}px` : undefined,
  };
  if (data.length === 0 || metricas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40">
        <BarChart2 className="w-10 h-10" />
        <p className="text-xs text-center">Selecciona fuentes y métricas</p>
      </div>
    );
  }

  const commonProps = { data, margin: { top: 8, right: 16, left: 0, bottom: 4 } };
  const axisStyle = { fontSize: fontSize ?? 10, fill: "#6b7280", fontFamily: fontFamily ?? "inherit" };
  const gridColor = "#e5e7eb";
  const isTimeDim = true; // assume monotone for all
  const curveType = isTimeDim ? "monotone" : "linear";

  if (tipo === "pie") {
    const pieData = data.map((d) => ({
      name: d.name as string,
      value: (d[metricas[0]] as number) ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData} cx="50%" cy="50%" outerRadius="65%" innerRadius="25%"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "radar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
          {metricas.map((m, i) => (
            <Radar key={m} name={label(m)} dataKey={m}
              stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} />
          ))}
          {mostrarTooltip && <Tooltip />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "bar_h") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps} layout="vertical">
          {mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />}
          <XAxis type="number" tick={axisStyle} />
          <YAxis dataKey="name" type="category" tick={axisStyle} width={65} />
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
          {metricas.map((m, i) => (
            <Bar key={m} dataKey={m} name={label(m)} fill={colors[i % colors.length]}
              stackId={apilado ? "stack" : undefined} radius={[0, 3, 3, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "bar_v") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps}>
          {mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
          {metricas.map((m, i) => (
            <Bar key={m} dataKey={m} name={label(m)} fill={colors[i % colors.length]}
              stackId={apilado ? "stack" : undefined} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...commonProps}>
          {mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
          {metricas.map((m, i) => (
            <Line key={m} type={curveType} dataKey={m} name={label(m)}
              stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...commonProps}>
          <defs>
            {metricas.map((m, i) => (
              <linearGradient key={m} id={`${uid}-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
          {metricas.map((m, i) => (
            <Area key={m} type={curveType} dataKey={m} name={label(m)}
              stroke={colors[i % colors.length]} strokeWidth={2}
              fill={`url(#${uid}-grad-${i})`}
              stackId={apilado ? "stack" : undefined} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === "composed") {
    const [barMetric, ...lineMetrics] = metricas;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart {...commonProps}>
          {mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis yAxisId="left" tick={axisStyle} />
          {lineMetrics.length > 0 && <YAxis yAxisId="right" orientation="right" tick={axisStyle} />}
          {mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: fontSize ?? 10, fontFamily: fontFamily ?? "inherit" }} />}
          {barMetric && (
            <Bar yAxisId="left" dataKey={barMetric} name={label(barMetric)}
              fill={colors[0]} radius={[3, 3, 0, 0]} />
          )}
          {lineMetrics.map((m, i) => (
            <Line key={m} yAxisId="right" type={curveType} dataKey={m} name={label(m)}
              stroke={colors[(i + 1) % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// --------- GraficoBloqueView - chart preview for a single GraficoBloque ---------------------------------------

function GraficoBloqueView({ bloque, colors, estiloPlantilla }: { bloque: GraficoBloque; colors: string[]; estiloPlantilla?: PlantillaConfig["estiloGraficos"] }) {
  const allFuentes = useMemo(() => Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes), []);

  const camposDisponibles = useMemo((): CampoInfo[] => {
    const selected = allFuentes.filter((f) => bloque.fuentesSeleccionadas.includes(f.id));
    const all = selected.flatMap((f) => f.campos);
    const seen = new Set<string>();
    const base = all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    const calcFields: CampoInfo[] = (bloque.camposCalculados ?? []).map(cc => ({
      id: cc.id,
      label: cc.label || "Cálculo",
      tipo: "metrica" as const,
      unidad: cc.unidad,
    }));
    return [...base, ...calcFields];
  }, [bloque.fuentesSeleccionadas, bloque.camposCalculados, allFuentes]);

  const metricsDisp = camposDisponibles.filter((c) => c.tipo === "metrica");
  const dimensiones = camposDisponibles.filter((c) => c.tipo === "dimension");

  const effectiveDimension = useMemo(() => {
    if (!bloque.dimension || dimensiones.find((d) => d.id === bloque.dimension)) return bloque.dimension;
    return dimensiones[0]?.id ?? "";
  }, [bloque.dimension, dimensiones]);

  const effectiveMetricas = useMemo(() => {
    const valid = new Set(metricsDisp.map((m) => m.id));
    return bloque.metricas.filter((m) => valid.has(m));
  }, [bloque.metricas, metricsDisp]);

  const mockMetricas = effectiveMetricas.length > 0 ? effectiveMetricas : metricsDisp.slice(0, 2).map((m) => m.id);
  const mockDim = effectiveDimension || "semana";

  const mockData = useMemo(
    () => generateMockData(mockMetricas, mockDim),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mockMetricas.join(","), mockDim],
  );

  // Build label overrides so calculated fields show their user-defined name
  const calcLabelOverrides = useMemo(
    () => Object.fromEntries((bloque.camposCalculados ?? []).map((cc) => [cc.id, cc.label || "Cálculo"])),
    [bloque.camposCalculados],
  );

  const tipGrafico = estiloPlantilla?.tipografia ?? bloque.tipografia ?? DEFAULT_TIPOGRAFIA;
  return (
    <LiveChart
      tipo={bloque.tipoGrafico}
      apilado={bloque.apilado}
      mostrarLeyenda={bloque.mostrarLeyenda}
      mostrarGrid={bloque.mostrarGrid}
      mostrarTooltip={bloque.mostrarTooltip}
      data={mockData}
      metricas={mockMetricas}
      colors={colors}
      uid={bloque.id}
      labelOverrides={calcLabelOverrides}
      fontFamily={tipGrafico.fuente}
      fontSize={tipGrafico.tamano}
    />
  );
}

function TablaBloqueView({
  bloque,
  colors,
  estiloPlantilla,
  onReorderColumns,
}: {
  bloque: TablaBloque;
  colors: string[];
  estiloPlantilla?: PlantillaConfig["estiloTablas"];
  onReorderColumns?: (orderedColumnIds: string[]) => void;
}) {
  const allFuentes = useMemo(() => Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes), []);
  const groupByKeys = useMemo(() => bloque.groupBy ?? [], [bloque.groupBy]);

  const camposDisponibles = useMemo((): CampoInfo[] => {
    const selected = allFuentes.filter((f) => bloque.fuentesSeleccionadas.includes(f.id));
    const all = selected.flatMap((f) => f.campos);
    const seen = new Set<string>();
    const base = all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    const calcFields: CampoInfo[] = (bloque.camposCalculados ?? []).map(cc => ({
      id: cc.id,
      label: cc.label || "Cálculo",
      tipo: "metrica" as const,
      unidad: cc.unidad,
    }));
    return [...base, ...calcFields];
  }, [bloque.fuentesSeleccionadas, bloque.camposCalculados, allFuentes]);

  const cols = useMemo(() => {
    let base: string[];
    if (bloque.columnas.length > 0) {
      base = bloque.columnas.filter((id) => camposDisponibles.some((c) => c.id === id));
    } else {
      base = camposDisponibles.map((c) => c.id);
    }
    // Ensure group keys are included, but keep manual order when already present.
    if (groupByKeys.length > 0) {
      const missingGroupKeys = groupByKeys.filter(
        (id) => camposDisponibles.some((c) => c.id === id) && !base.includes(id),
      );
      base = [...missingGroupKeys, ...base];
    }
    return base;
  }, [bloque.columnas, groupByKeys, camposDisponibles]);

  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dropColId, setDropColId] = useState<string | null>(null);

  const handleDropReorderColumn = useCallback((targetId: string) => {
    if (!onReorderColumns || !dragColId || dragColId === targetId) return;
    const from = cols.indexOf(dragColId);
    const to = cols.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...cols];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderColumns(next);
  }, [onReorderColumns, dragColId, cols]);

  // Map each column to its parent module name (for the color band header)
  const colModuleKey = useMemo((): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [modKey, modDef] of Object.entries(MODULOS_FUENTES)) {
      for (const fuente of modDef.fuentes) {
        if (!bloque.fuentesSeleccionadas.includes(fuente.id)) continue;
        for (const campo of fuente.campos) {
          if (!result[campo.id]) result[campo.id] = modKey;
        }
      }
    }
    return result;
  }, [bloque.fuentesSeleccionadas]);

  // Theme-aware module colors so changing palette updates tables too.
  const moduleThemeColor = useMemo((): Record<string, string> => {
    const orderedModules: string[] = [];
    for (const id of cols) {
      const m = colModuleKey[id];
      if (!m || orderedModules.includes(m)) continue;
      orderedModules.push(m);
    }
    const map: Record<string, string> = {};
    orderedModules.forEach((m, i) => {
      map[m] = colors[i % colors.length];
    });
    return map;
  }, [cols, colModuleKey, colors]);

  // Build colspan bands for the super-header row
  type ModuleBand = { key: string; label: string; span: number; isDim: boolean };
  const moduleBands = useMemo((): ModuleBand[] => {
    const bands: ModuleBand[] = [];
    for (const id of cols) {
      const isDim = groupByKeys.includes(id) || camposDisponibles.find(c => c.id === id)?.tipo === "dimension";
      const label = isDim ? "__dim__" : (colModuleKey[id] ?? "__unknown__");
      if (bands.length > 0 && bands[bands.length - 1].label === label) {
        bands[bands.length - 1].span++;
      } else {
        bands.push({ key: label + bands.length, label, span: 1, isDim });
      }
    }
    return bands;
  }, [cols, colModuleKey, groupByKeys, camposDisponibles]);

  const hasMultipleModules = useMemo(() => {
    const moduleSet = new Set(
      cols
        .filter(id => !groupByKeys.includes(id) && camposDisponibles.find(c => c.id === id)?.tipo !== "dimension")
        .map(id => colModuleKey[id])
        .filter(Boolean),
    );
    return moduleSet.size > 1;
  }, [cols, colModuleKey, groupByKeys, camposDisponibles]);

  const metricColumnIds = useMemo(
    () => cols.filter((id) => camposDisponibles.find((c) => c.id === id)?.tipo === "metrica"),
    [cols, camposDisponibles],
  );

  const dataRows = useMemo(() => {
    if (cols.length === 0) return [] as Array<Record<string, string | number>>;
    const activeGroupKeys = groupByKeys.filter((id) => cols.includes(id));

    // Non-grouped table: one dimension axis as before.
    if (activeGroupKeys.length === 0) {
      const dimForRows = cols.find(id => camposDisponibles.find(c => c.id === id)?.tipo === "dimension") || "semana";
      const labels = (DIM_VALUES[dimForRows] ?? ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"]).slice(0, 6);
      return labels.map((rowLabel) => {
        const row: Record<string, string | number> = {};
        for (const id of cols) {
          const campo = camposDisponibles.find((c) => c.id === id);
          if (!campo) continue;
          if (campo.tipo === "dimension") {
            if (id === dimForRows) row[id] = rowLabel;
            else {
              const opts = DIM_VALUES[id] ?? ["—"];
              const idx = Math.abs(stableVal(`${rowLabel}-${id}`, 0, Math.max(opts.length, 1))) % Math.max(opts.length, 1);
              row[id] = opts[idx] ?? "-";
            }
          } else {
            const [lo, hi] = METRIC_RANGES[id] ?? [100, 1000];
            let val = stableVal(`${rowLabel}-${id}`, lo, hi);
            if (id === "ph") val = +(val / 10).toFixed(1);
            else if (id === "conductividad_electrica") val = +(val / 10).toFixed(2);
            else if (["temp_min", "temp_max", "temp_media"].includes(id)) val = +(val).toFixed(1);
            row[id] = val;
          }
        }
        return row;
      });
    }

    // Grouped table: generate deterministic combinations for hierarchy-like rows.
    const valuePools = activeGroupKeys.map((id, level) => {
      const defaults = [
        `${LABEL_MAP[id] ?? id} 1`,
        `${LABEL_MAP[id] ?? id} 2`,
        `${LABEL_MAP[id] ?? id} 3`,
      ];
      const opts = (DIM_VALUES[id] ?? defaults).map((v) => String(v));
      const size = level === 0 ? Math.min(3, opts.length) : Math.min(2, opts.length);
      return opts.slice(0, Math.max(size, 1));
    });

    const combinations: Array<Record<string, string>> = [];
    const walk = (level: number, acc: Record<string, string>) => {
      if (combinations.length >= 18) return;
      if (level >= activeGroupKeys.length) {
        combinations.push(acc);
        return;
      }
      const key = activeGroupKeys[level];
      for (const value of valuePools[level]) {
        walk(level + 1, { ...acc, [key]: value });
        if (combinations.length >= 18) break;
      }
    };
    walk(0, {});

    return combinations.map((combo, idx) => {
      const row: Record<string, string | number> = {};
      const seedBase = activeGroupKeys.map((k) => combo[k]).join("|");

      for (const id of cols) {
        const campo = camposDisponibles.find((c) => c.id === id);
        if (!campo) continue;
        if (campo.tipo === "dimension") {
          if (combo[id]) {
            row[id] = combo[id];
          } else {
            const opts = DIM_VALUES[id] ?? ["—"];
            const idxOpt = Math.abs(stableVal(`${seedBase}-${idx}-${id}`, 0, Math.max(opts.length, 1))) % Math.max(opts.length, 1);
            row[id] = opts[idxOpt] ?? "-";
          }
        } else {
          const [lo, hi] = METRIC_RANGES[id] ?? [100, 1000];
          const agr = (bloque.agregaciones?.[id] ?? "suma") as AgregacionTipo;
          const sampleValues = [0, 1, 2].map((sampleIdx) =>
            stableVal(`${seedBase}-${id}-sample-${sampleIdx}`, lo, hi),
          );
          let val = aggregateMetricValues(sampleValues, agr);
          if (id === "ph") val = +(val / 10).toFixed(1);
          else if (id === "conductividad_electrica") val = +(val / 10).toFixed(2);
          else if (["temp_min", "temp_max", "temp_media"].includes(id)) val = +(val).toFixed(1);
          row[id] = val;
        }
      }

      return row;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols.join(","), groupByKeys.join(","), bloque.agregaciones, camposDisponibles]);

  type DisplayRow = {
    kind: "data" | "subtotal" | "grand-total";
    key: string;
    values: Record<string, string | number>;
  };

  const displayRows = useMemo((): DisplayRow[] => {
    const activeGroupKeys = groupByKeys.filter((id) => cols.includes(id));
    const sortedData = [...dataRows].sort((a, b) => {
      for (const key of activeGroupKeys) {
        const av = String(a[key] ?? "");
        const bv = String(b[key] ?? "");
        const cmp = av.localeCompare(bv, "es", { numeric: true, sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    const dataOnly: DisplayRow[] = sortedData.map((row, i) => ({
      kind: "data",
      key: `row_${i}`,
      values: row,
    }));

    if (activeGroupKeys.length === 0 || metricColumnIds.length === 0) return dataOnly;

    const out: DisplayRow[] = [];
    const includeSubtotals = activeGroupKeys.length > 1;
    const prefixKeys = activeGroupKeys.slice(0, -1);
    const subtotalLabelKey = activeGroupKeys[activeGroupKeys.length - 1];

    let bucket: Array<Record<string, string | number>> = [];
    let bucketSig = "";

    const emitSubtotal = () => {
      if (bucket.length === 0) return;
      const subtotal: Record<string, string | number> = {};
      for (const id of cols) {
        if (metricColumnIds.includes(id)) {
          const nums = bucket
            .map((r) => Number(r[id]))
            .filter((n) => Number.isFinite(n));
          const agr = (bloque.agregaciones?.[id] ?? "suma") as AgregacionTipo;
          subtotal[id] = aggregateMetricValues(nums, agr);
        } else if (prefixKeys.includes(id)) {
          subtotal[id] = bucket[0][id] ?? "";
        } else {
          subtotal[id] = "";
        }
      }
      subtotal[subtotalLabelKey] = "TOTAL";
      out.push({ kind: "subtotal", key: `subtotal_${bucketSig}_${out.length}`, values: subtotal });
    };

    sortedData.forEach((row, i) => {
      const sig = prefixKeys.map((k) => String(row[k] ?? "")).join("||");
      if (bucket.length > 0 && sig !== bucketSig) {
        if (includeSubtotals) emitSubtotal();
        bucket = [];
      }
      out.push({ kind: "data", key: `row_${i}_${sig}`, values: row });
      bucket.push(row);
      bucketSig = sig;
    });
    if (includeSubtotals) emitSubtotal();

    if (sortedData.length > 1) {
      const grandTotal: Record<string, string | number> = {};
      for (const id of cols) {
        if (metricColumnIds.includes(id)) {
          const nums = sortedData
            .map((r) => Number(r[id]))
            .filter((n) => Number.isFinite(n));
          const agr = (bloque.agregaciones?.[id] ?? "suma") as AgregacionTipo;
          grandTotal[id] = aggregateMetricValues(nums, agr);
        } else {
          grandTotal[id] = "";
        }
      }
      const labelCol = cols.find((id) => !metricColumnIds.includes(id));
      if (labelCol) grandTotal[labelCol] = "TOTAL GENERAL";
      out.push({ kind: "grand-total", key: "grand_total", values: grandTotal });
    }

    return out;
  }, [dataRows, cols, groupByKeys, metricColumnIds, bloque.agregaciones]);

  type RenderRow = DisplayRow & { displayValues: Record<string, string | number> };

  const rowsForRender = useMemo((): RenderRow[] => {
    let prevData: Record<string, string | number> | null = null;
    return displayRows.map((row) => {
      if (row.kind !== "data") {
        prevData = null;
        return { ...row, displayValues: { ...row.values } };
      }

      const displayValues: Record<string, string | number> = { ...row.values };
      groupByKeys.forEach((key, idx) => {
        if (!Object.prototype.hasOwnProperty.call(displayValues, key)) return;
        if (!prevData) return;
        const sameChain = groupByKeys
          .slice(0, idx + 1)
          .every((k) => String(prevData?.[k] ?? "") === String(row.values[k] ?? ""));
        if (sameChain) displayValues[key] = "";
      });

      prevData = row.values;
      return { ...row, displayValues };
    });
  }, [displayRows, groupByKeys]);

  if (cols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40">
        <Table2 className="w-10 h-10" />
        <p className="text-xs text-center">Selecciona fuentes y columnas</p>
      </div>
    );
  }

  // Plantilla-level style takes precedence; fall back to per-block estilos/tipografia for backward compat
  const est = estiloPlantilla ?? bloque.estilos ?? { mostrarBordes: true, alternarFilas: true, tamañoFuente: "sm" as const, alineacion: "left" as const, compacta: false };
  const t = estiloPlantilla?.tipografia ?? bloque.tipografia ?? DEFAULT_TIPOGRAFIA;
  const fontFamily = t.fuente;
  const fontSize = `${t.tamano}px`;
  const cellPad = est.compacta ? "px-1.5 py-0.5" : "px-3 py-1.5";
  const thPad   = est.compacta ? "px-1.5 py-0.5" : "px-3 py-2";
  const cellAlign = est.alineacion === "center" ? "text-center" : est.alineacion === "right" ? "text-right" : "text-left";
  const cellBorder = est.mostrarBordes ? "border border-border/40" : "";
  const thStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight: t.encabezadoBold ? "bold" : "normal",
    fontStyle:  t.encabezadoItalic ? "italic" : "normal",
    textAlign:  est.alineacion,
  };
  const tdStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight: t.cuerpoBold ? "bold" : "normal",
    fontStyle:  t.cuerpoItalic ? "italic" : "normal",
  };
  const activeGroupKeys = groupByKeys.filter((id) => cols.includes(id));

  return (
    <div className="overflow-auto h-full" style={{ fontFamily }}>
      {activeGroupKeys.length > 0 && (
        <div className="mb-2 px-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Agrupado por</span>
          {activeGroupKeys.map((id, idx) => (
            <div key={`group_path_${id}`} className="inline-flex items-center gap-1">
              <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-semibold uppercase tracking-wide">
                {camposDisponibles.find((c) => c.id === id)?.label ?? LABEL_MAP[id] ?? id}
              </Badge>
              {idx < activeGroupKeys.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
              )}
            </div>
          ))}
        </div>
      )}
      <table className={cn("w-full", est.mostrarBordes ? "border-collapse border border-border/40" : "border-collapse")} style={{ fontSize }}>
        <thead>
          {/* ── Module band row (only when 2+ modules) ── */}
          {hasMultipleModules && (
            <tr>
              {moduleBands.map((band) => {
                const mc = !band.isDim ? moduleThemeColor[band.label] : undefined;
                return (
                  <th
                    key={band.key}
                    colSpan={band.span}
                    className={cn(
                      "text-[10px] font-bold text-center uppercase tracking-wide border-b-2 whitespace-nowrap",
                      thPad,
                      band.isDim
                        ? "bg-muted/20 border-b-border text-transparent select-none"
                        : mc
                          ? ""
                          : "bg-muted/40 text-muted-foreground border-b-border",
                      cellBorder,
                    )}
                    style={mc
                      ? {
                        fontFamily,
                        color: mc,
                        backgroundColor: hexToRgba(mc, 0.12),
                        borderBottomColor: mc,
                      }
                      : { fontFamily }}
                  >
                    {band.isDim ? "" : band.label}
                  </th>
                );
              })}
            </tr>
          )}
          {/* ── Column header row ── */}
          <tr>
            {cols.map((id, i) => {
              const campo = camposDisponibles.find((c) => c.id === id);
              const displayLabel = campo?.label ?? LABEL_MAP[id] ?? id;
              const isMetric = campo?.tipo === "metrica";
              const agr = (bloque.agregaciones?.[id] ?? "suma") as AgregacionTipo;
              const agrSymbol = agr === "suma" ? "Σ" : agr === "promedio" ? "⌀" : "~";
              const isGroupKey = groupByKeys.includes(id);
              const mc = !isGroupKey && isMetric ? moduleThemeColor[colModuleKey[id] ?? ""] : undefined;
              const canReorder = Boolean(onReorderColumns) && cols.length > 1;
              const isDropTarget = dropColId === id && dragColId !== null && dragColId !== id;
              return (
                <th
                  key={id}
                  draggable={canReorder}
                  onDragStart={(e) => {
                    if (!canReorder) return;
                    e.dataTransfer.effectAllowed = "move";
                    setDragColId(id);
                    setDropColId(id);
                  }}
                  onDragOver={(e) => {
                    if (!canReorder) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropColId(id);
                  }}
                  onDrop={(e) => {
                    if (!canReorder) return;
                    e.preventDefault();
                    handleDropReorderColumn(id);
                    setDragColId(null);
                    setDropColId(null);
                  }}
                  onDragEnd={() => {
                    setDragColId(null);
                    setDropColId(null);
                  }}
                  className={cn(
                    "border-b border-border whitespace-nowrap",
                    thPad, cellAlign, cellBorder,
                    mc ? "" : "bg-muted/50",
                    canReorder ? "cursor-move select-none" : "",
                    dragColId === id ? "opacity-60" : "",
                    isDropTarget ? "ring-1 ring-primary/60" : "",
                  )}
                  style={{
                    ...thStyle,
                    ...(mc
                      ? {
                        backgroundColor: hexToRgba(mc, 0.14),
                        color: mc,
                        borderBottomColor: mc,
                      }
                      : (!isGroupKey && i > 0 ? { color: colors[i % colors.length] } : {})),
                  }}
                >
                  {groupByKeys.length > 0 && isMetric ? `${agrSymbol} ${displayLabel}` : displayLabel}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rowsForRender.map((row, ri) => (
            <tr
              key={row.key}
              className={cn(
                "border-b border-border/40",
                row.kind === "subtotal" && "bg-muted/35",
                row.kind === "grand-total" && "bg-primary/10 border-primary/30",
                row.kind === "data" && est.alternarFilas && ri % 2 !== 0 && "bg-muted/20",
              )}
            >
              {cols.map((id) => {
                const raw = row.displayValues[id];
                return (
                  <td
                    key={id}
                    className={cn(
                      "text-foreground whitespace-nowrap",
                      cellPad,
                      cellAlign,
                      cellBorder,
                      row.kind !== "data" && "font-semibold",
                    )}
                    style={tdStyle}
                  >
                    {typeof raw === "number"
                      ? raw.toLocaleString("es-CL")
                      : raw === ""
                        ? ""
                        : (raw ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --------- SUBTIPO_STYLES (module-level so accessible from Textos tab) ----------------------------------------

const SUBTIPO_STYLES: Record<TextoBloque["subtipo"], { bg: string; border: string; label: string }> = {
  observaciones: { bg: "bg-amber-50/60",  border: "border-amber-200",  label: "Observaciones" },
  conclusiones:  { bg: "bg-blue-50/60",   border: "border-blue-200",   label: "Conclusiones"  },
  descripcion:   { bg: "bg-muted/20",     border: "border-border",     label: "Descripción"   },
  libre:         { bg: "bg-muted/10",     border: "border-border/50",  label: ""              },
};

function TextoBloqueView({ bloque }: { bloque: TextoBloque }) {
  const s = SUBTIPO_STYLES[bloque.subtipo];
  const t = bloque.tipografia ?? DEFAULT_TIPOGRAFIA;
  const fontFamily = t.fuente;
  const fontSize = `${t.tamano}pt`;
  const heading = bloque.titulo || s.label;
  return (
    <div className={cn("h-full rounded border flex flex-col overflow-hidden", s.bg, s.border)}>
      {heading && (
        <div className={cn("px-2.5 py-1 border-b text-[11px]", s.border)} style={{ fontFamily, fontWeight: t.encabezadoBold ? "bold" : "normal", fontStyle: t.encabezadoItalic ? "italic" : "normal" }}>
          {heading}
        </div>
      )}
      {/* Placeholder lines — represent the write-in area on the printed report */}
      <div className="flex-1 px-2.5 py-2 flex flex-col justify-end gap-1.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="border-b border-foreground/15 w-full" style={{ height: 1 }} />
        ))}
      </div>
    </div>
  );
}

// --------- TipografiaPanel & ColSpanPicker - reusable typography/layout controls --------------------------------

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Calibri, sans-serif",        label: "Calibri" },
  { value: "Arial, sans-serif",          label: "Arial" },
  { value: "'Times New Roman', serif",   label: "Times New Roman" },
  { value: "Georgia, serif",             label: "Georgia" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Courier New', monospace",   label: "Courier New" },
];
const PT_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36];

interface TipografiaPanelProps {
  tipografia: TipografiaBloque;
  onChange: (t: TipografiaBloque) => void;
}
function TipografiaPanel({ tipografia: t, onChange }: TipografiaPanelProps) {
  const upd = (patch: Partial<TipografiaBloque>) => onChange({ ...t, ...patch });
  return (
    <div className="space-y-2.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Type className="w-3 h-3" /> Tipografía
      </Label>
      {/* Font family */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Fuente</span>
        <select
          value={t.fuente}
          onChange={e => upd({ fuente: e.target.value })}
          className="w-full h-7 text-xs rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ fontFamily: t.fuente }}
        >
          {FONT_OPTIONS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
      </div>
      {/* Font size */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Tamaño</span>
        <div className="flex items-center gap-1.5">
          <select
            value={t.tamano}
            onChange={e => upd({ tamano: Number(e.target.value) })}
            className="h-7 text-xs rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary flex-1"
          >
            {PT_OPTIONS.map(pt => (
              <option key={pt} value={pt}>{pt}pt</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily: t.fuente, fontSize: Math.min(t.tamano, 14) }}>Aa</span>
        </div>
      </div>
      {/* Encabezado style */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Encabezado</span>
        <div className="flex gap-1">
          <button onClick={() => upd({ encabezadoBold: !t.encabezadoBold })} className={cn("flex-1 py-1 rounded border text-[11px] font-bold transition-all", t.encabezadoBold ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>N</button>
          <button onClick={() => upd({ encabezadoItalic: !t.encabezadoItalic })} className={cn("flex-1 py-1 rounded border text-[11px] italic transition-all", t.encabezadoItalic ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>K</button>
        </div>
      </div>
      {/* Body style */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Cuerpo</span>
        <div className="flex gap-1">
          <button onClick={() => upd({ cuerpoBold: !t.cuerpoBold })} className={cn("flex-1 py-1 rounded border text-[11px] font-bold transition-all", t.cuerpoBold ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>N</button>
          <button onClick={() => upd({ cuerpoItalic: !t.cuerpoItalic })} className={cn("flex-1 py-1 rounded border text-[11px] italic transition-all", t.cuerpoItalic ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>K</button>
        </div>
      </div>
    </div>
  );
}

function ColSpanPicker({ value, onChange }: { value: ColSpan; onChange: (v: ColSpan) => void }) {
  const opts: Array<{ v: ColSpan; label: string; title: string }> = [
    { v: "full",       label: "■",   title: "Ancho completo" },
    { v: "two-thirds", label: "⅔",   title: "Dos tercios" },
    { v: "half",       label: "½",   title: "Mitad" },
    { v: "third",      label: "⅓",   title: "Un tercio" },
  ];
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Grid3x3 className="w-3 h-3" /> Ancho en la página
      </Label>
      <div className="grid grid-cols-4 gap-1">
        {opts.map(o => (
          <button
            key={o.v}
            title={o.title}
            onClick={() => onChange(o.v)}
            className={cn(
              "py-1.5 rounded border text-[13px] transition-all",
              value === o.v
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >{o.label}</button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Combina bloques en la misma fila usando anchos complementarios (½ + ½, ⅔ + ⅓)</p>
    </div>
  );
}

// --------- FuenteSelector - shared module/fuente picker for block editor ------------------------------------

interface FuenteSelectorProps {
  fuentesSeleccionadas: string[];
  onFuenteToggle: (id: string) => void;
}
function FuenteSelector({ fuentesSeleccionadas, onFuenteToggle }: FuenteSelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(Object.keys(MODULOS_FUENTES)));
  return (
    <div className="space-y-2">
      {Object.entries(MODULOS_FUENTES).map(([modulo, { icon: MIcon, color, fuentes }]) => {
        const isOpen = expanded.has(modulo);
        const selectedCount = fuentes.filter(f => fuentesSeleccionadas.includes(f.id)).length;
        return (
          <div key={modulo} className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(modulo)) n.delete(modulo); else n.add(modulo); return n; })}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <MIcon className={cn("w-3.5 h-3.5 shrink-0", color)} />
              <span className="text-xs font-semibold flex-1 truncate">{modulo}</span>
              {selectedCount > 0 && (
                <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">
                  {selectedCount}
                </span>
              )}
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="divide-y divide-border/50">
                {fuentes.map(fuente => {
                  const isOn = fuentesSeleccionadas.includes(fuente.id);
                  return (
                    <button key={fuente.id} type="button" onClick={() => onFuenteToggle(fuente.id)}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                        isOn ? "bg-primary/5" : "hover:bg-muted/20")}
                    >
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0",
                        isOn ? "bg-primary" : "border border-muted-foreground/30")}>
                        {isOn && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{fuente.label}</p>
                        <p className="text-[9px] font-mono text-muted-foreground">{fuente.id}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground border border-border/60 rounded px-1 py-0.5 shrink-0">
                        {fuente.campos.length} campos
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --------- CamposCalculadosEditor - define cross-module calculated fields ------------------------------------

const OP_OPTIONS: Array<{ value: CampoCalculado["operacion"]; label: string; symbol: string }> = [
  { value: "/",   label: "Ratio (A ÷ B)",        symbol: "÷" },
  { value: "+",   label: "Suma (A + B)",          symbol: "+" },
  { value: "-",   label: "Diferencia (A − B)",    symbol: "−" },
  { value: "*",   label: "Producto (A × B)",      symbol: "×" },
  { value: "pct", label: "Porcentaje (A/B × 100)", symbol: "%" },
];

// Helper: resolve "FUENTE_ID:campo_id" → label
function resolveFieldLabel(token: string): string {
  if (!token) return "-";
  const [fuenteId, campoId] = token.split(":");
  const allFuentes = Object.values(MODULOS_FUENTES).flatMap(m => m.fuentes);
  const fuente = allFuentes.find(f => f.id === fuenteId);
  const campo = fuente?.campos.find(c => c.id === campoId);
  return campo ? `${fuente?.label ?? fuenteId} - ${campo.label}` : token;
}

interface CamposCalculadosEditorProps {
  camposCalculados: CampoCalculado[];
  fuentesSeleccionadas: string[];
  onChange: (calcs: CampoCalculado[]) => void;
}
function CamposCalculadosEditor({ camposCalculados, fuentesSeleccionadas, onChange }: CamposCalculadosEditorProps) {
  const allFuentes = useMemo(() => Object.values(MODULOS_FUENTES).flatMap(m => m.fuentes), []);

  // Metric fields for formula builder
  const metricFields = useMemo(() => {
    return fuentesSeleccionadas.flatMap(fId => {
      const fuente = allFuentes.find(f => f.id === fId);
      if (!fuente) return [];
      return fuente.campos
        .filter(c => c.tipo === "metrica")
        .map(c => ({ token: `${fId}:${c.id}`, label: `${fuente.label} - ${c.label}`, unidad: c.unidad }));
    });
  }, [fuentesSeleccionadas, allFuentes]);

  const addCalculo = () => {
    const newCalc: CampoCalculado = {
      id: `calc_${Date.now()}`,
      label: `Cálculo ${camposCalculados.length + 1}`,
      tipo: "formula",
      operacion: "/",
      campoA: metricFields[0]?.token ?? "",
      campoB: metricFields[1]?.token ?? metricFields[0]?.token ?? "",
      unidad: "",
    };
    onChange([...camposCalculados, newCalc]);
  };

  const updCalc = (id: string, changes: Partial<CampoCalculado>) => {
    onChange(camposCalculados.map(c => c.id === id ? { ...c, ...changes } : c));
  };

  const removeCalc = (id: string) => {
    onChange(camposCalculados.filter(c => c.id !== id));
  };

  const getLegacyAggField = (calc: CampoCalculado): string => {
    const legacyCalc = calc as CampoCalculado & { campoAgregado?: string };
    return legacyCalc.campoAgregado ?? "";
  };

  return (
    <div className="space-y-2">
      {camposCalculados.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic py-1">
          Ningún cálculo definido. Agrega una fórmula.
        </p>
      )}
      {camposCalculados.map((calc, i) => {
        const fallbackMetricA = metricFields[0]?.token ?? "";
        const fallbackMetricB = metricFields[1]?.token ?? fallbackMetricA;
        const legacyAggField = getLegacyAggField(calc);
        const campoAValue = calc.campoA || legacyAggField || fallbackMetricA;
        const campoBValue = calc.campoB || legacyAggField || fallbackMetricB;
        const operacionValue = calc.operacion ?? "/";

        return (
          <div key={calc.id} className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <FunctionSquare className="w-3.5 h-3.5 text-violet-600 shrink-0" />
              <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">#{i + 1}</span>
              <input
                value={calc.label}
                onChange={e => updCalc(calc.id, { label: e.target.value, tipo: "formula" })}
                placeholder="Nombre del campo…"
                className="flex-1 h-6 text-xs px-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => removeCalc(calc.id)}
                className="p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <select
                value={campoAValue}
                onChange={e => updCalc(calc.id, { campoA: e.target.value, tipo: "formula" })}
                className="w-full h-7 text-[10px] px-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Campo A —</option>
                {metricFields.map(f => <option key={f.token} value={f.token}>{f.label}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <select
                  value={operacionValue}
                  onChange={e => updCalc(calc.id, { operacion: e.target.value as CampoCalculado["operacion"], tipo: "formula" })}
                  className="h-7 text-[10px] px-1.5 rounded border border-primary/40 bg-primary/5 text-primary font-bold focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                  style={{ width: "3.2rem" }}
                >
                  {OP_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.symbol} {op.label.split(" ")[0]}</option>)}
                </select>
                <select
                  value={campoBValue}
                  onChange={e => updCalc(calc.id, { campoB: e.target.value, tipo: "formula" })}
                  className="flex-1 min-w-0 h-7 text-[10px] px-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Campo B —</option>
                  {metricFields.map(f => <option key={f.token} value={f.token}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 text-[9px] text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono truncate">
                {calc.label || "resultado"} = {resolveFieldLabel(campoAValue).split(" - ")[1] ?? "A"} {OP_OPTIONS.find(o => o.value === operacionValue)?.symbol ?? "÷"} {resolveFieldLabel(campoBValue).split(" - ")[1] ?? "B"}
              </div>
              <input
                value={calc.unidad ?? ""}
                onChange={e => updCalc(calc.id, { unidad: e.target.value, tipo: "formula" })}
                placeholder="ud."
                className="w-16 h-6 text-[10px] px-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-center font-mono"
              />
            </div>
          </div>
        );
      })}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={addCalculo}
          disabled={metricFields.length < 1}
          className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-dashed text-[10px] font-medium transition-all",
            metricFields.length < 1
              ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
              : "border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-400")}
        >
          <Calculator className="w-3 h-3" /> + Fórmula
        </button>
      </div>

      {metricFields.length === 0 && (
        <p className="text-[9px] text-amber-600">
          Selecciona al menos una fuente con campos métricos para crear cálculos.
        </p>
      )}
    </div>
  );
}

// ─── FiltroEstructuraEditor — hierarchy filter with cascading multi-select ─────

interface FiltroEstructuraEditorProps {
  filtros: Record<string, string[]>;
  onChange: (nivel: string, valores: string[]) => void;
}

function FiltroEstructuraEditor({ filtros, onChange }: FiltroEstructuraEditorProps) {
  const totalActive = Object.values(filtros).reduce((sum, v) => sum + v.length, 0);

  return (
    <div className="space-y-2.5">
      {ESTRUCTURA_CULTIVO.map((nivel, levelIdx) => {
        const selectedIds = filtros[nivel.nivel] ?? [];
        let available = nivel.values;
        if (levelIdx > 0) {
          const parentNivel = ESTRUCTURA_CULTIVO[levelIdx - 1];
          const parentSelected = filtros[parentNivel.nivel] ?? [];
          if (parentSelected.length > 0) {
            available = nivel.values.filter((v) => parentSelected.includes(v.parentId ?? ""));
          }
        }
        const validSelected = selectedIds.filter((id) => available.some((v) => v.id === id));
        return (
          <div key={nivel.nivel} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{nivel.label}</span>
              {validSelected.length > 0 && (
                <>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700 rounded-full px-1.5 py-px font-bold">
                    {validSelected.length}
                  </span>
                  <button
                    onClick={() => onChange(nivel.nivel, [])}
                    className="ml-auto p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
                    title={`Quitar filtros de ${nivel.label}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {available.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/50 italic">Sin opciones para la selección padre</span>
              ) : (
                available.map((val) => {
                  const isOn = selectedIds.includes(val.id);
                  return (
                    <button
                      key={val.id}
                      onClick={() => {
                        const newVals = isOn ? selectedIds.filter((v) => v !== val.id) : [...selectedIds, val.id];
                        onChange(nivel.nivel, newVals);
                      }}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-all",
                        isOn
                          ? "bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-600"
                          : "border-border text-muted-foreground hover:border-emerald-400/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
                      )}
                    >
                      {val.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      {totalActive > 0 && (
        <button
          onClick={() => ESTRUCTURA_CULTIVO.forEach((n) => onChange(n.nivel, []))}
          className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors mt-1"
        >
          <X className="w-2.5 h-2.5" /> Limpiar todos los filtros de estructura
        </button>
      )}
    </div>
  );
}

// --------- Componente principal ---------------------------------------------------------------------------------------------------------------------------------------------------------------

export function InformesBuilder({ informe, existingConfig, onClose, onSave }: InformesBuilderProps) {
  // Tab del builder simplificado
  const [builderTab, setBuilderTab] = useState<"basico" | "graficos" | "tablas" | "textos" | "avanzado">("basico");
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageContainerW, setPageContainerW] = useState(860);
  const [pageContainerH, setPageContainerH] = useState(700);
  const [pageZoom, setPageZoom] = useState<number | null>(null); // null = auto-fit
  const PAGE_ZOOM_STEPS = [0.35, 0.5, 0.65, 0.75, 0.9, 1.0, 1.25, 1.5];
  useEffect(() => {
    if (builderTab !== "avanzado") return;
    const el = pageContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setPageContainerW(entry.contentRect.width);
      setPageContainerH(entry.contentRect.height);
    });
    obs.observe(el);
    setPageContainerW(el.clientWidth);
    setPageContainerH(el.clientHeight);
    return () => obs.disconnect();
  }, [builderTab]);
  // Wizard state para agregar gráficos/tablas de forma guiada
  const [showWizard, setShowWizard] = useState<"grafico" | "tabla" | null>(null);
  const [selectedBloqueId, setSelectedBloqueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resizeDrag, setResizeDrag] = useState<{
    bloqueId: string;
    tipo: ReporteBloque["tipo"];
    startY: number;
    startHeight: number;
    scale: number;
  } | null>(null);
  const suppressBlockOpenRef = useRef(false);
  const resizeMovedRef = useRef(false);
  const [encDragIdx, setEncDragIdx] = useState<number | null>(null);
  const [encDropIdx, setEncDropIdx] = useState<number | null>(null);
  const [tablaColDragId, setTablaColDragId] = useState<string | null>(null);
  const [tablaColDropId, setTablaColDropId] = useState<string | null>(null);
  const [layoutBlockDragId, setLayoutBlockDragId] = useState<string | null>(null);
  const [layoutBlockDropId, setLayoutBlockDropId] = useState<string | null>(null);
  const [designFocusSection, setDesignFocusSection] = useState<DesignSectionId | "all">("encabezado");

  const defaultConfig: BuilderConfig = {
    id: informe?.id,
    nombre: informe?.nombre ?? "",
    descripcion: informe?.descripcion ?? "",
    categoria: informe?.categoria ?? "general",
    bloques: [createDefaultGrafico(1)],
    paletaId: "ocean",
    mostrarLogo: true,
    titulo: informe?.nombre ?? "Nuevo informe",
    subtitulo: "",
    plantilla: {
      encabezado: {
        mostrarEmpresa: true, mostrarFecha: true, textoPersonalizado: "",
        colorBorde: "#cc0000",
        campos: [
          { id: "d_productor", label: "Productor",       fuente: "productor", valor: "",         zona: "datos" },
          { id: "d_periodo",   label: "Fecha del",       fuente: "periodo",   valor: "",         zona: "datos" },
          { id: "d_semana",    label: "Semana",          fuente: "semana",    valor: "",         zona: "datos" },
          { id: "m_codigo",    label: "Código",          fuente: "custom",    valor: "CC-RE-01", zona: "meta"  },
          { id: "m_revision",  label: "Revisión",        fuente: "custom",    valor: "1",        zona: "meta"  },
          { id: "m_fecha",     label: "Fecha de inicio", fuente: "custom",    valor: "",         zona: "meta"  },
        ] as CampoEncabezado[],
        altura: "md",
        posicionLogo: "left",
        alineacionTitulo: "left",
        separacionElementos: 12,
        mostrarLinea: true,
      },
      columnas: [],
      incluirNotas: false,
      incluirConclusiones: false,
      incluirFirma: false,
      piePagina: "",
      margenes: { superior: 20, inferior: 20, izquierdo: 15, derecho: 15 },
      formato: { tamañoPagina: "A4", orientacion: "portrait", numeracionPaginas: true, posicionNumeracion: "footer" },
      layoutConfig: {},
      alturaBloques: {},
      estiloTablas: { mostrarBordes: true, alternarFilas: true, alineacion: "left", compacta: false, tipografia: { ...DEFAULT_TIPOGRAFIA } },
      estiloGraficos: { tipografia: { ...DEFAULT_TIPOGRAFIA } },
    },
  };

  const [config, setConfig] = useState<BuilderConfig>(() =>
    sanitizeLegacyBlockNotes(existingConfig ? migrateConfig(existingConfig) : defaultConfig),
  );

  const upd = useCallback(<K extends keyof BuilderConfig>(key: K, val: BuilderConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updBloque = useCallback((id: string, updates: Partial<GraficoBloque> | Partial<TablaBloque> | Partial<TextoBloque>) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) =>
        b.id === id ? ({ ...b, ...updates } as ReporteBloque) : b,
      ),
    }));
  }, []);

  const toggleFuenteBloque = useCallback((bloqueId: string, fuenteId: string) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo === "texto") return b;
        const has = b.fuentesSeleccionadas.includes(fuenteId);
        return {
          ...b,
          fuentesSeleccionadas: has
            ? b.fuentesSeleccionadas.filter((f) => f !== fuenteId)
            : [...b.fuentesSeleccionadas, fuenteId],
        } as ReporteBloque;
      }),
    }));
  }, []);

  const toggleMetricaBloque = useCallback((bloqueId: string, metricaId: string) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo !== "grafico") return b;
        const gb = b as GraficoBloque;
        const has = gb.metricas.includes(metricaId);
        return { ...gb, metricas: has ? gb.metricas.filter((m) => m !== metricaId) : [...gb.metricas, metricaId] } as ReporteBloque;
      }),
    }));
  }, []);

  const setTablaColumnOrder = useCallback((bloqueId: string, orderedColumnIds: string[]) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo !== "tabla") return b;
        const tb = b as TablaBloque;
        const orderedUnique = orderedColumnIds.filter((id, idx, arr) => id && arr.indexOf(id) === idx);
        const rest = tb.columnas.filter((id) => !orderedUnique.includes(id));
        return { ...tb, columnas: [...orderedUnique, ...rest] } as ReporteBloque;
      }),
    }));
  }, []);

  const setMetricaAgregacion = useCallback((bloqueId: string, metricaId: string, agr: AgregacionTipo) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo === "texto") return b;
        const block = b as GraficoBloque | TablaBloque;
        return { ...block, agregaciones: { ...(block.agregaciones ?? {}), [metricaId]: agr } } as ReporteBloque;
      }),
    }));
  }, []);

  const setGroupByTabla = useCallback((bloqueId: string, dimId: string) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo !== "tabla") return b;
        const t = b as TablaBloque;
        const current = t.groupBy ?? [];
        const isRemoving = current.includes(dimId);
        const newGroupBy = isRemoving
          ? current.filter((id) => id !== dimId)
          : [...current, dimId];
        // Auto-include newly added groupBy field as first columns
        let newColumnas = t.columnas;
        if (!isRemoving && !newColumnas.includes(dimId)) {
          newColumnas = [dimId, ...newColumnas];
        }
        return {
          ...t,
          groupBy: newGroupBy.length > 0 ? newGroupBy : undefined,
          columnas: newColumnas,
        } as ReporteBloque;
      }),
    }));
  }, []);

  const setFiltroJerarquia = useCallback((bloqueId: string, nivel: string, valores: string[]) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo === "texto") return b;
        const block = b as GraficoBloque | TablaBloque;
        const filtros = { ...(block.filtrosJerarquia ?? {}), [nivel]: valores };
        if (valores.length === 0) delete filtros[nivel];
        return { ...block, filtrosJerarquia: filtros } as ReporteBloque;
      }),
    }));
  }, []);

  const addGrafico = useCallback(() => {
    const num = config.bloques.filter((b) => b.tipo === "grafico").length + 1;
    const bloque = createDefaultGrafico(num);
    setConfig((prev) => ({ ...prev, bloques: [...prev.bloques, bloque] }));
    setSelectedBloqueId(bloque.id);
  }, [config.bloques]);

  const addTabla = useCallback(() => {
    const num = config.bloques.filter((b) => b.tipo === "tabla").length + 1;
    const bloque = createDefaultTabla(num);
    setConfig((prev) => ({ ...prev, bloques: [...prev.bloques, bloque] }));
    setSelectedBloqueId(bloque.id);
  }, [config.bloques]);

  const removeBloque = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, bloques: prev.bloques.filter((b) => b.id !== id) }));
    setSelectedBloqueId((prev) => (prev === id ? null : prev));
  }, []);

  const reorderBloqueOrden = useCallback((dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    setConfig((prev) => {
      const from = prev.bloques.findIndex((b) => b.id === dragId);
      const to = prev.bloques.findIndex((b) => b.id === dropId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev.bloques];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, bloques: next };
    });
  }, []);

  const updateCampoEncabezado = useCallback((campoId: string, patch: Partial<CampoEncabezado>) => {
    setConfig((prev) => {
      const plantilla = prev.plantilla as PlantillaConfig;
      const campos = plantilla.encabezado.campos.map((c) => (c.id === campoId ? { ...c, ...patch } : c));
      return {
        ...prev,
        plantilla: {
          ...plantilla,
          encabezado: {
            ...plantilla.encabezado,
            campos,
          },
        },
      };
    });
  }, []);

  const moveCampoEncabezado = useCallback((campoId: string, dir: "up" | "down") => {
    setConfig((prev) => {
      const plantilla = prev.plantilla as PlantillaConfig;
      const campos = [...plantilla.encabezado.campos];
      const from = campos.findIndex((c) => c.id === campoId);
      if (from < 0) return prev;
      const to = dir === "up" ? Math.max(0, from - 1) : Math.min(campos.length - 1, from + 1);
      if (from === to) return prev;
      const [moved] = campos.splice(from, 1);
      campos.splice(to, 0, moved);
      return {
        ...prev,
        plantilla: {
          ...plantilla,
          encabezado: {
            ...plantilla.encabezado,
            campos,
          },
        },
      };
    });
  }, []);

  const addCampoEncabezado = useCallback((zona: "datos" | "meta" = "datos") => {
    const nuevo: CampoEncabezado = {
      id: `custom_${Date.now()}`,
      label: "Nuevo campo",
      fuente: "custom",
      valor: "",
      zona,
    };
    setConfig((prev) => {
      const plantilla = prev.plantilla as PlantillaConfig;
      return {
        ...prev,
        plantilla: {
          ...plantilla,
          encabezado: {
            ...plantilla.encabezado,
            campos: [...plantilla.encabezado.campos, nuevo],
          },
        },
      };
    });
  }, []);

  const removeCampoEncabezado = useCallback((campoId: string) => {
    setConfig((prev) => {
      const plantilla = prev.plantilla as PlantillaConfig;
      return {
        ...prev,
        plantilla: {
          ...plantilla,
          encabezado: {
            ...plantilla.encabezado,
            campos: plantilla.encabezado.campos.filter((c) => c.id !== campoId),
          },
        },
      };
    });
  }, []);

  const reorderCamposEncabezado = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setConfig((prev) => {
      const plantilla = prev.plantilla as PlantillaConfig;
      const campos = [...plantilla.encabezado.campos];
      const [moved] = campos.splice(fromIdx, 1);
      campos.splice(toIdx, 0, moved);
      return { ...prev, plantilla: { ...plantilla, encabezado: { ...plantilla.encabezado, campos } } };
    });
  }, []);

  // Template functions

  const resetTemplate = useCallback(() => {
    setConfig({
      ...defaultConfig,
      id: config.id, // Keep the ID if editing existing report
    });
    setSelectedBloqueId(null);
  }, [config.id, defaultConfig]);

  const applyTemplate = useCallback((templateId: TemplateId) => {
    const template = TEMPLATE_DEFINITIONS[templateId as TemplateId];

    if (!template) {
      console.warn(`Template ${templateId} not found`);
      return;
    }

    const { config } = template;

    setConfig((prev) => ({
      ...prev,
      nombre: config.nombre,
      descripcion: config.descripcion,
      categoria: config.categoria,
      bloques: config.createBloques(),
      id: prev.id, // Keep existing ID if editing
    }));

    setSelectedBloqueId(null);
  }, []);

  const paleta = PALETAS.find((p) => p.id === config.paletaId) ?? PALETAS[0];

  // Derived state for the selected block's editor
  const selectedBloque = config.bloques.find((b) => b.id === selectedBloqueId) ?? null;

  const selectedCampos = useMemo((): CampoInfo[] => {
    if (!selectedBloque || selectedBloque.tipo === "texto") return [];
    const selectedFuentesConOrigen = Object.entries(MODULOS_FUENTES).flatMap(([modulo, modDef]) =>
      modDef.fuentes
        .filter((f) => selectedBloque.fuentesSeleccionadas.includes(f.id))
        .map((fuente) => ({ modulo, fuente })),
    );

    const mergedByField = new Map<string, CampoInfo>();

    selectedFuentesConOrigen.forEach(({ modulo, fuente }) => {
      fuente.campos.forEach((campo) => {
        const origen = {
          modulo,
          fuenteId: fuente.id,
          fuenteLabel: fuente.label,
        };

        const existing = mergedByField.get(campo.id);
        if (!existing) {
          mergedByField.set(campo.id, {
            ...campo,
            modulo,
            fuenteId: fuente.id,
            fuenteLabel: fuente.label,
            origenes: [origen],
          });
          return;
        }

        const alreadyIncluded = (existing.origenes ?? []).some(
          (o) => o.fuenteId === fuente.id && o.modulo === modulo,
        );
        if (!alreadyIncluded) {
          existing.origenes = [...(existing.origenes ?? []), origen];
        }
      });
    });

    const base = Array.from(mergedByField.values());

    // Add calculated fields as metrics
    const calcFields: CampoInfo[] = (selectedBloque.camposCalculados ?? []).map(cc => ({
      id: cc.id,
      label: cc.label || `Cálculo`,
      tipo: "metrica" as const,
      unidad: cc.unidad,
      modulo: "Cálculos",
      fuenteLabel: "Derivado",
      origenes: [{ modulo: "Cálculos", fuenteId: "calculado", fuenteLabel: "Derivado" }],
    }));
    return [...base, ...calcFields];
  }, [selectedBloque]);

  const selectedCamposSorted = useMemo(
    () => [...selectedCampos].sort((a, b) => {
      const moduloA = a.modulo ?? "";
      const moduloB = b.modulo ?? "";
      if (moduloA !== moduloB) return moduloA.localeCompare(moduloB, "es");
      return a.label.localeCompare(b.label, "es");
    }),
    [selectedCampos],
  );

  const selectedGrafico = selectedBloque?.tipo === "grafico" ? selectedBloque as GraficoBloque : null;
  const selectedTabla = selectedBloque?.tipo === "tabla" ? selectedBloque as TablaBloque : null;

  const selectedFuentesResumen = useMemo(() => {
    if (!selectedBloque || selectedBloque.tipo !== "tabla") return [] as Array<{ modulo: string; total: number }>;
    const tablaBloque = selectedBloque as TablaBloque;

    const counts = new Map<string, number>();
    Object.entries(MODULOS_FUENTES).forEach(([modulo, modDef]) => {
      const total = modDef.fuentes.filter((f) => tablaBloque.fuentesSeleccionadas.includes(f.id)).length;
      if (total > 0) counts.set(modulo, total);
    });

    return Array.from(counts.entries())
      .map(([modulo, total]) => ({ modulo, total }))
      .sort((a, b) => a.modulo.localeCompare(b.modulo, "es"));
  }, [selectedBloque]);

  const selectedDimensiones = selectedCampos.filter((c) => c.tipo === "dimension");
  const selectedMetricsDisp = selectedCampos.filter((c) => c.tipo === "metrica");

  const selectedTablaOrderedColumnIds = useMemo(() => {
    if (!selectedTabla) return [];
    const validIds = new Set(selectedCampos.map((c) => c.id));
    const base = selectedTabla.columnas.length > 0
      ? selectedTabla.columnas.filter((id) => validIds.has(id))
      : selectedCampos.map((c) => c.id);
    const missingGroupKeys = (selectedTabla.groupBy ?? []).filter((id) => validIds.has(id) && !base.includes(id));
    return [...missingGroupKeys, ...base];
  }, [selectedTabla, selectedCampos]);

  const selectedTablaOrderedCampos = useMemo(() => {
    const map = new Map(selectedCampos.map((c) => [c.id, c]));
    return selectedTablaOrderedColumnIds
      .map((id) => map.get(id))
      .filter((c): c is CampoInfo => Boolean(c));
  }, [selectedCampos, selectedTablaOrderedColumnIds]);

  function updPlantilla(key: keyof PlantillaConfig, val: PlantillaConfig[keyof PlantillaConfig]) {
    setConfig((prev) => ({
      ...prev,
      plantilla: { ...(prev.plantilla as PlantillaConfig), [key]: val },
    }));
  }

  function updEncabezado(key: keyof PlantillaConfig["encabezado"], val: PlantillaConfig["encabezado"][keyof PlantillaConfig["encabezado"]]) {
    setConfig((prev) => ({
      ...prev,
      plantilla: {
        ...(prev.plantilla as PlantillaConfig),
        encabezado: { ...(prev.plantilla as PlantillaConfig).encabezado, [key]: val },
      },
    }));
  }

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      onSave(sanitizeLegacyBlockNotes(config));
      setTimeout(() => setSaved(false), 3000);
    }, 900);
  };

  const bloqueCount = config.bloques.length;
  const grafCount = config.bloques.filter((b) => b.tipo === "grafico").length;
  const tablaCount = config.bloques.filter((b) => b.tipo === "tabla").length;

  const setBloqueHeight = useCallback((bloqueId: string, tipo: ReporteBloque["tipo"], px: number) => {
    const clamped = clampBlockHeight(tipo, px);
    setConfig((prev) => {
      if (!prev.plantilla) return prev;
      const plantilla = prev.plantilla as PlantillaConfig;
      const current = plantilla.alturaBloques ?? {};
      if (current[bloqueId] === clamped) return prev;
      return {
        ...prev,
        plantilla: {
          ...plantilla,
          alturaBloques: {
            ...current,
            [bloqueId]: clamped,
          },
        },
      };
    });
  }, []);

  const startBloqueResize = useCallback((
    e: { clientY: number; preventDefault: () => void; stopPropagation: () => void },
    bloqueId: string,
    tipo: ReporteBloque["tipo"],
    startHeight: number,
    scale = 1,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    suppressBlockOpenRef.current = true;
    resizeMovedRef.current = false;
    setSelectedBloqueId(bloqueId);
    setResizeDrag({ bloqueId, tipo, startY: e.clientY, startHeight, scale: scale > 0 ? scale : 1 });
  }, []);

  useEffect(() => {
    if (!resizeDrag) return;

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientY - resizeDrag.startY) / resizeDrag.scale;
      if (Math.abs(delta) > 1) resizeMovedRef.current = true;
      setBloqueHeight(resizeDrag.bloqueId, resizeDrag.tipo, resizeDrag.startHeight + delta);
    };

    let releaseTimer = 0;
    const onUp = () => {
      setResizeDrag(null);
      releaseTimer = window.setTimeout(() => {
        suppressBlockOpenRef.current = false;
        resizeMovedRef.current = false;
      }, 140);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (releaseTimer) window.clearTimeout(releaseTimer);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizeDrag, setBloqueHeight]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-card">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Volver a Informes"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Informes</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground truncate max-w-[240px]">
            {config.nombre || "Nuevo informe"}
          </span>
        </div>
        <div className="flex-1" />
        {bloqueCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {grafCount > 0 && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                <BarChart2 className="w-3 h-3" /> {grafCount} gráfico{grafCount !== 1 ? "s" : ""}
              </span>
            )}
            {tablaCount > 0 && (
              <span className="flex items-center gap-1 bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full">
                <Table2 className="w-3 h-3" /> {tablaCount} tabla{tablaCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
          <Eye className="w-3 h-3" /> Preview en vivo
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 min-w-[100px]">
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Guardando…
            </span>
          ) : saved ? (
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Guardado</span>
          ) : (
            <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Guardar</span>
          )}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Config panel simplificado con tabs */}
        <div className="w-[440px] shrink-0 border-r border-border bg-muted/20 flex flex-col">

          {/* Tab navigation */}
          <div className="border-b border-border bg-card">
            <div className="flex overflow-x-auto">
              {[
                { id: "basico", label: "Básico", icon: Type },
                { id: "graficos", label: "Gráficos", icon: BarChart2, count: grafCount },
                { id: "tablas", label: "Tablas", icon: Table2, count: tablaCount },
                { id: "textos", label: "Textos", icon: FileText, count: config.bloques.filter(b => b.tipo === "texto").length },
                { id: "avanzado", label: "Diseño", icon: Palette },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = builderTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setBuilderTab(tab.id as "basico" | "graficos" | "tablas" | "textos" | "avanzado")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-current/10 text-current font-semibold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">

              {/* TAB: Básico */}
              {builderTab === "basico" && (
                <div className="space-y-4">
                  {/* Existing fields */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Nombre del informe
                    </Label>
                    <Input value={config.nombre} onChange={(e) => upd("nombre", e.target.value)}
                      placeholder="Ej. Rendimiento de Cosecha por Semana" className="h-8 text-sm" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Descripción
                    </Label>
                    <Textarea value={config.descripcion} onChange={(e) => upd("descripcion", e.target.value)}
                      placeholder="Describe qué muestra este informe…" rows={3} className="text-sm resize-none" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Categoría
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["laboratorio", "vivero", "siembra", "cosecha", "poscosecha", "general"] as const).map((cat) => (
                        <button key={cat} onClick={() => upd("categoria", cat)}
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-2 rounded-lg border capitalize transition-all",
                            config.categoria === cat
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resumen visual */}
                  <div className="mt-6 p-3 rounded-lg border border-border bg-muted/30">
                    <h4 className="text-xs font-semibold text-foreground mb-2">Resumen del informe</h4>
                    <div className="space-y-2 text-[11px] text-muted-foreground">
                      <p><strong>Nombre:</strong> {config.nombre || "Sin nombre"}</p>
                      <p><strong>Categoría:</strong> {config.categoria}</p>
                      <p><strong>Elementos:</strong> {grafCount} gráfico{grafCount !== 1 ? "s" : ""}, {tablaCount} tabla{tablaCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Gráficos */}
              {builderTab === "graficos" && (
                <div className="space-y-4">
                  {config.bloques.filter(b => b.tipo === "grafico").length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <BarChart2 className="w-12 h-12 mx-auto text-muted-foreground/20" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Sin gráficos</h4>
                        <p className="text-xs text-muted-foreground mt-1">Agrega tu primer gráfico para visualizar datos</p>
                      </div>
                      <Button onClick={addGrafico} className="gap-2 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        Agregar primer gráfico
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Gráficos ({config.bloques.filter(b => b.tipo === "grafico").length})
                        </h4>
                        <Button size="sm" variant="outline" onClick={addGrafico} className="gap-1.5 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          Nuevo
                        </Button>
                      </div>

                      {/* Lista de gráficos */}
                      <div className="space-y-2">
                        {config.bloques.filter(b => b.tipo === "grafico").map((bloque, idx) => (
                          <GraphicCard key={bloque.id} bloque={bloque as GraficoBloque} index={idx}
                            isSelected={selectedBloqueId === bloque.id}
                            onSelect={() => setSelectedBloqueId(bloque.id === selectedBloqueId ? null : bloque.id)}
                            onDelete={() => removeBloque(bloque.id)}
                            onUpdate={(updates) => updBloque(bloque.id, updates)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline editor for selected gráfico */}
                  {selectedGrafico && (
                    <div className="rounded-xl border border-primary/30 bg-primary/3 overflow-hidden">
                      <div className="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-primary flex-1 truncate">
                          Editando: {selectedGrafico.titulo || "Gráfico sin título"}
                        </span>
                        <Pencil className="w-3 h-3 text-primary/60" />
                      </div>
                      <div className="p-3 space-y-3">
                        {/* Título */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Título del bloque</Label>
                          <Input
                            value={selectedGrafico.titulo}
                            onChange={(e) => updBloque(selectedGrafico.id, { titulo: e.target.value })}
                            placeholder="Ej. Rendimiento semanal"
                            className="h-7 text-xs"
                          />
                        </div>
                        {/* Fuentes */}
                        <details open className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group">
                          <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Fuentes de datos</span>
                            <span className="text-[9px] text-muted-foreground">
                              {selectedGrafico.fuentesSeleccionadas.length} seleccionada{selectedGrafico.fuentesSeleccionadas.length !== 1 ? "s" : ""}
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="px-2.5 pb-2.5 border-t border-border/60">
                            <FuenteSelector
                              fuentesSeleccionadas={selectedGrafico.fuentesSeleccionadas}
                              onFuenteToggle={(id) => toggleFuenteBloque(selectedGrafico.id, id)}
                            />
                          </div>
                        </details>
                        {/* Cálculos cruzados */}
                        {selectedGrafico.fuentesSeleccionadas.length > 0 && (
                          <details className="rounded-lg border border-violet-200/70 bg-violet-50/20 overflow-hidden group">
                            <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                              <Calculator className="w-3 h-3 text-violet-500" />
                              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide flex-1">Cálculos cruzados (fórmulas)</span>
                              <span className="text-[9px] text-violet-500">
                                {selectedGrafico.camposCalculados?.length ?? 0}
                              </span>
                              <ChevronDown className="w-3 h-3 text-violet-500 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-2.5 pb-2.5 border-t border-violet-200/60">
                              <CamposCalculadosEditor
                                camposCalculados={selectedGrafico.camposCalculados ?? []}
                                fuentesSeleccionadas={selectedGrafico.fuentesSeleccionadas}
                                onChange={(calcs) => updBloque(selectedGrafico.id, { camposCalculados: calcs })}
                              />
                            </div>
                          </details>
                        )}
                        {/* Dimensión y métricas */}
                        {selectedCampos.length > 0 && (
                          <details open className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group">
                            <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                              <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Dimensión y métricas</span>
                              <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-2.5 pb-2.5 border-t border-border/60 space-y-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Eje X / Agrupación</Label>
                              <div className="flex flex-wrap gap-1">
                                {selectedDimensiones.map((d) => (
                                  <button key={d.id}
                                    onClick={() => updBloque(selectedGrafico.id, { dimension: d.id })}
                                    className={cn(
                                      "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                                      selectedGrafico.dimension === d.id
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/30",
                                    )}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Métricas (Eje Y)</Label>
                              <div className="space-y-1">
                                {selectedMetricsDisp.map((m) => {
                                  const isOn = selectedGrafico.metricas.includes(m.id);
                                  const hasGrouping = !!selectedGrafico.dimension;
                                  const agr: AgregacionTipo = (selectedGrafico.agregaciones?.[m.id] ?? "suma") as AgregacionTipo;
                                  const agrColor = agr === "suma"    ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600"
                                                 : agr === "promedio" ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600"
                                                 :                     "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-600";
                                  return (
                                    <div key={m.id}>
                                      <button
                                        onClick={() => toggleMetricaBloque(selectedGrafico.id, m.id)}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all",
                                          isOn ? "bg-primary/5 border-primary/40" : "border-border hover:border-primary/20 hover:bg-muted/20",
                                        )}
                                      >
                                        <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0", isOn ? "bg-primary" : "border border-muted-foreground/30")}>
                                          {isOn && <Check className="w-2 h-2 text-primary-foreground" />}
                                        </div>
                                        <span className="text-xs flex-1">{m.label}</span>
                                        {m.unidad && <span className="text-[10px] text-muted-foreground font-mono">{m.unidad}</span>}
                                        {isOn && hasGrouping && (
                                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", agrColor)}>
                                            {agr === "suma" ? "Σ" : agr === "promedio" ? "⌀" : "~"}
                                          </span>
                                        )}
                                      </button>
                                      {isOn && hasGrouping && (
                                        <div className="ml-6 mt-1 flex items-center gap-1">
                                          <span className="text-[9px] text-muted-foreground shrink-0">Agregar por:</span>
                                          {(["suma", "promedio", "mediana"] as AgregacionTipo[]).map((op) => {
                                            const opColor = op === "suma"    ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600"
                                                          : op === "promedio" ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600"
                                                          :                    "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-600";
                                            return (
                                              <button
                                                key={op}
                                                onClick={(e) => { e.stopPropagation(); setMetricaAgregacion(selectedGrafico.id, m.id, op); }}
                                                className={cn(
                                                  "text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-colors",
                                                  agr === op ? opColor : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                                )}
                                              >
                                                {op === "suma" ? "Σ Suma" : op === "promedio" ? "⌀ Prom" : "~ Med"}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            </div>
                          </details>
                        )}
                        {/* Tipo de gráfico */}
                        <details className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group">
                          <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                            <BarChart2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Tipo de gráfico</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="px-2.5 pb-2.5 border-t border-border/60 space-y-2">
                          <div className="grid grid-cols-4 gap-1.5">
                            {TIPOS_GRAFICO.map((t) => {
                              const TIcon = t.icon;
                              const active = selectedGrafico.tipoGrafico === t.id;
                              return (
                                <button key={t.id}
                                  onClick={() => updBloque(selectedGrafico.id, { tipoGrafico: t.id })}
                                  className={cn(
                                    "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all",
                                    active ? "bg-primary/10 border-primary shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/40",
                                  )}
                                >
                                  <TIcon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                                  <span className={cn("text-[9px] font-semibold text-center leading-tight", active ? "text-primary" : "text-muted-foreground")}>
                                    {t.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {/* Opciones */}
                          <div className="space-y-2 pt-1">
                            {(["bar_v", "bar_h", "area"] as TipoGrafico[]).includes(selectedGrafico.tipoGrafico) && (
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">Barras apiladas</Label>
                                <Switch checked={selectedGrafico.apilado}
                                  onCheckedChange={(v) => updBloque(selectedGrafico.id, { apilado: v })} />
                              </div>
                            )}
                            {[
                              { key: "mostrarLeyenda" as const, label: "Mostrar leyenda" },
                              { key: "mostrarGrid" as const, label: "Mostrar cuadrícula" },
                              { key: "mostrarTooltip" as const, label: "Mostrar tooltip" },
                            ].map(({ key, label }) => (
                              <div key={key} className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">{label}</Label>
                                <Switch
                                  checked={selectedGrafico[key]}
                                  onCheckedChange={(v) => updBloque(selectedGrafico.id, { [key]: v })}
                                />
                              </div>
                            ))}
                          </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Tablas */}
              {builderTab === "tablas" && (
                <div className="space-y-4">
                  {config.bloques.filter(b => b.tipo === "tabla").length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <Table2 className="w-12 h-12 mx-auto text-muted-foreground/20" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Sin tablas</h4>
                        <p className="text-xs text-muted-foreground mt-1">Agrega tu primera tabla para mostrar datos</p>
                      </div>
                      <Button onClick={addTabla} className="gap-2 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        Agregar primera tabla
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Tablas ({config.bloques.filter(b => b.tipo === "tabla").length})
                        </h4>
                        <Button size="sm" variant="outline" onClick={addTabla} className="gap-1.5 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          Nueva
                        </Button>
                      </div>

                      {/* Lista de tablas */}
                      <div className="space-y-2">
                        {config.bloques.filter(b => b.tipo === "tabla").map((bloque, idx) => (
                          <TableCard key={bloque.id} bloque={bloque as TablaBloque} index={idx}
                            isSelected={selectedBloqueId === bloque.id}
                            onSelect={() => setSelectedBloqueId(bloque.id === selectedBloqueId ? null : bloque.id)}
                            onDelete={() => removeBloque(bloque.id)}
                            onUpdate={(updates) => updBloque(bloque.id, updates)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline editor for selected tabla */}
                  {selectedTabla && (
                    <div className="rounded-xl border border-purple-300/50 overflow-hidden">
                      <div className="px-3 py-2 bg-purple-500/5 border-b border-purple-300/20 flex items-center gap-2">
                        <Table2 className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex-1 truncate">
                          Editando: {selectedTabla.titulo || "Tabla sin título"}
                        </span>
                        <Pencil className="w-3 h-3 text-purple-400" />
                      </div>
                      <div className="p-3 space-y-3">
                        {/* Título */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Título de la tabla</Label>
                          <Input
                            value={selectedTabla.titulo}
                            onChange={(e) => updBloque(selectedTabla.id, { titulo: e.target.value })}
                            placeholder="Ej. Detalle de cosecha"
                            className="h-7 text-xs"
                          />
                        </div>
                        {/* Fuentes */}
                        <details open className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group">
                          <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Fuentes de datos</span>
                            <span className="text-[9px] text-muted-foreground">
                              {selectedTabla.fuentesSeleccionadas.length} seleccionada{selectedTabla.fuentesSeleccionadas.length !== 1 ? "s" : ""}
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="px-2.5 pb-2.5 border-t border-border/60">
                            <FuenteSelector
                              fuentesSeleccionadas={selectedTabla.fuentesSeleccionadas}
                              onFuenteToggle={(id) => toggleFuenteBloque(selectedTabla.id, id)}
                            />
                          </div>
                        </details>
                        {/* Cálculos cruzados */}
                        {selectedTabla.fuentesSeleccionadas.length > 0 && (
                          <details className="rounded-lg border border-violet-200/70 bg-violet-50/20 overflow-hidden group">
                            <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                              <Calculator className="w-3 h-3 text-violet-500" />
                              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide flex-1">Cálculos cruzados (fórmulas)</span>
                              <span className="text-[9px] text-violet-500">
                                {selectedTabla.camposCalculados?.length ?? 0}
                              </span>
                              <ChevronDown className="w-3 h-3 text-violet-500 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-2.5 pb-2.5 border-t border-violet-200/60">
                              <CamposCalculadosEditor
                                camposCalculados={selectedTabla.camposCalculados ?? []}
                                fuentesSeleccionadas={selectedTabla.fuentesSeleccionadas}
                                onChange={(calcs) => updBloque(selectedTabla.id, { camposCalculados: calcs })}
                              />
                            </div>
                          </details>
                        )}
                        {/* Tabla: Agrupar por (multi-select) */}
                        {selectedTabla && selectedDimensiones.length > 0 && (
                          <details
                            open={(selectedTabla.groupBy?.length ?? 0) > 0}
                            className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group"
                          >
                            <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                              <Sigma className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Agrupar filas de la tabla</span>
                              <span className="text-[9px] text-muted-foreground">{selectedTabla.groupBy?.length ?? 0}</span>
                              <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-2.5 pb-2.5 border-t border-border/60 space-y-1">
                            <p className="text-[10px] text-muted-foreground">
                              Esta agrupación sí cambia la estructura visible de la tabla y sus subtotales.
                            </p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {selectedDimensiones.map((d) => {
                                const isActive = (selectedTabla.groupBy ?? []).includes(d.id);
                                return (
                                  <button key={d.id}
                                    onClick={() => setGroupByTabla(selectedTabla.id, d.id)}
                                    className={cn(
                                      "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all flex items-center gap-1",
                                      isActive
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/30",
                                    )}
                                  >
                                    {isActive && <Check className="w-2 h-2" />}
                                    {d.label}
                                  </button>
                                );
                              })}
                              {(selectedTabla.groupBy?.length ?? 0) > 0 && (
                                <button
                                  onClick={() => updBloque(selectedTabla.id, { groupBy: undefined })}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                                  title="Quitar todas las agrupaciones"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            {(selectedTabla.groupBy?.length ?? 0) > 0 && (
                              <p className="text-[10px] text-primary/70">
                                Jerarquía: <strong>{(selectedTabla.groupBy ?? []).map(id => selectedDimensiones.find(d => d.id === id)?.label ?? id).join(" → ")}</strong>
                              </p>
                            )}
                            {(selectedTabla.groupBy?.length ?? 1) > 1 && (
                              <p className="text-[10px] text-muted-foreground">
                                El primer nivel abre el grupo y el último nivel queda como detalle.
                              </p>
                            )}
                            </div>
                          </details>
                        )}
                        {/* Columnas */}
                        {selectedCamposSorted.length > 0 && (
                          <details open className="rounded-lg border border-border/70 bg-card/40 overflow-hidden group">
                            <summary className="list-none cursor-pointer px-2.5 py-2 flex items-center gap-2">
                              <AlignLeft className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Columnas a mostrar</span>
                              <span className="text-[9px] text-muted-foreground">
                                {selectedTabla.columnas.length > 0 ? selectedTabla.columnas.length : selectedCamposSorted.length} visibles
                              </span>
                              <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="px-2.5 pb-2.5 border-t border-border/60 space-y-2">
                            {selectedFuentesResumen.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedFuentesResumen.map((item) => (
                                  <span
                                    key={item.modulo}
                                    className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-card text-muted-foreground"
                                  >
                                    {item.modulo} · {item.total} fuente{item.total !== 1 ? "s" : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                            {selectedTablaOrderedCampos.length > 1 && (
                              <div className="rounded-lg border border-border/70 bg-muted/20 p-2 space-y-1.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <GripVertical className="w-3 h-3" /> Orden de visualización
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Arrastra para ordenar cómo se muestran las columnas en la tabla.
                                </p>
                                <div className="space-y-1">
                                  {selectedTablaOrderedCampos.map((campo, idx) => {
                                    const isGroupByField = (selectedTabla.groupBy ?? []).includes(campo.id);
                                    const isDropTarget = tablaColDropId === campo.id && tablaColDragId !== null && tablaColDragId !== campo.id;
                                    return (
                                      <div
                                        key={`order_${campo.id}`}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "move";
                                          setTablaColDragId(campo.id);
                                          setTablaColDropId(campo.id);
                                        }}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.dataTransfer.dropEffect = "move";
                                          setTablaColDropId(campo.id);
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          if (!selectedTabla || !tablaColDragId || tablaColDragId === campo.id) {
                                            setTablaColDragId(null);
                                            setTablaColDropId(null);
                                            return;
                                          }
                                          const from = selectedTablaOrderedColumnIds.indexOf(tablaColDragId);
                                          const to = selectedTablaOrderedColumnIds.indexOf(campo.id);
                                          if (from >= 0 && to >= 0) {
                                            const next = [...selectedTablaOrderedColumnIds];
                                            const [moved] = next.splice(from, 1);
                                            next.splice(to, 0, moved);
                                            setTablaColumnOrder(selectedTabla.id, next);
                                          }
                                          setTablaColDragId(null);
                                          setTablaColDropId(null);
                                        }}
                                        onDragEnd={() => {
                                          setTablaColDragId(null);
                                          setTablaColDropId(null);
                                        }}
                                        className={cn(
                                          "flex items-center gap-2 px-2 py-1.5 rounded border bg-background text-xs",
                                          "cursor-move select-none",
                                          tablaColDragId === campo.id ? "opacity-60" : "",
                                          isDropTarget ? "border-primary ring-1 ring-primary/50" : "border-border",
                                        )}
                                        title="Arrastra para reordenar"
                                      >
                                        <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                        <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate">{campo.label}</p>
                                          {(campo.origenes?.length ?? 0) > 0 && (
                                            <div className="mt-0.5 flex flex-wrap gap-1">
                                              {campo.origenes!.slice(0, 1).map((origen) => (
                                                <span
                                                  key={`${campo.id}_${origen.fuenteId}`}
                                                  className="text-[8px] px-1 py-0.5 rounded border border-border/80 bg-muted/20 text-muted-foreground"
                                                >
                                                  {origen.modulo} · {origen.fuenteLabel}
                                                </span>
                                              ))}
                                              {(campo.origenes?.length ?? 0) > 1 && (
                                                <span className="text-[8px] px-1 py-0.5 rounded border border-border/80 bg-muted/20 text-muted-foreground">
                                                  +{(campo.origenes?.length ?? 1) - 1}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {isGroupByField && (
                                          <span className="text-[9px] text-primary font-semibold bg-primary/10 px-1 rounded shrink-0">agrup.</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Sin selección = todas las disponibles.
                            </p>
                            <div className="space-y-1">
                              {selectedCamposSorted.map((campo) => {
                                const isGroupByField = (selectedTabla.groupBy ?? []).includes(campo.id);
                                const hasManualColumnSelection = selectedTabla.columnas.length > 0;
                                const defaultVisibleColumnIds = selectedCamposSorted
                                  .filter((c) => !(selectedTabla.groupBy ?? []).includes(c.id))
                                  .map((c) => c.id);
                                const isImplicitlyVisible = !hasManualColumnSelection && !isGroupByField;
                                const isOn = selectedTabla.columnas.includes(campo.id) || isGroupByField || isImplicitlyVisible;
                                const isMetrica = campo.tipo === "metrica";
                                const hasGrouping = (selectedTabla.groupBy?.length ?? 0) > 0;
                                const agr: AgregacionTipo = (selectedTabla.agregaciones?.[campo.id] ?? "suma") as AgregacionTipo;
                                const agrColor = agr === "suma"    ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600"
                                               : agr === "promedio" ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600"
                                               :                     "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-600";
                                return (
                                  <div key={campo.id}>
                                    <button
                                      onClick={() => {
                                        if (isGroupByField) return;

                                        if (!hasManualColumnSelection) {
                                          const nextVisible = defaultVisibleColumnIds.filter((id) => id !== campo.id);
                                          updBloque(selectedTabla.id, { columnas: nextVisible });
                                          return;
                                        }

                                        const currentlySelected = selectedTabla.columnas;
                                        const hasCurrent = currentlySelected.includes(campo.id);
                                        const next = hasCurrent
                                          ? currentlySelected.filter((id) => id !== campo.id)
                                          : [...currentlySelected, campo.id];
                                        const normalizedNext = next.filter((id, idx, arr) => id && arr.indexOf(id) === idx);
                                        const coversAllDefault = normalizedNext.length === defaultVisibleColumnIds.length
                                          && defaultVisibleColumnIds.every((id) => normalizedNext.includes(id));
                                        updBloque(selectedTabla.id, { columnas: coversAllDefault ? [] : normalizedNext });
                                      }}
                                      disabled={isGroupByField}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all",
                                        isGroupByField ? "bg-primary/10 border-primary/60 cursor-default" :
                                        isOn ? "bg-primary/5 border-primary/40" : "border-border hover:border-primary/20 hover:bg-muted/20",
                                      )}
                                    >
                                      <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0",
                                        isOn ? "bg-primary" : "border border-muted-foreground/30")}>
                                        {isOn && <Check className="w-2 h-2 text-primary-foreground" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs truncate">{campo.label}</p>
                                        {(campo.origenes?.length ?? 0) > 0 && (
                                          <div className="mt-0.5 flex flex-wrap gap-1">
                                            {campo.origenes!.slice(0, 2).map((origen) => (
                                              <span
                                                key={`${campo.id}_${origen.fuenteId}`}
                                                className="text-[8px] px-1 py-0.5 rounded border border-border/80 bg-muted/20 text-muted-foreground"
                                              >
                                                {origen.modulo} · {origen.fuenteLabel}
                                              </span>
                                            ))}
                                            {(campo.origenes?.length ?? 0) > 2 && (
                                              <span className="text-[8px] px-1 py-0.5 rounded border border-border/80 bg-muted/20 text-muted-foreground">
                                                +{(campo.origenes?.length ?? 2) - 2}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {isGroupByField && (
                                        <span className="text-[9px] text-primary font-semibold bg-primary/10 px-1 rounded shrink-0">agrup.</span>
                                      )}
                                      {campo.unidad && !isGroupByField && (
                                        <span className="text-[10px] text-muted-foreground font-mono">{campo.unidad}</span>
                                      )}
                                      {isOn && isMetrica && hasGrouping && (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", agrColor)}>
                                          {agr === "suma" ? "Σ" : agr === "promedio" ? "⌀" : "~"}
                                        </span>
                                      )}
                                    </button>
                                    {isOn && isMetrica && hasGrouping && (
                                      <div className="ml-6 mt-1 flex items-center gap-1">
                                        <span className="text-[9px] text-muted-foreground shrink-0">Agregar por:</span>
                                        {(["suma", "promedio", "mediana"] as AgregacionTipo[]).map((op) => {
                                          const opColor = op === "suma"    ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-600"
                                                        : op === "promedio" ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600"
                                                        :                    "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-600";
                                          return (
                                            <button
                                              key={op}
                                              onClick={(e) => { e.stopPropagation(); setMetricaAgregacion(selectedTabla.id, campo.id, op); }}
                                              className={cn(
                                                "text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-colors",
                                                agr === op ? opColor : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                              )}
                                            >
                                              {op === "suma" ? "Σ Suma" : op === "promedio" ? "⌀ Prom" : "~ Med"}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Textos */}
              {builderTab === "textos" && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      BLOQUES DE TEXTO ({config.bloques.filter(b => b.tipo === "texto").length})
                    </span>
                    <button
                      onClick={() => {
                        const newBloque: TextoBloque = {
                          id: `texto_${Date.now()}`,
                          tipo: "texto",
                          subtipo: "libre",
                          titulo: "",
                          colSpan: "full",
                          tipografia: { ...DEFAULT_TIPOGRAFIA },
                        };
                        setConfig(prev => ({ ...prev, bloques: [...prev.bloques, newBloque] }));
                        setSelectedBloqueId(newBloque.id);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nueva
                    </button>
                  </div>

                  {config.bloques.filter(b => b.tipo === "texto").length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground/40 border border-dashed rounded-lg">
                      <FileText className="w-10 h-10" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Sin bloques de texto</p>
                        <p className="text-xs">Agrega observaciones, conclusiones o descripciones</p>
                      </div>
                      <button
                        onClick={() => {
                          const newBloque: TextoBloque = {
                            id: `texto_${Date.now()}`,
                            tipo: "texto",
                            subtipo: "observaciones",
                            titulo: "",
                            colSpan: "full",
                            tipografia: { ...DEFAULT_TIPOGRAFIA },
                          };
                          setConfig(prev => ({ ...prev, bloques: [...prev.bloques, newBloque] }));
                          setSelectedBloqueId(newBloque.id);
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Agregar primer bloque de texto
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {config.bloques.filter(b => b.tipo === "texto").map(bloque => {
                        const tb = bloque as TextoBloque;
                        const isSelected = selectedBloqueId === tb.id;
                        return (
                          <div
                            key={tb.id}
                            onClick={() => setSelectedBloqueId(isSelected ? null : tb.id)}
                            className={cn("p-2.5 rounded-lg border cursor-pointer transition-all", isSelected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-border/80 bg-muted/5")}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium text-foreground truncate flex-1">{tb.titulo || SUBTIPO_STYLES[tb.subtipo]?.label || "Bloque de texto"}</span>
                              <span className="text-[9px] text-muted-foreground shrink-0 capitalize">{tb.subtipo}</span>
                              <button onClick={e => { e.stopPropagation(); setConfig(prev => ({ ...prev, bloques: prev.bloques.filter(b => b.id !== tb.id) })); setSelectedBloqueId(null); }} className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline editor for selected text block */}
                  {(() => {
                    const selectedTexto = config.bloques.find(b => b.id === selectedBloqueId && b.tipo === "texto") as TextoBloque | undefined;
                    if (!selectedTexto) return null;
                    return (
                      <div className="rounded-lg border-2 border-primary/20 bg-primary/3 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/15">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-semibold text-primary truncate flex-1">Editando: {selectedTexto.titulo || "Bloque de texto"}</span>
                        </div>
                        <div className="p-3 space-y-3">
                          {/* Subtipo */}
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Tipo de bloque</Label>
                            <div className="grid grid-cols-2 gap-1">
                              {(["observaciones", "conclusiones", "descripcion", "libre"] as const).map(sub => (
                                <button key={sub} onClick={() => updBloque(selectedTexto.id, { subtipo: sub })}
                                  className={cn("py-1.5 rounded border text-[10px] capitalize transition-all", selectedTexto.subtipo === sub ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40")}
                                >{sub === "libre" ? "Libre" : sub.charAt(0).toUpperCase() + sub.slice(1)}</button>
                              ))}
                            </div>
                          </div>
                          {/* Título */}
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Título (opcional)</Label>
                            <Input value={selectedTexto.titulo ?? ""} onChange={e => updBloque(selectedTexto.id, { titulo: e.target.value } as any)} placeholder="Ej. Observaciones del período" className="h-7 text-xs" />
                          </div>
                          <p className="text-[10px] text-muted-foreground border border-border/50 rounded p-2 bg-muted/20">
                            Este bloque es un área en blanco de la plantilla. El contenido lo escribe el usuario en el informe final.
                          </p>
                          {/* Tipografía */}
                          <TipografiaPanel tipografia={selectedTexto.tipografia ?? DEFAULT_TIPOGRAFIA} onChange={t => updBloque(selectedTexto.id, { tipografia: t } as any)} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB: Avanzado (diseño y plantilla) */}
              {builderTab === "avanzado" && (
                <div className="space-y-5">

                  <div className="rounded-lg border border-border bg-card/40 p-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Editor por partes</p>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setDesignFocusSection("all")}
                        className={cn(
                          "h-7 px-2 rounded-md border text-[10px] font-medium transition-colors",
                          designFocusSection === "all"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                        )}
                      >
                        Todo
                      </button>
                      {DESIGN_SECTION_ORDER.map((sectionId) => (
                        <button
                          key={sectionId}
                          type="button"
                          onClick={() => setDesignFocusSection(sectionId)}
                          className={cn(
                            "h-7 px-2 rounded-md border text-[10px] font-medium transition-colors truncate",
                            designFocusSection === sectionId
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                          )}
                          title={DESIGN_SECTION_LABELS[sectionId]}
                        >
                          {DESIGN_SECTION_LABELS[sectionId]}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Pulsa una sección para trabajar con foco; usa Todo cuando quieras ver el panel completo.</p>
                  </div>

                  {/* Paleta de colores */}
                  {(designFocusSection === "all" || designFocusSection === "paleta") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> Paleta de colores
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PALETAS.map((p) => (
                        <button key={p.id} onClick={() => upd("paletaId", p.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                            config.paletaId === p.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30",
                          )}
                        >
                          <div className="flex gap-0.5">
                            {p.colors.slice(0, 4).map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium">{p.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Logo e Imágenes */}
                  {(designFocusSection === "all" || designFocusSection === "logo") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" /> Logo e imágenes
                    </Label>
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">Mostrar logo</span>
                        <Switch checked={config.mostrarLogo} onCheckedChange={(v) => upd("mostrarLogo", v)} className="scale-75" />
                      </div>
                      {config.mostrarLogo && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-muted-foreground">Posición del logo</span>
                          <div className="flex gap-1">
                            {(["left", "center", "right"] as const).map((pos) => (
                              <button key={pos}
                                onClick={() => updEncabezado("posicionLogo", pos)}
                                className={cn(
                                  "flex-1 flex items-center justify-center py-1.5 rounded border text-[10px] gap-1 transition-all",
                                  ((config.plantilla as any)?.encabezado?.posicionLogo ?? "left") === pos
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                {pos === "left" && <AlignLeft className="w-3 h-3" />}
                                {pos === "center" && <AlignCenter className="w-3 h-3" />}
                                {pos === "right" && <AlignRight className="w-3 h-3" />}
                                {pos === "left" ? "Izq" : pos === "center" ? "Centro" : "Der"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Alineación del título</span>
                        <div className="flex gap-1">
                          {(["left", "center", "right"] as const).map((al) => (
                            <button
                              key={al}
                              onClick={() => updEncabezado("alineacionTitulo", al)}
                              className={cn(
                                "flex-1 flex items-center justify-center py-1.5 rounded border text-[10px] gap-1 transition-all",
                                (((config.plantilla as any)?.encabezado?.alineacionTitulo)
                                  ?? (((config.plantilla as any)?.encabezado?.posicionLogo === "right")
                                    ? "right"
                                    : ((config.plantilla as any)?.encabezado?.posicionLogo === "left")
                                      ? "left"
                                      : "center")) === al
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {al === "left" && <AlignLeft className="w-3 h-3" />}
                              {al === "center" && <AlignCenter className="w-3 h-3" />}
                              {al === "right" && <AlignRight className="w-3 h-3" />}
                              {al === "left" ? "Izq" : al === "center" ? "Centro" : "Der"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Separación elementos</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {Math.max(0, Math.min(32, Number((config.plantilla as any)?.encabezado?.separacionElementos ?? 12)))} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={32}
                          step={1}
                          value={Math.max(0, Math.min(32, Number((config.plantilla as any)?.encabezado?.separacionElementos ?? 12)))}
                          onChange={(e) => updEncabezado("separacionElementos", Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">URL del logo</span>
                        <Input
                          value={(config.plantilla as any)?.encabezado?.logoPersonalizado ?? ""}
                          onChange={(e) => updEncabezado("logoPersonalizado", e.target.value)}
                          placeholder="https://... o pegar URL de imagen"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Encabezado del documento */}
                  {(designFocusSection === "all" || designFocusSection === "encabezado") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <LayoutTemplate className="w-3.5 h-3.5" /> Encabezado
                    </Label>
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/10">
                      {(["mostrarEmpresa", "mostrarFecha", "mostrarLinea"] as const).map((key) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs">
                            {key === "mostrarEmpresa" ? "Mostrar empresa" : key === "mostrarFecha" ? "Mostrar fecha" : "Línea separadora"}
                          </span>
                          <Switch
                            checked={((config.plantilla as any)?.encabezado?.[key]) ?? (key === "mostrarLinea" ? true : false)}
                            onCheckedChange={(v) => updEncabezado(key, v)}
                            className="scale-75"
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Altura del encabezado</span>
                        <div className="flex gap-1">
                          {(["sm", "md", "lg"] as const).map((h) => (
                            <button key={h}
                              onClick={() => updEncabezado("altura", h)}
                              className={cn(
                                "flex-1 py-1 rounded border text-[10px] font-medium transition-all",
                                ((config.plantilla as any)?.encabezado?.altura ?? "md") === h
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              {h === "sm" ? "Pequeño" : h === "md" ? "Mediano" : "Grande"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground flex-1">Color de borde</span>
                        <input
                          type="color"
                          value={(config.plantilla as any)?.encabezado?.colorBorde ?? "#cc0000"}
                          onChange={(e) => updEncabezado("colorBorde", e.target.value)}
                          className="w-8 h-7 rounded cursor-pointer border border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Texto personalizado</span>
                        <Input
                          value={(config.plantilla as any)?.encabezado?.textoPersonalizado ?? ""}
                          onChange={(e) => updEncabezado("textoPersonalizado", e.target.value)}
                          placeholder="Texto adicional en el encabezado"
                          className="h-7 text-xs"
                        />
                      </div>
                      {/* ── Campos del encabezado ─────── */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {/* Section headers */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["datos", "meta"] as const).map((z) => {
                            const zonaCampos = ((config.plantilla as PlantillaConfig).encabezado.campos ?? []).filter(c => (c.zona ?? "datos") === z);
                            return (
                              <div key={z} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    {z === "datos" ? "Franja inferior" : "Tabla lateral"}
                                  </span>
                                  <button
                                    onClick={() => addCampoEncabezado(z)}
                                    className="h-5 px-1.5 rounded border border-border text-[9px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-0.5"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {zonaCampos.map((campo, idx) => {
                                    const allCampos = (config.plantilla as PlantillaConfig).encabezado.campos ?? [];
                                    const globalIdx = allCampos.findIndex(c => c.id === campo.id);
                                    const isDragging   = encDragIdx === globalIdx;
                                    const isDropTarget = encDropIdx === globalIdx && encDragIdx !== null && encDragIdx !== globalIdx;
                                    return (
                                      <div
                                        key={campo.id}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setEncDragIdx(globalIdx); }}
                                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setEncDropIdx(globalIdx); }}
                                        onDrop={(e) => { e.preventDefault(); if (encDragIdx !== null) reorderCamposEncabezado(encDragIdx, globalIdx); setEncDragIdx(null); setEncDropIdx(null); }}
                                        onDragEnd={() => { setEncDragIdx(null); setEncDropIdx(null); }}
                                        className={cn(
                                          "rounded border bg-card transition-all select-none",
                                          isDragging    ? "opacity-40 border-dashed border-primary/40" : "border-border",
                                          isDropTarget  ? "border-primary/60 bg-primary/5" : "",
                                        )}
                                      >
                                        <div className="flex items-center gap-1 px-1.5 py-1">
                                          <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0 cursor-grab" />
                                          <input
                                            value={campo.label}
                                            onChange={(e) => updateCampoEncabezado(campo.id, { label: e.target.value })}
                                            className="flex-1 min-w-0 text-[11px] bg-transparent border-0 outline-none focus:bg-muted/30 rounded px-0.5 text-foreground"
                                            placeholder="Etiqueta"
                                          />
                                          {/* Fuente selector */}
                                          <select
                                            value={campo.fuente}
                                            onChange={(e) => updateCampoEncabezado(campo.id, { fuente: e.target.value as FuenteCampo, valor: "" })}
                                            className="text-[9px] border border-border rounded px-1 py-0.5 bg-background text-muted-foreground shrink-0"
                                          >
                                            <option value="productor">Productor</option>
                                            <option value="periodo">Período</option>
                                            <option value="semana">Semana</option>
                                            <option value="custom">Manual</option>
                                          </select>
                                          <button
                                            onClick={() => removeCampoEncabezado(campo.id)}
                                            className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-colors"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                        {campo.fuente === "custom" && (
                                          <div className="px-1.5 pb-1">
                                            <input
                                              value={campo.valor}
                                              onChange={(e) => updateCampoEncabezado(campo.id, { valor: e.target.value })}
                                              className="w-full text-[10px] bg-muted/30 border border-border/60 rounded px-1.5 py-0.5 outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                                              placeholder="Valor fijo…"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {zonaCampos.length === 0 && (
                                    <p className="text-[9px] text-muted-foreground/40 text-center py-1.5 border border-dashed border-border/40 rounded">Sin campos</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Contenido del informe */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Contenido del informe
                    </Label>
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/10">
                      <p className="text-[10px] text-muted-foreground border border-border/50 rounded px-2 py-1.5 bg-muted/20">
                        Notas y conclusiones se gestionan con los bloques de texto en la pestaña Textos.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Firma del responsable</span>
                        <Switch
                          checked={((config.plantilla as any)?.incluirFirma) ?? false}
                          onCheckedChange={(v) => updPlantilla("incluirFirma", v)}
                          className="scale-75"
                        />
                      </div>
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] text-muted-foreground">Pie de página</span>
                        <Textarea
                          value={(config.plantilla as any)?.piePagina ?? ""}
                          onChange={(e) => updPlantilla("piePagina", e.target.value)}
                          placeholder="Ej: Generado por AgroWorkin · Confidencial"
                          className="text-xs min-h-[52px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Disposición en página */}
                  {config.bloques.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Grid3x3 className="w-3.5 h-3.5" /> Disposición en página
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Arrastra cada bloque para reordenarlo y define su ancho. El orden aquí se refleja en la preview en vivo.
                      </p>
                      <div className="space-y-1.5">
                        {config.bloques.map((bloque, idx) => {
                          const currentSpan: ColSpan = (config.plantilla as any)?.layoutConfig?.[bloque.id] ?? "full";
                          const label = bloque.tipo === "texto"
                            ? ((bloque as TextoBloque).titulo || SUBTIPO_STYLES[(bloque as TextoBloque).subtipo]?.label || `Texto ${idx + 1}`)
                            : bloque.titulo || (bloque.tipo === "grafico" ? `Gráfico ${idx + 1}` : `Tabla ${idx + 1}`);
                          const isDragging = layoutBlockDragId === bloque.id;
                          const isDropTarget = layoutBlockDropId === bloque.id && layoutBlockDragId !== null && layoutBlockDragId !== bloque.id;
                          const opts: Array<{ v: ColSpan; label: string }> = [
                            { v: "full",       label: "■" },
                            { v: "two-thirds", label: "⅔" },
                            { v: "half",       label: "½" },
                            { v: "third",      label: "⅓" },
                          ];
                          return (
                            <div
                              key={bloque.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (layoutBlockDragId && layoutBlockDragId !== bloque.id) {
                                  setLayoutBlockDropId(bloque.id);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (layoutBlockDragId && layoutBlockDragId !== bloque.id) {
                                  reorderBloqueOrden(layoutBlockDragId, bloque.id);
                                }
                                setLayoutBlockDragId(null);
                                setLayoutBlockDropId(null);
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded border bg-muted/10 transition-all",
                                isDragging ? "opacity-50 border-dashed border-primary/40" : "border-border",
                                isDropTarget ? "border-primary/60 bg-primary/5" : "",
                              )}
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", bloque.id);
                                    setLayoutBlockDragId(bloque.id);
                                    setLayoutBlockDropId(bloque.id);
                                  }}
                                  onDragEnd={() => {
                                    setLayoutBlockDragId(null);
                                    setLayoutBlockDropId(null);
                                  }}
                                  className="p-1 rounded text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                                  title="Arrastrar para reordenar"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </button>
                                {bloque.tipo === "grafico" && <BarChart2 className="w-3 h-3 text-blue-500 shrink-0" />}
                                {bloque.tipo === "tabla"   && <Table2    className="w-3 h-3 text-purple-500 shrink-0" />}
                                {bloque.tipo === "texto"   && <FileText  className="w-3 h-3 text-amber-500 shrink-0" />}
                                <span className="text-[11px] text-foreground truncate">{label}</span>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                {opts.map(o => (
                                  <button
                                    key={o.v}
                                    onClick={() => {
                                      const current = (config.plantilla as any)?.layoutConfig ?? {};
                                      updPlantilla("layoutConfig" as any, { ...current, [bloque.id]: o.v });
                                    }}
                                    className={cn(
                                      "w-7 h-6 rounded border text-[11px] transition-all",
                                      currentSpan === o.v
                                        ? "border-primary bg-primary/10 text-primary font-bold"
                                        : "border-border text-muted-foreground hover:border-primary/40"
                                    )}
                                  >{o.label}</button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Formato de página */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5" /> Formato de página
                    </Label>
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/10">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Tamaño</span>
                        <div className="flex gap-1">
                          {(["A4", "Letter", "A3"] as const).map((sz) => (
                            <button key={sz}
                              onClick={() => updPlantilla("formato", { ...(config.plantilla as any)?.formato, tamañoPagina: sz })}
                              className={cn(
                                "flex-1 py-1 rounded border text-[10px] font-medium transition-all",
                                ((config.plantilla as any)?.formato?.tamañoPagina ?? "A4") === sz
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >{sz}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Orientación</span>
                        <div className="flex gap-1">
                          {(["portrait", "landscape"] as const).map((ori) => (
                            <button key={ori}
                              onClick={() => updPlantilla("formato", { ...(config.plantilla as any)?.formato, orientacion: ori })}
                              className={cn(
                                "flex-1 py-1.5 rounded border text-[10px] font-medium transition-all",
                                ((config.plantilla as any)?.formato?.orientacion ?? "portrait") === ori
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >{ori === "portrait" ? "Vertical" : "Horizontal"}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Numeración de páginas</span>
                        <Switch
                          checked={((config.plantilla as any)?.formato?.numeracionPaginas) ?? true}
                          onCheckedChange={(v) => updPlantilla("formato", { ...(config.plantilla as any)?.formato, numeracionPaginas: v })}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Márgenes */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" /> Márgenes (mm)
                    </Label>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border bg-muted/10">
                      {(["superior", "inferior", "izquierdo", "derecho"] as const).map((lado) => (
                        <div key={lado} className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{lado}</span>
                          <Input
                            type="number" min={0} max={50}
                            value={(config.plantilla as any)?.margenes?.[lado] ?? 20}
                            onChange={(e) => updPlantilla("margenes", { ...(config.plantilla as any)?.margenes, [lado]: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estilo global de tablas */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Table2 className="w-3.5 h-3.5" /> Estilo global de tablas
                    </Label>
                    <div className="p-3 rounded-lg border border-border bg-muted/5 space-y-3">
                      {(() => {
                        const et = (config.plantilla as any)?.estiloTablas ?? { mostrarBordes: true, alternarFilas: true, alineacion: "left", compacta: false, tipografia: DEFAULT_TIPOGRAFIA };
                        const updET = (patch: object) => updPlantilla("estiloTablas" as any, { ...et, ...patch });
                        return (
                          <>
                            {(["mostrarBordes", "alternarFilas", "compacta"] as const).map((key) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">
                                  {key === "mostrarBordes" ? "Mostrar bordes" : key === "alternarFilas" ? "Filas alternadas" : "Vista compacta"}
                                </span>
                                <Switch checked={!!et[key]} onCheckedChange={(v) => updET({ [key]: v })} className="scale-75" />
                              </div>
                            ))}
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground">Alineación</span>
                              <div className="flex gap-1">
                                {(["left", "center", "right"] as const).map((al) => (
                                  <button key={al} onClick={() => updET({ alineacion: al })}
                                    className={cn("flex-1 flex items-center justify-center py-1 rounded border transition-all",
                                      et.alineacion === al ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                                    {al === "left" ? <AlignLeft className="w-3 h-3" /> : al === "center" ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <TipografiaPanel tipografia={et.tipografia ?? DEFAULT_TIPOGRAFIA} onChange={(t) => updET({ tipografia: t })} />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Estilo global de gráficos */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" /> Estilo global de gráficos
                    </Label>
                    <div className="p-3 rounded-lg border border-border bg-muted/5">
                      {(() => {
                        const eg = (config.plantilla as any)?.estiloGraficos ?? { tipografia: DEFAULT_TIPOGRAFIA };
                        return (
                          <TipografiaPanel
                            tipografia={eg.tipografia ?? DEFAULT_TIPOGRAFIA}
                            onChange={(t) => updPlantilla("estiloGraficos" as any, { ...eg, tipografia: t })}
                          />
                        );
                      })()}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>



        {/* Preview panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/30 overflow-hidden">
          {builderTab === "avanzado" ? (
            /* ===== DISEÑO TAB: Full page layout preview ===== */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Preview toolbar */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0 border-b border-border/40 bg-card/60 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold shrink-0">Vista de página</span>
                  <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                    {(config.plantilla as any)?.formato?.tamañoPagina ?? "A4"} ·{" "}
                    {(config.plantilla as any)?.formato?.orientacion === "landscape" ? "Horizontal" : "Vertical"}
                  </Badge>
                </div>
                {/* Zoom controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted border border-border/60 text-muted-foreground disabled:opacity-30"
                    onClick={() => {
                      const auto = Math.min(1, Math.max(280, pageContainerW - 48) / 794, Math.max(400, pageContainerH - 96) / 1123);
                      const cur = pageZoom ?? auto;
                      const next = PAGE_ZOOM_STEPS.slice().reverse().find(s => s < cur - 0.01);
                      setPageZoom(next ?? PAGE_ZOOM_STEPS[0]);
                    }}
                    disabled={pageZoom !== null && pageZoom <= PAGE_ZOOM_STEPS[0]}
                    title="Reducir"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    className="min-w-[52px] h-6 px-1.5 text-[11px] font-medium rounded hover:bg-muted border border-border/60 text-foreground tabular-nums"
                    onClick={() => setPageZoom(null)}
                    title="Ajustar a pantalla"
                  >
                    {pageZoom !== null ? `${Math.round(pageZoom * 100)}%` : "Ajustar"}
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted border border-border/60 text-muted-foreground disabled:opacity-30"
                    onClick={() => {
                      const auto = Math.min(1, Math.max(280, pageContainerW - 48) / 794, Math.max(400, pageContainerH - 96) / 1123);
                      const cur = pageZoom ?? auto;
                      const next = PAGE_ZOOM_STEPS.find(s => s > cur + 0.01);
                      setPageZoom(next ?? PAGE_ZOOM_STEPS[PAGE_ZOOM_STEPS.length - 1]);
                    }}
                    disabled={pageZoom !== null && pageZoom >= PAGE_ZOOM_STEPS[PAGE_ZOOM_STEPS.length - 1]}
                    title="Ampliar"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Page container — scrollable grey background */}
              <div ref={pageContainerRef} className="flex-1 overflow-y-auto bg-muted/50 flex flex-col items-center py-6 px-4 gap-6">
                {/* Paper pages — rendered at natural 96dpi, CSS-scaled to fit panel */}
                {(() => {
                  const pl = config.plantilla as any;
                  const fmt = pl?.formato ?? {};
                  const enc = pl?.encabezado ?? {};
                  const margenes = pl?.margenes ?? { superior: 20, inferior: 20, izquierdo: 15, derecho: 15 };
                  const isLandscape = fmt.orientacion === "landscape";
                  const tamano = fmt.tamañoPagina ?? "A4";

                  // Natural px at 96dpi (1mm = 3.7795px)
                  const naturalMap: Record<string, [number, number]> = {
                    A4: [794, 1123], Letter: [816, 1056], A3: [1123, 1587],
                  };
                  const [nw, nh] = naturalMap[tamano] ?? [794, 1123];
                  const [naturalW, naturalH] = isLandscape ? [nh, nw] : [nw, nh];

                  // Scale: manual zoom if set, otherwise auto-fit to both width and height
                  const availW = Math.max(280, pageContainerW - 48);
                  const availH = Math.max(400, pageContainerH - 96);
                  const autoScale = Math.min(1, availW / naturalW, availH / naturalH);
                  const renderScale = pageZoom ?? autoScale;
                  const dispW = naturalW * renderScale;
                  const dispH = naturalH * renderScale;

                  // Margins in natural px
                  const mm2px = 3.7795;
                  const pad = {
                    top: (margenes.superior ?? 20) * mm2px,
                    bottom: (margenes.inferior ?? 20) * mm2px,
                    left: (margenes.izquierdo ?? 15) * mm2px,
                    right: (margenes.derecho ?? 15) * mm2px,
                  };
                  const colorBorde = enc.colorBorde ?? "#cc0000";
                  const todosLosCampos: CampoEncabezado[] = Array.isArray(enc.campos) ? enc.campos : [];
                  const datosCampos = todosLosCampos.filter(c => (c.zona ?? "datos") === "datos");
                  const metaCampos  = todosLosCampos.filter(c => c.zona === "meta");
                  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
                  const hasSections = !!pl?.incluirFirma;

                  // Fixed heights (natural px)
                  const headerH = enc.altura === "sm" ? 80 : enc.altura === "lg" ? 140 : 110;
                  const footerH = 28;
                  const sectionsH = hasSections ? 60 : 0;
                  const GAP = 8; // gap between blocks
                  const BLOCK_LABEL_H = 32;
                  const logoPosition = (enc.posicionLogo ?? "left") as "left" | "center" | "right";
                  const titleAlignFallback = logoPosition === "right" ? "right" : logoPosition === "left" ? "left" : "center";
                  const titleAlign = (enc.alineacionTitulo ?? titleAlignFallback) as "left" | "center" | "right";
                  const titleAlignClass = titleAlign === "left" ? "text-left" : titleAlign === "right" ? "text-right" : "text-center";
                  const headerGap = Math.max(0, Math.min(32, Number(enc.separacionElementos ?? 12)));
                  const totalBlocksArea = naturalH - pad.top - pad.bottom - headerH - footerH - sectionsH - 12;
                  const blockHeight = (b: ReporteBloque): number =>
                    resolveBlockHeight(b, pl?.alturaBloques);

                  // ── Group blocks into persistent lanes (supports stacking like 1/3 + 2/3, then more 2/3) ──
                  const SPAN_FRAC: Record<ColSpan, number> = { full: 1, "two-thirds": 2 / 3, half: 0.5, third: 1 / 3 };
                  const spanForBlock = (b: ReporteBloque): number => SPAN_FRAC[pl?.layoutConfig?.[b.id] ?? "full"];
                  const spanWidth = (frac: number): string => {
                    if (Math.abs(frac - 1) < 0.001) return "100%";
                    if (Math.abs(frac - 2 / 3) < 0.001) return `calc(66.67% - ${GAP / 3}px)`;
                    if (Math.abs(frac - 0.5) < 0.001) return `calc(50% - ${GAP / 2}px)`;
                    if (Math.abs(frac - 1 / 3) < 0.001) return `calc(33.33% - ${(GAP * 2) / 3}px)`;
                    return `${(frac * 100).toFixed(2)}%`;
                  };

                  type Lane = { frac: number; blocks: ReporteBloque[] };
                  type LayoutGroup =
                    | { kind: "full"; block: ReporteBloque }
                    | { kind: "row"; blocks: ReporteBloque[] }
                    | { kind: "lanes"; lanes: Lane[] };

                  const laneHeight = (lane: Lane): number => {
                    const stacked = lane.blocks.reduce((acc, b) => acc + blockHeight(b), 0);
                    return stacked + GAP * Math.max(0, lane.blocks.length - 1);
                  };

                  const groupHeight = (group: LayoutGroup): number => {
                    if (group.kind === "full") return blockHeight(group.block);
                    if (group.kind === "row") return Math.max(...group.blocks.map(blockHeight));
                    return Math.max(...group.lanes.map(laneHeight));
                  };

                  const layoutGroups: LayoutGroup[] = (() => {
                    const groups: LayoutGroup[] = [];
                    let i = 0;
                    while (i < config.bloques.length) {
                      const first = config.bloques[i];
                      const firstFrac = spanForBlock(first);

                      if (firstFrac >= 0.999) {
                        groups.push({ kind: "full", block: first });
                        i += 1;
                        continue;
                      }

                      // Build a base row until it fills 100% (or we cannot continue).
                      const base: ReporteBloque[] = [];
                      let sum = 0;
                      while (i < config.bloques.length) {
                        const b = config.bloques[i];
                        const frac = spanForBlock(b);
                        if (frac >= 0.999 || sum + frac > 1.001) break;
                        base.push(b);
                        sum += frac;
                        i += 1;
                        if (sum >= 0.999) break;
                      }

                      if (base.length === 0) {
                        groups.push({ kind: "full", block: first });
                        i += 1;
                        continue;
                      }

                      // If row is incomplete, keep standard row behavior.
                      if (sum < 0.999) {
                        groups.push({ kind: "row", blocks: base });
                        continue;
                      }

                      // Row completed: convert to persistent lanes and stack next blocks by matching width.
                      const lanes: Lane[] = base.map((b) => ({ frac: spanForBlock(b), blocks: [b] }));

                      while (i < config.bloques.length) {
                        const candidate = config.bloques[i];
                        const candidateFrac = spanForBlock(candidate);
                        if (candidateFrac >= 0.999) break;

                        const matchingLaneIdx = lanes
                          .map((lane, idx) => ({ idx, ok: Math.abs(lane.frac - candidateFrac) < 0.001 }))
                          .filter((x) => x.ok)
                          .map((x) => x.idx);

                        if (matchingLaneIdx.length === 0) break;

                        // Place in the shortest matching lane to keep columns balanced.
                        let target = matchingLaneIdx[0];
                        let minH = Number.POSITIVE_INFINITY;
                        for (const idx of matchingLaneIdx) {
                          const h = laneHeight(lanes[idx]);
                          if (h < minH) {
                            minH = h;
                            target = idx;
                          }
                        }

                        lanes[target].blocks.push(candidate);
                        i += 1;
                      }

                      groups.push({ kind: "lanes", lanes });
                    }
                    return groups;
                  })();

                  // ── Paginate by layout groups ─────────────────────────────────
                  const pages: LayoutGroup[][] = [];
                  let currentPage: LayoutGroup[] = [];
                  let currentH = 0;
                  for (const group of layoutGroups) {
                    const gh = groupHeight(group);
                    const gapAdd = currentPage.length > 0 ? GAP : 0;
                    if (currentPage.length > 0 && currentH + gapAdd + gh > totalBlocksArea) {
                      pages.push(currentPage);
                      currentPage = [group];
                      currentH = gh;
                    } else {
                      currentPage.push(group);
                      currentH += gapAdd + gh;
                    }
                  }
                  if (currentPage.length > 0 || layoutGroups.length === 0) pages.push(currentPage);
                  const totalPages = pages.length;
                  const blockOrder = new Map(config.bloques.map((b, idx) => [b.id, idx]));

                  const renderPageBlock = (bloque: ReporteBloque) => {
                    const globalIdx = blockOrder.get(bloque.id) ?? 0;
                    const innerScale = bloque.tipo === "tabla" ? 0.55 : bloque.tipo === "texto" ? 1 : 0.45;
                    const invScale = 1 / innerScale;
                    const currentHeight = blockHeight(bloque);
                    const isResizing = resizeDrag?.bloqueId === bloque.id;
                    return (
                      <div
                        onClick={(ev) => {
                          if (suppressBlockOpenRef.current) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            return;
                          }
                          setSelectedBloqueId(bloque.id);
                          setBuilderTab(bloque.tipo === "grafico" ? "graficos" : bloque.tipo === "tabla" ? "tablas" : "textos");
                        }}
                        className="w-full h-full relative group"
                      >
                        {bloque.tipo === "texto" ? (
                          <div className="border border-border/60 rounded overflow-hidden cursor-pointer hover:border-primary/40 transition-colors h-full">
                            <TextoBloqueView bloque={bloque as TextoBloque} />
                          </div>
                        ) : (
                          <div className="border border-border/60 rounded overflow-hidden cursor-pointer hover:border-primary/40 transition-colors h-full flex flex-col">
                            {/* Block label row */}
                            <div className="flex items-center gap-2 px-3 border-b border-border/40 bg-muted/20 shrink-0" style={{ height: BLOCK_LABEL_H }}>
                              {bloque.tipo === "grafico"
                                ? <BarChart2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                : <Table2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              }
                              <span className="text-sm font-medium text-foreground truncate">
                                {bloque.titulo || (bloque.tipo === "grafico" ? `Gráfico ${globalIdx + 1}` : `Tabla ${globalIdx + 1}`)}
                              </span>
                            </div>
                            {/* Block content */}
                            <div className="relative overflow-hidden flex-1">
                              <div style={{
                                transform: `scale(${innerScale})`,
                                transformOrigin: "top left",
                                width: `${invScale * 100}%`,
                                height: `${invScale * 100}%`,
                              }}>
                                {bloque.tipo === "grafico"
                                  ? <GraficoBloqueView bloque={bloque as GraficoBloque} colors={paleta.colors} estiloPlantilla={(pl as any)?.estiloGraficos} />
                                  : (
                                    <TablaBloqueView
                                      bloque={bloque as TablaBloque}
                                      colors={paleta.colors}
                                      estiloPlantilla={(pl as any)?.estiloTablas}
                                      onReorderColumns={(nextCols) => setTablaColumnOrder(bloque.id, nextCols)}
                                    />
                                  )
                                }
                              </div>
                            </div>
                          </div>
                        )}
                        <div
                          onMouseDown={(e) => startBloqueResize(e, bloque.id, bloque.tipo, currentHeight, renderScale)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "absolute bottom-0 left-0 right-0 z-20 h-2 cursor-ns-resize transition-colors",
                            isResizing ? "bg-primary/20" : "bg-transparent hover:bg-primary/10",
                          )}
                          title="Arrastra el borde inferior para cambiar el alto"
                        >
                          <div
                            className={cn(
                              "mx-auto mt-[2px] h-[2px] w-20 rounded-full transition-colors",
                              isResizing ? "bg-primary/70" : "bg-border/80 group-hover:bg-primary/40",
                            )}
                          />
                        </div>
                      </div>
                    );
                  };

                  // ── Render a single page ─────────────────────────────────────
                  const renderPage = (pageGroups: LayoutGroup[], pageIdx: number) => {
                    const isLastPage = pageIdx === totalPages - 1;
                    const showSections = hasSections && isLastPage;

                    return (
                      <div key={pageIdx} className="shrink-0" style={{ width: dispW, height: dispH }}>
                        <div
                          className="bg-white shadow-xl rounded-sm overflow-hidden origin-top-left relative"
                          style={{ width: naturalW, height: naturalH, transform: `scale(${renderScale})` }}
                        >
                          <div
                            className="absolute inset-0 flex flex-col"
                            style={{ padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px` }}
                          >
                            {/* ── HEADER (only page 1) ── */}
                            {pageIdx === 0 ? (
                              <div className="shrink-0" style={{ height: headerH }}>
                                {/* Top row: logo + title + meta table */}
                                <div className="space-y-1">
                                  {config.mostrarLogo && logoPosition === "center" && (
                                    <div className="flex justify-center" style={{ marginBottom: headerGap }}>
                                      <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                                        {enc.logoPersonalizado ? (
                                          <img src={enc.logoPersonalizado} alt="Logo" className="w-full h-full object-contain bg-white" />
                                        ) : (
                                          <Globe className="w-7 h-7 text-primary-foreground" />
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-start justify-between" style={{ gap: `${headerGap}px` }}>
                                    <div
                                      className={cn(
                                        "flex min-w-0 flex-1 items-start",
                                        logoPosition === "right" && "flex-row-reverse",
                                      )}
                                      style={{ gap: `${headerGap}px` }}
                                    >
                                      {config.mostrarLogo && logoPosition !== "center" && (
                                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                                          {enc.logoPersonalizado ? (
                                            <img src={enc.logoPersonalizado} alt="Logo" className="w-full h-full object-contain bg-white" />
                                          ) : (
                                            <Globe className="w-7 h-7 text-primary-foreground" />
                                          )}
                                        </div>
                                      )}

                                      <div className={cn("min-w-0 flex-1", titleAlignClass)}>
                                        {enc.mostrarEmpresa && (
                                          <p className="font-bold text-foreground text-base leading-tight truncate">{config.nombre || "Nuevo informe"}</p>
                                        )}
                                        {!enc.mostrarEmpresa && (
                                          <p className="font-bold text-foreground text-base leading-tight truncate">{config.titulo || config.nombre || "Nuevo informe"}</p>
                                        )}
                                        {config.subtitulo && <p className="text-muted-foreground text-xs truncate">{config.subtitulo}</p>}
                                        {enc.textoPersonalizado && <p className="text-muted-foreground text-xs truncate">{enc.textoPersonalizado}</p>}
                                      </div>
                                    </div>

                                    {/* Meta campos — right table */}
                                    {metaCampos.length > 0 && (
                                      <table className="shrink-0 border-collapse text-[9px]" style={{ border: "1px solid #999" }}>
                                        <tbody>
                                          {metaCampos.map((c) => (
                                            <tr key={c.id} style={{ borderBottom: "1px solid #ccc" }}>
                                              <td className="font-bold uppercase px-2 py-0.5 whitespace-nowrap" style={{ borderRight: "1px solid #ccc" }}>{c.label}:</td>
                                              <td className="px-2 py-0.5 whitespace-nowrap">{getCampoEncabezadoPreviewValue(c) || "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                    {metaCampos.length === 0 && enc.mostrarFecha && (
                                      <p className="text-muted-foreground text-xs shrink-0">{today}</p>
                                    )}
                                  </div>
                                </div>
                                {/* Datos campos — bottom strip */}
                                {datosCampos.length > 0 && (
                                  <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-1.5 text-xs border-t border-border/30 pt-1">
                                    {datosCampos.map((c) => (
                                      <span key={c.id} className="text-foreground">
                                        <span className="font-bold uppercase">{c.label}:</span>{" "}
                                        <span className="underline">{getCampoEncabezadoPreviewValue(c) || "—"}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {enc.mostrarLinea !== false && (
                                  <div className="rounded-full mt-1" style={{ height: 3, backgroundColor: colorBorde }} />
                                )}
                              </div>
                            ) : (
                              /* Continuation header on pages 2+ */
                              <div className="shrink-0 pb-2 mb-2 border-b border-border/40" style={{ height: 40 }}>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-muted-foreground truncate">
                                    {config.titulo || config.nombre || "Nuevo informe"} — cont.
                                  </p>
                                  <p className="text-xs text-muted-foreground shrink-0">{today}</p>
                                </div>
                              </div>
                            )}

                            {/* ── BLOCKS (persistent lanes per width) ── */}
                            <div className="flex flex-col overflow-hidden" style={{ gap: GAP, marginTop: 12, flex: 1 }}>
                              {pageGroups.length === 0 ? (
                                <div className="w-full flex flex-col items-center justify-center text-muted-foreground/30 border border-dashed rounded text-sm" style={{ height: totalBlocksArea }}>
                                  <Layers className="w-8 h-8 mb-2" />
                                  <p>Sin bloques</p>
                                </div>
                              ) : (
                                pageGroups.map((group, groupIdx) => {
                                  const gh = groupHeight(group);
                                  if (group.kind === "full") {
                                    return (
                                      <div key={`${group.kind}-${groupIdx}`} className="shrink-0" style={{ height: gh }}>
                                        {renderPageBlock(group.block)}
                                      </div>
                                    );
                                  }

                                  if (group.kind === "row") {
                                    return (
                                      <div key={`${group.kind}-${groupIdx}`} className="flex shrink-0" style={{ height: gh, gap: GAP }}>
                                        {group.blocks.map((bloque) => (
                                          <div key={bloque.id} style={{ width: spanWidth(spanForBlock(bloque)), height: "100%", flexShrink: 0 }}>
                                            {renderPageBlock(bloque)}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={`${group.kind}-${groupIdx}`} className="flex shrink-0" style={{ height: gh, gap: GAP }}>
                                      {group.lanes.map((lane, laneIdx) => (
                                        <div
                                          key={`${group.kind}-${groupIdx}-lane-${laneIdx}`}
                                          className="flex flex-col"
                                          style={{ width: spanWidth(lane.frac), height: "100%", flexShrink: 0, gap: GAP }}
                                        >
                                          {lane.blocks.map((bloque) => (
                                            <div key={bloque.id} className="shrink-0" style={{ height: blockHeight(bloque) }}>
                                              {renderPageBlock(bloque)}
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* ── SECTIONS (last page only) ── */}
                            {showSections && (
                              <div className="shrink-0 flex gap-3 mt-2">
                                {pl?.incluirFirma && (
                                  <div className="w-1/4 min-w-[140px] border-t-2 border-foreground/30 px-2 text-sm">
                                    <span className="text-muted-foreground">Firma del responsable</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── FOOTER ── */}
                            <div className="shrink-0 flex items-center justify-between border-t border-border/30 mt-2 pt-1 text-xs text-muted-foreground">
                              <span className="truncate">{pl?.piePagina || ""}</span>
                              {fmt.numeracionPaginas && (
                                <span className="shrink-0 ml-2">{pageIdx + 1} / {totalPages}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return <>{pages.map((pageGroups, pageIdx) => renderPage(pageGroups, pageIdx))}</>;
                })()}
              </div>
            </div>
          ) : (
            /* ===== OTHER TABS: Block card preview ===== */
            <>
          {(() => {
            const previewEnc = ((config.plantilla as any)?.encabezado ?? {}) as {
              posicionLogo?: "left" | "center" | "right";
              alineacionTitulo?: "left" | "center" | "right";
              separacionElementos?: number;
              logoPersonalizado?: string;
            };
            const previewLogoPos = previewEnc.posicionLogo ?? "left";
            const previewTitleFallback = previewLogoPos === "right" ? "right" : previewLogoPos === "left" ? "left" : "center";
            const previewTitleAlign = previewEnc.alineacionTitulo ?? previewTitleFallback;
            const previewTitleAlignClass = previewTitleAlign === "left" ? "text-left" : previewTitleAlign === "right" ? "text-right" : "text-center";
            const previewGap = Math.max(0, Math.min(32, Number(previewEnc.separacionElementos ?? 12)));

            return (
              <>
          {/* Preview header */}
          <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 shrink-0">
            <div className="flex-1 min-w-0">
              {config.mostrarLogo && previewLogoPos === "center" && (
                <div className="flex justify-center mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow overflow-hidden">
                    {previewEnc.logoPersonalizado ? (
                      <img src={previewEnc.logoPersonalizado} alt="Logo" className="w-full h-full object-contain bg-white" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>
                </div>
              )}
              <div
                className={cn(
                  "flex items-center min-w-0",
                  previewLogoPos === "right" && "flex-row-reverse",
                )}
                style={{ gap: `${previewGap}px` }}
              >
                {config.mostrarLogo && previewLogoPos !== "center" && (
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow overflow-hidden">
                    {previewEnc.logoPersonalizado ? (
                      <img src={previewEnc.logoPersonalizado} alt="Logo" className="w-full h-full object-contain bg-white" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>
                )}
                <div className={cn("min-w-0 flex-1", previewTitleAlignClass)}>
                  <h2 className="font-bold text-lg leading-tight truncate">
                    {config.titulo || config.nombre || "Nuevo informe"}
                  </h2>
                  {config.subtitulo && <p className="text-xs text-muted-foreground truncate">{config.subtitulo}</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Eye className="w-2.5 h-2.5" /> Preview en vivo
                </Badge>
              {bloqueCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {bloqueCount} bloque{bloqueCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Color accent line */}
          <div className="flex px-6 gap-1 mb-4 shrink-0">
            {paleta.colors.map((c, i) => (
              <div key={i} className="h-1 rounded-full flex-1 transition-colors duration-300"
                style={{ backgroundColor: c }} />
            ))}
          </div>
              </>
            );
          })()}

            {/* ------ Live multi-block preview ------ */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              {config.bloques.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground/40 py-16">
                  <Layers className="w-14 h-14" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Sin bloques</p>
                    <p className="text-xs mt-1">Usa el panel izquierdo para agregar gráficos y tablas al informe</p>
                  </div>
                </div>
              ) : (
                config.bloques.map((bloque, idx) => {
                  const isSelected = selectedBloqueId === bloque.id;
                  const currentHeight = resolveBlockHeight(bloque, (config.plantilla as any)?.alturaBloques);
                  return (
                    <div
                      key={bloque.id}
                      onClick={() => setSelectedBloqueId(bloque.id)}
                      className={cn(
                        "bg-card border rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all",
                        isSelected ? "ring-2 ring-primary border-primary/40" : "hover:border-primary/20",
                      )}
                    >
                      {/* Block header */}
                      <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-2">
                        {bloque.tipo === "grafico" ? (
                          <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : bloque.tipo === "tabla" ? (
                          <Table2 className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="text-xs font-semibold flex-1">
                          {bloque.tipo === "texto"
                            ? ((bloque as TextoBloque).titulo || SUBTIPO_STYLES[(bloque as TextoBloque).subtipo]?.label || `Texto ${idx + 1}`)
                            : (bloque.titulo || (bloque.tipo === "grafico" ? `Gráfico ${idx + 1}` : `Tabla ${idx + 1}`))
                          }
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {bloque.tipo === "grafico"
                            ? TIPOS_GRAFICO.find((t) => t.id === (bloque as GraficoBloque).tipoGrafico)?.label
                            : bloque.tipo === "tabla"
                              ? `${(bloque as TablaBloque).fuentesSeleccionadas.length} fuente${(bloque as TablaBloque).fuentesSeleccionadas.length !== 1 ? "s" : ""}`
                              : (bloque as TextoBloque).subtipo
                          }
                        </span>
                        {isSelected && (
                          <Badge variant="default" className="text-[9px] py-0 px-1.5 h-4">editando</Badge>
                        )}
                      </div>

                      {/* Block content - chart, table or text */}
                      <div
                        className="p-4"
                        style={{
                          height: Math.max(
                            96,
                            Math.round(currentHeight * 0.75),
                          ),
                        }}
                      >
                        {bloque.tipo === "grafico" ? (
                          <GraficoBloqueView bloque={bloque as GraficoBloque} colors={paleta.colors} estiloPlantilla={(config.plantilla as any)?.estiloGraficos} />
                        ) : bloque.tipo === "tabla" ? (
                          <TablaBloqueView
                            bloque={bloque as TablaBloque}
                            colors={paleta.colors}
                            estiloPlantilla={(config.plantilla as any)?.estiloTablas}
                            onReorderColumns={(nextCols) => setTablaColumnOrder(bloque.id, nextCols)}
                          />
                        ) : (
                          <TextoBloqueView bloque={bloque as TextoBloque} />
                        )}
                      </div>

                      {/* Block footer */}
                      <div className="px-4 py-2 border-t border-border/40 flex items-center gap-2 bg-muted/20">
                        <Shuffle className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">
                          {bloque.tipo === "texto" ? "Haz clic para editar este bloque" : "Datos simulados - Haz clic para editar este bloque"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </>
          )}
          </div>
        </div>
      </div>
    );
  }

  // --- GraphicCard - Simplified graphic management component ---

interface GraphicCardProps {
  bloque: GraficoBloque;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<GraficoBloque>) => void;
}

function GraphicCard({ bloque, index, isSelected, onSelect, onDelete, onUpdate }: GraphicCardProps) {
  const {
    isEditing,
    localValue: localTitle,
    setLocalValue: setLocalTitle,
    handleSave,
    handleCancel,
    handleKeyDown,
    startEdit,
  } = useInlineEdit(bloque.titulo, (newTitle) => onUpdate({ titulo: newTitle }));

  const tipoInfo = TIPOS_GRAFICO.find(t => t.id === bloque.tipoGrafico);
  const sourcesCount = bloque.fuentesSeleccionadas.length;
  const metricsCount = bloque.metricas.length;

  return (
    <Card className={cn(
      "group transition-all cursor-pointer",
      isSelected
        ? "border-primary bg-primary/5 shadow-sm"
        : "hover:border-primary/40 hover:shadow-sm"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3" onClick={onSelect}>
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
          isSelected ? "bg-primary/10" : "bg-muted"
        )}>
          {tipoInfo?.icon ? (
            <tipoInfo.icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
          ) : (
            <BarChart2 className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="h-6 text-sm flex-1"
                  placeholder={`Gráfico ${index + 1}`}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <h4 className="font-medium text-sm truncate flex-1">
                  {bloque.titulo || `Gráfico ${index + 1}`}
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit();
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {/* Type and Stats */}
          <p className="text-xs text-muted-foreground mb-2">
            {tipoInfo?.label || "Gráfico"} - {sourcesCount} fuente{sourcesCount !== 1 ? 's' : ''} - {metricsCount} métrica{metricsCount !== 1 ? 's' : ''}
          </p>

          {/* Options badges */}
          <div className="flex flex-wrap gap-1">
            {bloque.apilado && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Apilado</Badge>
            )}
            {bloque.mostrarLeyenda && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Leyenda</Badge>
            )}
            {bloque.mostrarGrid && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Cuadrícula</Badge>
            )}
            {bloque.camposCalculados && bloque.camposCalculados.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                <Calculator className="w-2.5 h-2.5 mr-1" />
                {bloque.camposCalculados.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- TableCard - Simplified table management component ---

interface TableCardProps {
  bloque: TablaBloque;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TablaBloque>) => void;
}

function TableCard({ bloque, index, isSelected, onSelect, onDelete, onUpdate }: TableCardProps) {
  const {
    isEditing,
    localValue: localTitle,
    setLocalValue: setLocalTitle,
    handleSave,
    handleCancel,
    handleKeyDown,
    startEdit,
  } = useInlineEdit(bloque.titulo, (newTitle) => onUpdate({ titulo: newTitle }));

  const sourcesCount = bloque.fuentesSeleccionadas.length;
  const columnsCount = bloque.columnas.length;

  return (
    <Card className={cn(
      "group transition-all cursor-pointer",
      isSelected
        ? "border-primary bg-primary/5 shadow-sm"
        : "hover:border-primary/40 hover:shadow-sm"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3" onClick={onSelect}>
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
          isSelected ? "bg-primary/10" : "bg-muted"
        )}>
          <Table2 className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="h-6 text-sm flex-1"
                  placeholder={`Tabla ${index + 1}`}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <h4 className="font-medium text-sm truncate flex-1">
                  {bloque.titulo || `Tabla ${index + 1}`}
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit();
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <p className="text-xs text-muted-foreground mb-2">
            Tabla - {sourcesCount} fuente{sourcesCount !== 1 ? 's' : ''} - {columnsCount} columna{columnsCount !== 1 ? 's' : ''}
          </p>

          {/* Options badges */}
          <div className="flex flex-wrap gap-1">
            {bloque.estilos?.mostrarBordes && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Bordes</Badge>
            )}
            {bloque.estilos?.alternarFilas && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Alternado</Badge>
            )}
            {bloque.estilos?.compacta && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Compacta</Badge>
            )}
            {bloque.camposCalculados && bloque.camposCalculados.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                <Calculator className="w-2.5 h-2.5 mr-1" />
                {bloque.camposCalculados.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
