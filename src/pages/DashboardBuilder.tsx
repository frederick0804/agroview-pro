import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useConfig } from "@/contexts/ConfigContext";
import {
  BarChart3, Calendar, Check, ChevronDown, ChevronRight, ChevronUp,
  Filter, FlaskConical, GripVertical, LayoutDashboard, Layers, Leaf,
  LineChart, Package, Pencil, PieChart, Plus, Save, ShoppingCart,
  Sprout, Trash2, Users,
} from "lucide-react";
import type { CampoOpcion, ModDef, ModParam } from "@/config/moduleDefinitions";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const STORAGE_KEY = "agro_dashboard_builder_layout";

type WidgetType      = "kpi" | "serie" | "distribucion";
type DateRangeKey    = "7d" | "30d" | "90d" | "ytd";
type AggregationType = "sum" | "avg" | "count" | "min" | "max";
type DashboardTab    = "resumen" | "cultivo" | "laboratorio" | "vivero" | "post-cosecha" | "recursos-humanos" | "comercial";

type WidgetDraft = {
  title: string; type: WidgetType; moduloId: string; definicionId: string;
  campoId: string; cultivoId: string; dateRange: DateRangeKey;
  aggregation: AggregationType; dashboardTab: DashboardTab;
  size: 1 | 2 | 3 | 4; rows: 1 | 2 | 3; color: string;
};
type WidgetConfig = WidgetDraft & { id: string };

const PRESET_COLORS = [
  { value: "hsl(142,45%,28%)", label: "Verde"     },
  { value: "hsl(213,70%,50%)", label: "Azul"      },
  { value: "hsl(263,70%,55%)", label: "Violeta"   },
  { value: "hsl(38,92%,50%)",  label: "Ámbar"     },
  { value: "hsl(0,72%,51%)",   label: "Rojo"      },
  { value: "hsl(187,65%,42%)", label: "Cian"      },
  { value: "hsl(328,65%,55%)", label: "Rosa"      },
  { value: "hsl(25,85%,52%)",  label: "Naranja"   },
  { value: "hsl(152,60%,40%)", label: "Esmeralda" },
  { value: "hsl(240,60%,55%)", label: "Índigo"    },
];

/** Map size → Tailwind col-span class (static strings so Tailwind keeps them) */
const COL_SPAN = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
} as const;

/** Base card height per vertical row (px). rows=1→180px, rows=2→360px, rows=3→540px */
const ROW_HEIGHT = 180;

// Only modules with an actual sidebar route (no cosecha/produccion redirects)
const MODULO_OPTIONS: Array<{ value: string; label: string; icon: React.ElementType }> = [
  { value: "laboratorio",      label: "Laboratorio",  icon: FlaskConical },
  { value: "vivero",           label: "Vivero",       icon: Sprout       },
  { value: "cultivo",          label: "Cultivo",      icon: Leaf         },
  { value: "post-cosecha",     label: "Post-cosecha", icon: Package      },
  { value: "recursos-humanos", label: "Rec. Humanos", icon: Users        },
  { value: "comercial",        label: "Comercial",    icon: ShoppingCart },
];

const DASHBOARD_TABS: Array<{ value: DashboardTab; label: string; icon: React.ElementType }> = [
  { value: "resumen",          label: "Dashboard general", icon: LayoutDashboard },
  { value: "cultivo",          label: "Cultivo",           icon: Leaf            },
  { value: "laboratorio",      label: "Laboratorio",       icon: FlaskConical    },
  { value: "vivero",           label: "Vivero",            icon: Sprout          },
  { value: "post-cosecha",     label: "Post-cosecha",      icon: Package         },
  { value: "recursos-humanos", label: "Rec. Humanos",      icon: Users           },
  { value: "comercial",        label: "Comercial",         icon: ShoppingCart    },
];

const WIDGET_TYPES: Array<{ value: WidgetType; label: string; icon: React.ElementType }> = [
  { value: "kpi",          label: "KPI",          icon: BarChart3 },
  { value: "serie",        label: "Serie",        icon: LineChart },
  { value: "distribucion", label: "Distribución", icon: PieChart  },
];

