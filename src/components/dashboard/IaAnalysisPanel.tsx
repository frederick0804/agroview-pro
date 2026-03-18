import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Camera, Sparkles, Upload, CheckCircle2, Loader2,
  AlertTriangle, Eye, Pencil, X, ImagePlus,
} from "lucide-react";
import type { ModParam } from "@/config/moduleDefinitions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DetectedField {
  nombre: string;
  valor: string;
  confianza: number;
  modo: "ia" | "ia_editable";
}

type Fase = "idle" | "uploading" | "analyzing" | "results";

// ─── Resultados simulados por tipo de instrucción ─────────────────────────────

const MIPE_RESULTS: DetectedField[] = [
  { nombre: "plaga_identificada",   valor: "Trips (Frankliniella occidentalis)", confianza: 94, modo: "ia" },
  { nombre: "enfermedad_detectada", valor: "Botrytis cinerea",                   confianza: 87, modo: "ia_editable" },
  { nombre: "nivel_severidad",      valor: "Moderado",                           confianza: 91, modo: "ia" },
  { nombre: "zona_afectada",        valor: "Hojas superiores — cuadrante NE",    confianza: 78, modo: "ia_editable" },
  { nombre: "recomendacion",        valor: "Aplicar fungicida sistémico + control biológico de trips", confianza: 82, modo: "ia_editable" },
  { nombre: "estado",               valor: "En proceso",                         confianza: 95, modo: "ia" },
  { nombre: "observaciones",        valor: "Síntomas visibles de Botrytis en hojas jóvenes, trips adultos detectados en envés. Se recomienda muestreo en hileras adyacentes.", confianza: 85, modo: "ia_editable" },
];

