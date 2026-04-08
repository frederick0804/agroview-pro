import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RoleNotifications } from "@/components/dashboard/RoleNotifications";
import { WeatherChatWidget } from "@/components/dashboard/WeatherChatWidget";
import { Button } from "@/components/ui/button";
import {
  useRole,
  PRODUCER_DASHBOARD_MODULES,
  type ProducerDashboardModuleKey,
  type UserRole,
} from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import {
  Leaf, FlaskConical, Factory, ShoppingCart, TrendingUp,
  Users, Tractor, Scissors, Package, Sprout,
  ShieldCheck, Eye, Sparkles, LayoutDashboard, ArrowRight,
  Settings, FileText, ClipboardList, Plus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type QA = { id: string; label: string; icon: React.ReactNode; onClick: () => void };
type QuickActionDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  modulo: string;
  accion: "ver" | "crear" | "editar" | "eliminar" | "exportar" | "configurar";
  roles?: UserRole[];
  getPath: (ctx: { area?: string }) => string | null;
};
type Activity = { id: string; description: string; timestamp: string; type: "info" | "success" | "warning" };
type Metric   = { title: string; value: string; change?: number; changeLabel?: string; variant?: "default" | "success" | "warning" | "info" };
type ResumenMetric = Metric & { icon: React.ReactNode };
type ModuleSummaryHighlight = { label: string; value: string };
type ModuleSummary = {
  key: string;
  label: string;
  color: string;
  latest: number;
  previous: number;
  change: number;
  warnings: number;
  highlights: ModuleSummaryHighlight[];
};
type ResumenData = {
  metrics: ResumenMetric[];
  productionTitle: string;
  productionData: { month: string; value: number }[];
  statusTitle: string;
  statusData: { name: string; value: number; color: string }[];
  barTitle: string;
  barData: { week: string; ventas: number; metas: number }[];
  activities: Activity[];
  moduleSummaries?: ModuleSummary[];
};

// ─── Area lookup (kept for AreaManagerDashboard / SupervisorDashboard) ────────
const AREA_LABELS: Record<string, string> = {
  laboratorio: "Laboratorio", vivero: "Vivero", cultivo: "Cultivo",
  cosecha: "Cosecha", "post-cosecha": "Post-cosecha", produccion: "Producción",
  "recursos-humanos": "Recursos Humanos", comercial: "Comercial",
};
const AREA_COLORS: Record<string, string> = {
  laboratorio: "hsl(263, 70%, 50%)", vivero: "hsl(152, 60%, 40%)",
  cultivo: "hsl(142, 45%, 28%)",     cosecha: "hsl(38, 92%, 50%)",
  "post-cosecha": "hsl(24, 80%, 50%)", produccion: "hsl(350, 65%, 50%)",
  "recursos-humanos": "hsl(187, 70%, 42%)", comercial: "hsl(330, 70%, 55%)",
};

const AREA_PATHS: Record<string, string> = {
  laboratorio: "/laboratorio",
  vivero: "/vivero",
  cultivo: "/cultivo",
  cosecha: "/cultivo",
  "post-cosecha": "/post-cosecha",
  produccion: "/post-cosecha",
  "recursos-humanos": "/recursos-humanos",
  comercial: "/comercial",
};

// ─── Module tabs metadata ─────────────────────────────────────────────────────
const MODULE_TABS = [
  { key: "resumen",          label: "Resumen",      Icon: LayoutDashboard, color: "hsl(142, 45%, 28%)", path: null                },
  { key: "cultivo",          label: "Cultivo",       Icon: Leaf,            color: "hsl(142, 45%, 28%)", path: "/cultivo"          },
  { key: "laboratorio",      label: "Laboratorio",   Icon: FlaskConical,    color: "hsl(263, 70%, 50%)", path: "/laboratorio"      },
  { key: "vivero",           label: "Vivero",        Icon: Sprout,          color: "hsl(152, 60%, 40%)", path: "/vivero"           },
  { key: "cosecha",          label: "Cosecha",       Icon: Scissors,        color: "hsl(38, 92%, 50%)",  path: "/cultivo"          },
  { key: "post-cosecha",     label: "Post-cosecha",  Icon: Package,         color: "hsl(24, 80%, 50%)",  path: "/post-cosecha"     },
  { key: "produccion",       label: "Producción",    Icon: Factory,         color: "hsl(350, 65%, 50%)", path: "/post-cosecha"     },
  { key: "recursos-humanos", label: "Rec. Humanos",  Icon: Users,           color: "hsl(187, 70%, 42%)", path: "/recursos-humanos" },
  { key: "comercial",        label: "Comercial",     Icon: ShoppingCart,    color: "hsl(330, 70%, 55%)", path: "/comercial"        },
];

const DASHBOARD_TABS = [
  { key: "resumen",          label: "Resumen",                    Icon: LayoutDashboard, color: "hsl(142, 45%, 28%)", path: null,             permissionModules: ["dashboard"] },
  { key: "cultivo",          label: "Cultivo",                    Icon: Leaf,            color: "hsl(142, 45%, 28%)", path: "/cultivo",       permissionModules: ["cultivo", "cosecha"] },
  { key: "laboratorio",      label: "Laboratorio",                Icon: FlaskConical,    color: "hsl(263, 70%, 50%)", path: "/laboratorio",   permissionModules: ["laboratorio"] },
  { key: "vivero",           label: "Vivero",                     Icon: Sprout,          color: "hsl(152, 60%, 40%)", path: "/vivero",        permissionModules: ["vivero"] },
  { key: "post-cosecha",     label: "Poscosecha",                Icon: Package,         color: "hsl(24, 80%, 50%)",  path: "/post-cosecha",  permissionModules: ["post-cosecha", "produccion"] },
  { key: "recursos-humanos", label: "Rec. Humanos",               Icon: Users,           color: "hsl(187, 70%, 42%)", path: "/recursos-humanos", permissionModules: ["recursos-humanos"] },
  { key: "comercial",        label: "Comercial",                  Icon: ShoppingCart,    color: "hsl(330, 70%, 55%)", path: "/comercial",     permissionModules: ["comercial"] },
];

