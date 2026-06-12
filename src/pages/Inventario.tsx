/**
 * Inventario.tsx  — rediseñado
 *
 * Layout: métricas + panel filtros lateral + cards/lista de productos.
 * Detalle abre en Sheet lateral (sin perder contexto).
 * Catálogo (CRUD admin) en Sheet separado.
 */

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { MetricCard }  from "@/components/dashboard/MetricCard";
import { ModalMovimiento }   from "@/components/dashboard/ModalMovimiento";
import { ProveedorCombobox }  from "@/components/ui/proveedor-combobox";
import { CategoriaCombobox } from "@/components/ui/categoria-combobox";
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
  type InvCampoConValor, type InvCampoTipo, type AlertaVencimiento, type InvLote,
  type InvProveedor,
} from "@/contexts/InventarioContext";
import { useRole } from "@/contexts/RoleContext";
import {
  Package, AlertTriangle, DollarSign, TrendingUp,
  ArrowDown, ArrowUp, SlidersHorizontal,
  Plus, Pencil, Power, LayoutList, LayoutGrid,
  FlaskConical, Sprout, Leaf, PackageOpen, ShoppingCart, MapPin,
  ExternalLink, Info, ChevronRight, X, Zap, Settings2,
  History, Filter, Download, CalendarClock, Search,
  ClipboardCheck, BookOpen, AlertCircle as AlertCircleIcon,
  Maximize2, Minimize2, Calendar, ArrowLeftRight, Tag, MoreHorizontal,
  Building2, ShieldCheck, ShieldOff, Trash2, GripVertical,
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
const MODULE_BG_CLS: Record<string, string> = {
  laboratorio: "bg-violet-100/60 dark:bg-violet-900/20",
  vivero:      "bg-emerald-100/60 dark:bg-emerald-900/20",
  cultivo:     "bg-green-100/60 dark:bg-green-900/20",
  "post-cosecha": "bg-orange-100/60 dark:bg-orange-900/20",
  comercial:   "bg-pink-100/60 dark:bg-pink-900/20",
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
  p, onSelect, onMovimiento, onKardex, canAdmin, onEdit, onToggleActivo,
}: {
  p: InvCatalogo;
  onSelect: (id: string) => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
  onKardex: (id: string) => void;
  canAdmin?: boolean;
  onEdit?: (p: InvCatalogo) => void;
  onToggleActivo?: (p: InvCatalogo) => void;
}) {
  const status    = getStockStatus(p);
  const pct       = getStockPct(p);
  const inactivo  = !p.activo;
  const riesgoLabel = status === "critico" ? "Riesgo critico" : status === "bajo" ? "Reposicion sugerida" : "Sin riesgo";
  const riesgoCls = status === "critico"
    ? "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/40"
    : status === "bajo"
      ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/40"
      : "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-900/40";

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card border-l-4 transition-shadow",
        inactivo ? "opacity-60 border-l-muted-foreground/30" : cn("hover:shadow-md cursor-pointer", STATUS_BORDER[status]),
      )}
      onClick={() => !inactivo && onSelect(p.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <p className={cn("font-semibold text-sm leading-tight line-clamp-2", inactivo && "text-muted-foreground line-through")}>{p.nombre}</p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <span className="font-mono">{p.codigo}</span>
            {p.categoria && <> · {p.categoria}</>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ModuloBadges ids={p.modulo_ids} size="xs" />
          {inactivo
            ? <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inactivo</span>
            : <StockBadge status={status} />}
        </div>
      </div>

      <div className={cn("px-4 pb-3", inactivo && "opacity-50")}>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stock actual</p>
            <p className={cn(
              "mt-0.5 text-3xl font-bold leading-none tabular-nums",
              !inactivo && status === "critico" && "text-red-600 dark:text-red-400",
              !inactivo && status === "bajo" && "text-amber-600 dark:text-amber-400",
            )}>
              {fmtNum(p.cantidad_actual, 1)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">{p.unidad_medida}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor</p>
            <p className="text-sm font-bold tabular-nums">{fmtCurrency(p.cantidad_actual * p.precio_promedio_ponderado)}</p>
          </div>
        </div>
        <StockBar p={p} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", riesgoCls)}>{riesgoLabel}</span>
          <span className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% max / min {fmtNum(p.cantidad_minima)}</span>
        </div>
      </div>

      {/* Stock bar */}
      <div className={cn("hidden px-4 pb-2", inactivo && "opacity-50")}>
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

      {/* Datos financieros */}
      {!inactivo && (
        <div className="hidden px-4 pb-2.5 grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Precio unit.</span>
            <span className="font-semibold">{fmtCurrency(p.precio_unitario)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">PPP</span>
            <span className={cn("font-semibold", p.precio_promedio_ponderado !== p.precio_unitario ? "text-amber-600 dark:text-amber-400" : "")}>
              {fmtCurrency(p.precio_promedio_ponderado)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Valor total</span>
            <span className="font-semibold">{fmtCurrency(p.cantidad_actual * p.precio_promedio_ponderado)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Stock seg.</span>
            <span className={cn("font-semibold", p.stock_seguridad > 0 && p.cantidad_actual <= p.stock_seguridad ? "text-orange-600 dark:text-orange-400" : "")}>
              {p.stock_seguridad > 0 ? fmtNum(p.stock_seguridad) : <span className="text-muted-foreground/60">—</span>}
            </span>
          </div>
          {p.cuenta_contable && (
            <div className="col-span-2 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Cuenta</span>
              <span className="font-mono text-[11px] rounded bg-muted px-1.5 py-0.5">{p.cuenta_contable}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions — 1 CTA primario contextual + 1 secundario */}
      <div
        className="mt-auto flex flex-col gap-1.5 border-t border-border bg-muted/20 px-3 py-2.5"
        onClick={e => e.stopPropagation()}
      >
        {!inactivo ? (
          <>
            {/* CTA primario: "Registrar entrada" si hay alerta, "Registrar movimiento" si OK */}
            <button
              className={cn(
                "w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                status === "ok"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-green-600 text-white hover:bg-green-700",
              )}
              onClick={() => onMovimiento(p.id, "entrada")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {status !== "ok" ? "Reponer stock" : "Nueva entrada"}
            </button>
            {/* CTA secundario: detalle + acciones adicionales */}
            <div className="flex items-center gap-1">
              <button
                className="flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={() => onSelect(p.id)}
              >
                Ver detalle y movimientos <ChevronRight className="h-3 w-3" />
              </button>
              <button
                className="flex items-center justify-center rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                onClick={() => onMovimiento(p.id, "salida")}
                title="Registrar salida"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <span className="flex-1 text-center text-[11px] italic text-muted-foreground">Producto inactivo — deshabilitado en formularios</span>
        )}

        {/* Menú "···" — edición / activar-desactivar (solo admins) */}
        {canAdmin && (onEdit || onToggleActivo) && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-7 w-7 shrink-0 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                title="Más acciones"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              {onEdit && !inactivo && (
                <button
                  onClick={() => onEdit(p)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Editar producto
                </button>
              )}
              {onToggleActivo && (
                <button
                  onClick={() => onToggleActivo(p)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    inactivo
                      ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                  {inactivo ? "Reactivar producto" : "Desactivar producto"}
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  productos,
  filterModulo, setFilterModulo,
  filterEstado, setFilterEstado,
}: {
  productos: InvCatalogo[];
  filterModulo: string;
  setFilterModulo: (v: string) => void;
  filterEstado: string;
  setFilterEstado: (v: string) => void;
}) {
  const { getAllProductos } = useInventario();
  const allProductos = getAllProductos();

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

// ─── Panel de Lotes (dentro del DetalleSheet) ────────────────────────────────

function diasParaVencer(fechaISO: string): number {
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaISO); vence.setHours(0, 0, 0, 0);
  return Math.round((vence.getTime() - hoy.getTime()) / 86_400_000);
}

function LotesPanel({ productoId, unidad, onRegistrarEntrada, onUsarLote, onVerHistorial }: {
  productoId: string;
  unidad: string;
  onRegistrarEntrada?: () => void;
  onUsarLote?: (lote: InvLote) => void;
  /** Filtra "Historial de movimientos" del producto para mostrar solo los de este lote */
  onVerHistorial?: (numeroLote: string) => void;
}) {
  const { getLotesByProducto, editarLote, registrarMovimiento } = useInventario();
  const lotes = getLotesByProducto(productoId);
  const lotesOrdenados = [...lotes].sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  const lotesActivos = lotesOrdenados.filter(l => l.activo && l.cantidad_actual > 0);
  const fefoRecomendado = lotesActivos[0] ?? null;
  const vencimientoMeta = (fecha: string) => {
    const dias = diasParaVencer(fecha);
    if (dias < 0) return { dias, label: `Vencido ${Math.abs(dias)}d`, cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50", dot: "bg-red-500" };
    if (dias <= 30) return { dias, label: dias === 0 ? "Vence hoy" : `${dias}d`, cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50", dot: "bg-amber-500" };
    return { dias, label: `${dias}d`, cls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50", dot: "bg-green-500" };
  };
  const [confirmLote, setConfirmLote] = useState<InvLote | null>(null);
  const [descontarStock, setDescontarStock] = useState(true);

  // ── Lotes: tarjetas colapsadas por defecto (evitan que el panel crezca demasiado) ──
  const [expandedLotes, setExpandedLotes] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedLotes(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── Edición de lote ───────────────────────────────────────────────────────
  const [editLote, setEditLote] = useState<InvLote | null>(null);
  const [editForm, setEditForm] = useState<{
    numero_lote: string; fecha_fabricacion: string; fecha_vencimiento: string;
    certificado_origen: string; notas: string; campos_extra: InvCampoConValor[];
  }>({ numero_lote: "", fecha_fabricacion: "", fecha_vencimiento: "", certificado_origen: "", notas: "", campos_extra: [] });

  const abrirEdicion = (lote: InvLote) => {
    setEditLote(lote);
    setEditForm({
      numero_lote:        lote.numero_lote,
      fecha_fabricacion:  lote.fecha_fabricacion ?? "",
      fecha_vencimiento:  lote.fecha_vencimiento,
      certificado_origen: lote.certificado_origen ?? "",
      notas:              lote.notas ?? "",
      campos_extra:       (lote.campos_extra ?? []).map(c => ({ ...c })),
    });
  };
  const guardarEdicion = () => {
    if (!editLote) return;
    if (!editForm.numero_lote.trim() || !editForm.fecha_vencimiento) return;
    editarLote(editLote.id, {
      numero_lote:        editForm.numero_lote.trim(),
      fecha_fabricacion:  editForm.fecha_fabricacion || undefined,
      fecha_vencimiento:  editForm.fecha_vencimiento,
      certificado_origen: editForm.certificado_origen.trim() || undefined,
      notas:              editForm.notas.trim() || undefined,
      campos_extra:       editForm.campos_extra.length > 0 ? editForm.campos_extra : undefined,
    });
    setEditLote(null);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Lotes registrados
          <span className="text-muted-foreground font-normal">({lotes.filter(l => l.activo).length} activos)</span>
        </h3>
      </div>

      {/* Estado vacío */}
      {lotesOrdenados.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-6 text-center space-y-2">
          <Tag className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground font-medium">Sin lotes registrados</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
            Los lotes se crean automáticamente cuando registras una <strong>compra</strong>.
            {onRegistrarEntrada && (
              <> <button onClick={onRegistrarEntrada} className="text-primary hover:underline">Registrar compra ahora →</button></>
            )}
          </p>
        </div>
      )}

      {/* Lista de lotes — colapsada por tarjeta + scroll si hay muchos, para que el panel no se desborde */}
      {lotesOrdenados.length > 0 && (
        <div className="space-y-3">
          {fefoRecomendado && (() => {
            const meta = vencimientoMeta(fefoRecomendado.fecha_vencimiento);
            return (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">FEFO recomendado</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-background px-2 py-1 font-mono text-sm font-bold shadow-sm">{fefoRecomendado.numero_lote}</span>
                      <span className="text-sm font-semibold">{fmtNum(fefoRecomendado.cantidad_actual, 1)} {unidad}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                      {fefoRecomendado.proveedor_id && (
                        <span className="truncate text-xs text-muted-foreground">{fefoRecomendado.proveedor_id}</span>
                      )}
                    </div>
                  </div>
                  {onUsarLote && (
                    <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => onUsarLote(fefoRecomendado)}>
                      <ArrowUp className="h-3.5 w-3.5" /> Usar este lote
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2">
            {lotesOrdenados.slice(0, 8).map(lote => {
              const meta = vencimientoMeta(lote.fecha_vencimiento);
              return (
                <button
                  key={lote.id}
                  type="button"
                  onClick={() => toggleExpand(lote.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium shadow-sm transition-colors hover:bg-muted",
                    !lote.activo && "opacity-50",
                    fefoRecomendado?.id === lote.id && "border-primary text-primary",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  <span className="font-mono">{lote.numero_lote}</span>
                  <span className="text-muted-foreground">{fmtNum(lote.cantidad_actual, 1)}</span>
                  <span className={cn("rounded-full px-1.5 py-0 text-[10px]", meta.cls)}>{meta.label}</span>
                </button>
              );
            })}
            {lotesOrdenados.length > 8 && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                +{lotesOrdenados.length - 8} lotes
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Lote</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cantidad</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Vencimiento</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Proveedor</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Accion</th>
                </tr>
              </thead>
              <tbody>
                {lotesOrdenados.map(lote => {
                  const meta = vencimientoMeta(lote.fecha_vencimiento);
                  return (
                    <tr key={lote.id} className={cn("border-b border-border/50 last:border-0", fefoRecomendado?.id === lote.id && "bg-primary/5", !lote.activo && "opacity-50")}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                          <span className="font-mono font-semibold">{lote.numero_lote}</span>
                          {fefoRecomendado?.id === lote.id && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">FEFO</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtNum(lote.cantidad_actual, 1)} <span className="font-normal text-muted-foreground">{unidad}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {new Date(lote.fecha_vencimiento).toLocaleDateString("es-CL")} · {meta.label}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground">
                        {lote.proveedor_id || "Sin proveedor"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {onUsarLote && lote.activo && lote.cantidad_actual > 0 && (
                            <button
                              type="button"
                              onClick={() => onUsarLote(lote)}
                              className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                            >
                              Usar lote
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExpand(lote.id)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Ver ficha del lote"
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedLotes.has(lote.id) && "rotate-90")} />
                          </button>
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

      {lotesOrdenados.length > 0 && (
        <div className={cn(
          "space-y-2",
          lotesOrdenados.length > 4 && "max-h-[26rem] overflow-y-auto pr-1 -mr-1",
        )}>
          {lotesOrdenados.map(lote => {
            const dias    = diasParaVencer(lote.fecha_vencimiento);
            const pct     = lote.cantidad_inicial > 0
              ? Math.min(100, Math.round((lote.cantidad_actual / lote.cantidad_inicial) * 100))
              : 0;
            const borderCls = dias < 0  ? "border-red-300 dark:border-red-800/50"
                            : dias < 30 ? "border-amber-300 dark:border-amber-800/50"
                            :             "border-border";
            const barCls    = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
            const badgeCls  = dias < 0  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : dias < 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            :             "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            const tieneFicha = (lote.campos_extra ?? []).filter(c => c.valor).length > 0;
            const expanded = expandedLotes.has(lote.id);
            return (
              <div
                key={lote.id}
                className={cn("rounded-xl border bg-card overflow-hidden transition-colors", borderCls, !lote.activo && "opacity-60")}
              >
                {/* ── Fila compacta (siempre visible) ──
                     Nota: usamos <div role="button"> en vez de <button> porque contiene
                     botones de acción propios (historial/editar/activar) — anidar
                     <button> dentro de <button> es HTML inválido y React lo advierte. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(lote.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(lote.id); } }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-90",
                  )} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold truncate">{lote.numero_lote}</p>
                      {tieneFicha && <Tag className="h-3 w-3 text-primary shrink-0" />}
                    </div>
                    {/* Mini barra inline */}
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 w-16 shrink-0 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", barCls)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums truncate">
                        {fmtNum(lote.cantidad_actual, 1)} / {fmtNum(lote.cantidad_inicial, 1)} {unidad}
                      </span>
                    </div>
                  </div>

                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", badgeCls)}>
                    {dias < 0   ? `Vencido ${Math.abs(dias)}d`
                   : dias === 0 ? "Hoy"
                   :              new Date(lote.fecha_vencimiento).toLocaleDateString("es-CL")}
                  </span>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {onVerHistorial && (
                      <button
                        onClick={() => onVerHistorial(lote.numero_lote)}
                        title="Ver historial de movimientos de este lote"
                        className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <History className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => abrirEdicion(lote)}
                      title="Editar lote"
                      className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => { setConfirmLote(lote); setDescontarStock(true); }}
                      title={lote.activo ? "Desactivar lote" : "Reactivar lote"}
                      className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Power className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* ── Detalle expandible ── */}
                {expanded && (
                  <div className="border-t border-border/60 px-3 pb-3 pt-2.5 space-y-2.5">
                    {(lote.certificado_origen || lote.proveedor_id) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        {lote.certificado_origen && <span>📄 {lote.certificado_origen}</span>}
                        {lote.proveedor_id && <span>🏷️ {lote.proveedor_id}</span>}
                      </div>
                    )}

                    {/* Barra de consumo completa */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Disponible en este lote</span>
                        <span className="font-semibold tabular-nums">
                          {fmtNum(lote.cantidad_actual, 1)}
                          <span className="font-normal text-muted-foreground"> / {fmtNum(lote.cantidad_inicial, 1)} {unidad}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", barCls)} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right">{pct}% restante</p>
                    </div>

                    {/* Campos personalizados capturados para este lote */}
                    {tieneFicha && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 space-y-1.5">
                        <p className="text-[10px] font-semibold text-primary flex items-center gap-1.5">
                          <Tag className="h-3 w-3" /> Ficha del lote
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {(lote.campos_extra ?? []).filter(c => c.valor).map(c => (
                            <div key={c.nombre}>
                              <p className="text-[9px] text-muted-foreground">{c.etiqueta}</p>
                              <p className="text-xs font-medium">{c.valor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lote.notas && <p className="text-[11px] text-muted-foreground italic">{lote.notas}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog confirmar activar / desactivar lote ── */}
      <Dialog open={!!confirmLote} onOpenChange={v => { if (!v) setConfirmLote(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(
              "flex items-center gap-2",
              confirmLote?.activo ? "text-red-600" : "text-green-600",
            )}>
              <Power className="h-4 w-4" />
              {confirmLote?.activo ? "Desactivar lote" : "Reactivar lote"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-mono text-sm font-bold">{confirmLote?.numero_lote}</p>
              {confirmLote && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Disponible: {fmtNum(confirmLote.cantidad_actual, 1)} / {fmtNum(confirmLote.cantidad_inicial, 1)} {unidad}
                </p>
              )}
            </div>

            {confirmLote?.activo ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Este lote <strong>dejará de considerarse</strong> al descontar stock (orden FEFO) en
                  nuevos movimientos. Su registro y cantidad <strong>se conservan tal cual</strong> —
                  no se pierden ni se ponen en cero — y puedes reactivarlo cuando quieras.
                </p>
                {confirmLote.cantidad_actual > 0 && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800/30 dark:bg-amber-900/10 px-3 py-2.5 text-xs">
                    <input
                      type="checkbox"
                      checked={descontarStock}
                      onChange={e => setDescontarStock(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-primary"
                    />
                    <span className="text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">
                        Excluir su cantidad del stock disponible del producto
                      </strong> ({fmtNum(confirmLote.cantidad_actual, 1)} {unidad})
                      — genera un <strong>movimiento de merma</strong> que resta esa cantidad del
                      total disponible (porque ya no se puede usar: dañado, vencido, decomisado, etc.).
                      <br />
                      <strong className="text-foreground">El lote conserva su cantidad como registro</strong>{" "}
                      — no queda en cero — y si lo reactivas, esa cantidad se restituye automáticamente
                      al stock total (sin tener que crear un lote nuevo).
                      <br />
                      Si lo dejas <strong>sin marcar</strong>, el lote solo queda "en pausa": su cantidad
                      sigue contando en el stock total (útil, por ejemplo, mientras está en cuarentena o
                      control de calidad).
                    </span>
                  </label>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este lote volverá a estar <strong>disponible</strong> para el descuento de stock por
                orden FEFO (primero en vencer, primero en salir) en los próximos movimientos.
                {confirmLote?.stock_descontado && (
                  <> Como su cantidad (<strong>{fmtNum(confirmLote.cantidad_actual, 1)} {unidad}</strong>)
                  había sido excluida del stock total al desactivarlo, se <strong>restituirá automáticamente</strong>
                  {" "}mediante un movimiento de devolución — no necesitas crear un lote nuevo.</>
                )}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmLote(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant={confirmLote?.activo ? "destructive" : "default"}
              className={!confirmLote?.activo ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              onClick={() => {
                if (confirmLote) {
                  if (confirmLote.activo) {
                    // ── Desactivar ──
                    const excluir = descontarStock && confirmLote.cantidad_actual > 0;
                    if (excluir) {
                      // Solo se descuenta del stock TOTAL del producto — la cantidad propia
                      // del lote se conserva intacta como registro (no se pasa lote_id).
                      registrarMovimiento(productoId, "salida", "merma", confirmLote.cantidad_actual, {
                        lote_numero: confirmLote.numero_lote,
                        observaciones: `Lote ${confirmLote.numero_lote} desactivado — ${fmtNum(confirmLote.cantidad_actual, 1)} ${unidad} excluidas del stock total por baja/merma.`,
                      });
                    }
                    editarLote(confirmLote.id, { activo: false, stock_descontado: excluir });
                  } else {
                    // ── Reactivar ──
                    if (confirmLote.stock_descontado && confirmLote.cantidad_actual > 0) {
                      registrarMovimiento(productoId, "entrada", "devolucion", confirmLote.cantidad_actual, {
                        lote_numero: confirmLote.numero_lote,
                        observaciones: `Lote ${confirmLote.numero_lote} reactivado — ${fmtNum(confirmLote.cantidad_actual, 1)} ${unidad} restituidas al stock total.`,
                      });
                    }
                    editarLote(confirmLote.id, { activo: true, stock_descontado: false });
                  }
                }
                setConfirmLote(null);
              }}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {confirmLote?.activo ? "Sí, desactivar" : "Sí, reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog editar lote ── */}
      <Dialog open={!!editLote} onOpenChange={v => { if (!v) setEditLote(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Editar lote
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">N° de lote *</Label>
                <Input
                  value={editForm.numero_lote}
                  onChange={e => setEditForm(f => ({ ...f, numero_lote: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de vencimiento *</Label>
                <Input
                  type="date"
                  value={editForm.fecha_vencimiento}
                  onChange={e => setEditForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de fabricación</Label>
                <Input
                  type="date"
                  value={editForm.fecha_fabricacion}
                  onChange={e => setEditForm(f => ({ ...f, fecha_fabricacion: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Certificado de origen</Label>
                <Input
                  value={editForm.certificado_origen}
                  onChange={e => setEditForm(f => ({ ...f, certificado_origen: e.target.value }))}
                  placeholder="ej: SAG-CL-2025-XXX"
                  className="h-9"
                />
              </div>
            </div>

            {/* Campos personalizados del lote */}
            {editForm.campos_extra.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Ficha del lote
                </p>
                <div className="hidden grid-cols-2 gap-3">
                  {editForm.campos_extra.map((c, idx) => (
                    <div key={c.nombre} className="space-y-1">
                      <Label className="text-xs">{c.etiqueta || c.nombre}</Label>
                      {c.tipo === "Sí/No" ? (
                        <Select value={c.valor} onValueChange={v => setEditForm(f => ({
                          ...f, campos_extra: f.campos_extra.map((x, i) => i === idx ? { ...x, valor: v } : x),
                        }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sí">Sí</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : c.tipo === "Lista" ? (
                        <Select value={c.valor} onValueChange={v => setEditForm(f => ({
                          ...f, campos_extra: f.campos_extra.map((x, i) => i === idx ? { ...x, valor: v } : x),
                        }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar opción…" /></SelectTrigger>
                          <SelectContent>
                            {(c.opciones ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={c.tipo === "Número" ? "number" : c.tipo === "Fecha" ? "date" : "text"}
                          min={c.tipo === "Número" ? "0" : undefined}
                          value={c.valor}
                          onChange={e => setEditForm(f => ({
                            ...f, campos_extra: f.campos_extra.map((x, i) => i === idx ? { ...x, valor: e.target.value } : x),
                          }))}
                          className="h-9"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <textarea
                rows={2}
                value={editForm.notas}
                onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              La cantidad disponible de este lote ({fmtNum(editLote?.cantidad_actual ?? 0, 1)} {unidad}) no se
              edita aquí — se ajusta automáticamente con los movimientos de entrada/salida para mantener
              la trazabilidad del stock.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditLote(null)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={guardarEdicion}
              disabled={!editForm.numero_lote.trim() || !editForm.fecha_vencimiento}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Detalle Sheet ────────────────────────────────────────────────────────────

function DetalleSheet({
  productId, open, onClose, onMovimiento, onKardex, onTransferir, onVerHistorialLote,
}: {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
  onKardex: (id: string) => void;
  onTransferir: (id: string) => void;
  /** Lleva al usuario al tab "Movimientos" pre-filtrado por producto + lote */
  onVerHistorialLote: (productoId: string, loteNumero: string) => void;
}) {
  const { catalogos, movimientos, getLotesByProducto } = useInventario();
  const p = productId ? catalogos.find(x => x.id === productId) : null;
  const productMovs = useMemo(
    () => productId
      ? movimientos
          .filter(m => m.catalogo_id === productId)
          .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
      : [],
    [movimientos, productId],
  );
  const lotesProducto = productId ? getLotesByProducto(productId) : [];
  const proximoLote = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...lotesProducto]
      .filter(l => l.activo && l.cantidad_actual > 0)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0] ?? null;
  }, [lotesProducto]);
  const [detailTab, setDetailTab] = useState<"lotes" | "kardex" | "datos">("lotes");

  useEffect(() => {
    setDetailTab("lotes");
  }, [productId]);

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

            {(() => {
              const status = getStockStatus(p);
              const statusMeta = {
                ok: { label: "OK", cls: "border-green-200 bg-green-50/80 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400" },
                bajo: { label: "Bajo", cls: "border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400" },
                critico: { label: "Critico", cls: "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400" },
              }[status];
              const diasProxLote = proximoLote ? diasParaVencer(proximoLote.fecha_vencimiento) : null;

              return (
                <div className="shrink-0 border-b border-border bg-background px-5 py-3">
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
                      <div className="rounded-xl border border-border bg-card px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stock actual</p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                          <p className={cn(
                            "text-4xl font-bold leading-none tabular-nums",
                            status === "critico" && "text-red-600 dark:text-red-400",
                            status === "bajo" && "text-amber-600 dark:text-amber-400",
                          )}>
                            {fmtNum(p.cantidad_actual, 1)}
                            <span className="ml-1 text-sm font-medium text-muted-foreground">{p.unidad_medida}</span>
                          </p>
                          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", statusMeta.cls)}>{statusMeta.label}</span>
                        </div>
                        <div className="mt-3">
                          <StockBar p={p} />
                          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                            <span>Min {fmtNum(p.cantidad_minima)}</span>
                            <span>{getStockPct(p).toFixed(0)}% max</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Riesgo</p>
                        <p className="mt-1 text-sm font-bold">{status === "critico" ? "Reposicion urgente" : status === "bajo" ? "Reponer pronto" : "Controlado"}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {proximoLote ? `Lote ${proximoLote.numero_lote} / ${diasProxLote! < 0 ? "vencido" : `${diasProxLote}d`}` : "Sin lote activo"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor</p>
                        <p className="mt-1 text-lg font-bold tabular-nums">{fmtCurrency(p.cantidad_actual * p.precio_promedio_ponderado)}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">PPP {fmtCurrency(p.precio_promedio_ponderado)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:w-[300px] sm:justify-self-end">
                      <Button size="sm" className="h-10 gap-1 bg-green-600 text-white hover:bg-green-700" onClick={() => onMovimiento(p.id, "entrada")} title="Entrada">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="h-10 gap-1 bg-red-600 text-white hover:bg-red-700" onClick={() => onMovimiento(p.id, "salida")} title="Salida">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-10 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400" onClick={() => onMovimiento(p.id, "ajuste")} title="Ajuste">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-10 gap-1" onClick={() => onTransferir(p.id)} title="Transferir">
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-5">
                {(() => {
                  const status = getStockStatus(p);
                  const statusMeta = {
                    ok: { label: "Stock saludable", cls: "border-green-200 bg-green-50/80 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400" },
                    bajo: { label: "Bajo minimo", cls: "border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400" },
                    critico: { label: "Critico", cls: "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400" },
                  }[status];
                  const ultimoMov = productMovs[0];
                  const diasProxLote = proximoLote ? diasParaVencer(proximoLote.fecha_vencimiento) : null;

                  return (
                    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className={cn("border-b px-5 py-4", statusMeta.cls)}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Stock actual</p>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-4xl font-bold tabular-nums text-foreground">{fmtNum(p.cantidad_actual, 1)}</span>
                              <span className="text-sm font-medium text-muted-foreground">{p.unidad_medida}</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold">{statusMeta.label}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[390px]">
                            {[
                              { label: "Valor", value: fmtCurrency(p.cantidad_actual * p.precio_promedio_ponderado), icon: <DollarSign className="h-3.5 w-3.5" /> },
                              { label: "Minimo", value: `${fmtNum(p.cantidad_minima)} ${p.unidad_medida}`, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
                              { label: "Ultimo mov.", value: ultimoMov ? `${ultimoMov.tipo} ${fmtNum(ultimoMov.cantidad, 1)}` : "Sin historial", icon: <History className="h-3.5 w-3.5" /> },
                              { label: "Prox. lote", value: proximoLote ? (diasProxLote! < 0 ? "Vencido" : `${diasProxLote}d`) : "Sin lote", icon: <CalendarClock className="h-3.5 w-3.5" /> },
                            ].map(item => (
                              <div key={item.label} className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 shadow-sm">
                                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {item.icon} {item.label}
                                </div>
                                <p className="truncate text-sm font-bold text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                            <span>Nivel de stock</span>
                            <span>{getStockPct(p).toFixed(1)}% del maximo</span>
                          </div>
                          <div className="relative h-4 w-full overflow-hidden rounded-full bg-background/80">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700",
                                status === "critico" ? "bg-red-500" : status === "bajo" ? "bg-amber-500" : "bg-green-500")}
                              style={{ width: `${getStockPct(p)}%` }}
                            />
                            {p.cantidad_maxima > 0 && (
                              <div
                                className="absolute top-0 h-full w-0.5 bg-foreground/40"
                                style={{ left: `${Math.min(100, (p.cantidad_minima / p.cantidad_maxima) * 100)}%` }}
                                title={`Minimo: ${fmtNum(p.cantidad_minima)}`}
                              />
                            )}
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                            <span>0</span><span>Min: {fmtNum(p.cantidad_minima)}</span><span>Max: {fmtNum(p.cantidad_maxima)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 p-4 md:grid-cols-[1fr_280px]">
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => onMovimiento(p.id, "entrada")} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700">
                            <ArrowDown className="h-4 w-4" /> Entrada
                          </button>
                          <button onClick={() => onMovimiento(p.id, "salida")} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                            <ArrowUp className="h-4 w-4" /> Salida
                          </button>
                          <button onClick={() => onMovimiento(p.id, "ajuste")} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-400">
                            <SlidersHorizontal className="h-4 w-4" /> Ajuste
                          </button>
                          <button onClick={() => onTransferir(p.id)} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                            <ArrowLeftRight className="h-4 w-4" /> Transferir
                          </button>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/20 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
                            <button onClick={() => onKardex(p.id)} className="text-[11px] font-medium text-primary hover:underline">
                              Ver todo
                            </button>
                          </div>
                          <div className="space-y-2">
                            {productMovs.slice(0, 4).map(m => {
                              const isIn = m.tipo === "entrada";
                              const isOut = m.tipo === "salida";
                              return (
                                <div key={m.id} className="flex gap-2">
                                  <span className={cn(
                                    "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                                    isIn ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : isOut ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                  )}>
                                    {isIn ? <ArrowDown className="h-3 w-3" /> : isOut ? <ArrowUp className="h-3 w-3" /> : <SlidersHorizontal className="h-3 w-3" />}
                                  </span>
                                  <div className="min-w-0 flex-1 border-b border-border/60 pb-2 last:border-0">
                                    <p className="truncate text-xs font-semibold capitalize">
                                      {m.tipo} · {fmtNum(m.cantidad, 1)} {p.unidad_medida}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {m.fecha}{m.lote_numero ? ` · lote ${m.lote_numero}` : ""}{m.registro_origen_tipo ? ` · ${m.registro_origen_tipo}` : ""}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {productMovs.length === 0 && (
                              <div className="rounded-lg border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
                                Sin movimientos registrados
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Metrics — 2×2 grid para no comprimir los valores */}
                <div className="hidden grid-cols-2 gap-3">
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
                <div className="hidden rounded-xl border border-border bg-muted/30 p-4">
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
                <div className="hidden flex-wrap gap-2">
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
                    <BookOpen className="h-4 w-4" /> Historial de movimientos
                  </Button>
                </div>

                {/* Ficha técnica — campos propios del producto */}
                <div className="flex rounded-xl border border-border bg-muted p-1">
                  {([
                    { id: "lotes", label: "Lotes", icon: <PackageOpen className="h-4 w-4" />, count: lotesProducto.filter(l => l.activo && l.cantidad_actual > 0).length },
                    { id: "kardex", label: "Kardex", icon: <BookOpen className="h-4 w-4" />, count: productMovs.length },
                    { id: "datos", label: "Datos", icon: <Info className="h-4 w-4" />, count: (p.campos_extra ?? []).filter(c => c.valor).length },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailTab(tab.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        detailTab === tab.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                      <span className={cn(
                        "rounded-full px-1.5 py-0 text-[10px] font-bold",
                        detailTab === tab.id ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground",
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {detailTab === "kardex" && (
                  <div className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">Kardex reciente</p>
                        <p className="text-xs text-muted-foreground">Ultimos movimientos de este producto</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onKardex(p.id)}>
                        <BookOpen className="h-4 w-4" /> Ver todo
                      </Button>
                    </div>
                    <div className="divide-y divide-border/60">
                      {productMovs.slice(0, 8).map(m => {
                        const isIn = m.tipo === "entrada";
                        const isOut = m.tipo === "salida";
                        return (
                          <div key={m.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3">
                            <span className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full",
                              isIn ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : isOut ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            )}>
                              {isIn ? <ArrowDown className="h-4 w-4" /> : isOut ? <ArrowUp className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold capitalize">{m.tipo} / {m.subtipo.replace(/_/g, " ")}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {m.fecha}{m.lote_numero ? ` / lote ${m.lote_numero}` : ""}{m.observaciones ? ` / ${m.observaciones}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-sm font-bold tabular-nums", isIn ? "text-green-700 dark:text-green-400" : isOut ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                                {isIn ? "+" : isOut ? "-" : ""}{fmtNum(m.cantidad, 1)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{fmtNum(m.cantidad_nueva, 1)} {p.unidad_medida}</p>
                            </div>
                          </div>
                        );
                      })}
                      {productMovs.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sin movimientos registrados</div>
                      )}
                    </div>
                  </div>
                )}

                {detailTab === "datos" && (p.campos_extra ?? []).filter(c => c.valor).length > 0 && (
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

                {detailTab === "datos" && (p.campos_extra ?? []).filter(c => c.valor).length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                    Este producto no tiene campos tecnicos adicionales.
                  </div>
                )}

                {/* Panel de Lotes */}
                {detailTab === "lotes" && <div className="rounded-xl border border-border bg-card p-4">
                  <LotesPanel
                    productoId={p.id}
                    unidad={p.unidad_medida}
                    onRegistrarEntrada={() => onMovimiento(p.id, "entrada")}
                    onUsarLote={() => onMovimiento(p.id, "salida")}
                    onVerHistorial={numero => onVerHistorialLote(p.id, numero)}
                  />
                </div>}

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
  stock_seguridad: string; cuenta_contable: string;
  ubicacion_fisica: string; proveedor_id: string;
  campos_extra: InvCampoConValor[]; // campos propios de este producto
}
const EMPTY_FORM: ProductoFormState = {
  nombre: "", codigo: "", modulo_ids: [], categoria: "", cantidad_actual: "",
  cantidad_minima: "", cantidad_maxima: "", unidad_medida: "unidades", precio_unitario: "",
  stock_seguridad: "", cuenta_contable: "",
  ubicacion_fisica: "", proveedor_id: "", campos_extra: [],
};
function toFormState(p: InvCatalogo): ProductoFormState {
  return {
    nombre: p.nombre, codigo: p.codigo, modulo_ids: p.modulo_ids ?? [], categoria: p.categoria,
    cantidad_actual: String(p.cantidad_actual), cantidad_minima: String(p.cantidad_minima),
    cantidad_maxima: String(p.cantidad_maxima), unidad_medida: p.unidad_medida,
    precio_unitario: String(p.precio_unitario),
    stock_seguridad: String(p.stock_seguridad ?? ""),
    cuenta_contable: p.cuenta_contable ?? "",
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
  const { agregarProducto, editarProducto, proveedores, catalogos } = useInventario();
  const { currentUser } = useRole();

  // Categorías existentes derivadas del catálogo (únicas, ordenadas)
  const categoriasExistentes = useMemo(() => {
    const set = new Set<string>();
    catalogos.forEach(p => { if (p.categoria?.trim()) set.add(p.categoria.trim()); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [catalogos]);
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
    const cantMin = parseFloat(form.cantidad_minima);
    const cantMax = parseFloat(form.cantidad_maxima);
    const cantAct = parseFloat(form.cantidad_actual);
    if (isNaN(cantMin) || isNaN(cantMax) || (!editing && isNaN(cantAct))) {
      setErr("Ingresa cantidades numéricas válidas en \"Cantidad inicial\", \"Cantidad mínima\" y \"Cantidad máxima\".");
      return false;
    }
    if (cantMin > cantMax) {
      setErr("La cantidad mínima no puede ser mayor que la cantidad máxima.");
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
        stock_seguridad: parseFloat(form.stock_seguridad) || 0,
        cuenta_contable: form.cuenta_contable || undefined,
        ubicacion_fisica: form.ubicacion_fisica || undefined, proveedor_id: form.proveedor_id || undefined,
        campos_extra: form.campos_extra,
      });
    } else {
      const precioUnit = parseFloat(form.precio_unitario) || 0;
      agregarProducto({
        cliente_id: clienteId, productor_id: productorId, modulo_ids: form.modulo_ids,
        codigo: form.codigo, nombre: form.nombre, categoria: form.categoria,
        cantidad_actual: cantAct, cantidad_minima: cantMin, cantidad_maxima: cantMax,
        unidad_medida: form.unidad_medida, precio_unitario: precioUnit,
        precio_promedio_ponderado: precioUnit,
        stock_seguridad: parseFloat(form.stock_seguridad) || 0,
        cuenta_contable: form.cuenta_contable || undefined,
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
                <CategoriaCombobox
                  value={form.categoria}
                  onChange={v => setForm(p => ({ ...p, categoria: v }))}
                  options={categoriasExistentes}
                />
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
              <div className="space-y-2">
                <Label className="text-xs">Unidad de medida *</Label>

                {/* Grupos de unidades comunes */}
                {([
                  { grupo: "Masa",        units: ["kg", "g", "mg", "lb", "oz", "ton"] },
                  { grupo: "Volumen",     units: ["L", "mL", "cc", "m³", "fl oz"] },
                  { grupo: "Longitud",    units: ["m", "cm", "mm", "ft", "in"] },
                  { grupo: "Superficie",  units: ["m²", "cm²", "ha", "ft²"] },
                  { grupo: "Contable",    units: ["unidades", "sacos", "cajas", "rollos", "pallets", "docenas"] },
                ] as const).map(({ grupo, units }) => (
                  <div key={grupo}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {grupo}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {units.map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => set("unidad_medida")(form.unidad_medida === u ? "" : u)}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                            form.unidad_medida === u
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Separador + input libre */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground">o escribe cualquier otra</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="relative">
                  <Input
                    value={form.unidad_medida}
                    onChange={e => set("unidad_medida")(e.target.value)}
                    placeholder="ej: cuerda, vara, onza troy, ppm, %…"
                    className={cn("h-9 text-sm pr-16", form.unidad_medida && "border-primary/60")}
                  />
                  {form.unidad_medida && (
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {form.unidad_medida}
                    </span>
                  )}
                </div>
                {!form.unidad_medida && (
                  <p className="text-[11px] text-muted-foreground">
                    Selecciona una unidad de arriba o escribe la que necesites.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio unitario</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.precio_unitario}
                  onChange={e => set("precio_unitario")(e.target.value)}
                  onKeyDown={blockInvalidNumKey}
                  className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock de seguridad</Label>
                <Input type="number" min="0" step="any"
                  value={form.stock_seguridad}
                  onChange={e => set("stock_seguridad")(e.target.value)}
                  onKeyDown={blockInvalidNumKey}
                  placeholder="0"
                  className="h-9" />
                <p className="text-[10px] text-muted-foreground">Nivel de alerta antes del mínimo.</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Cuenta contable</Label>
                <Input value={form.cuenta_contable}
                  onChange={e => set("cuenta_contable")(e.target.value)}
                  placeholder="ej: 5-1110, Insumos agrícolas"
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
  const [confirmProd,  setConfirmProd]  = useState<InvCatalogo | null>(null);
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
                <tr key={p.id} className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors",
                  !p.activo && "bg-muted/30",
                )}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className={cn("font-medium", !p.activo && "text-muted-foreground line-through")}>{p.nombre}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                      </div>
                      {!p.activo && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border border-border">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><ModuloBadges ids={p.modulo_ids} size="xs" /></td>
                  <td className={cn("px-3 py-2.5 text-right", !p.activo && "opacity-50")}>
                    <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                  </td>
                  <td className={cn("hidden px-3 py-2.5 text-right text-xs text-muted-foreground sm:table-cell", !p.activo && "opacity-50")}>
                    {fmtCurrency(p.precio_unitario)}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.activo ? <StockBadge status={getStockStatus(p)} /> : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      {canAdmin && (
                        <>
                          {p.activo && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => { setEditingProd(p); setDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className={cn("h-7 w-7 p-0", p.activo ? "text-muted-foreground hover:text-red-600" : "text-green-600 hover:text-green-700")}
                            title={p.activo ? "Desactivar producto" : "Reactivar producto"}
                            onClick={() => setConfirmProd(p)}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {p.activo && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" title="Historial de movimientos" onClick={() => onKardex(p.id)}>
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      )}
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

      {/* ── AlertDialog confirmar activar / desactivar ── */}
      <Dialog open={!!confirmProd} onOpenChange={v => { if (!v) setConfirmProd(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(
              "flex items-center gap-2",
              confirmProd?.activo ? "text-red-600" : "text-green-600",
            )}>
              <Power className="h-4 w-4" />
              {confirmProd?.activo ? "Desactivar producto" : "Reactivar producto"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-sm">{confirmProd?.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{confirmProd?.codigo}</p>
            </div>

            {confirmProd?.activo ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este producto <strong>dejará de aparecer</strong> en formularios, catálogos de selección
                y reportes de inventario activo. El historial de movimientos se conserva.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este producto volverá a estar <strong>disponible</strong> en formularios, catálogos
                y reportes. Su stock actual es{" "}
                <strong>{fmtNum(confirmProd?.cantidad_actual ?? 0, 1)} {confirmProd?.unidad_medida}</strong>.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmProd(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant={confirmProd?.activo ? "destructive" : "default"}
              className={!confirmProd?.activo ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              onClick={() => {
                if (confirmProd) desactivarProducto(confirmProd.id);
                setConfirmProd(null);
              }}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {confirmProd?.activo ? "Sí, desactivar" : "Sí, reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Vista: Historial de movimientos ─────────────────────────────────────────

const MOV_PAGE = 20;

function MovimientosView({ onOpenDetail, onKardex, onMovimiento, initialFilter, onInitialFilterConsumed }: {
  onOpenDetail: (id: string) => void;
  onKardex: (id: string) => void;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
  /** Filtro a aplicar al entrar a esta vista (ej. desde "Ver historial" de un lote en el detalle de un producto) */
  initialFilter?: { productoId: string; loteNumero: string } | null;
  onInitialFilterConsumed?: () => void;
}) {
  const { movimientos, catalogos } = useInventario();
  const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

  const hoy = new Date().toISOString().substring(0, 10);

  const [search,      setSearch]      = useState("");
  const [filterTipo,  setFilterTipo]  = useState("all");
  const [filterProd,  setFilterProd]  = useState("all");
  const [filterOrigen,setFilterOrigen]= useState("all");
  const [filterLote,  setFilterLote]  = useState<string | null>(null);
  const [fechaDesde,  setFechaDesde]  = useState(hoy);   // default: hoy
  const [fechaHasta,  setFechaHasta]  = useState(hoy);   // default: hoy
  const [page,        setPage]        = useState(1);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [quickMovTipo,  setQuickMovTipo]  = useState<InvMovimientoTipo | null>(null);
  const [quickMovProd,  setQuickMovProd]  = useState("");
  const [quickMovOpen,  setQuickMovOpen]  = useState(false);

  const hayFiltroFecha = fechaDesde !== "" || fechaHasta !== "";

  const applyPreset = (preset: "hoy" | "semana" | "mes" | "trimestre" | "anio" | "todo") => {
    const iso = (d: Date) => d.toISOString().substring(0, 10);
    const now  = new Date();
    const hasta = iso(now);
    setPage(1);
    if (preset === "todo")      { setFechaDesde(""); setFechaHasta(""); return; }
    if (preset === "hoy")       { setFechaDesde(hoy); setFechaHasta(hoy); return; }
    if (preset === "semana")    {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      setFechaDesde(iso(d)); setFechaHasta(hasta); return;
    }
    if (preset === "mes")       { setFechaDesde(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setFechaHasta(hasta); return; }
    if (preset === "trimestre") { setFechaDesde(iso(new Date(now.getFullYear(), now.getMonth() - 2, 1))); setFechaHasta(hasta); return; }
    if (preset === "anio")      { setFechaDesde(iso(new Date(now.getFullYear(), 0, 1))); setFechaHasta(hasta); return; }
  };

  const toggleExpand = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id));

  const productoOpts = useMemo(() =>
    catalogos.filter(c => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  [catalogos]);

  // Lotes disponibles para filtrar — se acotan al producto seleccionado (si hay uno)
  // para no mezclar números de lote de productos distintos en el desplegable.
  const loteOpts = useMemo(() => {
    const set = new Set<string>();
    movimientos.forEach(m => {
      if (!m.lote_numero) return;
      if (filterProd !== "all" && m.catalogo_id !== filterProd) return;
      set.add(m.lote_numero);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [movimientos, filterProd]);

  // Si cambia el producto y el lote filtrado ya no aplica, limpiarlo
  useEffect(() => {
    if (filterLote && !loteOpts.includes(filterLote)) setFilterLote(null);
  }, [loteOpts, filterLote]);

  // ── Aplicar filtro inicial recibido (ej. "Ver historial" desde un lote) ────
  // Se limpia también el rango de fechas (que por defecto muestra solo "hoy")
  // para no ocultar movimientos antiguos del lote — el usuario vino a ver TODO
  // su historial, no solo el de hoy.
  useEffect(() => {
    if (!initialFilter) return;
    setFilterProd(initialFilter.productoId);
    setFilterLote(initialFilter.loteNumero);
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
    onInitialFilterConsumed?.();
  }, [initialFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...movimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
      .filter(m => {
        if (fechaDesde && m.fecha < fechaDesde) return false;
        if (fechaHasta && m.fecha > fechaHasta) return false;
        if (filterTipo   !== "all" && m.tipo          !== filterTipo)  return false;
        if (filterProd   !== "all" && m.catalogo_id   !== filterProd)  return false;
        if (filterOrigen === "auto"          && !m.registro_origen_tipo)                                    return false;
        if (filterOrigen === "manual"        && (!!m.registro_origen_tipo || m.subtipo === "transferencia")) return false;
        if (filterOrigen === "transferencia" && m.subtipo !== "transferencia")                               return false;
        if (filterLote && m.lote_numero !== filterLote) return false;
        if (q) {
          const prod = catalogos.find(c => c.id === m.catalogo_id);
          const match = prod?.nombre.toLowerCase().includes(q) ||
                        m.registro_origen_tipo?.toLowerCase().includes(q) ||
                        m.observaciones?.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
  }, [movimientos, catalogos, filterTipo, filterProd, filterOrigen, filterLote, search, fechaDesde, fechaHasta]);

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

  // ── Registrar movimiento rápido desde Movimientos ────────────────────────
  const openQuickMov = (tipo: InvMovimientoTipo) => {
    if (filterProd !== "all") {
      onMovimiento(filterProd, tipo);
    } else {
      setQuickMovTipo(tipo);
      setQuickMovProd(productoOpts[0]?.id ?? "");
      setQuickMovOpen(true);
    }
  };

  const confirmQuickMov = () => {
    if (quickMovTipo && quickMovProd) {
      onMovimiento(quickMovProd, quickMovTipo);
      setQuickMovOpen(false);
    }
  };

  // ── Estado del dialog de exportación ─────────────────────────────────────
  const [exportOpen,      setExportOpen]      = useState(false);
  const [exportDesde,     setExportDesde]     = useState(fechaDesde);
  const [exportHasta,     setExportHasta]     = useState(fechaHasta);
  const [exportTipo,      setExportTipo]      = useState(filterTipo);
  const [exportProd,      setExportProd]      = useState(filterProd);

  const exportPreviewCount = useMemo(() => {
    return [...movimientos].filter(m => {
      if (exportDesde && m.fecha < exportDesde) return false;
      if (exportHasta && m.fecha > exportHasta) return false;
      if (exportTipo !== "all" && m.tipo !== exportTipo) return false;
      if (exportProd !== "all" && m.catalogo_id !== exportProd) return false;
      return true;
    }).length;
  }, [movimientos, exportDesde, exportHasta, exportTipo, exportProd]);

  const applyExportPreset = (preset: "hoy" | "semana" | "mes" | "trimestre" | "anio" | "todo") => {
    const iso = (d: Date) => d.toISOString().substring(0, 10);
    const now  = new Date();
    const hasta = iso(now);
    if (preset === "todo")      { setExportDesde(""); setExportHasta(""); return; }
    if (preset === "hoy")       { setExportDesde(hoy); setExportHasta(hoy); return; }
    if (preset === "semana")    { const d = new Date(now); d.setDate(d.getDate() - 6); setExportDesde(iso(d)); setExportHasta(hasta); return; }
    if (preset === "mes")       { setExportDesde(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setExportHasta(hasta); return; }
    if (preset === "trimestre") { setExportDesde(iso(new Date(now.getFullYear(), now.getMonth() - 2, 1))); setExportHasta(hasta); return; }
    if (preset === "anio")      { setExportDesde(iso(new Date(now.getFullYear(), 0, 1))); setExportHasta(hasta); return; }
  };

  const doExport = () => {
    const rows = [...movimientos].filter(m => {
      if (exportDesde && m.fecha < exportDesde) return false;
      if (exportHasta && m.fecha > exportHasta) return false;
      if (exportTipo !== "all" && m.tipo !== exportTipo) return false;
      if (exportProd !== "all" && m.catalogo_id !== exportProd) return false;
      return true;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));

    exportToCsv(
      rows.map(m => {
        const prod  = catalogos.find(c => c.id === m.catalogo_id);
        const delta = m.cantidad_nueva - m.cantidad_anterior;
        return {
          fecha:            m.fecha,
          producto:         prod?.nombre ?? m.catalogo_id,
          codigo:           prod?.codigo ?? "",
          tipo:             m.tipo,
          subtipo:          m.subtipo.replace(/_/g, " "),
          cantidad:         m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad,
          stock_anterior:   m.cantidad_anterior,
          stock_resultante: m.cantidad_nueva,
          unidad:           prod?.unidad_medida ?? "",
          origen:           m.registro_origen_tipo ?? "Manual",
          observaciones:    m.observaciones ?? "",
        };
      }),
      [
        { key: "fecha",            label: "Fecha" },
        { key: "producto",         label: "Producto" },
        { key: "codigo",           label: "Código" },
        { key: "tipo",             label: "Tipo" },
        { key: "subtipo",          label: "Subtipo" },
        { key: "cantidad",         label: "Cantidad" },
        { key: "stock_anterior",   label: "Stock anterior" },
        { key: "stock_resultante", label: "Stock resultante" },
        { key: "unidad",           label: "Unidad" },
        { key: "origen",           label: "Origen" },
        { key: "observaciones",    label: "Observaciones" },
      ],
      `movimientos${exportTipo !== "all" ? `-${exportTipo}` : ""}${exportDesde ? `-${exportDesde}` : ""}${exportHasta && exportHasta !== exportDesde ? `_${exportHasta}` : ""}-${fecha}.csv`,
    );
    setExportOpen(false);
  };

  // Filtros activos para el resumen
  const activeFilterTags: { label: string; clear: () => void }[] = [];
  if (fechaDesde === hoy && fechaHasta === hoy) activeFilterTags.push({ label: "Hoy", clear: () => {} });
  else if (!fechaDesde && !fechaHasta)          activeFilterTags.push({ label: "Todo el historial", clear: () => {} });
  else if (fechaDesde || fechaHasta)            activeFilterTags.push({ label: `${fechaDesde || "inicio"} → ${fechaHasta || "hoy"}`, clear: () => applyPreset("hoy") });
  if (filterProd !== "all")    activeFilterTags.push({ label: productoOpts.find(p => p.id === filterProd)?.nombre ?? filterProd, clear: () => { setFilterProd("all"); setPage(1); } });
  if (filterTipo !== "all")    activeFilterTags.push({ label: filterTipo, clear: () => { setFilterTipo("all"); setPage(1); } });
  if (filterOrigen !== "all")  activeFilterTags.push({ label: filterOrigen, clear: () => { setFilterOrigen("all"); setPage(1); } });
  if (filterLote)              activeFilterTags.push({ label: `Lote: ${filterLote}`, clear: () => { setFilterLote(null); setPage(1); } });

  const clearAllFilters = () => {
    applyPreset("hoy"); setFilterTipo("all"); setFilterProd("all");
    setFilterOrigen("all"); setFilterLote(null); setSearch(""); setPage(1);
  };

  return (
    <div className="space-y-3 min-w-0">

      {/* ── Panel de filtros unificado ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Sección 1: Período */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Período</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { key: "hoy",       label: "Hoy"          },
              { key: "semana",    label: "7 días"        },
              { key: "mes",       label: "Este mes"      },
              { key: "trimestre", label: "3 meses"       },
              { key: "anio",      label: "Este año"      },
              { key: "todo",      label: "Todo"          },
            ] as const).map(p => {
              const isActive =
                (p.key === "hoy"  && fechaDesde === hoy && fechaHasta === hoy) ||
                (p.key === "todo" && !fechaDesde && !fechaHasta);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}

            <span className="h-4 w-px bg-border mx-1" />

            {/* Rango personalizado inline */}
            <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1">
              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={fechaDesde}
                onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
                className="bg-transparent text-[11px] outline-none w-[100px] text-muted-foreground focus:text-foreground"
              />
              <span className="text-[10px] text-muted-foreground">→</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
                className="bg-transparent text-[11px] outline-none w-[100px] text-muted-foreground focus:text-foreground"
              />
            </div>

            <span className="ml-auto shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
              <strong className="text-foreground">{filtered.length}</strong> movimiento{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Sección 2: Filtros + búsqueda + exportar */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Producto, formulario, notas…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-8 flex-1 min-w-40 text-xs"
            />
            <Select value={filterProd} onValueChange={v => { setFilterProd(v); setPage(1); }}>
              <SelectTrigger className={cn("h-8 w-44 text-xs bg-background", filterProd !== "all" && "border-primary text-primary")}><SelectValue placeholder="Todos los productos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {productoOpts.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={v => { setFilterTipo(v); setPage(1); }}>
              <SelectTrigger className={cn("h-8 w-32 text-xs bg-background", filterTipo !== "all" && "border-primary text-primary")}><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOrigen} onValueChange={v => { setFilterOrigen(v); setPage(1); }}>
              <SelectTrigger className={cn("h-8 w-32 text-xs bg-background", filterOrigen !== "all" && "border-primary text-primary")}><SelectValue placeholder="Origen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="auto">Automáticos</SelectItem>
                <SelectItem value="manual">Manuales</SelectItem>
                <SelectItem value="transferencia">Transferencias</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterLote ?? "all"}
              onValueChange={v => { setFilterLote(v === "all" ? null : v); setPage(1); }}
              disabled={loteOpts.length === 0}
            >
              <SelectTrigger className={cn("h-8 w-36 text-xs bg-background", filterLote && "border-primary text-primary")}>
                <Tag className="h-3 w-3 shrink-0 mr-1" />
                <SelectValue placeholder={loteOpts.length === 0 ? "Sin lotes" : "Lote"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los lotes</SelectItem>
                {loteOpts.map(lo => <SelectItem key={lo} value={lo} className="font-mono text-xs">{lo}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-green-600 text-white hover:bg-green-700"
                onClick={() => openQuickMov("entrada")}
                title={filterProd !== "all" ? `Registrar entrada — ${productoOpts.find(p => p.id === filterProd)?.nombre}` : "Registrar entrada"}
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Nueva entrada
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => openQuickMov("salida")}
                title={filterProd !== "all" ? `Registrar salida — ${productoOpts.find(p => p.id === filterProd)?.nombre}` : "Registrar salida"}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Nueva salida
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setExportDesde(fechaDesde);
                  setExportHasta(fechaHasta);
                  setExportTipo(filterTipo);
                  setExportProd(filterProd);
                  setExportOpen(true);
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Sección 3: chips de filtros activos (solo si hay más de 1 — el de período siempre está) */}
        {(activeFilterTags.length > 1 || filterProd !== "all" || filterTipo !== "all" || filterOrigen !== "all" || filterLote) && (
          <div className="border-t border-border/60 px-4 py-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground shrink-0">Activos:</span>
            {activeFilterTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                {tag.label}
                {tag.clear && i > 0 && (
                  <button onClick={tag.clear} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            ))}
            {(filterProd !== "all" || filterTipo !== "all" || filterOrigen !== "all" || filterLote || search) && (
              <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1">
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Dialog selector de producto para nueva entrada/salida ──────────── */}
      <Dialog open={quickMovOpen} onOpenChange={setQuickMovOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quickMovTipo === "entrada"
                ? <><ArrowDown className="h-4 w-4 text-green-600" /> Nueva entrada</>
                : <><ArrowUp className="h-4 w-4 text-red-500" /> Nueva salida</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">Seleccioná el producto para el movimiento:</p>
            <Select value={quickMovProd} onValueChange={setQuickMovProd}>
              <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {productoOpts.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.nombre}</span>
                    {p.codigo && <span className="ml-2 text-xs text-muted-foreground">{p.codigo}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickMovOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!quickMovProd}
              onClick={confirmQuickMov}
              className={cn("gap-1.5", quickMovTipo === "entrada" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white")}
            >
              {quickMovTipo === "entrada"
                ? <><ArrowDown className="h-3.5 w-3.5" /> Continuar</>
                : <><ArrowUp className="h-3.5 w-3.5" /> Continuar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de exportación con selector de fechas ───────────────────── */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar movimientos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Presets de fecha */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Período a exportar</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: "hoy",       label: "Hoy"     },
                  { key: "semana",    label: "7 días"  },
                  { key: "mes",       label: "Este mes"},
                  { key: "trimestre", label: "3 meses" },
                  { key: "anio",      label: "Este año"},
                  { key: "todo",      label: "Todo"    },
                ] as const).map(p => {
                  const isActive =
                    (p.key === "hoy"  && exportDesde === hoy && exportHasta === hoy) ||
                    (p.key === "todo" && !exportDesde && !exportHasta);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyExportPreset(p.key)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rango personalizado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Desde</label>
                <input
                  type="date"
                  value={exportDesde}
                  onChange={e => setExportDesde(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Hasta</label>
                <input
                  type="date"
                  value={exportHasta}
                  onChange={e => setExportHasta(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Filtros adicionales del export */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tipo de movimiento</label>
                <Select value={exportTipo} onValueChange={setExportTipo}>
                  <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="entrada">Solo entradas</SelectItem>
                    <SelectItem value="salida">Solo salidas</SelectItem>
                    <SelectItem value="ajuste">Solo ajustes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Producto</label>
                <Select value={exportProd} onValueChange={setExportProd}>
                  <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {productoOpts.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview del resultado */}
            <div className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              exportPreviewCount > 0
                ? "border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-900/10"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-900/10",
            )}>
              <Download className={cn("h-4 w-4 shrink-0", exportPreviewCount > 0 ? "text-green-600" : "text-amber-600")} />
              <div>
                <p className={cn("text-sm font-medium", exportPreviewCount > 0 ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300")}>
                  {exportPreviewCount > 0
                    ? `${exportPreviewCount} movimiento${exportPreviewCount !== 1 ? "s" : ""} se exportarán`
                    : "Sin movimientos para los criterios seleccionados"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {exportDesde && exportHasta ? `${exportDesde} → ${exportHasta}` : exportDesde ? `Desde ${exportDesde}` : exportHasta ? `Hasta ${exportHasta}` : "Todo el historial"}
                  {exportTipo !== "all" && ` · Solo ${exportTipo}s`}
                  {exportProd !== "all" && ` · ${productoOpts.find(p => p.id === exportProd)?.nombre ?? ""}`}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={exportPreviewCount === 0}
              onClick={doExport}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar {exportPreviewCount > 0 ? `(${exportPreviewCount})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        {m.subtipo === "transferencia" ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            <ArrowLeftRight className="w-3 h-3" /> Transferencia
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            TIPO_COLORS[m.tipo] ?? "bg-muted text-muted-foreground",
                          )}>
                            {TIPO_ICON[m.tipo]}{m.tipo}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {m.subtipo === "transferencia" ? (
                          <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                            {fmtNum(m.cantidad, 1)}
                            <span className="ml-1 font-normal text-muted-foreground">{prod?.unidad_medida ?? ""}</span>
                          </span>
                        ) : (
                          <>
                            <span className={cn(
                              "font-semibold",
                              esEntrada ? "text-green-600" : esSalida ? "text-red-600" : "text-muted-foreground",
                            )}>
                              {esEntrada ? "+" : esSalida ? "−" : ""}
                              {fmtNum(m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad, 1)}
                            </span>
                            <span className="ml-1 text-[10px] text-muted-foreground">{prod?.unidad_medida ?? ""}</span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {fmtNum(m.cantidad_nueva, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        <div>{m.subtipo.replace(/_/g, " ")}</div>
                        {m.bloque_ref && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5 text-green-600 shrink-0" />
                            <span className="text-green-700 dark:text-green-400 font-medium text-[10px]">{m.bloque_ref}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.subtipo === "transferencia" && m.modulo_origen && m.modulo_destino ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                            <span className={MODULE_ICON_CLS[m.modulo_origen]}>{MODULE_ICONS[m.modulo_origen]}</span>
                            <span className="text-muted-foreground">{MODULE_LABELS[m.modulo_origen] ?? m.modulo_origen}</span>
                            <ArrowLeftRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className={MODULE_ICON_CLS[m.modulo_destino]}>{MODULE_ICONS[m.modulo_destino]}</span>
                            <span className="text-muted-foreground">{MODULE_LABELS[m.modulo_destino] ?? m.modulo_destino}</span>
                          </span>
                        ) : isAuto ? (
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
                              {/* Trazabilidad — lote + ubicación + cultivo */}
                              {(m.lote_numero || m.bloque_ref || m.cultivo_id) && (
                                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-border/50">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                    Trazabilidad
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {m.lote_numero && (
                                      <button
                                        onClick={e => { e.stopPropagation(); setFilterLote(m.lote_numero!); setPage(1); }}
                                        title="Ver solo movimientos de este lote"
                                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-1 text-xs font-mono font-medium hover:border-primary hover:text-primary transition-colors"
                                      >
                                        <Tag className="h-3 w-3" />
                                        Lote: {m.lote_numero}
                                      </button>
                                    )}
                                    {m.bloque_ref && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50/60 dark:border-green-800/30 dark:bg-green-900/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                        <Leaf className="h-3 w-3" />
                                        {m.bloque_ref}
                                      </span>
                                    )}
                                    {m.cultivo_id && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                        Cultivo ID: {m.cultivo_id}
                                      </span>
                                    )}
                                  </div>
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
                                  Historial de movimientos
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

// ─── Modal Transferencia entre áreas ─────────────────────────────────────────

function TransferenciaModal({
  productoId,
  open,
  onClose,
}: {
  productoId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { catalogos, realizarTransferencia } = useInventario();
  const prod = productoId ? catalogos.find(p => p.id === productoId) : null;

  const [cantidad,      setCantidad]      = useState("");
  const [moduloOrigen,  setModuloOrigen]  = useState("");
  const [moduloDestino, setModuloDestino] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error,         setError]         = useState("");

  // Reset al abrir
  useEffect(() => {
    if (open && prod) {
      setCantidad("");
      setModuloOrigen(prod.modulo_ids[0] ?? "");
      setModuloDestino("");
      setObservaciones("");
      setError("");
    }
  }, [open, prod]);

  if (!prod) return null;

  const qty           = parseFloat(cantidad);
  const cantidadValida = !isNaN(qty) && qty > 0 && qty <= prod.cantidad_actual;
  const destinoValido  = moduloDestino && moduloDestino !== moduloOrigen;
  const puedeConfirmar = cantidadValida && destinoValido;

  // Módulos disponibles como destino (todos menos el origen)
  const todosModulos = MODULOS_OPCIONES;
  const modulosDestino = todosModulos.filter(m => m.value !== moduloOrigen);
  const destinoEsNuevo = moduloDestino && !prod.modulo_ids.includes(moduloDestino);

  const confirmar = () => {
    if (!puedeConfirmar) { setError("Completa todos los campos correctamente."); return; }
    const ok = realizarTransferencia(prod.id, qty, moduloOrigen, moduloDestino, observaciones);
    if (ok) onClose();
    else setError("No se pudo realizar la transferencia. Verifica el stock disponible.");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">↔</span> Transferencia entre áreas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Producto */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{prod.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono">{prod.codigo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{fmtNum(prod.cantidad_actual, 1)}</p>
              <p className="text-[11px] text-muted-foreground">{prod.unidad_medida} disponibles</p>
            </div>
          </div>

          {/* Origen → Destino */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Origen */}
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Select value={moduloOrigen} onValueChange={setModuloOrigen}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Área origen" />
                </SelectTrigger>
                <SelectContent>
                  {prod.modulo_ids.map(m => (
                    <SelectItem key={m} value={m}>
                      <span className="flex items-center gap-1.5">
                        <span className={MODULE_ICON_CLS[m]}>{MODULE_ICONS[m]}</span>
                        {MODULE_LABELS[m] ?? m}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flecha */}
            <div className="mt-5 text-muted-foreground text-lg font-bold">→</div>

            {/* Destino */}
            <div className="space-y-1">
              <Label className="text-xs">Hacia</Label>
              <Select value={moduloDestino} onValueChange={setModuloDestino}>
                <SelectTrigger className={cn("h-9", !moduloDestino && "text-muted-foreground")}>
                  <SelectValue placeholder="Área destino" />
                </SelectTrigger>
                <SelectContent>
                  {modulosDestino.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1.5">
                        <span className={MODULE_ICON_CLS[m.value]}>{MODULE_ICONS[m.value]}</span>
                        {m.label}
                        {!prod.modulo_ids.includes(m.value) && (
                          <span className="ml-1 text-[10px] text-primary font-medium">(nuevo)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aviso si el destino es un área nueva para este producto */}
          {destinoEsNuevo && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/30 dark:bg-blue-900/10 dark:text-blue-300">
              <AlertCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                <strong>{MODULE_LABELS[moduloDestino] ?? moduloDestino}</strong> es un área nueva para este producto.
                Al confirmar, el producto quedará disponible también en esa área.
              </p>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-1">
            <Label className="text-xs">
              Cantidad a transferir *
              <span className="ml-1 font-normal text-muted-foreground">
                (máx. {fmtNum(prod.cantidad_actual, 1)} {prod.unidad_medida})
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max={prod.cantidad_actual}
                step="any"
                value={cantidad}
                onChange={e => { setCantidad(e.target.value); setError(""); }}
                onKeyDown={e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                placeholder={`ej: ${fmtNum(prod.cantidad_actual / 2, 1)}`}
                className={cn("h-9", !cantidadValida && cantidad ? "border-red-400" : "")}
              />
              <span className="flex items-center text-sm text-muted-foreground shrink-0">
                {prod.unidad_medida}
              </span>
            </div>
            {/* Barra de progreso */}
            {cantidadValida && (
              <div className="space-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(qty / prod.cantidad_actual) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {((qty / prod.cantidad_actual) * 100).toFixed(0)}% del stock disponible
                </p>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <Label className="text-xs">Observaciones <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Motivo de la transferencia…"
              className="h-9"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!puedeConfirmar}
            onClick={confirmar}
            className="gap-1.5"
          >
            <span>↔</span> Confirmar transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conteo Físico / Ajuste masivo ───────────────────────────────────────────

const CONTEO_PAGE_SIZE  = 20; // filas por página en vista de módulo
const CONTEO_PREVIEW    = 8;  // productos visibles por sección en vista "Todos"

function ConteoFisicoView({
  onDone,
  userArea,
  isAdmin,
}: {
  onDone: () => void;
  userArea?: string;
  isAdmin: boolean;
}) {
  const { getAllProductos, registrarMovimiento } = useInventario();
  const allProductos = getAllProductos();

  // Módulos presentes en el catálogo, en orden canónico
  const modulesInCatalog = useMemo(() => {
    const set = new Set<string>();
    allProductos.forEach(p => p.modulo_ids.forEach(m => set.add(m)));
    const order = MODULOS_OPCIONES.map(o => o.value);
    return [...set].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [allProductos]);

  const defaultModulo = useMemo(() => {
    if (userArea && modulesInCatalog.includes(userArea)) return userArea;
    if (isAdmin) return "todos";
    return modulesInCatalog[0] ?? "todos";
  }, [userArea, modulesInCatalog, isAdmin]);

  const [activeModulo, setActiveModulo] = useState(defaultModulo);
  const [conteos,      setConteos]      = useState<Record<string, string>>({});
  const [search,       setSearch]       = useState("");
  const [soloDif,      setSoloDif]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const fecha = new Date().toLocaleDateString("es-CL");

  // Cambia de módulo y resetea búsqueda + página
  const switchModulo = (m: string) => {
    setActiveModulo(m);
    setSearch("");
    setCurrentPage(1);
    setSoloDif(false);
  };

  const setConteo = (id: string, v: string) =>
    setConteos(prev => ({ ...prev, [id]: v }));

  const getDif = useCallback((p: InvCatalogo) => {
    const conteo = parseFloat(conteos[p.id] ?? "");
    if (isNaN(conteo)) return null;
    return conteo - p.cantidad_actual;
  }, [conteos]);

  // Productos del módulo activo
  const productosPorModulo = useMemo(() =>
    activeModulo === "todos"
      ? allProductos
      : allProductos.filter(p => p.modulo_ids.includes(activeModulo)),
  [allProductos, activeModulo]);

  // Filtrados por búsqueda / solo-dif
  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return productosPorModulo.filter(p => {
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      if (soloDif) { const d = getDif(p); return d !== null && d !== 0; }
      return true;
    });
  }, [productosPorModulo, search, soloDif, getDif]);

  // Diferencias del scope actual (para el botón confirmar)
  const conDiferencias = useMemo(() =>
    productosPorModulo.filter(p => { const d = getDif(p); return d !== null && d !== 0; }),
  [productosPorModulo, getDif]);

  // Paginación (solo aplica en modo módulo específico)
  const totalPages      = activeModulo !== "todos" ? Math.ceil(filtrados.length / CONTEO_PAGE_SIZE) : 1;
  const paginaActual    = Math.min(currentPage, Math.max(1, totalPages));
  const filtradosPagina = activeModulo !== "todos"
    ? filtrados.slice((paginaActual - 1) * CONTEO_PAGE_SIZE, paginaActual * CONTEO_PAGE_SIZE)
    : filtrados;

  const goPage = (n: number) => setCurrentPage(Math.max(1, Math.min(n, totalPages)));

  // Conteo de diferencias por módulo (para badges de tabs)
  const difsPorModulo = useMemo(() => {
    const map: Record<string, number> = {};
    allProductos.forEach(p => {
      const d = getDif(p);
      if (d !== null && d !== 0) {
        p.modulo_ids.forEach(m => { map[m] = (map[m] ?? 0) + 1; });
      }
    });
    return map;
  }, [allProductos, getDif]);

  // Agrupado por primer modulo_id (vista "Todos")
  const groupedByModule = useMemo(() => {
    if (activeModulo !== "todos") return null;
    const map: Record<string, InvCatalogo[]> = {};
    filtrados.forEach(p => {
      const primary = p.modulo_ids[0] ?? "sin_area";
      if (!map[primary]) map[primary] = [];
      map[primary].push(p);
    });
    // Ordenar secciones según MODULOS_OPCIONES
    const order = MODULOS_OPCIONES.map(o => o.value);
    return Object.fromEntries(
      Object.entries(map).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)),
    );
  }, [activeModulo, filtrados]);

  const MAX_CONTEO = 999_999;
  const [showConfirm, setShowConfirm] = useState(false);

  // Construye el resumen para el modal de confirmación
  const resumenAjustes = conDiferencias.map(p => {
    const conteo = parseFloat(conteos[p.id] ?? "");
    const dif    = conteo - p.cantidad_actual;
    return { p, conteo, dif };
  }).filter(r => !isNaN(r.conteo) && r.conteo >= 0 && r.conteo <= MAX_CONTEO);

  const aplicarAjustes = () => {
    setLoading(true);
    resumenAjustes.forEach(({ p, conteo }) => {
      registrarMovimiento(p.id, "ajuste", "conteo_fisico", conteo, {
        observaciones: `Conteo físico — ${fecha}`,
      });
    });
    setLoading(false);
    setShowConfirm(false);
    onDone();
  };

  // ── Cabecera de tabla reutilizable ─────────────────────────────────────────
  const tableHead = (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Código</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock sistema</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground w-40">Conteo físico</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Diferencia</th>
      </tr>
    </thead>
  );

  // ── Fila de producto reutilizable ──────────────────────────────────────────
  const renderRow = (p: InvCatalogo, showModules = false) => {
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
          <p className="font-medium text-sm">{p.nombre}</p>
          {showModules && <ModuloBadges ids={p.modulo_ids} size="xs" />}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.codigo}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          <span className="font-semibold">{fmtNum(p.cantidad_actual, 1)}</span>
          <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
        </td>
        <td className="px-3 py-2">
          <Input
            type="number" min="0" max={999_999} step="any"
            value={conteos[p.id] ?? ""}
            onChange={e => {
              const val = e.target.value;
              if (val !== "" && parseFloat(val) > 999_999) return;
              setConteo(p.id, val);
            }}
            onKeyDown={e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
            placeholder={fmtNum(p.cantidad_actual, 1)}
            className={cn("h-8 text-right", hasDif ? "border-amber-400 bg-amber-50/60 dark:bg-amber-900/10 font-semibold" : "")}
          />
        </td>
        <td className="px-3 py-2 text-right">
          {dif === null ? (
            <span className="text-muted-foreground">—</span>
          ) : dif === 0 ? (
            <span className="text-green-600 text-xs">✓</span>
          ) : (
            <span className={cn("font-semibold tabular-nums text-sm", dif > 0 ? "text-green-600" : "text-red-600")}>
              {dif > 0 ? "+" : ""}{fmtNum(dif, 1)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">{p.unidad_medida}</span>
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">

      {/* ── Tabs de módulo ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isAdmin && (
          <button
            onClick={() => switchModulo("todos")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              activeModulo === "todos"
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
            <span className={cn(
              "rounded-full px-1.5 py-0 text-[10px] font-bold",
              activeModulo === "todos" ? "bg-white/20 text-background" : "bg-muted text-muted-foreground",
            )}>
              {allProductos.length}
            </span>
          </button>
        )}
        {modulesInCatalog.map(m => {
          const count = allProductos.filter(p => p.modulo_ids.includes(m)).length;
          const difs  = difsPorModulo[m] ?? 0;
          const isAct = activeModulo === m;
          return (
            <button
              key={m}
              onClick={() => switchModulo(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                isAct
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={isAct ? "opacity-80" : MODULE_ICON_CLS[m]}>
                {MODULE_ICONS[m]}
              </span>
              {MODULE_LABELS[m] ?? m}
              <span className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-bold",
                isAct ? "bg-white/20 text-background" : "bg-muted text-muted-foreground",
              )}>
                {count}
              </span>
              {difs > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-bold",
                  isAct
                    ? "bg-amber-300 text-amber-900"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                )}>
                  ⚠ {difs}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Búsqueda + filtros ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-52">
          <Input
            placeholder={`Buscar en ${activeModulo === "todos" ? "todos los productos" : (MODULE_LABELS[activeModulo] ?? activeModulo)}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={soloDif} onChange={e => setSoloDif(e.target.checked)} className="h-4 w-4 accent-primary" />
          Solo con diferencias
        </label>
        {conDiferencias.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {conDiferencias.length} diferencia{conDiferencias.length !== 1 ? "s" : ""}{activeModulo !== "todos" ? ` en ${MODULE_LABELS[activeModulo] ?? activeModulo}` : ""}
          </span>
        )}
        <p className="ml-auto text-xs text-muted-foreground">{fecha}</p>
      </div>

      {/* Instrucción */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/10 dark:text-blue-300">
        <AlertCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Ingresa el stock real contado en bodega para cada producto.
          {activeModulo !== "todos" && <> Solo se muestran productos de <strong>{MODULE_LABELS[activeModulo] ?? activeModulo}</strong>.</>}
          {" "}Solo se ajustarán los que tengan diferencias. Los campos vacíos se ignoran.
        </p>
      </div>

      {/* ── Tabla principal ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-sm">
            {tableHead}
            <tbody>

              {/* ── MODO "Todos": preview por sección + botón ir al módulo ── */}
              {activeModulo === "todos" && groupedByModule && (() => {
                const entries = Object.entries(groupedByModule);
                if (entries.length === 0)
                  return <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Sin productos</td></tr>;

                return entries.map(([modulo, prods]) => {
                  const difsSection  = prods.filter(p => { const d = getDif(p); return d !== null && d !== 0; }).length;
                  const preview      = prods.slice(0, CONTEO_PREVIEW);
                  const remaining    = prods.length - CONTEO_PREVIEW;
                  const allCounted   = prods.every(p => conteos[p.id]);

                  return (
                    <Fragment key={modulo}>
                      {/* Fila divisora */}
                      <tr className={cn("border-b border-t border-border", MODULE_BG_CLS[modulo] ?? "bg-muted/40")}>
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("flex h-5 w-5 items-center justify-center rounded", MODULE_BG_CLS[modulo] ?? "bg-muted")}>
                              <span className={MODULE_ICON_CLS[modulo] ?? "text-muted-foreground"}>{MODULE_ICONS[modulo]}</span>
                            </span>
                            <span className="font-semibold text-xs">{MODULE_LABELS[modulo] ?? modulo}</span>
                            <span className="text-[11px] text-muted-foreground">· {prods.length} producto{prods.length !== 1 ? "s" : ""}</span>
                            {difsSection > 0 && (
                              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                · ⚠ {difsSection} diferencia{difsSection !== 1 ? "s" : ""}
                              </span>
                            )}
                            {difsSection === 0 && allCounted && (
                              <span className="text-[11px] font-medium text-green-600">· ✓ Contado</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Primeros CONTEO_PREVIEW productos */}
                      {preview.map(p => renderRow(p, false))}

                      {/* Fila CTA si hay más productos */}
                      {remaining > 0 && (
                        <tr className="border-b border-border/40 bg-muted/20">
                          <td colSpan={5} className="px-4 py-2.5">
                            <button
                              onClick={() => switchModulo(modulo)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              <span className={MODULE_ICON_CLS[modulo]}>{MODULE_ICONS[modulo]}</span>
                              Ver los {remaining} producto{remaining !== 1 ? "s" : ""} restantes de {MODULE_LABELS[modulo] ?? modulo} →
                            </button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                });
              })()}

              {/* ── MODO módulo específico: tabla paginada ── */}
              {activeModulo !== "todos" && (() => {
                if (filtradosPagina.length === 0)
                  return (
                    <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      {filtrados.length === 0
                        ? `Sin productos${search ? " que coincidan con la búsqueda" : " en esta área"}`
                        : "Sin resultados en esta página"}
                    </td></tr>
                  );
                return filtradosPagina.map(p => renderRow(p, false));
              })()}

            </tbody>
          </table>
        </div>

        {/* ── Paginación (solo modo módulo específico) ── */}
        {activeModulo !== "todos" && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              {filtrados.length === 0 ? "0 productos" : (
                <>
                  <span className="font-medium">{(paginaActual - 1) * CONTEO_PAGE_SIZE + 1}–{Math.min(paginaActual * CONTEO_PAGE_SIZE, filtrados.length)}</span>
                  {" de "}<span className="font-medium">{filtrados.length}</span> productos
                </>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goPage(paginaActual - 1)}
                disabled={paginaActual <= 1}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              {/* Números de página */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - paginaActual) <= 1)
                .reduce<(number | "…")[]>((acc, n, i, arr) => {
                  if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goPage(item as number)}
                      className={cn(
                        "min-w-[28px] rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        paginaActual === item
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {item}
                    </button>
                  )
                )
              }
              <button
                onClick={() => goPage(paginaActual + 1)}
                disabled={paginaActual >= totalPages}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Conteo rápido sin paginación */}
        {activeModulo !== "todos" && totalPages <= 1 && filtrados.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {filtrados.length} producto{filtrados.length !== 1 ? "s" : ""} en {MODULE_LABELS[activeModulo] ?? activeModulo}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          {conDiferencias.length === 0
            ? "Sin diferencias — el stock del sistema coincide con el conteo."
            : <span className="font-medium text-amber-700 dark:text-amber-400">
                {conDiferencias.length} producto{conDiferencias.length !== 1 ? "s" : ""} con diferencia
                {activeModulo !== "todos" ? ` en ${MODULE_LABELS[activeModulo] ?? activeModulo}` : ""}.
              </span>
          }
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDone}>Cancelar</Button>
          <Button
            size="sm"
            disabled={conDiferencias.length === 0 || loading}
            onClick={() => setShowConfirm(true)}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-4 w-4" />
            Confirmar ajuste ({conDiferencias.length})
          </Button>
        </div>
      </div>

      {/* ── Modal de confirmación con resumen ── */}
      <Dialog open={showConfirm} onOpenChange={v => { if (!v) setShowConfirm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Resumen del conteo físico
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Se registrarán los siguientes ajustes de stock con fecha <strong>{fecha}</strong>:
            </p>

            {/* Tabla de ajustes */}
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Sistema</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Conteo</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenAjustes.map(({ p, conteo, dif }) => (
                    <tr key={p.id} className={cn(
                      "border-b border-border/50 last:border-0",
                      dif > 0 ? "bg-green-50/30 dark:bg-green-900/10" : "bg-red-50/30 dark:bg-red-900/10",
                    )}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{p.nombre}</p>
                        <ModuloBadges ids={p.modulo_ids} size="xs" />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {fmtNum(p.cantidad_actual, 1)} {p.unidad_medida}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {fmtNum(conteo, 1)} {p.unidad_medida}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-bold",
                        dif > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                      )}>
                        {dif > 0 ? "+" : ""}{fmtNum(dif, 1)} {p.unidad_medida}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales por tipo */}
                {resumenAjustes.length > 1 && (() => {
                  const ganancias = resumenAjustes.filter(r => r.dif > 0).length;
                  const perdidas  = resumenAjustes.filter(r => r.dif < 0).length;
                  return (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={4} className="px-3 py-2 text-[11px] text-muted-foreground">
                          {ganancias > 0 && <span className="text-green-600 font-medium mr-3">↑ {ganancias} con sobrante</span>}
                          {perdidas  > 0 && <span className="text-red-600 font-medium">↓ {perdidas} con faltante</span>}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Esta acción es irreversible. Los movimientos quedarán registrados en el historial de inventario.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
              Revisar
            </Button>
            <Button size="sm" className="gap-1.5" onClick={aplicarAjustes} disabled={loading}>
              <ClipboardCheck className="h-4 w-4" />
              Aplicar {resumenAjustes.length} ajuste{resumenAjustes.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Kardex por producto — Informe modal ─────────────────────────────────────

function KardexSheet({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const { catalogos, getMovimientosByProducto } = useInventario();

  // Estados — deben ir ANTES de cualquier return condicional
  const [expanded,   setExpanded]   = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filterTipo, setFilterTipo] = useState<"all" | InvMovimientoTipo>("all");
  const [filterLote, setFilterLote] = useState("all");
  const [kardexSearch, setKardexSearch] = useState("");

  const p = productId ? catalogos.find(x => x.id === productId) : null;

  if (!p) return (
    <Dialog open={productId !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg"><p className="text-sm text-muted-foreground">Producto no encontrado.</p></DialogContent>
    </Dialog>
  );

  const movs = getMovimientosByProducto(p.id)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at));

  const precio = p.precio_unitario;

  // Presets de fechas
  const applyPreset = (preset: "hoy" | "mes" | "trimestre" | "anio" | "todo") => {
    const hoy   = new Date();
    const iso   = (d: Date) => d.toISOString().substring(0, 10);
    const hasta = iso(hoy);
    if (preset === "todo")      { setFechaDesde(""); setFechaHasta(""); return; }
    if (preset === "hoy")       { setFechaDesde(hasta); setFechaHasta(hasta); return; }
    if (preset === "mes")       { setFechaDesde(iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1))); setFechaHasta(hasta); return; }
    if (preset === "trimestre") { setFechaDesde(iso(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1))); setFechaHasta(hasta); return; }
    if (preset === "anio")      { setFechaDesde(iso(new Date(hoy.getFullYear(), 0, 1))); setFechaHasta(hasta); return; }
  };

  type KardexRow = {
    fecha: string; concepto: string; tipo: InvMovimientoTipo; loteNumero?: string; origen?: string;
    entQ?: number; entP?: number; entTotal?: number;
    salQ?: number; salP?: number; salTotal?: number;
    saldoQ: number; saldoP: number; saldoTotal: number;
  };

  let saldoQ = 0;
  const rows: KardexRow[] = movs.map(m => {
    const delta     = m.cantidad_nueva - m.cantidad_anterior;
    const esEntrada = m.tipo === "entrada" || (m.tipo === "ajuste" && delta > 0);
    const esSalida  = m.tipo === "salida"  || (m.tipo === "ajuste" && delta < 0);
    const qty       = m.tipo === "ajuste" ? Math.abs(delta) : m.cantidad;
    const p_unit    = m.precio_unitario ?? precio;
    saldoQ = m.cantidad_nueva;
    const concepto  = m.registro_origen_tipo
      ? `${m.registro_origen_tipo} (auto)`
      : m.observaciones ?? m.subtipo.replace(/_/g, " ");
    return {
      fecha: m.fecha, concepto, tipo: m.tipo, loteNumero: m.lote_numero, origen: m.registro_origen_tipo,
      entQ:     esEntrada ? qty     : undefined,
      entP:     esEntrada ? p_unit  : undefined,
      entTotal: esEntrada ? qty * p_unit : undefined,
      salQ:     esSalida  ? qty     : undefined,
      salP:     esSalida  ? p_unit  : undefined,
      salTotal: esSalida  ? qty * p_unit : undefined,
      saldoQ, saldoP: precio, saldoTotal: saldoQ * precio,
    };
  });

  // Filtro de fechas — solo para la visualización; el saldo acumulado se mantiene
  const loteOptions = Array.from(new Set(rows.map(r => r.loteNumero).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b));

  const rowsFiltrados = rows.filter(r => {
    if (fechaDesde && r.fecha < fechaDesde) return false;
    if (fechaHasta && r.fecha > fechaHasta) return false;
    if (filterTipo !== "all" && r.tipo !== filterTipo) return false;
    if (filterLote !== "all" && r.loteNumero !== filterLote) return false;
    const q = kardexSearch.trim().toLowerCase();
    if (q && !`${r.concepto} ${r.origen ?? ""} ${r.loteNumero ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Saldo de apertura (último saldo antes de fechaDesde)
  const saldoApertura = fechaDesde
    ? (rows.filter(r => r.fecha < fechaDesde).at(-1)?.saldoQ ?? 0)
    : null;

  const displayRows  = rowsFiltrados;
  const hayFiltro    = !!(fechaDesde || fechaHasta || filterTipo !== "all" || filterLote !== "all" || kardexSearch.trim());
  const activePreset = (() => {
    const hoy = new Date();
    const iso = (d: Date) => d.toISOString().substring(0, 10);
    const today = iso(hoy);
    if (!fechaDesde && !fechaHasta) return "todo";
    if (fechaDesde === today && fechaHasta === today) return "hoy";
    if (fechaDesde === iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)) && fechaHasta === today) return "mes";
    if (fechaDesde === iso(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)) && fechaHasta === today) return "trimestre";
    if (fechaDesde === iso(new Date(hoy.getFullYear(), 0, 1)) && fechaHasta === today) return "anio";
    return "custom";
  })();
  const limpiarFiltros = () => {
    applyPreset("todo");
    setFilterTipo("all");
    setFilterLote("all");
    setKardexSearch("");
  };

  const totalEntQ   = displayRows.reduce((s, r) => s + (r.entQ   ?? 0), 0);
  const totalEntVal = displayRows.reduce((s, r) => s + (r.entTotal ?? 0), 0);
  const totalSalQ   = displayRows.reduce((s, r) => s + (r.salQ   ?? 0), 0);
  const totalSalVal = displayRows.reduce((s, r) => s + (r.salTotal ?? 0), 0);
  const valorTotal  = saldoQ * precio;

  const exportarKardex = () => {
    const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");
    exportToCsv(
      displayRows.map(r => ({
        fecha:         r.fecha,
        concepto:      r.concepto,
        entrada_cant:  r.entQ   ?? "",
        entrada_precio:r.entP   ?? "",
        entrada_total: r.entTotal ?? "",
        salida_cant:   r.salQ   ?? "",
        salida_precio: r.salP   ?? "",
        salida_total:  r.salTotal ?? "",
        saldo_cant:    r.saldoQ,
        saldo_precio:  r.saldoP,
        saldo_total:   r.saldoTotal,
      })),
      [
        { key: "fecha",          label: "Fecha" },
        { key: "concepto",       label: "Concepto" },
        { key: "entrada_cant",   label: "Entrada Cant." },
        { key: "entrada_precio", label: "Entrada P.Unit." },
        { key: "entrada_total",  label: "Entrada Total" },
        { key: "salida_cant",    label: "Salida Cant." },
        { key: "salida_precio",  label: "Salida P.Unit." },
        { key: "salida_total",   label: "Salida Total" },
        { key: "saldo_cant",     label: "Saldo Cant." },
        { key: "saldo_precio",   label: "Saldo P.Unit." },
        { key: "saldo_total",    label: "Saldo Total" },
      ],
      `kardex-${p.codigo}-${fecha}.csv`,
    );
  };

  return (
    <Dialog open={productId !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className={cn(
        "flex flex-col gap-0 p-0 overflow-hidden transition-all duration-200",
        expanded
          ? "max-w-[100vw] w-screen h-screen max-h-screen rounded-none"
          : "max-w-[95vw] w-full xl:max-w-6xl max-h-[92vh]",
      )}>

        {/* ── Encabezado del informe ─────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Historial de movimientos — Kardex</h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-foreground">{p.nombre}</span>
                <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                {p.categoria && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">{p.categoria}</span>}
                <ModuloBadges ids={p.modulo_ids} size="xs" />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>Precio unitario: <strong className="text-foreground">{fmtCurrency(precio)}</strong></span>
                <span>Unidad: <strong className="text-foreground">{p.unidad_medida}</strong></span>
                <span>Ubicación: <strong className="text-foreground">{p.ubicacion_fisica || "—"}</strong></span>
                <span>Generado: <strong className="text-foreground">{new Date().toLocaleDateString("es-CL")}</strong></span>
              </div>
            </div>
            {/* Acciones */}
            <div className="flex items-center gap-2 shrink-0 mr-8">
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={exportarKardex}>
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => window.print()}>
                <BookOpen className="h-3.5 w-3.5" /> Imprimir
              </Button>
              <button
                onClick={() => setExpanded(v => !v)}
                title={expanded ? "Restaurar tamaño" : "Expandir a pantalla completa"}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* ── Filtro de fechas ─────────────────────────────────────────────── */}
          <div className="mt-4 rounded-xl border border-border bg-background/85 p-3 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Periodo
                </div>
                {([
                  { key: "todo", label: "Todo" },
                  { key: "hoy", label: "Hoy" },
                  { key: "mes", label: "Este mes" },
                  { key: "trimestre", label: "3 meses" },
                  { key: "anio", label: "Este año" },
                ] as const).map(preset => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activePreset === preset.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2 py-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Desde</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    className="h-7 w-32 bg-transparent text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2 py-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Hasta</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    className="h-7 w-32 bg-transparent text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[160px_180px_1fr_auto]">
              <Select value={filterTipo} onValueChange={v => setFilterTipo(v as "all" | InvMovimientoTipo)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="salida">Salidas</SelectItem>
                  <SelectItem value="ajuste">Ajustes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLote} onValueChange={setFilterLote}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Lote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los lotes</SelectItem>
                  {loteOptions.length === 0 ? (
                    <SelectItem value="__none" disabled>Sin lotes asociados</SelectItem>
                  ) : loteOptions.map(lote => (
                    <SelectItem key={lote} value={lote}>{lote}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={kardexSearch}
                  onChange={e => setKardexSearch(e.target.value)}
                  placeholder="Buscar concepto, origen o lote..."
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {displayRows.length} de {rows.length}
                </span>
                {hayFiltro && (
                  <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-xs" onClick={limpiarFiltros}>
                    <X className="h-3.5 w-3.5" /> Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Período:</span>
            {/* Presets rápidos */}
            {([
              { key: "todo",      label: "Todo" },
              { key: "mes",       label: "Este mes" },
              { key: "trimestre", label: "Últimos 3 meses" },
              { key: "anio",      label: "Este año" },
            ] as const).map(preset => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.key)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  !hayFiltro && preset.key === "todo"
                    ? "border-primary bg-primary/10 text-primary"
                    : hayFiltro && preset.key !== "todo"
                      ? "border-border text-muted-foreground hover:border-primary/50"
                      : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {preset.label}
              </button>
            ))}
            {/* Separador */}
            <span className="h-4 w-px bg-border" />
            {/* Rango manual */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-muted-foreground">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-muted-foreground">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {hayFiltro && (
              <button
                type="button"
                onClick={() => applyPreset("todo")}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
            {hayFiltro && (
              <span className="ml-1 text-[11px] text-muted-foreground">
                — {displayRows.length} movimiento{displayRows.length !== 1 ? "s" : ""} en el período
              </span>
            )}
          </div>

          {/* ── KPIs de resumen ─────────────────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total entradas",
                qty:   `${fmtNum(totalEntQ, 1)} ${p.unidad_medida}`,
                valor: fmtCurrency(totalEntVal),
                cls:   "border-green-200 bg-green-50/60 dark:border-green-800/30 dark:bg-green-900/10",
                qcls:  "text-green-700 dark:text-green-400",
              },
              {
                label: "Total salidas",
                qty:   `${fmtNum(totalSalQ, 1)} ${p.unidad_medida}`,
                valor: fmtCurrency(totalSalVal),
                cls:   "border-red-200 bg-red-50/60 dark:border-red-800/30 dark:bg-red-900/10",
                qcls:  "text-red-700 dark:text-red-400",
              },
              {
                label: "Saldo actual",
                qty:   `${fmtNum(saldoQ, 1)} ${p.unidad_medida}`,
                valor: fmtCurrency(valorTotal),
                cls:   "border-blue-200 bg-blue-50/60 dark:border-blue-800/30 dark:bg-blue-900/10",
                qcls:  "text-blue-700 dark:text-blue-400",
              },
              {
                label: "Movimientos",
                qty:   `${rows.length} registro${rows.length !== 1 ? "s" : ""}`,
                valor: rows.length > 0 ? `Último: ${rows[rows.length - 1].fecha}` : "Sin movimientos",
                cls:   "border-border bg-muted/30",
                qcls:  "text-foreground",
              },
            ].map(k => (
              <div key={k.label} className={cn("rounded-xl border px-3 py-2.5", k.cls)}>
                <p className="text-[11px] text-muted-foreground mb-0.5">{k.label}</p>
                <p className={cn("text-sm font-bold", k.qcls)}>{k.qty}</p>
                <p className="text-[11px] text-muted-foreground">{k.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabla Kardex ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">Los movimientos aparecerán aquí una vez que se registren entradas o salidas.</p>
            </div>
          ) : displayRows.length === 0 && hayFiltro ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Sin movimientos en ese período</p>
              <p className="text-xs text-muted-foreground mt-1">Prueba con un rango de fechas diferente o selecciona "Todo".</p>
            </div>
          ) : (
            <table className="w-full min-w-[780px] text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b-2 border-border bg-background">
                  <th rowSpan={2} className="border border-border px-3 py-2 text-left font-semibold bg-muted/60 w-24">Fecha</th>
                  <th rowSpan={2} className="border border-border px-3 py-2 text-left font-semibold bg-muted/60">Concepto</th>
                  <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">ENTRADAS</th>
                  <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20">SALIDAS</th>
                  <th colSpan={3} className="border border-border px-3 py-1.5 text-center font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">SALDO</th>
                </tr>
                <tr className="border-b border-border">
                  {(["Cant.", "P.Unit.", "Total", "Cant.", "P.Unit.", "Total", "Cant.", "P.Unit.", "Total"] as const).map((h, i) => (
                    <th key={i} className={cn(
                      "border border-border px-2 py-1.5 text-right font-semibold text-muted-foreground text-[11px]",
                      i < 3 ? "bg-green-50/70 dark:bg-green-900/10" :
                      i < 6 ? "bg-red-50/70 dark:bg-red-900/10"   :
                               "bg-blue-50/70 dark:bg-blue-900/10",
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Fila de saldo de apertura (si hay filtro desde una fecha) */}
                {saldoApertura !== null && (
                  <tr className="border-b border-border bg-blue-50/40 dark:bg-blue-900/10">
                    <td className="border border-border/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">{fechaDesde}</td>
                    <td className="border border-border/30 px-3 py-2 italic text-muted-foreground" colSpan={7}>
                      Saldo de apertura al inicio del período
                    </td>
                    <td className="border border-border/30 px-2 py-2 text-right font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtNum(saldoApertura, 1)}</td>
                    <td className="border border-border/30 px-2 py-2 text-right text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtCurrency(precio)}</td>
                    <td className="border border-border/30 px-2 py-2 text-right font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtCurrency(saldoApertura * precio)}</td>
                  </tr>
                )}
                {displayRows.map((r, i) => (
                  <tr key={i} className={cn(
                    "border-b border-border/40 hover:bg-primary/5 transition-colors",
                    i % 2 !== 0 && "bg-muted/20",
                  )}>
                    <td className="border border-border/30 px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{r.fecha}</td>
                    <td className="border border-border/30 px-3 py-2.5 max-w-[200px]">
                      <span className="truncate block" title={r.concepto}>{r.concepto}</span>
                    </td>
                    {/* Entradas */}
                    <td className="border border-border/30 px-2 py-2.5 text-right text-green-700 dark:text-green-400 bg-green-50/30 tabular-nums">{r.entQ !== undefined ? fmtNum(r.entQ, 1) : ""}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right text-green-700 dark:text-green-400 bg-green-50/30 tabular-nums">{r.entP !== undefined ? fmtCurrency(r.entP) : ""}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right font-semibold text-green-700 dark:text-green-400 bg-green-50/30 tabular-nums">{r.entTotal !== undefined ? fmtCurrency(r.entTotal) : ""}</td>
                    {/* Salidas */}
                    <td className="border border-border/30 px-2 py-2.5 text-right text-red-700 dark:text-red-400 bg-red-50/30 tabular-nums">{r.salQ !== undefined ? fmtNum(r.salQ, 1) : ""}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right text-red-700 dark:text-red-400 bg-red-50/30 tabular-nums">{r.salP !== undefined ? fmtCurrency(r.salP) : ""}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right font-semibold text-red-700 dark:text-red-400 bg-red-50/30 tabular-nums">{r.salTotal !== undefined ? fmtCurrency(r.salTotal) : ""}</td>
                    {/* Saldo */}
                    <td className="border border-border/30 px-2 py-2.5 text-right font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtNum(r.saldoQ, 1)}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtCurrency(r.saldoP)}</td>
                    <td className="border border-border/30 px-2 py-2.5 text-right font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 tabular-nums">{fmtCurrency(r.saldoTotal)}</td>
                  </tr>
                ))}
                {/* Totales */}
                <tr className="border-t-2 border-border bg-muted/50 font-bold sticky bottom-0">
                  <td colSpan={2} className="border border-border px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">TOTALES</td>
                  <td className="border border-border px-2 py-2.5 text-right tabular-nums text-green-700 dark:text-green-400">{fmtNum(totalEntQ, 1)}</td>
                  <td className="border border-border px-2 py-2.5 bg-green-50/40" />
                  <td className="border border-border px-2 py-2.5 text-right font-bold tabular-nums text-green-700 dark:text-green-400">{fmtCurrency(totalEntVal)}</td>
                  <td className="border border-border px-2 py-2.5 text-right tabular-nums text-red-700 dark:text-red-400">{fmtNum(totalSalQ, 1)}</td>
                  <td className="border border-border px-2 py-2.5 bg-red-50/40" />
                  <td className="border border-border px-2 py-2.5 text-right font-bold tabular-nums text-red-700 dark:text-red-400">{fmtCurrency(totalSalVal)}</td>
                  <td className="border border-border px-2 py-2.5 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">{fmtNum(saldoQ, 1)}</td>
                  <td className="border border-border px-2 py-2.5 bg-blue-50/40" />
                  <td className="border border-border px-2 py-2.5 text-right font-bold tabular-nums text-blue-700 dark:text-blue-400">{fmtCurrency(valorTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ─── Buscador global de lotes ─────────────────────────────────────────────────
// Permite ubicar un número de lote específico en TODO el inventario sin tener
// que navegar producto por producto — útil ante alertas sanitarias, reclamos
// de proveedor o trazabilidad regulatoria ("¿en qué producto está el lote X?").
function BuscadorLotesGlobal({ onSelect }: { onSelect: (productoId: string, loteNumero: string) => void }) {
  const { lotes, catalogos } = useInventario();
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return lotes
      .filter(l => l.numero_lote.toLowerCase().includes(q))
      .map(l => ({ lote: l, producto: catalogos.find(c => c.id === l.catalogo_id) }))
      .filter((r): r is { lote: InvLote; producto: InvCatalogo } => !!r.producto)
      .sort((a, b) => a.lote.numero_lote.localeCompare(b.lote.numero_lote))
      .slice(0, 8);
  }, [lotes, catalogos, query]);

  // Cerrar el desplegable al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const elegir = (productoId: string, loteNumero: string) => {
    onSelect(productoId, loteNumero);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar lote por número…"
        className="h-9 pl-8 text-sm"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full sm:w-80 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {resultados.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Sin coincidencias para «{query}»
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {resultados.map(({ lote, producto }) => {
                const dias = Math.ceil((new Date(lote.fecha_vencimiento).getTime() - Date.now()) / 86_400_000);
                return (
                  <button
                    key={lote.id}
                    onClick={() => elegir(producto.id, lote.numero_lote)}
                    className="flex w-full items-center gap-2.5 border-b border-border/50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-bold">{lote.numero_lote}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {producto.nombre} · {fmtNum(lote.cantidad_actual, 1)} {producto.unidad_medida}
                        {dias >= 0 ? ` · vence en ${dias}d` : ` · vencido hace ${Math.abs(dias)}d`}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      lote.activo
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground",
                    )}>
                      {lote.activo ? "Activo" : "Inactivo"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t border-border/50 bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
            Buscando en {lotes.length} lote{lotes.length !== 1 ? "s" : ""} de todo el inventario
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QuickEntryCell — entrada rápida inline en la vista lista ─────────────────

function QuickEntryCell({
  productoId, unidad, onMovimiento,
}: {
  productoId: string;
  unidad: string;
  onMovimiento: (id: string, tipo: InvMovimientoTipo) => void;
}) {
  const [qty, setQty] = useState("");
  const { registrarMovimiento } = useInventario();

  const handleEntrada = (e: React.MouseEvent) => {
    e.stopPropagation();
    const n = parseFloat(qty.replace(",", "."));
    if (!qty.trim() || isNaN(n) || n <= 0) {
      // Si no hay cantidad, abre el modal completo
      onMovimiento(productoId, "entrada");
      return;
    }
    registrarMovimiento(productoId, "entrada", "compra", n, {});
    setQty("");
  };

  return (
    <div className="inline-flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <input
        type="number"
        min="0"
        step="any"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleEntrada(e as unknown as React.MouseEvent); }}
        placeholder={`cant. (${unidad})`}
        className="h-7 w-28 rounded-md border border-border bg-background px-2 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        onClick={handleEntrada}
        title={qty.trim() ? "Registrar entrada rápida" : "Abrir formulario completo"}
        className="h-7 inline-flex items-center gap-1 rounded-md bg-green-600 px-2 text-[11px] font-medium text-white hover:bg-green-700 transition-colors"
      >
        <ArrowDown className="h-3 w-3" />
        {qty.trim() ? "Entrada" : "+ Entrada"}
      </button>
    </div>
  );
}

// ─── ProveedoresView ──────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { id: "laboratorio",  label: "Laboratorio" },
  { id: "vivero",       label: "Vivero" },
  { id: "cultivo",      label: "Cultivo" },
  { id: "post_cosecha", label: "Post-cosecha" },
  { id: "comercial",    label: "Comercial" },
  { id: "rrhh",         label: "Recursos Humanos" },
];

type ProvForm = { nombre: string; ruc: string; autorizado: boolean; modulo_ids: string[]; notas: string };
const EMPTY_PROV: ProvForm = { nombre: "", ruc: "", autorizado: true, modulo_ids: [], notas: "" };

function ProveedoresView() {
  const { proveedores, agregarProveedor, editarProveedor, eliminarProveedor } = useInventario();
  const { hierarchyLevel } = useRole();
  const canAdmin = hierarchyLevel >= 4;

  const [search, setSearch]           = useState("");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState<InvProveedor | null>(null);
  const [form, setForm]               = useState<ProvForm>(EMPTY_PROV);
  const [confirmDel, setConfirmDel]   = useState<InvProveedor | null>(null);

  const filtered = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.ruc.includes(search),
  );

  const openNew = () => { setEditing(null); setForm(EMPTY_PROV); setDialogOpen(true); };
  const openEdit = (p: InvProveedor) => {
    setEditing(p);
    setForm({ nombre: p.nombre, ruc: p.ruc, autorizado: p.autorizado, modulo_ids: p.modulo_ids, notas: p.notas ?? "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim()) return;
    if (editing) {
      editarProveedor(editing.id, form);
    } else {
      agregarProveedor(form);
    }
    setDialogOpen(false);
  };

  const toggleModulo = (id: string) => {
    setForm(f => ({
      ...f,
      modulo_ids: f.modulo_ids.includes(id) ? f.modulo_ids.filter(m => m !== id) : [...f.modulo_ids, id],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RUC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {canAdmin && (
          <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Proveedor</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">RUC</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Áreas</th>
              {canAdmin && <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canAdmin ? 5 : 4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {search ? "Sin resultados para esa búsqueda." : "No hay proveedores registrados."}
                </td>
              </tr>
            ) : filtered.map(prov => (
              <tr key={prov.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{prov.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{prov.ruc || <span className="italic text-muted-foreground/50">—</span>}</td>
                <td className="px-4 py-3">
                  {prov.autorizado ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <ShieldCheck className="h-3 w-3" /> Autorizado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <ShieldOff className="h-3 w-3" /> No autorizado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {prov.modulo_ids.length === 0
                      ? <span className="text-muted-foreground/50 italic text-xs">—</span>
                      : prov.modulo_ids.map(id => {
                          const m = MODULE_OPTIONS.find(o => o.id === id);
                          return (
                            <span key={id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {m?.label ?? id}
                            </span>
                          );
                        })
                    }
                  </div>
                </td>
                {canAdmin && (
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(prov)}
                        className="h-7 w-7 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDel(prov)}
                        className="h-7 w-7 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. AgroquímPro S.A."
                className="h-9"
              />
            </div>

            {/* RUC + Estado en la misma fila, alineados */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RUC</Label>
                <Input
                  value={form.ruc}
                  onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))}
                  placeholder="20100123456"
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</Label>
                <div className="flex h-9 rounded-lg border border-border bg-muted p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, autorizado: true }))}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                      form.autorizado
                        ? "bg-background shadow text-green-700 dark:text-green-400"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, autorizado: false }))}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                      !form.autorizado
                        ? "bg-background shadow text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> No
                  </button>
                </div>
              </div>
            </div>

            {/* Áreas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Áreas que abastece
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {MODULE_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModulo(m.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      form.modulo_ids.includes(m.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {form.modulo_ids.includes(m.id) && <Check className="h-3 w-3 shrink-0" />}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</Label>
              <textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones opcionales…"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nombre.trim()}>
              {editing ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm eliminar */}
      <Dialog open={!!confirmDel} onOpenChange={v => { if (!v) setConfirmDel(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar proveedor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará <strong>{confirmDel?.nombre}</strong> del registro. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (confirmDel) { eliminarProveedor(confirmDel.id); setConfirmDel(null); } }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Inventario() {
  const navigate = useNavigate();
  const { hierarchyLevel, currentUser } = useRole();
  const {
    getAllProductos, movimientos, getAlertas, getAlertasVencimiento,
    catalogos, lotes, desactivarProducto, registrarMovimiento,
  } = useInventario();
  const [searchParams] = useSearchParams();

  const isAdmin   = hierarchyLevel >= 4;
  const userArea  = currentUser?.area_asignada;

  // Auto-filtrar por área del usuario si es un rol operativo (< productor)
  const moduloParam = searchParams.get("modulo") ??
    (userArea && hierarchyLevel < 4 ? userArea : "all");

  // ── Tab principal ─────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<"stock" | "movimientos" | "conteo" | "proveedores">("stock");

  // ── Navegación: "Ver historial de este lote" desde el detalle de un producto ──
  // Salta al tab "Movimientos" (la vista que concentra TODO el historial) ya
  // pre-filtrada por producto + lote, en vez de duplicar la tabla dentro del sheet.
  const [movFiltroInicial, setMovFiltroInicial] = useState<{ productoId: string; loteNumero: string } | null>(null);
  const irAHistorialDeLote = (productoId: string, loteNumero: string) => {
    setMovFiltroInicial({ productoId, loteNumero });
    setMainTab("movimientos");
    setDetalleOpen(false);
  };

  // ── Filters (stock tab) ───────────────────────────────────────────────────
  const [search,         setSearch]         = useState("");
  const [filterModulo,   setFilterModulo]   = useState(moduloParam);
  const [filterEstado,   setFilterEstado]   = useState("all");
  const [viewMode,       setViewMode]       = useState<"grid" | "list">("list");
  const [showInactivos,  setShowInactivos]  = useState(false);
  // Modo carga masiva
  const [bulkMode,  setBulkMode]  = useState(false);
  const [bulkQtys,  setBulkQtys]  = useState<Record<string, string>>({});
  const [bulkTipo,  setBulkTipo]  = useState<"entrada" | "salida">("entrada");
  const [bulkPos,   setBulkPos]   = useState<{ x: number; y: number } | null>(null);
  const bulkDragOffset = useRef<{ dx: number; dy: number } | null>(null);

  const bulkPendientes = Object.entries(bulkQtys).filter(([, v]) => {
    const n = parseFloat(v.replace(",", "."));
    return !isNaN(n) && n > 0;
  });

  const confirmarBulk = () => {
    bulkPendientes.forEach(([id, v]) => {
      const n = parseFloat(v.replace(",", "."));
      registrarMovimiento(id, bulkTipo, bulkTipo === "entrada" ? "compra" : "uso_produccion", n, {});
    });
    setBulkQtys({});
    setBulkMode(false);
    setBulkPos(null);
  };

  const cancelarBulk = () => { setBulkQtys({}); setBulkMode(false); setBulkPos(null); };
  // Confirmación activar/desactivar
  const [confirmProd,    setConfirmProd]    = useState<InvCatalogo | null>(null);

  // ── Overlays ──────────────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detalleOpen,   setDetalleOpen]   = useState(false);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProd,    setEditingProd]    = useState<InvCatalogo | null>(null);
  const [modalId,       setModalId]       = useState<string | null>(null);
  const [modalTipo,     setModalTipo]     = useState<InvMovimientoTipo>("entrada");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [kardexId,      setKardexId]      = useState<string | null>(null);
  const [transferirId,  setTransferirId]  = useState<string | null>(null);

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
  const visibleCatalogos = useMemo(() => {
    const clienteId = currentUser?.clienteId ? String(currentUser.clienteId) : null;
    const productorId = currentUser?.productorId ? String(currentUser.productorId) : null;
    return catalogos.filter(p => {
      if (clienteId && p.cliente_id !== clienteId) return false;
      if (productorId && p.productor_id !== productorId) return false;
      return true;
    });
  }, [catalogos, currentUser?.clienteId, currentUser?.productorId]);
  const executiveScope = useMemo(
    () => filterModulo !== "all"
      ? visibleCatalogos.filter(p => p.modulo_ids.includes(filterModulo))
      : visibleCatalogos,
    [filterModulo, visibleCatalogos],
  );
  const executiveKpis = useMemo(() => {
    const active = executiveScope.filter(p => p.activo);
    const scopeIds = new Set(executiveScope.map(p => p.id));
    const activeIds = new Set(active.map(p => p.id));
    const activeLotProductIds = new Set(
      lotes
        .filter(l => l.activo && l.cantidad_actual > 0 && activeIds.has(l.catalogo_id))
        .map(l => l.catalogo_id),
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lotesPorVencer = lotes.filter(l => {
      if (!l.activo || l.cantidad_actual <= 0 || !scopeIds.has(l.catalogo_id)) return false;
      const vence = new Date(l.fecha_vencimiento);
      if (isNaN(vence.getTime())) return false;
      const dias = Math.ceil((vence.getTime() - today.getTime()) / 86_400_000);
      return dias <= 90;
    }).length;
    const productosSinLote = active.filter(p => !activeLotProductIds.has(p.id)).length;
    const productosInactivos = executiveScope.filter(p => !p.activo).length;

    return {
      valor: active.reduce((s, p) => s + p.cantidad_actual * p.precio_promedio_ponderado, 0),
      criticos: active.filter(p => getStockStatus(p) === "critico").length,
      lotesPorVencer,
      movimientosMes: movimientos.filter(m => m.fecha.startsWith(currentMonth) && scopeIds.has(m.catalogo_id)).length,
      pendientes: productosInactivos + productosSinLote,
      productosInactivos,
      productosSinLote,
      productosActivos: active.length,
    };
  }, [currentMonth, executiveScope, lotes, movimientos]);

  const contextualAlerts = useMemo(() => {
    const active = executiveScope.filter(p => p.activo);
    const scopeIds = new Set(active.map(p => p.id));
    const reposicion = active.filter(p => {
      const status = getStockStatus(p);
      return status === "critico" || status === "bajo";
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lotesSemana = lotes
      .filter(l => l.activo && l.cantidad_actual > 0 && scopeIds.has(l.catalogo_id))
      .map(l => {
        const vence = new Date(l.fecha_vencimiento);
        vence.setHours(0, 0, 0, 0);
        const dias = Math.ceil((vence.getTime() - today.getTime()) / 86_400_000);
        return { lote: l, dias };
      })
      .filter(x => x.dias <= 7)
      .sort((a, b) => a.dias - b.dias);

    return {
      reposicion,
      reposicionCritica: reposicion.filter(p => getStockStatus(p) === "critico").length,
      lotesSemana,
      vencidos: lotesSemana.filter(x => x.dias < 0).length,
    };
  }, [executiveScope, lotes]);

  const filtered = useMemo(() => {
    const q    = search.toLowerCase();
    const pool = showInactivos
      ? catalogos
      : catalogos.filter(p => p.activo);
    const result = pool.filter(p => {
      if (filterModulo !== "all" && !p.modulo_ids.includes(filterModulo)) return false;
      if (!showInactivos) {
        if (filterEstado === "ok"      && getStockStatus(p) !== "ok")      return false;
        if (filterEstado === "bajo"    && getStockStatus(p) !== "bajo")    return false;
        if (filterEstado === "critico" && getStockStatus(p) !== "critico") return false;
      }
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
    // Ordenar por urgencia: crítico → bajo → ok (inactivos al final)
    const urgency = (p: typeof result[0]) => {
      if (!p.activo) return 3;
      const s = getStockStatus(p);
      return s === "critico" ? 0 : s === "bajo" ? 1 : 2;
    };
    return [...result].sort((a, b) => urgency(a) - urgency(b));
  }, [catalogos, filterModulo, filterEstado, search, showInactivos]);

  return (
    <MainLayout>
      <PageHeader
        title="Inventario"
        description="Gestión de stock, movimientos y alertas por módulo"
        actions={
          <button
            onClick={() => navigate("/inventario/ordenes")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Órdenes de compra
          </button>
        }
      />

      {/* Executive dashboard */}
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Valor total",
            value: fmtCurrency(executiveKpis.valor),
            hint: `${executiveKpis.productosActivos} productos activos`,
            icon: <DollarSign className="h-4 w-4" />,
            cls: "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400",
          },
          {
            label: "Movimientos del mes",
            value: executiveKpis.movimientosMes,
            hint: currentMonth,
            icon: <TrendingUp className="h-4 w-4" />,
            cls: "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400",
          },
          {
            label: "Inactivos o sin lote",
            value: executiveKpis.pendientes,
            hint: `${executiveKpis.productosInactivos} inactivos · ${executiveKpis.productosSinLote} sin lote`,
            icon: <PackageOpen className="h-4 w-4" />,
            cls: executiveKpis.pendientes > 0
              ? "border-slate-300 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
              : "border-border bg-card text-muted-foreground",
          },
        ].map(kpi => (
          <div key={kpi.label} className={cn("rounded-xl border px-4 py-3 shadow-sm", kpi.cls)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{kpi.label}</p>
                <p className="mt-1 truncate text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
              </div>
              <div className="rounded-lg bg-background/70 p-2 shadow-sm">
                {kpi.icon}
              </div>
            </div>
            <p className="mt-2 truncate text-xs opacity-80">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        {([
          { id: "stock",        label: "Stock",           icon: <Package        className="h-4 w-4" /> },
          { id: "movimientos",  label: "Movimientos",     icon: <History        className="h-4 w-4" /> },
          { id: "conteo",       label: "Ajuste de stock", icon: <ClipboardCheck className="h-4 w-4" /> },
          { id: "proveedores",  label: "Proveedores",     icon: <Building2      className="h-4 w-4" /> },
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

      {/* Stats bar — compacta */}
      {(() => {
        return null;
        const scopeProds = filterModulo !== "all" ? allProductos.filter(p => p.modulo_ids.includes(filterModulo)) : allProductos;
        const scopeValor = scopeProds.reduce((s, p) => s + p.cantidad_actual * p.precio_unitario, 0);
        return (
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{scopeProds.length}</span>
              <span className="text-xs text-muted-foreground">productos</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{fmtCurrency(scopeValor)}</span>
              <span className="text-xs text-muted-foreground">valor total</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{movsMes}</span>
              <span className="text-xs text-muted-foreground">movimientos este mes</span>
            </div>
          </div>
        );
      })()}

      {/* Historial de movimientos */}
      {mainTab === "movimientos" && (
        <MovimientosView
          onOpenDetail={id => { openDetail(id); }}
          onKardex={id => setKardexId(id)}
          onMovimiento={openMovimiento}
          initialFilter={movFiltroInicial}
          onInitialFilterConsumed={() => setMovFiltroInicial(null)}
        />
      )}

      {/* Conteo físico / Ajuste masivo */}
      {mainTab === "conteo" && (
        <ConteoFisicoView
          onDone={() => setMainTab("stock")}
          userArea={userArea}
          isAdmin={isAdmin}
        />
      )}

      {/* Proveedores */}
      {mainTab === "proveedores" && <ProveedoresView />}


      {/* Stock — Main 2-column layout */}
      {mainTab === "stock" && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">

        {/* Filter panel */}
        <FilterPanel
          productos={filtered}
          filterModulo={filterModulo} setFilterModulo={setFilterModulo}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
        />

        {/* Products area */}
        <div className="space-y-4 min-w-0">
          {/* Toolbar — fila 1: búsqueda + toggle de vista */}
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

          {/* Toolbar — fila 2: acciones contextuales */}
          <div className="flex items-center gap-2">
            {/* Toggle inactivos */}
            {canAdmin && (
              <button
                onClick={() => { setShowInactivos(v => !v); setFilterEstado("all"); }}
                title={showInactivos ? "Volver a productos activos" : "Ver productos inactivos"}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors shrink-0",
                  showInactivos
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-500 dark:text-amber-400"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                <Power className="h-3.5 w-3.5" />
                <span>Inactivos</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-bold",
                  showInactivos
                    ? "bg-amber-200 text-amber-800 dark:bg-amber-700/40 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}>
                  {catalogos.filter(p => !p.activo).length}
                </span>
              </button>
            )}
            {/* Exportar stock */}
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={exportarStock}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            {/* Spacer para empujar acciones primarias a la derecha */}
            <div className="flex-1" />
            {/* Carga masiva */}
            {!showInactivos && viewMode === "list" && !bulkMode && (
              <Button
                variant="outline" size="sm"
                className="h-9 gap-1.5 shrink-0 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                onClick={() => { setBulkQtys({}); setBulkTipo("entrada"); setBulkMode(true); }}
              >
                <Package className="h-4 w-4" />
                Carga masiva
              </Button>
            )}
            {/* Nuevo producto */}
            {canAdmin && !showInactivos && (
              <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={() => { setEditingProd(null); setProdDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            )}
          </div>


          {/* Carga masiva — panel flotante y arrastrable */}
          {bulkMode && (() => {
            const defaultX = Math.max(0, window.innerWidth / 2 - 320);
            const defaultY = window.innerHeight - 100;
            const pos = bulkPos ?? { x: defaultX, y: defaultY };

            const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
              e.preventDefault();
              bulkDragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
              const onMove = (ev: MouseEvent) => {
                if (!bulkDragOffset.current) return;
                setBulkPos({
                  x: Math.max(0, Math.min(window.innerWidth  - 200, ev.clientX - bulkDragOffset.current.dx)),
                  y: Math.max(0, Math.min(window.innerHeight - 60,  ev.clientY - bulkDragOffset.current.dy)),
                });
              };
              const onUp = () => {
                bulkDragOffset.current = null;
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup",   onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup",   onUp);
            };

            return (
              <div
                style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 50, minWidth: 520, maxWidth: "min(700px, 95vw)" }}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border shadow-xl px-3 py-2.5",
                  bulkTipo === "entrada"
                    ? "border-green-300 bg-green-50 dark:border-green-700/60 dark:bg-green-950/80"
                    : "border-red-300 bg-red-50 dark:border-red-700/60 dark:bg-red-950/80",
                )}
              >
                {/* Drag handle */}
                <div
                  onMouseDown={handleDragStart}
                  className="cursor-move text-muted-foreground hover:text-foreground shrink-0 touch-none"
                  title="Mover panel"
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Tipo */}
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Tipo:</span>
                <div className="flex rounded-lg border border-border bg-muted p-0.5 gap-0.5 shrink-0">
                  <button
                    onClick={() => setBulkTipo("entrada")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      bulkTipo === "entrada" ? "bg-green-600 text-white shadow" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowDown className="h-3 w-3" /> Entrada
                  </button>
                  <button
                    onClick={() => setBulkTipo("salida")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      bulkTipo === "salida" ? "bg-red-600 text-white shadow" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowUp className="h-3 w-3" /> Salida
                  </button>
                </div>

                {/* Contador */}
                <span className="text-xs text-muted-foreground">
                  {bulkPendientes.length > 0
                    ? <><strong className="text-foreground">{bulkPendientes.length}</strong> producto{bulkPendientes.length !== 1 ? "s" : ""} con cantidad ingresada</>
                    : "Ingresá cantidades en la columna →"}
                </span>

                {/* Acciones */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="h-8" onClick={cancelarBulk}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className={cn("h-8 gap-1.5 font-semibold",
                      bulkTipo === "entrada" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white")}
                    disabled={bulkPendientes.length === 0}
                    onClick={confirmarBulk}
                  >
                    {bulkTipo === "entrada" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    Confirmar {bulkPendientes.length > 0 ? `(${bulkPendientes.length})` : ""}
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Banner contextual cuando se ven inactivos */}
          {showInactivos && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
              <Power className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="flex-1 text-xs text-amber-800 dark:text-amber-300">
                <strong>Mostrando productos inactivos.</strong> No aparecen en formularios ni catálogos.
                Usa <Power className="inline h-3 w-3 mx-0.5" /> para reactivar.
              </p>
              <button
                onClick={() => setShowInactivos(false)}
                className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400 shrink-0"
              >
                ✕ Volver a activos
              </button>
            </div>
          )}

          {!showInactivos && (contextualAlerts.reposicion.length > 0 || contextualAlerts.lotesSemana.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {contextualAlerts.reposicion.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterEstado(contextualAlerts.reposicionCritica > 0 ? "critico" : "bajo");
                    setSearch("");
                  }}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-left text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{contextualAlerts.reposicion.length}</strong> producto{contextualAlerts.reposicion.length !== 1 ? "s" : ""} necesita{contextualAlerts.reposicion.length !== 1 ? "n" : ""} reposicion
                  </span>
                  <span className="text-[11px] underline underline-offset-2">Ver</span>
                </button>
              )}

              {contextualAlerts.lotesSemana.length > 0 && (() => {
                const urgente = contextualAlerts.lotesSemana[0];
                const producto = catalogos.find(p => p.id === urgente.lote.catalogo_id);
                const vencidos = contextualAlerts.vencidos;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (producto) openDetail(producto.id);
                    }}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-1.5 text-left text-xs font-medium text-red-800 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                  >
                    <CalendarClock className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{contextualAlerts.lotesSemana.length}</strong> lote{contextualAlerts.lotesSemana.length !== 1 ? "s" : ""} {vencidos > 0 ? "vencidos o por vencer" : "vence esta semana"}
                    </span>
                    {producto && <span className="max-w-[180px] truncate text-[11px] underline underline-offset-2">{producto.nombre}</span>}
                  </button>
                );
              })()}
            </div>
          )}

          {/* Results count */}
          <p className="text-xs text-muted-foreground">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            {filterModulo !== "all" && <> en {MODULE_LABELS[filterModulo] ?? filterModulo}</>}
            {filterEstado !== "all" && <> · estado: {filterEstado}</>}
          </p>

          {/* Empty state contextual */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-16 text-center gap-3">
              <Package className="h-10 w-10 opacity-20" />
              {search || filterModulo !== "all" || filterEstado !== "all" ? (
                <>
                  <div>
                    <p className="text-sm font-medium">Sin resultados para los filtros activos</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {search && <span>Búsqueda: <strong>"{search}"</strong>{(filterModulo !== "all" || filterEstado !== "all") && " · "}</span>}
                      {filterModulo !== "all" && <span>Área: <strong>{MODULE_LABELS[filterModulo] ?? filterModulo}</strong>{filterEstado !== "all" && " · "}</span>}
                      {filterEstado !== "all" && <span>Estado: <strong>{filterEstado}</strong></span>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSearch(""); setFilterModulo("all"); setFilterEstado("all"); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar todos los filtros
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium">Sin productos en el inventario</p>
                    <p className="mt-1 text-xs text-muted-foreground">Agrega tu primer producto para comenzar a registrar stock.</p>
                  </div>
                  {canAdmin && (
                    <button
                      onClick={() => { setEditingProd(null); setProdDialogOpen(true); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar primer producto
                    </button>
                  )}
                </>
              )}
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
                  canAdmin={canAdmin}
                  onEdit={prod => { setEditingProd(prod); setProdDialogOpen(true); }}
                  onToggleActivo={prod => setConfirmProd(prod)}
                />
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && filtered.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="w-1 px-0"></th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Área</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Stock</th>
                      <th className="w-24 px-3 py-2.5"></th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                      <th className="hidden 2xl:table-cell px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Precio unit.</th>
                      <th className="hidden 2xl:table-cell px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">PPP</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Valor total</th>
                      <th className="hidden 2xl:table-cell px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Cuenta</th>
                      {bulkMode && (
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                          Cantidad a {bulkTipo === "entrada" ? "ingresar" : "retirar"}
                        </th>
                      )}
                      {!bulkMode && <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const status = getStockStatus(p);
                      const inactivo = !p.activo;
                      const accentCls = status === "critico" ? "bg-red-500" : status === "bajo" ? "bg-amber-500" : "bg-transparent";
                      const rowCls = status === "critico"
                        ? "bg-red-50/40 dark:bg-red-900/10"
                        : status === "bajo"
                          ? "bg-amber-50/30 dark:bg-amber-900/10"
                          : "";
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "border-b border-border/50 last:border-0 transition-colors",
                            inactivo ? "bg-muted/30 hover:bg-muted/50" : cn("cursor-pointer hover:bg-muted/20", rowCls),
                          )}
                          onClick={() => !inactivo && openDetail(p.id)}
                        >
                          {/* Franja de color izquierda según urgencia */}
                          <td className="w-1 p-0">
                            <div className={cn("h-full w-1 min-h-[40px]", accentCls)} />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className={cn("font-medium", inactivo && "text-muted-foreground line-through")}>{p.nombre}</p>
                                <p className="font-mono text-[10px] text-muted-foreground">{p.codigo}</p>
                              </div>
                              {inactivo && (
                                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Desactivado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={cn("px-3 py-2.5 whitespace-nowrap", inactivo && "opacity-50")}><ModuloBadges ids={p.modulo_ids} size="xs" /></td>
                          <td className={cn("px-3 py-2.5 text-right", inactivo && "opacity-50")}>
                            <span className={cn("font-semibold", status === "critico" && !inactivo && "text-red-600 dark:text-red-400", status === "bajo" && !inactivo && "text-amber-600 dark:text-amber-400")}>
                              {fmtNum(p.cantidad_actual, 1)}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">{p.unidad_medida}</span>
                          </td>
                          <td className={cn("px-3 py-2.5", inactivo && "opacity-30")}>
                            {inactivo ? null : <StockBar p={p} />}
                          </td>
                          <td className="px-3 py-2.5">
                            {inactivo
                              ? <span className="text-[11px] text-muted-foreground italic">Desactivado — oculto en formularios</span>
                              : <StockBadge status={status} />}
                          </td>
                          <td className={cn("hidden 2xl:table-cell px-3 py-2.5 text-right text-xs", inactivo && "opacity-50")}>
                            {fmtCurrency(p.precio_unitario)}
                          </td>
                          <td className={cn("hidden 2xl:table-cell px-3 py-2.5 text-right text-xs font-semibold", inactivo && "opacity-50",
                            !inactivo && p.precio_promedio_ponderado !== p.precio_unitario ? "text-amber-600 dark:text-amber-400" : "")}>
                            {fmtCurrency(p.precio_promedio_ponderado)}
                          </td>
                          <td className={cn("px-3 py-2.5 text-right text-sm font-bold tabular-nums", inactivo && "opacity-50")}>
                            {fmtCurrency(p.cantidad_actual * p.precio_promedio_ponderado)}
                          </td>
                          <td className={cn("hidden 2xl:table-cell px-3 py-2.5 text-xs", inactivo && "opacity-50")}>
                            {p.cuenta_contable
                              ? <span className="font-mono rounded bg-muted px-1.5 py-0.5">{p.cuenta_contable}</span>
                              : <span className="text-muted-foreground/50">—</span>}
                          </td>
                          {/* Columna Acciones / Carga masiva — siempre un único td */}
                          <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                            {bulkMode ? (
                              // ── Modo carga masiva: input de cantidad ──────────
                              inactivo ? null : (
                                <div className="flex justify-end">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={bulkQtys[p.id] ?? ""}
                                    onChange={e => setBulkQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") {
                                        const next = (e.currentTarget.closest("tr")?.nextElementSibling as HTMLElement | null)
                                          ?.querySelector('input[type="number"]') as HTMLInputElement | null;
                                        next?.focus();
                                      }
                                    }}
                                    placeholder={`cant. (${p.unidad_medida})`}
                                    className={cn(
                                      "h-8 w-36 rounded-md border bg-background px-2 text-xs text-right focus:outline-none focus:ring-2 transition-colors",
                                      bulkQtys[p.id] && parseFloat(bulkQtys[p.id]) > 0
                                        ? "border-green-400 focus:ring-green-400/40 text-green-700 dark:text-green-400 font-medium"
                                        : "border-border focus:ring-ring",
                                    )}
                                  />
                                </div>
                              )
                            ) : (
                              // ── Modo normal: botones de acción ───────────────
                              <div className="flex items-center justify-end gap-1">
                                {!inactivo && (
                                  <>
                                    <button
                                      onClick={() => openMovimiento(p.id, "entrada")}
                                      title="Registrar entrada"
                                      className="h-7 w-7 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center justify-center transition-colors"
                                    >
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openMovimiento(p.id, "salida")}
                                      title="Registrar salida"
                                      className="h-7 w-7 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
                                    >
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="h-7 w-7 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-48 p-1">
                                    {!inactivo && (
                                      <>
                                        <button
                                          onClick={() => openDetail(p.id)}
                                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                          Ver detalle
                                        </button>
                                        <button
                                          onClick={() => setKardexId(p.id)}
                                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                                        >
                                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                          Historial de movimientos
                                        </button>
                                        <button
                                          onClick={() => setTransferirId(p.id)}
                                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                                        >
                                          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                                          Transferir área
                                        </button>
                                      </>
                                    )}
                                    {canAdmin && (
                                      <>
                                        {!inactivo && (
                                          <>
                                            <div className="my-1 border-t border-border" />
                                            <button
                                              onClick={() => { setEditingProd(p); setProdDialogOpen(true); }}
                                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
                                            >
                                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                              Editar producto
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => setConfirmProd(p)}
                                          className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                                            inactivo
                                              ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                              : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                                          )}
                                        >
                                          <Power className="h-3.5 w-3.5" />
                                          {inactivo ? "Reactivar" : "Desactivar producto"}
                                        </button>
                                      </>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
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
        onTransferir={id => setTransferirId(id)}
        onVerHistorialLote={irAHistorialDeLote}
      />
      <KardexSheet productId={kardexId} onClose={() => setKardexId(null)} />
      <TransferenciaModal productoId={transferirId} open={!!transferirId} onClose={() => setTransferirId(null)} />
      <ModalMovimiento open={modalOpen} onOpenChange={setModalOpen} productoId={modalId} tipoInicial={modalTipo} />
      <ProductoDialog open={prodDialogOpen} onOpenChange={setProdDialogOpen} editing={editingProd} />

      {/* ── AlertDialog confirmar activar / desactivar (vista stock principal) ── */}
      <Dialog open={!!confirmProd} onOpenChange={v => { if (!v) setConfirmProd(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn(
              "flex items-center gap-2",
              confirmProd?.activo ? "text-red-600" : "text-green-600",
            )}>
              <Power className="h-4 w-4" />
              {confirmProd?.activo ? "Desactivar producto" : "Reactivar producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold text-sm">{confirmProd?.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{confirmProd?.codigo}</p>
            </div>
            {confirmProd?.activo ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este producto <strong>dejará de aparecer</strong> en formularios, catálogos de selección
                y reportes de inventario. El historial de movimientos se conserva intacto.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este producto volverá a estar <strong>disponible</strong> en formularios y catálogos.
                Stock actual: <strong>{fmtNum(confirmProd?.cantidad_actual ?? 0, 1)} {confirmProd?.unidad_medida}</strong>.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmProd(null)}>Cancelar</Button>
            <Button
              size="sm"
              variant={confirmProd?.activo ? "destructive" : "default"}
              className={!confirmProd?.activo ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              onClick={() => {
                if (confirmProd) desactivarProducto(confirmProd.id);
                setConfirmProd(null);
              }}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {confirmProd?.activo ? "Sí, desactivar" : "Sí, reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
