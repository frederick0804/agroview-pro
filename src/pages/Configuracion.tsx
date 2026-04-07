import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Button }  from "@/components/ui/button";
import { Switch }  from "@/components/ui/switch";
import { Badge }   from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers, List, Palette, Settings2, BookOpen,
  Upload, X, Plus,
  Trash2, Info, CheckCircle2, Check, Clock, Archive, Leaf, Search, Copy, History,
  ChevronDown, RotateCcw, Power, XCircle, LayoutList, ArrowLeftRight, Lock, CheckSquare, Square, ListFilter, Zap,
  Ruler, Scale, Network, ChevronRight, ArrowUp, ArrowDown, Map as MapIcon, Tag,
  Hash, ToggleLeft, Image as ImageIcon, Link2, UserX, UserCheck, SlidersHorizontal,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useTheme, DEFAULT_THEME } from "@/contexts/ThemeContext";
import {
  useRole,
  PRODUCER_DASHBOARD_MODULES,
  ALL_MODULES, ALL_ACTIONS, ACTIONS_BY_ROLE,
  ROLE_LEVELS,
  type UserRole as UserRoleT, type ActionPermission, type ProducerDashboardModuleKey,
} from "@/contexts/RoleContext";
import {
  tipoBadgeColor, tipoLabels, estadoBadge,
  type ModDef, type ModParam, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad, type Calibre, type NivelEstructura, type BloqueLayout,
} from "@/config/moduleDefinitions";
import { VersionDiffDialog } from "@/components/dashboard/VersionDiffDialog";
import { CampoConfigDrawer } from "@/components/dashboard/CampoConfigDrawer";
import { CampoMapaEditor } from "@/components/cultivo/CampoMapaEditor";
import {
  Shield, ShieldCheck, Sprout as SproutIcon, Briefcase, Eye,
  BookOpen as BookOpenAlt, Mail, Calendar,
  ShieldAlert, AlertTriangle, Users2, Building2, Tractor, Pencil, Globe, FileText, MapPin,
} from "lucide-react";

//  InfoBanner (dismissible) 