// ─── Per-module demo data ─────────────────────────────────────────────────────
interface ModuleData {
  metrics:   Metric[];
  trendLabel: string;
  trendData: { month: string; value: number }[];
  compLabel: string;
  compData:  { name: string; value: number; color: string }[];
  activities: Activity[];
}

const MODULE_DATA: Record<string, ModuleData> = {
  cultivo: {
    metrics: [
      { title: "Bloques Activos",         value: "24",      change: -2,   changeLabel: "cosechados"                           },
      { title: "Hectáreas en Producción", value: "45.6 ha"                                                                    },
      { title: "Estado Fitosanitario",    value: "85%",     change: 3,    changeLabel: "vs mes anterior", variant: "success"  },
      { title: "Alertas Activas",         value: "3",       change: -1,   changeLabel: "vs semana pasada"                     },
    ],
    trendLabel: "Bloques en trabajo (mensual)",
    trendData: [
      { month: "Ene", value: 18 }, { month: "Feb", value: 20 },
      { month: "Mar", value: 22 }, { month: "Abr", value: 19 },
      { month: "May", value: 23 }, { month: "Jun", value: 24 },
    ],
    compLabel: "Estado de cultivos",
    compData: [
      { name: "Saludable", value: 65, color: "hsl(142, 70%, 45%)" },
      { name: "En riesgo", value: 20, color: "hsl(38, 92%, 50%)"  },
      { name: "Crítico",   value: 15, color: "hsl(0, 72%, 51%)"   },
    ],
    activities: [
      { id: "c1", description: "Riego completado — Bloque B-3",         timestamp: "Hace 1 hora",  type: "success" },
      { id: "c2", description: "Aplicación de fertilizante programada", timestamp: "Hace 3 horas", type: "info"    },
      { id: "c3", description: "Alerta: humedad baja en sector NE",     timestamp: "Hace 5 horas", type: "warning" },
      { id: "c4", description: "Poda finalizada — Hilera 12",           timestamp: "Ayer",         type: "success" },
    ],
  },
  laboratorio: {
    metrics: [
      { title: "Análisis Pendientes",   value: "12",    change: -3,   changeLabel: "vs semana pasada"                         },
      { title: "Muestras Procesadas",   value: "89",    change: 15,   changeLabel: "este mes",        variant: "success"      },
      { title: "Tasa de Calidad",       value: "96.2%", change: 1.3,  changeLabel: "vs mes anterior", variant: "success"      },
      { title: "Tiempo Prom. Análisis", value: "4.2 h", change: -0.8, changeLabel: "mejora",          variant: "success"      },
    ],
    trendLabel: "Muestras procesadas (mensual)",
    trendData: [
      { month: "Ene", value: 65 }, { month: "Feb", value: 72 },
      { month: "Mar", value: 58 }, { month: "Abr", value: 84 },
      { month: "May", value: 78 }, { month: "Jun", value: 89 },
    ],
    compLabel: "Tipos de análisis",
    compData: [
      { name: "Brix",          value: 30, color: "hsl(263, 70%, 55%)" },
      { name: "pH Suelo",      value: 25, color: "hsl(213, 70%, 55%)" },
      { name: "Conductividad", value: 28, color: "hsl(187, 65%, 48%)" },
      { name: "Firmeza",       value: 17, color: "hsl(24, 80%, 55%)"  },
    ],
    activities: [
      { id: "l1", description: "Análisis de suelo M-234 completado",  timestamp: "Hace 1 hora",  type: "success" },
      { id: "l2", description: "Nueva muestra recibida — Bloque A-1", timestamp: "Hace 3 horas", type: "info"    },
      { id: "l3", description: "Resultado fuera de rango — pH 4.2",   timestamp: "Ayer",         type: "warning" },
      { id: "l4", description: "Lote LAB-0116 en proceso",            timestamp: "Hace 2 horas", type: "info"    },
    ],
  },
  vivero: {
    metrics: [
      { title: "Plántulas en Producción", value: "15,200", change: 8,   changeLabel: "vs mes anterior", variant: "success" },
      { title: "Lotes Activos",           value: "8"                                                                        },
      { title: "Tasa de Germinación",     value: "92%",    change: 2.1, changeLabel: "vs lote anterior", variant: "success" },
      { title: "Lotes Listos",            value: "3",      change: 1,   changeLabel: "nuevos"            },
    ],
    trendLabel: "Plántulas producidas (miles)",
    trendData: [
      { month: "Ene", value: 12   }, { month: "Feb", value: 13.5 },
      { month: "Mar", value: 11   }, { month: "Abr", value: 15.2 },
      { month: "May", value: 14   }, { month: "Jun", value: 16   },
    ],
    compLabel: "Estado de lotes",
    compData: [
      { name: "Germinando",  value: 3, color: "hsl(213, 70%, 55%)" },
      { name: "Crecimiento", value: 3, color: "hsl(152, 60%, 40%)" },
      { name: "Listos",      value: 3, color: "hsl(142, 70%, 45%)" },
      { name: "Descarte",    value: 1, color: "hsl(0, 72%, 51%)"   },
    ],
    activities: [
      { id: "v1", description: "Nuevo lote sembrado — L-42",       timestamp: "Hace 2 horas", type: "success" },
      { id: "v2", description: "Germinación lote L-39 al 94%",     timestamp: "Hace 4 horas", type: "success" },
      { id: "v3", description: "Sustrato bajo en cama 5",           timestamp: "Ayer",         type: "warning" },
      { id: "v4", description: "Trasplante lote L-38 completado",  timestamp: "Hace 6 horas", type: "success" },
    ],
  },
  cosecha: {
    metrics: [
      { title: "Cosecha del Mes",      value: "1,234 kg",    change: 12.5, changeLabel: "vs mes anterior", variant: "success" },
      { title: "Bloques Cosechados",   value: "6"                                                                             },
      { title: "Rendimiento Promedio", value: "52 kg/bloque",change: 5,    changeLabel: "vs promedio",     variant: "success" },
      { title: "Personal Activo",      value: "18"                                                                            },
    ],
    trendLabel: "Producción mensual (kg)",
    trendData: [
      { month: "Ene", value: 890  }, { month: "Feb", value: 780  },
      { month: "Mar", value: 1100 }, { month: "Abr", value: 1020 },
      { month: "May", value: 1234 }, { month: "Jun", value: 1380 },
    ],
    compLabel: "Distribución por calibre",
    compData: [
      { name: "Premium",  value: 35, color: "hsl(263, 70%, 55%)" },
      { name: "Selecta",  value: 40, color: "hsl(142, 70%, 45%)" },
      { name: "Estándar", value: 18, color: "hsl(38, 92%, 50%)"  },
      { name: "Descarte", value:  7, color: "hsl(0, 72%, 51%)"   },
    ],
    activities: [
      { id: "co1", description: "Bloque A-3 cosechado — 68 kg",         timestamp: "Hace 1 hora",  type: "success" },
      { id: "co2", description: "Cuadrilla 2 asignada al Bloque B-2",   timestamp: "Hace 3 horas", type: "info"    },
      { id: "co3", description: "Rendimiento Bloque C-1 bajo meta",     timestamp: "Hace 5 horas", type: "warning" },
      { id: "co4", description: "Total del día: 234 kg acumulados",     timestamp: "Hace 2 horas", type: "info"    },
    ],
  },
  "post-cosecha": {
    metrics: [
      { title: "Lotes en Proceso",  value: "14"                                                                          },
      { title: "Calidad Premium",   value: "78%",  change: 4.2,  changeLabel: "vs mes anterior", variant: "success"  },
      { title: "Descarte",          value: "3.1%", change: -0.5, changeLabel: "mejora",          variant: "success"  },
      { title: "Lotes Exportados",  value: "9",    change: 2,    changeLabel: "este mes"          },
    ],
    trendLabel: "Lotes procesados (mensual)",
    trendData: [
      { month: "Ene", value: 8  }, { month: "Feb", value: 10 },
      { month: "Mar", value: 9  }, { month: "Abr", value: 12 },
      { month: "May", value: 11 }, { month: "Jun", value: 14 },
    ],
    compLabel: "Distribución de calidad",
    compData: [
      { name: "Premium",  value: 78, color: "hsl(142, 70%, 45%)" },
      { name: "Selecta",  value: 12, color: "hsl(187, 65%, 48%)" },
      { name: "Estándar", value:  7, color: "hsl(38, 92%, 50%)"  },
      { name: "Descarte", value:  3, color: "hsl(0, 72%, 51%)"   },
    ],
    activities: [
      { id: "pc1", description: "Lote LP-089 clasificado — 92% premium", timestamp: "Hace 1 hora",  type: "success" },
      { id: "pc2", description: "Inspección de calidad completada",       timestamp: "Hace 4 horas", type: "success" },
      { id: "pc3", description: "Descarte lote LP-085 supera límite",    timestamp: "Ayer",         type: "warning" },
      { id: "pc4", description: "Lote LP-091 listo para despacho",       timestamp: "Hace 2 horas", type: "info"    },
    ],
  },
  produccion: {
    metrics: [
      { title: "Producción Total", value: "1,234 kg", change: 12.5, changeLabel: "vs mes anterior", variant: "success" },
      { title: "Líneas Activas",   value: "3"                                                                           },
      { title: "Eficiencia",       value: "94%",      change: 2,    changeLabel: "vs mes anterior", variant: "success" },
      { title: "Downtime",         value: "2.3%",     change: -0.8, changeLabel: "mejora",          variant: "success" },
    ],
    trendLabel: "Producción mensual (kg)",
    trendData: [
      { month: "Ene", value: 900  }, { month: "Feb", value: 850  },
      { month: "Mar", value: 1100 }, { month: "Abr", value: 980  },
      { month: "May", value: 1234 }, { month: "Jun", value: 1350 },
    ],
    compLabel: "Producción por línea",
    compData: [
      { name: "Línea 1", value: 480, color: "hsl(213, 70%, 55%)" },
      { name: "Línea 2", value: 490, color: "hsl(152, 60%, 40%)" },
      { name: "Línea 3", value: 264, color: "hsl(350, 65%, 55%)" },
    ],
    activities: [
      { id: "pr1", description: "Línea 2 inició turno de mañana",      timestamp: "Hace 1 hora",  type: "info"    },
      { id: "pr2", description: "Mantenimiento Línea 1 completado",    timestamp: "Hace 4 horas", type: "success" },
      { id: "pr3", description: "Meta semanal alcanzada — 1,180 kg",   timestamp: "Hace 6 horas", type: "success" },
      { id: "pr4", description: "Registro de producción turno noche",  timestamp: "Ayer",         type: "info"    },
    ],
  },
  "recursos-humanos": {
    metrics: [
      { title: "Empleados Activos", value: "86"                                                                          },
      { title: "Asistencia Hoy",    value: "92%",  change: -1, changeLabel: "vs ayer"                                   },
      { title: "Jornales del Mes",  value: "1,240",change: 5,  changeLabel: "vs mes anterior", variant: "success"       },
      { title: "Incidencias",       value: "2",    change: -3, changeLabel: "vs semana pasada", variant: "success"      },
    ],
    trendLabel: "Jornales por mes",
    trendData: [
      { month: "Ene", value: 1100 }, { month: "Feb", value: 1050 },
      { month: "Mar", value: 1180 }, { month: "Abr", value: 1240 },
      { month: "May", value: 1200 }, { month: "Jun", value: 1280 },
    ],
    compLabel: "Tipo de contrato",
    compData: [
      { name: "Indefinido",  value: 42, color: "hsl(187, 70%, 42%)" },
      { name: "Plazo fijo",  value: 30, color: "hsl(213, 70%, 55%)" },
      { name: "Temporal",    value: 14, color: "hsl(38, 92%, 50%)"  },
    ],
    activities: [
      { id: "rh1", description: "Marcación de entrada — Pedro Soto",           timestamp: "Hace 30 min",  type: "info"    },
      { id: "rh2", description: "Contrato de M. González próximo a vencer",    timestamp: "Hace 2 horas", type: "warning" },
      { id: "rh3", description: "Nómina del mes generada",                     timestamp: "Ayer",         type: "success" },
      { id: "rh4", description: "Incidencia de seguridad resuelta",            timestamp: "Hace 3 horas", type: "success" },
    ],
  },
  comercial: {
    metrics: [
      { title: "Ventas del Mes",   value: "$89,500", change: 8.2, changeLabel: "vs mes anterior", variant: "success" },
      { title: "Pedidos Activos",  value: "12"                                                                        },
      { title: "Clientes Nuevos",  value: "3",       change: 50,  changeLabel: "vs mes anterior", variant: "success" },
      { title: "Ticket Promedio",  value: "$7,458",  change: 3.5, changeLabel: "vs mes anterior"                     },
    ],
    trendLabel: "Ventas mensuales ($)",
    trendData: [
      { month: "Ene", value: 72000 }, { month: "Feb", value: 68000 },
      { month: "Mar", value: 81000 }, { month: "Abr", value: 89500 },
      { month: "May", value: 85000 }, { month: "Jun", value: 95000 },
    ],
    compLabel: "Ventas por cliente",
    compData: [
      { name: "AgroExport",  value: 38, color: "hsl(142, 70%, 45%)" },
      { name: "FreshMarket", value: 28, color: "hsl(213, 70%, 55%)" },
      { name: "LocalCoop",   value: 22, color: "hsl(263, 70%, 55%)" },
      { name: "Otros",       value: 12, color: "hsl(220, 15%, 65%)" },
    ],
    activities: [
      { id: "cm1", description: "Pedido #1024 registrado — AgroExport",  timestamp: "Hace 1 hora",  type: "info"    },
      { id: "cm2", description: "Entrega #1021 completada — $12,500",    timestamp: "Hace 3 horas", type: "success" },
      { id: "cm3", description: "Nuevo cliente: FreshMarket registrado", timestamp: "Ayer",         type: "success" },
      { id: "cm4", description: "Meta semanal superada en 18%",          timestamp: "Hace 4 horas", type: "success" },
    ],
  },
};

