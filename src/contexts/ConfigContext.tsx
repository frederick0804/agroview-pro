// ─── ConfigContext ─────────────────────────────────────────────────────────────
// Estado compartido del sistema V3 — alineado al ERD:
//   parametrosLib  →  tabla Parametros (biblioteca global)
//   definiciones   →  tabla Definicion_registro
//   parametros     →  tabla Campos_configurados (campos de cada definición)
//   datos          →  tabla Datos_registro

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import {
  DEFINICIONES, PARAMETROS, DATOS_DEMO, PARAMETROS_LIBRARY, CULTIVOS, VARIEDADES, SNAPSHOTS_DEMO,
  ACCESOS_DEFINICION_DEMO,
  type ModDef, type ModParam, type ModDato, type Parametro, type TipoDato, type TipoConfig, type EstadoDef,
  type Cultivo, type Variedad, type DefSnapshot, type DefinicionAccesoUsuario,
} from "@/config/moduleDefinitions";
import { useRole, ROLE_LEVELS } from "@/contexts/RoleContext";

// ─── Tipos del contexto ───────────────────────────────────────────────────────

interface AddDefInput {
  cultivoId?: string;
  modulo?: string;
  clienteIdOverride?: number;
  productorIdOverride?: number;
  tipo?: TipoConfig;
  nombre?: string;
  descripcion?: string;
  version?: string;
  estado?: EstadoDef;
  nivel_minimo?: number;
  roles_excluidos?: string[];
}

interface ConfigContextType {
  // ── Biblioteca global de parámetros (Parametros) ──
  parametrosLib: Parametro[];
  addParamLib: (p?: Partial<Parametro>) => Parametro;
  updParamLib: (id: string, key: keyof Parametro, value: unknown) => void;
  delParamLib: (id: string) => void;

  // ── Definiciones (Definicion_registro) ──
  definiciones: ModDef[];
  allDefiniciones: ModDef[];                                           // sin filtro (solo super_admin)
  addDef: (input?: AddDefInput) => ModDef;
  addEvento: (registroDefId: string, modulo: string, nombre?: string, descripcion?: string, estado?: EstadoDef) => ModDef;
  updDef: (rowIndex: number, key: keyof ModDef, value: unknown) => void;
  delDef: (rowIndex: number) => void;
  dupDef: (id: string, nombre?: string) => void;
  copyDefToClient: (sourceDefId: string, targetClienteId: number) => void;

  // ── Campos (Campos_configurados) ──
  parametros: ModParam[];
  addPar: (defId: string, parametroId: string, nombre?: string) => void;
  updParByIdx: (absIdx: number, key: keyof ModParam, value: unknown) => void;
  updParFull: (id: string, updated: Partial<ModParam>) => void;
  delParByIdx: (absIdx: number) => void;

  // ── Datos (Datos_registro) ──
  datos: ModDato[];
  addDato: (defId: string, cultivoId?: string, registroPadreDatoId?: string) => ModDato;
  updDato: (id: string, updated: ModDato) => void;
  delDato: (id: string) => void;

  // ── Cultivos ──
  cultivos: Cultivo[];                                  // filtrados por cliente/productor activo
  allCultivos: Cultivo[];                                  // sin filtro (solo super_admin los ve todos)
  addCultivo: (partial?: Partial<Cultivo>) => void;
  updCultivo: (id: string, key: keyof Cultivo, value: unknown) => void;
  updCultivoClientes: (id: string, clienteIds: number[]) => void;
  updCultivoProductores: (id: string, productorIds: number[]) => void;
  delCultivo: (id: string) => void;

  // ── Variedades (CAT_VARIEDADES) ──
  variedades: Variedad[];                                  // filtradas por cliente activo
  allVariedades: Variedad[];                                  // sin filtro (solo super_admin)
  addVariedad: (cultivoId: string) => void;
  addVariedadFull: (cultivoId: string, nombre: string, codigo: string) => void;
  updVariedad: (id: string, key: keyof Variedad, value: unknown) => void;
  updVariedadClientes: (id: string, clienteIds: number[]) => void;
  updVariedadProductores: (id: string, productorIds: number[]) => void;
  delVariedad: (id: string) => void;

  // ── Historial de versiones (Snapshots) ──
  snapshots: DefSnapshot[];
  getDefSnapshots: (defId: string) => DefSnapshot[];
  createSnapshot: (defId: string, cambio: string) => void;

