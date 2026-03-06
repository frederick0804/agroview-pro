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
  LogOut,
  User,
  Scissors,
  Package,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type UserRole } from "@/contexts/RoleContext";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["administrador", "supervisor", "operador"] },
  { label: "Laboratorio", icon: FlaskConical, path: "/laboratorio", roles: ["administrador"] },
  { label: "Vivero", icon: Sprout, path: "/vivero", roles: ["administrador"] },
  { label: "Cultivo", icon: Leaf, path: "/cultivo", roles: ["administrador"] },
  { label: "Cosecha", icon: Scissors, path: "/cosecha", roles: ["administrador", "supervisor", "operador"] },
  { label: "Post-cosecha", icon: Package, path: "/post-cosecha", roles: ["administrador", "supervisor", "operador"] },
  { label: "Producción", icon: Factory, path: "/produccion", roles: ["administrador"] },
  { label: "Recursos Humanos", icon: Users, path: "/recursos-humanos", roles: ["administrador"] },
  { label: "Comercial", icon: ShoppingCart, path: "/comercial", roles: ["administrador"] },
  { label: "Gestión de Usuarios", icon: UserCog, path: "/gestion-usuarios", roles: ["administrador"] },
];

const bottomNavItems: NavItem[] = [
  { label: "Configuración", icon: Settings, path: "/configuracion", roles: ["administrador"] },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, roleName, currentUser, logout } = useRole();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));
  const filteredBottomItems = bottomNavItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-40",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              BlueData
            </span>
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
          "shadow-md hover:bg-primary/90 transition-colors",
          "z-50"
        )}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
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
            "bg-sidebar-accent/50"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-sidebar-muted flex items-center justify-center">
            <User className="w-4 h-4 text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.nombre || "Usuario Demo"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {roleName}
              </p>
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
