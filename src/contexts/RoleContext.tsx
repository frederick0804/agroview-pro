import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "administrador" | "supervisor" | "operador";

export type ActionPermission = "ver" | "crear" | "editar" | "eliminar" | "exportar";

export interface HardcodedUser {
  id: number;
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  modulo?: string; // Módulo asignado para operadores
}

// 3 usuarios hardcodeados
export const hardcodedUsers: HardcodedUser[] = [
  {
    id: 1,
    nombre: "Carlos Mendoza",
    email: "admin@bluedata.com",
    password: "admin123",
    role: "administrador",
  },
  {
    id: 2,
    nombre: "María López",
    email: "supervisor@bluedata.com",
    password: "super123",
    role: "supervisor",
  },
  {
    id: 3,
    nombre: "Juan Pérez",
    email: "operador@bluedata.com",
    password: "oper123",
    role: "operador",
    modulo: "cosecha",
  },
];

// Permisos por rol y módulo según informe PDF
const rolePermissions: Record<UserRole, Record<string, ActionPermission[]>> = {
  administrador: {
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
    configuracion: ["ver", "editar"],
  },
  supervisor: {
    dashboard: ["ver", "exportar"],
    cosecha: ["ver", "crear", "exportar"],
    "post-cosecha": ["ver", "crear", "exportar"],
  },
  operador: {
    dashboard: ["ver"],
    cosecha: ["ver", "crear"],
    "post-cosecha": ["ver", "crear"],
  },
};

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleName: string;
  currentUser: HardcodedUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => HardcodedUser | null;
  logout: () => void;
  hasPermission: (modulo: string, accion: ActionPermission) => boolean;
  getModulePermissions: (modulo: string) => ActionPermission[];
}

const roleNames: Record<UserRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("administrador");
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
    setRole("administrador");
  };

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    // Actualizar usuario demo al cambiar rol
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

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: handleSetRole,
        roleName: roleNames[role],
        currentUser,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        getModulePermissions,
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
