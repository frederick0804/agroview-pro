import { useState, useRef, useEffect, useMemo } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Layers, List, Palette, Settings2, BookOpen,
  Upload, X, Plus,
  Trash2, Info, CheckCircle2, Check, Clock, Archive, Leaf, Search, Copy, History,
  ChevronDown, RotateCcw, Power, XCircle, LayoutList, ArrowLeftRight, Lock, CheckSquare, Square, ListFilter, Zap,
  Ruler, Scale, Network, ChevronRight, ArrowUp, ArrowDown,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { useTheme, DEFAULT_THEME } from "@/contexts/ThemeContext";
import {
  useRole,
  ALL_MODULES, ALL_ACTIONS, ACTIONS_BY_ROLE,
  ROLE_LEVELS,
  type UserRole as UserRoleT, type ActionPermission,
} from "@/contexts/RoleContext";
import {
  tipoBadgeColor, tipoLabels, estadoBadge,
  type ModDef, type ModParam, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad, type Calibre, type NivelEstructura,
} from "@/config/moduleDefinitions";
import { VersionDiffDialog } from "@/components/dashboard/VersionDiffDialog";
import { CampoConfigDrawer } from "@/components/dashboard/CampoConfigDrawer";
import {
  Shield, ShieldCheck, Sprout as SproutIcon, Briefcase, Eye,
  BookOpen as BookOpenAlt, Mail, Calendar,
  ShieldAlert, AlertTriangle, Users2, Building2, Tractor, Pencil, Globe,
} from "lucide-react";

// ─── InfoBanner (dismissible) ─────────────────────────────────────────────────

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

// ─── Constantes de acceso por definición ──────────────────────────────────────

const NIVEL_ACCESS_OPTIONS = [
  { value: 1, label: "Lector",        icon: "🔓" },
  { value: 2, label: "Supervisor",    icon: "👁" },
  { value: 3, label: "Jefe de Área",  icon: "🗂" },
  { value: 4, label: "Productor",     icon: "🌱" },
  { value: 5, label: "Cliente Admin", icon: "🏢" },
  { value: 6, label: "Super Admin",   icon: "⚡" },
];

// Claves de rol en el mismo orden jerárquico
const ROLE_ACCESS_OPTIONS: { value: string; label: string; short: string }[] = [
  { value: "lector",        label: "Lector",        short: "Lector" },
  { value: "supervisor",    label: "Supervisor",     short: "Superv." },
  { value: "jefe_area",     label: "Jefe de Área",  short: "J.Área" },
  { value: "productor",     label: "Productor",      short: "Product." },
  { value: "cliente_admin", label: "Cliente Admin",  short: "C.Admin" },
  { value: "super_admin",   label: "Super Admin",    short: "S.Admin" },
];

// ─── Version helpers ──────────────────────────────────────────────────────────

const bumpV = (v: string, kind: "minor" | "major"): string => {
  const parts = (v ?? "1.0").split(".").map(n => parseInt(n) || 0);
  const maj = parts[0] ?? 1;
  const min = parts[1] ?? 0;
  return kind === "minor" ? `${maj}.${min + 1}` : `${maj + 1}.0`;
};

// ─── EstadoIcon ───────────────────────────────────────────────────────────────

