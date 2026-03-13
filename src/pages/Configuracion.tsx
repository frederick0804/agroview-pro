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
  Layers, List, Table2, Palette, Settings2, BookOpen,
  Upload, ChevronDown, ChevronUp, X, Plus, Save,
  Trash2, Info, CheckCircle2, Clock, Archive, Database, Leaf, Search, Copy, History, User,
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

// ─── Version helpers ──────────────────────────────────────────────────────────

/** Incrementa la parte minor (X.Y → X.Y+1) o major (X.Y → X+1.0) de una versión. */
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

// ─── Panel de Definiciones ────────────────────────────────────────────────────

function TabDefiniciones({ onPendingChange, onNavigateToCampos }: { onPendingChange?: (v: boolean) => void; onNavigateToCampos?: (defId: string) => void }) {
  const { definiciones, parametros, datos, addDef, updDef, delDef, dupDef, cultivos, getDefSnapshots, createSnapshot } = useConfig();
  const navigate = useNavigate();
  const [searchDef,             setSearchDef]             = useState("");
  const [expandedFamilies,      setExpandedFamilies]      = useState<Set<string>>(new Set());
  const [expandedVersionCampos, setExpandedVersionCampos] = useState<Set<string>>(new Set());
  const [activeFamilyId,        setActiveFamilyId]        = useState<string | null>(null);
  const [confirmDup,            setConfirmDup]            = useState<{
    rootId: string; sourceId: string; sourceName: string;
    sourceVersion: string; newVersion: string; paramCount: number;
    newName: string;
  } | null>(null);
  const [historyDefId, setHistoryDefId] = useState<string | null>(null);
  const [snapModal, setSnapModal] = useState<{ open: boolean; defId: string; nombre: string }>({ open: false, defId: "", nombre: "" });

  const cultivoOptions = [
    { value: "",  label: "— Global —" },
    ...cultivos.map(c => ({ value: c.id, label: c.nombre })),
  ];

  // ── Agrupación por familia de versiones ───────────────────────────────────
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

  const toggleFamily        = (rootId: string) =>
    setExpandedFamilies(prev => { const n = new Set(prev); n.has(rootId) ? n.delete(rootId) : n.add(rootId); return n; });

  const toggleVersionCampos = (vId: string) =>
    setExpandedVersionCampos(prev => { const n = new Set(prev); n.has(vId) ? n.delete(vId) : n.add(vId); return n; });

  const selectFamily = (rootId: string) => {
    setActiveFamilyId(prev => {
      if (prev === rootId) return null;
      // Auto-expand history when selecting a multi-version family
      const fam = families.find(f => f.rootId === rootId);
      if (fam && fam.versions.length > 1)
        setExpandedFamilies(p => new Set([...p, rootId]));
      return rootId;
    });
  };

  // Table data: filtered by active family or all
  const tableData = activeFamilyId
    ? definiciones.filter(d => (d.origen_id ?? d.id) === activeFamilyId)
    : definiciones;

  // Map filtered row index → absolute definiciones index
  const handleTableUpdate = (rowIdx: number, key: keyof ModDef, val: unknown) => {
    const absIdx = definiciones.findIndex(d => d.id === tableData[rowIdx]?.id);
    if (absIdx !== -1) updDef(absIdx, key, val);
  };
  const handleTableDelete = (rowIdx: number) => {
    const absIdx = definiciones.findIndex(d => d.id === tableData[rowIdx]?.id);
    if (absIdx !== -1) delDef(absIdx);
  };

  const activeFamily = activeFamilyId ? families.find(f => f.rootId === activeFamilyId) : null;

  const colsDefinicion: Column<ModDef>[] = [
    { key: "cultivo_id",   header: "Cultivo",      width: "130px", type: "select",  options: cultivoOptions },
    { key: "modulo",       header: "Módulo",        width: "150px", type: "select",  options: MODULO_OPTIONS },
    { key: "tipo",         header: "Tipo",           width: "150px", type: "select",  options: TIPO_OPTIONS },
    { key: "nombre",       header: "Nombre",          width: "200px", required: true },
    { key: "descripcion",  header: "Descripción",     width: "240px" },
    {
      key: "version", header: "Versión", width: "90px", editable: false,
      render: (value) => (
        <div className="px-3 py-2.5">
          <span className="text-xs font-mono font-semibold bg-muted/60 text-foreground px-2 py-0.5 rounded">
            v{String(value ?? "1.0")}
          </span>
        </div>
      ),
    },
    { key: "nivel_minimo", header: "Nivel mín.", width: "85px",  type: "number" },
    { key: "estado",       header: "Estado",      width: "110px", type: "select", options: ESTADO_OPTIONS },
  ];

  return (
    <>
    <div className="flex gap-4 items-start">

      {/* ── Sidebar: familias de versiones ─────────────────────────────────── */}
      <div className="w-64 shrink-0 bg-card border border-border rounded-xl overflow-hidden">

        {/* Cabecera */}
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Formularios ({families.length})
          </span>
          <button
            onClick={() => addDef()}
            title="Nueva definición"
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-2 py-1.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input
              value={searchDef}
              onChange={e => setSearchDef(e.target.value)}
              placeholder="Buscar formulario…"
              className="w-full pl-6 pr-2 py-1 text-xs rounded-md bg-muted/40 border border-transparent focus:border-primary/40 focus:outline-none focus:bg-background transition-colors"
            />
            {searchDef && (
              <button onClick={() => setSearchDef("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de familias */}
        <div className="flex flex-col max-h-[640px] overflow-y-auto divide-y divide-border/40">
          {filteredFamilies.map(({ rootId, versions, latest, rep }) => {
            const isExpanded   = expandedFamilies.has(rootId);
            const isActive     = activeFamilyId === rootId;
            const hasHistory   = versions.length > 1;
            const latestCampos = parametros.filter(p => p.definicion_id === latest.id).length;
            const latestDatos  = datos.filter(dt => dt.definicion_id === latest.id).length;

            return (
              <div key={rootId} className={cn("relative transition-colors", isActive && "bg-primary/5")}>
                {/* Indicador de selección */}
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-10" />}

                {/* Tarjeta de familia — click para seleccionar */}
                <div
                  className="px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => selectFamily(rootId)}
                >
                  {/* Badges */}
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
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
                        onClick={e => { e.stopPropagation(); toggleFamily(rootId); }}
                        title={isExpanded ? "Ocultar historial" : "Ver historial de versiones"}
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none transition-colors",
                          isExpanded
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <History className="w-2.5 h-2.5" />
                        {versions.length}v
                      </button>
                    )}
                  </div>

                  {/* Nombre */}
                  <p className="text-xs font-semibold text-foreground truncate leading-snug">{rep.nombre}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="truncate">
                      {MODULO_OPTIONS.find(m => m.value === latest.modulo)?.label ?? latest.modulo}
                    </span>
                    <span className="shrink-0 flex items-center gap-1"><List className="w-2.5 h-2.5" />{latestCampos}</span>
                    <span className="shrink-0 flex items-center gap-1"><Database className="w-2.5 h-2.5" />{latestDatos}</span>
                  </div>

                  {/* Control de versiones */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40">
                    <span className="text-[10px] font-mono font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      v{latest.version || "1.0"}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const idx = definiciones.findIndex(def => def.id === latest.id);
                          if (idx !== -1) updDef(idx, "version", bumpV(latest.version || "1.0", "minor"));
                        }}
                        title="Incrementar versión menor (ej. 1.0 → 1.1)"
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                      >
                        +0.1
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmDup({
                            rootId,
                            sourceId:      latest.id,
                            sourceName:    latest.nombre,
                            sourceVersion: latest.version || "1.0",
                            newVersion:    bumpV(latest.version || "1.0", "major"),
                            paramCount:    parametros.filter(p => p.definicion_id === latest.id).length,
                            newName:       latest.nombre,
                          });
                        }}
                        title="Nueva versión mayor — copia el formulario incrementando la versión en +1.0"
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 px-1.5 py-0.5 rounded transition-colors"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        Nueva v
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSnapModal({ open: true, defId: latest.id, nombre: latest.nombre }); }}
                        className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors text-emerald-600 hover:bg-emerald-500/10"
                        title="Crear nueva versión (snapshot)"
                      >
                        <Save className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setHistoryDefId(latest.id); }}
                        className={cn(
                          "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors",
                          getDefSnapshots(latest.id).length > 0
                            ? "text-primary hover:bg-primary/10"
                            : "text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <History className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Historial expandible ──────────────────────────────── */}
                {isExpanded && hasHistory && (
                  <div className="bg-muted/20 border-t border-border/40 px-3 pt-2 pb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Historial de versiones
                    </p>

                    <div className="relative ml-1">
                      {versions.map((v, timelineIdx) => {
                        const vCampos       = parametros.filter(p => p.definicion_id === v.id);
                        const isLatest      = timelineIdx === 0;
                        const isLast        = timelineIdx === versions.length - 1;
                        const camposOpen    = expandedVersionCampos.has(v.id);

                        return (
                          <div key={v.id} className="flex items-start gap-2.5 pb-3 last:pb-0 relative">
                            {!isLast && (
                              <div className="absolute left-[5px] top-3.5 w-px bottom-0 bg-border" />
                            )}

                            {/* Dot */}
                            <div className={cn(
                              "w-[11px] h-[11px] rounded-full border-2 shrink-0 mt-0.5 z-10",
                              v.estado === "activo"   ? "bg-green-500 border-green-600" :
                              v.estado === "borrador" ? "bg-yellow-400 border-yellow-500" :
                                                        "bg-muted-foreground/30 border-muted-foreground/50",
                            )} />

                            <div className="flex-1 min-w-0">
                              {/* Versión + estado */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-mono font-bold text-foreground">v{v.version}</span>
                                  {isLatest && <span className="text-[9px] text-primary font-medium">(última)</span>}
                                </div>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                                  estadoBadge[v.estado ?? "borrador"],
                                )}>
                                  {v.estado}
                                </span>
                              </div>

                              {/* Nombre */}
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.nombre}</p>

                              {/* Acciones + campos toggle */}
                              <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                                {/* Toggle campos */}
                                <button
                                  onClick={e => { e.stopPropagation(); toggleVersionCampos(v.id); }}
                                  title={camposOpen ? "Ocultar campos" : "Ver campos de esta versión"}
                                  className={cn(
                                    "text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors",
                                    camposOpen
                                      ? "text-primary bg-primary/10"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                  )}
                                >
                                  <List className="w-2.5 h-2.5" />
                                  {vCampos.length}c
                                </button>

                                {/* Cambiar estado */}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const next: EstadoDef =
                                      v.estado === "activo"   ? "archivado" :
                                      v.estado === "borrador" ? "activo"    : "borrador";
                                    const di = definiciones.findIndex(def => def.id === v.id);
                                    if (di !== -1) updDef(di, "estado", next);
                                  }}
                                  className="text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                                >
                                  {v.estado === "activo"   ? "→ archivar" :
                                   v.estado === "borrador" ? "→ activar"  : "→ borrador"}
                                </button>

                                {isLatest && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      const di = definiciones.findIndex(def => def.id === v.id);
                                      if (di !== -1) updDef(di, "version", bumpV(v.version || "1.0", "minor"));
                                    }}
                                    className="text-[9px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    +0.1
                                  </button>
                                )}
                              </div>

                              {/* Lista de campos expandible */}
                              {camposOpen && (
                                <div className="mt-1.5 border-l-2 border-border/60 pl-2 space-y-0.5">
                                  {vCampos.length === 0 ? (
                                    <p className="text-[9px] text-muted-foreground italic">Sin campos configurados</p>
                                  ) : (
                                    vCampos.sort((a, b) => a.orden - b.orden).map(p => (
                                      <div key={p.id} className="flex items-center gap-1 text-[9px]">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                        <span className="font-medium text-foreground truncate flex-1">{p.nombre}</span>
                                        <span className="text-muted-foreground/60 shrink-0">{p.tipo_dato}</span>
                                        {p.obligatorio && <span className="text-destructive font-bold shrink-0 ml-0.5">*</span>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredFamilies.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {searchDef ? "Sin resultados." : "Sin definiciones aún."}
            </p>
          )}
        </div>
      </div>

      {/* ── Panel derecho: banner de filtro + tabla ──────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">

        {/* Banner de versión activa */}
        {activeFamily && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Versiones de:</span>
              <span className="font-semibold truncate">{activeFamily.rep?.nombre}</span>
              <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                {activeFamily.versions.length}v
              </span>
            </div>
            <button
              onClick={() => setActiveFamilyId(null)}
              className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors shrink-0 ml-2"
            >
              <X className="w-3 h-3" /> Ver todos
            </button>
          </div>
        )}

        <EditableTable
          title={activeFamily
            ? `${activeFamily.rep?.nombre ?? "Formulario"} — todas las versiones`
            : "Formularios"}
          data={tableData}
          columns={colsDefinicion}
          onUpdate={handleTableUpdate}
          onDelete={handleTableDelete}
          onAdd={() => addDef()}
          onPendingChange={onPendingChange}
          rowActions={row => (
            <button
              onClick={e => { e.stopPropagation(); navigate(`?tab=campos&def=${row.id}`); }}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
              title="Ver campos de este formulario"
            >
              <List className="w-3 h-3 shrink-0" />
              Ver campos
            </button>
          )}
        />
      </div>

    </div>

    {/* ── Modal de confirmación: nueva versión ─────────────────────────────── */}
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

          {/* Nombre de la nueva versión */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Nombre del formulario
            </label>
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
            <Button variant="outline" onClick={() => setConfirmDup(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                dupDef(confirmDup.sourceId, confirmDup.newName.trim() || undefined);
                setExpandedFamilies(prev => new Set([...prev, confirmDup.rootId]));
                setActiveFamilyId(confirmDup.rootId);
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
    </>
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
  const [searchCampo, setSearchCampo]  = useState("");
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
      key:      "nombre",
      header:   "Campo",
      width:    "200px",
      type:     "autocomplete",
      options:  sugerencias,
      required: true,
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

      {/* Dos columnas: sidebar de filtro + tabla */}
      <div className="flex gap-4 items-start">

        {/* Sidebar de definiciones — escala a cualquier cantidad sin romper el layout */}
        <div className="w-52 shrink-0 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Formulario
            </span>
          </div>

          {/* Buscador */}
          <div className="px-2 py-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input
                value={searchCampo}
                onChange={e => setSearchCampo(e.target.value)}
                placeholder="Buscar formulario…"
                className="w-full pl-6 pr-2 py-1 text-xs rounded-md bg-muted/40 border border-transparent focus:border-primary/40 focus:outline-none focus:bg-background transition-colors"
              />
              {searchCampo && (
                <button onClick={() => setSearchCampo("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 p-1.5 max-h-[480px] overflow-y-auto">
            {/* "Todos" — solo visible cuando no hay búsqueda activa */}
            {!searchCampo && (
              <>
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
              </>
            )}

            {/* Una fila por definición, filtrada por búsqueda */}
            {definiciones
              .filter(d => d.nombre?.toLowerCase().includes(searchCampo.toLowerCase()))
              .map(d => {
                const count    = parametros.filter(p => p.definicion_id === d.id).length;
                const isActive = filterDefId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => { setFilterDefId(d.id); setSearchCampo(""); }}
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

            {definiciones.filter(d => d.nombre?.toLowerCase().includes(searchCampo.toLowerCase())).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Sin resultados.</p>
            )}
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
            onPendingChange={onPendingChange}
            searchable={false}
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
        </div>

      </div>

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

  // ── Columnas ──────────────────────────────────────────────────────────────

  const colsCultivos: Column<Cultivo>[] = [
    { key: "nombre",      header: "Cultivo",      width: "160px", required: true, editable: isSuperAdmin },
    { key: "codigo",      header: "Código",        width: "80px",  editable: isSuperAdmin },
    { key: "descripcion", header: "Descripción",   width: "280px", editable: isSuperAdmin },
    { key: "activo",      header: "Activo",         width: "75px", type: "checkbox", editable: isSuperAdmin, filterable: true },
  ];

  const colsVariedades: Column<Variedad>[] = [
    { key: "nombre",      header: "Variedad",      width: "160px", required: true },
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
    const absIdx = definiciones.findIndex(d => d.id === cultivoDefs[idx]?.id);
    if (absIdx !== -1) updDef(absIdx, k, v);
  };
  const delF = (idx: number) => {
    const absIdx = definiciones.findIndex(d => d.id === cultivoDefs[idx]?.id);
    if (absIdx !== -1) delDef(absIdx);
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
        {isSuperAdmin ? (
          <button
            onClick={() => setShowAddCultivo(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo cultivo
          </button>
        ) : null}
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

          {/* Variedades + Formularios */}
          <div className="p-4 space-y-4">
            <EditableTable
              title={`Variedades de ${cultivo.nombre}`}
              data={cultivoVars}
              columns={colsVariedades}
              onUpdate={updV}
              onDelete={delV}
              onAdd={() => addVariedad(selectedId)}
              searchable={false}
            />

            {/* Formularios de este cultivo */}
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
              <>
                <EditableTable
                  title={`Formularios de ${cultivo.nombre}`}
                  data={cultivoDefs}
                  columns={colsFormularios}
                  onUpdate={updF}
                  onDelete={delF}
                  onAdd={() => addDef(selectedId)}
                />
                {/* Acceso rápido a formularios de este cultivo */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
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
              </>
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

      {/* ── Tabla de gestión global de cultivos ── */}
      <EditableTable
        title={`Todos los Cultivos (${cultivos.length})`}
        data={cultivos}
        columns={colsCultivos}
        onUpdate={updC}
        onDelete={isSuperAdmin ? delC : undefined}
        onAdd={isSuperAdmin ? () => setShowAddCultivo(true) : undefined}
        searchable={false}
      />

      {/* ── Modal: crear nuevo cultivo ── */}
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
            <Button
              variant="outline"
              onClick={() => setShowAddCultivo(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCultivo}
              disabled={!newCultivoForm.nombre.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Cultivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

  const [stepperOpen, setStepperOpen] = useState<boolean>(
    () => localStorage.getItem("config-stepper-open") !== "false"
  );
  const [showSistema, setShowSistema] = useState(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    nombreEmpresa: "BlueData",
    colorPrimario: "#1a5c3a",
    colorSecundario: "#40916c",
    colorAccent: "#d4a72d",
  });

  const toggleStepper = () => {
    const next = !stepperOpen;
    setStepperOpen(next);
    localStorage.setItem("config-stepper-open", String(next));
  };

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description={`Cultivos, formularios y campos del sistema — ${currentClienteName}`}
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

      {/* Stepper de flujo — colapsable */}
      <div className="mb-6 rounded-xl bg-card border border-border overflow-hidden">
        <button
          onClick={toggleStepper}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Flujo de configuración
          </span>
          {stepperOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {stepperOpen && (
          <div className="px-4 pb-4">
            <div className="flex items-start">
              {[
                { num: 1, label: "Cultivos",    desc: "Define cultivos y variedades" },
                { num: 2, label: "Formularios", desc: "Crea formularios por cultivo" },
                { num: 3, label: "Campos",      desc: "Asigna campos al formulario"  },
                { num: 4, label: "Módulos",     desc: "Registra datos operacionales" },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex items-start flex-1">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                      {step.num}
                    </div>
                    <p className="text-xs font-semibold text-foreground text-center">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight max-w-[90px]">{step.desc}</p>
                  </div>
                  {i < arr.length - 1 && <div className="h-px w-full bg-border mt-4 mx-1" />}
                </div>
              ))}
            </div>
          </div>
        )}
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
          <TabsTrigger value="formularios" disabled={hasPending && activeTab !== "formularios"} className="flex items-center gap-2 text-xs sm:text-sm">
            <Layers    className="w-4 h-4" /> Formularios
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
        </TabsList>

        {hasPending && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-500" />
            Completa los campos requeridos (<span className="text-destructive font-bold">*</span>) antes de cambiar de pestaña o agregar otra fila.
          </div>
        )}

        <TabsContent value="cultivos">   <TabCultivos    /></TabsContent>
        <TabsContent value="formularios"><TabDefiniciones onPendingChange={setHasPending} onNavigateToCampos={(defId) => { setCamposDefId(defId); setActiveTab("campos"); }} /></TabsContent>
        <TabsContent value="biblioteca">  <TabBiblioteca  onPendingChange={setHasPending} /></TabsContent>
        <TabsContent value="campos">      <TabCampos initialDefId={camposDefId} onPendingChange={setHasPending} /></TabsContent>
        <TabsContent value="datos">       <TabDatos       /></TabsContent>

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

          {/* Marca */}
          <div className="space-y-6">
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
