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
  Sprout,
  ShieldCheck,
  Eye,
  Sparkles,
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

// ─── Datos demo por área ─────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio",
  vivero: "Vivero",
  cultivo: "Cultivo",
  cosecha: "Cosecha",
  "post-cosecha": "Post-cosecha",
  produccion: "Producción",
  "recursos-humanos": "Recursos Humanos",
  comercial: "Comercial",
};

const AREA_ICONS: Record<string, React.ReactNode> = {
  laboratorio: <FlaskConical className="w-5 h-5" />,
  vivero: <Sprout className="w-5 h-5" />,
  cultivo: <Leaf className="w-5 h-5" />,
  cosecha: <Scissors className="w-5 h-5" />,
  "post-cosecha": <Package className="w-5 h-5" />,
  produccion: <Factory className="w-5 h-5" />,
  "recursos-humanos": <Users className="w-5 h-5" />,
  comercial: <ShoppingCart className="w-5 h-5" />,
};

const AREA_COLORS: Record<string, string> = {
  laboratorio: "hsl(263, 70%, 50%)",
  vivero: "hsl(152, 60%, 40%)",
  cultivo: "hsl(142, 45%, 28%)",
  cosecha: "hsl(38, 92%, 50%)",
  "post-cosecha": "hsl(24, 80%, 50%)",
  produccion: "hsl(350, 65%, 50%)",
  "recursos-humanos": "hsl(187, 70%, 42%)",
  comercial: "hsl(330, 70%, 55%)",
};

// Metrics por área (demo)
function getAreaMetrics(area: string) {
  const map: Record<string, { title: string; value: string; change?: number; changeLabel?: string }[]> = {
    laboratorio: [
      { title: "Análisis Pendientes", value: "12", change: -3, changeLabel: "vs semana pasada" },
      { title: "Muestras Procesadas", value: "89", change: 15, changeLabel: "este mes" },
      { title: "Tasa de Calidad", value: "96.2%", change: 1.3, changeLabel: "vs mes anterior" },
    ],
    vivero: [
      { title: "Plántulas en Producción", value: "15,200", change: 8, changeLabel: "vs mes anterior" },
      { title: "Lotes Activos", value: "8", },
      { title: "Tasa Germinación", value: "92%", change: 2.1, changeLabel: "vs lote anterior" },
    ],
    cultivo: [
      { title: "Bloques Activos", value: "24", change: -2, changeLabel: "cosechados" },
      { title: "Hectáreas en Producción", value: "45.6 ha", },
      { title: "Estado Fitosanitario", value: "85%", change: 3, changeLabel: "saludable" },
    ],
    cosecha: [
      { title: "Cosecha del Mes", value: "1,234 kg", change: 12.5, changeLabel: "vs mes anterior" },
      { title: "Bloques Cosechados", value: "6", },
      { title: "Rendimiento Promedio", value: "52 kg/bloque", change: 5, changeLabel: "vs promedio" },
    ],
    "post-cosecha": [
      { title: "Lotes en Proceso", value: "14", },
      { title: "Calidad Premium", value: "78%", change: 4.2, changeLabel: "vs mes anterior" },
      { title: "Descarte", value: "3.1%", change: -0.5, changeLabel: "mejora" },
    ],
    produccion: [
      { title: "Producción Total", value: "1,234 kg", change: 12.5, changeLabel: "vs mes anterior" },
      { title: "Líneas Activas", value: "3", },
      { title: "Eficiencia", value: "94%", change: 2, changeLabel: "vs mes anterior" },
    ],
    "recursos-humanos": [
      { title: "Empleados Activos", value: "86", },
      { title: "Asistencia Hoy", value: "92%", change: -1, changeLabel: "vs ayer" },
      { title: "Jornales del Mes", value: "1,240", change: 5, changeLabel: "vs mes anterior" },
    ],
    comercial: [
      { title: "Ventas del Mes", value: "$89,500", change: 8.2, changeLabel: "vs mes anterior" },
      { title: "Pedidos Activos", value: "12", },
      { title: "Clientes Nuevos", value: "3", change: 50, changeLabel: "vs mes anterior" },
    ],
  };
  return map[area] ?? map.cultivo;
}