function EstadoIcon({ estado }: { estado: EstadoDef }) {
  if (estado === "activo")    return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (estado === "borrador")  return <Clock        className="w-3.5 h-3.5 text-yellow-600" />;
  return                             <Archive       className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Biblioteca interna (usada en Sheet desde TabFormularios) ─────────────────

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
      <InfoBanner storageKey="biblioteca">
        <strong>Biblioteca Global</strong> — catálogo de campos reutilizables en cualquier módulo.
        Al agregar un campo a una definición, se sugiere desde aquí.
      </InfoBanner>
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

// ─── Hub de Formularios ───────────────────────────────────────────────────────
// Hub central: tarjetas de formularios con campos inline, biblioteca en Sheet,
// gestión de versiones y configuración avanzada de campos.

function TabFormularios({ onPendingChange }: { onPendingChange?: (v: boolean) => void }) {
  const {
    definiciones, allDefiniciones, parametros, datos, cultivos, allCultivos, parametrosLib,
    addDef, addEvento, updDef, delDef, dupDef, copyDefToClient,
    addPar, updParFull, delParByIdx,
    getDefAccesos, addDefAcceso, removeDefAcceso,
  } = useConfig();
  const { role, clientes, productores, users: allUsers } = useRole();
  const isSuperAdmin = role === "super_admin";

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [searchDef,       setSearchDef]       = useState("");
  const [expandedCampos,  setExpandedCampos]  = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [expandedEventos, setExpandedEventos] = useState<Set<string>>(new Set());
  const [configCampoId,   setConfigCampoId]   = useState<string | null>(null);
  const [showBiblioteca,  setShowBiblioteca]  = useState(false);
  const [addCampoModal,   setAddCampoModal]   = useState<{ defId: string; rootId: string } | null>(null);
  const [campoSearch,     setCampoSearch]     = useState("");
  const [selectedLibIds,  setSelectedLibIds]  = useState<Set<string>>(new Set());
  const [createNewCampo,  setCreateNewCampo]  = useState(false);

  // Super admin: filtro por cliente y productor
  const [selectedClienteFilter, setSelectedClienteFilter] = useState<number | null>(null);
  const [selectedProductorFilter, setSelectedProductorFilter] = useState<number | null>(null);
  const [showCopyDialog,        setShowCopyDialog]        = useState(false);
  const [copySourceClienteId,   setCopySourceClienteId]   = useState<number | null>(null);
  const [copySelectedDefs,      setCopySelectedDefs]      = useState<Set<string>>(new Set());

  // Reset productor cuando cambia el cliente
  useEffect(() => {
    setSelectedProductorFilter(null);
  }, [selectedClienteFilter]);

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

  // ── Evento creation dialog ──────────────────────────────────────────────────
  const [addEventoModal, setAddEventoModal] = useState<{
    registroId: string; modulo: string;
  } | null>(null);
  const [newEventoNombre, setNewEventoNombre]         = useState("");
  const [newEventoDescripcion, setNewEventoDescripcion] = useState("");
  const [expandedEvDetail, setExpandedEvDetail] = useState<Set<string>>(new Set());
  const toggleEvDetail = (evId: string) =>
    setExpandedEvDetail(prev => { const n = new Set(prev); n.has(evId) ? n.delete(evId) : n.add(evId); return n; });

  // ── Bulk access dialog ───────────────────────────────────────────────────────
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
      // Solo empresa → excluir formularios de productores específicos
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

  const families = useMemo(() => {
    // Exclude evento defs — they appear nested inside their parent registro card
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


  return (
    <div className="space-y-5">

      {/* ── Barra de herramientas ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchDef}
            onChange={e => setSearchDef(e.target.value)}
            placeholder="Buscar formulario…"
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
            {/* Filtro productor — solo visible cuando hay empresa seleccionada */}
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
          <Button variant="outline" size="sm" onClick={() => setShowBiblioteca(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            Biblioteca
          </Button>
          {isSuperAdmin && selectedClienteFilter !== null && (
            <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)}>
              <Copy className="w-4 h-4 mr-1.5" />
              Copiar desde empresa
            </Button>
          )}
          <Button size="sm" onClick={() => addDef(undefined, undefined, selectedClienteFilter ?? undefined, selectedProductorFilter ?? undefined)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva definición
          </Button>
        </div>
      </div>

      {/* ── Banner de contexto ────────────────────────────────────────────────── */}
      {(() => {
        const selectedCliente = selectedClienteFilter !== null ? clientes.find(c => c.id === selectedClienteFilter) : null;
        const selectedProductor = selectedProductorFilter !== null ? productores.find(p => p.id === selectedProductorFilter) : null;
        const defsCount = effectiveDefs.filter(d => !d.registro_padre_id).length;
        const clientesConDefs = new Set(allDefiniciones.map(d => d.cliente_id).filter(Boolean)).size;

        // Super admin sin filtro → global
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
                  {selectedCliente?.nombre} <span className="font-normal text-amber-500">›</span> {selectedProductor.nombre}
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

      {/* ── Estado vacío ──────────────────────────────────────────────────── */}
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
            <Button onClick={() => addDef(undefined, undefined, selectedClienteFilter ?? undefined, selectedProductorFilter ?? undefined)}>
              <Plus className="w-4 h-4 mr-2" /> Nueva definición
            </Button>
          )}
        </div>
      )}

      {/* ── Tarjetas agrupadas por módulo ─────────────────────────────────── */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {families.map(({ rootId, versions, latest, rep }) => {
            const campos       = parametros.filter(p => p.definicion_id === latest.id);
            const hasHistory   = versions.length > 1;
            const isExpCampos  = expandedCampos.has(rootId);
            const isExpHistory = expandedHistory.has(rootId);
            const isExpEventos = expandedEventos.has(rootId);
            // Eventos vinculados a este registro
            const eventos      = definiciones.filter(d => d.registro_padre_id === latest.id);
            // Protección: no permitir desactivar si es la única versión no archivada y ya tiene datos
            const defDatos            = datos.filter(d => d.definicion_id === latest.id);
            const otherLiveVersions   = versions.filter(v => v.id !== latest.id && v.estado !== "archivado");
            const blockDeactivate     = latest.estado === "activo"
                                        && otherLiveVersions.length === 0
                                        && defDatos.length > 0;

            return (
              <div key={rootId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">

                {/* ── Cabecera ──────────────────────────────────────────── */}
                <div className="px-4 pt-3.5 pb-3 border-b border-border bg-muted/20">
                  {/* Badges + controles de versión */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none",
                        tipoBadgeColor[rep.tipo as TipoConfig] ?? "bg-gray-100 text-gray-700",
                      )}>
                        {tipoLabels[rep.tipo as TipoConfig] ?? rep.tipo}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5",
                        estadoBadge[rep.estado ?? "borrador"],
                      )}>
                        <EstadoIcon estado={rep.estado ?? "borrador"} />
                        {rep.estado ?? "borrador"}
                      </span>
                      {hasHistory && (
                        <button
                          onClick={() => toggleExpandHistory(rootId)}
                          className={cn(
                            "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none transition-colors",
                            isExpHistory
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
                          )}
                          title={isExpHistory ? "Ocultar historial" : "Ver historial de versiones"}
                        >
                          <History className="w-2.5 h-2.5" />
                          {versions.length}v
                        </button>
                      )}
                      {/* Badge de empresa cuando se ven todas */}
                      {isSuperAdmin && selectedClienteFilter === null && latest.cliente_id && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          <Building2 className="w-2.5 h-2.5" />
                          {clientes.find(c => c.id === latest.cliente_id)?.nombre ?? `#${latest.cliente_id}`}
                        </span>
                      )}
                      {/* Badge de productor cuando corresponde */}
                      {isSuperAdmin && latest.productor_id && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                          <Tractor className="w-2.5 h-2.5" />
                          {productores.find(p => p.id === latest.productor_id)?.nombre ?? `Productor #${latest.productor_id}`}
                        </span>
                      )}
                    </div>

                    {/* Controles de versión */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        v{latest.version || "1.0"}
                      </span>
                      <button
                        onClick={() => {
                          const idx = definiciones.findIndex(d => d.id === latest.id);
                          if (idx !== -1) updDef(idx, "version", bumpV(latest.version || "1.0", "minor"));
                        }}
                        title="Incrementar versión menor (ej. 1.0 → 1.1)"
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                      >
                        +0.1
                      </button>
                      <button
                        onClick={() => setConfirmDup({
                          rootId,
                          sourceId:      latest.id,
                          sourceName:    latest.nombre,
                          sourceVersion: latest.version || "1.0",
                          newVersion:    bumpV(latest.version || "1.0", "major"),
                          paramCount:    parametros.filter(p => p.definicion_id === latest.id).length,
                          newName:       latest.nombre,
                        })}
                        title="Nueva versión mayor"
                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {hasHistory && (
                        <button
                          onClick={() => setCompareRootId(rootId)}
                          title="Comparar versiones"
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                        </button>
                      )}
                      {/* Activar / Desactivar versión actual */}
                      {latest.estado !== "archivado" && (
                        <button
                          disabled={blockDeactivate}
                          onClick={() => {
                            if (blockDeactivate) return;
                            const idx = definiciones.findIndex(d => d.id === latest.id);
                            if (idx === -1) return;
                            const newEstado = latest.estado === "activo" ? "borrador" : "activo";
                            updDef(idx, "estado", newEstado);
                          }}
                          title={
                            blockDeactivate
                              ? `Tiene ${defDatos.length} dato${defDatos.length !== 1 ? "s" : ""} registrado${defDatos.length !== 1 ? "s" : ""} — crea otra versión primero`
                              : latest.estado === "activo" ? "Desactivar (→ borrador)" : "Activar"
                          }
                          className={cn(
                            "p-1 rounded transition-colors",
                            blockDeactivate
                              ? "text-muted-foreground/40 cursor-not-allowed"
                              : latest.estado === "activo"
                                ? "text-green-600 hover:text-yellow-600 hover:bg-yellow-500/10"
                                : "text-muted-foreground hover:text-green-600 hover:bg-green-500/10",
                          )}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                      )}
                      {/* Eliminar — solo cuando es borrador */}
                      {latest.estado === "borrador" && (
                        <button
                          onClick={() => setConfirmDelId(latest.id)}
                          title="Eliminar definición (solo borradores)"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {/* Archivar */}
                      {latest.estado !== "archivado" && (
                        <button
                          onClick={() => {
                            const others = versions.filter(v => v.id !== latest.id && v.estado !== "archivado");
                            setArchiveActivateId(others[0]?.id ?? "");
                            setArchiveModal({ defId: latest.id, rootId, nombre: latest.nombre, version: latest.version || "1.0", otherVersions: others });
                          }}
                          title="Archivar esta versión"
                          className="p-1 rounded text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                      )}
                      {/* Restaurar si está archivado */}
                      {latest.estado === "archivado" && (
                        <button
                          onClick={() => {
                            const idx = definiciones.findIndex(d => d.id === latest.id);
                            if (idx !== -1) updDef(idx, "estado", "borrador");
                          }}
                          title="Restaurar a borrador"
                          className="p-1 rounded text-amber-600 hover:bg-amber-500/10 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nombre y metadatos */}
                  <div className="mt-2">
                    <input
                      value={latest.nombre}
                      onChange={e => {
                        const idx = definiciones.findIndex(d => d.id === latest.id);
                        if (idx !== -1) updDef(idx, "nombre", e.target.value);
                      }}
                      placeholder="(sin nombre)"
                      className="font-semibold text-foreground leading-snug w-full bg-transparent outline-none placeholder:italic placeholder:text-muted-foreground hover:bg-muted/30 focus:bg-background focus:px-1.5 focus:rounded focus:border focus:border-primary/40 transition-all text-sm"
                    />
                    {/* Row 1: módulo · cultivo */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{MODULO_OPTIONS.find(m => m.value === latest.modulo)?.label ?? latest.modulo}</span>
                      <span>·</span>
                      <select
                        value={latest.cultivo_id ?? ""}
                        onChange={e => {
                          const idx = definiciones.findIndex(d => d.id === latest.id);
                          if (idx !== -1) updDef(idx, "cultivo_id", e.target.value || undefined);
                        }}
                        onClick={e => e.stopPropagation()}
                        title="Alcance del formulario"
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer outline-none transition-colors",
                          latest.cultivo_id
                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        <option value="">🌐 Global — todos los cultivos</option>
                        {cardCultivos.map(c => (
                          <option key={c.id} value={c.id}>🌿 {c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 2: control de acceso — nivel mínimo + roles excluidos */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap" onClick={e => e.stopPropagation()}>
                      <Lock className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />

                      {/* Nivel mínimo selector */}
                      <select
                        value={latest.nivel_minimo}
                        onChange={e => {
                          const idx = definiciones.findIndex(d => d.id === latest.id);
                          if (idx !== -1) updDef(idx, "nivel_minimo", Number(e.target.value));
                        }}
                        title="Nivel de acceso mínimo requerido"
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer outline-none transition-colors",
                          latest.nivel_minimo > 1
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {NIVEL_ACCESS_OPTIONS.map(n => (
                          <option key={n.value} value={n.value}>
                            {n.icon} {n.label} (Nv.{n.value})
                          </option>
                        ))}
                      </select>

                      {/* Chips de roles excluidos */}
                      {(latest.roles_excluidos ?? []).map(r => {
                        const rOpt = ROLE_ACCESS_OPTIONS.find(x => x.value === r);
                        return (
                          <span
                            key={r}
                            className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                          >
                            {rOpt?.short ?? r}
                            <button
                              onClick={() => {
                                const idx = definiciones.findIndex(d => d.id === latest.id);
                                if (idx !== -1)
                                  updDef(idx, "roles_excluidos",
                                    (latest.roles_excluidos ?? []).filter(x => x !== r));
                              }}
                              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none"
                              title={`Quitar exclusión de ${rOpt?.label ?? r}`}
                            >×</button>
                          </span>
                        );
                      })}

                      {/* Selector para agregar rol excluido */}
                      {(() => {
                        const excluded = latest.roles_excluidos ?? [];
                        const available = ROLE_ACCESS_OPTIONS.filter(r => !excluded.includes(r.value));
                        if (available.length === 0) return null;
                        return (
                          <select
                            value=""
                            onChange={e => {
                              if (!e.target.value) return;
                              const idx = definiciones.findIndex(d => d.id === latest.id);
                              if (idx !== -1)
                                updDef(idx, "roles_excluidos", [...excluded, e.target.value]);
                            }}
                            title="Excluir un rol de este formulario"
                            className="text-[9px] px-1.5 py-0.5 rounded-full border border-dashed border-border cursor-pointer outline-none text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors bg-transparent"
                          >
                            <option value="">+ excluir rol</option>
                            {available.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    {/* Row 3: overrides por usuario ─────────────────────── */}
                    {(() => {
                      const accesos = getDefAccesos(latest.id);
                      const nAllow  = accesos.filter(a => a.habilitado).length;
                      const nBlock  = accesos.filter(a => !a.habilitado).length;
                      return (
                        <div
                          className="flex items-center gap-1.5 mt-1 flex-wrap cursor-default"
                          onClick={e => e.stopPropagation()}
                        >
                          <Users2 className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />

                          {accesos.length === 0 ? (
                            <span className="text-[9px] text-muted-foreground/50 italic">Sin overrides</span>
                          ) : (
                            <>
                              {nAllow > 0 && (
                                <span className="text-[9px] font-medium text-success">✓ {nAllow}</span>
                              )}
                              {nBlock > 0 && (
                                <span className="text-[9px] font-medium text-destructive">✕ {nBlock}</span>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => {
                              setAccesosModal(latest.id);
                              setAccSearch("");
                              setAccFilter("todos");
                              setAccSelected(new Set());
                            }}
                            className="ml-auto text-[9px] font-medium text-primary hover:underline transition-colors shrink-0"
                          >
                            Gestionar accesos →
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── Historial de versiones (expandible) ───────────────── */}
                {isExpHistory && hasHistory && (
                  <div className="px-4 py-3 border-b border-border bg-muted/10">
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

                {/* ── Sección de Campos ──────────────────────────────────── */}
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
                    <div className="mt-2.5 space-y-1">
                      {campos.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 px-1">Sin campos configurados.</p>
                      ) : (
                        campos.sort((a, b) => a.orden - b.orden).map(campo => (
                          <div
                            key={campo.id}
                            className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group/campo"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {campo.obligatorio && (
                                <span className="text-destructive font-bold text-[10px] shrink-0" title="Obligatorio">*</span>
                              )}
                              <input
                                value={campo.nombre}
                                onChange={e => updParFull(campo.id, { nombre: e.target.value })}
                                placeholder="sin nombre"
                                className="text-xs font-medium text-foreground bg-transparent outline-none flex-1 min-w-0 placeholder:italic placeholder:text-muted-foreground hover:bg-muted/50 focus:bg-background focus:px-1.5 focus:rounded focus:border focus:border-primary/40 transition-all"
                              />
                              <select
                                value={campo.tipo_dato}
                                onChange={e => updParFull(campo.id, { tipo_dato: e.target.value as TipoDato })}
                                className="text-[10px] text-muted-foreground shrink-0 bg-background border border-border px-1 py-0.5 rounded cursor-pointer hover:border-primary/40 focus:border-primary/60 focus:outline-none transition-colors"
                              >
                                {TIPO_DATO_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
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
                        ))
                      )}
                      <button
                        onClick={() => {
                          setSelectedLibIds(new Set());
                          setCampoSearch("");
                          setCreateNewCampo(false);
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

                {/* ── Sección de Eventos vinculados ──────────────────────── */}
                <div className="px-4 py-3 border-t border-border">
                  <button
                    onClick={() => toggleExpandEventos(rootId)}
                    className="flex items-center justify-between w-full text-xs group"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Eventos
                      {eventos.length > 0 && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none transition-colors",
                          isExpEventos
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {eventos.length}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        + nuevo
                      </span>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                        isExpEventos && "rotate-180",
                      )} />
                    </div>
                  </button>

                  {isExpEventos && (
                    <div className="mt-2.5 space-y-2">
                      {eventos.length === 0 ? (
                        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                          <Zap className="w-5 h-5 text-amber-400/50" />
                          <p className="text-xs text-muted-foreground">
                            Sin eventos asociados a este registro.
                          </p>
                        </div>
                      ) : (
                        eventos.map(ev => {
                          const evCampos = parametros.filter(p => p.definicion_id === ev.id);
                          const isDetailExp = expandedEvDetail.has(ev.id);
                          return (
                            <div
                              key={ev.id}
                              className="rounded-lg border border-amber-300/25 bg-gradient-to-b from-amber-500/[0.04] to-transparent overflow-hidden transition-all hover:border-amber-300/40"
                            >
                              {/* ── Header row ────────────────────────── */}
                              <div className="flex items-center gap-2 px-3 py-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-card",
                                  ev.estado === "activo"   ? "bg-green-500 ring-green-500/30" :
                                  ev.estado === "borrador" ? "bg-yellow-400 ring-yellow-400/30" : "bg-gray-300 ring-gray-300/30",
                                )} />
                                <input
                                  value={ev.nombre}
                                  onChange={e => {
                                    const idx = definiciones.findIndex(d => d.id === ev.id);
                                    if (idx !== -1) updDef(idx, "nombre", e.target.value);
                                  }}
                                  placeholder="Nombre del evento…"
                                  className="text-xs font-semibold flex-1 min-w-0 bg-transparent outline-none placeholder:italic placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:bg-background focus:px-1.5 focus:rounded focus:border focus:border-amber-400/50 transition-all"
                                />
                                <span className={cn(
                                  "text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none shrink-0 inline-flex items-center gap-0.5",
                                  estadoBadge[ev.estado ?? "borrador"],
                                )}>
                                  <EstadoIcon estado={ev.estado ?? "borrador"} />
                                  {ev.estado}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                                  {evCampos.length} campo{evCampos.length !== 1 ? "s" : ""}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => toggleEvDetail(ev.id)}
                                    title={isDetailExp ? "Ocultar detalle" : "Ver detalle"}
                                    className={cn(
                                      "p-1 rounded transition-colors",
                                      isDetailExp
                                        ? "text-amber-600 bg-amber-500/10"
                                        : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10",
                                    )}
                                  >
                                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isDetailExp && "rotate-180")} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const idx = definiciones.findIndex(d => d.id === ev.id);
                                      if (idx !== -1) updDef(idx, "estado", ev.estado === "activo" ? "borrador" : "activo");
                                    }}
                                    title={ev.estado === "activo" ? "Desactivar" : "Activar"}
                                    className={cn(
                                      "p-1 rounded transition-colors",
                                      ev.estado === "activo"
                                        ? "text-green-600 hover:text-yellow-600 hover:bg-yellow-500/10"
                                        : "text-muted-foreground hover:text-green-600 hover:bg-green-500/10",
                                    )}
                                  >
                                    <Power className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedLibIds(new Set());
                                      setCampoSearch("");
                                      setCreateNewCampo(false);
                                      setAddCampoModal({ defId: ev.id, rootId: ev.id });
                                      setExpandedEventos(prev => new Set([...prev, rootId]));
                                    }}
                                    title="Gestionar campos del evento"
                                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <List className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const idx = definiciones.findIndex(d => d.id === ev.id);
                                      if (idx !== -1) delDef(idx);
                                    }}
                                    title="Eliminar evento"
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* ── Description row (always visible) ───── */}
                              <div className="px-3 pb-2 -mt-0.5">
                                <input
                                  value={ev.descripcion}
                                  onChange={e => {
                                    const idx = definiciones.findIndex(d => d.id === ev.id);
                                    if (idx !== -1) updDef(idx, "descripcion", e.target.value);
                                  }}
                                  placeholder="Agregar descripción del evento…"
                                  className="text-[11px] text-muted-foreground w-full bg-transparent outline-none placeholder:italic placeholder:text-muted-foreground/40 hover:bg-muted/30 focus:bg-background focus:px-1.5 focus:rounded focus:border focus:border-amber-300/40 transition-all"
                                />
                              </div>

                              {/* ── Expandable: field tags preview ────── */}
                              {isDetailExp && (
                                <div className="px-3 pb-2.5 border-t border-amber-200/15 pt-2">
                                  {evCampos.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground/60 italic">
                                      Sin campos configurados —{" "}
                                      <button
                                        onClick={() => {
                                          setSelectedLibIds(new Set());
                                          setCampoSearch("");
                                          setCreateNewCampo(false);
                                          setAddCampoModal({ defId: ev.id, rootId: ev.id });
                                        }}
                                        className="text-amber-600 hover:underline font-medium not-italic"
                                      >
                                        agregar campos
                                      </button>
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {evCampos.sort((a, b) => a.orden - b.orden).map(c => (
                                        <span
                                          key={c.id}
                                          className={cn(
                                            "inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-md leading-none border",
                                            c.obligatorio
                                              ? "bg-amber-100/60 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40"
                                              : "bg-muted/50 text-muted-foreground border-border/50",
                                          )}
                                          title={`${c.nombre} (${c.tipo_dato})${c.obligatorio ? " — obligatorio" : ""}`}
                                        >
                                          {c.obligatorio && <span className="text-amber-500">*</span>}
                                          {c.etiqueta_personalizada || c.nombre}
                                          <span className="opacity-50 ml-0.5">{c.tipo_dato === "Número" ? "#" : c.tipo_dato === "Fecha" ? "📅" : c.tipo_dato === "Lista" ? "▾" : c.tipo_dato === "Sí/No" ? "☑" : ""}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <button
                        onClick={() => {
                          setNewEventoNombre("");
                          setNewEventoDescripcion("");
                          setAddEventoModal({ registroId: latest.id, modulo: latest.modulo });
                        }}
                        className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg border border-dashed border-amber-400/40 text-xs text-muted-foreground hover:text-amber-600 hover:border-amber-400/70 hover:bg-amber-500/5 transition-colors mt-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo evento
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

                {/* ── Tarjeta "Nueva definición" dentro del módulo ───────── */}
                <button
                  onClick={() => addDef(undefined, modulo)}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: crear nuevo evento ───────────────────────────────────────── */}
      {addEventoModal && (
        <Dialog open onOpenChange={() => setAddEventoModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Nuevo evento
              </DialogTitle>
              <DialogDescription className="pt-1">
                Los eventos son datos secundarios que complementan o documentan el registro padre.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-1">
              <div className="space-y-1.5">
                <Label htmlFor="evt-nombre" className="text-xs font-medium">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="evt-nombre"
                  value={newEventoNombre}
                  onChange={e => setNewEventoNombre(e.target.value)}
                  placeholder="Ej: SEGUIMIENTO_INTRODUCCION"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evt-desc" className="text-xs font-medium">
                  Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="evt-desc"
                  value={newEventoDescripcion}
                  onChange={e => setNewEventoDescripcion(e.target.value)}
                  placeholder="Registro periódico de viabilidad, contaminación…"
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAddEventoModal(null)}>
                Cancelar
              </Button>
              <Button
                disabled={!newEventoNombre.trim()}
                onClick={() => {
                  addEvento(
                    addEventoModal.registroId,
                    addEventoModal.modulo,
                    newEventoNombre.trim(),
                    newEventoDescripcion.trim(),
                  );
                  setAddEventoModal(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Crear evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: confirmar eliminación de definición ─────────────────────── */}
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
                  v{defToDelete?.version || "1.0"} · {camposCount} campo{camposCount !== 1 ? "s" : ""}
                  {datosCount > 0 && <span className="text-destructive font-medium"> · {datosCount} datos</span>}
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

      {/* ── Modal: confirmar nueva versión ────────────────────────────────── */}
      {confirmDup && (
        <Dialog open onOpenChange={() => setConfirmDup(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary" />
                ¿Crear nueva versión?
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
                placeholder="Nombre del nuevo formulario…"
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

      {/* ── Diálogo: comparar versiones ───────────────────────────────────── */}
      {compareRootId && (
        <VersionDiffDialog
          rootId={compareRootId}
          open={!!compareRootId}
          onClose={() => setCompareRootId(null)}
        />
      )}

      {/* ── Modal: Confirmar archivado ────────────────────────────────────── */}
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

      {/* ── Modal: Rollback / Activar versión anterior ────────────────────── */}
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
                  v{rollbackModal.activeVersion} — {rollbackModal.activeNombre}
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

      {/* ── Modal: Selector desde Biblioteca ─────────────────────────────── */}
      <Dialog
        open={!!addCampoModal}
        onOpenChange={open => { if (!open) setAddCampoModal(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Agregar campo desde Biblioteca
            </DialogTitle>
            <DialogDescription>
              Selecciona uno o más parámetros de la biblioteca para añadirlos al formulario.
            </DialogDescription>
          </DialogHeader>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={campoSearch}
              onChange={e => setCampoSearch(e.target.value)}
              placeholder="Buscar parámetro…"
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 focus:outline-none focus:bg-background transition-colors"
            />
            {campoSearch && (
              <button onClick={() => setCampoSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de parámetros de la biblioteca */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {(() => {
              const defId = addCampoModal?.defId ?? "";
              const existingNames = new Set(parametros.filter(p => p.definicion_id === defId).map(p => p.nombre));
              const filtered = parametrosLib.filter(p =>
                p.activo !== false &&
                (p.nombre.toLowerCase().includes(campoSearch.toLowerCase()) ||
                 p.descripcion?.toLowerCase().includes(campoSearch.toLowerCase()) ||
                 p.codigo?.toLowerCase().includes(campoSearch.toLowerCase()))
              );
              if (filtered.length === 0) {
                return (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Sin resultados para &ldquo;{campoSearch}&rdquo;
                  </div>
                );
              }
              return filtered.map(lib => {
                const alreadyIn = existingNames.has(lib.nombre);
                const selected  = selectedLibIds.has(lib.id);
                return (
                  <label
                    key={lib.id}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      alreadyIn
                        ? "opacity-50 cursor-not-allowed bg-muted/20"
                        : selected
                          ? "bg-primary/8 hover:bg-primary/12"
                          : "hover:bg-muted/40",
                    )}
                  >
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
                      className="mt-0.5 shrink-0 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {lib.nombre.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                          {lib.tipo_dato}
                        </span>
                        {lib.unidad_medida && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ({lib.unidad_medida})
                          </span>
                        )}
                        {alreadyIn && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                            ya existe
                          </span>
                        )}
                      </div>
                      {lib.descripcion && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {lib.descripcion}
                        </p>
                      )}
                    </div>
                  </label>
                );
              });
            })()}
          </div>

          {/* Opción: crear nuevo en blanco */}
          <label className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
            createNewCampo
              ? "border-primary/40 bg-primary/8"
              : "border-dashed border-border hover:border-primary/30 hover:bg-muted/30",
          )}>
            <input
              type="checkbox"
              checked={createNewCampo}
              onChange={e => setCreateNewCampo(e.target.checked)}
              className="shrink-0 accent-primary"
            />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                <Plus className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Crear nuevo parámetro en blanco
              </span>
            </div>
          </label>

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button variant="outline" onClick={() => setAddCampoModal(null)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedLibIds.size === 0 && !createNewCampo}
              onClick={() => {
                if (!addCampoModal) return;
                const { defId } = addCampoModal;
                // Agregar campos seleccionados de la biblioteca
                selectedLibIds.forEach(libId => {
                  const lib = parametrosLib.find(p => p.id === libId);
                  if (lib) addPar(defId, lib.id, lib.nombre);
                });
                // Si se pidió uno en blanco, crear el campo vacío
                if (createNewCampo) {
                  addPar(defId);
                }
                setAddCampoModal(null);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {selectedLibIds.size + (createNewCampo ? 1 : 0) === 0
                ? "Agregar"
                : selectedLibIds.size + (createNewCampo ? 1 : 0) === 1
                  ? "Agregar 1 campo"
                  : `Agregar ${selectedLibIds.size + (createNewCampo ? 1 : 0)} campos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Drawer: configuración avanzada del campo ──────────────────────── */}
      <CampoConfigDrawer
        open={!!configCampoId}
        campo={configCampoId ? parametros.find(p => p.id === configCampoId) ?? null : null}
        hermanos={configCampoId
          ? parametros.filter(p => p.definicion_id === (parametros.find(x => x.id === configCampoId)?.definicion_id ?? ""))
          : []}
        onSave={(id, updates) => updParFull(id, updates)}
        onClose={() => setConfigCampoId(null)}
      />

      {/* ── Dialog: Gestión masiva de accesos de usuario por formulario ─────── */}
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
                  {" — "}
                  <span className="text-success font-medium">{nAllow} permitidos</span>
                  {" · "}
                  <span className="text-destructive font-medium">{nBlock} bloqueados</span>
                  {" · "}
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
                    placeholder="Buscar usuario…"
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

              {/* Bulk action bar — visible when users are selected */}
              {accSelected.size > 0 && (
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/15 flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-primary flex-1">
                    {accSelected.size} usuario{accSelected.size !== 1 ? "s" : ""} seleccionado{accSelected.size !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={bulkAllow}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-success text-white hover:bg-success/80 transition-colors flex items-center gap-1"
                  >
                    ✓ Permitir
                  </button>
                  <button
                    onClick={bulkBlock}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-destructive text-white hover:bg-destructive/80 transition-colors flex items-center gap-1"
                  >
                    ✕ Bloquear
                  </button>
                  <button
                    onClick={bulkClear}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    ← Por rol
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
                            {hasOverride ? (acceso!.habilitado ? "✓ Permitido" : "✕ Bloqueado") : "— Por rol"}
                          </span>

                          {/* Quick actions */}
                          {accSelected.size === 0 && (hasOverride ? (
                            <button
                              title="Quitar override — volver a reglas de rol"
                              onClick={() => removeDefAcceso(acceso!.id)}
                              className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                              ← rol
                            </button>
                          ) : (
                            <div className="flex gap-0.5">
                              <button
                                title="Permitir acceso"
                                onClick={() => addDefAcceso({ definicion_id: selectedDef.id, usuario_id: user.id, habilitado: true, justificacion: "Acceso concedido desde gestión de formularios" })}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-success/30 text-success hover:bg-success/10 transition-colors font-medium"
                              >✓</button>
                              <button
                                title="Bloquear acceso"
                                onClick={() => addDefAcceso({ definicion_id: selectedDef.id, usuario_id: user.id, habilitado: false, justificacion: "Acceso bloqueado desde gestión de formularios" })}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-medium"
                              >✕</button>
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
                  {allUsers.length} usuarios · {allAccesos.length} con override
                </p>
                {allAccesos.length > 0 && (
                  <button
                    onClick={() => allAccesos.forEach(a => removeDefAcceso(a.id))}
                    className="text-[10px] text-destructive hover:text-destructive/70 transition-colors"
                  >
                    Limpiar todos los overrides
                  </button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Sheet: Biblioteca de Parámetros ──────────────────────────────── */}
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

      {/* ── Dialog: Copiar formularios desde otra empresa ──────────────────── */}
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

// ─── Hub de Cultivos ──────────────────────────────────────────────────────────

function TabCultivos() {
  const {
    cultivos, allCultivos, addCultivo, updCultivo, delCultivo,
    variedades, addVariedad, updVariedad, delVariedad,
  } = useConfig();
  const navigate = useNavigate();
  const { role } = useRole();
  const isSuperAdmin = role === "super_admin";

  // super_admin ve todos (incluye desasignados); otros roles solo los que le corresponden
  const cultivosList = isSuperAdmin ? allCultivos : cultivos;

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
    // updVariedad needs the id — use a short timeout to let state propagate
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

  const filteredCultivos = cultivosList.filter(c =>
    !searchCultivo || c.nombre.toLowerCase().includes(searchCultivo.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchCultivo.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <InfoBanner storageKey="cultivos">
        <strong>Cultivos</strong> — gestiona cultivos activos, sus variedades y qué formularios aplican sólo a ese cultivo o a todos.
      </InfoBanner>

      {/* ── Layout master / detail ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">

        {/* ───────────────── SIDEBAR: lista de cultivos ──────────────── */}
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
                placeholder="Buscar cultivo…"
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

        {/* ───────────────── DETALLE: cultivo seleccionado ───────────── */}
        {!cultivo ? (
          <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
            <Leaf className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Selecciona un cultivo para ver su detalle</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Sección 1: Propiedades del cultivo ──────────────────── */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-primary" />
                  Información del cultivo
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

              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    placeholder="Especie, variedad…"
                    readOnly={!isSuperAdmin}
                    disabled={!isSuperAdmin}
                  />
                </div>
              </div>
            </div>

            {/* ── Sección 2: Variedades ────────────────────────────────── */}
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
                      {/* Hover actions — solo super_admin */}
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

            {/* ── Sección 3: Medidas y Unidades ───────────────────────────── */}
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
                      const labels: Record<string, string> = { ha: "ha", m2: "m²", acres: "acres" };
                      const titles: Record<string, string> = { ha: "Hectáreas", m2: "Metros cuadrados", acres: "Acres" };
                      const active = (cultivo.unidad_superficie ?? "ha") === opt;
                      return (
                        <button
                          key={opt}
                          disabled={!isSuperAdmin}
                          onClick={() => updCultivo(cultivo.id, "unidad_superficie", opt)}
                          title={titles[opt]}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium border-r last:border-r-0 border-border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:bg-muted/60",
                            !isSuperAdmin && "cursor-default",
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
                          disabled={!isSuperAdmin}
                          onClick={() => updCultivo(cultivo.id, "unidad_produccion", opt)}
                          title={titles[opt]}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium border-r last:border-r-0 border-border transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:bg-muted/60",
                            !isSuperAdmin && "cursor-default",
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
                      readOnly={!isSuperAdmin}
                      disabled={!isSuperAdmin}
                    />
                    <span className="text-xs text-muted-foreground">pl/ha</span>
                    {!!cultivo.marco_plantacion && cultivo.marco_plantacion > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
                        ≈ {(cultivo.marco_plantacion / 10000).toFixed(2)} pl/m²
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sección 4: Calibres ──────────────────────────────────────── */}
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
                        onClick={() => isSuperAdmin && updCultivo(cultivo.id, "unidad_calibre", unit)}
                        disabled={!isSuperAdmin}
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
                  {isSuperAdmin && (
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
                  {isSuperAdmin && (
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
                          readOnly={!isSuperAdmin}
                          disabled={!isSuperAdmin}
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
                              readOnly={!isSuperAdmin}
                              disabled={!isSuperAdmin}
                              className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none min-w-0 disabled:opacity-60"
                            />
                            {cal.mm_min !== undefined && cal.mm_max !== undefined && (
                              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 hidden xl:block">
                                {cal.mm_min}–{cal.mm_max} {cultivo.unidad_calibre ?? "mm"}
                              </span>
                            )}
                          </div>

                          {numInput("mm_min")}
                          {numInput("mm_max")}
                          {numInput("peso_g_min")}
                          {numInput("peso_g_max")}

                          {/* Delete */}
                          {isSuperAdmin ? (
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
                            <span>{cal.mm_min}–{cal.mm_max}{cultivo.unidad_calibre ?? "mm"}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sección 5: Estructura de Campo ──────────────────────────── */}
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
                {isSuperAdmin && (
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

              {(cultivo.estructura ?? []).length === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <Network className="w-7 h-7 mx-auto text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Sin estructura configurada.</p>
                  {isSuperAdmin && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Usa "Cargar plantilla" para la jerarquía estándar.
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
                            disabled={!isSuperAdmin}
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
                            readOnly={!isSuperAdmin}
                            disabled={!isSuperAdmin}
                            placeholder="Nombre del nivel"
                            className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none disabled:opacity-60 min-w-0"
                          />

                          {/* Abreviatura */}
                          <input
                            value={nivel.abrev}
                            onChange={e => updNivel("abrev", e.target.value.toUpperCase().slice(0, 4))}
                            readOnly={!isSuperAdmin}
                            disabled={!isSuperAdmin}
                            placeholder="AB"
                            maxLength={4}
                            className="w-10 text-[10px] font-mono text-center bg-muted/40 rounded-md px-1.5 py-1 border border-transparent focus:border-primary/50 focus:bg-background focus:outline-none disabled:opacity-60 uppercase transition-colors"
                          />

                          {/* Reorder + Delete */}
                          {isSuperAdmin && (
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
                        Jerarquía activa
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
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Modal: crear nuevo cultivo ────────────────────────────────────── */}
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
                placeholder="ej. Fresas, Tomates, Lechugas…"
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
                placeholder="Variedad, especie, notas…"
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
  );
}

// ─── TabEmpresas ──────────────────────────────────────────────────────────────
// Solo super_admin puede crear/editar/eliminar clientes y productores.
// Un cliente puede tener múltiples productores; los productores no ven datos de otros.

const EMPTY_EMPRESA = { nombre: "", ruc: "", pais: "Chile" };

function TabEmpresas() {
  const { role, clientes, addCliente, updCliente, delCliente,
          productores, addProductor, updProductor, delProductor } = useRole();
  const { allCultivos, allVariedades, updCultivoClientes, updCultivoProductores, updVariedadClientes, updVariedadProductores } = useConfig();
  const isSuperAdmin = role === "super_admin";

  // ── Toggle cultivo para un cliente ─────────────────────────────────────────
  // clientes_ids vacío = global (todos lo ven). Al desmarcar un global
  // se vuelve explícito para todos los demás clientes.
  const toggleCultivoCliente = (cultivoId: string, clienteId: number, checked: boolean) => {
    const cultivo   = allCultivos.find(c => c.id === cultivoId);
    const currentIds = cultivo?.clientes_ids ?? [];
    if (checked) {
      updCultivoClientes(cultivoId, [...currentIds, clienteId]);
    } else {
      if (currentIds.length === 0) {
        // Era global → lo hacemos explícito para todos excepto este cliente
        updCultivoClientes(cultivoId, clientes.filter(c => c.id !== clienteId).map(c => c.id));
      } else {
        updCultivoClientes(cultivoId, currentIds.filter(id => id !== clienteId));
      }
    }
  };

  // ── Toggle cultivo para un productor ───────────────────────────────────────
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

  // ── Toggle variedad para un cliente ─────────────────────────────────────────
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

  // ── Toggle variedad para un productor ──────────────────────────────────────
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

  // ── Estado de búsqueda y expansión ─────────────────────────────────────────
  const [search,              setSearch]              = useState("");
  const [expandedId,          setExpandedId]          = useState<number | null>(null);
  const [activeSubTab,        setActiveSubTab]        = useState<"cultivos" | "productores">("cultivos");

  // ── Estado formularios clientes ─────────────────────────────────────────────
  const [showAddCliente,      setShowAddCliente]      = useState(false);
  const [clienteForm,         setClienteForm]         = useState(EMPTY_EMPRESA);
  const [editCliente,         setEditCliente]         = useState<typeof clientes[0] | null>(null);
  const [confirmDelCliente,   setConfirmDelCliente]   = useState<number | null>(null);

  // ── Estado formularios productores ─────────────────────────────────────────
  const [showAddProd,         setShowAddProd]         = useState<number | null>(null); // clienteId
  const [prodForm,            setProdForm]            = useState(EMPTY_EMPRESA);
  const [editProductor,       setEditProductor]       = useState<typeof productores[0] | null>(null);
  const [confirmDelProductor, setConfirmDelProductor] = useState<number | null>(null);

  // ── Helpers de validación ───────────────────────────────────────────────────
  const validEmpresa = (f: typeof EMPTY_EMPRESA) =>
    f.nombre.trim().length > 0 && f.ruc.trim().length > 0 && f.pais.trim().length > 0;

  // ── CRUD clientes ──────────────────────────────────────────────────────────
  const handleSaveCliente = () => {
    if (!validEmpresa(clienteForm)) return;
    if (editCliente) {
      updCliente(editCliente.id, { nombre: clienteForm.nombre.trim(), ruc: clienteForm.ruc.trim(), pais: clienteForm.pais.trim() });
      setEditCliente(null);
    } else {
      const c = addCliente({ nombre: clienteForm.nombre.trim(), ruc: clienteForm.ruc.trim(), pais: clienteForm.pais.trim() });
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

  // ── CRUD productores ───────────────────────────────────────────────────────
  const handleSaveProductor = () => {
    if (!validEmpresa(prodForm)) return;
    if (editProductor) {
      updProductor(editProductor.id, { nombre: prodForm.nombre.trim(), ruc: prodForm.ruc.trim(), pais: prodForm.pais.trim() });
      setEditProductor(null);
    } else if (showAddProd !== null) {
      addProductor({ clienteId: showAddProd, nombre: prodForm.nombre.trim(), ruc: prodForm.ruc.trim(), pais: prodForm.pais.trim() });
    }
    setProdForm(EMPTY_EMPRESA);
    setShowAddProd(null);
  };

  const handleDeleteProductor = (id: number) => {
    delProductor(id);
    setConfirmDelProductor(null);
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filteredClientes = clientes.filter(c =>
    !search ||
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.ruc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <InfoBanner storageKey="empresas">
        <strong>Empresas</strong> — gestiona clientes de la plataforma y sus productores internos.
        Solo el <strong>superadministrador</strong> puede crear, editar o eliminar empresas y productores.
      </InfoBanner>

      {/* ── Barra superior ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa o RUC…"
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:outline-none transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={() => { setClienteForm(EMPTY_EMPRESA); setEditCliente(null); setShowAddCliente(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Nueva empresa
          </Button>
        )}
      </div>

      {/* ── Lista de clientes ─────────────────────────────────────────────── */}
      {filteredClientes.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Building2 className="w-10 h-10 opacity-20" />
          <p className="text-sm">{search ? "Sin resultados" : "No hay empresas registradas."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClientes.map(cliente => {
            const prodList   = productores.filter(p => p.clienteId === cliente.id);
            const isExpanded = expandedId === cliente.id;
            // Cuántos cultivos están habilitados para este cliente
            const cultivosHabilitados = allCultivos.filter(c =>
              !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(cliente.id)
            );
            return (
              <div key={cliente.id} className="bg-card rounded-xl border border-border overflow-hidden">

                {/* ── Fila del cliente ──────────────────────────────────────── */}
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
                    <p className="text-xs text-muted-foreground">{cliente.ruc} · {cliente.pais}</p>
                  </div>

                  {/* Badge productor count */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {prodList.length} productor{prodList.length !== 1 ? "es" : ""}
                    </span>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-medium",
                      cultivosHabilitados.length > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}>
                      <Leaf className="w-2.5 h-2.5 inline mr-1 -mt-px" />
                      {cultivosHabilitados.length}/{allCultivos.length} cultivo{allCultivos.length !== 1 ? "s" : ""}
                    </span>

                    {/* Actions (super_admin) */}
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setClienteForm({ nombre: cliente.nombre, ruc: cliente.ruc, pais: cliente.pais }); setEditCliente(cliente); setShowAddCliente(true); }}
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

                    {/* Expand toggle */}
                    <button
                      onClick={() => { setExpandedId(isExpanded ? null : cliente.id); if (!isExpanded) setActiveSubTab("cultivos"); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      title={isExpanded ? "Cerrar" : "Ver productores y cultivos"}
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {/* ── Panel expandible con sub-tabs ──────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10">

                    {/* ── Sub-tab nav ──────────────────────────────────────── */}
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

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* SUB-TAB: Cultivos y Variedades                       */}
                    {/* ══════════════════════════════════════════════════════ */}
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

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* SUB-TAB: Productores                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {(!isSuperAdmin || activeSubTab === "productores") && (
                      <div>
                        {/* Header productores */}
                        <div className="px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tractor className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Productores internos</span>
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
                                      <p className="text-sm font-medium truncate">{prod.nombre}</p>
                                      <p className="text-xs text-muted-foreground">{prod.ruc} · {prod.pais}</p>
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
                                          onClick={() => { setProdForm({ nombre: prod.nombre, ruc: prod.ruc, pais: prod.pais }); setEditProductor(prod); setShowAddProd(prod.clienteId); }}
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

                                  {/* ── Cultivos + Variedades por productor (super_admin) ─── */}
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

      {/* ── Dialog: Agregar / Editar cliente ──────────────────────────────── */}
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">País <span className="text-destructive">*</span></Label>
              <Input value={clienteForm.pais} onChange={e => setClienteForm(p => ({ ...p, pais: e.target.value }))} placeholder="ej. Chile" />
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

      {/* ── Dialog: Agregar / Editar productor ────────────────────────────── */}
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">País <span className="text-destructive">*</span></Label>
              <Input value={prodForm.pais} onChange={e => setProdForm(p => ({ ...p, pais: e.target.value }))} placeholder="ej. Chile" />
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

      {/* ── Dialog: Confirmar eliminación de cliente ──────────────────────── */}
      <Dialog open={confirmDelCliente !== null} onOpenChange={open => { if (!open) setConfirmDelCliente(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar empresa
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará <strong>{clientes.find(c => c.id === confirmDelCliente)?.nombre}</strong> y todos sus productores internos.
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

      {/* ── Dialog: Confirmar eliminación de productor ────────────────────── */}
      <Dialog open={confirmDelProductor !== null} onOpenChange={open => { if (!open) setConfirmDelProductor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar productor
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará <strong>{productores.find(p => p.id === confirmDelProductor)?.nombre}</strong>.
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

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────

const rolConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "Super Admin":   { icon: ShieldCheck, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "Cliente Admin": { icon: Shield,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "Productor":     { icon: SproutIcon,  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "Jefe de Área":  { icon: Briefcase,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "Supervisor":    { icon: Eye,         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  "Lector":        { icon: BookOpenAlt, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const roleNameMap: Record<UserRoleT, string> = {
  super_admin:   "Super Admin",
  cliente_admin: "Cliente Admin",
  productor:     "Productor",
  jefe_area:     "Jefe de Área",
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

function TabUsuarios() {
  const {
    addOverride, removeOverride, getUserOverrides, getRoleBasePermissions,
    clientes, productores, users: contextUsers, addUser, updUser, delUser,
    currentUser, role: currentRole_ctx, currentClienteId,
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
        (isSuperAdmin || u.clienteId === currentClienteId)
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
        empresa:      u.clienteId ? clientes.find(c => c.id === u.clienteId)?.nombre ?? "—" : "Plataforma",
        estado:       (u.activo !== false ? "Activo" : "Inactivo") as "Activo" | "Inactivo",
        ultimoAcceso: "—",
      })),
  [contextUsers, clientes, myLevel, isSuperAdmin, currentClienteId]);

  // Local role overrides — lets us edit roles inline without a real backend
  const [userRoleMap, setUserRoleMap] = useState<Map<number, UserRoleT>>(() => new Map());

  // Selection (single for detail panel)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Multi-select (for bulk actions)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  // Bulk assign modal
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkDefIds, setBulkDefIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"permitir" | "bloquear">("permitir");

  // ── Crear / Editar usuario ─────────────────────────────────────────────────
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
          // Módulo desactivado → bloquear cada acción
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
          // Módulo activado → quitar bloqueos previos de este flujo
          if (existingOv && !existingOv.habilitado && existingOv.justificacion === "Módulo restringido al crear/editar usuario") {
            removeOverride(existingOv.id);
          }
        }
      }
    }

    setUserModal(false);
  };

  const handleDeleteUser = (id: number) => {
    delUser(id);
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
      const empresa = u.clienteId ? clientes.find(c => c.id === u.clienteId)?.nombre ?? "—" : "Plataforma";
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
  // Reglas (§6 informe): solo puedes OTORGAR permisos que TÚ mismo tienes.
  // Bloquear (habilitado: false) siempre está permitido sobre subordinados.
  const canGrantAction = (modulo: string, accion: ActionPermission): boolean => {
    if (isSuperAdmin) return true;
    return getRoleBasePermissions(currentRole_ctx, modulo).includes(accion);
  };

  const handleMatrixCell = (modulo: string, accion: ActionPermission) => {
    if (!selectedUser) return;
    const existing = userOverrides.find(ov => ov.modulo === modulo && ov.accion === accion);
    if (existing) {
      // Quitar override existente — siempre permitido
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
      {sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
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
        <strong>Gestión de Usuarios</strong> — administra roles y configura permisos especiales
        por módulo y acción. Haz clic en un usuario para abrir su matriz de permisos.
      </InfoBanner>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o email…"
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

      {/* ── Bulk action bar ─────────────────────────────────────────────── */}
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

      {/* ── Body: table + detail panel ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── Sortable paginated table ────────────────────────────────────── */}
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
                  Último acceso <SortArrow col="ultimoAcceso" />
                </th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-12">
                  Esp.
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
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-[13px] truncate leading-snug">{user.nombre}</p>
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
                        <span className="text-xs text-muted-foreground/30">—</span>
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
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Pagination footer ──────────────────────────────────────── */}
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
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} / {filtered.length}
                </span>
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">‹</button>
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
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-30 text-muted-foreground">»</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Perfil de acceso unificado ─────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4 flex flex-col max-h-[calc(100vh-140px)]">
          {/* Panel header */}
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              {selectedUser ? "Perfil de acceso" : "Acceso"}
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
            <div className="px-4 py-12 text-center space-y-2 flex-1">
              <Users2 className="w-9 h-9 mx-auto text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">Selecciona un usuario para ver su perfil de acceso completo.</p>
            </div>
          ) : (() => {
            const userOverrides     = getUserOverrides(selectedUser.id);
            const accesosDelUsuario = definiciones
              .flatMap(d => getDefAccesos(d.id).filter(a => a.usuario_id === selectedUser.id));

            const q = panelSearch.toLowerCase();

            return (
              <>
                {/* Mini profile */}
                <div className="px-4 py-2.5 border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      avatarColors[users.findIndex(u => u.id === selectedUser.id) % avatarColors.length],
                    )}>
                      {initials(selectedUser.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[12px] text-foreground truncate">{selectedUser.nombre}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          rolConfig[selectedUser.rol]?.color,
                        )}>
                          {(() => { const Ic = rolConfig[selectedUser.rol]?.icon ?? Shield; return <Ic className="w-2 h-2" />; })()}
                          {selectedUser.rol}
                        </span>
                        {/* Hierarchy level badge (§2 informe: Nivel 1–6) */}
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary" title="Nivel jerárquico (1=Lector … 6=Super Admin)">
                          Nv{selectedUser.nivel}
                          <span className="flex gap-px ml-0.5">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <span key={i} className={cn("inline-block w-1 h-1 rounded-sm", i < selectedUser.nivel ? "bg-primary" : "bg-primary/20")} />
                            ))}
                          </span>
                        </span>
                        <span className="text-[9px] text-muted-foreground truncate">{selectedUser.empresa}</span>
                      </div>
                    </div>
                    {/* Override counters */}
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] text-muted-foreground leading-tight">
                        {userOverrides.length > 0 && <span className="text-primary font-medium">{userOverrides.length} mod</span>}
                        {userOverrides.length > 0 && accesosDelUsuario.length > 0 && <span className="mx-0.5">·</span>}
                        {accesosDelUsuario.length > 0 && <span className="text-primary font-medium">{accesosDelUsuario.length} form</span>}
                        {userOverrides.length === 0 && accesosDelUsuario.length === 0 && <span className="italic">sin overrides</span>}
                      </p>
                      <p className="text-[8px] text-muted-foreground/60 mt-0.5">overrides activos</p>
                    </div>
                  </div>
                </div>

                {/* Legend + Search */}
                <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0 space-y-1.5">
                  {/* Leyenda dos niveles (§1.1 informe) */}
                  <div className="flex items-start gap-2 text-[8px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <span className="font-semibold text-foreground/50 uppercase tracking-wider">L1 Jerarquía</span>
                      <span className="text-muted-foreground/60">Nv= nivel mínimo · excluido = rol bloqueado</span>
                      <span className="font-semibold text-foreground/50 uppercase tracking-wider ml-1">L2 Acciones</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success/40 inline-block"/>rol ✓</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 inline-block"/>sin acceso</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block"/>override ✓</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block"/>override ✕</span>
                    </div>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={panelSearch}
                      onChange={e => setPanelSearch(e.target.value)}
                      placeholder="Buscar módulo o formulario…"
                      className="w-full pl-7 pr-6 py-1 text-[11px] rounded-md bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors"
                    />
                    {panelSearch && (
                      <button onClick={() => setPanelSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Cascade: module → formularios ──────────────────────── */}
                <div className="overflow-y-auto flex-1 divide-y divide-border">
                  {MODULO_OPTIONS.map(mod => {
                    const modDefs = definiciones.filter(d => d.modulo === mod.value && d.estado === "activo");

                    // Filter by search
                    const modMatchesSearch = !q || mod.label.toLowerCase().includes(q);
                    const filteredDefs = modDefs.filter(d => !q || d.nombre.toLowerCase().includes(q) || modMatchesSearch);
                    if (!modMatchesSearch && filteredDefs.length === 0) return null;
                    if (modDefs.length === 0) return null;

                    return (
                      <div key={mod.value}>
                        {/* Module header */}
                        <div className="px-3 py-1.5 bg-muted/30 flex items-center gap-2">
                          <p className="text-[9px] font-bold text-foreground/70 uppercase tracking-wider flex-1">{mod.label}</p>
                          {/* Compact action flags — click = matrix cell override */}
                          <div className="flex gap-0.5" title="Clica una acción para agregar/quitar override de módulo">
                            {ALL_ACTIONS.map(a => {
                              const ov        = userOverrides.find(o => o.modulo === mod.value && o.accion === a.value);
                              const hasBase   = getRoleBasePermissions(selectedUser.roleKey, mod.value).includes(a.value);
                              const effective = ov ? ov.habilitado : hasBase;
                              // Bloqueado: no hay override existente, el click OTORGARÍA, y el admin no tiene ese permiso
                              const wouldGrant = !ov && !hasBase;
                              const locked     = wouldGrant && !canGrantAction(mod.value, a.value);
                              const tipBase    = `${a.label}: ${effective ? "Permitido" : "Denegado"}${ov ? " (override)" : " (base)"}`;
                              const tip        = locked ? `${a.label}: no puedes otorgar lo que no tienes` : tipBase;
                              return (
                                <button
                                  key={a.value}
                                  onClick={() => !locked && handleMatrixCell(mod.value, a.value)}
                                  title={tip}
                                  disabled={locked}
                                  className={cn(
                                    "w-5 h-4 rounded text-[7px] font-bold transition-colors",
                                    locked
                                      ? "bg-muted/30 text-muted-foreground/20 cursor-not-allowed"
                                      : ov
                                        ? ov.habilitado ? "bg-success text-white" : "bg-destructive text-white"
                                        : hasBase ? "bg-success/20 text-success/80" : "bg-muted/50 text-muted-foreground/40",
                                  )}
                                >
                                  {locked ? <Lock className="w-2 h-2 mx-auto" /> : a.label[0].toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Formulario rows */}
                        {filteredDefs.length === 0 ? (
                          <p className="text-[9px] text-muted-foreground/50 italic px-4 py-1.5">Sin formularios activos</p>
                        ) : (
                          filteredDefs.map(def => {
                            const ovAcceso  = getDefAccesos(def.id).find(a => a.usuario_id === selectedUser.id);
                            const hasModVer = getRoleBasePermissions(selectedUser.roleKey, def.modulo).includes("ver");
                            const levelOK   = selectedUser.nivel >= (def.nivel_minimo ?? 1);
                            const notExcl   = !(def.roles_excluidos ?? []).includes(selectedUser.roleKey);
                            const roleOK    = hasModVer && levelOK && notExcl;

                            // Reason for exclusion (tooltip hint)
                            const blockReason = !hasModVer ? "sin acceso al módulo"
                              : !levelOK ? `nivel insuficiente (necesita ${def.nivel_minimo})`
                              : !notExcl ? "rol excluido en esta definición"
                              : "";

                            return (
                              <div
                                key={def.id}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/10 border-t border-border/40 transition-colors"
                              >
                                {/* Status dot */}
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-0.5",
                                  ovAcceso
                                    ? ovAcceso.habilitado ? "bg-success" : "bg-destructive"
                                    : roleOK ? "bg-success/50" : "bg-amber-400/60"
                                )} />

                                {/* Name + nivel/exclusion badges */}
                                <span className="flex-1 min-w-0">
                                  <span
                                    className="text-[11px] text-foreground truncate"
                                    title={def.nombre + (blockReason ? ` — ${blockReason}` : "")}
                                  >
                                    {def.nombre}
                                    {def.cultivo_id && <span className="text-[9px] text-primary/60 ml-1">🌿</span>}
                                  </span>
                                  {/* Hierarchy level badge (§3.1 informe) */}
                                  {(def.nivel_minimo ?? 1) > 1 && (
                                    <span className={cn(
                                      "inline-flex items-center gap-0.5 ml-1 text-[8px] font-semibold px-1 py-px rounded-sm",
                                      !levelOK
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                        : "bg-muted/60 text-muted-foreground",
                                    )} title={`Requiere nivel ${def.nivel_minimo}+`}>
                                      Nv{def.nivel_minimo}
                                    </span>
                                  )}
                                  {/* Role exclusion badge (§6.3 informe) */}
                                  {!notExcl && (
                                    <span className="inline-flex items-center gap-0.5 ml-1 text-[8px] font-semibold px-1 py-px rounded-sm bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" title="Tu rol está excluido de este formulario">
                                      <Lock className="w-2 h-2" /> excluido
                                    </span>
                                  )}
                                </span>

                                {/* Status badge */}
                                <span
                                  title={!ovAcceso && !roleOK ? `Bloqueado: ${blockReason}` : undefined}
                                  className={cn(
                                    "text-[9px] font-medium px-1.5 py-0 rounded-full border shrink-0",
                                    ovAcceso
                                      ? ovAcceso.habilitado
                                        ? "bg-success/10 text-success border-success/25"
                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                      : roleOK
                                        ? "bg-muted/40 text-muted-foreground/70 border-border"
                                        : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400",
                                  )}
                                >
                                  {ovAcceso
                                    ? ovAcceso.habilitado ? "✓ override" : "✕ override"
                                    : roleOK ? "✓ rol" : "✗ sin acceso"
                                  }
                                </span>

                                {/* Single action */}
                                {ovAcceso ? (
                                  <button
                                    onClick={() => removeDefAcceso(ovAcceso.id)}
                                    title="Quitar override — volver a reglas de rol"
                                    className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
                                  >← rol</button>
                                ) : roleOK ? (
                                  <button
                                    onClick={() => addDefAcceso({ definicion_id: def.id, usuario_id: selectedUser.id, habilitado: false, justificacion: "Bloqueado desde gestión de usuarios" })}
                                    title="Bloquear acceso a este formulario"
                                    className="text-[9px] px-1 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors shrink-0 font-medium"
                                  >✕</button>
                                ) : (
                                  <button
                                    onClick={() => addDefAcceso({ definicion_id: def.id, usuario_id: selectedUser.id, habilitado: true, justificacion: "Concedido desde gestión de usuarios" })}
                                    title="Conceder acceso explícito a este formulario"
                                    className="text-[9px] px-1 py-0.5 rounded border border-success/30 text-success hover:bg-success/10 transition-colors shrink-0 font-medium"
                                  >✓</button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer: clear all */}
                {(userOverrides.length > 0 || accesosDelUsuario.length > 0) && (
                  <div className="px-4 py-2 border-t border-border flex items-center gap-3 shrink-0 bg-muted/10">
                    <ShieldAlert className="w-3 h-3 text-primary/50 shrink-0" />
                    <span className="text-[10px] text-muted-foreground flex-1">
                      {userOverrides.length} módulo{userOverrides.length !== 1 ? "s" : ""}
                      {" · "}
                      {accesosDelUsuario.length} formulario{accesosDelUsuario.length !== 1 ? "s" : ""}
                      {" con override"}
                    </span>
                    <button
                      onClick={() => {
                        userOverrides.forEach(ov => removeOverride(ov.id));
                        accesosDelUsuario.forEach(a => removeDefAcceso(a.id));
                      }}
                      className="text-[10px] text-destructive hover:text-destructive/70 transition-colors shrink-0"
                    >
                      Limpiar todo
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Matrix quick-add modal ─────────────────────────────────────────── */}
      <Dialog open={!!matrixModal} onOpenChange={open => { if (!open) setMatrixModal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Agregar Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              {matrixModal && selectedUser && (() => {
                const mod = ALL_MODULES.find(m => m.value === matrixModal.modulo)?.label;
                const act = ALL_ACTIONS.find(a => a.value === matrixModal.accion)?.label;
                return `${selectedUser.nombre} · ${act} en ${mod}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {matrixModal && (
            <div className="space-y-4 py-1">
              {/* Habilitado toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">¿Permitir esta acción?</Label>
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
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Guardar override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk assign formularios modal ──────────────────────────────────── */}
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
                  ✓ Permitir
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
                  ✕ Bloquear
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

      {/* ── Dialog Crear / Editar Usuario ──────────────────────────────────── */}
      <Dialog open={userModal} onOpenChange={setUserModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Modifica los datos del usuario. Deja la contraseña vacía para mantener la actual."
                : "Completa los datos para crear un nuevo usuario."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="usr-nombre" className="text-xs font-medium">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="usr-nombre"
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Email */}
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
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="usr-pass" className="text-xs font-medium">
                Contraseña {!editingUserId && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="usr-pass"
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder={editingUserId ? "Dejar vacío para mantener" : "Contraseña"}
              />
            </div>

            {/* Rol */}
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
                  // Resetear módulos activos al cambiar de rol
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

            {/* ── Acciones del rol (uniformes en todos los módulos) ────── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" />
                Acciones del rol
                <span className="text-[10px] text-muted-foreground font-normal">(iguales en todos los módulos)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5 px-1">
                {ALL_ACTIONS.map(a => {
                  const has = ACTIONS_BY_ROLE[formRole]?.includes(a.value) ?? false;
                  return (
                    <span
                      key={a.value}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border",
                        has
                          ? "bg-success/10 text-success border-success/25"
                          : "bg-muted/40 text-muted-foreground/30 border-border/40 line-through",
                      )}
                    >
                      {has ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                      {a.label}
                    </span>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground/60 px-1 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 shrink-0" />
                Para excepciones en un módulo específico, edita el usuario y usa la <strong>matriz de permisos</strong>.
              </p>
            </div>

            {/* ── Módulos habilitados — selecciona dónde trabaja el usuario ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Módulos habilitados
                <span className="text-muted-foreground font-normal ml-auto text-[10px]">
                  {formModulosActivos.size} de {formRoleModulos.length} seleccionados
                </span>
              </Label>
              <div className="border border-border rounded-lg bg-muted/20 max-h-48 overflow-y-auto divide-y divide-border/50">
                {formRoleModulos.map(mod => {
                  const isActive = formModulosActivos.has(mod.value);
                  return (
                    <label
                      key={mod.value}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none transition-colors",
                        isActive ? "hover:bg-muted/30" : "opacity-45 hover:opacity-65",
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
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 shrink-0"
                      />
                      <span className={cn(
                        "text-[11px] font-medium flex-1 truncate",
                        isActive ? "text-foreground" : "text-muted-foreground line-through",
                      )}>
                        {mod.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] text-success/70 font-medium shrink-0">habilitado</span>
                      )}
                    </label>
                  );
                })}
                {formRoleModulos.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic py-3 text-center">
                    Este rol no tiene acceso a ningún módulo.
                  </p>
                )}
              </div>
              {formModulosActivos.size === 0 && formRoleModulos.length > 0 && (
                <p className="text-[10px] text-destructive">
                  Debes habilitar al menos un módulo.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                V=Ver · C=Crear · E=Editar · X=Eliminar · P=Exportar · G=Configurar
              </p>
            </div>

            {/* Cliente (solo super_admin ve selector, cliente_admin auto-asigna) */}
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="usr-cliente" className="text-xs font-medium">
                  Empresa (Cliente) <span className="text-destructive">*</span>
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
                  <option value="">— Sin asignar (Plataforma) —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {isClienteAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Empresa</Label>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                  {clientes.find(c => c.id === currentClienteId)?.nombre ?? "—"}
                </p>
              </div>
            )}

            {/* Productor (condicional: solo si hay productores para el cliente seleccionado) */}
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
                  <option value="">— Sin productor —</option>
                  {formProductores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Asociar a un productor limita la visibilidad de datos a ese productor.
                </p>
              </div>
            )}

            {/* Área asignada */}
            <div className="space-y-1.5">
              <Label htmlFor="usr-area" className="text-xs font-medium">Área asignada</Label>
              <Input
                id="usr-area"
                value={formAreaAsignada}
                onChange={e => setFormAreaAsignada(e.target.value)}
                placeholder="Ej: Cosecha, Laboratorio"
              />
            </div>

            {/* Estado activo */}
            {editingUserId && (
              <div className="flex items-center justify-between">
                <Label htmlFor="usr-activo" className="text-xs font-medium">Usuario activo</Label>
                <Switch
                  id="usr-activo"
                  checked={formActivo}
                  onCheckedChange={setFormActivo}
                />
              </div>
            )}
          </div>

          <DialogFooter>
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

      {/* ── Dialog Confirmar Eliminación ───────────────────────────────────── */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminar usuario
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const u = contextUsers.find(x => x.id === deleteConfirm);
                return u
                  ? <>¿Estás seguro de eliminar a <strong>{u.nombre}</strong> ({u.email})? Esta acción no se puede deshacer.</>
                  : "¿Estás seguro?";
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirm !== null && handleDeleteUser(deleteConfirm)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Configuracion = () => {
  const [searchParams] = useSearchParams();
  const validTabs      = ["cultivos", "formularios", "usuarios"];
  const initialTab     = validTabs.includes(searchParams.get("tab") ?? "") ? (searchParams.get("tab") ?? "cultivos") : "cultivos";

  const [activeTab, setActiveTab] = useState(initialTab);
  const { hasPendingChanges: hasPending, setHasPendingChanges: setHasPending } = useConfig();
  const { currentClienteName } = useRole();

  const [showSistema, setShowSistema] = useState(false);

  // ── Tema y branding ───────────────────────────────────────────────────────
  const { theme, saveTheme, toggleDarkMode } = useTheme();

  // Draft local — los cambios de color/nombre solo se aplican al hacer "Guardar"
  const [draft, setDraft] = useState({
    colorPrimario:   theme.colorPrimario,
    colorSecundario: theme.colorSecundario,
    colorAccent:     theme.colorAccent,
    nombreEmpresa:   theme.nombreEmpresa,
  });
  const [brandSaved, setBrandSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Resincronizar draft con el tema guardado cada vez que el Sheet se abre
  useEffect(() => {
    if (showSistema) {
      setDraft({
        colorPrimario:   theme.colorPrimario,
        colorSecundario: theme.colorSecundario,
        colorAccent:     theme.colorAccent,
        nombreEmpresa:   theme.nombreEmpresa,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSistema]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveTheme({ logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSaveBrand = () => {
    saveTheme(draft);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2500);
  };

  const handleResetBrand = () => {
    const defaults = {
      colorPrimario:   DEFAULT_THEME.colorPrimario,
      colorSecundario: DEFAULT_THEME.colorSecundario,
      colorAccent:     DEFAULT_THEME.colorAccent,
      nombreEmpresa:   DEFAULT_THEME.nombreEmpresa,
    };
    setDraft(defaults);
    saveTheme(defaults);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2500);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description={`Cultivos, formularios y usuarios — ${currentClienteName}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowSistema(true)}
          >
            <Settings2 className="w-4 h-4" />
            Ajustes del sistema
          </Button>
        }
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
          <TabFormularios onPendingChange={setHasPending} />
        </TabsContent>
        <TabsContent value="empresas">
          <TabEmpresas />
        </TabsContent>
        <TabsContent value="usuarios">
          <TabUsuarios />
        </TabsContent>
      </Tabs>

      {/* ═══ Sheet: Ajustes del sistema ══════════════════════════════════════ */}
      <Sheet open={showSistema} onOpenChange={setShowSistema}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Ajustes del sistema
            </SheetTitle>
            <SheetDescription>
              Personalización de marca y configuración avanzada de la plataforma.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Marca */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                Marca
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Logo de la Empresa</Label>
                  {/* Input oculto para el file picker */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  {theme.logo ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative inline-block">
                        <img
                          src={theme.logo}
                          alt="Logo de la empresa"
                          className="h-16 max-w-[180px] object-contain rounded-lg border border-border bg-muted/30 p-1"
                        />
                        <button
                          onClick={() => saveTheme({ logo: null })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                          title="Eliminar logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-2 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">Arrastra tu logo o haz click</p>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input
                    id="nombreEmpresa"
                    value={draft.nombreEmpresa}
                    onChange={e => setDraft(p => ({ ...p, nombreEmpresa: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Colores</p>
                  <div className="space-y-3">
                    {(["colorPrimario", "colorSecundario", "colorAccent"] as const).map((key, i) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={draft[key]}
                          onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                          className="w-9 h-9 rounded-md cursor-pointer border border-border shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            {["Color Primario", "Color Secundario", "Color de Acento"][i]}
                          </p>
                          <Input
                            value={draft[key]}
                            onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleResetBrand}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restaurar
                  </Button>
                  <div className="flex items-center gap-2">
                    {brandSaved && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Guardado
                      </span>
                    )}
                    <Button size="sm" onClick={handleSaveBrand}>Guardar cambios</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Avanzado */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                Avanzado
              </h3>
              <div className="space-y-4">
                {/* Modo oscuro — controlado */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Modo Oscuro</p>
                    <p className="text-xs text-muted-foreground">Activar tema oscuro para la interfaz</p>
                  </div>
                  <Switch checked={theme.darkMode} onCheckedChange={toggleDarkMode} />
                </div>
                {/* Otros ajustes (sin backend aún) */}
                {[
                  { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo",     checked: true  },
                  { label: "Auto-guardado",            desc: "Guardar cambios automáticamente en tablas",  checked: true  },
                  { label: "Multi-tenant activo",      desc: "Habilitar aislamiento de datos por empresa", checked: true  },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
};

export default Configuracion;
