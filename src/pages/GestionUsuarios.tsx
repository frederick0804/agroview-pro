import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield, ShieldCheck, Sprout, Briefcase, Eye, BookOpen, Mail, Calendar,
  ShieldAlert, Plus, Trash2, Check, X, Info, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRole, hardcodedUsers,
  ALL_MODULES, ALL_ACTIONS,
  ROLE_LEVELS, CLIENTES_DEMO,
  type UserRole, type ActionPermission,
} from "@/contexts/RoleContext";

const rolConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "Super Admin":   { icon: ShieldCheck, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "Cliente Admin": { icon: Shield,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "Productor":     { icon: Sprout,      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "Jefe de Área":  { icon: Briefcase,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "Supervisor":    { icon: Eye,         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  "Lector":        { icon: BookOpen,    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const roleNameMap: Record<UserRole, string> = {
  super_admin: "Super Admin",
  cliente_admin: "Cliente Admin",
  productor: "Productor",
  jefe_area: "Jefe de Área",
  supervisor: "Supervisor",
  lector: "Lector",
};

const mockUsers = hardcodedUsers.map(u => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: roleNameMap[u.role],
  roleKey: u.role,
  nivel: ROLE_LEVELS[u.role],
  clienteId: u.clienteId,
  empresa: u.clienteId ? CLIENTES_DEMO.find(c => c.id === u.clienteId)?.nombre ?? "—" : "Plataforma",
  modulo: u.modulo ? u.modulo.charAt(0).toUpperCase() + u.modulo.slice(1) : "Todos",
  estado: "Activo" as const,
  ultimoAcceso: u.id <= 3 ? "Hoy 09:30" : u.id === 4 ? "Hoy 10:00" : u.id === 5 ? "Hoy 07:55" : "Hace 3 días",
}));

export default function GestionUsuarios() {
  const {
    permissionOverrides, addOverride, removeOverride,
    getUserOverrides, getRoleBasePermissions,
  } = useRole();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newOverride, setNewOverride] = useState({
    modulo: "cultivo",
    accion: "exportar" as ActionPermission,
    habilitado: true,
    justificacion: "",
  });

  const selectedUser = selectedUserId ? mockUsers.find(u => u.id === selectedUserId) : null;
  const userOverrides = selectedUserId ? getUserOverrides(selectedUserId) : [];

  const handleAddOverride = () => {
    if (!selectedUserId || !newOverride.justificacion.trim()) return;
    addOverride({
      userId: selectedUserId,
      modulo: newOverride.modulo,
      accion: newOverride.accion,
      habilitado: newOverride.habilitado,
      justificacion: newOverride.justificacion.trim(),
    });
    setAddModal(false);
    setNewOverride({ modulo: "cultivo", accion: "exportar", habilitado: true, justificacion: "" });
  };

  return (
    <MainLayout>
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema y sus permisos especiales."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Tabla de usuarios ── */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nivel</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Último acceso</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">Especiales</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((user) => {
                    const config = rolConfig[user.rol];
                    const RolIcon = config?.icon ?? Shield;
                    const overrideCount = getUserOverrides(user.id).length;
                    const isSelected = selectedUserId === user.id;
                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{user.nombre}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{user.empresa}</span>
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
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            {user.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {user.ultimoAcceso}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {overrideCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              {overrideCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Panel de permisos especiales ── */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Permisos Especiales
              </h3>
              {selectedUser && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddModal(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              )}
            </div>

            {!selectedUser ? (
              <div className="px-4 py-10 text-center">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecciona un usuario de la tabla para ver y gestionar sus permisos especiales.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Info del usuario seleccionado */}
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="font-medium text-sm text-foreground">{selectedUser.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.rol} · Nivel {selectedUser.nivel}
                  </p>
                </div>

                {/* Permisos base del rol */}
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Permisos base del rol
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {ALL_MODULES.map(m => {
                      const perms = getRoleBasePermissions(selectedUser.roleKey, m.value);
                      if (perms.length === 0) return null;
                      return (
                        <div key={m.value} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{m.label}</span>
                          <div className="flex gap-1">
                            {perms.map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overrides */}
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Excepciones personalizadas
                  </h4>
                  {userOverrides.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Sin permisos especiales configurados.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userOverrides.map(ov => {
                        const moduloLabel = ALL_MODULES.find(m => m.value === ov.modulo)?.label ?? ov.modulo;
                        const accionLabel = ALL_ACTIONS.find(a => a.value === ov.accion)?.label ?? ov.accion;
                        return (
                          <div key={ov.id} className="bg-muted/30 rounded-lg p-2.5 border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {ov.habilitado ? (
                                  <Check className="w-3.5 h-3.5 text-success" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-destructive" />
                                )}
                                <span className="text-xs font-medium text-foreground">
                                  {accionLabel} en {moduloLabel}
                                </span>
                              </div>
                              <button
                                onClick={() => removeOverride(ov.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground pl-5.5">
                              {ov.justificacion}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 pl-5.5">
                              Creado: {ov.createdAt}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal agregar permiso especial ── */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Nuevo Permiso Especial
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-2.5 border border-border text-xs">
                <span className="font-medium">{selectedUser.nombre}</span>
                <span className="text-muted-foreground"> · {selectedUser.rol}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Módulo</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newOverride.modulo}
                    onChange={e => setNewOverride(p => ({ ...p, modulo: e.target.value }))}
                  >
                    {ALL_MODULES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Acción</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newOverride.accion}
                    onChange={e => setNewOverride(p => ({ ...p, accion: e.target.value as ActionPermission }))}
                  >
                    {ALL_ACTIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">¿Permitir esta acción?</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newOverride.habilitado}
                    onCheckedChange={v => setNewOverride(p => ({ ...p, habilitado: v }))}
                  />
                  <span className={cn("text-xs font-medium", newOverride.habilitado ? "text-success" : "text-destructive")}>
                    {newOverride.habilitado ? "Permitido" : "Bloqueado"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Justificación <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newOverride.justificacion}
                  onChange={e => setNewOverride(p => ({ ...p, justificacion: e.target.value }))}
                  placeholder="Ej: Permiso temporal para auditoría Q1 2025"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se registra para auditoría. Explica por qué se otorga/bloquea este permiso.
                </p>
              </div>

              {/* Indicador de impacto */}
              {(() => {
                const basePerms = getRoleBasePermissions(selectedUser.roleKey, newOverride.modulo);
                const hasBase = basePerms.includes(newOverride.accion);
                const isRedundant = (hasBase && newOverride.habilitado) || (!hasBase && !newOverride.habilitado);
                return (
                  <div className={cn(
                    "rounded-lg p-2.5 border text-xs flex items-start gap-2",
                    isRedundant
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                      : "bg-primary/5 border-primary/20 text-primary",
                  )}>
                    {isRedundant ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                    <span>
                      {isRedundant
                        ? `Este permiso es redundante: el rol ${selectedUser.rol} ya ${hasBase ? "tiene" : "no tiene"} "${newOverride.accion}" en ${ALL_MODULES.find(m => m.value === newOverride.modulo)?.label}.`
                        : `Esto ${newOverride.habilitado ? "otorgará" : "bloqueará"} "${newOverride.accion}" en ${ALL_MODULES.find(m => m.value === newOverride.modulo)?.label} — diferente al permiso base del rol.`
                      }
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddOverride} disabled={!newOverride.justificacion.trim()}>
              <Plus className="w-4 h-4 mr-1.5" /> Guardar permiso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
