// ─── VersionDiffDialog ────────────────────────────────────────────────────────
// Dialog que muestra el historial de versiones de una definición con diff visual
// comparando campos entre dos versiones seleccionadas.

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History, ArrowLeftRight, User, Clock, Plus, Minus, Pencil,
  ArrowRightLeft, Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useConfig } from "@/contexts/ConfigContext";
import type { DefSnapshot, ModParam } from "@/config/moduleDefinitions";

// ─── Tipos de cambio en diff ──────────────────────────────────────────────────

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface FieldDiff {
  nombre:   string;
  status:   DiffStatus;
  left?:    ModParam;
  right?:   ModParam;
  changes?: string[];
}

// ─── Función de diff ──────────────────────────────────────────────────────────

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
      if (lParam.tipo_dato !== rParam.tipo_dato)       changes.push(`tipo: ${lParam.tipo_dato} → ${rParam.tipo_dato}`);
      if (lParam.obligatorio !== rParam.obligatorio)   changes.push(`obligatorio: ${lParam.obligatorio ? "Sí" : "No"} → ${rParam.obligatorio ? "Sí" : "No"}`);
      if (lParam.orden !== rParam.orden)               changes.push(`orden: ${lParam.orden} → ${rParam.orden}`);
      result.push({
        nombre,
        status: changes.length > 0 ? "modified" : "unchanged",
        left: lParam, right: rParam,
        changes: changes.length > 0 ? changes : undefined,
      });
    }
  }

  for (const [nombre, lParam] of leftMap) {
    if (!rightMap.has(nombre)) {
      result.push({ nombre, status: "removed", left: lParam });
    }
  }

  const order: Record<DiffStatus, number> = { removed: 0, modified: 1, added: 2, unchanged: 3 };
  result.sort((a, b) => order[a.status] - order[b.status]);
  return result;
}

// ─── Diff de propiedades de la definición ─────────────────────────────────────

interface PropDiff { label: string; left: string; right: string; }