const areaChartData = [
  { month: "Ene", value: 120 }, { month: "Feb", value: 98 },
  { month: "Mar", value: 145 }, { month: "Abr", value: 167 },
  { month: "May", value: 189 }, { month: "Jun", value: 210 },
];

const productionData = areaChartData;

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

function getAreaActivities(area: string) {
  const map: Record<string, typeof recentActivities> = {
    cultivo: [
      { id: "1", description: "Riego completado — Bloque B-3",                  timestamp: "Hace 1 hora",  type: "success" as const },
      { id: "2", description: "Aplicación de fertilizante programada",           timestamp: "Hace 3 horas", type: "info" as const },
      { id: "3", description: "Alerta: Humedad baja en sector NE",              timestamp: "Hace 5 horas", type: "warning" as const },
    ],
    vivero: [
      { id: "1", description: "Nuevo lote de plántulas sembrado — L-42",        timestamp: "Hace 2 horas", type: "success" as const },
      { id: "2", description: "Germinación lote L-39 al 94%",                   timestamp: "Hace 4 horas", type: "success" as const },
      { id: "3", description: "Sustrato bajo en cama 5",                         timestamp: "Ayer",         type: "warning" as const },
    ],
    laboratorio: [
      { id: "1", description: "Análisis de suelo M-234 completado",             timestamp: "Hace 1 hora",  type: "success" as const },
      { id: "2", description: "Nueva muestra recibida — Bloque A-1",            timestamp: "Hace 3 horas", type: "info" as const },
      { id: "3", description: "Resultado fuera de rango — pH 4.2",              timestamp: "Ayer",         type: "warning" as const },
    ],
  };
  return map[area] ?? recentActivities.slice(0, 3);
}

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const { role, roleName, hasPermission, currentUser } = useRole();
  const area = currentUser?.area_asignada;
  const areaLabel = area ? AREA_LABELS[area] ?? area : "";
  const areaColor = area ? AREA_COLORS[area] ?? "hsl(142, 45%, 28%)" : "hsl(142, 45%, 28%)";

  // Acciones rápidas filtradas por permisos del rol actual
  const allQuickActions = [
    { id: "1", label: "Registrar producción",    icon: <Factory className="w-4 h-4" />,      modulo: "produccion",   accion: "crear" as const },
    { id: "2", label: "Nuevo pedido comercial",  icon: <ShoppingCart className="w-4 h-4" />, modulo: "comercial",    accion: "crear" as const },
    { id: "3", label: "Análisis de laboratorio", icon: <FlaskConical className="w-4 h-4" />, modulo: "laboratorio",  accion: "crear" as const },
    { id: "4", label: "Registrar cosecha",        icon: <Scissors className="w-4 h-4" />,     modulo: "cosecha",      accion: "crear" as const },
    { id: "5", label: "Ingresar post-cosecha",    icon: <Package className="w-4 h-4" />,      modulo: "post-cosecha", accion: "crear" as const },
    { id: "6", label: "Registrar en cultivo",      icon: <Leaf className="w-4 h-4" />,         modulo: "cultivo",      accion: "crear" as const },
    { id: "7", label: "Registrar en vivero",       icon: <Sprout className="w-4 h-4" />,       modulo: "vivero",       accion: "crear" as const },
  ];
  const quickActions = allQuickActions
    .filter(a => hasPermission(a.modulo, a.accion))
    .map(({ id, label, icon }) => ({ id, label, icon, onClick: () => {} }));

  return (
    <MainLayout>
      {/* ── VISTA PRODUCTOR ── */}
      {role === "productor" ? (
        <ProducerDashboard
          quickActions={quickActions}
        />
      ) : role === "jefe_area" && area ? (
        <AreaManagerDashboard
          area={area}
          areaLabel={areaLabel}
          areaColor={areaColor}
          quickActions={quickActions}
        />
      ) : role === "supervisor" && area ? (
        <SupervisorDashboard
          area={area}
          areaLabel={areaLabel}
          areaColor={areaColor}
          quickActions={quickActions}
        />
      ) : role === "lector" && area ? (
        <ReaderDashboard
          area={area}
          areaLabel={areaLabel}
          areaColor={areaColor}
        />
      ) : (
        /* ── VISTA ADMIN (super_admin, cliente_admin) ── */
        <AdminDashboard
          roleName={roleName}
          quickActions={quickActions}
        />
      )}
    </MainLayout>
  );
};

