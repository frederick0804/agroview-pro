import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { cn } from "@/lib/utils";
import { BellRing, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRole } from "@/contexts/RoleContext";
import { SystemSettingsSheet } from "./SystemSettingsSheet";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RoleNotifications } from "@/components/dashboard/RoleNotifications";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSistema, setShowSistema] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const { role, canAccessModule } = useRole();
  const location = useLocation();

  const canOpenSystemSettings = canAccessModule("configuracion") || role === "productor";
  const isUserAccessConfigView =
    location.pathname === "/configuracion" &&
    new URLSearchParams(location.search).get("tab") === "usuarios";

  useEffect(() => {
    if (isUserAccessConfigView) setToolsCollapsed(true);
  }, [isUserAccessConfigView]);

  const pendingByRole = {
    super_admin: 4,
    cliente_admin: 4,
    productor: 4,
    jefe_area: 3,
    supervisor: 3,
    lector: 3,
  } as const;

  const pendingNotifications = pendingByRole[role] ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <RoleSelector />
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-6 pt-20">{children}</div>
      </main>

      <>
        <div
          className={cn(
            "fixed bottom-6 z-40 flex flex-col items-end gap-2",
            isUserAccessConfigView ? "left-6" : "right-6",
          )}
          aria-label="Acciones rápidas del sistema"
        >
          {!toolsCollapsed && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full shadow-lg shadow-slate-900/10 border border-border relative"
                    onClick={() => setShowNotifications(true)}
                    aria-label="Notificaciones"
                  >
                    <BellRing className="w-5 h-5" />
                    {pendingNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold leading-none inline-flex items-center justify-center ring-2 ring-background">
                        {pendingNotifications > 9 ? "9+" : pendingNotifications}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isUserAccessConfigView ? "right" : "left"}>Notificaciones por rol</TooltipContent>
              </Tooltip>

              {canOpenSystemSettings && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg shadow-primary/25"
                      onClick={() => setShowSistema(true)}
                      aria-label="Ajustes del sistema"
                    >
                      <Settings2 className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={isUserAccessConfigView ? "right" : "left"}>Ajustes del sistema</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-card border border-border shadow"
                onClick={() => setToolsCollapsed(v => !v)}
                aria-label={toolsCollapsed ? "Mostrar accesos rápidos" : "Ocultar accesos rápidos"}
              >
                {toolsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isUserAccessConfigView ? "right" : "left"}>
              {toolsCollapsed ? "Mostrar notificaciones y ajustes" : "Ocultar notificaciones y ajustes"}
            </TooltipContent>
          </Tooltip>
        </div>

        {canOpenSystemSettings && (
          <SystemSettingsSheet open={showSistema} onOpenChange={setShowSistema} />
        )}

        <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-5">
              <SheetTitle className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-primary" />
                Centro de notificaciones
              </SheetTitle>
              <SheetDescription>
                Alertas y novedades contextualizadas para tu rol activo.
              </SheetDescription>
            </SheetHeader>

            <RoleNotifications maxItems={8} className="p-0 border-0 shadow-none" />
          </SheetContent>
        </Sheet>
      </>
    </div>
  );
}