const DATE_RANGES: Array<{ value: DateRangeKey; label: string }> = [
  { value: "7d",  label: "Últimos 7 días"  },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "ytd", label: "Año a la fecha"  },
];

const AGGREGATIONS: Array<{ value: AggregationType; label: string }> = [
  { value: "sum",   label: "Suma"     },
  { value: "avg",   label: "Promedio" },
  { value: "count", label: "Conteo"   },
  { value: "min",   label: "Mínimo"   },
  { value: "max",   label: "Máximo"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function stableValue(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
  return min + (Math.abs(h) % (max - min));
}

const CHART_TT = {
  backgroundColor: "white",
  border: "1px solid hsl(142,15%,88%)",
  borderRadius: "8px",
  fontSize: "11px",
  padding: "4px 8px",
};

// ─── Etiquetas de eje X según rango de fecha ─────────────────────────────────

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun",
                   "Jul","Ago","Sep","Oct","Nov","Dic"] as const;
const DAYS_ES   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"] as const;

function buildTrendLabels(dateRange: DateRangeKey): string[] {
  const now = new Date();
  if (dateRange === "7d") {
    // 7 días hacia atrás — abreviación del día de semana
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return DAYS_ES[d.getDay()];
    });
  }
  if (dateRange === "30d") {
    // 5 semanas (suficiente para un mes)
    return Array.from({ length: 5 }, (_, i) => `Sem ${i + 1}`);
  }
  if (dateRange === "90d") {
    // últimos 3 meses completos
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (2 - i));
      return MONTHS_ES[d.getMonth()];
    });
  }
  // ytd: Ene → mes actual
  return Array.from({ length: now.getMonth() + 1 }, (_, i) => MONTHS_ES[i]);
}

// Mapa de código de agregación → label en español
const AGG_LABELS: Record<AggregationType, string> = {
  sum: "Suma", avg: "Promedio", count: "Conteo", min: "Mínimo", max: "Máximo",
};

function buildTrendData(seed: string, dateRange: DateRangeKey = "30d") {
  // Usamos "month" como key para no romper los dataKey existentes en los charts
  return buildTrendLabels(dateRange).map((month, i) => ({
    month,
    value: stableValue(`${seed}-t${i}`, 40, 240),
  }));
}

function buildCompData(seed: string, opciones?: CampoOpcion[] | null) {
  const COLORS = ["hsl(142,70%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(213,70%,50%)"];
  // Si el campo tiene opciones definidas (tipo Lista) → usarlas como segmentos reales
  const cats = opciones?.length
    ? opciones.slice(0, 4).map((o) => o.label)
    : ["Cat A", "Cat B", "Cat C"];
  return cats.map((name, i) => ({
    name,
    value: stableValue(`${seed}-c${i}`, 15, 55),
    color: COLORS[i % COLORS.length],
  }));
}