function diffDefProps(left: DefSnapshot, right: DefSnapshot): PropDiff[] {
  const diffs: PropDiff[] = [];
  const ld = left.definicion;
  const rd = right.definicion;
  if (ld.nombre !== rd.nombre)             diffs.push({ label: "Nombre",      left: ld.nombre,               right: rd.nombre });
  if (ld.descripcion !== rd.descripcion)   diffs.push({ label: "Descripción", left: ld.descripcion,          right: rd.descripcion });
  if (ld.estado !== rd.estado)             diffs.push({ label: "Estado",      left: ld.estado,               right: rd.estado });
  if (ld.nivel_minimo !== rd.nivel_minimo) diffs.push({ label: "Nivel mín.",  left: String(ld.nivel_minimo), right: String(rd.nivel_minimo) });
  if (ld.modulo !== rd.modulo)             diffs.push({ label: "Módulo",      left: ld.modulo,               right: rd.modulo });
  return diffs;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface VersionDiffDialogProps {
  defId:   string;
  open:    boolean;
  onClose: () => void;
}

export function VersionDiffDialog({ defId, open, onClose }: VersionDiffDialogProps) {
  const { getDefSnapshots, definiciones, createSnapshot } = useConfig();
  const snapshots = getDefSnapshots(defId);
  const def = definiciones.find(d => d.id === defId);

  const [leftIdx, setLeftIdx]   = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(0, snapshots.length - 1));

  const leftSnap  = snapshots[leftIdx];
  const rightSnap = snapshots[rightIdx];

  if (!def) return null;

  const fieldDiffs = leftSnap && rightSnap ? diffCampos(leftSnap.campos, rightSnap.campos) : [];
  const propDiffs  = leftSnap && rightSnap ? diffDefProps(leftSnap, rightSnap) : [];

  const addedCount    = fieldDiffs.filter(d => d.status === "added").length;
  const removedCount  = fieldDiffs.filter(d => d.status === "removed").length;
  const modifiedCount = fieldDiffs.filter(d => d.status === "modified").length;

  const handleCreateSnapshot = () => {
    createSnapshot(defId, "Snapshot manual");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5 text-primary" />
            Historial de versiones — {def.nombre}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {snapshots.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground text-sm">Sin historial de versiones</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Crea un snapshot para comenzar a rastrear cambios.
                </p>
                <Button size="sm" onClick={handleCreateSnapshot}>
                  Crear snapshot actual
                </Button>
              </div>
            ) : (
              <>
                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Línea de tiempo
                  </h4>
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                    <div className="space-y-1">
                      {snapshots.map((snap, i) => {
                        const isLeft  = i === leftIdx;
                        const isRight = i === rightIdx;
                        return (
                          <div
                            key={snap.id}
                            className={cn(
                              "relative flex items-start gap-3 pl-0 py-2 px-3 rounded-lg transition-colors cursor-pointer",
                              (isLeft || isRight) ? "bg-primary/5" : "hover:bg-muted/40",
                            )}
                            onClick={() => {
                              if (i < rightIdx) setLeftIdx(i);
                              else if (i > leftIdx) setRightIdx(i);
                              else setRightIdx(i);
                            }}
                          >
                            <div className={cn(
                              "relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                              isLeft ? "bg-blue-100 border-blue-500"
                                : isRight ? "bg-green-100 border-green-500"
                                : "bg-background border-border",
                            )}>
                              {isLeft && !isRight && <span className="text-[9px] font-bold text-blue-600">A</span>}
                              {isRight && !isLeft && <span className="text-[9px] font-bold text-green-600">B</span>}
                              {isLeft && isRight && <span className="text-[9px] font-bold text-primary">AB</span>}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground">v{snap.version}</span>
                                {i === snapshots.length - 1 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-300 text-green-700 bg-green-50">actual</Badge>
                                )}
                                {isLeft && !isRight && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-300 text-blue-700 bg-blue-50">A (base)</Badge>
                                )}
                                {isRight && !isLeft && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-300 text-green-700 bg-green-50">B (comparar)</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{snap.cambio}</p>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground/70">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {snap.usuario}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(snap.timestamp), { addSuffix: true, locale: es })}
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-1">{snap.campos.length} campos</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 pl-9">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCreateSnapshot}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Crear snapshot actual
                    </Button>
                  </div>
                </div>

                {/* Diff visual */}
                {leftSnap && rightSnap && leftIdx !== rightIdx && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4" />
                        Comparación: v{leftSnap.version} → v{rightSnap.version}
                      </h4>
                      <div className="flex items-center gap-2">
                        {addedCount > 0 && (
                          <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">+{addedCount} agregado{addedCount !== 1 ? "s" : ""}</span>
                        )}
                        {removedCount > 0 && (
                          <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">−{removedCount} eliminado{removedCount !== 1 ? "s" : ""}</span>
                        )}
                        {modifiedCount > 0 && (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">~{modifiedCount} modificado{modifiedCount !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>

                    {propDiffs.length > 0 && (
                      <div className="mb-4 bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propiedades de la definición</p>
                        {propDiffs.map(pd => (
                          <div key={pd.label} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-foreground w-24 shrink-0">{pd.label}</span>
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded line-through">{pd.left}</span>
                            <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{pd.right}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Side by side diff */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-2 bg-muted/40 border-b border-border">
                        <div className="px-4 py-2.5 border-r border-border">
                          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-[9px] font-bold">A</span>
                            v{leftSnap.version} — {leftSnap.campos.length} campos
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(leftSnap.timestamp), { addSuffix: true, locale: es })} · {leftSnap.usuario}
                          </p>
                        </div>
                        <div className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-[9px] font-bold">B</span>
                            v{rightSnap.version} — {rightSnap.campos.length} campos
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(rightSnap.timestamp), { addSuffix: true, locale: es })} · {rightSnap.usuario}
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        {fieldDiffs.map((fd, i) => (
                          <div key={`${fd.nombre}-${i}`} className="grid grid-cols-2">
                            <div className={cn(
                              "px-4 py-3 border-r border-border",
                              fd.status === "removed" ? "bg-red-50" :
                              fd.status === "modified" ? "bg-amber-50/50" :
                              fd.status === "added" ? "bg-muted/20" : "",
                            )}>
                              {fd.left ? (
                                <div className="flex items-start gap-2">
                                  {fd.status === "removed" && <Minus className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                                  {fd.status === "modified" && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
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
                            <div className={cn(
                              "px-4 py-3",
                              fd.status === "added" ? "bg-green-50" :
                              fd.status === "modified" ? "bg-amber-50/50" :
                              fd.status === "removed" ? "bg-muted/20" : "",
                            )}>
                              {fd.right ? (
                                <div className="flex items-start gap-2">
                                  {fd.status === "added" && <Plus className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                                  {fd.status === "modified" && <Pencil className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
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
                          <span className="flex items-center gap-1 text-green-600"><Plus className="w-3 h-3" />{addedCount}</span>
                          <span className="flex items-center gap-1 text-red-600"><Minus className="w-3 h-3" />{removedCount}</span>
                          <span className="flex items-center gap-1 text-amber-600"><Pencil className="w-3 h-3" />{modifiedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {leftSnap && rightSnap && leftIdx === rightIdx && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Selecciona dos versiones diferentes para comparar</p>
                    <p className="text-xs mt-1">Haz click en la línea de tiempo para elegir versión A (base) y B (comparar)</p>
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
