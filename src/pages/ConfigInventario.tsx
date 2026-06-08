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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// ─── FormulaBuilder — armar fórmulas por chips en vez de escribir texto ───────
// Convierte la fórmula (string) en una secuencia de "fichas" (variable | operador
// | número) que el usuario arma haciendo clic, sin tener que recordar sintaxis.
// El string resultante sigue siendo el mismo que entiende `evaluarFormulaCantidad`
// (solo números, identificadores, + - * / ( )).

const FORMULA_OPERADORES = [
  { tok: "+", label: "+", hint: "Sumar" },
  { tok: "-", label: "−", hint: "Restar" },
  { tok: "*", label: "×", hint: "Multiplicar" },
  { tok: "/", label: "÷", hint: "Dividir" },
  { tok: "(", label: "(", hint: "Abrir grupo" },
  { tok: ")", label: ")", hint: "Cerrar grupo" },
] as const;

function tokenizarFormulaParaChips(formula: string): string[] {
  const re = /\s*(?:([0-9]+(?:\.[0-9]+)?)|([a-zA-Z_]\w*)|([+\-*/()]))/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(formula))) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    const t = m[1] ?? m[2] ?? m[3];
    if (t) tokens.push(t);
  }
  return tokens;
}

function FormulaBuilder({
  value, onChange, variables,
}: {
  value: string;
  onChange: (formula: string) => void;
  variables: ModParam[];
}) {
  const [numEntry, setNumEntry] = useState("");
  const tokens = useMemo(() => tokenizarFormulaParaChips(value), [value]);

  const setTokens = (next: string[]) => onChange(next.join(" "));
  const append    = (tok: string)    => setTokens([...tokens, tok]);
  const removeAt  = (i: number)      => setTokens(tokens.filter((_, idx) => idx !== i));
  const clear     = ()               => onChange("");

  const isVar = (t: string) => /^[a-zA-Z_]/.test(t);
  const chipColor = (t: string) =>
    isVar(t)
      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40"
      : /^[0-9]/.test(t)
        ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700"
        : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40";

  return (
    <div className="space-y-2">
      {/* Fórmula construida — se muestra como secuencia de chips clicables (clic = quitar) */}
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 px-2 py-1.5">
        {tokens.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">
            Sin fórmula — toca los chips de abajo para armar una (ej. {variables[0]?.nombre ?? "campo"} {variables.length > 1 ? `× ${variables[1].nombre}` : "× 2"})
          </span>
        ) : (
          tokens.map((t, i) => (
            <button
              key={`${t}-${i}`}
              type="button"
              onClick={() => removeAt(i)}
              title="Quitar de la fórmula"
              className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] transition-opacity hover:opacity-70", chipColor(t))}
            >
              {t}
              <span className="text-[9px] opacity-60">✕</span>
            </button>
          ))
        )}
        {tokens.length > 0 && (
          <button type="button" onClick={clear} className="ml-auto text-[10px] text-muted-foreground underline hover:text-destructive">
            Limpiar
          </button>
        )}
      </div>

      {/* Paleta: campos numéricos disponibles */}
      {variables.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Campos del formulario</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map(p => (
              <button
                key={p.nombre}
                type="button"
                onClick={() => append(p.nombre)}
                className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[11px] text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
              >
                <Hash className="h-3 w-3" /> {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paleta: operaciones */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">Operación</p>
        <div className="flex flex-wrap gap-1.5">
          {FORMULA_OPERADORES.map(op => (
            <button
              key={op.tok}
              type="button"
              onClick={() => append(op.tok)}
              title={op.hint}
              className="flex h-7 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 font-mono text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
            >
              {op.label}
            </button>
          ))}
          {/* Número literal */}
          <div className="flex items-center gap-1">
            <Input
              value={numEntry}
              onChange={e => setNumEntry(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="núm."
              className="h-7 w-16 px-2 font-mono text-[11px]"
            />
            <Button
              type="button" size="sm" variant="outline"
              className="h-7 px-2 text-[11px]"
              disabled={!numEntry}
              onClick={() => { if (numEntry) { append(numEntry); setNumEntry(""); } }}
            >
              <Plus className="h-3 w-3" /> agregar
            </Button>
          </div>
        </div>
      </div>

      {/* Resultado en texto plano, para quien prefiera leerlo de corrido */}
      {tokens.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Fórmula: <code className="rounded bg-muted px-1 py-0 font-mono text-foreground">{tokens.join(" ")}</code>
        </p>
      )}
    </div>
  );
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

  // Formularios vinculables a inventario: los que tienen "Tabla de insumos"
  // (mueven varios productos por fila) O al menos un campo "Número"
  // (formularios simples — mueven siempre el mismo producto fijo, con
  // cantidad tomada de un campo o calculada con una fórmula).
  const defsVinculables = useMemo(
    () => definiciones.filter(d =>
      parametros.some(p => p.definicion_id === d.id && (p.tipo_dato === "TablaInsumos" || p.tipo_dato === "Número"))
    ),
    [definiciones, parametros],
  );

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

  const tablaInsumosParams = defParams.filter(p => p.tipo_dato === "TablaInsumos");
  const numericParams      = defParams.filter(p => p.tipo_dato === "Número");
  // El formulario es "de tabla de insumos" si tiene ese tipo de campo;
  // si no, es un formulario "simple" (producto fijo + campo/fórmula numérica)
  const formularioEsTablaInsumos = tablaInsumosParams.length > 0;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDefChange = (defId: string) => {
    const def = definiciones.find(d => d.id === defId);
    // Auto-seleccionar el campo TablaInsumos si solo hay uno
    const tiParams = parametros.filter(p => p.definicion_id === defId && p.tipo_dato === "TablaInsumos");
    const autoCampo = tiParams.length === 1 ? tiParams[0].nombre : "";
    setForm(p => ({ ...p, def_id: defId, tabla_origen: def?.nombre ?? "", campo_cantidad: autoCampo, formula_cantidad: "" }));
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
  const esTablaInsumos   = formularioEsTablaInsumos;
  // Para TablaInsumos no se necesita producto fijo — el producto viene de cada fila
  const canPreview       = !!(form.tabla_origen && (form.campo_cantidad || form.formula_cantidad) && (esTablaInsumos || form.catalogo_id));

  const stockStatus = selectedProducto ? getStockStatus(selectedProducto) : null;
  const stockColor  = stockStatus === "critico" ? "text-red-600" : stockStatus === "bajo" ? "text-amber-600" : "text-green-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
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
                {defsVinculables.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Sin formularios con campos numéricos o de "Tabla de insumos"
                  </SelectItem>
                ) : (
                  defsVinculables.map(d => {
                    const esTI = parametros.some(p => p.definicion_id === d.id && p.tipo_dato === "TablaInsumos");
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span>{d.nombre}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{d.modulo}</span>
                          <span className={cn("rounded px-1 py-0 text-[10px] font-medium",
                            esTI ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                                 : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400")}>
                            {esTI ? "Tabla de insumos" : "Producto fijo"}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {defsVinculables.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠ Solo aparecen formularios que tienen un campo tipo "Tabla de insumos" o "Número".
                Ve a <strong>Configuración → Formularios</strong> y agrega uno de esos campos al formulario que quieras vincular.
              </p>
            )}
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

            {!form.def_id ? (
              <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
                Selecciona un formulario en el paso 1 para ver sus campos disponibles.
              </p>
            ) : esTablaInsumos ? (
              // ── Caso A: formulario con Tabla de insumos → producto y cantidad vienen de cada fila ──
              tablaInsumosParams.length === 1 ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 px-3 py-2.5 dark:border-green-800/40 dark:bg-green-900/10">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <div>
                    <p className="text-xs font-medium text-green-800 dark:text-green-300">
                      Campo detectado automáticamente:
                      <span className="ml-1 font-mono">{tablaInsumosParams[0].etiqueta_personalizada ?? tablaInsumosParams[0].nombre}</span>
                    </p>
                    <p className="text-[10px] text-green-700/70 dark:text-green-400/70">
                      Los productos y cantidades se leerán de cada fila de la tabla al guardar
                    </p>
                  </div>
                </div>
              ) : (
                // Múltiples campos TablaInsumos → selector
                <div className="space-y-1.5">
                  <Select value={form.campo_cantidad} onValueChange={v => setForm(p => ({ ...p, campo_cantidad: v, formula_cantidad: "" }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar campo de insumos…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tablaInsumosParams.map(p => (
                        <SelectItem key={p.nombre} value={p.nombre}>
                          <span className="flex items-center gap-2">
                            {paramLabel(p)}
                            <span className={cn("rounded px-1 py-0 text-[10px] font-medium", TIPO_DATO_BADGE["TablaInsumos"] ?? "bg-violet-100 text-violet-700")}>
                              Tabla de insumos
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            ) : numericParams.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[11px] text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                Este formulario no tiene campos numéricos. Ve a{" "}
                <strong>Configuración → Formularios</strong> y agrega uno (ej. "cantidad", "dosis", "kilos").
              </div>
            ) : (
              // ── Caso B: formulario simple (producto fijo) → elegir campo numérico Y/O escribir fórmula ──
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Campo numérico que trae la cantidad (se usa si no hay fórmula, o como respaldo):
                  </p>
                  <Select value={form.campo_cantidad} onValueChange={v => setForm(p => ({ ...p, campo_cantidad: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar campo numérico…" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericParams.map(p => (
                        <SelectItem key={p.nombre} value={p.nombre}>
                          <span className="flex items-center gap-2">
                            {paramLabel(p)}
                            <span className={cn("rounded px-1 py-0 text-[10px] font-medium", TIPO_DATO_BADGE["Número"])}>
                              {p.nombre}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    O, si la cantidad real se calcula combinando varios campos, arma una <strong>fórmula</strong> tocando los chips (opcional):
                  </p>
                  <FormulaBuilder
                    value={form.formula_cantidad}
                    onChange={v => setForm(p => ({ ...p, formula_cantidad: v }))}
                    variables={numericParams}
                  />
                </div>
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
                el sistema {form.formula_cantidad ? "calculará la cantidad con la fórmula" : "tomará"}{" "}
                <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded">
                  {form.formula_cantidad
                    ? form.formula_cantidad
                    : selectedCampo ? paramLabel(selectedCampo) : form.campo_cantidad}
                </code>{" "}
                {!form.formula_cantidad && selectedCampo?.tipo_dato === "Número" && selectedProducto &&
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

function ReglasSection() {
  const { formularioMapas, toggleRegla, eliminarRegla, catalogos } = useInventario();
  const { definiciones } = useConfig();

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editingRegla,  setEditingRegla]  = useState<InvFormularioMapa | null>(null);
  const [toggleTarget,  setToggleTarget]  = useState<InvFormularioMapa | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<InvFormularioMapa | null>(null);

  function openCreate() { setEditingRegla(null); setDialogOpen(true); }
  function openEdit(r: InvFormularioMapa) { setEditingRegla(r); setDialogOpen(true); }

  return (
    <div className="space-y-5">
      {/* Action button */}
      <div className="flex justify-end">
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
                          <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", r.activo ? "text-muted-foreground" : "text-green-600")} title={r.activo ? "Desactivar regla" : "Activar regla"} onClick={() => setToggleTarget(r)}>
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Eliminar regla" onClick={() => setDeleteTarget(r)}>
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

      {/* ── Confirmar activar / desactivar ── */}
      <AlertDialog open={toggleTarget !== null} onOpenChange={() => setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.activo ? "¿Desactivar esta regla?" : "¿Activar esta regla?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.activo
                ? <>La regla <strong>{toggleTarget.tabla_origen}</strong> quedará inactiva y dejará de disparar movimientos de inventario al guardar registros.</>
                : <>La regla <strong>{toggleTarget?.tabla_origen}</strong> se activará y comenzará a disparar movimientos de inventario automáticamente al guardar registros.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={toggleTarget?.activo
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-green-600 text-white hover:bg-green-700"}
              onClick={() => { if (toggleTarget) { toggleRegla(toggleTarget.id); setToggleTarget(null); } }}
            >
              {toggleTarget?.activo ? "Desactivar" : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmar eliminar ── */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta regla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la regla que conecta <strong>{deleteTarget?.tabla_origen}</strong> con el inventario.
              Los registros ya guardados no se verán afectados, pero a partir de ahora guardar ese formulario
              <strong> no actualizará el stock automáticamente</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { eliminarRegla(deleteTarget.id); setDeleteTarget(null); } }}
            >
              Eliminar regla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── TabInventario ─────────────────────────────────────────────────────────────

export function TabInventario() {
  return (
    <div className="space-y-2">
      <div className="mb-5 space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Zap className="h-4 w-4 text-amber-500" />
          Reglas de movimiento automático
        </h2>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Conectan un formulario del sistema con el inventario. Al guardar un registro,
          el stock del producto vinculado se actualiza automáticamente — sin intervención del operario.
        </p>
      </div>
      <ReglasSection />
    </div>
  );
}
