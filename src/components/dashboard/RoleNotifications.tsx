import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type UserRole } from "@/contexts/RoleContext";

type NotificationSeverity = "info" | "warning" | "critical" | "success";

interface RoleNotification {
  id: string;
  title: string;
  message: string;
  when: string;
  module?: string;
  severity: NotificationSeverity;
  ctaLabel?: string;
  ctaPath?: string;
}

interface RoleNotificationsProps {
  className?: string;
  title?: string;
  maxItems?: number;
}

const AREA_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio",
  vivero: "Vivero",
  cultivo: "Cultivo",
  cosecha: "Cosecha",
  "post-cosecha": "Poscosecha",
  produccion: "Poscosecha",
  "recursos-humanos": "Recursos Humanos",
  comercial: "Comercial",
};

const AREA_PATHS: Record<string, string> = {
  laboratorio: "/laboratorio",
  vivero: "/vivero",
  cultivo: "/cultivo",
  cosecha: "/cultivo",
  "post-cosecha": "/post-cosecha",
  produccion: "/post-cosecha",
  "recursos-humanos": "/recursos-humanos",
  comercial: "/comercial",
};

const ROLE_NOTIFICATIONS: Record<UserRole, RoleNotification[]> = {
  super_admin: [
    {
      id: "sa-1",
      title: "Overrides de permisos por revisar",
      message: "Hay 3 cambios recientes en la matriz de permisos que aun no tienen validacion final.",
      when: "Hace 45 min",
      module: "Configuracion",
      severity: "critical",
      ctaLabel: "Revisar",
      ctaPath: "/configuracion?tab=permisos",
    },
    {
      id: "sa-2",
      title: "Productores sin modulo activo",
      message: "Se detectaron 2 productores nuevos sin configuracion operativa de dashboard.",
      when: "Hace 2 h",
      module: "Gestion",
      severity: "warning",
      ctaLabel: "Configurar",
      ctaPath: "/configuracion?tab=empresas",
    },
    {
      id: "sa-3",
      title: "Respaldo de datos completado",
      message: "El proceso nocturno termino sin errores en formularios e informes.",
      when: "Hoy 03:12",
      module: "Sistema",
      severity: "success",
    },
    {
      id: "sa-4",
      title: "Nueva version de informe disponible",
      message: "Hay una nueva version de plantilla lista para publicacion global.",
      when: "Hace 5 h",
      module: "Informes",
      severity: "info",
      ctaLabel: "Ver",
      ctaPath: "/informes",
    },
  ],
  cliente_admin: [
    {
      id: "ca-1",
      title: "Usuarios pendientes de activacion",
      message: "Tienes 2 cuentas creadas que aun no han iniciado sesion.",
      when: "Hace 1 h",
      module: "Usuarios",
      severity: "warning",
      ctaLabel: "Ir",
      ctaPath: "/gestion-usuarios",
    },
    {
      id: "ca-2",
      title: "Campos obligatorios sin completar",
      message: "Se encontraron registros incompletos en formularios de cultivo.",
      when: "Hace 3 h",
      module: "Cultivo",
      severity: "critical",
      ctaLabel: "Revisar",
      ctaPath: "/cultivo",
    },
    {
      id: "ca-3",
      title: "Permisos de informes actualizados",
      message: "Los permisos para exportar informes quedaron sincronizados.",
      when: "Ayer",
      module: "Informes",
      severity: "success",
      ctaLabel: "Ver",
      ctaPath: "/informes",
    },
    {
      id: "ca-4",
      title: "Nueva sugerencia operativa",
      message: "Se recomienda validar metas de productividad para la proxima semana.",
      when: "Hace 6 h",
      module: "Dashboard",
      severity: "info",
    },
  ],
  productor: [
    {
      id: "pr-1",
      title: "Formularios pendientes de envio",
      message: "Hay 2 registros de campo listos para confirmar y enviar.",
      when: "Hace 35 min",
      module: "Cultivo",
      severity: "warning",
      ctaLabel: "Abrir",
      ctaPath: "/cultivo",
    },
    {
      id: "pr-2",
      title: "Rendimiento bajo en bloque",
      message: "Bloque C-2 reporta desviacion frente al promedio semanal.",
      when: "Hace 2 h",
      module: "Cultivo",
      severity: "critical",
      ctaLabel: "Revisar",
      ctaPath: "/cultivo",
    },
    {
      id: "pr-3",
      title: "Informe semanal listo",
      message: "Ya puedes revisar el consolidado operativo de la semana.",
      when: "Hoy 08:10",
      module: "Informes",
      severity: "success",
      ctaLabel: "Ver informe",
      ctaPath: "/informes",
    },
    {
      id: "pr-4",
      title: "Recordatorio de planificacion",
      message: "Actualiza disponibilidad de cuadrillas para el siguiente turno.",
      when: "Hace 4 h",
      module: "Operaciones",
      severity: "info",
    },
  ],
  jefe_area: [
    {
      id: "ja-1",
      title: "Validacion pendiente en {area}",
      message: "Tienes 4 registros de {area} esperando aprobacion final.",
      when: "Hace 50 min",
      module: "{area}",
      severity: "warning",
      ctaLabel: "Validar",
      ctaPath: "{areaPath}",
    },
    {
      id: "ja-2",
      title: "Meta semanal en seguimiento",
      message: "El cumplimiento del area esta en 92%. Recomendado ajustar turnos.",
      when: "Hace 3 h",
      module: "Dashboard",
      severity: "info",
    },
    {
      id: "ja-3",
      title: "Incidencia abierta",
      message: "Se registro una alerta de calidad que requiere confirmacion del equipo.",
      when: "Hace 5 h",
      module: "{area}",
      severity: "critical",
      ctaLabel: "Atender",
      ctaPath: "{areaPath}",
    },
  ],
  supervisor: [
    {
      id: "sp-1",
      title: "Tareas asignadas en {area}",
      message: "Hay 3 tareas operativas para completar durante el turno actual.",
      when: "Hace 20 min",
      module: "{area}",
      severity: "info",
      ctaLabel: "Ver tareas",
      ctaPath: "{areaPath}",
    },
    {
      id: "sp-2",
      title: "Checklist incompleto",
      message: "Falta cerrar el checklist de inicio en un bloque activo.",
      when: "Hace 1 h",
      module: "{area}",
      severity: "warning",
      ctaLabel: "Completar",
      ctaPath: "{areaPath}",
    },
    {
      id: "sp-3",
      title: "Comentario del jefe de area",
      message: "Se agregaron observaciones para el cierre del turno de hoy.",
      when: "Hace 2 h",
      module: "Comunicacion",
      severity: "success",
    },
  ],
  lector: [
    {
      id: "lc-1",
      title: "Nuevo informe publicado",
      message: "Hay un informe actualizado disponible para consulta en {area}.",
      when: "Hace 30 min",
      module: "Informes",
      severity: "info",
      ctaLabel: "Abrir",
      ctaPath: "/informes",
    },
    {
      id: "lc-2",
      title: "Resumen semanal disponible",
      message: "Se publico el consolidado semanal con indicadores clave.",
      when: "Hoy 09:00",
      module: "Dashboard",
      severity: "success",
    },
    {
      id: "lc-3",
      title: "Alerta informativa de {area}",
      message: "Se detectaron cambios relevantes en los datos de tu area de lectura.",
      when: "Ayer",
      module: "{area}",
      severity: "warning",
      ctaLabel: "Ver modulo",
      ctaPath: "{areaPath}",
    },
  ],
};

