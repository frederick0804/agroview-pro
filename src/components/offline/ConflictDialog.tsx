import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldX, SearchX, Check, Clock } from "lucide-react";
import { type OutboxItem } from "@/contexts/OfflineContext";
import { useOffline } from "@/contexts/OfflineContext";

interface ConflictDialogProps {
  item: OutboxItem | null;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ConflictoDatos({ item, onClose }: { item: OutboxItem; onClose: () => void }) {
  const { resolverConflicto } = useOffline();
  const campos = item.camposConflicto ?? [];
  const camposDiferentes = campos.filter((c) => c.difiere);
  const camposIguales = campos.filter((c) => !c.difiere);

  return (
    <>
      <DialogHeader className="pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </span>
          <DialogTitle className="text-sm">Conflicto de datos</DialogTitle>
        </div>
        <DialogDescription className="text-xs leading-relaxed">
          Otro usuario modificó este registro mientras estabas sin conexión. Revisá las diferencias y elegí qué versión conservar.
        </DialogDescription>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">{item.descripcion}</p>
      </DialogHeader>

      {/* Timestamps */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wide font-semibold text-amber-600">Tu versión</span>
          <span className="text-[11px] text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {item.miModificadoEn ? formatDateTime(item.miModificadoEn) : "—"}
          </span>
          <span className="text-[10px] text-amber-600">Tú (offline)</span>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wide font-semibold text-blue-600">Versión del servidor</span>
          <span className="text-[11px] text-blue-800 flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {item.servidorModificadoEn ? formatDateTime(item.servidorModificadoEn) : "—"}
          </span>
          <span className="text-[10px] text-blue-600">{item.servidorModificadoPor ?? "Otro usuario"}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 px-3 py-2 border-b border-border">
          <span>Campo</span>
          <span className="text-center">Mi versión</span>
          <span className="text-center">Versión actual</span>
        </div>
        <div className="divide-y divide-border/60 max-h-44 overflow-y-auto">
          {camposDiferentes.map((c) => (
            <div key={c.campo} className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2.5 bg-amber-50/40 items-start">
              <span className="text-[11px] font-medium text-foreground leading-snug">{c.label}</span>
              <span className="text-[11px] text-center text-amber-700 font-semibold bg-amber-100 rounded px-1.5 py-0.5 leading-snug">{c.miValor ?? "—"}</span>
              <span className="text-[11px] text-center text-blue-700 font-semibold bg-blue-100 rounded px-1.5 py-0.5 leading-snug">{c.valorServidor ?? "—"}</span>
            </div>
          ))}
          {camposIguales.map((c) => (
            <div key={c.campo} className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 items-center">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <span className="col-span-2 text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                {c.miValor ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
          <p className="font-semibold mb-0.5">Usar la mía</p>
          <p className="text-amber-700 leading-snug">Tus cambios reemplazan los del servidor. Los datos del servidor se pierden.</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-blue-800">
          <p className="font-semibold mb-0.5">Usar la del servidor</p>
          <p className="text-blue-700 leading-snug">Los cambios del servidor se mantienen. Tus ediciones se descartan.</p>
        </div>
      </div>

      <DialogFooter className="mt-4 flex-row gap-2 sm:flex-row">
        <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={onClose}>
          Decidir más tarde
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => { resolverConflicto(item.id, "servidor"); onClose(); }}
        >
          Usar la del servidor
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => { resolverConflicto(item.id, "mia"); onClose(); }}
        >
          Usar la mía
        </Button>
      </DialogFooter>
    </>
  );
}

function ConflictoAccesoRevocado({ item, onClose }: { item: OutboxItem; onClose: () => void }) {
  const { descartar } = useOffline();
  return (
    <>
      <DialogHeader className="pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-rose-50 border border-rose-200">
            <ShieldX className="w-4 h-4 text-rose-600" />
          </span>
          <DialogTitle className="text-sm">Acceso revocado</DialogTitle>
        </div>
        <DialogDescription className="text-xs leading-relaxed">
          Ya no tenés permiso para modificar este registro. Es posible que tu rol haya cambiado o que el registro haya sido reasignado.
        </DialogDescription>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">{item.descripcion}</p>
      </DialogHeader>

      {item.miModificadoEn && (
        <div className="mt-3 rounded-lg bg-muted/50 border border-border px-3 py-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground">Modificado offline el </span>
            <span className="text-[11px] font-medium">{formatDateTime(item.miModificadoEn)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs text-rose-700 leading-relaxed">
        Tus cambios locales no pudieron enviarse al servidor. Contactá a tu administrador si creés que esto es un error.
      </div>

      <DialogFooter className="mt-4">
        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="text-xs h-8"
          onClick={() => { descartar(item.id); onClose(); }}
        >
          Descartar cambios
        </Button>
      </DialogFooter>
    </>
  );
}

function ConflictoNoEncontrado({ item, onClose }: { item: OutboxItem; onClose: () => void }) {
  const { descartar } = useOffline();
  return (
    <>
      <DialogHeader className="pb-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <SearchX className="w-4 h-4 text-slate-500" />
          </span>
          <DialogTitle className="text-sm">Registro no encontrado</DialogTitle>
        </div>
        <DialogDescription className="text-xs leading-relaxed">
          El registro que intentaste editar ya no existe en el servidor. Es posible que otro usuario lo haya eliminado.
        </DialogDescription>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">{item.descripcion}</p>
      </DialogHeader>

      {item.miModificadoEn && (
        <div className="mt-3 rounded-lg bg-muted/50 border border-border px-3 py-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground">Modificado offline el </span>
            <span className="text-[11px] font-medium">{formatDateTime(item.miModificadoEn)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
        No es posible sincronizar estos cambios porque el destino ya no existe. Podés descartar los cambios o contactar a tu administrador.
      </div>

      <DialogFooter className="mt-4">
        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => { descartar(item.id); onClose(); }}
        >
          Descartar cambios
        </Button>
      </DialogFooter>
    </>
  );
}

export function ConflictDialog({ item, open, onClose }: ConflictDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {item.tipoConflicto === "datos" && <ConflictoDatos item={item} onClose={onClose} />}
        {item.tipoConflicto === "acceso_revocado" && <ConflictoAccesoRevocado item={item} onClose={onClose} />}
        {item.tipoConflicto === "no_encontrado" && <ConflictoNoEncontrado item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
