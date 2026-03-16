// ─── VersionDiffDialog ────────────────────────────────────────────────────────
// Compara campos entre dos versiones de una familia de definiciones.

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight, ArrowRightLeft, History,
  Plus, Minus, Pencil, Circle,
  CheckCircle2, Clock, Archive as ArchiveIcon,
} from "lucide-react";
import { useConfig } from "@/contexts/ConfigContext";
import { estadoBadge } from "@/config/moduleDefinitions";
import type { ModDef, ModParam } from "@/config/moduleDefinitions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface FieldDiff {
  nombre:   string;
  status:   DiffStatus;
  left?:    ModParam;
  right?:   ModParam;
  changes?: string[];
}

interface PropDiff { label: string; left: string; right: string; }

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function diffCampos(left: ModParam[], right: ModParam[]): FieldDiff[] {
  const result: FieldDiff[] = [];
  const leftMap  = new Map(left.map(c => [c.nombre, c]));
  const rightMap = new Map(right.map(c => [c.nombre, c]));

  for (const [nombre, rParam] of rightMap) {
    const lParam = leftMap.get(nombre);
    if (!lParam) {
      result.push({ nombre, status: "added", right: rParam });
    } else {
      const changes: string[] = [];
      if (lParam.tipo_dato    !== rParam.tipo_dato)    changes.push(`tipo: ${lParam.tipo_dato} → ${rParam.tipo_dato}`);
      if (lParam.obligatorio  !== rParam.obligatorio)  changes.push(`obligatorio: ${lParam.obligatorio ? "Sí" : "No"} → ${rParam.obligatorio ? "Sí" : "No"}`);
      if (lParam.orden        !== rParam.orden)        changes.push(`orden: ${lParam.orden} → ${rParam.orden}`);
      result.push({
        nombre,
        status:  changes.length > 0 ? "modified" : "unchanged",
        left:    lParam,
        right:   rParam,
        changes: changes.length > 0 ? changes : undefined,
      });
    }
  }

  for (const [nombre, lParam] of leftMap) {
    if (!rightMap.has(nombre)) result.push({ nombre, status: "removed", left: lParam });
  }

  const order: Record<DiffStatus, number> = { removed: 0, modified: 1, added: 2, unchanged: 3 };
  result.sort((a, b) => order[a.status] - order[b.status]);
  return result;
}

function diffProps(left: ModDef, right: ModDef): PropDiff[] {
  const diffs: PropDiff[] = [];
  if (left.nombre              !== right.nombre)              diffs.push({ label: "Nombre",  left: left.nombre,              right: right.nombre });
  if (left.estado              !== right.estado)              diffs.push({ label: "Estado",  left: left.estado ?? "",         right: right.estado ?? "" });
  if ((left.modulo ?? "")      !== (right.modulo ?? ""))      diffs.push({ label: "Módulo",  left: left.modulo ?? "—",        right: right.modulo ?? "—" });
  if ((left.descripcion ?? "") !== (right.descripcion ?? "")) diffs.push({ label: "Desc.",   left: left.descripcion ?? "—",   right: right.descripcion ?? "—" });
  return diffs;
}

// ─── Estado badge icon ────────────────────────────────────────────────────────

