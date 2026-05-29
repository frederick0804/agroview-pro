/**
 * Inventario.tsx  — rediseñado
 *
 * Layout: métricas + panel filtros lateral + cards/lista de productos.
 * Detalle abre en Sheet lateral (sin perder contexto).
 * Catálogo (CRUD admin) en Sheet separado.
 */

import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { MetricCard }  from "@/components/dashboard/MetricCard";
import { ModalMovimiento } from "@/components/dashboard/ModalMovimiento";
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
  type InvCatalogo, type InvMovimientoTipo, type InvMovimiento,
} from "@/contexts/InventarioContext";
import { useRole } from "@/contexts/RoleContext";
import {
  Package, AlertTriangle, DollarSign, TrendingUp,
  ArrowDown, ArrowUp, SlidersHorizontal,
  Plus, Pencil, Power, LayoutList, LayoutGrid,
  FlaskConical, Sprout, Leaf, PackageOpen, ShoppingCart,
  ExternalLink, Info, ChevronRight, X, Zap, Settings2,
} from "lucide-react";

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

// ─── OrigenCell ───────────────────────────────────────────────────────────────

function OrigenCell({ m }: { m: InvMovimiento }) {
  const navigate = useNavigate();
  const origen   = m.registro_origen_tipo;
  if (!origen) return <span className="text-xs text-muted-foreground">{m.observaciones ?? "—"}</span>;

  const MODULO_PATH: Record<string, string> = {
    APLICACION_FITOSANITARIA: "/cultivo", PACKING_LIST: "/post-cosecha",
    MOVIMIENTO_BODEGA: "/post-cosecha",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium hover:bg-muted transition-colors">
          <Info className="h-2.5 w-2.5 text-muted-foreground" /> {origen}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 p-3 text-xs" side="left">
        <p className="font-semibold text-sm">Origen del movimiento</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formulario</span>
            <span className="font-mono font-medium">{origen}</span>
          </div>
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
        {MODULO_PATH[origen] && (
          <button
            onClick={() => navigate(MODULO_PATH[origen]!)}
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Ver módulo de origen
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  p, onSelect, onMovimiento,
}: {
  p: InvCatalogo;
  onSelect: (id: string) => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
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
          <ModuloBadge moduloId={p.modulo_id} size="xs" />
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
  const allProductos = useInventario().getAllProductos();
  const alertas = allProductos.filter(p => getStockStatus(p) !== "ok");

  const moduloCount = useMemo(() => {
    const counts: Record<string, number> = {};
    allProductos.forEach(p => { counts[p.modulo_id] = (counts[p.modulo_id] ?? 0) + 1; });
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
    </aside>
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
  productId, open, onClose, onMovimiento,
}: {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
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
                    <ModuloBadge moduloId={p.modulo_id} />
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
                </div>

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

// ─── Producto Dialog (CRUD) ───────────────────────────────────────────────────

interface ProductoFormState {
  nombre: string; codigo: string; modulo_id: string; categoria: string;
  cantidad_actual: string; cantidad_minima: string; cantidad_maxima: string;
  unidad_medida: string; precio_unitario: string;
  ubicacion_fisica: string; proveedor_id: string;
}
const EMPTY_FORM: ProductoFormState = {
  nombre: "", codigo: "", modulo_id: "", categoria: "", cantidad_actual: "",
  cantidad_minima: "", cantidad_maxima: "", unidad_medida: "unidades", precio_unitario: "",
  ubicacion_fisica: "", proveedor_id: "",
};
function toFormState(p: InvCatalogo): ProductoFormState {
  return {
    nombre: p.nombre, codigo: p.codigo, modulo_id: p.modulo_id, categoria: p.categoria,
    cantidad_actual: String(p.cantidad_actual), cantidad_minima: String(p.cantidad_minima),
    cantidad_maxima: String(p.cantidad_maxima), unidad_medida: p.unidad_medida,
    precio_unitario: String(p.precio_unitario),
    ubicacion_fisica: p.ubicacion_fisica ?? "", proveedor_id: p.proveedor_id ?? "",
  };
}

function ProductoDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: InvCatalogo | null }) {
  const { agregarProducto, editarProducto } = useInventario();
  const { currentUser } = useRole();
  const [form, setForm] = useState<ProductoFormState>(EMPTY_FORM);
  const [err,  setErr]  = useState("");
  const set = (k: keyof ProductoFormState) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  useMemo(() => {
    if (open) { setForm(editing ? toFormState(editing) : EMPTY_FORM); setErr(""); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const handleSave = () => {
    if (!form.nombre.trim() || !form.codigo.trim() || !form.modulo_id) { setErr("Nombre, código y área de uso son obligatorios."); return; }
    const cantMin = parseFloat(form.cantidad_minima), cantMax = parseFloat(form.cantidad_maxima), cantAct = parseFloat(form.cantidad_actual);
    if (isNaN(cantMin) || isNaN(cantMax) || (!editing && isNaN(cantAct))) { setErr("Ingresa cantidades numéricas válidas."); return; }
    const clienteId = currentUser?.clienteId ? String(currentUser.clienteId) : "1";
    const productorId = currentUser?.productorId ? String(currentUser.productorId) : "1";
    if (editing) {
      editarProducto(editing.id, {
        nombre: form.nombre, codigo: form.codigo, modulo_id: form.modulo_id,
        categoria: form.categoria, cantidad_minima: cantMin, cantidad_maxima: cantMax,
        unidad_medida: form.unidad_medida, precio_unitario: parseFloat(form.precio_unitario) || 0,
        ubicacion_fisica: form.ubicacion_fisica || undefined, proveedor_id: form.proveedor_id || undefined,
      });
    } else {
      agregarProducto({
        cliente_id: clienteId, productor_id: productorId, modulo_id: form.modulo_id,
        codigo: form.codigo, nombre: form.nombre, categoria: form.categoria,
        cantidad_actual: cantAct, cantidad_minima: cantMin, cantidad_maxima: cantMax,
        unidad_medida: form.unidad_medida, precio_unitario: parseFloat(form.precio_unitario) || 0,
        ubicacion_fisica: form.ubicacion_fisica || undefined, proveedor_id: form.proveedor_id || undefined,
        datos_extra: {}, activo: true,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Nombre *</Label><Input value={form.nombre} onChange={e => set("nombre")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Código *</Label><Input value={form.codigo} onChange={e => set("codigo")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1">
            <Label className="text-xs">¿Dónde se usa este insumo? *</Label>
            <Select value={form.modulo_id} onValueChange={set("modulo_id")}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar área…" /></SelectTrigger>
              <SelectContent>{MODULOS_OPCIONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              El área donde se consume o almacena este producto
            </p>
          </div>
          <div className="space-y-1"><Label className="text-xs">Categoría</Label><Input value={form.categoria} onChange={e => set("categoria")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Unidad de medida</Label><Input value={form.unidad_medida} onChange={e => set("unidad_medida")(e.target.value)} className="h-9" /></div>
          {!editing && <div className="space-y-1"><Label className="text-xs">Cantidad inicial</Label><Input type="number" value={form.cantidad_actual} onChange={e => set("cantidad_actual")(e.target.value)} className="h-9" /></div>}
          <div className="space-y-1"><Label className="text-xs">Cantidad mínima</Label><Input type="number" value={form.cantidad_minima} onChange={e => set("cantidad_minima")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Cantidad máxima</Label><Input type="number" value={form.cantidad_maxima} onChange={e => set("cantidad_maxima")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Precio unitario</Label><Input type="number" value={form.precio_unitario} onChange={e => set("precio_unitario")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Ubicación física</Label><Input value={form.ubicacion_fisica} onChange={e => set("ubicacion_fisica")(e.target.value)} className="h-9" /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Proveedor</Label><Input value={form.proveedor_id} onChange={e => set("proveedor_id")(e.target.value)} className="h-9" /></div>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>{editing ? "Guardar" : "Crear producto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catálogo Sheet (admin) ───────────────────────────────────────────────────

function CatalogoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalogos, desactivarProducto } = useInventario();
  const [search,       setSearch]       = useState("");
  const [filterModulo, setFilterModulo] = useState("all");
  const [editingProd,  setEditingProd]  = useState<InvCatalogo | null>(null);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [page,         setPage]         = useState(1);
  const PAGE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalogos.filter(p => {
      if (filterModulo !== "all" && p.modulo_id !== filterModulo) return false;
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalogos, search, filterModulo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paginated  = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col" side="right">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle>Catálogo de productos</SheetTitle>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingProd(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
          <SheetDescription>Gestiona el catálogo completo de productos de inventario.</SheetDescription>
        </SheetHeader>

        <div className="flex gap-2 px-5 pt-3">
          <Input placeholder="Buscar por nombre o código..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 flex-1" />
          <Select value={filterModulo} onValueChange={v => { setFilterModulo(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              {MODULOS_OPCIONES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 px-5 pt-3">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nombre</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Área</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/20", !p.activo && "opacity-40")}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-sm">{p.nombre}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                  </td>
                  <td className="px-3 py-2"><ModuloBadge moduloId={p.modulo_id} size="xs" /></td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">
                    {fmtNum(p.cantidad_actual, 1)} <span className="text-xs font-normal text-muted-foreground">{p.unidad_medida}</span>
                  </td>
                  <td className="px-3 py-2"><StockBadge status={getStockStatus(p)} /></td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingProd(p); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", p.activo ? "text-muted-foreground" : "text-green-600")} onClick={() => desactivarProducto(p.id)}><Power className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 text-xs text-muted-foreground">
              <span>{filtered.length} productos — pág. {page}/{totalPages}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
              </div>
            </div>
          )}
        </ScrollArea>

        <ProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editingProd} />
      </SheetContent>
    </Sheet>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Inventario() {
  const { hierarchyLevel }   = useRole();
  const { getAllProductos, movimientos, getAlertas } = useInventario();
  const [searchParams]       = useSearchParams();

  const moduloParam = searchParams.get("modulo") ?? "all";

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterModulo, setFilterModulo] = useState(moduloParam);
  const [filterEstado, setFilterEstado] = useState("all");
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");

  // ── Overlays ──────────────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detalleOpen,   setDetalleOpen]   = useState(false);
  const [catalogoOpen,  setCatalogoOpen]  = useState(false);
  const [modalId,       setModalId]       = useState<string | null>(null);
  const [modalTipo,     setModalTipo]     = useState<InvMovimientoTipo>("entrada");
  const [modalOpen,     setModalOpen]     = useState(false);

  const canAdmin = hierarchyLevel >= 5;

  function openDetail(id: string) { setSelectedId(id); setDetalleOpen(true); }
  function openMovimiento(id: string, tipo: InvMovimientoTipo) {
    setModalId(id); setModalTipo(tipo); setModalOpen(true);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const allProductos = getAllProductos();
  const alertas      = getAlertas();

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
      if (filterModulo !== "all" && p.modulo_id !== filterModulo) return false;
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
          canAdmin ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCatalogoOpen(true)}>
              <Package className="h-4 w-4" /> Gestionar catálogo
            </Button>
          ) : undefined
        }
      />

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard title="Productos activos"   value={allProductos.length} icon={<Package     className="w-5 h-5" />} />
        <MetricCard title="Bajo mínimo"         value={alertas.length}      icon={<AlertTriangle className="w-5 h-5" />} variant={alertas.length > 0 ? "warning" : "default"} />
        <MetricCard title="Valor total"         value={fmtCurrency(valorTotal)} icon={<DollarSign className="w-5 h-5" />} variant="info" />
        <MetricCard title="Movimientos del mes" value={movsMes}             icon={<TrendingUp   className="w-5 h-5" />} variant="success" />
      </div>

      {/* Main 2-column layout */}
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
                          <td className="px-3 py-2.5"><ModuloBadge moduloId={p.modulo_id} size="xs" /></td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
                            <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <StockBar p={p} />
                          </td>
                          <td className="px-3 py-2.5"><StockBadge status={status} /></td>
                          <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="inline-flex gap-1">
                              <button className="rounded bg-green-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-green-700" onClick={() => openMovimiento(p.id, "entrada")}>+</button>
                              <button className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-red-700" onClick={() => openMovimiento(p.id, "salida")}>−</button>
                              <button className="rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => openDetail(p.id)}>↗</button>
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

      {/* Sheets + modals */}
      <DetalleSheet productId={selectedId} open={detalleOpen} onClose={() => setDetalleOpen(false)} onMovimiento={openMovimiento} />
      <CatalogoSheet open={catalogoOpen} onClose={() => setCatalogoOpen(false)} />
      <ModalMovimiento open={modalOpen} onOpenChange={setModalOpen} productoId={modalId} tipoInicial={modalTipo} />
    </MainLayout>
  );
}
