import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Sparkles, Upload, CheckCircle2, Loader2,
  Image as ImageIcon, AlertTriangle, Eye, Pencil, X,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CampoIA {
  nombre: string;
  valor: string;
  confianza: number; // 0-100
  editable: boolean;
}

type FaseIA = "idle" | "uploading" | "analyzing" | "results";

// ─── Datos de demo ────────────────────────────────────────────────────────────

const DEMO_RESULTS: CampoIA[] = [
  { nombre: "plaga_identificada",   valor: "Trips (Frankliniella occidentalis)", confianza: 94, editable: false },
  { nombre: "enfermedad_detectada", valor: "Botrytis cinerea",                   confianza: 87, editable: true },
  { nombre: "nivel_severidad",      valor: "Moderado",                           confianza: 91, editable: false },
  { nombre: "zona_afectada",        valor: "Hojas superiores",                   confianza: 78, editable: true },
  { nombre: "recomendacion",        valor: "Aplicar fungicida sistémico + control biológico de trips", confianza: 82, editable: true },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function IaPhotoPrototype({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [fase, setFase] = useState<FaseIA>("idle");
  const [progreso, setProgreso] = useState(0);
  const [resultados, setResultados] = useState<CampoIA[]>([]);
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetDemo = useCallback(() => {
    setFase("idle");
    setProgreso(0);
    setResultados([]);
    setEditandoIdx(null);
    setPreviewUrl(null);
  }, []);

  // Simular el flujo de IA
  const iniciarAnalisis = useCallback(() => {
    // Usar una imagen de demostración
    setPreviewUrl("data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#1a2e1a"/>
        <rect x="40" y="60" width="320" height="180" rx="12" fill="#2d4a2d" stroke="#4ade80" stroke-width="1" opacity="0.6"/>
        <text x="200" y="140" text-anchor="middle" fill="#86efac" font-size="14" font-family="Inter,sans-serif">📷 Foto de planta con síntomas</text>
        <text x="200" y="165" text-anchor="middle" fill="#4ade80" font-size="11" font-family="Inter,sans-serif" opacity="0.7">Fresa — Bloque A-1, Hilera 3</text>
        <circle cx="145" cy="195" r="18" fill="#ef4444" opacity="0.3" stroke="#ef4444" stroke-width="1.5"/>
        <text x="145" y="199" text-anchor="middle" fill="#fca5a5" font-size="9" font-family="Inter,sans-serif">Botrytis</text>
        <circle cx="255" cy="185" r="14" fill="#f59e0b" opacity="0.3" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="255" y="189" text-anchor="middle" fill="#fcd34d" font-size="8" font-family="Inter,sans-serif">Trips</text>
      </svg>`
    ));

    setFase("uploading");
    setProgreso(0);

    // Fase 1: Subiendo (1.2s)
    const uploadInterval = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 8;
      });
    }, 80);

    setTimeout(() => {
      clearInterval(uploadInterval);
      setProgreso(0);
      setFase("analyzing");

      // Fase 2: Analizando (2s)
      const analyzeInterval = setInterval(() => {
        setProgreso(prev => {
          if (prev >= 100) {
            clearInterval(analyzeInterval);
            return 100;
          }
          return prev + 4;
        });
      }, 60);

      setTimeout(() => {
        clearInterval(analyzeInterval);
        setFase("results");
        setResultados(DEMO_RESULTS.map(r => ({ ...r })));
      }, 2000);
    }, 1200);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetDemo();
  }, [resetDemo]);

  const confianzaColor = (c: number) => {
    if (c >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (c >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-red-500";
  };

  const confianzaBg = (c: number) => {
    if (c >= 90) return "bg-emerald-500";
    if (c >= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.03] to-transparent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Prototipo — Llenado por IA</h3>
            <p className="text-[10px] text-muted-foreground">Simulación: subir foto → IA identifica → campos se llenan</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {fase !== "idle" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetDemo}>
              Reiniciar
            </Button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Fase: Idle ── */}
        {fase === "idle" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-500/20">
                <Camera className="w-9 h-9 text-violet-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-center space-y-1.5 max-w-xs">
              <p className="text-sm font-semibold text-foreground">Sube una foto del cultivo</p>
              <p className="text-xs text-muted-foreground">
                La IA analizará la imagen y llenará automáticamente los campos configurados
                como <Badge variant="outline" className="text-[9px] px-1.5 py-0 mx-0.5 border-violet-300 text-violet-600"><Sparkles className="w-2.5 h-2.5 mr-0.5 inline" />IA</Badge> en el formulario.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={iniciarAnalisis}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20"
              >
                <Upload className="w-4 h-4" />
                Subir foto (demo)
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 italic">
              Ejemplo MIPE: detectar plagas y enfermedades desde una foto
            </p>
          </div>
        )}

        {/* ── Fase: Uploading ── */}
        {fase === "uploading" && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Upload className="w-4.5 h-4.5 text-blue-500 animate-bounce" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Subiendo imagen...</span>
                  <span className="text-[10px] text-muted-foreground">{Math.min(progreso, 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Fase: Analyzing ── */}
        {fase === "analyzing" && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-violet-500/30">
                <img src={previewUrl} alt="Analyzing" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-violet-900/40 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 text-violet-300 animate-spin" />
                      <Sparkles className="w-4 h-4 text-violet-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-xs font-medium text-violet-100">Analizando con IA...</span>
                  </div>
                </div>
                {/* Scanning line effect */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80"
                  style={{
                    top: `${Math.min(progreso, 100)}%`,
                    transition: "top 60ms linear",
                    boxShadow: "0 0 8px 2px rgba(139, 92, 246, 0.4)",
                  }}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-violet-500 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Analizando imagen con IA...</span>
                  <span className="text-[10px] text-muted-foreground">{Math.min(progreso, 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Detectando plagas, enfermedades y estado del cultivo...</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Fase: Resultados ── */}
        {fase === "results" && (
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-emerald-500/30">
                <img src={previewUrl} alt="Analyzed" className="w-full h-32 object-cover opacity-80" />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1 shadow-lg">
                    <CheckCircle2 className="w-3 h-3" /> Análisis completo
                  </Badge>
                </div>
              </div>
            )}

            {/* Resultados header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold">Campos llenados por IA</span>
                <Badge variant="secondary" className="text-[9px] px-1.5">{resultados.length} campos</Badge>
              </div>
            </div>

            {/* Lista de campos detectados */}
            <div className="space-y-1.5">
              {resultados.map((campo, i) => (
                <div
                  key={campo.nombre}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-violet-500/30 transition-colors"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Icono tipo campo */}
                  <div className="mt-0.5 shrink-0">
                    {campo.editable ? (
                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {campo.nombre.replace(/_/g, " ")}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 py-0 ${
                          campo.editable
                            ? "border-amber-300 text-amber-600 dark:text-amber-400"
                            : "border-emerald-300 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {campo.editable ? "IA ✎ editable" : "IA solo lectura"}
                      </Badge>
                    </div>

                    {editandoIdx === i ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          defaultValue={campo.valor}
                          onBlur={e => {
                            const newResults = [...resultados];
                            newResults[i] = { ...campo, valor: e.target.value };
                            setResultados(newResults);
                            setEditandoIdx(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditandoIdx(null);
                          }}
                          className="flex-1 text-xs bg-background border border-violet-500/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                    ) : (
                      <p
                        className={`text-xs text-foreground ${campo.editable ? "cursor-pointer hover:text-violet-600" : ""}`}
                        onClick={() => campo.editable && setEditandoIdx(i)}
                      >
                        {campo.valor}
                        {campo.editable && <Pencil className="w-2.5 h-2.5 inline ml-1 text-muted-foreground" />}
                      </p>
                    )}
                  </div>

                  {/* Confianza */}
                  <div className="shrink-0 flex flex-col items-end gap-0.5 mt-0.5">
                    <span className={`text-[10px] font-bold ${confianzaColor(campo.confianza)}`}>
                      {campo.confianza}%
                    </span>
                    <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${confianzaBg(campo.confianza)}`}
                        style={{ width: `${campo.confianza}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Advertencia baja confianza */}
            {resultados.some(r => r.confianza < 80) && (
              <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2.5 py-2 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Algunos campos tienen confianza menor al 80%. Revisa los valores marcados como <strong>editables</strong> antes de guardar.
                </span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button variant="ghost" size="sm" className="text-xs" onClick={resetDemo}>
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                Subir otra foto
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Descartar
                </Button>
                <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmar y guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
