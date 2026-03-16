// ─── Informe Builder — Editor visual con soporte de múltiples bloques ─────────
// Permite agregar múltiples gráficos y tablas al mismo informe con live preview.

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
}

interface FuenteInfo {
  id: string;
  label: string;
  campos: CampoInfo[];
}

export interface PlantillaConfig {
  encabezado: {
    mostrarEmpresa: boolean;
    mostrarFecha: boolean;
    textoPersonalizado: string;
  };
  columnas: string[];
  incluirNotas: boolean;
  incluirConclusiones: boolean;
  incluirFirma: boolean;
  piePagina: string;
}

export interface GraficoBloque {
  id: string;
  tipo: "grafico";
  titulo: string;
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  dimension: string;
  metricas: string[];
  tipoGrafico: TipoGrafico;
  apilado: boolean;
  mostrarLeyenda: boolean;
  mostrarGrid: boolean;
  mostrarTooltip: boolean;
}

export interface TablaBloque {
  id: string;
  tipo: "tabla";
  titulo: string;
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  columnas: string[];
}

export type ReporteBloque = GraficoBloque | TablaBloque;

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

// ─── Datos de fuentes disponibles ────────────────────────────────────────────

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

// ─── Paletas de color ─────────────────────────────────────────────────────────

const PALETAS = [
  { id: "ocean",      nombre: "Océano",     colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"] },
  { id: "nature",     nombre: "Naturaleza", colors: ["#16a34a", "#84cc16", "#14b8a6", "#f59e0b", "#6366f1"] },
  { id: "sunset",     nombre: "Atardecer",  colors: ["#f97316", "#ec4899", "#a855f7", "#6366f1", "#3b82f6"] },
  { id: "earth",      nombre: "Tierra",     colors: ["#92400e", "#b45309", "#d97706", "#65a30d", "#15803d"] },
  { id: "agroworkin", nombre: "Agroworkin", colors: ["#22c55e", "#15803d", "#86efac", "#4ade80", "#166534"] },
  { id: "mono",       nombre: "Gris",       colors: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1"] },
];

// ─── Tipos de gráfico ─────────────────────────────────────────────────────────

const TIPOS_GRAFICO: { id: TipoGrafico; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "bar_v",    label: "Barras",    icon: BarChart2,          desc: "Vertical" },
  { id: "bar_h",    label: "Barras H",  icon: BarChartHorizontal, desc: "Horizontal" },
  { id: "line",     label: "Líneas",    icon: TrendingUp,         desc: "Tendencias" },
  { id: "area",     label: "Áreas",     icon: Waves,              desc: "Acumulado" },
  { id: "pie",      label: "Circular",  icon: PieIcon,            desc: "Proporciones" },
  { id: "radar",    label: "Radar",     icon: RadarIcon,          desc: "Multi-eje" },
  { id: "composed", label: "Compuesto", icon: Layers,             desc: "Barra+Línea" },
];

// ─── Mock data helpers ────────────────────────────────────────────────────────

function stableVal(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
  return min + Math.abs(h) % (max - min);
}

const DIM_VALUES: Record<string, string[]> = {
  semana:     ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"],
  mes:        ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
  fecha:      ["01/03", "05/03", "10/03", "15/03", "20/03", "25/03", "30/03"],
  fecha_ingreso: ["01/03", "05/03", "10/03", "15/03", "20/03", "25/03", "30/03"],
  semanas:    ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"],
  variedad:   ["Biloxi", "O'Neal", "Festival", "Camarosa", "Emerald"],
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

// ─── Helper factories ─────────────────────────────────────────────────────────

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

// ─── Section accordion component ─────────────────────────────────────────────

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

// ─── LiveChart (accepts direct props, no BuilderConfig) ───────────────────────

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
}

function LiveChart({
  tipo, apilado, mostrarLeyenda, mostrarGrid, mostrarTooltip,
  data, metricas, colors, uid,
}: LiveChartProps) {
  if (data.length === 0 || metricas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40">
        <BarChart2 className="w-10 h-10" />
        <p className="text-xs text-center">Selecciona fuentes y métricas</p>
      </div>
    );
  }

  const commonProps = { data, margin: { top: 8, right: 16, left: 0, bottom: 4 } };
  const axisStyle = { fontSize: 10, fill: "#6b7280" };
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
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
            <Radar key={m} name={LABEL_MAP[m] ?? m} dataKey={m}
              stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} />
          ))}
          {mostrarTooltip && <Tooltip />}
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {metricas.map((m, i) => (
            <Bar key={m} dataKey={m} name={LABEL_MAP[m] ?? m} fill={colors[i % colors.length]}
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {metricas.map((m, i) => (
            <Bar key={m} dataKey={m} name={LABEL_MAP[m] ?? m} fill={colors[i % colors.length]}
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {metricas.map((m, i) => (
            <Line key={m} type={curveType} dataKey={m} name={LABEL_MAP[m] ?? m}
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {metricas.map((m, i) => (
            <Area key={m} type={curveType} dataKey={m} name={LABEL_MAP[m] ?? m}
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
          {mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {barMetric && (
            <Bar yAxisId="left" dataKey={barMetric} name={LABEL_MAP[barMetric] ?? barMetric}
              fill={colors[0]} radius={[3, 3, 0, 0]} />
          )}
          {lineMetrics.map((m, i) => (
            <Line key={m} yAxisId="right" type={curveType} dataKey={m} name={LABEL_MAP[m] ?? m}
              stroke={colors[(i + 1) % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ─── GraficoBloqueView — chart preview for a single GraficoBloque ─────────────

function GraficoBloqueView({ bloque, colors }: { bloque: GraficoBloque; colors: string[] }) {
  const allFuentes = useMemo(() => Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes), []);

  const camposDisponibles = useMemo(() => {
    const selected = allFuentes.filter((f) => bloque.fuentesSeleccionadas.includes(f.id));
    const all = selected.flatMap((f) => f.campos);
    const seen = new Set<string>();
    return all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  }, [bloque.fuentesSeleccionadas, allFuentes]);

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
    />
  );
}

// ─── TablaBloqueView — table preview for a single TablaBloque ─────────────────

function TablaBloqueView({ bloque, colors }: { bloque: TablaBloque; colors: string[] }) {
  const allFuentes = useMemo(() => Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes), []);

  const camposDisponibles = useMemo(() => {
    const selected = allFuentes.filter((f) => bloque.fuentesSeleccionadas.includes(f.id));
    const all = selected.flatMap((f) => f.campos);
    const seen = new Set<string>();
    return all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  }, [bloque.fuentesSeleccionadas, allFuentes]);

  const cols = useMemo(() => {
    if (bloque.columnas.length > 0) {
      return bloque.columnas.filter((id) => camposDisponibles.some((c) => c.id === id));
    }
    return camposDisponibles.slice(0, 4).map((c) => c.id);
  }, [bloque.columnas, camposDisponibles]);

  const mockRows = useMemo(() => {
    if (cols.length === 0) return [];
    const dimCols = cols.filter((id) => camposDisponibles.find((c) => c.id === id)?.tipo === "dimension");
    const dimForRows = dimCols[0] || "semana";
    const labels = (DIM_VALUES[dimForRows] ?? ["Item 1","Item 2","Item 3","Item 4","Item 5","Item 6"]).slice(0, 6);
    return labels.map((rowLabel) => {
      const row: Record<string, string | number> = {};
      for (const id of cols) {
        const campo = camposDisponibles.find((c) => c.id === id);
        if (!campo) continue;
        if (campo.tipo === "dimension") {
          if (id === dimForRows) row[id] = rowLabel;
          else {
            const opts = DIM_VALUES[id] ?? ["—"];
            row[id] = opts[Math.abs(stableVal(rowLabel + id, 0, opts.length)) % opts.length];
          }
        } else {
          const [lo, hi] = METRIC_RANGES[id] ?? [100, 1000];
          let val = stableVal(`${rowLabel}-${id}`, lo, hi);
          if (id === "ph") val = +(val / 10).toFixed(1);
          else if (id === "conductividad_electrica") val = +(val / 10).toFixed(2);
          row[id] = val;
        }
      }
      return row;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols.join(","), camposDisponibles]);

  if (cols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/40">
        <Table2 className="w-10 h-10" />
        <p className="text-xs text-center">Selecciona fuentes y columnas</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {cols.map((id, i) => (
              <th
                key={id}
                className="px-3 py-2 text-left font-semibold bg-muted/50 border-b border-border whitespace-nowrap"
                style={i > 0 ? { color: colors[i % colors.length] } : {}}
              >
                {LABEL_MAP[id] ?? id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockRows.map((row, ri) => (
            <tr key={ri} className={cn("border-b border-border/50", ri % 2 !== 0 && "bg-muted/20")}>
              {cols.map((id) => (
                <td key={id} className="px-3 py-1.5 text-foreground whitespace-nowrap">
                  {typeof row[id] === "number"
                    ? (row[id] as number).toLocaleString("es-CL")
                    : (row[id] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FuenteSelector — shared module/fuente picker for block editor ────────────

interface FuenteSelectorProps {
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  onModuloChange: (m: string) => void;
  onFuenteToggle: (id: string) => void;
}
function FuenteSelector({ moduloActivo, fuentesSeleccionadas, onModuloChange, onFuenteToggle }: FuenteSelectorProps) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(MODULOS_FUENTES).map(([modulo, { icon: MIcon, color }]) => (
          <button
            key={modulo}
            onClick={() => onModuloChange(modulo)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border transition-all",
              moduloActivo === modulo
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40",
            )}
          >
            <MIcon className={cn("w-3 h-3", moduloActivo === modulo ? "" : color)} />
            {modulo}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        {(MODULOS_FUENTES[moduloActivo]?.fuentes ?? []).map((fuente) => {
          const isOn = fuentesSeleccionadas.includes(fuente.id);
          return (
            <button
              key={fuente.id}
              onClick={() => onFuenteToggle(fuente.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                isOn ? "bg-primary/5 border-primary/40 shadow-sm" : "border-border hover:border-primary/20 hover:bg-muted/30",
              )}
            >
              <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0", isOn ? "bg-primary" : "border border-muted-foreground/30")}>
                {isOn && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{fuente.label}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{fuente.id}</p>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">{fuente.campos.length} campos</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InformesBuilder({ informe, existingConfig, onClose, onSave }: InformesBuilderProps) {
  const [openSection, setOpenSection] = useState<number>(1);
  const [selectedBloqueId, setSelectedBloqueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      encabezado: { mostrarEmpresa: true, mostrarFecha: true, textoPersonalizado: "" },
      columnas: [],
      incluirNotas: false,
      incluirConclusiones: false,
      incluirFirma: false,
      piePagina: "",
    },
  };

  const [config, setConfig] = useState<BuilderConfig>(() =>
    existingConfig ? migrateConfig(existingConfig) : defaultConfig,
  );

  const upd = useCallback(<K extends keyof BuilderConfig>(key: K, val: BuilderConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updBloque = useCallback((id: string, updates: Partial<GraficoBloque> | Partial<TablaBloque>) => {
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
        if (b.id !== bloqueId) return b;
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

  const toggleColumnaBloque = useCallback((bloqueId: string, columnaId: string) => {
    setConfig((prev) => ({
      ...prev,
      bloques: prev.bloques.map((b) => {
        if (b.id !== bloqueId || b.tipo !== "tabla") return b;
        const tb = b as TablaBloque;
        const has = tb.columnas.includes(columnaId);
        return { ...tb, columnas: has ? tb.columnas.filter((c) => c !== columnaId) : [...tb.columnas, columnaId] } as ReporteBloque;
      }),
    }));
  }, []);

  const addGrafico = useCallback(() => {
    const num = config.bloques.filter((b) => b.tipo === "grafico").length + 1;
    const bloque = createDefaultGrafico(num);
    setConfig((prev) => ({ ...prev, bloques: [...prev.bloques, bloque] }));
    setSelectedBloqueId(bloque.id);
    setOpenSection(2);
  }, [config.bloques]);

  const addTabla = useCallback(() => {
    const num = config.bloques.filter((b) => b.tipo === "tabla").length + 1;
    const bloque = createDefaultTabla(num);
    setConfig((prev) => ({ ...prev, bloques: [...prev.bloques, bloque] }));
    setSelectedBloqueId(bloque.id);
    setOpenSection(2);
  }, [config.bloques]);

  const removeBloque = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, bloques: prev.bloques.filter((b) => b.id !== id) }));
    setSelectedBloqueId((prev) => (prev === id ? null : prev));
  }, []);

  const paleta = PALETAS.find((p) => p.id === config.paletaId) ?? PALETAS[0];

  // Derived state for the selected block's editor
  const selectedBloque = config.bloques.find((b) => b.id === selectedBloqueId) ?? null;

  const selectedCampos = useMemo(() => {
    if (!selectedBloque) return [];
    const allFuentes = Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes);
    const selected = allFuentes.filter((f) => selectedBloque.fuentesSeleccionadas.includes(f.id));
    const all = selected.flatMap((f) => f.campos);
    const seen = new Set<string>();
    return all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  }, [selectedBloque]);

  const selectedDimensiones = selectedCampos.filter((c) => c.tipo === "dimension");
  const selectedMetricsDisp = selectedCampos.filter((c) => c.tipo === "metrica");
  const selectedGrafico = selectedBloque?.tipo === "grafico" ? selectedBloque as GraficoBloque : null;
  const selectedTabla = selectedBloque?.tipo === "tabla" ? selectedBloque as TablaBloque : null;

  const updPlantilla = <K extends keyof PlantillaConfig>(key: K, val: PlantillaConfig[K]) => {
    setConfig((prev) => ({
      ...prev,
      plantilla: { ...(prev.plantilla as PlantillaConfig), [key]: val },
    }));
  };

  const updEncabezado = <K extends keyof PlantillaConfig["encabezado"]>(key: K, val: PlantillaConfig["encabezado"][K]) => {
    setConfig((prev) => ({
      ...prev,
      plantilla: {
        ...(prev.plantilla as PlantillaConfig),
        encabezado: { ...(prev.plantilla as PlantillaConfig).encabezado, [key]: val },
      },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      onSave(config);
      setTimeout(() => setSaved(false), 3000);
    }, 900);
  };

  const bloqueCount = config.bloques.length;
  const grafCount = config.bloques.filter((b) => b.tipo === "grafico").length;
  const tablaCount = config.bloques.filter((b) => b.tipo === "tabla").length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
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

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Config panel ──────────────────────────────────────────── */}
        <div className="w-[440px] shrink-0 border-r border-border overflow-y-auto bg-muted/20">
          <div className="p-4 space-y-3">

            {/* 1 — General */}
            <Section
              num={1} title="General" icon={Type}
              open={openSection === 1} onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nombre del informe</Label>
                <Input value={config.nombre} onChange={(e) => upd("nombre", e.target.value)}
                  placeholder="Ej. Rendimiento de Cosecha por Semana" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descripción</Label>
                <Textarea value={config.descripcion} onChange={(e) => upd("descripcion", e.target.value)}
                  placeholder="Describe qué muestra este informe…" rows={2} className="text-sm resize-none" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["laboratorio", "vivero", "siembra", "cosecha", "poscosecha", "general"] as const).map((cat) => (
                    <button key={cat} onClick={() => upd("categoria", cat)}
                      className={cn(
                        "text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize transition-all",
                        config.categoria === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* 2 — Bloques del informe */}
            <Section
              num={2} title="Bloques del informe" icon={Layers}
              open={openSection === 2} onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
              badge={bloqueCount > 0 ? `${bloqueCount} bloque${bloqueCount !== 1 ? "s" : ""}` : undefined}
            >
              {/* Block list */}
              {config.bloques.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Agrega gráficos o tablas para construir tu informe.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {config.bloques.map((bloque, idx) => {
                    const isSelected = selectedBloqueId === bloque.id;
                    const isGrafico = bloque.tipo === "grafico";
                    const gb = bloque as GraficoBloque;
                    return (
                      <div key={bloque.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/30",
                        )}
                        onClick={() => setSelectedBloqueId(isSelected ? null : bloque.id)}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-[10px] text-muted-foreground shrink-0">#{idx + 1}</span>
                        {isGrafico ? (
                          <BarChart2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Table2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        )}
                        <span className="text-xs font-semibold flex-1 truncate">
                          {bloque.titulo || (isGrafico ? "Gráfico sin título" : "Tabla sin título")}
                        </span>
                        {isGrafico && (
                          <span className="text-[9px] text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                            {TIPOS_GRAFICO.find((t) => t.id === gb.tipoGrafico)?.label ?? "Gráfico"}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeBloque(bloque.id); }}
                          className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 text-muted-foreground/50"
                          title="Eliminar bloque"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addGrafico}
                  className="flex-1 gap-1.5 text-xs border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400">
                  <Plus className="w-3.5 h-3.5" /> Añadir gráfico
                </Button>
                <Button variant="outline" size="sm" onClick={addTabla}
                  className="flex-1 gap-1.5 text-xs border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400">
                  <Plus className="w-3.5 h-3.5" /> Añadir tabla
                </Button>
              </div>

              {/* Inline block editor */}
              {selectedBloque && (
                <div className="mt-1 rounded-xl border border-primary/30 bg-primary/3 overflow-hidden">
                  <div className="px-3 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                    {selectedBloque.tipo === "grafico" ? (
                      <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Table2 className="w-3.5 h-3.5 text-purple-500" />
                    )}
                    <span className="text-xs font-semibold text-primary flex-1">
                      Editando: {selectedBloque.titulo || (selectedBloque.tipo === "grafico" ? "Gráfico" : "Tabla")}
                    </span>
                    <Pencil className="w-3 h-3 text-primary/60" />
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Título del bloque */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Título del bloque</Label>
                      <Input
                        value={selectedBloque.titulo}
                        onChange={(e) => updBloque(selectedBloque.id, { titulo: e.target.value })}
                        placeholder={selectedBloque.tipo === "grafico" ? "Ej. Rendimiento semanal" : "Ej. Detalle de cosecha"}
                        className="h-7 text-xs"
                      />
                    </div>

                    {/* Fuentes */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Database className="w-3 h-3" /> Fuentes de datos
                      </Label>
                      <FuenteSelector
                        moduloActivo={selectedBloque.moduloActivo}
                        fuentesSeleccionadas={selectedBloque.fuentesSeleccionadas}
                        onModuloChange={(m) => updBloque(selectedBloque.id, { moduloActivo: m })}
                        onFuenteToggle={(id) => toggleFuenteBloque(selectedBloque.id, id)}
                      />
                    </div>

                    {/* Gráfico: Dimensión y métricas */}
                    {selectedGrafico && selectedCampos.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <SlidersHorizontal className="w-3 h-3" /> Dimensión y métricas
                        </Label>
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
                              return (
                                <button key={m.id}
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
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tabla: Columnas */}
                    {selectedTabla && selectedCampos.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <AlignLeft className="w-3 h-3" /> Columnas a mostrar
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Si no seleccionas, se muestran todas las disponibles.
                        </p>
                        <div className="space-y-1">
                          {selectedCampos.map((campo) => {
                            const isOn = selectedTabla.columnas.includes(campo.id);
                            return (
                              <button key={campo.id}
                                onClick={() => toggleColumnaBloque(selectedTabla.id, campo.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all",
                                  isOn ? "bg-primary/5 border-primary/40" : "border-border hover:border-primary/20 hover:bg-muted/20",
                                )}
                              >
                                <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0", isOn ? "bg-primary" : "border border-muted-foreground/30")}>
                                  {isOn && <Check className="w-2 h-2 text-primary-foreground" />}
                                </div>
                                <span className="text-xs flex-1">{campo.label}</span>
                                <span className="text-[10px] text-muted-foreground">{campo.tipo}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Gráfico: Tipo de gráfico */}
                    {selectedGrafico && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <BarChart2 className="w-3 h-3" /> Tipo de gráfico
                        </Label>
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
                          {(
                            [
                              { key: "mostrarLeyenda" as const, label: "Mostrar leyenda" },
                              { key: "mostrarGrid" as const, label: "Mostrar grilla" },
                              { key: "mostrarTooltip" as const, label: "Mostrar tooltip" },
                            ]
                          ).map(({ key, label }) => (
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
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* 3 — Apariencia global */}
            <Section
              num={3} title="Apariencia global" icon={Palette}
              open={openSection === 3} onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Paleta de colores</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PALETAS.map((p) => (
                    <button key={p.id} onClick={() => upd("paletaId", p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                        config.paletaId === p.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30",
                      )}
                    >
                      <div className="flex gap-0.5">
                        {p.colors.slice(0, 5).map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className={cn("text-[10px] font-medium", config.paletaId === p.id ? "text-primary" : "text-muted-foreground")}>
                        {p.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título en el informe</Label>
                <Input value={config.titulo} onChange={(e) => upd("titulo", e.target.value)}
                  placeholder="Usa el nombre por defecto" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Subtítulo / período</Label>
                <Input value={config.subtitulo} onChange={(e) => upd("subtitulo", e.target.value)}
                  placeholder="Ej. Temporada 2024–2025" className="h-8 text-sm" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs text-muted-foreground cursor-pointer">Mostrar logotipo</Label>
                <Switch checked={config.mostrarLogo} onCheckedChange={(v) => upd("mostrarLogo", v)} />
              </div>
            </Section>

            {/* 4 — Plantilla de documento */}
            <Section
              num={4} title="Plantilla de documento" icon={FileEdit}
              open={openSection === 4} onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Encabezado</Label>
                <div className="space-y-2">
                  {[
                    { key: "mostrarEmpresa" as const, label: "Mostrar nombre de empresa" },
                    { key: "mostrarFecha" as const, label: "Mostrar fecha de generación" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Switch checked={config.plantilla?.encabezado[key] ?? true}
                        onCheckedChange={(v) => updEncabezado(key, v)} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Texto personalizado</Label>
                    <Input value={config.plantilla?.encabezado.textoPersonalizado ?? ""}
                      onChange={(e) => updEncabezado("textoPersonalizado", e.target.value)}
                      placeholder="Ej. Informe confidencial" className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Secciones adicionales</Label>
                <div className="space-y-2">
                  {[
                    { key: "incluirNotas" as const, label: "Incluir sección de notas" },
                    { key: "incluirConclusiones" as const, label: "Incluir conclusiones" },
                    { key: "incluirFirma" as const, label: "Incluir campo de firma" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Switch checked={config.plantilla?.[key] ?? false}
                        onCheckedChange={(v) => updPlantilla(key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pie de página</Label>
                <Input value={config.plantilla?.piePagina ?? ""}
                  onChange={(e) => updPlantilla("piePagina", e.target.value)}
                  placeholder="Ej. Documento generado por Agroworkin" className="h-8 text-sm" />
              </div>
            </Section>

          </div>
        </div>

        {/* ── Preview panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/30 overflow-hidden">
          {/* Preview header */}
          <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              {config.mostrarLogo && (
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow">
                  <Globe className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {config.titulo || config.nombre || "Nuevo informe"}
                </h2>
                {config.subtitulo && <p className="text-xs text-muted-foreground">{config.subtitulo}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {openSection === 4 ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <FileEdit className="w-2.5 h-2.5" /> Vista de plantilla
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Eye className="w-2.5 h-2.5" /> Preview en vivo
                </Badge>
              )}
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

          {openSection === 4 ? (
            /* ── Document template preview ── */
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="bg-white rounded-2xl shadow-lg border border-border/40 overflow-hidden mx-auto max-w-2xl">
                {/* Document header */}
                <div className="px-8 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {config.mostrarLogo && (
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow">
                          <Globe className="w-6 h-6 text-primary-foreground" />
                        </div>
                      )}
                      <div>
                        {config.plantilla?.encabezado.mostrarEmpresa && (
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Empresa S.A.</p>
                        )}
                        <h2 className="font-bold text-base text-gray-800 leading-tight">
                          {config.titulo || config.nombre || "Nuevo informe"}
                        </h2>
                        {config.subtitulo && <p className="text-[11px] text-gray-500">{config.subtitulo}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {config.plantilla?.encabezado.mostrarFecha && (
                        <p className="text-[10px] text-gray-400">
                          {new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                      {config.plantilla?.encabezado.textoPersonalizado && (
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                          {config.plantilla.encabezado.textoPersonalizado}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-3">
                    {paleta.colors.slice(0, 5).map((c, i) => (
                      <div key={i} className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                {/* Block placeholders in document view */}
                <div className="px-8 py-4 space-y-4">
                  {config.bloques.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center gap-2 text-gray-300">
                      <Layers className="w-10 h-10" />
                      <p className="text-xs font-medium">Sin bloques — agrega gráficos o tablas</p>
                    </div>
                  ) : (
                    config.bloques.map((bloque, i) => (
                      <div key={bloque.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {bloque.tipo === "grafico"
                            ? <BarChart2 className="w-3 h-3 text-gray-400" />
                            : <Table2 className="w-3 h-3 text-gray-400" />
                          }
                          <p className="text-[11px] font-semibold text-gray-500">
                            {bloque.titulo || (bloque.tipo === "grafico" ? `Gráfico ${i + 1}` : `Tabla ${i + 1}`)}
                          </p>
                        </div>
                        <div className="h-24 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1.5 text-gray-200">
                            {bloque.tipo === "grafico" ? (
                              <>
                                <BarChart2 className="w-8 h-8" />
                                <div className="flex gap-1.5">
                                  {paleta.colors.slice(0, 4).map((c, ci) => (
                                    <div key={ci} className="w-5 h-5 rounded-sm opacity-40" style={{ backgroundColor: c }} />
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <Table2 className="w-8 h-8" />
                                <div className="space-y-1">
                                  {[0, 1, 2].map((r) => (
                                    <div key={r} className="flex gap-1">
                                      {[0, 1, 2, 3].map((c) => (
                                        <div key={c} className="w-10 h-2 bg-gray-200 rounded" />
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Optional sections */}
                {config.plantilla?.incluirNotas && (
                  <div className="px-8 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Notas</p>
                    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-3 min-h-[40px]">
                      <p className="text-[10px] text-gray-300 italic">Espacio para notas del responsable…</p>
                    </div>
                  </div>
                )}
                {config.plantilla?.incluirConclusiones && (
                  <div className="px-8 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Conclusiones</p>
                    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-3 min-h-[40px]">
                      <p className="text-[10px] text-gray-300 italic">Espacio para conclusiones del informe…</p>
                    </div>
                  </div>
                )}
                {config.plantilla?.incluirFirma && (
                  <div className="px-8 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Firma</p>
                    <div className="flex items-end gap-8">
                      <div className="flex-1 border-b border-gray-300 pb-1">
                        <p className="text-[10px] text-gray-400 text-center">Nombre y firma</p>
                      </div>
                      <div className="flex-1 border-b border-gray-300 pb-1">
                        <p className="text-[10px] text-gray-400 text-center">Cargo</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-8 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    {config.plantilla?.piePagina || "Generado por Agroworkin"}
                  </p>
                  <p className="text-[10px] text-gray-300">Pág. 1 de 1</p>
                </div>
              </div>
            </div>
          ) : (
            /* ── Live multi-block preview ── */
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
                  return (
                    <div
                      key={bloque.id}
                      onClick={() => { setSelectedBloqueId(bloque.id); setOpenSection(2); }}
                      className={cn(
                        "bg-card border rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all",
                        isSelected ? "ring-2 ring-primary border-primary/40" : "hover:border-primary/20",
                      )}
                    >
                      {/* Block header */}
                      <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-2">
                        {bloque.tipo === "grafico" ? (
                          <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Table2 className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span className="text-xs font-semibold flex-1">
                          {bloque.titulo || (bloque.tipo === "grafico" ? `Gráfico ${idx + 1}` : `Tabla ${idx + 1}`)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {bloque.tipo === "grafico"
                            ? TIPOS_GRAFICO.find((t) => t.id === (bloque as GraficoBloque).tipoGrafico)?.label
                            : `${(bloque as TablaBloque).fuentesSeleccionadas.length} fuente${(bloque as TablaBloque).fuentesSeleccionadas.length !== 1 ? "s" : ""}`
                          }
                        </span>
                        {isSelected && (
                          <Badge variant="default" className="text-[9px] py-0 px-1.5 h-4">editando</Badge>
                        )}
                      </div>

                      {/* Block content — chart or table */}
                      <div className={cn(bloque.tipo === "grafico" ? "h-52" : "h-44", "p-4")}>
                        {bloque.tipo === "grafico" ? (
                          <GraficoBloqueView bloque={bloque as GraficoBloque} colors={paleta.colors} />
                        ) : (
                          <TablaBloqueView bloque={bloque as TablaBloque} colors={paleta.colors} />
                        )}
                      </div>

                      {/* Block footer */}
                      <div className="px-4 py-2 border-t border-border/40 flex items-center gap-2 bg-muted/20">
                        <Shuffle className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">
                          Datos simulados · Haz clic para editar este bloque
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
