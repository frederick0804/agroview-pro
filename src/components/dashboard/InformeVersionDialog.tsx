// ─── InformeVersionDialog ─────────────────────────────────────────────────────
// Control de versiones completo para Informes: timeline, diff, restaurar,
// copiar, archivar y eliminar snapshots.

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, ArrowRightLeft, History,
  Plus, Minus, Pencil, Circle,
  GitBranch, Copy, Archive, Trash2,
  RotateCcw, BarChart2, Table2, Check,
  AlertTriangle,
} from "lucide-react";
import type { BuilderConfig, GraficoBloque, TablaBloque } from "@/pages/InformesBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InformeSnapshot {
  id: string;
  informe_id: string;
  version: string;
  timestamp: string;
  usuario: string;
  cambio: string;
  nombre: string;
  descripcion: string;
  builderConfig?: BuilderConfig;
}

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface BloqueDiff {
  titulo: string;
  status: DiffStatus;
  left?: GraficoBloque | TablaBloque;
  right?: GraficoBloque | TablaBloque;
  changes?: string[];
}

interface PropDiff { label: string; left: string; right: string; }

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function diffBloques(
  left: BuilderConfig["bloques"],
  right: BuilderConfig["bloques"],
): BloqueDiff[] {
  const result: BloqueDiff[] = [];
  const leftMap  = new Map(left.map(b  => [b.titulo || b.id, b]));
  const rightMap = new Map(right.map(b => [b.titulo || b.id, b]));

  for (const [key, rb] of rightMap) {
    const lb = leftMap.get(key);
    if (!lb) {
      result.push({ titulo: key, status: "added", right: rb as GraficoBloque | TablaBloque });
    } else {
      const changes: string[] = [];
      if (lb.tipo !== rb.tipo) changes.push(`tipo: ${lb.tipo} → ${rb.tipo}`);
      const lSources = lb.fuentesSeleccionadas.join(",");
      const rSources = rb.fuentesSeleccionadas.join(",");
      if (lSources !== rSources) changes.push(`fuentes cambiadas`);
      if (lb.tipo === "grafico" && rb.tipo === "grafico") {
        const lg = lb as GraficoBloque, rg = rb as GraficoBloque;
        if (lg.tipoGrafico !== rg.tipoGrafico) changes.push(`gráfico: ${lg.tipoGrafico} → ${rg.tipoGrafico}`);
      }
      result.push({
        titulo: key,
        status: changes.length > 0 ? "modified" : "unchanged",
        left: lb as GraficoBloque | TablaBloque,
        right: rb as GraficoBloque | TablaBloque,
        changes: changes.length > 0 ? changes : undefined,
      });
    }
  }
  for (const [key, lb] of leftMap) {
    if (!rightMap.has(key)) {
      result.push({ titulo: key, status: "removed", left: lb as GraficoBloque | TablaBloque });
    }
  }
  const order: Record<DiffStatus, number> = { removed: 0, modified: 1, added: 2, unchanged: 3 };
  result.sort((a, b) => order[a.status] - order[b.status]);
  return result;
}

function diffProps(left: InformeSnapshot, right: InformeSnapshot): PropDiff[] {
  const diffs: PropDiff[] = [];
  if (left.nombre      !== right.nombre)      diffs.push({ label: "Nombre",      left: left.nombre,       right: right.nombre });
  if (left.descripcion !== right.descripcion) diffs.push({ label: "Descripción", left: left.descripcion || "—", right: right.descripcion || "—" });
  const lCat = left.builderConfig?.categoria  ?? "—";
  const rCat = right.builderConfig?.categoria ?? "—";
  if (lCat !== rCat) diffs.push({ label: "Categoría", left: lCat, right: rCat });
  const lPaleta = left.builderConfig?.paletaId  ?? "—";
  const rPaleta = right.builderConfig?.paletaId ?? "—";
  if (lPaleta !== rPaleta) diffs.push({ label: "Paleta", left: lPaleta, right: rPaleta });
  return diffs;
}

// ─── Bloque mini-card ─────────────────────────────────────────────────────────