// ─── Global / Resumen data ────────────────────────────────────────────────────
const globalProductionData = [
  { month: "Ene", value: 120 }, { month: "Feb", value: 98  },
  { month: "Mar", value: 145 }, { month: "Abr", value: 167 },
  { month: "May", value: 189 }, { month: "Jun", value: 210 },
];
const globalSalesData = [
  { week: "S1", ventas: 2400, metas: 2000 }, { week: "S2", ventas: 1398, metas: 2000 },
  { week: "S3", ventas: 3800, metas: 2500 }, { week: "S4", ventas: 3908, metas: 3000 },
  { week: "S5", ventas: 4800, metas: 3500 },
];
const globalStatusData = [
  { name: "Saludable", value: 65, color: "hsl(142, 70%, 45%)" },
  { name: "En riesgo",  value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "Crítico",   value: 15, color: "hsl(0, 72%, 51%)"  },
];
const globalActivities: Activity[] = [
  { id: "1", description: "Se completó la cosecha del Bloque A-3",          timestamp: "Hace 2 horas", type: "success" },
  { id: "2", description: "Nuevo pedido registrado — Cliente: AgroExport",  timestamp: "Hace 4 horas", type: "info"    },
  { id: "3", description: "Alerta: Bajo nivel de fertilizante en Vivero 2", timestamp: "Hace 6 horas", type: "warning" },
  { id: "4", description: "Análisis de suelo completado — Lote B-1",        timestamp: "Ayer",         type: "success" },
];

