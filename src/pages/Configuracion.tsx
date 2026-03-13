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
  Upload, X, Plus, Save,
  Trash2, Info, CheckCircle2, Check, Clock, Archive, Leaf, Search, Copy, History,
  ChevronDown,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import {
  useRole, hardcodedUsers,
  ALL_MODULES, ALL_ACTIONS,
  ROLE_LEVELS, CLIENTES_DEMO,
  type UserRole as UserRoleT, type ActionPermission,
} from "@/contexts/RoleContext";
import {
  tipoBadgeColor, tipoLabels, estadoBadge,
  type ModDef, type ModParam, type Parametro,
  type TipoConfig, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad,
} from "@/config/moduleDefinitions";
import { VersionDiffDialog } from "@/components/dashboard/VersionDiffDialog";
import { CampoConfigDrawer } from "@/components/dashboard/CampoConfigDrawer";
import {
  Shield, ShieldCheck, Sprout as SproutIcon, Briefcase, Eye,
  BookOpen as BookOpenAlt, Mail, Calendar,
  ShieldAlert, AlertTriangle, Users2,
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
    definiciones, parametros, cultivos,
    addDef, updDef, delDef, dupDef,
    getDefSnapshots, createSnapshot,
    addPar, updParFull, delParByIdx,
  } = useConfig();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [searchDef,       setSearchDef]       = useState("");
  const [expandedCampos,  setExpandedCampos]  = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [configCampoId,   setConfigCampoId]   = useState<string | null>(null);
  const [showBiblioteca,  setShowBiblioteca]  = useState(false);
  const [pendingOpenId,   setPendingOpenId]   = useState<string | null>(null);

  const [confirmDup, setConfirmDup] = useState<{
    rootId: string; sourceId: string; sourceName: string;
    sourceVersion: string; newVersion: string; paramCount: number; newName: string;
  } | null>(null);
  const [historyDefId, setHistoryDefId] = useState<string | null>(null);
  const [snapModal, setSnapModal] = useState<{ open: boolean; defId: string; nombre: string }>({
    open: false, defId: "", nombre: "",
  });

  // ── Agrupación en familias de versiones ─────────────────────────────────────
  const families = useMemo(() => {
    const map = new Map<string, ModDef[]>();
    definiciones.forEach(d => {
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
  }, [definiciones]);

  const filteredFamilies = useMemo(() =>
    families.filter(f =>
      (f.rep?.nombre ?? "").toLowerCase().includes(searchDef.toLowerCase()) ||
      f.versions.some(v => v.nombre.toLowerCase().includes(searchDef.toLowerCase()))
    ),
    [families, searchDef]
  );

  const toggleExpandCampos  = (rootId: string) =>
    setExpandedCampos(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });
  const toggleExpandHistory = (rootId: string) =>
    setExpandedHistory(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });

  // Auto-abrir drawer para campo recién creado
  useEffect(() => {
    if (!pendingOpenId) return;
    const camposForDef = parametros.filter(p => p.definicion_id === pendingOpenId);
    if (camposForDef.length > 0) {
      const newest = camposForDef[camposForDef.length - 1];
      setConfigCampoId(newest.id);
      setPendingOpenId(null);
    }
  }, [parametros, pendingOpenId]);

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
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setShowBiblioteca(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            Biblioteca
          </Button>
          <Button size="sm" onClick={() => addDef()}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva definición
          </Button>
        </div>
      </div>

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
              {!searchDef && "Crea el primer formulario para comenzar."}
            </p>
          </div>
          {!searchDef && (
            <Button onClick={() => addDef()}>
              <Plus className="w-4 h-4 mr-2" /> Nueva definición
            </Button>
          )}
        </div>
      )}

      {/* ── Grid de tarjetas ──────────────────────────────────────────────── */}
      {filteredFamilies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFamilies.map(({ rootId, versions, latest, rep }) => {
            const campos       = parametros.filter(p => p.definicion_id === latest.id);
            const hasHistory   = versions.length > 1;
            const isExpCampos  = expandedCampos.has(rootId);
            const isExpHistory = expandedHistory.has(rootId);
            const snapCount    = getDefSnapshots(latest.id).length;

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
                      <button
                        onClick={() => setSnapModal({ open: true, defId: latest.id, nombre: latest.nombre })}
                        title="Crear snapshot / nueva versión"
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setHistoryDefId(latest.id)}
                        title="Ver historial de snapshots"
                        className={cn(
                          "p-1 rounded transition-colors",
                          snapCount > 0 ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <History className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nombre y metadatos */}
                  <div className="mt-2">
                    <h3 className="font-semibold text-foreground leading-snug">
                      {rep.nombre || <span className="italic text-muted-foreground">(sin nombre)</span>}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{MODULO_OPTIONS.find(m => m.value === latest.modulo)?.label ?? latest.modulo}</span>
                      {latest.cultivo_id && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Leaf className="w-3 h-3" />
                            {cultivos.find(c => c.id === latest.cultivo_id)?.nombre ?? latest.cultivo_id}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Historial de versiones (expandible) ───────────────── */}
                {isExpHistory && hasHistory && (
                  <div className="px-4 py-3 border-b border-border bg-muted/10">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1">
                      <History className="w-3 h-3" /> Historial de versiones
                    </p>
                    <div className="space-y-2">
                      {versions.map((v, i) => (
                        <div key={v.id} className="flex items-center gap-2 text-xs">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            v.estado === "activo"   ? "bg-green-500" :
                            v.estado === "borrador" ? "bg-yellow-400" : "bg-gray-300",
                          )} />
                          <span className="font-mono font-semibold">v{v.version}</span>
                          {i === 0 && <span className="text-[10px] text-primary font-medium">(última)</span>}
                          <p className="text-[10px] text-muted-foreground truncate flex-1">{v.nombre}</p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                            estadoBadge[v.estado ?? "borrador"],
                          )}>
                            {v.estado}
                          </span>
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
                            <div className="flex items-center gap-2 min-w-0">
                              {campo.obligatorio && (
                                <span className="text-destructive font-bold text-[10px] shrink-0" title="Obligatorio">*</span>
                              )}
                              <span className="text-xs font-medium text-foreground truncate">
                                {campo.nombre || <span className="italic text-muted-foreground">sin nombre</span>}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0 bg-background border border-border px-1.5 py-0.5 rounded">
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
                        ))
                      )}
                      <button
                        onClick={() => {
                          addPar(latest.id);
                          setPendingOpenId(latest.id);
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
              </div>
            );
          })}

          {/* Tarjeta para nueva definición */}
          <button
            onClick={() => addDef()}
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Nueva definición</span>
          </button>
        </div>
      )}

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

      {/* ── Modal: snapshot / nueva versión ──────────────────────────────── */}
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

      {/* ── Diálogo: historial de snapshots ──────────────────────────────── */}
      {historyDefId && (
        <VersionDiffDialog
          defId={historyDefId}
          open={!!historyDefId}
          onClose={() => setHistoryDefId(null)}
        />
      )}

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
    </div>
  );
}

