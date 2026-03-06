import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Calendar } from "lucide-react";

const mockUsers = [
  { id: 1, nombre: "Carlos Mendoza", email: "carlos@bluedata.com", rol: "Administrador", modulo: "Todos", estado: "Activo", ultimoAcceso: "Hoy 09:30" },
  { id: 2, nombre: "María López", email: "maria@bluedata.com", rol: "Supervisor", modulo: "Cosecha", estado: "Activo", ultimoAcceso: "Hoy 08:15" },
  { id: 3, nombre: "Juan Pérez", email: "juan@bluedata.com", rol: "Operador", modulo: "Vivero", estado: "Activo", ultimoAcceso: "Ayer 16:40" },
  { id: 4, nombre: "Ana García", email: "ana@bluedata.com", rol: "Operador", modulo: "Laboratorio", estado: "Inactivo", ultimoAcceso: "Hace 3 días" },
  { id: 5, nombre: "Roberto Silva", email: "roberto@bluedata.com", rol: "Supervisor", modulo: "Post-cosecha", estado: "Activo", ultimoAcceso: "Hoy 10:00" },
];

const rolBadgeVariant = (rol: string) => {
  switch (rol) {
    case "Administrador": return "default";
    case "Supervisor": return "secondary";
    default: return "outline";
  }
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Módulo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
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
                    <Badge variant={rolBadgeVariant(user.rol) as any} className="gap-1">
                      <Shield className="w-3 h-3" />
                      {user.rol}
                    </Badge>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
