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
  type InvMovimientoTipo, type InvMovimientoSubtipo, type InvCampoConValor,
} from "@/contexts/InventarioContext";
import { ProveedorCombobox } from "@/components/ui/proveedor-combobox";
import {
  ArrowDown, ArrowUp, SlidersHorizontal,
  Tag, ChevronRight, ChevronLeft, AlertCircle, Package,
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
    { value: "merma",            label: "Merma / Pérdida" },
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

function diasParaVencer(iso: string): number {
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(iso); vence.setHours(0, 0, 0, 0);
  return Math.round((vence.getTime() - hoy.getTime()) / 86_400_000);
}

function VencimientoBadge({ fecha }: { fecha: string }) {
  const dias = diasParaVencer(fecha);
  const cls  = dias < 0  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
             : dias < 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
             :             "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  const label = dias < 0  ? `Vencido hace ${Math.abs(dias)}d`
              : dias === 0 ? "Vence hoy"
              :              `Vence ${new Date(fecha).toLocaleDateString("es-CL")}`;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>{label}</span>;
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
    getLotesFEFO, getLotesByProducto, agregarLote,
    proveedores, agregarProveedor,
  } = useInventario();

  const producto = useMemo(
    () => catalogos.find(p => p.id === productoId) ?? null,
    [catalogos, productoId],
  );

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [tipo,          setTipo]          = useState<InvMovimientoTipo>(tipoInicial);
  const [subtipo,       setSubtipo]       = useState<InvMovimientoSubtipo>(SUBTIPOS[tipoInicial][0].value);
  const [cantidadStr,   setCantidadStr]   = useState("");
  const [precioStr,     setPrecioStr]     = useState("");
  const [proveedor,     setProveedor]     = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error,         setError]         = useState("");

  // Paso (solo aplica a entrada/compra → 2 pasos)
  const [paso,          setPaso]          = useState<1 | 2>(1);

  // Lote para SALIDA: FEFO auto-seleccionado, override posible
  const [loteSelId,     setLoteSelId]     = useState("");

  // Datos del nuevo lote (paso 2 de entrada/compra)
  const [loteNumero,    setLoteNumero]    = useState("");
  const [loteVence,     setLoteVence]     = useState("");
  const [loteCert,      setLoteCert]      = useState("");
  const [loteSinLote,   setLoteSinLote]   = useState(false); // "no tengo número de lote"

  // Valores de los campos personalizados del producto, capturados para este lote
  const [loteCampos,    setLoteCampos]    = useState<InvCampoConValor[]>([]);
  const updateLoteCampo = (idx: number, valor: string) =>
    setLoteCampos(prev => prev.map((c, i) => (i === idx ? { ...c, valor } : c)));

  const lotesFefo    = productoId ? getLotesFEFO(productoId)      : [];
  const todosLotes   = productoId ? getLotesByProducto(productoId) : [];
  const lotesActivos = todosLotes.filter(l => l.activo);

  const esCompra      = tipo === "entrada" && subtipo === "compra";
  const esDosParsos   = esCompra; // solo la compra tiene 2 pasos

  // ── Reset ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTipo(tipoInicial);
    setSubtipo(SUBTIPOS[tipoInicial][0].value);
    setCantidadStr("");
    setPrecioStr(producto?.precio_unitario ? String(producto.precio_unitario) : "");
    setProveedor(producto?.proveedor_id ?? "");
    setObservaciones("");
    setError("");
    setPaso(1);
    setLoteNumero(""); setLoteVence(""); setLoteCert(""); setLoteSinLote(false);
    setLoteCampos((producto?.campos_extra ?? []).map(c => ({ ...c, valor: "" })));
    const fefo = getLotesFEFO(productoId ?? "");
    setLoteSelId(fefo[0]?.id ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipoInicial, productoId]);

  useEffect(() => {
    setSubtipo(SUBTIPOS[tipo][0].value);
    setError(""); setPaso(1);
    if (tipo === "salida") {
      const fefo = getLotesFEFO(productoId ?? "");
      setLoteSelId(fefo[0]?.id ?? "");
    }
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

  const loteActual = lotesActivos.find(l => l.id === loteSelId) ?? null;
  const hayLotes   = lotesFefo.length > 0;

  // ── Navegación pasos ──────────────────────────────────────────────────────
  const irPaso2 = () => {
    const qty = parseFloat(cantidadStr);
    if (isNaN(qty) || qty <= 0) { setError("Ingresa una cantidad válida."); return; }
    setError("");
    setPaso(2);
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

    let loteIdFinal: string | undefined;
    let loteNumFinal: string | undefined;

    if (esCompra && !loteSinLote) {
      // Paso 2 de compra: crear el lote con los datos ingresados
      if (!loteNumero.trim()) { setError("Ingresa el número de lote o marca 'Sin número de lote'."); return; }
      if (!loteVence)         { setError("Ingresa la fecha de vencimiento del lote."); return; }
      const nuevoLote = agregarLote({
        catalogo_id:        productoId,
        numero_lote:        loteNumero.trim(),
        fecha_vencimiento:  loteVence,
        certificado_origen: loteCert.trim() || undefined,
        proveedor_id:       proveedor || producto.proveedor_id,
        precio_unitario:    precioStr ? parseFloat(precioStr) : producto.precio_unitario,
        cantidad_inicial:   qty,
        // Se crea en 0: registrarMovimiento() — más abajo, con lote_id — es quien suma
        // la cantidad real al lote (vía el delta de la entrada). Si aquí lo dejamos en
        // `qty`, la cantidad termina sumándose dos veces (qty + qty) y el lote queda
        // con más stock del que realmente ingresó (ej. 160 en vez de 80).
        cantidad_actual:    0,
        campos_extra:       loteCampos.length > 0 ? loteCampos : undefined,
        activo:             true,
      });
      loteIdFinal  = nuevoLote.id;
      loteNumFinal = nuevoLote.numero_lote;
    } else if (tipo === "salida" && loteSelId) {
      loteIdFinal  = loteSelId;
      loteNumFinal = loteActual?.numero_lote;
    }

    const ok = registrarMovimiento(productoId, tipo, subtipo, qty, {
      precio_unitario: precioStr ? parseFloat(precioStr) : undefined,
      proveedor_id:    proveedor || undefined,
      observaciones:   observaciones || undefined,
      lote_id:         loteIdFinal,
      lote_numero:     loteNumFinal,
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
          {/* Indicador de pasos (solo para compra) */}
          {esDosParsos && (
            <div className="flex items-center gap-2 pt-1">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                paso === 1 ? "bg-primary text-background" : "bg-primary/20 text-primary",
              )}>1</div>
              <span className={cn("text-xs", paso === 1 ? "text-foreground font-medium" : "text-muted-foreground")}>
                Cantidad y precio
              </span>
              <div className="h-px flex-1 bg-border" />
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                paso === 2 ? "bg-primary text-background" : "bg-muted text-muted-foreground",
              )}>2</div>
              <span className={cn("text-xs", paso === 2 ? "text-foreground font-medium" : "text-muted-foreground")}>
                Datos del lote
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ══ PASO 1 — Tipo, subtipo, cantidad, precio, proveedor ══ */}
          {paso === 1 && (
            <>
              {/* Tipo */}
              <div className="grid grid-cols-3 gap-2">
                {(["entrada", "salida", "ajuste"] as InvMovimientoTipo[]).map(t => (
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
                    if (e.key === "Enter" && esDosParsos) irPaso2();
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
                    options={proveedores}
                    onAdd={agregarProveedor}
                  />
                </div>
              )}

              {/* FEFO — Salida con lotes */}
              {tipo === "salida" && hayLotes && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Lote a descontar
                    <span className="font-normal text-muted-foreground">(FEFO — vence antes primero)</span>
                  </Label>
                  <Select value={loteSelId || "__sin_lote__"} onValueChange={v => setLoteSelId(v === "__sin_lote__" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sin lote asignado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__sin_lote__">Sin lote específico</SelectItem>
                      {lotesFefo.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          <span className="flex items-center gap-2 text-xs">
                            <span className="font-mono">{l.numero_lote}</span>
                            <span className="text-muted-foreground">{fmtNum(l.cantidad_actual)} {producto.unidad_medida}</span>
                            <VencimientoBadge fecha={l.fecha_vencimiento} />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loteActual && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                      <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono font-medium flex-1">{loteActual.numero_lote}</span>
                      <span className="text-muted-foreground">{fmtNum(loteActual.cantidad_actual)} disponibles</span>
                      <VencimientoBadge fecha={loteActual.fecha_vencimiento} />
                    </div>
                  )}
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
          {paso === 2 && esCompra && (
            <>
              {/* Resumen de lo ingresado */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Comprando</p>
                  <p className="font-semibold text-sm">{cantidad} {producto.unidad_medida} de {producto.nombre}</p>
                </div>
                {precioStr && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Precio unit.</p>
                    <p className="font-medium text-sm">${parseFloat(precioStr).toLocaleString("es-CL", { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>

              {/* Explicación del paso */}
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-primary">
                <Tag className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  Cada compra crea un <strong>lote</strong> que te permite rastrear vencimientos
                  y saber exactamente qué stock se usó en cada aplicación.
                </p>
              </div>

              {/* Toggle sin lote */}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={loteSinLote}
                  onChange={e => setLoteSinLote(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-muted-foreground text-xs">
                  No tengo número de lote / no aplica para este producto
                </span>
              </label>

              {!loteSinLote && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        N° de lote *
                      </Label>
                      <Input
                        autoFocus
                        value={loteNumero}
                        onChange={e => setLoteNumero(e.target.value)}
                        placeholder="ej: LOT-2025-001"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Fecha de vencimiento *
                      </Label>
                      <Input
                        type="date"
                        value={loteVence}
                        onChange={e => setLoteVence(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Certificado de origen
                      <span className="ml-1 font-normal text-muted-foreground">(SAG, ANMAT, etc.)</span>
                    </Label>
                    <Input
                      value={loteCert}
                      onChange={e => setLoteCert(e.target.value)}
                      placeholder="ej: SAG-CL-2025-XXX"
                      className="h-9"
                    />
                  </div>

                  {/* Campos personalizados del producto — capturados por lote */}
                  {loteCampos.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3 w-3" /> Campos personalizados de «{producto.nombre}»
                      </p>
                      <p className="text-[10px] text-muted-foreground -mt-1">
                        Estos valores quedan asociados a este lote específico (puede variar de una compra a otra).
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {loteCampos.map((c, idx) => (
                          <div key={c.nombre} className="space-y-1">
                            <Label className="text-xs">{c.etiqueta || c.nombre}</Label>
                            {c.tipo === "Sí/No" ? (
                              <Select value={c.valor} onValueChange={v => updateLoteCampo(idx, v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sí">Sí</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : c.tipo === "Lista" ? (
                              <Select value={c.valor} onValueChange={v => updateLoteCampo(idx, v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar opción…" /></SelectTrigger>
                                <SelectContent>
                                  {(c.opciones ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={c.tipo === "Número" ? "number" : c.tipo === "Fecha" ? "date" : "text"}
                                min={c.tipo === "Número" ? "0" : undefined}
                                onKeyDown={c.tipo === "Número" ? (e => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }) : undefined}
                                value={c.valor}
                                onChange={e => updateLoteCampo(idx, e.target.value)}
                                placeholder={c.etiqueta}
                                className="h-9"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview del lote */}
                  {loteNumero && loteVence && (
                    <div className="rounded-xl border border-green-200 bg-green-50/60 dark:border-green-800/30 dark:bg-green-900/10 px-4 py-3 space-y-1">
                      <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">Lote que se creará:</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold">{loteNumero}</span>
                        <VencimientoBadge fecha={loteVence} />
                        {loteCert && <span className="text-xs text-muted-foreground">{loteCert}</span>}
                        <span className="text-xs text-muted-foreground">{cantidad} {producto.unidad_medida}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
          {paso === 2 && (
            <Button variant="ghost" size="sm" className="gap-1 mr-auto" onClick={() => { setPaso(1); setError(""); }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {/* Paso 1 de compra → ir al paso 2 */}
          {esDosParsos && paso === 1 && (
            <Button
              size="sm"
              onClick={irPaso2}
              disabled={!cantidadStr || parseFloat(cantidadStr) <= 0}
              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* Confirmar final */}
          {(!esDosParsos || paso === 2) && (
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
