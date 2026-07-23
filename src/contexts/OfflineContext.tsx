import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type SyncEstado = "pendiente" | "reintentando" | "requiere_revision" | "confirmado";
export type SyncOperacion = "crear" | "editar" | "eliminar";
export type TipoConflicto = "datos" | "acceso_revocado" | "no_encontrado";

export interface CampoConflicto {
  campo: string;
  label: string;
  miValor: string | null;
  valorServidor: string | null;
  difiere: boolean;
}

export interface OutboxItem {
  id: string;
  mutationId: string;
  entidad: string;
  modulo: string;
  operacion: SyncOperacion;
  descripcion: string;
  estado: SyncEstado;
  timestamp: string;
  ultimoError?: string;
  tieneArchivos?: boolean;
  tipoConflicto?: TipoConflicto;
  camposConflicto?: CampoConflicto[];
  miModificadoEn?: string;
  servidorModificadoEn?: string;
  servidorModificadoPor?: string;
}

export interface CacheFormulario {
  id: string;
  nombre: string;
  tipo: string;
  disponibleOffline: boolean;
  requiereCifrado?: boolean;
  ultimaSync?: string;
  registros?: number;
}

export interface CacheModulo {
  modulo: string;
  label: string;
  disponible: boolean;
  ultimaSync?: string;
  registros: number;
  disponibleOffline: boolean;
  formularios?: CacheFormulario[];
}

interface OfflineState {
  isOnline: boolean;
  outbox: OutboxItem[];
  cacheModulos: CacheModulo[];
  setIsOnline: (v: boolean) => void;
  reintentar: (id: string) => void;
  descartar: (id: string) => void;
  resolverConflicto: (id: string, resolucion: "mia" | "servidor") => void;
  pendientesCount: number;
  revisionCount: number;
}

const OfflineContext = createContext<OfflineState | null>(null);

const OUTBOX_MOCK: OutboxItem[] = [
  {
    id: "1",
    mutationId: "m-001",
    entidad: "datos_registros",
    modulo: "Cultivos",
    operacion: "crear",
    descripcion: "Registro de riego — Bloque A Norte",
    estado: "pendiente",
    timestamp: "2026-07-23T08:14:00Z",
    tieneArchivos: true,
  },
  {
    id: "2",
    mutationId: "m-002",
    entidad: "datos_evento",
    modulo: "Cultivos",
    operacion: "crear",
    descripcion: "Evento de fertilización — Lote 3",
    estado: "reintentando",
    timestamp: "2026-07-23T08:20:00Z",
  },
  {
    id: "3",
    mutationId: "m-003",
    entidad: "datos_registros",
    modulo: "Cultivos",
    operacion: "editar",
    descripcion: "Aplicación de riego — Bloque C Sur",
    estado: "requiere_revision",
    timestamp: "2026-07-23T07:55:00Z",
    tipoConflicto: "datos",
    miModificadoEn: "2026-07-23T07:42:00Z",
    servidorModificadoEn: "2026-07-23T07:58:00Z",
    servidorModificadoPor: "Roberto Silva",
    ultimoError: "Conflicto: otro usuario modificó este registro mientras estabas sin conexión.",
    camposConflicto: [
      { campo: "cantidad_agua", label: "Cantidad de agua (L/ha)", miValor: "3500", valorServidor: "4200", difiere: true },
      { campo: "duracion_min", label: "Duración (min)", miValor: "90", valorServidor: "120", difiere: true },
      { campo: "operario", label: "Operario", miValor: "Juan Pérez", valorServidor: "Juan Pérez", difiere: false },
      { campo: "sector", label: "Sector", miValor: "Bloque C Sur", valorServidor: "Bloque C Sur", difiere: false },
      { campo: "observaciones", label: "Observaciones", miValor: "Riego normal, sin incidencias", valorServidor: "Se detectó presión baja en sector 3", difiere: true },
    ],
  },
  {
    id: "4",
    mutationId: "m-004",
    entidad: "datos_registros",
    modulo: "Laboratorio",
    operacion: "editar",
    descripcion: "Muestra de suelo — Sector B",
    estado: "requiere_revision",
    timestamp: "2026-07-23T07:30:00Z",
    tipoConflicto: "acceso_revocado",
    miModificadoEn: "2026-07-23T07:30:00Z",
    ultimoError: "403 — Ya no tienes acceso a este registro. Contacta a tu administrador.",
  },
  {
    id: "5",
    mutationId: "m-005",
    entidad: "datos_registros",
    modulo: "Inventario",
    operacion: "editar",
    descripcion: "Ajuste de stock — Herbicida Z",
    estado: "requiere_revision",
    timestamp: "2026-07-23T07:10:00Z",
    tipoConflicto: "no_encontrado",
    miModificadoEn: "2026-07-23T07:10:00Z",
    ultimoError: "Este registro ya no existe en el servidor.",
  },
];

