import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, Sprout, Briefcase, Eye, BookOpen, Mail, Calendar } from "lucide-react";

const mockUsers = [
  { id: 1, nombre: "Carlos Mendoza",  email: "superadmin@bluedata.com", rol: "Super Admin",   nivel: 6, modulo: "Todos",        estado: "Activo",   ultimoAcceso: "Hoy 09:30" },
  { id: 2, nombre: "Ana García",      email: "admin@bluedata.com",      rol: "Cliente Admin", nivel: 5, modulo: "Todos",        estado: "Activo",   ultimoAcceso: "Hoy 08:15" },
  { id: 3, nombre: "María López",     email: "jefe@bluedata.com",       rol: "Jefe de Área",  nivel: 3, modulo: "Producción",   estado: "Activo",   ultimoAcceso: "Hoy 10:00" },
  { id: 4, nombre: "Roberto Silva",   email: "productor@bluedata.com",  rol: "Productor",     nivel: 4, modulo: "Cultivo",      estado: "Activo",   ultimoAcceso: "Ayer 16:40" },
  { id: 5, nombre: "Juan Pérez",      email: "supervisor@bluedata.com", rol: "Supervisor",    nivel: 2, modulo: "Cosecha",      estado: "Activo",   ultimoAcceso: "Hoy 07:55" },
  { id: 6, nombre: "Laura Torres",    email: "lector@bluedata.com",     rol: "Lector",        nivel: 1, modulo: "Post-cosecha", estado: "Inactivo", ultimoAcceso: "Hace 3 días" },
];

const rolConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "Super Admin":   { icon: ShieldCheck, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "Cliente Admin": { icon: Shield,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "Productor":     { icon: Sprout,      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "Jefe de Área":  { icon: Briefcase,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "Supervisor":    { icon: Eye,         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  "Lector":        { icon: BookOpen,    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

export default function GestionUsuarios() {
  return (
    <MainLayout>
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema y sus permisos."
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nivel</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Módulo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => {
                const config = rolConfig[user.rol];
                const RolIcon = config?.icon ?? Shield;
                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config?.color}`}>
                        <RolIcon className="w-3 h-3" />
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-foreground">
                        {user.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{user.modulo}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.estado === "Activo" ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.estado === "Activo" ? "bg-success" : "bg-muted-foreground"}`} />
                        {user.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {user.ultimoAcceso}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
