import { useState } from "react";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Layers, List, Table2, Palette, Settings2, BookOpen,
  Upload, ChevronDown, ChevronUp, Pencil, Save, X, Plus,
  Trash2, CheckCircle2, Clock, Archive, Database,
  Type, Hash, Calendar, ToggleLeft, ListOrdered, GripVertical,
  Search, FileText, Beaker, ClipboardList,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { toast } from "@/hooks/use-toast";
import {
  parseValores, tipoBadgeColor, tipoLabels, tipoDatoInputType, estadoBadge,
  type ModDef, type ModParam, type ModDato, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
} from "@/config/moduleDefinitions";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MODULO_OPTIONS = [
  { value: "vivero", label: "Vivero" },
  { value: "cultivo", label: "Cultivo" },
  { value: "cosecha", label: "Cosecha" },
  { value: "post-cosecha", label: "Post-cosecha" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "produccion", label: "Producción" },
  { value: "recursos-humanos", label: "Recursos Humanos" },
  { value: "comercial", label: "Comercial" },
];

const TIPO_OPTIONS = [
  { value: "estructura_campo", label: "Estructura Campo" },
  { value: "calibres", label: "Calibres" },
  { value: "datos_personal", label: "Datos Personal" },
  { value: "asistencia", label: "Asistencia" },
  { value: "lab_analisis", label: "Lab. Análisis" },
  { value: "personalizado", label: "Personalizado" },
];

const TIPO_DATO_OPTIONS = [
  { value: "Texto", label: "Texto" },
  { value: "Número", label: "Número" },
  { value: "Fecha", label: "Fecha" },
  { value: "Sí/No", label: "Sí/No" },
  { value: "Lista", label: "Lista (select)" },
];

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "borrador", label: "Borrador" },
  { value: "archivado", label: "Archivado" },
];

const TIPO_DATO_ICONS: Record<string, React.ReactNode> = {
  Texto: <Type className="w-3 h-3" />,
  "Número": <Hash className="w-3 h-3" />,
  Fecha: <Calendar className="w-3 h-3" />,
  "Sí/No": <ToggleLeft className="w-3 h-3" />,
  Lista: <ListOrdered className="w-3 h-3" />,
};

const TIPO_DATO_CHIP_COLORS: Record<string, string> = {
  Texto: "bg-blue-100 text-blue-700 border-blue-200",
  "Número": "bg-violet-100 text-violet-700 border-violet-200",
  Fecha: "bg-orange-100 text-orange-700 border-orange-200",
  "Sí/No": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Lista: "bg-teal-100 text-teal-700 border-teal-200",
};

// ─── EstadoIcon ───────────────────────────────────────────────────────────────

