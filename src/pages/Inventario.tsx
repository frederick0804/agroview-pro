/**
 * Inventario.tsx  — rediseñado
 *
 * Layout: métricas + panel filtros lateral + cards/lista de productos.
 * Detalle abre en Sheet lateral (sin perder contexto).
 * Catálogo (CRUD admin) en Sheet separado.
 */

import { useState, useMemo, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { MetricCard }  from "@/components/dashboard/MetricCard";
import { ModalMovimiento }   from "@/components/dashboard/ModalMovimiento";
import { ProveedorCombobox } from "@/components/ui/proveedor-combobox";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useInventario, getStockStatus, getStockPct,
  getCampoVencimiento,
  type InvCatalogo, type InvMovimientoTipo, type InvMovimiento,
  type InvCampoConValor, type InvCampoTipo, type AlertaVencimiento,
} from "@/contexts/InventarioContext";
import { useRole } from "@/contexts/RoleContext";
import {
  Package, AlertTriangle, DollarSign, TrendingUp,
  ArrowDown, ArrowUp, SlidersHorizontal,
  Plus, Pencil, Power, LayoutList, LayoutGrid,
  FlaskConical, Sprout, Leaf, PackageOpen, ShoppingCart,
  ExternalLink, Info, ChevronRight, X, Zap, Settings2,
  History, Filter, Download, CalendarClock,
  ClipboardCheck, BookOpen, AlertCircle as AlertCircleIcon,
} from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { useConfig }   from "@/contexts/ConfigContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio", vivero: "Vivero",
  cultivo: "Cultivo", "post-cosecha": "Post-cosecha", comercial: "Comercial",
};
const MODULE_ICON_CLS: Record<string, string> = {
  laboratorio: "text-violet-400", vivero: "text-emerald-400",
  cultivo: "text-green-400", "post-cosecha": "text-orange-400", comercial: "text-pink-400",
};
const MODULE_ICONS: Record<string, React.ReactNode> = {
  laboratorio: <FlaskConical className="w-3 h-3" />, vivero: <Sprout className="w-3 h-3" />,
  cultivo: <Leaf className="w-3 h-3" />, "post-cosecha": <PackageOpen className="w-3 h-3" />,
  comercial: <ShoppingCart className="w-3 h-3" />,
};
const STATUS_BORDER: Record<string, string> = {
  ok: "border-l-green-500", bajo: "border-l-amber-500", critico: "border-l-red-500",
};
const MODULOS_OPCIONES = [
  { value: "laboratorio", label: "Laboratorio" }, { value: "vivero", label: "Vivero" },
  { value: "cultivo", label: "Cultivo" }, { value: "post-cosecha", label: "Post-cosecha" },
  { value: "comercial", label: "Comercial" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (n: number, dec = 0) =>
  n.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtCurrency = (n: number) =>
  `$${n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function StockBar({ p, className }: { p: InvCatalogo; className?: string }) {
  const status = getStockStatus(p);
  const pct    = getStockPct(p);
  const colors = { ok: "bg-green-500", bajo: "bg-amber-500", critico: "bg-red-500" };
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", colors[status])} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockBadge({ status }: { status: ReturnType<typeof getStockStatus> }) {
  const cfg = {
    ok:      { label: "OK",      cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    bajo:    { label: "Bajo",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    critico: { label: "Crítico", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  };
  const { label, cls } = cfg[status];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{label}</span>;
}

function MovBadge({ tipo }: { tipo: InvMovimientoTipo }) {
  const cfg: Record<InvMovimientoTipo, { label: string; cls: string; icon: React.ReactNode }> = {
    entrada: { label: "Entrada", icon: <ArrowDown className="w-3 h-3" />, cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    salida:  { label: "Salida",  icon: <ArrowUp   className="w-3 h-3" />, cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"   },
    ajuste:  { label: "Ajuste",  icon: <SlidersHorizontal className="w-3 h-3" />, cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  };
  const { label, cls, icon } = cfg[tipo];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{icon}{label}</span>;
}

function ModuloBadge({ moduloId, size = "sm" }: { moduloId: string; size?: "sm" | "xs" }) {
  const iconCls = MODULE_ICON_CLS[moduloId] ?? "text-sky-400";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border border-border bg-muted font-medium text-muted-foreground",
      size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
    )}>
      <span className={iconCls}>{MODULE_ICONS[moduloId]}</span>
      {MODULE_LABELS[moduloId] ?? moduloId}
    </span>
  );
}

/** Renderiza badges para un producto con múltiples áreas */
function ModuloBadges({ ids, size = "sm" }: { ids: string[]; size?: "sm" | "xs" }) {
  const visible = ids.slice(0, 2);
  const extra   = ids.length - visible.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {visible.map(id => <ModuloBadge key={id} moduloId={id} size={size} />)}
      {extra > 0 && (
        <span className={cn(
          "rounded-full border border-border bg-muted font-medium text-muted-foreground",
          size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
        )}>
          +{extra}
        </span>
      )}
    </span>
  );
}

// ─── OrigenCell ───────────────────────────────────────────────────────────────

// Mapa estático módulo → ruta (cubre todos los módulos operativos)
const MODULO_RUTA: Record<string, string> = {
  laboratorio:      "/laboratorio",
  vivero:           "/vivero",
  cultivo:          "/cultivo",
  cosecha:          "/cultivo",        // cosecha comparte página con cultivo
  "post-cosecha":   "/post-cosecha",
  produccion:       "/post-cosecha",   // producción comparte con post-cosecha
  "recursos-humanos": "/recursos-humanos",
  comercial:        "/comercial",
};

function OrigenCell({ m }: { m: InvMovimiento }) {
  const navigate    = useNavigate();
  const { definiciones } = useConfig();   // ← dinámico desde ConfigContext
  const origen      = m.registro_origen_tipo;
  if (!origen) return <span className="text-xs text-muted-foreground">{m.observaciones ?? "—"}</span>;

  // Buscar el ModDef que tiene ese nombre exacto → obtener su módulo dinámicamente
  const def        = definiciones.find(d => d.nombre === origen);
  const moduloRuta = def ? (MODULO_RUTA[def.modulo] ?? null) : null;
  const destino    = moduloRuta ? `${moduloRuta}?form=${encodeURIComponent(origen)}` : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium hover:bg-muted transition-colors">
          <Info className="h-2.5 w-2.5 text-muted-foreground" /> {origen}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3 text-xs" side="left">
        <p className="font-semibold text-sm">Origen del movimiento</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formulario</span>
            <span className="font-mono font-medium">{origen}</span>
          </div>
          {def && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Módulo</span>
              <span className="capitalize">{def.modulo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{m.created_at.substring(0, 10)}</span>
          </div>
          {m.observaciones && (
            <div className="border-t border-border pt-1">
              <span className="text-muted-foreground">Notas: </span>{m.observaciones}
            </div>
          )}
        </div>
        {destino && (
          <button
            onClick={() => navigate(destino)}
            className="flex w-full items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>
              Ir al formulario <strong>{origen}</strong>
            </span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  p, onSelect, onMovimiento, onKardex,
}: {
  p: InvCatalogo;
  onSelect: (id: string) => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
  onKardex: (id: string) => void;
}) {
  const status = getStockStatus(p);
  const pct    = getStockPct(p);

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card border-l-4 transition-shadow hover:shadow-md cursor-pointer",
        STATUS_BORDER[status],
      )}
      onClick={() => onSelect(p.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0 pr-2">
          <p className="font-semibold text-sm leading-tight line-clamp-2">{p.nombre}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <span className="font-mono">{p.codigo}</span>
            {p.categoria && <> · {p.categoria}</>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ModuloBadges ids={p.modulo_ids} size="xs" />
          <StockBadge status={status} />
        </div>
      </div>

      {/* Stock bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% del máximo</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            mín {fmtNum(p.cantidad_minima)}
          </span>
        </div>
        <StockBar p={p} />
        <p className="mt-1.5 text-right text-sm font-bold">
          {fmtNum(p.cantidad_actual, 1)}{" "}
          <span className="text-xs font-normal text-muted-foreground">{p.unidad_medida}</span>
        </p>
      </div>

      {/* Actions */}
      <div
        className="mt-auto flex items-center gap-1 border-t border-border bg-muted/20 px-3 py-2"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="flex-1 rounded-md bg-green-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-700 transition-colors"
          onClick={() => onMovimiento(p.id, "entrada")}
        >
          + Entrada
        </button>
        <button
          className="flex-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors"
          onClick={() => onMovimiento(p.id, "salida")}
        >
          − Salida
        </button>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={() => onSelect(p.id)}
        >
          Detalle <ChevronRight className="h-3 w-3" />
        </button>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={() => onKardex(p.id)}
          title="Balance de stock"
        >
          <BookOpen className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  productos,
  filterModulo, setFilterModulo,
  filterEstado, setFilterEstado,
  onReponer,
}: {
  productos: InvCatalogo[];
  filterModulo: string;
  setFilterModulo: (v: string) => void;
  filterEstado: string;
  setFilterEstado: (v: string) => void;
  onReponer: (id: string) => void;
}) {
  const { getAllProductos, getAlertasVencimiento } = useInventario();
  const allProductos    = getAllProductos();
  const alertas         = allProductos.filter(p => getStockStatus(p) !== "ok");
  const alertasVenc     = getAlertasVencimiento();

  const moduloCount = useMemo(() => {
    const counts: Record<string, number> = {};
    allProductos.forEach(p => { p.modulo_ids.forEach(m => { counts[m] = (counts[m] ?? 0) + 1; }); });
    return counts;
  }, [allProductos]);

  const estadoCounts = useMemo(() => ({
    all:     allProductos.length,
    ok:      allProductos.filter(p => getStockStatus(p) === "ok").length,
    bajo:    allProductos.filter(p => getStockStatus(p) === "bajo").length,
    critico: allProductos.filter(p => getStockStatus(p) === "critico").length,
  }), [allProductos]);

  const moduloOptions = [
    { value: "all", label: "Todos los módulos", count: allProductos.length },
    ...MODULOS_OPCIONES.map(m => ({ ...m, count: moduloCount[m.value] ?? 0 }))
      .filter(m => m.count > 0),
  ];
  const estadoOptions = [
    { value: "all",      label: "Todos",    count: estadoCounts.all,    dot: "" },
    { value: "ok",       label: "OK",       count: estadoCounts.ok,     dot: "bg-green-500" },
    { value: "bajo",     label: "Bajo",     count: estadoCounts.bajo,   dot: "bg-amber-500" },
    { value: "critico",  label: "Crítico",  count: estadoCounts.critico, dot: "bg-red-500" },
  ];

  return (
    <aside className="space-y-5">
      {/* Área de uso */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Área de uso</p>
        <div className="space-y-0.5">
          {moduloOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setFilterModulo(o.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                filterModulo === o.value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5">
                {o.value !== "all" && <span className={MODULE_ICON_CLS[o.value]}>{MODULE_ICONS[o.value]}</span>}
                {o.label}
              </span>
              <span className="text-[10px] opacity-60">{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estado</p>
        <div className="space-y-0.5">
          {estadoOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setFilterEstado(o.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                filterEstado === o.value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5">
                {o.dot && <span className={cn("h-2 w-2 rounded-full", o.dot)} />}
                {o.label}
              </span>
              <span className={cn("text-[10px]", o.count > 0 && o.value !== "all" && o.value !== "ok" ? "font-semibold text-amber-600 dark:text-amber-400" : "opacity-60")}>
                {o.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reglas — compacto en sidebar */}
      <ReglasBanner variant="sidebar" />

      {/* Alert mini-list */}
      {alertas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800/40 dark:bg-amber-900/10">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {alertas.length} alerta{alertas.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-2">
            {alertas.map(p => (
              <div key={p.id} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate max-w-[130px]">{p.nombre}</span>
                  <span className={cn("rounded-full px-1.5 py-0 text-[10px] font-medium",
                    getStockStatus(p) === "critico"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  )}>
                    {getStockStatus(p) === "critico" ? "Crítico" : "Bajo"}
                  </span>
                </div>
                <StockBar p={p} className="mt-1 h-1" />
                <button
                  className="mt-1 text-[10px] text-green-700 hover:underline dark:text-green-400"
                  onClick={() => onReponer(p.id)}
                >
                  Reponer →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de vencimiento */}
      {alertasVenc.length > 0 && (
        <VencimientoPanel alertas={alertasVenc} />
      )}
    </aside>
  );
}

// ─── VencimientoPanel ─────────────────────────────────────────────────────────

function VencimientoPanel({ alertas }: { alertas: AlertaVencimiento[] }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const vencidos  = alertas.filter(a => a.estado === "vencido");
  const criticos  = alertas.filter(a => a.estado === "critico");

  const ESTADO_CLS: Record<string, string> = {
    vencido: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    critico: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    proximo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  const ESTADO_LABEL: Record<string, string> = {
    vencido: "Vencido",
    critico: "Vence pronto",
    proximo: "Por vencer",
  };

  function diasLabel(d: number): string {
    if (d < 0)  return `Venció hace ${Math.abs(d)} día${Math.abs(d) !== 1 ? "s" : ""}`;
    if (d === 0) return "Vence hoy";
    return `Vence en ${d} día${d !== 1 ? "s" : ""}`;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50/40 dark:border-red-800/40 dark:bg-red-900/10">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-red-100/40 dark:hover:bg-red-900/20 transition-colors"
      >
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-red-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-800 dark:text-red-300">
            Vencimientos
          </p>
          <p className="text-[10px] text-red-700/70 dark:text-red-400/70">
            {vencidos.length > 0 && `${vencidos.length} vencido${vencidos.length !== 1 ? "s" : ""}`}
            {vencidos.length > 0 && criticos.length > 0 && " · "}
            {criticos.length > 0 && `${criticos.length} crítico${criticos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-red-200 px-1.5 py-0 text-[10px] font-bold text-red-800 dark:bg-red-800/60 dark:text-red-300">
          {alertas.length}
        </span>
      </button>

      {!collapsed && (
        <div className="divide-y divide-red-200/40 dark:divide-red-800/30 border-t border-red-200/60 dark:border-red-800/40">
          {alertas.map(a => (
            <div
              key={a.producto.id}
              className="cursor-pointer px-3 py-2.5 hover:bg-red-100/30 dark:hover:bg-red-900/20"
              onClick={() => navigate(`/inventario`)}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-medium leading-tight truncate">{a.producto.nombre}</p>
                <span className={cn("shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium", ESTADO_CLS[a.estado])}>
                  {ESTADO_LABEL[a.estado]}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {diasLabel(a.diasRestantes)}
                {" · "}{new Date(a.fechaVencimiento).toLocaleDateString("es-CL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reglas banner (barra horizontal en el área de contenido) ────────────────

/** Banner compacto — se usa en el sidebar Y como barra en el contenido */
function ReglasBanner({ variant = "sidebar" }: { variant?: "sidebar" | "bar" }) {
  const navigate = useNavigate();
  const { formularioMapas } = useInventario();
  const activas = formularioMapas.filter(r => r.activo);

  if (variant === "sidebar") {
    return (
      <button
        onClick={() => navigate("/configuracion?tab=inventario")}
        className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-left transition-colors hover:bg-amber-100/60 dark:border-amber-800/40 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            Movimientos automáticos
          </p>
          <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
            {activas.length === 0
              ? "Sin reglas — haz clic para configurar"
              : `${activas.length} regla${activas.length !== 1 ? "s" : ""} activa${activas.length !== 1 ? "s" : ""} · Gestionar →`}
          </p>
        </div>
        {activas.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-200 px-1.5 py-0 text-[10px] font-bold text-amber-800 dark:bg-amber-800/60 dark:text-amber-300">
            {activas.length}
          </span>
        )}
      </button>
    );
  }

  // variant === "bar" (barra horizontal en contenido)
  const TIPO_COLORS: Record<InvMovimientoTipo, string> = {
    entrada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    salida:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    ajuste:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-900/10">
      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Movimientos automáticos</span>
      <span className="text-[11px] text-amber-700/60 dark:text-amber-400/60">— el stock se actualiza al guardar formularios</span>
      {activas.map(r => (
        <span key={r.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[11px]">
          <span className={cn("rounded px-1 py-0 text-[10px] font-medium", TIPO_COLORS[r.tipo_movimiento])}>{r.tipo_movimiento}</span>
          <span className="max-w-[110px] truncate text-muted-foreground" title={r.tabla_origen}>{r.tabla_origen}</span>
        </span>
      ))}
      <button onClick={() => navigate("/configuracion?tab=inventario")} className="ml-auto flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline dark:text-amber-400">
        <Settings2 className="h-3 w-3" /> Gestionar
      </button>
    </div>
  );
}

// ─── Detalle Sheet ────────────────────────────────────────────────────────────

function DetalleSheet({
  productId, open, onClose, onMovimiento, onKardex,
}: {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
  onKardex: (id: string) => void;
}) {
  const { catalogos, getMovimientosByProducto } = useInventario();
  const p = productId ? catalogos.find(x => x.id === productId) : null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[780px] p-0 flex flex-col" side="right">
        {!p ? null : (
          <>
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-lg">{p.nombre}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs">{p.codigo}</span>
                    <ModuloBadges ids={p.modulo_ids} />
                    <span className="rounded-full border border-border bg-muted px-2 py-0 text-[11px] text-muted-foreground">{p.categoria}</span>
                    <StockBadge status={getStockStatus(p)} />
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-5">
                {/* Metrics — 2×2 grid para no comprimir los valores */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      title: "Stock actual",
                      value: fmtNum(p.cantidad_actual, 1),
                      unit: p.unidad_medida,
                      variant: getStockStatus(p) === "ok" ? "success" : getStockStatus(p) === "bajo" ? "warning" : "default",
                    },
                    {
                      title: "Valor total",
                      value: fmtCurrency(p.cantidad_actual * p.precio_unitario),
                      unit: "",
                      variant: "info",
                    },
                    {
                      title: "Mínimo",
                      value: fmtNum(p.cantidad_minima),
                      unit: p.unidad_medida,
                      variant: "default",
                    },
                    {
                      title: "Máximo",
                      value: fmtNum(p.cantidad_maxima),
                      unit: p.unidad_medida,
                      variant: "default",
                    },
                  ].map(m => {
                    const variantCls: Record<string, string> = {
                      success: "border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-900/10",
                      warning: "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-900/10",
                      info:    "border-sky-200 bg-sky-50/60 dark:border-sky-800/40 dark:bg-sky-900/10",
                      default: "border-border bg-muted/20",
                    };
                    return (
                      <div key={m.title} className={cn("rounded-xl border p-4", variantCls[m.variant])}>
                        <p className="text-xs font-medium text-muted-foreground">{m.title}</p>
                        <p className="mt-1 text-xl font-bold leading-tight">{m.value}</p>
                        {m.unit && <p className="text-xs text-muted-foreground">{m.unit}</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Big stock bar */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>Nivel de stock</span>
                    <span>{getStockPct(p).toFixed(1)}% del máximo</span>
                  </div>
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700",
                        getStockStatus(p) === "critico" ? "bg-red-500" : getStockStatus(p) === "bajo" ? "bg-amber-500" : "bg-green-500")}
                      style={{ width: `${getStockPct(p)}%` }}
                    />
                    <div className="absolute top-0 h-full w-0.5 bg-foreground/30"
                      style={{ left: `${(p.cantidad_minima / p.cantidad_maxima) * 100}%` }}
                      title={`Mínimo: ${fmtNum(p.cantidad_minima)}`} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span><span>Mín: {fmtNum(p.cantidad_minima)}</span><span>Máx: {fmtNum(p.cantidad_maxima)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5 bg-green-600 text-white hover:bg-green-700" onClick={() => onMovimiento(p.id, "entrada")}>
                    <ArrowDown className="h-4 w-4" /> Registrar entrada
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-red-600 text-white hover:bg-red-700" onClick={() => onMovimiento(p.id, "salida")}>
                    <ArrowUp className="h-4 w-4" /> Registrar salida
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400" onClick={() => onMovimiento(p.id, "ajuste")}>
                    <SlidersHorizontal className="h-4 w-4" /> Ajuste
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={() => onKardex(p.id)}>
                    <BookOpen className="h-4 w-4" /> Balance de stock
                  </Button>
                </div>

                {/* Ficha técnica — campos propios del producto */}
                {(p.campos_extra ?? []).filter(c => c.valor).length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-primary flex items-center gap-2">
                      <Package className="h-4 w-4" /> Ficha técnica
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                      {(p.campos_extra ?? []).filter(c => c.valor).map(c => (
                        <div key={c.nombre}>
                          <p className="text-[10px] text-muted-foreground">{c.etiqueta}</p>
                          <p className="text-sm font-medium">{c.valor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movements */}
                <div>
                  <p className="mb-3 text-sm font-semibold">Historial de movimientos</p>
                  <div className="overflow-auto rounded-xl border border-border">
                    <table className="w-full min-w-[440px] text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cantidad</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Resultante</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Origen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMovimientosByProducto(p.id).length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sin movimientos</td></tr>
                        )}
                        {getMovimientosByProducto(p.id).map(m => {
                          const delta = m.cantidad_nueva - m.cantidad_anterior;
                          const esEntrada = m.tipo === "entrada" || (m.tipo === "ajuste" && delta > 0);
                          const esSalida  = m.tipo === "salida"  || (m.tipo === "ajuste" && delta < 0);
                          return (
                            <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 text-muted-foreground">{m.fecha}</td>
                              <td className="px-3 py-2"><MovBadge tipo={m.tipo} /></td>
                              <td className="px-3 py-2 text-right">
                                <span className={cn("font-semibold tabular-nums",
                                  esEntrada ? "text-green-600" : esSalida ? "text-red-600" : "text-muted-foreground")}>
                                  {esEntrada ? "+" : esSalida ? "−" : ""}
                                  {fmtNum(m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad, 1)}
                                </span>
                                <span className="ml-1 text-[10px] text-muted-foreground">{p.unidad_medida}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{fmtNum(m.cantidad_nueva, 1)}</td>
                              <td className="px-3 py-2"><OrigenCell m={m} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Helper: bloquea teclas inválidas en inputs numéricos (-, +, e, E) ────────
const blockInvalidNumKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
};

// ─── Producto Dialog (CRUD) ───────────────────────────────────────────────────

interface ProductoFormState {
  nombre: string; codigo: string; modulo_ids: string[]; categoria: string;
  cantidad_actual: string; cantidad_minima: string; cantidad_maxima: string;
  unidad_medida: string; precio_unitario: string;
  ubicacion_fisica: string; proveedor_id: string;
  campos_extra: InvCampoConValor[]; // campos propios de este producto
}
const EMPTY_FORM: ProductoFormState = {
  nombre: "", codigo: "", modulo_ids: [], categoria: "", cantidad_actual: "",
  cantidad_minima: "", cantidad_maxima: "", unidad_medida: "unidades", precio_unitario: "",
  ubicacion_fisica: "", proveedor_id: "", campos_extra: [],
};
function toFormState(p: InvCatalogo): ProductoFormState {
  return {
    nombre: p.nombre, codigo: p.codigo, modulo_ids: p.modulo_ids ?? [], categoria: p.categoria,
    cantidad_actual: String(p.cantidad_actual), cantidad_minima: String(p.cantidad_minima),
    cantidad_maxima: String(p.cantidad_maxima), unidad_medida: p.unidad_medida,
    precio_unitario: String(p.precio_unitario),
    ubicacion_fisica: p.ubicacion_fisica ?? "", proveedor_id: p.proveedor_id ?? "",
    campos_extra: p.campos_extra ?? [],
  };
}

// Tipos para el editor de campos
const TIPO_OPTIONS_CAMPO: InvCampoTipo[] = ["Texto", "Número", "Fecha", "Lista", "Sí/No"];
function toNombreCampo(etiqueta: string): string {
  return etiqueta.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "campo";
}

function ProductoDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: InvCatalogo | null }) {
  const { agregarProducto, editarProducto, proveedores, agregarProveedor } = useInventario();
  const { currentUser } = useRole();
  const [form, setForm]           = useState<ProductoFormState>(EMPTY_FORM);
  const [err,  setErr]            = useState("");
  const [paso, setPaso]           = useState(1);
  const [opcionInputs, setOpcionInputs] = useState<Record<number, string>>({});
  const set = (k: keyof ProductoFormState) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  // Campos extra CRUD
  const addCampo = () => setForm(p => ({
    ...p,
    campos_extra: [...p.campos_extra, { nombre: `campo_${p.campos_extra.length + 1}`, etiqueta: "", tipo: "Texto", valor: "", opciones: [] }],
  }));
  const removeCampo = (idx: number) => setForm(p => ({ ...p, campos_extra: p.campos_extra.filter((_, i) => i !== idx) }));
  const updateCampo = (idx: number, key: keyof InvCampoConValor, val: unknown) =>
    setForm(p => ({
      ...p,
      campos_extra: p.campos_extra.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [key]: val } as InvCampoConValor;
        if (key === "etiqueta") updated.nombre = toNombreCampo(String(val));
        if (key === "tipo" && val !== "Lista") updated.opciones = [];
        return updated;
      }),
    }));
  const addOpcion = (idx: number) => {
    const opt = (opcionInputs[idx] ?? "").trim();
    if (!opt) return;
    updateCampo(idx, "opciones", [...(form.campos_extra[idx]?.opciones ?? []), opt]);
    setOpcionInputs(p => ({ ...p, [idx]: "" }));
  };
  const removeOpcion = (idx: number, opt: string) =>
    updateCampo(idx, "opciones", (form.campos_extra[idx]?.opciones ?? []).filter(o => o !== opt));


  useMemo(() => {
    if (open) { setForm(editing ? toFormState(editing) : EMPTY_FORM); setErr(""); setPaso(1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const validarPaso1 = (): boolean => {
    if (!form.nombre.trim() || !form.codigo.trim() || form.modulo_ids.length === 0) {
      setErr("Nombre, código y al menos un área son obligatorios.");
      return false;
    }
    setErr("");
    return true;
  };

  const irAlPaso2 = () => { if (validarPaso1()) setPaso(2); };

  const toggleArea = (area: string) => {
    setForm(prev => ({
      ...prev,
      modulo_ids: prev.modulo_ids.includes(area)
        ? prev.modulo_ids.filter(a => a !== area)
        : [...prev.modulo_ids, area],
    }));
  };

  const handleSave = () => {
    if (!form.nombre.trim() || !form.codigo.trim() || form.modulo_ids.length === 0) { setErr("Nombre, código y al menos un área de uso son obligatorios."); return; }
    const cantMin = parseFloat(form.cantidad_minima), cantMax = parseFloat(form.cantidad_maxima), cantAct = parseFloat(form.cantidad_actual);
    if (isNaN(cantMin) || isNaN(cantMax) || (!editing && isNaN(cantAct))) { setErr("Ingresa cantidades numéricas válidas."); return; }
    const clienteId = currentUser?.clienteId ? String(currentUser.clienteId) : "1";
    const productorId = currentUser?.productorId ? String(currentUser.productorId) : "1";
    if (editing) {
      editarProducto(editing.id, {
        nombre: form.nombre, codigo: form.codigo, modulo_ids: form.modulo_ids,
        categoria: form.categoria, cantidad_minima: cantMin, cantidad_maxima: cantMax,
        unidad_medida: form.unidad_medida, precio_unitario: parseFloat(form.precio_unitario) || 0,
        ubicacion_fisica: form.ubicacion_fisica || undefined, proveedor_id: form.proveedor_id || undefined,
        campos_extra: form.campos_extra,
      });
    } else {
      agregarProducto({
        cliente_id: clienteId, productor_id: productorId, modulo_ids: form.modulo_ids,
        codigo: form.codigo, nombre: form.nombre, categoria: form.categoria,
        cantidad_actual: cantAct, cantidad_minima: cantMin, cantidad_maxima: cantMax,
        unidad_medida: form.unidad_medida, precio_unitario: parseFloat(form.precio_unitario) || 0,
        ubicacion_fisica: form.ubicacion_fisica || undefined, proveedor_id: form.proveedor_id || undefined,
        campos_extra: form.campos_extra, activo: true,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col sm:max-w-2xl">
        {/* ── Header con stepper ── */}
        <DialogHeader className="shrink-0 pb-0">
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2">
            {[
              { n: 1, label: "Configuración base" },
              { n: 2, label: "Campos personalizados" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                {i > 0 && <div className={cn("h-px flex-1 min-w-[2rem]", paso >= s.n ? "bg-primary" : "bg-border")} />}
                <button
                  type="button"
                  onClick={() => { if (s.n === 2 && paso === 1) validarPaso1() && setPaso(2); else if (s.n === 1) setPaso(1); }}
                  className="flex items-center gap-1.5"
                >
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    paso === s.n ? "bg-primary text-primary-foreground"
                    : paso > s.n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}>
                    {s.n}
                  </span>
                  <span className={cn("text-xs", paso === s.n ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto py-4 pr-1">

          {/* PASO 1 — Configuración base */}
          {paso === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Nombre *</Label>
                <Input value={form.nombre} onChange={e => set("nombre")(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Código *</Label>
                <Input value={form.codigo} onChange={e => set("codigo")(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Input value={form.categoria} onChange={e => set("categoria")(e.target.value)} placeholder="ej: Fungicidas" className="h-9" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">¿Dónde se usa? * <span className="font-normal text-muted-foreground">(una o más áreas)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {MODULOS_OPCIONES.map(m => {
                    const selected = form.modulo_ids.includes(m.value);
                    const iconCls  = MODULE_ICON_CLS[m.value] ?? "text-sky-400";
                    return (
                      <button key={m.value} type="button" onClick={() => toggleArea(m.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}>
                        <span className={selected ? "text-primary" : iconCls}>{MODULE_ICONS[m.value]}</span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {form.modulo_ids.length === 0 && <p className="text-[11px] text-muted-foreground">Selecciona al menos un área</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidad de medida</Label>
                <Input value={form.unidad_medida} onChange={e => set("unidad_medida")(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio unitario</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.precio_unitario}
                  onChange={e => set("precio_unitario")(e.target.value)}
                  onKeyDown={blockInvalidNumKey}
                  className="h-9" />
              </div>
              {!editing && (
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad inicial</Label>
                  <Input type="number" min="0" step="any"
                    value={form.cantidad_actual}
                    onChange={e => set("cantidad_actual")(e.target.value)}
                    onKeyDown={blockInvalidNumKey}
                    className="h-9" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Cantidad mínima</Label>
                <Input type="number" min="0" step="any"
                  value={form.cantidad_minima}
                  onChange={e => set("cantidad_minima")(e.target.value)}
                  onKeyDown={blockInvalidNumKey}
                  className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad máxima</Label>
                <Input type="number" min="0" step="any"
                  value={form.cantidad_maxima}
                  onChange={e => set("cantidad_maxima")(e.target.value)}
                  onKeyDown={blockInvalidNumKey}
                  className="h-9" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Ubicación física</Label>
                <Input value={form.ubicacion_fisica} onChange={e => set("ubicacion_fisica")(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Proveedor</Label>
                <ProveedorCombobox
                  value={form.proveedor_id}
                  onChange={v => setForm(p => ({ ...p, proveedor_id: v }))}
                  options={proveedores}
                  onAdd={nombre => { agregarProveedor(nombre); setForm(p => ({ ...p, proveedor_id: nombre })); }}
                />
              </div>
            </div>
          )}

          {/* PASO 2 — Campos personalizados */}
          {paso === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Campos de este producto</p>
                  <p className="text-[11px] text-muted-foreground">
                    Define los campos específicos — lote, vencimiento, pH, etc. Cada producto tiene los suyos.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addCampo}>
                    <Plus className="h-3.5 w-3.5" /> Agregar campo
                  </Button>
                </div>
              </div>

              {form.campos_extra.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center">
                  <p className="text-sm text-muted-foreground">Sin campos personalizados</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Haz clic en «+ Agregar campo» para comenzar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.campos_extra.map((c, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="grid grid-cols-[1fr_140px_auto] items-end gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Etiqueta (nombre visible)</Label>
                          <Input value={c.etiqueta} onChange={e => updateCampo(idx, "etiqueta", e.target.value)}
                            placeholder="ej: Nº de lote" className="h-9" />
                          {c.nombre && <p className="font-mono text-[9px] text-muted-foreground">key: {c.nombre}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Tipo de dato</Label>
                          <Select value={c.tipo} onValueChange={v => updateCampo(idx, "tipo", v as InvCampoTipo)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPO_OPTIONS_CAMPO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <button type="button" onClick={() => removeCampo(idx)}
                          className="pb-0.5 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Opciones de Lista */}
                      {c.tipo === "Lista" && (
                        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                          <Label className="text-[10px] text-muted-foreground">Opciones del desplegable</Label>
                          {(c.opciones ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {(c.opciones ?? []).map(o => (
                                <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px]">
                                  {o}
                                  <button type="button" onClick={() => removeOpcion(idx, o)}>
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input value={opcionInputs[idx] ?? ""}
                              onChange={e => setOpcionInputs(p => ({ ...p, [idx]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOpcion(idx); } }}
                              placeholder="Nueva opción… (Enter para agregar)"
                              className="h-8 text-xs flex-1" />
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => addOpcion(idx)}>
                              + Agregar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Valor actual */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor actual</Label>
                        {c.tipo === "Sí/No" ? (
                          <Select value={c.valor} onValueChange={v => updateCampo(idx, "valor", v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sí">Sí</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : c.tipo === "Lista" ? (
                          <Select value={c.valor} onValueChange={v => updateCampo(idx, "valor", v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar opción…" /></SelectTrigger>
                            <SelectContent>
                              {(c.opciones ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={c.tipo === "Número" ? "number" : c.tipo === "Fecha" ? "date" : "text"}
                            min={c.tipo === "Número" ? "0" : undefined}
                            onKeyDown={c.tipo === "Número" ? blockInvalidNumKey : undefined}
                            value={c.valor}
                            onChange={e => updateCampo(idx, "valor", e.target.value)}
                            className="h-9" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="shrink-0 gap-2 border-t border-border pt-4">
          {paso === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={irAlPaso2} className="gap-1.5">
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPaso(1)} className="gap-1.5">
                <ChevronRight className="h-4 w-4 rotate-180" /> Anterior
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gap-1.5">
                {editing ? "Guardar cambios" : "Crear producto"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catálogo inline (tab propio) ────────────────────────────────────────────

function CatalogoInline({ canAdmin, onKardex }: { canAdmin: boolean; onKardex: (id: string) => void }) {
  const { catalogos, desactivarProducto } = useInventario();
  const [search,       setSearch]       = useState("");
  const [filterModulo, setFilterModulo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingProd,  setEditingProd]  = useState<InvCatalogo | null>(null);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [page,         setPage]         = useState(1);
  const PAGE = 15;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalogos.filter(p => {
      if (filterModulo !== "all" && !p.modulo_ids.includes(filterModulo)) return false;
      if (filterStatus === "activo" && !p.activo) return false;
      if (filterStatus === "inactivo" && p.activo) return false;
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalogos, search, filterModulo, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paginated  = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="h-9 flex-1 min-w-48"
        />
        <Select value={filterModulo} onValueChange={v => { setFilterModulo(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44 bg-background"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los módulos</SelectItem>
            {MODULOS_OPCIONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{filtered.length} productos</p>
        {canAdmin && (
          <Button size="sm" className="gap-1.5 ml-auto" onClick={() => { setEditingProd(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nombre</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Área</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock</th>
                <th className="hidden px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">Precio</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Sin productos</td></tr>
              )}
              {paginated.map(p => (
                <tr key={p.id} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/20", !p.activo && "opacity-40")}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{p.nombre}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                  </td>
                  <td className="px-3 py-2.5"><ModuloBadges ids={p.modulo_ids} size="xs" /></td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-right text-xs text-muted-foreground sm:table-cell">
                    {fmtCurrency(p.precio_unitario)}
                  </td>
                  <td className="px-3 py-2.5"><StockBadge status={getStockStatus(p)} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      {canAdmin && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => { setEditingProd(p); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", p.activo ? "text-muted-foreground" : "text-green-600")} title={p.activo ? "Desactivar" : "Activar"} onClick={() => desactivarProducto(p.id)}>
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" title="Balance de stock" onClick={() => onKardex(p.id)}>
                        <BookOpen className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} productos — pág. {page}/{totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )}
      </div>

      <ProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editingProd} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Vista: Historial de movimientos ─────────────────────────────────────────

const MOV_PAGE = 20;

function MovimientosView({ onOpenDetail, onKardex }: { onOpenDetail: (id: string) => void; onKardex: (id: string) => void }) {
  const { movimientos, catalogos } = useInventario();
  const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

  const [search,      setSearch]      = useState("");
  const [filterTipo,  setFilterTipo]  = useState("all");
  const [filterProd,  setFilterProd]  = useState("all");
  const [filterOrigen,setFilterOrigen]= useState("all");
  const [page,        setPage]        = useState(1);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id));

  const productoOpts = useMemo(() =>
    catalogos.filter(c => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  [catalogos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...movimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
      .filter(m => {
        if (filterTipo  !== "all" && m.tipo   !== filterTipo)   return false;
        if (filterProd  !== "all" && m.catalogo_id !== filterProd) return false;
        if (filterOrigen === "auto"   && !m.registro_origen_tipo)  return false;
        if (filterOrigen === "manual" && !!m.registro_origen_tipo) return false;
        if (q) {
          const prod = catalogos.find(c => c.id === m.catalogo_id);
          const match = prod?.nombre.toLowerCase().includes(q) ||
                        m.registro_origen_tipo?.toLowerCase().includes(q) ||
                        m.observaciones?.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
  }, [movimientos, catalogos, filterTipo, filterProd, filterOrigen, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MOV_PAGE));
  const paginados  = filtered.slice((page - 1) * MOV_PAGE, page * MOV_PAGE);

  // ── Grupos de movimientos (estructura pre-calculada) ─────────────────────
  // Cada grupo es un array de movimientos con la misma operación (mismo origen+fecha).
  // Manuales o únicos tienen su propia clave. Se usan <tbody> por grupo para evitar
  // problemas de reconciliación React al expandir filas con fragments.

  const GROUP_BORDERS = [
    "border-l-violet-400", "border-l-sky-400", "border-l-teal-400",
    "border-l-orange-400", "border-l-pink-400", "border-l-indigo-400",
  ];
  const GROUP_BG = [
    "bg-violet-50/40 dark:bg-violet-900/10",
    "bg-sky-50/40 dark:bg-sky-900/10",
    "bg-teal-50/40 dark:bg-teal-900/10",
    "bg-orange-50/40 dark:bg-orange-900/10",
    "bg-pink-50/40 dark:bg-pink-900/10",
    "bg-indigo-50/40 dark:bg-indigo-900/10",
  ];

  type MovGroup = {
    key:        string;
    isMulti:    boolean;  // >=2 movimientos automáticos
    colorIdx:   number;
    movements:  typeof paginados;
  };

  const groups = useMemo((): MovGroup[] => {
    const keyOf = (m: typeof paginados[0]) =>
      m.registro_origen_tipo ? `${m.registro_origen_tipo}|${m.fecha}` : `manual|${m.id}`;

    const order: string[] = [];
    const map   = new Map<string, typeof paginados>();
    paginados.forEach(m => {
      const k = keyOf(m);
      if (!map.has(k)) { order.push(k); map.set(k, []); }
      map.get(k)!.push(m);
    });

    let colorIdx = 0;
    return order.map(k => {
      const movements = map.get(k)!;
      const isMulti   = !k.startsWith("manual|") && movements.length >= 2;
      return { key: k, isMulti, colorIdx: isMulti ? colorIdx++ % GROUP_BORDERS.length : 0, movements };
    });
  }, [paginados]); // eslint-disable-line react-hooks/exhaustive-deps

  const TIPO_COLORS: Record<string, string> = {
    entrada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    salida:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    ajuste:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    devolucion: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  };
  const TIPO_ICON: Record<string, React.ReactNode> = {
    entrada: <ArrowDown className="h-3 w-3" />,
    salida:  <ArrowUp   className="h-3 w-3" />,
    ajuste:  <SlidersHorizontal className="h-3 w-3" />,
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar producto, formulario, notas…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="h-9 flex-1 min-w-48"
        />
        <Select value={filterProd} onValueChange={v => { setFilterProd(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-48 bg-background"><SelectValue placeholder="Todos los productos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los productos</SelectItem>
            {productoOpts.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={v => { setFilterTipo(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="salida">Salida</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOrigen} onValueChange={v => { setFilterOrigen(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 bg-background"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="auto">Automáticos</SelectItem>
            <SelectItem value="manual">Manuales</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <p className="text-xs text-muted-foreground">
            {filtered.length} movimiento{filtered.length !== 1 ? "s" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              exportToCsv(
                filtered.map(m => {
                  const prod = catalogos.find(c => c.id === m.catalogo_id);
                  const delta = m.cantidad_nueva - m.cantidad_anterior;
                  return {
                    fecha:             m.fecha,
                    producto:          prod?.nombre ?? m.catalogo_id,
                    codigo:            prod?.codigo ?? "",
                    tipo:              m.tipo,
                    subtipo:           m.subtipo.replace(/_/g, " "),
                    cantidad:          m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad,
                    stock_anterior:    m.cantidad_anterior,
                    stock_resultante:  m.cantidad_nueva,
                    unidad:            prod?.unidad_medida ?? "",
                    origen:            m.registro_origen_tipo ?? "Manual",
                    observaciones:     m.observaciones ?? "",
                  };
                }),
                [
                  { key: "fecha",           label: "Fecha" },
                  { key: "producto",        label: "Producto" },
                  { key: "codigo",          label: "Código" },
                  { key: "tipo",            label: "Tipo" },
                  { key: "subtipo",         label: "Subtipo" },
                  { key: "cantidad",        label: "Cantidad" },
                  { key: "stock_anterior",  label: "Stock anterior" },
                  { key: "stock_resultante",label: "Stock resultante" },
                  { key: "unidad",          label: "Unidad" },
                  { key: "origen",          label: "Origen" },
                  { key: "observaciones",   label: "Observaciones" },
                ],
                `movimientos${filterTipo !== "all" ? `-${filterTipo}` : ""}${filterOrigen !== "all" ? `-${filterOrigen}` : ""}-${fecha}.csv`,
              );
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar ({filtered.length})
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Fecha</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Cantidad</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock resultante</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Subtipo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Origen</th>
              </tr>
            </thead>
            {/* Empty state */}
            <tbody>
              {paginados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                    <History className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    Sin movimientos que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>

            {/* Un <tbody> por grupo — evita bugs de reconciliación React */}
            {groups.map(group => (
              <tbody key={group.key}>
                {/* Cabecera de grupo (solo si 2+ automáticos) */}
                {group.isMulti && (
                  <tr>
                    <td colSpan={7} className="px-4 pt-3 pb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full",
                          GROUP_BORDERS[group.colorIdx].replace("border-l-", "bg-"))} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.movements[0].registro_origen_tipo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{group.movements[0].fecha}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                          {group.movements.length} productos en esta operación
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {group.movements.map((m, mIdx) => {
                const prod      = catalogos.find(c => c.id === m.catalogo_id);
                const delta     = m.cantidad_nueva - m.cantidad_anterior;
                const esEntrada = m.tipo === "entrada" || (m.tipo === "ajuste" && delta > 0);
                const esSalida  = m.tipo === "salida"  || (m.tipo === "ajuste" && delta < 0);
                const isAuto    = !!m.registro_origen_tipo;
                const isExpanded = expandedId === m.id;
                const isLast     = mIdx === group.movements.length - 1;

                return (
                  <Fragment key={m.id}>
                    {/* ── Fila principal ── */}
                    <tr
                      className={cn(
                        "cursor-pointer transition-colors select-none",
                        isLast && group.isMulti ? "border-b-2 border-border" : "border-b border-border/40",
                        group.isMulti
                          ? cn("border-l-4", GROUP_BORDERS[group.colorIdx],
                              isExpanded ? "bg-muted/50" : cn(GROUP_BG[group.colorIdx], "hover:brightness-95"))
                          : isExpanded
                          ? "bg-muted/40 border-border border-b"
                          : "hover:bg-muted/20 border-b border-border/50",
                      )}
                      onClick={() => toggleExpand(m.id)}
                    >
                      {/* Indicador expand */}
                      <td className="pl-3 pr-1 py-2.5">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform",
                            isExpanded && "rotate-90 text-primary",
                          )} />
                          <span className="font-mono text-xs text-muted-foreground">{m.fecha}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-sm">{prod?.nombre ?? m.catalogo_id}</p>
                        <p className="text-[10px] text-muted-foreground">{prod?.codigo ?? ""}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          TIPO_COLORS[m.tipo] ?? "bg-muted text-muted-foreground",
                        )}>
                          {TIPO_ICON[m.tipo]}{m.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={cn(
                          "font-semibold",
                          esEntrada ? "text-green-600" : esSalida ? "text-red-600" : "text-muted-foreground",
                        )}>
                          {esEntrada ? "+" : esSalida ? "−" : ""}
                          {fmtNum(m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad, 1)}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground">{prod?.unidad_medida ?? ""}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {fmtNum(m.cantidad_nueva, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-xs capitalize text-muted-foreground">
                        {m.subtipo.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2.5">
                        {isAuto ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium">
                            <Zap className="h-2.5 w-2.5 text-amber-500" />
                            {m.registro_origen_tipo}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {m.observaciones ? m.observaciones.substring(0, 28) + (m.observaciones.length > 28 ? "…" : "") : "Manual"}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* ── Fila expandida — detalle completo del movimiento ── */}
                    {isExpanded && (
                      <tr className={cn("border-b border-border bg-muted/20",
                        group.isMulti ? cn("border-l-4", GROUP_BORDERS[group.colorIdx]) : "")}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            {/* Datos del movimiento */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stock anterior</p>
                                <p className="mt-0.5 font-mono text-sm font-semibold">
                                  {fmtNum(m.cantidad_anterior, 1)}
                                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">{prod?.unidad_medida}</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stock nuevo</p>
                                <p className={cn("mt-0.5 font-mono text-sm font-semibold",
                                  esEntrada ? "text-green-600" : esSalida ? "text-red-600" : "")}>
                                  {fmtNum(m.cantidad_nueva, 1)}
                                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">{prod?.unidad_medida}</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subtipo</p>
                                <p className="mt-0.5 capitalize">{m.subtipo.replace(/_/g, " ")}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Registrado</p>
                                <p className="mt-0.5">{m.fecha}</p>
                              </div>
                              {m.registro_origen_tipo && (
                                <div className="col-span-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Origen</p>
                                  <p className="mt-0.5 flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-amber-500" />
                                    {m.registro_origen_tipo}
                                    <span className="text-muted-foreground">(automático)</span>
                                  </p>
                                </div>
                              )}
                              {m.observaciones && (
                                <div className="col-span-2 sm:col-span-4">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</p>
                                  <p className="mt-0.5 text-muted-foreground">{m.observaciones}</p>
                                </div>
                              )}
                            </div>

                            {/* Botones de acción — separados del click de fila */}
                            {prod && (
                              <div className="flex shrink-0 flex-col gap-2">
                                <button
                                  onClick={e => { e.stopPropagation(); onOpenDetail(prod.id); }}
                                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                                >
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  Ver ficha del producto
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); onKardex(prod.id); }}
                                  className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  Balance de stock
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
                })}
              </tbody>
            ))}
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>{filtered.length} movimientos — pág. {page}/{totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conteo Físico / Ajuste masivo ───────────────────────────────────────────

function ConteoFisicoView({ onDone }: { onDone: () => void }) {
  const { getAllProductos, registrarMovimiento } = useInventario();
  const productos = getAllProductos();

  const [conteos, setConteos]     = useState<Record<string, string>>({});
  const [search,  setSearch]      = useState("");
  const [soloDif, setSoloDif]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const fecha = new Date().toLocaleDateString("es-CL");

  const setConteo = (id: string, v: string) =>
    setConteos(prev => ({ ...prev, [id]: v }));

  const getDif = (p: typeof productos[0]) => {
    const conteo = parseFloat(conteos[p.id] ?? "");
    if (isNaN(conteo)) return null;
    return conteo - p.cantidad_actual;
  };

  const filtrados = productos.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
    if (soloDif) {
      const d = getDif(p);
      return d !== null && d !== 0;
    }
    return true;
  });

  const conDiferencias = productos.filter(p => {
    const d = getDif(p);
    return d !== null && d !== 0;
  });

  const confirmar = () => {
    setLoading(true);
    conDiferencias.forEach(p => {
      const conteo = parseFloat(conteos[p.id] ?? "");
      if (!isNaN(conteo)) {
        registrarMovimiento(p.id, "ajuste", "conteo_fisico", conteo, {
          observaciones: `Conteo físico — ${fecha}`,
        });
      }
    });
    setLoading(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar producto o código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soloDif}
            onChange={e => setSoloDif(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Solo con diferencias
        </label>
        {conDiferencias.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {conDiferencias.length} diferencia{conDiferencias.length !== 1 ? "s" : ""}
          </span>
        )}
        <p className="ml-auto text-xs text-muted-foreground">{fecha}</p>
      </div>

      {/* Instrucción */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/10 dark:text-blue-300">
        <AlertCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Ingresa el stock real contado en bodega para cada producto. Solo se ajustarán los que tengan diferencias.
          Los campos vacíos se ignoran.
        </p>
      </div>

      {/* Tabla spreadsheet */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Código</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock sistema</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-40">Conteo físico</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Sin productos</td></tr>
              )}
              {filtrados.map(p => {
                const dif = getDif(p);
                const hasDif = dif !== null && dif !== 0;
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      hasDif ? (dif! > 0 ? "bg-green-50/40 dark:bg-green-900/10" : "bg-red-50/40 dark:bg-red-900/10") : "",
                    )}
                  >
                    <td className="px-4 py-2">
                      <p className="font-medium">{p.nombre}</p>
                      <ModuloBadges ids={p.modulo_ids} size="xs" />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={conteos[p.id] ?? ""}
                        onChange={e => setConteo(p.id, e.target.value)}
                        onKeyDown={e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                        placeholder={fmtNum(p.cantidad_actual, 1)}
                        className={cn(
                          "h-8 text-right",
                          hasDif ? "border-amber-400 bg-amber-50/60 dark:bg-amber-900/10 font-semibold" : "",
                        )}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {dif === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : dif === 0 ? (
                        <span className="text-green-600 text-xs">✓ OK</span>
                      ) : (
                        <span className={cn("font-semibold tabular-nums text-sm", dif > 0 ? "text-green-600" : "text-red-600")}>
                          {dif > 0 ? "+" : ""}{fmtNum(dif, 1)}
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">{p.unidad_medida}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          {conDiferencias.length === 0
            ? "Sin diferencias — el stock del sistema coincide con el conteo."
            : <span className="font-medium text-amber-700 dark:text-amber-400">
                Se ajustarán {conDiferencias.length} producto{conDiferencias.length !== 1 ? "s" : ""}.
              </span>
          }
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDone}>Cancelar</Button>
          <Button
            size="sm"
            disabled={conDiferencias.length === 0 || loading}
            onClick={confirmar}
            className="gap-1.5 bg-primary"
          >
            <ClipboardCheck className="h-4 w-4" />
            Confirmar ajuste ({conDiferencias.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Kardex por producto ──────────────────────────────────────────────────────

function KardexSheet({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const { catalogos, getMovimientosByProducto } = useInventario();
  const p = productId ? catalogos.find(x => x.id === productId) : null;

  return (
    <Sheet open={productId !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col" side="right">
        {!p ? null : (() => {
          const movs = getMovimientosByProducto(p.id)
            .slice()
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at));

          const precio = p.precio_unitario;

          // Calcular Kardex con saldo acumulado
          type KardexRow = {
            fecha: string; concepto: string;
            entQ?: number; entP?: number; entTotal?: number;
            salQ?: number; salP?: number; salTotal?: number;
            saldoQ: number; saldoP: number; saldoTotal: number;
          };

          let saldoQ = 0;
          const rows: KardexRow[] = movs.map(m => {
            const delta = m.cantidad_nueva - m.cantidad_anterior;
            const esEntrada = m.tipo === "entrada" || (m.tipo === "ajuste" && delta > 0);
            const esSalida  = m.tipo === "salida"  || (m.tipo === "ajuste" && delta < 0);
            const qty = m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad;
            const p_unit = m.precio_unitario ?? precio;
            saldoQ = m.cantidad_nueva;

            const concepto = m.registro_origen_tipo
              ? `${m.registro_origen_tipo} (auto)`
              : m.observaciones ?? m.subtipo.replace(/_/g, " ");

            return {
              fecha: m.fecha, concepto,
              entQ:    esEntrada ? qty    : undefined,
              entP:    esEntrada ? p_unit : undefined,
              entTotal:esEntrada ? qty * p_unit : undefined,
              salQ:    esSalida  ? qty    : undefined,
              salP:    esSalida  ? p_unit : undefined,
              salTotal:esSalida  ? qty * p_unit : undefined,
              saldoQ, saldoP: precio, saldoTotal: saldoQ * precio,
            };
          });

          const valorTotal = saldoQ * precio;

          return (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-5 pt-5 pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Balance de stock — {p.nombre}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{p.codigo}</span>
                  <span>{p.categoria}</span>
                  <span>Precio unitario: <strong>{fmtCurrency(precio)}</strong></span>
                  <span>Unidad: <strong>{p.unidad_medida}</strong></span>
                  <span className="ml-auto font-medium text-foreground">
                    Saldo final: {fmtNum(saldoQ, 1)} {p.unidad_medida} · {fmtCurrency(valorTotal)}
                  </span>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-4">
                  {rows.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
                  ) : (
                    <table className="w-full min-w-[700px] text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border bg-muted/40">
                          <th rowSpan={2} className="border border-border px-3 py-2 text-left font-semibold">Fecha</th>
                          <th rowSpan={2} className="border border-border px-3 py-2 text-left font-semibold">Concepto</th>
                          <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-green-700 dark:text-green-400 bg-green-50/60 dark:bg-green-900/10">ENTRADAS</th>
                          <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-red-700 dark:text-red-400 bg-red-50/60 dark:bg-red-900/10">SALIDAS</th>
                          <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/10">SALDO</th>
                        </tr>
                        <tr className="border-b border-border bg-muted/20">
                          {["Cant.", "P.Unit.", "Total", "Cant.", "P.Unit.", "Total", "Cant.", "P.Unit.", "Total"].map((h, i) => (
                            <th key={i} className={cn("border border-border px-2 py-1 text-right font-semibold text-muted-foreground",
                              i < 3 ? "bg-green-50/40 dark:bg-green-900/10" : i < 6 ? "bg-red-50/40 dark:bg-red-900/10" : "bg-blue-50/40 dark:bg-blue-900/10"
                            )}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className={cn("border-b border-border/50 hover:bg-muted/10", i % 2 === 0 ? "" : "bg-muted/20")}>
                            <td className="border border-border/30 px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{r.fecha}</td>
                            <td className="border border-border/30 px-3 py-2 max-w-[180px] truncate" title={r.concepto}>{r.concepto}</td>
                            {/* Entradas */}
                            <td className="border border-border/30 px-2 py-2 text-right text-green-700 dark:text-green-400 bg-green-50/20 dark:bg-green-900/5 tabular-nums">
                              {r.entQ !== undefined ? fmtNum(r.entQ, 1) : ""}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right text-green-700 dark:text-green-400 bg-green-50/20 dark:bg-green-900/5 tabular-nums">
                              {r.entP !== undefined ? fmtCurrency(r.entP) : ""}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right font-medium text-green-700 dark:text-green-400 bg-green-50/20 dark:bg-green-900/5 tabular-nums">
                              {r.entTotal !== undefined ? fmtCurrency(r.entTotal) : ""}
                            </td>
                            {/* Salidas */}
                            <td className="border border-border/30 px-2 py-2 text-right text-red-700 dark:text-red-400 bg-red-50/20 dark:bg-red-900/5 tabular-nums">
                              {r.salQ !== undefined ? fmtNum(r.salQ, 1) : ""}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right text-red-700 dark:text-red-400 bg-red-50/20 dark:bg-red-900/5 tabular-nums">
                              {r.salP !== undefined ? fmtCurrency(r.salP) : ""}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right font-medium text-red-700 dark:text-red-400 bg-red-50/20 dark:bg-red-900/5 tabular-nums">
                              {r.salTotal !== undefined ? fmtCurrency(r.salTotal) : ""}
                            </td>
                            {/* Saldo */}
                            <td className="border border-border/30 px-2 py-2 text-right font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/5 tabular-nums">
                              {fmtNum(r.saldoQ, 1)}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/5 tabular-nums">
                              {fmtCurrency(r.saldoP)}
                            </td>
                            <td className="border border-border/30 px-2 py-2 text-right font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/5 tabular-nums">
                              {fmtCurrency(r.saldoTotal)}
                            </td>
                          </tr>
                        ))}
                        {/* Fila de totales */}
                        <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                          <td colSpan={2} className="border border-border px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">TOTALES</td>
                          <td className="border border-border px-2 py-2 text-right tabular-nums text-green-700 dark:text-green-400">
                            {fmtNum(rows.reduce((s, r) => s + (r.entQ ?? 0), 0), 1)}
                          </td>
                          <td className="border border-border px-2 py-2 bg-green-50/20 dark:bg-green-900/5" />
                          <td className="border border-border px-2 py-2 text-right font-semibold tabular-nums text-green-700 dark:text-green-400">
                            {fmtCurrency(rows.reduce((s, r) => s + (r.entTotal ?? 0), 0))}
                          </td>
                          <td className="border border-border px-2 py-2 text-right tabular-nums text-red-700 dark:text-red-400">
                            {fmtNum(rows.reduce((s, r) => s + (r.salQ ?? 0), 0), 1)}
                          </td>
                          <td className="border border-border px-2 py-2 bg-red-50/20 dark:bg-red-900/5" />
                          <td className="border border-border px-2 py-2 text-right font-semibold tabular-nums text-red-700 dark:text-red-400">
                            {fmtCurrency(rows.reduce((s, r) => s + (r.salTotal ?? 0), 0))}
                          </td>
                          <td className="border border-border px-2 py-2 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">{fmtNum(saldoQ, 1)}</td>
                          <td className="border border-border px-2 py-2 bg-blue-50/20 dark:bg-blue-900/5" />
                          <td className="border border-border px-2 py-2 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">{fmtCurrency(valorTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </ScrollArea>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Inventario() {
  const { hierarchyLevel }   = useRole();
  const { getAllProductos, movimientos, getAlertas, getAlertasVencimiento, catalogos, desactivarProducto } = useInventario();
  const [searchParams]       = useSearchParams();

  const moduloParam = searchParams.get("modulo") ?? "all";

  // ── Tab principal ─────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<"stock" | "movimientos" | "conteo">("stock");

  // ── Filters (stock tab) ───────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterModulo, setFilterModulo] = useState(moduloParam);
  const [filterEstado, setFilterEstado] = useState("all");
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("list");

  // ── Overlays ──────────────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detalleOpen,   setDetalleOpen]   = useState(false);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProd,    setEditingProd]    = useState<InvCatalogo | null>(null);
  const [modalId,       setModalId]       = useState<string | null>(null);
  const [modalTipo,     setModalTipo]     = useState<InvMovimientoTipo>("entrada");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [kardexId,      setKardexId]      = useState<string | null>(null);

  const canAdmin = hierarchyLevel >= 5;

  function openDetail(id: string) { setSelectedId(id); setDetalleOpen(true); }
  function openMovimiento(id: string, tipo: InvMovimientoTipo) {
    setModalId(id); setModalTipo(tipo); setModalOpen(true);
  }

  // ── Exportar stock (respeta filtros activos) ──────────────────────────────
  function exportarStock() {
    const todos = filtered; // usa los filtros activos del panel lateral
    const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");
    exportToCsv(
      todos.map(p => ({
        codigo:           p.codigo,
        nombre:           p.nombre,
        categoria:        p.categoria,
        areas:            p.modulo_ids.join(" / "),
        stock_actual:     p.cantidad_actual,
        stock_minimo:     p.cantidad_minima,
        stock_maximo:     p.cantidad_maxima,
        unidad:           p.unidad_medida,
        estado:           getStockStatus(p) === "ok" ? "OK" : getStockStatus(p) === "bajo" ? "Bajo" : "Crítico",
        precio_unitario:  p.precio_unitario,
        valor_total:      +(p.cantidad_actual * p.precio_unitario).toFixed(2),
        proveedor:        p.proveedor_id ?? "",
        ubicacion:        p.ubicacion_fisica ?? "",
        // Campos personalizados aplanados
        ...Object.fromEntries((p.campos_extra ?? []).map(c => [c.nombre, c.valor])),
      })),
      [
        { key: "codigo",          label: "Código" },
        { key: "nombre",          label: "Nombre" },
        { key: "categoria",       label: "Categoría" },
        { key: "areas",           label: "Área(s) de uso" },
        { key: "stock_actual",    label: "Stock actual" },
        { key: "stock_minimo",    label: "Stock mínimo" },
        { key: "stock_maximo",    label: "Stock máximo" },
        { key: "unidad",          label: "Unidad" },
        { key: "estado",          label: "Estado" },
        { key: "precio_unitario", label: "Precio unitario" },
        { key: "valor_total",     label: "Valor total" },
        { key: "proveedor",       label: "Proveedor" },
        { key: "ubicacion",       label: "Ubicación física" },
      ],
      `inventario-stock${filterModulo !== "all" ? `-${filterModulo}` : ""}${filterEstado !== "all" ? `-${filterEstado}` : ""}-${fecha}.csv`,
    );
  }

  // ── Exportar historial de movimientos ─────────────────────────────────────
  function exportarMovimientos() {
    const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");
    const sorted = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
    exportToCsv(
      sorted.map(m => {
        const prod = catalogos.find(c => c.id === m.catalogo_id);
        return {
          fecha:             m.fecha,
          producto:          prod?.nombre ?? m.catalogo_id,
          codigo:            prod?.codigo ?? "",
          tipo:              m.tipo,
          subtipo:           m.subtipo.replace(/_/g, " "),
          cantidad:          m.tipo === "ajuste"
            ? Math.abs(m.cantidad_nueva - m.cantidad_anterior)
            : m.cantidad,
          stock_anterior:    m.cantidad_anterior,
          stock_resultante:  m.cantidad_nueva,
          unidad:            prod?.unidad_medida ?? "",
          origen:            m.registro_origen_tipo ?? "Manual",
          observaciones:     m.observaciones ?? "",
        };
      }),
      [
        { key: "fecha",           label: "Fecha" },
        { key: "producto",        label: "Producto" },
        { key: "codigo",          label: "Código" },
        { key: "tipo",            label: "Tipo" },
        { key: "subtipo",         label: "Subtipo" },
        { key: "cantidad",        label: "Cantidad" },
        { key: "stock_anterior",  label: "Stock anterior" },
        { key: "stock_resultante",label: "Stock resultante" },
        { key: "unidad",          label: "Unidad" },
        { key: "origen",          label: "Origen" },
        { key: "observaciones",   label: "Observaciones" },
      ],
      `inventario-movimientos-${fecha}.csv`,
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const allProductos    = getAllProductos();
  const alertas         = getAlertas();
  const alertasVenc     = getAlertasVencimiento();
  const vencCriticos    = alertasVenc.filter(a => a.estado === "vencido" || a.estado === "critico");

  const currentMonth = new Date().toISOString().substring(0, 7);
  const movsMes = useMemo(
    () => movimientos.filter(m => m.fecha.startsWith(currentMonth)).length,
    [movimientos, currentMonth],
  );
  const valorTotal = useMemo(
    () => allProductos.reduce((s, p) => s + p.cantidad_actual * p.precio_unitario, 0),
    [allProductos],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allProductos.filter(p => {
      if (filterModulo !== "all" && !p.modulo_ids.includes(filterModulo)) return false;
      if (filterEstado === "ok"      && getStockStatus(p) !== "ok")      return false;
      if (filterEstado === "bajo"    && getStockStatus(p) !== "bajo")    return false;
      if (filterEstado === "critico" && getStockStatus(p) !== "critico") return false;
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProductos, filterModulo, filterEstado, search]);

  return (
    <MainLayout>
      <PageHeader
        title="Inventario"
        description="Gestión de stock, movimientos y alertas por módulo"
        actions={
          <div className="flex items-center gap-2">
            {mainTab === "stock" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportarStock}>
                <Download className="h-4 w-4" />
                Exportar{filtered.length < getAllProductos().length
                  ? ` (${filtered.length} de ${getAllProductos().length})`
                  : " stock"}
              </Button>
            )}
            {canAdmin && mainTab === "stock" && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEditingProd(null); setProdDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Nuevo producto
              </Button>
            )}
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        {([
          { id: "stock",       label: "Stock",       icon: <Package   className="h-4 w-4" /> },
          { id: "movimientos", label: "Movimientos",   icon: <History        className="h-4 w-4" /> },
          { id: "conteo",      label: "Conteo físico", icon: <ClipboardCheck className="h-4 w-4" /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mainTab === t.id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon} {t.label}
            {t.id === "movimientos" && movsMes > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-bold text-primary">
                {movsMes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <MetricCard title="Productos activos"   value={allProductos.length}     icon={<Package        className="w-5 h-5" />} />
        <MetricCard title="Bajo mínimo"         value={alertas.length}          icon={<AlertTriangle  className="w-5 h-5" />} variant={alertas.length > 0 ? "warning" : "default"} />
        <MetricCard title="Por vencer / vencidos" value={alertasVenc.length}    icon={<CalendarClock  className="w-5 h-5" />} variant={vencCriticos.length > 0 ? "warning" : "default"} />
        <MetricCard title="Valor total"         value={fmtCurrency(valorTotal)} icon={<DollarSign     className="w-5 h-5" />} variant="info" />
        <MetricCard title="Movimientos del mes" value={movsMes}                 icon={<TrendingUp     className="w-5 h-5" />} variant="success" />
      </div>

      {/* Historial de movimientos */}
      {mainTab === "movimientos" && (
        <MovimientosView onOpenDetail={id => { openDetail(id); }} onKardex={id => setKardexId(id)} />
      )}

      {/* Conteo físico / Ajuste masivo */}
      {mainTab === "conteo" && (
        <ConteoFisicoView onDone={() => setMainTab("stock")} />
      )}


      {/* Stock — Main 2-column layout */}
      {mainTab === "stock" && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">

        {/* Filter panel */}
        <FilterPanel
          productos={filtered}
          filterModulo={filterModulo} setFilterModulo={setFilterModulo}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
          onReponer={id => openMovimiento(id, "entrada")}
        />

        {/* Products area */}
        <div className="space-y-4 min-w-0">
          {/* Search + view toggle */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 flex-1"
            />
            <div className="flex rounded-lg border border-border bg-muted p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("rounded-md p-1.5 transition-colors", viewMode === "grid" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Vista cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Vista lista"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Banner de reglas automáticas — barra en contenido */}
          <ReglasBanner variant="bar" />

          {/* Results count */}
          <p className="text-xs text-muted-foreground">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            {filterModulo !== "all" && <> en {MODULE_LABELS[filterModulo] ?? filterModulo}</>}
            {filterEstado !== "all" && <> · estado: {filterEstado}</>}
          </p>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-20 text-center">
              <Package className="mb-2 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Sin productos</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Cambia los filtros para ver más resultados.</p>
            </div>
          )}

          {/* Grid view */}
          {viewMode === "grid" && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onSelect={openDetail}
                  onMovimiento={openMovimiento}
                  onKardex={id => setKardexId(id)}
                />
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && filtered.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Área</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock</th>
                      <th className="w-28 px-3 py-2.5 font-semibold text-muted-foreground"></th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const status = getStockStatus(p);
                      return (
                        <tr
                          key={p.id}
                          className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/20"
                          onClick={() => openDetail(p.id)}
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{p.nombre}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                          </td>
                          <td className="px-3 py-2.5"><ModuloBadges ids={p.modulo_ids} size="xs" /></td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
                            <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <StockBar p={p} />
                          </td>
                          <td className="px-3 py-2.5"><StockBadge status={status} /></td>
                          <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <button className="rounded bg-green-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-green-700" onClick={() => openMovimiento(p.id, "entrada")}>+</button>
                              <button className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-red-700" onClick={() => openMovimiento(p.id, "salida")}>−</button>
                              <button className="rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => openDetail(p.id)} title="Ver detalle">↗</button>
                              <button className="rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setKardexId(p.id)} title="Balance de stock">
                                <BookOpen className="h-3.5 w-3.5" />
                              </button>
                              {canAdmin && (
                                <>
                                  <button className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => { setEditingProd(p); setProdDialogOpen(true); }} title="Editar producto">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button className={cn("rounded p-0.5 hover:bg-muted", p.activo ? "text-muted-foreground" : "text-green-600")} onClick={() => desactivarProducto(p.id)} title={p.activo ? "Desactivar" : "Activar"}>
                                    <Power className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Sheets + modals */}
      <DetalleSheet
        productId={selectedId}
        open={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        onMovimiento={openMovimiento}
        onKardex={id => { setKardexId(id); }}
      />
      <KardexSheet productId={kardexId} onClose={() => setKardexId(null)} />
      <ModalMovimiento open={modalOpen} onOpenChange={setModalOpen} productoId={modalId} tipoInicial={modalTipo} />
      <ProductoDialog open={prodDialogOpen} onOpenChange={setProdDialogOpen} editing={editingProd} />
    </MainLayout>
  );
}
