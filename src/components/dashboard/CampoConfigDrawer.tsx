import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Button }   from "@/components/ui/button";
import { Switch }   from "@/components/ui/switch";
import { Badge }    from "@/components/ui/badge";
import { Settings2, Plus, X, Trash2, Link2, Calculator, Table2, SlidersHorizontal, Search, ArrowUpDown, Sparkles, Camera, Info, Database, Brain, Eye, Hash } from "lucide-react";
import type {
  ModParam, CampoValidaciones, CampoDependencia, CampoOpcion,
} from "@/config/moduleDefinitions";
import { useConfig } from "@/contexts/ConfigContext";

// ─── Props ───────────────────────────────────────────────────────────────────

interface CampoConfigDrawerProps {
  open: boolean;
  campo: ModParam | null;
  hermanos: ModParam[];
  onSave: (id: string, updates: Partial<ModParam>) => void;
  onClose: () => void;
}

type CalculoCampoRef = NonNullable<ModParam["calculo_campos"]>[number];

// ─── Component ───────────────────────────────────────────────────────────────

export function CampoConfigDrawer({ open, campo, hermanos, onSave, onClose }: CampoConfigDrawerProps) {
  const { definiciones, parametros } = useConfig();
  const [etiqueta, setEtiqueta]         = useState("");
  const [valorDefault, setValorDefault] = useState("");
  const [visible, setVisible]           = useState(true);
  const [editable, setEditable]         = useState(true);
  const [obligatorio, setObligatorio]   = useState(false);
  const [validaciones, setValidaciones] = useState<CampoValidaciones>({});
  const [opciones, setOpciones]         = useState<CampoOpcion[]>([]);
  const [newOpcion, setNewOpcion]       = useState("");
  const [dependencia, setDependencia]   = useState<CampoDependencia | null>(null);
  const [filtrableRango,    setFiltrableRango]    = useState(false);
  const [filtrableBusqueda, setFiltrableBusqueda] = useState(false);
  const [ordenable,         setOrdenable]         = useState(false);
  const [fuenteDatos,       setFuenteDatos]       = useState<"manual" | "ia" | "ia_editable" | "ml" | "ml_editable">("manual");
  const [iaInstruccion,     setIaInstruccion]     = useState("");
  // Machine Learning
  const [mlModelo,          setMlModelo]          = useState<string>("");
  const [mlInstruccion,     setMlInstruccion]     = useState<string>("");
  const [mlCampoImagen,     setMlCampoImagen]     = useState<string>("");
  // Relación
  const [relacionDefId,      setRelacionDefId]      = useState<string>("");
  const [relacionCampoLabel, setRelacionCampoLabel] = useState<string>("");
  const [relacionCampoValor, setRelacionCampoValor] = useState<string>("");
  const [relacionFiltrosComunes, setRelacionFiltrosComunes] = useState<string[]>([]);
  const [relacionAgruparPor, setRelacionAgruparPor] = useState<string>("");
  // Campos calculados
  const [esCalculado,        setEsCalculado]        = useState<boolean>(false);
  const [calculoTipo,        setCalculoTipo]        = useState<"suma" | "promedio" | "maximo" | "minimo" | "formula_personalizada">("suma");
  const [calculoCampos,      setCalculoCampos]      = useState<CalculoCampoRef[]>([]);
  const [calculoFormula,     setCalculoFormula]     = useState<string>("");

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
    setFiltrableRango(campo.filtrable_rango ?? false);
    setFiltrableBusqueda(campo.filtrable_busqueda ?? false);
    setOrdenable(campo.ordenable ?? false);
    setFuenteDatos(campo.fuente_datos ?? "manual");
    setIaInstruccion(campo.ia_instruccion ?? "");
    setMlModelo(campo.ml_modelo ?? "");
    setMlInstruccion(campo.ml_instruccion ?? "");
    setMlCampoImagen(campo.ml_campo_imagen ?? "");
    setRelacionDefId(campo.relacion_def_id ?? "");
    setRelacionCampoLabel(campo.relacion_campo_label ?? "");
    setRelacionCampoValor(campo.relacion_campo_valor ?? "");
    setRelacionFiltrosComunes(campo.relacion_filtros_comunes ?? []);
    setRelacionAgruparPor(campo.relacion_agrupar_por ?? "");
    setEsCalculado(campo.es_calculado ?? false);
    setCalculoTipo(campo.calculo_tipo ?? "suma");
    setCalculoCampos((campo.calculo_campos ?? []).map((c) => ({
      definicion_id: c.definicion_id,
      campo_nombre: c.campo_nombre,
      filtros_comunes: c.filtros_comunes ?? [],
      agrupar_por: c.agrupar_por ?? null,
    })));
    setCalculoFormula(campo.calculo_formula ?? "");
  }, [campo]);

  if (!campo) return null;

  const tipo = campo.tipo_dato;
  const showNumValidations   = tipo === "Número";
  const showTextValidations  = tipo === "Texto";
  const showOpciones         = tipo === "Lista";
  const showCalculado        = tipo === "Número";
  const showRelacion         = tipo === "Relación";
  const showFiltrableRango    = tipo === "Número";
  const showFiltrableBusqueda = tipo === "Texto" || tipo === "Lista" || tipo === "Fecha" || tipo === "Relación";

  // Para el config de relación: campos disponibles en la definición fuente
  const defFuente = definiciones.find(d => d.id === relacionDefId);
  const camposFuente = defFuente
    ? parametros.filter(p => p.definicion_id === defFuente.id).sort((a, b) => a.orden - b.orden)
    : [];

  const camposDefActual = parametros
    .filter((p) => p.definicion_id === campo.definicion_id && p.id !== campo.id)
    .sort((a, b) => a.orden - b.orden);

  const getCamposComunesConDef = (defId: string) => {
    if (!defId) return [] as ModParam[];
    const camposFuenteDef = parametros
      .filter((p) => p.definicion_id === defId)
      .sort((a, b) => a.orden - b.orden);
    const nombresActuales = new Set(camposDefActual.map((p) => p.nombre));
    return camposFuenteDef.filter((p) => nombresActuales.has(p.nombre));
  };

  const camposComunesRelacion = getCamposComunesConDef(relacionDefId);

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

  const toggleRelacionFiltroComun = (campoNombre: string) => {
    setRelacionFiltrosComunes((prev) =>
      prev.includes(campoNombre)
        ? prev.filter((n) => n !== campoNombre)
        : [...prev, campoNombre],
    );
  };

  const updateCalculoCampo = (index: number, patch: Partial<CalculoCampoRef>) => {
    setCalculoCampos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const toggleCalculoFiltroComun = (index: number, campoNombre: string) => {
    setCalculoCampos((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const prevFiltros = item.filtros_comunes ?? [];
      const nextFiltros = prevFiltros.includes(campoNombre)
        ? prevFiltros.filter((n) => n !== campoNombre)
        : [...prevFiltros, campoNombre];
      return { ...item, filtros_comunes: nextFiltros };
    }));
  };

  const handleSave = () => {
    const isIa = fuenteDatos === "ia" || fuenteDatos === "ia_editable";
    const isMl = fuenteDatos === "ml" || fuenteDatos === "ml_editable";
    onSave(campo.id, {
      etiqueta_personalizada: etiqueta || undefined,
      valor_default: valorDefault || undefined,
      visible,
      editable_campo: esCalculado ? false : (fuenteDatos === "ia" || fuenteDatos === "ml") ? false : editable,
      obligatorio,
      validaciones_adicionales: (showNumValidations || showTextValidations)
        ? Object.keys(validaciones).length > 0 ? validaciones : null
        : null,
      opciones: showOpciones && opciones.length > 0 ? opciones : null,
      dependencias: dependencia,
      filtrable_rango: showFiltrableRango ? filtrableRango || undefined : undefined,
      filtrable_busqueda: showFiltrableBusqueda ? filtrableBusqueda || undefined : undefined,
      ordenable: ordenable || undefined,
      fuente_datos: fuenteDatos !== "manual" ? fuenteDatos : undefined,
      ia_instruccion: isIa && iaInstruccion.trim() ? iaInstruccion.trim() : undefined,
      ml_modelo:       isMl && mlModelo       ? mlModelo       : null,
      ml_instruccion:  isMl && mlInstruccion.trim() ? mlInstruccion.trim() : null,
      ml_campo_imagen: isMl && mlCampoImagen  ? mlCampoImagen  : null,
      relacion_def_id:      showRelacion && relacionDefId      ? relacionDefId      : null,
      relacion_campo_label: showRelacion && relacionCampoLabel ? relacionCampoLabel : null,
      relacion_campo_valor: showRelacion && relacionCampoValor ? relacionCampoValor : null,
      relacion_filtros_comunes: showRelacion && relacionDefId && relacionFiltrosComunes.length > 0
        ? relacionFiltrosComunes
        : null,
      relacion_agrupar_por: showRelacion && relacionDefId && relacionAgruparPor
        ? relacionAgruparPor
        : null,
      es_calculado:         showCalculado && esCalculado ? esCalculado : undefined,
      calculo_tipo:         showCalculado && esCalculado ? calculoTipo : undefined,
      calculo_campos:       showCalculado && esCalculado && calculoCampos.length > 0 ? calculoCampos : undefined,
      calculo_formula:      showCalculado && esCalculado && calculoTipo === "formula_personalizada" && calculoFormula.trim() ? calculoFormula.trim() : undefined,
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

          {/* ── Relación (lookup a otra definición) ── */}
          {showRelacion && (
            <section className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                Origen de datos (Relación)
              </h4>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-background rounded-md px-2.5 py-2 border">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>
                    Este campo mostrará un desplegable con registros de otra definición.
                    Ej: <em>"Personal Siembra"</em> trae los trabajadores del formulario de Personal.
                  </span>
                </div>

                {/* Definición fuente */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Definición fuente</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={relacionDefId}
                    onChange={e => {
                      setRelacionDefId(e.target.value);
                      setRelacionCampoLabel("");
                      setRelacionCampoValor("");
                      setRelacionFiltrosComunes([]);
                      setRelacionAgruparPor("");
                    }}
                  >
                    <option value="">— Seleccionar formulario —</option>
                    {definiciones
                      .filter(d => d.id !== campo.definicion_id)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))
                    }
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Los registros de este formulario aparecerán en el dropdown.
                  </p>
                </div>

                {/* Campo label */}
                {relacionDefId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Campo a mostrar como etiqueta</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={relacionCampoLabel}
                      onChange={e => setRelacionCampoLabel(e.target.value)}
                    >
                      <option value="">— Seleccionar campo —</option>
                      {camposFuente.map(p => (
                        <option key={p.id} value={p.nombre}>
                          {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Qué dato del registro se muestra en el desplegable.
                    </p>
                  </div>
                )}

                {/* Campo valor */}
                {relacionDefId && relacionCampoLabel && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Campo a guardar como valor</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={relacionCampoValor}
                      onChange={e => setRelacionCampoValor(e.target.value)}
                    >
                      <option value="">— Igual que etiqueta —</option>
                      {camposFuente.map(p => (
                        <option key={p.id} value={p.nombre}>
                          {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Qué campo se guarda en el registro. Por defecto es el mismo que la etiqueta.
                    </p>
                  </div>
                )}

                {/* Filtros por campos comunes */}
                {relacionDefId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Filtrar por campos en común</Label>
                      {camposComunesRelacion.length > 0 && (
                        <button
                          type="button"
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => setRelacionFiltrosComunes(camposComunesRelacion.map((c) => c.nombre))}
                        >
                          Usar todos
                        </button>
                      )}
                    </div>

                    {camposComunesRelacion.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">
                        No hay campos comunes entre este formulario y la fuente seleccionada.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {camposComunesRelacion.map((c) => {
                          const active = relacionFiltrosComunes.includes(c.nombre);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleRelacionFiltroComun(c.nombre)}
                              className={active
                                ? "px-2 py-1 rounded-full text-[10px] font-medium border border-primary/40 bg-primary/10 text-primary"
                                : "px-2 py-1 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }
                            >
                              {c.etiqueta_personalizada || c.nombre.replace(/_/g, " ")}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Solo se mostrarán registros fuente que coincidan con estos campos del registro actual.
                    </p>
                  </div>
                )}

                {/* Agrupación visual */}
                {relacionDefId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Agrupar opciones por (opcional)</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={relacionAgruparPor}
                      onChange={(e) => setRelacionAgruparPor(e.target.value)}
                    >
                      <option value="">— Sin agrupación —</option>
                      {camposFuente.map((p) => (
                        <option key={p.id} value={p.nombre}>
                          {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      En la captura se mostrará un prefijo con el grupo para facilitar la selección.
                    </p>
                  </div>
                )}

                {/* Preview del resultado */}
                {relacionDefId && relacionCampoLabel && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-[11px] space-y-0.5">
                    <p className="font-medium text-primary">Vista previa del campo</p>
                    <p className="text-muted-foreground">
                      Al registrar datos, aparecerá un dropdown con los registros de{" "}
                      <strong>{defFuente?.nombre}</strong>, mostrando el campo{" "}
                      <strong>{relacionCampoLabel.replace(/_/g, " ")}</strong>
                      {relacionFiltrosComunes.length > 0 && (
                        <>
                          {" "}y filtrando por coincidencia en{" "}
                          <strong>{relacionFiltrosComunes.join(", ").replace(/_/g, " ")}</strong>
                        </>
                      )}
                      {relacionAgruparPor && (
                        <>
                          {" "}con agrupación por{" "}
                          <strong>{relacionAgruparPor.replace(/_/g, " ")}</strong>
                        </>
                      )}
                      .
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Campos calculados (suma, promedio, etc.) ── */}
          {showCalculado && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-primary" /> Campo calculado
                </h4>
                <Switch
                  checked={esCalculado}
                  onCheckedChange={v => {
                    setEsCalculado(v);
                    if (!v) {
                      setCalculoCampos([]);
                      setCalculoFormula("");
                    }
                  }}
                  className="scale-75"
                />
              </div>

              {esCalculado && (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-background rounded-md px-2.5 py-2 border">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>
                      El valor se calculará automáticamente desde otros campos/formularios usando el tipo de operación seleccionado.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tipo de cálculo</Label>
                    <select
                      value={calculoTipo}
                      onChange={e => {
                        const nuevoTipo = e.target.value as typeof calculoTipo;
                        setCalculoTipo(nuevoTipo);
                        // Limpiar datos cuando cambias de tipo para evitar inconsistencias
                        if (nuevoTipo === "formula_personalizada") {
                          setCalculoCampos([]); // Limpiar campos externos
                        } else {
                          setCalculoFormula(""); // Limpiar fórmula local
                        }
                      }}
                      className="w-full h-8 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      <option value="suma">Suma (campos externos)</option>
                      <option value="promedio">Promedio (campos externos)</option>
                      <option value="maximo">Máximo (campos externos)</option>
                      <option value="minimo">Mínimo (campos externos)</option>
                      <option value="formula_personalizada">Fórmula avanzada (campos locales)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      {calculoTipo === "formula_personalizada"
                        ? "Fórmula con campos del mismo formulario y operadores matemáticos"
                        : "Operación simple sobre campos de otros formularios"
                      }
                    </p>
                  </div>

                  {/* Cálculos simples con campos externos */}
                  {calculoTipo !== "formula_personalizada" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Campos de otros formularios</Label>
                      {calculoCampos.map((item, index) => {
                        const defSeleccionada = definiciones.find(d => d.id === item.definicion_id);
                        const camposDeDefinicion = defSeleccionada
                          ? parametros.filter(p => p.definicion_id === defSeleccionada.id && p.tipo_dato === "Número")
                          : [];
                        const camposComunes = getCamposComunesConDef(item.definicion_id);
                        const filtrosComunesActivos = item.filtros_comunes ?? [];

                        return (
                          <div key={index} className="space-y-2 p-2 bg-background rounded-md border">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={item.definicion_id}
                                  onChange={e => {
                                    updateCalculoCampo(index, {
                                      definicion_id: e.target.value,
                                      campo_nombre: "",
                                      filtros_comunes: [],
                                      agrupar_por: null,
                                    });
                                  }}
                                  className="flex-1 min-w-0 w-full h-7 text-xs px-2 rounded border border-border bg-background"
                                >
                                  <option value="">— Seleccionar formulario —</option>
                                  {definiciones.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => {
                                    const nuevos = calculoCampos.filter((_, i) => i !== index);
                                    setCalculoCampos(nuevos);
                                  }}
                                  className="shrink-0 px-2 h-7 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {item.definicion_id && (
                                <select
                                  value={item.campo_nombre}
                                  onChange={e => updateCalculoCampo(index, { campo_nombre: e.target.value })}
                                  className="w-full min-w-0 h-7 text-xs px-2 rounded border border-border bg-background"
                                >
                                  <option value="">— Seleccionar campo —</option>
                                  {camposDeDefinicion.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre.replace(/_/g, " ")}</option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {item.definicion_id && (
                              <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Filtros por campos comunes
                                  </p>
                                  {camposComunes.length > 0 && (
                                    <button
                                      type="button"
                                      className="text-[10px] text-primary hover:underline"
                                      onClick={() => updateCalculoCampo(index, { filtros_comunes: camposComunes.map((c) => c.nombre) })}
                                    >
                                      Usar todos
                                    </button>
                                  )}
                                </div>

                                {camposComunes.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground italic">
                                    No hay campos comunes con esta fuente.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {camposComunes.map((c) => {
                                      const active = filtrosComunesActivos.includes(c.nombre);
                                      return (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => toggleCalculoFiltroComun(index, c.nombre)}
                                          className={active
                                            ? "px-2 py-1 rounded-full text-[10px] font-medium border border-primary/40 bg-primary/10 text-primary"
                                            : "px-2 py-1 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                          }
                                        >
                                          {c.etiqueta_personalizada || c.nombre.replace(/_/g, " ")}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Agrupar fuente por (opcional)</Label>
                                  <select
                                    value={item.agrupar_por ?? ""}
                                    onChange={(e) => updateCalculoCampo(index, { agrupar_por: e.target.value || null })}
                                    className="w-full h-7 text-xs px-2 rounded border border-border bg-background"
                                  >
                                    <option value="">— Sin agrupación —</option>
                                    {parametros
                                      .filter((p) => p.definicion_id === item.definicion_id)
                                      .map((p) => (
                                        <option key={p.id} value={p.nombre}>
                                          {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button
                        onClick={() => {
                          const nuevos = [...calculoCampos, {
                            definicion_id: "",
                            campo_nombre: "",
                            filtros_comunes: [],
                            agrupar_por: null,
                          }];
                          setCalculoCampos(nuevos);
                        }}
                        className="w-full h-7 text-xs border border-dashed border-border hover:border-primary/50 rounded flex items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Agregar campo externo
                      </button>
                    </div>
                  )}

                  {/* Fórmulas avanzadas con campos locales */}
                  {calculoTipo === "formula_personalizada" && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2.5 py-2 border border-amber-200 dark:border-amber-800">
                        <Hash className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          Construye una fórmula matemática usando campos del mismo formulario, números y operadores.
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Constructor de fórmula</Label>

                        {/* Vista de tokens */}
                        <div className="min-h-[40px] rounded-md border border-input bg-background p-2 flex flex-wrap gap-1.5 items-center">
                          {!calculoFormula || calculoFormula.trim() === "" ? (
                            <span className="text-xs text-muted-foreground italic">Selecciona campos y operadores para construir la fórmula...</span>
                          ) : (
                            calculoFormula.split(/\s+/).filter(Boolean).map((token, i) => {
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
                        {calculoFormula && calculoFormula.trim() && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground"
                              onClick={() => {
                                const tokens = calculoFormula.split(/\s+/).filter(Boolean);
                                tokens.pop();
                                setCalculoFormula(tokens.join(" "));
                              }}
                            >
                              ← Borrar último
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Grid de controles organizados */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* Campos disponibles */}
                        {numericHermanos.length > 0 ? (
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Campos numéricos</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {numericHermanos.map(h => (
                                <Button
                                  key={h.id}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-emerald-600/50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                                  onClick={() => setCalculoFormula(prev => prev ? prev + " " + h.nombre : h.nombre)}
                                >
                                  {h.nombre.replace(/_/g, " ")}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              <strong>No hay campos numéricos disponibles</strong> en este formulario para crear fórmulas.
                              Agrega primero otros campos numéricos para poder referenciarlos.
                            </p>
                          </div>
                        )}

                        {/* Operadores */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Operadores</Label>
                          <div className="flex gap-1.5">
                            {operators.map(op => (
                              <Button
                                key={op.value}
                                variant="outline"
                                size="sm"
                                className="h-7 w-8 text-xs font-mono border-blue-600/50 text-blue-600 hover:bg-blue-600 hover:text-white p-0 transition-colors"
                                onClick={() => setCalculoFormula(prev => prev ? prev + " " + op.value : op.value)}
                              >
                                {op.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Número literal */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Números</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              className="h-7 text-xs flex-1"
                              placeholder="Ej: 100, 0.5, -10"
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && !isNaN(Number(val))) {
                                    setCalculoFormula(prev => prev ? prev + " " + val : val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs border-amber-600/50 text-amber-600 hover:bg-amber-600 hover:text-white"
                              onClick={(e) => {
                                const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                                const val = input?.value.trim();
                                if (val && !isNaN(Number(val))) {
                                  setCalculoFormula(prev => prev ? prev + " " + val : val);
                                  input.value = "";
                                }
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Fórmula resultante */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fórmula final</Label>
                        <code className="block bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs font-mono text-foreground min-h-[28px] flex items-center">
                          {calculoFormula || "—"}
                        </code>
                      </div>
                    </div>
                  )}
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

          {/* ── Fuente de datos (IA / ML) ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Fuente de datos
              </h4>
              <Switch
                checked={fuenteDatos !== "manual"}
                onCheckedChange={v => setFuenteDatos(v ? "ia_editable" : "manual")}
              />
            </div>

            {fuenteDatos !== "manual" && (
              <div className="space-y-3">
                {/* Selector de tipo: IA vs ML */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFuenteDatos(fuenteDatos === "ml" || fuenteDatos === "ml_editable" ? "ia_editable" : fuenteDatos)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      fuenteDatos === "ia" || fuenteDatos === "ia_editable"
                        ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                        : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Inteligencia Artificial
                  </button>
                  <button
                    onClick={() => setFuenteDatos(fuenteDatos === "ia" || fuenteDatos === "ia_editable" ? "ml_editable" : fuenteDatos)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      fuenteDatos === "ml" || fuenteDatos === "ml_editable"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                        : "border-border hover:border-cyan-500/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    Machine Learning
                  </button>
                </div>

                {/* Panel IA */}
                {(fuenteDatos === "ia" || fuenteDatos === "ia_editable") && (
                  <div className="space-y-3 bg-violet-500/5 rounded-lg p-3 border border-violet-500/20">
                    <div className="flex items-start gap-2 text-[11px] text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-md px-2.5 py-2 border border-violet-200 dark:border-violet-800">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        IA analiza contenido (texto, documentos) para extraer información y llenar este campo automáticamente.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Modo de llenado</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setFuenteDatos("ia")}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            fuenteDatos === "ia"
                              ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                              : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Solo IA</span>
                          <span className="text-[9px] font-normal text-muted-foreground">Campo de solo lectura</span>
                        </button>
                        <button
                          onClick={() => setFuenteDatos("ia_editable")}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            fuenteDatos === "ia_editable"
                              ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                              : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Camera className="w-4 h-4" />
                          <span>IA + Editable</span>
                          <span className="text-[9px] font-normal text-muted-foreground">Usuario puede corregir</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Instrucción para la IA</Label>
                      <textarea
                        value={iaInstruccion}
                        onChange={e => setIaInstruccion(e.target.value)}
                        placeholder="Ej: Identificar plagas y enfermedades visibles en la foto del cultivo…"
                        rows={3}
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                )}

                {/* Panel ML */}
                {(fuenteDatos === "ml" || fuenteDatos === "ml_editable") && (
                  <div className="space-y-3 bg-cyan-500/5 rounded-lg p-3 border border-cyan-500/20">
                    <div className="flex items-start gap-2 text-[11px] text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 rounded-md px-2.5 py-2 border border-cyan-200 dark:border-cyan-800">
                      <Brain className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Machine Learning analiza imágenes para detectar colores, contar objetos, clasificar calidad y más.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Modo de llenado</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setFuenteDatos("ml")}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            fuenteDatos === "ml"
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                              : "border-border hover:border-cyan-500/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Brain className="w-4 h-4" />
                          <span>Solo ML</span>
                          <span className="text-[9px] font-normal text-muted-foreground">Campo de solo lectura</span>
                        </button>
                        <button
                          onClick={() => setFuenteDatos("ml_editable")}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            fuenteDatos === "ml_editable"
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                              : "border-border hover:border-cyan-500/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          <span>ML + Editable</span>
                          <span className="text-[9px] font-normal text-muted-foreground">Usuario puede corregir</span>
                        </button>
                      </div>
                    </div>

                    {/* Campo de imagen fuente */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Campo de imagen a analizar</Label>
                      <select
                        value={mlCampoImagen}
                        onChange={e => setMlCampoImagen(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">— Seleccionar campo de foto —</option>
                        {hermanos.filter(h => h.tipo_dato === "Foto").map(h => (
                          <option key={h.id} value={h.id}>{h.nombre.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">El modelo analizará la imagen de este campo.</p>
                    </div>

                    {/* Modelo ML */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Función / Modelo ML</Label>
                      <select
                        value={mlModelo}
                        onChange={e => setMlModelo(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">— Seleccionar modelo —</option>
                        <option value="color_detection">🎨 Detección de colores</option>
                        <option value="fruit_counter">🔢 Contador de frutas</option>
                        <option value="quality_classifier">⭐ Clasificador de calidad</option>
                        <option value="defect_detector">🔍 Detector de defectos</option>
                        <option value="size_estimator">📏 Estimador de tamaño</option>
                        <option value="ripeness_detector">🍇 Detector de madurez</option>
                        <option value="custom">⚙️ Personalizado</option>
                      </select>
                    </div>

                    {/* Descripción del modelo seleccionado */}
                    {mlModelo && mlModelo !== "custom" && (
                      <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2.5 py-2">
                        {mlModelo === "color_detection" && "Detecta y clasifica los colores predominantes en la imagen. Útil para evaluar madurez por color del fruto."}
                        {mlModelo === "fruit_counter" && "Cuenta el número de frutas visibles en la imagen. Ideal para estimar producción o rendimiento."}
                        {mlModelo === "quality_classifier" && "Clasifica la calidad general (buena/regular/mala) basándose en la apariencia visual."}
                        {mlModelo === "defect_detector" && "Identifica defectos visibles como manchas, daños mecánicos, plagas o enfermedades."}
                        {mlModelo === "size_estimator" && "Estima el tamaño o calibre de los objetos en la imagen comparando con referencias."}
                        {mlModelo === "ripeness_detector" && "Evalúa el nivel de madurez del fruto basándose en color, textura y apariencia."}
                      </div>
                    )}

                    {/* Instrucción personalizada */}
                    {(mlModelo === "custom" || mlModelo) && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">
                          {mlModelo === "custom" ? "Instrucción para el modelo" : "Instrucción adicional (opcional)"}
                        </Label>
                        <textarea
                          value={mlInstruccion}
                          onChange={e => setMlInstruccion(e.target.value)}
                          placeholder={mlModelo === "custom"
                            ? "Ej: Identificar el porcentaje de arándanos azules vs rojos en la imagen…"
                            : "Ej: Enfocarse solo en los frutos del primer plano…"
                          }
                          rows={3}
                          className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none placeholder:text-muted-foreground/60"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

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
