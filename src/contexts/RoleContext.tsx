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
}

// 6 usuarios demo — uno por rol
export const hardcodedUsers: HardcodedUser[] = [
  {
    id: 1,
    nombre: "Carlos Mendoza",
    email: "superadmin@bluedata.com",
    password: "super123",
    role: "super_admin",
  },
  {
    id: 2,
    nombre: "Ana García",
    email: "admin@bluedata.com",
    password: "admin123",
    role: "cliente_admin",
  },
  {
    id: 3,
    nombre: "Roberto Silva",
    email: "productor@bluedata.com",
    password: "prod123",
    role: "productor",
    modulo: "cultivo",
  },
  {
    id: 4,
    nombre: "María López",
    email: "jefe@bluedata.com",
    password: "jefe123",
    role: "jefe_area",
  },
  {
    id: 5,
    nombre: "Juan Pérez",
    email: "supervisor@bluedata.com",
    password: "sup123",
    role: "supervisor",
  },
  {
    id: 6,
    nombre: "Laura Torres",
    email: "lector@bluedata.com",
    password: "lector123",
    role: "lector",
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
    laboratorio: ["ver"],   // acceso lectura al laboratorio (ver registros)
    cosecha: ["ver"],
    "post-cosecha": ["ver"],
  },
};

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
  // Verifica acceso a secciones usando nivel_acceso_minimo y roles_excluidos (informe §3 y §6)
  canAccessSection: (nivelMinimo: number, rolesExcluidos?: UserRole[]) => boolean;
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

  const hasPermission = (modulo: string, accion: ActionPermission): boolean => {
    const perms = rolePermissions[role]?.[modulo];
    return perms?.includes(accion) ?? false;
  };

  const getModulePermissions = (modulo: string): ActionPermission[] => {
    return rolePermissions[role]?.[modulo] ?? [];
  };

  // Implementa la lógica del §3 (nivel_acceso_minimo) y §6.3 (roles_excluidos)
  const canAccessSection = (
    nivelMinimo: number,
    rolesExcluidos: UserRole[] = []
  ): boolean => {
    const level = ROLE_LEVELS[role];
    if (level < nivelMinimo) return false;
    if (rolesExcluidos.includes(role)) return false;
    return true;
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
