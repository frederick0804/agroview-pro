import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { Download, Upload, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

// ===================== TIPOS =====================

interface RegistroCosecha {
  id: string;
  fecha: string;
  bloque: string;
  variedad: string;
  pesoKg: number;
  cajas: number;
  calidad: string;
  operador: string;
  estado: string;
}

interface RegistroPostCosecha {
  id: string;
  fecha: string;
  lote: string;
  variedad: string;
  pesoEntrada: number;
  pesoSalida: number;
  merma: number;
  calibre: string;
  destino: string;
  estado: string;
}

interface RegistroLaboratorio {
  id: string;
  fecha: string;
  muestra: string;
  tipoPrueba: string;
  cultivo: string;
  resultado: string;
  unidad: string;
  estado: string;
}

interface RegistroVivero {
  id: string;
  fecha: string;
  variedad: string;
  lote: string;
  cantidadPlantas: number;
  etapa: string;
  diasGerminacion: number;
  porcentajeExito: number;
}

interface RegistroCultivo {
  id: string;
  bloque: string;
  variedad: string;
  fechaSiembra: string;
  etapa: string;
  areHa: number;
  densidad: number;
  proximaActividad: string;
}

// ===================== DATOS DE EJEMPLO =====================

const datosCosecha: RegistroCosecha[] = [
  { id: "1", fecha: "2025-02-01", bloque: "A-1", variedad: "Driscoll's Maravilla", pesoKg: 285, cajas: 57, calidad: "Premium", operador: "Juan Pérez", estado: "Aprobado" },
  { id: "2", fecha: "2025-02-01", bloque: "A-2", variedad: "Driscoll's Maravilla", pesoKg: 312, cajas: 62, calidad: "Primera", operador: "Ana García", estado: "Aprobado" },
  { id: "3", fecha: "2025-02-02", bloque: "B-1", variedad: "San Andreas", pesoKg: 198, cajas: 40, calidad: "Premium", operador: "Juan Pérez", estado: "Pendiente" },
  { id: "4", fecha: "2025-02-02", bloque: "B-3", variedad: "Monterey", pesoKg: 245, cajas: 49, calidad: "Segunda", operador: "Roberto Silva", estado: "Aprobado" },
  { id: "5", fecha: "2025-02-03", bloque: "C-1", variedad: "Albion", pesoKg: 167, cajas: 33, calidad: "Primera", operador: "Ana García", estado: "Pendiente" },
  { id: "6", fecha: "2025-02-03", bloque: "A-3", variedad: "Driscoll's Maravilla", pesoKg: 298, cajas: 60, calidad: "Premium", operador: "Juan Pérez", estado: "Aprobado" },
];

const datosPostCosecha: RegistroPostCosecha[] = [
  { id: "1", fecha: "2025-02-01", lote: "PC-001", variedad: "Driscoll's Maravilla", pesoEntrada: 597, pesoSalida: 568, merma: 4.9, calibre: "Jumbo", destino: "Exportación", estado: "Completo" },
  { id: "2", fecha: "2025-02-02", lote: "PC-002", variedad: "San Andreas", pesoEntrada: 198, pesoSalida: 185, merma: 6.6, calibre: "Extra", destino: "Nacional", estado: "Completo" },
  { id: "3", fecha: "2025-02-02", lote: "PC-003", variedad: "Monterey", pesoEntrada: 245, pesoSalida: 230, merma: 6.1, calibre: "Primera", destino: "Nacional", estado: "En proceso" },
  { id: "4", fecha: "2025-02-03", lote: "PC-004", variedad: "Albion", pesoEntrada: 167, pesoSalida: 155, merma: 7.2, calibre: "Extra", destino: "Exportación", estado: "Pendiente" },
];

const datosLaboratorio: RegistroLaboratorio[] = [
  { id: "1", fecha: "2025-01-28", muestra: "LAB-0112", tipoPrueba: "Brix", cultivo: "Fresa Maravilla", resultado: "12.5", unidad: "°Brix", estado: "Completado" },
  { id: "2", fecha: "2025-01-28", muestra: "LAB-0113", tipoPrueba: "pH Suelo", cultivo: "Bloque A", resultado: "6.2", unidad: "pH", estado: "Completado" },
  { id: "3", fecha: "2025-01-29", muestra: "LAB-0114", tipoPrueba: "Conductividad", cultivo: "Bloque B", resultado: "1.8", unidad: "dS/m", estado: "Completado" },
  { id: "4", fecha: "2025-01-30", muestra: "LAB-0115", tipoPrueba: "Firmeza", cultivo: "Fresa San Andreas", resultado: "3.2", unidad: "N", estado: "En proceso" },
  { id: "5", fecha: "2025-02-01", muestra: "LAB-0116", tipoPrueba: "Pesticidas", cultivo: "Fresa Albion", resultado: "ND", unidad: "ppm", estado: "Pendiente" },
];

const datosVivero: RegistroVivero[] = [
  { id: "1", fecha: "2025-01-05", variedad: "Driscoll's Maravilla", lote: "VIV-001", cantidadPlantas: 15000, etapa: "Trasplante listo", diasGerminacion: 12, porcentajeExito: 94.5 },
  { id: "2", fecha: "2025-01-10", variedad: "San Andreas", lote: "VIV-002", cantidadPlantas: 10000, etapa: "Desarrollo", diasGerminacion: 14, porcentajeExito: 91.2 },
  { id: "3", fecha: "2025-01-15", variedad: "Monterey", lote: "VIV-003", cantidadPlantas: 8000, etapa: "Germinación", diasGerminacion: 8, porcentajeExito: 88.0 },
  { id: "4", fecha: "2025-01-20", variedad: "Albion", lote: "VIV-004", cantidadPlantas: 12000, etapa: "Siembra", diasGerminacion: 0, porcentajeExito: 0 },
];

const datosCultivo: RegistroCultivo[] = [
  { id: "1", bloque: "A-1", variedad: "Driscoll's Maravilla", fechaSiembra: "2024-10-15", etapa: "Producción", areHa: 2.5, densidad: 45000, proximaActividad: "Cosecha" },
  { id: "2", bloque: "A-2", variedad: "Driscoll's Maravilla", fechaSiembra: "2024-10-20", etapa: "Producción", areHa: 2.0, densidad: 44000, proximaActividad: "Fertirrigación" },
  { id: "3", bloque: "B-1", variedad: "San Andreas", fechaSiembra: "2024-11-01", etapa: "Floración", areHa: 1.8, densidad: 42000, proximaActividad: "Monitoreo MIPE" },
  { id: "4", bloque: "B-3", variedad: "Monterey", fechaSiembra: "2024-11-10", etapa: "Producción", areHa: 2.2, densidad: 43000, proximaActividad: "Cosecha" },
  { id: "5", bloque: "C-1", variedad: "Albion", fechaSiembra: "2024-12-01", etapa: "Desarrollo vegetativo", areHa: 1.5, densidad: 40000, proximaActividad: "Poda" },
];

// ===================== COLUMNAS =====================

const columnasCosecha: Column<RegistroCosecha>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "bloque", header: "Bloque", width: "80px" },
  { key: "variedad", header: "Variedad", width: "180px" },
  { key: "pesoKg", header: "Peso (kg)", width: "100px", type: "number" },
  { key: "cajas", header: "Cajas", width: "80px", type: "number" },
  { key: "calidad", header: "Calidad", width: "110px", type: "select", options: [
    { value: "Premium", label: "Premium" },
    { value: "Primera", label: "Primera" },
    { value: "Segunda", label: "Segunda" },
  ]},
  { key: "operador", header: "Operador", width: "140px" },
  { key: "estado", header: "Estado", width: "110px", editable: false, render: (value) => (
    <div className="px-3 py-2">
      <Badge variant={value === "Aprobado" ? "default" : "secondary"} className="gap-1 text-xs">
        {value === "Aprobado" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {value}
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
    <div className={`px-3 py-2.5 text-sm font-medium ${value > 6 ? "text-destructive" : "text-success"}`}>
      {value.toFixed(1)}%
    </div>
  )},
  { key: "calibre", header: "Calibre", width: "100px", type: "select", options: [
    { value: "Jumbo", label: "Jumbo" },
    { value: "Extra", label: "Extra" },
    { value: "Primera", label: "Primera" },
    { value: "Segunda", label: "Segunda" },
  ]},
  { key: "destino", header: "Destino", width: "110px", type: "select", options: [
    { value: "Exportación", label: "Exportación" },
    { value: "Nacional", label: "Nacional" },
  ]},
  { key: "estado", header: "Estado", width: "110px", editable: false, render: (value) => (
    <div className="px-3 py-2">
      <Badge variant={value === "Completo" ? "default" : value === "En proceso" ? "secondary" : "outline"} className="text-xs">
        {value}
      </Badge>
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
      <Badge variant={value === "Completado" ? "default" : value === "En proceso" ? "secondary" : "outline"} className="text-xs">
        {value}
      </Badge>
    </div>
  )},
];

