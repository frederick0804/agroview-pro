import { useState, useEffect } from "react";
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
  Trash2, Info, CheckCircle2, Clock, Archive, Database, Leaf, History, User,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useRole } from "@/contexts/RoleContext";
import {
  tipoBadgeColor, tipoLabels, estadoBadge,
  type ModDef, type ModParam, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad,
} from "@/config/moduleDefinitions";
import { VersionDiffDialog } from "@/components/dashboard/VersionDiffDialog";
import { CampoConfigDrawer } from "@/components/dashboard/CampoConfigDrawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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

function TabDefiniciones({ onPendingChange, onNavigateToCampos }: { onPendingChange?: (v: boolean) => void; onNavigateToCampos?: (defId: string) => void }) {
  const { definiciones, parametros, datos, addDef, updDef, delDef, cultivos, getDefSnapshots, createSnapshot } = useConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyDefId, setHistoryDefId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameVal, setEditingNameVal] = useState("");
  const [snapModal, setSnapModal] = useState<{ open: boolean; defId: string; nombre: string }>({ open: false, defId: "", nombre: "" });

  const cultivoOptions = [
    { value: "",  label: "— Global —" },
    ...cultivos.map(c => ({ value: c.id, label: c.nombre })),
  ];

  const colsDefinicion: Column<ModDef>[] = [
    { key: "cultivo_id",  header: "Cultivo",       width: "130px", type: "select",  options: cultivoOptions, filterable: true },
    { key: "modulo",      header: "Módulo",         width: "150px", type: "select",  options: MODULO_OPTIONS, required: true, filterable: true },
    { key: "tipo",        header: "Tipo",            width: "150px", type: "select",  options: TIPO_OPTIONS, required: true, filterable: true },
    { key: "nombre",      header: "Nombre",           width: "200px", required: true },
    { key: "descripcion", header: "Descripción",      width: "240px" },
    { key: "version",     header: "Versión",           width: "70px", editable: false },
    { key: "nivel_minimo",header: "Nivel mín.",        width: "85px",  type: "number" },
    { key: "estado",      header: "Estado",             width: "110px", type: "select", options: ESTADO_OPTIONS, filterable: true },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Definiciones (Formularios)</strong> — crea y administra las definiciones que estructuran cada módulo.
          Cada definición agrupa un conjunto de campos y genera una tabla dinámica de captura de datos.
          Usa el historial de versiones para comparar cambios entre versiones.
        </div>
      </div>
      <div className="flex gap-5">
      {/* Panel izquierdo — Cards de definiciones */}
      <div className="w-80 shrink-0 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {definiciones.filter(d => d.nombre).map(d => {
          const campoCount = parametros.filter(p => p.definicion_id === d.id).length;
          const datoCount  = datos.filter(dt => dt.definicion_id === d.id).length;
          const isExpanded = expandedId === d.id;
          const campitos   = parametros.filter(p => p.definicion_id === d.id).sort((a,b) => a.orden - b.orden);
          const snapCount  = getDefSnapshots(d.id).length;

          return (
            <div
              key={d.id}
              onClick={() => onNavigateToCampos?.(d.id)}
              className={cn(
                "bg-card border rounded-xl overflow-hidden transition-all cursor-pointer",
                "border-border hover:border-primary/40 hover:shadow-sm",
              )}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700")}>
                      {tipoLabels[d.tipo as TipoConfig] ?? d.tipo}
                    </span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5", estadoBadge[d.estado ?? "borrador"])}>
                      <EstadoIcon estado={d.estado ?? "borrador"} />
                      {d.estado ?? "borrador"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">v{d.version}</span>
                </div>

                {/* Nombre editable */}
                {editingNameId === d.id ? (
                  <div className="flex items-center gap-1 mb-0.5" onClick={e => e.stopPropagation()}>
                    <Input
                      autoFocus
                      value={editingNameVal}
                      onChange={e => setEditingNameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const idx = definiciones.findIndex(x => x.id === d.id);
                          if (idx !== -1 && editingNameVal.trim()) updDef(idx, "nombre", editingNameVal.trim());
                          setEditingNameId(null);
                        }
                        if (e.key === "Escape") setEditingNameId(null);
                      }}
                      onBlur={() => {
                        const idx = definiciones.findIndex(x => x.id === d.id);
                        if (idx !== -1 && editingNameVal.trim()) updDef(idx, "nombre", editingNameVal.trim());
                        setEditingNameId(null);
                      }}
                      className="h-6 text-xs px-1.5"
                    />
                  </div>
                ) : (
                  <p
                    className="font-semibold text-foreground text-xs mb-0.5 line-clamp-1 hover:text-primary cursor-text"
                    onClick={e => { e.stopPropagation(); setEditingNameId(d.id); setEditingNameVal(d.nombre); }}
                    title="Clic para editar nombre"
                  >
                    {d.nombre || <span className="italic text-muted-foreground">Sin nombre</span>}
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{d.descripcion || "Sin descripción"}</p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <List className="w-3 h-3" /> {campoCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Database className="w-3 h-3" /> {datoCount}
                    </span>
                  </div>
                  <span>{MODULO_OPTIONS.find(m => m.value === d.modulo)?.label ?? d.modulo}</span>
                </div>

                {/* Auditoría + historial + snapshot */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  {d.updated_at ? (
                    <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5 truncate mr-1">
                      <User className="w-2.5 h-2.5 shrink-0" />
                      {d.updated_by ?? "—"} · {formatDistanceToNow(new Date(d.updated_at), { addSuffix: true, locale: es })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 italic">Sin auditoría</span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setSnapModal({ open: true, defId: d.id, nombre: d.nombre }); }}
                      className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors text-emerald-600 hover:bg-emerald-500/10"
                      title="Crear nueva versión"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setHistoryDefId(d.id); }}
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors",
                        snapCount > 0
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <History className="w-3 h-3" />
                      {snapCount > 0 ? `${snapCount}` : "—"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle campos */}
              {campoCount > 0 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : d.id); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border hover:bg-muted/40 transition-colors"
                  >
                    <span>Ver campos</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 bg-muted/20 border-t border-border">
                      <div className="flex flex-wrap gap-1 pt-2">
                        {campitos.map(c => (
                          <span key={c.id} className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 flex items-center gap-0.5">
                            <span className="font-medium">{c.nombre.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground/60">· {c.tipo_dato}</span>
                            {c.obligatorio && <span className="text-destructive text-[9px]">*</span>}
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
          className="w-full border-2 border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium">Nueva Definición</span>
        </button>
      </div>

      {/* Panel derecho — Tabla editable */}
      <div className="flex-1 min-w-0">
        <EditableTable
          title="Registro de Definiciones"
          data={definiciones}
          columns={colsDefinicion}
          onUpdate={updDef}
          onDelete={delDef}
          onAdd={() => addDef()}
          onPendingChange={onPendingChange}
          rowActions={(row) => (
            <>
              <button
                onClick={() => onNavigateToCampos?.(row.id)}
                className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Ver campos"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSnapModal({ open: true, defId: row.id, nombre: row.nombre })}
                className="p-1.5 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                title="Crear nueva versión"
              >
                <Save className="w-4 h-4" />
              </button>
            </>
          )}
        />
      </div>

      {/* Dialog de historial de versiones */}
      {historyDefId && (
        <VersionDiffDialog
          defId={historyDefId}
          open={!!historyDefId}
          onClose={() => setHistoryDefId(null)}
        />
      )}

      {/* Modal para crear nueva versión (snapshot) */}
      <Dialog open={snapModal.open} onOpenChange={open => { if (!open) setSnapModal(p => ({ ...p, open: false })); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-600" />
              Crear nueva versión
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const def = definiciones.find(d => d.id === snapModal.defId);
            const currentVersion = def?.version ?? "1.0";
            const parts = currentVersion.split(".");
            const nextVersion = parts.length >= 2
              ? `${parts[0]}.${parseInt(parts[1] || "0", 10) + 1}`
              : `${currentVersion}.1`;
            const campos = parametros.filter(p => p.definicion_id === snapModal.defId);
            return (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="snap-nombre">Nombre de la definición</Label>
                  <Input
                    id="snap-nombre"
                    value={snapModal.nombre}
                    onChange={e => setSnapModal(p => ({ ...p, nombre: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Versión actual:</span>
                  <Badge variant="secondary">{currentVersion}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">{nextVersion}</Badge>
                </div>
                {campos.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Campos incluidos ({campos.length})</Label>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {campos.sort((a, b) => a.orden - b.orden).map(c => (
                        <span key={c.id} className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">
                          {c.nombre.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setSnapModal(p => ({ ...p, open: false }))}>Cancelar</Button>
                  <Button
                    size="sm"
                    disabled={!snapModal.nombre.trim()}
                    onClick={() => {
                      const idx = definiciones.findIndex(d => d.id === snapModal.defId);
                      if (idx !== -1) {
                        updDef(idx, "nombre", snapModal.nombre.trim());
                        updDef(idx, "version", nextVersion);
                      }
                      createSnapshot(snapModal.defId, `Versión ${nextVersion}`);
                      setSnapModal(p => ({ ...p, open: false }));
                    }}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    Crear versión {nextVersion}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// ─── Panel Biblioteca de Parámetros ───────────────────────────────────────────

function TabBiblioteca({ onPendingChange }: { onPendingChange?: (v: boolean) => void }) {
  const { parametrosLib, addParamLib, updParamLib, delParamLib } = useConfig();

  const colsLib: Column<Parametro>[] = [
    { key: "nombre",              header: "Nombre (snake_case)", width: "180px", required: true },
    { key: "codigo",              header: "Código",               width: "90px" },
    { key: "tipo_dato",           header: "Tipo",                  width: "120px", type: "select", options: TIPO_DATO_OPTIONS, required: true, filterable: true },
    { key: "unidad_medida",       header: "Unidad",               width: "80px" },
    { key: "descripcion",         header: "Descripción",           width: "260px" },
    { key: "obligatorio_default", header: "Oblig. default",        width: "100px", type: "checkbox", filterable: true },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Biblioteca Global</strong> — catálogo de campos reutilizables en cualquier módulo.
          Al agregar un campo a una definición, se sugiere desde aquí.
        </div>
      </div>

      <EditableTable
        title={`Biblioteca de Parámetros (${parametrosLib.length})`}
        data={parametrosLib}
        columns={colsLib}
        onUpdate={(idx, key, val) => updParamLib(parametrosLib[idx].id, key, val)}
        onDelete={idx => delParamLib(parametrosLib[idx].id)}
        onAdd={() => addParamLib()}
        onPendingChange={onPendingChange}
        searchable
      />
    </div>
  );
}

// ─── Panel Campos (Campos_configurados) ───────────────────────────────────────

function TabCampos({ initialDefId = "all", onPendingChange }: { initialDefId?: string; onPendingChange?: (v: boolean) => void }) {
  const { definiciones, parametros, parametrosLib, addPar, updParByIdx, updParFull, delParByIdx, addParamLib } = useConfig();
  const [filterDefId, setFilterDefId] = useState<string>(initialDefId);
  const [configCampoId, setConfigCampoId] = useState<string | null>(null);

  // Sync filter when navigating from Definiciones
  useEffect(() => { setFilterDefId(initialDefId); }, [initialDefId]);

  // Modal para crear nuevo parámetro desde el autocomplete
  const [newParamModal, setNewParamModal] = useState<{ open: boolean; nombre: string }>({ open: false, nombre: "" });
  const [newParamForm, setNewParamForm] = useState<{
    codigo: string; tipo_dato: TipoDato; unidad_medida: string; descripcion: string; obligatorio_default: boolean;
  }>({ codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false });

  const openNewParamModal = (query: string) => {
    setNewParamModal({ open: true, nombre: query.replace(/ /g, "_").toLowerCase() });
    setNewParamForm({ codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false });
  };

  const handleCreateParam = () => {
    if (!newParamModal.nombre.trim()) return;
    addParamLib({
      nombre:              newParamModal.nombre,
      codigo:              newParamForm.codigo,
      tipo_dato:           newParamForm.tipo_dato,
      unidad_medida:       newParamForm.unidad_medida,
      descripcion:         newParamForm.descripcion,
      obligatorio_default: newParamForm.obligatorio_default,
    });
    setNewParamModal({ open: false, nombre: "" });
  };

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
      required: true,
      filterable: true,
      options: definiciones.map(d => ({ value: d.id, label: d.nombre || `(sin nombre — ${d.id})` })),
    },
    {
      key:     "nombre",
      header:  "Campo",
      width:   "200px",
      type:    "autocomplete",
      required: true,
      options: sugerencias,
      onCreateOption: openNewParamModal,
    },
    {
      key:     "tipo_dato",
      header:  "Tipo",
      width:   "130px",
      type:    "select",
      filterable: true,
      options: TIPO_DATO_OPTIONS,
    },
    { key: "orden",      header: "Orden", width: "70px",  type: "number" },
    { key: "obligatorio",header: "Oblig.",width: "75px",  type: "checkbox", filterable: true },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Asigna <strong>campos de la Biblioteca</strong> a cada definición. Escribe en el campo
          "Campo" para buscar en la biblioteca o crear uno nuevo.
        </div>
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
        onPendingChange={onPendingChange}
        rowActions={(row) => (
          <button
            onClick={() => setConfigCampoId(row.id)}
            className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Configuración avanzada"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      />

      {/* Drawer de configuración avanzada del campo */}
      <CampoConfigDrawer
        open={!!configCampoId}
        campo={configCampoId ? parametros.find(p => p.id === configCampoId) ?? null : null}
        hermanos={configCampoId ? parametros.filter(p => p.definicion_id === (parametros.find(x => x.id === configCampoId)?.definicion_id ?? "")) : []}
        onSave={(id, updates) => updParFull(id, updates)}
        onClose={() => setConfigCampoId(null)}
      />

      {/* Modal para crear nuevo parámetro en la biblioteca */}
      <Dialog open={newParamModal.open} onOpenChange={open => { if (!open) setNewParamModal({ open: false, nombre: "" }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Nuevo Parámetro en Biblioteca
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre (snake_case) <span className="text-destructive">*</span></Label>
              <Input
                value={newParamModal.nombre}
                onChange={e => setNewParamModal(prev => ({ ...prev, nombre: e.target.value.replace(/ /g, "_").toLowerCase() }))}
                placeholder="ej. temperatura_suelo"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código</Label>
                <Input
                  value={newParamForm.codigo}
                  onChange={e => setNewParamForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="ej. TEMP_SUE"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de dato</Label>
                <select
                  value={newParamForm.tipo_dato}
                  onChange={e => setNewParamForm(p => ({ ...p, tipo_dato: e.target.value as TipoDato }))}
                  className="w-full h-8 text-sm border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIPO_DATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidad de medida</Label>
              <Input
                value={newParamForm.unidad_medida}
                onChange={e => setNewParamForm(p => ({ ...p, unidad_medida: e.target.value }))}
                placeholder="ej. °C, mm, gr"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Input
                value={newParamForm.descripcion}
                onChange={e => setNewParamForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Describe para qué se usa este parámetro"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newParamForm.obligatorio_default}
                onCheckedChange={v => setNewParamForm(p => ({ ...p, obligatorio_default: v }))}
              />
              <Label className="text-xs">Obligatorio por defecto</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewParamModal({ open: false, nombre: "" })}>
              Cancelar
            </Button>
            <Button onClick={handleCreateParam} disabled={!newParamModal.nombre.trim()}>
              <Save className="w-4 h-4 mr-1.5" /> Crear Parámetro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
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
  const { role } = useRole();
  const isSuperAdmin = role === "super_admin";

  const firstActive = cultivos.find(c => c.activo)?.id ?? cultivos[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(firstActive);
  const [subTab, setSubTab]         = useState("variedades");

  const cultivo     = cultivos.find(c => c.id === selectedId);
  const cultivoVars = variedades.filter(v => v.cultivo_id === selectedId);
  const cultivoDefs = definiciones.filter(d => d.cultivo_id === selectedId);

  // ── Columnas ──────────────────────────────────────────────────────────────

  const colsCultivos: Column<Cultivo>[] = [
    { key: "nombre",      header: "Cultivo",      width: "160px", editable: isSuperAdmin },
    { key: "codigo",      header: "Código",        width: "80px",  editable: isSuperAdmin },
    { key: "descripcion", header: "Descripción",   width: "280px", editable: isSuperAdmin },
    { key: "activo",      header: "Activo",         width: "75px", type: "checkbox", editable: isSuperAdmin, filterable: true },
  ];

  const colsVariedades: Column<Variedad>[] = [
    { key: "nombre",      header: "Variedad",      width: "160px" },
    { key: "codigo",      header: "Código",         width: "80px"  },
    { key: "descripcion", header: "Descripción",    width: "280px" },
    { key: "activo",      header: "Activa",          width: "75px", type: "checkbox", filterable: true },
  ];

  const colsFormularios: Column<ModDef>[] = [
    { key: "modulo",       header: "Módulo",       width: "150px", type: "select", options: MODULO_OPTIONS, filterable: true },
    { key: "tipo",         header: "Tipo",          width: "150px", type: "select", options: TIPO_OPTIONS, filterable: true  },
    { key: "nombre",       header: "Nombre",         width: "200px" },
    { key: "version",      header: "Versión",         width: "70px"  },
    { key: "nivel_minimo", header: "Nivel mín.",      width: "85px", type: "number" },
    { key: "estado",       header: "Estado",           width: "110px", type: "select", options: ESTADO_OPTIONS, filterable: true },
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
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Cultivos y Variedades</strong> — gestiona los cultivos habilitados según el plan del cliente.
          Cada cultivo puede tener variedades y formularios asociados que definen los campos de captura en cada módulo.
        </div>
      </div>

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
        {isSuperAdmin && (
          <button
            onClick={() => addCultivo()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo cultivo
          </button>
        )}
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
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin ? "Crea el primer cultivo para comenzar." : "Los cultivos se asignan según el plan del cliente."}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => addCultivo()}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Cultivo
            </Button>
          )}
        </div>
      )}

      {/* ── Tabla de gestión global de cultivos ── */}
      <EditableTable
        title={`Todos los Cultivos (${cultivos.length})`}
        data={cultivos}
        columns={colsCultivos}
        onUpdate={updC}
        onDelete={isSuperAdmin ? delC : undefined}
        onAdd={isSuperAdmin ? () => addCultivo() : undefined}
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

  const [activeTab, setActiveTab] = useState(initialTab);
  const [camposDefId, setCamposDefId] = useState<string>(initialDefId);
  const { hasPendingChanges: hasPending, setHasPendingChanges: setHasPending } = useConfig();
  const { currentClienteName } = useRole();

  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    nombreEmpresa: "BlueData",
    colorPrimario: "#1a5c3a",
    colorSecundario: "#40916c",
    colorAccent: "#d4a72d",
  });

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description={`Sistema dinámico V3 — ${currentClienteName}`}
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

      <Tabs
        value={activeTab}
        onValueChange={tab => {
          if (hasPending) return; // block tab switch while rows are incomplete
          setActiveTab(tab);
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
          <TabsTrigger value="cultivos"     disabled={hasPending && activeTab !== "cultivos"}     className="flex items-center gap-2 text-xs sm:text-sm">
            <Leaf      className="w-4 h-4" /> Cultivos
          </TabsTrigger>
          <TabsTrigger value="definiciones" disabled={hasPending && activeTab !== "definiciones"} className="flex items-center gap-2 text-xs sm:text-sm">
            <Layers    className="w-4 h-4" /> Definiciones
          </TabsTrigger>
          <TabsTrigger value="biblioteca"  disabled={hasPending && activeTab !== "biblioteca"}  className="flex items-center gap-2 text-xs sm:text-sm">
            <BookOpen  className="w-4 h-4" /> Biblioteca
          </TabsTrigger>
          <TabsTrigger value="campos"      disabled={hasPending && activeTab !== "campos"}      className="flex items-center gap-2 text-xs sm:text-sm">
            <List      className="w-4 h-4" /> Campos
          </TabsTrigger>
          <TabsTrigger value="datos"       disabled={hasPending && activeTab !== "datos"}       className="flex items-center gap-2 text-xs sm:text-sm">
            <Table2    className="w-4 h-4" /> Datos
          </TabsTrigger>
          <TabsTrigger value="marca"       disabled={hasPending && activeTab !== "marca"}       className="flex items-center gap-2 text-xs sm:text-sm">
            <Palette   className="w-4 h-4" /> Marca
          </TabsTrigger>
          <TabsTrigger value="avanzado"    disabled={hasPending && activeTab !== "avanzado"}    className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4" /> Avanzado
          </TabsTrigger>
        </TabsList>

        {hasPending && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            Completa los campos requeridos (<span className="text-destructive font-bold">*</span>) antes de cambiar de pestaña o agregar otra fila.
          </div>
        )}

        <TabsContent value="cultivos">   <TabCultivos    /></TabsContent>
        <TabsContent value="definiciones"><TabDefiniciones onPendingChange={setHasPending} onNavigateToCampos={(defId) => { setCamposDefId(defId); setActiveTab("campos"); }} /></TabsContent>
        <TabsContent value="biblioteca">  <TabBiblioteca  onPendingChange={setHasPending} /></TabsContent>
        <TabsContent value="campos">      <TabCampos initialDefId={camposDefId} onPendingChange={setHasPending} /></TabsContent>
        <TabsContent value="datos">       <TabDatos       /></TabsContent>

        {/* ═══ Marca ══════════════════════════════════════════════════════════ */}
        <TabsContent value="marca" className="space-y-6">
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Personalización de Marca</strong> — configura el logo, nombre y colores de tu empresa.
              Estos ajustes se aplican en toda la interfaz para reflejar la identidad visual del cliente.
            </div>
          </div>
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
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Configuración Avanzada</strong> — ajustes del sistema como modo oscuro, notificaciones,
              auto-guardado y opciones multi-tenant. Cambios aquí afectan el comportamiento global de la plataforma.
            </div>
          </div>
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
