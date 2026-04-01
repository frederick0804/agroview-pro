import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRole } from "@/contexts/RoleContext";
import { SystemSettingsSheet } from "./SystemSettingsSheet";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSistema, setShowSistema] = useState(false);
  const { canAccessModule } = useRole();

  const canOpenSystemSettings = canAccessModule("configuracion");

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

      {canOpenSystemSettings && (
        <>
          <div className="fixed bottom-6 right-6 z-40">
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
              <TooltipContent side="left">Ajustes del sistema</TooltipContent>
            </Tooltip>
          </div>

          <SystemSettingsSheet open={showSistema} onOpenChange={setShowSistema} />
        </>
      )}
    </div>
  );
}
