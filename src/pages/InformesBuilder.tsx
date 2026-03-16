// ─── Informe Builder — Editor visual con live preview ─────────────────────────
// Permite configurar fuentes de datos, métricas, tipo de gráfico y apariencia
// con actualización en tiempo real usando Recharts.

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

export interface BuilderConfig {
  id?: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  // Data
  moduloActivo: string;
  fuentesSeleccionadas: string[];
  dimension: string;
  metricas: string[];
  // Gráfico
  tipoGrafico: TipoGrafico;
  apilado: boolean;
  // Apariencia
  paletaId: string;
  mostrarLeyenda: boolean;
  mostrarGrid: boolean;
  mostrarTooltip: boolean;
  titulo: string;
  subtitulo: string;
  mostrarLogo: boolean;
}

export interface InformesBuilderProps {
  informe?: { id: string; nombre: string; descripcion: string; categoria: string };
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
  { id: "ocean",     nombre: "Océano",      colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"] },
  { id: "nature",    nombre: "Naturaleza",  colors: ["#16a34a", "#84cc16", "#14b8a6", "#f59e0b", "#6366f1"] },
  { id: "sunset",    nombre: "Atardecer",   colors: ["#f97316", "#ec4899", "#a855f7", "#6366f1", "#3b82f6"] },
  { id: "earth",     nombre: "Tierra",      colors: ["#92400e", "#b45309", "#d97706", "#65a30d", "#15803d"] },
  { id: "agroworkin",nombre: "Agroworkin",  colors: ["#22c55e", "#15803d", "#86efac", "#4ade80", "#166534"] },
  { id: "mono",      nombre: "Gris",        colors: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1"] },
];

// ─── Tipos de gráfico ─────────────────────────────────────────────────────────

const TIPOS_GRAFICO: { id: TipoGrafico; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "bar_v",    label: "Barras",        icon: BarChart2,           desc: "Vertical" },
  { id: "bar_h",    label: "Barras H",      icon: BarChartHorizontal,  desc: "Horizontal" },
  { id: "line",     label: "Líneas",        icon: TrendingUp,          desc: "Tendencias" },
  { id: "area",     label: "Áreas",         icon: Waves,               desc: "Acumulado" },
  { id: "pie",      label: "Circular",      icon: PieIcon,             desc: "Proporciones" },
  { id: "radar",    label: "Radar",         icon: RadarIcon,           desc: "Multi-eje" },
  { id: "composed", label: "Compuesto",     icon: Layers,              desc: "Barra+Línea" },
];

// ─── Helper: datos mock estables (sin random por render) ─────────────────────

function stableVal(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
  return min + Math.abs(h) % (max - min);
}

const DIM_VALUES: Record<string, string[]> = {
  semana:    ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"],
  mes:       ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"],
  fecha:     ["01/03", "05/03", "10/03", "15/03", "20/03", "25/03", "30/03"],
  semanas:   ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"],
  variedad:  ["Biloxi", "O'Neal", "Festival", "Camarosa", "Emerald"],
  operario:  ["J. Pérez", "M. López", "R. Silva", "P. Torres", "C. Gómez"],
  sector:    ["Sector A", "Sector B", "Sector C", "Sector D"],
  camara:    ["Cámara 1", "Cámara 2", "Cámara 3", "Cámara 4"],
  categoria: ["Extra", "Primera", "Segunda", "Descarte"],
  producto:  ["Fungicida A", "Insecticida B", "Herbicida C", "Acaricida D"],
  tipo_plaga:["Botrytis", "Araña roja", "Trips", "Oídio"],
  destino:   ["USA", "Europa", "Asia", "Mercado local"],
  inspector: ["Ana G.", "Carlos M.", "Roberto S.", "María L."],
};

const METRIC_RANGES: Record<string, [number, number]> = {
  kg_cosechados:         [800, 3200],
  horas_trabajadas:      [6, 10],
  rendimiento_kg_hr:     [60, 180],
  kg_ingresados:         [1000, 5000],
  kg_despachados:        [2000, 8000],
  stock_kg:              [500, 4000],
  pallets:               [8, 40],
  brix:                  [8, 18],
  firmeza:               [3, 12],
  color_score:           [60, 100],
  ph:                    [55, 70],   // ×0.1 → 5.5 to 7.0
  conductividad_electrica:[12, 28],  // ×0.1 → 1.2 to 2.8
  temp_min:              [-20, -5],
  temp_max:              [-5, 5],
  temp_media:            [-15, -2],
  rendimiento_pct:       [65, 95],
  tasa_multiplicacion:   [3, 12],
  plantas_producidas:    [500, 4000],
  cantidad_plantas:      [200, 2000],
  calidad_score:         [70, 98],
  pct_prendimiento:      [75, 98],
  plantas_contadas:      [800, 3000],
  dosis_total:           [10, 80],
  count_aplicaciones:    [1, 8],
  hallazgos:             [0, 20],
  hallazgos_count:       [0, 15],
  severidad:             [10, 80],
  incidencia_pct:        [2, 35],
  produccion_estimada_kg:[1200, 5000],
  produccion_real_kg:    [1000, 4800],
  aprobados:             [8, 25],
  rechazados:            [0, 5],
  pct_aprobacion:        [80, 100],
  semanas:               [4, 16],
};

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
      // Special: pH y CE need decimals
      if (m === "ph") val = +(val / 10).toFixed(1);
      else if (m === "conductividad_electrica") val = +(val / 10).toFixed(2);
      else if (m === "temp_min" || m === "temp_max" || m === "temp_media") val = +(val).toFixed(1);
      row[m] = val;
    }
    return row;
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

