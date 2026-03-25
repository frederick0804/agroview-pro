import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 6 roles según informe PDF - jerarquía del nivel 1 al 6
export type UserRole =
  | "super_admin"
  | "cliente_admin"
  | "productor"
  | "jefe_area"
  | "supervisor"
  | "lector";

// Acciones disponibles (incluye "configurar" según informe)
export type ActionPermission =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "exportar"
  | "configurar";

// Niveles jerárquicos (1=menor, 6=mayor autoridad)
export const ROLE_LEVELS: Record<UserRole, number> = {
  super_admin: 6,
  cliente_admin: 5,
  productor: 4,
  jefe_area: 3,
  supervisor: 2,
  lector: 1,
};

export interface HardcodedUser {
  id: number;
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  modulo?: string;
  clienteId?: number;
  productorId?: number;
  area_asignada?: string;
  /** For supervisor: which specific form definition IDs they can access */
  definiciones_asignadas?: string[];
  activo?: boolean;
}

// ─── Clientes y Productores demo ──────────────────────────────────────────────

export interface DemoCliente {
  id: number;
  nombre: string;
  ruc: string;
  pais: string;
  direccion?: string;
}

export interface DemoProductor {
  id: number;
  clienteId: number;
  nombre: string;
  ruc: string;
  pais: string;
  direccion?: string;
}

export const CLIENTES_DEMO: DemoCliente[] = [
  { id: 1, nombre: "AgroPro Chile",    ruc: "76.123.456-7", pais: "Chile", direccion: "Av. Apoquindo 4501, Las Condes, Santiago" },
  { id: 2, nombre: "Frutas del Valle", ruc: "80.654.321-K", pais: "Chile", direccion: "Km 12 Ruta 5 Norte, Curicó" },
];

export const PRODUCTORES_DEMO: DemoProductor[] = [
  { id: 1, clienteId: 1, nombre: "Fundo Los Andes", ruc: "76.111.222-3", pais: "Chile", direccion: "Camino Los Andes s/n, Colina" },
  { id: 2, clienteId: 1, nombre: "Hacienda El Sol",  ruc: "76.333.444-5", pais: "Chile", direccion: "Ruta 68 Km 45, Casablanca" },
  { id: 3, clienteId: 2, nombre: "Campo Florido",    ruc: "77.555.666-7", pais: "Chile", direccion: "Camino Rural Km 3, Curicó" },
];

// Permiso personalizado por usuario (§6 del informe)
export interface UserPermissionOverride {
  id: string;
  userId: number;
  modulo: string;
  accion: ActionPermission;
  habilitado: boolean;
  justificacion: string;
  createdAt: string;
}

// ─── Módulos "operativos" — los que se restringen por area_asignada ───────────
// dashboard, informes, configuracion, gestion-usuarios están fuera de este filtro.
const AREA_MODULES = [
  "laboratorio", "vivero", "cultivo", "cosecha",
  "post-cosecha", "produccion", "recursos-humanos", "comercial",
] as const;

// 6 usuarios demo — uno por rol
export const INITIAL_USERS: HardcodedUser[] = [
  {
    id: 1,
    nombre: "Carlos Mendoza",
    email: "superadmin@agroworkin.com",
    password: "super123",
    role: "super_admin",
    activo: true,
    // sin clienteId → ve toda la plataforma
  },
  {
    id: 2,
    nombre: "Ana García",
    email: "admin@agroworkin.com",
    password: "admin123",
    role: "cliente_admin",
    clienteId: 1, // AgroPro Chile
    activo: true,
  },
  {
    id: 3,
    nombre: "Roberto Silva",
    email: "productor@agroworkin.com",
    password: "prod123",
    role: "productor",
    clienteId: 1,
    productorId: 1, // Fundo Los Andes — acceso completo a sus módulos
    activo: true,
  },
  {
    id: 4,
    nombre: "María López",
    email: "jefe@agroworkin.com",
    password: "jefe123",
    role: "jefe_area",
    clienteId: 1,
    area_asignada: "cultivo", // solo Cultivo
    activo: true,
  },
  {
    id: 5,
    nombre: "Juan Pérez",
    email: "supervisor@agroworkin.com",
    password: "sup123",
    role: "supervisor",
    clienteId: 1,
    area_asignada: "cultivo", // solo Cultivo
    // definiciones_asignadas se puede configurar para limitar formularios
    activo: true,
  },
  {
    id: 6,
    nombre: "Laura Torres",
    email: "lector@agroworkin.com",
    password: "lector123",
    role: "lector",
    clienteId: 2, // Frutas del Valle
    area_asignada: "vivero", // solo Vivero, solo lectura
    activo: true,
  },
];