  // ── Accesos por usuario por definición ──
  definicionAccesos: DefinicionAccesoUsuario[];
  getDefAccesos: (defId: string) => DefinicionAccesoUsuario[];
  getUserDefAcceso: (defId: string, userId: number) => DefinicionAccesoUsuario | undefined;
  addDefAcceso: (acceso: Omit<DefinicionAccesoUsuario, "id" | "created_at">) => void;
  removeDefAcceso: (id: string) => void;

  // ── Bloqueo de navegación ──
  hasPendingChanges: boolean;
  setHasPendingChanges: (v: boolean) => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const ConfigContext = createContext<ConfigContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { currentClienteId, currentUser, role } = useRole();
  const currentProductorId = currentUser?.productorId;

  const createUniqueId = (prefix = "") =>
    `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const [parametrosLib, setParametrosLib] = useState<Parametro[]>(PARAMETROS_LIBRARY);
  const [allDefiniciones, setDefiniciones] = useState<ModDef[]>(DEFINICIONES);
  const [allParametros, setParametros] = useState<ModParam[]>(PARAMETROS);
  const [allDatos, setDatos] = useState<ModDato[]>(DATOS_DEMO);
  // ⚠️ Renamed to avoid conflict with the filtered useMemo `cultivos` below
  const [rawCultivos, setCultivos] = useState<Cultivo[]>(CULTIVOS);
  const [rawVariedades, setVariedades] = useState<Variedad[]>(VARIEDADES);
  const [snapshots, setSnapshots] = useState<DefSnapshot[]>(SNAPSHOTS_DEMO);
  const [definicionAccesos, setDefinicionAccesos] = useState<DefinicionAccesoUsuario[]>(ACCESOS_DEFINICION_DEMO);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // ── Filtrado multi-tenant + jerarquía de niveles (§3 informe ROLES_PERMISOS) ─
  // Nivel 1: tenant filter (cliente_id / productor_id)
  // Nivel 2: nivel_minimo — solo ve formularios donde nivel_minimo <= nivel del rol
  // Nivel 3: roles_excluidos — algunos formularios excluyen roles específicos
  // super_admin (nivel 6, sin clienteId) ve todo; el filtro siempre pasa para él
  const definiciones = useMemo(() => {
    const userLevel = ROLE_LEVELS[role];
    // Step 1: tenant scope
    let list: ModDef[];
    if (!currentClienteId) {
      list = allDefiniciones;
    } else if (currentProductorId) {
      list = allDefiniciones.filter(d => d.productor_id === currentProductorId);
    } else {
      list = allDefiniciones.filter(d => d.cliente_id === currentClienteId && !d.productor_id);
    }
    // Step 2: apply nivel_minimo and roles_excluidos (§3.1 y §6.3 del informe)
    return list.filter(d => {
      if (d.nivel_minimo && d.nivel_minimo > userLevel) return false;
      if (d.roles_excluidos && d.roles_excluidos.includes(role)) return false;
      return true;
    });
  }, [allDefiniciones, currentClienteId, currentProductorId, role]);

  const visibleDefIds = useMemo(() => new Set(definiciones.map(d => d.id)), [definiciones]);

  const parametros = useMemo(() => {
    if (!currentClienteId) return allParametros;
    return allParametros.filter(p => visibleDefIds.has(p.definicion_id));
  }, [allParametros, currentClienteId, visibleDefIds]);

  const datos = useMemo(() => {
    if (!currentClienteId) return allDatos;
    return allDatos.filter(d => visibleDefIds.has(d.definicion_id));
  }, [allDatos, currentClienteId, visibleDefIds]);

  // ── Filtrado cultivos/variedades por cliente y productor ─────────────────
  // allCultivos: sin filtro → solo super_admin lo usa para gestión
  // cultivos:    filtrados por clientes_ids + productores_ids según sesión activa
  const cultivos = useMemo(() => {
    // super_admin sin empresa → ve todos
    if (!currentClienteId) return rawCultivos;
    const porCliente = rawCultivos.filter(c =>
      !c.clientes_ids || c.clientes_ids.length === 0 || c.clientes_ids.includes(currentClienteId)
    );
    if (!currentProductorId) return porCliente;
    return porCliente.filter(c =>
      !c.productores_ids || c.productores_ids.length === 0 || c.productores_ids.includes(currentProductorId)
    );
  }, [rawCultivos, currentClienteId, currentProductorId]);

  const variedades = useMemo(() => {
    const visibleIds = new Set(cultivos.map(c => c.id));
    const list = rawVariedades.filter(v => visibleIds.has(v.cultivo_id));
    if (!currentClienteId) return list;
    // Filter by client (CONFIG_VARIEDADES_HABILITADAS.cliente_id)
    const byClient = list.filter(v => !v.clientes_ids || v.clientes_ids.length === 0 || v.clientes_ids.includes(currentClienteId));
    if (!currentProductorId) return byClient;
    // Also filter by producer (CONFIG_VARIEDADES_HABILITADAS.productor_id)
    return byClient.filter(v => !v.productores_ids || v.productores_ids.length === 0 || v.productores_ids.includes(currentProductorId));
  }, [rawVariedades, cultivos, currentClienteId, currentProductorId]);

  const addParamLib = (partial?: Partial<Parametro>): Parametro => {
    const newParam: Parametro = {
      id: `p-${Date.now()}`,
      nombre: partial?.nombre ?? "",
      codigo: partial?.codigo ?? "",
      tipo_dato: partial?.tipo_dato ?? "Texto",
      unidad_medida: partial?.unidad_medida ?? "",
      descripcion: partial?.descripcion ?? "",
      obligatorio_default: partial?.obligatorio_default ?? false,
      activo: true,
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

  const addDef = (input?: AddDefInput): ModDef => {
    const newDef: ModDef = {
      id: String(Date.now()),
      tipo: input?.tipo ?? "personalizado",
      nombre: input?.nombre ?? "",
      descripcion: input?.descripcion ?? "",
      version: input?.version ?? "1.0",
      nivel_minimo: input?.nivel_minimo ?? 1,
      roles_excluidos: input?.roles_excluidos ?? [],
      modulo: input?.modulo ?? "cultivo",
      estado: input?.estado ?? "borrador",
      cultivo_id: input?.cultivoId,
      cliente_id: input?.clienteIdOverride ?? currentClienteId,
      productor_id: input?.productorIdOverride ?? currentProductorId,
    };

    setDefiniciones(prev => [...prev, newDef]);
    return newDef;
  };

  const addEvento = (registroDefId: string, modulo: string, nombre?: string, descripcion?: string, estado?: EstadoDef): ModDef => {
    const registro = allDefiniciones.find(d => d.id === registroDefId);
    const newEvento: ModDef = {
      id: `evt-${Date.now()}`,
      tipo: "personalizado" as const,
      nombre: nombre ?? "",
      descripcion: descripcion ?? "",
      version: "1.0",
      nivel_minimo: registro?.nivel_minimo ?? 1,
      roles_excluidos: [],
      modulo,
      estado: estado ?? ("borrador" as EstadoDef),
      cultivo_id: registro?.cultivo_id,
      cliente_id: registro?.cliente_id ?? currentClienteId,
      productor_id: registro?.productor_id,
      tipo_formulario: "evento" as const,
      registro_padre_id: registroDefId,
    };
    setDefiniciones(prev => [...prev, newEvento]);
    return newEvento;
  };

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

  // Duplica una definición con versión mayor incrementada y copia sus parámetros.
  // La copia arranca en estado "borrador" para revisión antes de activarla.
  // origen_id apunta siempre al id raíz de la familia de versiones.
  const dupDef = (id: string, nombre?: string): void => {
    const newId = String(Date.now());
    setDefiniciones(prev => {
      const src = prev.find(d => d.id === id);
      if (!src) return prev;
      const [maj = 1] = (src.version ?? "1.0").split(".").map(n => parseInt(n) || 0);
      const newVer = `${maj + 1}.0`;
      const origenId = src.origen_id ?? src.id; // siempre apunta a la raíz
      return [...prev, { ...src, id: newId, version: newVer, estado: "borrador" as EstadoDef, origen_id: origenId, ...(nombre ? { nombre } : {}) }];
    });
    setParametros(prev => {
      const origParams = prev.filter(p => p.definicion_id === id);
      const cloned = origParams.map((p, i) => ({
        ...p,
        id: `${newId}-p${i}`,
        definicion_id: newId,
      }));
      return [...prev, ...cloned];
    });
  };

  // Copia una definición (+ parámetros + eventos hijos) a otro cliente.
  // Se crea como borrador con version 1.0, sin origen_id (es una raíz nueva).
  const copyDefToClient = (sourceDefId: string, targetClienteId: number): void => {
    const newId = String(Date.now());
    setDefiniciones(prev => {
      const src = prev.find(d => d.id === sourceDefId);
      if (!src) return prev;
      const parentCopy: ModDef = {
        ...src,
        id: newId,
        version: "1.0",
        estado: "borrador" as EstadoDef,
        cliente_id: targetClienteId,
        origen_id: undefined,
        updated_at: new Date().toISOString(),
        updated_by: "Admin",
      };
      const childEventos = prev.filter(d => d.registro_padre_id === sourceDefId);
      const childCopies: ModDef[] = childEventos.map((evt, i) => ({
        ...evt,
        id: `${newId}-evt-${i}`,
        version: "1.0",
        estado: "borrador" as EstadoDef,
        cliente_id: targetClienteId,
        registro_padre_id: newId,
        origen_id: undefined,
        updated_at: new Date().toISOString(),
        updated_by: "Admin",
      }));
      return [...prev, parentCopy, ...childCopies];
    });
    setParametros(prev => {
      const srcParams = prev.filter(p => p.definicion_id === sourceDefId);
      const cloned = srcParams.map((p, i) => ({
        ...p,
        id: `${newId}-p${i}`,
        definicion_id: newId,
      }));
      return [...prev, ...cloned];
    });
  };

  // ── Campos (Campos_configurados) ──────────────────────────────────────────

  const addPar = (defId: string, parametroId: string, nombre = "") => {
    if (!parametroId) return;
    const libParam = parametrosLib.find(p => p.id === parametroId);
    if (!libParam) return;

    const count = parametros.filter(p => p.definicion_id === defId).length;

    // Evita duplicar el mismo parámetro en una definición.
    const alreadyExists = parametros.some(p => p.definicion_id === defId && p.parametro_id === parametroId);
    if (alreadyExists) return;

    setParametros(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      definicion_id: defId,
      parametro_id: parametroId,
      nombre: nombre || libParam?.nombre || "",
      tipo_dato: libParam?.tipo_dato ?? ("Texto" as TipoDato),
      obligatorio: libParam?.obligatorio_default ?? false,
      orden: count + 1,
    }]);
  };

  const updParByIdx = (i: number, k: keyof ModParam, v: unknown) => {
    const par = parametros[i];
    if (!par) return;
    setParametros(prev => prev.map(p => {
      if (p.id !== par.id) return p;
      if (k === "tipo_dato") return p;
      if (k === "nombre") return p;
      return { ...p, [k]: v };
    }));
  };

  const delParByIdx = (i: number) => {
    const par = parametros[i];
    if (!par) return;
    setParametros(prev => prev.filter(p => p.id !== par.id));
  };

  const updParFull = (id: string, updated: Partial<ModParam>) =>
    setParametros(prev => prev.map(p => {
      if (p.id !== id) return p;
      const safeUpdated = { ...updated };
      if ("nombre" in safeUpdated) delete safeUpdated.nombre;
      if ("tipo_dato" in safeUpdated) delete safeUpdated.tipo_dato;
      return { ...p, ...safeUpdated };
    }));

  // ── Datos ─────────────────────────────────────────────────────────────────

  const addDato = (defId: string, cultivoId?: string, registroPadreDatoId?: string): ModDato => {
    const params = parametros.filter(p => p.definicion_id === defId);
    const emptyVals: Record<string, string> = {};
    params.forEach(p => { emptyVals[p.nombre] = ""; });
    const newDato: ModDato = {
      id: createUniqueId("d-"),
      definicion_id: defId,
      cultivo_id: cultivoId,
      registro_padre_dato_id: registroPadreDatoId,
      referencia: "",
      fecha: new Date().toISOString().split("T")[0],
      valores: JSON.stringify(emptyVals),
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
      id: `c-${Date.now()}`,
      nombre: partial?.nombre ?? "",
      codigo: partial?.codigo ?? "",
      descripcion: partial?.descripcion ?? "",
      activo: true,
    }]);

  const updCultivo = (id: string, k: keyof Cultivo, v: unknown) =>
    setCultivos(prev => prev.map(c => c.id === id ? { ...c, [k]: v } : c));

  const delCultivo = (id: string) => {
    setCultivos(prev => prev.filter(c => c.id !== id));
    setVariedades(prev => prev.filter(v => v.cultivo_id !== id));
  };

  const updCultivoClientes = (id: string, clienteIds: number[]) =>
    setCultivos(prev => prev.map(c => c.id === id ? { ...c, clientes_ids: clienteIds } : c));

  const updCultivoProductores = (id: string, productorIds: number[]) =>
    setCultivos(prev => prev.map(c => c.id === id ? { ...c, productores_ids: productorIds } : c));

  // ── Variedades ──────────────────────────────────────────────────────────────

  const addVariedad = (cultivoId: string) =>
    setVariedades(prev => [...prev, {
      id: `v-${Date.now()}`,
      cultivo_id: cultivoId,
      nombre: "",
      codigo: "",
      descripcion: "",
      activo: true,
    }]);

  const addVariedadFull = (cultivoId: string, nombre: string, codigo: string) =>
    setVariedades(prev => [...prev, {
      id: `v-${Date.now()}`,
      cultivo_id: cultivoId,
      nombre,
      codigo: codigo.toUpperCase(),
      descripcion: "",
      activo: true,
    }]);

  const updVariedad = (id: string, k: keyof Variedad, v: unknown) =>
    setVariedades(prev => prev.map(v2 => v2.id === id ? { ...v2, [k]: v } : v2));

  const delVariedad = (id: string) =>
    setVariedades(prev => prev.filter(v => v.id !== id));

  const updVariedadClientes = (id: string, clienteIds: number[]) =>
    setVariedades(prev => prev.map(v => v.id === id ? { ...v, clientes_ids: clienteIds } : v));

  const updVariedadProductores = (id: string, productorIds: number[]) =>
    setVariedades(prev => prev.map(v => v.id === id ? { ...v, productores_ids: productorIds } : v));

  // ── Snapshots (historial de versiones) ───────────────────────────────────

  const getDefSnapshots = (defId: string): DefSnapshot[] =>
    snapshots.filter(s => s.definicion_id === defId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const createSnapshot = (defId: string, cambio: string) => {
    const def = definiciones.find(d => d.id === defId);
    if (!def) return;
    const campos = parametros.filter(p => p.definicion_id === defId).sort((a, b) => a.orden - b.orden);
    const snap: DefSnapshot = {
      id: `snap-${Date.now()}`,
      definicion_id: defId,
      version: def.version,
      timestamp: new Date().toISOString(),
      usuario: def.updated_by ?? "Admin",
      cambio,
      definicion: { id: def.id, tipo: def.tipo, nombre: def.nombre, descripcion: def.descripcion, version: def.version, nivel_minimo: def.nivel_minimo, modulo: def.modulo, estado: def.estado, cultivo_id: def.cultivo_id, cliente_id: def.cliente_id },
      campos: campos.map(c => ({ ...c })),
    };
    setSnapshots(prev => [...prev, snap]);
  };

  // ── Accesos por usuario por definición ──────────────────────────────────────

  const getDefAccesos = (defId: string) =>
    definicionAccesos.filter(a => a.definicion_id === defId);

  const getUserDefAcceso = (defId: string, userId: number) =>
    definicionAccesos.find(a => a.definicion_id === defId && a.usuario_id === userId);

  const addDefAcceso = (acceso: Omit<DefinicionAccesoUsuario, "id" | "created_at">) =>
    setDefinicionAccesos(prev => [
      ...prev,
      { ...acceso, id: `da-${Date.now()}`, created_at: new Date().toISOString() },
    ]);

  const removeDefAcceso = (id: string) =>
    setDefinicionAccesos(prev => prev.filter(a => a.id !== id));

  return (
    <ConfigContext.Provider value={{
      parametrosLib, addParamLib, updParamLib, delParamLib,
      definiciones, allDefiniciones, addDef, addEvento, updDef, delDef, dupDef, copyDefToClient,
      parametros, addPar, updParByIdx, updParFull, delParByIdx,
      datos, addDato, updDato, delDato,
      cultivos, allCultivos: rawCultivos, addCultivo, updCultivo, updCultivoClientes, updCultivoProductores, delCultivo,
      variedades, allVariedades: rawVariedades, addVariedad, addVariedadFull, updVariedad, updVariedadClientes, updVariedadProductores, delVariedad,
      snapshots, getDefSnapshots, createSnapshot,
      definicionAccesos, getDefAccesos, getUserDefAcceso, addDefAcceso, removeDefAcceso,
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