const CACHE_MOCK: CacheModulo[] = [
  {
    modulo: "cultivos", label: "Cultivos", disponible: true,
    ultimaSync: "2026-07-23T06:00:00Z", registros: 142, disponibleOffline: true,
    formularios: [
      { id: "f1", nombre: "Estructura de Campo v2.0", tipo: "Estructura Campo", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 58 },
      { id: "f2", nombre: "Registro de Cosecha", tipo: "Fitosanitario", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 84 },
      { id: "f3", nombre: "Control de Plagas", tipo: "Fitosanitario", disponibleOffline: false },
    ],
  },
  {
    modulo: "inventario", label: "Inventario", disponible: true,
    ultimaSync: "2026-07-23T06:00:00Z", registros: 87, disponibleOffline: true,
    formularios: [
      { id: "f4", nombre: "Movimiento de insumos", tipo: "Inventario", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 87 },
    ],
  },
  {
    modulo: "laboratorio", label: "Laboratorio", disponible: true,
    ultimaSync: "2026-07-23T06:00:00Z", registros: 34, disponibleOffline: true,
    formularios: [
      { id: "f5", nombre: "Análisis de suelo", tipo: "Riego", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 21 },
      { id: "f6", nombre: "Control fitosanitario", tipo: "Fitosanitario", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 13 },
      { id: "f7", nombre: "Informe de residuos", tipo: "Comercial", disponibleOffline: false },
    ],
  },
  {
    modulo: "vivero", label: "Vivero", disponible: true,
    ultimaSync: "2026-07-23T06:00:00Z", registros: 21, disponibleOffline: true,
    formularios: [
      { id: "f8", nombre: "Registro de Propagación", tipo: "Fitosanitario", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 14 },
      { id: "f9", nombre: "Control Fitosanitario Vivero", tipo: "Fitosanitario", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 7 },
      { id: "f10", nombre: "Plan de Riego Vivero", tipo: "Riego", disponibleOffline: false },
    ],
  },
  {
    modulo: "poscosecha", label: "Poscosecha", disponible: false,
    registros: 0, disponibleOffline: false,
    formularios: [
      { id: "f11", nombre: "Control de cámara fría", tipo: "Estructura Campo", disponibleOffline: false },
      { id: "f12", nombre: "Registro de empaque", tipo: "Estructura Campo", disponibleOffline: false },
    ],
  },
  {
    modulo: "comercial", label: "Comercial", disponible: false,
    registros: 0, disponibleOffline: false,
    formularios: [
      { id: "f13", nombre: "Orden de venta", tipo: "Comercial", disponibleOffline: false, requiereCifrado: true },
      { id: "f14", nombre: "Cotización cliente", tipo: "Comercial", disponibleOffline: false, requiereCifrado: true },
    ],
  },
  {
    modulo: "rrhh", label: "RR.HH.", disponible: false,
    registros: 0, disponibleOffline: false,
    formularios: [
      { id: "f15", nombre: "Ficha de empleado", tipo: "RR.HH.", disponibleOffline: false, requiereCifrado: true },
      { id: "f16", nombre: "Registro de horas", tipo: "RR.HH.", disponibleOffline: false },
    ],
  },
  {
    modulo: "informes", label: "Informes generados", disponible: true,
    ultimaSync: "2026-07-23T06:00:00Z", registros: 5, disponibleOffline: true,
    formularios: [
      { id: "f17", nombre: "Informes recientes", tipo: "Informe", disponibleOffline: true, ultimaSync: "2026-07-23T06:00:00Z", registros: 5 },
    ],
  },
];

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>(OUTBOX_MOCK);

  const reintentar = useCallback((id: string) => {
    setOutbox((prev) =>
      prev.map((item) => item.id === id ? { ...item, estado: "reintentando", ultimoError: undefined } : item)
    );
  }, []);

  const descartar = useCallback((id: string) => {
    setOutbox((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resolverConflicto = useCallback((id: string, resolucion: "mia" | "servidor") => {
    if (resolucion === "mia") {
      setOutbox((prev) =>
        prev.map((item) => item.id === id ? { ...item, estado: "reintentando", tipoConflicto: undefined, camposConflicto: undefined, ultimoError: undefined } : item)
      );
    } else {
      setOutbox((prev) => prev.filter((item) => item.id !== id));
    }
  }, []);

  const pendientesCount = outbox.filter((i) => i.estado === "pendiente" || i.estado === "reintentando").length;
  const revisionCount = outbox.filter((i) => i.estado === "requiere_revision").length;

  return (
    <OfflineContext.Provider value={{
      isOnline, setIsOnline,
      outbox, cacheModulos: CACHE_MOCK,
      reintentar, descartar, resolverConflicto,
      pendientesCount, revisionCount,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
