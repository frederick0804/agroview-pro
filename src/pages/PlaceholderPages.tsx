import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import {
  Download, Upload, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Pencil, Save, X, Plus, Trash2,
  FileText, Eye, EyeOff,
} from "lucide-react";
import {
  DEFINICIONES, getDefsByModulo, getParamsByDef, getDatosByDef,
  parseValores, tipoBadgeColor, tipoLabels, tipoDatoInputType,
  type ModDef, type ModDato,
} from "@/config/moduleDefinitions";

// ===================== TIPOS =====================

interface RegistroCosecha {
  id: string; fecha: string; bloque: string; variedad: string;
  pesoKg: number; cajas: number; calidad: string; operador: string; estado: string;
}
interface RegistroPostCosecha {
  id: string; fecha: string; lote: string; variedad: string;
  pesoEntrada: number; pesoSalida: number; merma: number;
  calibre: string; destino: string; estado: string;
}
interface RegistroLaboratorio {
  id: string; fecha: string; muestra: string; tipoPrueba: string;
  cultivo: string; resultado: string; unidad: string; estado: string;
}
interface RegistroVivero {
  id: string; fecha: string; variedad: string; lote: string;
  cantidadPlantas: number; etapa: string; diasGerminacion: number; porcentajeExito: number;
}
interface RegistroCultivo {
  id: string; bloque: string; variedad: string; fechaSiembra: string;
  etapa: string; areHa: number; densidad: number; proximaActividad: string;
}

// ===================== DATOS DE EJEMPLO =====================

