import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";
import { Settings, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { parseValores, type TipoDato, type ModDato } from "@/config/moduleDefinitions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Fila aplanada para EditableTable: fecha + campos del JSONB valores */
type DynRow = { id: string; fecha: string } & Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tipoDatoToColType = (t: TipoDato): Column<DynRow>["type"] => {
  if (t === "Número") return "number";
  if (t === "Fecha")  return "date";
  if (t === "Sí/No")  return "select";
  return undefined;
};

// ─── Tabla dinámica de una definición ────────────────────────────────────────
// Lee definición, parámetros y datos directamente del ConfigContext.
// Cualquier cambio en Configuración se refleja aquí en tiempo real.

function DynamicDefTable({ defId, moduloKey }: { defId: string; moduloKey: string }) {
  const { hasPermission } = useRole();
  const { definiciones, parametros, datos, addDato, updDato, delDato } = useConfig();

  const def    = definiciones.find(d => d.id === defId);
  const params = parametros
    .filter(p => p.definicion_id === defId)
    .sort((a, b) => a.orden - b.orden);

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit   = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");

  if (!def) return null;

  // Datos de esta definición (del contexto — siempre actualizados)
  const defDatos: ModDato[] = datos.filter(d => d.definicion_id === defId);

  // Aplanar ModDato → DynRow para EditableTable
  const rows: DynRow[] = defDatos.map(d => ({
    id:    d.id,
    fecha: d.fecha,
    ...parseValores(d.valores),
  }));

  // Construir columnas desde los parámetros de la definición
  const columns: Column<DynRow>[] = [
    { key: "fecha", header: "Fecha", width: "110px", type: "date", editable: canEdit || canCreate },
    ...params.map(p => {
      const col: Column<DynRow> = {
        key:      p.nombre,
        header:   p.nombre.replace(/_/g, " "),
        width:    "140px",
        editable: canEdit || canCreate,
      };
      const colType = tipoDatoToColType(p.tipo_dato);
      if (colType) col.type = colType;
      if (p.tipo_dato === "Sí/No") {
        col.options = [{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }];
      }
      return col;
    }),
  ];

  // Actualizar un campo — escribe de vuelta al contexto
  const handleUpdate = (rowIndex: number, key: keyof DynRow, value: unknown) => {
    const dato = defDatos[rowIndex];
    if (!dato) return;
    if (key === "fecha") {
      updDato(dato.id, { ...dato, fecha: String(value) });
    } else {
      const vals = parseValores(dato.valores);
      vals[key as string] = String(value);
      updDato(dato.id, { ...dato, valores: JSON.stringify(vals) });
    }
  };

  const handleDelete = canDelete
    ? (rowIndex: number) => {
        const dato = defDatos[rowIndex];
        if (dato) delDato(dato.id);
      }
    : undefined;

  const handleAdd = canCreate
    ? () => { addDato(defId); }
    : undefined;

  return (
    <EditableTable
      title={def.nombre}
      data={rows}
      columns={columns}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onAdd={handleAdd}
    />
  );
}

// ─── Contenedor genérico de módulo ────────────────────────────────────────────
// Sus tabs se generan automáticamente desde las CONFIG_DEFINICIONES
// asignadas a este módulo en Configuración.

function DynamicModulePage({ title, moduloKey }: { title: string; moduloKey: string }) {
  const { roleName, hierarchyLevel, hasPermission } = useRole();
  const { definiciones } = useConfig();
  const navigate = useNavigate();
  const canExport = hasPermission(moduloKey, "exportar");

  // Definiciones accesibles para este módulo y nivel de usuario
  const defs = definiciones.filter(
    d => d.modulo === moduloKey && hierarchyLevel >= d.nivel_minimo,
  );

  const [activeTab, setActiveTab] = useState<string>(() => defs[0]?.id ?? "");

  // Actualizar tab activo si la primera def cambia (ej. al crear la primera)
  const firstDefId = defs[0]?.id ?? "";
  const currentTab = defs.some(d => d.id === activeTab) ? activeTab : firstDefId;

  return (
    <MainLayout>
      <PageHeader
        title={title}
        description={`Módulo de ${title} — Rol: ${roleName}`}
        actions={
          canExport ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Importar</Button>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
          ) : undefined
        }
      />

      {defs.length === 0 ? (
        /* Sin definiciones configuradas para este módulo */
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Settings className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Sin formularios configurados</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              No hay registros definidos para el módulo <strong>{title}</strong>.
              Ve a Configuración, crea una Definición y asígnala a este módulo.
            </p>
          </div>
          {hasPermission("configuracion", "ver") && (
            <Button variant="outline" size="sm" onClick={() => navigate("/configuracion")}>
              <Settings className="w-4 h-4 mr-2" /> Ir a Configuración
            </Button>
          )}
        </div>
      ) : defs.length === 1 ? (
        /* Una sola definición — sin tabs, tabla directa */
        <DynamicDefTable defId={defs[0].id} moduloKey={moduloKey} />
      ) : (
        /* Varias definiciones — una tab por cada una */
        <Tabs value={currentTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
            {defs.map(d => (
              <TabsTrigger key={d.id} value={d.id}>{d.nombre}</TabsTrigger>
            ))}
          </TabsList>
          {defs.map(d => (
            <TabsContent key={d.id} value={d.id}>
              <DynamicDefTable defId={d.id} moduloKey={moduloKey} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </MainLayout>
  );
}

// ═══ Módulos exportados ═══════════════════════════════════════════════════════
// Cada uno es un contenedor que muestra las tablas definidas en Configuración.

export const Laboratorio    = () => <DynamicModulePage title="Laboratorio"      moduloKey="laboratorio"      />;
export const Vivero         = () => <DynamicModulePage title="Vivero"           moduloKey="vivero"           />;
export const Cultivo        = () => <DynamicModulePage title="Cultivo"          moduloKey="cultivo"          />;
export const Cosecha        = () => <DynamicModulePage title="Cosecha"          moduloKey="cosecha"          />;
export const PostCosecha    = () => <DynamicModulePage title="Post-cosecha"     moduloKey="post-cosecha"     />;
export const Produccion     = () => <DynamicModulePage title="Producción"       moduloKey="produccion"       />;
export const RecursosHumanos= () => <DynamicModulePage title="Recursos Humanos" moduloKey="recursos-humanos" />;
