/**
 * ConfigInventario.tsx
 *
 * "Reglas de movimiento automático"
 *
 * Cada regla conecta:
 *   Formulario + Campo_cantidad  →  Producto_fijo + Tipo_movimiento
 *
 * Al guardar un registro del formulario, el sistema toma el valor del
 * campo de cantidad y lo aplica automáticamente al producto especificado.
 * El usuario NO necesita saber IDs internos.
 */

import { useState, useMemo } from "react";
import {
  GitBranch, Plus, Pencil, Power, Trash2, Zap,
  Package, Hash, ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Switch }  from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { cn }            from "@/lib/utils";
import { useInventario } from "@/contexts/InventarioContext";
import { useConfig }     from "@/contexts/ConfigContext";
import { getStockStatus } from "@/contexts/InventarioContext";
import type { InvFormularioMapa, InvMovimientoTipo, InvMovimientoSubtipo } from "@/contexts/InventarioContext";
import type { ModParam } from "@/config/moduleDefinitions";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBTIPOS: Record<InvMovimientoTipo, { value: InvMovimientoSubtipo; label: string }[]> = {
  entrada: [
    { value: "compra",     label: "Compra / Recepción" },
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
  entrada: "Entrada ↑", salida: "Salida ↓", ajuste: "Ajuste ⚖",
};
const TIPO_COLORS: Record<InvMovimientoTipo, string> = {
  entrada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  salida:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ajuste:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};
const TIPO_DATO_BADGE: Record<string, string> = {
  Número:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Relación: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Texto:    "bg-slate-100 text-slate-600 dark:bg-slate-800/60",
  Lista:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30",
};

function paramLabel(p: ModParam): string {
  const l = p.etiqueta_personalizada ?? p.nombre.replace(/_/g, " ");
  return l.charAt(0).toUpperCase() + l.slice(1);
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface ReglaForm {
  def_id:          string;   // ID del ModDef seleccionado (solo para cargar params)
  tabla_origen:    string;   // nombre del ModDef → clave en la regla
  catalogo_id:     string;   // ID del producto fijo del inventario
  campo_cantidad:  string;   // nombre del campo del formulario con la cantidad
  tipo_movimiento: InvMovimientoTipo;
  subtipo:         InvMovimientoSubtipo;
  formula_cantidad: string;
  activo:          boolean;
  cliente_id:      string;
}

const EMPTY_FORM: ReglaForm = {
  def_id: "", tabla_origen: "", catalogo_id: "",
  campo_cantidad: "", tipo_movimiento: "salida", subtipo: "uso_produccion",
  formula_cantidad: "", activo: true, cliente_id: "1",
};

// ─── ReglaDialog ──────────────────────────────────────────────────────────────

function ReglaDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InvFormularioMapa | null;
}) {
  const { agregarRegla, editarRegla, catalogos } = useInventario();
  const { definiciones, parametros }             = useConfig();

  const [form, setForm] = useState<ReglaForm>(EMPTY_FORM);
  const [err,  setErr]  = useState("");

  useMemo(() => {
    if (!open) return;
    if (editing) {
      const def = definiciones.find(d => d.nombre === editing.tabla_origen);
      setForm({
        def_id: def?.id ?? "",
        tabla_origen: editing.tabla_origen,
        catalogo_id: editing.catalogo_id,
        campo_cantidad: editing.campo_jsonb_cantidad,
        tipo_movimiento: editing.tipo_movimiento,
        subtipo: editing.subtipo,
        formula_cantidad: editing.formula_cantidad ?? "",
        activo: editing.activo,
        cliente_id: editing.cliente_id,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErr("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // ── Params del formulario seleccionado ──────────────────────────────────────
  const defParams = useMemo(() =>
    form.def_id
      ? parametros.filter(p => p.definicion_id === form.def_id).sort((a, b) => a.orden - b.orden)
      : [],
  [parametros, form.def_id]);

  const numericParams = defParams.filter(p => p.tipo_dato === "Número");
  const otherParams   = defParams.filter(p => p.tipo_dato !== "Número");

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDefChange = (defId: string) => {
    const def = definiciones.find(d => d.id === defId);
    setForm(p => ({ ...p, def_id: defId, tabla_origen: def?.nombre ?? "", campo_cantidad: "" }));
    setErr("");
  };

  const handleTipoChange = (v: string) => {
    const tipo = v as InvMovimientoTipo;
    setForm(p => ({ ...p, tipo_movimiento: tipo, subtipo: SUBTIPOS[tipo][0].value }));
  };

  const handleSave = () => {
    if (!form.tabla_origen) { setErr("Selecciona el formulario de origen."); return; }
    if (!esTablaInsumos && !form.catalogo_id) { setErr("Selecciona el producto del inventario."); return; }
    if (!form.formula_cantidad && !form.campo_cantidad) {
      setErr("Selecciona el campo de cantidad o escribe una fórmula."); return;
    }
    const payload = {
      cliente_id:          form.cliente_id,
      tabla_origen:        form.tabla_origen,
      catalogo_id:         esTablaInsumos ? "" : form.catalogo_id,
      campo_jsonb_cantidad: form.campo_cantidad,
      tipo_movimiento:     form.tipo_movimiento,
      subtipo:             form.subtipo,
      formula_cantidad:    form.formula_cantidad || undefined,
      activo:              form.activo,
    };
    if (editing) editarRegla(editing.id, payload);
    else         agregarRegla(payload);
    onOpenChange(false);
  };

  // ── Derived for preview ──────────────────────────────────────────────────────
  const selectedDef      = definiciones.find(d => d.id === form.def_id);
  const selectedProducto = catalogos.find(c => c.id === form.catalogo_id);
  const selectedCampo    = defParams.find(p => p.nombre === form.campo_cantidad);
  const esTablaInsumos   = selectedCampo?.tipo_dato === "TablaInsumos";
  // Para TablaInsumos no se necesita producto fijo — el producto viene de cada fila
  const canPreview       = !!(form.tabla_origen && (form.campo_cantidad || form.formula_cantidad) && (esTablaInsumos || form.catalogo_id));

  const stockStatus = selectedProducto ? getStockStatus(selectedProducto) : null;
  const stockColor  = stockStatus === "critico" ? "text-red-600" : stockStatus === "bajo" ? "text-amber-600" : "text-green-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-500" />
            {editing ? "Editar regla" : "Nueva regla de movimiento"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-0.5">
            Conecta un formulario con un producto del inventario.
            Al guardar el formulario, el stock se actualiza automáticamente.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Bloque 1: Formulario ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              ¿Qué formulario dispara el movimiento?
            </Label>
            <Select value={form.def_id} onValueChange={handleDefChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar formulario…" />
              </SelectTrigger>
              <SelectContent>
                {definiciones.length === 0 ? (
                  <SelectItem value="__none" disabled>No hay formularios configurados todavía</SelectItem>
                ) : (
                  definiciones.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span>{d.nombre}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{d.modulo}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedDef && (
              <p className="text-[11px] text-muted-foreground">
                Módulo: <strong className="capitalize">{selectedDef.modulo}</strong>
                {defParams.length > 0 && <> · {defParams.length} campos disponibles</>}
              </p>
            )}
          </div>

          {/* ── Bloque 2: Producto (solo si NO es TablaInsumos) ── */}
          {!esTablaInsumos && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                ¿Qué producto del inventario se mueve?
              </Label>
              <Select value={form.catalogo_id} onValueChange={v => setForm(p => ({ ...p, catalogo_id: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar producto…" />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.filter(c => c.activo).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{c.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {c.unidad_medida}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProducto && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Stock actual:</span>
                  <span className={cn("font-semibold", stockColor)}>
                    {selectedProducto.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {selectedProducto.unidad_medida}
                  </span>
                  <span className="text-muted-foreground">· {selectedProducto.categoria}</span>
                </div>
              )}
            </div>
          )}
          {esTablaInsumos && (
            <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5 text-xs dark:border-violet-800/40 dark:bg-violet-900/10">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-200 text-violet-700 text-[10px] font-bold shrink-0 dark:bg-violet-800 dark:text-violet-300">2</span>
              <p className="text-violet-800 dark:text-violet-300">
                <strong>Tabla de insumos detectada.</strong> El producto se leerá de cada fila que el operario complete en el formulario. No es necesario especificar un producto fijo.
              </p>
            </div>
          )}

          {/* ── Bloque 3: Cantidad ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
              ¿Cómo se calcula la cantidad a mover?
            </Label>

            {form.def_id && defParams.length > 0 ? (
              <div className="space-y-2">
                {/* Campo del formulario */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Usar campo del formulario:
                  </p>
                  <Select value={form.campo_cantidad} onValueChange={v => setForm(p => ({ ...p, campo_cantidad: v, formula_cantidad: "" }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar campo numérico…" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericParams.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[10px]">Campos numéricos (recomendados)</SelectLabel>
                          {numericParams.map(p => (
                            <SelectItem key={p.nombre} value={p.nombre}>
                              <span className="flex items-center gap-2">
                                {paramLabel(p)}
                                <span className={cn("rounded px-1 py-0 text-[10px] font-medium", TIPO_DATO_BADGE["Número"])}>
                                  Número
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {otherParams.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[10px]">Otros campos</SelectLabel>
                          {otherParams.map(p => (
                            <SelectItem key={p.nombre} value={p.nombre}>
                              <span className="flex items-center gap-2">
                                {paramLabel(p)}
                                <span className={cn("rounded px-1 py-0 text-[10px] font-medium", TIPO_DATO_BADGE[p.tipo_dato] ?? "bg-muted text-muted-foreground")}>
                                  {p.tipo_dato}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Divisor */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="flex-1 border-t border-dashed border-border" />
                  <span>o usar fórmula</span>
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>

                {/* Fórmula */}
                <div className="space-y-1">
                  <Input
                    value={form.formula_cantidad}
                    onChange={e => setForm(p => ({ ...p, formula_cantidad: e.target.value, campo_cantidad: e.target.value ? "" : p.campo_cantidad }))}
                    placeholder="ej: cajas * 12  ó  kilos * 0.95"
                    className="h-9 font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Usa los nombres de los campos como variables. Ej: <code className="font-mono bg-muted px-1 rounded">pallets * 500</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  value={form.formula_cantidad || form.campo_cantidad}
                  onChange={e => setForm(p => ({ ...p, formula_cantidad: e.target.value, campo_cantidad: e.target.value }))}
                  placeholder="Nombre del campo de cantidad (ej: dosis)"
                  className="h-9 font-mono text-xs"
                />
                {!form.def_id && (
                  <p className="text-[11px] text-muted-foreground">Selecciona un formulario primero para ver sus campos disponibles.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Bloque 4: Tipo movimiento ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">4</span>
              ¿Qué tipo de movimiento genera?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(["entrada", "salida", "ajuste"] as InvMovimientoTipo[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTipoChange(t)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    form.tipo_movimiento === t
                      ? TIPO_COLORS[t] + " border-transparent"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {t === "entrada" ? "📥 Entrada" : t === "salida" ? "📤 Salida" : "⚖ Ajuste"}
                  <p className="mt-0.5 text-[10px] font-normal opacity-70">
                    {t === "entrada" ? "suma stock" : t === "salida" ? "resta stock" : "valor abs."}
                  </p>
                </button>
              ))}
            </div>
            <Select value={form.subtipo} onValueChange={v => setForm(p => ({ ...p, subtipo: v as InvMovimientoSubtipo }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBTIPOS[form.tipo_movimiento].map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <Label className="text-xs cursor-pointer">Regla activa</Label>
              <p className="text-[11px] text-muted-foreground">Si está inactiva no se disparará al guardar</p>
            </div>
            <Switch checked={form.activo} onCheckedChange={v => setForm(p => ({ ...p, activo: v }))} />
          </div>

          {/* Preview */}
          {canPreview && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50/60 px-3 py-2.5 dark:border-green-800/40 dark:bg-green-900/10">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
              <p className="text-xs text-green-800 dark:text-green-400 leading-relaxed">
                Al guardar un registro de <strong>{selectedDef?.nombre ?? form.tabla_origen}</strong>,
                el sistema tomará{" "}
                <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded">
                  {form.formula_cantidad || selectedCampo ? paramLabel(selectedCampo!) : form.campo_cantidad}
                </code>{" "}
                {selectedCampo?.tipo_dato === "Número" && selectedProducto &&
                  <span>({selectedCampo.etiqueta_personalizada ?? selectedCampo.nombre}, en {selectedProducto.unidad_medida})</span>}
                {" "}→ registrará una{" "}
                <strong>{TIPO_LABELS[form.tipo_movimiento]}</strong> en{" "}
                <strong>{selectedProducto?.nombre ?? "—"}</strong>.
              </p>
            </div>
          )}
        </div>

        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>{editing ? "Guardar cambios" : "Crear regla"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TabInventario ────────────────────────────────────────────────────────────

export function TabInventario() {
  const { formularioMapas, toggleRegla, eliminarRegla, catalogos } = useInventario();
  const { definiciones } = useConfig();

  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editingRegla, setEditingRegla] = useState<InvFormularioMapa | null>(null);

  function openCreate() { setEditingRegla(null); setDialogOpen(true); }
  function openEdit(r: InvFormularioMapa) { setEditingRegla(r); setDialogOpen(true); }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Zap className="h-4 w-4 text-amber-500" />
            Reglas de movimiento automático
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Al guardar un registro, estas reglas ajustan el stock del producto vinculado automáticamente.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva regla
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {formularioMapas.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <GitBranch className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">Sin reglas configuradas</p>
            <p className="mt-1 text-xs">Crea una regla para que guardar un formulario mueva stock automáticamente.</p>
            <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Primera regla
            </Button>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Formulario</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground"></th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Campo cantidad</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Movimiento</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {formularioMapas.map(r => {
                  const def      = definiciones.find(d => d.nombre === r.tabla_origen);
                  const producto = catalogos.find(c => c.id === r.catalogo_id);
                  return (
                    <tr key={r.id} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/20", !r.activo && "opacity-50")}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{def?.nombre ?? r.tabla_origen}</p>
                        {def && <p className="text-[10px] text-muted-foreground capitalize">{def.modulo}</p>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{producto?.nombre ?? r.catalogo_id}</p>
                            {producto && (
                              <p className="text-[10px] text-muted-foreground">
                                {producto.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {producto.unidad_medida}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.formula_cantidad
                          ? <code className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-mono text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">{r.formula_cantidad}</code>
                          : <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{r.campo_jsonb_cantidad}</code>
                        }
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", TIPO_COLORS[r.tipo_movimiento])}>
                          {TIPO_LABELS[r.tipo_movimiento]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium",
                          r.activo
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {r.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", r.activo ? "text-muted-foreground" : "text-green-600")} title={r.activo ? "Desactivar" : "Activar"} onClick={() => toggleRegla(r.id)}>
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Eliminar" onClick={() => eliminarRegla(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <strong className="font-medium text-foreground">¿Cómo funciona?</strong>
        {" "}Al guardar un registro en un módulo operativo, el sistema busca reglas activas para ese formulario.
        Cuando encuentra una, lee el campo de cantidad del registro y aplica el movimiento al producto especificado.
        No se requiere ningún campo adicional en el formulario.
      </div>

      <ReglaDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editingRegla} />
    </div>
  );
}