const datosCosecha: RegistroCosecha[] = [
  { id: "1", fecha: "2025-02-01", bloque: "A-1", variedad: "Driscoll's Maravilla", pesoKg: 285, cajas: 57, calidad: "Premium",  operador: "Juan Pérez",    estado: "Aprobado"  },
  { id: "2", fecha: "2025-02-01", bloque: "A-2", variedad: "Driscoll's Maravilla", pesoKg: 312, cajas: 62, calidad: "Primera",  operador: "Ana García",    estado: "Aprobado"  },
  { id: "3", fecha: "2025-02-02", bloque: "B-1", variedad: "San Andreas",          pesoKg: 198, cajas: 40, calidad: "Premium",  operador: "Juan Pérez",    estado: "Pendiente" },
  { id: "4", fecha: "2025-02-02", bloque: "B-3", variedad: "Monterey",             pesoKg: 245, cajas: 49, calidad: "Segunda",  operador: "Roberto Silva", estado: "Aprobado"  },
  { id: "5", fecha: "2025-02-03", bloque: "C-1", variedad: "Albion",               pesoKg: 167, cajas: 33, calidad: "Primera",  operador: "Ana García",    estado: "Pendiente" },
  { id: "6", fecha: "2025-02-03", bloque: "A-3", variedad: "Driscoll's Maravilla", pesoKg: 298, cajas: 60, calidad: "Premium",  operador: "Juan Pérez",    estado: "Aprobado"  },
];
const datosPostCosecha: RegistroPostCosecha[] = [
  { id: "1", fecha: "2025-02-01", lote: "PC-001", variedad: "Driscoll's Maravilla", pesoEntrada: 597, pesoSalida: 568, merma: 4.9, calibre: "Jumbo",   destino: "Exportación", estado: "Completo"   },
  { id: "2", fecha: "2025-02-02", lote: "PC-002", variedad: "San Andreas",          pesoEntrada: 198, pesoSalida: 185, merma: 6.6, calibre: "Extra",   destino: "Nacional",    estado: "Completo"   },
  { id: "3", fecha: "2025-02-02", lote: "PC-003", variedad: "Monterey",             pesoEntrada: 245, pesoSalida: 230, merma: 6.1, calibre: "Primera", destino: "Nacional",    estado: "En proceso" },
  { id: "4", fecha: "2025-02-03", lote: "PC-004", variedad: "Albion",               pesoEntrada: 167, pesoSalida: 155, merma: 7.2, calibre: "Extra",   destino: "Exportación", estado: "Pendiente"  },
];
const datosLaboratorio: RegistroLaboratorio[] = [
  { id: "1", fecha: "2025-01-28", muestra: "LAB-0112", tipoPrueba: "Brix",          cultivo: "Fresa Maravilla",   resultado: "12.5", unidad: "°Brix", estado: "Completado" },
  { id: "2", fecha: "2025-01-28", muestra: "LAB-0113", tipoPrueba: "pH Suelo",      cultivo: "Bloque A",          resultado: "6.2",  unidad: "pH",    estado: "Completado" },
  { id: "3", fecha: "2025-01-29", muestra: "LAB-0114", tipoPrueba: "Conductividad", cultivo: "Bloque B",          resultado: "1.8",  unidad: "dS/m",  estado: "Completado" },
  { id: "4", fecha: "2025-01-30", muestra: "LAB-0115", tipoPrueba: "Firmeza",       cultivo: "Fresa San Andreas", resultado: "3.2",  unidad: "N",     estado: "En proceso" },
  { id: "5", fecha: "2025-02-01", muestra: "LAB-0116", tipoPrueba: "Pesticidas",    cultivo: "Fresa Albion",      resultado: "ND",   unidad: "ppm",   estado: "Pendiente"  },
];
const datosVivero: RegistroVivero[] = [
  { id: "1", fecha: "2025-01-05", variedad: "Driscoll's Maravilla", lote: "VIV-001", cantidadPlantas: 15000, etapa: "Trasplante listo", diasGerminacion: 12, porcentajeExito: 94.5 },
  { id: "2", fecha: "2025-01-10", variedad: "San Andreas",          lote: "VIV-002", cantidadPlantas: 10000, etapa: "Desarrollo",       diasGerminacion: 14, porcentajeExito: 91.2 },
  { id: "3", fecha: "2025-01-15", variedad: "Monterey",             lote: "VIV-003", cantidadPlantas:  8000, etapa: "Germinación",      diasGerminacion:  8, porcentajeExito: 88.0 },
  { id: "4", fecha: "2025-01-20", variedad: "Albion",               lote: "VIV-004", cantidadPlantas: 12000, etapa: "Siembra",          diasGerminacion:  0, porcentajeExito:  0   },
];
const datosCultivo: RegistroCultivo[] = [
  { id: "1", bloque: "A-1", variedad: "Driscoll's Maravilla", fechaSiembra: "2024-10-15", etapa: "Producción",           areHa: 2.5, densidad: 45000, proximaActividad: "Cosecha"          },
  { id: "2", bloque: "A-2", variedad: "Driscoll's Maravilla", fechaSiembra: "2024-10-20", etapa: "Producción",           areHa: 2.0, densidad: 44000, proximaActividad: "Fertirrigación"    },
  { id: "3", bloque: "B-1", variedad: "San Andreas",          fechaSiembra: "2024-11-01", etapa: "Floración",            areHa: 1.8, densidad: 42000, proximaActividad: "Monitoreo MIPE"    },
  { id: "4", bloque: "B-3", variedad: "Monterey",             fechaSiembra: "2024-11-10", etapa: "Producción",           areHa: 2.2, densidad: 43000, proximaActividad: "Cosecha"           },
  { id: "5", bloque: "C-1", variedad: "Albion",               fechaSiembra: "2024-12-01", etapa: "Desarrollo vegetativo",areHa: 1.5, densidad: 40000, proximaActividad: "Poda"              },
];

// ===================== COLUMNAS =====================

