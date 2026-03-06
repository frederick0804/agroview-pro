import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RoleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/laboratorio" element={<Laboratorio />} />
            <Route path="/vivero" element={<Vivero />} />
            <Route path="/cultivo" element={<Cultivo />} />
            <Route path="/cosecha" element={<Cosecha />} />
            <Route path="/post-cosecha" element={<PostCosecha />} />
            <Route path="/produccion" element={<Produccion />} />
            <Route path="/recursos-humanos" element={<RecursosHumanos />} />
            <Route path="/comercial" element={<Comercial />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/gestion-usuarios" element={<GestionUsuarios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
