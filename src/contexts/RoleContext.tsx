import { createContext, useContext, useState, ReactNode } from "react";

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
}

// ─── Clientes y Productores demo ──────────────────────────────────────────────

export interface DemoCliente {
  id: number;
  nombre: string;
  ruc: string;
  pais: string;
}

export interface DemoProductor {
  id: number;
  clienteId: number;
  nombre: string;
}

export const CLIENTES_DEMO: DemoCliente[] = [
  { id: 1, nombre: "AgroPro Chile",    ruc: "76.123.456-7", pais: "Chile" },
  { id: 2, nombre: "Frutas del Valle", ruc: "80.654.321-K", pais: "Chile" },
];

export const PRODUCTORES_DEMO: DemoProductor[] = [
  { id: 1, clienteId: 1, nombre: "Fundo Los Andes" },
  { id: 2, clienteId: 1, nombre: "Hacienda El Sol" },
  { id: 3, clienteId: 2, nombre: "Campo Florido" },
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

// 6 usuarios demo — uno por rol
export const hardcodedUsers: HardcodedUser[] = [
  {
    id: 1,
    nombre: "Carlos Mendoza",
    email: "superadmin@bluedata.com",
    password: "super123",
    role: "super_admin",
    // sin clienteId → ve toda la plataforma
  },
  {
    id: 2,
    nombre: "Ana García",
    email: "admin@bluedata.com",
    password: "admin123",
    role: "cliente_admin",
    clienteId: 1, // AgroPro Chile
  },
  {
    id: 3,
    nombre: "Roberto Silva",
    email: "productor@bluedata.com",
    password: "prod123",
    role: "productor",
    modulo: "cultivo",
    clienteId: 1,
    productorId: 1, // Fundo Los Andes
  },
  {
    id: 4,
    nombre: "María López",
    email: "jefe@bluedata.com",
    password: "jefe123",
    role: "jefe_area",
    clienteId: 1,
  },
  {
    id: 5,
    nombre: "Juan Pérez",
    email: "supervisor@bluedata.com",
    password: "sup123",
    role: "supervisor",
    clienteId: 1,
  },
  {
    id: 6,
    nombre: "Laura Torres",
    email: "lector@bluedata.com",
    password: "lector123",
    role: "lector",
    clienteId: 2, // Frutas del Valle
  },
];

// Permisos por rol y módulo — según jerarquía del informe PDF
const rolePermissions: Record<UserRole, Record<string, ActionPermission[]>> = {
  // Nivel 6: acceso total sin restricciones
  super_admin: {
    dashboard: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    laboratorio: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    vivero: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    cultivo: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    cosecha: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    "post-cosecha": ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    produccion: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    "recursos-humanos": ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    comercial: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    "gestion-usuarios": ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
    configuracion: ["ver", "crear", "editar", "eliminar", "exportar", "configurar"],
  },
  // Nivel 5: dueño de la empresa — control total de su organización
  cliente_admin: {
    dashboard: ["ver", "crear", "editar", "eliminar", "exportar"],
    laboratorio: ["ver", "crear", "editar", "eliminar", "exportar"],
    vivero: ["ver", "crear", "editar", "eliminar", "exportar"],
    cultivo: ["ver", "crear", "editar", "eliminar", "exportar"],
    cosecha: ["ver", "crear", "editar", "eliminar", "exportar"],
    "post-cosecha": ["ver", "crear", "editar", "eliminar", "exportar"],
    produccion: ["ver", "crear", "editar", "eliminar", "exportar"],
    "recursos-humanos": ["ver", "crear", "editar", "eliminar", "exportar"],
    comercial: ["ver", "crear", "editar", "eliminar", "exportar"],
    "gestion-usuarios": ["ver", "crear", "editar", "eliminar"],
    configuracion: ["ver", "editar", "configurar"],
  },
  // Nivel 4: proveedor externo — solo ve sus propios datos
  productor: {
    dashboard: ["ver"],
    cultivo: ["ver"],
    cosecha: ["ver"],
    "post-cosecha": ["ver"],
  },
  // Nivel 3: jefe de área — acceso completo en su departamento
  jefe_area: {
    dashboard: ["ver", "exportar"],
    laboratorio: ["ver", "crear", "editar", "exportar"],
    vivero: ["ver", "crear", "editar", "exportar"],
    cultivo: ["ver", "crear", "editar", "exportar"],
    cosecha: ["ver", "crear", "editar", "exportar"],
    "post-cosecha": ["ver", "crear", "editar", "exportar"],
    produccion: ["ver", "crear", "editar", "exportar"],
    "recursos-humanos": ["ver", "exportar"],
    comercial: ["ver", "exportar"],
  },
  // Nivel 2: personal de campo — puede ver y registrar información básica
  supervisor: {
    dashboard: ["ver", "exportar"],
    vivero: ["ver"],
    cultivo: ["ver", "crear"],
    cosecha: ["ver", "crear", "exportar"],
    "post-cosecha": ["ver", "crear", "exportar"],
  },
  // Nivel 1: solo consulta — no puede modificar nada
  lector: {
    dashboard: ["ver"],
    laboratorio: ["ver"],
    cosecha: ["ver"],
    "post-cosecha": ["ver"],
  },
};

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
  // Permisos personalizados por usuario (§6)
  permissionOverrides: UserPermissionOverride[];
  addOverride: (override: Omit<UserPermissionOverride, "id" | "createdAt">) => void;
  removeOverride: (id: string) => void;
  getUserOverrides: (userId: number) => UserPermissionOverride[];
  getRoleBasePermissions: (role: UserRole, modulo: string) => ActionPermission[];
  // Multi-tenant
  currentClienteId: number | undefined;
  currentClienteName: string;
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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("cliente_admin");
  const [currentUser, setCurrentUser] = useState<HardcodedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissionOverrides, setPermissionOverrides] = useState<UserPermissionOverride[]>(OVERRIDES_DEMO);

  const login = (email: string, password: string): HardcodedUser | null => {
    const user = hardcodedUsers.find(
      (u) => u.email === email && u.password === password
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
  };

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    const demoUser = hardcodedUsers.find((u) => u.role === newRole);
    if (demoUser) {
      setCurrentUser(demoUser);
      setIsAuthenticated(true);
    }
  };

  // §6.2 Prioridad: permiso personalizado > permiso del rol > denegado
  const hasPermission = (modulo: string, accion: ActionPermission): boolean => {
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
    ? CLIENTES_DEMO.find(c => c.id === currentClienteId)?.nombre ?? ""
    : "Todas las empresas";

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
        permissionOverrides,
        addOverride,
        removeOverride,
        getUserOverrides,
        getRoleBasePermissions,
        currentClienteId,
        currentClienteName,
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