// ─── Live Preview Chart ───────────────────────────────────────────────────────

function LiveChart({ config, data, colors }: {
  config: BuilderConfig;
  data: Record<string, string | number>[];
  colors: string[];
}) {
  const metricas = config.metricas.length > 0 ? config.metricas : ["valor"];
  const isTimeDim = ["semana", "mes", "fecha", "semanas"].includes(config.dimension);
  const curveType = isTimeDim ? "monotone" : "linear";

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 5 },
  };

  const axisStyle = { fontSize: 11, fill: "#6b7280" };
  const gridColor = "#e5e7eb";

  const labelMap: Record<string, string> = Object.fromEntries(
    Object.values(MODULOS_FUENTES)
      .flatMap(m => m.fuentes)
      .flatMap(f => f.campos)
      .map(c => [c.id, c.label])
  );

  if (data.length === 0 || metricas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40">
        <BarChart2 className="w-12 h-12" />
        <p className="text-sm">Selecciona fuentes y métricas para ver la previsualización</p>
      </div>
    );
  }

  if (config.tipoGrafico === "pie") {
    const pieData = data.map((d) => ({
      name: d.name as string,
      value: (d[metricas[0]] as number) ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius="65%"
            innerRadius="25%"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "radar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
          {metricas.map((m, i) => (
            <Radar
              key={m}
              name={labelMap[m] ?? m}
              dataKey={m}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.2}
            />
          ))}
          {config.mostrarTooltip && <Tooltip />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "bar_h") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps} layout="vertical">
          {config.mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />}
          <XAxis type="number" tick={axisStyle} />
          <YAxis dataKey="name" type="category" tick={axisStyle} width={70} />
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {metricas.map((m, i) => (
            <Bar
              key={m}
              dataKey={m}
              name={labelMap[m] ?? m}
              fill={colors[i % colors.length]}
              stackId={config.apilado ? "stack" : undefined}
              radius={[0, 3, 3, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "bar_v") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps}>
          {config.mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {metricas.map((m, i) => (
            <Bar
              key={m}
              dataKey={m}
              name={labelMap[m] ?? m}
              fill={colors[i % colors.length]}
              stackId={config.apilado ? "stack" : undefined}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...commonProps}>
          {config.mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {metricas.map((m, i) => (
            <Line
              key={m}
              type={curveType}
              dataKey={m}
              name={labelMap[m] ?? m}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...commonProps}>
          <defs>
            {metricas.map((m, i) => (
              <linearGradient key={m} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {config.mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {metricas.map((m, i) => (
            <Area
              key={m}
              type={curveType}
              dataKey={m}
              name={labelMap[m] ?? m}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              fill={`url(#grad-${i})`}
              stackId={config.apilado ? "stack" : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (config.tipoGrafico === "composed") {
    // First metric → bars, rest → lines
    const [barMetric, ...lineMetrics] = metricas;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart {...commonProps}>
          {config.mostrarGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />}
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis yAxisId="left" tick={axisStyle} />
          {lineMetrics.length > 0 && <YAxis yAxisId="right" orientation="right" tick={axisStyle} />}
          {config.mostrarTooltip && <Tooltip formatter={(v: number) => v.toLocaleString("es-CL")} />}
          {config.mostrarLeyenda && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {barMetric && (
            <Bar
              yAxisId="left"
              dataKey={barMetric}
              name={labelMap[barMetric] ?? barMetric}
              fill={colors[0]}
              radius={[3, 3, 0, 0]}
            />
          )}
          {lineMetrics.map((m, i) => (
            <Line
              key={m}
              yAxisId="right"
              type={curveType}
              dataKey={m}
              name={labelMap[m] ?? m}
              stroke={colors[(i + 1) % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InformesBuilder({ informe, onClose, onSave }: InformesBuilderProps) {
  const [openSection, setOpenSection] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaultConfig: BuilderConfig = {
    id: informe?.id,
    nombre: informe?.nombre ?? "",
    descripcion: informe?.descripcion ?? "",
    categoria: informe?.categoria ?? "general",
    moduloActivo: "Cosecha",
    fuentesSeleccionadas: ["REGISTRO_COSECHA"],
    dimension: "semana",
    metricas: ["kg_cosechados", "rendimiento_kg_hr"],
    tipoGrafico: "bar_v",
    apilado: false,
    paletaId: "ocean",
    mostrarLeyenda: true,
    mostrarGrid: true,
    mostrarTooltip: true,
    titulo: informe?.nombre ?? "Nuevo informe",
    subtitulo: "",
    mostrarLogo: true,
  };

  const [config, setConfig] = useState<BuilderConfig>(defaultConfig);

  const upd = useCallback(<K extends keyof BuilderConfig>(key: K, val: BuilderConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Derive available campos from selected fuentes
  const allFuentes = useMemo(() =>
    Object.values(MODULOS_FUENTES).flatMap((m) => m.fuentes), []);

  const camposDisponibles = useMemo(() => {
    const selected = allFuentes.filter((f) => config.fuentesSeleccionadas.includes(f.id));
    const allCampos = selected.flatMap((f) => f.campos);
    // Deduplicate by id
    const seen = new Set<string>();
    return allCampos.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  }, [config.fuentesSeleccionadas, allFuentes]);

  const dimensiones = camposDisponibles.filter((c) => c.tipo === "dimension");
  const metricsDisp = camposDisponibles.filter((c) => c.tipo === "metrica");

  // Auto-select first valid dimension if current one is not available
  const effectiveDimension = useMemo(() => {
    if (!config.dimension || dimensiones.find((d) => d.id === config.dimension)) return config.dimension;
    return dimensiones[0]?.id ?? "";
  }, [config.dimension, dimensiones]);

  const effectiveMetricas = useMemo(() => {
    const valid = new Set(metricsDisp.map((m) => m.id));
    return config.metricas.filter((m) => valid.has(m));
  }, [config.metricas, metricsDisp]);

  // Mock data for preview
  const mockData = useMemo(
    () => generateMockData(
      effectiveMetricas.length > 0 ? effectiveMetricas : metricsDisp.slice(0, 2).map(m => m.id),
      effectiveDimension || "semana",
    ),
    [effectiveMetricas, effectiveDimension, metricsDisp],
  );

  const paleta = PALETAS.find((p) => p.id === config.paletaId) ?? PALETAS[0];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      onSave({ ...config, dimension: effectiveDimension, metricas: effectiveMetricas });
      setTimeout(() => setSaved(false), 3000);
    }, 900);
  };

  const toggleFuente = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      fuentesSeleccionadas: prev.fuentesSeleccionadas.includes(id)
        ? prev.fuentesSeleccionadas.filter((f) => f !== id)
        : [...prev.fuentesSeleccionadas, id],
    }));
  };

  const toggleMetrica = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      metricas: prev.metricas.includes(id)
        ? prev.metricas.filter((m) => m !== id)
        : [...prev.metricas, id],
    }));
  };

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
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
          <Eye className="w-3 h-3" /> Vista previa en vivo
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
        {/* Config panel */}
        <div className="w-[420px] shrink-0 border-r border-border overflow-y-auto bg-muted/20">
          <div className="p-4 space-y-3">

            {/* 1 — General */}
            <Section
              num={1} title="General" icon={Type}
              open={openSection === 1} onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nombre del informe</Label>
                <Input
                  value={config.nombre}
                  onChange={(e) => upd("nombre", e.target.value)}
                  placeholder="Ej. Rendimiento de Cosecha por Semana"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descripción</Label>
                <Textarea
                  value={config.descripcion}
                  onChange={(e) => upd("descripcion", e.target.value)}
                  placeholder="Describe qué muestra este informe…"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["laboratorio", "vivero", "siembra", "cosecha", "poscosecha", "general"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => upd("categoria", cat)}
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

            {/* 2 — Fuentes */}
            <Section
              num={2} title="Fuentes de datos" icon={Database}
              open={openSection === 2} onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
              badge={config.fuentesSeleccionadas.length > 0 ? `${config.fuentesSeleccionadas.length} sel.` : undefined}
            >
              {/* Module tabs */}
              <div className="flex flex-wrap gap-1.5 pb-2">
                {Object.entries(MODULOS_FUENTES).map(([modulo, { icon: MIcon, color }]) => (
                  <button
                    key={modulo}
                    onClick={() => upd("moduloActivo", modulo)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                      config.moduloActivo === modulo
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40",
                    )}
                  >
                    <MIcon className={cn("w-3 h-3", config.moduloActivo === modulo ? "" : color)} />
                    {modulo}
                  </button>
                ))}
              </div>

              {/* REGISTRO checkboxes for active module */}
              <div className="space-y-1.5">
                {(MODULOS_FUENTES[config.moduloActivo]?.fuentes ?? []).map((fuente) => {
                  const isOn = config.fuentesSeleccionadas.includes(fuente.id);
                  return (
                    <button
                      key={fuente.id}
                      onClick={() => toggleFuente(fuente.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all",
                        isOn
                          ? "bg-primary/5 border-primary/40 shadow-sm"
                          : "border-border hover:border-primary/20 hover:bg-muted/30",
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all",
                        isOn ? "bg-primary" : "border border-muted-foreground/30",
                      )}>
                        {isOn && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{fuente.label}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{fuente.id}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {fuente.campos.length} campos
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 3 — Dimensiones & Métricas */}
            <Section
              num={3} title="Dimensión y métricas" icon={SlidersHorizontal}
              open={openSection === 3} onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
              badge={effectiveMetricas.length > 0 ? `${effectiveMetricas.length} métr.` : undefined}
            >
              {camposDisponibles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Selecciona al menos una fuente de datos primero.
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Eje X / Agrupación</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {dimensiones.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => upd("dimension", d.id)}
                          className={cn(
                            "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                            (config.dimension === d.id || effectiveDimension === d.id)
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30",
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <Label className="text-xs text-muted-foreground">
                      Métricas (Eje Y)
                      <span className="ml-1 text-muted-foreground/60">— selecciona una o más</span>
                    </Label>
                    <div className="space-y-1.5">
                      {metricsDisp.map((m) => {
                        const isOn = config.metricas.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleMetrica(m.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                              isOn
                                ? "bg-primary/5 border-primary/40"
                                : "border-border hover:border-primary/20 hover:bg-muted/20",
                            )}
                          >
                            <div className={cn(
                              "w-3.5 h-3.5 rounded flex items-center justify-center shrink-0",
                              isOn ? "bg-primary" : "border border-muted-foreground/30",
                            )}>
                              {isOn && <Check className="w-2 h-2 text-primary-foreground" />}
                            </div>
                            <span className="text-xs flex-1">{m.label}</span>
                            {m.unidad && (
                              <span className="text-[10px] text-muted-foreground font-mono">{m.unidad}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </Section>

            {/* 4 — Tipo de gráfico */}
            <Section
              num={4} title="Tipo de gráfico" icon={BarChart2}
              open={openSection === 4} onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
            >
              <div className="grid grid-cols-4 gap-2">
                {TIPOS_GRAFICO.map((t) => {
                  const TIcon = t.icon;
                  const active = config.tipoGrafico === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => upd("tipoGrafico", t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all",
                        active
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/40",
                      )}
                    >
                      <TIcon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-[10px] font-semibold text-center leading-tight", active ? "text-primary" : "text-muted-foreground")}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Opciones extra */}
              {(config.tipoGrafico === "bar_v" || config.tipoGrafico === "bar_h" || config.tipoGrafico === "area") && (
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs text-muted-foreground">Barras apiladas</Label>
                  <Switch checked={config.apilado} onCheckedChange={(v) => upd("apilado", v)} />
                </div>
              )}
            </Section>

            {/* 5 — Apariencia */}
            <Section
              num={5} title="Apariencia" icon={Palette}
              open={openSection === 5} onToggle={() => setOpenSection(openSection === 5 ? 0 : 5)}
            >
              {/* Paletas */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Paleta de colores</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PALETAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => upd("paletaId", p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                        config.paletaId === p.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30",
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

              {/* Título en preview */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título en el informe</Label>
                <Input
                  value={config.titulo}
                  onChange={(e) => upd("titulo", e.target.value)}
                  placeholder="Usa el nombre por defecto"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Subtítulo / período</Label>
                <Input
                  value={config.subtitulo}
                  onChange={(e) => upd("subtitulo", e.target.value)}
                  placeholder="Ej. Temporada 2024–2025"
                  className="h-8 text-sm"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                {[
                  { key: "mostrarLogo" as const, label: "Mostrar logotipo" },
                  { key: "mostrarLeyenda" as const, label: "Mostrar leyenda" },
                  { key: "mostrarGrid" as const, label: "Mostrar grilla" },
                  { key: "mostrarTooltip" as const, label: "Mostrar tooltip" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer">{label}</Label>
                    <Switch
                      checked={config[key] as boolean}
                      onCheckedChange={(v) => upd(key, v)}
                    />
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </div>

        {/* ── Preview panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/30 overflow-hidden">
          {/* Preview header bar */}
          <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
              {/* Fake informe header */}
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
                  {config.subtitulo && (
                    <p className="text-xs text-muted-foreground">{config.subtitulo}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Eye className="w-2.5 h-2.5" /> Preview en vivo
              </Badge>
              {config.fuentesSeleccionadas.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {config.fuentesSeleccionadas.length} fuente{config.fuentesSeleccionadas.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Color accent line */}
          <div className="flex px-6 gap-1 mb-3">
            {paleta.colors.map((c, i) => (
              <div
                key={i}
                className="h-1 rounded-full flex-1 transition-colors duration-300"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Meta info row */}
          {(config.fuentesSeleccionadas.length > 0 || effectiveMetricas.length > 0) && (
            <div className="px-6 mb-4 flex flex-wrap gap-2">
              {config.fuentesSeleccionadas.map((id) => {
                const f = allFuentes.find(f => f.id === id);
                return f ? (
                  <span key={id} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-muted-foreground">
                    <Database className="w-2.5 h-2.5" /> {id}
                  </span>
                ) : null;
              })}
              {effectiveMetricas.map((m) => {
                const campo = camposDisponibles.find(c => c.id === m);
                return (
                  <span key={m} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/5 border border-primary/20 text-primary font-medium">
                    {campo?.label ?? m}
                    {campo?.unidad && <span className="opacity-60">({campo.unidad})</span>}
                  </span>
                );
              })}
            </div>
          )}

          {/* Chart area */}
          <div className="flex-1 mx-6 mb-6 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 p-6">
              <LiveChart
                config={{ ...config, dimension: effectiveDimension, metricas: effectiveMetricas }}
                data={mockData}
                colors={paleta.colors}
              />
            </div>
            {/* Chart footer */}
            <div className="px-6 py-3 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Shuffle className="w-3 h-3" />
                <span>Datos simulados · Los valores reales se cargarán al generar el informe</span>
              </div>
              <div className="flex items-center gap-2">
                {TIPOS_GRAFICO.find(t => t.id === config.tipoGrafico) && (() => {
                  const t = TIPOS_GRAFICO.find(t => t.id === config.tipoGrafico)!;
                  const TIcon = t.icon;
                  return (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <TIcon className="w-3 h-3" /> {t.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