const GLOBAL_RESUMEN_DATA: ResumenData = {
  metrics: [
    { title: "Producción Total", value: "1,234 kg", change: 12.5, changeLabel: "vs mes anterior", icon: <Factory className="w-5 h-5" /> },
    { title: "Ventas del Mes", value: "$89,500", change: 8.2, changeLabel: "vs mes anterior", variant: "success", icon: <TrendingUp className="w-5 h-5" /> },
    { title: "Cultivos Activos", value: "24", change: -2, changeLabel: "cosechados", icon: <Leaf className="w-5 h-5" /> },
    { title: "Empleados Activos", value: "86", variant: "info", icon: <Users className="w-5 h-5" /> },
  ],
  productionTitle: "Producción Mensual",
  productionData: globalProductionData,
  statusTitle: "Estado de Cultivos",
  statusData: globalStatusData,
  barTitle: "Ventas Semanales vs Metas",
  barData: globalSalesData,
  activities: globalActivities,
};

const moduleLabelByKey: Record<string, string> = {
  ...AREA_LABELS,
  "post-cosecha": "Poscosecha",
  "recursos-humanos": "Rec. Humanos",
};

const moduleColorByKey: Record<string, string> = Object.fromEntries(
  MODULE_TABS
    .filter((tab) => tab.key !== "resumen")
    .map((tab) => [tab.key, tab.color]),
) as Record<string, string>;

const normalizeProducerModuleKey = (moduleKey: string): string => {
  if (moduleKey === "cosecha") return "cultivo";
  if (moduleKey === "produccion") return "post-cosecha";
  return moduleKey;
};