function EstadoIcon({ estado }: { estado: EstadoDef }) {
  if (estado === "activo") return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (estado === "borrador") return <Clock className="w-3.5 h-3.5 text-yellow-600" />;
  return <Archive className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Horizontal Stepper ───────────────────────────────────────────────────────

function ConfigStepper() {
  const steps = [
    { num: 1, label: "Biblioteca", desc: "Crea parámetros reutilizables", icon: <BookOpen className="w-4 h-4" /> },
    { num: 2, label: "Definiciones", desc: "Crea formularios por módulo", icon: <Layers className="w-4 h-4" /> },
    { num: 3, label: "Campos", desc: "Asigna parámetros a formularios", icon: <List className="w-4 h-4" /> },
    { num: 4, label: "Datos", desc: "Los registros se autogeneran", icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div className="mb-6 bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 sm:gap-0">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
                {step.num}
              </div>
              <p className="text-xs font-semibold text-foreground mt-1.5 truncate max-w-[80px] sm:max-w-none">{step.label}</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block mt-0.5 max-w-[120px]">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 sm:mx-4">
                <div className="h-0.5 bg-border relative">
                  <div className="absolute inset-0 bg-primary/30" style={{ width: "100%" }} />
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Illustrated Empty State ──────────────────────────────────────────────────

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

// ─── TipoDatoChip ─────────────────────────────────────────────────────────────

function TipoDatoChip({ tipo }: { tipo: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border",
      TIPO_DATO_CHIP_COLORS[tipo] ?? "bg-muted text-muted-foreground border-border",
    )}>
      {TIPO_DATO_ICONS[tipo]}
      {tipo}
    </span>
  );
}

// ─── Panel de Definiciones ────────────────────────────────────────────────────

function TabDefiniciones() {
  const { definiciones, parametros, datos, addDef, updDef, delDef } = useConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string>("all");

  const filteredDefs = definiciones
    .filter(d => d.nombre)
    .filter(d => estadoFilter === "all" || d.estado === estadoFilter);

  const counts = {
    all: definiciones.filter(d => d.nombre).length,
    activo: definiciones.filter(d => d.nombre && d.estado === "activo").length,
    borrador: definiciones.filter(d => d.nombre && d.estado === "borrador").length,
    archivado: definiciones.filter(d => d.nombre && d.estado === "archivado").length,
  };

  const handleAddDef = () => {
    addDef();
    toast({ title: "Definición creada", description: "Se ha añadido una nueva definición en borrador." });
  };

  const handleDelDef = (idx: number) => {
    delDef(idx);
    toast({ title: "Definición eliminada", description: "La definición y sus campos asociados han sido eliminados.", variant: "destructive" });
  };

  const colsDefinicion: Column<ModDef>[] = [
    { key: "modulo", header: "Módulo", width: "160px", type: "select", options: MODULO_OPTIONS },
    { key: "tipo", header: "Tipo", width: "160px", type: "select", options: TIPO_OPTIONS },
    { key: "nombre", header: "Nombre", width: "220px" },
    { key: "descripcion", header: "Descripción", width: "260px" },
    { key: "version", header: "Versión", width: "75px" },
    { key: "nivel_minimo", header: "Nivel mín.", width: "90px", type: "number" },
    { key: "estado", header: "Estado", width: "110px", type: "select", options: ESTADO_OPTIONS },
  ];

  return (
    <div className="space-y-6">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "Todos", icon: null },
          { key: "activo", label: "Activo", icon: <CheckCircle2 className="w-3 h-3" /> },
          { key: "borrador", label: "Borrador", icon: <Clock className="w-3 h-3" /> },
          { key: "archivado", label: "Archivado", icon: <Archive className="w-3 h-3" /> },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setEstadoFilter(f.key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium border transition-all flex items-center gap-1.5",
              estadoFilter === f.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
            )}
          >
            {f.icon}
            {f.label}
            <span className="opacity-70">({counts[f.key as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDefs.map(d => {
          const campoCount = parametros.filter(p => p.definicion_id === d.id).length;
          const datoCount = datos.filter(dt => dt.definicion_id === d.id).length;
          const isExpanded = expandedId === d.id;
          const campitos = parametros.filter(p => p.definicion_id === d.id).sort((a, b) => a.orden - b.orden);

          return (
            <div
              key={d.id}
              className={cn(
                "bg-card border rounded-xl overflow-hidden transition-all group",
                isExpanded ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border hover:border-primary/20 hover:shadow-sm",
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full", tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-muted text-muted-foreground")}>
                      {tipoLabels[d.tipo as TipoConfig] ?? d.tipo}
                    </span>
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", estadoBadge[d.estado ?? "borrador"])}>
                      <EstadoIcon estado={d.estado ?? "borrador"} />
                      {d.estado ?? "borrador"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">v{d.version}</span>
                </div>

                <p className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{d.nombre}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">{d.descripcion || "Sin descripción"}</p>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                      <List className="w-3 h-3" /> {campoCount}
                    </span>
                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                      <Database className="w-3 h-3" /> {datoCount}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                    {MODULO_OPTIONS.find(m => m.value === d.modulo)?.label ?? d.modulo}
                  </span>
                </div>
              </div>

              {campoCount > 0 && (
                <>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-medium">Ver campos asignados</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20 border-t border-border">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        {campitos.map(c => (
                          <span key={c.id} className="text-[11px] bg-card border border-border rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
                            <TipoDatoChip tipo={c.tipo_dato} />
                            <span className="font-medium text-foreground">{c.nombre.replace(/_/g, " ")}</span>
                            {c.obligatorio && <span className="text-destructive font-bold text-xs">*</span>}
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
          onClick={handleAddDef}
          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[180px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold">Nueva Definición</span>
          <span className="text-[11px] text-muted-foreground">Crear un nuevo formulario</span>
        </button>
      </div>

      {/* Tabla editable */}
      <EditableTable
        title="Registro de Definiciones"
        data={definiciones}
        columns={colsDefinicion}
        onUpdate={updDef}
        onDelete={handleDelDef}
        onAdd={handleAddDef}
      />
    </div>
  );
}

// ─── Panel Biblioteca de Parámetros ───────────────────────────────────────────

function TabBiblioteca() {
  const { parametrosLib, addParamLib, updParamLib, delParamLib } = useConfig();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newParam, setNewParam] = useState<Partial<Parametro>>({
    nombre: "", codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false,
  });

  const handleCreate = () => {
    if (!newParam.nombre?.trim()) return;
    addParamLib(newParam);
    setNewParam({ nombre: "", codigo: "", tipo_dato: "Texto", unidad_medida: "", descripcion: "", obligatorio_default: false });
    setShowCreateForm(false);
    toast({ title: "Parámetro creado", description: `"${newParam.nombre}" se añadió a la biblioteca.` });
  };

  const handleDelete = (id: string, nombre: string) => {
    delParamLib(id);
    toast({ title: "Parámetro eliminado", description: `"${nombre}" fue removido de la biblioteca.`, variant: "destructive" });
  };

  const filteredLib = searchTerm
    ? parametrosLib.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : parametrosLib;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left panel — Create/Edit form */}
        <div className="w-full lg:w-[340px] shrink-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                {showCreateForm ? "Nuevo Parámetro" : "Biblioteca Global"}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Catálogo de campos reutilizables en cualquier módulo.
              </p>
            </div>

            {!showCreateForm ? (
              <div className="p-4">
                <Button onClick={() => setShowCreateForm(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Crear Parámetro
                </Button>
                <div className="mt-4 space-y-3">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tipos de dato</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TIPO_DATO_OPTIONS.map(t => (
                      <TipoDatoChip key={t.value} tipo={t.value} />
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <strong className="text-foreground">{parametrosLib.length}</strong> parámetros en la biblioteca
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                  <Input
                    value={newParam.nombre ?? ""}
                    onChange={e => setNewParam(p => ({ ...p, nombre: e.target.value.replace(/ /g, "_").toLowerCase() }))}
                    placeholder="ej. temperatura_suelo"
                    className="h-9 text-sm"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground">Se convierte a snake_case automáticamente</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={newParam.codigo ?? ""}
                    onChange={e => setNewParam(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                    placeholder="ej. TEMP_SUE"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de dato</Label>
                  <select
                    value={newParam.tipo_dato ?? "Texto"}
                    onChange={e => setNewParam(p => ({ ...p, tipo_dato: e.target.value as TipoDato }))}
                    className="w-full h-9 text-sm border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {TIPO_DATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidad de medida</Label>
                  <Input
                    value={newParam.unidad_medida ?? ""}
                    onChange={e => setNewParam(p => ({ ...p, unidad_medida: e.target.value }))}
                    placeholder="ej. °C, mm, gr"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={newParam.descripcion ?? ""}
                    onChange={e => setNewParam(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Describe para qué se usa"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between py-1">
                  <Label className="text-xs">Obligatorio por defecto</Label>
                  <Switch
                    checked={newParam.obligatorio_default ?? false}
                    onCheckedChange={v => setNewParam(p => ({ ...p, obligatorio_default: v }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleCreate} disabled={!newParam.nombre?.trim()} className="flex-1">
                    <Save className="w-4 h-4 mr-2" /> Guardar
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Searchable table */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">
                Parámetros ({filteredLib.length})
              </h3>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar parámetro..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "170px" }}>Nombre</th>
                    <th style={{ width: "80px" }}>Código</th>
                    <th style={{ width: "110px" }}>Tipo</th>
                    <th style={{ width: "70px" }}>Unidad</th>
                    <th>Descripción</th>
                    <th style={{ width: "70px" }}>Oblig.</th>
                    <th style={{ width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLib.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={<BookOpen className="w-7 h-7 text-muted-foreground" />}
                          title="Sin parámetros"
                          description={searchTerm ? "No se encontraron resultados para tu búsqueda." : "La biblioteca está vacía. Crea tu primer parámetro."}
                          action={!searchTerm ? (
                            <Button size="sm" onClick={() => setShowCreateForm(true)}>
                              <Plus className="w-4 h-4 mr-1" /> Crear parámetro
                            </Button>
                          ) : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredLib.map(p => (
                      <tr key={p.id} className="group">
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-medium text-foreground font-mono">{p.nombre}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{p.codigo}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <TipoDatoChip tipo={p.tipo_dato} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.unidad_medida || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{p.descripcion}</td>
                        <td className="px-3 py-2.5 text-center">
                          {p.obligatorio_default ? (
                            <CheckCircle2 className="w-4 h-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => handleDelete(p.id, p.nombre)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
              {filteredLib.length} de {parametrosLib.length} parámetros
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel Campos (Campos_configurados) ───────────────────────────────────────

function TabCampos() {
  const { definiciones, parametros, parametrosLib, addPar, updParByIdx, delParByIdx } = useConfig();

  const sugerencias = parametrosLib
    .filter(p => p.activo)
    .map(p => ({ value: p.nombre, label: p.nombre }));

  const defsWithParams = definiciones.filter(d => d.nombre);

  const handleAddCampo = (defId: string) => {
    addPar(defId);
    toast({ title: "Campo añadido", description: "Se agregó un nuevo campo a la definición." });
  };

  const handleDelCampo = (absIdx: number) => {
    delParByIdx(absIdx);
    toast({ title: "Campo eliminado", variant: "destructive" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground">
        Asigna <strong className="text-foreground">campos de la Biblioteca</strong> a cada definición. Escribe en "Campo" para buscar o crear uno nuevo.
      </div>

      {defsWithParams.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-7 h-7 text-muted-foreground" />}
          title="Sin definiciones"
          description="Primero crea una definición en la pestaña Definiciones."
        />
      ) : (
        <div className="space-y-3">
          {defsWithParams.map(def => {
            const defParams = parametros
              .map((p, absIdx) => ({ ...p, absIdx }))
              .filter(p => p.definicion_id === def.id)
              .sort((a, b) => a.orden - b.orden);

            return (
              <Collapsible key={def.id} defaultOpen={defParams.length > 0}>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", tipoBadgeColor[def.tipo as TipoConfig] ?? "bg-muted text-muted-foreground")}>
                        {tipoLabels[def.tipo as TipoConfig] ?? def.tipo}
                      </span>
                      <span className="font-semibold text-sm text-foreground">{def.nombre}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {defParams.length} campo{defParams.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border">
                      {defParams.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-sm text-muted-foreground mb-3">No hay campos asignados a esta definición</p>
                          <Button size="sm" variant="outline" onClick={() => handleAddCampo(def.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar campo
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th style={{ width: "40px" }}></th>
                                  <th style={{ width: "50px" }}>Orden</th>
                                  <th style={{ width: "200px" }}>Campo</th>
                                  <th style={{ width: "120px" }}>Tipo</th>
                                  <th style={{ width: "90px" }}>Obligatorio</th>
                                  <th style={{ width: "50px" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {defParams.map(p => (
                                  <tr key={p.id}>
                                    <td className="px-2 py-2 text-center">
                                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab mx-auto" />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">{p.orden}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="text-sm font-medium text-foreground">{p.nombre.replace(/_/g, " ")}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <TipoDatoChip tipo={p.tipo_dato} />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <Switch
                                        checked={p.obligatorio}
                                        onCheckedChange={v => updParByIdx(p.absIdx, "obligatorio", v)}
                                        className="scale-90"
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <button
                                        onClick={() => handleDelCampo(p.absIdx)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-2.5 border-t border-border">
                            <Button size="sm" variant="ghost" onClick={() => handleAddCampo(def.id)} className="text-xs h-7">
                              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar campo
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Panel Datos ──────────────────────────────────────────────────────────────

function TabDatos() {
  const { definiciones, parametros, datos, addDato, updDato, delDato } = useConfig();
  const [filterDefId, setFilterDefId] = useState<string>("all");
  const [expandedDatoIds, setExpandedDatoIds] = useState<Set<string>>(new Set());
  const [editingDatoId, setEditingDatoId] = useState<string | null>(null);
  const [editingDato, setEditingDato] = useState<ModDato | null>(null);

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
    toast({ title: "Registro actualizado", description: "Los cambios han sido guardados." });
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
    toast({ title: "Registro creado", description: "Completa los campos y guarda." });
  };

  const handleDelDato = (id: string) => {
    delDato(id);
    toast({ title: "Registro eliminado", variant: "destructive" });
  };

  return (
    <div className="space-y-5">
      {/* Chips filtro */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterDefId("all")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full font-medium border transition-all",
            filterDefId === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40",
          )}
        >
          Todos <span className="opacity-70">({datos.length})</span>
        </button>
        {definiciones.filter(d => d.nombre).map(d => {
          const count = datos.filter(dt => dt.definicion_id === d.id).length;
          return (
            <button
              key={d.id}
              onClick={() => setFilterDefId(d.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium border transition-all",
                filterDefId === d.id
                  ? `${tipoBadgeColor[d.tipo as TipoConfig] ?? "bg-muted text-muted-foreground"} border-transparent`
                  : "bg-card text-muted-foreground border-border hover:border-primary/40",
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
            <EmptyState
              icon={<FileText className="w-7 h-7 text-muted-foreground" />}
              title="Sin registros"
              description="No hay registros para esta definición. Agrega el primero."
              action={
                <Button size="sm" onClick={addNewDato}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar registro
                </Button>
              }
            />
          ) : (
            filteredDatos.map(dato => {
              const isExpanded = expandedDatoIds.has(dato.id);
              const isEditing = editingDatoId === dato.id;
              const defObj = definiciones.find(d => d.id === dato.definicion_id);
              const activeDefId = isEditing && editingDato ? editingDato.definicion_id : dato.definicion_id;
              const defParams = getDefParams(activeDefId);
              const parsedVals = parseValores(isEditing && editingDato ? editingDato.valores : dato.valores);

              return (
                <div key={dato.id}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    isEditing ? "bg-primary/5" : "hover:bg-muted/30",
                  )}>
                    {defObj && (
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0",
                        tipoBadgeColor[defObj.tipo as TipoConfig] ?? "bg-muted text-muted-foreground",
                      )}>
                        {tipoLabels[defObj.tipo as TipoConfig] ?? defObj.tipo}
                      </span>
                    )}

                    {isEditing && editingDato ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <select
                          value={editingDato.definicion_id}
                          onChange={e => changeEditingDef(e.target.value)}
                          className="h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                          className="h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {dato.referencia || <span className="text-muted-foreground italic">Sin referencia</span>}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{dato.fecha}</span>
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
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
                              ? <><ChevronUp className="w-3.5 h-3.5" /> Ocultar</>
                              : <><ChevronDown className="w-3.5 h-3.5" /> Ver</>}
                          </button>
                          <button
                            onClick={() => startEdit(dato)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelDato(dato.id)}
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
                                  <span className="ml-auto"><TipoDatoChip tipo={param.tipo_dato} /></span>
                                </p>
                                {isEditing ? (
                                  <input
                                    type={tipoDatoInputType[param.tipo_dato]}
                                    value={parseValores(editingDato!.valores)[param.nombre] ?? ""}
                                    onChange={e => updateEditingField(param.nombre, e.target.value)}
                                    placeholder={param.nombre.replace(/_/g, " ")}
                                    className="w-full h-8 text-sm border border-input rounded-md px-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
        <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
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
    nombreEmpresa: "BlueData",
    colorPrimario: "#1a5c3a",
    colorSecundario: "#40916c",
    colorAccent: "#d4a72d",
  });

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description="Sistema dinámico V3 — define formularios, campos y módulos"
      />

      {/* Horizontal Stepper */}
      <ConfigStepper />

      <Tabs defaultValue="definiciones" className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-lg flex-wrap gap-1 h-auto sticky top-0 z-20 shadow-sm">
          <TabsTrigger value="definiciones" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="w-4 h-4" /> Definiciones
          </TabsTrigger>
          <TabsTrigger value="biblioteca" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="w-4 h-4" /> Biblioteca
          </TabsTrigger>
          <TabsTrigger value="campos" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <List className="w-4 h-4" /> Campos
          </TabsTrigger>
          <TabsTrigger value="datos" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Table2 className="w-4 h-4" /> Datos
          </TabsTrigger>
          <TabsTrigger value="marca" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="w-4 h-4" /> Marca
          </TabsTrigger>
          <TabsTrigger value="avanzado" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="w-4 h-4" /> Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definiciones"><TabDefiniciones /></TabsContent>
        <TabsContent value="biblioteca"><TabBiblioteca /></TabsContent>
        <TabsContent value="campos"><TabCampos /></TabsContent>
        <TabsContent value="datos"><TabDatos /></TabsContent>

        {/* ═══ Marca ══════════════════════════════════════════════════════════ */}
        <TabsContent value="marca" className="space-y-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-foreground">Personalización de Marca</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ajusta la identidad visual de tu plataforma</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Logo de la Empresa</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
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
                  <div className="mt-6">
                    <h4 className="font-medium text-foreground mb-4 text-sm">Vista previa</h4>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: brandConfig.colorPrimario }}>
                          {brandConfig.nombreEmpresa.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{brandConfig.nombreEmpresa}</p>
                          <p className="text-xs text-muted-foreground">Plataforma Agrícola</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 text-sm">Colores del Sistema</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {(["colorPrimario", "colorSecundario", "colorAccent"] as const).map((key, i) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs">{["Color Primario", "Color Secundario", "Color de Acento"][i]}</Label>
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
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => toast({ title: "Marca actualizada", description: "Los cambios de marca se aplicaron correctamente." })}>
                  <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Avanzado ═══════════════════════════════════════════════════════ */}
        <TabsContent value="avanzado" className="space-y-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-foreground">Configuración Avanzada</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Preferencias del sistema y funcionalidades adicionales</p>
            </div>
            <div className="p-5 space-y-1">
              {[
                { label: "Modo Oscuro", desc: "Activar tema oscuro para la interfaz", checked: false },
                { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo", checked: true },
                { label: "Auto-guardado", desc: "Guardar cambios automáticamente en tablas", checked: true },
                { label: "Multi-tenant activo", desc: "Habilitar aislamiento de datos por empresa", checked: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
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
