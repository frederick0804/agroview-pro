import { useEffect, useState, createContext, useContext } from "react";

// Contexto para compartir el modo edición sin prop drilling
const DashboardEditCtx = createContext<{
  editMode: boolean;
  editTab:  string;   // qué tab se está editando ("resumen" | "cultivo" | etc.)
  exitEdit: () => void;
}>({ editMode: false, editTab: "resumen", exitEdit: () => {} });
import { useInventario, getStockStatus } from "@/contexts/InventarioContext";
import { useConfig } from "@/contexts/ConfigContext";
import type { CampoOpcion } from "@/config/moduleDefinitions";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RoleNotifications } from "@/components/dashboard/RoleNotifications";
import { WeatherChatWidget } from "@/components/dashboard/WeatherChatWidget";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
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
  Settings, FileText, ClipboardList, Plus, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DashboardBuilderContent } from "./DashboardBuilder";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

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
type RightRailSlide = { id: string; label: string; content: React.ReactNode };
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

  const { editMode, editTab, exitEdit } = useContext(DashboardEditCtx);

  // Widgets configured for this specific module tab
  const allSaved     = useSavedWidgets();
  const moduleWidgets = allSaved.filter((w) => w.dashboardTab === moduleKey);

  if (!data || !tab) return null;

  // ── Modo edición inline para este módulo ─────────────────────────────────
  if (editMode && editTab === moduleKey && moduleWidgets.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            <tab.Icon className="w-4 h-4 inline-block mr-1.5 opacity-70" />
            {tab.label}
          </p>
          <button
            onClick={exitEdit}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            ✓ Salir del modo edición
          </button>
        </div>
        <DashboardBuilderContent inlineMode defaultTab={moduleKey as DashboardTab} onAfterSave={exitEdit} />
      </div>
    );
  }

  // If the user has custom widgets for this module → show ONLY those (no hardcoded charts)
  if (moduleWidgets.length > 0) {
    return (
      <div className="flex gap-5 items-start">
      {/* Izquierda — header + widgets */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            <tab.Icon className="w-4 h-4 inline-block mr-1.5 opacity-70" />
            {tab.label}
          </p>
          <a
            onClick={() => window.dispatchEvent(new CustomEvent<string>("open-dashboard-editor", { detail: moduleKey }))}
            className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> Editar disposición
          </a>
        </div>
        {/* Grid de widgets izquierda */}
        <div className="grid grid-cols-4 gap-4 auto-rows-auto">
          {moduleWidgets.map((w) => (
            <div key={w.id} style={{ height: `${(w.rows ?? 1) * 180}px` }} className={cn("min-w-0", W_COL_SPAN[w.size ?? 2])}>
              <MiniWidgetPreview w={w} />
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — mismo que Resumen: ir al módulo + notificaciones */}
      <div className="shrink-0 w-72 space-y-4">
        {tab.path && (
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-3 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${tab.color} 14%, transparent)` }}
            >
              <tab.Icon className="w-5 h-5" style={{ color: tab.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Módulo {tab.label}</p>
              <p className="text-xs text-muted-foreground">Ver y gestionar registros</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(tab.path!)}
              className="gap-1.5 text-white w-full"
              style={{ backgroundColor: tab.color }}
            >
              Abrir módulo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <RoleNotifications maxItems={4} />
      </div>
    </div>
    );
  }

  // Sin widgets configurados → estado vacío + acceso directo al módulo + notificaciones
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Panel vacío — invita a configurar widgets */}
      <div className="lg:col-span-2 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-16 flex flex-col items-center justify-center gap-4 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${tab.color} 12%, transparent)` }}
        >
          <tab.Icon className="w-7 h-7" style={{ color: tab.color }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Sin widgets para {tab.label}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
            Agrega widgets en <strong>Configuración → Dashboard</strong> para visualizar datos de este módulo aquí.
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <a
            onClick={() => window.dispatchEvent(new CustomEvent("open-dashboard-editor", { detail: moduleKey }))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" /> Configurar widgets
          </a>
          {tab.path && (
            <Button
              size="sm"
              onClick={() => navigate(tab.path!)}
              className="gap-1.5 text-white"
              style={{ backgroundColor: tab.color }}
            >
              Abrir módulo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Derecha: ir al módulo + notificaciones */}
      <div className="space-y-4">
        {tab.path && (
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${tab.color} 14%, transparent)` }}
            >
              <tab.Icon className="w-5 h-5" style={{ color: tab.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Módulo {tab.label}</p>
              <p className="text-xs text-muted-foreground">Ver y gestionar registros</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(tab.path!)}
              className="gap-1.5 text-white w-full"
              style={{ backgroundColor: tab.color }}
            >
              Abrir módulo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <RoleNotifications maxItems={4} />
      </div>
    </div>
  );
}

function RightRailCarousel({ slides }: { slides: RightRailSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const slideHeightClass = "h-[280px]";

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);

    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  if (slides.length === 0) return null;
  if (slides.length === 1) return <>{slides[0].content}</>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => api?.scrollTo(idx)}
              title={slide.label}
              aria-label={`Ir a ${slide.label}`}
              className={cn(
                "h-7 px-2.5 rounded-full text-[10px] font-medium whitespace-nowrap border transition-colors",
                activeIndex === idx
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {slide.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => api?.scrollPrev()}
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => api?.scrollNext()}
            aria-label="Siguiente slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className={cn("w-full", slideHeightClass)}>
        <CarouselContent className="-ml-0 h-full">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-0 h-full">
              <div className={cn("h-full overflow-hidden", slideHeightClass)}>
                {slide.content}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

// ─── Saved Widgets (Dashboard Builder) ───────────────────────────────────────
const DASHBOARD_STORAGE_KEY = "agro_dashboard_builder_layout";
type SavedWidgetType = "kpi" | "serie" | "distribucion";
type DateRangeKey    = "7d" | "30d" | "90d" | "ytd";
type AggregationType = "sum" | "avg" | "count" | "min" | "max";
type SavedWidget = {
  id: string; title: string; type: SavedWidgetType; moduloId: string;
  definicionId: string; campoId: string; dateRange: string; aggregation: string;
  dashboardTab?: string; size?: 1 | 2 | 3 | 4; rows?: 1 | 2 | 3; color?: string;
};

// Etiquetas de eje X según rango de fecha (espejo de DashboardBuilder)
const IDX_MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun",
                       "Jul","Ago","Sep","Oct","Nov","Dic"] as const;
const IDX_DAYS_ES   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"] as const;

function buildIdxTrendLabels(dateRange: DateRangeKey): string[] {
  const now = new Date();
  if (dateRange === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return IDX_DAYS_ES[d.getDay()];
    });
  }
  if (dateRange === "30d") return Array.from({ length: 5 }, (_, i) => `Sem ${i + 1}`);
  if (dateRange === "90d") {
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (2 - i));
      return IDX_MONTHS_ES[d.getMonth()];
    });
  }
  return Array.from({ length: now.getMonth() + 1 }, (_, i) => IDX_MONTHS_ES[i]);
}

const IDX_AGG_LABELS: Record<AggregationType, string> = {
  sum: "Suma", avg: "Promedio", count: "Conteo", min: "Mínimo", max: "Máximo",
};

const W_COL_SPAN = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4" } as const;

function stableW(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
  return min + (Math.abs(h) % (max - min));
}

const MINI_TT = {
  backgroundColor: "white",
  border: "1px solid hsl(142,15%,88%)",
  borderRadius: "8px",
  fontSize: "11px",
  padding: "4px 8px",
};

function fakeTrend(seed: string, dateRange: DateRangeKey = "30d") {
  // Genera etiquetas de eje X reales según el rango configurado
  return buildIdxTrendLabels(dateRange).map((month, i) => ({
    month,
    value: stableW(`${seed}-t${i}`, 40, 240),
  }));
}

function fakeComp(seed: string, opciones?: CampoOpcion[] | null) {
  const COLORS = ["hsl(142,70%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(213,70%,50%)"];
  // Si el campo tiene opciones (tipo Lista) → usarlas como segmentos del donut
  const cats = opciones?.length
    ? opciones.slice(0, 4).map((o) => o.label)
    : ["Categoría A", "Categoría B", "Categoría C"];
  return cats.map((name, i) => ({
    name,
    value: stableW(`${seed}-c${i}`, 15, 55),
    color: COLORS[i % COLORS.length],
  }));
}

function MiniWidgetPreview({ w }: { w: SavedWidget }) {
  // Resolvemos el campo configurado para obtener su label y opciones reales
  const { parametros } = useConfig();
  const campo = parametros.find((p) => p.id === w.campoId) ?? null;
  const campoLabel   = campo ? (campo.etiqueta_personalizada?.trim() || campo.nombre) : "";
  const campoOpciones = campo?.opciones ?? null;
  const dateRange    = (w.dateRange ?? "30d") as DateRangeKey;
  const aggLabel     = IDX_AGG_LABELS[w.aggregation as AggregationType] ?? w.aggregation;

  const seed     = `${w.id}-${w.definicionId}-${w.campoId}`;
  const modData  = MODULE_DATA[w.moduloId];
  const tabInfo  = DASHBOARD_TABS.find((t) => t.key === w.moduloId);
  const modColor = w.color ?? tabInfo?.color ?? "hsl(142,45%,28%)";
  const modLabel = tabInfo?.label ?? w.moduloId;
  const gradId   = `mg-${w.id.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
  const rows     = w.rows ?? 1;
  const metricName = campoLabel || "Valor";

  // Usar datos del módulo si existen, o generar mock con fechas y opciones reales
  const trendData  = modData?.trendData ?? fakeTrend(seed, dateRange);
  const compData   = modData?.compData  ?? fakeComp(seed, campoOpciones);
  const latest     = trendData[trendData.length - 1]?.value ?? 0;
  const prev       = trendData[trendData.length - 2]?.value ?? latest;
  const trendPct   = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0;
  const compTotal  = compData.reduce((s, d) => s + d.value, 0) || 1;
  // Scale chart height with rows (mirrors DashboardBuilder logic)
  const kpiChartH  = 52  + (rows - 1) * 68;
  const mainChartH = 88  + (rows - 1) * 110;
  const donutSize  = Math.min(mainChartH, 88 + (rows - 1) * 60);

  const badge = (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
      {modLabel}
    </span>
  );

  if (w.type === "kpi") return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate leading-tight">{w.title}</p>
        {badge}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {latest.toLocaleString("es-EC", { maximumFractionDigits: 1 })}
      </p>
      <p className={cn("text-xs font-medium", trendPct >= 0 ? "text-emerald-600" : "text-rose-500")}>
        {trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`} vs periodo anterior
      </p>
      <ResponsiveContainer width="100%" height={kpiChartH}>
        <AreaChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={modColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={modColor} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={modColor} strokeWidth={1.5}
            fill={`url(#${gradId})`} dot={false} />
          {/* Tooltip con nombre del campo configurado */}
          <Tooltip contentStyle={MINI_TT} formatter={(v) => [v, metricName]} />
        </AreaChart>
      </ResponsiveContainer>
      {/* Subtítulo: nombre del campo + tipo de agregación en español */}
      <p className="text-[10px] text-muted-foreground">
        {campoLabel ? `${campoLabel} · ` : ""}{aggLabel}
      </p>
    </div>
  );

  if (w.type === "serie") return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2 h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">{w.title}</p>
        {badge}
      </div>
      <ResponsiveContainer width="100%" height={mainChartH}>
        <BarChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="28%">
          {/* Eje X con etiquetas reales según dateRange */}
          <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
          <Bar dataKey="value" fill={modColor} radius={[3, 3, 0, 0]} opacity={0.85} />
          <Tooltip contentStyle={MINI_TT} formatter={(v) => [v, metricName]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // distribución → donut + leyenda con nombres reales del campo
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2 h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">{w.title}</p>
        {badge}
      </div>
      <div className="flex items-center gap-3">
        <ResponsiveContainer width={donutSize} height={donutSize}>
          <PieChart>
            <Pie data={compData} dataKey="value"
              innerRadius={Math.round(donutSize * 0.27)} outerRadius={Math.round(donutSize * 0.45)}
              paddingAngle={3} strokeWidth={0}>
              {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={MINI_TT} formatter={(v, name) => [v, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground">
          {compData.map((d, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}: {Math.round((d.value / compTotal) * 100)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// useSavedWidgets — reactivo: se actualiza cuando DashboardBuilder guarda
function useSavedWidgets(): SavedWidget[] {
  const read = (): SavedWidget[] => {
    try {
      const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SavedWidget[];
    } catch { /* ignore */ }
    return [];
  };

  const [widgets, setWidgets] = useState<SavedWidget[]>(read);

  useEffect(() => {
    const handler = () => setWidgets(read());
    window.addEventListener("dashboard-widgets-saved", handler);
    return () => window.removeEventListener("dashboard-widgets-saved", handler);
  }, []);

  return widgets;
}

// SavedWidgetsDashboard — widget canvas + right-rail carousel side by side
function SavedWidgetsDashboard({
  widgets,
  quickActions,
}: {
  widgets: SavedWidget[];
  quickActions: QA[];
}) {
  const carouselSlides: RightRailSlide[] = [
    {
      id: "widgets-acciones",
      label: "Acciones rápidas",
      content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
    },
    {
      id: "widgets-notificaciones",
      label: "Notificaciones",
      content: <RoleNotifications maxItems={4} className="h-full overflow-y-auto" />,
    },
  ];

  return (
    <div className="flex gap-5 items-start">

      {/* ── Left: header + widget grid ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Mi dashboard — {widgets.length} widget{widgets.length !== 1 ? "s" : ""} configurado{widgets.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Datos actualizados basados en los módulos seleccionados.</p>
          </div>
          <a
            onClick={() => window.dispatchEvent(new CustomEvent("open-dashboard-editor"))}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Editar disposición
          </a>
        </div>

        {/* Widget grid — 4-column base, each widget spans its configured size + explicit row height */}
        <div className="grid grid-cols-4 gap-4 auto-rows-auto">
          {widgets.map((w) => (
            <div key={w.id} style={{ height: `${(w.rows ?? 1) * 180}px` }} className={cn("min-w-0", W_COL_SPAN[w.size ?? 2])}>
              <MiniWidgetPreview w={w} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: carousel — always visible, never below ─────────────────── */}
      {quickActions.length > 0 && (
        <div className="shrink-0 w-72">
          <RightRailCarousel slides={carouselSlides} />
        </div>
      )}
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
  const { editMode, exitEdit } = useContext(DashboardEditCtx);
  const allWidgets    = useSavedWidgets();
  const resumenWidgets = allWidgets.filter((w) => !w.dashboardTab || w.dashboardTab === "resumen");
  const hasAny         = allWidgets.length > 0;

  // ── Modo edición in-place ─────────────────────────────────────────────────
  // Mantiene EXACTAMENTE el mismo split layout que el modo normal:
  //   izquierda (flex-1): canvas editable · derecha (w-72): carousel intacto
  if (editMode) {
    const carouselSlides: RightRailSlide[] = [
      {
        id: "edit-acciones",
        label: "Acciones rápidas",
        content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
      },
      {
        id: "edit-notificaciones",
        label: "Notificaciones",
        content: <RoleNotifications maxItems={4} className="h-full overflow-y-auto" />,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Weather siempre visible */}
        <WeatherChatWidget sectorHint={sectorHint} />

        {/* Mismo split que SavedWidgetsDashboard */}
        <div className="flex gap-5 items-start">
          {/* Izquierda — canvas editable (mismo flex-1 que el grid normal) */}
          <div className="flex-1 min-w-0">
            <DashboardBuilderContent inlineMode onAfterSave={exitEdit} />
          </div>

          {/* Derecha — carousel intacto, mismo w-72 */}
          {quickActions.length > 0 && (
            <div className="shrink-0 w-72">
              <RightRailCarousel slides={carouselSlides} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // If user has configured resumen-specific widgets → show those
  if (resumenWidgets.length > 0) {
    return (
      <div className="space-y-5">
        <WeatherChatWidget sectorHint={sectorHint} />
        <SavedWidgetsDashboard widgets={resumenWidgets} quickActions={quickActions} />
      </div>
    );
  }

  // If user has ANY widgets (but none for resumen) → show prompt instead of legacy
  if (hasAny) {
    return (
      <div className="space-y-5">
        <WeatherChatWidget sectorHint={sectorHint} />
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-16 flex flex-col items-center gap-4 text-center">
          <LayoutDashboard className="w-10 h-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-semibold text-foreground">Sin widgets para el Dashboard general</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Tienes widgets configurados en otras pestañas. Para verlos aquí, asígnalos a "Dashboard general" en la configuración.
            </p>
          </div>
          <a
            onClick={() => window.dispatchEvent(new CustomEvent("open-dashboard-editor"))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Configurar Dashboard general
          </a>
        </div>
      </div>
    );
  }

  // ── No widgets at all → show legacy hardcoded dashboard ──
  const moduleSummaries = resumenData.moduleSummaries ?? [];
  const showModuleResumen = moduleSummaries.length > 0;

  return (
    <div className="space-y-5">
      <WeatherChatWidget sectorHint={sectorHint} />
      <InventarioAlertaWidget />

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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
            <div>
              <RightRailCarousel
                slides={[
                  ...(quickActions.length > 0
                    ? [
                        {
                          id: "resumen-acciones",
                          label: "Acciones rápidas",
                          content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
                        },
                      ]
                    : []),
                  {
                    id: "resumen-notificaciones",
                    label: "Notificaciones",
                    content: <RoleNotifications maxItems={4} className="h-full overflow-y-auto" />,
                  },
                  {
                    id: "resumen-actividad",
                    label: "Actividad",
                    content: <RecentActivity activities={resumenData.activities} className="h-full overflow-y-auto" />,
                  },
                ]}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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
            <div>
              <RightRailCarousel
                slides={[
                  ...(quickActions.length > 0
                    ? [
                        {
                          id: "resumen-fallback-acciones",
                          label: "Acciones rápidas",
                          content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
                        },
                      ]
                    : []),
                  {
                    id: "resumen-fallback-notificaciones",
                    label: "Notificaciones",
                    content: <RoleNotifications maxItems={4} className="h-full overflow-y-auto" />,
                  },
                  {
                    id: "resumen-fallback-actividad",
                    label: "Actividad",
                    content: <RecentActivity activities={resumenData.activities} className="h-full overflow-y-auto" />,
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}
      {/* Empty-state prompt — only shown when no widgets are configured */}
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Dashboard personalizado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aún no hay widgets configurados. Crea widgets desde tus formularios activos y reemplaza esta vista.
          </p>
        </div>
        <a
          onClick={() => window.dispatchEvent(new CustomEvent("open-dashboard-editor"))}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" /> Configurar
        </a>
      </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mb-5">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <RecentActivity activities={data.activities} title={`Actividad reciente — ${areaLabel}`} />
        </div>
        <div>
          <RightRailCarousel
            slides={[
              ...(quickActions.length > 0
                ? [
                    {
                      id: "area-acciones",
                      label: "Acciones rápidas",
                      content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
                    },
                  ]
                : []),
              {
                id: "area-notificaciones",
                label: "Notificaciones",
                content: <RoleNotifications maxItems={4} className="h-full overflow-y-auto" />,
              },
              {
                id: "area-modulo",
                label: "Módulo",
                content: (
                  <div className="bg-card rounded-xl border border-border p-4 h-full overflow-y-auto flex flex-col items-center gap-3 text-center">
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
                ),
              },
            ]}
          />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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
        <div>
          <RightRailCarousel
            slides={[
              ...(quickActions.length > 0
                ? [
                    {
                      id: "supervisor-acciones",
                      label: "Acciones rápidas",
                      content: <QuickActions actions={quickActions} className="h-full overflow-y-auto" />,
                    },
                  ]
                : []),
              {
                id: "supervisor-notificaciones",
                label: "Notificaciones",
                content: <RoleNotifications maxItems={3} className="h-full overflow-y-auto" />,
              },
              {
                id: "supervisor-actividad",
                label: "Actividad",
                content: <RecentActivity activities={activities} className="h-full overflow-y-auto" />,
              },
            ]}
          />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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

// ─── Inventory alert widget ───────────────────────────────────────────────────
function InventarioAlertaWidget() {
  const { getAlertas } = useInventario();
  const navigate = useNavigate();
  const alertas = getAlertas()
    .sort((a, b) => {
      const sa = getStockStatus(a), sb = getStockStatus(b);
      const order = { critico: 0, bajo: 1, ok: 2 };
      return order[sa] - order[sb];
    })
    .slice(0, 3);

  if (alertas.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-400">
          <Package className="h-4 w-4" />
          Stock bajo mínimo
          <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-amber-800/60">
            {getAlertas().length}
          </span>
        </div>
        <button
          onClick={() => navigate("/inventario")}
          className="text-xs text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          Ver inventario →
        </button>
      </div>
      <div className="space-y-1.5">
        {alertas.map(p => {
          const status = getStockStatus(p);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{p.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.cantidad_actual.toLocaleString("es-CL", { maximumFractionDigits: 1 })} / {p.cantidad_minima.toLocaleString("es-CL")} {p.unidad_medida}
                </p>
              </div>
              <span className={cn(
                "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                status === "critico"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              )}>
                {status === "critico" ? "Crítico" : "Bajo"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
  const navigate   = useNavigate();
  const area       = currentUser?.area_asignada;
  const [showEditor, setShowEditor] = useState(false);
  const [editTab,    setEditTab]    = useState("resumen");

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail || "resumen";
      setEditTab(tab);
      setShowEditor(true);
    };
    window.addEventListener("open-dashboard-editor", handler);
    return () => window.removeEventListener("open-dashboard-editor", handler);
  }, []);

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
        label: "Nuevo formulario",
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
        id: "qa-prod-go-cultivo",
        label: "Mis registros de cultivo",
        icon: <Leaf className="w-4 h-4" />,
        modulo: "cultivo",
        accion: "ver",
        getPath: () => "/cultivo",
      },
      {
        id: "qa-prod-new-report",
        label: "Nuevo informe",
        icon: <FileText className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes?action=create-template",
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
        id: "qa-ja-go-module",
        label: "Ir a mi módulo",
        icon: <ArrowRight className="w-4 h-4" />,
        modulo: "dashboard",
        accion: "ver",
        getPath: ({ area: areaKey }) => (areaKey ? (AREA_PATHS[areaKey] ?? null) : null),
      },
      {
        id: "qa-ja-view-reports",
        label: "Ver informes",
        icon: <TrendingUp className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes",
      },
      {
        id: "qa-ja-new-report",
        label: "Nuevo informe",
        icon: <FileText className="w-4 h-4" />,
        modulo: "informes",
        accion: "ver",
        getPath: () => "/informes?action=create-template",
      },
      {
        id: "qa-ja-forms-config",
        label: "Formularios de mi área",
        icon: <ClipboardList className="w-4 h-4" />,
        modulo: "configuracion",
        accion: "configurar",
        getPath: () => "/configuracion?tab=formularios",
      },
    ],
    supervisor: [],
    lector: [],
  };

  const quickActions: QA[] = (quickActionsByRole[role] ?? [])
    .filter((a) => {
      if (!hasPermission(a.modulo, a.accion)) return false;
      if (role !== "productor") return true;
      if (a.modulo === "configuracion" || a.modulo === "dashboard" || a.modulo === "informes") return true;
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
    ? DASHBOARD_TABS.filter(tab => tab.key === "cultivo")
    : DASHBOARD_TABS.filter(tab =>
        tab.key === "resumen" || tab.permissionModules.some(mod => hasPermission(mod, "ver")),
      );

  // editMode se propaga via contexto — no se devuelve un return diferente aquí

  return (
    <DashboardEditCtx.Provider value={{ editMode: showEditor, editTab, exitEdit: () => setShowEditor(false) }}>
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
          description="Dashboard operativo de Cultivo para productor"
          banner={
            <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <Tractor className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Como <strong>Productor integrado</strong>, tu dashboard principal es siempre <strong>Cultivo</strong>.
                Los accesos especiales a otros módulos no cambian esta vista del dashboard.
              </span>
            </div>
          }
          quickActions={quickActions}
          sectorHint={roleSectorHint}
          tabs={dashboardTabsByPermission}
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
    </DashboardEditCtx.Provider>
  );
};

export default Index;