const buildProducerResumenData = (moduleKeys: string[]): ResumenData => {
  const uniqueKeys = Array.from(new Set(moduleKeys)).filter((k) => Boolean(MODULE_DATA[k]));
  const selected = uniqueKeys.map((key) => ({
    key,
    label: moduleLabelByKey[key] ?? key,
    color: moduleColorByKey[key] ?? "hsl(142, 45%, 28%)",
    data: MODULE_DATA[key],
  }));

  if (selected.length === 0) {
    return {
      metrics: [
        { title: "Módulos propios", value: "0", icon: <LayoutDashboard className="w-5 h-5" /> },
        { title: "Actividad último mes", value: "0", icon: <TrendingUp className="w-5 h-5" /> },
        { title: "Módulo líder", value: "—", icon: <ClipboardList className="w-5 h-5" /> },
        { title: "Alertas recientes", value: "0", variant: "success", icon: <Sparkles className="w-5 h-5" /> },
      ],
      productionTitle: "Actividad total mensual (módulos propios)",
      productionData: [],
      statusTitle: "",
      statusData: [],
      barTitle: "Actividad por módulo (mes actual vs anterior)",
      barData: [],
      activities: [],
      moduleSummaries: [],
    };
  }

  const monthCount = Math.max(...selected.map(({ data }) => data.trendData.length));
  const monthlyTotals = Array.from({ length: monthCount }, (_, idx) => {
    const points = selected
      .map(({ data }) => data.trendData[idx])
      .filter((p): p is { month: string; value: number } => Boolean(p));
    const month = points[0]?.month ?? `P${idx + 1}`;
    const total = points.reduce((sum, p) => sum + p.value, 0);
    return { month, value: Number(total.toFixed(1)) };
  });

  const moduleSummaries: ModuleSummary[] = selected
    .map(({ key, label, color, data }) => {
      const latest = data.trendData[data.trendData.length - 1]?.value ?? 0;
      const previous = data.trendData[data.trendData.length - 2]?.value ?? latest;
      const change = previous > 0
        ? Number((((latest - previous) / previous) * 100).toFixed(1))
        : 0;
      const warnings = data.activities.filter((a) => a.type === "warning").length;
      const highlights = data.metrics.slice(0, 3).map((m) => ({
        label: m.title,
        value: String(m.value),
      }));

      return {
        key,
        label,
        color,
        latest: Number(latest.toFixed(1)),
        previous: Number(previous.toFixed(1)),
        change,
        warnings,
        highlights,
      };
    })
    .sort((a, b) => b.latest - a.latest);

  const latestTotal = moduleSummaries.reduce((sum, m) => sum + m.latest, 0);
  const previousTotal = moduleSummaries.reduce((sum, m) => sum + m.previous, 0);
  const monthlyChange = previousTotal > 0
    ? Number((((latestTotal - previousTotal) / previousTotal) * 100).toFixed(1))
    : 0;

  const topModule = moduleSummaries[0];
  const topModuleShare = topModule && latestTotal > 0
    ? Number(((topModule.latest / latestTotal) * 100).toFixed(1))
    : 0;

  const barData = moduleSummaries.map(({ label, latest, previous }) => {
    return {
      week: label,
      ventas: Number(latest.toFixed(1)),
      metas: Number(previous.toFixed(1)),
    };
  });

  const allActivities = selected.flatMap(({ key, label, data }) =>
    data.activities.map((a) => ({
      ...a,
      id: `${key}-${a.id}`,
      description: `${label}: ${a.description}`,
    }))
  );

  const warnings = allActivities.filter((a) => a.type === "warning").length;

  return {
    metrics: [
      { title: "Módulos propios", value: String(selected.length), icon: <LayoutDashboard className="w-5 h-5" /> },
      {
        title: "Actividad último mes",
        value: latestTotal.toLocaleString("es-EC", { maximumFractionDigits: 0 }),
        change: monthlyChange,
        changeLabel: "vs mes anterior",
        variant: monthlyChange >= 0 ? "success" : "warning",
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        title: "Módulo líder",
        value: topModule ? `${topModule.label} (${topModuleShare.toFixed(1)}%)` : "—",
        variant: "info",
        icon: <ClipboardList className="w-5 h-5" />,
      },
      {
        title: "Alertas recientes",
        value: String(warnings),
        variant: warnings > 0 ? "warning" : "success",
        icon: <Sparkles className="w-5 h-5" />,
      },
    ],
    productionTitle: "Actividad total mensual (módulos propios)",
    productionData: monthlyTotals,
    statusTitle: "",
    statusData: [],
    barTitle: "Actividad por módulo (mes actual vs anterior)",
    barData,
    activities: allActivities.slice(0, 8),
    moduleSummaries,
  };
};

// ─── Shared chart styling ─────────────────────────────────────────────────────
const TT  = { backgroundColor: "white", border: "1px solid hsl(140,15%,85%)", borderRadius: "8px", fontSize: "12px" };
const AX  = { stroke: "hsl(150, 10%, 45%)" as const, fontSize: 11 };
const GRD = { strokeDasharray: "3 3", stroke: "hsl(140, 15%, 88%)" };

