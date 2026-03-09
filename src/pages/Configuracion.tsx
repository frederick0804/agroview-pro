import { useState } from "react";
import { cn } from "@/lib/utils";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Button }  from "@/components/ui/button";
import { Switch }  from "@/components/ui/switch";
import { Badge }   from "@/components/ui/badge";
import {
  Layers, List, Table2, Palette, Settings2, BookOpen,
  Upload, ChevronDown, ChevronUp, Pencil, Save, X, Plus,
  Trash2, Info, CheckCircle2, Clock, Archive, Database,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import {
  parseValores, tipoBadgeColor, tipoLabels, tipoDatoInputType, estadoBadge,
  type ModDef, type ModParam, type ModDato, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
} from "@/config/moduleDefinitions";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MODULO_OPTIONS = [
  { value: "vivero",           label: "Vivero" },
  { value: "cultivo",          label: "Cultivo" },
  { value: "cosecha",          label: "Cosecha" },
  { value: "post-cosecha",     label: "Post-cosecha" },
  { value: "laboratorio",      label: "Laboratorio" },
  { value: "produccion",       label: "Producción" },
  { value: "recursos-humanos", label: "Recursos Humanos" },
  { value: "comercial",        label: "Comercial" },
];

const TIPO_OPTIONS = [
  { value: "estructura_campo", label: "Estructura Campo" },
  { value: "calibres",         label: "Calibres" },
  { value: "datos_personal",   label: "Datos Personal" },
  { value: "asistencia",       label: "Asistencia" },
  { value: "lab_analisis",     label: "Lab. Análisis" },
  { value: "personalizado",    label: "Personalizado" },
];

const TIPO_DATO_OPTIONS = [
  { value: "Texto",  label: "Texto" },
  { value: "Número", label: "Número" },
  { value: "Fecha",  label: "Fecha" },
  { value: "Sí/No",  label: "Sí/No" },
  { value: "Lista",  label: "Lista (select)" },
];

const ESTADO_OPTIONS = [
  { value: "activo",    label: "Activo" },
  { value: "borrador",  label: "Borrador" },
  { value: "archivado", label: "Archivado" },
];

// ─── EstadoIcon ───────────────────────────────────────────────────────────────

function EstadoIcon({ estado }: { estado: EstadoDef }) {
  if (estado === "activo")    return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (estado === "borrador")  return <Clock        className="w-3.5 h-3.5 text-yellow-600" />;
  return                             <Archive       className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Panel de Definiciones ────────────────────────────────────────────────────

function TabDefiniciones() {
  const { definiciones, parametros, datos, addDef, updDef, delDef } = useConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const colsDefinicion: Column<ModDef>[] = [
    { key: "modulo",      header: "Módulo",      width: "160px", type: "select",  options: MODULO_OPTIONS },
    { key: "tipo",        header: "Tipo",         width: "160px", type: "select",  options: TIPO_OPTIONS },
    { key: "nombre",      header: "Nombre",        width: "220px" },
    { key: "descripcion", header: "Descripción",   width: "260px" },
    { key: "version",     header: "Versión",        width: "75px" },
    { key: "nivel_minimo",header: "Nivel mín.",    width: "90px",  type: "number" },
    { key: "estado",      header: "Estado",         width: "110px", type: "select", options: ESTADO_OPTIONS },
  ];

  return (
    <div className="space-y-6">
      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {definiciones.filter(d => d.nombre).map(d => {
          const campoCount = parametros.filter(p => p.definicion_id === d.id).length;
          const datoCount  = datos.filter(dt => dt.definicion_id === d.id).length;
          const isExpanded = expandedId === d.id;
          const campitos   = parametros.filter(p => p.definicion_id === d.id).sort((a,b) => a.orden - b.orden);

          return (
            <div
              key={d.id}
              className={cn(
                "bg-card border rounded-xl overflow-hidden transition-all",
                isExpanded ? "border-primary/40 shadow-md" : "border-border hover:border-border/80 hover:shadow-sm",
              )}
            >
              {/* Cabecera de la card */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700")}>
                      {tipoLabels[d.tipo as TipoConfig] ?? d.tipo}
                    </span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1", estadoBadge[d.estado ?? "borrador"])}>
                      <EstadoIcon estado={d.estado ?? "borrador"} />
                      {d.estado ?? "borrador"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">v{d.version}</span>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{d.nombre}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{d.descripcion || "Sin descripción"}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <List className="w-3 h-3" /> {campoCount} campos
                    </span>
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3" /> {datoCount} registros
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {MODULO_OPTIONS.find(m => m.value === d.modulo)?.label ?? d.modulo}
                  </span>
                </div>
              </div>

              {/* Toggle campos */}
              {campoCount > 0 && (
                <>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border hover:bg-muted/40 transition-colors"
                  >
                    <span>Ver campos asignados</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20 border-t border-border">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        {campitos.map(c => (
                          <span key={c.id} className="text-xs bg-background border border-border rounded-md px-2 py-1 flex items-center gap-1">
                            <span className="font-medium">{c.nombre.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground/60">· {c.tipo_dato}</span>
                            {c.obligatorio && <span className="text-destructive text-[10px]">*</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Card — Nueva Definición */}
        <button
          onClick={addDef}
          className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all min-h-[120px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Nueva Definición</span>
        </button>
      </div>

      {/* Tabla editable */}
      <EditableTable
        title="Registro de Definiciones"
        data={definiciones}
        columns={colsDefinicion}
        onUpdate={updDef}
        onDelete={delDef}
        onAdd={addDef}
      />
    </div>
  );
}

// ─── Panel Biblioteca de Parámetros ───────────────────────────────────────────

function TabBiblioteca() {
  const { parametrosLib, addParamLib, updParamLib, delParamLib } = useConfig();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newParam, setNewParam] = useState<Partial<Parametro>>({
    nombre: "", codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false,
  });

  const handleCreate = () => {
    if (!newParam.nombre?.trim()) return;
    addParamLib(newParam);
    setNewParam({ nombre: "", codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false });
    setShowCreateForm(false);
  };

  const colsLib: Column<Parametro>[] = [
    { key: "nombre",              header: "Nombre (snake_case)", width: "180px" },
    { key: "codigo",              header: "Código",               width: "90px" },
    { key: "tipo_dato",           header: "Tipo",                  width: "120px", type: "select", options: TIPO_DATO_OPTIONS },
    { key: "unidad_medida",       header: "Unidad",               width: "80px" },
    { key: "descripcion",         header: "Descripción",           width: "260px" },
    { key: "obligatorio_default", header: "Oblig. default",        width: "100px", type: "checkbox" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex-1">
          <strong>Biblioteca Global</strong> — catálogo de campos reutilizables en cualquier módulo.
          Al agregar un campo a una definición, se sugiere desde aquí.
        </div>
        <Button onClick={() => setShowCreateForm(v => !v)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Crear Parámetro
        </Button>
      </div>

      {/* Formulario de creación rápida */}
      {showCreateForm && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Nuevo Parámetro en la Biblioteca
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
              <Input
                value={newParam.nombre ?? ""}
                onChange={e => setNewParam(p => ({ ...p, nombre: e.target.value.replace(/ /g, "_").toLowerCase() }))}
                placeholder="ej. temperatura_suelo"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Código</Label>
              <Input
                value={newParam.codigo ?? ""}
                onChange={e => setNewParam(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="ej. TEMP_SUE"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de dato</Label>
              <select
                value={newParam.tipo_dato ?? "Texto"}
                onChange={e => setNewParam(p => ({ ...p, tipo_dato: e.target.value as TipoDato }))}
                className="w-full h-8 text-sm border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIPO_DATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidad</Label>
              <Input
                value={newParam.unidad_medida ?? ""}
                onChange={e => setNewParam(p => ({ ...p, unidad_medida: e.target.value }))}
                placeholder="ej. °C, mm, gr"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5 col-span-2 lg:col-span-3">
              <Label className="text-xs">Descripción</Label>
              <Input
                value={newParam.descripcion ?? ""}
                onChange={e => setNewParam(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Describe para qué se usa este parámetro"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs">Obligatorio por defecto</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  checked={newParam.obligatorio_default ?? false}
                  onCheckedChange={v => setNewParam(p => ({ ...p, obligatorio_default: v }))}
                />
                <span className="text-xs text-muted-foreground">{newParam.obligatorio_default ? "Sí" : "No"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleCreate} disabled={!newParam.nombre?.trim()}>
              <Save className="w-4 h-4 mr-2" /> Guardar en Biblioteca
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de la biblioteca */}
      <EditableTable
        title={`Biblioteca de Parámetros (${parametrosLib.length})`}
        data={parametrosLib}
        columns={colsLib}
        onUpdate={(idx, key, val) => updParamLib(parametrosLib[idx].id, key, val)}
        onDelete={idx => delParamLib(parametrosLib[idx].id)}
        onAdd={() => setShowCreateForm(true)}
        searchable
      />
    </div>
  );
}

// ─── Panel Campos (Campos_configurados) ───────────────────────────────────────

function TabCampos() {
  const { definiciones, parametros, parametrosLib, addPar, updParByIdx, delParByIdx } = useConfig();
  const [filterDefId, setFilterDefId] = useState<string>("all");

  // Sugerencias para autocomplete: nombres de la biblioteca global
  const sugerencias = parametrosLib
    .filter(p => p.activo)
    .map(p => ({ value: p.nombre, label: p.nombre }));

  const filteredParametros = filterDefId === "all"
    ? parametros
    : parametros.filter(p => p.definicion_id === filterDefId);

  const updFiltered = (rowIndex: number, k: keyof ModParam, v: unknown) => {
    const item = filteredParametros[rowIndex];
    const origIdx = parametros.findIndex(p => p.id === item.id);
    if (origIdx !== -1) updParByIdx(origIdx, k, v);
  };

  const delFiltered = (rowIndex: number) => {
    const item = filteredParametros[rowIndex];
    const origIdx = parametros.findIndex(p => p.id === item.id);
    if (origIdx !== -1) delParByIdx(origIdx);
  };

  const addFiltered = () =>
    addPar(filterDefId === "all" ? (definiciones[0]?.id ?? "") : filterDefId);

  const getDefNombre = (id: string) =>
    definiciones.find(d => d.id === id)?.nombre ?? `Def. ${id}`;

  const colsCampos: Column<ModParam>[] = [
    {
      key:     "definicion_id",
      header:  "Definición",
      width:   "200px",
      type:    "select",
      options: definiciones.map(d => ({ value: d.id, label: d.nombre || `(sin nombre — ${d.id})` })),
    },
    {
      key:     "nombre",
      header:  "Campo",
      width:   "200px",
      type:    "autocomplete",
      options: sugerencias,
    },
    {
      key:     "tipo_dato",
      header:  "Tipo",
      width:   "130px",
      type:    "select",
      options: TIPO_DATO_OPTIONS,
    },
    { key: "orden",      header: "Orden", width: "70px",  type: "number" },
    { key: "obligatorio",header: "Oblig.",width: "75px",  type: "checkbox" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
        Asigna <strong>campos de la Biblioteca</strong> a cada definición. Escribe en el campo
        "Campo" para buscar en la biblioteca o crear uno nuevo.
      </div>

      {/* Chips de filtro por definición */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterDefId("all")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
            filterDefId === "all"
              ? "bg-foreground text-background border-transparent"
              : "bg-background text-muted-foreground border-border hover:border-foreground/50",
          )}
        >
          Todos <span className="opacity-60">({parametros.length})</span>
        </button>
        {definiciones.map(d => {
          const count = parametros.filter(p => p.definicion_id === d.id).length;
          return (
            <button
              key={d.id}
              onClick={() => setFilterDefId(d.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                filterDefId === d.id
                  ? `${tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700"} border-transparent`
                  : "bg-background text-muted-foreground border-border hover:border-foreground/50",
              )}
            >
              {d.nombre || `(def ${d.id})`}
              <span className="opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      <EditableTable
        title={filterDefId === "all" ? "Todos los Campos" : `Campos — ${getDefNombre(filterDefId)}`}
        data={filteredParametros}
        columns={colsCampos}
        onUpdate={updFiltered}
        onDelete={delFiltered}
        onAdd={addFiltered}
        searchable={false}
      />
    </div>
  );
}

// ─── Panel Datos ──────────────────────────────────────────────────────────────

function TabDatos() {
  const { definiciones, parametros, datos, addDato, updDato, delDato } = useConfig();
  const [filterDefId,     setFilterDefId]     = useState<string>("all");
  const [expandedDatoIds, setExpandedDatoIds] = useState<Set<string>>(new Set());
  const [editingDatoId,   setEditingDatoId]   = useState<string | null>(null);
  const [editingDato,     setEditingDato]      = useState<ModDato | null>(null);

  const getDefNombre = (id: string) =>
    definiciones.find(d => d.id === id)?.nombre ?? `Def. ${id}`;

  const getDefParams = (id: string) =>
    parametros.filter(p => p.definicion_id === id).sort((a, b) => a.orden - b.orden);

  const filteredDatos = filterDefId === "all"
    ? datos
    : datos.filter(d => d.definicion_id === filterDefId);

  const toggleExpand = (id: string) =>
    setExpandedDatoIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const startEdit = (dato: ModDato) => {
    setEditingDatoId(dato.id);
    setEditingDato({ ...dato });
    setExpandedDatoIds(prev => new Set([...prev, dato.id]));
  };

  const cancelEdit = () => { setEditingDatoId(null); setEditingDato(null); };

  const saveEdit = () => {
    if (!editingDato) return;
    updDato(editingDato.id, editingDato);
    setEditingDatoId(null);
    setEditingDato(null);
  };

  const updateEditingField = (fieldName: string, value: string) => {
    if (!editingDato) return;
    const parsed = parseValores(editingDato.valores);
    parsed[fieldName] = value;
    setEditingDato({ ...editingDato, valores: JSON.stringify(parsed) });
  };

  const changeEditingDef = (newDefId: string) => {
    if (!editingDato) return;
    const emptyVals: Record<string, string> = {};
    getDefParams(newDefId).forEach(p => { emptyVals[p.nombre] = ""; });
    setEditingDato({ ...editingDato, definicion_id: newDefId, valores: JSON.stringify(emptyVals) });
  };

  const addNewDato = () => {
    const defId = filterDefId === "all" ? (definiciones[0]?.id ?? "") : filterDefId;
    if (!defId) return;
    const newDato = addDato(defId);
    setEditingDatoId(newDato.id);
    setEditingDato(newDato);
    setExpandedDatoIds(prev => new Set([...prev, newDato.id]));
    if (filterDefId === "all") setFilterDefId(defId);
  };

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
        Valores reales de cada definición. Los campos se presentan según su tipo y configuración.
      </div>

      {/* Chips filtro */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterDefId("all")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
            filterDefId === "all"
              ? "bg-foreground text-background border-transparent"
              : "bg-background text-muted-foreground border-border hover:border-foreground/50",
          )}
        >
          Todos <span className="opacity-60">({datos.length})</span>
        </button>
        {definiciones.map(d => {
          const count = datos.filter(dt => dt.definicion_id === d.id).length;
          return (
            <button
              key={d.id}
              onClick={() => setFilterDefId(d.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                filterDefId === d.id
                  ? `${tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700"} border-transparent`
                  : "bg-background text-muted-foreground border-border hover:border-foreground/50",
              )}
            >
              {d.nombre || `(def ${d.id})`}
              <span className="opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Panel de datos */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">
            {filterDefId === "all" ? "Todos los Registros" : `Registros — ${getDefNombre(filterDefId)}`}
          </h3>
          <Button onClick={addNewDato} size="sm" disabled={definiciones.length === 0}>
            <Plus className="w-4 h-4 mr-1.5" /> Agregar registro
          </Button>
        </div>

        <div className="divide-y divide-border">
          {filteredDatos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No hay registros. Haz click en <strong>Agregar registro</strong> para comenzar.
            </div>
          ) : (
            filteredDatos.map(dato => {
              const isExpanded  = expandedDatoIds.has(dato.id);
              const isEditing   = editingDatoId === dato.id;
              const defObj      = definiciones.find(d => d.id === dato.definicion_id);
              const activeDefId = isEditing && editingDato ? editingDato.definicion_id : dato.definicion_id;
              const defParams   = getDefParams(activeDefId);
              const parsedVals  = parseValores(isEditing && editingDato ? editingDato.valores : dato.valores);

              return (
                <div key={dato.id}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    isEditing ? "bg-primary/5" : "hover:bg-muted/30",
                  )}>
                    {defObj && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                        tipoBadgeColor[defObj.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700",
                      )}>
                        {tipoLabels[defObj.tipo as TipoConfig] ?? defObj.tipo}
                      </span>
                    )}

                    {isEditing && editingDato ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <select
                          value={editingDato.definicion_id}
                          onChange={e => changeEditingDef(e.target.value)}
                          className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {definiciones.map(d => (
                            <option key={d.id} value={d.id}>{d.nombre || `(def ${d.id})`}</option>
                          ))}
                        </select>
                        <Input
                          value={editingDato.referencia}
                          onChange={e => setEditingDato({ ...editingDato, referencia: e.target.value })}
                          placeholder="Referencia"
                          className="h-8 text-sm w-44"
                        />
                        <input
                          type="date"
                          value={editingDato.fecha}
                          onChange={e => setEditingDato({ ...editingDato, fecha: e.target.value })}
                          className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {dato.referencia || <span className="text-muted-foreground italic">Sin referencia</span>}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{dato.fecha}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {defParams.length} campo{defParams.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={saveEdit} className="h-7 text-xs px-3">
                            <Save className="w-3.5 h-3.5 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs px-2">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleExpand(dato.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                          >
                            {isExpanded
                              ? <><ChevronUp   className="w-3.5 h-3.5" /> Ocultar</>
                              : <><ChevronDown className="w-3.5 h-3.5" /> Ver campos</>}
                          </button>
                          <button
                            onClick={() => startEdit(dato)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => delDato(dato.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {(isExpanded || isEditing) && (
                    <div className={cn(
                      "px-4 pb-5 pt-3",
                      isEditing ? "bg-primary/5 border-t border-primary/10" : "bg-muted/20 border-t border-border",
                    )}>
                      {defParams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Sin campos definidos. Agrégalos en la pestaña <strong>Campos</strong>.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {defParams.map(param => {
                            const fieldVal = isEditing && editingDato
                              ? (parseValores(editingDato.valores)[param.nombre] ?? "")
                              : (parsedVals[param.nombre] ?? "—");
                            return (
                              <div key={param.id} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <span className="capitalize">{param.nombre.replace(/_/g, " ")}</span>
                                  {param.obligatorio && <span className="text-destructive" title="Obligatorio">*</span>}
                                  <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">{param.tipo_dato}</span>
                                </p>
                                {isEditing ? (
                                  <input
                                    type={tipoDatoInputType[param.tipo_dato]}
                                    value={parseValores(editingDato!.valores)[param.nombre] ?? ""}
                                    onChange={e => updateEditingField(param.nombre, e.target.value)}
                                    placeholder={param.nombre.replace(/_/g, " ")}
                                    className="w-full h-8 text-sm border border-border rounded-md px-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                ) : (
                                  <div className="text-sm text-foreground bg-background border border-border rounded-md px-2.5 py-1.5 min-h-[34px] truncate">
                                    {String(fieldVal)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {filteredDatos.length} de {datos.length} registros
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface BrandConfig {
  nombreEmpresa: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAccent: string;
}

const Configuracion = () => {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    nombreEmpresa:   "BlueData",
    colorPrimario:   "#2d6a4f",
    colorSecundario: "#40916c",
    colorAccent:     "#d4a72d",
  });

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description="Sistema dinámico V3 — define formularios, campos y módulos"
      />

      {/* Banner explicativo */}
      <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <div className="space-y-1">
          <p>
            <strong>Flujo de configuración:</strong>{" "}
            <strong>1. Biblioteca</strong> — crea parámetros reutilizables →{" "}
            <strong>2. Definiciones</strong> — crea formularios por módulo →{" "}
            <strong>3. Campos</strong> — asigna parámetros a cada formulario →{" "}
            <strong>4. Datos</strong> — los registros se autogeneran en el módulo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="definiciones" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
          <TabsTrigger value="definiciones" className="flex items-center gap-2 text-xs sm:text-sm">
            <Layers    className="w-4 h-4" /> Definiciones
          </TabsTrigger>
          <TabsTrigger value="biblioteca"  className="flex items-center gap-2 text-xs sm:text-sm">
            <BookOpen  className="w-4 h-4" /> Biblioteca de Parámetros
          </TabsTrigger>
          <TabsTrigger value="campos"      className="flex items-center gap-2 text-xs sm:text-sm">
            <List      className="w-4 h-4" /> Campos
          </TabsTrigger>
          <TabsTrigger value="datos"       className="flex items-center gap-2 text-xs sm:text-sm">
            <Table2    className="w-4 h-4" /> Datos
          </TabsTrigger>
          <TabsTrigger value="marca"       className="flex items-center gap-2 text-xs sm:text-sm">
            <Palette   className="w-4 h-4" /> Marca
          </TabsTrigger>
          <TabsTrigger value="avanzado"    className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4" /> Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definiciones"><TabDefiniciones /></TabsContent>
        <TabsContent value="biblioteca">  <TabBiblioteca  /></TabsContent>
        <TabsContent value="campos">      <TabCampos      /></TabsContent>
        <TabsContent value="datos">       <TabDatos       /></TabsContent>

        {/* ═══ Marca ══════════════════════════════════════════════════════════ */}
        <TabsContent value="marca" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Personalización de Marca</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label>Logo de la Empresa</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">Arrastra tu logo o haz click para seleccionar</p>
                  <Button variant="outline" size="sm">Seleccionar archivo</Button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input
                    id="nombreEmpresa"
                    value={brandConfig.nombreEmpresa}
                    onChange={e => setBrandConfig(p => ({ ...p, nombreEmpresa: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h4 className="font-medium text-foreground mb-4">Colores del Sistema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(["colorPrimario", "colorSecundario", "colorAccent"] as const).map((key, i) => (
                  <div key={key} className="space-y-2">
                    <Label>{["Color Primario", "Color Secundario", "Color de Acento"][i]}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandConfig[key]}
                        onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                      />
                      <Input
                        value={brandConfig[key]}
                        onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Avanzado ═══════════════════════════════════════════════════════ */}
        <TabsContent value="avanzado" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Configuración Avanzada</h3>
            <div className="space-y-6">
              {[
                { label: "Modo Oscuro",              desc: "Activar tema oscuro para la interfaz",       checked: false },
                { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo",     checked: true  },
                { label: "Auto-guardado",             desc: "Guardar cambios automáticamente en tablas",  checked: true  },
                { label: "Multi-tenant activo",       desc: "Habilitar aislamiento de datos por empresa", checked: true  },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.checked} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Configuracion;
