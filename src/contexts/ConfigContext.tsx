// ─── ConfigContext ─────────────────────────────────────────────────────────────
// Estado compartido del sistema V3 — alineado al ERD:
//   parametrosLib  →  tabla Parametros (biblioteca global)
//   definiciones   →  tabla Definicion_registro
//   parametros     →  tabla Campos_configurados (campos de cada definición)
//   datos          →  tabla Datos_registro

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import {
  DEFINICIONES, PARAMETROS, DATOS_DEMO, PARAMETROS_LIBRARY, CULTIVOS, VARIEDADES, SNAPSHOTS_DEMO,
  type ModDef, type ModParam, type ModDato, type Parametro, type TipoDato, type EstadoDef,
  type Cultivo, type Variedad, type DefSnapshot,
} from "@/config/moduleDefinitions";
import { useRole } from "@/contexts/RoleContext";

// ─── Tipos del contexto ───────────────────────────────────────────────────────

interface ConfigContextType {
  // ── Biblioteca global de parámetros (Parametros) ──
  parametrosLib: Parametro[];
  addParamLib:   (p?: Partial<Parametro>) => Parametro;
  updParamLib:   (id: string, key: keyof Parametro, value: unknown) => void;
  delParamLib:   (id: string) => void;

  // ── Definiciones (Definicion_registro) ──
  definiciones: ModDef[];
  addDef:  (cultivoId?: string) => void;
  updDef:  (rowIndex: number, key: keyof ModDef, value: unknown) => void;
  delDef:  (rowIndex: number) => void;

  // ── Campos (Campos_configurados) ──
  parametros:   ModParam[];
  addPar:       (defId: string, parametroId?: string, nombre?: string) => void;
  updParByIdx:  (absIdx: number, key: keyof ModParam, value: unknown) => void;
  updParFull:   (id: string, updated: Partial<ModParam>) => void;
  delParByIdx:  (absIdx: number) => void;

  // ── Datos (Datos_registro) ──
  datos:   ModDato[];
  addDato: (defId: string) => ModDato;
  updDato: (id: string, updated: ModDato) => void;
  delDato: (id: string) => void;

  // ── Cultivos ──
  cultivos:    Cultivo[];
  addCultivo:  (partial?: Partial<Cultivo>) => void;
  updCultivo:  (id: string, key: keyof Cultivo, value: unknown) => void;
  delCultivo:  (id: string) => void;

  // ── Variedades (CAT_VARIEDADES) ──
  variedades:  Variedad[];
  addVariedad: (cultivoId: string) => void;
  updVariedad: (id: string, key: keyof Variedad, value: unknown) => void;
  delVariedad: (id: string) => void;

  // ── Historial de versiones (Snapshots) ──
  snapshots:       DefSnapshot[];
  getDefSnapshots: (defId: string) => DefSnapshot[];
  createSnapshot:  (defId: string, cambio: string) => void;

  // ── Bloqueo de navegación ──
  hasPendingChanges: boolean;
  setHasPendingChanges: (v: boolean) => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { currentClienteId } = useRole();

  const [parametrosLib, setParametrosLib] = useState<Parametro[]>(PARAMETROS_LIBRARY);
  const [allDefiniciones,  setDefiniciones]  = useState<ModDef[]>(DEFINICIONES);
  const [allParametros,    setParametros]    = useState<ModParam[]>(PARAMETROS);
  const [allDatos,         setDatos]         = useState<ModDato[]>(DATOS_DEMO);
  const [cultivos,      setCultivos]      = useState<Cultivo[]>(CULTIVOS);
  const [variedades,    setVariedades]    = useState<Variedad[]>(VARIEDADES);
  const [snapshots,     setSnapshots]     = useState<DefSnapshot[]>(SNAPSHOTS_DEMO);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // ── Filtrado multi-tenant ────────────────────────────────────────────────
  // super_admin (sin clienteId) ve todo; los demás ven solo su empresa
  const definiciones = useMemo(() => {
    if (!currentClienteId) return allDefiniciones;
    return allDefiniciones.filter(d => !d.cliente_id || d.cliente_id === currentClienteId);
  }, [allDefiniciones, currentClienteId]);

