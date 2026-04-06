// ─── CampoMapaEditor — Mapa con configuración rápida global por nivel ─────────

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { BloqueLayout, NivelEstructura, ComponenteCampo } from "@/config/moduleDefinitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Trash2,
  Hand,
  Layers,
  Settings2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Droplet,
  Activity,
  CircleDot,
  Filter,
  Gauge,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CampoMapaEditorProps {
  estructura: NivelEstructura[];
  layout: BloqueLayout[];
  onLayoutChange: (layout: BloqueLayout[]) => void;
  readOnly?: boolean;
}

// ─── Temas de colores predefinidos ────────────────────────────────────────────

const COLOR_THEMES = {
  clasico: {
    nombre: "Clásico",
    colores: ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"],
  },
  pastel: {
    nombre: "Pastel",
    colores: ["#B4C7E7", "#F4B183", "#C5E0B4", "#FFE699", "#D5A6BD", "#B7DEE8"],
  },
  tierra: {
    nombre: "Tierra",
    colores: ["#9E5B40", "#C68642", "#A2845E", "#D4AF37", "#8B7355", "#6B8E23"],
  },
  oceano: {
    nombre: "Océano",
    colores: ["#1E3A8A", "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981"],
  },
  bosque: {
    nombre: "Bosque",
    colores: ["#065F46", "#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0"],
  },
  atardecer: {
    nombre: "Atardecer",
    colores: ["#DC2626", "#F97316", "#FBBF24", "#FDE047", "#FCA5A5", "#FECACA"],
  },
  moderno: {
    nombre: "Moderno",
    colores: ["#7C3AED", "#EC4899", "#F43F5E", "#10B981", "#06B6D4", "#F59E0B"],
  },
  corporativo: {
    nombre: "Corporativo",
    colores: ["#1E293B", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"],
  },
};

const COLOR_PALETTE = [
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Violeta", value: "#a855f7" },
  { name: "Naranja", value: "#f97316" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Slate", value: "#64748b" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `bl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getNivelLabel(estructura: NivelEstructura[], nivelIdx: number): string {
  const nivel = estructura.filter((n) => n.activo)[nivelIdx];
  return nivel?.label ?? `Nivel ${nivelIdx + 1}`;
}

function getNivelAbrev(estructura: NivelEstructura[], nivelIdx: number): string {
  const nivel = estructura.filter((n) => n.activo)[nivelIdx];
  return nivel?.abrev ?? `N${nivelIdx + 1}`;
}

function getDefaultColor(nivelIdx: number) {
  return COLOR_PALETTE[nivelIdx % COLOR_PALETTE.length].value;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function CampoMapaEditor({
  estructura,
  layout,
  onLayoutChange,
  readOnly = false,
}: CampoMapaEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [expandedHijos, setExpandedHijos] = useState<Set<string>>(new Set());
  const [opacidadGlobal, setOpacidadGlobal] = useState(75);

  // Función helper para cerrar el panel y prevenir auto-apertura
  const closeEditPanel = useCallback(() => {
    setShowEditPanel(false);
  }, []);

  // Función helper para abrir el panel (solo desde el botón ⚙️)
  const openEditPanelForBlock = useCallback((blockId: string) => {
    setSelectedId(blockId);
    setShowEditPanel(true);
  }, []);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  // ConfigRapida — estado en el padre para que persista entre renders
  const [configNiveles, setConfigNiveles] = useState<Record<number, number>>({});
  const [configPorFila, setConfigPorFila] = useState<Record<number, number>>({});
  // Confirmación de eliminación
  const [bloqueAEliminar, setBloqueAEliminar] = useState<string | null>(null);
  const [hijoAEliminar, setHijoAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [componenteAEliminar, setComponenteAEliminar] = useState<{ bloqueId: string; componenteId: string; nombre: string } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const nivelesActivos = useMemo(
    () => estructura.filter((n) => n.activo),
    [estructura]
  );

  const selectedBloque = useMemo(
    () => layout.find((b) => b.id === selectedId),
    [layout, selectedId]
  );

  // Resetear ConfigRapida al cambiar de bloque seleccionado
  useEffect(() => {
    if (selectedId) {
      const inicial: Record<number, number> = {};
      const inicialFila: Record<number, number> = {};
      const bloque = layout.find((b) => b.id === selectedId);
      if (bloque) {
        nivelesActivos.forEach((_, idx) => {
          if (idx > bloque.nivelIdx) {
            inicial[idx] = 0;
            inicialFila[idx] = 0;
          }
        });
      }
      setConfigNiveles(inicial);
      setConfigPorFila(inicialFila);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Agregar nuevo bloque (más grande) ───────────────────────────────────────
  const addBloque = useCallback(() => {
    const count = layout.length;
    const primerNivelLabel = getNivelLabel(estructura, 0);
    const newBloque: BloqueLayout = {
      id: generateId(),
      nombre: `${primerNivelLabel} ${count + 1}`,
      nivelIdx: 0,
      x: Math.max(0, 20 - pan.x / scale + (count % 3) * 350),
      y: Math.max(0, 20 - pan.y / scale + Math.floor(count / 3) * 250),
      width: 320,
      height: 220,
      color: getDefaultColor(0),
      opacity: opacidadGlobal,
      hijos: [],
    };
    onLayoutChange([...layout, newBloque]);
    setSelectedId(newBloque.id);
  }, [layout, onLayoutChange, estructura, pan, scale, opacidadGlobal]);

  // ── Eliminar bloque ─────────────────────────────────────────────────────────
  const deleteBloque = useCallback(
    (id: string) => {
      onLayoutChange(layout.filter((b) => b.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        closeEditPanel(); // Cerrar panel si se elimina el bloque seleccionado
      }
    },
    [layout, onLayoutChange, selectedId, closeEditPanel]
  );

  // ── Actualizar bloque recursivamente ────────────────────────────────────────
  const updateBloqueRecursivo = useCallback(
    (targetId: string, updates: Partial<BloqueLayout>) => {
      const actualizarEn = (bloques: BloqueLayout[]): BloqueLayout[] => {
        return bloques.map((b) => {
          if (b.id === targetId) {
            return { ...b, ...updates };
          }
          if (b.hijos?.length) {
            return { ...b, hijos: actualizarEn(b.hijos) };
          }
          return b;
        });
      };
      onLayoutChange(actualizarEn(layout));
    },
    [layout, onLayoutChange]
  );

  // ── Generar hijos ───────────────────────────────────────────────────────────
  const generarHijos = useCallback(
    (cantidad: number, nivelIdx: number): BloqueLayout[] => {
      const label = getNivelAbrev(estructura, nivelIdx);
      return Array.from({ length: cantidad }, (_, i) => ({
        id: generateId(),
        nombre: `${label}${i + 1}`,
        nivelIdx,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: getDefaultColor(nivelIdx),
        opacity: opacidadGlobal,
        hijos: [],
      }));
    },
    [estructura, opacidadGlobal]
  );

  // ── Eliminar hijo recursivamente ─────────────────────────────────────────────
  const deleteHijo = useCallback(
    (hijoId: string) => {
      const eliminarEn = (bloques: BloqueLayout[]): BloqueLayout[] =>
        bloques
          .filter((b) => b.id !== hijoId)
          .map((b) =>
            b.hijos?.length ? { ...b, hijos: eliminarEn(b.hijos) } : b
          );
      onLayoutChange(eliminarEn(layout));
    },
    [layout, onLayoutChange]
  );

  // ── Establecer cantidad de hijos directos ───────────────────────────────────
  const establecerCantidadHijos = useCallback(
    (parentId: string, cantidad: number) => {
      const actualizarEn = (bloques: BloqueLayout[]): BloqueLayout[] => {
        return bloques.map((b) => {
          if (b.id === parentId) {
            const currentCount = b.hijos?.length ?? 0;
            const nivelTarget = b.nivelIdx + 1;
            if (cantidad > currentCount) {
              const nuevos = generarHijos(cantidad - currentCount, nivelTarget);
              return { ...b, hijos: [...(b.hijos ?? []), ...nuevos] };
            } else if (cantidad < currentCount) {
              return { ...b, hijos: (b.hijos ?? []).slice(0, cantidad) };
            }
            return b;
          }
          if (b.hijos?.length) {
            return { ...b, hijos: actualizarEn(b.hijos) };
          }
          return b;
        });
      };
      onLayoutChange(actualizarEn(layout));
    },
    [layout, onLayoutChange, generarHijos]
  );

  // ── Aplicar cantidad global por nivel ───────────────────────────────────────
  const aplicarCantidadPorNivel = useCallback(
    (configuracion: Record<number, number>, configuracionFila: Record<number, number>) => {
      if (!selectedBloque) return;

      const aplicarRecursivo = (
        padre: BloqueLayout,
        config: Record<number, number>,
        configFila: Record<number, number>
      ): BloqueLayout => {
        const nivelHijo = padre.nivelIdx + 1;
        const cantidadDeseada = config[nivelHijo];
        const porFila = configFila[nivelHijo];

        if (cantidadDeseada !== undefined) {
          const currentCount = padre.hijos?.length ?? 0;
          let nuevosHijos: BloqueLayout[];

          if (cantidadDeseada > currentCount) {
            const nuevos = generarHijos(cantidadDeseada - currentCount, nivelHijo);
            nuevosHijos = [...(padre.hijos ?? []), ...nuevos];
          } else {
            nuevosHijos = (padre.hijos ?? []).slice(0, cantidadDeseada);
          }

          // Aplicar elementosPorFila si está configurado
          if (porFila && porFila > 0) {
            nuevosHijos = nuevosHijos.map((h) => ({ ...h, elementosPorFila: porFila }));
          }

          // Aplicar recursivamente a cada hijo
          nuevosHijos = nuevosHijos.map((h) => aplicarRecursivo(h, config, configFila));

          // Aplicar elementosPorFila al padre también si está configurado para su nivel hijo
          const padreActualizado = { ...padre, hijos: nuevosHijos };
          if (porFila && porFila > 0) {
            padreActualizado.elementosPorFila = porFila;
          }
          return padreActualizado;
        }

        // Si no hay config para este nivel, aplicar a hijos existentes
        if (padre.hijos?.length) {
          return {
            ...padre,
            hijos: padre.hijos.map((h) => aplicarRecursivo(h, config, configFila)),
          };
        }

        return padre;
      };

      const updated = layout.map((b) =>
        b.id === selectedBloque.id ? aplicarRecursivo(b, configuracion, configuracionFila) : b
      );
      onLayoutChange(updated);
    },
    [layout, selectedBloque, onLayoutChange, generarHijos]
  );

  // ── Aplicar tema de colores ─────────────────────────────────────────────────
  const aplicarTema = useCallback(
    (tema: keyof typeof COLOR_THEMES) => {
      if (!selectedBloque) return;
      const colores = COLOR_THEMES[tema].colores;

      const aplicarColorRecursivo = (
        bloques: BloqueLayout[],
        nivel: number
      ): BloqueLayout[] => {
        return bloques.map((b, idx) => {
          const colorIdx = nivel % colores.length;
          const nuevo: BloqueLayout = { ...b, color: colores[colorIdx] };
          if (b.hijos?.length) {
            nuevo.hijos = aplicarColorRecursivo(b.hijos, nivel + 1);
          }
          return nuevo;
        });
      };

      const updated = layout.map((b) => {
        if (b.id === selectedBloque.id) {
          return {
            ...b,
            color: colores[0],
            hijos: b.hijos?.length ? aplicarColorRecursivo(b.hijos, 1) : b.hijos,
          };
        }
        return b;
      });
      onLayoutChange(updated);
    },
    [layout, selectedBloque, onLayoutChange]
  );

  // ── Actualizar opacidad global ──────────────────────────────────────────────
  const actualizarOpacidadGlobal = useCallback(
    (opacity: number) => {
      setOpacidadGlobal(opacity);
      if (!selectedBloque) return;

      const aplicarOpacidadRecursivo = (bloques: BloqueLayout[]): BloqueLayout[] => {
        return bloques.map((b) => ({
          ...b,
          opacity,
          hijos: b.hijos?.length ? aplicarOpacidadRecursivo(b.hijos) : b.hijos,
        }));
      };

      const updated = layout.map((b) => {
        if (b.id === selectedBloque.id) {
          return {
            ...b,
            opacity,
            hijos: b.hijos?.length ? aplicarOpacidadRecursivo(b.hijos) : b.hijos,
          };
        }
        return b;
      });
      onLayoutChange(updated);
    },
    [layout, selectedBloque, onLayoutChange]
  );

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const zoomIn = () => setScale((s) => Math.min(s * 1.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s / 1.2, 0.3));
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // ── Mouse events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPan({ x: panStart.panX + dx, y: panStart.panY + dy });
      }
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / scale;
        const dy = (e.clientY - dragging.startY) / scale;
        updateBloqueRecursivo(dragging.id, {
          x: Math.round(dragging.origX + dx),
          y: Math.round(dragging.origY + dy),
        });
      }
      if (resizing) {
        const dx = (e.clientX - resizing.startX) / scale;
        const dy = (e.clientY - resizing.startY) / scale;
        updateBloqueRecursivo(resizing.id, {
          width: Math.max(200, Math.round(resizing.origW + dx)),
          height: Math.max(150, Math.round(resizing.origH + dy)),
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
      setIsPanning(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, resizing, isPanning, panStart, scale, updateBloqueRecursivo]);

  // ── Renderizar hijos con mejor distribución visual ──────────────────────────
  const renderHijosVisuales = (
    hijos: BloqueLayout[],
    parentW: number,
    parentH: number,
    profundidad: number,
    parentElementosPorFila?: number
  ): JSX.Element[] | null => {
    if (!hijos.length) return null;

    // Determinar orientación basada en profundidad (alternar) o usar grid si hay elementosPorFila
    const isVertical = profundidad % 2 === 1;
    const count = hijos.length;

    return hijos.map((hijo, idx) => {
      const color = hijo.color ?? getDefaultColor(hijo.nivelIdx);
      const opacity = hijo.opacity ?? opacidadGlobal;
      const tieneNietos = (hijo.hijos?.length ?? 0) > 0;
      const tieneComponentes = (hijo.componentes?.length ?? 0) > 0;

      // Calcular tamaño basado en contenido
      const minSize = profundidad > 2 ? 8 : profundidad > 1 ? 12 : 16;

      return (
        <div
          key={hijo.id}
          className="flex-1 rounded flex flex-col border overflow-hidden relative"
          style={{
            backgroundColor: color,
            opacity: opacity / 100,
            borderColor: `${color}CC`,
            minWidth: isVertical ? "auto" : minSize,
            minHeight: isVertical ? minSize : "auto",
          }}
        >
          {profundidad < 3 && (
            <div
              className="text-[9px] font-semibold text-white text-center py-0.5 px-1 truncate flex items-center justify-center gap-1"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
            >
              {hijo.nombre}
              {/* Indicador de componentes */}
              {tieneComponentes && (
                <span className="flex items-center gap-1" title={`${hijo.componentes!.length} componente(s): ${hijo.componentes!.map(c => c.nombre).join(", ")}`}>
                  {/* Mostrar hasta 3 tipos diferentes de componentes */}
                  {Array.from(new Set(hijo.componentes!.map(c => c.tipo))).slice(0, 3).map((tipo) => {
                    const CompIcon =
                      tipo === "valvula" ? Droplet :
                      tipo === "sensor" ? Activity :
                      tipo === "bomba" ? Zap :
                      tipo === "filtro" ? Filter :
                      tipo === "medidor" ? Gauge :
                      CircleDot;
                    return (
                      <div key={tipo} className="w-4 h-4 rounded-full bg-white/95 flex items-center justify-center shadow-sm border border-white/30">
                        <CompIcon className="w-2.5 h-2.5 text-slate-700" />
                      </div>
                    );
                  })}
                  {/* Badge con el número total */}
                  <div className="px-1.5 py-0.5 rounded-full bg-white/95 shadow-sm border border-white/30">
                    <span className="text-[8px] font-bold text-slate-700">{hijo.componentes!.length}</span>
                  </div>
                </span>
              )}
            </div>
          )}
          {/* Indicador de componentes para niveles profundos (>= 3) */}
          {profundidad >= 3 && tieneComponentes && (
            <>
              {/* Para espacios grandes (>= 20px): Borde + Badge */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ minHeight: "20px", minWidth: "20px" }}
              >
                <div
                  className="absolute inset-0 border-2 border-dashed opacity-70"
                  style={{
                    borderColor: hijo.componentes!.some(c => c.tipo === "valvula") ? "#3b82f6" :
                               hijo.componentes!.some(c => c.tipo === "bomba") ? "#f59e0b" :
                               hijo.componentes!.some(c => c.tipo === "sensor") ? "#10b981" :
                               hijo.componentes!.some(c => c.tipo === "medidor") ? "#8b5cf6" :
                               hijo.componentes!.some(c => c.tipo === "filtro") ? "#ef4444" : "#6b7280",
                  }}
                  title={`${hijo.componentes!.length} componente(s): ${hijo.componentes!.map(c => `${c.nombre} (${c.tipo})`).join(", ")}`}
                />
                {/* Badge con número para espacios medianos */}
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-sm opacity-90">
                  <span className="text-[8px] font-bold text-gray-700">{hijo.componentes!.length}</span>
                </div>
              </div>

              {/* Para espacios microscópicos (<20px): Solo cambio de color de fondo */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundColor: hijo.componentes!.some(c => c.tipo === "valvula") ? "#3b82f6" :
                                 hijo.componentes!.some(c => c.tipo === "bomba") ? "#f59e0b" :
                                 hijo.componentes!.some(c => c.tipo === "sensor") ? "#10b981" :
                                 hijo.componentes!.some(c => c.tipo === "medidor") ? "#8b5cf6" :
                                 hijo.componentes!.some(c => c.tipo === "filtro") ? "#ef4444" : "#6b7280",
                  mixBlendMode: "multiply"
                }}
                title={`${hijo.componentes!.length} componente(s): ${hijo.componentes!.map(c => `${c.nombre} (${c.tipo})`).join(", ")}`}
              />

              {/* Punto central para espacios muy pequeños */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-1 h-1 rounded-full opacity-80"
                  style={{
                    backgroundColor: hijo.componentes!.some(c => c.tipo === "valvula") ? "#3b82f6" :
                                   hijo.componentes!.some(c => c.tipo === "bomba") ? "#f59e0b" :
                                   hijo.componentes!.some(c => c.tipo === "sensor") ? "#10b981" :
                                   hijo.componentes!.some(c => c.tipo === "medidor") ? "#8b5cf6" :
                                   hijo.componentes!.some(c => c.tipo === "filtro") ? "#ef4444" : "#6b7280",
                  }}
                />
              </div>
            </>
          )}
          {tieneNietos && (
            <div
              className={cn(
                "flex-1 gap-0.5 p-0.5",
                hijo.elementosPorFila && hijo.elementosPorFila > 0
                  ? "grid"
                  : `flex ${isVertical ? "flex-col" : "flex-row"}`
              )}
              style={
                hijo.elementosPorFila && hijo.elementosPorFila > 0
                  ? {
                      gridTemplateColumns: `repeat(${hijo.elementosPorFila}, 1fr)`,
                      gridAutoRows: "1fr",
                    }
                  : undefined
              }
            >
              {renderHijosVisuales(
                hijo.hijos!,
                parentW / (isVertical ? 1 : count),
                parentH / (isVertical ? count : 1),
                profundidad + 1,
                hijo.elementosPorFila
              )}
            </div>
          )}
        </div>
      );
    });
  };

  // ── Renderizar lista de hijos ───────────────────────────────────────────────
  const renderListaHijos = (hijos: BloqueLayout[], depth = 0): JSX.Element[] => {
    return hijos.map((hijo) => {
      const isOpen = expandedHijos.has(hijo.id);
      const color = hijo.color ?? getDefaultColor(hijo.nivelIdx);
      const nivelSiguiente = nivelesActivos[hijo.nivelIdx + 1];
      const tieneNietos = !!nivelSiguiente;
      const nivelLabel = nivelesActivos[hijo.nivelIdx]?.label ?? `Nivel ${hijo.nivelIdx}`;
      const nivelAbrev = nivelesActivos[hijo.nivelIdx]?.abrev ?? `N${hijo.nivelIdx}`;

      return (
        <div key={hijo.id}>
          <Collapsible
            open={isOpen}
            onOpenChange={(open) => {
              const newSet = new Set(expandedHijos);
              if (open) newSet.add(hijo.id);
              else newSet.delete(hijo.id);
              setExpandedHijos(newSet);
            }}
          >
            <div
              tabIndex={0}
              className="rounded-lg border bg-background shadow-sm outline-none focus:ring-2 focus:ring-destructive/40 focus-within:ring-1 focus-within:ring-primary/40"
              onKeyDown={(e) => {
                // Supr o Retroceso — solo si el foco está en la tarjeta, NO en un input
                const activeTag = (document.activeElement as HTMLElement)?.tagName;
                const inInput = activeTag === "INPUT" || activeTag === "TEXTAREA";
                if (!inInput && (e.key === "Delete" || e.key === "Backspace")) {
                  e.preventDefault();
                  setHijoAEliminar({ id: hijo.id, nombre: hijo.nombre });
                }
              }}
            >
              {/* ── Fila nombre ─────────────────────────────────────── */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Expand toggle */}
                {tieneNietos ? (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 shrink-0 text-muted-foreground">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </Button>
                  </CollapsibleTrigger>
                ) : (
                  <div className="w-6 shrink-0" />
                )}

                {/* Nivel badge — clic aquí focaliza la tarjeta para activar teclas */}
                <div
                  className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white cursor-default select-none"
                  style={{ backgroundColor: color }}
                  title={`${nivelLabel} · Seleccionado: Supr / ← para eliminar`}
                  onClick={(e) => (e.currentTarget.closest('[tabindex]') as HTMLElement)?.focus()}
                >
                  {nivelAbrev}
                </div>

                {/* Nombre */}
                <Input
                  value={hijo.nombre}
                  onChange={(e) => updateBloqueRecursivo(hijo.id, { nombre: e.target.value })}
                  className="h-7 text-sm flex-1 min-w-0 font-medium"
                />

                {/* Eliminar */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); setHijoAEliminar({ id: hijo.id, nombre: hijo.nombre }); }}
                  title="Eliminar (Supr)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* ── Controles secundarios ────────────────────────────── */}
              <div className="border-t border-border/50 px-3 py-2 space-y-2">
                {/* Color */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-14 shrink-0">Color</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.slice(0, 8).map((c) => (
                      <button
                        key={c.name}
                        className={cn(
                          "w-5 h-5 rounded-md transition-all",
                          color === c.value
                            ? "ring-2 ring-offset-1 ring-slate-700 dark:ring-white scale-110"
                            : "hover:scale-110 ring-1 ring-black/10"
                        )}
                        style={{ backgroundColor: c.value }}
                        onClick={() => updateBloqueRecursivo(hijo.id, { color: c.value })}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Cantidad hijos + Por fila */}
                {tieneNietos && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] text-muted-foreground w-14 shrink-0">
                        Nº {nivelSiguiente.label}s
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={hijo.hijos?.length ?? 0}
                        onChange={(e) => {
                          const cantidad = Math.max(0, Math.min(100, +e.target.value));
                          establecerCantidadHijos(hijo.id, cantidad);
                        }}
                        className="h-7 text-sm w-16 font-semibold text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] text-muted-foreground shrink-0">Por fila</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={hijo.elementosPorFila ?? ""}
                        onChange={(e) => {
                          const valor = Math.max(0, Math.min(20, +e.target.value));
                          updateBloqueRecursivo(hijo.id, {
                            elementosPorFila: valor === 0 ? undefined : valor,
                          });
                        }}
                        className="h-7 text-sm w-16 text-center"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hijos anidados */}
            {tieneNietos && hijo.hijos && hijo.hijos.length > 0 && (
              <CollapsibleContent className="pl-4 pt-2 space-y-2 border-l-2 border-dashed border-primary/25 ml-3 mt-1">
                {renderListaHijos(hijo.hijos, depth + 1)}
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      );
    });
  };

  // ── Renderizar Config Rápida (usa estado del padre para persistencia) ────────
  const renderConfigRapida = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <Label className="text-xs font-semibold">Configuración rápida</Label>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Solo se aplica al bloque seleccionado
        </p>
      </div>

      <div className="space-y-3">
        {nivelesActivos
          .filter((_, idx) => idx > (selectedBloque?.nivelIdx ?? -1))
          .map((nivel, relIdx) => {
            const nivelIdx = (selectedBloque?.nivelIdx ?? 0) + 1 + relIdx;
            const parentLabel = nivelesActivos[nivelIdx - 1]?.label ?? "";
            return (
              <div key={nivel.nivel} className="rounded-md border bg-muted/20 p-2.5 space-y-2">
                {/* Cantidad */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded shrink-0"
                    style={{ backgroundColor: getDefaultColor(nivelIdx) }}
                  />
                  <span className="text-xs font-medium flex-1 truncate">
                    {nivel.label}s / {parentLabel}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={configNiveles[nivelIdx] ?? 0}
                    onChange={(e) =>
                      setConfigNiveles((prev) => ({
                        ...prev,
                        [nivelIdx]: Math.max(0, Math.min(100, +e.target.value)),
                      }))
                    }
                    className="h-7 text-xs w-16 shrink-0"
                  />
                </div>
                {/* Por fila */}
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-[10px] text-muted-foreground flex-1">
                    Por fila <span className="text-muted-foreground/60">(0 = auto)</span>
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={configPorFila[nivelIdx] || 0}
                    onChange={(e) =>
                      setConfigPorFila((prev) => ({
                        ...prev,
                        [nivelIdx]: Math.max(0, Math.min(20, +e.target.value)),
                      }))
                    }
                    className="h-6 text-xs w-16 shrink-0"
                  />
                </div>
              </div>
            );
          })}
      </div>

      <Button
        size="sm"
        className="w-full"
        onClick={() => aplicarCantidadPorNivel(configNiveles, configPorFila)}
        disabled={!selectedBloque}
      >
        <Zap className="w-3.5 h-3.5 mr-1.5" />
        Aplicar al bloque seleccionado
      </Button>
    </div>
  );

  // ── Renderizar componentes por nivel de estructura ─────────────────────────
  const renderComponentesPorNivel = () => {
    const renderElementoConComponentes = (
      elemento: BloqueLayout,
      path: string = "",
      profundidad: number = 0
    ): JSX.Element[] => {
      const resultados: JSX.Element[] = [];

      // Nombre del elemento actual
      const nombreCompleto = path ? `${path} → ${elemento.nombre}` : elemento.nombre;
      const tieneComponentes = (elemento.componentes?.length ?? 0) > 0;

      // Renderizar el elemento actual
      resultados.push(
        <div key={elemento.id} className={cn("space-y-2", profundidad > 0 && "ml-4")}>
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded shrink-0"
                style={{ backgroundColor: elemento.color ?? getDefaultColor(elemento.nivelIdx) }}
              />
              <span className="text-xs font-medium truncate">{nombreCompleto}</span>
              {tieneComponentes && (
                <span className="text-xs text-muted-foreground">({elemento.componentes!.length})</span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => {
                const nuevoComponente: ComponenteCampo = {
                  id: `comp-${Date.now()}`,
                  tipo: "sensor",
                  nombre: "Nuevo componente",
                };
                updateBloqueRecursivo(elemento.id, {
                  componentes: [nuevoComponente, ...(elemento.componentes || [])],
                });
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Añadir
            </Button>
          </div>

          {/* Mostrar componentes del elemento actual */}
          {tieneComponentes && (
            <div className="space-y-1 ml-6">
              {elemento.componentes!.map((comp) => {
                const IconoComponente =
                  comp.tipo === "valvula" ? Droplet :
                  comp.tipo === "sensor" ? Activity :
                  comp.tipo === "bomba" ? Zap :
                  comp.tipo === "filtro" ? Filter :
                  comp.tipo === "medidor" ? Gauge :
                  CircleDot;

                return (
                  <Collapsible key={comp.id}>
                    <div className="rounded border bg-card/50">
                      <CollapsibleTrigger className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconoComponente className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-xs font-medium truncate">{comp.nombre}</span>
                          <span className="text-xs text-muted-foreground capitalize">{comp.tipo}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Botón eliminar visible siempre */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation(); // Evita que se abra/cierre el collapsible
                              setComponenteAEliminar({
                                bloqueId: elemento.id,
                                componenteId: comp.id,
                                nombre: comp.nombre,
                              });
                            }}
                            title="Eliminar componente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-2 pb-2 space-y-2 border-t pt-2">
                          {/* Tipo */}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-medium">Tipo</Label>
                            <select
                              value={comp.tipo}
                              onChange={(e) => {
                                const componentes = elemento.componentes!.map((c) =>
                                  c.id === comp.id ? { ...c, tipo: e.target.value as ComponenteCampo["tipo"] } : c
                                );
                                updateBloqueRecursivo(elemento.id, { componentes });
                              }}
                              className="w-full h-6 text-xs rounded border border-input bg-background px-1"
                            >
                              <option value="valvula">Válvula</option>
                              <option value="sensor">Sensor</option>
                              <option value="bomba">Bomba</option>
                              <option value="filtro">Filtro</option>
                              <option value="medidor">Medidor</option>
                              <option value="otro">Otro</option>
                            </select>
                          </div>

                          {/* Nombre */}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-medium">Nombre</Label>
                            <Input
                              value={comp.nombre}
                              onChange={(e) => {
                                const componentes = elemento.componentes!.map((c) =>
                                  c.id === comp.id ? { ...c, nombre: e.target.value } : c
                                );
                                updateBloqueRecursivo(elemento.id, { componentes });
                              }}
                              className="h-6 text-xs"
                              placeholder="Ej: Válvula principal"
                            />
                          </div>

                          {/* Estado */}
                          <div className="space-y-1">
                            <Label className="text-[9px] font-medium">Estado</Label>
                            <select
                              value={comp.estado || "activo"}
                              onChange={(e) => {
                                const componentes = elemento.componentes!.map((c) =>
                                  c.id === comp.id ? { ...c, estado: e.target.value as ComponenteCampo["estado"] } : c
                                );
                                updateBloqueRecursivo(elemento.id, { componentes });
                              }}
                              className="w-full h-6 text-xs rounded border border-input bg-background px-1"
                            >
                              <option value="activo">Activo</option>
                              <option value="mantenimiento">Mantenimiento</option>
                              <option value="inactivo">Inactivo</option>
                            </select>
                          </div>
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

      // Renderizar recursivamente los hijos
      if (elemento.hijos && elemento.hijos.length > 0) {
        elemento.hijos.forEach(hijo => {
          const hijosRender = renderElementoConComponentes(hijo, nombreCompleto, profundidad + 1);
          resultados.push(...hijosRender);
        });
      }

      return resultados;
    };

    // Comenzar con el bloque seleccionado
    const elementos = renderElementoConComponentes(selectedBloque);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            Componentes por ubicación
          </Label>
        </div>

        {elementos.length === 1 && !selectedBloque.componentes?.length && (!selectedBloque.hijos || selectedBloque.hijos.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
            <Package className="w-8 h-8 mb-2 opacity-30" />
            <p>Sin componentes ni estructura</p>
            <p className="text-[10px] mt-1">Crea hileras/cuadrantes primero</p>
          </div>
        ) : (
          <div className="space-y-2">
            {elementos}
          </div>
        )}
      </div>
    );
  };

  // ── Panel lateral ───────────────────────────────────────────────────────────
  const renderPanelEdicion = () => {
    if (!selectedBloque || readOnly || !showEditPanel) return null;

    return (
      <div className="w-[420px] border-r bg-card flex flex-col shrink-0" style={{ height: 600 }}>
        <div className="p-3 border-b flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-sm flex items-center gap-2 min-w-0">
            <Settings2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{selectedBloque.nombre}</span>
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
              onClick={() => setBloqueAEliminar(selectedBloque.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={closeEditPanel}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="config-rapida" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b bg-muted/30 grid grid-cols-5 shrink-0">
            <TabsTrigger value="config-rapida" className="text-xs">
              Config. Rápida
            </TabsTrigger>
            <TabsTrigger value="estructura" className="text-xs">
              Individual
            </TabsTrigger>
            <TabsTrigger value="componentes" className="text-xs">
              Componentes
            </TabsTrigger>
            <TabsTrigger value="apariencia" className="text-xs">
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="propiedades" className="text-xs">
              Info
            </TabsTrigger>
          </TabsList>

          {/* Tab: Configuración Rápida */}
          <TabsContent value="config-rapida" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {renderConfigRapida()}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Configuración Individual */}
          <TabsContent value="estructura" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {nivelesActivos[selectedBloque.nivelIdx + 1] ? (
                  <div className="space-y-3">
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: getDefaultColor(selectedBloque.nivelIdx + 1) }}
                        />
                        <Label className="text-xs font-semibold flex-1">
                          {nivelesActivos[selectedBloque.nivelIdx + 1]?.label}s: {selectedBloque.hijos?.length ?? 0}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={selectedBloque.hijos?.length ?? 0}
                          onChange={(e) => {
                            const cantidad = Math.max(0, Math.min(100, +e.target.value));
                            establecerCantidadHijos(selectedBloque.id, cantidad);
                          }}
                          className="h-7 text-xs w-14 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Configuración de elementos por fila */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold flex-1">
                          📐 Elementos por fila (0 = automático)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={selectedBloque.elementosPorFila || 0}
                          onChange={(e) => {
                            const valor = Math.max(0, Math.min(20, +e.target.value));
                            updateBloqueRecursivo(selectedBloque.id, {
                              elementosPorFila: valor === 0 ? undefined : valor
                            });
                          }}
                          className="h-7 text-xs w-14 font-semibold"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Controla cómo se organizan los {nivelesActivos[selectedBloque.nivelIdx + 1]?.label.toLowerCase()}s en filas
                      </p>
                    </div>

                    {selectedBloque.hijos && selectedBloque.hijos.length > 0 && (
                      <div className="space-y-2">
                        {renderListaHijos(selectedBloque.hijos)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground italic">
                    Último nivel
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Apariencia */}
          <TabsContent value="apariencia" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Opacidad general */}
            <div className="space-y-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Opacidad general</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {opacidadGlobal}%
                </span>
              </div>
              <Slider
                value={[opacidadGlobal]}
                min={30}
                max={100}
                step={5}
                onValueChange={([val]) => actualizarOpacidadGlobal(val)}
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground">
                Aplica a toda la estructura
              </p>
            </div>

            {/* Temas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <Label className="text-xs font-semibold">Temas de colores</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(COLOR_THEMES).map(([key, tema]) => (
                  <button
                    key={key}
                    className="p-2.5 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all text-left group"
                    onClick={() => aplicarTema(key as keyof typeof COLOR_THEMES)}
                  >
                    <div className="text-[11px] font-semibold mb-1.5 group-hover:text-primary">
                      {tema.nombre}
                    </div>
                    <div className="flex gap-0.5">
                      {tema.colores.map((color, i) => (
                        <div key={i} className="flex-1 h-4 rounded-sm" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color del bloque */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Color del bloque principal</Label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    className={cn(
                      "w-12 h-12 rounded-lg border-2 transition-all hover:scale-105",
                      selectedBloque.color === c.value
                        ? "border-slate-900 dark:border-white ring-2"
                        : "border-slate-200 hover:border-slate-400"
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() =>
                      updateBloqueRecursivo(selectedBloque.id, { color: c.value })
                    }
                    title={c.name}
                  />
                ))}
              </div>
            </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Componentes */}
          <TabsContent value="componentes" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {/* Renderizar componentes por nivel de estructura */}
                {renderComponentesPorNivel()}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Info */}
          <TabsContent value="propiedades" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre</Label>
              <Input
                value={selectedBloque.nombre}
                onChange={(e) =>
                  updateBloqueRecursivo(selectedBloque.id, { nombre: e.target.value })
                }
                className="h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ancho</Label>
                <Input
                  type="number"
                  value={selectedBloque.width}
                  onChange={(e) =>
                    updateBloqueRecursivo(selectedBloque.id, {
                      width: Math.max(200, +e.target.value),
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Alto</Label>
                <Input
                  type="number"
                  value={selectedBloque.height}
                  onChange={(e) =>
                    updateBloqueRecursivo(selectedBloque.id, {
                      height: Math.max(150, +e.target.value),
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span>Posición</span>
                <span className="font-mono">({selectedBloque.x}, {selectedBloque.y})</span>
              </div>
              <div className="flex justify-between">
                <span>Tamaño</span>
                <span className="font-mono">{selectedBloque.width}×{selectedBloque.height} px</span>
              </div>
            </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addBloque} disabled={nivelesActivos.length === 0}>
            <Plus className="w-4 h-4 mr-1" />
            {getNivelLabel(estructura, 0) || "Bloque"}
          </Button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hand className="w-3.5 h-3.5" />
          <span>Arrastra el fondo para navegar</span>
        </div>
        <div className="flex items-center gap-1 border rounded-md px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      {nivelesActivos.length > 0 && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          {nivelesActivos.map((nivel, idx) => (
            <div key={nivel.nivel} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: getDefaultColor(idx) }} />
              <span className="font-medium">{nivel.label}</span>
              {idx < nivelesActivos.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      )}

      {/* Layout: Panel + Canvas */}
      <div className="flex border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/50" style={{ height: 600 }}>
        {renderPanelEdicion()}

        {/* Canvas */}
        <div
          ref={containerRef}
          tabIndex={0}
          className={cn("relative overflow-hidden flex-1 outline-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("map-bg")) {
              setSelectedId(null);
              closeEditPanel();
              setIsPanning(true);
              setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
              e.preventDefault();
              const bloque = layout.find((b) => b.id === selectedId);
              if (bloque) setBloqueAEliminar(bloque.id);
            }
          }}
        >
          {nivelesActivos.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <Move className="w-5 h-5 mr-2" />
              Configura los niveles jerárquicos primero
            </div>
          ) : (
            <>
              <div
                className="map-bg absolute pointer-events-none"
                style={{
                  width: 8000,
                  height: 8000,
                  left: pan.x,
                  top: pan.y,
                  transform: `scale(${scale})`,
                  transformOrigin: "0 0",
                  backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                  opacity: 0.4,
                }}
              />

              <div
                className="absolute pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: "0 0",
                }}
              >
                {layout.map((bloque) => {
                  const isSelected = selectedId === bloque.id;
                  const color = bloque.color ?? getDefaultColor(bloque.nivelIdx);
                  const opacity = bloque.opacity ?? opacidadGlobal;
                  const hijosCount = bloque.hijos?.length ?? 0;
                  const isVertical = bloque.width < bloque.height;

                  return (
                    <div
                      key={bloque.id}
                      className={cn(
                        "absolute rounded-lg border-2 transition-all flex flex-col pointer-events-auto",
                        isSelected ? "shadow-2xl ring-4 ring-violet-500 z-20" : "shadow-lg hover:shadow-xl z-10",
                        dragging?.id === bloque.id ? "cursor-grabbing" : "cursor-grab"
                      )}
                      style={{
                        left: bloque.x,
                        top: bloque.y,
                        width: bloque.width,
                        height: bloque.height,
                        backgroundColor: color,
                        opacity: opacity / 100,
                        borderColor: isSelected ? "#8b5cf6" : color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(bloque.id);
                        containerRef.current?.focus();
                      }}
                      onMouseDown={(e) => {
                        if (readOnly || (e.target as HTMLElement).closest(".no-drag")) return;
                        e.stopPropagation();
                        setSelectedId(bloque.id);
                        setDragging({
                          id: bloque.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: bloque.x,
                          origY: bloque.y,
                        });
                      }}
                    >
                      <div className="px-2 py-1.5 border-b flex items-center justify-between bg-black/10" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
                        <span className="text-sm font-bold text-white truncate drop-shadow-md flex-1">
                          {bloque.nombre}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Indicadores de componentes */}
                          {bloque.componentes && bloque.componentes.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {bloque.componentes.slice(0, 3).map((comp, i) => {
                                const CompIcon =
                                  comp.tipo === "valvula" ? Droplet :
                                  comp.tipo === "sensor" ? Activity :
                                  comp.tipo === "bomba" ? Zap :
                                  comp.tipo === "filtro" ? Filter :
                                  comp.tipo === "medidor" ? Gauge :
                                  CircleDot;
                                return (
                                  <div
                                    key={comp.id}
                                    className="w-5 h-5 rounded bg-white/30 flex items-center justify-center"
                                    title={comp.nombre}
                                  >
                                    <CompIcon className="w-3 h-3 text-white" />
                                  </div>
                                );
                              })}
                              {bloque.componentes.length > 3 && (
                                <span className="text-[9px] bg-white/30 px-1 py-0.5 rounded text-white font-bold">
                                  +{bloque.componentes.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {hijosCount > 0 && (
                            <span className="text-[10px] bg-white/40 px-2 py-0.5 rounded-full text-white font-bold">
                              {hijosCount}
                            </span>
                          )}
                          {/* Botón eliminar + botón editar */}
                          {!readOnly && (
                            <>
                              <button
                                className="no-drag w-6 h-6 rounded bg-red-500/70 hover:bg-red-600/90 flex items-center justify-center transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBloqueAEliminar(bloque.id);
                                }}
                                title="Eliminar bloque (Supr)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button
                                className="no-drag w-6 h-6 rounded bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditPanelForBlock(bloque.id);
                                }}
                                title="Editar bloque"
                              >
                                <Settings2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex-1 p-2 gap-1.5 overflow-hidden",
                          bloque.elementosPorFila && bloque.elementosPorFila > 0
                            ? "grid"
                            : `flex ${isVertical ? "flex-col" : "flex-row"}`
                        )}
                        style={
                          bloque.elementosPorFila && bloque.elementosPorFila > 0
                            ? {
                                gridTemplateColumns: `repeat(${bloque.elementosPorFila}, 1fr)`,
                                gridAutoRows: "1fr",
                              }
                            : undefined
                        }
                      >
                        {hijosCount > 0 ? (
                          renderHijosVisuales(bloque.hijos!, bloque.width, bloque.height, 0, bloque.elementosPorFila)
                        ) : nivelesActivos[bloque.nivelIdx + 1] ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-white/60 italic">
                            Sin {nivelesActivos[bloque.nivelIdx + 1].label.toLowerCase()}s
                          </div>
                        ) : null}
                      </div>

                      {isSelected && !readOnly && (
                        <div
                          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-white/80 hover:bg-white rounded-tl no-drag pointer-events-auto flex items-center justify-center"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizing({
                              id: bloque.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              origW: bloque.width,
                              origH: bloque.height,
                            });
                          }}
                        >
                          <svg viewBox="0 0 16 16" className="w-4 h-4 text-slate-600">
                            <path d="M14 14L14 8M14 14L8 14" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-3 right-3 text-xs bg-black/70 text-white px-3 py-1.5 rounded-lg pointer-events-none">
                {layout.length} {getNivelLabel(estructura, 0).toLowerCase()}{layout.length !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>
      </div>

      {!readOnly && nivelesActivos.length > 0 && !selectedBloque && layout.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Haz clic en <strong>+ {getNivelLabel(estructura, 0)}</strong> para comenzar
        </p>
      )}

      {/* ── Confirmación de eliminación de subnivel ────────────────────────── */}
      <AlertDialog open={!!hijoAEliminar} onOpenChange={(open) => !open && setHijoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar subnivel?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{hijoAEliminar?.nombre}</strong> y todo su contenido. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (hijoAEliminar) {
                  deleteHijo(hijoAEliminar.id);
                  setHijoAEliminar(null);
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmación de eliminación ─────────────────────────────────────── */}
      <AlertDialog open={!!bloqueAEliminar} onOpenChange={(open) => !open && setBloqueAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bloque?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{layout.find((b) => b.id === bloqueAEliminar)?.nombre}</strong> y
              todo su contenido (hileras, cuadrantes, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (bloqueAEliminar) {
                  deleteBloque(bloqueAEliminar);
                  setBloqueAEliminar(null);
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmación de eliminación de componente ───────────────────────── */}
      <AlertDialog open={!!componenteAEliminar} onOpenChange={(open) => !open && setComponenteAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar componente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{componenteAEliminar?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (componenteAEliminar) {
                  // Buscar y eliminar el componente del bloque correspondiente
                  const findAndRemoveComponent = (bloques: BloqueLayout[]): BloqueLayout[] => {
                    return bloques.map(bloque => {
                      if (bloque.id === componenteAEliminar.bloqueId) {
                        return {
                          ...bloque,
                          componentes: bloque.componentes?.filter(c => c.id !== componenteAEliminar.componenteId) || []
                        };
                      }
                      if (bloque.hijos && bloque.hijos.length > 0) {
                        return { ...bloque, hijos: findAndRemoveComponent(bloque.hijos) };
                      }
                      return bloque;
                    });
                  };

                  const nuevoLayout = findAndRemoveComponent(layout);
                  onChange(nuevoLayout);
                  setComponenteAEliminar(null);
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
