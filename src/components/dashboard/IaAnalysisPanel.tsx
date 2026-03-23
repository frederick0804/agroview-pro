import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera, Sparkles, Upload, CheckCircle2, Loader2,
  AlertTriangle, Pencil, X, Plus, Trash2,
  ArrowRight, RotateCcw, ImageIcon, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModParam } from "@/config/moduleDefinitions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DetectedField {
  nombre: string;
  valor: string;
  confianza: number;
  modo: "ia" | "ia_editable" | "ml" | "ml_editable";
}

interface DetectedRow {
  id: string;
  campos: DetectedField[];
  selected: boolean;
}

type Fase = "upload" | "analyzing" | "results";
type Tipo = "ia" | "ml";

// ─── Resultados simulados IA ─────────────────────────────────────────────────

const DEMO_IA_ROWS: DetectedField[][] = [
  [
    { nombre: "plaga_identificada",   valor: "Trips (Frankliniella)", confianza: 94, modo: "ia" },
    { nombre: "enfermedad_detectada", valor: "Ninguna",               confianza: 98, modo: "ia_editable" },
    { nombre: "nivel_severidad",      valor: "Moderado",              confianza: 91, modo: "ia" },
    { nombre: "zona_afectada",        valor: "Cuadrante NE",          confianza: 85, modo: "ia_editable" },
    { nombre: "recomendacion",        valor: "Control biológico",     confianza: 82, modo: "ia_editable" },
  ],
];

// ─── Resultados simulados ML ─────────────────────────────────────────────────

const DEMO_ML_RESULTS: Record<string, Record<string, string>> = {
  color_detection: {
    color_predominante: "Azul oscuro",
    colores_secundarios: "Verde, Rojo",
    porcentaje_maduro: "85%",
    categoria_madurez: "Óptima cosecha",
  },
  fruit_counter: {
    frutas_totales: "127",
    frutas_maduras: "108",
    frutas_verdes: "19",
    densidad_estimada: "45 frutas/m²",
  },
  quality_classifier: {
    clasificacion: "Premium",
    calibre_promedio: "16-18mm",
    uniformidad: "Alta",
    defectos_visibles: "Mínimos (2%)",
  },
  defect_detector: {
    tipo_defecto: "Manchas leves",
    severidad: "Baja",
    porcentaje_afectado: "5%",
    accion_recomendada: "Clasificar y empacar por separado",
  },
  size_estimator: {
    calibre_promedio: "17mm",
    rango_calibres: "15-19mm",
    categoria: "Jumbo",
    peso_estimado: "3.2g/unidad",
  },
  ripeness_detector: {
    nivel_madurez: "Óptimo (85%)",
    dias_cosecha: "0-2 días",
    color_indice: "Azul profundo",
    firmeza_estimada: "Alta",
  },
};

