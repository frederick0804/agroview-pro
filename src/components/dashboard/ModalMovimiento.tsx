/**
 * ModalMovimiento
 *
 * Flujo por tipo:
 *
 *  ENTRADA / COMPRA  → Paso 1: cantidad + precio + proveedor
 *                      Paso 2: datos del lote (número, vencimiento, cert.)
 *                      El lote nace aquí — no en otro lugar.
 *
 *  SALIDA            → Cantidad + lote FEFO sugerido (override opcional)
 *
 *  AJUSTE            → Solo cantidad absoluta
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn }      from "@/lib/utils";
import {
  useInventario,
  type InvMovimientoTipo, type InvMovimientoSubtipo,
} from "@/contexts/InventarioContext";
import { ProveedorCombobox } from "@/components/ui/proveedor-combobox";
import {
  ArrowDown, ArrowUp, SlidersHorizontal,
  ChevronRight, ChevronLeft, AlertCircle,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const SUBTIPOS: Record<InvMovimientoTipo, { value: InvMovimientoSubtipo; label: string }[]> = {
  entrada: [
    { value: "compra",     label: "Compra" },
    { value: "devolucion", label: "Devolución" },
  ],
  salida: [
    { value: "uso_produccion",   label: "Uso en producción" },
    { value: "aplicacion_campo", label: "Aplicación en campo" },
    { value: "merma",            label: "Pérdida" },
  ],
  ajuste: [
    { value: "conteo_fisico", label: "Conteo físico" },
  ],
};

const TIPO_LABELS: Record<InvMovimientoTipo, string> = {
  entrada: "Entrada",  salida: "Salida",  ajuste: "Ajuste",
};
const TIPO_ICONS: Record<InvMovimientoTipo, React.ReactNode> = {
  entrada: <ArrowDown className="w-3.5 h-3.5" />,
  salida:  <ArrowUp   className="w-3.5 h-3.5" />,
  ajuste:  <SlidersHorizontal className="w-3.5 h-3.5" />,
};
const TIPO_BORDER: Record<InvMovimientoTipo, string> = {
  entrada: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  salida:  "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  ajuste:  "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
};

function fmtNum(n: number): string {
  return n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
}


// ─── Props ────────────────────────────────────────────────────────────────────

interface ModalMovimientoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productoId: string | null;
  tipoInicial?: InvMovimientoTipo;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModalMovimiento({
  open, onOpenChange, productoId, tipoInicial = "entrada",
}: ModalMovimientoProps) {
  const {
    catalogos, registrarMovimiento,
    proveedores, agregarProveedor,
  } = useInventario();

  const producto = useMemo(
    () => catalogos.find(p => p.id === productoId) ?? null,
    [catalogos, productoId],
  );

  // Solo proveedores autorizados para ESTE producto. Si el producto no tiene
  // ninguno configurado todavía, se muestran todos (evita un dropdown vacío sin salida).
  const proveedoresVinculados = useMemo(() => {
    if (!producto || producto.proveedor_ids.length === 0) return proveedores;
    return proveedores.filter(p => producto.proveedor_ids.includes(p.id));
  }, [proveedores, producto]);

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [tipo,          setTipo]          = useState<InvMovimientoTipo>(tipoInicial);
  const [subtipo,       setSubtipo]       = useState<InvMovimientoSubtipo>(SUBTIPOS[tipoInicial][0].value);
  const [cantidadStr,   setCantidadStr]   = useState("");
  const [precioStr,     setPrecioStr]     = useState("");
  const [proveedor,     setProveedor]     = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error,         setError]         = useState("");

  // El modal ahora es siempre de 1 paso (sin datos de lote)
  const [paso,          setPaso]          = useState<1 | 3>(1);

  const esCompra    = tipo === "entrada" && subtipo === "compra";

  // ── Reset ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTipo(tipoInicial);
    setSubtipo(SUBTIPOS[tipoInicial][0].value);
    setCantidadStr("");
    setPrecioStr(producto?.precio_unitario ? String(producto.precio_unitario) : "");
    setProveedor(producto?.proveedor_ids[0] ?? "");
    setObservaciones("");
    setError("");
    setPaso(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoInicial, productoId]);

  useEffect(() => {
    setSubtipo(SUBTIPOS[tipo][0].value);
    setError(""); setPaso(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const stockActual = producto?.cantidad_actual ?? 0;
  const cantidad    = parseFloat(cantidadStr) || 0;
  const stockNuevo  = useMemo(() => {
    if (!cantidad || cantidad <= 0) return null;
    if (tipo === "entrada") return stockActual + cantidad;
    if (tipo === "salida")  return stockActual - cantidad;
    return cantidad;
  }, [tipo, cantidad, stockActual]);

  const validarBase = () => {
    const qty = parseFloat(cantidadStr);
    if (isNaN(qty) || qty <= 0) { setError("Ingresa una cantidad valida mayor a 0."); return false; }
    if (qty > 999_999) { setError("La cantidad maxima permitida es 999.999."); return false; }
    if (tipo === "salida" && qty > stockActual) {
      setError(`Stock insuficiente. Disponible: ${fmtNum(stockActual)} ${producto?.unidad_medida ?? ""}.`);
      return false;
    }
    setError("");
    return true;
  };

  const irSiguiente = () => {
    if (!validarBase()) return;
    setPaso(3);
  };

  // ── Confirmar ─────────────────────────────────────────────────────────────
  const handleConfirmar = () => {
    if (!productoId || !producto) return;
    const qty = parseFloat(cantidadStr);
    if (isNaN(qty) || qty <= 0)   { setError("Ingresa una cantidad válida mayor a 0."); return; }
    if (qty > 999_999)             { setError("La cantidad máxima permitida es 999.999."); return; }
    if (tipo === "salida" && qty > stockActual) {
      setError(`Stock insuficiente. Disponible: ${fmtNum(stockActual)} ${producto.unidad_medida}.`);
      return;
    }

    const ok = registrarMovimiento(productoId, tipo, subtipo, qty, {
      precio_unitario: precioStr ? parseFloat(precioStr) : undefined,
      proveedor_id:    proveedor || undefined,
      observaciones:   observaciones || undefined,
    });

    if (!ok) { setError("No se pudo registrar. Verifica el stock disponible."); return; }
    onOpenChange(false);
  };

  if (!producto) return null;

  const previewColor = stockNuevo === null ? "text-muted-foreground"
    : stockNuevo > stockActual ? "text-green-600"
    : stockNuevo < stockActual ? "text-red-600"
    : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={cn(
              tipo === "entrada" ? "text-green-600" : tipo === "salida" ? "text-red-600" : "text-amber-600",
            )}>
              {TIPO_ICONS[tipo]}
            </span>
            Registrar {TIPO_LABELS[tipo]} — {producto.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ══ PASO 1 — Tipo, subtipo, cantidad, precio, proveedor ══ */}
          {paso === 1 && (
            <>
              {/* Tipo — "ajuste" se excluye a propósito: los ajustes de stock solo
                  deben hacerse desde el tab dedicado "Ajuste de stock" (conteo físico),
                  no desde este formulario rápido de entrada/salida. */}
              <div className="grid grid-cols-2 gap-2">
                {(["entrada", "salida"] as InvMovimientoTipo[]).map(t => (
                  <button key={t} onClick={() => setTipo(t)} className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    tipo === t ? TIPO_BORDER[t] : "border-border hover:bg-muted",
                  )}>
                    {TIPO_ICONS[t]} {TIPO_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Subtipo */}
              <div className="space-y-1.5">
                <Label className="text-xs">Subtipo</Label>
                <Select value={subtipo} onValueChange={v => setSubtipo(v as InvMovimientoSubtipo)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                  type="number" min="0" max={999_999} step="any" autoFocus
                  placeholder={tipo === "ajuste" ? String(stockActual) : "0"}
                  value={cantidadStr}
                  onChange={e => {
                    const val = e.target.value;
                    if (val !== "" && parseFloat(val) > 999_999) return;
                    setCantidadStr(val);
                    setError("");
                  }}
                  onKeyDown={e => {
                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                    if (e.key === "Enter") irSiguiente();
                  }}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Stock actual: <span className="font-medium">{fmtNum(stockActual)} {producto.unidad_medida}</span>
                  {tipo === "salida" && cantidad > 0 && (
                    <span className={cn("ml-2", cantidad > stockActual ? "text-destructive font-semibold" : "")}>
                      — quedarán {fmtNum(Math.max(0, stockActual - cantidad))} {producto.unidad_medida}
                    </span>
                  )}
                </p>
              </div>

              {/* Precio (entrada) */}
              {tipo === "entrada" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio unitario (opcional)</Label>
                  <Input
                    type="number" min="0" step="any"
                    placeholder={String(producto.precio_unitario)}
                    value={precioStr}
                    onChange={e => setPrecioStr(e.target.value)}
                    onKeyDown={e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    className="h-9"
                  />
                </div>
              )}

              {/* Proveedor (compra) */}
              {subtipo === "compra" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Proveedor (opcional)</Label>
                  <ProveedorCombobox
                    value={proveedor}
                    onChange={setProveedor}
                    options={proveedoresVinculados}
                    onAdd={agregarProveedor}
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
                  <p className="text-[11px] text-muted-foreground mb-1">Vista previa</p>
                  <p className={cn("text-sm font-semibold", previewColor)}>
                    {fmtNum(stockActual)} → {fmtNum(stockNuevo)} {producto.unidad_medida}
                    <span className="ml-2 text-xs font-normal opacity-70">
                      ({tipo === "ajuste"
                        ? stockNuevo === stockActual ? "sin cambio"
                        : stockNuevo > stockActual  ? `+${fmtNum(stockNuevo - stockActual)}`
                        :                             `-${fmtNum(stockActual - stockNuevo)}`
                        : tipo === "entrada" ? `+${fmtNum(cantidad)}` : `-${fmtNum(cantidad)}`})
                    </span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* ══ PASO 2 — Datos del lote (solo entrada / compra) ══ */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmar movimiento</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-center">
                    <p className="text-[11px] text-muted-foreground">Antes</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{fmtNum(stockActual)}</p>
                    <p className="text-xs text-muted-foreground">{producto.unidad_medida}</p>
                  </div>
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
                    tipo === "entrada" ? "bg-green-600" : tipo === "salida" ? "bg-red-600" : "bg-amber-600",
                  )}>
                    {tipo === "entrada" ? <ArrowDown className="h-5 w-5" /> : tipo === "salida" ? <ArrowUp className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
                  </div>
                  <div className={cn(
                    "flex-1 rounded-xl border px-4 py-3 text-center",
                    stockNuevo !== null && stockNuevo <= producto.cantidad_minima * 0.5
                      ? "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20"
                      : stockNuevo !== null && stockNuevo <= producto.cantidad_minima
                        ? "border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20"
                        : "border-green-300 bg-green-50 dark:border-green-800/50 dark:bg-green-950/20",
                  )}>
                    <p className="text-[11px] text-muted-foreground">Despues</p>
                    <p className={cn(
                      "mt-1 text-2xl font-bold tabular-nums",
                      stockNuevo !== null && stockNuevo < stockActual ? "text-red-600" : stockNuevo !== null && stockNuevo > stockActual ? "text-green-600" : "text-foreground",
                    )}>{fmtNum(stockNuevo ?? stockActual)}</p>
                    <p className="text-xs text-muted-foreground">{producto.unidad_medida}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Movimiento</p>
                  <p className="mt-0.5 font-semibold capitalize">{tipo} · {subtipo.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Cantidad</p>
                  <p className="mt-0.5 font-semibold">{fmtNum(cantidad)} {producto.unidad_medida}</p>
                </div>
                {(tipo === "entrada" && proveedor) && (
                  <div className="col-span-2 rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-muted-foreground">Proveedor</p>
                    <p className="mt-0.5 font-semibold">{proveedor}</p>
                  </div>
                )}
              </div>

              {stockNuevo !== null && stockNuevo <= producto.cantidad_minima && (
                <div className={cn(
                  "rounded-xl border px-3 py-2 text-xs",
                  stockNuevo <= producto.cantidad_minima * 0.5
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-400",
                )}>
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  El stock resultante queda {stockNuevo <= producto.cantidad_minima * 0.5 ? "critico" : "bajo"} frente al minimo de {fmtNum(producto.cantidad_minima)} {producto.unidad_medida}.
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {paso > 1 && (
            <Button variant="ghost" size="sm" className="gap-1 mr-auto" onClick={() => { setPaso(1); setError(""); }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {paso === 1 && (
            <Button
              size="sm"
              onClick={irSiguiente}
              disabled={!cantidadStr || parseFloat(cantidadStr) <= 0}
              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {paso === 3 && (
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={!cantidadStr || parseFloat(cantidadStr) <= 0}
              className={cn(
                tipo === "entrada" ? "bg-green-600 hover:bg-green-700"
                : tipo === "salida"  ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700",
                "text-white gap-1",
              )}
            >
              Confirmar {TIPO_LABELS[tipo]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
