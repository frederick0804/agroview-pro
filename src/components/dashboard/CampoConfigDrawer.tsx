import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Button }   from "@/components/ui/button";
import { Switch }   from "@/components/ui/switch";
import { Badge }    from "@/components/ui/badge";
import { Settings2, Plus, X, Trash2, Link2, Calculator, Table2, SlidersHorizontal, Search, ArrowUpDown } from "lucide-react";
import type {
  ModParam, CampoValidaciones, CampoDependencia, CampoOpcion,
} from "@/config/moduleDefinitions";

// ─── Props ───────────────────────────────────────────────────────────────────

interface CampoConfigDrawerProps {
  open: boolean;
  campo: ModParam | null;
  hermanos: ModParam[];
  onSave: (id: string, updates: Partial<ModParam>) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CampoConfigDrawer({ open, campo, hermanos, onSave, onClose }: CampoConfigDrawerProps) {
  const [etiqueta, setEtiqueta]         = useState("");
  const [valorDefault, setValorDefault] = useState("");
  const [visible, setVisible]           = useState(true);
  const [editable, setEditable]         = useState(true);
  const [obligatorio, setObligatorio]   = useState(false);
  const [validaciones, setValidaciones] = useState<CampoValidaciones>({});
  const [opciones, setOpciones]         = useState<CampoOpcion[]>([]);
  const [newOpcion, setNewOpcion]       = useState("");
  const [dependencia, setDependencia]   = useState<CampoDependencia | null>(null);
  const [formula, setFormula]           = useState<string>("");
  const [formulaEnabled, setFormulaEnabled] = useState(false);
  const [filtrableRango,    setFiltrableRango]    = useState(false);
  const [filtrableBusqueda, setFiltrableBusqueda] = useState(false);
  const [ordenable,         setOrdenable]         = useState(false);

  useEffect(() => {
    if (!campo) return;
    setEtiqueta(campo.etiqueta_personalizada ?? "");
    setValorDefault(campo.valor_default ?? "");
    setVisible(campo.visible !== false);
    setEditable(campo.editable_campo !== false);
    setObligatorio(campo.obligatorio);
    setValidaciones(campo.validaciones_adicionales ?? {});
    setOpciones(campo.opciones ?? []);
    setDependencia(campo.dependencias ?? null);
    setFormula(campo.formula ?? "");
    setFormulaEnabled(!!campo.formula);
    setFiltrableRango(campo.filtrable_rango ?? false);
    setFiltrableBusqueda(campo.filtrable_busqueda ?? false);
    setOrdenable(campo.ordenable ?? false);
  }, [campo]);

  if (!campo) return null;

  const tipo = campo.tipo_dato;
  const showNumValidations = tipo === "Número";
  const showTextValidations = tipo === "Texto";
  const showOpciones = tipo === "Lista";
  const showFormula = tipo === "Número";
  const showFiltrableRango    = tipo === "Número";
  const showFiltrableBusqueda = tipo === "Texto" || tipo === "Lista" || tipo === "Fecha";

  // Parse formula into tokens for visual display
  const formulaTokens = formula
    ? formula.split(/\s+/).filter(Boolean)
    : [];

  const addFormulaToken = (token: string) => {
    setFormula(prev => (prev ? prev + " " + token : token));
  };

  const removeLastToken = () => {
    setFormula(prev => {
      const tokens = prev.split(/\s+/).filter(Boolean);
      tokens.pop();
      return tokens.join(" ");
    });
  };

  const operators = [
    { value: "+", label: "+" },
    { value: "-", label: "−" },
    { value: "*", label: "×" },
    { value: "/", label: "÷" },
    { value: "(", label: "(" },
    { value: ")", label: ")" },
  ];

  const numericHermanos = hermanos.filter(
    h => h.id !== campo.id && h.tipo_dato === "Número"
  );

  const handleSave = () => {
    const hasFormula = formulaEnabled && formula.trim();
    onSave(campo.id, {
      etiqueta_personalizada: etiqueta || undefined,
      valor_default: valorDefault || undefined,
      visible,
      editable_campo: hasFormula ? false : editable,
      obligatorio,
      validaciones_adicionales: (showNumValidations || showTextValidations)
        ? Object.keys(validaciones).length > 0 ? validaciones : null
        : null,
      opciones: showOpciones && opciones.length > 0 ? opciones : null,
      dependencias: dependencia,
      formula: hasFormula ? formula.trim() : null,
      filtrable_rango: showFiltrableRango ? filtrableRango || undefined : undefined,
      filtrable_busqueda: showFiltrableBusqueda ? filtrableBusqueda || undefined : undefined,
      ordenable: ordenable || undefined,
    });
    onClose();
  };

  const addOpcion = () => {
    const val = newOpcion.trim();
    if (!val || opciones.some(o => o.value === val)) return;
    setOpciones(prev => [...prev, { value: val.toLowerCase().replace(/ /g, "_"), label: val }]);
    setNewOpcion("");
  };

  const removeOpcion = (value: string) =>
    setOpciones(prev => prev.filter(o => o.value !== value));

  const otrosCampos = hermanos.filter(h => h.id !== campo.id);

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-[420px] sm:w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Configuración de campo
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{campo.nombre.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary" className="text-xs">{tipo}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">

          {/* ── General ── */}
          <section className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</h4>

            <div className="space-y-2">
              <Label htmlFor="cfg-etiqueta">Etiqueta personalizada</Label>
              <Input
                id="cfg-etiqueta"
                value={etiqueta}
                onChange={e => setEtiqueta(e.target.value)}
                placeholder={campo.nombre.replace(/_/g, " ")}
              />
              <p className="text-[10px] text-muted-foreground">Si se deja vacío, se usa el nombre del campo.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg-default">Valor por defecto</Label>
              {tipo === "Sí/No" ? (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={valorDefault === "true"}
                    onCheckedChange={v => setValorDefault(v ? "true" : "")}
                  />
                  <span className="text-sm text-muted-foreground">{valorDefault === "true" ? "Sí" : "No"}</span>
                </div>
              ) : tipo === "Lista" && opciones.length > 0 ? (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={valorDefault}
                  onChange={e => setValorDefault(e.target.value)}
                >
                  <option value="">— Sin valor —</option>
                  {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input
                  id="cfg-default"
                  type={tipo === "Número" ? "number" : tipo === "Fecha" ? "date" : "text"}
                  value={valorDefault}
                  onChange={e => setValorDefault(e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="flex flex-col items-center gap-1.5">
                <Switch checked={visible} onCheckedChange={setVisible} />
                <Label className="text-[10px] text-muted-foreground">Visible</Label>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Switch checked={editable} onCheckedChange={setEditable} />
                <Label className="text-[10px] text-muted-foreground">Editable</Label>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Switch checked={obligatorio} onCheckedChange={setObligatorio} />
                <Label className="text-[10px] text-muted-foreground">Obligatorio</Label>
              </div>
            </div>
          </section>

          {/* ── Validaciones ── */}
          {(showNumValidations || showTextValidations) && (
            <section className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validaciones</h4>

              {showNumValidations && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mínimo</Label>
                    <Input
                      type="number"
                      value={validaciones.min ?? ""}
                      onChange={e => setValidaciones(p => ({ ...p, min: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Máximo</Label>
                    <Input
                      type="number"
                      value={validaciones.max ?? ""}
                      onChange={e => setValidaciones(p => ({ ...p, max: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                </div>
              )}

              {showTextValidations && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Long. mínima</Label>
                      <Input
                        type="number"
                        value={validaciones.min_length ?? ""}
                        onChange={e => setValidaciones(p => ({ ...p, min_length: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Long. máxima</Label>
                      <Input
                        type="number"
                        value={validaciones.max_length ?? ""}
                        onChange={e => setValidaciones(p => ({ ...p, max_length: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Patrón (regex)</Label>
                    <Input
                      value={validaciones.pattern ?? ""}
                      onChange={e => setValidaciones(p => ({ ...p, pattern: e.target.value || undefined }))}
                      placeholder="Ej: ^[A-Z]{2}-\\d{4}$"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensaje de error</Label>
                    <Input
                      value={validaciones.pattern_message ?? ""}
                      onChange={e => setValidaciones(p => ({ ...p, pattern_message: e.target.value || undefined }))}
                      placeholder="Ej: Formato inválido"
                    />
                  </div>
                </>
              )}
            </section>
          )}

          {/* ── Opciones (Lista) ── */}
          {showOpciones && (
            <section className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opciones de la lista</h4>

              <div className="space-y-2">
                {opciones.map(o => (
                  <div key={o.value} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 border border-border">
                    <span className="text-sm">{o.label}</span>
                    <button onClick={() => removeOpcion(o.value)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newOpcion}
                  onChange={e => setNewOpcion(e.target.value)}
                  placeholder="Nueva opción..."
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOpcion(); } }}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addOpcion} disabled={!newOpcion.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </section>
          )}

          {/* ── Fórmula (campo calculado) ── */}
          {showFormula && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5" /> Campo calculado
                </h4>
                <Switch
                  checked={formulaEnabled}
                  onCheckedChange={v => {
                    setFormulaEnabled(v);
                    if (!v) setFormula("");
                  }}
                />
              </div>

              {formulaEnabled && (
                <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border">
                  {/* Vista de tokens */}
                  <div className="min-h-[40px] rounded-md border border-input bg-background p-2 flex flex-wrap gap-1.5 items-center">
                    {formulaTokens.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Selecciona campos y operadores...</span>
                    ) : (
                      formulaTokens.map((token, i) => {
                        const isField = numericHermanos.some(h => h.nombre === token);
                        const isOp = ["+", "-", "*", "/", "(", ")"].includes(token);
                        const isNum = !isField && !isOp && !isNaN(Number(token));
                        return (
                          <Badge
                            key={i}
                            variant={isField ? "default" : isOp ? "secondary" : "outline"}
                            className={`text-xs cursor-default ${
                              isField
                                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                                : isOp
                                  ? "bg-blue-600 hover:bg-blue-600 text-white font-mono"
                                  : isNum
                                    ? "bg-amber-600 hover:bg-amber-600 text-white font-mono"
                                    : "text-destructive border-destructive"
                            }`}
                          >
                            {isField ? token.replace(/_/g, " ") : token}
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  {/* Botón borrar último */}
                  {formulaTokens.length > 0 && (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={removeLastToken}>
                        ← Borrar último
                      </Button>
                    </div>
                  )}

                  {/* Campos disponibles */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Campos</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {numericHermanos.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No hay otros campos numéricos en esta definición.</span>
                      ) : (
                        numericHermanos.map(h => (
                          <Button
                            key={h.id}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/20"
                            onClick={() => addFormulaToken(h.nombre)}
                          >
                            {h.nombre.replace(/_/g, " ")}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Operadores */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Operadores</Label>
                    <div className="flex gap-1.5">
                      {operators.map(op => (
                        <Button
                          key={op.value}
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 text-xs font-mono border-blue-600/50 text-blue-400 hover:bg-blue-600/20 p-0"
                          onClick={() => addFormulaToken(op.value)}
                        >
                          {op.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Número literal */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Agregar número</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="h-7 text-xs flex-1"
                        placeholder="Ej: 100"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !isNaN(Number(val))) {
                              addFormulaToken(val);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Fórmula raw (lectura) */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Fórmula resultante</Label>
                    <code className="block bg-background border border-input rounded-md px-3 py-1.5 text-xs font-mono text-foreground">
                      {formula || "—"}
                    </code>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Los campos calculados son de solo lectura. El valor se calcula automáticamente cuando se ingresan datos.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Tabla ── */}
          {(showFiltrableRango || showFiltrableBusqueda || true) && (
            <section className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Table2 className="w-3.5 h-3.5" /> Comportamiento en tabla
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed -mt-2">
                Controles que aparecerán en el encabezado de esta columna.
              </p>

              {showFiltrableRango && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Filtrar por rango</p>
                      <p className="text-[10px] text-muted-foreground">Botón ≥ / ≤ para filtrar por valor mínimo y máximo</p>
                    </div>
                  </div>
                  <Switch checked={filtrableRango} onCheckedChange={setFiltrableRango} />
                </div>
              )}

              {showFiltrableBusqueda && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Activar búsqueda</p>
                      <p className="text-[10px] text-muted-foreground">Barra de búsqueda de texto libre en la columna</p>
                    </div>
                  </div>
                  <Switch checked={filtrableBusqueda} onCheckedChange={setFiltrableBusqueda} />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Ordenable</p>
                    <p className="text-[10px] text-muted-foreground">Permite ordenar ↑ asc / ↓ desc al hacer clic en el encabezado</p>
                  </div>
                </div>
                <Switch checked={ordenable} onCheckedChange={setOrdenable} />
              </div>
            </section>
          )}

          {/* ── Dependencia ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" /> Dependencia
              </h4>
              {!dependencia && otrosCampos.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setDependencia({ campo_id: otrosCampos[0].id, operador: "=", valor: "", accion: "mostrar" })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              )}
            </div>

            {dependencia ? (
              <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Este campo se...</span>
                  <button onClick={() => setDependencia(null)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Acción</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={dependencia.accion}
                      onChange={e => setDependencia(p => p ? { ...p, accion: e.target.value as CampoDependencia["accion"] } : p)}
                    >
                      <option value="mostrar">Mostrar</option>
                      <option value="ocultar">Ocultar</option>
                      <option value="requerir">Requerir</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Cuando</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={dependencia.campo_id}
                      onChange={e => setDependencia(p => p ? { ...p, campo_id: e.target.value } : p)}
                    >
                      {otrosCampos.map(h => (
                        <option key={h.id} value={h.id}>{h.nombre.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Operador</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={dependencia.operador}
                      onChange={e => setDependencia(p => p ? { ...p, operador: e.target.value as CampoDependencia["operador"] } : p)}
                    >
                      <option value="=">=</option>
                      <option value="!=">≠</option>
                      <option value=">">{">"}</option>
                      <option value="<">{"<"}</option>
                      <option value="contiene">contiene</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Valor</Label>
                    <Input
                      className="h-8 text-xs"
                      value={dependencia.valor}
                      onChange={e => setDependencia(p => p ? { ...p, valor: e.target.value } : p)}
                      placeholder="Valor..."
                    />
                  </div>
                </div>
              </div>
            ) : otrosCampos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No hay otros campos en esta definición.</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin dependencia configurada.</p>
            )}
          </section>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar configuración</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
