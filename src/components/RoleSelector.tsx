import { useRole, type UserRole } from "@/contexts/RoleContext";
import { Shield, Eye, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "administrador", label: "Administrador", icon: Shield, desc: "Acceso total" },
  { value: "supervisor", label: "Supervisor", icon: Eye, desc: "Cosecha y reportes" },
  { value: "operador", label: "Operador", icon: PenLine, desc: "Ingreso de datos" },
];

export function RoleSelector() {
  const { role, setRole } = useRole();

  return (
    <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-xl shadow-lg p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Demo — Rol activo
      </p>
      <div className="flex gap-1.5">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              role === r.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <r.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
