// ─── ConfigContext ─────────────────────────────────────────────────────────────
// Estado compartido del sistema V3 — alineado al ERD:
//   parametrosLib  →  tabla Parametros (biblioteca global)
//   definiciones   →  tabla Definicion_registro
//   parametros     →  tabla Campos_configurados (campos de cada definición)
//   datos          →  tabla Datos_registro

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  DEFINICIONES, PARAMETROS, DATOS_DEMO, PARAMETROS_LIBRARY,
  type ModDef, type ModParam, type ModDato, type Parametro, type TipoDato, type EstadoDef,
} from "@/config/moduleDefinitions";

// ─── Tipos del contexto ───────────────────────────────────────────────────────

interface ConfigContextType {
  // ── Biblioteca global de parámetros (Parametros) ──
  parametrosLib: Parametro[];
  addParamLib:   (p?: Partial<Parametro>) => Parametro;
  updParamLib:   (id: string, key: keyof Parametro, value: unknown) => void;
  delParamLib:   (id: string) => void;

  // ── Definiciones (Definicion_registro) ──
  definiciones: ModDef[];
  addDef:  () => void;
  updDef:  (rowIndex: number, key: keyof ModDef, value: unknown) => void;
  delDef:  (rowIndex: number) => void;

  // ── Campos (Campos_configurados) ──
  parametros:   ModParam[];
  addPar:       (defId: string, parametroId?: string, nombre?: string) => void;
  updParByIdx:  (absIdx: number, key: keyof ModParam, value: unknown) => void;
  delParByIdx:  (absIdx: number) => void;

  // ── Datos (Datos_registro) ──
  datos:   ModDato[];
  addDato: (defId: string) => ModDato;
  updDato: (id: string, updated: ModDato) => void;
  delDato: (id: string) => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [parametrosLib, setParametrosLib] = useState<Parametro[]>(PARAMETROS_LIBRARY);
  const [definiciones,  setDefiniciones]  = useState<ModDef[]>(DEFINICIONES);
  const [parametros,    setParametros]    = useState<ModParam[]>(PARAMETROS);
  const [datos,         setDatos]         = useState<ModDato[]>(DATOS_DEMO);

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

  const addDef = () =>
    setDefiniciones(prev => [...prev, {
      id:           String(Date.now()),
      tipo:         "personalizado" as const,
      nombre:       "",
      descripcion:  "",
      version:      "1.0",
      nivel_minimo: 2,
      modulo:       "cultivo",
      estado:       "borrador" as EstadoDef,
    }]);

  const updDef = (i: number, k: keyof ModDef, v: unknown) =>
    setDefiniciones(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: v };
      return next;
    });

  const delDef = (i: number) => {
    const defId = definiciones[i]?.id;
    setDefiniciones(prev => prev.filter((_, j) => j !== i));
    if (defId) {
      setParametros(prev => prev.filter(p => p.definicion_id !== defId));
      setDatos(prev => prev.filter(d => d.definicion_id !== defId));
    }
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

  const updParByIdx = (i: number, k: keyof ModParam, v: unknown) =>
    setParametros(prev => {
      const next = [...prev];
      // Si se actualiza el nombre, intentar sincronizar tipo_dato desde la biblioteca
      if (k === "nombre") {
        const libParam = parametrosLib.find(p => p.nombre === String(v));
        next[i] = {
          ...next[i],
          nombre:    String(v),
          tipo_dato: libParam?.tipo_dato ?? next[i].tipo_dato,
        };
      } else {
        next[i] = { ...next[i], [k]: v };
      }
      return next;
    });

  const delParByIdx = (i: number) =>
    setParametros(prev => prev.filter((_, j) => j !== i));

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

  return (
    <ConfigContext.Provider value={{
      parametrosLib, addParamLib, updParamLib, delParamLib,
      definiciones,  addDef,      updDef,      delDef,
      parametros,    addPar,      updParByIdx, delParByIdx,
      datos,         addDato,     updDato,     delDato,
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