function EstadoIcon({ estado }: { estado: string }) {
  if (estado === "activo")    return <CheckCircle2 className="w-3 h-3" />;
  if (estado === "archivado") return <ArchiveIcon  className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface VersionDiffDialogProps {
  rootId:  string;
  open:    boolean;
  onClose: () => void;
}

export function VersionDiffDialog({ rootId, open, onClose }: VersionDiffDialogProps) {
  const { definiciones, parametros } = useConfig();

  // Familia: todas las versiones con este rootId, orden ascendente para la timeline
  const versions = definiciones
    .filter(d => d.id === rootId || d.origen_id === rootId)
    .sort((a, b) => {
      const [aMaj = 0, aMin = 0] = (a.version ?? "1.0").split(".").map(Number);
      const [bMaj = 0, bMin = 0] = (b.version ?? "1.0").split(".").map(Number);
      return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
    });

  const [leftIdx,  setLeftIdx]  = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(1, versions.length - 1));

  if (versions.length === 0) return null;

  const leftVer  = versions[leftIdx];
  const rightVer = versions[rightIdx];

  const camposOf = (v: ModDef) =>
    parametros.filter(p => p.definicion_id === v.id).sort((a, b) => a.orden - b.orden);

  const leftCampos  = leftVer  ? camposOf(leftVer)  : [];
  const rightCampos = rightVer ? camposOf(rightVer) : [];

  const canDiff      = leftVer && rightVer && leftIdx !== rightIdx;
  const fieldDiffs   = canDiff ? diffCampos(leftCampos, rightCampos) : [];
  const propDiffs    = canDiff ? diffProps(leftVer!, rightVer!)       : [];

  const addedCount    = fieldDiffs.filter(d => d.status === "added").length;
  const removedCount  = fieldDiffs.filter(d => d.status === "removed").length;
  const modifiedCount = fieldDiffs.filter(d => d.status === "modified").length;

  const handleVersionClick = (i: number) => {
    if (i === leftIdx && i !== rightIdx) return; // already left, do nothing
    if (i === rightIdx && i !== leftIdx) return; // already right, do nothing
    // Assign to whichever makes a valid pair
    if (i < rightIdx) setLeftIdx(i);
    else if (i > leftIdx) setRightIdx(i);
    else setRightIdx(i);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Comparar versiones — {versions[versions.length - 1]?.nombre}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">

            {versions.length < 2 ? (
              <div className="text-center py-12">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground text-sm">Solo hay una versión</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crea una nueva versión para poder comparar.
                </p>
              </div>
            ) : (
              <>
                {/* ── Timeline de versiones ─────────────────────────────── */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Selecciona dos versiones para comparar
                  </h4>
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                    <div className="space-y-1">
                      {versions.map((v, i) => {
                        const isLeft  = i === leftIdx;
                        const isRight = i === rightIdx;
                        const campos  = camposOf(v);
                        return (
                          <div
                            key={v.id}
                            className={cn(
                              "relative flex items-center gap-3 py-2 px-3 rounded-lg transition-colors cursor-pointer",
                              (isLeft || isRight) ? "bg-primary/5" : "hover:bg-muted/40",
                            )}
                            onClick={() => handleVersionClick(i)}
                          >
                            <div className={cn(
                              "relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                              isLeft && !isRight  ? "bg-blue-100 border-blue-500"
                              : isRight && !isLeft ? "bg-green-100 border-green-500"
                              : isLeft && isRight  ? "bg-primary/20 border-primary"
                              : "bg-background border-border",
                            )}>
                              {isLeft  && !isRight && <span className="text-[9px] font-bold text-blue-600">A</span>}
                              {isRight && !isLeft  && <span className="text-[9px] font-bold text-green-600">B</span>}
                              {isLeft  && isRight  && <span className="text-[9px] font-bold text-primary">AB</span>}
                              {!isLeft && !isRight && <span className="text-[9px] text-muted-foreground/50">·</span>}
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-sm text-foreground shrink-0">
                                v{v.version || "1.0"}
                              </span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 shrink-0",
                                estadoBadge[v.estado ?? "borrador"],
                              )}>
                                <EstadoIcon estado={v.estado ?? "borrador"} />
                                {v.estado}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">{v.nombre}</span>
                              {isLeft && !isRight && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-300 text-blue-700 bg-blue-50 shrink-0">
                                  A (base)
                                </Badge>
                              )}
                              {isRight && !isLeft && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-300 text-green-700 bg-green-50 shrink-0">
                                  B (comparar)
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground/60 shrink-0">
                              {campos.length} campo{campos.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Diff visual ───────────────────────────────────────── */}
                {canDiff ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4" />
                        v{leftVer!.version} → v{rightVer!.version}
                      </h4>
                      <div className="flex items-center gap-2">
                        {addedCount    > 0 && <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">+{addedCount} agregado{addedCount !== 1 ? "s" : ""}</span>}
                        {removedCount  > 0 && <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">−{removedCount} eliminado{removedCount !== 1 ? "s" : ""}</span>}
                        {modifiedCount > 0 && <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">~{modifiedCount} modificado{modifiedCount !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>

                    {/* Propiedades que cambiaron */}
                    {propDiffs.length > 0 && (
                      <div className="mb-4 bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propiedades de la definición</p>
                        {propDiffs.map(pd => (
                          <div key={pd.label} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-foreground w-20 shrink-0">{pd.label}</span>
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded line-through">{pd.left}</span>
                            <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{pd.right}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Side-by-side */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-2 bg-muted/40 border-b border-border">
                        <div className="px-4 py-2.5 border-r border-border">
                          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[9px] font-bold">A</span>
                            v{leftVer!.version} — {leftCampos.length} campo{leftCampos.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{leftVer!.nombre}</p>
                        </div>
                        <div className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-[9px] font-bold">B</span>
                            v{rightVer!.version} — {rightCampos.length} campo{rightCampos.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{rightVer!.nombre}</p>
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        {fieldDiffs.map((fd, i) => (
                          <div key={`${fd.nombre}-${i}`} className="grid grid-cols-2">
                            {/* Columna A */}
                            <div className={cn(
                              "px-4 py-3 border-r border-border",
                              fd.status === "removed"  ? "bg-red-50"       :
                              fd.status === "modified" ? "bg-amber-50/50"  :
                              fd.status === "added"    ? "bg-muted/20"     : "",
                            )}>
                              {fd.left ? (
                                <div className="flex items-start gap-2">
                                  {fd.status === "removed"   && <Minus  className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                                  {fd.status === "modified"  && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                  {fd.status === "unchanged" && <Circle className="w-3 h-3 text-muted-foreground/40 mt-1 shrink-0" />}
                                  <div className="min-w-0">
                                    <p className={cn("text-sm font-medium", fd.status === "removed" ? "text-red-700 line-through" : "text-foreground")}>
                                      {fd.left.nombre.replace(/_/g, " ")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                      <span>{fd.left.tipo_dato}</span><span>·</span>
                                      <span>{fd.left.obligatorio ? "Obligatorio" : "Opcional"}</span><span>·</span>
                                      <span>Orden {fd.left.orden}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 italic">—</span>
                              )}
                            </div>

                            {/* Columna B */}
                            <div className={cn(
                              "px-4 py-3",
                              fd.status === "added"    ? "bg-green-50"     :
                              fd.status === "modified" ? "bg-amber-50/50"  :
                              fd.status === "removed"  ? "bg-muted/20"     : "",
                            )}>
                              {fd.right ? (
                                <div className="flex items-start gap-2">
                                  {fd.status === "added"     && <Plus   className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                                  {fd.status === "modified"  && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                                  {fd.status === "unchanged" && <Circle className="w-3 h-3 text-muted-foreground/40 mt-1 shrink-0" />}
                                  <div className="min-w-0">
                                    <p className={cn("text-sm font-medium", fd.status === "added" ? "text-green-700" : "text-foreground")}>
                                      {fd.right.nombre.replace(/_/g, " ")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                      <span>{fd.right.tipo_dato}</span><span>·</span>
                                      <span>{fd.right.obligatorio ? "Obligatorio" : "Opcional"}</span><span>·</span>
                                      <span>Orden {fd.right.orden}</span>
                                    </div>
                                    {fd.changes && (
                                      <div className="mt-1.5 space-y-0.5">
                                        {fd.changes.map((ch, ci) => (
                                          <p key={ci} className="text-[10px] text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded w-fit">{ch}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 italic">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="px-4 py-2.5 bg-muted/20 border-t border-border flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {fieldDiffs.length} campo{fieldDiffs.length !== 1 ? "s" : ""} evaluado{fieldDiffs.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-green-600"><Plus  className="w-3 h-3" />{addedCount}</span>
                          <span className="flex items-center gap-1 text-red-600">  <Minus className="w-3 h-3" />{removedCount}</span>
                          <span className="flex items-center gap-1 text-amber-600"><Pencil className="w-3 h-3" />{modifiedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Selecciona dos versiones diferentes para comparar</p>
                    <p className="text-xs mt-1">Haz click en la línea de tiempo para elegir A (base) y B (comparar)</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