function generateResults(params: ModParam[], tipo: Tipo): DetectedRow[] {
  const rows: DetectedRow[] = [];
  const isMl = tipo === "ml";

  if (isMl) {
    // Para ML, generar una fila por campo con resultados simulados
    const campos: DetectedField[] = params.map(p => {
      const modelo = p.ml_modelo || "custom";
      const demoData = DEMO_ML_RESULTS[modelo] || {};
      const demoKeys = Object.keys(demoData);
      const randomKey = demoKeys[Math.floor(Math.random() * demoKeys.length)] || "";
      const valor = demoData[randomKey] || (
        p.tipo_dato === "Número" ? String(Math.floor(Math.random() * 100))
        : p.tipo_dato === "Fecha" ? new Date().toISOString().slice(0, 10)
        : `Resultado ML`
      );

      return {
        nombre: p.nombre,
        valor,
        confianza: 85 + Math.floor(Math.random() * 15),
        modo: p.fuente_datos === "ml" ? "ml" : "ml_editable",
      };
    });
    rows.push({ id: `row-ml-${Date.now()}`, campos, selected: true });
  } else {
    // Para IA, generar 1-3 filas como antes
    const numRows = 1 + Math.floor(Math.random() * 3);
    for (let r = 0; r < numRows; r++) {
      const demoRow = DEMO_IA_ROWS[r % DEMO_IA_ROWS.length];
      const campos: DetectedField[] = params.map(p => {
        const demo = demoRow.find(d => d.nombre === p.nombre);
        if (demo) return { ...demo, modo: p.fuente_datos === "ia" ? "ia" : "ia_editable" };
        return {
          nombre: p.nombre,
          valor: p.tipo_dato === "Número" ? String(Math.floor(Math.random() * 100))
            : p.tipo_dato === "Fecha" ? new Date().toISOString().slice(0, 10)
            : p.tipo_dato === "Sí/No" ? "Sí"
            : `Valor ${r + 1}`,
          confianza: 70 + Math.floor(Math.random() * 25),
          modo: p.fuente_datos === "ia" ? "ia" : "ia_editable",
        };
      });
      rows.push({ id: `row-ia-${Date.now()}-${r}`, campos, selected: true });
    }
  }

  return rows;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IaAnalysisPanelProps {
  params: ModParam[];
  tipo: Tipo;
  onConfirm: (rows: Record<string, string>[]) => void;
  onClose: () => void;
  open: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IaAnalysisPanel({ params, tipo, onConfirm, onClose, open }: IaAnalysisPanelProps) {
  const [fase, setFase] = useState<Fase>("upload");
  const [progreso, setProgreso] = useState(0);
  const [rows, setRows] = useState<DetectedRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; campo: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMl = tipo === "ml";
  const Icon = isMl ? Brain : Sparkles;
  const color = isMl ? "cyan" : "violet";
  const title = isMl ? "Análisis ML" : "Análisis IA";

  const iniciarAnalisis = useCallback(() => {
    setFase("analyzing");
    setProgreso(0);

    const interval = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 3;
      });
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setFase("results");
      setRows(generateResults(params, tipo));
    }, 2000);
  }, [params, tipo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) iniciarAnalisis();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) iniciarAnalisis();
  };

  const handleConfirm = () => {
    const result = rows.filter(r => r.selected).map(row => {
      const values: Record<string, string> = {};
      row.campos.forEach(c => { values[c.nombre] = c.valor; });
      return values;
    });
    onConfirm(result);
    resetState();
    onClose();
  };

  const resetState = () => {
    setFase("upload");
    setProgreso(0);
    setRows([]);
    setEditingCell(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 200);
  };

  const updateCell = (rowId: string, campo: string, valor: string) => {
    setRows(prev => prev.map(r => r.id !== rowId ? r : {
      ...r,
      campos: r.campos.map(c => c.nombre === campo ? { ...c, valor, confianza: 100 } : c),
    }));
  };

  const addEmptyRow = () => {
    setRows(prev => [...prev, {
      id: `row-${Date.now()}`,
      campos: params.map(p => ({
        nombre: p.nombre,
        valor: "",
        confianza: 100,
        modo: (isMl
          ? (p.fuente_datos === "ml" ? "ml" : "ml_editable")
          : (p.fuente_datos === "ia" ? "ia" : "ia_editable")
        ) as DetectedField["modo"],
      })),
      selected: true,
    }]);
  };

  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className={cn(
        "p-0 gap-0",
        fase === "results" ? "max-w-3xl" : "max-w-md"
      )}>
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b bg-muted/30">
          <DialogTitle className={cn("flex items-center gap-2 text-base")}>
            <Icon className={cn("w-4 h-4", `text-${color}-600`)} />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── Upload ── */}
        {fase === "upload" && (
          <div className="p-5 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {dragOver ? "Suelta aquí" : "Sube una imagen"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arrastra o haz clic para seleccionar
                </p>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Campos a llenar:</p>
              <div className="flex flex-wrap gap-1.5">
                {params.map(p => (
                  <Badge key={p.id} variant="secondary" className="text-[11px]">
                    {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Demo */}
            <button
              onClick={iniciarAnalisis}
              className="w-full text-xs text-muted-foreground hover:text-primary py-2 transition-colors"
            >
              Probar con <span className="underline">imagen demo</span>
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {fase === "analyzing" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative">
                <Loader2 className={cn("w-10 h-10 animate-spin", `text-${color}-600`)} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isMl ? "Procesando imagen con ML..." : "Analizando imagen..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMl ? "Ejecutando modelo de visión computacional" : "Detectando registros automáticamente"}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{Math.min(progreso, 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(progreso, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {fase === "results" && (
          <div className="flex flex-col max-h-[65vh]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b bg-muted/20">
              <button
                onClick={resetState}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nueva imagen
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {rows.length} fila{rows.length !== 1 ? "s" : ""} detectada{rows.length !== 1 ? "s" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={addEmptyRow} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {rows.length === 0 ? (
                <div className="py-10 text-center">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">Sin resultados</p>
                  <Button variant="outline" size="sm" onClick={addEmptyRow} className="mt-3">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Agregar fila
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center text-xs font-medium text-muted-foreground">#</th>
                      {params.map(p => (
                        <th key={p.id} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {(p.etiqueta_personalizada || p.nombre).replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, idx) => (
                      <tr key={row.id} className={cn(
                        "transition-colors",
                        row.selected ? "bg-background" : "bg-muted/20 opacity-50"
                      )}>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setRows(prev => prev.map(r =>
                              r.id === row.id ? { ...r, selected: !r.selected } : r
                            ))}
                            className={cn(
                              "w-6 h-6 rounded border-2 flex items-center justify-center text-[10px] font-bold transition-all",
                              row.selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary/50"
                            )}
                          >
                            {row.selected ? "✓" : idx + 1}
                          </button>
                        </td>

                        {params.map(p => {
                          const campo = row.campos.find(c => c.nombre === p.nombre);
                          if (!campo) return <td key={p.id} className="px-3 py-2">—</td>;

                          const isEditing = editingCell?.rowId === row.id && editingCell?.campo === campo.nombre;
                          const canEdit = campo.modo === "ia_editable" || campo.modo === "ml_editable" || !campo.valor;
                          const lowConf = campo.confianza < 80;

                          return (
                            <td key={p.id} className={cn("px-3 py-2", lowConf && "bg-amber-50 dark:bg-amber-950/20")}>
                              {isEditing ? (
                                <input
                                  autoFocus
                                  defaultValue={campo.valor}
                                  onBlur={e => { updateCell(row.id, campo.nombre, e.target.value); setEditingCell(null); }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              ) : (
                                <div
                                  onClick={() => canEdit && row.selected && setEditingCell({ rowId: row.id, campo: campo.nombre })}
                                  className={cn(
                                    "flex items-center gap-1.5 group",
                                    canEdit && row.selected && "cursor-pointer hover:text-primary"
                                  )}
                                >
                                  <span className="truncate">
                                    {campo.valor || <span className="text-muted-foreground/50 italic">vacío</span>}
                                  </span>
                                  {lowConf && (
                                    <span className="text-[10px] text-amber-600 font-medium">{campo.confianza}%</span>
                                  )}
                                  {canEdit && row.selected && (
                                    <Pencil className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0" />
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                            className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Warning */}
            {rows.some(r => r.campos.some(c => c.confianza < 80)) && (
              <div className="mx-5 my-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Celdas amarillas tienen baja confianza. Clic para editar.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedCount} de {rows.length} seleccionados
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={selectedCount === 0}
                  onClick={handleConfirm}
                >
                  Crear {selectedCount} registro{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
