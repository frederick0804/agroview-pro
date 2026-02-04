import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
  Leaf,
  FlaskConical,
  Factory,
  ShoppingCart,
  TrendingUp,
  Users,
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

const productionData = [
  { month: "Ene", value: 120 },
  { month: "Feb", value: 98 },
  { month: "Mar", value: 145 },
  { month: "Abr", value: 167 },
  { month: "May", value: 189 },
  { month: "Jun", value: 210 },
];

const salesData = [
  { week: "W1", ventas: 2400, metas: 2000 },
  { week: "W2", ventas: 1398, metas: 2000 },
  { week: "W3", ventas: 3800, metas: 2500 },
  { week: "W4", ventas: 3908, metas: 3000 },
  { week: "W5", ventas: 4800, metas: 3500 },
];

const statusData = [
  { name: "Saludable", value: 65, color: "hsl(142, 70%, 45%)" },
  { name: "En riesgo", value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "Crítico", value: 15, color: "hsl(0, 72%, 51%)" },
];

const quickActions = [
  {
    id: "1",
    label: "Registrar producción",
    onClick: () => console.log("Registrar producción"),
    icon: <Factory className="w-4 h-4" />,
  },
  {
    id: "2",
    label: "Nuevo pedido comercial",
    onClick: () => console.log("Nuevo pedido"),
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  {
    id: "3",
    label: "Análisis de laboratorio",
    onClick: () => console.log("Laboratorio"),
    icon: <FlaskConical className="w-4 h-4" />,
  },
];

const recentActivities = [
  {
    id: "1",
    description: "Se completó la cosecha del Bloque A-3",
    timestamp: "Hace 2 horas",
    type: "success" as const,
  },
  {
    id: "2",
    description: "Nuevo pedido registrado - Cliente: AgroExport",
    timestamp: "Hace 4 horas",
    type: "info" as const,
  },
  {
    id: "3",
    description: "Alerta: Bajo nivel de fertilizante en Vivero 2",
    timestamp: "Hace 6 horas",
    type: "warning" as const,
  },
  {
    id: "4",
    description: "Análisis de suelo completado - Lote B-1",
    timestamp: "Ayer",
    type: "success" as const,
  },
];

const Index = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Bienvenido de vuelta. Aquí está el resumen de tu operación."
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Producción Total"
          value="1,234 kg"
          change={12.5}
          changeLabel="vs mes anterior"
          icon={<Factory className="w-5 h-5" />}
        />
        <MetricCard
          title="Ventas del Mes"
          value="$89,500"
          change={8.2}
          changeLabel="vs mes anterior"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="success"
        />
        <MetricCard
          title="Cultivos Activos"
          value="24"
          change={-2}
          changeLabel="cosechados"
          icon={<Leaf className="w-5 h-5" />}
        />
        <MetricCard
          title="Empleados Activos"
          value="86"
          icon={<Users className="w-5 h-5" />}
          variant="info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Production Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">
            Producción Mensual
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={productionData}>
              <defs>
                <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 45%, 28%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 45%, 28%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(140, 15%, 85%)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(142, 45%, 28%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProduction)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Estado de Cultivos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(140, 15%, 85%)",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Chart + Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Bar Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">
            Ventas Semanales vs Metas
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="week" stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(140, 15%, 85%)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="ventas" fill="hsl(142, 45%, 28%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="metas" fill="hsl(45, 85%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sidebar with Quick Actions and Activity */}
        <div className="space-y-6">
          <QuickActions actions={quickActions} />
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