const columnasVivero: Column<RegistroVivero>[] = [
  { key: "fecha", header: "Fecha", width: "110px", type: "date" },
  { key: "variedad", header: "Variedad", width: "170px" },
  { key: "lote", header: "Lote", width: "90px" },
  { key: "cantidadPlantas", header: "Plantas", width: "100px", type: "number" },
  { key: "etapa", header: "Etapa", width: "140px", type: "select", options: [
    { value: "Siembra", label: "Siembra" },
    { value: "Germinación", label: "Germinación" },
    { value: "Desarrollo", label: "Desarrollo" },
    { value: "Trasplante listo", label: "Trasplante listo" },
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

// ===================== COMPONENTE GENÉRICO DE MÓDULO =====================

function ModulePage<T extends { id: string }>({
  title,
  moduloKey,
  initialData,
  columns,
  newRow,
  tabs,
}: {
  title: string;
  moduloKey: string;
  initialData: T[];
  columns: Column<T>[];
  newRow: () => T;
  tabs?: { value: string; label: string; content?: React.ReactNode }[];
}) {
  const { hasPermission, roleName } = useRole();
  const [data, setData] = useState<T[]>(initialData);

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");
  const canExport = hasPermission(moduloKey, "exportar");

  const handleUpdate = (rowIndex: number, key: keyof T, value: any) => {
    if (!canEdit && !canCreate) return;
    setData((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleDelete = canDelete
    ? (rowIndex: number) => setData((prev) => prev.filter((_, i) => i !== rowIndex))
    : undefined;

  const handleAdd = canCreate
    ? () => setData((prev) => [...prev, newRow()])
    : undefined;

  // Hacer columnas no editables si no tiene permiso
  const adjustedColumns = columns.map((col) => ({
    ...col,
    editable: col.editable === false ? false : canEdit || canCreate,
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
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </>
            )}
          </div>
        }
      />

      {tabs ? (
        <Tabs defaultValue={tabs[0].value} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
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
          {tabs.slice(1).map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content || (
                <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                  {tab.label} — Próximamente
                </div>
              )}
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
      id: String(Date.now()),
      fecha: new Date().toISOString().split("T")[0],
      muestra: `LAB-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      tipoPrueba: "",
      cultivo: "",
      resultado: "",
      unidad: "",
      estado: "Pendiente",
    })}
    tabs={[
      { value: "analisis", label: "Análisis" },
      { value: "muestras", label: "Muestras Pendientes" },
      { value: "historico", label: "Histórico" },
    ]}
  />
);

export const Vivero = () => (
  <ModulePage
    title="Vivero"
    moduloKey="vivero"
    initialData={datosVivero}
    columns={columnasVivero}
    newRow={() => ({
      id: String(Date.now()),
      fecha: new Date().toISOString().split("T")[0],
      variedad: "",
      lote: `VIV-${String(Math.floor(Math.random() * 900) + 100)}`,
      cantidadPlantas: 0,
      etapa: "Siembra",
      diasGerminacion: 0,
      porcentajeExito: 0,
    })}
    tabs={[
      { value: "lotes", label: "Lotes Activos" },
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
      id: String(Date.now()),
      bloque: "",
      variedad: "",
      fechaSiembra: new Date().toISOString().split("T")[0],
      etapa: "Desarrollo vegetativo",
      areHa: 0,
      densidad: 0,
      proximaActividad: "",
    })}
    tabs={[
      { value: "bloques", label: "Bloques" },
      { value: "fitosanitario", label: "Aplicaciones Fitosanitarias" },
      { value: "mipe", label: "MIPE" },
    ]}
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

export const RecursosHumanos = () => {
  const { roleName } = useRole();
  return (
    <MainLayout>
      <PageHeader title="Recursos Humanos" description={`Módulo de RRHH — Rol: ${roleName}`} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Empleados</p>
          <p className="text-2xl font-bold text-foreground mt-1">86</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">En Campo</p>
          <p className="text-2xl font-bold text-foreground mt-1">62</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Supervisores</p>
          <p className="text-2xl font-bold text-foreground mt-1">8</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Administrativos</p>
          <p className="text-2xl font-bold text-foreground mt-1">16</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        Directorio de empleados, nómina y asistencia — Próximamente
      </div>
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
      id: String(Date.now()),
      fecha: new Date().toISOString().split("T")[0],
      bloque: "",
      variedad: "",
      pesoKg: 0,
      cajas: 0,
      calidad: "Primera",
      operador: "",
      estado: "Pendiente",
    })}
    tabs={[
      { value: "registro", label: "Registro Diario" },
      { value: "resumen", label: "Resumen Semanal" },
      { value: "rendimiento", label: "Rendimiento por Bloque" },
    ]}
  />
);

export const PostCosecha = () => (
  <ModulePage
    title="Post-cosecha"
    moduloKey="post-cosecha"
    initialData={datosPostCosecha}
    columns={columnasPostCosecha}
    newRow={() => ({
      id: String(Date.now()),
      fecha: new Date().toISOString().split("T")[0],
      lote: `PC-${String(Math.floor(Math.random() * 900) + 100)}`,
      variedad: "",
      pesoEntrada: 0,
      pesoSalida: 0,
      merma: 0,
      calibre: "Extra",
      destino: "Nacional",
      estado: "Pendiente",
    })}
    tabs={[
      { value: "proceso", label: "En Proceso" },
      { value: "calidad", label: "Control de Calidad" },
      { value: "empaque", label: "Empaque" },
    ]}
  />
);