/** @deprecated Use `users` from `useRole()` — kept for legacy constant imports */
export const hardcodedUsers = INITIAL_USERS;

// ─── Acciones base por rol ────────────────────────────────────────────────────
// El SET de acciones es UNIFORME en todos los módulos para cada rol.
// Qué módulos puede usar un usuario se controla al crearlo (formModulosActivos).
// Para permisos especiales en un módulo puntual → USUARIO_MODULO_ACCION_PERSONALIZADO (§6).
//
//  super_admin   Nv6  ─ gestión total de la plataforma
//  cliente_admin Nv5  ─ gestión total de su organización (incluye configurar)
//  productor     Nv4  ─ registra y edita sus propios datos de campo
//  jefe_area     Nv3  ─ gestión operacional completa (sin eliminar ni configurar)
//  supervisor    Nv2  ─ ingreso de datos básicos de campo
//  lector        Nv1  ─ solo consulta, sin modificar nada

export const ACTIONS_BY_ROLE: Record<UserRole, ActionPermission[]> = {
  super_admin:   ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
  cliente_admin: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
  productor:     ["ver", "crear", "editar", "configurar"],
  jefe_area:     ["ver", "crear", "editar", "exportar"],
  supervisor:    ["ver", "crear"],
  lector:        ["ver"],
};

// Genera rolePermissions automáticamente: las mismas acciones en todos los módulos
const _ALL_MODULE_KEYS = [
  "dashboard", "laboratorio", "vivero", "cultivo", "cosecha",
  "post-cosecha", "produccion", "recursos-humanos", "comercial",
  "informes", "gestion-usuarios", "configuracion",
] as const;

const rolePermissions: Record<UserRole, Record<string, ActionPermission[]>> =
  Object.fromEntries(
    (Object.entries(ACTIONS_BY_ROLE) as [UserRole, ActionPermission[]][]).map(
      ([rol, acciones]) => [
        rol,
        Object.fromEntries(_ALL_MODULE_KEYS.map(m => [m, acciones])),
      ]
    )
  ) as Record<UserRole, Record<string, ActionPermission[]>>;

// Permisos personalizados demo (§6 del informe)
const OVERRIDES_DEMO: UserPermissionOverride[] = [
  {
    id: "ov-1",
    userId: 5,       // Juan Pérez (Supervisor)
    modulo: "cultivo",
    accion: "exportar",
    habilitado: true,
    justificacion: "Permiso temporal para auditoría Q1 2025",
    createdAt: "2025-01-15",
  },
  {
    id: "ov-2",
    userId: 5,       // Juan Pérez (Supervisor)
    modulo: "informes",
    accion: "exportar",
    habilitado: true,
    justificacion: "Permiso para exportar informes de su área asignada",
    createdAt: "2025-01-15",
  },
  {
    id: "ov-3",
    userId: 5,       // Juan Pérez (Supervisor de cultivo)
    modulo: "informes",
    accion: "editar",
    habilitado: true,
    justificacion: "Permiso para gestionar plantillas del área de cultivo",
    createdAt: "2025-02-01",
  },
  {
    id: "ov-4",
    userId: 5,       // Juan Pérez (Supervisor de cultivo)
    modulo: "informes",
    accion: "eliminar",
    habilitado: true,
    justificacion: "Permiso para eliminar plantillas del área de cultivo",
    createdAt: "2025-02-01",
  },
];