const columnasCosecha: Column<RegistroCosecha>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "bloque", header: "Bloque", width: "80px" },
  { key: "variedad", header: "Variedad", width: "180px" },
  { key: "pesoKg", header: "Peso (kg)", width: "100px", type: "number" },
  { key: "cajas", header: "Cajas", width: "80px", type: "number" },
  { key: "calidad", header: "Calidad", width: "110px", type: "select", options: [
    { value: "Premium", label: "Premium" }, { value: "Primera", label: "Primera" }, { value: "Segunda", label: "Segunda" },
  ]},
  { key: "operador", header: "Operador", width: "140px" },
  { key: "estado", header: "Estado", width: "110px", editable: false, render: (value) => (
    <div className="px-3 py-2">
      <Badge variant={value === "Aprobado" ? "default" : "secondary"} className="gap-1 text-xs">
        {value === "Aprobado" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{value}
      </Badge>
    </div>
  )},
];
const columnasPostCosecha: Column<RegistroPostCosecha>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "lote", header: "Lote", width: "90px" },
  { key: "variedad", header: "Variedad", width: "170px" },
  { key: "pesoEntrada", header: "Entrada (kg)", width: "110px", type: "number" },
  { key: "pesoSalida", header: "Salida (kg)", width: "110px", type: "number" },
  { key: "merma", header: "Merma %", width: "90px", editable: false, render: (value) => (
    <div className={`px-3 py-2.5 text-sm font-medium ${value > 6 ? "text-destructive" : "text-success"}`}>{value.toFixed(1)}%</div>
  )},
  { key: "calibre", header: "Calibre", width: "100px", type: "select", options: [
    { value: "Jumbo", label: "Jumbo" }, { value: "Extra", label: "Extra" },
    { value: "Primera", label: "Primera" }, { value: "Segunda", label: "Segunda" },
  ]},
  { key: "destino", header: "Destino", width: "110px", type: "select", options: [
    { value: "Exportación", label: "Exportación" }, { value: "Nacional", label: "Nacional" },
  ]},
  { key: "estado", header: "Estado", width: "110px", editable: false, render: (value) => (
    <div className="px-3 py-2">
      <Badge variant={value === "Completo" ? "default" : value === "En proceso" ? "secondary" : "outline"} className="text-xs">{value}</Badge>
    </div>
  )},
];
const columnasLab: Column<RegistroLaboratorio>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "muestra", header: "Muestra", width: "110px" },
  { key: "tipoPrueba", header: "Tipo Prueba", width: "130px" },
  { key: "cultivo", header: "Cultivo", width: "160px" },
  { key: "resultado", header: "Resultado", width: "100px" },
  { key: "unidad", header: "Unidad", width: "80px" },
  { key: "estado", header: "Estado", width: "110px", editable: false, render: (value) => (
    <div className="px-3 py-2">
      <Badge variant={value === "Completado" ? "default" : value === "En proceso" ? "secondary" : "outline"} className="text-xs">{value}</Badge>
    </div>
  )},
];
const columnasVivero: Column<RegistroVivero>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "variedad", header: "Variedad", width: "170px" },
  { key: "lote", header: "Lote", width: "90px" },
  { key: "cantidadPlantas", header: "Plantas", width: "100px", type: "number" },
  { key: "etapa", header: "Etapa", width: "140px", type: "select", options: [
    { value: "Siembra", label: "Siembra" }, { value: "Germinación", label: "Germinación" },
    { value: "Desarrollo", label: "Desarrollo" }, { value: "Trasplante listo", label: "Trasplante listo" },
  ]},
  { key: "diasGerminacion", header: "Días Germ.", width: "100px", type: "number" },
  { key: "porcentajeExito", header: "% Éxito", width: "90px", editable: false, render: (value) => (
    <div className={`px-3 py-2.5 text-sm font-medium ${value >= 90 ? "text-success" : value >= 80 ? "text-warning" : "text-destructive"}`}>
      {value > 0 ? `${value}%` : "—"}
    </div>
  )},
];
const columnasCultivo: Column<RegistroCultivo>[] = [
  { key: "bloque", header: "Bloque", width: "80px" },
  { key: "variedad", header: "Variedad", width: "170px" },
  { key: "fechaSiembra", header: "Fecha Siembra", width: "120px", type: "date" },
  { key: "etapa", header: "Etapa", width: "150px", type: "select", options: [
    { value: "Desarrollo vegetativo", label: "Desarrollo vegetativo" },
    { value: "Floración", label: "Floración" },
    { value: "Producción", label: "Producción" },
  ]},
  { key: "areHa", header: "Área (ha)", width: "90px", type: "number" },
  { key: "densidad", header: "Densidad (pl/ha)", width: "130px", type: "number" },
  { key: "proximaActividad", header: "Próxima Actividad", width: "150px" },
];

// ===================== COMPONENTE: TAB DE UNA DEFINICIÓN =====================
// Muestra los registros (CONFIG_DATOS) de una sola definición.
// Respeta permisos del rol: lector en laboratorio ve en modo lectura.