function BloqueCard({ bloque, side }: { bloque: GraficoBloque | TablaBloque; side: "left" | "right" }) {
  const isGrafico = bloque.tipo === "grafico";
  const gb = bloque as GraficoBloque;
  return (
    <div className="flex items-center gap-2">
      {isGrafico
        ? <BarChart2 className={cn("w-3.5 h-3.5 shrink-0", side === "left" ? "text-blue-500" : "text-green-500")} />
        : <Table2    className={cn("w-3.5 h-3.5 shrink-0", side === "left" ? "text-blue-500" : "text-green-500")} />}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{bloque.titulo || (isGrafico ? "Gráfico" : "Tabla")}</p>
        <p className="text-[10px] text-muted-foreground">
          {bloque.fuentesSeleccionadas.length} fuente{bloque.fuentesSeleccionadas.length !== 1 ? "s" : ""}
          {isGrafico ? ` · ${gb.tipoGrafico.replace("_", " ")}` : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface InformeVersionDialogProps {
  open: boolean;
  onClose: () => void;
  snapshots: InformeSnapshot[];
  informeNombre: string;
  onRestore: (snap: InformeSnapshot) => void;
  onCopyAsNew: (snap: InformeSnapshot) => void;
  onArchive: (snapId: string) => void;
  onDelete: (snapId: string) => void;
}

export function InformeVersionDialog({
  open, onClose, snapshots, informeNombre,
  onRestore, onCopyAsNew, onArchive, onDelete,
}: InformeVersionDialogProps) {
  const sorted = [...snapshots].sort((a, b) => {
    const [aMaj = 0] = (a.version ?? "1.0").split(".").map(Number);
    const [bMaj = 0] = (b.version ?? "1.0").split(".").map(Number);
    return aMaj - bMaj;
  });

  const [leftIdx,  setLeftIdx]  = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(1, sorted.length - 1));
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "diff">("timeline");

  const handleVersionClick = (i: number) => {
    if (i < rightIdx)       setLeftIdx(i);
    else if (i > leftIdx)   setRightIdx(i);
    else                    setRightIdx(i);
  };

  const leftSnap  = sorted[leftIdx];
  const rightSnap = sorted[rightIdx];
  const canDiff   = leftSnap && rightSnap && leftIdx !== rightIdx;

  const leftBloques  = leftSnap?.builderConfig?.bloques  ?? [];
  const rightBloques = rightSnap?.builderConfig?.bloques ?? [];
  const bloqueDiffs  = canDiff ? diffBloques(leftBloques, rightBloques)    : [];
  const propDiffs    = canDiff ? diffProps(leftSnap!, rightSnap!)           : [];

  const addedCount    = bloqueDiffs.filter(d => d.status === "added").length;
  const removedCount  = bloqueDiffs.filter(d => d.status === "removed").length;
  const modifiedCount = bloqueDiffs.filter(d => d.status === "modified").length;

  const latestSnap = sorted[sorted.length - 1];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-5 h-5 text-primary" />
            Control de versiones — {informeNombre}
          </DialogTitle>
          {/* Tabs */}
          <div className="flex items-center gap-1 mt-2">
            {(["timeline", "diff"] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  activeTab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {t === "timeline" ? "Línea de tiempo" : "Comparar versiones"}
              </button>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-5">

            {sorted.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-sm">Sin versiones registradas</p>
                <p className="text-xs text-muted-foreground mt-1">Las versiones se crean al guardar cambios en el constructor.</p>
              </div>
            ) : activeTab === "timeline" ? (
              /* ── Timeline ── */
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {sorted.length} versión{sorted.length !== 1 ? "es" : ""} registrada{sorted.length !== 1 ? "s" : ""}
                </p>
                <div className="relative">
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-border" />
                  <div className="space-y-2">
                    {[...sorted].reverse().map((snap, i) => {
                      const isLatest = snap.id === latestSnap?.id;
                      const bloqueCount = snap.builderConfig?.bloques?.length ?? 0;
                      return (
                        <div key={snap.id} className={cn(
                          "relative flex items-start gap-3 pl-1 pr-3 py-3 rounded-xl border transition-all",
                          isLatest ? "border-primary/40 bg-primary/3" : "border-border bg-card hover:bg-muted/20",
                        )}>
                          {/* Timeline dot */}
                          <div className={cn(
                            "relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            isLatest ? "bg-primary/10 border-primary" : "bg-background border-border",
                          )}>
                            <span className={cn("font-mono text-[9px] font-bold", isLatest ? "text-primary" : "text-muted-foreground")}>
                              v{snap.version}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold">{snap.cambio}</span>
                              {isLatest && (
                                <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Actual
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span>{new Date(snap.timestamp).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              <span>·</span>
                              <span>{snap.usuario}</span>
                              {bloqueCount > 0 && <><span>·</span><span>{bloqueCount} bloque{bloqueCount !== 1 ? "s" : ""}</span></>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!isLatest && snap.builderConfig && (
                              <button
                                onClick={() => onRestore(snap)}
                                title="Restaurar esta versión"
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                              </button>
                            )}
                            <button
                              onClick={() => onCopyAsNew(snap)}
                              title="Copiar como nueva versión"
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border border-border hover:border-violet-400/60 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/20 transition-all"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copiar
                            </button>
                            {!isLatest && (
                              <button
                                onClick={() => onArchive(snap.id)}
                                title="Archivar versión"
                                className="p-1.5 rounded-lg border border-border hover:border-amber-400/60 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/20 text-muted-foreground transition-all"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(snap.id)}
                              title="Eliminar versión"
                              className="p-1.5 rounded-lg border border-border hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive text-muted-foreground transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Diff ── */
              <div className="space-y-5">
                {sorted.length < 2 ? (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold text-sm">Solo hay una versión</p>
                    <p className="text-xs text-muted-foreground mt-1">Crea una nueva versión para poder comparar.</p>
                  </div>
                ) : (
                  <>
                    {/* Version selector timeline */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Selecciona dos versiones para comparar
                      </p>
                      <div className="relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                        <div className="space-y-1">
                          {sorted.map((snap, i) => {
                            const isLeft  = i === leftIdx;
                            const isRight = i === rightIdx;
                            return (
                              <div
                                key={snap.id}
                                onClick={() => handleVersionClick(i)}
                                className={cn(
                                  "relative flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors",
                                  (isLeft || isRight) ? "bg-primary/5" : "hover:bg-muted/40",
                                )}
                              >
                                <div className={cn(
                                  "relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                  isLeft  && !isRight ? "bg-blue-100 border-blue-500"
                                  : isRight && !isLeft  ? "bg-green-100 border-green-500"
                                  : isLeft  && isRight  ? "bg-primary/20 border-primary"
                                  : "bg-background border-border",
                                )}>
                                  {isLeft  && !isRight && <span className="text-[9px] font-bold text-blue-600">A</span>}
                                  {isRight && !isLeft  && <span className="text-[9px] font-bold text-green-600">B</span>}
                                  {isLeft  && isRight  && <span className="text-[9px] font-bold text-primary">AB</span>}
                                  {!isLeft && !isRight && <span className="text-[9px] text-muted-foreground/50">·</span>}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span className="font-mono font-semibold text-sm shrink-0">v{snap.version}</span>
                                  <span className="text-xs text-muted-foreground truncate">{snap.cambio}</span>
                                  {isLeft  && !isRight && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-blue-300 text-blue-700 bg-blue-50 shrink-0">A (base)</span>}
                                  {isRight && !isLeft  && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-green-300 text-green-700 bg-green-50 shrink-0">B (comparar)</span>}
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                  {snap.builderConfig?.bloques?.length ?? 0} bloques
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Diff result */}
                    {canDiff ? (
                      <div className="space-y-4">
                        {/* Summary bar */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4" />
                            v{leftSnap!.version} → v{rightSnap!.version}
                          </h4>
                          <div className="flex items-center gap-2">
                            {addedCount    > 0 && <span className="text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">+{addedCount} bloque{addedCount !== 1 ? "s" : ""}</span>}
                            {removedCount  > 0 && <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">−{removedCount} bloque{removedCount !== 1 ? "s" : ""}</span>}
                            {modifiedCount > 0 && <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">~{modifiedCount} modificado{modifiedCount !== 1 ? "s" : ""}</span>}
                            {addedCount === 0 && removedCount === 0 && modifiedCount === 0 && (
                              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" /> Sin cambios en bloques
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Prop diffs */}
                        {propDiffs.length > 0 && (
                          <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propiedades del informe</p>
                            {propDiffs.map(pd => (
                              <div key={pd.label} className="flex items-center gap-2 text-xs">
                                <span className="font-medium w-24 shrink-0">{pd.label}</span>
                                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded line-through max-w-[180px] truncate">{pd.left}</span>
                                <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded max-w-[180px] truncate">{pd.right}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bloques side-by-side */}
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="grid grid-cols-2 bg-muted/40 border-b border-border">
                            <div className="px-4 py-2.5 border-r border-border">
                              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[9px] font-bold">A</span>
                                v{leftSnap!.version} — {leftBloques.length} bloque{leftBloques.length !== 1 ? "s" : ""}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{leftSnap!.cambio}</p>
                            </div>
                            <div className="px-4 py-2.5">
                              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-[9px] font-bold">B</span>
                                v{rightSnap!.version} — {rightBloques.length} bloque{rightBloques.length !== 1 ? "s" : ""}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{rightSnap!.cambio}</p>
                            </div>
                          </div>
                          <div className="divide-y divide-border">
                            {bloqueDiffs.length === 0 ? (
                              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No hay bloques para comparar</div>
                            ) : bloqueDiffs.map((bd, i) => (
                              <div key={`${bd.titulo}-${i}`} className="grid grid-cols-2">
                                <div className={cn(
                                  "px-4 py-3 border-r border-border",
                                  bd.status === "removed"  ? "bg-red-50 dark:bg-red-950/20"     :
                                  bd.status === "modified" ? "bg-amber-50/50 dark:bg-amber-950/20" :
                                  bd.status === "added"    ? "bg-muted/20" : "",
                                )}>
                                  {bd.left ? (
                                    <div className="flex items-start gap-2">
                                      {bd.status === "removed"   && <Minus  className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                                      {bd.status === "modified"  && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                      {bd.status === "unchanged" && <Circle className="w-3 h-3 text-muted-foreground/40 mt-1 shrink-0" />}
                                      <BloqueCard bloque={bd.left} side="left" />
                                    </div>
                                  ) : <span className="text-xs text-muted-foreground/40 italic">—</span>}
                                </div>
                                <div className={cn(
                                  "px-4 py-3",
                                  bd.status === "added"    ? "bg-green-50 dark:bg-green-950/20"  :
                                  bd.status === "modified" ? "bg-amber-50/50 dark:bg-amber-950/20" :
                                  bd.status === "removed"  ? "bg-muted/20" : "",
                                )}>
                                  {bd.right ? (
                                    <div className="flex items-start gap-2">
                                      {bd.status === "added"     && <Plus   className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                                      {bd.status === "modified"  && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                      {bd.status === "unchanged" && <Circle className="w-3 h-3 text-muted-foreground/40 mt-1 shrink-0" />}
                                      <div>
                                        <BloqueCard bloque={bd.right} side="right" />
                                        {bd.changes && (
                                          <div className="mt-1.5 space-y-0.5">
                                            {bd.changes.map((ch, ci) => (
                                              <p key={ci} className="text-[10px] text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded w-fit">{ch}</p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : <span className="text-xs text-muted-foreground/40 italic">—</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-4 py-2.5 bg-muted/20 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">{bloqueDiffs.length} bloque{bloqueDiffs.length !== 1 ? "s" : ""} evaluado{bloqueDiffs.length !== 1 ? "s" : ""}</span>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="flex items-center gap-1 text-green-600"><Plus   className="w-3 h-3" />{addedCount}</span>
                              <span className="flex items-center gap-1 text-red-600">  <Minus  className="w-3 h-3" />{removedCount}</span>
                              <span className="flex items-center gap-1 text-amber-600"><Pencil className="w-3 h-3" />{modifiedCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Selecciona dos versiones diferentes para comparar</p>
                        <p className="text-xs mt-1">Haz click en la línea de tiempo para elegir A y B</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Confirm delete dialog (inline) */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
            <div className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">¿Eliminar esta versión?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                </Button>
              </DialogFooter>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
