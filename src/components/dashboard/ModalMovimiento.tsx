/**
 * ModalMovimiento
 *
 * Reusable dialog for registering inventory movements (entrada / salida / ajuste).
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn }       from "@/lib/utils";
import { useInventario, type InvMovimientoTipo, type InvMovimientoSubtipo } from "@/contexts/InventarioContext";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";

// ─── Subtipo options per tipo ──────────────────────────────────────────────────

const SUBTIPOS: Record<InvMovimientoTipo, { value: InvMovimientoSubtipo; label: string }[]> = {
  entrada: [
    { value: "compra",     label: "Compra" },
    { value: "devolucion", label: "Devolución" },
  ],
  salida: [
    { value: "uso_produccion",   label: "Uso en producción" },
    { value: "aplicacion_campo", label: "Aplicación en campo" },
    { value: "merma",            label: "Merma / Pérdida" },
  ],
  ajuste: [
    { value: "conteo_fisico", label: "Conteo físico" },
  ],
};

const TIPO_LABELS: Record<InvMovimientoTipo, string> = {
  entrada: "Entrada",
  salida:  "Salida",
  ajuste:  "Ajuste",
};

const TIPO_ICONS: Record<InvMovimientoTipo, React.ReactNode> = {
  entrada: <ArrowDown className="w-3.5 h-3.5" />,
  salida:  <ArrowUp   className="w-3.5 h-3.5" />,
  ajuste:  <SlidersHorizontal className="w-3.5 h-3.5" />,
};

const TIPO_COLORS: Record<InvMovimientoTipo, string> = {
  entrada: "text-green-600",
  salida:  "text-red-600",
  ajuste:  "text-amber-600",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModalMovimientoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productoId: string | null;
  tipoInicial?: InvMovimientoTipo;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModalMovimiento({
  open,
  onOpenChange,
  productoId,
  tipoInicial = "entrada",
}: ModalMovimientoProps) {
  const { catalogos, registrarMovimiento } = useInventario();

  const producto = useMemo(
    () => catalogos.find(p => p.id === productoId) ?? null,
    [catalogos, productoId],
  );

  // ── Form state ────────────────────────────────────────────────────────────
  const [tipo,           setTipo]           = useState<InvMovimientoTipo>(tipoInicial);
  const [subtipo,        setSubtipo]        = useState<InvMovimientoSubtipo>(SUBTIPOS[tipoInicial][0].value);
  const [cantidadStr,    setCantidadStr]    = useState("");
  const [precioStr,      setPrecioStr]      = useState("");
  const [proveedor,      setProveedor]      = useState("");
  const [observaciones,  setObservaciones]  = useState("");
  const [error,          setError]          = useState("");

  // Reset when opened / tipo changes
  useEffect(() => {
    if (open) {
      setTipo(tipoInicial);
      setSubtipo(SUBTIPOS[tipoInicial][0].value);
      setCantidadStr("");
      setPrecioStr(producto?.precio_unitario ? String(producto.precio_unitario) : "");
      setProveedor("");
      setObservaciones("");
      setError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoInicial, productoId]);

  // Reset subtipo when tipo changes
  useEffect(() => {
    setSubtipo(SUBTIPOS[tipo][0].value);
    setError("");
  }, [tipo]);

  // ── Preview calculation ───────────────────────────────────────────────────
  const stockActual = producto?.cantidad_actual ?? 0;
  const cantidad    = parseFloat(cantidadStr) || 0;

  const stockNuevo = useMemo(() => {
    if (!cantidad || cantidad <= 0) return null;
    if (tipo === "entrada") return stockActual + cantidad;
    if (tipo === "salida")  return stockActual - cantidad;
    return cantidad; // ajuste = absolute
  }, [tipo, cantidad, stockActual]);

  const previewColor = stockNuevo === null
    ? "text-muted-foreground"
    : stockNuevo > stockActual ? "text-green-600"
    : stockNuevo < stockActual ? "text-red-600"
    : "text-muted-foreground";

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirmar = () => {
    if (!productoId || !producto) return;
    const qty = parseFloat(cantidadStr);
    if (isNaN(qty) || qty <= 0) { setError("Ingresa una cantidad válida mayor a 0."); return; }
    if (tipo === "salida" && qty > stockActual) {
      setError(`Stock insuficiente. Disponible: ${fmtNum(stockActual)} ${producto.unidad_medida}.`);
      return;
    }

    const ok = registrarMovimiento(productoId, tipo, subtipo, qty, {
      precio_unitario: precioStr ? parseFloat(precioStr) : undefined,
      proveedor_id:    proveedor || undefined,
      observaciones:   observaciones || undefined,
    });

    if (!ok) {
      setError("No se pudo registrar el movimiento. Verifica el stock disponible.");
      return;
    }
    onOpenChange(false);
  };

  if (!producto) return null;

  const showProveedor = subtipo === "compra";
  const showPrecio    = tipo === "entrada";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={TIPO_COLORS[tipo]}>{TIPO_ICONS[tipo]}</span>
            Registrar {TIPO_LABELS[tipo]} — {producto.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="grid grid-cols-3 gap-2">
            {(["entrada", "salida", "ajuste"] as InvMovimientoTipo[]).map(t => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  tipo === t
                    ? t === "entrada" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : t === "salida"  ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "border-border hover:bg-muted",
                )}
              >
                {TIPO_ICONS[t]} {TIPO_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Subtipo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Subtipo</Label>
            <Select value={subtipo} onValueChange={v => setSubtipo(v as InvMovimientoSubtipo)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBTIPOS[tipo].map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {tipo === "ajuste" ? "Nueva cantidad absoluta" : "Cantidad"}
              <span className="ml-1 text-muted-foreground">({producto.unidad_medida})</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder={tipo === "ajuste" ? String(stockActual) : "0"}
              value={cantidadStr}
              onChange={e => { setCantidadStr(e.target.value); setError(""); }}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              Stock actual: <span className="font-medium">{fmtNum(stockActual)} {producto.unidad_medida}</span>
              {tipo === "salida" && cantidad > 0 && (
                <span className={cn("ml-2", cantidad > stockActual ? "text-destructive font-semibold" : "")}>
                  — disponible {fmtNum(stockActual - cantidad)} {producto.unidad_medida}
                </span>
              )}
            </p>
          </div>

          {/* Precio unitario (solo entrada) */}
          {showPrecio && (
            <div className="space-y-1.5">
              <Label className="text-xs">Precio unitario (opcional)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={String(producto.precio_unitario)}
                value={precioStr}
                onChange={e => setPrecioStr(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          {/* Proveedor (solo compra) */}
          {showProveedor && (
            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor (opcional)</Label>
              <Input
                placeholder={producto.proveedor_id ?? "Nombre del proveedor"}
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones (opcional)</Label>
            <textarea
              rows={2}
              placeholder="Notas adicionales..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Preview */}
          {stockNuevo !== null && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground mb-1">Vista previa del movimiento</p>
              <p className={cn("text-sm font-semibold", previewColor)}>
                {fmtNum(stockActual)} → {fmtNum(stockNuevo)} {producto.unidad_medida}
                <span className="ml-2 text-xs font-normal opacity-70">
                  ({tipo === "ajuste"
                    ? stockNuevo === stockActual ? "sin cambio" : stockNuevo > stockActual ? `+${fmtNum(stockNuevo - stockActual)}` : `-${fmtNum(stockActual - stockNuevo)}`
                    : tipo === "entrada" ? `+${fmtNum(cantidad)}` : `-${fmtNum(cantidad)}`})
                </span>
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={!cantidadStr || parseFloat(cantidadStr) <= 0}
            className={cn(
              tipo === "entrada" ? "bg-green-600 hover:bg-green-700"
              : tipo === "salida"  ? "bg-red-600 hover:bg-red-700"
              : "bg-amber-600 hover:bg-amber-700",
              "text-white",
            )}
          >
            Confirmar {TIPO_LABELS[tipo]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
}