function formatSavedAt(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function getFieldLabel(field: ModParam) {
  return field.etiqueta_personalizada?.trim() || field.nombre;
}

function buildDefaultTitle(def: ModDef | null, campo: ModParam | null) {
  if (!def || !campo) return "Widget";
  return `${def.nombre} - ${getFieldLabel(campo)}`;
}

// ─── StepDot ──────────────────────────────────────────────────────────────────

function StepDot({ num, done, active }: { num: number; done: boolean; active: boolean }) {
  return (
    <div className={cn(
      "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-all",
      done   ? "bg-primary text-primary-foreground"                 :
      active ? "bg-primary/15 text-primary ring-1 ring-primary/40" :
               "bg-muted text-muted-foreground",
    )}>
      {done ? <Check className="w-3 h-3" /> : num}
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
      {text}
    </span>
  );
}

// ─── WidgetPreview (mini chart inside a card) ─────────────────────────────────

function WidgetPreview({
  type, seed, aggregation, color = "hsl(142,45%,28%)", rows = 1,
  dateRange = "30d", campoLabel = "", opciones,
}: {
  type: WidgetType; label: string; seed: string; aggregation: AggregationType;
  color?: string; rows?: 1 | 2 | 3;
  dateRange?: DateRangeKey;
  campoLabel?: string;
  opciones?: CampoOpcion[] | null;
}) {
  const trendData  = buildTrendData(seed, dateRange);
  const compData   = buildCompData(seed, opciones);
  const latest     = trendData[trendData.length - 1].value;
  const prev       = trendData[trendData.length - 2]?.value ?? latest;
  const trend      = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0;
  const gradId     = `grad-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 20)}`;
  const compTotal  = compData.reduce((s, d) => s + d.value, 0) || 1;
  const kpiChartH  = 56  + (rows - 1) * 68;
  const mainChartH = 88  + (rows - 1) * 110;
  const donutSize  = Math.min(mainChartH, 88 + (rows - 1) * 60);
  // Label corto para tooltips: usa el nombre del campo o fallback genérico
  const metricName = campoLabel || "Valor";

  if (type === "kpi") return (
    <div className="space-y-1">
      <p className="text-2xl font-bold text-foreground">{latest.toLocaleString("es-EC")}</p>
      <p className={cn("text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-rose-500")}>
        {trend >= 0 ? `+${trend}%` : `${trend}%`} vs periodo anterior
      </p>
      {/* Subtítulo: nombre del campo + tipo de agregación */}
      <p className="text-[10px] text-muted-foreground">
        {campoLabel ? `${campoLabel} · ` : ""}{AGG_LABELS[aggregation] ?? aggregation}
      </p>
      <ResponsiveContainer width="100%" height={kpiChartH}>
        <AreaChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
            fill={`url(#${gradId})`} dot={false} />
          <Tooltip contentStyle={CHART_TT} formatter={(v) => [v, metricName]} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (type === "serie") return (
    <ResponsiveContainer width="100%" height={mainChartH}>
      <BarChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="28%">
        <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} opacity={0.85} />
        {/* Tooltip muestra el nombre del campo como etiqueta de la serie */}
        <Tooltip contentStyle={CHART_TT} formatter={(v) => [v, metricName]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // distribución → donut + leyenda con nombres reales del campo
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={donutSize} height={donutSize}>
        <RechartsPieChart>
          <Pie data={compData} dataKey="value"
            innerRadius={Math.round(donutSize * 0.27)} outerRadius={Math.round(donutSize * 0.45)}
            paddingAngle={3} strokeWidth={0}>
            {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={CHART_TT} formatter={(v, name) => [v, name]} />
        </RechartsPieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground">
        {compData.map((d, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.name}: {Math.round((d.value / compTotal) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── WidgetCard — canvas card for a configured widget ─────────────────────────

/**
 * WidgetCard — looks identical to the real dashboard's MiniWidgetPreview.
 * Editing affordances (drag grip, delete, resize handle) are overlaid on hover.
 */
function WidgetCard({
  widget,
  cultivoOpts,
  activeDefs,
  parametros,
  isDragging,
  isDragOver,
  isResizing,
  isRowResizing,
  onDelete,
  onEdit,
  onResizeStart,
  onRowResizeStart,
}: {
  widget: WidgetConfig;
  cultivoOpts: { id: string; nombre: string }[];
  activeDefs: ModDef[];
  parametros: ModParam[];
  isDragging: boolean;
  isDragOver: boolean;
  isResizing: boolean;
  isRowResizing: boolean;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onRowResizeStart: (e: React.MouseEvent, id: string) => void;
}) {
  const def        = activeDefs.find((d) => d.id === widget.definicionId) ?? null;
  const campo      = parametros.find((p) => p.id === widget.campoId) ?? null;
  const modOpt     = MODULO_OPTIONS.find((m) => m.value === widget.moduloId);
  const label      = widget.title || buildDefaultTitle(def, campo);
  const seed       = `${widget.definicionId}-${widget.campoId}-${widget.type}`;
  const modLabel   = modOpt?.label ?? widget.moduloId;
  const dateLbl    = DATE_RANGES.find((r) => r.value === widget.dateRange)?.label ?? widget.dateRange;
  const cultivoLbl = cultivoOpts.find((c) => c.id === widget.cultivoId)?.nombre;
  // Etiqueta del campo (para tooltip y subtítulo del KPI)
  const campoLabel  = campo ? (campo.etiqueta_personalizada?.trim() || campo.nombre) : "";
  // Opciones del campo (para distribución — tipo Lista)
  const campoOpciones = campo?.opciones ?? null;

  return (
    <div className={cn(
      /* ── identical look to MiniWidgetPreview ── */
      "group relative rounded-xl border bg-card p-4 h-full overflow-visible",
      "transition-all duration-150 select-none",
      /* drag / drop / resize states */
      isDragging ? "opacity-30 scale-[0.97] border-primary/30 shadow-none" : "border-border",
      isDragOver ? "ring-2 ring-primary/60 ring-offset-2 shadow-lg" : "hover:shadow-sm",
      (isResizing || isRowResizing) ? "ring-2 ring-primary/40 ring-offset-1" : "",
    )}>

      {/* ── Drag handle hint (absolute, top center) ─── */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-40 pointer-events-none transition-opacity z-10">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* ── Title row (matches MiniWidgetPreview) ───── */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate leading-tight">{label}</p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
            {modLabel}
          </span>
          {/* Edit — only visible on hover */}
          <button
            type="button"
            onClick={() => onEdit()}
            onMouseDown={(e) => e.stopPropagation()}
            title="Editar widget"
            className="p-0.5 rounded text-muted-foreground/30 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {/* Delete — only visible on hover */}
          <button
            type="button"
            onClick={() => onDelete(widget.id)}
            onMouseDown={(e) => e.stopPropagation()}
            title="Eliminar widget"
            className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Chart (same WidgetPreview → AreaChart / BarChart / PieChart) ── */}
      <div className="mt-1.5 overflow-hidden">
        <WidgetPreview
          type={widget.type}
          label={label}
          seed={seed}
          aggregation={widget.aggregation}
          color={widget.color}
          rows={widget.rows ?? 1}
          dateRange={widget.dateRange}
          campoLabel={campoLabel}
          opciones={campoOpciones}
        />
      </div>

      {/* ── Footer meta ─────────────────────────────── */}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {dateLbl}
        {cultivoLbl && cultivoLbl !== "Todos" ? ` · ${cultivoLbl}` : ""}
      </p>

      {/* ── Right-edge resize handle (horizontal) ──── */}
      <div
        onMouseDown={(e) => onResizeStart(e, widget.id)}
        title="Arrastra para cambiar el ancho"
        className={cn(
          "absolute -right-1.5 top-4 bottom-4 w-3 flex items-center justify-center z-20",
          "cursor-col-resize rounded-full transition-opacity",
          isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <span className={cn(
          "w-1 h-8 rounded-full transition-all",
          isResizing ? "bg-primary w-1.5 h-10" : "bg-primary/40 group-hover:bg-primary/60",
        )} />
      </div>

      {/* ── Bottom-edge resize handle (vertical) ───── */}
      <div
        onMouseDown={(e) => onRowResizeStart(e, widget.id)}
        title="Arrastra para cambiar la altura"
        className={cn(
          "absolute -bottom-1.5 left-4 right-4 h-3 flex items-center justify-center z-20",
          "cursor-row-resize rounded-full transition-opacity",
          isRowResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <span className={cn(
          "h-1 w-8 rounded-full transition-all",
          isRowResizing ? "bg-primary h-1.5 w-10" : "bg-primary/40 group-hover:bg-primary/60",
        )} />
      </div>
    </div>
  );
}

// ─── AddWidgetCard — dashed placeholder that opens the sheet ─────────────────

function AddWidgetCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl",
        "border-2 border-dashed border-border/50 bg-transparent",
        "min-h-[200px] w-full transition-all",
        "hover:border-primary/50 hover:bg-primary/3 group",
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Agregar widget
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Módulo → Formulario → Campo
        </p>
      </div>
    </button>
  );
}

// ─── DashboardBuilderContent ──────────────────────────────────────────────────

export function DashboardBuilderContent() {
  const { definiciones, parametros, cultivos } = useConfig();

  const activeDefs = useMemo(
    () => definiciones.filter((d) => d.estado !== "archivado"),
    [definiciones],
  );

  const availableModulos = useMemo(() => {
    const set = new Set(activeDefs.map((d) => d.modulo));
    return MODULO_OPTIONS.filter((m) => set.has(m.value));
  }, [activeDefs]);

  // ── Widget list + persistence ──────────────────────────────────────────────
  const [widgets, setWidgets]   = useState<WidgetConfig[]>([]);
  const [savedAt, setSavedAt]   = useState<string | null>(null);
  const [layoutTab, setLayoutTab] = useState<DashboardTab>("resumen");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const p = JSON.parse(raw) as WidgetConfig[]; if (Array.isArray(p)) setWidgets(p); }
    } catch { /* ignore */ }
  }, []);

  // ── Sheet (add-widget form) state ─────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draft, setDraft] = useState<WidgetDraft>({
    title: "", type: "kpi", moduloId: "", definicionId: "",
    campoId: "", cultivoId: "all", dateRange: "30d",
    aggregation: "sum", dashboardTab: "resumen", size: 2, rows: 1,
    color: PRESET_COLORS[0].value,
  });

  // Auto-select first module
  useEffect(() => {
    if (availableModulos.length > 0)
      setDraft((p) => p.moduloId ? p : { ...p, moduloId: availableModulos[0].value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModulos]);

  const defsForModulo = useMemo(
    () => activeDefs.filter((d) => d.modulo === draft.moduloId),
    [activeDefs, draft.moduloId],
  );

  useEffect(() => {
    setDraft((p) => {
      if (defsForModulo.some((d) => d.id === p.definicionId)) return p;
      return { ...p, definicionId: defsForModulo[0]?.id ?? "", campoId: "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defsForModulo]);

  const camposForDef = useMemo(
    () => parametros.filter((c) => c.definicion_id === draft.definicionId),
    [parametros, draft.definicionId],
  );

  useEffect(() => {
    setDraft((p) => {
      if (camposForDef.some((c) => c.id === p.campoId)) return p;
      const first = camposForDef[0]?.id ?? "";
      if (p.campoId === first) return p;
      return { ...p, campoId: first };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camposForDef]);

  const selectedDef   = defsForModulo.find((d) => d.id === draft.definicionId) ?? null;
  const selectedCampo = camposForDef.find((c) => c.id === draft.campoId) ?? null;
  const draftTitle    = draft.title.trim() || buildDefaultTitle(selectedDef, selectedCampo);
  const canAdd        = Boolean(draft.moduloId && draft.definicionId && draft.campoId);
  const cultivoOpts   = useMemo(() => [{ id: "all", nombre: "Todos" }, ...cultivos], [cultivos]);

  const s1 = Boolean(draft.moduloId);
  const s2 = Boolean(draft.definicionId);
  const s3 = Boolean(draft.campoId);

  // ── Edit existing widget ──────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (widget: WidgetConfig) => {
    setEditingId(widget.id);
    setShowAdvanced(true); // open advanced so user can review all settings
    setDraft({
      title:        widget.title,
      type:         widget.type,
      moduloId:     widget.moduloId,
      definicionId: widget.definicionId,
      campoId:      widget.campoId,
      cultivoId:    widget.cultivoId,
      dateRange:    widget.dateRange,
      aggregation:  widget.aggregation,
      dashboardTab: widget.dashboardTab,
      size:         widget.size  ?? 2,
      rows:         widget.rows  ?? 1,
      color:        widget.color ?? PRESET_COLORS[0].value,
    });
    setSheetOpen(true);
  };

  const saveWidget = () => {
    if (!canAdd) return;
    if (editingId) {
      // Update existing widget in place
      setWidgets((p) =>
        p.map((w) => w.id === editingId ? { id: editingId, ...draft, title: draftTitle } : w),
      );
    } else {
      // Create new widget
      setWidgets((p) => [...p, { id: createId("widget"), ...draft, title: draftTitle }]);
    }
    setEditingId(null);
    setSheetOpen(false);
    setDraft((p) => ({ ...p, title: "" }));
  };

  const removeWidget = (id: string) => setWidgets((p) => p.filter((w) => w.id !== id));

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    setWidgets((prev) => {
      const from = prev.findIndex((w) => w.id === dragId);
      const to   = prev.findIndex((w) => w.id === targetId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setDragId(null);
    setDragOverId(null);
  };

  // ── Drag-to-resize state (right-edge → width) ────────────────────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<{
    id: string; startX: number; startSize: number;
  } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    setResizing({ id, startX: e.clientX, startSize: widget.size ?? 2 });
  };

  useEffect(() => {
    if (!resizing) return;
    const { id, startX, startSize } = resizing;

    const onMove = (e: MouseEvent) => {
      const canvasW = canvasRef.current?.offsetWidth ?? 1200;
      const colW    = canvasW / 4;
      const delta   = e.clientX - startX;
      const snap    = Math.round(delta / colW);
      const newSize = Math.max(1, Math.min(4, startSize + snap)) as 1 | 2 | 3 | 4;
      setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, size: newSize } : w));
    };
    const onUp = () => setResizing(null);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  // ── Drag-to-resize state (bottom-edge → height/rows) ─────────────────────
  const [rowResizing, setRowResizing] = useState<{
    id: string; startY: number; startRows: number;
  } | null>(null);

  const handleRowResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    setRowResizing({ id, startY: e.clientY, startRows: widget.rows ?? 1 });
  };

  useEffect(() => {
    if (!rowResizing) return;
    const { id, startY, startRows } = rowResizing;

    const onMove = (e: MouseEvent) => {
      const delta   = e.clientY - startY;
      const snap    = Math.round(delta / ROW_HEIGHT);
      const newRows = Math.max(1, Math.min(3, startRows + snap)) as 1 | 2 | 3;
      setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, rows: newRows } : w));
    };
    const onUp = () => setRowResizing(null);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [rowResizing]);

  const saveLayout = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    setSavedAt(formatSavedAt(new Date()));
  };

  // Filtered widgets + counts for the tab strip
  const visibleWidgets = useMemo(
    () => widgets.filter((w) => w.dashboardTab === layoutTab),
    [widgets, layoutTab],
  );

  const countByTab = useMemo(() => {
    const map: Partial<Record<DashboardTab, number>> = {};
    for (const w of widgets) map[w.dashboardTab] = (map[w.dashboardTab] ?? 0) + 1;
    return map;
  }, [widgets]);

  const activeTabInfo  = DASHBOARD_TABS.find((t) => t.value === layoutTab);
  const ActiveTabIcon  = activeTabInfo?.icon ?? LayoutDashboard;

  return (
    <div className="space-y-0">

      {/* ── Edit-mode bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-1 py-2.5 border-b border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/30 rounded-t-lg mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Modo edición — arrastra para reordenar · borde derecho = ancho · borde inferior = alto · lápiz = editar
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setEditingId(null); setDraft((p) => ({ ...p, title: "", dashboardTab: layoutTab })); setSheetOpen(true); }}
            className="gap-1.5 h-7 text-xs"
          >
            <Plus className="w-3 h-3" /> Agregar widget
          </Button>
          <Button
            type="button"
            onClick={saveLayout}
            disabled={widgets.length === 0}
            size="sm"
            className="gap-1.5 h-7 text-xs"
          >
            <Save className="w-3 h-3" />
            Guardar
            {savedAt && <span className="opacity-60 hidden md:inline">· {savedAt}</span>}
          </Button>
        </div>
      </div>

      {/* ── Dashboard tab strip (mirrors the real dashboard) ─────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50 mb-5">
        {DASHBOARD_TABS.map(({ value, label, icon: Icon }) => {
          const count = countByTab[value] ?? 0;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLayoutTab(value)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium transition-all shrink-0 border-b-2 -mb-px",
                layoutTab === value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                  layoutTab === value
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Canvas for the selected tab ───────────────────────────────────── */}
      {widgets.length === 0 ? (

        /* No widgets at all */
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-24 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
            <LayoutDashboard className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Sin widgets todavía</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Conecta tus formularios activos al dashboard creando tu primer widget.
            </p>
          </div>
          <Button type="button" onClick={() => setSheetOpen(true)} className="gap-2 mt-1">
            <Plus className="w-4 h-4" /> Agregar primer widget
          </Button>
        </div>

      ) : (

        /* Widget canvas */
        <>

          <div
            ref={canvasRef}
            className={cn(
              "grid grid-cols-4 gap-4 auto-rows-auto",
              resizing    ? "cursor-col-resize select-none" : "",
              rowResizing ? "cursor-row-resize select-none" : "",
            )}
          >
            {visibleWidgets.map((widget) => (
              <div
                key={widget.id}
                draggable={!resizing && !rowResizing}
                onDragStart={() => setDragId(widget.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(widget.id); }}
                onDragLeave={() => setDragOverId((p) => p === widget.id ? null : p)}
                onDrop={(e) => handleDrop(e, widget.id)}
                style={{ height: `${(widget.rows ?? 1) * ROW_HEIGHT}px` }}
                className={cn(
                  "min-w-0 transition-all duration-150",
                  COL_SPAN[widget.size ?? 2],
                  !resizing && !rowResizing && "cursor-grab active:cursor-grabbing",
                )}
              >
                <WidgetCard
                  widget={widget}
                  cultivoOpts={cultivoOpts}
                  activeDefs={activeDefs}
                  parametros={parametros}
                  isDragging={dragId === widget.id}
                  isDragOver={dragOverId === widget.id}
                  isResizing={resizing?.id === widget.id}
                  isRowResizing={rowResizing?.id === widget.id}
                  onDelete={removeWidget}
                  onEdit={() => startEdit(widget)}
                  onResizeStart={handleResizeStart}
                  onRowResizeStart={handleRowResizeStart}
                />
              </div>
            ))}

            {/* Empty tab: no widgets for this tab yet */}
            {visibleWidgets.length === 0 && (
              <div className="col-span-4 rounded-2xl border border-dashed border-border/50 bg-muted/10 py-12 flex flex-col items-center gap-3 text-center">
                <ActiveTabIcon className="w-8 h-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Sin widgets en "{activeTabInfo?.label ?? layoutTab}"
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Agrega un widget y elige esta pestaña en "Mostrar en".
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft((p) => ({ ...p, dashboardTab: layoutTab }));
                    setSheetOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar widget aquí
                </Button>
              </div>
            )}

            {/* Add-widget card — always last in the grid */}
            <div className="col-span-1 min-h-[180px]">
              <AddWidgetCard onClick={() => {
                setDraft((p) => ({ ...p, dashboardTab: layoutTab }));
                setSheetOpen(true);
              }} />
            </div>
          </div>
        </>

      )}

      {/* ── Sheet: add-widget form ─────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) { setEditingId(null); setDraft((p) => ({ ...p, title: "" })); }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] flex flex-col p-0 gap-0">

          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              {editingId
                ? <><Pencil className="w-4 h-4 text-primary" /> Editar widget</>
                : <><Plus   className="w-4 h-4 text-primary" /> Nuevo widget</>
              }
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Step 1 — Módulo */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <StepDot num={1} done={s1} active={!s1} />
                <FieldLabel text="Módulo" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {availableModulos.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, moduloId: value, definicionId: "", campoId: "" }))}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all text-left",
                      draft.moduloId === value
                        ? "border-primary bg-primary/8 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
                {availableModulos.length === 0 && (
                  <p className="col-span-2 text-xs text-muted-foreground italic py-2">Sin formularios activos.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground/30">
              <div className="flex-1 h-px bg-border/60" />
              <ChevronRight className="w-3 h-3" />
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* Step 2 — Formulario */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StepDot num={2} done={s2} active={s1 && !s2} />
                <FieldLabel text="Formulario" />
              </div>
              <Select
                value={draft.definicionId}
                onValueChange={(v) => setDraft((p) => ({ ...p, definicionId: v, campoId: "" }))}
                disabled={!draft.moduloId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={
                    !draft.moduloId            ? "Elige un módulo primero"            :
                    defsForModulo.length === 0 ? "Sin formularios en este módulo"     :
                                                "Selecciona formulario"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {defsForModulo.map((def) => (
                    <SelectItem key={def.id} value={def.id}>
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{def.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">v{def.version}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 — Campo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StepDot num={3} done={s3} active={s2 && !s3} />
                <FieldLabel text="Campo" />
              </div>
              <Select
                value={draft.campoId}
                onValueChange={(v) => setDraft((p) => ({ ...p, campoId: v }))}
                disabled={!draft.definicionId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={
                    !draft.definicionId       ? "Elige un formulario primero"               :
                    camposForDef.length === 0 ? "Este formulario no tiene campos"           :
                                                "Selecciona campo"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {camposForDef.map((campo) => (
                    <SelectItem key={campo.id} value={campo.id}>
                      <span>{getFieldLabel(campo)}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{campo.tipo_dato}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/60" />

            {/* Tipo de visualización */}
            <div className="space-y-2">
              <FieldLabel text="Tipo de visualización" />
              <div className="grid grid-cols-3 gap-2">
                {WIDGET_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, type: value }))}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                      draft.type === value
                        ? "border-primary bg-primary/8 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mostrar en */}
            <div className="space-y-2">
              <FieldLabel text="Mostrar en" />
              <div className="flex flex-wrap gap-1.5">
                {DASHBOARD_TABS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, dashboardTab: value }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                      draft.dashboardTab === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <Icon className="w-3 h-3 shrink-0" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones avanzadas (collapsible) */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <span>Opciones avanzadas</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showAdvanced && (
                <div className="px-3.5 pb-3.5 pt-3 space-y-3 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel text="Rango" />
                      <Select value={draft.dateRange} onValueChange={(v) => setDraft((p) => ({ ...p, dateRange: v as DateRangeKey }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DATE_RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel text="Cultivo" />
                      <Select value={draft.cultivoId} onValueChange={(v) => setDraft((p) => ({ ...p, cultivoId: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {cultivoOpts.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel text="Agregación" />
                    <Select value={draft.aggregation} onValueChange={(v) => setDraft((p) => ({ ...p, aggregation: v as AggregationType }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGGREGATIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel text="Título personalizado" />
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder={draftTitle || "Título automático"}
                      className="w-full h-8 rounded-md border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Color del gráfico */}
            <div className="space-y-2.5">
              <FieldLabel text="Color del gráfico" />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() => setDraft((p) => ({ ...p, color: value }))}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                      draft.color === value
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent hover:border-muted-foreground/40",
                    )}
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>
            </div>

            {/* Mini preview */}
            {canAdd && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Vista previa</p>
                  <Badge variant="secondary" className="text-[10px] uppercase">{draft.type}</Badge>
                </div>
                <WidgetPreview
                  type={draft.type}
                  label={draftTitle}
                  seed={`${draft.definicionId}-${draft.campoId}-${draft.type}`}
                  aggregation={draft.aggregation}
                  color={draft.color}
                  dateRange={draft.dateRange}
                  campoLabel={selectedCampo
                    ? (selectedCampo.etiqueta_personalizada?.trim() || selectedCampo.nombre)
                    : ""}
                  opciones={selectedCampo?.opciones ?? null}
                />
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t border-border/60 bg-background shrink-0">
            <Button
              type="button"
              onClick={saveWidget}
              disabled={!canAdd}
              className="w-full gap-2"
            >
              {editingId
                ? <><Check className="w-4 h-4" /> Actualizar widget</>
                : <><Plus  className="w-4 h-4" /> Agregar widget</>
              }
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Standalone route wrapper ─────────────────────────────────────────────────

export default function DashboardBuilder() {
  return (
    <MainLayout>
      <PageHeader
        title="Dashboard Builder"
        description="Configura widgets dinámicos por empresa usando formularios activos."
      />
      <DashboardBuilderContent />
    </MainLayout>
  );
}