// Módulos disponibles para la UI
export const ALL_MODULES = [
  { value: "dashboard",        label: "Dashboard" },
  { value: "laboratorio",      label: "Laboratorio" },
  { value: "vivero",           label: "Vivero" },
  { value: "cultivo",          label: "Cultivo" },
  { value: "cosecha",          label: "Cosecha" },
  { value: "post-cosecha",     label: "Post-cosecha" },
  { value: "produccion",       label: "Producción" },
  { value: "recursos-humanos", label: "Recursos Humanos" },
  { value: "comercial",        label: "Comercial" },
  { value: "informes",         label: "Informes" },
  { value: "gestion-usuarios", label: "Gestión de Usuarios" },
  { value: "configuracion",    label: "Configuración" },
];

export const ALL_ACTIONS: { value: ActionPermission; label: string }[] = [
  { value: "ver",         label: "Ver" },
  { value: "crear",       label: "Crear" },
  { value: "editar",      label: "Editar" },
  { value: "eliminar",    label: "Eliminar" },
  { value: "exportar",    label: "Exportar" },
  { value: "configurar",  label: "Configurar" },
];

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleName: string;
  hierarchyLevel: number;
  currentUser: HardcodedUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => HardcodedUser | null;
  logout: () => void;
  hasPermission: (modulo: string, accion: ActionPermission) => boolean;
  getModulePermissions: (modulo: string) => ActionPermission[];
  canAccessSection: (nivelMinimo: number, rolesExcluidos?: UserRole[]) => boolean;
  /** Check if current user can access a given module at all */
  canAccessModule: (modulo: string) => boolean;
  /** Get list of module keys the current user can access */
  getAccessibleModules: () => string[];
  // Permisos personalizados por usuario (§6)
  permissionOverrides: UserPermissionOverride[];
  addOverride: (override: Omit<UserPermissionOverride, "id" | "createdAt">) => void;
  removeOverride: (id: string) => void;
  getUserOverrides: (userId: number) => UserPermissionOverride[];
  getRoleBasePermissions: (role: UserRole, modulo: string) => ActionPermission[];
  // Multi-tenant
  currentClienteId: number | undefined;
  currentClienteName: string;
  // Empresa context (super_admin puede filtrar por empresa)
  empresaCtxId: number | null;
  setEmpresaCtxId: (id: number | null) => void;
  // Usuarios CRUD
  users: HardcodedUser[];
  addUser: (u: Omit<HardcodedUser, "id">) => HardcodedUser;
  updUser: (id: number, changes: Partial<Omit<HardcodedUser, "id">>) => void;
  toggleUserActive: (id: number) => void;
  // Clientes CRUD
  clientes: DemoCliente[];
  addCliente: (c: Omit<DemoCliente, "id">) => DemoCliente;
  updCliente: (id: number, changes: Partial<Omit<DemoCliente, "id">>) => void;
  delCliente: (id: number) => void;
  // Productores CRUD
  productores: DemoProductor[];
  addProductor: (p: Omit<DemoProductor, "id">) => DemoProductor;
  updProductor: (id: number, changes: Partial<Omit<DemoProductor, "id">>) => void;
  delProductor: (id: number) => void;
}

