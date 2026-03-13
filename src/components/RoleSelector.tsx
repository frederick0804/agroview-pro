import { useState } from "react";
import { useRole, ROLE_LEVELS, CLIENTES_DEMO, hardcodedUsers, type UserRole } from "@/contexts/RoleContext";
import { ShieldCheck, Shield, Sprout, Briefcase, Eye, BookOpen, ChevronDown, ChevronUp, Building2 } from "lucide-react";
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
  const { role, setRole, roleName, currentClienteName } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleDef = roles.find(r => r.value === role);
  const CurrentIcon = currentRoleDef?.icon ?? ShieldCheck;

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Toggle chip — siempre visible */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
          "bg-card border border-border shadow-md hover:shadow-lg transition-all",
          "text-muted-foreground hover:text-foreground",
        )}
        title="Demo — cambiar rol activo"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">{roleName}</span>
        {isOpen
          ? <ChevronUp   className="w-3 h-3 ml-0.5" />
          : <ChevronDown className="w-3 h-3 ml-0.5" />
        }
      </button>

      {/* Panel expandible */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl p-3 w-64">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Demo — Rol activo
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {roles.map((r) => {
              const user = hardcodedUsers.find(u => u.role === r.value);
              const clienteName = user?.clienteId
                ? CLIENTES_DEMO.find(c => c.id === user.clienteId)?.nombre ?? ""
                : "Plataforma";
              return (
              <button
                key={r.value}
                onClick={() => { setRole(r.value); setIsOpen(false); }}
                title={`Nivel ${r.level} — ${r.label} — ${clienteName}`}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all",
                  role === r.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <r.icon className="w-3.5 h-3.5" />
                <span className="leading-tight text-center">{r.label}</span>
                <span className={cn(
                  "text-[10px] font-normal",
                  role === r.value ? "text-primary-foreground/70" : "text-muted-foreground/60",
                )}>
                  Nv. {r.level}
                </span>
              </button>
              );
            })}
          </div>
          {/* Indicador de empresa */}
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span>{currentClienteName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
