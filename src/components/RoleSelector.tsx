import { useRole, ROLE_LEVELS, type UserRole } from "@/contexts/RoleContext";
import { ShieldCheck, Shield, Sprout, Briefcase, Eye, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const roles: { value: UserRole; label: string; icon: React.ElementType; level: number }[] = [
  { value: "super_admin",   label: "Super Admin",   icon: ShieldCheck, level: 6 },
  { value: "cliente_admin", label: "Cliente Admin", icon: Shield,      level: 5 },
  { value: "productor",     label: "Productor",     icon: Sprout,      level: 4 },
  { value: "jefe_area",     label: "Jefe de Área",  icon: Briefcase,   level: 3 },
  { value: "supervisor",    label: "Supervisor",    icon: Eye,         level: 2 },
  { value: "lector",        label: "Lector",        icon: BookOpen,    level: 1 },
];

export function RoleSelector() {
  const { role, setRole } = useRole();

  return (
    <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-xl shadow-lg p-3 max-w-xs">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Demo — Rol activo
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            title={`Nivel ${r.level} — ${r.label}`}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all",
              role === r.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <r.icon className="w-3.5 h-3.5" />
            <span className="leading-tight text-center">{r.label}</span>
            <span className={cn(
              "text-[10px] font-normal",
              role === r.value ? "text-primary-foreground/70" : "text-muted-foreground/60"
            )}>
              Nv. {r.level}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
