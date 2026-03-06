import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Sprout,
  Leaf,
  Factory,
  Users,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  User,
  Scissors,
  Package,
  UserCog,
  FileText,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, ROLE_LEVELS, type UserRole } from "@/contexts/RoleContext";
import { DEFINICIONES } from "@/config/moduleDefinitions";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SubNavItem {
  label: string;
  nivel_minimo: number;
  /** Navigates to module page with ?tab=definiciones */
  path: string;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** Nivel jerárquico mínimo para ver este módulo (§3 del informe) */
  minLevel: number;
  /** Roles excluidos aunque tengan el nivel suficiente (§6.3) */
  excludedRoles?: UserRole[];
  /** Definiciones del módulo — se despliegan como sub-items */
  subItems?: SubNavItem[];
}

// ─── Generador de sub-items desde DEFINICIONES ────────────────────────────────
// Cada módulo carga sus definiciones desde el config compartido.
const buildSubItems = (moduloKey: string): SubNavItem[] =>
  DEFINICIONES
    .filter(d => d.modulo === moduloKey)
    .map(d => ({
      label:        d.nombre,
      nivel_minimo: d.nivel_minimo,
      path:         `/${moduloKey}?tab=def-${d.id}`,
    }));

// ─── Items de navegación ──────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { label: "Dashboard",           icon: LayoutDashboard, path: "/",                 minLevel: 1 },
  {
    label: "Laboratorio",         icon: FlaskConical,    path: "/laboratorio",      minLevel: 1,
    // Nivel 1 — lector puede ver (solo lectura según permisos en RoleContext)
    subItems: buildSubItems("laboratorio"),
  },
  { label: "Vivero",              icon: Sprout,          path: "/vivero",           minLevel: 2 },
  {
    label: "Cultivo",             icon: Leaf,            path: "/cultivo",          minLevel: 2,
    subItems: buildSubItems("cultivo"),
  },
  {
    label: "Cosecha",             icon: Scissors,        path: "/cosecha",          minLevel: 2,
    subItems: buildSubItems("cosecha"),
  },
  { label: "Post-cosecha",        icon: Package,         path: "/post-cosecha",     minLevel: 2 },
  { label: "Producción",          icon: Factory,         path: "/produccion",       minLevel: 3 },
  {
    label: "Recursos Humanos",    icon: Users,           path: "/recursos-humanos", minLevel: 3,
    subItems: buildSubItems("recursos-humanos"),
  },
  { label: "Comercial",           icon: ShoppingCart,    path: "/comercial",        minLevel: 3 },
  { label: "Gestión de Usuarios", icon: UserCog,         path: "/gestion-usuarios", minLevel: 5 },
];

const bottomNavItems: NavItem[] = [
  { label: "Configuración", icon: Settings, path: "/configuracion", minLevel: 5 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { role, roleName, hierarchyLevel, currentUser, logout } = useRole();

  // Módulos expandidos — inicializa con el módulo activo si tiene sub-items
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const active = navItems.find(
      item => item.path !== "/" && location.pathname.startsWith(item.path) && (item.subItems?.length ?? 0) > 0,
    );
    return active ? new Set([active.path]) : new Set();
  });

  const toggleModule = (path: string) =>
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Filtra según nivel jerárquico y roles excluidos (§3 y §6.3)
  const canSeeItem = (item: NavItem): boolean => {
    if (hierarchyLevel < item.minLevel) return false;
    if (item.excludedRoles?.includes(role)) return false;
    return true;
  };

  // Sub-items accesibles para el usuario actual
  const visibleSubItems = (item: NavItem): SubNavItem[] =>
    (item.subItems ?? []).filter(s => hierarchyLevel >= s.nivel_minimo);

  const filteredNavItems   = navItems.filter(canSeeItem);
  const filteredBottomItems = bottomNavItems.filter(canSeeItem);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-40",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">BlueData</span>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "shadow-md hover:bg-primary/90 transition-colors z-50",
        )}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const subItems  = visibleSubItems(item);
          const hasChildren = subItems.length > 0;
          const expanded  = expandedModules.has(item.path);
          const active    = isActive(item.path);

          return (
            <div key={item.path}>
              {/* ── Ítem principal ── */}
              <div className="flex items-center gap-0">
                <NavLink
                  to={item.path}
                  className={cn("nav-item flex-1 min-w-0", active && "active")}
                  title={collapsed ? item.label : undefined}
                  onClick={() => hasChildren && !collapsed && setExpandedModules(prev => {
                    // Expand on navigate if not already expanded
                    if (!prev.has(item.path)) {
                      const next = new Set(prev); next.add(item.path); return next;
                    }
                    return prev;
                  })}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {/* Icono de candado para items de nivel 1 con restricción — visual hint */}
                  {!collapsed && item.minLevel === 1 && item.subItems && hierarchyLevel === 1 && (
                    <Lock className="w-3 h-3 text-sidebar-foreground/40 shrink-0" title="Solo lectura" />
                  )}
                </NavLink>

                {/* Botón expand/collapse (solo en expanded sidebar y con sub-items) */}
                {!collapsed && hasChildren && (
                  <button
                    onClick={() => toggleModule(item.path)}
                    className={cn(
                      "p-1.5 rounded-md shrink-0 transition-colors",
                      "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                    title={expanded ? "Contraer" : "Expandir definiciones"}
                  >
                    {expanded
                      ? <ChevronUp   className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* ── Sub-items: definiciones del módulo ── */}
              {!collapsed && hasChildren && expanded && (
                <div className="ml-4 mt-0.5 mb-1 border-l border-sidebar-border/60 pl-2 space-y-0.5">
                  {subItems.map((sub) => (
                    <NavLink
                      key={sub.label}
                      to={sub.path}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                        "text-sidebar-foreground/65 hover:text-sidebar-foreground",
                        "hover:bg-sidebar-accent transition-colors",
                      )}
                      title={sub.label}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {filteredBottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn("nav-item", isActive(item.path) && "active")}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg mt-4",
            "bg-sidebar-accent/50",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-sidebar-muted flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.nombre || "Usuario Demo"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{roleName}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
