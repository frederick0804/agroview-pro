/**
 * TablaInsumosField
 *
 * Permite agregar múltiples productos del inventario con su cantidad.
 * Valor serializado: [{ catalogo_id, cantidad }]
 */

import { useMemo } from "react";
import { Plus, X, Package, AlertCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useInventario, getStockStatus } from "@/contexts/InventarioContext";
import type { TablaInsumosRow } from "@/config/moduleDefinitions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRows(raw: string): (TablaInsumosRow & { _uid: string })[] {
  try {
    const parsed: TablaInsumosRow[] = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r, i) => ({ ...r, _uid: String(i) }));
  } catch { return []; }
}

function serializeRows(rows: (TablaInsumosRow & { _uid: string })[]): string {
  return JSON.stringify(
    rows.map(r => ({ catalogo_id: r.catalogo_id, cantidad: Number(r.cantidad) || 0 })),
  );
}

const AREA_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio", vivero: "Vivero", cultivo: "Cultivo",
  "post-cosecha": "Post-cosecha", comercial: "Comercial",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TablaInsumosFieldProps {
  value:       string;
  onChange:    (v: string) => void;
  disabled?:   boolean;
  areaFilter?: string | null;
  /**
   * true = estamos editando productos ya guardados.
   * Las advertencias de stock son informativas (ámbar) en lugar de bloqueantes (rojo),
   * porque al guardar se revertirán los movimientos anteriores antes de aplicar los nuevos.
   */
  isEditing?:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TablaInsumosField({ value, onChange, disabled, areaFilter, isEditing = false }: TablaInsumosFieldProps) {
  const { catalogos } = useInventario();
  const activeCatalogos = useMemo(
    () => catalogos.filter(c => c.activo && (!areaFilter || c.modulo_ids.includes(areaFilter))),
    [catalogos, areaFilter],
  );
  const rows = useMemo(() => parseRows(value), [value]);

  const update = (newRows: (TablaInsumosRow & { _uid: string })[]) => onChange(serializeRows(newRows));
  const addRow    = () => update([...rows, { _uid: String(Date.now()), catalogo_id: "", cantidad: 0 }]);
  const removeRow = (uid: string) => update(rows.filter(r => r._uid !== uid));
  const setField  = (uid: string, key: "catalogo_id" | "cantidad", val: string | number) =>
    update(rows.map(r => r._uid === uid ? { ...r, [key]: val } : r));

  // ── Read-only mode ──────────────────────────────────────────────────────────
  if (disabled) {
    const valid = rows.filter(r => r.catalogo_id && r.cantidad > 0);
    if (valid.length === 0) return <span className="text-xs text-muted-foreground italic">Sin productos</span>;
    return (
      <div className="space-y-1.5">
        {valid.map((r, i) => {
          const p = activeCatalogos.find(c => c.id === r.catalogo_id);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="font-medium">{p?.nombre ?? r.catalogo_id}</span>
              <span className="text-muted-foreground">
                {r.cantidad.toLocaleString("es-CL", { maximumFractionDigits: 2 })} {p?.unidad_medida ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const hasOverstock = rows.some(r => {
    const p = activeCatalogos.find(c => c.id === r.catalogo_id);
    return p && Number(r.cantidad) > p.cantidad_actual;
  });
  // En modo edición: overstock es solo una advertencia (no bloquea), el stock se restaurará al guardar

  return (
    <div className="space-y-3">
      {/* Área badge */}
      {areaFilter && (
        <p className="text-[11px] text-muted-foreground">
          Mostrando productos de <span className="font-medium">{AREA_LABELS[areaFilter] ?? areaFilter}</span>
        </p>
      )}

      {/* Product rows */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const prod = activeCatalogos.find(c => c.id === row.catalogo_id);
            const overStock = prod && Number(row.cantidad) > prod.cantidad_actual;
            const stockStatus = prod ? getStockStatus(prod) : null;

            // En edición: advertencia ámbar. En creación: error rojo.
            const overStockCls = overStock
              ? isEditing
                ? "border-amber-300 dark:border-amber-800/50"
                : "border-red-300 dark:border-red-800/60"
              : "border-border";

            return (
              <div
                key={row._uid}
                className={cn("rounded-xl border bg-card p-3 transition-colors", overStockCls)}
              >
                {/* Row number + delete */}
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Producto {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row._uid)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Product selector — excluye productos ya seleccionados en otras filas */}
                {/* disponibles se calcula inline para no contaminar el scope del map */}
                <Select
                  value={row.catalogo_id}
                  onValueChange={v => setField(row._uid, "catalogo_id", v)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Seleccionar producto…" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCatalogos
                      .filter(c => {
                        // Muestra el producto si: es el seleccionado en esta fila
                        // O si no está seleccionado en ninguna otra fila
                        if (c.id === row.catalogo_id) return true;
                        return !rows.some(r => r._uid !== row._uid && r.catalogo_id === c.id);
                      })
                      .map(c => {
                        const st = getStockStatus(c);
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                st === "ok" ? "bg-green-500" : st === "bajo" ? "bg-amber-500" : "bg-red-500",
                              )} />
                              <span>{c.nombre}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {c.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {c.unidad_medida}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })
                    }
                    {activeCatalogos.filter(c =>
                      c.id === row.catalogo_id ||
                      !rows.some(r => r._uid !== row._uid && r.catalogo_id === c.id)
                    ).length === 0 && (
                      <SelectItem value="__none" disabled>
                        Todos los productos ya fueron agregados
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Stock info (after product selected) */}
                {prod && (
                  <p className={cn(
                    "mt-1.5 text-[11px]",
                    stockStatus === "bajo" || stockStatus === "critico"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}>
                    {stockStatus !== "ok" && <AlertCircle className="mr-1 inline h-3 w-3" />}
                    {isEditing ? "Stock actual" : "Disponible"}: {prod.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {prod.unidad_medida}
                    {stockStatus === "bajo" && " — Stock bajo"}
                    {stockStatus === "critico" && " — Stock crítico"}
                  </p>
                )}

                {/* Quantity */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-muted-foreground">Cantidad</label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.cantidad || ""}
                      onChange={e => setField(row._uid, "cantidad", e.target.value)}
                      onKeyDown={e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                      placeholder="0"
                      className={cn(
                        "h-10",
                        overStock
                          ? isEditing
                            ? "border-amber-400 bg-amber-50/60 dark:bg-amber-900/10"
                            : "border-red-400 bg-red-50 dark:bg-red-900/10"
                          : "",
                      )}
                    />
                  </div>
                  {prod && (
                    <div className="mt-5 shrink-0">
                      <span className="text-sm text-muted-foreground">{prod.unidad_medida}</span>
                    </div>
                  )}
                </div>

                {overStock && (
                  <p className={cn(
                    "mt-1.5 text-[11px]",
                    isEditing
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400",
                  )}>
                    {isEditing
                      ? "ℹ Stock aparece reducido — se restaurará al guardar"
                      : "⚠ Supera el stock disponible"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin productos agregados</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            Haz clic en el botón de abajo para comenzar
          </p>
        </div>
      )}

      {/* Add button — deshabilitado si todos los productos ya están en la lista */}
      {(() => {
        const usados   = new Set(rows.filter(r => r.catalogo_id).map(r => r.catalogo_id));
        const quedan   = activeCatalogos.filter(c => !usados.has(c.id));
        const disabled = quedan.length === 0;
        return (
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            title={disabled ? "Ya agregaste todos los productos disponibles" : undefined}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors",
              disabled
                ? "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60"
                : "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10",
            )}
          >
            <Plus className="h-4 w-4" />
            {disabled ? "Todos los productos agregados" : "Agregar producto"}
          </button>
        );
      })()}

      {hasOverstock && !isEditing && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          ⚠ Una o más cantidades superan el stock disponible.
        </p>
      )}
      {hasOverstock && isEditing && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          ℹ El stock disponible se muestra después del descuento anterior.
          Al guardar, ese descuento se revertirá y se aplicará el nuevo.
        </p>
      )}
    </div>
  );
}
