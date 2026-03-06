import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "administrador" | "supervisor" | "operador";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleName: string;
}

const roleNames: Record<UserRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("administrador");

  return (
    <RoleContext.Provider value={{ role, setRole, roleName: roleNames[role] }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
