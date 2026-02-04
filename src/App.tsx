import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Configuracion from "./pages/Configuracion";
import Comercial from "./pages/Comercial";
import {
  Laboratorio,
  Vivero,
  Cultivo,
  Produccion,
  RecursosHumanos,
} from "./pages/PlaceholderPages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/laboratorio" element={<Laboratorio />} />
          <Route path="/vivero" element={<Vivero />} />
          <Route path="/cultivo" element={<Cultivo />} />
          <Route path="/produccion" element={<Produccion />} />
          <Route path="/recursos-humanos" element={<RecursosHumanos />} />
          <Route path="/comercial" element={<Comercial />} />
          <Route path="/configuracion" element={<Configuracion />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
