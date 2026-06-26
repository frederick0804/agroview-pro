import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useInventario, getStockStatus } from "@/contexts/InventarioContext";
import { useRole } from "@/contexts/RoleContext";
import { DollarSign, TrendingUp, PackageOpen } from "lucide-react";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD" }).format(n);

/**
 * Tarjetas ejecutivas de Inventario (valor total, movimientos del mes,
 * inactivos/sin lote). Se muestran en todas las secciones del módulo —
 * Stock, Movimientos, Ajuste de stock, Proveedores y Órdenes de compra —
 * para que se sienta como un solo módulo aunque algunas vivan en rutas
 * separadas. Centralizado aquí para que las cifras nunca se desincronicen
 * entre páginas.
 */
export function InventarioKpiCards() {
  const { catalogos, lotes, movimientos } = useInventario();
  const { currentUser } = useRole();

  const visibleCatalogos = useMemo(() => {
    const clienteId = currentUser?.clienteId ? String(currentUser.clienteId) : null;
    const productorId = currentUser?.productorId ? String(currentUser.productorId) : null;
    return catalogos.filter(p => {
      if (clienteId && p.cliente_id !== clienteId) return false;
      if (productorId && p.productor_id !== productorId) return false;
      return true;
    });
  }, [catalogos, currentUser?.clienteId, currentUser?.productorId]);

  const currentMonth = new Date().toISOString().substring(0, 7);

  const kpis = useMemo(() => {
    const active = visibleCatalogos.filter(p => p.activo);
    const scopeIds = new Set(visibleCatalogos.map(p => p.id));
    const activeIds = new Set(active.map(p => p.id));
    const activeLotProductIds = new Set(
      lotes
        .filter(l => l.activo && l.cantidad_actual > 0 && activeIds.has(l.catalogo_id))
        .map(l => l.catalogo_id),
    );
    const productosSinLote = active.filter(p => !activeLotProductIds.has(p.id)).length;
    const productosInactivos = visibleCatalogos.filter(p => !p.activo).length;

    return {
      valor: active.reduce((s, p) => s + p.cantidad_actual * p.precio_promedio_ponderado, 0),
      movimientosMes: movimientos.filter(m => m.fecha.startsWith(currentMonth) && scopeIds.has(m.catalogo_id)).length,
      pendientes: productosInactivos + productosSinLote,
      productosInactivos,
      productosSinLote,
      productosActivos: active.length,
    };
  }, [visibleCatalogos, lotes, movimientos, currentMonth]);

  const cards = [
    {
      label: "Valor total",
      value: fmtCurrency(kpis.valor),
      hint: `${kpis.productosActivos} productos activos`,
      icon: <DollarSign className="h-4 w-4" />,
      cls: "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400",
    },
    {
      label: "Movimientos del mes",
      value: kpis.movimientosMes,
      hint: currentMonth,
      icon: <TrendingUp className="h-4 w-4" />,
      cls: "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400",
    },
    {
      label: "Inactivos o sin lote",
      value: kpis.pendientes,
      hint: `${kpis.productosInactivos} inactivos · ${kpis.productosSinLote} sin lote`,
      icon: <PackageOpen className="h-4 w-4" />,
      cls: kpis.pendientes > 0
        ? "border-slate-300 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
        : "border-border bg-card text-muted-foreground",
    },
  ];

  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      {cards.map(kpi => (
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
  );
}
