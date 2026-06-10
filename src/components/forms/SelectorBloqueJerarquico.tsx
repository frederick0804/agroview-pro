/**
 * SelectorBloqueJerarquico
 *
 * Selector en cascada para la jerarquía de campo: Bloque → Hilera → Cuadrante…
 * Muestra chips por nivel; cada selección revela el nivel siguiente.
 * Valor serializado: "Bloque 1 / HL2" (segmentos separados por " / ").
 */

import { useMemo } from "react";
import { ChevronRight, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BloqueLayout, NivelEstructura } from "@/config/moduleDefinitions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte "Bloque 1 / HL2" → ["Bloque 1", "HL2"] */
function parsePath(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(" / ").map(s => s.trim()).filter(Boolean);
}

/** Convierte ["Bloque 1", "HL2"] → "Bloque 1 / HL2" */
function joinPath(segments: string[]): string {
  return segments.join(" / ");
}

/** Dado un path de nombres, sigue los hijos del layout_mapa hasta llegar al nivel actual */
function getChildrenAt(layout: BloqueLayout[], path: string[]): BloqueLayout[] {
  if (path.length === 0) return layout;
  const head = layout.find(b => b.nombre === path[0]);
  if (!head) return [];
  return getChildrenAt(head.hijos ?? [], path.slice(1));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectorBloqueJerarquicoProps {
  value:      string;
  onChange:   (v: string) => void;
  layout:     BloqueLayout[];
  estructura: NivelEstructura[];
  disabled?:  boolean;
  obligatorio?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SelectorBloqueJerarquico({
  value,
  onChange,
  layout,
  estructura,
  disabled = false,
  obligatorio = false,
}: SelectorBloqueJerarquicoProps) {
  const nivelesActivos = useMemo(
    () => estructura.filter(n => n.activo).sort((a, b) => a.nivel - b.nivel),
    [estructura],
  );

  const path = useMemo(() => parsePath(value), [value]);

  // Seleccionar un nodo en el nivel `depth` con nombre `nombre`
  const select = (depth: number, nombre: string) => {
    const newPath = [...path.slice(0, depth), nombre];
    onChange(joinPath(newPath));
  };

  // Deseleccionar (subir al nivel anterior)
  const deselect = (depth: number) => {
    onChange(joinPath(path.slice(0, depth)));
  };

  if (layout.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        <MapPin className="mx-auto mb-1.5 h-4 w-4 opacity-40" />
        Sin bloques configurados para este cultivo.
        <br />Configúralos en Configuración → Cultivos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Breadcrumb del path actual ──────────────────────────────────── */}
      {path.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          {path.map((seg, i) => {
            const nivelLabel = nivelesActivos[i]?.label ?? `Nivel ${i + 1}`;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
                <span className="text-muted-foreground">{nivelLabel}:</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => deselect(i)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold",
                    "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                    disabled && "pointer-events-none",
                  )}
                >
                  {seg}
                  {!disabled && <X className="w-2.5 h-2.5 opacity-60" />}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Niveles en cascada ───────────────────────────────────────────── */}
      {nivelesActivos.map((nivel, depth) => {
        // Solo muestra el nivel si el anterior ya fue seleccionado (o es el primero)
        if (depth > path.length) return null;

        const isCurrentLevel = depth === path.length;
        const candidates = getChildrenAt(layout, path.slice(0, depth));

        // Si no hay nodos en este nivel, no mostrar
        if (candidates.length === 0) return null;

        const nivelLabel = nivel.label;
        const selectedInThisLevel = path[depth];

        return (
          <div key={nivel.nivel} className="space-y-1.5">
            <p className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              isCurrentLevel ? "text-primary" : "text-muted-foreground",
            )}>
              {isCurrentLevel
                ? `Selecciona ${nivelLabel}`
                : nivelLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map(bloque => {
                const isSelected = selectedInThisLevel === bloque.nombre;
                const hasChildren = (bloque.hijos ?? []).length > 0;
                return (
                  <button
                    key={bloque.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => isSelected ? deselect(depth) : select(depth, bloque.nombre)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                        : isCurrentLevel
                          ? "border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10"
                          : "border-border bg-muted/30 text-muted-foreground",
                      disabled && "opacity-60 pointer-events-none",
                    )}
                  >
                    {bloque.nombre}
                    {hasChildren && !isSelected && (
                      <ChevronRight className="w-3 h-3 opacity-50" />
                    )}
                    {isSelected && <X className="w-3 h-3 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Aviso obligatorio vacío ──────────────────────────────────────── */}
      {obligatorio && !value && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          Selecciona la ubicación donde se realiza esta actividad.
        </p>
      )}
    </div>
  );
}
