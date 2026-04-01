import { useNavigate } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Sprout,
  Leaf,
  Users,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Package,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  modulo: string;
  iconColor?: string;
  excludedRoles?: UserRole[];
}

// ─── Items de navegación ──────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { label: "Dashboard",           icon: LayoutDashboard, path: "/",                 modulo: "dashboard",         iconColor: "text-sky-400", excludedRoles: ["supervisor", "lector"] },
  { label: "Laboratorio",         icon: FlaskConical,    path: "/laboratorio",      modulo: "laboratorio",       iconColor: "text-violet-400" },
  { label: "Vivero",              icon: Sprout,          path: "/vivero",           modulo: "vivero",            iconColor: "text-emerald-400" },
  { label: "Cultivo",             icon: Leaf,            path: "/cultivo",          modulo: "cultivo",           iconColor: "text-green-400" },
  { label: "Post-cosecha",        icon: Package,         path: "/post-cosecha",     modulo: "post-cosecha",      iconColor: "text-orange-400" },
  { label: "Recursos Humanos",    icon: Users,           path: "/recursos-humanos", modulo: "recursos-humanos",  iconColor: "text-cyan-400" },
  { label: "Comercial",           icon: ShoppingCart,    path: "/comercial",        modulo: "comercial",         iconColor: "text-pink-400" },
  { label: "Informes",            icon: BarChart2,       path: "/informes",         modulo: "informes",          iconColor: "text-indigo-400" },
];

const bottomNavItems: NavItem[] = [
  { label: "Configuración", icon: Settings, path: "/configuracion", modulo: "configuracion", iconColor: "text-slate-400" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, roleName, currentUser, logout, hasPermission, currentClienteName } = useRole();
  const { hasPendingChanges } = useConfig();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const canSeeItem = (item: NavItem): boolean => {
    if (item.excludedRoles?.includes(role)) return false;
    return hasPermission(item.modulo, "ver");
  };

  const filteredNavItems    = navItems.filter(canSeeItem);
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
            <span className="text-lg font-bold text-sidebar-foreground">Agroworkin</span>
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
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "nav-item",
              isActive(item.path) && "active",
              hasPendingChanges && !isActive(item.path) && "opacity-40 pointer-events-none",
            )}
            title={collapsed ? item.label : undefined}
            onClick={e => { if (hasPendingChanges) e.preventDefault(); }}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", item.iconColor)} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {filteredBottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "nav-item",
              isActive(item.path) && "active",
              hasPendingChanges && !isActive(item.path) && "opacity-40 pointer-events-none",
            )}
            title={collapsed ? item.label : undefined}
            onClick={e => { if (hasPendingChanges) e.preventDefault(); }}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", item.iconColor)} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* User Profile */}
        <button
          onClick={() => navigate("/perfil")}
          title={collapsed ? (currentUser?.nombre ?? "Mi perfil") : "Ver mi perfil"}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg mt-4 w-full text-left",
            "bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors group/profile",
            location.pathname === "/perfil" && "ring-1 ring-sidebar-primary/40",
          )}
        >
          {/* Avatar con iniciales */}
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/80 flex items-center justify-center shrink-0 text-[11px] font-bold text-white select-none">
            {currentUser?.nombre
              ? currentUser.nombre.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
              : <User className="w-4 h-4" />
            }
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.nombre || "Usuario Demo"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{roleName}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{currentClienteName}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={e => { e.stopPropagation(); handleLogout(); }}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-destructive transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </button>
      </div>
    </aside>
  );
}