  const visibleDefIds = useMemo(() => new Set(definiciones.map(d => d.id)), [definiciones]);

  const parametros = useMemo(() => {
    if (!currentClienteId) return allParametros;
    return allParametros.filter(p => visibleDefIds.has(p.definicion_id));
  }, [allParametros, currentClienteId, visibleDefIds]);

  const datos = useMemo(() => {
    if (!currentClienteId) return allDatos;
    return allDatos.filter(d => visibleDefIds.has(d.definicion_id));
  }, [allDatos, currentClienteId, visibleDefIds]);

  // ── Biblioteca global ──────────────────────────────────────────────────────

  const addParamLib = (partial?: Partial<Parametro>): Parametro => {
    const newParam: Parametro = {
      id:                  `p-${Date.now()}`,
      nombre:              partial?.nombre              ?? "",
      codigo:              partial?.codigo              ?? "",
      tipo_dato:           partial?.tipo_dato           ?? "Texto",
      unidad_medida:       partial?.unidad_medida       ?? "",
      descripcion:         partial?.descripcion         ?? "",
      obligatorio_default: partial?.obligatorio_default ?? false,
      activo:              true,
    };
    setParametrosLib(prev => [...prev, newParam]);
    return newParam;
  };

  const updParamLib = (id: string, k: keyof Parametro, v: unknown) =>
    setParametrosLib(prev => prev.map(p => p.id === id ? { ...p, [k]: v } : p));

  const delParamLib = (id: string) => {
    setParametrosLib(prev => prev.filter(p => p.id !== id));
    // No cascada: los campos que referencian este param mantienen su nombre desnormalizado
  };

  // ── Definiciones ──────────────────────────────────────────────────────────

  const addDef = (cultivoId?: string) =>
    setDefiniciones(prev => [...prev, {
      id:           String(Date.now()),
      tipo:         "personalizado" as const,
      nombre:       "",
      descripcion:  "",
      version:      "1.0",
      nivel_minimo: 2,
      modulo:       "cultivo",
      estado:       "borrador" as EstadoDef,
      cultivo_id:   cultivoId,
      cliente_id:   currentClienteId,
    }]);

  const updDef = (i: number, k: keyof ModDef, v: unknown) => {
    const def = definiciones[i];
    if (!def) return;
    setDefiniciones(prev => prev.map(d =>
      d.id === def.id
        ? { ...d, [k]: v, updated_at: new Date().toISOString(), updated_by: "Admin" }
        : d
    ));
  };

  const delDef = (i: number) => {
    const def = definiciones[i];
    if (!def) return;
    setDefiniciones(prev => prev.filter(d => d.id !== def.id));
    setParametros(prev => prev.filter(p => p.definicion_id !== def.id));
    setDatos(prev => prev.filter(d => d.definicion_id !== def.id));
  };

  // ── Campos (Campos_configurados) ──────────────────────────────────────────

  const addPar = (defId: string, parametroId = "", nombre = "") => {
    const count = parametros.filter(p => p.definicion_id === defId).length;
    // Si se pasó un parametro_id, buscar el tipo_dato en la biblioteca
    const libParam = parametroId ? parametrosLib.find(p => p.id === parametroId) : undefined;
    setParametros(prev => [...prev, {
      id:            String(Date.now()),
      definicion_id: defId,
      parametro_id:  parametroId,
      nombre:        nombre || libParam?.nombre || "",
      tipo_dato:     libParam?.tipo_dato ?? ("Texto" as TipoDato),
      obligatorio:   libParam?.obligatorio_default ?? false,
      orden:         count + 1,
    }]);
  };

  const updParByIdx = (i: number, k: keyof ModParam, v: unknown) => {
    const par = parametros[i];
    if (!par) return;
    setParametros(prev => prev.map(p => {
      if (p.id !== par.id) return p;
      if (k === "nombre") {
        const libParam = parametrosLib.find(lp => lp.nombre === String(v));
        return { ...p, nombre: String(v), tipo_dato: libParam?.tipo_dato ?? p.tipo_dato };
      }
      return { ...p, [k]: v };
    }));
  };

  const delParByIdx = (i: number) => {
    const par = parametros[i];
    if (!par) return;
    setParametros(prev => prev.filter(p => p.id !== par.id));
  };

