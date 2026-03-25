import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  User, Mail, Lock, Eye, EyeOff, Shield, Building2, Tractor,
  MapPin, CheckCircle2, AlertCircle, Edit3, Save, X, LogOut,
  Layers, Settings, LayoutDashboard, FlaskConical, Sprout,
  Leaf, Package, Users, ShoppingCart, BarChart2, Key, ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (nombre: string): string => {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
};

// Solo badges pequeños — sin gradientes de banner
const ROLE_BADGE: Record<string, string> = {
  super_admin:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-700",
  cliente_admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  productor:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  jefe_area:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  supervisor:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  lector:        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600",
};

const ALL_MODULES = [
  { id: "dashboard",        label: "Dashboard",      icon: LayoutDashboard },
  { id: "laboratorio",      label: "Laboratorio",    icon: FlaskConical },
  { id: "vivero",           label: "Vivero",         icon: Sprout },
  { id: "cultivo",          label: "Cultivo",        icon: Leaf },
  { id: "post-cosecha",     label: "Post-cosecha",   icon: Package },
  { id: "recursos-humanos", label: "Rec. Humanos",   icon: Users },
  { id: "comercial",        label: "Comercial",      icon: ShoppingCart },
  { id: "informes",         label: "Informes",       icon: BarChart2 },
  { id: "configuracion",    label: "Configuración",  icon: Settings },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Perfil() {
  const navigate = useNavigate();
  const {
    currentUser, updUser, role, roleName, hierarchyLevel,
    currentClienteName, logout, hasPermission, clientes, productores,
  } = useRole();

  // ── Información personal ─────────────────────────────────────────────────
  const [editingInfo, setEditingInfo] = useState(false);
  const [draftNombre, setDraftNombre] = useState(currentUser?.nombre ?? "");
  const [draftEmail,  setDraftEmail]  = useState(currentUser?.email ?? "");

  const saveInfo = () => {
    if (!currentUser) return;
    if (!draftNombre.trim())                             { toast.error("El nombre no puede estar vacío"); return; }
    if (!draftEmail.trim() || !draftEmail.includes("@")) { toast.error("Email inválido"); return; }
    updUser(currentUser.id, { nombre: draftNombre.trim(), email: draftEmail.trim() });
    setEditingInfo(false);
    toast.success("Perfil actualizado");
  };

  const cancelInfo = () => {
    setDraftNombre(currentUser?.nombre ?? "");
    setDraftEmail(currentUser?.email ?? "");
    setEditingInfo(false);
  };

  // ── Seguridad ────────────────────────────────────────────────────────────
  const [passActual,  setPassActual]  = useState("");
  const [passNueva,   setPassNueva]   = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [showActual,  setShowActual]  = useState(false);
  const [showNueva,   setShowNueva]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const passStrength = (() => {
    if (!passNueva) return 0;
    let s = 0;
    if (passNueva.length >= 8)           s++;
    if (passNueva.length >= 12)          s++;
    if (/[A-Z]/.test(passNueva))         s++;
    if (/[0-9]/.test(passNueva))         s++;
    if (/[^A-Za-z0-9]/.test(passNueva)) s++;
    return s;
  })();

  const strengthLabel = ["", "Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"][passStrength];
  const strengthColor = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"][passStrength];

  const changePassword = () => {
    if (!currentUser) return;
    if (!passActual)                        { toast.error("Ingresa tu contraseña actual"); return; }
    if (passActual !== currentUser.password) { toast.error("Contraseña actual incorrecta"); return; }
    if (passNueva.length < 8)               { toast.error("Mínimo 8 caracteres"); return; }
    if (passNueva !== passConfirm)           { toast.error("Las contraseñas no coinciden"); return; }
    setPassLoading(true);
    setTimeout(() => {
      updUser(currentUser.id, { password: passNueva });
      setPassActual(""); setPassNueva(""); setPassConfirm("");
      setPassLoading(false);
      setShowSecurity(false);
      toast.success("Contraseña actualizada");
    }, 600);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  if (!currentUser) return null;

  const badgeClass  = ROLE_BADGE[role] ?? ROLE_BADGE.lector;
  const initials    = getInitials(currentUser.nombre);
  const productor   = productores.find(p => p.id === currentUser.productorId);
  const accesibles  = ALL_MODULES.filter(m => hasPermission(m.id, "ver"));

  const passFields = [
    { label: "Contraseña actual",    value: passActual,  set: setPassActual,  show: showActual,  toggle: () => setShowActual(v => !v) },
    { label: "Nueva contraseña",     value: passNueva,   set: setPassNueva,   show: showNueva,   toggle: () => setShowNueva(v => !v) },
    { label: "Confirmar contraseña", value: passConfirm, set: setPassConfirm, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Tarjeta de identidad ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* Franja superior sutil — usa el color configurado del sistema */}
          <div className="h-1.5 bg-primary/60" />

          <div className="p-5">
            <div className="flex items-start gap-4">

              {/* Avatar con colores del sistema */}
              <div className="shrink-0 w-14 h-14 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center select-none shadow-sm">
                {initials}
              </div>

              {/* Nombre + rol + metadatos */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                      {currentUser.nombre}
                    </h1>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                        badgeClass,
                      )}>
                        {roleName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Nivel {hierarchyLevel} de 6
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/8 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Salir
                  </button>
                </div>

                {/* Metadatos en línea */}
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 shrink-0" />
                    {currentUser.email}
                  </span>
                  {currentClienteName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {currentClienteName}
                    </span>
                  )}
                  {productor && (
                    <span className="flex items-center gap-1">
                      <Tractor className="w-3 h-3 shrink-0" />
                      {productor.nombre}
                    </span>
                  )}
                  {currentUser.area_asignada && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {currentUser.area_asignada}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Información personal ──────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-sm font-semibold">Información personal</h2>
            </div>
            {!editingInfo && (
              <button
                onClick={() => { setDraftNombre(currentUser.nombre); setDraftEmail(currentUser.email); setEditingInfo(true); }}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/70 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Editar
              </button>
            )}
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Nombre */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Nombre
              </span>
              {editingInfo ? (
                <input
                  value={draftNombre}
                  onChange={e => setDraftNombre(e.target.value)}
                  autoFocus
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:border-primary/60 focus:outline-none transition-colors"
                />
              ) : (
                <span className="text-sm font-medium text-foreground">{currentUser.nombre}</span>
              )}
            </div>

            {/* Email */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Correo
              </span>
              {editingInfo ? (
                <input
                  value={draftEmail}
                  onChange={e => setDraftEmail(e.target.value)}
                  type="email"
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:border-primary/60 focus:outline-none transition-colors"
                />
              ) : (
                <span className="text-sm text-foreground">{currentUser.email}</span>
              )}
            </div>

            {editingInfo && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveInfo}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Guardar
                </button>
                <button
                  onClick={cancelInfo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Seguridad (colapsable) ────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-xl">
          <button
            onClick={() => setShowSecurity(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              showSecurity && "rotate-90",
            )} />
          </button>

          {showSecurity && (
            <div className="border-t border-border px-5 py-4 space-y-3">
              {passFields.map(({ label, value, set, show, toggle }) => (
                <div key={label} className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm px-3 py-1.5 pr-9 rounded-lg border border-border bg-background focus:border-primary/60 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={toggle}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}

              {/* Indicador de fuerza */}
              {passNueva && (
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span />
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            i <= passStrength ? strengthColor : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{strengthLabel}</p>
                  </div>
                </div>
              )}

              {/* Coincidencia */}
              {passConfirm && (
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span />
                  <div className="flex items-center gap-1.5">
                    {passNueva === passConfirm ? (
                      <><CheckCircle2 className="w-3 h-3 text-green-500" /><span className="text-[11px] text-green-600 dark:text-green-400">Las contraseñas coinciden</span></>
                    ) : (
                      <><AlertCircle className="w-3 h-3 text-destructive" /><span className="text-[11px] text-destructive">No coinciden</span></>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <button
                  onClick={changePassword}
                  disabled={passLoading || !passActual || !passNueva || !passConfirm}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {passLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Lock className="w-3 h-3" />
                  }
                  {passLoading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Acceso y permisos ─────────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-sm font-semibold">Acceso y permisos</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Solo lectura</span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Stats en línea */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Rol",     value: roleName,                        icon: Shield },
                { label: "Nivel",   value: `${hierarchyLevel} / 6`,         icon: Layers },
                { label: "Empresa", value: currentClienteName ?? "—",        icon: Building2 },
                { label: "Área",    value: currentUser.area_asignada ?? "Global", icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted/30 border border-border/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Módulos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Módulos
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {accesibles.length} de {ALL_MODULES.length} habilitados
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {ALL_MODULES.map(({ id, label, icon: Icon }) => {
                  const on = hasPermission(id, "ver");
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center transition-colors",
                        on
                          ? "bg-primary/5 border-primary/15 text-primary"
                          : "bg-muted/20 border-border/40 text-muted-foreground/40",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className={cn(
                        "text-[10px] font-medium leading-tight",
                        !on && "line-through",
                      )}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
