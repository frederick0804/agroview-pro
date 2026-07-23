import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/contexts/OfflineContext";

interface OfflineBannerProps {
  sidebarCollapsed: boolean;
  onOpenSync: () => void;
}

export function OfflineBanner({ sidebarCollapsed, onOpenSync }: OfflineBannerProps) {
  const { isOnline, pendientesCount, revisionCount } = useOffline();

  if (isOnline && pendientesCount === 0 && revisionCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-50 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64",
      )}
    >
      {!isOnline && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 text-white text-xs">
          <WifiOff className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
          <span className="font-medium">Sin conexión — trabajando en modo offline</span>
          {(pendientesCount > 0 || revisionCount > 0) && (
            <span className="text-slate-400">·</span>
          )}
          {pendientesCount > 0 && (
            <span className="flex items-center gap-1 text-amber-300">
              <RefreshCw className="w-3 h-3" />
              {pendientesCount} {pendientesCount === 1 ? "cambio pendiente" : "cambios pendientes"}
            </span>
          )}
          {revisionCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              {revisionCount} {revisionCount === 1 ? "requiere revisión" : "requieren revisión"}
            </span>
          )}
          <button
            onClick={onOpenSync}
            className="ml-auto text-slate-300 hover:text-white underline underline-offset-2 transition-colors"
          >
            Ver detalles
          </button>
        </div>
      )}

      {isOnline && revisionCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium">
            {revisionCount} {revisionCount === 1 ? "cambio requiere" : "cambios requieren"} tu atención
          </span>
          <button
            onClick={onOpenSync}
            className="ml-auto underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Revisar
          </button>
        </div>
      )}
    </div>
  );
}