  const updParFull = (id: string, updated: Partial<ModParam>) =>
    setParametros(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));

  // ── Datos ─────────────────────────────────────────────────────────────────

  const addDato = (defId: string): ModDato => {
    const params = parametros.filter(p => p.definicion_id === defId);
    const emptyVals: Record<string, string> = {};
    params.forEach(p => { emptyVals[p.nombre] = ""; });
    const newDato: ModDato = {
      id:            String(Date.now()),
      definicion_id: defId,
      referencia:    "",
      fecha:         new Date().toISOString().split("T")[0],
      valores:       JSON.stringify(emptyVals),
    };
    setDatos(prev => [...prev, newDato]);
    return newDato;
  };

  const updDato = (id: string, updated: ModDato) =>
    setDatos(prev => prev.map(d => d.id === id ? updated : d));

  const delDato = (id: string) =>
    setDatos(prev => prev.filter(d => d.id !== id));

  // ── Cultivos ────────────────────────────────────────────────────────────────

  const addCultivo = (partial?: Partial<Cultivo>) =>
    setCultivos(prev => [...prev, {
      id:          `c-${Date.now()}`,
      nombre:      partial?.nombre      ?? "",
      codigo:      partial?.codigo      ?? "",
      descripcion: partial?.descripcion ?? "",
      activo:      true,
    }]);

  const updCultivo = (id: string, k: keyof Cultivo, v: unknown) =>
    setCultivos(prev => prev.map(c => c.id === id ? { ...c, [k]: v } : c));

  const delCultivo = (id: string) => {
    setCultivos(prev => prev.filter(c => c.id !== id));
    setVariedades(prev => prev.filter(v => v.cultivo_id !== id));
  };

  // ── Variedades ──────────────────────────────────────────────────────────────

  const addVariedad = (cultivoId: string) =>
    setVariedades(prev => [...prev, {
      id:          `v-${Date.now()}`,
      cultivo_id:  cultivoId,
      nombre:      "",
      codigo:      "",
      descripcion: "",
      activo:      true,
    }]);

  const updVariedad = (id: string, k: keyof Variedad, v: unknown) =>
    setVariedades(prev => prev.map(v2 => v2.id === id ? { ...v2, [k]: v } : v2));

  const delVariedad = (id: string) =>
    setVariedades(prev => prev.filter(v => v.id !== id));

  // ── Snapshots (historial de versiones) ───────────────────────────────────

  const getDefSnapshots = (defId: string): DefSnapshot[] =>
    snapshots.filter(s => s.definicion_id === defId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const createSnapshot = (defId: string, cambio: string) => {
    const def = definiciones.find(d => d.id === defId);
    if (!def) return;
    const campos = parametros.filter(p => p.definicion_id === defId).sort((a, b) => a.orden - b.orden);
    const snap: DefSnapshot = {
      id:            `snap-${Date.now()}`,
      definicion_id: defId,
      version:       def.version,
      timestamp:     new Date().toISOString(),
      usuario:       def.updated_by ?? "Admin",
      cambio,
      definicion:    { id: def.id, tipo: def.tipo, nombre: def.nombre, descripcion: def.descripcion, version: def.version, nivel_minimo: def.nivel_minimo, modulo: def.modulo, estado: def.estado, cultivo_id: def.cultivo_id, cliente_id: def.cliente_id },
      campos:        campos.map(c => ({ ...c })),
    };
    setSnapshots(prev => [...prev, snap]);
  };

  return (
    <ConfigContext.Provider value={{
      parametrosLib, addParamLib, updParamLib, delParamLib,
      definiciones,  addDef,      updDef,      delDef,
      parametros,    addPar,      updParByIdx, updParFull, delParByIdx,
      datos,         addDato,     updDato,     delDato,
      cultivos,      addCultivo,  updCultivo,  delCultivo,
      variedades,    addVariedad, updVariedad, delVariedad,
      snapshots,     getDefSnapshots, createSnapshot,
      hasPendingChanges, setHasPendingChanges,
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useConfig = (): ConfigContextType => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within <ConfigProvider>");
  return ctx;
};