const SEVERITY_META: Record<
  NotificationSeverity,
  {
    icon: React.ElementType;
    card: string;
    iconColor: string;
    badge: string;
  }
> = {
  info: {
    icon: Info,
    card: "border-sky-200/80 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20",
    iconColor: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  warning: {
    icon: AlertTriangle,
    card: "border-amber-200/80 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  critical: {
    icon: ShieldAlert,
    card: "border-rose-200/80 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  success: {
    icon: CheckCircle2,
    card: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

function getAreaLabel(area?: string): string {
  if (!area) return "tu area";
  return AREA_LABELS[area] ?? area;
}

function getAreaPath(area?: string): string {
  if (!area) return "/";
  return AREA_PATHS[area] ?? "/";
}

function resolveTemplate(value: string | undefined, areaLabel: string, areaPath: string): string | undefined {
  if (!value) return value;
  return value
    .replace(/\{area\}/g, areaLabel)
    .replace(/\{areaPath\}/g, areaPath);
}

function getNotificationsByRole(role: UserRole, area?: string): RoleNotification[] {
  const areaLabel = getAreaLabel(area);
  const areaPath = getAreaPath(area);

  return ROLE_NOTIFICATIONS[role].map((item) => ({
    ...item,
    title: resolveTemplate(item.title, areaLabel, areaPath) ?? item.title,
    message: resolveTemplate(item.message, areaLabel, areaPath) ?? item.message,
    module: resolveTemplate(item.module, areaLabel, areaPath),
    ctaPath: resolveTemplate(item.ctaPath, areaLabel, areaPath),
  }));
}

export function RoleNotifications({
  className,
  title = "Notificaciones",
  maxItems = 4,
}: RoleNotificationsProps) {
  const { role, currentUser } = useRole();
  const navigate = useNavigate();

  const notifications = useMemo(
    () => getNotificationsByRole(role, currentUser?.area_asignada).slice(0, maxItems),
    [role, currentUser?.area_asignada, maxItems]
  );

  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BellRing className="w-4 h-4 text-primary" />
          {title}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {notifications.length} activas
        </span>
      </div>

      <div className="space-y-2.5">
        {notifications.map((notification) => {
          const meta = SEVERITY_META[notification.severity];
          const Icon = meta.icon;
          return (
            <div
              key={notification.id}
              className={cn("rounded-lg border px-3 py-2.5", meta.card)}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn("mt-0.5", meta.iconColor)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-foreground">
                      {notification.title}
                    </p>
                    {notification.module && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", meta.badge)}>
                        {notification.module}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {notification.when}
                    </span>
                    {notification.ctaPath && (
                      <button
                        onClick={() => navigate(notification.ctaPath!)}
                        className="text-[10px] font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
                      >
                        {notification.ctaLabel ?? "Ver"}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
