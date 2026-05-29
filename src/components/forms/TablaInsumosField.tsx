/**
 * TablaInsumosField
 *
 * Campo especial para formularios dinámicos.
 * Permite al operario agregar múltiples productos del inventario con su cantidad.
 * El valor se serializa como JSON: [{ catalogo_id, cantidad }]
 */

import { useMemo } from "react";
import { Plus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input  } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useInventario } from "@/contexts/InventarioContext";
import type { TablaInsumosRow } from "@/config/moduleDefinitions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRows(raw: string): (TablaInsumosRow & { _uid: string })[] {
  try {
    const parsed: TablaInsumosRow[] = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r, i) => ({ ...r, _uid: String(i) }));
  } catch {
    return [];
  }
}

function serializeRows(rows: (TablaInsumosRow & { _uid: string })[]): string {
  return JSON.stringify(
    rows.map(r => ({ catalogo_id: r.catalogo_id, cantidad: Number(r.cantidad) || 0 })),
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TablaInsumosFieldProps {
  value:      string;
  onChange:   (v: string) => void;
  disabled?:  boolean;
  areaFilter?: string | null; // filtra inventario por modulo_id
}

// ─── Component ────────────────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio", vivero: "Vivero", cultivo: "Cultivo",
  "post-cosecha": "Post-cosecha", comercial: "Comercial",
};

export function TablaInsumosField({ value, onChange, disabled, areaFilter }: TablaInsumosFieldProps) {
  const { catalogos } = useInventario();
  const activeCatalogos = useMemo(
    () => catalogos.filter(c => c.activo && (!areaFilter || c.modulo_id === areaFilter)),
    [catalogos, areaFilter],
  );

  const rows = useMemo(() => parseRows(value), [value]);

  const update = (newRows: (TablaInsumosRow & { _uid: string })[]) => {
    onChange(serializeRows(newRows));
  };

  const addRow = () => {
    const uid = String(Date.now());
    update([...rows, { _uid: uid, catalogo_id: "", cantidad: 0 }]);
  };

  const removeRow = (uid: string) => {
    update(rows.filter(r => r._uid !== uid));
  };

  const setRowField = (uid: string, key: "catalogo_id" | "cantidad", val: string | number) => {
    update(rows.map(r => r._uid === uid ? { ...r, [key]: val } : r));
  };

  if (disabled) {
    // Read-only: mostrar resumen
    const validRows = rows.filter(r => r.catalogo_id && r.cantidad > 0);
    if (validRows.length === 0) {
      return <span className="text-xs text-muted-foreground italic">Sin productos</span>;
    }
    return (
      <div className="space-y-1">
        {validRows.map((r, i) => {
          const prod = activeCatalogos.find(c => c.id === r.catalogo_id);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium">{prod?.nombre ?? r.catalogo_id}</span>
              <span className="text-muted-foreground">
                {r.cantidad.toLocaleString("es-CL", { maximumFractionDigits: 2 })} {prod?.unidad_medida ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Productos a aplicar
          </p>
          {areaFilter && (
            <span className="rounded-full border border-border bg-background px-2 py-0 text-[10px] text-muted-foreground">
              Área: {AREA_LABELS[areaFilter] ?? areaFilter}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {rows.filter(r => r.catalogo_id && r.cantidad > 0).length} producto{rows.filter(r => r.catalogo_id && r.cantidad > 0).length !== 1 ? "s" : ""} agregado{rows.filter(r => r.catalogo_id && r.cantidad > 0).length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Rows */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-28">Cantidad</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-16">Und</th>
                <th className="w-8 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const prod = activeCatalogos.find(c => c.id === row.catalogo_id);
                return (
                  <tr key={row._uid} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-1.5">
                      <Select
                        value={row.catalogo_id}
                        onValueChange={v => setRowField(row._uid, "catalogo_id", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar insumo…" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCatalogos.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                {c.nombre}
                                <span className="text-[10px] text-muted-foreground">
                                  — {c.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {c.unidad_medida} disponibles
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={row.cantidad || ""}
                        onChange={e => setRowField(row._uid, "cantidad", e.target.value)}
                        placeholder="0"
                        className={cn(
                          "h-8 text-right text-xs",
                          prod && row.cantidad > prod.cantidad_actual
                            ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                            : "",
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {prod?.unidad_medida ?? "—"}
                    </td>
                    <td className="pr-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row._uid)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Eliminar fila"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Stock warnings */}
          {rows.some(r => {
            const p = activeCatalogos.find(c => c.id === r.catalogo_id);
            return p && r.cantidad > p.cantidad_actual;
          }) && (
            <div className="border-t border-red-200 bg-red-50/60 px-3 py-1.5 text-[11px] text-red-700 dark:bg-red-900/10 dark:text-red-400">
              ⚠ Una o más cantidades superan el stock disponible.
            </div>
          )}
        </div>
      )}

      {rows.length === 0 && (
        <p className="py-3 text-center text-[11px] text-muted-foreground">
          Haz clic en "+ Agregar producto" para comenzar.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" /> Agregar producto
      </Button>
    </div>
  );
}
