/**
 * Comercial.tsx
 *
 * Módulo comercial — usa el mismo motor de formularios dinámicos que Cultivo,
 * Vivero, Laboratorio, Post-cosecha y RRHH. Todas las definiciones de campos,
 * reglas de inventario y datos demo se configuran en:
 *   - src/config/moduleDefinitions.ts   (DEFINICIONES + PARAMETROS + DATOS_DEMO)
 *   - src/contexts/InventarioContext.tsx (DEMO_FORMULARIO_MAPAS para reglas auto)
 *   - src/pages/ConfigInventario.tsx    (UI para gestionar reglas desde la app)
 *
 * Formularios activos:
 *   com-1     Ficha de Cliente Comercial  — clientes, condiciones de venta
 *   com-2     Orden de Despacho           — pedidos con total calculado (cantidad × precio)
 *   com-3     Seguimiento de Exportación  — trazabilidad de contenedores (borrador)
 *   inv-bod-1 MOVIMIENTO_BODEGA           — recepción de cajas (regla FM-002 → stock auto)
 */

import { ComercialModule } from "@/pages/PlaceholderPages";

export default ComercialModule;