// ─── Hub de Cultivos ──────────────────────────────────────────────────────────

function TabCultivos() {
  const {
    cultivos, addCultivo, updCultivo, delCultivo,
    variedades, addVariedad, updVariedad, delVariedad,
    definiciones, addDef, updDef, delDef,
  } = useConfig();
  const navigate = useNavigate();
  const { role } = useRole();
  const isSuperAdmin = role === "super_admin";

  const firstActive = cultivos.find(c => c.activo)?.id ?? cultivos[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(firstActive);

  // ── Modal: nuevo cultivo ───────────────────────────────────────────────────
  const [showAddCultivo,  setShowAddCultivo]  = useState(false);
  const [newCultivoForm,  setNewCultivoForm]  = useState({ nombre: "", codigo: "", descripcion: "" });
  const prevCultivoLen = useRef(cultivos.length);

  // Auto-seleccionar el cultivo recién creado
  useEffect(() => {
    if (cultivos.length > prevCultivoLen.current) {
      setSelectedId(cultivos[cultivos.length - 1].id);
    }
    prevCultivoLen.current = cultivos.length;
  }, [cultivos.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const cultivo     = cultivos.find(c => c.id === selectedId);
  const cultivoVars = variedades.filter(v => v.cultivo_id === selectedId);
  const cultivoDefs = definiciones.filter(d => d.cultivo_id === selectedId);

  // ── Columnas variedades ────────────────────────────────────────────────────
  const colsVariedades: Column<Variedad>[] = [
    { key: "nombre",      header: "Variedad",      width: "160px", required: true },
    { key: "codigo",      header: "Código",         width: "80px"  },
    { key: "descripcion", header: "Descripción",    width: "280px" },
    { key: "activo",      header: "Activa",          width: "75px", type: "checkbox", filterable: true },
  ];

  // ── Columnas formularios ───────────────────────────────────────────────────
  const colsFormularios: Column<ModDef>[] = [
    { key: "modulo",       header: "Módulo",        width: "150px", type: "select", options: MODULO_OPTIONS, filterable: true },
    { key: "tipo",         header: "Tipo",           width: "150px", type: "select", options: TIPO_OPTIONS,   filterable: true },
    { key: "nombre",       header: "Nombre",          width: "200px" },
    { key: "version",      header: "Versión",          width: "70px"  },
    { key: "nivel_minimo", header: "Nivel mín.",       width: "85px", type: "number" },
    { key: "estado",       header: "Estado",            width: "110px", type: "select", options: ESTADO_OPTIONS, filterable: true },
  ];

  // ── CRUD wrappers ──────────────────────────────────────────────────────────
  const updV = (idx: number, k: keyof Variedad, v: unknown) =>
    updVariedad(cultivoVars[idx].id, k, v);
  const delV = (idx: number) => delVariedad(cultivoVars[idx].id);

  const updF = (idx: number, k: keyof ModDef, v: unknown) => {
    const absIdx = definiciones.findIndex(d => d.id === cultivoDefs[idx]?.id);
    if (absIdx !== -1) updDef(absIdx, k, v);
  };
  const delF = (idx: number) => {
    const absIdx = definiciones.findIndex(d => d.id === cultivoDefs[idx]?.id);
    if (absIdx !== -1) delDef(absIdx);
  };

  return (
    <div className="space-y-6">
      <InfoBanner storageKey="cultivos">
        <strong>Cultivos y Variedades</strong> — gestiona los cultivos habilitados según el plan del cliente.
        Cada cultivo puede tener variedades y formularios asociados que definen los campos de captura en cada módulo.
      </InfoBanner>

      {/* ── Chips selector de cultivo ─────────────────────────────────────── */}
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
            onClick={() => setShowAddCultivo(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo cultivo
          </button>
        )}
      </div>

      {/* ── Panel del cultivo seleccionado ───────────────────────────────── */}
      {cultivo ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Cabecera del cultivo */}
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

          {/* Variedades + Formularios */}
          <div className="p-4 space-y-5">
            {/* Variedades compactas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-muted-foreground" />
                  Variedades de {cultivo.nombre}
                  <span className="text-xs font-normal text-muted-foreground">({cultivoVars.length})</span>
                </h4>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVariedad(selectedId)}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
              {cultivoVars.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">Sin variedades registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cultivoVars.map((v, idx) => (
                    <div
                      key={v.id}
                      className={cn(
                        "group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                        v.activo
                          ? "bg-muted/40 border-border text-foreground hover:bg-muted"
                          : "bg-muted/20 border-border/50 text-muted-foreground line-through",
                      )}
                    >
                      <span>{v.nombre || <span className="italic">sin nombre</span>}</span>
                      {v.codigo && <span className="text-muted-foreground font-normal">[{v.codigo}]</span>}
                      <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updV(idx, "activo", !v.activo)}
                          title={v.activo ? "Desactivar" : "Activar"}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {v.activo
                            ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                            : <Clock className="w-3 h-3" />
                          }
                        </button>
                        <button
                          onClick={() => delV(idx)}
                          title="Eliminar variedad"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formularios del cultivo */}
            {cultivoDefs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center border border-dashed border-border rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Sin formularios para {cultivo.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crea un formulario para definir los campos de captura en los módulos.
                  </p>
                </div>
                <Button size="sm" onClick={() => addDef(selectedId)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Crear formulario
                </Button>
              </div>
            ) : (
              <div>
                <EditableTable
                  title={`Formularios de ${cultivo.nombre}`}
                  data={cultivoDefs}
                  columns={colsFormularios}
                  onUpdate={updF}
                  onDelete={delF}
                  onAdd={() => addDef(selectedId)}
                />
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3 mt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>
                      {cultivoDefs.length} formulario{cultivoDefs.length !== 1 ? "s" : ""} asignado{cultivoDefs.length !== 1 ? "s" : ""} a este cultivo
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/configuracion?tab=formularios")}
                    className="gap-1.5 text-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Gestionar formularios →
                  </Button>
                </div>
              </div>
            )}
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
            <Button onClick={() => setShowAddCultivo(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Cultivo
            </Button>
          )}
        </div>
      )}

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

// ─── Tab Usuarios (permisos especiales) ──────────────────────────────────────

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

const mockUsersTab = hardcodedUsers.map(u => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: roleNameMap[u.role],
  roleKey: u.role,
  nivel: ROLE_LEVELS[u.role],
  clienteId: u.clienteId,
  empresa: u.clienteId ? CLIENTES_DEMO.find(c => c.id === u.clienteId)?.nombre ?? "—" : "Plataforma",
  modulo: u.modulo ? u.modulo.charAt(0).toUpperCase() + u.modulo.slice(1) : "Todos",
  estado: "Activo" as const,
  ultimoAcceso: u.id <= 3 ? "Hoy 09:30" : u.id === 4 ? "Hoy 10:00" : u.id === 5 ? "Hoy 07:55" : "Hace 3 días",
}));

function TabUsuarios() {
  const {
    addOverride, removeOverride,
    getUserOverrides, getRoleBasePermissions,
  } = useRole();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [addModal,       setAddModal]       = useState(false);
  const [search,         setSearch]         = useState("");
  const [filterRol,      setFilterRol]      = useState("todos");
  const [filterEmpresa,  setFilterEmpresa]  = useState("todas");
  const [newOverride, setNewOverride] = useState({
    modulo: "cultivo",
    accion: "exportar" as ActionPermission,
    habilitado: true,
    justificacion: "",
  });

  const selectedUser  = selectedUserId ? mockUsersTab.find(u => u.id === selectedUserId) : null;
  const userOverrides = selectedUserId ? getUserOverrides(selectedUserId) : [];

  // ── Opciones de filtro ─────────────────────────────────────────────────────
  const rolesDisponibles  = Array.from(new Set(mockUsersTab.map(u => u.rol)));
  const empresasDisponibles = Array.from(new Set(mockUsersTab.map(u => u.empresa)));

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const usuariosFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return mockUsersTab.filter(u =>
      (filterRol     === "todos"  || u.rol     === filterRol) &&
      (filterEmpresa === "todas"  || u.empresa === filterEmpresa) &&
      (!q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [search, filterRol, filterEmpresa]);

  const handleAddOverride = () => {
    if (!selectedUserId || !newOverride.justificacion.trim()) return;
    addOverride({
      userId:        selectedUserId,
      modulo:        newOverride.modulo,
      accion:        newOverride.accion,
      habilitado:    newOverride.habilitado,
      justificacion: newOverride.justificacion.trim(),
    });
    setAddModal(false);
    setNewOverride({ modulo: "cultivo", accion: "exportar", habilitado: true, justificacion: "" });
  };

  // ── Avatar con iniciales ───────────────────────────────────────────────────
  const avatarColors = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",   "bg-green-100 text-green-700",
    "bg-cyan-100 text-cyan-700",     "bg-rose-100 text-rose-700",
  ];
  const initials = (nombre: string) =>
    nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <div className="space-y-4">
      <InfoBanner storageKey="usuarios">
        <strong>Gestión de Usuarios</strong> — administra usuarios y configura permisos especiales
        (excepciones al rol) por módulo y acción.
      </InfoBanner>

      {/* ── Barra de búsqueda y filtros ───────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuario o email…"
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
          {usuariosFiltrados.length} de {mockUsersTab.length} usuarios
        </span>
      </div>

      {/* ── Cuerpo: tabla + panel ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Tabla compacta ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {usuariosFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Sin usuarios que coincidan con los filtros.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Rol</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Acceso</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Esp.</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((user, i) => {
                    const config       = rolConfig[user.rol];
                    const RolIcon      = config?.icon ?? Shield;
                    const overrideCount = getUserOverrides(user.id).length;
                    const isSelected   = selectedUserId === user.id;
                    const avatarColor  = avatarColors[i % avatarColors.length];

                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUserId(prev => prev === user.id ? null : user.id)}
                        className={cn(
                          "border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                          isSelected && "bg-primary/5",
                        )}
                      >
                        {/* Usuario: avatar + nombre + email + empresa */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isSelected && (
                              <div className="w-0.5 h-8 bg-primary rounded-full shrink-0 -ml-2 mr-1.5" />
                            )}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              avatarColor,
                            )}>
                              {initials(user.nombre)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{user.nombre}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                              <p className="text-[10px] text-muted-foreground/70 truncate">{user.empresa}</p>
                            </div>
                          </div>
                        </td>

                        {/* Rol + nivel */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full w-fit",
                              config?.color,
                            )}>
                              <RolIcon className="w-2.5 h-2.5" />
                              {user.rol}
                            </span>
                            <div className="flex items-center gap-1 px-1">
                              {Array.from({ length: 6 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "h-1 flex-1 rounded-full",
                                    idx < user.nivel ? "bg-primary" : "bg-muted",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Estado + último acceso */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                              {user.estado}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {user.ultimoAcceso}
                            </span>
                          </div>
                        </td>

                        {/* Permisos especiales */}
                        <td className="px-4 py-3 text-center">
                          {overrideCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              <ShieldAlert className="w-3 h-3" />
                              {overrideCount}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Panel de permisos especiales ───────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Permisos Especiales
              </h3>
              {selectedUser && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddModal(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              )}
            </div>

            {!selectedUser ? (
              <div className="px-4 py-10 text-center">
                <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecciona un usuario para ver y gestionar sus permisos especiales.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Mini perfil del usuario seleccionado */}
                <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    avatarColors[mockUsersTab.findIndex(u => u.id === selectedUser.id) % avatarColors.length],
                  )}>
                    {initials(selectedUser.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{selectedUser.nombre}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.rol} · Nivel {selectedUser.nivel}</p>
                  </div>
                </div>

                {/* Permisos base */}
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Permisos base del rol
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {ALL_MODULES.map(m => {
                      const perms = getRoleBasePermissions(selectedUser.roleKey, m.value);
                      if (perms.length === 0) return null;
                      return (
                        <div key={m.value} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-foreground truncate">{m.label}</span>
                          <div className="flex gap-0.5 shrink-0">
                            {perms.map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Excepciones personalizadas */}
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Excepciones personalizadas
                  </h4>
                  {userOverrides.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Sin permisos especiales configurados.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userOverrides.map(ov => {
                        const moduloLabel = ALL_MODULES.find(m => m.value === ov.modulo)?.label ?? ov.modulo;
                        const accionLabel = ALL_ACTIONS.find(a => a.value === ov.accion)?.label ?? ov.accion;
                        return (
                          <div key={ov.id} className="bg-muted/30 rounded-lg p-2.5 border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0",
                                  ov.habilitado ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                                )}>
                                  {ov.habilitado ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                </span>
                                <span className="text-xs font-medium text-foreground">
                                  {accionLabel} · {moduloLabel}
                                </span>
                              </div>
                              <button
                                onClick={() => removeOverride(ov.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground pl-5">{ov.justificacion}</p>
                            <p className="text-[10px] text-muted-foreground/50 pl-5">Creado: {ov.createdAt}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: nuevo permiso especial ─────────────────────────────────── */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Nuevo Permiso Especial
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-2.5 border border-border text-xs flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  avatarColors[mockUsersTab.findIndex(u => u.id === selectedUser.id) % avatarColors.length],
                )}>
                  {initials(selectedUser.nombre)}
                </div>
                <div>
                  <span className="font-medium">{selectedUser.nombre}</span>
                  <span className="text-muted-foreground"> · {selectedUser.rol}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Módulo</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newOverride.modulo}
                    onChange={e => setNewOverride(p => ({ ...p, modulo: e.target.value }))}
                  >
                    {ALL_MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Acción</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newOverride.accion}
                    onChange={e => setNewOverride(p => ({ ...p, accion: e.target.value as ActionPermission }))}
                  >
                    {ALL_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">¿Permitir esta acción?</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newOverride.habilitado}
                    onCheckedChange={v => setNewOverride(p => ({ ...p, habilitado: v }))}
                  />
                  <span className={cn("text-xs font-medium", newOverride.habilitado ? "text-success" : "text-destructive")}>
                    {newOverride.habilitado ? "Permitido" : "Bloqueado"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Justificación <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newOverride.justificacion}
                  onChange={e => setNewOverride(p => ({ ...p, justificacion: e.target.value }))}
                  placeholder="Ej: Permiso temporal para auditoría Q1 2025"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se registra para auditoría interna. Explica el motivo del permiso especial.
                </p>
              </div>

              {(() => {
                const basePerms  = getRoleBasePermissions(selectedUser.roleKey, newOverride.modulo);
                const hasBase    = basePerms.includes(newOverride.accion);
                const isRedundant = (hasBase && newOverride.habilitado) || (!hasBase && !newOverride.habilitado);
                return (
                  <div className={cn(
                    "rounded-lg p-2.5 border text-xs flex items-start gap-2",
                    isRedundant
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                      : "bg-primary/5 border-primary/20 text-primary",
                  )}>
                    {isRedundant
                      ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      : <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    }
                    <span>
                      {isRedundant
                        ? `Redundante: el rol ${selectedUser.rol} ya ${hasBase ? "tiene" : "no tiene"} "${newOverride.accion}" en ${ALL_MODULES.find(m => m.value === newOverride.modulo)?.label}.`
                        : `Esto ${newOverride.habilitado ? "otorgará" : "bloqueará"} "${newOverride.accion}" en ${ALL_MODULES.find(m => m.value === newOverride.modulo)?.label} — diferente al permiso base del rol.`
                      }
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddOverride} disabled={!newOverride.justificacion.trim()}>
              <Plus className="w-4 h-4 mr-1.5" /> Guardar permiso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface BrandConfig {
  nombreEmpresa:   string;
  colorPrimario:   string;
  colorSecundario: string;
  colorAccent:     string;
}

const Configuracion = () => {
  const [searchParams] = useSearchParams();
  const validTabs      = ["cultivos", "formularios", "usuarios"];
  const initialTab     = validTabs.includes(searchParams.get("tab") ?? "") ? (searchParams.get("tab") ?? "cultivos") : "cultivos";

  const [activeTab, setActiveTab] = useState(initialTab);
  const { hasPendingChanges: hasPending, setHasPendingChanges: setHasPending } = useConfig();
  const { currentClienteName } = useRole();

  const [showSistema, setShowSistema] = useState(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    nombreEmpresa:   "BlueData",
    colorPrimario:   "#1a5c3a",
    colorSecundario: "#40916c",
    colorAccent:     "#d4a72d",
  });

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
            <Leaf className="w-4 h-4" /> Cultivos
          </TabsTrigger>
          <TabsTrigger
            value="formularios"
            disabled={hasPending && activeTab !== "formularios"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Layers className="w-4 h-4" /> Formularios
          </TabsTrigger>
          <TabsTrigger
            value="usuarios"
            disabled={hasPending && activeTab !== "usuarios"}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Users2 className="w-4 h-4" /> Usuarios
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
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-2">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">Arrastra tu logo o haz click</p>
                    <Button variant="outline" size="sm">Seleccionar archivo</Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input
                    id="nombreEmpresa"
                    value={brandConfig.nombreEmpresa}
                    onChange={e => setBrandConfig(p => ({ ...p, nombreEmpresa: e.target.value }))}
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
                          value={brandConfig[key]}
                          onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                          className="w-9 h-9 rounded-md cursor-pointer border border-border shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            {["Color Primario", "Color Secundario", "Color de Acento"][i]}
                          </p>
                          <Input
                            value={brandConfig[key]}
                            onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm">Guardar cambios</Button>
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
                {[
                  { label: "Modo Oscuro",              desc: "Activar tema oscuro para la interfaz",       checked: false },
                  { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo",     checked: true  },
                  { label: "Auto-guardado",             desc: "Guardar cambios automáticamente en tablas",  checked: true  },
                  { label: "Multi-tenant activo",       desc: "Habilitar aislamiento de datos por empresa", checked: true  },
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
