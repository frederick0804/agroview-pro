import { Fragment, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Trash2,
  Database, WifiOff, Wifi, Clock, FileText, Package, FlaskConical,
  Sprout, Warehouse, BarChart3, Plus, Pencil, X, ChevronRight, Info,
  ChevronDown, ShieldCheck,
} from "lucide-react";
import { useOffline, type OutboxItem, type CacheModulo } from "@/contexts/OfflineContext";
import { ConflictDialog } from "./ConflictDialog";

const MODULO_ICON: Record<string, React.ElementType> = {
  cultivos: Sprout,
  inventario: Warehouse,
  laboratorio: FlaskConical,
  vivero: Sprout,
  poscosecha: Package,
  comercial: BarChart3,
  rrhh: FileText,
  informes: BarChart3,
};

const OP_ICON: Record<string, React.ElementType> = {
  crear: Plus,
  editar: Pencil,
  eliminar: X,
};

const OP_COLOR: Record<string, string> = {
  crear: "text-emerald-600 bg-emerald-50",
  editar: "text-blue-600 bg-blue-50",
  eliminar: "text-rose-600 bg-rose-50",
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

interface OutboxRowProps {
  item: OutboxItem;
  onReintentar: (id: string) => void;
  onOpenConflict: (item: OutboxItem) => void;
}

function OutboxRow({ item, onReintentar, onOpenConflict }: OutboxRowProps) {
  const { descartar } = useOffline();
  const OpIcon = OP_ICON[item.operacion] ?? Plus;
  const isRevision = item.estado === "requiere_revision";
  const isReintentando = item.estado === "reintentando";
  const tipo = item.tipoConflicto;
  const isDatosConflict = isRevision && tipo === "datos";
  const isSimpleConflict = isRevision && (tipo === "acceso_revocado" || tipo === "no_encontrado");

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2",
        isRevision ? "border-rose-200 bg-rose-50/40" : "border-border bg-card",
        isDatosConflict && "cursor-pointer hover:bg-rose-50/70 transition-colors",
      )}
      onClick={isDatosConflict ? () => onOpenConflict(item) : undefined}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 mt-0.5", OP_COLOR[item.operacion])}>
          <OpIcon className="w-3 h-3" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{item.descripcion}</p>
          <p className="text-[10px] text-muted-foreground">{item.modulo} · {formatRelative(item.timestamp)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {item.tieneArchivos && (
            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">
              foto
            </span>
          )}
          {isReintentando && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600">
              <RefreshCw className="w-3 h-3 animate-spin" /> reintentando
            </span>
          )}
          {item.estado === "pendiente" && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> pendiente
            </span>
          )}
          {isRevision && (
            isDatosConflict
              ? <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
              : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>
      </div>

      {isRevision && item.ultimoError && (
        <p className="text-[10px] text-rose-600 bg-rose-50 rounded-lg px-2.5 py-1.5 border border-rose-200 leading-snug">
          {item.ultimoError}
        </p>
      )}

      {isDatosConflict && (
        <p className="text-[10px] text-rose-500 font-medium">Tocá para resolver el conflicto →</p>
      )}

      {isSimpleConflict && (
        <div className="flex items-center justify-between">
          <button
            className="text-[11px] text-rose-500 underline underline-offset-2 hover:text-rose-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); onOpenConflict(item); }}
          >
            Ver detalle
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px] px-2 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-100/60"
            onClick={(e) => { e.stopPropagation(); descartar(item.id); }}
          >
            <Trash2 className="w-3 h-3" /> Descartar
          </Button>
        </div>
      )}

      {isRevision && !tipo && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 gap-1.5"
            onClick={(e) => { e.stopPropagation(); onReintentar(item.id); }}
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

interface CacheRowProps {
  m: CacheModulo;
}

function CacheRow({ m }: CacheRowProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = MODULO_ICON[m.modulo] ?? Database;
  const formularios = m.formularios ?? [];
  const offlineCount = formularios.filter(f => f.disponibleOffline).length;
  const totalCount = formularios.length;

  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 transition-colors px-1 rounded-lg"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={cn("p-1.5 rounded-lg flex-shrink-0", m.disponibleOffline ? "bg-emerald-50" : "bg-muted")}>
          <Icon className={cn("w-3.5 h-3.5", m.disponibleOffline ? "text-emerald-600" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{m.label}</p>
          <p className="text-[10px] text-muted-foreground">
            {m.disponibleOffline && m.ultimaSync
              ? `${offlineCount}/${totalCount} formularios offline · sync ${formatRelative(m.ultimaSync)}`
              : `${offlineCount}/${totalCount} formularios offline`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {m.disponibleOffline
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && formularios.length > 0 && (
        <div className="ml-8 mb-2 space-y-0.5">
          {formularios.map(f => (
            <div key={f.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className={cn("text-[11px] font-medium truncate", !f.disponibleOffline && "text-muted-foreground")}>
                  {f.nombre}
                </p>
                {f.disponibleOffline && f.ultimaSync && (
                  <p className="text-[10px] text-muted-foreground">
                    {f.registros} registros · {formatRelative(f.ultimaSync)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {f.requiereCifrado && f.disponibleOffline && (
                  <ShieldCheck className="w-3 h-3 text-violet-500" title="Datos cifrados" />
                )}
                {f.disponibleOffline
                  ? <Wifi className="w-3 h-3 text-emerald-500" />
                  : <WifiOff className="w-3 h-3 text-muted-foreground/50" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SyncPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SyncPanel({ open, onOpenChange }: SyncPanelProps) {
  const { isOnline, setIsOnline, outbox, cacheModulos, reintentar, pendientesCount, revisionCount } = useOffline();
  const [conflictItem, setConflictItem] = useState<OutboxItem | null>(null);

  const pendientes = outbox.filter((i) => i.estado === "pendiente" || i.estado === "reintentando");
  const revision = outbox.filter((i) => i.estado === "requiere_revision");

  return (
    <Fragment>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col overflow-hidden p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-primary" />
                Sincronización y datos offline
              </SheetTitle>
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                  isOnline
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-100 border-slate-200 text-slate-600",
                )}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? "Online" : "Offline"} · simular
              </button>
            </div>
            <SheetDescription className="text-[11px]">
              {isOnline
                ? pendientesCount > 0 || revisionCount > 0
                  ? `Sincronizando — ${pendientesCount} pendientes, ${revisionCount} requieren revisión`
                  : "Todo sincronizado"
                : `Sin conexión · ${pendientesCount + revisionCount} cambios en espera`}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="pendientes" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-4 mb-2 grid grid-cols-3 h-8">
              <TabsTrigger value="pendientes" className="text-xs relative">
                Pendientes
                {pendientesCount > 0 && (
                  <span className="ml-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                    {pendientesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="revision" className="text-xs relative">
                Revisión
                {revisionCount > 0 && (
                  <span className="ml-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                    {revisionCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cache" className="text-xs">Cache</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <TabsContent value="pendientes" className="mt-3 space-y-2">
                {pendientes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <p className="text-xs font-medium text-muted-foreground">Sin cambios pendientes</p>
                    <p className="text-[10px] text-muted-foreground">Todo está sincronizado con el servidor</p>
                  </div>
                ) : (
                  pendientes.map((item) => (
                    <OutboxRow key={item.id} item={item} onReintentar={reintentar} onOpenConflict={setConflictItem} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="revision" className="mt-3 space-y-2">
                {revision.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <p className="text-xs font-medium text-muted-foreground">Sin conflictos</p>
                    <p className="text-[10px] text-muted-foreground">No hay cambios que requieran tu atención</p>
                  </div>
                ) : (
                  revision.map((item) => (
                    <OutboxRow key={item.id} item={item} onReintentar={reintentar} onOpenConflict={setConflictItem} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="cache" className="mt-3">
                <div className="rounded-xl border border-border bg-card px-3">
                  {cacheModulos.map((m) => (
                    <CacheRow key={m.modulo} m={m} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 px-1">
                  El cache se actualiza automáticamente al conectarse. Los datos marcados como disponibles offline se pueden consultar sin red.
                </p>
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConflictDialog
        item={conflictItem}
        open={conflictItem !== null}
        onClose={() => setConflictItem(null)}
      />
    </Fragment>
  );
}
