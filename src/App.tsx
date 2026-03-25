import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Configuracion from "./pages/Configuracion";
import Comercial from "./pages/Comercial";
import Informes from "./pages/Informes";
import {
  Laboratorio,
  Vivero,
  Cultivo,
  Produccion,
  RecursosHumanos,
  Cosecha,
  PostCosecha,
} from "./pages/PlaceholderPages";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Guard que redirige a /login si el usuario no está autenticado
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useRole();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guard que redirige a / si el usuario no tiene acceso al módulo
function ModuleGuard({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  const { canAccessModule } = useRole();
  if (!canAccessModule(modulo)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <ConfigProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/laboratorio" element={<ProtectedRoute><ModuleGuard modulo="laboratorio"><Laboratorio /></ModuleGuard></ProtectedRoute>} />
              <Route path="/vivero" element={<ProtectedRoute><ModuleGuard modulo="vivero"><Vivero /></ModuleGuard></ProtectedRoute>} />
              <Route path="/cultivo" element={<ProtectedRoute><ModuleGuard modulo="cultivo"><Cultivo /></ModuleGuard></ProtectedRoute>} />
              <Route path="/cosecha" element={<Navigate to="/cultivo" replace />} />
              <Route path="/post-cosecha" element={<ProtectedRoute><ModuleGuard modulo="post-cosecha"><PostCosecha /></ModuleGuard></ProtectedRoute>} />
              <Route path="/produccion" element={<Navigate to="/post-cosecha" replace />} />
              <Route path="/recursos-humanos" element={<ProtectedRoute><ModuleGuard modulo="recursos-humanos"><RecursosHumanos /></ModuleGuard></ProtectedRoute>} />
              <Route path="/comercial" element={<ProtectedRoute><ModuleGuard modulo="comercial"><Comercial /></ModuleGuard></ProtectedRoute>} />
              <Route path="/informes" element={<ProtectedRoute><ModuleGuard modulo="informes"><Informes /></ModuleGuard></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><ModuleGuard modulo="configuracion"><Configuracion /></ModuleGuard></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/gestion-usuarios" element={<Navigate to="/configuracion?tab=usuarios" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ConfigProvider>
        </RoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
