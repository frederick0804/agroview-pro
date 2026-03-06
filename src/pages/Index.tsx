import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useRole } from "@/contexts/RoleContext";
import {
  Leaf,
  FlaskConical,
  Factory,
  ShoppingCart,
  TrendingUp,
  Users,
  Building2,
  Tractor,
  AlertCircle,
  Scissors,
  Package,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Contexto multi-tenant por rol (§3 informe V3)
const tenantContext: Record<string, { empresa: string; cultivo: string; esProductor?: boolean }> = {
  super_admin:   { empresa: "Plataforma Global",  cultivo: "Multi-cultivo" },
  cliente_admin: { empresa: "AgroBlue S.A.",       cultivo: "Arándano azul" },
  productor:     { empresa: "Ecualaso Ltda.",       cultivo: "Arándano azul", esProductor: true },
  jefe_area:     { empresa: "AgroBlue S.A.",        cultivo: "Arándano azul" },
  supervisor:    { empresa: "AgroBlue S.A.",         cultivo: "Arándano azul" },
  lector:        { empresa: "AgroBlue S.A.",         cultivo: "Arándano azul" },
};

const productionData = [
  { month: "Ene", value: 120 }, { month: "Feb", value: 98 },
  { month: "Mar", value: 145 }, { month: "Abr", value: 167 },
  { month: "May", value: 189 }, { month: "Jun", value: 210 },
];

const salesData = [
  { week: "W1", ventas: 2400, metas: 2000 }, { week: "W2", ventas: 1398, metas: 2000 },
  { week: "W3", ventas: 3800, metas: 2500 }, { week: "W4", ventas: 3908, metas: 3000 },
  { week: "W5", ventas: 4800, metas: 3500 },
];

const statusData = [
  { name: "Saludable", value: 65, color: "hsl(142, 70%, 45%)" },
  { name: "En riesgo",  value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "Crítico",   value: 15, color: "hsl(0, 72%, 51%)" },
];

// Producción aislada del productor — solo sus propios datos (§1.1 informe V3)
const productorData = [
  { month: "Ene", value: 32 }, { month: "Feb", value: 28 },
  { month: "Mar", value: 41 }, { month: "Abr", value: 38 },
  { month: "May", value: 45 }, { month: "Jun", value: 52 },
];

const recentActivities = [
  { id: "1", description: "Se completó la cosecha del Bloque A-3",            timestamp: "Hace 2 horas", type: "success" as const },
  { id: "2", description: "Nuevo pedido registrado — Cliente: AgroExport",    timestamp: "Hace 4 horas", type: "info" as const },
  { id: "3", description: "Alerta: Bajo nivel de fertilizante en Vivero 2",   timestamp: "Hace 6 horas", type: "warning" as const },
  { id: "4", description: "Análisis de suelo completado — Lote B-1",          timestamp: "Ayer",         type: "success" as const },
];

const recentActivitiesProductor = [
  { id: "1", description: "Cosecha Bloque B-2 registrada — 38 kg",            timestamp: "Hace 1 hora",  type: "success" as const },
  { id: "2", description: "Aplicación fitosanitaria aprobada por jefe de área",timestamp: "Hace 3 horas", type: "info" as const },
  { id: "3", description: "Solicitud de insumos enviada",                      timestamp: "Hoy 08:10",    type: "info" as const },
];

const Index = () => {
  const { role, roleName, hasPermission } = useRole();
  const ctx = tenantContext[role] ?? tenantContext.cliente_admin;
  const isProductor = ctx.esProductor === true;

  // Acciones rápidas filtradas por permisos del rol actual
  const allQuickActions = [
    { id: "1", label: "Registrar producción",    icon: <Factory className="w-4 h-4" />,      modulo: "produccion",   accion: "crear" as const },
    { id: "2", label: "Nuevo pedido comercial",  icon: <ShoppingCart className="w-4 h-4" />, modulo: "comercial",    accion: "crear" as const },
    { id: "3", label: "Análisis de laboratorio", icon: <FlaskConical className="w-4 h-4" />, modulo: "laboratorio",  accion: "crear" as const },
    { id: "4", label: "Registrar cosecha",        icon: <Scissors className="w-4 h-4" />,     modulo: "cosecha",      accion: "crear" as const },
    { id: "5", label: "Ingresar post-cosecha",    icon: <Package className="w-4 h-4" />,      modulo: "post-cosecha", accion: "crear" as const },
  ];
  const quickActions = allQuickActions
    .filter(a => hasPermission(a.modulo, a.accion))
    .map(({ id, label, icon }) => ({ id, label, icon, onClick: () => {} }));

  return (
    <MainLayout>
      {/* Banner de contexto multi-tenant (§3 jerarquía organizacional) */}
      <div className="flex items-center gap-3 mb-5 px-4 py-2.5 rounded-xl bg-muted/50 border border-border">
        {isProductor
          ? <Tractor className="w-4 h-4 text-amber-600 shrink-0" />
          : <Building2 className="w-4 h-4 text-primary shrink-0" />
        }
        <span className="text-sm font-semibold text-foreground">{ctx.empresa}</span>
        {isProductor && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            Productor integrado
          </span>
        )}
        <span className="text-xs text-muted-foreground">·  {ctx.cultivo}</span>
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">{roleName}</span>
      </div>

      {/* ── VISTA PRODUCTOR: datos completamente aislados ── */}
      {isProductor ? (
        <>
          <PageHeader
            title="Mi Dashboard"
            description={`Datos de tu operación — ${ctx.empresa}`}
          />

          <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Como <strong>Productor integrado</strong>, solo visualizas la información
              correspondiente a tu empresa. Los datos de otros productores están aislados.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricCard title="Mi Producción (Jun)" value="52 kg"   change={15.6} changeLabel="vs mes anterior" icon={<Leaf className="w-5 h-5" />} />
            <MetricCard title="Mis Bloques Activos" value="3"       icon={<Factory className="w-5 h-5" />} />
            <MetricCard title="Calidad Premium"     value="78%"     change={4.2}  changeLabel="vs mes anterior" icon={<TrendingUp className="w-5 h-5" />} variant="success" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Mi Producción Mensual</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={productorData}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
                  <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {quickActions.length > 0 && <QuickActions actions={quickActions} />}
              <RecentActivity activities={recentActivitiesProductor} />
            </div>
          </div>
        </>
      ) : (
        /* ── VISTA GENERAL (admin, jefe, supervisor, lector) ── */
        <>
          <PageHeader
            title="Dashboard"
            description={`Resumen de operación — ${ctx.empresa}`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard title="Producción Total"  value="1,234 kg" change={12.5} changeLabel="vs mes anterior" icon={<Factory className="w-5 h-5" />} />
            <MetricCard title="Ventas del Mes"    value="$89,500"  change={8.2}  changeLabel="vs mes anterior" icon={<TrendingUp className="w-5 h-5" />} variant="success" />
            <MetricCard title="Cultivos Activos"  value="24"       change={-2}   changeLabel="cosechados"      icon={<Leaf className="w-5 h-5" />} />
            <MetricCard title="Empleados Activos" value="86"       icon={<Users className="w-5 h-5" />} variant="info" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Producción Mensual</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={productionData}>
                  <defs>
                    <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(142, 45%, 28%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 45%, 28%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
                  <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(142, 45%, 28%)" strokeWidth={2} fillOpacity={1} fill="url(#colorProduction)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Estado de Cultivos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Ventas Semanales vs Metas</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
                  <XAxis dataKey="week" stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
                  <Legend />
                  <Bar dataKey="ventas" fill="hsl(142, 45%, 28%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="metas"  fill="hsl(45, 85%, 55%)"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-6">
              {quickActions.length > 0 && <QuickActions actions={quickActions} />}
              <RecentActivity activities={recentActivities} />
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
};

export default Index;
