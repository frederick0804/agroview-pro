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
  CalendarClock, Lock, Unlock, ChevronDown, X, Settings2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { ModParam, ConfigVentanaAjuste } from "@/config/moduleDefinitions";
import { useRole } from "@/contexts/RoleContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBTIPOS: Record<InvMovimientoTipo, { value: InvMovimientoSubtipo; label: string }[]> = {
  entrada: [
    { value: "compra",     label: "Compra / Recepción" },
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
  def_id:          string;
  tabla_origen:    string;
  catalogo_id:     string;
  campo_cantidad:  string;
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
  // Step navigation for the new 2-panel wizard
  const [step, setStep] = useState<1 | 2>(1);

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

  // Reset step when dialog opens/closes
  useMemo(() => { if (!open) setStep(1); }, [open]);

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
  const esTablaInsumos   = formularioEsTablaInsumos;
  const canPreview       = !!(form.tabla_origen && (form.campo_cantidad || form.formula_cantidad) && (esTablaInsumos || form.catalogo_id));

  const stockStatus = selectedProducto ? getStockStatus(selectedProducto) : null;
  const stockColor  = stockStatus === "critico" ? "text-red-600" : stockStatus === "bajo" ? "text-amber-600" : "text-green-600";

  // ── Step 1: pick form + quantity field; Step 2: pick product + movement ──
  const step1Valid = !!(form.tabla_origen && (form.campo_cantidad || form.formula_cantidad));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-500 shrink-0" />
            <DialogTitle className="text-base">
              {editing ? "Editar regla" : "Nueva regla de movimiento"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cuando se guarda un registro del formulario, el stock se actualiza automáticamente.
          </p>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {([
              { n: 1, label: "Formulario y campo" },
              { n: 2, label: "Producto y movimiento" },
            ] as { n: 1|2; label: string }[]).map(({ n, label }) => (
              <button
                key={n}
                type="button"
                onClick={() => { if (n === 2 && !step1Valid) return; setStep(n); setErr(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  step === n
                    ? "bg-primary text-primary-foreground border-transparent"
                    : step1Valid || n === 1
                    ? "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    : "border-border/40 text-muted-foreground/40 cursor-not-allowed",
                )}
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  step === n ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted",
                )}>{n}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ══ STEP 1: Formulario + campo de cantidad ══ */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Formulario */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Formulario de origen
                </Label>
                <Select value={form.def_id} onValueChange={handleDefChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar formulario…" />
                  </SelectTrigger>
                  <SelectContent>
                    {defsVinculables.length === 0 ? (
                      <SelectItem value="__none" disabled>Sin formularios con campos numéricos</SelectItem>
                    ) : defsVinculables.map(d => {
                      const esTI = parametros.some(p => p.definicion_id === d.id && p.tipo_dato === "TablaInsumos");
                      return (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2">
                            <span>{d.nombre}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">{d.modulo}</span>
                            {esTI && (
                              <span className="rounded px-1 py-0 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                Tabla de insumos
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {defsVinculables.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    ⚠ Solo aparecen formularios con campos tipo "Número" o "Tabla de insumos".
                    Ve a <strong>Configuración → Formularios</strong> y agrega uno.
                  </p>
                )}
              </div>

              {/* Campos del formulario — chips seleccionables */}
              {form.def_id && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Campo que aporta la cantidad
                  </Label>

                  {esTablaInsumos ? (
                    // TablaInsumos: campo(s) automáticos
                    tablaInsumosParams.length === 1 ? (
                      <div
                        className="flex items-center gap-2.5 rounded-xl border border-green-300 bg-green-50/70 px-3 py-2.5 cursor-default dark:border-green-800/40 dark:bg-green-900/10"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                            {tablaInsumosParams[0].etiqueta_personalizada ?? tablaInsumosParams[0].nombre}
                          </p>
                          <p className="text-[10px] text-green-700/70 dark:text-green-400/70">
                            Tabla de insumos · producto y cantidad se leen de cada fila
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tablaInsumosParams.map(p => {
                          const sel = form.campo_cantidad === p.nombre;
                          return (
                            <button
                              key={p.nombre} type="button"
                              onClick={() => setForm(prev => ({ ...prev, campo_cantidad: p.nombre, formula_cantidad: "" }))}
                              className={cn(
                                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                                sel
                                  ? "border-violet-400 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                  : "border-border bg-background text-muted-foreground hover:border-violet-300 hover:bg-violet-50/50",
                              )}
                            >
                              {sel && <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />}
                              <span>{paramLabel(p)}</span>
                              <span className="rounded bg-violet-100 px-1 text-[10px] text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                                Tabla insumos
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : numericParams.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[11px] text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                      Este formulario no tiene campos numéricos.
                      Ve a <strong>Configuración → Formularios</strong> y agrega uno (ej. "cantidad", "dosis", "kilos").
                    </div>
                  ) : (
                    // Campos numéricos — chips clicables
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {numericParams.map(p => {
                          const sel = form.campo_cantidad === p.nombre && !form.formula_cantidad;
                          return (
                            <button
                              key={p.nombre} type="button"
                              onClick={() => setForm(prev => ({ ...prev, campo_cantidad: p.nombre, formula_cantidad: "" }))}
                              className={cn(
                                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                                sel
                                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
                              )}
                            >
                              {sel
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                : <Hash className="h-3.5 w-3.5 opacity-50" />
                              }
                              <span className="font-medium">{paramLabel(p)}</span>
                              <span className="font-mono text-[10px] opacity-60">{p.nombre}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Toggle fórmula */}
                      <div className="rounded-xl border border-border bg-muted/10">
                        <button
                          type="button"
                          onClick={() => {
                            if (form.formula_cantidad) {
                              setForm(p => ({ ...p, formula_cantidad: "" }));
                            } else {
                              setForm(p => ({ ...p, formula_cantidad: " ", campo_cantidad: "" }));
                            }
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Usar fórmula</span>
                            <span className="text-[10px] text-muted-foreground/60">combina varios campos</span>
                          </div>
                          <Switch
                            checked={form.formula_cantidad !== ""}
                            onCheckedChange={() => {}}
                            className="pointer-events-none scale-75 origin-right"
                          />
                        </button>
                        {form.formula_cantidad !== "" && (
                          <div className="px-3 pb-3 pt-0 border-t border-border space-y-2">
                            <FormulaBuilder
                              value={form.formula_cantidad}
                              onChange={v => setForm(p => ({ ...p, formula_cantidad: v, campo_cantidad: v ? "" : p.campo_cantidad }))}
                              variables={numericParams}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vista previa del paso 1 */}
              {step1Valid && selectedDef && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-foreground/80">
                    <strong>{selectedDef.nombre}</strong>
                    <span className="text-muted-foreground"> · campo </span>
                    <code className="rounded bg-primary/10 px-1 font-mono text-primary text-[11px]">
                      {form.formula_cantidad || form.campo_cantidad}
                    </code>
                    <span className="text-muted-foreground"> → define producto y movimiento en el paso 2</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: Producto + tipo de movimiento ══ */}
          {step === 2 && (
            <div className="space-y-4">

              {/* Resumen del paso 1 (read-only) */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{selectedDef?.nombre ?? form.tabla_origen}</strong>
                  <span> · </span>
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">
                    {form.formula_cantidad || form.campo_cantidad}
                  </code>
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto text-[10px] text-primary hover:underline shrink-0"
                >Cambiar</button>
              </div>

              {/* Producto */}
              {!esTablaInsumos ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Producto del inventario
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
                    <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{selectedProducto.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedProducto.categoria}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-bold tabular-nums", stockColor)}>
                          {selectedProducto.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{selectedProducto.unidad_medida}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2.5 dark:border-violet-800/40 dark:bg-violet-900/10">
                  <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-800 dark:text-violet-300">
                    <strong>Tabla de insumos.</strong> El producto se lee de cada fila del formulario — no se requiere producto fijo.
                  </p>
                </div>
              )}

              {/* Tipo de movimiento */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tipo de movimiento
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["entrada", "salida"] as InvMovimientoTipo[]).map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => handleTipoChange(t)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-xs font-medium transition-all text-left",
                        form.tipo_movimiento === t
                          ? TIPO_COLORS[t] + " border-transparent shadow-sm"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <p className="text-sm mb-0.5">
                        {t === "entrada" ? "📥" : t === "salida" ? "📤" : "⚖"}
                        {" "}{t.charAt(0).toUpperCase() + t.slice(1)}
                      </p>
                      <p className="text-[10px] font-normal opacity-70">
                        {t === "entrada" ? "Suma al stock" : t === "salida" ? "Resta del stock" : "Valor absoluto"}
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
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <div>
                  <Label className="text-xs font-medium cursor-pointer">Regla activa</Label>
                  <p className="text-[10px] text-muted-foreground">Si está inactiva no se disparará al guardar</p>
                </div>
                <Switch checked={form.activo} onCheckedChange={v => setForm(p => ({ ...p, activo: v }))} />
              </div>

              {/* Preview de la regla completa */}
              {canPreview && (
                <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3 dark:border-green-800/40 dark:bg-green-900/10 space-y-2">
                  <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                    Vista previa de la regla
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-green-800 dark:text-green-300">
                    <span className="rounded-lg bg-white/70 border border-green-200 dark:bg-green-900/30 dark:border-green-800/40 px-2 py-1 font-medium">
                      {selectedDef?.nombre ?? form.tabla_origen}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <code className="rounded bg-white/70 border border-green-200 dark:bg-green-900/30 dark:border-green-800/40 px-2 py-1 font-mono text-[11px]">
                      {form.formula_cantidad || form.campo_cantidad}
                    </code>
                    <ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium border", TIPO_COLORS[form.tipo_movimiento])}>
                      {TIPO_LABELS[form.tipo_movimiento]}
                    </span>
                    {selectedProducto && (
                      <>
                        <span className="text-green-600 dark:text-green-500">en</span>
                        <span className="rounded-lg bg-white/70 border border-green-200 dark:bg-green-900/30 dark:border-green-800/40 px-2 py-1 font-medium">
                          {selectedProducto.nombre}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {err && (
          <div className="mx-5 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" size="sm" onClick={() => { setStep(1); setErr(""); }}>
                ← Atrás
              </Button>
            )}
            {step === 1 ? (
              <Button
                size="sm"
                disabled={!step1Valid}
                onClick={() => { if (step1Valid) { setStep(2); setErr(""); } }}
              >
                Siguiente →
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave}>
                {editing ? "Guardar cambios" : "Crear regla"}
              </Button>
            )}
          </div>
        </div>
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

// ─── VentanasAjusteSection ────────────────────────────────────────────────────

function diasAperturaLabel(dias: number) {
  return `Abre ${dias}d antes del fin de mes`;
}

function diasCierreLabel(dias: number) {
  if (dias === -1) return "cierra al inicio del mes siguiente";
  if (dias === 0)  return "cierra el último día del mes";
  return `cierra ${dias}d antes del fin de mes`;
}

function computeEstadoHoy(cfg: ConfigVentanaAjuste): "en_ventana" | "fuera_ventana" {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = today.getDate();
  const openDay = lastDay - cfg.dias_apertura;
  let closeY = y, closeM = m, closeD: number;
  if (cfg.dias_cierre === -1) {
    closeD = 1; closeM += 1;
    if (closeM > 11) { closeM = 0; closeY++; }
  } else {
    closeD = lastDay - cfg.dias_cierre;
  }
  const isIn = day >= openDay && new Date(y, m, day) <= new Date(closeY, closeM, closeD);
  return isIn ? "en_ventana" : "fuera_ventana";
}

const EMPTY_CONFIG_FORM = { cliente_id: "", productor_id: "", dias_apertura: "5", dias_cierre: "1", cierre_inicio_mes: false, notas: "" };

function VentanasAjusteSection() {
  const { configVentanas, crearConfigVentana, editarConfigVentana, eliminarConfigVentana, toggleConfigVentana } = useInventario();
  const { clientes, productores } = useRole();

  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CONFIG_FORM);
  const [err,  setErr]  = useState("");

  const productoresFiltrados = useMemo(() =>
    form.cliente_id ? productores.filter(p => p.clienteId === Number(form.cliente_id)) : [],
    [form.cliente_id, productores],
  );

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_CONFIG_FORM);
    setErr("");
    setShowForm(true);
  }

  function openEdit(v: ConfigVentanaAjuste) {
    setEditId(v.id);
    setForm({
      cliente_id:        String(v.cliente_id),
      productor_id:      v.productor_id ? String(v.productor_id) : "",
      dias_apertura:     String(v.dias_apertura),
      dias_cierre:       v.dias_cierre === -1 ? "1" : String(v.dias_cierre),
      cierre_inicio_mes: v.dias_cierre === -1,
      notas:             v.notas ?? "",
    });
    setErr("");
    setShowForm(true);
  }

  function handleSave() {
    if (!form.cliente_id) { setErr("Selecciona un cliente."); return; }
    const dA = Number(form.dias_apertura);
    const dC = form.cierre_inicio_mes ? -1 : Number(form.dias_cierre);
    if (isNaN(dA) || dA < 1) { setErr("Los días de apertura deben ser ≥ 1."); return; }
    if (!form.cierre_inicio_mes && (isNaN(Number(form.dias_cierre)) || Number(form.dias_cierre) < 0)) {
      setErr("Los días de cierre deben ser ≥ 0."); return;
    }
    const payload: Omit<ConfigVentanaAjuste, "id" | "created_at" | "updated_at"> = {
      cliente_id:    Number(form.cliente_id),
      productor_id:  form.productor_id ? Number(form.productor_id) : undefined,
      dias_apertura: dA,
      dias_cierre:   dC,
      activa:        true,
      notas:         form.notas || undefined,
    };
    if (editId) {
      editarConfigVentana(editId, payload);
    } else {
      crearConfigVentana(payload);
    }
    setShowForm(false);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarClock className="h-4 w-4 text-primary/70" />
            Ventanas de ajuste de stock
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Regla recurrente por cliente. El sistema activa y desactiva la ventana automáticamente
            cada mes según los días configurados — sin intervención manual.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Nueva regla
        </Button>
      </div>

      {/* Lista */}
      {configVentanas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-xl border-border/60">
          <CalendarClock className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Sin reglas configuradas</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Crea una regla para habilitar el ajuste de stock al fin de mes</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {configVentanas.map(v => {
            const cliente   = clientes.find(c => c.id === v.cliente_id);
            const productor = v.productor_id ? productores.find(p => p.id === v.productor_id) : null;
            const estado    = v.activa ? computeEstadoHoy(v) : null;
            return (
              <div key={v.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors group", v.activa ? "hover:bg-muted/20" : "opacity-50 hover:bg-muted/10")}>
                {/* Toggle activa */}
                <Switch
                  checked={v.activa}
                  onCheckedChange={() => toggleConfigVentana(v.id)}
                  className="shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{cliente?.nombre ?? `Cliente ${v.cliente_id}`}</span>
                    {productor && <span className="text-xs text-muted-foreground/70">· {productor.nombre}</span>}
                    {v.activa && estado && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                        estado === "en_ventana"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-muted text-muted-foreground border-border",
                      )}>
                        {estado === "en_ventana" ? "En ventana" : "Fuera de ventana"}
                      </span>
                    )}
                    {!v.activa && (
                      <span className="text-[10px] text-muted-foreground/50 italic">Inactiva</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {diasAperturaLabel(v.dias_apertura)} · {diasCierreLabel(v.dias_cierre)}
                    {v.notas && <span className="ml-2 text-muted-foreground/50">· {v.notas}</span>}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDel(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar regla de ventana" : "Nueva regla de ventana"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm(p => ({ ...p, cliente_id: v, productor_id: "" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {productoresFiltrados.length > 0 && (
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Productor <span className="text-muted-foreground">(vacío = todos)</span></Label>
                  <Select value={form.productor_id || "_all"} onValueChange={v => setForm(p => ({ ...p, productor_id: v === "_all" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos los productores" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos los productores</SelectItem>
                      {productoresFiltrados.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Abre</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number" min="1" max="28"
                    value={form.dias_apertura}
                    onChange={e => setForm(p => ({ ...p, dias_apertura: e.target.value }))}
                    className="h-8 text-xs w-16"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">días antes del fin</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cierra</Label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input type="radio" id="cierre-dias" checked={!form.cierre_inicio_mes}
                      onChange={() => setForm(p => ({ ...p, cierre_inicio_mes: false }))} className="accent-primary" />
                    <label htmlFor="cierre-dias" className="text-xs text-muted-foreground">días antes del fin</label>
                    {!form.cierre_inicio_mes && (
                      <Input type="number" min="0" max="28" value={form.dias_cierre}
                        onChange={e => setForm(p => ({ ...p, dias_cierre: e.target.value }))}
                        className="h-7 text-xs w-14" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" id="cierre-inicio" checked={form.cierre_inicio_mes}
                      onChange={() => setForm(p => ({ ...p, cierre_inicio_mes: true }))} className="accent-primary" />
                    <label htmlFor="cierre-inicio" className="text-xs text-muted-foreground">al inicio del mes siguiente</label>
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Notas <span className="text-muted-foreground">(opcional)</span></Label>
                <Input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Cierre contable, auditoría…" className="h-8 text-xs" />
              </div>
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{editId ? "Guardar cambios" : "Crear regla"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDel} onOpenChange={o => { if (!o) setConfirmDel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar regla?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la configuración de ventana para este cliente. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (confirmDel) eliminarConfigVentana(confirmDel); setConfirmDel(null); }}>
              Eliminar
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
    <Tabs defaultValue="reglas" className="space-y-4">
      <TabsList className="h-9">
        <TabsTrigger value="reglas" className="gap-1.5 text-xs">
          <Zap className="h-3.5 w-3.5" /> Reglas de movimiento
        </TabsTrigger>
        <TabsTrigger value="ventanas" className="gap-1.5 text-xs">
          <CalendarClock className="h-3.5 w-3.5" /> Ventanas de ajuste
        </TabsTrigger>
      </TabsList>

      <TabsContent value="reglas" className="space-y-2 mt-0">
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
      </TabsContent>

      <TabsContent value="ventanas" className="mt-0">
        <VentanasAjusteSection />
      </TabsContent>
    </Tabs>
  );
}