// ─── Module Tab Bar ───────────────────────────────────────────────────────────
function ModuleTabBar({
  active,
  onChange,
  tabs,
}: {
  active: string;
  onChange: (k: string) => void;
  tabs: typeof MODULE_TABS;
}) {
  return (
    <div className="flex gap-0.5 overflow-x-auto scrollbar-none border-b border-border mb-6 -mx-1 px-1">
      {tabs.map(({ key, label, Icon, color }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap",
              "rounded-t-lg border-b-2 -mb-px transition-all shrink-0",
              isActive
                ? "border-b-2 bg-background text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            style={isActive ? { borderBottomColor: color } : undefined}
          >
            <Icon
              className="w-3.5 h-3.5 shrink-0"
              style={isActive ? { color } : undefined}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Module Tab Content ───────────────────────────────────────────────────────
function ModuleTabContent({
  moduleKey,
  navigate,
  tabs,
}: {
  moduleKey: string;
  navigate: (p: string) => void;
  tabs: typeof MODULE_TABS;
}) {
  const tab = tabs.find(t => t.key === moduleKey) ?? MODULE_TABS.find(t => t.key === moduleKey);
  const data = MODULE_DATA[moduleKey];
  const gid  = `mg-${moduleKey}`;

  if (!data || !tab) return null;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.metrics.map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={<tab.Icon className="w-5 h-5" />}
            variant={m.variant}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{data.trendLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trendData}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={tab.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={tab.color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRD} />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="value" stroke={tab.color} strokeWidth={2} fillOpacity={1} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Composition pie */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{data.compLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.compData} cx="50%" cy="44%" innerRadius={50} outerRadius={76} paddingAngle={4} dataKey="value">
                {data.compData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-[11px] text-foreground">{v}</span>} />
              <Tooltip contentStyle={TT} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity + Go-to-module */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentActivity activities={data.activities} title={`Actividad reciente — ${tab.label}`} />
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center gap-4 text-center min-h-[160px]">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${tab.color} 14%, transparent)` }}
            >
              <tab.Icon className="w-6 h-6" style={{ color: tab.color }} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">Módulo {tab.label}</p>
              <p className="text-xs text-muted-foreground">Ver y gestionar registros</p>
            </div>
            {tab.path && (
              <Button
                size="sm"
                onClick={() => navigate(tab.path!)}
                className="gap-1.5 text-white"
                style={{ backgroundColor: tab.color }}
              >
                Abrir módulo
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <RoleNotifications maxItems={3} />
        </div>
      </div>
    </div>
  );
}

// ─── Resumen Tab Content ──────────────────────────────────────────────────────
function ResumenTabContent({
  quickActions,
  sectorHint,
  resumenData,
}: {
  quickActions: QA[];
  sectorHint?: string;
  resumenData: ResumenData;
}) {
  const moduleSummaries = resumenData.moduleSummaries ?? [];
  const showModuleResumen = moduleSummaries.length > 0;

  return (
    <div className="space-y-5">
      <WeatherChatWidget sectorHint={sectorHint} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resumenData.metrics.map((metric, idx) => (
          <MetricCard
            key={`${metric.title}-${idx}`}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeLabel={metric.changeLabel}
            icon={metric.icon}
            variant={metric.variant}
          />
        ))}
      </div>

      {showModuleResumen ? (
        <>
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Resumen por módulo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {moduleSummaries.map((module) => (
                <div key={module.key} className="rounded-lg border border-border/70 p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: module.color }}>{module.label}</p>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      module.warnings > 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    )}>
                      {module.warnings > 0 ? `${module.warnings} alerta${module.warnings > 1 ? "s" : ""}` : "Sin alertas"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mes actual: <span className="font-semibold text-foreground">{module.latest.toLocaleString("es-EC", { maximumFractionDigits: 1 })}</span>
                    {" · "}
                    Mes anterior: <span className="font-semibold text-foreground">{module.previous.toLocaleString("es-EC", { maximumFractionDigits: 1 })}</span>
                  </p>
                  <p className={cn(
                    "text-xs font-medium mt-1",
                    module.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}>
                    {module.change >= 0 ? "+" : ""}{module.change.toFixed(1)}% vs mes anterior
                  </p>
                  <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                    {module.highlights.map((item) => (
                      <div key={`${module.key}-${item.label}`} className="flex items-center justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground truncate">{item.label}</span>
                        <span className="font-medium text-foreground shrink-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">{resumenData.barTitle}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={resumenData.barData}>
                  <CartesianGrid {...GRD} />
                  <XAxis dataKey="week" {...AX} />
                  <YAxis {...AX} />
                  <Tooltip contentStyle={TT} />
                  <Legend />
                  <Bar dataKey="ventas" name="Mes actual" fill="hsl(142, 45%, 28%)" radius={[4,4,0,0]} />
                  <Bar dataKey="metas" name="Mes anterior" fill="hsl(45, 85%, 55%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {quickActions.length > 0 && <QuickActions actions={quickActions} />}
              <RoleNotifications maxItems={4} />
              <RecentActivity activities={resumenData.activities} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">{resumenData.productionTitle}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={resumenData.productionData}>
                  <defs>
                    <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(142, 45%, 28%)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="hsl(142, 45%, 28%)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRD} />
                  <XAxis dataKey="month" {...AX} />
                  <YAxis {...AX} />
                  <Tooltip contentStyle={TT} />
                  <Area type="monotone" dataKey="value" stroke="hsl(142, 45%, 28%)" strokeWidth={2} fillOpacity={1} fill="url(#gProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">{resumenData.statusTitle}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resumenData.statusData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
                  <CartesianGrid {...GRD} horizontal={false} />
                  <XAxis type="number" {...AX} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} {...AX} />
                  <Tooltip
                    contentStyle={TT}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, "Participación"]}
                  />
                  <Bar dataKey="value" name="Participación" radius={[0, 4, 4, 0]}>
                    {resumenData.statusData.map((e, i) => <Cell key={`${e.name}-${i}`} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">{resumenData.barTitle}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resumenData.barData}>
                  <CartesianGrid {...GRD} />
                  <XAxis dataKey="week" {...AX} />
                  <YAxis {...AX} />
                  <Tooltip contentStyle={TT} />
                  <Legend />
                  <Bar dataKey="ventas" name="Mes actual" fill="hsl(142, 45%, 28%)" radius={[4,4,0,0]} />
                  <Bar dataKey="metas" name="Mes anterior" fill="hsl(45, 85%, 55%)"  radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {quickActions.length > 0 && <QuickActions actions={quickActions} />}
              <RoleNotifications maxItems={4} />
              <RecentActivity activities={resumenData.activities} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tabbed Dashboard (super_admin, cliente_admin, productor) ─────────────────
function TabbedDashboard({ title, description, banner, quickActions, sectorHint, tabs, resumenData }: {
  title: string;
  description: string;
  banner?: React.ReactNode;
  quickActions: QA[];
  sectorHint?: string;
  tabs?: typeof MODULE_TABS;
  resumenData?: ResumenData;
}) {
  const availableTabs = tabs?.length ? tabs : MODULE_TABS;
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.key ?? "resumen");
  const navigate = useNavigate();

  useEffect(() => {
    if (!availableTabs.some(tab => tab.key === activeTab)) {
      setActiveTab(availableTabs[0]?.key ?? "resumen");
    }
  }, [activeTab, availableTabs]);

  return (
    <>
      <PageHeader title={title} description={description} />
      {banner}
      <ModuleTabBar active={activeTab} onChange={setActiveTab} tabs={availableTabs} />
      {activeTab === "resumen"
        ? <ResumenTabContent quickActions={quickActions} sectorHint={sectorHint} resumenData={resumenData ?? GLOBAL_RESUMEN_DATA} />
        : <ModuleTabContent moduleKey={activeTab} navigate={navigate} tabs={availableTabs} />
      }
    </>
  );
}

// ─── Jefe de Área Dashboard ───────────────────────────────────────────────────
function AreaManagerDashboard({ area, areaLabel, areaColor, quickActions }: {
  area: string; areaLabel: string; areaColor: string; quickActions: QA[];
}) {
  const data = MODULE_DATA[area];
  const tab  = MODULE_TABS.find(t => t.key === area);
  const gid  = `am-${area}`;
  const navigate = useNavigate();

  // Fallback if area doesn't match a known module
  if (!data || !tab) {
    return (
      <>
        <PageHeader title={`Dashboard — ${areaLabel}`} description="Vista operacional como Jefe de Área" />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Sin datos configurados para el área {areaLabel}.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Dashboard — ${areaLabel}`} description="Vista operacional como Jefe de Área" />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Jefe de Área</strong> de <strong>{areaLabel}</strong>, tienes gestión operacional completa:
          puedes ver, crear, editar y exportar datos de tu módulo.
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {data.metrics.map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={<tab.Icon className="w-5 h-5" />}
            variant={m.variant}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{data.trendLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trendData}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={areaColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRD} />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{data.compLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.compData} cx="50%" cy="44%" innerRadius={50} outerRadius={76} paddingAngle={4} dataKey="value">
                {data.compData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-[11px] text-foreground">{v}</span>} />
              <Tooltip contentStyle={TT} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentActivity activities={data.activities} title={`Actividad reciente — ${areaLabel}`} />
        </div>
        <div className="space-y-4">
          {quickActions.length > 0 && <QuickActions actions={quickActions} />}
          <RoleNotifications maxItems={4} />
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${areaColor} 14%, transparent)` }}>
              <tab.Icon className="w-5 h-5" style={{ color: areaColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Ir al módulo {areaLabel}</p>
              <p className="text-[11px] text-muted-foreground">Gestionar registros</p>
            </div>
            {tab.path && (
              <Button size="sm" onClick={() => navigate(tab.path!)} className="gap-1.5 text-xs text-white w-full" style={{ backgroundColor: areaColor }}>
                Abrir {areaLabel} <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Supervisor Dashboard ─────────────────────────────────────────────────────
function SupervisorDashboard({ area, areaLabel, areaColor, quickActions }: {
  area: string; areaLabel: string; areaColor: string; quickActions: QA[];
}) {
  const data = MODULE_DATA[area];
  const tab  = MODULE_TABS.find(t => t.key === area);
  const gid  = `sv-${area}`;

  const metrics = data?.metrics.slice(0, 3) ?? [];
  const activities = data?.activities ?? [];

  return (
    <>
      <PageHeader title={`Mi Área — ${areaLabel}`} description="Vista de supervisor · Ingreso de datos" />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Supervisor</strong> en <strong>{areaLabel}</strong>, puedes ver e ingresar datos en los
          formularios asignados. No puedes eliminar ni exportar registros.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {metrics.map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={tab ? <tab.Icon className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Resumen — {areaLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.trendData ?? []}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={areaColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRD} />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          {quickActions.length > 0 && <QuickActions actions={quickActions} />}
          <RoleNotifications maxItems={3} />
          <RecentActivity activities={activities} />
        </div>
      </div>
    </>
  );
}

// ─── Reader Dashboard ─────────────────────────────────────────────────────────
function ReaderDashboard({ area, areaLabel, areaColor }: {
  area: string; areaLabel: string; areaColor: string;
}) {
  const data = MODULE_DATA[area];
  const tab  = MODULE_TABS.find(t => t.key === area);
  const gid  = `rd-${area}`;

  return (
    <>
      <PageHeader title={`${areaLabel} — Solo lectura`} description="Acceso de consulta" />

      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Eye className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Como <strong>Lector</strong>, tienes acceso de solo lectura al módulo <strong>{areaLabel}</strong>.
          No puedes crear, editar ni eliminar registros.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {(data?.metrics.slice(0, 3) ?? []).map((m, i) => (
          <MetricCard
            key={i}
            title={m.title}
            value={m.value}
            change={m.change}
            changeLabel={m.changeLabel}
            icon={tab ? <tab.Icon className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tendencia — {areaLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.trendData ?? []}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={areaColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRD} />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          <RoleNotifications maxItems={3} />
          <RecentActivity activities={data?.activities ?? []} />
        </div>
      </div>
    </>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
const Index = () => {
  const {
    role,
    roleName,
    hasPermission,
    currentUser,
    getProductorDashboardModules,
  } = useRole();
  const navigate = useNavigate();
  const area      = currentUser?.area_asignada;
  const areaLabel = area ? (AREA_LABELS[area] ?? area) : "";
  const areaColor = area ? (AREA_COLORS[area] ?? "hsl(142, 45%, 28%)") : "hsl(142, 45%, 28%)";
  const roleSectorHint = "Quito, Ecuador";

  const producerDashboardModules = new Set<ProducerDashboardModuleKey>(
    role === "productor"
      ? getProductorDashboardModules(currentUser?.productorId)
      : []
  );

  const producerDashboardModulesLabel = PRODUCER_DASHBOARD_MODULES
    .filter(group => producerDashboardModules.has(group.key))
    .map(group => group.label)
    .join(", ");

  const producerOwnedDashboardModules = new Set<string>(
    PRODUCER_DASHBOARD_MODULES
      .filter(group => producerDashboardModules.has(group.key))
      .flatMap(group => group.modules)
      .map(normalizeProducerModuleKey)
  );

  const producerResumenData = buildProducerResumenData(Array.from(producerOwnedDashboardModules));

  const quickActionsByRole: Record<UserRole, QuickActionDef[]> = {
    super_admin: [
      {
        id: "qa-sa-add-user",
        label: "Añadir usuario",
        icon: <Users className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=usuarios&action=add-user",
      },
      {
        id: "qa-sa-create-form",
        label: "Nuevo formulario maestro",
        icon: <ClipboardList className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=formularios&action=create-form",
      },
      {
        id: "qa-sa-create-report-template",
        label: "Nueva plantilla de informe",
        icon: <FileText className="w-4 h-4" />,
        modulo: "informes",
        accion: "configurar",
        getPath: () => "/informes?action=create-template",
      },
      {
        id: "qa-sa-config-cultivos",
        label: "Administrar cultivos",
        icon: <Settings className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=cultivos",
      },
      {
        id: "qa-sa-user-center",
        label: "Centro de permisos",
        icon: <ShieldCheck className="w-4 h-4" />,
        modulo: "gestion-usuarios",
        accion: "ver",
        getPath: () => "/gestion-usuarios",
      },
    ],
    cliente_admin: [
      {
        id: "qa-ca-manage-user-permissions",
        label: "Gestionar permisos de usuarios",
        icon: <ShieldCheck className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "ver",
        getPath: () => "/configuracion?tab=usuarios",
      },
      {
        id: "qa-ca-create-form",
        label: "Crear formulario",
        icon: <ClipboardList className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=formularios&action=create-form",
      },
      {
        id: "qa-ca-create-report-template",
        label: "Nueva plantilla de informe",
        icon: <FileText className="w-4 h-4" />,
        modulo: "informes",
        accion: "configurar",
        getPath: () => "/informes?action=create-template",
      },
      {
        id: "qa-ca-config-cultivos",
        label: "Gestionar cultivos",
        icon: <Settings className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=cultivos",
      },
      {
        id: "qa-ca-run-reports",
        label: "Generar informes de empresa",
        icon: <TrendingUp className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes",
      },
    ],
    productor: [
      {
        id: "qa-prod-new-record-cultivo",
        label: "Nuevo registro de cultivo",
        icon: <Plus className="w-4 h-4" />,
        modulo: "cultivo",
        accion: "crear",
        getPath: () => "/cultivo?action=create",
      },
      {
        id: "qa-prod-go-cultivo",
        label: "Ver módulo de cultivo",
        icon: <Leaf className="w-4 h-4" />,
        modulo: "cultivo",
        accion: "ver",
        getPath: () => "/cultivo",
      },
      {
        id: "qa-prod-run-reports",
        label: "Generar informes",
        icon: <TrendingUp className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes",
      },
      {
        id: "qa-prod-config",
        label: "Ir a Configuración",
        icon: <Settings className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion",
      },
      {
        id: "qa-prod-create-form",
        label: "Crear formulario",
        icon: <ClipboardList className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=formularios&action=create-form",
      },
    ],
    jefe_area: [
      {
        id: "qa-ja-run-reports",
        label: "Generar informes de mi área",
        icon: <TrendingUp className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes",
      },
      {
        id: "qa-ja-view-area-forms",
        label: "Ver formularios de mi área",
        icon: <ClipboardList className="w-4 h-4" />,
        modulo: "dashboard",
        accion: "ver",
        getPath: ({ area: areaKey }) => (areaKey ? (AREA_PATHS[areaKey] ?? null) : null),
      },
      {
        id: "qa-ja-area-forms",
        label: "Ir al módulo de mi área",
        icon: <ArrowRight className="w-4 h-4" />,
        modulo: "dashboard",
        accion: "ver",
        getPath: ({ area: areaKey }) => (areaKey ? (AREA_PATHS[areaKey] ?? null) : null),
      },
      {
        id: "qa-ja-area-reports-center",
        label: "Centro de informes",
        icon: <FileText className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes",
      },
    ],
    supervisor: [],
    lector: [],
  };

  const quickActions: QA[] = (quickActionsByRole[role] ?? [])
    .filter((a) => {
      if (!hasPermission(a.modulo, a.accion)) return false;
      if (role !== "productor") return true;
      if (a.modulo === "configuracion" || a.modulo === "dashboard") return true;
      return producerOwnedDashboardModules.has(a.modulo as string);
    })
    .map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      onClick: () => {
        const path = a.getPath({ area });
        if (path) navigate(path);
      },
    }))
    .slice(0, 5);

  const dashboardTabsByPermission = role === "productor"
    ? DASHBOARD_TABS.filter(tab =>
        tab.key === "resumen" || tab.permissionModules.some(mod => producerOwnedDashboardModules.has(mod as string)),
      )
    : DASHBOARD_TABS.filter(tab =>
        tab.key === "resumen" || tab.permissionModules.some(mod => hasPermission(mod, "ver")),
      );

  return (
    <MainLayout>
      {(role === "super_admin" || role === "cliente_admin") ? (
        <TabbedDashboard
          title="Dashboard"
          description={`Resumen general de operaciones — ${roleName}`}
          quickActions={quickActions}
          sectorHint={roleSectorHint}
          tabs={dashboardTabsByPermission}
        />
      ) : role === "productor" ? (
        <TabbedDashboard
          title="Mi Dashboard"
          description="Vista de productor integrado — datos de tu empresa"
          banner={
            <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <Tractor className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Como <strong>Productor integrado</strong>, visualizas únicamente la información de tu empresa.
                Los datos de otros productores están aislados. Módulos habilitados para dashboard:
                <strong> {producerDashboardModulesLabel || "Sin módulos operativos configurados"}</strong>.
              </span>
            </div>
          }
          quickActions={quickActions}
          sectorHint={roleSectorHint}
          tabs={dashboardTabsByPermission}
          resumenData={producerResumenData}
        />
      ) : role === "jefe_area" && area ? (
        <AreaManagerDashboard area={area} areaLabel={areaLabel} areaColor={areaColor} quickActions={quickActions} />
      ) : role === "supervisor" || role === "lector" ? null
      : (
        <TabbedDashboard
          title="Dashboard"
          description="Resumen general de operaciones"
          quickActions={quickActions}
          sectorHint={roleSectorHint}
          tabs={dashboardTabsByPermission}
        />
      )}
    </MainLayout>
  );
};

export default Index;