function SingleDefTab({ defId, moduloKey }: { defId: string; moduloKey: string }) {
  const { hasPermission, hierarchyLevel } = useRole();
  const def = DEFINICIONES.find(d => d.id === defId);
  if (!def) return null;

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit   = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");
  const canWrite  = canCreate || canEdit;

  if (hierarchyLevel < def.nivel_minimo) {
    return (
      <div className="bg-muted/40 rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
        No tienes acceso a esta definición. Nivel requerido: {def.nivel_minimo}.
      </div>
    );
  }

  const params = getParamsByDef(defId);
  const [datos, setDatos]               = useState<ModDato[]>(() => getDatosByDef(defId));
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [editingId,   setEditingId]     = useState<string | null>(null);
  const [editingDato, setEditingDato]   = useState<ModDato | null>(null);

  const toggleExpanded = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const startEdit = (dato: ModDato) => {
    setEditingId(dato.id);
    setEditingDato({ ...dato });
    setExpandedIds(prev => new Set([...prev, dato.id]));
  };
  const cancelEdit = () => { setEditingId(null); setEditingDato(null); };

  const saveEdit = () => {
    if (!editingDato) return;
    setDatos(prev => prev.map(d => d.id === editingDato.id ? editingDato : d));
    setEditingId(null);
    setEditingDato(null);
  };

  const updateField = (fieldName: string, value: string) => {
    if (!editingDato) return;
    const parsed = parseValores(editingDato.valores);
    parsed[fieldName] = value;
    setEditingDato({ ...editingDato, valores: JSON.stringify(parsed) });
  };

  const deleteDato = (id: string) => setDatos(prev => prev.filter(d => d.id !== id));

  const addDato = () => {
    const emptyVals: Record<string, string> = {};
    params.forEach(p => { emptyVals[p.nombre] = ""; });
    const newDato: ModDato = {
      id: String(Date.now()), definicion_id: defId,
      referencia: "", fecha: new Date().toISOString().split("T")[0],
      valores: JSON.stringify(emptyVals),
    };
    setDatos(prev => [...prev, newDato]);
    startEdit(newDato);
  };

  return (
    <div className="space-y-4">
      {/* Modo lectura */}
      {!canWrite && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Eye className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Modo lectura:</strong> Tu rol solo permite consultar registros.
            Para modificar, contacta a un usuario con nivel supervisor o superior.
          </span>
        </div>
      )}

      {/* Info de la definición */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", tipoBadgeColor[def.tipo])}>
          {tipoLabels[def.tipo]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{def.descripcion}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            v{def.version} · {params.length} campo{params.length !== 1 ? "s" : ""}:{" "}
            {params.map(p => p.nombre.replace(/_/g, " ")).join(" · ")}
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={addDato} className="h-7 text-xs shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
          </Button>
        )}
      </div>

      {/* Lista de registros */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {datos.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Sin registros.{canCreate && " Haz click en Agregar para crear el primero."}
            </p>
          ) : (
            datos.map(dato => {
              const isExpanded = expandedIds.has(dato.id);
              const isEditing  = editingId === dato.id;
              const parsedVals = parseValores(isEditing && editingDato ? editingDato.valores : dato.valores);

              return (
                <div key={dato.id}>
                  {/* Cabecera del registro */}
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors",
                    isEditing ? "bg-primary/5" : "hover:bg-muted/20",
                  )}>
                    {isEditing && editingDato ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <Input
                          value={editingDato.referencia}
                          onChange={e => setEditingDato({ ...editingDato, referencia: e.target.value })}
                          placeholder="Referencia"
                          className="h-7 text-xs w-40"
                        />
                        <input
                          type="date" value={editingDato.fecha}
                          onChange={e => setEditingDato({ ...editingDato, fecha: e.target.value })}
                          className="h-7 text-xs border border-border rounded-md px-2 bg-background"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {dato.referencia || <span className="text-muted-foreground italic">Sin referencia</span>}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{dato.fecha}</span>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={saveEdit} className="h-6 text-xs px-2.5">
                            <Save className="w-3 h-3 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="h-6 text-xs px-2">
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleExpanded(dato.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                          >
                            {isExpanded
                              ? <><EyeOff className="w-3.5 h-3.5" /> Ocultar</>
                              : <><Eye className="w-3.5 h-3.5" /> Ver campos</>}
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => startEdit(dato)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => deleteDato(dato.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Campos expandidos / editor */}
                  {(isExpanded || isEditing) && (
                    <div className={cn(
                      "px-4 pb-4 pt-3",
                      isEditing ? "bg-primary/5 border-t border-primary/10" : "bg-muted/10 border-t border-border",
                    )}>
                      {params.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin parámetros definidos.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {params.map(param => {
                            const val = isEditing && editingDato
                              ? (parseValores(editingDato.valores)[param.nombre] ?? "")
                              : (parsedVals[param.nombre] ?? "—");
                            return (
                              <div key={param.id} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <span className="capitalize">{param.nombre.replace(/_/g, " ")}</span>
                                  {param.obligatorio && <span className="text-destructive" title="Obligatorio">*</span>}
                                  <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">{param.tipo_dato}</span>
                                </p>
                                {isEditing ? (
                                  <input
                                    type={tipoDatoInputType[param.tipo_dato]}
                                    value={parseValores(editingDato!.valores)[param.nombre] ?? ""}
                                    onChange={e => updateField(param.nombre, e.target.value)}
                                    placeholder={param.nombre.replace(/_/g, " ")}
                                    className="w-full h-8 text-sm border border-border rounded-md px-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                ) : (
                                  <div className="text-sm text-foreground bg-background border border-border rounded-md px-2.5 py-1.5 min-h-[34px] truncate">
                                    {String(val)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== COMPONENTE GENÉRICO DE MÓDULO =====================

function ModulePage<T extends { id: string }>({
  title,
  moduloKey,
  initialData,
  columns,
  newRow,
  tabs,
  withDefiniciones = false,
}: {
  title: string;
  moduloKey: string;
  initialData: T[];
  columns: Column<T>[];
  newRow: () => T;
  tabs?: { value: string; label: string; content?: React.ReactNode }[];
  withDefiniciones?: boolean;
}) {
  const { hasPermission, roleName, hierarchyLevel } = useRole();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<T[]>(initialData);

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit   = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");
  const canExport = hasPermission(moduloKey, "exportar");

  // Tabs de definiciones — uno por cada ModDef accesible del módulo
  const defTabs = withDefiniciones
    ? getDefsByModulo(moduloKey)
        .filter(d => hierarchyLevel >= d.nivel_minimo)
        .map(d => ({
          value:   `def-${d.id}`,
          label:   d.nombre,
          content: <SingleDefTab defId={d.id} moduloKey={moduloKey} />,
        }))
    : [];

  // Todos los tabs: operativos + definiciones
  const allTabs = [...(tabs ?? []), ...defTabs];

  // Tab activo — sincronizado con ?tab= en la URL
  const urlTab = searchParams.get("tab");
  const isKnownTab = (t: string) =>
    allTabs.some(tab => tab.value === t) || t.startsWith("def-");

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab && isKnownTab(urlTab)) return urlTab;
    return allTabs[0]?.value ?? "registros";
  });

  useEffect(() => {
    if (urlTab && isKnownTab(urlTab)) setActiveTab(urlTab);
  }, [urlTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = (rowIndex: number, key: keyof T, value: unknown) => {
    if (!canEdit && !canCreate) return;
    setData(prev => { const updated = [...prev]; updated[rowIndex] = { ...updated[rowIndex], [key]: value }; return updated; });
  };
  const handleDelete = canDelete
    ? (rowIndex: number) => setData(prev => prev.filter((_, i) => i !== rowIndex))
    : undefined;
  const handleAdd = canCreate ? () => setData(prev => [...prev, newRow()]) : undefined;

  const adjustedColumns = columns.map(col => ({
    ...col, editable: col.editable === false ? false : canEdit || canCreate,
  }));

  return (
    <MainLayout>
      <PageHeader
        title={title}
        description={`Módulo de ${title} — Rol: ${roleName}`}
        actions={
          <div className="flex gap-2">
            {canExport && (
              <>
                <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Importar</Button>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
              </>
            )}
          </div>
        }
      />

      {allTabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
            {allTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* Primer tab operativo → EditableTable */}
          {tabs && tabs[0] && (
            <TabsContent value={tabs[0].value}>
              <EditableTable
                title={`Registros de ${title}`}
                data={data}
                columns={adjustedColumns}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAdd={handleAdd}
              />
            </TabsContent>
          )}

          {/* Resto de tabs operativos */}
          {tabs?.slice(1).map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content || (
                <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                  {tab.label} — Próximamente
                </div>
              )}
            </TabsContent>
          ))}

          {/* Tabs de definiciones (una por formulario) */}
          {defTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <EditableTable
          title={`Registros de ${title}`}
          data={data}
          columns={adjustedColumns}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      )}
    </MainLayout>
  );
}

// ===================== PÁGINAS EXPORTADAS =====================

export const Laboratorio = () => (
  <ModulePage
    title="Laboratorio"
    moduloKey="laboratorio"
    initialData={datosLaboratorio}
    columns={columnasLab}
    newRow={() => ({
      id: String(Date.now()), fecha: new Date().toISOString().split("T")[0],
      muestra: `LAB-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      tipoPrueba: "", cultivo: "", resultado: "", unidad: "", estado: "Pendiente",
    })}
    tabs={[
      { value: "analisis",  label: "Análisis" },
      { value: "muestras",  label: "Muestras Pendientes" },
      { value: "historico", label: "Histórico" },
    ]}
    withDefiniciones
  />
);

export const Vivero = () => (
  <ModulePage
    title="Vivero"
    moduloKey="vivero"
    initialData={datosVivero}
    columns={columnasVivero}
    newRow={() => ({
      id: String(Date.now()), fecha: new Date().toISOString().split("T")[0],
      variedad: "", lote: `VIV-${String(Math.floor(Math.random() * 900) + 100)}`,
      cantidadPlantas: 0, etapa: "Siembra", diasGerminacion: 0, porcentajeExito: 0,
    })}
    tabs={[
      { value: "lotes",      label: "Lotes Activos" },
      { value: "trasplante", label: "Programación Trasplante" },
    ]}
  />
);

export const Cultivo = () => (
  <ModulePage
    title="Cultivo"
    moduloKey="cultivo"
    initialData={datosCultivo}
    columns={columnasCultivo}
    newRow={() => ({
      id: String(Date.now()), bloque: "", variedad: "",
      fechaSiembra: new Date().toISOString().split("T")[0],
      etapa: "Desarrollo vegetativo", areHa: 0, densidad: 0, proximaActividad: "",
    })}
    tabs={[
      { value: "bloques",       label: "Bloques" },
      { value: "fitosanitario", label: "Aplicaciones Fitosanitarias" },
      { value: "mipe",          label: "MIPE" },
    ]}
    withDefiniciones
  />
);

export const Produccion = () => {
  const { roleName } = useRole();
  return (
    <MainLayout>
      <PageHeader title="Producción" description={`Módulo de Producción — Rol: ${roleName}`} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Producción Semanal</p>
          <p className="text-2xl font-bold text-foreground mt-1">1,505 kg</p>
          <p className="text-xs text-success mt-1">▲ 8.3% vs semana anterior</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Rendimiento Promedio</p>
          <p className="text-2xl font-bold text-foreground mt-1">12.4 kg/m²</p>
          <p className="text-xs text-muted-foreground mt-1">Meta: 13.0 kg/m²</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Merma Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">5.8%</p>
          <p className="text-xs text-warning mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Por encima del objetivo (5%)
          </p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        Detalle de producción por variedad y período — Próximamente
      </div>
    </MainLayout>
  );
};

// ── Recursos Humanos ─────────────────────────────────────────────────────────

const fichaPersonal = [
  { id:"1", rut:"12.345.678-9", nombre:"Pedro Soto",   cargo:"Cosechador",  contrato:"Plazo fijo", ingreso:"2024-03-01", estado:"Activo"  },
  { id:"2", rut:"11.222.333-4", nombre:"Carmen Díaz",  cargo:"Cosechadora", contrato:"Indefinido", ingreso:"2023-07-15", estado:"Activo"  },
  { id:"3", rut:"9.876.543-2",  nombre:"Luis Morales", cargo:"Supervisor",  contrato:"Indefinido", ingreso:"2022-01-10", estado:"Activo"  },
  { id:"4", rut:"14.567.890-1", nombre:"Ana Fuentes",  cargo:"Cosechadora", contrato:"Plazo fijo", ingreso:"2024-09-01", estado:"Inactivo"},
  { id:"5", rut:"16.234.567-8", nombre:"Mario Reyes",  cargo:"Jefe Campo",  contrato:"Indefinido", ingreso:"2021-05-20", estado:"Activo"  },
];
const registrosAsistencia = [
  { id:"1", empleado:"Pedro Soto",   tipo:"Entrada", hora:"07:42", ubicacion:"Bloque A-1", fecha:"2025-03-06" },
  { id:"2", empleado:"Carmen Díaz",  tipo:"Entrada", hora:"07:45", ubicacion:"Bloque A-2", fecha:"2025-03-06" },
  { id:"3", empleado:"Luis Morales", tipo:"Entrada", hora:"07:30", ubicacion:"Bloque B-1", fecha:"2025-03-06" },
  { id:"4", empleado:"Pedro Soto",   tipo:"Salida",  hora:"17:05", ubicacion:"Bloque A-1", fecha:"2025-03-06" },
  { id:"5", empleado:"Carmen Díaz",  tipo:"Salida",  hora:"17:10", ubicacion:"Bloque A-2", fecha:"2025-03-06" },
];

export const RecursosHumanos = () => {
  const { roleName, hasPermission, hierarchyLevel } = useRole();
  const canCreate = hasPermission("recursos-humanos", "crear");
  const canExport = hasPermission("recursos-humanos", "exportar");
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");

  // Tabs de definiciones accesibles
  const defTabs = getDefsByModulo("recursos-humanos")
    .filter(d => hierarchyLevel >= d.nivel_minimo);

  const isKnownTab = (t: string) =>
    ["ficha", "asistencia"].includes(t) || defTabs.some(d => `def-${d.id}` === t);

  const [activeTab, setActiveTab] = useState(() =>
    urlTab && isKnownTab(urlTab) ? urlTab : "ficha"
  );
  useEffect(() => {
    if (urlTab && isKnownTab(urlTab)) setActiveTab(urlTab);
  }, [urlTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MainLayout>
      <PageHeader
        title="Recursos Humanos"
        description="Personal gestionado con datos dinámicos — sistema V3"
      />
      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Datos Dinámicos (V3):</strong> Los campos de ficha y asistencia son configurables
          por cliente sin modificar la base de datos.
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Empleados", value: "86" }, { label: "En Campo",        value: "62" },
          { label: "Supervisores",    value: "8"  }, { label: "Administrativos", value: "16" },
        ].map(m => (
          <div key={m.label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
          <TabsTrigger value="ficha">Ficha Personal</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          {defTabs.map(d => (
            <TabsTrigger key={d.id} value={`def-${d.id}`}>{d.nombre}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ficha">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              Campos: <span className="font-medium text-foreground">rut · nombre_completo · cargo · contrato · fecha_ingreso</span>
            </p>
            {canCreate && <Badge variant="outline" className="text-xs">+ Nuevo trabajador</Badge>}
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["RUT","Nombre","Cargo","Contrato","Ingreso","Estado"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fichaPersonal.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.rut}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-4 py-3 text-foreground">{p.cargo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.contrato === "Indefinido" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.contrato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.ingreso}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.estado === "Activo" ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.estado === "Activo" ? "bg-success" : "bg-muted-foreground"}`} />
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="asistencia">
          {canExport && (
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Empleado","Tipo","Hora","Ubicación","Fecha"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosAsistencia.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.empleado}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.tipo === "Entrada" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.hora}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.ubicacion}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Un tab por cada definición accesible */}
        {defTabs.map(d => (
          <TabsContent key={d.id} value={`def-${d.id}`}>
            <SingleDefTab defId={d.id} moduloKey="recursos-humanos" />
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
};

export const Cosecha = () => (
  <ModulePage
    title="Cosecha"
    moduloKey="cosecha"
    initialData={datosCosecha}
    columns={columnasCosecha}
    newRow={() => ({
      id: String(Date.now()), fecha: new Date().toISOString().split("T")[0],
      bloque: "", variedad: "", pesoKg: 0, cajas: 0,
      calidad: "Primera", operador: "", estado: "Pendiente",
    })}
    tabs={[
      { value: "registro",    label: "Registro Diario" },
      { value: "resumen",     label: "Resumen Semanal" },
      { value: "rendimiento", label: "Rendimiento por Bloque" },
    ]}
    withDefiniciones
  />
);

export const PostCosecha = () => (
  <ModulePage
    title="Post-cosecha"
    moduloKey="post-cosecha"
    initialData={datosPostCosecha}
    columns={columnasPostCosecha}
    newRow={() => ({
      id: String(Date.now()), fecha: new Date().toISOString().split("T")[0],
      lote: `PC-${String(Math.floor(Math.random() * 900) + 100)}`,
      variedad: "", pesoEntrada: 0, pesoSalida: 0, merma: 0,
      calibre: "Extra", destino: "Nacional", estado: "Pendiente",
    })}
    tabs={[
      { value: "proceso",  label: "En Proceso" },
      { value: "calidad",  label: "Control de Calidad" },
      { value: "empaque",  label: "Empaque" },
    ]}
  />
);