// ─── Admin Dashboard (super_admin, cliente_admin) ─────────────────────────────

function AdminDashboard({ roleName, quickActions }: {
  roleName: string;
  quickActions: { id: string; label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen general de operaciones"
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
  );
}

// ─── Producer Dashboard ────────────────────────────────────────────────────────

function ProducerDashboard({ quickActions }: {
  quickActions: { id: string; label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  return (
    <>
      <PageHeader
        title="Mi Dashboard"
        description="Datos de tu operación como productor integrado"
      />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <Tractor className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Productor integrado</strong>, tienes acceso completo a todos los módulos
          pero solo visualizas la información correspondiente a tu empresa. Los datos de otros productores están aislados.
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
  );
}

// ─── Jefe de Área Dashboard ───────────────────────────────────────────────────

function AreaManagerDashboard({ area, areaLabel, areaColor, quickActions }: {
  area: string;
  areaLabel: string;
  areaColor: string;
  quickActions: { id: string; label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  const metrics = getAreaMetrics(area);
  const activities = getAreaActivities(area);
  const gradientId = `areaGradient-${area}`;

  return (
    <>
      <PageHeader
        title={`Dashboard — ${areaLabel}`}
        description={`Vista operacional como Jefe de Área`}
      />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Jefe de Área</strong> de <strong>{areaLabel}</strong>, tienes gestión operacional completa
          de este módulo: puedes ver, crear, editar y exportar datos.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={AREA_ICONS[area] ?? <Leaf className="w-5 h-5" />}
            variant={i === 2 ? "success" : undefined}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Tendencia — {areaLabel}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={areaChartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={areaColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {quickActions.length > 0 && <QuickActions actions={quickActions} />}
          <RecentActivity activities={activities} />
        </div>
      </div>
    </>
  );
}

// ─── Supervisor Dashboard ─────────────────────────────────────────────────────

function SupervisorDashboard({ area, areaLabel, areaColor, quickActions }: {
  area: string;
  areaLabel: string;
  areaColor: string;
  quickActions: { id: string; label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  const metrics = getAreaMetrics(area);
  const activities = getAreaActivities(area);

  return (
    <>
      <PageHeader
        title={`Mi Área — ${areaLabel}`}
        description="Vista de supervisor · Ingreso de datos"
      />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Supervisor</strong> en <strong>{areaLabel}</strong>, puedes ver e ingresar datos en los
          formularios asignados. No puedes eliminar ni exportar registros.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.slice(0, 3).map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={AREA_ICONS[area] ?? <Leaf className="w-5 h-5" />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Resumen — {areaLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={areaChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
              <Bar dataKey="value" fill={areaColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {quickActions.length > 0 && <QuickActions actions={quickActions} />}
          <RecentActivity activities={activities} />
        </div>
      </div>
    </>
  );
}

// ─── Reader Dashboard ─────────────────────────────────────────────────────────

function ReaderDashboard({ area, areaLabel, areaColor }: {
  area: string;
  areaLabel: string;
  areaColor: string;
}) {
  const metrics = getAreaMetrics(area);
  const activities = getAreaActivities(area);
  const gradientId = `readerGradient-${area}`;

  return (
    <>
      <PageHeader
        title={`${areaLabel} — Solo lectura`}
        description="Acceso de consulta"
      />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Eye className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Lector</strong>, tienes acceso de solo lectura al módulo <strong>{areaLabel}</strong>.
          No puedes crear, editar ni eliminar registros.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={AREA_ICONS[area] ?? <Leaf className="w-5 h-5" />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Tendencia — {areaLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaChartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={areaColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140, 15%, 88%)" />
              <XAxis dataKey="month" stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <YAxis stroke="hsl(150, 10%, 45%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <RecentActivity activities={activities} />
        </div>
      </div>
    </>
  );
}

export default Index;