function InfoBanner({ children, storageKey }: { children: React.ReactNode; storageKey: string }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(`info-${storageKey}`) === "1");
  if (dismissed) return null;
  return (
    <div className="bg-muted/40 rounded-lg px-4 py-2.5 text-sm text-muted-foreground border border-border flex items-start gap-2 relative">
      <Info className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 pr-6">{children}</div>
      <button
        onClick={() => { setDismissed(true); sessionStorage.setItem(`info-${storageKey}`, "1"); }}
        className="absolute top-2 right-2 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground/60 hover:text-muted-foreground"
        title="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

//  Constantes 

const MODULO_OPTIONS = [
  { value: "vivero",           label: "Vivero" },
  { value: "cultivo",          label: "Cultivo" },
  { value: "cosecha",          label: "Cosecha" },
  { value: "post-cosecha",     label: "Post-cosecha" },
  { value: "laboratorio",      label: "Laboratorio" },
  { value: "produccion",       label: "Producción" },
  { value: "recursos-humanos", label: "Recursos Humanos" },
  { value: "comercial",        label: "Comercial" },
  { value: "informes",         label: "Informes" },
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
  { value: "Relación", label: "Relación (lookup)" },
];

const ESTADO_OPTIONS = [
  { value: "activo",    label: "Activo" },
  { value: "borrador",  label: "Borrador" },
  { value: "archivado", label: "Archivado" },
];

//  Constantes de acceso por definición 

const NIVEL_ACCESS_OPTIONS = [
  { value: 1, label: "Lector",        icon: "L" },
  { value: 2, label: "Supervisor",    icon: "S" },
  { value: 3, label: "Jefe de área",  icon: "JA" },
  { value: 4, label: "Productor",     icon: "P" },
  { value: 5, label: "Cliente Admin", icon: "CA" },
  { value: 6, label: "Super Admin",   icon: "SA" },
];

// Claves de rol en el mismo orden jerárquico
const ROLE_ACCESS_OPTIONS: { value: string; label: string; short: string }[] = [
  { value: "lector",        label: "Lector",        short: "Lector" },
  { value: "supervisor",    label: "Supervisor",     short: "Superv." },
  { value: "jefe_area",     label: "Jefe de área",  short: "J.área" },
  { value: "productor",     label: "Productor",      short: "Product." },
  { value: "cliente_admin", label: "Cliente Admin",  short: "C.Admin" },
  { value: "super_admin",   label: "Super Admin",    short: "S.Admin" },
];

//  Version helpers 

const bumpV = (v: string, kind: "minor" | "major"): string => {
  const parts = (v ?? "1.0").split(".").map(n => parseInt(n) || 0);
  const maj = parts[0] ?? 1;
  const min = parts[1] ?? 0;
  return kind === "minor" ? `${maj}.${min + 1}` : `${maj + 1}.0`;
};

//  EstadoIcon 

function EstadoIcon({ estado }: { estado: EstadoDef }) {
  if (estado === "activo")    return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (estado === "borrador")  return <Clock        className="w-3.5 h-3.5 text-yellow-600" />;
  return                             <Archive       className="w-3.5 h-3.5 text-gray-400" />;
}

//  Biblioteca interna (usada en Sheet desde TabFormularios) 

const TIPO_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Texto":   { icon: FileText,    color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  "Número":  { icon: Hash,        color: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-100 dark:bg-amber-900/30" },
  "Fecha":   { icon: Calendar,    color: "text-purple-700 dark:text-purple-400",bg: "bg-purple-100 dark:bg-purple-900/30" },
  "Sí/No":  { icon: ToggleLeft,  color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  "Lista":   { icon: List,        color: "text-orange-700 dark:text-orange-400",bg: "bg-orange-100 dark:bg-orange-900/30" },
  "Foto":    { icon: ImageIcon,   color: "text-pink-700 dark:text-pink-400",    bg: "bg-pink-100 dark:bg-pink-900/30" },
  "Archivo": { icon: FileText,    color: "text-slate-700 dark:text-slate-400",  bg: "bg-slate-100 dark:bg-slate-900/30" },
  "Relación":{ icon: Link2,       color: "text-cyan-700 dark:text-cyan-400",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
};

const EMPTY_PARAM_FORM = {
  nombre: "",
  codigo: "",
  tipo_dato: "Texto" as TipoDato,
  unidad_medida: "",
  descripcion: "",
  obligatorio_default: false,
  relacion_def_id: null as string | null,
  relacion_campo_label: null as string | null,
  relacion_campo_valor: null as string | null,
};

const NEW_DEF_TEMPLATES = [
  {
    id: "fitosanitario-cultivo",
    label: "Fitosanitario",
    hint: "Control de aplicaciones y observaciones en cultivo",
    modulo: "cultivo",
    tipo: "fitosanitario" as TipoConfig,
    descripcion: "Registro de aplicaciones, dosis, responsable y observaciones.",
  },
  {
    id: "riego-cultivo",
    label: "Riego",
    hint: "Seguimiento de riego, tiempos y volumen",
    modulo: "cultivo",
    tipo: "riego" as TipoConfig,
    descripcion: "Control de turnos de riego, duracion y parametros de operacion.",
  },
  {
    id: "cosecha-registro",
    label: "Cosecha",
    hint: "Captura de rendimiento y calidad de cosecha",
    modulo: "cosecha",
    tipo: "cosecha_registro" as TipoConfig,
    descripcion: "Registro de lotes, kilos, calibre y trazabilidad de cosecha.",
  },
  {
    id: "personalizado",
    label: "Personalizado",
    hint: "Comienza desde cero con estructura libre",
    modulo: "cultivo",
    tipo: "personalizado" as TipoConfig,
    descripcion: "Formulario configurable para procesos especificos del cliente.",
  },
] as const;

const EVENTO_TEMPLATES = [
  {
    id: "seguimiento",
    label: "Seguimiento semanal",
    nombre: "Seguimiento semanal",
    descripcion: "Control periodico de estado, avances y observaciones.",
    estado: "activo" as const,
  },
  {
    id: "incidencia",
    label: "Incidencia",
    nombre: "Registro de incidencia",
    descripcion: "Evento para documentar incidentes y acciones correctivas.",
    estado: "activo" as const,
  },
  {
    id: "auditoria",
    label: "Auditoria",
    nombre: "Auditoria interna",
    descripcion: "Checklist y observaciones de cumplimiento del proceso.",
    estado: "borrador" as const,
  },
] as const;

function TabBiblioteca({ onPendingChange }: { onPendingChange?: (v: boolean) => void }) {
  const { parametrosLib, addParamLib, updParamLib, delParamLib, allDefiniciones, parametros } = useConfig();

  const [libSearch,    setLibSearch]    = useState("");
  const [typeFilter,   setTypeFilter]   = useState<string>("Todos");
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState<typeof EMPTY_PARAM_FORM>(EMPTY_PARAM_FORM);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newForm,      setNewForm]      = useState<typeof EMPTY_PARAM_FORM>(EMPTY_PARAM_FORM);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);

  const tipos = ["Todos", "Texto", "Número", "Fecha", "Sí/No", "Lista", "Relación", "Foto", "Archivo"];

  const filtered = useMemo(() => parametrosLib.filter(p => {
    const matchSearch = !libSearch ||
      p.nombre.toLowerCase().includes(libSearch.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(libSearch.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(libSearch.toLowerCase()) ||
      p.unidad_medida?.toLowerCase().includes(libSearch.toLowerCase());
    const matchType = typeFilter === "Todos" || p.tipo_dato === typeFilter;
    return matchSearch && matchType;
  }), [parametrosLib, libSearch, typeFilter]);

  const startEdit = (p: Parametro) => {
    setEditingId(p.id);
    setEditForm({ nombre: p.nombre, codigo: p.codigo ?? "", tipo_dato: p.tipo_dato, unidad_medida: p.unidad_medida ?? "", descripcion: p.descripcion ?? "", obligatorio_default: p.obligatorio_default, relacion_def_id: p.relacion_def_id ?? null, relacion_campo_label: p.relacion_campo_label ?? null, relacion_campo_valor: p.relacion_campo_valor ?? null });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.nombre.trim()) return;
    updParamLib(editingId, "nombre",              editForm.nombre.trim());
    updParamLib(editingId, "codigo",              editForm.codigo.trim().toUpperCase());
    updParamLib(editingId, "tipo_dato",           editForm.tipo_dato);
    updParamLib(editingId, "unidad_medida",       editForm.unidad_medida.trim());
    updParamLib(editingId, "descripcion",         editForm.descripcion.trim());
    updParamLib(editingId, "obligatorio_default", editForm.obligatorio_default);
    // Campos de relación
    if (editForm.tipo_dato === "Relación") {
      updParamLib(editingId, "relacion_def_id",       editForm.relacion_def_id);
      updParamLib(editingId, "relacion_campo_label",  editForm.relacion_campo_label);
      updParamLib(editingId, "relacion_campo_valor",  editForm.relacion_campo_valor);
    } else {
      // Limpiar si ya no es tipo Relación
      updParamLib(editingId, "relacion_def_id",       null);
      updParamLib(editingId, "relacion_campo_label",  null);
      updParamLib(editingId, "relacion_campo_valor",  null);
    }
    setEditingId(null);
    onPendingChange?.(false);
  };

  const saveNew = () => {
    if (!newForm.nombre.trim()) return;
    addParamLib();
    // updParamLib on the last added
    setTimeout(() => {
      const last = parametrosLib[parametrosLib.length - 1];
      if (last) {
        updParamLib(last.id, "nombre",              newForm.nombre.trim());
        updParamLib(last.id, "codigo",              newForm.codigo.trim().toUpperCase());
        updParamLib(last.id, "tipo_dato",           newForm.tipo_dato);
        updParamLib(last.id, "unidad_medida",       newForm.unidad_medida.trim());
        updParamLib(last.id, "descripcion",         newForm.descripcion.trim());
        updParamLib(last.id, "obligatorio_default", newForm.obligatorio_default);

        // Campos de relación
        if (newForm.tipo_dato === "Relación") {
          updParamLib(last.id, "relacion_def_id",       newForm.relacion_def_id);
          updParamLib(last.id, "relacion_campo_label",  newForm.relacion_campo_label);
          updParamLib(last.id, "relacion_campo_valor",  newForm.relacion_campo_valor);
        }
      }
    }, 0);
    setNewForm(EMPTY_PARAM_FORM);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/*  Barra superior  */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={libSearch}
            onChange={e => setLibSearch(e.target.value)}
            placeholder="Buscar parámetro…"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
          />
          {libSearch && (
            <button onClick={() => setLibSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button size="sm" onClick={() => { setShowAddForm(true); setNewForm(EMPTY_PARAM_FORM); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo parámetro
        </Button>
      </div>

      {/*  Filtros por tipo  */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {tipos.map(t => {
            const meta = TIPO_META[t];
            const TIcon = meta?.icon;
            const isActive = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  isActive
                    ? t === "Todos"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : cn(meta?.bg, meta?.color, "border-transparent shadow-sm")
                    : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:border-border/80",
                )}
              >
                {TIcon && <TIcon className="w-3 h-3" />}
                {t}
                {t !== "Todos" && (
                  <span className="text-[10px] ml-0.5 opacity-70">
                    {parametrosLib.filter(p => p.tipo_dato === t).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
          <span>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          <span>Total: {parametrosLib.length}</span>
        </div>
      </div>

      {/*  Formulario nuevo parámetro  */}
      {showAddForm && (
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nuevo parámetro
          </p>
          <LibParamForm form={newForm} onChange={setNewForm} definiciones={allDefiniciones} parametros={parametros} />
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={saveNew} disabled={!newForm.nombre.trim()}>
              <Check className="w-3.5 h-3.5 mr-1" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/*  Lista de parámetros  */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            {libSearch ? `Sin resultados para "${libSearch}"` : "Biblioteca vacía."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const meta = TIPO_META[p.tipo_dato] ?? TIPO_META["Texto"];
            const TIcon = meta.icon;
            const isEditing = editingId === p.id;
            const isDeleting = confirmDelId === p.id;

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-2xl border bg-card transition-all shadow-[0_1px_0_rgba(15,23,42,0.04)]",
                  isEditing ? "border-primary/40 shadow-sm" : "border-border/80 hover:border-primary/30 hover:shadow-sm",
                )}
              >
                {isEditing ? (
                  /*  Modo edición  */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
                        <TIcon className={cn("w-3.5 h-3.5", meta.color)} />
                      </div>
                      <span className="text-xs font-semibold text-primary">Editando parámetro</span>
                    </div>
                    <LibParamForm form={editForm} onChange={f => setEditForm(f)} definiciones={allDefiniciones} parametros={parametros} />
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={saveEdit} disabled={!editForm.nombre.trim()}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  /*  Confirmar eliminación  */
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="flex-1 text-sm text-destructive font-medium">
                      ¿Eliminar <strong>{p.nombre}</strong>?
                    </span>
                    <Button size="sm" variant="destructive" onClick={() => { delParamLib(p.id); setConfirmDelId(null); }}>
                      Eliminar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelId(null)}>Cancelar</Button>
                  </div>
                ) : (
                  /*  Vista normal  */
                  <div className="group px-4 py-3.5">
                    {/* Tipo icon */}
                    <div className="flex items-start gap-3.5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                        <TIcon className={cn("w-4 h-4", meta.color)} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[15px] font-semibold leading-tight">{p.nombre.replace(/_/g, " ")}</span>
                              {p.codigo && (
                                <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                  {p.codigo}
                                </span>
                              )}
                            </div>
                            {p.descripcion && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                                {p.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => startEdit(p)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelId(p.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", meta.bg, meta.color)}>
                            {p.tipo_dato}
                          </span>
                          {p.unidad_medida && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                              {p.unidad_medida}
                            </span>
                          )}
                          {p.obligatorio_default && (
                            <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/40 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              Obligatorio
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- Formulario de campo de biblioteca ------------------------------------------
function LibParamForm({
  form,
  onChange,
  definiciones,
  parametros,
}: {
  form: {
    nombre: string;
    codigo: string;
    tipo_dato: TipoDato;
    unidad_medida: string;
    descripcion: string;
    obligatorio_default: boolean;
    relacion_def_id: string | null;
    relacion_campo_label: string | null;
    relacion_campo_valor: string | null;
  };
  onChange: (f: typeof form) => void;
  definiciones: ModDef[];
  parametros: ModParam[];
}) {
  void definiciones;
  void parametros;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Nombre <span className="text-destructive">*</span>
        </label>
        <Input
          value={form.nombre}
          onChange={e => onChange({ ...form, nombre: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
          placeholder="nombre_del_parametro"
          className="h-8 text-sm font-mono"
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Código</label>
        <Input
          value={form.codigo}
          onChange={e => onChange({ ...form, codigo: e.target.value.toUpperCase().slice(0, 8) })}
          placeholder="COD"
          className="h-8 text-sm font-mono"
          maxLength={8}
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Tipo <span className="text-destructive">*</span>
        </label>
        <select
          value={form.tipo_dato}
          onChange={e => onChange({ ...form, tipo_dato: e.target.value as TipoDato, relacion_def_id: null, relacion_campo_label: null, relacion_campo_valor: null })}
          className="w-full h-8 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
        >
          {["Texto", "Número", "Fecha", "Sí/No", "Lista", "Relación", "Foto", "Archivo"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unidad de medida</label>
        <Input
          value={form.unidad_medida}
          onChange={e => onChange({ ...form, unidad_medida: e.target.value })}
          placeholder="ej. kg, C, mm"
          className="h-8 text-sm"
        />
      </div>

      {/* Configuración de Relación */}
      {form.tipo_dato === "Relación" && (
        <div className="sm:col-span-2 p-2.5 rounded-md bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed flex items-start gap-1.5">
            <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            La fuente de datos, filtros y agrupación de campos tipo Relación se configuran al agregar el campo en el formulario, desde Configuración avanzada del campo.
          </p>
        </div>
      )}

      {/* Configuración de Cálculo para campos Numéricos */}
      <div className="space-y-1 sm:col-span-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
        <Input
          value={form.descripcion}
          onChange={e => onChange({ ...form, descripcion: e.target.value })}
          placeholder="Descripción breve del parámetro"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Switch
          checked={form.obligatorio_default}
          onCheckedChange={v => onChange({ ...form, obligatorio_default: v })}
          className="scale-75"
        />
        <label className="text-xs text-muted-foreground">Obligatorio por defecto al agregar a un formulario</label>
      </div>
    </div>
  );
}

// --- Hub de Formularios -------------------------------------------------------
// Hub central: tarjetas de formularios con campos inline, biblioteca en Sheet,
// gestión de versiones y configuración avanzada de campos.

function TabFormularios({
  onPendingChange,
  highlightDefId,
  autoOpenCreateModal,
}: {
  onPendingChange?: (v: boolean) => void;
  highlightDefId?: string;
  autoOpenCreateModal?: boolean;
}) {
  const {
    definiciones, allDefiniciones, parametros, datos, cultivos, allCultivos, parametrosLib,
    addDef, addEvento, updDef, delDef, dupDef, copyDefToClient,
    addPar, updParFull, delParByIdx,
    getDefAccesos, addDefAcceso, removeDefAcceso,
  } = useConfig();
  const { role, clientes, productores, users: allUsers, empresaCtxId } = useRole();
  const isSuperAdmin = role === "super_admin";

  // -- Estado ------------------------------------------------------------------
  const [searchDef,       setSearchDef]       = useState("");
  const [expandedCampos,  setExpandedCampos]  = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [expandedEventos, setExpandedEventos] = useState<Set<string>>(new Set());
  const [expandedAcceso,  setExpandedAcceso]  = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]               = useState<"card" | "list">("list");
  const [listExpandedRows, setListExpandedRows] = useState<Set<string>>(new Set());
  const toggleListRow = (id: string) => setListExpandedRows(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [configCampoId,   setConfigCampoId]   = useState<string | null>(null);
  const [showBiblioteca,  setShowBiblioteca]  = useState(false);
  const [addCampoModal,   setAddCampoModal]   = useState<{ defId: string; rootId: string } | null>(null);
  const [campoSearch,       setCampoSearch]       = useState("");
  const [campoTypeFilter,   setCampoTypeFilter]   = useState<string>("Todos");
  const [selectedLibIds,    setSelectedLibIds]    = useState<Set<string>>(new Set());

  // Super admin: filtro por cliente y productor
  const [selectedClienteFilter, setSelectedClienteFilter] = useState<number | null>(null);
  const [selectedProductorFilter, setSelectedProductorFilter] = useState<number | null>(null);
  const [newDefModalOpen, setNewDefModalOpen] = useState(false);
  const [newDefStep, setNewDefStep] = useState<"basico" | "avanzado" | "campos">("basico");
  const [newDefAdvancedUnlocked, setNewDefAdvancedUnlocked] = useState(false);
  const [newDefCamposUnlocked, setNewDefCamposUnlocked] = useState(false);
  const [newDefStep2Completed, setNewDefStep2Completed] = useState(false);
  const [newDefCampoSearch, setNewDefCampoSearch] = useState("");
  const [newDefCampoTypeFilter, setNewDefCampoTypeFilter] = useState<string>("Todos");
  const [newDefSelectedLibIds, setNewDefSelectedLibIds] = useState<Set<string>>(new Set());
  const [newDefForm, setNewDefForm] = useState<{
    nombre: string;
    descripcion: string;
    modulo: string;
    tipo: TipoConfig;
    estado: EstadoDef;
    cultivo_id: string;
    nivel_minimo: number;
    roles_excluidos: string[];
  }>({
    nombre: "",
    descripcion: "",
    modulo: "cultivo",
    tipo: "personalizado",
    estado: "borrador",
    cultivo_id: "",
    nivel_minimo: 1,
    roles_excluidos: [],
  });
  const [showCopyDialog,        setShowCopyDialog]        = useState(false);
  const [copySourceClienteId,   setCopySourceClienteId]   = useState<number | null>(null);
  const [copySelectedDefs,      setCopySelectedDefs]      = useState<Set<string>>(new Set());

  // ── Highlight: formulario resaltado al llegar desde "Editar campos" ─────────
  const [highlightedRootId, setHighlightedRootId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightRowRef   = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightDefId || allDefiniciones.length === 0) return;
    // Resolve rootId from defId
    const def = allDefiniciones.find(d => d.id === highlightDefId);
    if (!def) return;
    const rootId = def.origen_id ?? def.id;
    // Auto-expand in both view modes
    setExpandedCampos(prev => new Set(prev).add(rootId));
    setListExpandedRows(prev => new Set(prev).add(rootId));
    setHighlightedRootId(rootId);
    // Clear highlight after 4 s
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedRootId(null), 4000);
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  // Only run once on mount / when allDefiniciones first loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightDefId, allDefiniciones.length > 0]);

  // Scroll to highlighted row once it appears in DOM
  useEffect(() => {
    if (!highlightedRootId || !highlightRowRef.current) return;
    const el = highlightRowRef.current;
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }, [highlightedRootId]);

  // Reset productor cuando cambia el cliente
  useEffect(() => {
    setSelectedProductorFilter(null);
  }, [selectedClienteFilter]);

  // Sincronizar empresa context global ? filtro local
  useEffect(() => {
    if (isSuperAdmin) setSelectedClienteFilter(empresaCtxId);
  }, [empresaCtxId, isSuperAdmin]);

  const [archiveModal, setArchiveModal] = useState<{
    defId: string; rootId: string; nombre: string; version: string;
    otherVersions: ModDef[];
  } | null>(null);
  const [archiveActivateId, setArchiveActivateId] = useState<string>("");

  const [rollbackModal, setRollbackModal] = useState<{
    targetId: string; targetVersion: string; targetNombre: string;
    activeId: string | null; activeVersion: string; activeNombre: string;
    rootId: string;
  } | null>(null);
  const [rollbackAction, setRollbackAction] = useState<"borrador" | "archivado" | "keep">("borrador");

  const [confirmDup, setConfirmDup] = useState<{
    rootId: string; sourceId: string; sourceName: string;
    sourceVersion: string; newVersion: string; paramCount: number; newName: string;
  } | null>(null);
  const [compareRootId, setCompareRootId] = useState<string | null>(null);

  // -- Evento Sheet (gestión unificada) ----------------------------------------
  const [eventosSheet, setEventosSheet] = useState<{
    defId: string; rootId: string; modulo: string; nombre: string;
  } | null>(null);
  const [eventosSheetView, setEventosSheetView] = useState<"list" | "detail" | "new">("list");
  const [eventosSelectedRootId, setEventosSelectedRootId] = useState<string | null>(null);
  const [eventosDetailTab, setEventosDetailTab] = useState<"general" | "campos" | "historial" | "accesos">("general");
  const [newEventoStep, setNewEventoStep] = useState<"basico" | "avanzado" | "campos">("basico");
  const [newEventoStep2Completed, setNewEventoStep2Completed] = useState(false);
  const [newEventoCampoSearch, setNewEventoCampoSearch] = useState("");
  const [newEventoCampoTypeFilter, setNewEventoCampoTypeFilter] = useState<string>("Todos");
  const [newEventoSelectedLibIds, setNewEventoSelectedLibIds] = useState<Set<string>>(new Set());
  const [newEventoNombre, setNewEventoNombre]           = useState("");
  const [newEventoDescripcion, setNewEventoDescripcion] = useState("");
  const [newEventoEstado, setNewEventoEstado]           = useState<"activo" | "borrador">("activo");
  const [eventosSearch, setEventosSearch] = useState("");
  const [eventosEstadoFilter, setEventosEstadoFilter] = useState<"todos" | "activo" | "borrador" | "archivado">("todos");
  const [eventosSort, setEventosSort] = useState<"recientes" | "nombre">("recientes");
  const [compareEvId,       setCompareEvId]             = useState<string | null>(null);
  const [evRollbackModal, setEvRollbackModal] = useState<{
    targetId: string; targetVersion: string; targetNombre: string;
    activeId: string | null; activeVersion: string; activeNombre: string;
    rootId: string;
  } | null>(null);
  const [evRollbackAction, setEvRollbackAction] = useState<"borrador" | "archivado" | "keep">("borrador");
  const [evArchiveModal, setEvArchiveModal] = useState<{
    defId: string; rootId: string; nombre: string; version: string;
    otherVersions: ModDef[];
  } | null>(null);
  const [evArchiveActivateId, setEvArchiveActivateId] = useState<string>("");
  const [evConfirmDup, setEvConfirmDup] = useState<{
    rootId: string; sourceId: string; sourceName: string;
    sourceVersion: string; newVersion: string; paramCount: number; newName: string;
  } | null>(null);

  // -- Bulk access dialog -------------------------------------------------------
  const [accesosModal,   setAccesosModal]   = useState<string | null>(null); // defId
  const [accSearch,      setAccSearch]      = useState("");
  const [accFilter,      setAccFilter]      = useState<"todos" | "permitidos" | "bloqueados" | "por_rol">("todos");
  const [accSelected,    setAccSelected]    = useState<Set<number>>(new Set());
  const [confirmDelId,   setConfirmDelId]   = useState<string | null>(null); // defId a eliminar

  // Filtrado por cliente/productor para super_admin
  const effectiveDefs = useMemo(() => {
    if (!isSuperAdmin) return definiciones;
    if (selectedClienteFilter === null) return allDefiniciones;
    let list = allDefiniciones.filter(d => d.cliente_id === selectedClienteFilter);
    if (selectedProductorFilter !== null) {
      // Solo formularios del productor específico
      list = list.filter(d => d.productor_id === selectedProductorFilter);
    } else {
      // Solo empresa ? excluir formularios de productores específicos
      list = list.filter(d => !d.productor_id);
    }
    return list;
  }, [isSuperAdmin, selectedClienteFilter, selectedProductorFilter, definiciones, allDefiniciones]);

  // Productores filtrados por la empresa seleccionada
  const filteredProductores = useMemo(() => {
    if (selectedClienteFilter === null) return [];
    return productores.filter(p => p.clienteId === selectedClienteFilter);
  }, [productores, selectedClienteFilter]);

  // Cultivos filtrados para el cliente seleccionado
  const cardCultivos = useMemo(() => {
    if (!isSuperAdmin || selectedClienteFilter === null) return cultivos;
    return allCultivos.filter(c =>
      !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(selectedClienteFilter)
    );
  }, [isSuperAdmin, selectedClienteFilter, cultivos, allCultivos]);

  const activeParametrosCount = useMemo(
    () => parametrosLib.filter(p => p.activo !== false).length,
    [parametrosLib],
  );

  const openBibliotecaFlow = () => {
    setAddCampoModal(null);
    setNewDefModalOpen(false);
    setShowBiblioteca(true);
  };

  const resetNewDefForm = (moduloPref?: string) => {
    setNewDefStep("basico");
    setNewDefAdvancedUnlocked(false);
    setNewDefCamposUnlocked(false);
    setNewDefStep2Completed(false);
    setNewDefCampoSearch("");
    setNewDefCampoTypeFilter("Todos");
    setNewDefSelectedLibIds(new Set());
    setNewDefForm({
      nombre: "",
      descripcion: "",
      modulo: moduloPref ?? "cultivo",
      tipo: "personalizado",
      estado: "borrador",
      cultivo_id: "",
      nivel_minimo: 1,
      roles_excluidos: [],
    });
  };

  const openNewDefModal = (moduloPref?: string) => {
    resetNewDefForm(moduloPref);
    setNewDefModalOpen(true);
  };

  const autoOpenCreateHandledRef = useRef(false);
  useEffect(() => {
    if (!autoOpenCreateModal || autoOpenCreateHandledRef.current) return;
    openNewDefModal();
    autoOpenCreateHandledRef.current = true;
  }, [autoOpenCreateModal]);

  const openAccesosModal = (defId: string) => {
    setAccesosModal(defId);
    setAccSearch("");
    setAccFilter("todos");
    setAccSelected(new Set());
  };

  const resetNewEventoForm = () => {
    setNewEventoStep("basico");
    setNewEventoStep2Completed(false);
    setNewEventoCampoSearch("");
    setNewEventoCampoTypeFilter("Todos");
    setNewEventoSelectedLibIds(new Set());
    setNewEventoNombre("");
    setNewEventoDescripcion("");
    setNewEventoEstado("activo");
  };

  const openEventosSheetFlow = (
    payload: { defId: string; rootId: string; modulo: string; nombre: string },
    view: "list" | "new" = "list",
  ) => {
    setEventosSheet(payload);
    setEventosSearch("");
    setEventosEstadoFilter("todos");
    setEventosSort("recientes");
    setEventosSelectedRootId(null);
    setEventosDetailTab("general");
    if (view === "new") {
      resetNewEventoForm();
    }
    setEventosSheetView(view);
  };

  const openEventoDetail = (rootId: string, tab: "general" | "campos" | "historial" | "accesos" = "general") => {
    setEventosSelectedRootId(rootId);
    setEventosDetailTab(tab);
    setEventosSheetView("detail");
  };

  const applyEventoTemplate = (templateId: string) => {
    const template = EVENTO_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setNewEventoNombre(template.nombre);
    setNewEventoDescripcion(template.descripcion);
    setNewEventoEstado(template.estado);
    setEventosSheetView("new");
  };

  const newDefStepIndex = newDefStep === "basico" ? 1 : newDefStep === "avanzado" ? 2 : 3;
  const newDefStep1Completed = newDefForm.nombre.trim().length > 0;
  const newDefStep3Completed = newDefSelectedLibIds.size > 0;

  const newEventoStepIndex = newEventoStep === "basico" ? 1 : newEventoStep === "avanzado" ? 2 : 3;
  const newEventoStep1Completed = newEventoNombre.trim().length > 0;
  const newEventoStep3Completed = newEventoSelectedLibIds.size > 0;

  const filteredNewEventoLib = useMemo(() => {
    const q = newEventoCampoSearch.trim().toLowerCase();
    return parametrosLib.filter(p => {
      if (p.activo === false) return false;
      const typeOk = newEventoCampoTypeFilter === "Todos" || p.tipo_dato === newEventoCampoTypeFilter;
      if (!typeOk) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.codigo?.toLowerCase().includes(q)
      );
    });
  }, [parametrosLib, newEventoCampoSearch, newEventoCampoTypeFilter]);

  const createEventoFromWizard = () => {
    if (!eventosSheet || !newEventoStep1Completed || !newEventoStep2Completed || !newEventoStep3Completed) return;
    const created = addEvento(
      eventosSheet.defId,
      eventosSheet.modulo,
      newEventoNombre.trim(),
      newEventoDescripcion.trim(),
      newEventoEstado,
    );
    newEventoSelectedLibIds.forEach((libId) => {
      const lib = parametrosLib.find(p => p.id === libId);
      if (lib) addPar(created.id, lib.id, lib.nombre);
    });
    setExpandedEventos(prev => new Set(prev).add(eventosSheet.rootId));
    setEventosSheetView("list");
    resetNewEventoForm();
  };

  const createDefinitionFromWizard = () => {
    const nombre = newDefForm.nombre.trim();
    if (!nombre || !newDefStep2Completed || !newDefStep3Completed) return;
    const created = addDef({
      nombre,
      descripcion: newDefForm.descripcion.trim(),
      modulo: newDefForm.modulo,
      tipo: newDefForm.tipo,
      estado: newDefForm.estado,
      cultivoId: newDefForm.cultivo_id || undefined,
      nivel_minimo: newDefForm.nivel_minimo,
      roles_excluidos: newDefForm.roles_excluidos,
      clienteIdOverride: selectedClienteFilter ?? undefined,
      productorIdOverride: selectedProductorFilter ?? undefined,
    });
    newDefSelectedLibIds.forEach(libId => {
      const lib = parametrosLib.find(p => p.id === libId);
      if (lib) addPar(created.id, lib.id, lib.nombre);
    });
    setListExpandedRows(prev => new Set(prev).add(created.id));
    setSearchDef("");
    setNewDefModalOpen(false);
    onPendingChange?.(false);
  };

  const families = useMemo(() => {
    // Exclude evento defs ? they appear nested inside their parent registro card
    const registros = effectiveDefs.filter(d => !d.registro_padre_id);
    const map = new Map<string, ModDef[]>();
    registros.forEach(d => {
      const rootId = d.origen_id ?? d.id;
      if (!map.has(rootId)) map.set(rootId, []);
      map.get(rootId)!.push(d);
    });
    return Array.from(map.entries()).map(([rootId, versions]) => {
      const sorted = [...versions].sort((a, b) => {
        const [aMaj = 0, aMin = 0] = (a.version ?? "1.0").split(".").map(Number);
        const [bMaj = 0, bMin = 0] = (b.version ?? "1.0").split(".").map(Number);
        return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
      });
      const latest = sorted[0];
      const rep = sorted.find(v => v.estado === "activo") ?? sorted.find(v => v.estado === "borrador") ?? latest;
      return { rootId, versions: sorted, latest, rep };
    });
  }, [effectiveDefs]);

  const filteredFamilies = useMemo(() =>
    families.filter(f =>
      (f.rep?.nombre ?? "").toLowerCase().includes(searchDef.toLowerCase()) ||
      f.versions.some(v => v.nombre.toLowerCase().includes(searchDef.toLowerCase()))
    ),
    [families, searchDef]
  );

  // Agrupación por módulo (orden de MODULO_OPTIONS)
  const familiesByModulo = useMemo(() => {
    const map = new Map<string, typeof filteredFamilies>();
    filteredFamilies.forEach(f => {
      const mod = f.latest.modulo ?? "personalizado";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(f);
    });
    // Orden según MODULO_OPTIONS + catch-all
    const ordered: { modulo: string; label: string; families: typeof filteredFamilies }[] = [];
    MODULO_OPTIONS.forEach(({ value, label }) => {
      if (map.has(value)) ordered.push({ modulo: value, label, families: map.get(value)! });
    });
    // Módulos no conocidos al final
    map.forEach((fams, mod) => {
      if (!MODULO_OPTIONS.find(m => m.value === mod)) {
        ordered.push({ modulo: mod, label: mod, families: fams });
      }
    });
    return ordered;
  }, [filteredFamilies]);

  const toggleExpandCampos  = (rootId: string) =>
    setExpandedCampos(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });
  const toggleExpandHistory = (rootId: string) =>
    setExpandedHistory(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });
  const toggleExpandEventos = (rootId: string) =>
    setExpandedEventos(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });
  const toggleExpandAcceso  = (rootId: string) =>
    setExpandedAcceso(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });

  // Sheet de eventos: pre-computar lista y familias (igual que definiciones)
  const sheetEventos = useMemo(
    () => eventosSheet
      ? allDefiniciones.filter(d => d.registro_padre_id === eventosSheet.defId)
      : [],
    [allDefiniciones, eventosSheet],
  );

  // Agrupa eventos por familia (origen_id ?? id), como el sistema de familias de definiciones
  const sheetEventoFamilies = useMemo(() => {
    const map = new Map<string, typeof sheetEventos>();
    sheetEventos.forEach(ev => {
      const rootId = ev.origen_id ?? ev.id;
      if (!map.has(rootId)) map.set(rootId, []);
      map.get(rootId)!.push(ev);
    });
    return Array.from(map.entries()).map(([rootId, versions]) => {
      const sorted = [...versions].sort((a, b) => {
        const [aMaj = 0, aMin = 0] = (a.version ?? "1.0").split(".").map(Number);
        const [bMaj = 0, bMin = 0] = (b.version ?? "1.0").split(".").map(Number);
        return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin; // desc: latest first
      });
      const latest = sorted[0];
      return { rootId, versions: sorted, latest };
    });
  }, [sheetEventos]);

  const filteredSheetEventoFamilies = useMemo(() => {
    const q = eventosSearch.trim().toLowerCase();
    let list = [...sheetEventoFamilies];

    if (q) {
      list = list.filter(({ latest, versions }) =>
        latest.nombre.toLowerCase().includes(q)
        || (latest.descripcion ?? "").toLowerCase().includes(q)
        || versions.some(v => v.nombre.toLowerCase().includes(q)),
      );
    }

    if (eventosEstadoFilter !== "todos") {
      list = list.filter(({ latest }) => (latest.estado ?? "borrador") === eventosEstadoFilter);
    }

    list.sort((a, b) => {
      if (eventosSort === "nombre") {
        return a.latest.nombre.localeCompare(b.latest.nombre, "es", { sensitivity: "base" });
      }
      const aTime = a.latest.updated_at ? new Date(a.latest.updated_at).getTime() : 0;
      const bTime = b.latest.updated_at ? new Date(b.latest.updated_at).getTime() : 0;
      return bTime - aTime;
    });

    return list;
  }, [sheetEventoFamilies, eventosSearch, eventosEstadoFilter, eventosSort]);

  const selectedEventoFamily = useMemo(() => {
    if (!eventosSelectedRootId) return null;
    return sheetEventoFamilies.find(f => f.rootId === eventosSelectedRootId) ?? null;
  }, [sheetEventoFamilies, eventosSelectedRootId]);

  return (
    <div className="space-y-5">

      {/* -- Barra de herramientas -------------------------------------------- */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchDef}
            onChange={e => setSearchDef(e.target.value)}
            placeholder="Buscar formulario⬦"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
          />
          {searchDef && (
            <button onClick={() => setSearchDef("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por empresa y productor (solo super_admin) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedClienteFilter ?? ""}
              onChange={e => setSelectedClienteFilter(e.target.value ? Number(e.target.value) : null)}
              className="text-xs px-2 py-1.5 rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none"
            >
              <option value="">Todas las empresas</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {/* Filtro productor ? solo visible cuando hay empresa seleccionada */}
            {selectedClienteFilter !== null && filteredProductores.length > 0 && (
              <>
                <Tractor className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                <select
                  value={selectedProductorFilter ?? ""}
                  onChange={e => setSelectedProductorFilter(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none"
                >
                  <option value="">Todos los productores</option>
                  {filteredProductores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* -- Toggle vista lista/tarjeta -- */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              title="Vista lista compacta"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "card" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              title="Vista tarjetas"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setShowBiblioteca(true)}>
                <BookOpen className="w-4 h-4 mr-1.5" />
                Biblioteca
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Biblioteca de parametros reutilizables para tus formularios.
            </TooltipContent>
          </Tooltip>
          {isSuperAdmin && selectedClienteFilter !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar desde empresa
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Duplica formularios existentes desde otra empresa a la seleccionada.
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={() => openNewDefModal()}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva definición
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Crea un nuevo formulario y define sus campos.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* -- Banner de contexto -------------------------------------------------- */}
      {(() => {
        const selectedCliente = selectedClienteFilter !== null ? clientes.find(c => c.id === selectedClienteFilter) : null;
        const selectedProductor = selectedProductorFilter !== null ? productores.find(p => p.id === selectedProductorFilter) : null;
        const defsCount = effectiveDefs.filter(d => !d.registro_padre_id).length;
        const clientesConDefs = new Set(allDefiniciones.map(d => d.cliente_id).filter(Boolean)).size;

        // Super admin sin filtro ? global
        if (isSuperAdmin && selectedClienteFilter === null) {
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Vista global del sistema</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  {defsCount} formulario{defsCount !== 1 ? "s" : ""} de {clientesConDefs} empresa{clientesConDefs !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        }

        // Super admin con empresa + productor
        if (isSuperAdmin && selectedProductor) {
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Tractor className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-sm text-amber-700 dark:text-amber-200">
                  {selectedCliente?.nombre} <span className="font-normal text-amber-500">-</span> {selectedProductor.nombre}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                  {defsCount} formulario{defsCount !== 1 ? "s" : ""} de este productor
                </span>
              </div>
              <button
                onClick={() => { setSelectedClienteFilter(null); setSelectedProductorFilter(null); }}
                className="p-1 rounded hover:bg-amber-200/50 text-amber-600 dark:text-amber-400"
                title="Quitar filtros"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        // Super admin con solo empresa
        if (isSuperAdmin && selectedCliente) {
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-sm text-blue-700 dark:text-blue-200">{selectedCliente.nombre}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  {defsCount} formulario{defsCount !== 1 ? "s" : ""} a nivel empresa
                </span>
              </div>
              <button
                onClick={() => setSelectedClienteFilter(null)}
                className="p-1 rounded hover:bg-blue-200/50 text-blue-600 dark:text-blue-400"
                title="Quitar filtro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        // Cliente admin / productor (no super_admin)
        if (!isSuperAdmin) {
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-200">Mis formularios</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-2">
                  {defsCount} formulario{defsCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* -- Estado vacío ---------------------------------------------------- */}
      {filteredFamilies.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Layers className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {searchDef ? "Sin resultados para esa búsqueda" : "Sin formularios"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {!searchDef && (
                selectedProductorFilter !== null
                  ? "Este productor aún no tiene formularios propios."
                  : selectedClienteFilter !== null
                    ? "Esta empresa aún no tiene formularios a nivel empresa."
                    : "Crea el primer formulario para comenzar."
              )}
            </p>
          </div>
          {!searchDef && (
            <Button onClick={() => openNewDefModal()}>
              <Plus className="w-4 h-4 mr-2" /> Nueva definición
            </Button>
          )}
        </div>
      )}

      {/* -- Tarjetas agrupadas por módulo ----------------------------------- */}
      {filteredFamilies.length > 0 && (
        <div className="space-y-8">
          {familiesByModulo.map(({ modulo, label, families }) => (
            <div key={modulo} className="space-y-3">
              {/* Separador de módulo */}
              <div className="flex items-center gap-3">
                <LayoutList className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  {label}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                  {families.length}
                </span>
              </div>

              <div className={cn(
                viewMode === "card"
                  ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                  : "border border-border rounded-xl overflow-hidden divide-y divide-border",
              )}>
                {families.map(({ rootId, versions, latest, rep }) => {
            const campos       = parametros.filter(p => p.definicion_id === latest.id);
              const sortedCampos = [...campos].sort((a, b) => a.orden - b.orden);
              const hasManyCampos = sortedCampos.length > 8;
            const hasHistory   = versions.length > 1;
            const isExpCampos  = expandedCampos.has(rootId);
            const isExpHistory = expandedHistory.has(rootId);
            const isExpEventos = expandedEventos.has(rootId);
            // Eventos vinculados a este registro
            const eventos      = definiciones.filter(d => d.registro_padre_id === latest.id);
            const eventosActivos = eventos.filter(ev => ev.estado === "activo").length;
            const eventosBorrador = eventos.filter(ev => ev.estado === "borrador").length;
            const eventosLastUpdateTs = eventos.reduce((maxTs, ev) => {
              const ts = ev.updated_at ? new Date(ev.updated_at).getTime() : 0;
              return ts > maxTs ? ts : maxTs;
            }, 0);
            const eventosLastUpdateLabel = eventosLastUpdateTs > 0
              ? new Date(eventosLastUpdateTs).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
              : null;
            // Protección: no permitir desactivar si es la única versión no archivada y ya tiene datos
            const defDatos            = datos.filter(d => d.definicion_id === latest.id);
            const otherLiveVersions   = versions.filter(v => v.id !== latest.id && v.estado !== "archivado");
            const blockDeactivate     = latest.estado === "activo"
                                        && otherLiveVersions.length === 0
                                        && defDatos.length > 0;
            const isExpAcceso         = expandedAcceso.has(rootId);
            const accesoLabel         = NIVEL_ACCESS_OPTIONS.find(n => n.value === latest.nivel_minimo)?.label ?? "Todos";
            const rolesExcluidosCount = (latest.roles_excluidos ?? []).length;
            const accesosCount        = getDefAccesos(latest.id).length;
            const isListRow  = viewMode === "list";
            const isExpanded = isListRow ? listExpandedRows.has(rootId) : true;

            const isHighlighted = highlightedRootId === rootId;
            return (
              <div
                key={rootId}
                ref={isHighlighted ? highlightRowRef : undefined}
                className={cn(
                  "flex flex-col transition-all duration-300",
                  isListRow
                    ? cn(
                        "bg-card transition-all duration-200",
                        isExpanded
                          ? "shadow-sm border rounded-lg mb-2"
                          : "hover:bg-muted/10 border-b border-border/20",
                        isHighlighted && isExpanded
                          ? "border-primary/50 shadow-[0_0_0_2px_hsl(var(--primary)/0.25),0_4px_16px_hsl(var(--primary)/0.30)]"
                          : isExpanded
                            ? "border-border/60"
                            : "",
                      )
                    : cn(
                        "bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md",
                        isHighlighted
                          ? "border-primary/50 shadow-[0_0_0_2px_hsl(var(--primary)/0.25),0_4px_20px_hsl(var(--primary)/0.30)]"
                          : "border-border",
                      ),
                )}
              >

                {/* -- Highlight banner (formulario seleccionado desde "Editar campos") -- */}
                {isHighlighted && (
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-lg",
                    "bg-primary/10 text-primary border-b border-primary/20",
                    "animate-in slide-in-from-top-1 duration-300",
                  )}>
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    Editando campos de este formulario
                    <button
                      onClick={() => setHighlightedRootId(null)}
                      className="ml-auto text-primary/60 hover:text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* -- Compact list row (solo en modo lista) --------------- */}
                {isListRow && (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 cursor-pointer group/row select-none transition-colors",
                      isExpanded
                        ? cn("border-b", isHighlighted ? "bg-primary/5 border-primary/20 rounded-t-lg" : "bg-primary/5 border-primary/20 rounded-t-lg")
                        : "hover:bg-muted/30",
                    )}
                    onClick={() => toggleListRow(rootId)}
                  >
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none shrink-0",
                      tipoBadgeColor[rep.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700",
                    )}>
                      {tipoLabels[rep.tipo as TipoConfig] ?? rep.tipo}
                    </span>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5 shrink-0",
                      estadoBadge[rep.estado ?? "borrador"],
                    )}>
                      <EstadoIcon estado={rep.estado ?? "borrador"} />
                      {rep.estado ?? "borrador"}
                    </span>
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0 leading-none">
                      v{latest.version || "1.0"}
                    </span>
                    {hasHistory && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground leading-none shrink-0">
                        <History className="w-2.5 h-2.5" />{versions.length}v
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
                      {latest.nombre || "(sin nombre)"}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-muted-foreground shrink-0">
                      {MODULO_OPTIONS.find(m => m.value === latest.modulo)?.label ?? latest.modulo}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAccesosModal(latest.id);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 transition-colors shrink-0"
                      title="Gestionar accesos"
                    >
                      <Lock className="w-3 h-3" />
                      Accesos
                      {accesosCount > 0 && (
                        <span className="text-[9px] font-semibold bg-primary/15 text-primary px-1 py-0.5 rounded-full leading-none">
                          {accesosCount}
                        </span>
                      )}
                    </button>
                    {campos.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                        <List className="w-3 h-3" />{campos.length}
                      </span>
                    )}
                    {eventos.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 shrink-0">
                        <Zap className="w-3 h-3" />{eventos.length}
                      </span>
                    )}
                    {isSuperAdmin && selectedClienteFilter === null && latest.cliente_id && (
                      <span className="hidden md:inline text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 shrink-0">
                        {clientes.find(c => c.id === latest.cliente_id)?.nombre ?? `#${latest.cliente_id}`}
                      </span>
                    )}
                    {isSuperAdmin && latest.productor_id && (
                      <span className="hidden md:inline text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        {productores.find(p => p.id === latest.productor_id)?.nombre ?? `#${latest.productor_id}`}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200 group-hover/row:text-muted-foreground",
                      isExpanded && "rotate-180",
                    )} />
                  </div>
                )}

                {/* -- Cabecera -------------------------------------------- */}
                {isExpanded && <div className={cn(
                  "border-b border-border",
                  isListRow
                    ? "px-6 pt-3 pb-3 bg-muted/30 border-l-4 border-l-primary/40" // Contenido expandido con indentación y barra lateral
                    : "px-4 pt-3 pb-3 bg-muted/20"
                )}>

                  {/* Fila superior: badges de estado + menú de acciones */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none shrink-0",
                        tipoBadgeColor[rep.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700",
                      )}>
                        {tipoLabels[rep.tipo as TipoConfig] ?? rep.tipo}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5 shrink-0",
                        estadoBadge[rep.estado ?? "borrador"],
                      )}>
                        <EstadoIcon estado={rep.estado ?? "borrador"} />
                        {rep.estado ?? "borrador"}
                      </span>
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                        v{latest.version || "1.0"}
                      </span>
                      {hasHistory && (
                        <button
                          onClick={() => toggleExpandHistory(rootId)}
                          className={cn(
                            "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none transition-colors shrink-0",
                            isExpHistory ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
                          )}
                          title={isExpHistory ? "Ocultar historial" : "Ver historial de versiones"}
                        >
                          <History className="w-2.5 h-2.5" />{versions.length}v
                        </button>
                      )}
                      {isSuperAdmin && selectedClienteFilter === null && latest.cliente_id && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 shrink-0">
                          <Building2 className="w-2.5 h-2.5" />
                          {clientes.find(c => c.id === latest.cliente_id)?.nombre ?? `#${latest.cliente_id}`}
                        </span>
                      )}
                      {isSuperAdmin && latest.productor_id && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 shrink-0">
                          <Tractor className="w-2.5 h-2.5" />
                          {productores.find(p => p.id === latest.productor_id)?.nombre ?? `Productor #${latest.productor_id}`}
                        </span>
                      )}
                    </div>

                    {/* - Menú de acciones ------------------------------- */}
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                              aria-label="Más acciones de la definición"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          Más acciones de la definición
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "version", bumpV(latest.version || "1.0", "minor")); }}>
                          <Tag className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          Subir versión menor (+0.1)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmDup({ rootId, sourceId: latest.id, sourceName: latest.nombre, sourceVersion: latest.version || "1.0", newVersion: bumpV(latest.version || "1.0", "major"), paramCount: parametros.filter(p => p.definicion_id === latest.id).length, newName: latest.nombre })}>
                          <Copy className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          Nueva versión mayor
                        </DropdownMenuItem>
                        {hasHistory && (
                          <DropdownMenuItem onClick={() => setCompareRootId(rootId)}>
                            <ArrowLeftRight className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Comparar versiones
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openAccesosModal(latest.id)}>
                          <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          Gestionar accesos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {latest.estado !== "archivado" && (
                          <DropdownMenuItem
                            disabled={blockDeactivate}
                            onClick={() => { if (blockDeactivate) return; const idx = definiciones.findIndex(d => d.id === latest.id); if (idx === -1) return; updDef(idx, "estado", latest.estado === "activo" ? "borrador" : "activo"); }}
                            className={latest.estado === "activo" ? "text-yellow-600 focus:text-yellow-700" : "text-green-600 focus:text-green-700"}
                            title={blockDeactivate ? `Tiene ${defDatos.length} dato(s) - crea otra versión primero` : undefined}
                          >
                            <Power className="w-3.5 h-3.5 mr-2" />
                            {latest.estado === "activo" ? "Pasar a borrador" : "Activar"}
                          </DropdownMenuItem>
                        )}
                        {latest.estado !== "archivado" && (
                          <DropdownMenuItem
                            onClick={() => { const others = versions.filter(v => v.id !== latest.id && v.estado !== "archivado"); setArchiveActivateId(others[0]?.id ?? ""); setArchiveModal({ defId: latest.id, rootId, nombre: latest.nombre, version: latest.version || "1.0", otherVersions: others }); }}
                            className="text-amber-600 focus:text-amber-700"
                          >
                            <Archive className="w-3.5 h-3.5 mr-2" />
                            Archivar versión
                          </DropdownMenuItem>
                        )}
                        {latest.estado === "archivado" && (
                          <DropdownMenuItem onClick={() => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "estado", "borrador"); }}>
                            <RotateCcw className="w-3.5 h-3.5 mr-2 text-amber-600" />
                            Restaurar a borrador
                          </DropdownMenuItem>
                        )}
                        {latest.estado === "borrador" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setConfirmDelId(latest.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Eliminar definición
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Nombre editable */}
                  <input
                    value={latest.nombre}
                    onChange={e => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "nombre", e.target.value); }}
                    placeholder="(sin nombre)"
                    className="font-semibold text-foreground leading-snug w-full bg-transparent outline-none placeholder:italic placeholder:text-muted-foreground hover:bg-muted/30 focus:bg-background focus:px-1.5 focus:rounded focus:border focus:border-primary/40 transition-all text-sm mt-2"
                  />

                  {/* Módulo ? Cultivo */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap" onClick={e => e.stopPropagation()}>
                    <span className="shrink-0">{MODULO_OPTIONS.find(m => m.value === latest.modulo)?.label ?? latest.modulo}</span>
                    <span>·</span>
                    <select
                      value={latest.cultivo_id ?? ""}
                      onChange={e => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "cultivo_id", e.target.value || undefined); }}
                      onClick={e => e.stopPropagation()}
                      title="Alcance del formulario"
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer outline-none transition-colors",
                        latest.cultivo_id ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <option value="">Global - todos los cultivos</option>
                      {cardCultivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>

                  {/* Control de acceso — colapsable */}
                  <div className="mt-2.5 pt-2 border-t border-border/40" onClick={e => e.stopPropagation()}>
                    {/* Fila resumen — siempre visible */}
                    <div className="flex items-center gap-1.5 w-full group/acc hover:bg-primary/5 rounded-md px-1.5 py-1 transition-colors cursor-pointer"
                      onClick={() => toggleExpandAcceso(rootId)}
                    >
                      <Lock className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                        latest.nivel_minimo > 1
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          : "bg-muted text-muted-foreground border-border",
                      )}>
                        {accesoLabel}
                      </span>
                      {rolesExcluidosCount > 0 && (
                        <span className="text-[10px] text-destructive/70 font-medium shrink-0">
                          {rolesExcluidosCount} rol{rolesExcluidosCount > 1 ? "es" : ""} excluido{rolesExcluidosCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {accesosCount > 0 && (
                        <span className="text-[10px] text-primary/70 font-medium shrink-0">
                          {accesosCount} ajuste{accesosCount > 1 ? "s" : ""}
                        </span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); openAccesosModal(latest.id); }}
                        className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-md border border-primary/25 bg-primary/5 text-primary hover:bg-primary/15 transition-colors shrink-0 flex items-center gap-1"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Accesos
                      </button>
                      <ChevronDown className={cn(
                        "w-3 h-3 text-muted-foreground/40 transition-transform duration-200 shrink-0",
                        isExpAcceso && "rotate-180",
                      )} />
                    </div>

                    {/* Controles expandidos */}
                    {isExpAcceso && (
                      <div className={cn(
                        "mt-2 space-y-2 pt-2 border-t border-border/30",
                        isListRow && "ml-4 border-l-2 border-l-blue-300/50 pl-3 bg-blue-50/20 rounded-r-md" // Indentación especial para acceso en lista
                      )}>
                        {/* Nivel mínimo + roles excluidos */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={latest.nivel_minimo}
                            onChange={e => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "nivel_minimo", Number(e.target.value)); }}
                            title="Nivel de acceso mínimo"
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer outline-none transition-colors",
                              latest.nivel_minimo > 1 ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            {NIVEL_ACCESS_OPTIONS.map(n => <option key={n.value} value={n.value}>{n.icon} {n.label} (Nv.{n.value})</option>)}
                          </select>
                          {(latest.roles_excluidos ?? []).map(r => {
                            const rOpt = ROLE_ACCESS_OPTIONS.find(x => x.value === r);
                            return (
                              <span key={r} className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                                {rOpt?.short ?? r}
                                <button onClick={() => { const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "roles_excluidos", (latest.roles_excluidos ?? []).filter(x => x !== r)); }} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none" title={`Quitar exclusión de ${rOpt?.label ?? r}`}>x</button>
                              </span>
                            );
                          })}
                          {(() => {
                            const excluded = latest.roles_excluidos ?? [];
                            const available = ROLE_ACCESS_OPTIONS.filter(r => !excluded.includes(r.value));
                            if (available.length === 0) return null;
                            return (
                              <select value="" onChange={e => { if (!e.target.value) return; const idx = definiciones.findIndex(d => d.id === latest.id); if (idx !== -1) updDef(idx, "roles_excluidos", [...excluded, e.target.value]); }} className="text-[9px] px-1.5 py-0.5 rounded-full border border-dashed border-border cursor-pointer outline-none text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors bg-transparent shrink-0">
                                <option value="">+ excluir rol</option>
                                {available.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            );
                          })()}
                        </div>
                        {/* Overrides */}
                        {(() => {
                          const accesos = getDefAccesos(latest.id);
                          const nAllow = accesos.filter(a => a.habilitado).length;
                          const nBlock = accesos.filter(a => !a.habilitado).length;
                          return (
                            <div className="flex items-center gap-1.5">
                              <Users2 className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                              {accesos.length === 0
                                ? <span className="text-[9px] text-muted-foreground/50 italic">Sin ajustes</span>
                                : <>
                                    {nAllow > 0 && <span className="text-[9px] font-medium text-success">{nAllow} permitido{nAllow > 1 ? "s" : ""}</span>}
                                    {nBlock > 0 && <span className="text-[9px] font-medium text-destructive">{nBlock} bloqueado{nBlock > 1 ? "s" : ""}</span>}
                                  </>
                              }
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                </div>}

                {isExpanded && <>

                {/* -- Historial de versiones (expandible) ----------------- */}
                {isExpHistory && hasHistory && (
                  <div className={cn(
                    "border-b border-border bg-muted/10",
                    isListRow
                      ? "px-6 py-3 border-l-4 border-l-blue-400/40 bg-blue-50/30" // Indentación especial para lista
                      : "px-4 py-3"
                  )}>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3 h-3" /> Versiones
                      </p>
                      <button
                        onClick={() => setCompareRootId(rootId)}
                        className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Comparar versiones"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        Comparar
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {versions.map((v, i) => (
                        <div key={v.id} className="flex items-center gap-2 text-xs group/ver">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            v.estado === "activo"   ? "bg-green-500" :
                            v.estado === "borrador" ? "bg-yellow-400" : "bg-gray-300",
                          )} />
                          <span className="font-mono font-semibold shrink-0">v{v.version}</span>
                          {i === 0 && <span className="text-[10px] text-primary font-medium shrink-0">(última)</span>}
                          <p className="text-[10px] text-muted-foreground truncate flex-1">{v.nombre}</p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                            estadoBadge[v.estado ?? "borrador"],
                          )}>
                            {v.estado}
                          </span>
                          {/* Acciones por versión */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/ver:opacity-100 transition-opacity">
                            {v.estado === "borrador" && (
                              <button
                                onClick={() => {
                                  const currentActive = versions.find(x => x.estado === "activo");
                                  if (currentActive && currentActive.id !== v.id) {
                                    setRollbackAction("borrador");
                                    setRollbackModal({
                                      targetId: v.id,
                                      targetVersion: v.version || "1.0",
                                      targetNombre: v.nombre,
                                      activeId: currentActive.id,
                                      activeVersion: currentActive.version || "1.0",
                                      activeNombre: currentActive.nombre,
                                      rootId,
                                    });
                                  } else {
                                    const idx = definiciones.findIndex(d => d.id === v.id);
                                    if (idx !== -1) updDef(idx, "estado", "activo");
                                  }
                                }}
                                title="Activar esta versión"
                                className="p-0.5 rounded text-green-600 hover:bg-green-500/10 transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            )}
                            {v.estado === "activo" && (
                              <button
                                onClick={() => { const idx = definiciones.findIndex(d => d.id === v.id); if (idx !== -1) updDef(idx, "estado", "borrador"); }}
                                title="Pasar a borrador"
                                className="p-0.5 rounded text-yellow-600 hover:bg-yellow-500/10 transition-colors"
                              >
                                <Clock className="w-3 h-3" />
                              </button>
                            )}
                            {v.estado !== "archivado" && (
                              <button
                                onClick={() => {
                                  const others = versions.filter(x => x.id !== v.id && x.estado !== "archivado");
                                  setArchiveActivateId(others[0]?.id ?? "");
                                  setArchiveModal({ defId: v.id, rootId, nombre: v.nombre, version: v.version || "1.0", otherVersions: others });
                                }}
                                title="Archivar"
                                className="p-0.5 rounded text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            )}
                            {v.estado === "archivado" && (
                              <button
                                onClick={() => { const idx = definiciones.findIndex(d => d.id === v.id); if (idx !== -1) updDef(idx, "estado", "borrador"); }}
                                title="Restaurar a borrador"
                                className="p-0.5 rounded text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* -- Sección de Campos ------------------------------------ */}
                <div className="px-4 py-3 flex-1">
                  <button
                    onClick={() => toggleExpandCampos(rootId)}
                    className="flex items-center justify-between w-full text-xs group"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <List className="w-3.5 h-3.5" />
                      {campos.length} campo{campos.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                      isExpCampos && "rotate-180",
                    )} />
                  </button>

                  {isExpCampos && (
                    <div className={cn(
                      "mt-2.5 space-y-1",
                      isListRow && "ml-4 border-l-2 border-l-green-300/50 pl-3 bg-green-50/20 rounded-r-md" // Indentación especial para campo en modo lista
                    )}>
                      {campos.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 px-1">Sin campos configurados.</p>
                      ) : (
                        <div className={cn(
                          "space-y-1",
                          hasManyCampos && "max-h-72 overflow-y-auto pr-1"
                        )}>
                          {sortedCampos.map(campo => (
                            <div
                              key={campo.id}
                              className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group/campo"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {campo.obligatorio && (
                                  <span className="text-destructive font-bold text-[10px] shrink-0" title="Obligatorio">*</span>
                                )}
                                <span
                                  className="text-xs font-medium text-foreground bg-background border border-border px-1.5 py-0.5 rounded flex-1 min-w-0 truncate"
                                  title="El nombre técnico viene del parámetro y no se puede editar aquí"
                                >
                                  {campo.nombre.replace(/_/g, " ")}
                                </span>
                                <span
                                  className="text-[10px] text-muted-foreground shrink-0 bg-background border border-border px-1 py-0.5 rounded"
                                  title="El tipo de dato se define en el parámetro y no se puede editar aquí"
                                >
                                  {campo.tipo_dato}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/campo:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setConfigCampoId(campo.id)}
                                  title="Configuración avanzada"
                                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <Settings2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const origIdx = parametros.findIndex(p => p.id === campo.id);
                                    if (origIdx !== -1) delParByIdx(origIdx);
                                  }}
                                  title="Eliminar campo"
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLibIds(new Set());
                          setCampoSearch("");
                          setAddCampoModal({ defId: latest.id, rootId });
                          setExpandedCampos(prev => new Set([...prev, rootId]));
                        }}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar campo
                      </button>
                    </div>
                  )}
                </div>

                {/* -- Sección de Eventos vinculados (resumen compacto) ------ */}
                <div className={cn(
                  "border-t border-border",
                  isListRow
                    ? "px-6 py-3 border-l-4 border-l-amber-400/40 bg-amber-50/20" // Indentación especial para eventos en lista
                    : "px-4 py-3"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">Eventos</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 leading-none">
                          {eventos.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {eventosActivos} activo{eventosActivos !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          {eventosBorrador} borrador
                        </span>
                        {eventosLastUpdateLabel && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            <Clock className="w-2.5 h-2.5" />
                            últ. actualización {eventosLastUpdateLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/90 leading-relaxed max-w-[46ch]">
                        Los eventos son registros complementarios para documentar incidencias, seguimientos o acciones puntuales vinculadas a este formulario.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => openEventosSheetFlow({ defId: latest.id, rootId, modulo: latest.modulo, nombre: latest.nombre }, "list")}
                      >
                        Gestionar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => openEventosSheetFlow({ defId: latest.id, rootId, modulo: latest.modulo, nombre: latest.nombre }, "new")}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Nuevo evento
                      </Button>
                    </div>
                  </div>
                </div>
                </>}
              </div>
            );
          })}

                {/* -- Tarjeta "Nueva definición" dentro del módulo --------- */}
                {viewMode === "card" && (
                <button
                  onClick={() => openNewDefModal(modulo)}
                  className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[160px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Nueva definición</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{label}</p>
                  </div>
                </button>
                )}
                {viewMode === "list" && (
                <button
                  onClick={() => openNewDefModal(modulo)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-t border-border"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva definición: {label}
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- Modal: nueva definición (asistente) ----------------------------- */}
      <Dialog
        open={newDefModalOpen}
        onOpenChange={(open) => {
          setNewDefModalOpen(open);
          if (!open) resetNewDefForm();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Nueva definición
            </DialogTitle>
            <DialogDescription>
              Completa 3 pasos: básico, configuración avanzada y selección de campos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-primary">Primero parámetros, luego definición</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeParametrosCount} parámetro{activeParametrosCount !== 1 ? "s" : ""} activo{activeParametrosCount !== 1 ? "s" : ""} en Biblioteca.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" size="sm" variant="outline" onClick={openBibliotecaFlow}>
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    Biblioteca
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Abre la biblioteca de parametros base para agregar campos al formulario.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setNewDefStep("basico")}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                  newDefStep === "basico"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40",
                )}
              >
                1. Básico
              </button>
              <button
                type="button"
                disabled={!newDefAdvancedUnlocked && newDefStep !== "avanzado"}
                onClick={() => setNewDefStep("avanzado")}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                  newDefStep === "avanzado"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40",
                  !newDefAdvancedUnlocked && newDefStep !== "avanzado" && "opacity-50 cursor-not-allowed hover:border-border",
                )}
              >
                2. Avanzado
              </button>
              <button
                type="button"
                disabled={!newDefCamposUnlocked && newDefStep !== "campos"}
                onClick={() => setNewDefStep("campos")}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                  newDefStep === "campos"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40",
                  !newDefCamposUnlocked && newDefStep !== "campos" && "opacity-50 cursor-not-allowed hover:border-border",
                )}
              >
                3. Campos
              </button>
            </div>

            {/* Step progress bar + circles */}
            <div className="space-y-2">
              <div className="relative">
                {/* Track */}
                <div className="absolute left-[14px] right-[14px] h-0.5 bg-muted top-3.5" />
                <div
                  className="absolute left-[14px] h-0.5 bg-primary transition-all duration-300 top-3.5"
                  style={{ width: `${((newDefStepIndex - 1) / 2) * 100}%` }}
                />
                {/* Circles */}
                <div className="relative z-10 flex justify-between w-full">
                  {[
                    { id: 1, label: "Básico" },
                    { id: 2, label: "Avanzado" },
                    { id: 3, label: "Campos" },
                  ].map(step => {
                    const isActive = newDefStepIndex === step.id;
                    const isDone   = newDefStepIndex > step.id;
                    return (
                      <div key={step.id} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (step.id === 1) setNewDefStep("basico");
                            else if (step.id === 2 && newDefAdvancedUnlocked) setNewDefStep("avanzado");
                            else if (step.id === 3 && newDefCamposUnlocked) setNewDefStep("campos");
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                            isDone   ? "bg-primary border-primary text-primary-foreground" :
                            isActive ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/30" :
                                       "bg-background border-muted-foreground/30 text-muted-foreground",
                          )}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </button>
                        <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div key={newDefStep} className="wizard-step-in">
            {newDefStep === "basico" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Nombre del formulario <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newDefForm.nombre}
                    onChange={e => setNewDefForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Registro de Cosecha Campo Norte"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Módulo</Label>
                    <select
                      value={newDefForm.modulo}
                      onChange={e => setNewDefForm(prev => ({ ...prev, modulo: e.target.value }))}
                      className="w-full h-9 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      {MODULO_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Alcance por cultivo</Label>
                    <select
                      value={newDefForm.cultivo_id}
                      onChange={e => setNewDefForm(prev => ({ ...prev, cultivo_id: e.target.value }))}
                      className="w-full h-9 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      <option value="">Global para todos los cultivos</option>
                      {cardCultivos.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Resumen rápido</p>
                  <p>
                    Nombre: <strong>{newDefForm.nombre.trim() || "(pendiente)"}</strong>
                  </p>
                  <p>
                    Módulo: <strong>{MODULO_OPTIONS.find(m => m.value === newDefForm.modulo)?.label ?? newDefForm.modulo}</strong>
                  </p>
                  <p>
                    Alcance: <strong>{newDefForm.cultivo_id ? (cardCultivos.find(c => c.id === newDefForm.cultivo_id)?.nombre ?? "Cultivo seleccionado") : "Global"}</strong>
                  </p>
                </div>
              </>
            ) : newDefStep === "avanzado" ? (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</Label>
                  <Input
                    value={newDefForm.descripcion}
                    onChange={e => {
                      setNewDefStep2Completed(false);
                      setNewDefForm(prev => ({ ...prev, descripcion: e.target.value }));
                    }}
                    placeholder="Breve descripción de para qué sirve este formulario"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</Label>
                    <select
                      value={newDefForm.tipo}
                      onChange={e => {
                        setNewDefStep2Completed(false);
                        setNewDefForm(prev => ({ ...prev, tipo: e.target.value as TipoConfig }));
                      }}
                      className="w-full h-9 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      {TIPO_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Estado inicial</Label>
                    <select
                      value={newDefForm.estado}
                      onChange={e => {
                        setNewDefStep2Completed(false);
                        setNewDefForm(prev => ({ ...prev, estado: e.target.value as EstadoDef }));
                      }}
                      className="w-full h-9 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      {ESTADO_OPTIONS.filter(opt => opt.value !== "archivado").map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nivel mínimo</Label>
                    <select
                      value={newDefForm.nivel_minimo}
                      onChange={e => {
                        setNewDefStep2Completed(false);
                        setNewDefForm(prev => ({ ...prev, nivel_minimo: Number(e.target.value) }));
                      }}
                      className="w-full h-9 text-sm px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                    >
                      {NIVEL_ACCESS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Roles excluidos (opcional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_ACCESS_OPTIONS.map(roleOpt => {
                      const selected = newDefForm.roles_excluidos.includes(roleOpt.value);
                      return (
                        <button
                          key={roleOpt.value}
                          type="button"
                          onClick={() => {
                            setNewDefStep2Completed(false);
                            setNewDefForm(prev => ({
                              ...prev,
                              roles_excluidos: selected
                                ? prev.roles_excluidos.filter(r => r !== roleOpt.value)
                                : [...prev.roles_excluidos, roleOpt.value],
                            }));
                          }}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border transition-colors",
                            selected
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40",
                          )}
                        >
                          {roleOpt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">Selecciona los campos del formulario</p>
                    <span className="text-[11px] text-muted-foreground">
                      {newDefSelectedLibIds.size} seleccionado{newDefSelectedLibIds.size !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      autoFocus
                      value={newDefCampoSearch}
                      onChange={e => setNewDefCampoSearch(e.target.value)}
                      placeholder="Buscar campos por nombre, código o descripción?"
                      className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
                    />
                    {newDefCampoSearch && (
                      <button onClick={() => setNewDefCampoSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Todos", "Texto", "Número", "Fecha", "Sí/No", "Lista", "Relación"].map(t => {
                      const meta = TIPO_META[t];
                      const TIcon = meta?.icon;
                      const isActive = newDefCampoTypeFilter === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewDefCampoTypeFilter(t)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                            isActive
                              ? t === "Todos"
                                ? "bg-primary text-primary-foreground border-primary"
                                : cn(meta?.bg, meta?.color, "border-transparent")
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60",
                          )}
                        >
                          {TIcon && <TIcon className="w-2.5 h-2.5" />}
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
                    {(() => {
                      const filtered = parametrosLib.filter(p =>
                        p.activo !== false &&
                        (newDefCampoTypeFilter === "Todos" || p.tipo_dato === newDefCampoTypeFilter) &&
                        (!newDefCampoSearch ||
                          p.nombre.toLowerCase().includes(newDefCampoSearch.toLowerCase()) ||
                          p.descripcion?.toLowerCase().includes(newDefCampoSearch.toLowerCase()) ||
                          p.codigo?.toLowerCase().includes(newDefCampoSearch.toLowerCase()))
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="py-10 text-center space-y-1">
                            <BookOpen className="w-6 h-6 mx-auto text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">
                              {newDefCampoSearch ? `Sin resultados para "${newDefCampoSearch}"` : "No hay parámetros disponibles para este filtro."}
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={openBibliotecaFlow}>
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Crear parámetro en Biblioteca
                            </Button>
                          </div>
                        );
                      }
                      return filtered.map(lib => {
                        const meta = TIPO_META[lib.tipo_dato] ?? TIPO_META["Texto"];
                        const TIcon = meta.icon;
                        const selected = newDefSelectedLibIds.has(lib.id);
                        return (
                          <label
                            key={lib.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                              selected
                                ? "bg-primary/8 hover:bg-primary/10"
                                : "hover:bg-muted/40",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={e => {
                                setNewDefSelectedLibIds(prev => {
                                  const next = new Set(prev);
                                  e.target.checked ? next.add(lib.id) : next.delete(lib.id);
                                  return next;
                                });
                              }}
                              className="shrink-0 accent-primary"
                            />
                            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", meta.bg)}>
                              <TIcon className={cn("w-3.5 h-3.5", meta.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium text-foreground">
                                  {lib.nombre.replace(/_/g, " ")}
                                </span>
                                {lib.codigo && (
                                  <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                    {lib.codigo}
                                  </span>
                                )}
                                {lib.unidad_medida && (
                                  <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                                    {lib.unidad_medida}
                                  </span>
                                )}
                              </div>
                              {lib.descripcion && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{lib.descripcion}</p>
                              )}
                            </div>
                            {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Checklist final</p>
                  {[
                    { ok: newDefStep2Completed,      label: "Paso 2 completado" },
                    { ok: newDefStep3Completed,      label: "Al menos 1 campo seleccionado" },
                    { ok: newDefStep === "campos",   label: "Estás en paso 3" },
                  ].map(({ ok, label }) => (
                    <p key={label} className="flex items-center gap-1.5 mb-1">
                      {ok
                        ? <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                      }
                      <span className={ok ? "text-foreground" : ""}>{label}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              {(() => {
                if (isSuperAdmin && selectedClienteFilter === null) return "Se creará en vista global (sin filtro de empresa).";
                if (isSuperAdmin && selectedClienteFilter !== null && selectedProductorFilter !== null) {
                  const cliente = clientes.find(c => c.id === selectedClienteFilter)?.nombre ?? `#${selectedClienteFilter}`;
                  const productor = productores.find(p => p.id === selectedProductorFilter)?.nombre ?? `#${selectedProductorFilter}`;
                  return `Se creará para ${cliente} / ${productor}.`;
                }
                if (isSuperAdmin && selectedClienteFilter !== null) {
                  const cliente = clientes.find(c => c.id === selectedClienteFilter)?.nombre ?? `#${selectedClienteFilter}`;
                  return `Se creará para la empresa ${cliente}.`;
                }
                return "Se creará dentro de tu empresa activa.";
              })()}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-3 bg-background gap-2 sm:gap-0">
            {newDefStep === "avanzado" && (
              <Button variant="ghost" onClick={() => setNewDefStep("basico")}>
                Volver a básico
              </Button>
            )}
            {newDefStep === "campos" && (
              <Button variant="ghost" onClick={() => setNewDefStep("avanzado")}>
                Volver a avanzado
              </Button>
            )}
            <Button variant="outline" onClick={() => setNewDefModalOpen(false)}>
              Cancelar
            </Button>
            <div key={`wizard-footer-${newDefStep}`} className="wizard-footer-in flex items-center gap-2">
              {newDefStep === "basico" && (
                <Button
                  variant="default"
                  onClick={() => {
                    setNewDefAdvancedUnlocked(true);
                    setNewDefStep2Completed(false);
                    setNewDefStep("avanzado");
                  }}
                  disabled={!newDefStep1Completed}
                >
                  Siguiente: avanzado
                </Button>
              )}
              {newDefStep === "avanzado" && (
                <Button
                  variant="default"
                  onClick={() => {
                    setNewDefStep2Completed(true);
                    setNewDefCamposUnlocked(true);
                    setNewDefStep("campos");
                  }}
                >
                  Siguiente: campos
                </Button>
              )}
              {newDefStep === "campos" && (
                <Button
                  onClick={createDefinitionFromWizard}
                  disabled={
                    !newDefStep1Completed ||
                    activeParametrosCount === 0 ||
                    !newDefStep2Completed ||
                    !newDefStep3Completed
                  }
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Crear definición
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Sheet: gestión de eventos ----------------------------------------- */}
      <Sheet open={!!eventosSheet} onOpenChange={(o) => { if (!o) setEventosSheet(null); }}>
        <SheetContent
          side="right"
          className="sm:w-[480px] sm:max-w-[480px] p-0 gap-0 flex flex-col [&>button]:hidden"
        >
          {eventosSheet && (
            <>

                {/* -- VISTA LISTA -------------------------------------------- */}
                {eventosSheetView === "list" ? <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="px-5 pt-4 pb-3.5 border-b shrink-0 bg-muted/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold leading-tight">Eventos</h2>
                          <p className="text-xs text-muted-foreground leading-tight truncate mt-0.5">
                            {eventosSheet.nombre}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                            Registros secundarios para incidencias, seguimiento y acciones asociadas al formulario.
                          </p>
                        </div>
                        {sheetEventoFamilies.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-600 leading-none shrink-0">
                            {filteredSheetEventoFamilies.length}/{sheetEventoFamilies.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setEventosSheet(null)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                        <div className="rounded-md border border-border/70 bg-background/70 px-2 py-1">
                          <span className="font-semibold text-foreground">{sheetEventoFamilies.length}</span> total
                        </div>
                        <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-green-700">
                          <span className="font-semibold">{sheetEventoFamilies.filter(({ latest }) => latest.estado === "activo").length}</span> activo(s)
                        </div>
                        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-yellow-700">
                          <span className="font-semibold">{sheetEventoFamilies.filter(({ latest }) => latest.estado === "borrador").length}</span> borrador
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                        <div className="relative min-w-0">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                          <input
                            value={eventosSearch}
                            onChange={e => setEventosSearch(e.target.value)}
                            placeholder="Buscar evento?"
                            className="w-full h-8 pl-7 pr-7 text-xs rounded-md bg-background border border-border focus:border-primary/50 focus:outline-none"
                          />
                          {eventosSearch && (
                            <button
                              onClick={() => setEventosSearch("")}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <select
                          value={eventosEstadoFilter}
                          onChange={e => setEventosEstadoFilter(e.target.value as "todos" | "activo" | "borrador" | "archivado")}
                          className="h-8 text-xs px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                        >
                          <option value="todos">Todos</option>
                          <option value="activo">Activos</option>
                          <option value="borrador">Borrador</option>
                          <option value="archivado">Archivado</option>
                        </select>
                        <select
                          value={eventosSort}
                          onChange={e => setEventosSort(e.target.value as "recientes" | "nombre")}
                          className="h-8 text-xs px-2 rounded-md border border-border bg-background focus:border-primary/50 focus:outline-none"
                        >
                          <option value="recientes">Recientes</option>
                          <option value="nombre">Nombre</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Lista de eventos ? scrollable */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {sheetEventoFamilies.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/8 flex items-center justify-center">
                          <Zap className="w-7 h-7 text-amber-400/50" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground/70">Sin eventos configurados</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                            Crea tu primer evento para registrar incidencias o seguimientos del formulario principal.
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            resetNewEventoForm();
                            setEventosSheetView("new");
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Crear primer evento
                        </Button>

                      </div>
                    ) : filteredSheetEventoFamilies.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Search className="w-5 h-5 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground/70">Sin resultados con los filtros actuales</p>
                        <p className="text-xs text-muted-foreground">Prueba quitando filtros o cambiando la búsqueda.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEventosSearch("");
                            setEventosEstadoFilter("todos");
                            setEventosSort("recientes");
                          }}
                        >
                          Limpiar filtros
                        </Button>
                      </div>
                    ) : (
                      filteredSheetEventoFamilies.map(({ rootId: evRootId, versions: evVersions, latest: ev }) => {
                        const evCamposCount = parametros.filter(p => p.definicion_id === ev.id).length;
                        const evAccesosCount = getDefAccesos(ev.id).length;
                        const updatedLabel = ev.updated_at
                          ? new Date(ev.updated_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
                          : "Sin fecha";

                        return (
                          <div key={ev.id} className="rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/30 transition-colors">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => openEventoDetail(evRootId, "general")}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={cn(
                                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5",
                                    estadoBadge[ev.estado ?? "borrador"],
                                  )}>
                                    <EstadoIcon estado={ev.estado ?? "borrador"} />
                                    {ev.estado ?? "borrador"}
                                  </span>
                                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded leading-none">
                                    v{ev.version ?? "1.0"}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-foreground mt-1 truncate">{ev.nombre}</p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {ev.descripcion || "Sin descripcion"}
                                </p>
                              </button>

                              <DropdownMenu>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        aria-label="Más acciones del evento"
                                      >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Más acciones del evento
                                  </TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => openEventoDetail(evRootId, "general")}>Abrir detalle</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEventoDetail(evRootId, "campos")}>Ver campos</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEventoDetail(evRootId, "historial")}>Ver historial</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEventoDetail(evRootId, "accesos")}>Ver accesos</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openAccesosModal(ev.id)}>
                                    <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                    Gestionar accesos
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted border border-border">
                                  <List className="w-2.5 h-2.5" /> {evCamposCount} campo{evCamposCount !== 1 ? "s" : ""}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted border border-border">
                                  <History className="w-2.5 h-2.5" /> {evVersions.length} version{evVersions.length !== 1 ? "es" : ""}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  <Lock className="w-2.5 h-2.5" /> {evAccesosCount} acceso{evAccesosCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span>{updatedLabel}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => openAccesosModal(ev.id)}
                                >
                                  Accesos
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2.5 text-[10px] gap-1"
                                  onClick={() => openEventoDetail(evRootId, "general")}
                                >
                                  Ver detalle
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer fijo */}
                  {sheetEventoFamilies.length > 0 && (
                    <div className="px-4 py-3.5 border-t shrink-0 bg-background">
                      <button
                        onClick={() => {
                          resetNewEventoForm();
                          setEventosSheetView("new");
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Nuevo evento
                      </button>
                    </div>
                  )}
                </div>

                : eventosSheetView === "detail" ? (
                  <div className="flex flex-col h-full">
                    <div className="px-5 pt-4 pb-3 border-b shrink-0 bg-muted/20">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => setEventosSheetView("list")}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                          </button>
                          <div className="min-w-0">
                            <h2 className="text-sm font-semibold leading-tight">Detalle de evento</h2>
                            <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
                              {selectedEventoFamily?.latest.nombre ?? eventosSheet.nombre}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setEventosSheet(null)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {!selectedEventoFamily ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                        <p className="text-sm font-semibold text-foreground/80">No se encontro el evento</p>
                        <p className="text-xs text-muted-foreground">Puede haberse eliminado o filtrado.</p>
                        <Button size="sm" variant="outline" onClick={() => setEventosSheetView("list")}>Volver al listado</Button>
                      </div>
                    ) : (() => {
                      const ev = selectedEventoFamily.latest;
                      const evRootId = selectedEventoFamily.rootId;
                      const evVersions = selectedEventoFamily.versions;
                      const evIdx = definiciones.findIndex(d => d.id === ev.id);
                      const evHasHistory = evVersions.length > 1;
                      const evCampos = parametros.filter(p => p.definicion_id === ev.id).sort((a, b) => a.orden - b.orden);
                      const evAccesos = getDefAccesos(ev.id);
                      const evDatos = datos.filter(d => d.definicion_id === ev.id);
                      const otherLiveEvVers = evVersions.filter(v => v.id !== ev.id && v.estado !== "archivado");
                      const evBlockDeactivate = ev.estado === "activo" && otherLiveEvVers.length === 0 && evDatos.length > 0;
                      const accAllowed = evAccesos.filter(a => a.habilitado).length;
                      const accBlocked = evAccesos.filter(a => !a.habilitado).length;

                      return (
                        <>
                          <div className="px-4 py-2 border-b shrink-0 bg-background">
                            <div className="flex items-center gap-1">
                              {([
                                ["general", "General"],
                                ["campos", "Campos"],
                                ["historial", "Historial"],
                                ["accesos", "Accesos"],
                              ] as const).map(([tab, label]) => (
                                <button
                                  key={tab}
                                  onClick={() => setEventosDetailTab(tab)}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                    eventosDetailTab === tab
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {eventosDetailTab === "general" && (
                              <>
                                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(
                                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5",
                                      estadoBadge[ev.estado ?? "borrador"],
                                    )}>
                                      <EstadoIcon estado={ev.estado ?? "borrador"} />
                                      {ev.estado ?? "borrador"}
                                    </span>
                                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded leading-none">
                                      v{ev.version ?? "1.0"}
                                    </span>
                                    {evHasHistory && (
                                      <button
                                        onClick={() => setCompareEvId(evRootId)}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                      >
                                        <History className="w-2.5 h-2.5" />
                                        {evVersions.length} versiones
                                      </button>
                                    )}
                                  </div>

                                  <Input
                                    value={ev.nombre}
                                    onChange={e => { if (evIdx !== -1) updDef(evIdx, "nombre", e.target.value); }}
                                    placeholder="Nombre del evento"
                                    className="h-8 text-sm font-medium"
                                  />
                                  <Input
                                    value={ev.descripcion ?? ""}
                                    onChange={e => { if (evIdx !== -1) updDef(evIdx, "descripcion", e.target.value); }}
                                    placeholder="Descripcion breve"
                                    className="h-8 text-xs"
                                  />

                                  <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={evBlockDeactivate}
                                      onClick={() => {
                                        if (evBlockDeactivate || evIdx === -1) return;
                                        if (ev.estado !== "activo") {
                                          const currentActive = evVersions.find(v => v.id !== ev.id && v.estado === "activo");
                                          if (currentActive) {
                                            setEvRollbackAction("borrador");
                                            setEvRollbackModal({
                                              targetId: ev.id,
                                              targetVersion: ev.version ?? "1.0",
                                              targetNombre: ev.nombre,
                                              activeId: currentActive.id,
                                              activeVersion: currentActive.version ?? "1.0",
                                              activeNombre: currentActive.nombre,
                                              rootId: evRootId,
                                            });
                                            return;
                                          }
                                        }
                                        updDef(evIdx, "estado", ev.estado === "activo" ? "borrador" : "activo");
                                      }}
                                    >
                                      <Power className="w-3.5 h-3.5 mr-1" />
                                      {ev.estado === "activo" ? "Pasar a borrador" : "Activar"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (evIdx !== -1) updDef(evIdx, "version", bumpV(ev.version ?? "1.0", "minor"));
                                      }}
                                    >
                                      <Tag className="w-3.5 h-3.5 mr-1" />
                                      +0.1 version
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const sourceParamCount = evCampos.length;
                                        const [maj = 1] = (ev.version ?? "1.0").split(".").map(Number);
                                        setEvConfirmDup({
                                          rootId: evRootId,
                                          sourceId: ev.id,
                                          sourceName: ev.nombre,
                                          sourceVersion: ev.version ?? "1.0",
                                          newVersion: `${maj + 1}.0`,
                                          paramCount: sourceParamCount,
                                          newName: ev.nombre,
                                        });
                                      }}
                                    >
                                      <Copy className="w-3.5 h-3.5 mr-1" />
                                      Nueva version mayor
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const otherVers = evVersions.filter(v => v.id !== ev.id && v.estado !== "archivado");
                                        setEvArchiveActivateId("");
                                        setEvArchiveModal({
                                          defId: ev.id,
                                          rootId: evRootId,
                                          nombre: ev.nombre,
                                          version: ev.version ?? "1.0",
                                          otherVersions: otherVers,
                                        });
                                      }}
                                    >
                                      <Archive className="w-3.5 h-3.5 mr-1" />
                                      Archivar
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}

                            {eventosDetailTab === "campos" && (
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-foreground">Campos del evento</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border">
                                    {evCampos.length}
                                  </span>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                                  {evCampos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Sin campos configurados.</p>
                                  ) : (
                                    evCampos.map(c => (
                                      <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/70 bg-background">
                                        <span className="text-[10px] text-muted-foreground font-mono">{c.tipo_dato}</span>
                                        <span className="text-xs text-foreground flex-1 min-w-0 truncate">{c.etiqueta_personalizada || c.nombre}</span>
                                        <button
                                          onClick={() => setConfigCampoId(c.id)}
                                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                          title="Configurar"
                                        >
                                          <Settings2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const ci = parametros.findIndex(p => p.id === c.id);
                                            if (ci !== -1) delParByIdx(ci);
                                          }}
                                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                          title="Eliminar campo"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLibIds(new Set());
                                    setCampoSearch("");
                                    setAddCampoModal({ defId: ev.id, rootId: ev.id });
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" />
                                  Agregar campo
                                </Button>
                              </div>
                            )}

                            {eventosDetailTab === "historial" && (
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-foreground">Versiones del evento</p>
                                  {evHasHistory && (
                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setCompareEvId(evRootId)}>
                                      <ArrowLeftRight className="w-3 h-3 mr-1" />
                                      Comparar
                                    </Button>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  {[...evVersions]
                                    .sort((a, b) => {
                                      const [am = 0, an = 0] = (a.version ?? "1.0").split(".").map(Number);
                                      const [bm = 0, bn = 0] = (b.version ?? "1.0").split(".").map(Number);
                                      return bm !== am ? bm - am : bn - an;
                                    })
                                    .map(ver => {
                                      const isCurrent = ver.id === ev.id;
                                      return (
                                        <div key={ver.id} className="rounded-md border border-border/70 px-2 py-1.5 bg-background">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-mono text-foreground">v{ver.version ?? "1.0"}</span>
                                            <span className={cn(
                                              "text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5",
                                              estadoBadge[ver.estado ?? "borrador"],
                                            )}>
                                              <EstadoIcon estado={ver.estado ?? "borrador"} />
                                              {ver.estado ?? "borrador"}
                                            </span>
                                            {isCurrent && <span className="text-[9px] text-primary font-semibold">actual</span>}
                                          </div>
                                          {ver.updated_at && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                              {new Date(ver.updated_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                                            </p>
                                          )}
                                          {!isCurrent && ver.estado !== "archivado" && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <button
                                                onClick={() => {
                                                  const curActive = evVersions.find(v => v.estado === "activo");
                                                  if (curActive && curActive.id !== ver.id) {
                                                    setEvRollbackAction("borrador");
                                                    setEvRollbackModal({
                                                      targetId: ver.id,
                                                      targetVersion: ver.version ?? "1.0",
                                                      targetNombre: ver.nombre,
                                                      activeId: curActive.id,
                                                      activeVersion: curActive.version ?? "1.0",
                                                      activeNombre: curActive.nombre,
                                                      rootId: evRootId,
                                                    });
                                                  } else {
                                                    const verIdx = allDefiniciones.findIndex(d => d.id === ver.id);
                                                    if (verIdx !== -1) updDef(verIdx, "estado", "activo");
                                                  }
                                                }}
                                                className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded"
                                              >
                                                <Check className="w-2.5 h-2.5" /> Activar
                                              </button>
                                              <button
                                                onClick={() => {
                                                  const otherVers = evVersions.filter(v => v.id !== ver.id && v.estado !== "archivado");
                                                  setEvArchiveActivateId("");
                                                  setEvArchiveModal({
                                                    defId: ver.id,
                                                    rootId: evRootId,
                                                    nombre: ver.nombre,
                                                    version: ver.version ?? "1.0",
                                                    otherVersions: otherVers,
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded"
                                              >
                                                <Archive className="w-2.5 h-2.5" /> Archivar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {eventosDetailTab === "accesos" && (
                              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                  <div className="rounded-md border border-border px-2 py-1 bg-muted/40">
                                    <span className="font-semibold text-foreground">{evAccesos.length}</span> ajuste{evAccesos.length !== 1 ? "s" : ""}
                                  </div>
                                  <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-green-700">
                                    <span className="font-semibold">{accAllowed}</span> permitidos
                                  </div>
                                  <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-700">
                                    <span className="font-semibold">{accBlocked}</span> bloqueados
                                  </div>
                                </div>

                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                                  {evAccesos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Sin reglas especificas. Se aplica acceso por rol.</p>
                                  ) : (
                                    evAccesos.map(acc => {
                                      const user = allUsers.find(u => u.id === acc.usuario_id);
                                      return (
                                        <div key={acc.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/70 bg-background">
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{user?.nombre ?? `Usuario #${acc.usuario_id}`}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{acc.justificacion || "Sin justificacion"}</p>
                                          </div>
                                          <span className={cn(
                                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                            acc.habilitado
                                              ? "bg-green-50 text-green-700 border border-green-200"
                                              : "bg-red-50 text-red-700 border border-red-200",
                                          )}>
                                            {acc.habilitado ? "Permitido" : "Bloqueado"}
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                <Button size="sm" onClick={() => openAccesosModal(ev.id)}>
                                  <Lock className="w-3.5 h-3.5 mr-1" />
                                  Gestionar accesos
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Header con botón volver */}
                    <div className="px-5 pt-5 pb-4 border-b shrink-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEventosSheetView("list")}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <div>
                          <h2 className="text-sm font-semibold leading-tight">Nuevo evento</h2>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
                            {eventosSheet.nombre}
                          </p>
                        </div>
                      </div>

                      {/* Wizard steps */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setNewEventoStep("basico")}
                            className={cn(
                              "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                              newEventoStep === "basico"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-muted/40 text-muted-foreground border-border hover:border-amber-400/60",
                            )}
                          >
                            1. Básico
                          </button>
                          <button
                            type="button"
                            disabled={!newEventoStep1Completed && newEventoStep !== "avanzado"}
                            onClick={() => setNewEventoStep("avanzado")}
                            className={cn(
                              "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                              newEventoStep === "avanzado"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-muted/40 text-muted-foreground border-border hover:border-amber-400/60",
                              !newEventoStep1Completed && newEventoStep !== "avanzado" && "opacity-50 cursor-not-allowed hover:border-border",
                            )}
                          >
                            2. Avanzado
                          </button>
                          <button
                            type="button"
                            disabled={!newEventoStep2Completed && newEventoStep !== "campos"}
                            onClick={() => setNewEventoStep("campos")}
                            className={cn(
                              "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                              newEventoStep === "campos"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-muted/40 text-muted-foreground border-border hover:border-amber-400/60",
                              !newEventoStep2Completed && newEventoStep !== "campos" && "opacity-50 cursor-not-allowed hover:border-border",
                            )}
                          >
                            3. Campos
                          </button>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${((newEventoStepIndex - 1) / 2) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Formulario ? scrollable */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                      {/* Info contextual */}
                      <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/6 border border-amber-400/20">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Los eventos son registros secundarios que complementan o documentan cada entrada del formulario principal.
                        </p>
                      </div>

                      {newEventoStep === "basico" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground/80">
                              Nombre del evento <span className="text-amber-500">*</span>
                            </label>
                            <Input
                              value={newEventoNombre}
                              onChange={e => setNewEventoNombre(e.target.value)}
                              placeholder="ej. Seguimiento semanal, Aplicación de riego"
                              autoFocus
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground/80">Descripción</label>
                            <Input
                              value={newEventoDescripcion}
                              onChange={e => setNewEventoDescripcion(e.target.value)}
                              placeholder="Describe brevemente para qué sirve este evento"
                            />
                          </div>
                        </>
                      ) : newEventoStep === "avanzado" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground/80">Estado inicial</label>
                            <div className="grid grid-cols-2 gap-2">
                              {(["activo", "borrador"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setNewEventoEstado(st)}
                                  className={cn(
                                    "h-9 rounded-lg border text-xs font-medium transition-colors",
                                    newEventoEstado === st
                                      ? "border-amber-500 bg-amber-500/10 text-amber-700"
                                      : "border-border text-muted-foreground hover:border-amber-400/50",
                                  )}
                                >
                                  {st === "activo" ? "Activo" : "Borrador"}
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Recomendado: iniciar en borrador y activar cuando valides el flujo.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">Selecciona campos para el evento</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border">
                                {newEventoSelectedLibIds.size} seleccionado{newEventoSelectedLibIds.size !== 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                  value={newEventoCampoSearch}
                                  onChange={e => setNewEventoCampoSearch(e.target.value)}
                                  placeholder="Buscar campo en biblioteca"
                                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:border-amber-400/70"
                                />
                              </div>
                              <select
                                value={newEventoCampoTypeFilter}
                                onChange={e => setNewEventoCampoTypeFilter(e.target.value)}
                                className="text-xs h-8 px-2 rounded-md border border-border bg-background"
                              >
                                <option value="Todos">Todos</option>
                                {TIPO_DATO_OPTIONS.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
                              {filteredNewEventoLib.length === 0 ? (
                                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3 text-center">
                                  No hay campos disponibles con ese filtro.
                                </div>
                              ) : (
                                filteredNewEventoLib.map(p => {
                                  const checked = newEventoSelectedLibIds.has(p.id);
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setNewEventoSelectedLibIds(prev => {
                                        const n = new Set(prev);
                                        checked ? n.delete(p.id) : n.add(p.id);
                                        return n;
                                      })}
                                      className={cn(
                                        "w-full flex items-start gap-2 px-2.5 py-2 rounded-md border text-left transition-colors",
                                        checked
                                          ? "border-amber-400/70 bg-amber-500/10"
                                          : "border-border hover:border-amber-400/50 hover:bg-muted/30",
                                      )}
                                    >
                                      {checked ? <CheckSquare className="w-3.5 h-3.5 mt-0.5 text-amber-600" /> : <Square className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />}
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">{p.nombre}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{p.tipo_dato}{p.codigo ? ` · ${p.codigo}` : ""}</p>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-2">Checklist final</p>
                        {[
                          { ok: newEventoStep1Completed, label: "Paso 1 completado" },
                          { ok: newEventoStep2Completed, label: "Paso 2 completado" },
                          { ok: newEventoStep3Completed, label: "Al menos 1 campo seleccionado" },
                          { ok: newEventoStep === "campos", label: "Estás en paso 3" },
                        ].map(({ ok, label }) => (
                          <p key={label} className="flex items-center gap-1.5 mb-1">
                            {ok
                              ? <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                              : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                            }
                            <span className={ok ? "text-foreground" : ""}>{label}</span>
                          </p>
                        ))}
                      </div>

                    </div>

                    {/* Footer fijo */}
                    <div className="px-5 py-4 border-t shrink-0 bg-background flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (newEventoStep === "campos") setNewEventoStep("avanzado");
                          else if (newEventoStep === "avanzado") setNewEventoStep("basico");
                          else setEventosSheetView("list");
                        }}
                      >
                        {newEventoStep === "basico" ? "Cancelar" : "Atrás"}
                      </Button>

                      {newEventoStep === "basico" && (
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                          disabled={!newEventoStep1Completed}
                          onClick={() => setNewEventoStep("avanzado")}
                        >
                          Siguiente: Avanzado
                        </Button>
                      )}

                      {newEventoStep === "avanzado" && (
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => {
                            setNewEventoStep2Completed(true);
                            setNewEventoStep("campos");
                          }}
                        >
                          Siguiente: Campos
                        </Button>
                      )}

                      {newEventoStep === "campos" && (
                        <Button
                          disabled={!newEventoStep1Completed || !newEventoStep2Completed || !newEventoStep3Completed}
                          onClick={createEventoFromWizard}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <Zap className="w-4 h-4 mr-1.5" />
                          Crear evento
                        </Button>
                      )}
                    </div>
                  </div>
                )}

            </>
          )}
        </SheetContent>
      </Sheet>

      {/* -- Diálogo: comparar versiones de evento ---------------------------- */}
      {compareEvId && (
        <VersionDiffDialog
          rootId={compareEvId}
          open={!!compareEvId}
          onClose={() => setCompareEvId(null)}
        />
      )}

      {/* -- (ELIMINADO) Modal: crear nuevo evento -- reemplazado por Sheet -- */}
      {false && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="max-w-sm">
            <DialogHeader />
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: confirmar nueva versión mayor de evento -------------------- */}
      {evConfirmDup && (
        <Dialog open onOpenChange={() => setEvConfirmDup(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-500" />
                Crear nueva versión?
              </DialogTitle>
              <DialogDescription>
                Se creará <strong>v{evConfirmDup.newVersion}</strong> a partir de &ldquo;{evConfirmDup.sourceName}&rdquo; (v{evConfirmDup.sourceVersion}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nombre del evento</label>
              <Input
                value={evConfirmDup.newName}
                onChange={e => setEvConfirmDup(prev => prev ? { ...prev, newName: e.target.value } : prev)}
                placeholder="Nombre del nuevo evento?"
                className="h-8 text-sm"
                autoFocus
              />
            </div>

            <div className="bg-muted/40 border border-border rounded-lg px-3 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Versión anterior</span>
                <span className="font-mono text-muted-foreground line-through">v{evConfirmDup.sourceVersion}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Nueva versión</span>
                <span className="font-mono font-bold text-amber-600">v{evConfirmDup.newVersion}</span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Campos copiados</span>
                <span className="font-semibold text-foreground">
                  {evConfirmDup.paramCount} campo{evConfirmDup.paramCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estado inicial</span>
                <span className="font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full text-[10px]">
                  borrador
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Podrás editar los campos de la nueva versión de forma independiente sin afectar la versión anterior.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEvConfirmDup(null)}>Cancelar</Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  dupDef(evConfirmDup.sourceId, evConfirmDup.newName.trim() || undefined);
                  setEvConfirmDup(null);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Crear v{evConfirmDup.newVersion}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: archivar versión de evento --------------------------------- */}
      {evArchiveModal && (
        <Dialog open onOpenChange={() => setEvArchiveModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                Archivar versión de evento
              </DialogTitle>
              <DialogDescription>
                La versión <strong>v{evArchiveModal.version}</strong> de &ldquo;{evArchiveModal.nombre}&rdquo; quedará archivada y no podrá usarse en nuevos registros.
              </DialogDescription>
            </DialogHeader>

            {evArchiveModal.otherVersions.length > 0 ? (
              <div className="space-y-3 py-1">
                <p className="text-sm font-medium text-foreground">¿Qué versión activar tras archivar?</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    evArchiveActivateId === "" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="ev-archive-activate" value=""
                      checked={evArchiveActivateId === ""}
                      onChange={() => setEvArchiveActivateId("")}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">No activar ninguna</p>
                      <p className="text-[11px] text-muted-foreground/70">Las demás versiones conservan su estado actual</p>
                    </div>
                  </label>
                  {evArchiveModal.otherVersions.map(ov => (
                    <label key={ov.id} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      evArchiveActivateId === ov.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}>
                      <input
                        type="radio" name="ev-archive-activate" value={ov.id}
                        checked={evArchiveActivateId === ov.id}
                        onChange={() => setEvArchiveActivateId(ov.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{ov.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-muted-foreground">v{ov.version || "1.0"}</span>
                          <span className={cn(
                            "text-[9px] px-1 py-0.5 rounded-full font-medium",
                            estadoBadge[ov.estado ?? "borrador"],
                          )}>
                            {ov.estado}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                No hay otras versiones disponibles para activar. El evento quedará sin versión activa.
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEvArchiveModal(null)}>Cancelar</Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  const archiveIdx = allDefiniciones.findIndex(d => d.id === evArchiveModal.defId);
                  if (archiveIdx !== -1) updDef(archiveIdx, "estado", "archivado");
                  if (evArchiveActivateId) {
                    const activateIdx = allDefiniciones.findIndex(d => d.id === evArchiveActivateId);
                    if (activateIdx !== -1) updDef(activateIdx, "estado", "activo");
                  }
                  setEvArchiveModal(null);
                }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archivar{evArchiveActivateId ? " y activar seleccionada" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: regresión de versión de evento ----------------------------- */}
      {evRollbackModal && (
        <Dialog open onOpenChange={() => setEvRollbackModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Revertir a v{evRollbackModal.targetVersion}
              </DialogTitle>
              <DialogDescription>
                Activarás <strong>&ldquo;{evRollbackModal.targetNombre}&rdquo; v{evRollbackModal.targetVersion}</strong>.
                {evRollbackModal.activeId && (
                  <> ¿Qué hacemos con la versión actualmente activa (<strong>v{evRollbackModal.activeVersion}</strong>)?</>
                )}
              </DialogDescription>
            </DialogHeader>

            {evRollbackModal.activeId && (
              <div className="space-y-2 py-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide text-muted-foreground">
                  v{evRollbackModal.activeVersion} - {evRollbackModal.activeNombre}
                </p>
                <div className="space-y-1.5">
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    evRollbackAction === "borrador" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="ev-rollback-action" value="borrador"
                      checked={evRollbackAction === "borrador"}
                      onChange={() => setEvRollbackAction("borrador")}
                      className="accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Pasar a borrador</p>
                      <p className="text-[11px] text-muted-foreground">Se puede volver a activar en el futuro</p>
                    </div>
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">borrador</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    evRollbackAction === "archivado" ? "border-amber-500 bg-amber-50" : "border-border hover:border-amber-400/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="ev-rollback-action" value="archivado"
                      checked={evRollbackAction === "archivado"}
                      onChange={() => setEvRollbackAction("archivado")}
                      className="accent-amber-500"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Archivar</p>
                      <p className="text-[11px] text-muted-foreground">Se guardará como versión obsoleta</p>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">archivado</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    evRollbackAction === "keep" ? "border-green-500 bg-green-50" : "border-border hover:border-green-400/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="ev-rollback-action" value="keep"
                      checked={evRollbackAction === "keep"}
                      onChange={() => setEvRollbackAction("keep")}
                      className="accent-green-600"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Mantener activa también</p>
                      <p className="text-[11px] text-muted-foreground">Ambas versiones quedarán activas simultáneamente</p>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">activo</span>
                  </label>
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <RotateCcw className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                <strong>v{evRollbackModal.targetVersion}</strong> quedará como la versión activa del evento.
                {evRollbackModal.activeId && evRollbackAction !== "keep" && (
                  <> La v{evRollbackModal.activeVersion} quedará como <em>{evRollbackAction}</em>.</>
                )}
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEvRollbackModal(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  const targetIdx = allDefiniciones.findIndex(d => d.id === evRollbackModal.targetId);
                  if (targetIdx !== -1) updDef(targetIdx, "estado", "activo");
                  if (evRollbackModal.activeId && evRollbackAction !== "keep") {
                    const activeIdx = allDefiniciones.findIndex(d => d.id === evRollbackModal.activeId);
                    if (activeIdx !== -1) updDef(activeIdx, "estado", evRollbackAction);
                  }
                  setEvRollbackModal(null);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Confirmar reversión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: confirmar eliminación de definición ----------------------- */}
      {confirmDelId && (() => {
        const defToDelete = definiciones.find(d => d.id === confirmDelId);
        const camposCount = parametros.filter(p => p.definicion_id === confirmDelId).length;
        const datosCount  = datos.filter(d => d.definicion_id === confirmDelId).length;
        return (
          <Dialog open onOpenChange={() => setConfirmDelId(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Eliminar definición
                </DialogTitle>
                <DialogDescription className="pt-1">
                  Esta acción es <strong>irreversible</strong>. Se eliminará la definición junto con todos sus campos configurados
                  {datosCount > 0 ? ` y ${datosCount} registro${datosCount !== 1 ? "s" : ""} de datos` : ""}.
                </DialogDescription>
              </DialogHeader>
              <div className="my-1 px-3 py-2.5 rounded-lg bg-muted/50 border border-border space-y-0.5">
                <p className="text-sm font-semibold truncate">{defToDelete?.nombre || "(sin nombre)"}</p>
                <p className="text-xs text-muted-foreground">
                  v{defToDelete?.version || "1.0"} - {camposCount} campo{camposCount !== 1 ? "s" : ""}
                  {datosCount > 0 && <span className="text-destructive font-medium"> - {datosCount} datos</span>}
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setConfirmDelId(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const idx = definiciones.findIndex(d => d.id === confirmDelId);
                    if (idx !== -1) delDef(idx);
                    setConfirmDelId(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* -- Modal: confirmar nueva versión ---------------------------------- */}
      {confirmDup && (
        <Dialog open onOpenChange={() => setConfirmDup(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary" />
                Crear nueva versión?
              </DialogTitle>
              <DialogDescription>
                Se creará <strong>v{confirmDup.newVersion}</strong> a partir de &ldquo;{confirmDup.sourceName}&rdquo; (v{confirmDup.sourceVersion}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nombre del formulario</label>
              <Input
                value={confirmDup.newName}
                onChange={e => setConfirmDup(prev => prev ? { ...prev, newName: e.target.value } : prev)}
                placeholder="Nombre del nuevo formulario?"
                className="h-8 text-sm"
                autoFocus
              />
            </div>

            <div className="bg-muted/40 border border-border rounded-lg px-3 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Versión anterior</span>
                <span className="font-mono text-muted-foreground line-through">v{confirmDup.sourceVersion}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Nueva versión</span>
                <span className="font-mono font-bold text-primary">v{confirmDup.newVersion}</span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Campos copiados</span>
                <span className="font-semibold text-foreground">
                  {confirmDup.paramCount} campo{confirmDup.paramCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estado inicial</span>
                <span className="font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full text-[10px]">
                  borrador
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Podrás editar los campos de la nueva versión de forma independiente sin afectar la versión anterior.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmDup(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  dupDef(confirmDup.sourceId, confirmDup.newName.trim() || undefined);
                  setConfirmDup(null);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Crear v{confirmDup.newVersion}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Diálogo: comparar versiones ------------------------------------- */}
      {compareRootId && (
        <VersionDiffDialog
          rootId={compareRootId}
          open={!!compareRootId}
          onClose={() => setCompareRootId(null)}
        />
      )}

      {/* -- Modal: Confirmar archivado -------------------------------------- */}
      {archiveModal && (
        <Dialog open onOpenChange={() => setArchiveModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                Archivar versión
              </DialogTitle>
              <DialogDescription>
                La versión <strong>v{archiveModal.version}</strong> de &ldquo;{archiveModal.nombre}&rdquo; quedará archivada y no podrá usarse en nuevos registros.
              </DialogDescription>
            </DialogHeader>

            {archiveModal.otherVersions.length > 0 ? (
              <div className="space-y-3 py-1">
                <p className="text-sm font-medium text-foreground">¿Qué versión activar tras archivar?</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {/* Opción: no activar ninguna */}
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    archiveActivateId === "" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="archive-activate" value=""
                      checked={archiveActivateId === ""}
                      onChange={() => setArchiveActivateId("")}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">No activar ninguna</p>
                      <p className="text-[11px] text-muted-foreground/70">Las demás versiones conservan su estado actual</p>
                    </div>
                  </label>
                  {archiveModal.otherVersions.map(ov => (
                    <label key={ov.id} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      archiveActivateId === ov.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}>
                      <input
                        type="radio" name="archive-activate" value={ov.id}
                        checked={archiveActivateId === ov.id}
                        onChange={() => setArchiveActivateId(ov.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{ov.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-muted-foreground">v{ov.version || "1.0"}</span>
                          <span className={cn(
                            "text-[9px] px-1 py-0.5 rounded-full font-medium",
                            estadoBadge[ov.estado ?? "borrador"],
                          )}>
                            {ov.estado}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                No hay otras versiones disponibles para activar. El formulario quedará sin versión activa.
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setArchiveModal(null)}>Cancelar</Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  const archiveIdx = definiciones.findIndex(d => d.id === archiveModal.defId);
                  if (archiveIdx !== -1) updDef(archiveIdx, "estado", "archivado");
                  if (archiveActivateId) {
                    const activateIdx = definiciones.findIndex(d => d.id === archiveActivateId);
                    if (activateIdx !== -1) updDef(activateIdx, "estado", "activo");
                  }
                  setArchiveModal(null);
                }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archivar{archiveActivateId ? " y activar seleccionada" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: Rollback / Activar versión anterior ---------------------- */}
      {rollbackModal && (
        <Dialog open onOpenChange={() => setRollbackModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Revertir a v{rollbackModal.targetVersion}
              </DialogTitle>
              <DialogDescription>
                Activarás <strong>&ldquo;{rollbackModal.targetNombre}&rdquo; v{rollbackModal.targetVersion}</strong>.
                {rollbackModal.activeId && (
                  <> ¿Qué hacemos con la versión actualmente activa (<strong>v{rollbackModal.activeVersion}</strong>)?</>
                )}
              </DialogDescription>
            </DialogHeader>

            {rollbackModal.activeId && (
              <div className="space-y-2 py-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide text-muted-foreground">
                  v{rollbackModal.activeVersion} - {rollbackModal.activeNombre}
                </p>
                <div className="space-y-1.5">
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    rollbackAction === "borrador" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="rollback-action" value="borrador"
                      checked={rollbackAction === "borrador"}
                      onChange={() => setRollbackAction("borrador")}
                      className="accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Pasar a borrador</p>
                      <p className="text-[11px] text-muted-foreground">Se puede volver a activar en el futuro</p>
                    </div>
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">borrador</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    rollbackAction === "archivado" ? "border-amber-500 bg-amber-50" : "border-border hover:border-amber-400/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="rollback-action" value="archivado"
                      checked={rollbackAction === "archivado"}
                      onChange={() => setRollbackAction("archivado")}
                      className="accent-amber-500"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Archivar</p>
                      <p className="text-[11px] text-muted-foreground">Se guardará como versión obsoleta</p>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">archivado</span>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                    rollbackAction === "keep" ? "border-green-500 bg-green-50" : "border-border hover:border-green-400/40 hover:bg-muted/40",
                  )}>
                    <input
                      type="radio" name="rollback-action" value="keep"
                      checked={rollbackAction === "keep"}
                      onChange={() => setRollbackAction("keep")}
                      className="accent-green-600"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Mantener activa también</p>
                      <p className="text-[11px] text-muted-foreground">Ambas versiones quedarán activas simultáneamente</p>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">activo</span>
                  </label>
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <RotateCcw className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                <strong>v{rollbackModal.targetVersion}</strong> quedará como la versión activa del formulario.
                {rollbackModal.activeId && rollbackAction !== "keep" && (
                  <> La v{rollbackModal.activeVersion} quedará como <em>{rollbackAction}</em>.</>
                )}
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRollbackModal(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  // Activate target version
                  const targetIdx = definiciones.findIndex(d => d.id === rollbackModal.targetId);
                  if (targetIdx !== -1) updDef(targetIdx, "estado", "activo");
                  // Handle currently active version
                  if (rollbackModal.activeId && rollbackAction !== "keep") {
                    const activeIdx = definiciones.findIndex(d => d.id === rollbackModal.activeId);
                    if (activeIdx !== -1) updDef(activeIdx, "estado", rollbackAction);
                  }
                  setRollbackModal(null);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Confirmar reversion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* -- Modal: Selector desde Biblioteca ------------------------------- */}
      <Dialog
        open={!!addCampoModal}
        onOpenChange={open => { if (!open) { setAddCampoModal(null); setCampoTypeFilter("Todos"); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
              Agregar campos al formulario
            </DialogTitle>
            <DialogDescription>
              Selecciona parámetros de la biblioteca global para agregarlos al formulario.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>
              ¿No encuentras el parámetro? Créalo primero en Biblioteca.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={openBibliotecaFlow}>
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              Biblioteca
            </Button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={campoSearch}
              onChange={e => setCampoSearch(e.target.value)}
              placeholder="Buscar por nombre, código o descripción?"
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
            />
            {campoSearch && (
              <button onClick={() => setCampoSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros por tipo */}
          <div className="flex items-center gap-1.5 flex-wrap -mt-1">
            {["Todos", "Texto", "Número", "Fecha", "Sí/No", "Lista", "Relación"].map(t => {
              const meta = TIPO_META[t];
              const TIcon = meta?.icon;
              const isActive = campoTypeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setCampoTypeFilter(t)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                    isActive
                      ? t === "Todos"
                        ? "bg-primary text-primary-foreground border-primary"
                        : cn(meta?.bg, meta?.color, "border-transparent")
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60",
                  )}
                >
                  {TIcon && <TIcon className="w-2.5 h-2.5" />}
                  {t}
                </button>
              );
            })}
          </div>

          {/* Lista de parámetros de la biblioteca */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
            {(() => {
              const defId = addCampoModal?.defId ?? "";
              const existingNames = new Set(parametros.filter(p => p.definicion_id === defId).map(p => p.nombre));
              const filtered = parametrosLib.filter(p =>
                p.activo !== false &&
                (campoTypeFilter === "Todos" || p.tipo_dato === campoTypeFilter) &&
                (!campoSearch ||
                  p.nombre.toLowerCase().includes(campoSearch.toLowerCase()) ||
                  p.descripcion?.toLowerCase().includes(campoSearch.toLowerCase()) ||
                  p.codigo?.toLowerCase().includes(campoSearch.toLowerCase()))
              );
              if (filtered.length === 0) {
                return (
                  <div className="py-10 text-center space-y-1">
                    <BookOpen className="w-6 h-6 mx-auto text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">
                      {campoSearch ? `Sin resultados para "${campoSearch}"` : "No hay parámetros de este tipo."}
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={openBibliotecaFlow}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Crear parámetro en Biblioteca
                    </Button>
                  </div>
                );
              }
              return filtered.map(lib => {
                const meta = TIPO_META[lib.tipo_dato] ?? TIPO_META["Texto"];
                const TIcon = meta.icon;
                const alreadyIn = existingNames.has(lib.nombre);
                const selected  = selectedLibIds.has(lib.id);
                return (
                  <label
                    key={lib.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      alreadyIn
                        ? "opacity-50 cursor-not-allowed bg-muted/20"
                        : selected
                          ? "bg-primary/8 hover:bg-primary/10"
                          : "hover:bg-muted/40",
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      disabled={alreadyIn}
                      checked={selected}
                      onChange={e => {
                        setSelectedLibIds(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(lib.id) : next.delete(lib.id);
                          return next;
                        });
                      }}
                      className="shrink-0 accent-primary"
                    />
                    {/* Tipo icon */}
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", meta.bg)}>
                      <TIcon className={cn("w-3.5 h-3.5", meta.color)} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {lib.nombre.replace(/_/g, " ")}
                        </span>
                        {lib.codigo && (
                          <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                            {lib.codigo}
                          </span>
                        )}
                        {lib.unidad_medida && (
                          <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                            {lib.unidad_medida}
                          </span>
                        )}
                        {alreadyIn && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                            ya existe
                          </span>
                        )}
                      </div>
                      {lib.descripcion && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{lib.descripcion}</p>
                      )}
                    </div>
                    {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </label>
                );
              });
            })()}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button variant="outline" onClick={() => setAddCampoModal(null)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedLibIds.size === 0}
              onClick={() => {
                if (!addCampoModal) return;
                const { defId } = addCampoModal;
                // Agregar campos seleccionados de la biblioteca
                selectedLibIds.forEach(libId => {
                  const lib = parametrosLib.find(p => p.id === libId);
                  if (lib) addPar(defId, lib.id, lib.nombre);
                });
                setAddCampoModal(null);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {selectedLibIds.size === 0
                ? "Agregar"
                : selectedLibIds.size === 1
                  ? "Agregar 1 campo"
                  : `Agregar ${selectedLibIds.size} campos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Drawer: configuración avanzada del campo ------------------------ */}
      <CampoConfigDrawer
        open={!!configCampoId}
        campo={configCampoId ? parametros.find(p => p.id === configCampoId) ?? null : null}
        hermanos={configCampoId
          ? parametros.filter(p => p.definicion_id === (parametros.find(x => x.id === configCampoId)?.definicion_id ?? ""))
          : []}
        onSave={(id, updates) => updParFull(id, updates)}
        onClose={() => setConfigCampoId(null)}
      />

      {/* -- Dialog: Gestión masiva de accesos de usuario por formulario ------- */}
      {(() => {
        const selectedDef = accesosModal ? definiciones.find(d => d.id === accesosModal) : null;
        if (!selectedDef) return null;

        const allAccesos = getDefAccesos(selectedDef.id);
        const accMap     = new Map(allAccesos.map(a => [a.usuario_id, a]));

        // Filtrar y buscar usuarios
        const displayedUsers = allUsers.filter(u => {
          const matchesSearch = !accSearch || u.nombre.toLowerCase().includes(accSearch.toLowerCase());
          if (!matchesSearch) return false;
          if (accFilter === "todos")        return true;
          const acc = accMap.get(u.id);
          if (accFilter === "permitidos")   return acc?.habilitado === true;
          if (accFilter === "bloqueados")   return acc?.habilitado === false;
          if (accFilter === "por_rol")      return !acc;
          return true;
        });

        const nAllow  = allAccesos.filter(a => a.habilitado).length;
        const nBlock  = allAccesos.filter(a => !a.habilitado).length;
        const nRol    = allUsers.length - allAccesos.length;

        const allPageSelected = displayedUsers.length > 0 &&
          displayedUsers.every(u => accSelected.has(u.id));

        const toggleUser = (id: number) =>
          setAccSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
          });

        const toggleAll = () =>
          setAccSelected(prev =>
            allPageSelected
              ? new Set([...prev].filter(id => !displayedUsers.find(u => u.id === id)))
              : new Set([...prev, ...displayedUsers.map(u => u.id)])
          );

        const bulkAllow = () => {
          accSelected.forEach(uid => {
            const existing = accMap.get(uid);
            if (existing) removeDefAcceso(existing.id);
            addDefAcceso({ definicion_id: selectedDef.id, usuario_id: uid, habilitado: true,
              justificacion: "Acceso concedido masivamente desde gestión de formularios" });
          });
          setAccSelected(new Set());
        };

        const bulkBlock = () => {
          accSelected.forEach(uid => {
            const existing = accMap.get(uid);
            if (existing) removeDefAcceso(existing.id);
            addDefAcceso({ definicion_id: selectedDef.id, usuario_id: uid, habilitado: false,
              justificacion: "Acceso bloqueado masivamente desde gestión de formularios" });
          });
          setAccSelected(new Set());
        };

        const bulkClear = () => {
          accSelected.forEach(uid => {
            const existing = accMap.get(uid);
            if (existing) removeDefAcceso(existing.id);
          });
          setAccSelected(new Set());
        };

        const FILTERS = [
          { key: "todos",      label: "Todos",        count: allUsers.length },
          { key: "permitidos", label: "Permitidos",   count: nAllow  },
          { key: "bloqueados", label: "Bloqueados",   count: nBlock  },
          { key: "por_rol",    label: "Por rol",      count: nRol    },
        ] as const;

        return (
          <Dialog open onOpenChange={() => { setAccesosModal(null); setAccSelected(new Set()); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
              {/* Header */}
              <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Users2 className="w-4 h-4 text-primary" />
                  Acceso de usuarios
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  <span className="font-medium text-foreground">{selectedDef.nombre}</span>
                  {" - "}
                  <span className="text-success font-medium">{nAllow} permitidos</span>
                  {" - "}
                  <span className="text-destructive font-medium">{nBlock} bloqueados</span>
                  {" - "}
                  <span className="text-muted-foreground">{nRol} por rol</span>
                </DialogDescription>
              </DialogHeader>

              {/* Search + filter bar */}
              <div className="px-4 py-2.5 border-b border-border space-y-2 shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    value={accSearch}
                    onChange={e => setAccSearch(e.target.value)}
                    placeholder="Buscar usuario?"
                    className="w-full pl-8 pr-7 py-1.5 text-[12px] rounded-md bg-muted/40 border border-border focus:border-primary/50 focus:outline-none transition-colors"
                  />
                  {accSearch && (
                    <button onClick={() => setAccSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setAccFilter(f.key); setAccSelected(new Set()); }}
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                        accFilter === f.key
                          ? f.key === "permitidos" ? "bg-success/15 text-success border-success/30"
                            : f.key === "bloqueados" ? "bg-destructive/15 text-destructive border-destructive/25"
                            : "bg-primary/10 text-primary border-primary/20"
                          : "bg-transparent text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      {f.label}
                      {f.count > 0 && (
                        <span className="bg-current/15 rounded-full px-1 text-[9px] font-bold">{f.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk action bar ? visible when users are selected */}
              {accSelected.size > 0 && (
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/15 flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-primary flex-1">
                    {accSelected.size} usuario{accSelected.size !== 1 ? "s" : ""} seleccionado{accSelected.size !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={bulkAllow}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-success text-white hover:bg-success/80 transition-colors flex items-center gap-1"
                  >
                    Permitir
                  </button>
                  <button
                    onClick={bulkBlock}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-destructive text-white hover:bg-destructive/80 transition-colors flex items-center gap-1"
                  >
                    Bloquear
                  </button>
                  <button
                    onClick={bulkClear}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    Por rol
                  </button>
                </div>
              )}

              {/* User list */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Select all row */}
                <div className="sticky top-0 bg-muted/30 backdrop-blur-sm border-b border-border px-4 py-1.5 flex items-center gap-2.5 z-10">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allPageSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>{allPageSelected ? "Deseleccionar" : "Seleccionar"} {displayedUsers.length} mostrados</span>
                  </button>
                </div>

                {displayedUsers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">Sin resultados</p>
                  </div>
                ) : (
                  displayedUsers.map((user, ui) => {
                    const acceso = accMap.get(user.id);
                    const hasOverride = !!acceso;
                    const avatarColor = avatarColors[ui % avatarColors.length];
                    const roleName = roleNameMap[user.role as UserRoleT] ?? user.role;
                    const rolCfg   = rolConfig[roleName];
                    const isChecked = accSelected.has(user.id);

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer",
                          isChecked && "bg-primary/5",
                        )}
                        onClick={() => toggleUser(user.id)}
                      >
                        {/* Checkbox */}
                        <div className="shrink-0">
                          {isChecked
                            ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                            : <Square className="w-3.5 h-3.5 text-muted-foreground/50" />
                          }
                        </div>

                        {/* Avatar */}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          avatarColor,
                        )}>
                          {initials(user.nombre)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{user.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {rolCfg && (
                              <span className={cn("text-[9px] font-medium px-1.5 py-0 rounded-full", rolCfg.color)}>
                                {roleName}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground truncate">{user.empresa}</span>
                          </div>
                        </div>

                        {/* Status + action (solo si no hay selección activa) */}
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Status badge */}
                          <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
                            hasOverride
                              ? acceso!.habilitado
                                ? "bg-success/10 text-success border-success/25"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-muted/60 text-muted-foreground border-border",
                          )}>
                              {hasOverride ? (acceso!.habilitado ? "Permitido" : "Bloqueado") : "Por rol"}
                          </span>

                          {/* Quick actions */}
                          {accSelected.size === 0 && (hasOverride ? (
                            <button
                              title="Quitar ajuste - volver a reglas de rol"
                              onClick={() => removeDefAcceso(acceso!.id)}
                              className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                              rol
                            </button>
                          ) : (
                            <div className="flex gap-0.5">
                              <button
                                title="Permitir acceso"
                                onClick={() => addDefAcceso({ definicion_id: selectedDef.id, usuario_id: user.id, habilitado: true, justificacion: "Acceso concedido desde gestión de formularios" })}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-success/30 text-success hover:bg-success/10 transition-colors font-medium"
                              >Permitir</button>
                              <button
                                title="Bloquear acceso"
                                onClick={() => addDefAcceso({ definicion_id: selectedDef.id, usuario_id: user.id, habilitado: false, justificacion: "Acceso bloqueado desde gestión de formularios" })}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-medium"
                              >Bloquear</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0 bg-muted/20">
                <p className="text-[10px] text-muted-foreground">
                  {allUsers.length} usuarios &middot; {allAccesos.length} con ajuste personalizado
                </p>
                {allAccesos.length > 0 && (
                  <button
                    onClick={() => allAccesos.forEach(a => removeDefAcceso(a.id))}
                    className="text-[10px] text-destructive hover:text-destructive/70 transition-colors"
                  >
                    Limpiar todos los ajustes
                  </button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* -- Sheet: Biblioteca de Parámetros -------------------------------- */}
      <Sheet open={showBiblioteca} onOpenChange={setShowBiblioteca}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Biblioteca de Parámetros
            </SheetTitle>
            <SheetDescription>
              Catálogo global de campos reutilizables en cualquier formulario.
            </SheetDescription>
          </SheetHeader>
          <TabBiblioteca onPendingChange={onPendingChange} />
        </SheetContent>
      </Sheet>

      {/* -- Dialog: Copiar formularios desde otra empresa -------------------- */}
      <Dialog open={showCopyDialog} onOpenChange={open => {
        if (!open) { setCopySourceClienteId(null); setCopySelectedDefs(new Set()); }
        setShowCopyDialog(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Copiar formularios desde otra empresa
            </DialogTitle>
            <DialogDescription>
              Selecciona la empresa de origen y los formularios a copiar.
              Se crearán como borradores en <strong>{clientes.find(c => c.id === selectedClienteFilter)?.nombre ?? "la empresa"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Empresa de origen</Label>
              <select
                value={copySourceClienteId ?? ""}
                onChange={e => {
                  setCopySourceClienteId(e.target.value ? Number(e.target.value) : null);
                  setCopySelectedDefs(new Set());
                }}
                className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background focus:border-primary/50 focus:outline-none"
              >
                <option value="">Seleccionar empresa...</option>
                {clientes.filter(c => c.id !== selectedClienteFilter).map(c => {
                  const formCount = allDefiniciones.filter(d => d.cliente_id === c.id && !d.registro_padre_id).length;
                  return (
                    <option key={c.id} value={c.id}>{c.nombre} ({formCount} formularios)</option>
                  );
                })}
              </select>
            </div>

            {copySourceClienteId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Formularios a copiar</Label>
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y divide-border/50">
                  {allDefiniciones
                    .filter(d => d.cliente_id === copySourceClienteId && !d.registro_padre_id)
                    .map(def => (
                      <label key={def.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={copySelectedDefs.has(def.id)}
                          onChange={e => {
                            setCopySelectedDefs(prev => {
                              const next = new Set(prev);
                              e.target.checked ? next.add(def.id) : next.delete(def.id);
                              return next;
                            });
                          }}
                          className="rounded accent-primary"
                        />
                        <span className="text-sm flex-1 truncate">{def.nombre || "(sin nombre)"}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                          {MODULO_OPTIONS.find(m => m.value === def.modulo)?.label ?? def.modulo}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", estadoBadge[def.estado ?? "borrador"])}>
                          {def.estado}
                        </span>
                      </label>
                    ))
                  }
                  {allDefiniciones.filter(d => d.cliente_id === copySourceClienteId && !d.registro_padre_id).length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                      Esta empresa no tiene formularios.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>Cancelar</Button>
            <Button
              disabled={copySelectedDefs.size === 0 || !selectedClienteFilter}
              onClick={() => {
                if (!selectedClienteFilter) return;
                copySelectedDefs.forEach(defId => copyDefToClient(defId, selectedClienteFilter));
                setShowCopyDialog(false);
                setCopySourceClienteId(null);
                setCopySelectedDefs(new Set());
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar {copySelectedDefs.size} formulario{copySelectedDefs.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Hub de Cultivos ----------------------------------------------------------

function TabCultivos() {
  const {
    cultivos, allCultivos, addCultivo, updCultivo, delCultivo,
    variedades, addVariedad, updVariedad, delVariedad,
  } = useConfig();
  const navigate = useNavigate();
  const { role, empresaCtxId, clientes } = useRole();
  const isSuperAdmin = role === "super_admin";
  // cliente_admin y productor también pueden editar calibres, estructura, medidas y mapa del cultivo
  const canEditCultivo = isSuperAdmin || role === "cliente_admin" || role === "productor";

  // super_admin ve todos; si tiene empresa filtrada, filtra por clientes_ids
  const cultivosBase = isSuperAdmin ? allCultivos : cultivos;
  const cultivosList = isSuperAdmin && empresaCtxId
    ? cultivosBase.filter(c => !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(empresaCtxId))
    : cultivosBase;
  const empresaCtxNombre = isSuperAdmin && empresaCtxId
    ? clientes.find(c => c.id === empresaCtxId)?.nombre ?? null
    : null;

  const firstActive = cultivosList.find(c => c.activo)?.id ?? cultivosList[0]?.id ?? "";
  const [selectedId,     setSelectedId]     = useState<string>(firstActive);
  const [searchCultivo,  setSearchCultivo]  = useState("");
  const [showAddCultivo, setShowAddCultivo] = useState(false);
  const [newCultivoForm, setNewCultivoForm] = useState({ nombre: "", codigo: "", descripcion: "" });
  const prevCultivoLen = useRef(cultivosList.length);

  // Inline "add variedad" form
  const [addingVar, setAddingVar] = useState(false);
  const [newVar,    setNewVar]    = useState({ nombre: "", codigo: "" });

  // Auto-seleccionar el cultivo recién creado
  useEffect(() => {
    if (cultivosList.length > prevCultivoLen.current) {
      setSelectedId(cultivosList[cultivosList.length - 1].id);
    }
    prevCultivoLen.current = cultivosList.length;
  }, [cultivosList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateCultivo = () => {
    if (!newCultivoForm.nombre.trim()) return;
    addCultivo({
      nombre:      newCultivoForm.nombre.trim(),
      codigo:      newCultivoForm.codigo.trim().toUpperCase(),
      descripcion: newCultivoForm.descripcion.trim(),
    });
    setNewCultivoForm({ nombre: "", codigo: "", descripcion: "" });
    setShowAddCultivo(false);
  };

  const handleAddVar = () => {
    if (!newVar.nombre.trim()) return;
    const id = `v-${Date.now()}`;
    addVariedad(selectedId);
    // updVariedad needs the id ? use a short timeout to let state propagate
    setTimeout(() => {
      const latest = variedades.slice(-1)[0];
      if (latest) {
        updVariedad(latest.id, "nombre", newVar.nombre.trim());
        if (newVar.codigo) updVariedad(latest.id, "codigo", newVar.codigo.trim().toUpperCase());
      }
    }, 0);
    setNewVar({ nombre: "", codigo: "" });
    setAddingVar(false);
  };

  const cultivo      = cultivosList.find(c => c.id === selectedId);
  const cultivoVars  = variedades.filter(v => v.cultivo_id === selectedId);

  // Tab interno para simplificar la UI de configuración
  const [cultivoTab, setCultivoTab] = useState<"general" | "medidas" | "calibres" | "estructura">("general");
  const [showEstructuraPanel, setShowEstructuraPanel] = useState(true);

  const filteredCultivos = cultivosList.filter(c =>
    !searchCultivo || c.nombre.toLowerCase().includes(searchCultivo.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchCultivo.toLowerCase())
  );

  return (
    <>
    <div className="space-y-4">
      <InfoBanner storageKey="cultivos">
        <strong>Cultivos</strong> &middot; gestiona cultivos activos, sus variedades y qué formularios aplican sólo a ese cultivo o a todos.
      </InfoBanner>

      {/* -- Banner empresa filtrada (super_admin) ----------------------- */}
      {empresaCtxNombre && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 text-xs">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>Mostrando cultivos de <strong>{empresaCtxNombre}</strong></span>
        </div>
      )}

      {/* -- Layout master / detail --------------------------------------- */}
      <div className={cn(
        "grid grid-cols-1 gap-4 items-start",
        cultivoTab === "estructura"
          ? "lg:grid-cols-[210px_minmax(0,1fr)]"
          : "lg:grid-cols-[260px_1fr]",
      )}>

        {/* ----------------- SIDEBAR: lista de cultivos ---------------- */}
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">

          {/* Sidebar header */}
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm text-foreground flex-1">Cultivos</span>
            {isSuperAdmin && (
              <button
                onClick={() => setShowAddCultivo(true)}
                className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Agregar cultivo"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input
                value={searchCultivo}
                onChange={e => setSearchCultivo(e.target.value)}
                placeholder="Buscar cultivo?"
                className="w-full pl-7 pr-5 py-1 text-[11px] rounded-md bg-muted/40 border border-transparent focus:border-primary/50 focus:bg-background focus:outline-none transition-colors"
              />
              {searchCultivo && (
                <button onClick={() => setSearchCultivo("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Cultivo list */}
          <div className="divide-y divide-border">
            {filteredCultivos.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground italic">Sin resultados</p>
            ) : (
              filteredCultivos.map(c => {
                const vCount  = variedades.filter(v => v.cultivo_id === c.id).length;
                const isSelected = selectedId === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
                      isSelected
                        ? "bg-primary/8 border-l-2 border-l-primary"
                        : "hover:bg-muted/40 border-l-2 border-l-transparent",
                      !c.activo && "opacity-50",
                    )}
                  >
                    {/* Color dot */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      c.activo ? "bg-success" : "bg-muted-foreground/40",
                    )} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[12px] font-semibold truncate",
                          isSelected ? "text-primary" : "text-foreground",
                        )}>
                          {c.nombre || <span className="italic text-muted-foreground">sin nombre</span>}
                        </span>
                        {c.codigo && (
                          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded shrink-0">
                            {c.codigo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{vCount} variedad{vCount !== 1 ? "es" : ""}</span>
                        {!c.activo && <span className="text-amber-600 font-medium">inactivo</span>}
                      </div>
                    </div>

                    {isSelected && (
                      <ChevronDown className="w-3 h-3 text-primary shrink-0 -rotate-90" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* No cultivos empty state */}
          {cultivosList.length === 0 && (
            <div className="px-4 py-8 text-center space-y-2">
              <Leaf className="w-8 h-8 mx-auto text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "Crea el primer cultivo." : "Sin cultivos asignados."}
              </p>
            </div>
          )}
        </div>

        {/* ----------------- DETALLE: cultivo seleccionado ------------- */}
        {!cultivo ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
            <Leaf className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Selecciona un cultivo para ver su detalle</p>
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            {/* -- Header del cultivo con tabs -------------------------------- */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-primary" />
                  {cultivo.nombre || "Cultivo"}
                  {cultivo.codigo && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {cultivo.codigo}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <>
                      <span className="text-[10px] text-muted-foreground">Activo</span>
                      <Switch
                        checked={!!cultivo.activo}
                        onCheckedChange={v => updCultivo(cultivo.id, "activo", v)}
                        className="scale-75"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Tabs internos simplificados */}
              <Tabs value={cultivoTab} onValueChange={(v: any) => setCultivoTab(v)} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-10 px-4">
                  <TabsTrigger value="general" className="text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="medidas" className="text-xs">
                    <Ruler className="w-3.5 h-3.5 mr-1.5" />
                    Medidas
                  </TabsTrigger>
                  <TabsTrigger value="calibres" className="text-xs">
                    <Scale className="w-3.5 h-3.5 mr-1.5" />
                    Calibres
                    {(cultivo.calibres ?? []).length > 0 && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {cultivo.calibres.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="estructura" className="text-xs">
                    <Network className="w-3.5 h-3.5 mr-1.5" />
                    Estructura
                    {(cultivo.estructura ?? []).filter(e => e.activo).length > 0 && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full bg-sky-100 text-sky-700">
                        {cultivo.estructura.filter(e => e.activo).length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* TAB: General */}
                <TabsContent value="general" className="p-4 space-y-4 m-0">
                  {/* Info básica */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Información básica
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nombre</label>
                  <Input
                    value={cultivo.nombre}
                    onChange={e => updCultivo(cultivo.id, "nombre", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="ej. Fresas"
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Código</label>
                  <Input
                    value={cultivo.codigo}
                    onChange={e => updCultivo(cultivo.id, "codigo", e.target.value.toUpperCase())}
                    className="h-8 text-sm font-mono"
                    placeholder="FRE"
                    maxLength={6}
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descripción</label>
                  <Input
                    value={cultivo.descripcion}
                    onChange={e => updCultivo(cultivo.id, "descripcion", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Especie, variedad?"
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
              </div>
            </div>

            {/* -- Sección 2: Variedades ---------------------------------- */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <SproutIcon className="w-4 h-4 text-emerald-600" />
                  Variedades
                  <span className="text-[11px] font-normal text-muted-foreground">({cultivoVars.length})</span>
                </h3>
                {isSuperAdmin && !addingVar && (
                  <button
                    onClick={() => setAddingVar(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/70 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                )}
              </div>

              <div className="px-4 py-3">
                {/* Chips de variedades */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {cultivoVars.length === 0 && !addingVar && (
                    <p className="text-xs text-muted-foreground italic">Sin variedades registradas. Agrega la primera.</p>
                  )}
                  {cultivoVars.map((v, idx) => (
                    <div
                      key={v.id}
                      className={cn(
                        "group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        v.activo
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
                          : "bg-muted/30 border-border/50 text-muted-foreground",
                      )}
                    >
                      <span className={cn(!v.activo && "line-through")}>
                        {v.nombre || <span className="italic">sin nombre</span>}
                      </span>
                      {v.codigo && (
                        <span className="text-[9px] font-mono opacity-60">[{v.codigo}]</span>
                      )}
                      {/* Hover actions ? solo super_admin */}
                      {isSuperAdmin && (
                      <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updVariedad(v.id, "activo", !v.activo)}
                          title={v.activo ? "Desactivar" : "Activar"}
                          className="hover:text-foreground transition-colors"
                        >
                          {v.activo
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            : <Clock className="w-3 h-3 text-muted-foreground" />
                          }
                        </button>
                        <button
                          onClick={() => delVariedad(v.id)}
                          title="Eliminar"
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Inline add variety form */}
                {addingVar && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-primary/40 bg-primary/5">
                    <Plus className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <Input
                      autoFocus
                      value={newVar.nombre}
                      onChange={e => setNewVar(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre de la variedad"
                      className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 p-0 flex-1 shadow-none"
                      onKeyDown={e => { if (e.key === "Enter") handleAddVar(); if (e.key === "Escape") setAddingVar(false); }}
                    />
                    <Input
                      value={newVar.codigo}
                      onChange={e => setNewVar(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                      placeholder="Código"
                      className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 p-0 w-16 font-mono shadow-none"
                      maxLength={6}
                      onKeyDown={e => { if (e.key === "Enter") handleAddVar(); if (e.key === "Escape") setAddingVar(false); }}
                    />
                    <button
                      onClick={handleAddVar}
                      disabled={!newVar.nombre.trim()}
                      className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-40 transition-colors font-medium shrink-0"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => { setAddingVar(false); setNewVar({ nombre: "", codigo: "" }); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
                </TabsContent>

                {/* TAB: Medidas */}
                <TabsContent value="medidas" className="p-4 space-y-4 m-0">
            {/* -- Sección 3: Medidas y Unidades ----------------------------- */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  Medidas y Unidades
                </h3>
              </div>
              <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Unidad de superficie */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Unidad de superficie
                  </label>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(["ha", "m2", "acres"] as const).map((opt) => {
                      const labels: Record<string, string> = { ha: "ha", m2: "m2", acres: "acres" };
                      const titles: Record<string, string> = { ha: "Hectáreas", m2: "Metros cuadrados", acres: "Acres" };
                      const active = (cultivo.unidad_superficie ?? "ha") === opt;
                      return (
                        <button
                          key={opt}
                          disabled={!canEditCultivo}
                          onClick={() => updCultivo(cultivo.id, "unidad_superficie", opt)}
                          title={titles[opt]}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium border-r last:border-r-0 border-border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:bg-muted/60",
                            !canEditCultivo && "cursor-default",
                          )}
                        >
                          {labels[opt]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unidad de producción */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Unidad de producción
                  </label>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(["kg", "ton", "cajas"] as const).map((opt) => {
                      const titles: Record<string, string> = { kg: "Kilogramos", ton: "Toneladas", cajas: "Cajas" };
                      const active = (cultivo.unidad_produccion ?? "kg") === opt;
                      return (
                        <button
                          key={opt}
                          disabled={!canEditCultivo}
                          onClick={() => updCultivo(cultivo.id, "unidad_produccion", opt)}
                          title={titles[opt]}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium border-r last:border-r-0 border-border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:bg-muted/60",
                            !canEditCultivo && "cursor-default",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Marco de plantación */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Marco de plantación{" "}
                    <span className="normal-case font-normal text-muted-foreground/70">(plantas por ha, opcional)</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <Input
                      type="number"
                      min={0}
                      placeholder="ej. 40000"
                      value={cultivo.marco_plantacion ?? ""}
                      onChange={e =>
                        updCultivo(cultivo.id, "marco_plantacion", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="h-8 text-sm w-36"
                      readOnly={!canEditCultivo}
                      disabled={!canEditCultivo}
                    />
                    <span className="text-xs text-muted-foreground">pl/ha</span>
                    {!!cultivo.marco_plantacion && cultivo.marco_plantacion > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
                        ~ {(cultivo.marco_plantacion / 10000).toFixed(2)} pl/m2
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
                </TabsContent>

                {/* TAB: Calibres */}
                <TabsContent value="calibres" className="p-4 space-y-4 m-0">
            {/* -- Sección 4: Calibres ---------------------------------------- */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-600" />
                  Calibres
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({(cultivo.calibres ?? []).length})
                  </span>
                </h3>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {/* mm / cm toggle */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5 border border-border text-[11px]">
                    {(["mm", "cm"] as const).map(unit => (
                      <button
                        key={unit}
                        onClick={() => canEditCultivo && updCultivo(cultivo.id, "unidad_calibre", unit)}
                        disabled={!canEditCultivo}
                        className={cn(
                          "px-2 py-0.5 rounded font-medium transition-colors",
                          (cultivo.unidad_calibre ?? "mm") === unit
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  {canEditCultivo && (
                    <>
                      {(cultivo.calibres ?? []).length === 0 && (
                        <button
                          onClick={() => {
                            const plantilla: Calibre[] = [
                              { id: `cal-${Date.now()}-1`, nombre: "Premium",  mm_min: 28, mm_max: 32, peso_g_min: 18 },
                              { id: `cal-${Date.now()}-2`, nombre: "Extra",    mm_min: 24, mm_max: 28, peso_g_min: 14 },
                              { id: `cal-${Date.now()}-3`, nombre: "Estándar", mm_min: 20, mm_max: 24, peso_g_min: 10 },
                              { id: `cal-${Date.now()}-4`, nombre: "Descarte", mm_min: 0,  mm_max: 20 },
                            ];
                            updCultivo(cultivo.id, "calibres", plantilla);
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-dashed border-border px-2 py-1 rounded-md hover:border-primary/40 transition-colors"
                        >
                          <ListFilter className="w-3.5 h-3.5" /> Cargar plantilla
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const nuevo: Calibre = { id: `cal-${Date.now()}`, nombre: "" };
                          updCultivo(cultivo.id, "calibres", [...(cultivo.calibres ?? []), nuevo]);
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/70 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {(cultivo.calibres ?? []).length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <Scale className="w-7 h-7 mx-auto text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Sin calibres configurados.</p>
                  {canEditCultivo && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Usa "Cargar plantilla" para empezar rápido.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {/* Table header */}
                  {(() => {
                    const u = cultivo.unidad_calibre ?? "mm";
                    return (
                      <div className="grid items-center gap-x-2 px-4 py-2 bg-muted/30 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                        style={{ gridTemplateColumns: "1fr 64px 64px 80px 80px 28px" }}>
                        <span>Nombre</span>
                        <span className="text-center">{u} mín</span>
                        <span className="text-center">{u} máx</span>
                        <span className="text-center">Peso mín (g)</span>
                        <span className="text-center">Peso máx (g)</span>
                        <span />
                      </div>
                    );
                  })()}

                  {/* Table rows */}
                  <div className="divide-y divide-border">
                    {(cultivo.calibres ?? []).map((cal, idx) => {
                      const DOT_COLORS = [
                        "bg-amber-400", "bg-violet-500", "bg-blue-500",
                        "bg-slate-400", "bg-emerald-500", "bg-rose-500",
                        "bg-orange-400", "bg-teal-500",
                      ];
                      const dotColor = DOT_COLORS[idx % DOT_COLORS.length];

                      const updCal = (field: keyof Calibre, val: unknown) => {
                        const updated = (cultivo.calibres ?? []).map(c =>
                          c.id === cal.id ? { ...c, [field]: val } : c
                        );
                        updCultivo(cultivo.id, "calibres", updated);
                      };

                      const delCal = () => {
                        updCultivo(
                          cultivo.id,
                          "calibres",
                          (cultivo.calibres ?? []).filter(c => c.id !== cal.id),
                        );
                      };

                      const numInput = (field: keyof Calibre) => (
                        <input
                          type="number"
                          min={0}
                          value={cal[field] as number ?? ""}
                          onChange={e => updCal(field, e.target.value !== "" ? Number(e.target.value) : undefined)}
                          readOnly={!canEditCultivo}
                          disabled={!canEditCultivo}
                          className="w-full text-xs text-center bg-muted/40 rounded-md px-1.5 py-1.5 border border-transparent focus:border-primary/50 focus:bg-background focus:outline-none disabled:opacity-60 transition-colors"
                        />
                      );

                      return (
                        <div
                          key={cal.id}
                          className="group grid items-center gap-x-2 px-4 py-2 hover:bg-muted/20 transition-colors"
                          style={{ gridTemplateColumns: "1fr 64px 64px 80px 80px 28px" }}
                        >
                          {/* Color dot + nombre */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
                            <input
                              value={cal.nombre}
                              onChange={e => updCal("nombre", e.target.value)}
                              placeholder="ej. Premium"
                              readOnly={!canEditCultivo}
                              disabled={!canEditCultivo}
                              className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none min-w-0 disabled:opacity-60"
                            />
                            {cal.mm_min !== undefined && cal.mm_max !== undefined && (
                              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 hidden xl:block">
                                {cal.mm_min}?{cal.mm_max} {cultivo.unidad_calibre ?? "mm"}
                              </span>
                            )}
                          </div>

                          {numInput("mm_min")}
                          {numInput("mm_max")}
                          {numInput("peso_g_min")}
                          {numInput("peso_g_max")}

                          {/* Delete */}
                          {canEditCultivo ? (
                            <button
                              onClick={delCal}
                              title="Eliminar calibre"
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          ) : <span />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary strip */}
                  <div className="px-4 py-2 bg-muted/10 border-t border-border flex items-center gap-3 flex-wrap">
                    {(cultivo.calibres ?? []).filter(c => c.nombre).map((cal, idx) => {
                      const DOT_COLORS = ["bg-amber-400", "bg-violet-500", "bg-blue-500", "bg-slate-400", "bg-emerald-500", "bg-rose-500", "bg-orange-400", "bg-teal-500"];
                      return (
                        <span key={cal.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className={cn("w-2 h-2 rounded-full", DOT_COLORS[idx % DOT_COLORS.length])} />
                          <span className="font-medium">{cal.nombre}</span>
                          {cal.mm_min !== undefined && cal.mm_max !== undefined && (
                            <span>{cal.mm_min}?{cal.mm_max}{cultivo.unidad_calibre ?? "mm"}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
                </TabsContent>

                {/* TAB: Estructura */}
                <TabsContent value="estructura" className="p-3 md:p-4 m-0">
              <div className="space-y-4 min-w-0">
              {/* -- Sección 5: Estructura de Campo ---------------------------- */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Network className="w-4 h-4 text-sky-600" />
                    Estructura de Campo
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Define los niveles jerárquicos del campo
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEstructuraPanel(v => !v)}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/70 px-2 py-1 rounded-md hover:border-primary/40 transition-colors"
                    title={showEstructuraPanel ? "Ocultar estructura" : "Mostrar estructura"}
                  >
                    {showEstructuraPanel ? "Ocultar" : "Mostrar"}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !showEstructuraPanel && "-rotate-90")} />
                  </button>
                {canEditCultivo && (
                  <div className="flex items-center gap-2">
                    {(cultivo.estructura ?? []).length === 0 && (
                      <button
                        onClick={() => {
                          const plantilla: NivelEstructura[] = [
                            { nivel: 1, label: "Bloque",     abrev: "BL", activo: true  },
                            { nivel: 2, label: "Macrotúnel", abrev: "MT", activo: true  },
                            { nivel: 3, label: "Nave",       abrev: "NV", activo: true  },
                            { nivel: 4, label: "Hilera",     abrev: "HL", activo: false },
                            { nivel: 5, label: "Cuadrante",  abrev: "CU", activo: false },
                          ];
                          updCultivo(cultivo.id, "estructura", plantilla);
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-dashed border-border px-2 py-1 rounded-md hover:border-primary/40 transition-colors"
                      >
                        <ListFilter className="w-3.5 h-3.5" /> Cargar plantilla
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const current = cultivo.estructura ?? [];
                        const nuevoNivel: NivelEstructura = {
                          nivel: current.length + 1,
                          label: "",
                          abrev: "",
                          activo: true,
                        };
                        updCultivo(cultivo.id, "estructura", [...current, nuevoNivel]);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/70 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar nivel
                    </button>
                  </div>
                )}
                </div>
              </div>

              {showEstructuraPanel && ((cultivo.estructura ?? []).length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <Network className="w-7 h-7 mx-auto text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Sin estructura configurada.</p>
                  {canEditCultivo && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Usa "Cargar plantilla" para la jerarquéa estándar.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {/* Level rows */}
                  <div className="divide-y divide-border">
                    {(cultivo.estructura ?? []).map((nivel, idx) => {
                      const niveles = cultivo.estructura ?? [];

                      const updNivel = (field: keyof NivelEstructura, val: unknown) => {
                        const updated = niveles.map(n =>
                          n.nivel === nivel.nivel ? { ...n, [field]: val } : n
                        );
                        updCultivo(cultivo.id, "estructura", updated);
                      };

                      const moveUp = () => {
                        if (idx === 0) return;
                        const reordered = [...niveles];
                        [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
                        updCultivo(cultivo.id, "estructura", reordered.map((n, i) => ({ ...n, nivel: i + 1 })));
                      };

                      const moveDown = () => {
                        if (idx === niveles.length - 1) return;
                        const reordered = [...niveles];
                        [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
                        updCultivo(cultivo.id, "estructura", reordered.map((n, i) => ({ ...n, nivel: i + 1 })));
                      };

                      return (
                        <div
                          key={nivel.nivel}
                          className={cn(
                            "group flex items-center gap-3 px-4 py-2.5 transition-colors",
                            nivel.activo
                              ? "hover:bg-muted/20"
                              : "opacity-50 hover:opacity-70",
                          )}
                        >
                          {/* Toggle activo */}
                          <Switch
                            checked={nivel.activo}
                            onCheckedChange={v => updNivel("activo", v)}
                            disabled={!canEditCultivo}
                            className="scale-75 origin-left shrink-0"
                          />

                          {/* Número de nivel */}
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                              nivel.activo
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {idx + 1}
                          </span>

                          {/* Label editable */}
                          <input
                            value={nivel.label}
                            onChange={e => updNivel("label", e.target.value)}
                            readOnly={!canEditCultivo}
                            disabled={!canEditCultivo}
                            placeholder="Nombre del nivel"
                            className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none disabled:opacity-60 min-w-0"
                          />

                          {/* Abreviatura */}
                          <input
                            value={nivel.abrev}
                            onChange={e => updNivel("abrev", e.target.value.toUpperCase().slice(0, 4))}
                            readOnly={!canEditCultivo}
                            disabled={!canEditCultivo}
                            placeholder="AB"
                            maxLength={4}
                            className="w-10 text-[10px] font-mono text-center bg-muted/40 rounded-md px-1.5 py-1 border border-transparent focus:border-primary/50 focus:bg-background focus:outline-none disabled:opacity-60 uppercase transition-colors"
                          />

                          {/* Reorder + Delete */}
                          {canEditCultivo && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={moveUp}
                                  disabled={idx === 0}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={moveDown}
                                  disabled={idx === (cultivo.estructura ?? []).length - 1}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  const updated = (cultivo.estructura ?? [])
                                    .filter(n => n.nivel !== nivel.nivel)
                                    .map((n, i) => ({ ...n, nivel: i + 1 }));
                                  updCultivo(cultivo.id, "estructura", updated);
                                }}
                                title="Eliminar nivel"
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hierarchy preview */}
                  {(cultivo.estructura ?? []).some(n => n.activo) && (
                    <div className="mx-4 mb-4 mt-3 px-3 py-2.5 rounded-lg bg-sky-50 border border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/40">
                      <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider mb-2">
                        Jerarquéa activa
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(cultivo.estructura ?? [])
                          .filter(n => n.activo)
                          .map((n, i, arr) => (
                            <span key={n.nivel} className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 rounded-md">
                                {n.label}
                              </span>
                              <span className="text-[9px] font-mono text-sky-400 dark:text-sky-600">
                                {n.abrev}
                              </span>
                              {i < arr.length - 1 && (
                                <ChevronRight className="w-3.5 h-3.5 text-sky-400 mx-0.5" />
                              )}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* -- Sección 5: Mapa visual del campo ------------------------------------- */}
            {(cultivo.estructura ?? []).some(n => n.activo) && (
              <div className="rounded-lg border bg-card text-card-foreground overflow-hidden min-w-0">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Mapa del Campo
                    </h3>
                    <span className="text-[10px] text-muted-foreground">
                      Distribución visual de la estructura
                    </span>
                  </div>
                </div>
                <div className="p-2 md:p-2.5 xl:p-3">
                  <CampoMapaEditor
                    key={`mapa-${cultivo.id}`}
                    estructura={cultivo.estructura ?? []}
                    layout={cultivo.layout_mapa ?? []}
                    onLayoutChange={(newLayout) =>
                      updCultivo(cultivo.id, "layout_mapa", newLayout)
                    }
                    readOnly={!canEditCultivo}
                    editorHeight={840}
                  />
                </div>
              </div>
            )}
            </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* -- Modal: crear nuevo cultivo -------------------------------------- */}
      <Dialog open={showAddCultivo} onOpenChange={open => {
        if (!open) { setNewCultivoForm({ nombre: "", codigo: "", descripcion: "" }); }
        setShowAddCultivo(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              Nuevo Cultivo
            </DialogTitle>
            <DialogDescription>
              Completa los datos para registrar el nuevo cultivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newCultivoForm.nombre}
                onChange={e => setNewCultivoForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="ej. Fresas, Tomates, Lechugas?"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleCreateCultivo(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Código</Label>
              <Input
                value={newCultivoForm.codigo}
                onChange={e => setNewCultivoForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="ej. FRE, TOM, LEC"
                maxLength={6}
                onKeyDown={e => { if (e.key === "Enter") handleCreateCultivo(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descripción</Label>
              <Input
                value={newCultivoForm.descripcion}
                onChange={e => setNewCultivoForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Variedad, especie, notas?"
                onKeyDown={e => { if (e.key === "Enter") handleCreateCultivo(); }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddCultivo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCultivo} disabled={!newCultivoForm.nombre.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Cultivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

// --- TabEmpresas --------------------------------------------------------------
// Solo super_admin puede crear/editar/eliminar clientes y productores.
// Un cliente puede tener múltiples productores; los productores no ven datos de otros.

const EMPTY_EMPRESA = { nombre: "", ruc: "", pais: "Chile", direccion: "" };

function TabEmpresas() {
  const { role, clientes, addCliente, updCliente, delCliente,
          productores, addProductor, updProductor, delProductor,
          currentUser, getProductorDashboardModules, setProductorDashboardModules } = useRole();
  const { allCultivos, allVariedades, updCultivoClientes, updCultivoProductores, updVariedadClientes, updVariedadProductores } = useConfig();
  const isSuperAdmin    = role === "super_admin";
  const isClienteAdmin  = role === "cliente_admin";
  const isProductor     = role === "productor";
  const currentClienteId   = currentUser?.clienteId   ?? null;
  const currentProductorId = currentUser?.productorId ?? null;

  const toggleProductorDashboardModulo = (
    productorId: number,
    moduleKey: ProducerDashboardModuleKey,
    enabled: boolean,
  ) => {
    const current = new Set(getProductorDashboardModules(productorId));
    if (enabled) {
      current.add(moduleKey);
    } else {
      if (current.size <= 1) return;
      current.delete(moduleKey);
    }
    setProductorDashboardModules(
      productorId,
      Array.from(current) as ProducerDashboardModuleKey[]
    );
  };

  const renderProductorDashboardModules = (productorId: number, className?: string) => {
    const active = new Set(getProductorDashboardModules(productorId));
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center gap-1.5">
          <LayoutList className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">Módulos del dashboard</span>
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {active.size}/{PRODUCER_DASHBOARD_MODULES.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCER_DASHBOARD_MODULES.map(group => {
            const isEnabled = active.has(group.key);
            const isLastActive = isEnabled && active.size === 1;
            return (
              <button
                key={group.key}
                type="button"
                disabled={isLastActive}
                onClick={() => toggleProductorDashboardModulo(productorId, group.key, !isEnabled)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md border font-medium transition-all",
                  isEnabled
                    ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  isLastActive && "opacity-45 cursor-not-allowed hover:bg-primary/10"
                )}
                title={
                  isLastActive
                    ? "Debe quedar al menos un módulo activo"
                    : (isEnabled ? `Deshabilitar ${group.label}` : `Habilitar ${group.label}`)
                }
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -- Toggle cultivo para un cliente -----------------------------------------
  // clientes_ids vacío = global (todos lo ven). Al desmarcar un global
  // se vuelve explícito para todos los demás clientes.
  const toggleCultivoCliente = (cultivoId: string, clienteId: number, checked: boolean) => {
    const cultivo   = allCultivos.find(c => c.id === cultivoId);
    const currentIds = cultivo?.clientes_ids ?? [];
    if (checked) {
      updCultivoClientes(cultivoId, [...currentIds, clienteId]);
    } else {
      if (currentIds.length === 0) {
        // Era global ? lo hacemos explícito para todos excepto este cliente
        updCultivoClientes(cultivoId, clientes.filter(c => c.id !== clienteId).map(c => c.id));
      } else {
        updCultivoClientes(cultivoId, currentIds.filter(id => id !== clienteId));
      }
    }
  };

  // -- Toggle cultivo para un productor ---------------------------------------
  const toggleCultivoProductor = (cultivoId: string, productorId: number, checked: boolean) => {
    const cultivo    = allCultivos.find(c => c.id === cultivoId);
    const currentIds = cultivo?.productores_ids ?? [];
    if (checked) {
      updCultivoProductores(cultivoId, [...currentIds, productorId]);
    } else {
      if (currentIds.length === 0) {
        updCultivoProductores(cultivoId, productores.filter(p => p.id !== productorId).map(p => p.id));
      } else {
        updCultivoProductores(cultivoId, currentIds.filter(id => id !== productorId));
      }
    }
  };

  // -- Toggle variedad para un cliente -----------------------------------------
  const toggleVariedadCliente = (variedadId: string, clienteId: number, checked: boolean) => {
    const variedad   = allVariedades.find(v => v.id === variedadId);
    const currentIds = variedad?.clientes_ids ?? [];
    if (checked) {
      updVariedadClientes(variedadId, [...currentIds, clienteId]);
    } else {
      if (currentIds.length === 0) {
        updVariedadClientes(variedadId, clientes.filter(c => c.id !== clienteId).map(c => c.id));
      } else {
        updVariedadClientes(variedadId, currentIds.filter(id => id !== clienteId));
      }
    }
  };

  // -- Toggle variedad para un productor --------------------------------------
  const toggleVariedadProductor = (variedadId: string, productorId: number, checked: boolean) => {
    const variedad   = allVariedades.find(v => v.id === variedadId);
    const currentIds = variedad?.productores_ids ?? [];
    if (checked) {
      updVariedadProductores(variedadId, [...currentIds, productorId]);
    } else {
      if (currentIds.length === 0) {
        updVariedadProductores(variedadId, productores.filter(p => p.id !== productorId).map(p => p.id));
      } else {
        updVariedadProductores(variedadId, currentIds.filter(id => id !== productorId));
      }
    }
  };

  // -- Estado de búsqueda y expansión -----------------------------------------
  const [search,              setSearch]              = useState("");
  // No super_admin: auto-expand su única empresa
  const [expandedId,          setExpandedId]          = useState<number | null>(
    () => !isSuperAdmin ? (currentClienteId ?? null) : null,
  );
  const [activeSubTab,        setActiveSubTab]        = useState<"cultivos" | "productores">("productores");

  // -- Estado formularios clientes ---------------------------------------------
  const [showAddCliente,      setShowAddCliente]      = useState(false);
  const [clienteForm,         setClienteForm]         = useState(EMPTY_EMPRESA);
  const [editCliente,         setEditCliente]         = useState<typeof clientes[0] | null>(null);
  const [confirmDelCliente,   setConfirmDelCliente]   = useState<number | null>(null);

  // -- Estado formularios productores -----------------------------------------
  const [showAddProd,         setShowAddProd]         = useState<number | null>(null); // clienteId
  const [prodForm,            setProdForm]            = useState(EMPTY_EMPRESA);
  const [editProductor,       setEditProductor]       = useState<typeof productores[0] | null>(null);
  const [confirmDelProductor, setConfirmDelProductor] = useState<number | null>(null);

  // -- Helpers de validación ---------------------------------------------------
  const validEmpresa = (f: typeof EMPTY_EMPRESA) =>
    f.nombre.trim().length > 0 && f.ruc.trim().length > 0 && f.pais.trim().length > 0;

  // -- CRUD clientes ----------------------------------------------------------
  const handleSaveCliente = () => {
    if (!validEmpresa(clienteForm)) return;
    const payload = { nombre: clienteForm.nombre.trim(), ruc: clienteForm.ruc.trim(), pais: clienteForm.pais.trim(), direccion: clienteForm.direccion?.trim() || undefined };
    if (editCliente) {
      updCliente(editCliente.id, payload);
      setEditCliente(null);
    } else {
      const c = addCliente(payload);
      setExpandedId(c.id);
    }
    setClienteForm(EMPTY_EMPRESA);
    setShowAddCliente(false);
  };

  const handleDeleteCliente = (id: number) => {
    delCliente(id);
    if (expandedId === id) setExpandedId(null);
    setConfirmDelCliente(null);
  };

  // -- CRUD productores -------------------------------------------------------
  const handleSaveProductor = () => {
    if (!validEmpresa(prodForm)) return;
    const payload = { nombre: prodForm.nombre.trim(), ruc: prodForm.ruc.trim(), pais: prodForm.pais.trim(), direccion: prodForm.direccion?.trim() || undefined };
    if (editProductor) {
      updProductor(editProductor.id, payload);
      setEditProductor(null);
    } else if (showAddProd !== null) {
      addProductor({ clienteId: showAddProd, ...payload });
    }
    setProdForm(EMPTY_EMPRESA);
    setShowAddProd(null);
  };

  const handleDeleteProductor = (id: number) => {
    delProductor(id);
    setConfirmDelProductor(null);
  };

  // -- Filtrado ---------------------------------------------------------------
  // No super_admin: solo ven su propia empresa
  const baseClientes = isSuperAdmin
    ? clientes
    : clientes.filter(c => c.id === currentClienteId);

  const filteredClientes = baseClientes.filter(c =>
    !search ||
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc.toLowerCase().includes(search.toLowerCase())
  );

  // -- Vista perfil para cliente_admin y productor -------------------------
  if (!isSuperAdmin) {
    const miCliente = clientes.find(c => c.id === currentClienteId);
    const miProductor = isProductor
      ? productores.find(p => p.id === currentProductorId)
      : null;

    const cultivosCliente = miCliente
      ? allCultivos.filter(c => !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(miCliente.id))
      : [];

    const cultivosProductor = miProductor
      ? cultivosCliente.filter(c => {
          const pIds = c.productores_ids ?? [];
          return pIds.length === 0 || pIds.includes(miProductor.id);
        })
      : cultivosCliente;

    const cultivosMostrar = isProductor ? cultivosProductor : cultivosCliente;
    const productoresCliente = miCliente
      ? productores.filter(p => p.clienteId === miCliente.id)
      : [];

    const entidad = isProductor ? miProductor : miCliente;
    const esProductorCard = isProductor && miProductor;

    return (
      <div className="space-y-5">
        {!entidad ? (
          <div className="rounded-xl border bg-card flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Building2 className="w-10 h-10 opacity-20" />
            <p className="text-sm">No se encontraron datos de empresa.</p>
          </div>
        ) : (
          <>
            {/* -- Header de perfil --------------------------------------- */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* Banner decorativo */}
              <div className="h-16 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />

              <div className="px-6 pb-5">
                {/* Avatar flotando sobre el banner */}
                <div className="-mt-8 mb-3 flex items-end justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-card border-2 border-border shadow-sm flex items-center justify-center">
                    {esProductorCard
                      ? <Tractor className="w-6 h-6 text-amber-500" />
                      : <Building2 className="w-6 h-6 text-primary" />
                    }
                  </div>
                  {isClienteAdmin && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      Cliente Admin
                    </span>
                  )}
                  {isProductor && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium">
                      Productor
                    </span>
                  )}
                </div>

                {/* Nombre y datos básicos */}
                <h2 className="text-xl font-bold">{entidad.nombre}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-sm text-muted-foreground font-mono">{entidad.ruc}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-sm text-muted-foreground">{entidad.pais}</span>
                </div>
                {entidad.direccion && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{entidad.direccion}</span>
                  </div>
                )}

                {/* Si es productor, mostrar su empresa principal */}
                {isProductor && miCliente && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Empresa: <span className="font-medium text-foreground">{miCliente.nombre}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* -- Cultivos y Variedades ---------------------------------- */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Cultivos y Variedades</h3>
                <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {cultivosMostrar.length} activo{cultivosMostrar.length !== 1 ? "s" : ""}
                </span>
              </div>

              {cultivosMostrar.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin cultivos habilitados.</p>
              ) : (
                <div className="space-y-3">
                  {cultivosMostrar.map(c => {
                    const vars = allVariedades.filter(v => {
                      if (v.cultivo_id !== c.id) return false;
                      if (isProductor && miProductor) {
                        const vPIds = v.productores_ids ?? [];
                        return vPIds.length === 0 || vPIds.includes(miProductor.id);
                      }
                      if (miCliente) {
                        const vCIds = v.clientes_ids ?? [];
                        return vCIds.length === 0 || vCIds.includes(miCliente.id);
                      }
                      return true;
                    });
                    return (
                      <div key={c.id} className="rounded-lg border border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-900/5 px-3.5 py-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{c.nombre}</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{c.codigo}</span>
                        </div>
                        {vars.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {vars.map(v => (
                              <span key={v.id} className="text-[11px] px-2 py-0.5 rounded-full border border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-400">
                                {v.nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic pl-5">Sin variedades registradas</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* -- Productores integrados (solo cliente_admin) ------------ */}
            {isClienteAdmin && (
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tractor className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Productores integrados</h3>
                  <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {productoresCliente.length} registrado{productoresCliente.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {productoresCliente.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin productores internos registrados.</p>
                ) : (
                  <div className="space-y-2.5">
                    {productoresCliente.map(prod => {
                      const prodCultivos = cultivosCliente.filter(c => {
                        const pIds = c.productores_ids ?? [];
                        return pIds.length === 0 || pIds.includes(prod.id);
                      });
                      return (
                        <div key={prod.id} className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-col gap-2">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Tractor className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{prod.nombre}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-xs text-muted-foreground font-mono">{prod.ruc}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-xs text-muted-foreground">{prod.pais}</span>
                              </div>
                              {prod.direccion && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-muted-foreground">{prod.direccion}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {prodCultivos.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-11">
                              {prodCultivos.map(c => (
                                <span key={c.id} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800/40 dark:text-emerald-400">
                                  <Leaf className="w-2.5 h-2.5" />{c.nombre}
                                </span>
                              ))}
                            </div>
                          )}
                          {renderProductorDashboardModules(prod.id, "pl-11")}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InfoBanner storageKey="empresas">
        <strong>Empresas</strong> &middot; gestiona clientes de la plataforma y sus productores internos.
        Solo el <strong>superadministrador</strong> puede crear, editar o eliminar empresas y productores.
      </InfoBanner>

      {/* -- Barra superior ? solo super_admin ----------------------------- */}
      {isSuperAdmin && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa o RUC?"
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={() => { setClienteForm(EMPTY_EMPRESA); setEditCliente(null); setShowAddCliente(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Nueva empresa
          </Button>
        </div>
      )}

      {/* -- Lista de clientes ----------------------------------------------- */}
      {filteredClientes.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Building2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">{search ? "Sin resultados" : "No hay empresas registradas."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClientes.map(cliente => {
            // Productor: solo ve su propio row; cliente_admin: ve todos los productores de su empresa
            const prodList = isProductor
              ? productores.filter(p => p.clienteId === cliente.id && p.id === currentProductorId)
              : productores.filter(p => p.clienteId === cliente.id);
            const allProdCount = productores.filter(p => p.clienteId === cliente.id).length;
            const isExpanded = expandedId === cliente.id;
            // Cuántos cultivos están habilitados para este cliente
            const cultivosHabilitados = allCultivos.filter(c =>
              !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(cliente.id)
            );
            return (
              <div key={cliente.id} className="bg-card rounded-xl border border-border overflow-hidden">

                {/* -- Fila del cliente ---------------------------------------- */}
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  isExpanded && "bg-muted/30",
                )}>
                  {/* Icono / avatar */}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4.5 h-4.5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{cliente.nombre}</p>
                    <p className="text-xs text-muted-foreground">{cliente.ruc} ? {cliente.pais}</p>
                  </div>

                  {/* Badges + acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Productor count ? super_admin ve total; cliente_admin ve total; productor no lo ve */}
                    {!isProductor && (
                      <span className="hidden sm:inline text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {allProdCount} productor{allProdCount !== 1 ? "es" : ""}
                      </span>
                    )}
                    {/* Cultivos ? solo super_admin ve la configuración */}
                    {isSuperAdmin && (
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-medium",
                        cultivosHabilitados.length > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}>
                        <Leaf className="w-2.5 h-2.5 inline mr-1 -mt-px" />
                        {cultivosHabilitados.length}/{allCultivos.length} cultivo{allCultivos.length !== 1 ? "s" : ""}
                      </span>
                    )}

                    {/* Actions (super_admin only) */}
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setClienteForm({ nombre: cliente.nombre, ruc: cliente.ruc, pais: cliente.pais, direccion: cliente.direccion ?? "" }); setEditCliente(cliente); setShowAddCliente(true); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                          title="Editar empresa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelCliente(cliente.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Expand toggle ? solo super_admin puede colapsar; otros siempre expandido */}
                    {isSuperAdmin ? (
                      <button
                        onClick={() => { setExpandedId(isExpanded ? null : cliente.id); if (!isExpanded) setActiveSubTab("productores"); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        title={isExpanded ? "Cerrar" : "Ver productores y cultivos"}
                      >
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground/40 rotate-180" />
                    )}
                  </div>
                </div>

                {/* -- Panel expandible con sub-tabs ------------------------ */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10">

                    {/* -- Sub-tab nav ---------------------------------------- */}
                    {isSuperAdmin && (
                      <div className="flex border-b border-border/50">
                        <button
                          onClick={() => setActiveSubTab("cultivos")}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
                            activeSubTab === "cultivos"
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Leaf className="w-3.5 h-3.5" />
                          Cultivos y Variedades
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            cultivosHabilitados.length > 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}>
                            {cultivosHabilitados.length}/{allCultivos.length}
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveSubTab("productores")}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
                            activeSubTab === "productores"
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Tractor className="w-3.5 h-3.5" />
                          Productores
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {prodList.length}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* ------------------------------------------------------ */}
                    {/* SUB-TAB: Cultivos y Variedades                       */}
                    {/* ------------------------------------------------------ */}
                    {isSuperAdmin && activeSubTab === "cultivos" && (
                      <div className="p-4 space-y-3">
                        {allCultivos.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic text-center py-6">
                            No hay cultivos registrados. Ve al tab <strong>Cultivos</strong> para crear.
                          </p>
                        ) : (
                          allCultivos.map(cultivo => {
                            const isCultivoEnabled = !cultivo.clientes_ids || cultivo.clientes_ids.length === 0 || cultivo.clientes_ids.includes(cliente.id);
                            const cultivoVars = allVariedades.filter(v => v.cultivo_id === cultivo.id);

                            return (
                              <div key={cultivo.id} className={cn(
                                "rounded-xl border transition-all duration-200",
                                isCultivoEnabled
                                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
                                  : "border-border/60 bg-card opacity-50",
                              )}>
                                {/* Cabecera del cultivo con toggle */}
                                <div className="flex items-center gap-2.5 px-3 py-2.5">
                                  <Switch
                                    checked={isCultivoEnabled}
                                    onCheckedChange={v => toggleCultivoCliente(cultivo.id, cliente.id, v)}
                                    className="scale-75 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn(
                                        "text-[13px] font-semibold truncate",
                                        isCultivoEnabled ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground",
                                      )}>
                                        {cultivo.nombre}
                                      </span>
                                      <span className="text-[9px] font-mono text-muted-foreground bg-muted/80 px-1 rounded shrink-0">
                                        {cultivo.codigo}
                                      </span>
                                    </div>
                                    {cultivo.descripcion && (
                                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cultivo.descripcion}</p>
                                    )}
                                  </div>
                                  {isCultivoEnabled && cultivoVars.length > 0 && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                                      {cultivoVars.filter(v => {
                                        const vIds = v.clientes_ids ?? [];
                                        return vIds.length === 0 || vIds.includes(cliente.id);
                                      }).length}/{cultivoVars.length} var.
                                    </span>
                                  )}
                                </div>

                                {/* Variedades con toggles individuales */}
                                {isCultivoEnabled && cultivoVars.length > 0 && (
                                  <div className="px-3 pb-3 border-t border-emerald-200/50 dark:border-emerald-800/50 pt-2.5">
                                    <p className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                                      Variedades habilitadas
                                    </p>
                                    <div className="space-y-1.5">
                                      {cultivoVars.map(v => {
                                        const vIds = v.clientes_ids ?? [];
                                        const isVarEnabled = vIds.length === 0 || vIds.includes(cliente.id);
                                        return (
                                          <label key={v.id} className={cn(
                                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                                            isVarEnabled
                                              ? "bg-white/70 dark:bg-emerald-900/20 hover:bg-white dark:hover:bg-emerald-900/30"
                                              : "hover:bg-muted/30",
                                          )}>
                                            <Switch
                                              checked={isVarEnabled}
                                              onCheckedChange={val => toggleVariedadCliente(v.id, cliente.id, val)}
                                              className="scale-[0.6] shrink-0"
                                            />
                                            <span className={cn(
                                              "text-[12px] font-medium",
                                              isVarEnabled ? "text-foreground" : "text-muted-foreground",
                                            )}>
                                              {v.nombre}
                                            </span>
                                            <span className="text-[9px] font-mono text-muted-foreground ml-auto">
                                              {v.codigo}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {isCultivoEnabled && cultivoVars.length === 0 && (
                                  <div className="px-3 pb-2.5 border-t border-emerald-200/50 pt-2">
                                    <p className="text-[10px] text-muted-foreground italic">Sin variedades registradas</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ------------------------------------------------------ */}
                    {/* SUB-TAB: Productores                                 */}
                    {/* ------------------------------------------------------ */}
                    {(!isSuperAdmin || activeSubTab === "productores") && (
                      <div>
                        {/* Header productores */}
                        <div className="px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tractor className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {isProductor ? "Mis datos" : "Productores internos"}
                            </span>
                          </div>
                          {isSuperAdmin && (
                            <button
                              onClick={() => { setProdForm(EMPTY_EMPRESA); setEditProductor(null); setShowAddProd(cliente.id); }}
                              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/70 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar productor
                            </button>
                          )}
                        </div>

                        {/* Lista productores */}
                        {prodList.length === 0 ? (
                          <div className="px-4 pb-4 text-center">
                            <p className="text-xs text-muted-foreground italic">
                              {isSuperAdmin
                                ? "Sin productores. Agrega el primero."
                                : isProductor
                                  ? "No se encontraron tus datos de productor."
                                  : "Esta empresa no tiene productores internos registrados."}
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/40">
                            {prodList.map(prod => {
                              // Cultivos habilitados para esta empresa (el productor solo puede tener un subconjunto)
                              const prodCultivosEnabled = cultivosHabilitados.filter(c => {
                                const pIds = c.productores_ids ?? [];
                                return pIds.length === 0 || pIds.includes(prod.id);
                              });

                              return (
                                <div key={prod.id} className="group">
                                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                                    <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                      <Tractor className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{prod.nombre}</p>
                                        {isProductor && prod.id === currentProductorId && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium shrink-0">
                                            Mis datos
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{prod.ruc} ? {prod.pais}</p>
                                    </div>
                                    {isSuperAdmin && (
                                      <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                                        prodCultivosEnabled.length > 0
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                          : "bg-muted text-muted-foreground",
                                      )}>
                                        {prodCultivosEnabled.length}/{cultivosHabilitados.length} cultivo{cultivosHabilitados.length !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                    {isSuperAdmin && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                          onClick={() => { setProdForm({ nombre: prod.nombre, ruc: prod.ruc, pais: prod.pais, direccion: prod.direccion ?? "" }); setEditProductor(prod); setShowAddProd(prod.clienteId); }}
                                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                                          title="Editar productor"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setConfirmDelProductor(prod.id)}
                                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                                          title="Eliminar productor"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {renderProductorDashboardModules(prod.id, "px-4 pb-2 ml-10")}

                                  {/* -- Cultivos + Variedades por productor (super_admin) --- */}
                                  {isSuperAdmin && cultivosHabilitados.length > 0 && (
                                    <div className="px-4 pb-3 ml-10 space-y-2.5">
                                      {cultivosHabilitados.map(c => {
                                        const pIds = c.productores_ids ?? [];
                                        const isCultivoEnabled = pIds.length === 0 || pIds.includes(prod.id);
                                        const cultivoVarsForProd = allVariedades.filter(v => v.cultivo_id === c.id);
                                        return (
                                          <div key={c.id} className={cn(
                                            "rounded-lg border transition-all duration-150",
                                            isCultivoEnabled
                                              ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-900/5"
                                              : "border-border/50 bg-card opacity-60",
                                          )}>
                                            {/* Cultivo toggle row */}
                                            <div className="flex items-center gap-2 px-2.5 py-2">
                                              <Switch
                                                checked={isCultivoEnabled}
                                                onCheckedChange={v => toggleCultivoProductor(c.id, prod.id, v)}
                                                className="scale-[0.65] shrink-0"
                                              />
                                              <Leaf className={cn("w-3 h-3 shrink-0", isCultivoEnabled ? "text-emerald-600" : "text-muted-foreground")} />
                                              <span className={cn(
                                                "text-[12px] font-semibold flex-1",
                                                isCultivoEnabled ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground",
                                              )}>
                                                {c.nombre}
                                              </span>
                                              <span className="text-[9px] font-mono text-muted-foreground bg-muted/60 px-1 rounded">{c.codigo}</span>
                                            </div>
                                            {/* Variedades del cultivo habilitadas para el productor */}
                                            {isCultivoEnabled && cultivoVarsForProd.length > 0 && (
                                              <div className="px-2.5 pb-2 border-t border-emerald-200/40 dark:border-emerald-800/40 pt-1.5">
                                                <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1.5">
                                                  Variedades del productor
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                  {cultivoVarsForProd.map(v => {
                                                    const vPIds = v.productores_ids ?? [];
                                                    const isVarEnabled = vPIds.length === 0 || vPIds.includes(prod.id);
                                                    return (
                                                      <button
                                                        key={v.id}
                                                        onClick={() => toggleVariedadProductor(v.id, prod.id, !isVarEnabled)}
                                                        className={cn(
                                                          "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium transition-all",
                                                          isVarEnabled
                                                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                            : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border",
                                                        )}
                                                        title={isVarEnabled ? `Deshabilitar ${v.nombre}` : `Habilitar ${v.nombre}`}
                                                      >
                                                        {isVarEnabled ? <Check className="w-2 h-2" /> : <X className="w-2 h-2" />}
                                                        {v.nombre}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            {isCultivoEnabled && cultivoVarsForProd.length === 0 && (
                                              <div className="px-2.5 pb-1.5 border-t border-emerald-200/40 pt-1">
                                                <p className="text-[9px] text-muted-foreground italic">Sin variedades</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -- Dialog: Agregar / Editar cliente -------------------------------- */}
      <Dialog open={showAddCliente} onOpenChange={open => { if (!open) { setShowAddCliente(false); setEditCliente(null); setClienteForm(EMPTY_EMPRESA); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCliente ? "Editar empresa" : "Nueva empresa cliente"}</DialogTitle>
            <DialogDescription>
              {editCliente ? `Modifica los datos de ${editCliente.nombre}.` : "Registra una nueva empresa cliente en la plataforma."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre <span className="text-destructive">*</span></Label>
              <Input value={clienteForm.nombre} onChange={e => setClienteForm(p => ({ ...p, nombre: e.target.value }))} placeholder="ej. AgroPro Chile" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">RUC / NIT <span className="text-destructive">*</span></Label>
              <Input value={clienteForm.ruc} onChange={e => setClienteForm(p => ({ ...p, ruc: e.target.value }))} placeholder="ej. 76.123.456-7" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">País <span className="text-destructive">*</span></Label>
                <Input value={clienteForm.pais} onChange={e => setClienteForm(p => ({ ...p, pais: e.target.value }))} placeholder="ej. Chile" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Dirección</Label>
              <Input value={clienteForm.direccion ?? ""} onChange={e => setClienteForm(p => ({ ...p, direccion: e.target.value }))} placeholder="ej. Av. Apoquindo 4501, Las Condes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddCliente(false); setEditCliente(null); setClienteForm(EMPTY_EMPRESA); }}>Cancelar</Button>
            <Button onClick={handleSaveCliente} disabled={!validEmpresa(clienteForm)}>
              {editCliente ? "Guardar cambios" : <><Plus className="w-4 h-4 mr-1.5" />Crear empresa</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog: Agregar / Editar productor ------------------------------ */}
      <Dialog open={showAddProd !== null} onOpenChange={open => { if (!open) { setShowAddProd(null); setEditProductor(null); setProdForm(EMPTY_EMPRESA); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editProductor ? "Editar productor" : "Nuevo productor interno"}</DialogTitle>
            <DialogDescription>
              {editProductor
                ? `Modifica los datos de ${editProductor.nombre}.`
                : `Agrega un productor interno a ${clientes.find(c => c.id === showAddProd)?.nombre ?? "la empresa"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre <span className="text-destructive">*</span></Label>
              <Input value={prodForm.nombre} onChange={e => setProdForm(p => ({ ...p, nombre: e.target.value }))} placeholder="ej. Fundo Los Andes" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">RUC / NIT <span className="text-destructive">*</span></Label>
              <Input value={prodForm.ruc} onChange={e => setProdForm(p => ({ ...p, ruc: e.target.value }))} placeholder="ej. 76.111.222-3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">País <span className="text-destructive">*</span></Label>
                <Input value={prodForm.pais} onChange={e => setProdForm(p => ({ ...p, pais: e.target.value }))} placeholder="ej. Chile" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Dirección</Label>
              <Input value={prodForm.direccion ?? ""} onChange={e => setProdForm(p => ({ ...p, direccion: e.target.value }))} placeholder="ej. Camino Los Andes s/n, Colina" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddProd(null); setEditProductor(null); setProdForm(EMPTY_EMPRESA); }}>Cancelar</Button>
            <Button onClick={handleSaveProductor} disabled={!validEmpresa(prodForm)}>
              {editProductor ? "Guardar cambios" : <><Plus className="w-4 h-4 mr-1.5" />Crear productor</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog: Confirmar eliminación de cliente ------------------------ */}
      <Dialog open={confirmDelCliente !== null} onOpenChange={open => { if (!open) setConfirmDelCliente(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar empresa
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminar? <strong>{clientes.find(c => c.id === confirmDelCliente)?.nombre}</strong> y todos sus productores internos.
              Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelCliente(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelCliente !== null && handleDeleteCliente(confirmDelCliente)}>
              Eliminar empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog: Confirmar eliminación de productor ---------------------- */}
      <Dialog open={confirmDelProductor !== null} onOpenChange={open => { if (!open) setConfirmDelProductor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar productor
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminar? <strong>{productores.find(p => p.id === confirmDelProductor)?.nombre}</strong>.
              Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelProductor(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelProductor !== null && handleDeleteProductor(confirmDelProductor)}>
              Eliminar productor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Tab Usuarios -------------------------------------------------------------

const rolConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "Super Admin":   { icon: ShieldCheck, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "Cliente Admin": { icon: Shield,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "Productor":     { icon: SproutIcon,  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "Jefe de área":  { icon: Briefcase,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "Supervisor":    { icon: Eye,         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  "Lector":        { icon: BookOpenAlt, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const roleNameMap: Record<UserRoleT, string> = {
  super_admin:   "Super Admin",
  cliente_admin: "Cliente Admin",
  productor:     "Productor",
  jefe_area:     "Jefe de área",
  supervisor:    "Supervisor",
  lector:        "Lector",
};

// Base user list is now derived reactively inside TabUsuarios

type SortKey = "nombre" | "rol" | "empresa" | "ultimoAcceso";

const avatarColors = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
];

const initials = (nombre: string) =>
  nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

// Guía contextual de permisos para el módulo Informes
const INFORMES_ACCION_INFO: Record<ActionPermission, { desc: string; importante?: boolean }> = {
  ver:        { desc: "Ver las plantillas de informes disponibles" },
  crear:      { desc: "Ejecutar informes y descargar los resultados", importante: true },
  editar:     { desc: "Editar plantillas del área asignada al supervisor", importante: true },
  eliminar:   { desc: "Eliminar plantillas del área asignada al supervisor", importante: true },
  exportar:   { desc: "Exportar informes generados a PDF / Excel" },
  configurar: { desc: "Ver informes de todos los módulos sin restricción de área", importante: true },
};

function TabUsuarios({ autoOpenCreateModal }: { autoOpenCreateModal?: boolean }) {
  const {
    addOverride, removeOverride, getUserOverrides, getRoleBasePermissions,
    clientes, productores, users: contextUsers, addUser, updUser, toggleUserActive,
    currentUser, role: currentRole_ctx, currentClienteId, empresaCtxId,
  } = useRole();
  const { definiciones, getDefAccesos, addDefAcceso, removeDefAcceso } = useConfig();

  const isSuperAdmin = currentRole_ctx === "super_admin";
  const isClienteAdmin = currentRole_ctx === "cliente_admin";

  // Derive BASE_USERS reactively from context.
  // Reglas de visibilidad:
  //   1. Solo se ven usuarios con nivel de rol MENOR al del usuario actual (no pares ni superiores)
  //   2. cliente_admin solo ve usuarios de su propio clienteId
  const myLevel = ROLE_LEVELS[currentRole_ctx];
  const BASE_USERS = useMemo(() =>
    contextUsers
      .filter(u =>
        ROLE_LEVELS[u.role] < myLevel &&
        (isSuperAdmin || u.clienteId === currentClienteId) &&
        (!isSuperAdmin || !empresaCtxId || u.clienteId === empresaCtxId)
      )
      .map(u => ({
        id:           u.id,
        nombre:       u.nombre,
        email:        u.email,
        roleKey:      u.role as UserRoleT,
        clienteId:    u.clienteId,
        productorId:  u.productorId,
        activo:       u.activo !== false,
        area_asignada: u.area_asignada,
        empresa:      u.clienteId ? clientes.find(c => c.id === u.clienteId)?.nombre ?? "N/D" : "Plataforma",
        estado:       (u.activo !== false ? "Activo" : "Inactivo") as "Activo" | "Inactivo",
        ultimoAcceso: "N/D",
      })),
  [contextUsers, clientes, myLevel, isSuperAdmin, currentClienteId]);

  // Local role overrides ? lets us edit roles inline without a real backend
  const [userRoleMap, setUserRoleMap] = useState<Map<number, UserRoleT>>(() => new Map());

  // Selection (single for detail panel)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Multi-select (for bulk actions)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  // Bulk assign modal
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkDefIds, setBulkDefIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"permitir" | "bloquear">("permitir");

  // -- Crear / Editar usuario -------------------------------------------------
  const [userModal, setUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRoleT>("lector");
  const [formClienteId, setFormClienteId] = useState<number | "">("");
  const [formProductorId, setFormProductorId] = useState<number | "">("");
  const [formAreaAsignada, setFormAreaAsignada] = useState("");
  const [formActivo, setFormActivo] = useState(true);
  const [formModulosActivos, setFormModulosActivos] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Módulos disponibles para el rol seleccionado
  const formRoleModulos = useMemo(() =>
    ALL_MODULES.filter(m => getRoleBasePermissions(formRole, m.value).length > 0),
  [formRole, getRoleBasePermissions]);

  // Productores filtrados por cliente seleccionado en el form
  const formProductores = useMemo(
    () => formClienteId ? productores.filter(p => p.clienteId === formClienteId) : [],
    [formClienteId, productores],
  );

  // Roles que el usuario actual puede asignar (no puede crear roles con nivel >= al suyo)
  const assignableRoles = useMemo(() => {
    const myLevel = ROLE_LEVELS[currentRole_ctx];
    return (Object.entries(roleNameMap) as [UserRoleT, string][]).filter(
      ([key]) => ROLE_LEVELS[key] < myLevel,
    );
  }, [currentRole_ctx]);

  const openCreateModal = () => {
    const defaultRole = assignableRoles.length > 0 ? assignableRoles[0][0] : "lector";
    // Inicializar con todos los módulos que el rol tiene por defecto
    const defaultMods = new Set(
      ALL_MODULES.filter(m => getRoleBasePermissions(defaultRole, m.value).length > 0).map(m => m.value)
    );
    setEditingUserId(null);
    setFormNombre("");
    setFormEmail("");
    setFormPassword("");
    setFormRole(defaultRole);
    setFormClienteId(isClienteAdmin ? (currentClienteId ?? "") : "");
    setFormProductorId("");
    setFormAreaAsignada("");
    setFormActivo(true);
    setFormModulosActivos(defaultMods);
    setUserModal(true);
  };

  const autoOpenCreateHandledRef = useRef(false);
  useEffect(() => {
    if (!autoOpenCreateModal || autoOpenCreateHandledRef.current) return;
    openCreateModal();
    autoOpenCreateHandledRef.current = true;
  }, [autoOpenCreateModal]);

  const openEditModal = (userId: number) => {
    const u = contextUsers.find(x => x.id === userId);
    if (!u) return;
    // Calcular módulos activos: los que tiene el rol menos los bloqueados por override
    const userOvs = getUserOverrides(userId);
    const blockedMods = new Set(
      userOvs.filter(ov => !ov.habilitado && ov.accion === "ver").map(ov => ov.modulo)
    );
    const activeMods = new Set(
      ALL_MODULES
        .filter(m => getRoleBasePermissions(u.role, m.value).length > 0 && !blockedMods.has(m.value))
        .map(m => m.value)
    );
    setEditingUserId(userId);
    setFormNombre(u.nombre);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.role);
    setFormClienteId(u.clienteId ?? "");
    setFormProductorId(u.productorId ?? "");
    setFormAreaAsignada(u.area_asignada ?? "");
    setFormActivo(u.activo !== false);
    setFormModulosActivos(activeMods);
    setUserModal(true);
  };

  const handleSaveUser = () => {
    if (!formNombre.trim() || !formEmail.trim()) return;
    if (!editingUserId && !formPassword.trim()) return;
    if (formModulosActivos.size === 0) return;

    const payload: Omit<import("@/contexts/RoleContext").HardcodedUser, "id"> = {
      nombre: formNombre.trim(),
      email: formEmail.trim(),
      password: editingUserId
        ? (formPassword.trim() || contextUsers.find(u => u.id === editingUserId)?.password || "")
        : formPassword.trim(),
      role: formRole,
      clienteId: formClienteId || undefined,
      productorId: formProductorId || undefined,
      area_asignada: formAreaAsignada.trim() || undefined,
      activo: formActivo,
    };

    let userId: number;
    if (editingUserId) {
      updUser(editingUserId, payload);
      userId = editingUserId;
    } else {
      const created = addUser(payload);
      userId = created.id;
    }

    // Crear overrides: bloquear TODAS las acciones de módulos desactivados
    // Primero limpiar overrides anteriores de módulos que este flujo gestiona
    const existingOvs = getUserOverrides(userId);
    const allRoleMods = ALL_MODULES.filter(m => getRoleBasePermissions(formRole, m.value).length > 0);

    for (const mod of allRoleMods) {
      const permsDelRol = getRoleBasePermissions(formRole, mod.value);
      const isDisabled = !formModulosActivos.has(mod.value);

      for (const accion of permsDelRol) {
        const existingOv = existingOvs.find(o => o.modulo === mod.value && o.accion === accion);

        if (isDisabled) {
          // Módulo desactivado ? bloquear cada acción
          if (!existingOv || existingOv.habilitado) {
            if (existingOv) removeOverride(existingOv.id);
            addOverride({
              userId,
              modulo: mod.value,
              accion,
              habilitado: false,
              justificacion: "Módulo restringido al crear/editar usuario",
            });
          }
        } else {
          // Módulo activado ? quitar bloqueos previos de este flujo
          if (existingOv && !existingOv.habilitado && existingOv.justificacion === "Módulo restringido al crear/editar usuario") {
            removeOverride(existingOv.id);
          }
        }
      }
    }

    setUserModal(false);
  };

  const handleToggleUserActive = (id: number) => {
    toggleUserActive(id);
    setDeleteConfirm(null);
    if (selectedUserId === id) setSelectedUserId(null);
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Panel tab: "modulos" | "formularios" | "por-formulario"
  const [panelTab, setPanelTab] = useState<"modulos" | "formularios" | "por-formulario">("modulos");

  // "Por formulario" view state
  const [porFormDefId, setPorFormDefId] = useState<string>("");
  const [porFormSearch, setPorFormSearch] = useState("");

  // Search inside the unified access cascade
  const [panelSearch, setPanelSearch] = useState("");

  // Matrix cell quick-add modal
  const [matrixModal, setMatrixModal] = useState<{
    modulo: string; accion: ActionPermission; habilitado: boolean;
  } | null>(null);
  const [matrixJustif, setMatrixJustif] = useState("");

  // Filters
  const [search,        setSearch]        = useState("");
  const [filterRol,     setFilterRol]     = useState("todos");
  const [filterEmpresa, setFilterEmpresa] = useState("todas");

  // Sort
  const [sortBy,  setSortBy]  = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Derive users with locally overridden roles + reactive empresa name
  const users = useMemo(() =>
    BASE_USERS.map(u => {
      const roleKey = userRoleMap.get(u.id) ?? u.roleKey;
      const empresa = u.clienteId ? clientes.find(c => c.id === u.clienteId)?.nombre ?? "N/D" : "Plataforma";
      return { ...u, roleKey, rol: roleNameMap[roleKey], nivel: ROLE_LEVELS[roleKey], empresa };
    }),
  [BASE_USERS, userRoleMap, clientes]);

  const rolesDisponibles    = useMemo(() => Array.from(new Set(users.map(u => u.rol))), [users]);
  const empresasDisponibles = useMemo(() => Array.from(new Set(users.map(u => u.empresa))), [users]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = users.filter(u =>
      (filterRol     === "todos" || u.rol     === filterRol) &&
      (filterEmpresa === "todas" || u.empresa === filterEmpresa) &&
      (!q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
    list.sort((a, b) => {
      let va: string | number = "", vb: string | number = "";
      if      (sortBy === "nombre")       { va = a.nombre;       vb = b.nombre; }
      else if (sortBy === "rol")          { va = a.nivel;        vb = b.nivel; }
      else if (sortBy === "empresa")      { va = a.empresa;      vb = b.empresa; }
      else                                { va = a.ultimoAcceso; vb = b.ultimoAcceso; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filterRol, filterEmpresa, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on filter/sort change
  useEffect(() => { setPage(1); }, [search, filterRol, filterEmpresa, sortBy, sortDir, pageSize]);

  const selectedUser  = selectedUserId != null ? users.find(u => u.id === selectedUserId) ?? null : null;
  const userOverrides = selectedUserId != null ? getUserOverrides(selectedUserId) : [];

  const handleSort = (col: SortKey) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  // Toggle override from matrix cell
  // Reglas (?6 informe): solo puedes OTORGAR permisos que Tú mismo tienes.
  // Bloquear (habilitado: false) siempre está permitido sobre subordinados.
  const canGrantAction = (modulo: string, accion: ActionPermission): boolean => {
    if (isSuperAdmin) return true;
    return getRoleBasePermissions(currentRole_ctx, modulo).includes(accion);
  };

  const handleMatrixCell = (modulo: string, accion: ActionPermission) => {
    if (!selectedUser) return;
    const existing = userOverrides.find(ov => ov.modulo === modulo && ov.accion === accion);
    if (existing) {
      // Quitar override existente ? siempre permitido
      removeOverride(existing.id);
    } else {
      const baseHas  = getRoleBasePermissions(selectedUser.roleKey, modulo).includes(accion);
      const wouldGrant = !baseHas; // true = estaríamos dando algo que no tiene por rol
      if (wouldGrant && !canGrantAction(modulo, accion)) return; // bloqueado
      setMatrixModal({ modulo, accion, habilitado: !baseHas });
      setMatrixJustif("");
    }
  };

  const handleMatrixConfirm = () => {
    if (!selectedUser || !matrixModal || !matrixJustif.trim()) return;
    addOverride({
      userId:        selectedUser.id,
      modulo:        matrixModal.modulo,
      accion:        matrixModal.accion,
      habilitado:    matrixModal.habilitado,
      justificacion: matrixJustif.trim(),
    });
    setMatrixModal(null);
    setMatrixJustif("");
  };

  // Sort arrow indicator
  const SortArrow = ({ col }: { col: SortKey }) => (
    <span className={cn("ml-1 text-[9px]", sortBy === col ? "text-primary" : "opacity-30")}>
      {sortBy === col ? (sortDir === "asc" ? "^" : "v") : "-"}
    </span>
  );

  // Page number chips (show up to 5)
  const pageChips = (() => {
    const chips: number[] = [];
    const count = Math.min(5, totalPages);
    let start = 1;
    if (totalPages > 5) {
      if (page <= 3) start = 1;
      else if (page >= totalPages - 2) start = totalPages - 4;
      else start = page - 2;
    }
    for (let i = 0; i < count; i++) chips.push(start + i);
    return chips;
  })();

  return (
    <div className="space-y-4">
      <InfoBanner storageKey="usuarios">
        <strong>Gestión de Usuarios</strong> administra roles y configura permisos especiales
        por módulo y acción. Haz clic en un usuario para abrir su matriz de permisos.
      </InfoBanner>

      {/* -- Banner empresa filtrada (super_admin) ----------------------- */}
      {isSuperAdmin && empresaCtxId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 text-xs">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>Mostrando usuarios de <strong>{clientes.find(c => c.id === empresaCtxId)?.nombre ?? ""}</strong></span>
        </div>
      )}

      {/* -- Toolbar --------------------------------------------------------- */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o email?"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filterRol}
          onChange={e => setFilterRol(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="todos">Todos los roles</option>
          {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filterEmpresa}
          onChange={e => setFilterEmpresa(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="todas">Todas las empresas</option>
          {empresasDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {(search || filterRol !== "todos" || filterEmpresa !== "todas") && (
          <button
            onClick={() => { setSearch(""); setFilterRol("todos"); setFilterEmpresa("todas"); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} de {users.length} usuarios
        </span>

        {(isSuperAdmin || isClienteAdmin) && (
          <Button size="sm" className="h-9 gap-1.5" onClick={openCreateModal}>
            <Plus className="w-3.5 h-3.5" />
            Nuevo usuario
          </Button>
        )}
      </div>

      {/* -- Bulk action bar ----------------------------------------------- */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 animate-in slide-in-from-top-1">
          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {checkedIds.size} usuario{checkedIds.size !== 1 ? "s" : ""} seleccionado{checkedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setBulkModal(true); setBulkDefIds(new Set()); setBulkAction("permitir"); }}
            >
              <ListFilter className="w-3 h-3" />
              Asignar formularios
            </Button>
            <button
              onClick={() => setCheckedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          </div>
        </div>
      )}

      {/* -- Body: table + detail panel -------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* -- Sortable paginated table -------------------------------------- */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-8 px-2 py-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (checkedIds.size === paginated.length && paginated.length > 0) {
                        setCheckedIds(new Set());
                      } else {
                        setCheckedIds(new Set(paginated.map(u => u.id)));
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={checkedIds.size === paginated.length ? "Deseleccionar todo" : "Seleccionar página"}
                  >
                    {checkedIds.size > 0 && checkedIds.size === paginated.length
                      ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      : checkedIds.size > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-primary/50" />
                        : <Square className="w-3.5 h-3.5" />}
                  </button>
                </th>
                <th
                  className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort("nombre")}
                >
                  Usuario <SortArrow col="nombre" />
                </th>
                <th
                  className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort("rol")}
                >
                  Rol <SortArrow col="rol" />
                </th>
                <th
                  className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none hidden md:table-cell"
                  onClick={() => handleSort("empresa")}
                >
                  Empresa <SortArrow col="empresa" />
                </th>
                <th
                  className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none hidden lg:table-cell"
                  onClick={() => handleSort("ultimoAcceso")}
                >
                  último acceso <SortArrow col="ultimoAcceso" />
                </th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-12" title="Ajustes de permisos personalizados">
                  Aj.
                </th>
                {(isSuperAdmin || isClienteAdmin) && (
                  <th className="text-center px-2 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-16">
                    Acc.
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Sin usuarios que coincidan con los filtros.
                  </td>
                </tr>
              ) : paginated.map((user, i) => {
                const globalIdx    = (page - 1) * pageSize + i;
                const currentRole  = userRoleMap.get(user.id) ?? user.roleKey;
                const roleName     = roleNameMap[currentRole];
                const config       = rolConfig[roleName];
                const overrideCount = getUserOverrides(user.id).length;
                const isSelected   = selectedUserId === user.id;
                const isChecked    = checkedIds.has(user.id);
                const avatarColor  = avatarColors[globalIdx % avatarColors.length];

                return (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(prev => prev === user.id ? null : user.id)}
                    className={cn(
                      "border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                      isSelected && "bg-primary/5",
                      isChecked && "bg-primary/[0.03]",
                      user.activo === false && "opacity-60 bg-muted/20" // Usuarios inactivos con opacidad reducida
                    )}
                  >
                    {/* Checkbox */}
                    <td className="w-8 px-2 py-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setCheckedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(user.id)) next.delete(user.id);
                          else next.add(user.id);
                          return next;
                        })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isChecked
                          ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    {/* User: avatar + name + email */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected && (
                          <div className="w-0.5 h-7 bg-primary rounded-full shrink-0 -ml-2 mr-1" />
                        )}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          avatarColor,
                        )}>
                          {initials(user.nombre)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground text-[13px] truncate leading-snug">{user.nombre}</p>
                            {user.activo === false && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold leading-none">
                                INACTIVO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate leading-snug">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role: inline select */}
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <select
                        value={currentRole}
                        onChange={e => {
                          const newRole = e.target.value as UserRoleT;
                          setUserRoleMap(m => { const n = new Map(m); n.set(user.id, newRole); return n; });
                        }}
                        className={cn(
                          "text-[11px] font-medium px-1.5 py-0.5 rounded-full border-0 ring-1 ring-transparent cursor-pointer outline-none transition-all hover:ring-primary/40 focus:ring-primary max-w-[130px] truncate",
                          config?.color ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {(Object.entries(roleNameMap) as [UserRoleT, string][]).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      {/* Level bar */}
                      <div className="flex items-center gap-0.5 mt-1 px-1">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "h-0.5 flex-1 rounded-full",
                              idx < ROLE_LEVELS[currentRole] ? "bg-primary" : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                    </td>

                    {/* Empresa */}
                    <td className="px-4 py-2 hidden md:table-cell">
                      <span className="text-[12px] text-muted-foreground">{user.empresa}</span>
                    </td>

                    {/* Last access */}
                    <td className="px-4 py-2 hidden lg:table-cell">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {user.ultimoAcceso}
                      </span>
                    </td>

                    {/* Override badge */}
                    <td className="px-3 py-2 text-center">
                      {overrideCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          {overrideCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    {(isSuperAdmin || isClienteAdmin) && (
                      <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(user.id)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar usuario"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className={cn(
                              "p-1 rounded transition-colors",
                              user.activo === false
                                ? "hover:bg-green-100 text-muted-foreground hover:text-green-600"
                                : "hover:bg-amber-100 text-muted-foreground hover:text-amber-600"
                            )}
                            title={user.activo === false ? "Activar usuario" : "Desactivar usuario"}
                          >
                            {user.activo === false ? (
                              <UserCheck className="w-3 h-3" />
                            ) : (
                              <UserX className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* -- Pagination footer ---------------------------------------- */}
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-border flex items-center justify-between gap-3 bg-muted/20 flex-wrap">
              {/* Page size */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Filas:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-6 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none"
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Page controls */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground mr-1.5">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} / {filtered.length}
                </span>
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">&lt;&lt;</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">&lt;</button>
                {pageChips.map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "min-w-[24px] h-6 rounded text-[11px] px-1.5 transition-colors",
                      p === page
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground",
                    )}
                  >{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">&gt;</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">&gt;&gt;</button>
              </div>
            </div>
          )}
        </div>

        {/* -- Perfil de acceso ----------------------------------------------- */}
        <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4 flex flex-col max-h-[calc(100vh-140px)]">

          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Perfil de acceso
            </h3>
            {selectedUser && (
              <button
                onClick={() => { setSelectedUserId(null); setPanelSearch(""); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!selectedUser ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center flex-1 px-6">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Users2 className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sin usuario seleccionado</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Haz clic en un usuario de la tabla para ver su perfil de acceso.</p>
              </div>
            </div>
          ) : (() => {
            const userOverrides     = getUserOverrides(selectedUser.id);
            const accesosDelUsuario = definiciones
              .flatMap(d => getDefAccesos(d.id).filter(a => a.usuario_id === selectedUser.id));
            const totalOverrides    = userOverrides.length + accesosDelUsuario.length;
            const q = panelSearch.toLowerCase();

            return (
              <>
                {/* -- Tarjeta de usuario -------------------------------- */}
                <div className="px-4 py-4 border-b border-border shrink-0 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      avatarColors[users.findIndex(u => u.id === selectedUser.id) % avatarColors.length],
                    )}>
                      {initials(selectedUser.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{selectedUser.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedUser.empresa}</p>
                    </div>
                  </div>

                  {/* Badges de rol y nivel */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg",
                      rolConfig[selectedUser.rol]?.color,
                    )}>
                      {(() => { const Ic = rolConfig[selectedUser.rol]?.icon ?? Shield; return <Ic className="w-3 h-3" />; })()}
                      {selectedUser.rol}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary" title="Nivel jerárquico (1=Lector - 6=Super Admin)">
                      Nv.{selectedUser.nivel}
                      <span className="flex gap-0.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className={cn("inline-block w-1.5 h-1.5 rounded-sm", i < selectedUser.nivel ? "bg-primary" : "bg-primary/20")} />
                        ))}
                      </span>
                    </span>
                  </div>

                  {/* Resumen de overrides */}
                  {totalOverrides > 0 ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                      <ShieldAlert className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                      <span className="text-[11px] text-primary/80 flex-1">
                        {userOverrides.length > 0 && <><strong>{userOverrides.length}</strong> ajuste{userOverrides.length !== 1 ? "s" : ""} de módulo</>}
                        {userOverrides.length > 0 && accesosDelUsuario.length > 0 && " · "}
                        {accesosDelUsuario.length > 0 && <><strong>{accesosDelUsuario.length}</strong> de formulario</>}
                      </span>
                      <button
                        onClick={() => { userOverrides.forEach(ov => removeOverride(ov.id)); accesosDelUsuario.forEach(a => removeDefAcceso(a.id)); }}
                        className="text-[10px] text-destructive hover:text-destructive/70 transition-colors shrink-0 font-medium"
                      >
                        Limpiar
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50 italic">Sin ajustes — acceso según rol</p>
                  )}
                </div>

                {/* -- Leyenda + Búsqueda -------------------------------- */}
                <div className="px-4 py-3 border-b border-border bg-muted/10 shrink-0 space-y-2.5">
                  {/* Leyenda simplificada */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-success/50 shrink-0" />
                      Acceso por rol
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-amber-400/70 shrink-0" />
                      Sin acceso
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                      Ajuste: permitido
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                      Ajuste: bloqueado
                    </span>
                  </div>
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={panelSearch}
                      onChange={e => setPanelSearch(e.target.value)}
                      placeholder="Buscar módulo o formulario?"
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors"
                    />
                    {panelSearch && (
                      <button onClick={() => setPanelSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* -- Módulos y formularios ----------------------------- */}
                <div className="overflow-y-auto flex-1">
                  {MODULO_OPTIONS.map(mod => {
                    const modDefs = definiciones.filter(d => d.modulo === mod.value && d.estado === "activo");
                    const modMatchesSearch = !q || mod.label.toLowerCase().includes(q);
                    const filteredDefs = modDefs.filter(d => !q || d.nombre.toLowerCase().includes(q) || modMatchesSearch);
                    if (!modMatchesSearch && filteredDefs.length === 0) return null;
                    const hasModOverrides = userOverrides.some(o => o.modulo === mod.value);
                    if (modDefs.length === 0 && !hasModOverrides) return null;

                    return (
                      <div key={mod.value} className="border-b border-border last:border-b-0">
                        {/* Cabecera de módulo */}
                        <div className="px-4 py-2.5 bg-muted/30 flex items-center gap-3">
                          <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider flex-1">{mod.label}</p>
                          {/* Botones de acción del módulo */}
                          <div className="flex gap-1" title="Clic para ajustar permiso del módulo">
                            {ALL_ACTIONS.map(a => {
                              const ov        = userOverrides.find(o => o.modulo === mod.value && o.accion === a.value);
                              const hasBase   = getRoleBasePermissions(selectedUser.roleKey, mod.value).includes(a.value);
                              const effective = ov ? ov.habilitado : hasBase;
                              const wouldGrant = !ov && !hasBase;
                              const locked     = wouldGrant && !canGrantAction(mod.value, a.value);
                              const tip        = locked
                                ? `${a.label}: no puedes otorgar lo que no tienes`
                                : `${a.label}: ${effective ? "Permitido" : "Denegado"}${ov ? " (ajustado)" : " (según rol)"}`;
                              return (
                                <button
                                  key={a.value}
                                  onClick={() => !locked && handleMatrixCell(mod.value, a.value)}
                                  title={tip}
                                  disabled={locked}
                                  className={cn(
                                    "w-6 h-6 rounded-md text-[9px] font-bold transition-colors flex items-center justify-center",
                                    locked
                                      ? "bg-muted/30 text-muted-foreground/20 cursor-not-allowed"
                                      : ov
                                        ? ov.habilitado ? "bg-success text-white shadow-sm" : "bg-destructive text-white shadow-sm"
                                        : hasBase ? "bg-success/15 text-success/80 hover:bg-success/25" : "bg-muted/60 text-muted-foreground/50 hover:bg-muted",
                                  )}
                                >
                                  {locked ? <Lock className="w-2.5 h-2.5" /> : a.label[0].toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Filas de formularios */}
                        {filteredDefs.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/50 italic px-4 py-3">Sin formularios activos</p>
                        ) : (
                          filteredDefs.map(def => {
                            const ovAcceso  = getDefAccesos(def.id).find(a => a.usuario_id === selectedUser.id);
                            const hasModVer = getRoleBasePermissions(selectedUser.roleKey, def.modulo).includes("ver");
                            const levelOK   = selectedUser.nivel >= (def.nivel_minimo ?? 1);
                            const notExcl   = !(def.roles_excluidos ?? []).includes(selectedUser.roleKey);
                            const roleOK    = hasModVer && levelOK && notExcl;
                            const blockReason = !hasModVer ? "Sin acceso al módulo"
                              : !levelOK ? `Nivel insuficiente (requiere Nv.${def.nivel_minimo})`
                              : !notExcl ? "Rol excluido de este formulario"
                              : "";

                            return (
                              <div
                                key={def.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 border-t border-border/30 transition-colors"
                              >
                                {/* Indicador de estado */}
                                <span className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  ovAcceso
                                    ? ovAcceso.habilitado ? "bg-success" : "bg-destructive"
                                    : roleOK ? "bg-success/50" : "bg-amber-400/70"
                                )} />

                                {/* Nombre + badges */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-xs font-medium text-foreground truncate"
                                    title={def.nombre + (blockReason ? ` - ${blockReason}` : "")}
                                  >
                                    {def.nombre}
                                    {def.cultivo_id && <span className="ml-1 text-primary/50">cultivo</span>}
                                  </p>
                                  {/* Badges secundarios solo si hay restricciones */}
                                  {((def.nivel_minimo ?? 1) > 1 || !notExcl) && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {(def.nivel_minimo ?? 1) > 1 && (
                                        <span className={cn(
                                          "text-[9px] font-semibold px-1 py-px rounded",
                                          !levelOK
                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                            : "bg-muted text-muted-foreground",
                                        )}>
                                          Nv.{def.nivel_minimo}
                                        </span>
                                      )}
                                      {!notExcl && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-px rounded bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                                          <Lock className="w-2 h-2" /> excluido
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Estado + acción */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    title={!ovAcceso && !roleOK ? blockReason : undefined}
                                    className={cn(
                                      "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                      ovAcceso
                                        ? ovAcceso.habilitado
                                          ? "bg-success/10 text-success border-success/25"
                                          : "bg-destructive/10 text-destructive border-destructive/20"
                                        : roleOK
                                          ? "bg-muted/50 text-muted-foreground border-border"
                                          : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400",
                                    )}
                                  >
                                    {ovAcceso
                                      ? ovAcceso.habilitado ? "ajustado" : "bloqueado"
                                      : roleOK ? "por rol" : "sin acceso"
                                    }
                                  </span>
                                  {ovAcceso ? (
                                    <button
                                      onClick={() => removeDefAcceso(ovAcceso.id)}
                                      title="Quitar ajuste - volver a reglas del rol"
                                      className="text-[10px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                                    >
                                      rol
                                    </button>
                                  ) : roleOK ? (
                                    <button
                                      onClick={() => addDefAcceso({ definicion_id: def.id, usuario_id: selectedUser.id, habilitado: false, justificacion: "Bloqueado desde gestión de usuarios" })}
                                      title="Bloquear acceso a este formulario"
                                      className="w-6 h-6 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => addDefAcceso({ definicion_id: def.id, usuario_id: selectedUser.id, habilitado: true, justificacion: "Concedido desde gestión de usuarios" })}
                                      title="Conceder acceso explícito"
                                      className="w-6 h-6 rounded-md border border-success/30 text-success hover:bg-success/10 transition-colors flex items-center justify-center"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* -- Matrix quick-add modal ------------------------------------------- */}
      <Dialog open={!!matrixModal} onOpenChange={open => { if (!open) setMatrixModal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Ajuste de permiso
            </DialogTitle>
            <DialogDescription className="text-xs">
              {matrixModal && selectedUser && (() => {
                const mod = ALL_MODULES.find(m => m.value === matrixModal.modulo)?.label;
                const act = ALL_ACTIONS.find(a => a.value === matrixModal.accion)?.label;
                return `${selectedUser.nombre} - ${act} en ${mod}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {matrixModal && (
            <div className="space-y-4 py-1">
              {/* Habilitado toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">?Permitir esta acción?</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={matrixModal.habilitado}
                    onCheckedChange={v => setMatrixModal(m => m ? { ...m, habilitado: v } : m)}
                  />
                  <span className={cn("text-xs font-medium", matrixModal.habilitado ? "text-success" : "text-destructive")}>
                    {matrixModal.habilitado ? "Permitido" : "Bloqueado"}
                  </span>
                </div>
              </div>

              {/* Redundancy warning */}
              {selectedUser && (() => {
                const baseHas = getRoleBasePermissions(selectedUser.roleKey, matrixModal.modulo).includes(matrixModal.accion);
                const isRedundant = (baseHas && matrixModal.habilitado) || (!baseHas && !matrixModal.habilitado);
                if (!isRedundant) return null;
                return (
                  <div className="rounded-lg p-2.5 border bg-amber-500/10 border-amber-500/30 text-amber-600 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Redundante: el rol <strong>{selectedUser.rol}</strong> ya {baseHas ? "tiene" : "no tiene"} ese permiso base.
                    </span>
                  </div>
                );
              })()}

              {/* Informes ? guía rápida de permisos (solo cuando módulo = informes) */}
              {matrixModal?.modulo === "informes" && (() => {
                const info = INFORMES_ACCION_INFO[matrixModal.accion];
                if (!info) return null;
                return (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-700/40 dark:bg-blue-900/10 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <FileText className="w-3 h-3" /> Informes ? qué hace esta acción
                    </p>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {matrixModal.accion[0].toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-blue-800 dark:text-blue-200 capitalize">{matrixModal.accion}</span>
                        {info.importante && (
                          <span className="ml-1.5 text-[8px] font-semibold px-1 py-px rounded bg-blue-200/70 dark:bg-blue-700/40 text-blue-700 dark:text-blue-300 uppercase">clave</span>
                        )}
                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">{info.desc}</p>
                      </div>
                    </div>
                    {/* All actions quick overview */}
                    <div className="pt-1.5 border-t border-blue-200/60 dark:border-blue-700/30 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {(Object.entries(INFORMES_ACCION_INFO) as [ActionPermission, typeof info][]).map(([accion, i]) => (
                        <div key={accion} className={cn(
                          "flex items-center gap-1 text-[9px] rounded px-1 py-0.5",
                          accion === matrixModal.accion
                            ? "bg-blue-200/60 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 font-semibold"
                            : "text-blue-500/70 dark:text-blue-400/50",
                        )}>
                          <span className="font-mono capitalize w-12 shrink-0">{accion}</span>
                          <span className="truncate">{i.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Justification */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Justificación <span className="text-destructive">*</span>
                </Label>
                <Input
                  autoFocus
                  value={matrixJustif}
                  onChange={e => setMatrixJustif(e.target.value)}
                  placeholder="Ej: Permiso temporal para auditoría Q1"
                  onKeyDown={e => { if (e.key === "Enter") handleMatrixConfirm(); }}
                />
                <p className="text-[10px] text-muted-foreground">
                  Se registra para auditoría interna.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMatrixModal(null)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleMatrixConfirm}
              disabled={
                !matrixJustif.trim() ||
                (!!matrixModal?.habilitado && !canGrantAction(matrixModal.modulo, matrixModal.accion))
              }
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Guardar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Bulk assign formularios modal ------------------------------------ */}
      <Dialog open={bulkModal} onOpenChange={open => { if (!open) setBulkModal(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ListFilter className="w-5 h-5 text-primary" />
              Asignación masiva de formularios
            </DialogTitle>
            <DialogDescription className="text-xs">
              Asignar acceso a {checkedIds.size} usuario{checkedIds.size !== 1 ? "s" : ""} seleccionado{checkedIds.size !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Selected users preview */}
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {Array.from(checkedIds).map(uid => {
                const u = users.find(x => x.id === uid);
                if (!u) return null;
                return (
                  <span key={uid} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border">
                    {initials(u.nombre)}
                    <span className="text-muted-foreground">{u.nombre.split(" ")[0]}</span>
                  </span>
                );
              })}
            </div>

            {/* Action toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tipo de acceso</Label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkAction("permitir")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md border transition-colors",
                    bulkAction === "permitir"
                      ? "bg-success/15 border-success/40 text-success font-medium"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  ? Permitir
                </button>
                <button
                  onClick={() => setBulkAction("bloquear")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md border transition-colors",
                    bulkAction === "bloquear"
                      ? "bg-destructive/15 border-destructive/40 text-destructive font-medium"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  ? Bloquear
                </button>
              </div>
            </div>

            {/* Formulario list with checkboxes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Seleccionar formularios</Label>
              <div className="space-y-2 max-h-[280px] overflow-y-auto border border-border rounded-lg p-2.5">
                {MODULO_OPTIONS.map(m => {
                  const defs = definiciones.filter(d => d.modulo === m.value && d.estado === "activo");
                  if (defs.length === 0) return null;
                  const allChecked = defs.every(d => bulkDefIds.has(d.id));
                  return (
                    <div key={m.value}>
                      <button
                        onClick={() => {
                          const next = new Set(bulkDefIds);
                          if (allChecked) defs.forEach(d => next.delete(d.id));
                          else defs.forEach(d => next.add(d.id));
                          setBulkDefIds(next);
                        }}
                        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left"
                      >
                        {allChecked
                          ? <CheckSquare className="w-3 h-3 text-primary" />
                          : <Square className="w-3 h-3" />}
                        {m.label}
                      </button>
                      <div className="space-y-0.5 ml-4">
                        {defs.map(def => (
                          <button
                            key={def.id}
                            onClick={() => {
                              const next = new Set(bulkDefIds);
                              if (next.has(def.id)) next.delete(def.id);
                              else next.add(def.id);
                              setBulkDefIds(next);
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs transition-colors",
                              bulkDefIds.has(def.id)
                                ? "bg-primary/5 text-foreground"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                            )}
                          >
                            {bulkDefIds.has(def.id)
                              ? <CheckSquare className="w-3 h-3 text-primary shrink-0" />
                              : <Square className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{def.nombre}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {bulkDefIds.size > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {bulkDefIds.size} formulario{bulkDefIds.size !== 1 ? "s" : ""} seleccionado{bulkDefIds.size !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkModal(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={bulkDefIds.size === 0}
              onClick={() => {
                const habilitado = bulkAction === "permitir";
                const justif = habilitado
                  ? "Acceso concedido en asignación masiva"
                  : "Acceso bloqueado en asignación masiva";
                checkedIds.forEach(userId => {
                  bulkDefIds.forEach(defId => {
                    // Remove existing override if any
                    const existing = getDefAccesos(defId).find(a => a.usuario_id === userId);
                    if (existing) removeDefAcceso(existing.id);
                    addDefAcceso({ definicion_id: defId, usuario_id: userId, habilitado, justificacion: justif });
                  });
                });
                setBulkModal(false);
                setCheckedIds(new Set());
              }}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Aplicar a {checkedIds.size} usuario{checkedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog Crear / Editar Usuario ------------------------------------ */}
      <Dialog open={userModal} onOpenChange={setUserModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-primary" />
              {editingUserId ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Modifica los datos del usuario. Los cambios se aplicarán inmediatamente."
                : "Completa la información para crear un nuevo acceso al sistema."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

              {/* -- Columna izquierda: formulario ----------------------- */}
              <div className="space-y-5">

                {/* Sección 1: Datos personales */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Datos personales</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-nombre" className="text-xs font-medium">
                        Nombre completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="usr-nombre"
                        value={formNombre}
                        onChange={e => setFormNombre(e.target.value)}
                        placeholder="Juan Pérez"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-email" className="text-xs font-medium">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="usr-email"
                        type="email"
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        placeholder="usuario@empresa.com"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="usr-pass" className="text-xs font-medium">
                        Contraseña {!editingUserId && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="usr-pass"
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder={editingUserId ? "Dejar vacío para mantener" : "Mínimo 6 caracteres"}
                        className="h-9"
                      />
                      {editingUserId && (
                        <p className="text-[10px] text-muted-foreground">Dejar vacío para mantener la contraseña actual</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección 2: Rol y permisos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Rol y permisos</h3>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-role" className="text-xs font-medium">
                      Rol <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="usr-role"
                      value={formRole}
                      onChange={e => {
                        const r = e.target.value as UserRoleT;
                        setFormRole(r);
                        if (r !== "productor") setFormProductorId("");
                        setFormModulosActivos(new Set(
                          ALL_MODULES.filter(m => getRoleBasePermissions(r, m.value).length > 0).map(m => m.value)
                        ));
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {assignableRoles.map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Acciones del rol */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Acciones incluidas</Label>
                    <div className="flex flex-wrap gap-1">
                      {ALL_ACTIONS.map(a => {
                        const has = ACTIONS_BY_ROLE[formRole]?.includes(a.value) ?? false;
                        return (
                          <span
                            key={a.value}
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                              has
                                ? "bg-success/10 text-success"
                                : "bg-muted/40 text-muted-foreground/30 line-through",
                            )}
                          >
                            {has ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                            {a.label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 shrink-0" />
                      Para excepciones usa la <strong>matriz de permisos</strong> tras crear el usuario.
                    </p>
                  </div>

                  {/* Módulos habilitados */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      Módulos habilitados
                      <span className="text-muted-foreground font-normal ml-auto text-[10px]">
                        {formModulosActivos.size}/{formRoleModulos.length}
                      </span>
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {formRoleModulos.map(mod => {
                        const isActive = formModulosActivos.has(mod.value);
                        return (
                          <label
                            key={mod.value}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer select-none transition-all",
                              isActive
                                ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                                : "border-border bg-muted/20 opacity-50 hover:opacity-70",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => {
                                setFormModulosActivos(prev => {
                                  const next = new Set(prev);
                                  if (next.has(mod.value)) next.delete(mod.value);
                                  else next.add(mod.value);
                                  return next;
                                });
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-3 w-3 shrink-0"
                            />
                            <span className={cn("text-[11px] font-medium flex-1 truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                              {mod.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {formModulosActivos.size === 0 && formRoleModulos.length > 0 && (
                      <p className="text-[10px] text-destructive">Debes habilitar al menos un módulo.</p>
                    )}
                  </div>
                </div>

                {/* Sección 3: Empresa y área */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Empresa y área</h3>
                  </div>

                  {/* Cliente (empresa) */}
                  {isSuperAdmin ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-cliente" className="text-xs font-medium">
                        Empresa <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="usr-cliente"
                        value={formClienteId}
                        onChange={e => {
                          const val = e.target.value ? Number(e.target.value) : "";
                          setFormClienteId(val);
                          setFormProductorId("");
                        }}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">? Sin asignar (Plataforma) ?</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  ) : isClienteAdmin ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Empresa</Label>
                      <div className="h-9 bg-muted/40 rounded-md px-3 py-2 flex items-center text-sm text-muted-foreground">
                        {clientes.find(c => c.id === currentClienteId)?.nombre ?? "N/D"}
                      </div>
                    </div>
                  ) : null}

                  {/* Productor */}
                  {formProductores.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-productor" className="text-xs font-medium">
                        Productor {formRole === "productor" && <span className="text-destructive">*</span>}
                      </Label>
                      <select
                        id="usr-productor"
                        value={formProductorId}
                        onChange={e => setFormProductorId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Sin productor</option>
                        {formProductores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        Limita la visibilidad de datos a un productor específico.
                      </p>
                    </div>
                  )}

                  {/* área asignada */}
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-area" className="text-xs font-medium">área asignada</Label>
                    <Input
                      id="usr-area"
                      value={formAreaAsignada}
                      onChange={e => setFormAreaAsignada(e.target.value)}
                      placeholder="Ej: Cosecha, Laboratorio, Campo"
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Opcional: departamento o sección de trabajo</p>
                  </div>

                  {/* Estado activo */}
                  {editingUserId && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Label htmlFor="usr-activo" className="text-xs font-medium">Usuario activo</Label>
                      <Switch
                        id="usr-activo"
                        checked={formActivo}
                        onCheckedChange={setFormActivo}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* -- Columna derecha: vista previa ----------------------- */}
              <div className="hidden lg:block space-y-3">
                <div className="sticky top-0 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vista previa</span>
                  </div>

                  {/* Card de usuario */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    {/* Avatar y nombre */}
                    <div className="px-4 pt-4 pb-3 flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-border flex items-center justify-center">
                        <Users2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className={cn("text-sm font-semibold truncate", !formNombre.trim() && "text-muted-foreground italic")}>
                          {formNombre.trim() || "Nombre del usuario"}
                        </p>
                        <p className={cn("text-xs truncate", formEmail.trim() ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                          {formEmail.trim() || "email@ejemplo.com"}
                        </p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 pb-3 space-y-2.5 border-t bg-muted/10 pt-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rol</span>
                        <span className="ml-auto text-xs font-semibold text-primary">
                          {assignableRoles.find(([k]) => k === formRole)?.[1] ?? formRole}
                        </span>
                      </div>

                      {(formClienteId || currentClienteId) && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Empresa</span>
                          <span className="ml-auto text-xs font-medium truncate">
                            {clientes.find(c => c.id === (isSuperAdmin ? formClienteId : currentClienteId))?.nombre ?? "N/D"}
                          </span>
                        </div>
                      )}

                      {formProductorId && formProductores.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tractor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Productor</span>
                          <span className="ml-auto text-xs font-medium truncate">
                            {formProductores.find(p => p.id === formProductorId)?.nombre ?? "N/D"}
                          </span>
                        </div>
                      )}

                      {formAreaAsignada.trim() && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">área</span>
                          <span className="ml-auto text-xs font-medium truncate">
                            {formAreaAsignada}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Módulos */}
                    {formModulosActivos.size > 0 && (
                      <div className="px-4 pb-3 border-t pt-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Módulos ({formModulosActivos.size})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(formModulosActivos).map(modKey => {
                            const mod = formRoleModulos.find(m => m.value === modKey);
                            return mod ? (
                              <span key={modKey} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {mod.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Validación visual */}
                  <div className="space-y-1.5 px-1">
                    {[
                      { ok: formNombre.trim(), label: "Nombre completo" },
                      { ok: formEmail.trim() && formEmail.includes("@"), label: "Email válido" },
                      { ok: editingUserId || formPassword.trim().length >= 6, label: "Contraseña (mín. 6 caracteres)" },
                      { ok: formModulosActivos.size > 0 || formRoleModulos.length === 0, label: "Al menos 1 módulo activo" },
                      { ok: formRole !== "productor" || !formProductores.length || formProductorId, label: "Productor asignado" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {item.ok ? (
                          <Check className="w-3 h-3 text-success shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={cn("text-[10px]", item.ok ? "text-success" : "text-muted-foreground/60")}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setUserModal(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={
                !formNombre.trim() ||
                !formEmail.trim() ||
                (!editingUserId && !formPassword.trim()) ||
                (formRole === "productor" && formProductores.length > 0 && !formProductorId) ||
                (formModulosActivos.size === 0 && formRoleModulos.length > 0)
              }
              onClick={handleSaveUser}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {editingUserId ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Dialog Confirmar Activación/Desactivación ------------------------- */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const u = contextUsers.find(x => x.id === deleteConfirm);
                const isActive = u?.activo !== false;
                return (
                  <>
                    {isActive ? (
                      <UserX className="w-5 h-5 text-amber-500" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-green-500" />
                    )}
                    {isActive ? "Desactivar usuario" : "Activar usuario"}
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const u = contextUsers.find(x => x.id === deleteConfirm);
                const isActive = u?.activo !== false;
                return u
                  ? (
                      isActive
                        ? <>¿Desactivar a <strong>{u.nombre}</strong> ({u.email})? No podrá iniciar sesión hasta que se reactive.</>
                        : <>¿Activar a <strong>{u.nombre}</strong> ({u.email})? Podrá iniciar sesión nuevamente.</>
                    )
                  : "¿Estás seguro?";
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant={(() => {
                const u = contextUsers.find(x => x.id === deleteConfirm);
                const isActive = u?.activo !== false;
                return isActive ? "secondary" : "default";
              })()}
              size="sm"
              onClick={() => deleteConfirm !== null && handleToggleUserActive(deleteConfirm)}
            >
              {(() => {
                const u = contextUsers.find(x => x.id === deleteConfirm);
                const isActive = u?.activo !== false;
                return (
                  <>
                    {isActive ? (
                      <UserX className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {isActive ? "Desactivar" : "Activar"}
                  </>
                );
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Componente principal -----------------------------------------------------

const Configuracion = () => {
  const [searchParams] = useSearchParams();
  const validTabs      = ["cultivos", "formularios", "usuarios"];
  // "campos" is an alias for "formularios" used by the "Editar campos del formulario" button
  const rawTab         = searchParams.get("tab") ?? "";
  const actionParam    = (searchParams.get("action") ?? "").toLowerCase();
  const initialTab     = rawTab === "campos" ? "formularios" : validTabs.includes(rawTab) ? rawTab : "cultivos";
  const autoOpenFormCreate = actionParam === "create-form" || actionParam === "crear-formulario";
  const autoOpenUserCreate = actionParam === "add-user" || actionParam === "create-user" || actionParam === "agregar-usuario";
  const highlightDefId = searchParams.get("def") ?? undefined;
  const [activeTab, setActiveTab] = useState(initialTab);
  const { hasPendingChanges: hasPending, setHasPendingChanges: setHasPending } = useConfig();
  const { currentClienteName } = useRole();

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description={`Cultivos, formularios y usuarios \u00B7 ${currentClienteName}`}
      />

      <Tabs
        value={activeTab}
        onValueChange={tab => {
          if (hasPending) return;
          setActiveTab(tab);
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted p-1 rounded-lg gap-1 h-auto">
          <TabsTrigger
            value="cultivos"
            disabled={hasPending && activeTab !== "cultivos"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Cultivos
          </TabsTrigger>
          <TabsTrigger
            value="formularios"
            disabled={hasPending && activeTab !== "formularios"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Formularios
          </TabsTrigger>
          <TabsTrigger
            value="empresas"
            disabled={hasPending && activeTab !== "empresas"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Empresas
          </TabsTrigger>
          <TabsTrigger
            value="usuarios"
            disabled={hasPending && activeTab !== "usuarios"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Users2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Usuarios
          </TabsTrigger>
        </TabsList>

        {hasPending && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            Completa los campos requeridos (<span className="text-destructive font-bold">*</span>) antes de cambiar de pestaña o agregar otra fila.
          </div>
        )}

        <TabsContent value="cultivos">
          <TabCultivos />
        </TabsContent>
        <TabsContent value="formularios">
          <TabFormularios
            onPendingChange={setHasPending}
            highlightDefId={highlightDefId}
            autoOpenCreateModal={autoOpenFormCreate}
          />
        </TabsContent>
        <TabsContent value="empresas">
          <TabEmpresas />
        </TabsContent>
        <TabsContent value="usuarios">
          <TabUsuarios autoOpenCreateModal={autoOpenUserCreate} />
        </TabsContent>
      </Tabs>

    </MainLayout>
  );
};

export default Configuracion;