const roleNames: Record<UserRole, string> = {
  super_admin: "Super Admin",
  cliente_admin: "Cliente Admin",
  productor: "Productor",
  jefe_area: "Jefe de Área",
  supervisor: "Supervisor",
  lector: "Lector",
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEYS = {
  AUTH: "agroview_auth",
  USERS: "agroview_users",
  CLIENTES: "agroview_clientes",
  PRODUCTORES: "agroview_productores",
  OVERRIDES: "agroview_overrides",
  EMPRESA_CTX: "agroview_empresa_ctx",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silent fail
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  // ── Lazy initialization: cargar desde localStorage ──
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    loadFromStorage(STORAGE_KEYS.AUTH, { isAuth: false, role: "cliente_admin" as UserRole, user: null as HardcodedUser | null }).isAuth
  );
  const [role, setRole] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.AUTH, { isAuth: false, role: "cliente_admin" as UserRole, user: null as HardcodedUser | null }).role
  );
  const [currentUser, setCurrentUser] = useState<HardcodedUser | null>(() =>
    loadFromStorage(STORAGE_KEYS.AUTH, { isAuth: false, role: "cliente_admin" as UserRole, user: null as HardcodedUser | null }).user
  );
  const [permissionOverrides, setPermissionOverrides] = useState<UserPermissionOverride[]>(() =>
    loadFromStorage(STORAGE_KEYS.OVERRIDES, OVERRIDES_DEMO)
  );
  const [users, setUsers] = useState<HardcodedUser[]>(() =>
    loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS)
  );
  const [empresaCtxId, setEmpresaCtxId] = useState<number | null>(() =>
    loadFromStorage(STORAGE_KEYS.EMPRESA_CTX, null)
  );
  const [clientes, setClientes] = useState<DemoCliente[]>(() =>
    loadFromStorage(STORAGE_KEYS.CLIENTES, CLIENTES_DEMO)
  );
  const [productores, setProductores] = useState<DemoProductor[]>(() =>
    loadFromStorage(STORAGE_KEYS.PRODUCTORES, PRODUCTORES_DEMO)
  );

  // ── Persistir sesión en localStorage cuando cambie ──
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AUTH, { isAuth: isAuthenticated, role, user: currentUser });
  }, [isAuthenticated, role, currentUser]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLIENTES, clientes);
  }, [clientes]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PRODUCTORES, productores);
  }, [productores]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OVERRIDES, permissionOverrides);
  }, [permissionOverrides]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EMPRESA_CTX, empresaCtxId);
  }, [empresaCtxId]);

  // ── Validar que currentUser sigue existiendo en users ──
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const userStillExists = users.find(u => u.id === currentUser.id && u.activo !== false);
      if (!userStillExists) {
        // Usuario eliminado o desactivado → cerrar sesión
        setCurrentUser(null);
        setIsAuthenticated(false);
        setRole("cliente_admin");
        localStorage.removeItem(STORAGE_KEYS.AUTH);
      }
    }
  }, [users, currentUser, isAuthenticated]);

  const login = (email: string, password: string): HardcodedUser | null => {
    const user = users.find(
      (u) => u.email === email && u.password === password && u.activo !== false
    );
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      setIsAuthenticated(true);
      return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setRole("cliente_admin");
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  };

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    const demoUser = users.find((u) => u.role === newRole);
    if (demoUser) {
      setCurrentUser(demoUser);
      setIsAuthenticated(true);
    }
  };

  // ─── Module access logic ─────────────────────────────────────────────────────
  // Roles with area_asignada (jefe_area, supervisor, lector) can only access
  // their assigned module. Dashboard is always accessible.
  // super_admin, cliente_admin, productor → access all modules.
  const canAccessModule = (modulo: string): boolean => {
    // Dashboard siempre accesible
    if (modulo === "dashboard") return true;
    // super_admin → todo
    if (role === "super_admin") return true;
    // cliente_admin → todo de su empresa
    if (role === "cliente_admin") return true;
    // productor → todo de su scope (como un mini cliente_admin)
    if (role === "productor") return true;
    // jefe_area, supervisor, lector → solo area_asignada
    const area = currentUser?.area_asignada;
    if (!area) return true; // sin restricción si no tiene area asignada
    // Módulos no-operativos: configuracion solo para roles altos, informes filtrado
    if (modulo === "configuracion") return role === "jefe_area"; // jefe puede ver config de su área
    if (modulo === "gestion-usuarios") return false;
    if (modulo === "informes") return true; // informes filtrado por área en la vista
    // Check: ¿es el módulo asignado?
    return modulo === area;
  };

  const getAccessibleModules = (): string[] => {
    return _ALL_MODULE_KEYS.filter(m => canAccessModule(m));
  };

  // §6.2 Prioridad: módulo accesible > permiso personalizado > permiso del rol > denegado
  const hasPermission = (modulo: string, accion: ActionPermission): boolean => {
    // Paso 0: ¿Tiene acceso al módulo?
    if (!canAccessModule(modulo)) return false;
    // Paso 1: ¿Existe un permiso personalizado para este usuario?
    if (currentUser) {
      const override = permissionOverrides.find(
        o => o.userId === currentUser.id && o.modulo === modulo && o.accion === accion
      );
      if (override) return override.habilitado;
    }
    // Paso 2: Permiso base del rol
    const perms = rolePermissions[role]?.[modulo];
    return perms?.includes(accion) ?? false;
  };

  const getModulePermissions = (modulo: string): ActionPermission[] => {
    if (!canAccessModule(modulo)) return [];
    return rolePermissions[role]?.[modulo] ?? [];
  };

  const getRoleBasePermissions = (targetRole: UserRole, modulo: string): ActionPermission[] => {
    return rolePermissions[targetRole]?.[modulo] ?? [];
  };

  const canAccessSection = (
    nivelMinimo: number,
    rolesExcluidos: UserRole[] = []
  ): boolean => {
    const level = ROLE_LEVELS[role];
    if (level < nivelMinimo) return false;
    if (rolesExcluidos.includes(role)) return false;
    return true;
  };

  // CRUD de permisos personalizados
  const addOverride = (override: Omit<UserPermissionOverride, "id" | "createdAt">) => {
    // Si ya existe uno igual, reemplazar
    setPermissionOverrides(prev => {
      const existing = prev.findIndex(
        o => o.userId === override.userId && o.modulo === override.modulo && o.accion === override.accion
      );
      const newOv: UserPermissionOverride = {
        ...override,
        id: `ov-${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = newOv;
        return copy;
      }
      return [...prev, newOv];
    });
  };

  const removeOverride = (id: string) => {
    setPermissionOverrides(prev => prev.filter(o => o.id !== id));
  };

  const getUserOverrides = (userId: number): UserPermissionOverride[] => {
    return permissionOverrides.filter(o => o.userId === userId);
  };

  // Multi-tenant
  const currentClienteId = currentUser?.clienteId;
  const currentClienteName = currentClienteId
    ? clientes.find(c => c.id === currentClienteId)?.nombre ?? ""
    : "Todas las empresas";

  // Usuarios CRUD
  const addUser = (u: Omit<HardcodedUser, "id">): HardcodedUser => {
    const newU: HardcodedUser = { ...u, id: Date.now() };
    setUsers(prev => [...prev, newU]);
    return newU;
  };
  const updUser = (id: number, changes: Partial<Omit<HardcodedUser, "id">>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));
  };
  const toggleUserActive = (id: number) => {
    setUsers(prev => prev.map(u =>
      u.id === id
        ? { ...u, activo: !(u.activo ?? true) }
        : u
    ));
    // Si se desactiva el usuario actual, cerrar sesión
    if (currentUser?.id === id) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setRole("cliente_admin");
    }
  };

  // Clientes CRUD
  const addCliente = (c: Omit<DemoCliente, "id">): DemoCliente => {
    const newC: DemoCliente = { ...c, id: Date.now() };
    setClientes(prev => [...prev, newC]);
    return newC;
  };
  const updCliente = (id: number, changes: Partial<Omit<DemoCliente, "id">>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  };
  const delCliente = (id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    setProductores(prev => prev.filter(p => p.clienteId !== id));
  };

  // Productores CRUD
  const addProductor = (p: Omit<DemoProductor, "id">): DemoProductor => {
    const newP: DemoProductor = { ...p, id: Date.now() };
    setProductores(prev => [...prev, newP]);
    return newP;
  };
  const updProductor = (id: number, changes: Partial<Omit<DemoProductor, "id">>) => {
    setProductores(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };
  const delProductor = (id: number) => {
    setProductores(prev => prev.filter(p => p.id !== id));
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: handleSetRole,
        roleName: roleNames[role],
        hierarchyLevel: ROLE_LEVELS[role],
        currentUser,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        getModulePermissions,
        canAccessSection,
        canAccessModule,
        getAccessibleModules,
        permissionOverrides,
        addOverride,
        removeOverride,
        getUserOverrides,
        getRoleBasePermissions,
        currentClienteId,
        currentClienteName,
        empresaCtxId,
        setEmpresaCtxId,
        users,
        addUser,
        updUser,
        toggleUserActive,
        clientes,
        addCliente,
        updCliente,
        delCliente,
        productores,
        addProductor,
        updProductor,
        delProductor,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