function generateResults(iaParams: ModParam[]): DetectedField[] {
  const matched: DetectedField[] = [];
  for (const p of iaParams) {
    const demo = MIPE_RESULTS.find(r => r.nombre === p.nombre);
    if (demo) {
      matched.push({ ...demo, modo: p.fuente_datos === "ia" ? "ia" : "ia_editable" });
    } else {
      const val = p.tipo_dato === "Número" ? String(Math.floor(Math.random() * 100))
        : p.tipo_dato === "Fecha" ? new Date().toISOString().slice(0, 10)
        : p.tipo_dato === "Sí/No" ? "Sí"
        : p.ia_instruccion || "Valor detectado por IA";
      matched.push({
        nombre: p.nombre,
        valor: val,
        confianza: 70 + Math.floor(Math.random() * 25),
        modo: p.fuente_datos === "ia" ? "ia" : "ia_editable",
      });
    }
  }
  return matched;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IaAnalysisPanelProps {
  /** Fields configured with fuente_datos = ia | ia_editable */
  iaParams: ModParam[];
  /** Called when user confirms results — receives { [fieldName]: value } */
  onConfirm: (values: Record<string, string>) => void;
  /** Called when user dismisses the panel */
  onClose: () => void;
  /** Controls visibility */
  open: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IaAnalysisPanel({ iaParams, onConfirm, onClose, open }: IaAnalysisPanelProps) {
  const [fase, setFase] = useState<Fase>("idle");
  const [progreso, setProgreso] = useState(0);
  const [resultados, setResultados] = useState<DetectedField[]>([]);
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const iniciarAnalisis = useCallback(() => {
    setFase("uploading");
    setProgreso(0);

    // Fase 1: Upload (1s)
    const t1 = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 100) { clearInterval(t1); return 100; }
        return prev + 10;
      });
    }, 80);

    setTimeout(() => {
      clearInterval(t1);
      setFase("analyzing");
      setProgreso(0);

      // Fase 2: Analyze (1.8s)
      const t2 = setInterval(() => {
        setProgreso(prev => {
          if (prev >= 100) { clearInterval(t2); return 100; }
          return prev + 5;
        });
      }, 70);

      setTimeout(() => {
        clearInterval(t2);
        setFase("results");
        setResultados(generateResults(iaParams));
      }, 1800);
    }, 1000);
  }, [iaParams]);

  const handleConfirm = () => {
    const values: Record<string, string> = {};
    for (const r of resultados) {
      values[r.nombre] = r.valor;
    }
    onConfirm(values);
    // Reset state for next use
    setFase("idle");
    setProgreso(0);
    setResultados([]);
    setEditandoIdx(null);
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setFase("idle");
      setProgreso(0);
      setResultados([]);
      setEditandoIdx(null);
    }, 300);
  };

  const confColor = (c: number) =>
    c >= 90 ? "text-emerald-600 dark:text-emerald-400"
    : c >= 75 ? "text-amber-600 dark:text-amber-400"
    : "text-red-500";

  const confBg = (c: number) =>
    c >= 90 ? "bg-emerald-500" : c >= 75 ? "bg-amber-500" : "bg-red-500";

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0 gap-0 border-l-violet-500/20">
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-violet-500/15 bg-gradient-to-b from-violet-500/[0.06] to-transparent space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Análisis con IA</SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground mt-0">
                {iaParams.length} campo{iaParams.length !== 1 ? "s" : ""} se llenarán automáticamente
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── Idle: Upload zone ── */}
          {fase === "idle" && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); iniciarAnalisis(); }}
              className={`flex flex-col items-center gap-5 py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                dragOver
                  ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
                  : "border-violet-300/60 dark:border-violet-700 hover:border-violet-500/60 hover:bg-violet-500/[0.03]"
              }`}
              onClick={iniciarAnalisis}
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/30 flex items-center justify-center">
                  <Camera className="w-9 h-9 text-violet-500" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <ImagePlus className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2 max-w-xs px-4">
                <p className="text-sm font-semibold text-foreground">
                  {dragOver ? "Suelta la foto aquí" : "Sube una foto para analizar"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Arrastra una imagen o haz clic para iniciar el análisis. La IA detectará y llenará los campos configurados.
                </p>
              </div>

              {/* Field badges */}
              <div className="flex flex-wrap justify-center gap-1.5 px-4">
                {iaParams.map(p => (
                  <Badge key={p.id} variant="outline" className="text-[9px] px-1.5 py-0.5 border-violet-300/60 text-violet-600 dark:text-violet-400 dark:border-violet-600/40 bg-violet-500/[0.04]">
                    {p.etiqueta_personalizada || p.nombre.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-violet-400 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 mt-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Seleccionar foto
              </Button>
            </div>
          )}

          {/* ── Uploading ── */}
          {fase === "uploading" && (
            <div className="space-y-5 py-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-500 animate-bounce" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Subiendo imagen...</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Preparando para análisis</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="text-muted-foreground font-mono">{Math.min(progreso, 100)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-75 ease-linear"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Analyzing ── */}
          {fase === "analyzing" && (
            <div className="space-y-5 py-4">
              {/* Animation box */}
              <div className="relative h-48 rounded-2xl bg-gradient-to-br from-violet-950/80 to-purple-950/80 dark:from-violet-950 dark:to-purple-950 overflow-hidden border border-violet-500/20">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                {/* Scan line */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                  style={{
                    top: `${Math.min(progreso, 100)}%`,
                    transition: "top 70ms linear",
                    boxShadow: "0 0 12px 4px rgba(139,92,246,0.5), 0 0 40px 8px rgba(139,92,246,0.2)",
                  }}
                />
                {/* Center spinner */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                      <Sparkles className="w-6 h-6 text-violet-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-violet-200">Analizando imagen con IA...</p>
                      <p className="text-[10px] text-violet-400/70 mt-0.5">Detectando patrones en el cultivo</p>
                    </div>
                  </div>
                </div>
                {/* Floating detection boxes */}
                {progreso > 30 && (
                  <div className="absolute top-4 left-4 px-2 py-1 rounded border border-red-500/50 bg-red-500/10 animate-pulse">
                    <span className="text-[9px] text-red-400 font-mono">🔴 Botrytis detectada</span>
                  </div>
                )}
                {progreso > 55 && (
                  <div className="absolute bottom-4 right-4 px-2 py-1 rounded border border-amber-500/50 bg-amber-500/10 animate-pulse">
                    <span className="text-[9px] text-amber-400 font-mono">🟡 Trips identificados</span>
                  </div>
                )}
                {progreso > 75 && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded border border-emerald-500/50 bg-emerald-500/10 animate-pulse">
                    <span className="text-[9px] text-emerald-400 font-mono">🟢 Severidad: Moderada</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
                    Procesando con modelo de visión...
                  </span>
                  <span className="text-muted-foreground font-mono">{Math.min(progreso, 100)}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {fase === "results" && (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block">
                    Análisis completado
                  </span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                    {resultados.length} campos detectados — revisa y confirma
                  </span>
                </div>
              </div>

              {/* Results list */}
              <div className="space-y-2">
                {resultados.map((campo, i) => (
                  <div
                    key={campo.nombre}
                    className="rounded-xl border border-border bg-card px-3.5 py-3 hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {campo.modo === "ia_editable" ? (
                          <Pencil className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-emerald-500" />
                        )}
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {campo.nombre.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] px-1 py-0 ${
                            campo.modo === "ia_editable"
                              ? "border-amber-300 text-amber-600 dark:text-amber-400"
                              : "border-emerald-300 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {campo.modo === "ia_editable" ? "editable" : "auto"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold tabular-nums ${confColor(campo.confianza)}`}>
                          {campo.confianza}%
                        </span>
                        <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${confBg(campo.confianza)}`} style={{ width: `${campo.confianza}%` }} />
                        </div>
                      </div>
                    </div>

                    {editandoIdx === i ? (
                      <input
                        autoFocus
                        defaultValue={campo.valor}
                        onBlur={e => {
                          const nr = [...resultados];
                          nr[i] = { ...campo, valor: e.target.value };
                          setResultados(nr);
                          setEditandoIdx(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditandoIdx(null);
                        }}
                        className="w-full text-xs bg-background border border-violet-500/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      />
                    ) : (
                      <p
                        className={`text-xs text-foreground leading-relaxed ${
                          campo.modo === "ia_editable" ? "cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors" : ""
                        }`}
                        onClick={() => campo.modo === "ia_editable" && setEditandoIdx(i)}
                      >
                        {campo.valor}
                        {campo.modo === "ia_editable" && (
                          <Pencil className="w-2.5 h-2.5 inline ml-1.5 text-muted-foreground/40 group-hover:text-violet-500/60 transition-colors" />
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Low confidence warning */}
              {resultados.some(r => r.confianza < 80) && (
                <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3.5 py-2.5 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Algunos campos tienen confianza baja. Revisa los valores <strong>editables</strong> antes de confirmar.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {fase === "results" && (
          <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleClose}>
              Descartar
            </Button>
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-1.5 shadow-md shadow-violet-500/20"
              onClick={handleConfirm}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar y llenar registro
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
