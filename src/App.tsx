import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Configuracion from "./pages/Configuracion";
import Comercial from "./pages/Comercial";
import GestionUsuarios from "./pages/GestionUsuarios";
import {
  Laboratorio,
  Vivero,
  Cultivo,
  Produccion,
  RecursosHumanos,
  Cosecha,
  PostCosecha,
} from "./pages/PlaceholderPages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Guard que redirige a /login si el usuario no está autenticado
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useRole();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
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
              <Route path="/laboratorio" element={<ProtectedRoute><Laboratorio /></ProtectedRoute>} />
              <Route path="/vivero" element={<ProtectedRoute><Vivero /></ProtectedRoute>} />
              <Route path="/cultivo" element={<ProtectedRoute><Cultivo /></ProtectedRoute>} />
              <Route path="/cosecha" element={<ProtectedRoute><Cosecha /></ProtectedRoute>} />
              <Route path="/post-cosecha" element={<ProtectedRoute><PostCosecha /></ProtectedRoute>} />
              <Route path="/produccion" element={<ProtectedRoute><Produccion /></ProtectedRoute>} />
              <Route path="/recursos-humanos" element={<ProtectedRoute><RecursosHumanos /></ProtectedRoute>} />
              <Route path="/comercial" element={<ProtectedRoute><Comercial /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
              <Route path="/gestion-usuarios" element={<ProtectedRoute><GestionUsuarios /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ConfigProvider>
        </RoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
