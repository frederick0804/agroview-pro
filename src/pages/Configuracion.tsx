import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Upload, ChevronDown, ChevronUp, X, Plus, Save,
  Trash2, Info, CheckCircle2, Clock, Archive, Database, Leaf,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import {
  tipoBadgeColor, tipoLabels, estadoBadge,
  type ModDef, type ModParam, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad,
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
  { value: "produccion",       label: "Producción" },
  { value: "cosecha_registro", label: "Cosecha" },
  { value: "fitosanitario",    label: "Fitosanitario" },
  { value: "riego",            label: "Riego" },
  { value: "trazabilidad",     label: "Trazabilidad" },
  { value: "inventario",       label: "Inventario" },
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
  const { definiciones, parametros, datos, addDef, updDef, delDef, cultivos } = useConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cultivoOptions = [
    { value: "",  label: "— Global —" },
    ...cultivos.map(c => ({ value: c.id, label: c.nombre })),
  ];

  const colsDefinicion: Column<ModDef>[] = [
    { key: "cultivo_id",  header: "Cultivo",       width: "130px", type: "select",  options: cultivoOptions },
    { key: "modulo",      header: "Módulo",         width: "150px", type: "select",  options: MODULO_OPTIONS },
    { key: "tipo",        header: "Tipo",            width: "150px", type: "select",  options: TIPO_OPTIONS },
    { key: "nombre",      header: "Nombre",           width: "200px" },
    { key: "descripcion", header: "Descripción",      width: "240px" },
    { key: "version",     header: "Versión",           width: "70px" },
    { key: "nivel_minimo",header: "Nivel mín.",        width: "85px",  type: "number" },
    { key: "estado",      header: "Estado",             width: "110px", type: "select", options: ESTADO_OPTIONS },
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
          onClick={() => addDef()}
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
        onAdd={() => addDef()}
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

function TabCampos({ initialDefId = "all" }: { initialDefId?: string }) {
  const { definiciones, parametros, parametrosLib, addPar, updParByIdx, delParByIdx } = useConfig();
  const [filterDefId, setFilterDefId] = useState<string>(initialDefId);

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

      {/* Dos columnas: sidebar de filtro + tabla */}
      <div className="flex gap-4 items-start">

        {/* Sidebar de definiciones — escala a cualquier cantidad sin romper el layout */}
        <div className="w-52 shrink-0 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Formulario
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-1.5 max-h-[520px] overflow-y-auto">
            {/* "Todos" */}
            <button
              onClick={() => setFilterDefId("all")}
              className={cn(
                "text-xs px-3 py-2 rounded-lg font-medium text-left w-full transition-colors flex items-center justify-between gap-2",
                filterDefId === "all"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span>Todos</span>
              <span className="opacity-60 text-[11px] tabular-nums">{parametros.length}</span>
            </button>

            <div className="h-px bg-border mx-1 my-0.5" />

            {/* Una fila por definición */}
            {definiciones.map(d => {
              const count    = parametros.filter(p => p.definicion_id === d.id).length;
              const isActive = filterDefId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setFilterDefId(d.id)}
                  className={cn(
                    "text-xs px-3 py-2 rounded-lg font-medium text-left w-full transition-colors flex items-center justify-between gap-2",
                    isActive
                      ? `${tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700"}`
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <span className="truncate leading-tight">{d.nombre || `(def ${d.id})`}</span>
                  <span className="opacity-60 text-[11px] tabular-nums shrink-0">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla de campos */}
        <div className="flex-1 min-w-0">
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

      </div>
    </div>
  );
}

// ─── Panel Datos ──────────────────────────────────────────────────────────────
// Muestra un resumen de definiciones y sus registros.
// Los registros operacionales se ingresan en cada módulo, NO aquí.

const MODULO_ROUTES: Record<string, string> = {
  vivero:             "/vivero",
  cultivo:            "/cultivo",
  cosecha:            "/cosecha",
  "post-cosecha":     "/post-cosecha",
  laboratorio:        "/laboratorio",
  produccion:         "/produccion",
  "recursos-humanos": "/recursos-humanos",
};

function TabDatos() {
  const navigate = useNavigate();
  const { definiciones, parametros, datos } = useConfig();

  return (
    <div className="space-y-5">
      {/* Banner explicativo */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
        <div>
          <strong>¿Dónde se ingresan los registros?</strong>{" "}
          Los datos operacionales se ingresan en <strong>cada módulo</strong> (Laboratorio,
          Cultivo, Recursos Humanos, etc.), en la tabla dinámica generada desde la definición.
          Este panel muestra el resumen y accesos directos.
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">
            Resumen de Definiciones y Registros
          </h3>
          <span className="text-xs text-muted-foreground">
            {definiciones.length} definiciones · {datos.length} registros totales
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Definición</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campos</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registros</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {definiciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                  No hay definiciones. Créalas en la pestaña <strong>Definiciones</strong>.
                </td>
              </tr>
            ) : (
              definiciones.map(d => {
                const campoCount  = parametros.filter(p => p.definicion_id === d.id).length;
                const datoCount   = datos.filter(dt => dt.definicion_id === d.id).length;
                const route       = MODULO_ROUTES[d.modulo];
                const moduloLabel = MODULO_OPTIONS.find(m => m.value === d.modulo)?.label ?? d.modulo;

                return (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground leading-tight">
                        {d.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">v{d.version}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700")}>
                        {tipoLabels[d.tipo as TipoConfig] ?? d.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{moduloLabel}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", estadoBadge[d.estado ?? "borrador"])}>
                        <EstadoIcon estado={d.estado ?? "borrador"} />
                        {d.estado ?? "borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-muted-foreground">{campoCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-semibold text-sm", datoCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {datoCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {route ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(route)}
                        >
                          Ir a {moduloLabel} →
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <td colSpan={5} className="px-4 py-2.5 text-xs text-muted-foreground">Total</td>
              <td className="px-4 py-2.5 text-center text-xs font-semibold text-foreground">{datos.length}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Hub de Cultivos ──────────────────────────────────────────────────────────
// Cultivos es la entidad raíz: variedades y formularios se configuran por cultivo.

function TabCultivos() {
  const {
    cultivos, addCultivo, updCultivo, delCultivo,
    variedades, addVariedad, updVariedad, delVariedad,
    definiciones, addDef, updDef, delDef,
  } = useConfig();

  const firstActive = cultivos.find(c => c.activo)?.id ?? cultivos[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(firstActive);
  const [subTab, setSubTab]         = useState("variedades");

  const cultivo     = cultivos.find(c => c.id === selectedId);
  const cultivoVars = variedades.filter(v => v.cultivo_id === selectedId);
  const cultivoDefs = definiciones.filter(d => d.cultivo_id === selectedId);

  // ── Columnas ──────────────────────────────────────────────────────────────

  const colsCultivos: Column<Cultivo>[] = [
    { key: "nombre",      header: "Cultivo",      width: "160px" },
    { key: "codigo",      header: "Código",        width: "80px"  },
    { key: "descripcion", header: "Descripción",   width: "280px" },
    { key: "activo",      header: "Activo",         width: "75px", type: "checkbox" },
  ];

  const colsVariedades: Column<Variedad>[] = [
    { key: "nombre",      header: "Variedad",      width: "160px" },
    { key: "codigo",      header: "Código",         width: "80px"  },
    { key: "descripcion", header: "Descripción",    width: "280px" },
    { key: "activo",      header: "Activa",          width: "75px", type: "checkbox" },
  ];

  const colsFormularios: Column<ModDef>[] = [
    { key: "modulo",       header: "Módulo",       width: "150px", type: "select", options: MODULO_OPTIONS },
    { key: "tipo",         header: "Tipo",          width: "150px", type: "select", options: TIPO_OPTIONS  },
    { key: "nombre",       header: "Nombre",         width: "200px" },
    { key: "version",      header: "Versión",         width: "70px"  },
    { key: "nivel_minimo", header: "Nivel mín.",      width: "85px", type: "number" },
    { key: "estado",       header: "Estado",           width: "110px", type: "select", options: ESTADO_OPTIONS },
  ];

  // ── CRUD wrappers ─────────────────────────────────────────────────────────

  const updC = (idx: number, k: keyof Cultivo, v: unknown) =>
    updCultivo(cultivos[idx].id, k, v);
  const delC = (idx: number) => {
    const id = cultivos[idx].id;
    delCultivo(id);
    if (selectedId === id) setSelectedId(cultivos.find(c => c.id !== id)?.id ?? "");
  };

  const updV = (idx: number, k: keyof Variedad, v: unknown) =>
    updVariedad(cultivoVars[idx].id, k, v);
  const delV = (idx: number) => delVariedad(cultivoVars[idx].id);

  const updF = (idx: number, k: keyof ModDef, v: unknown) => {
    const item = cultivoDefs[idx];
    const origIdx = definiciones.findIndex(d => d.id === item.id);
    if (origIdx !== -1) updDef(origIdx, k, v);
  };
  const delF = (idx: number) => {
    const item = cultivoDefs[idx];
    const origIdx = definiciones.findIndex(d => d.id === item.id);
    if (origIdx !== -1) delDef(origIdx);
  };

  return (
    <div className="space-y-6">

      {/* ── Selector de cultivo ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {cultivos.map(c => {
          const vCount = variedades.filter(v => v.cultivo_id === c.id).length;
          const fCount = definiciones.filter(d => d.cultivo_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                selectedId === c.id
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : c.activo
                    ? "bg-background text-muted-foreground border-border hover:border-primary/50 hover:shadow-sm"
                    : "bg-muted/30 text-muted-foreground/50 border-border/50 line-through",
              )}
            >
              <Leaf className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{c.nombre}</span>
              <span className={cn("text-[10px] opacity-70", selectedId === c.id ? "text-primary-foreground/70" : "")}>
                {vCount}v · {fCount}f
              </span>
            </button>
          );
        })}
        <button
          onClick={() => addCultivo()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo cultivo
        </button>
      </div>

      {/* ── Panel del cultivo seleccionado ── */}
      {cultivo ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Cabecera */}
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground leading-tight">
                  {cultivo.nombre || <span className="italic text-muted-foreground">(sin nombre)</span>}
                  <span className="ml-2 text-xs font-mono text-muted-foreground">[{cultivo.codigo}]</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{cultivo.descripcion || "Sin descripción"}</p>
              </div>
            </div>
            <span className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full shrink-0",
              cultivo.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
            )}>
              {cultivo.activo ? "Activo" : "Inactivo"}
            </span>
          </div>

          {/* Sub-tabs: Variedades | Formularios */}
          <div className="p-4">
            <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
              <TabsList className="bg-muted p-1 rounded-lg h-auto">
                <TabsTrigger value="variedades" className="text-xs sm:text-sm gap-1.5">
                  Variedades
                  <span className="text-[10px] opacity-60">({cultivoVars.length})</span>
                </TabsTrigger>
                <TabsTrigger value="formularios" className="text-xs sm:text-sm gap-1.5">
                  Formularios
                  <span className="text-[10px] opacity-60">({cultivoDefs.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Variedades */}
              <TabsContent value="variedades">
                <EditableTable
                  title={`Variedades de ${cultivo.nombre}`}
                  data={cultivoVars}
                  columns={colsVariedades}
                  onUpdate={updV}
                  onDelete={delV}
                  onAdd={() => addVariedad(selectedId)}
                  searchable={false}
                />
              </TabsContent>

              {/* Formularios */}
              <TabsContent value="formularios">
                {cultivoDefs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <Layers className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Sin formularios para {cultivo.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crea un formulario para definir los campos que se registran en los módulos.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => addDef(selectedId)}>
                      <Plus className="w-4 h-4 mr-1.5" /> Crear formulario
                    </Button>
                  </div>
                ) : (
                  <EditableTable
                    title={`Formularios de ${cultivo.nombre}`}
                    data={cultivoDefs}
                    columns={colsFormularios}
                    onUpdate={updF}
                    onDelete={delF}
                    onAdd={() => addDef(selectedId)}
                    searchable={false}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Leaf className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Sin cultivos registrados</p>
            <p className="text-sm text-muted-foreground mt-1">Crea el primer cultivo para comenzar.</p>
          </div>
          <Button onClick={() => addCultivo()}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Cultivo
          </Button>
        </div>
      )}

      {/* ── Tabla de gestión global de cultivos ── */}
      <EditableTable
        title={`Todos los Cultivos (${cultivos.length})`}
        data={cultivos}
        columns={colsCultivos}
        onUpdate={updC}
        onDelete={delC}
        onAdd={() => addCultivo()}
        searchable={false}
      />
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
  const [searchParams] = useSearchParams();
  const initialTab   = searchParams.get("tab")   ?? "cultivos";
  const initialDefId = searchParams.get("def")   ?? "all";

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

      {/* Stepper de flujo */}
      <div className="mb-6 p-4 rounded-xl bg-card border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Flujo de configuración
        </p>
        <div className="flex items-start">
          {[
            { num: 1, label: "Cultivos",     desc: "Define cultivos y variedades"  },
            { num: 2, label: "Formularios",  desc: "Crea formularios por cultivo"  },
            { num: 3, label: "Campos",       desc: "Asigna campos al formulario"   },
            { num: 4, label: "Módulos",      desc: "Registra datos operacionales"  },
          ].map((step, i, arr) => (
            <div key={step.num} className="flex items-start flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                  {step.num}
                </div>
                <p className="text-xs font-semibold text-foreground text-center">{step.label}</p>
                <p className="text-[10px] text-muted-foreground text-center leading-tight max-w-[90px]">{step.desc}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="h-px w-full bg-border mt-4 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
          <TabsTrigger value="cultivos"     className="flex items-center gap-2 text-xs sm:text-sm">
            <Leaf      className="w-4 h-4" /> Cultivos
          </TabsTrigger>
          <TabsTrigger value="definiciones" className="flex items-center gap-2 text-xs sm:text-sm">
            <Layers    className="w-4 h-4" /> Definiciones
          </TabsTrigger>
          <TabsTrigger value="biblioteca"  className="flex items-center gap-2 text-xs sm:text-sm">
            <BookOpen  className="w-4 h-4" /> Biblioteca
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

        <TabsContent value="cultivos">   <TabCultivos    /></TabsContent>
        <TabsContent value="definiciones"><TabDefiniciones /></TabsContent>
        <TabsContent value="biblioteca">  <TabBiblioteca  /></TabsContent>
        <TabsContent value="campos">      <TabCampos initialDefId={initialDefId} /></TabsContent>
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
