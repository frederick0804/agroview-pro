import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";
import { Settings, Download, Upload, SlidersHorizontal, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { parseValores, type TipoDato, type ModDato, type ModParam } from "@/config/moduleDefinitions";

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

/** Safely evaluate a formula string using field values from the row. */
const evaluateFormula = (formula: string, rowVals: Record<string, string>, fieldNames: string[]): number | null => {
  try {
    let expr = formula;
    // Sort by longest name first to avoid partial replacements
    const sorted = [...fieldNames].sort((a, b) => b.length - a.length);
    for (const name of sorted) {
      const val = parseFloat(rowVals[name] ?? "");
      if (isNaN(val)) return null;
      expr = expr.replaceAll(name, String(val));
    }
    // Only allow safe chars: digits, operators, parens, dots, whitespace
    if (!/^[\d+\-*/().\s]+$/.test(expr)) return null;
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && isFinite(result) ? Math.round(result * 100) / 100 : null;
  } catch {
    return null;
  }
};

// ─── Tabla dinámica de una definición ────────────────────────────────────────
// Lee definición, parámetros y datos directamente del ConfigContext.
// Cualquier cambio en Configuración se refleja aquí en tiempo real.

function DynamicDefTable({ defId, moduloKey }: { defId: string; moduloKey: string }) {
  const { hasPermission } = useRole();
  const { definiciones, parametros, datos, addDato, updDato, delDato, setHasPendingChanges } = useConfig();
  const navigate = useNavigate();

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

  // Campos con fórmula
  const formulaParams = params.filter(p => p.formula);
  const fieldNames = params.map(p => p.nombre);

  // Construir columnas desde los parámetros de la definición
  const columns: Column<DynRow>[] = [
    { key: "fecha", header: "Fecha", width: "110px", type: "date", editable: canEdit || canCreate, required: true },
    ...params
      .filter(p => p.visible !== false)
      .map(p => {
        const hasFormula = !!p.formula;
        const col: Column<DynRow> = {
          key:      p.nombre,
          header:   p.etiqueta_personalizada || p.nombre.replace(/_/g, " "),
          width:    "140px",
          editable: hasFormula ? false : (canEdit || canCreate) && p.editable_campo !== false,
          required: hasFormula ? false : p.obligatorio,
        };
        const colType = tipoDatoToColType(p.tipo_dato);
        if (colType) col.type = colType;
        if (p.tipo_dato === "Sí/No") {
          col.options = [{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }];
          col.filterable = true;
        }
        if (p.tipo_dato === "Lista" && p.opciones && p.opciones.length > 0) {
          col.type = "select";
          col.options = p.opciones;
          col.filterable = true;
        }
        if (hasFormula) {
          col.header = `${col.header} ƒ`;
          col.render = (_value, row) => {
            const rowVals: Record<string, string> = {};
            for (const fp of params) {
              rowVals[fp.nombre] = String(row[fp.nombre] ?? "");
            }
            const result = evaluateFormula(p.formula!, rowVals, fieldNames);
            return (
              <span className="text-xs font-mono text-muted-foreground">
                {result !== null ? result : "—"}
              </span>
            );
          };
        }
        return col;
      }),
  ];

  // Actualizar un campo — escribe de vuelta al contexto + recalcular fórmulas
  const handleUpdate = (rowIndex: number, key: keyof DynRow, value: unknown) => {
    const dato = defDatos[rowIndex];
    if (!dato) return;
    if (key === "fecha") {
      updDato(dato.id, { ...dato, fecha: String(value) });
    } else {
      const vals = parseValores(dato.valores);
      vals[key as string] = String(value);
      // Recalcular campos con fórmula
      for (const fp of formulaParams) {
        if (fp.formula) {
          const result = evaluateFormula(fp.formula, vals, fieldNames);
          if (result !== null) vals[fp.nombre] = String(result);
        }
      }
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
    <div className="space-y-3">
      {/* Botón editar campos de esta definición */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/configuracion?tab=campos&def=${defId}`)}
          className="text-xs gap-1.5"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Editar campos del formulario
        </Button>
      </div>
      <EditableTable
        title={def.nombre}
        data={rows}
        columns={columns}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onPendingChange={setHasPendingChanges}
      />
    </div>
  );
}

// ─── Contenedor genérico de módulo ────────────────────────────────────────────
// Sus tabs se generan automáticamente desde las CONFIG_DEFINICIONES
// asignadas a este módulo en Configuración.

function DynamicModulePage({ title, moduloKey }: { title: string; moduloKey: string }) {
  const { roleName, hierarchyLevel, hasPermission } = useRole();
  const { definiciones, cultivos } = useConfig();
  const navigate = useNavigate();
  const canExport = hasPermission(moduloKey, "exportar");

  // Todas las definiciones accesibles para este módulo
  const defs = definiciones.filter(
    d => d.modulo === moduloKey && hierarchyLevel >= d.nivel_minimo,
  );

  // IDs únicos de cultivos que tienen al menos 1 def en este módulo
  const cultivoIdsWithDefs = [...new Set(
    defs.filter(d => d.cultivo_id).map(d => d.cultivo_id as string),
  )];
  const hasGlobalDefs = defs.some(d => !d.cultivo_id);

  // Mostrar selector de cultivo si hay defs de varios cultivos o mezcla cultivo+global
  const showCultivoPicker =
    cultivoIdsWithDefs.length > 1 ||
    (cultivoIdsWithDefs.length >= 1 && hasGlobalDefs);

  const [filterCultivoId, setFilterCultivoId] = useState<string>(
    () => cultivoIdsWithDefs[0] ?? "",
  );

  // Defs visibles según el cultivo seleccionado
  const filteredDefs = showCultivoPicker
    ? defs.filter(d => (d.cultivo_id ?? "") === filterCultivoId)
    : defs;

  const [activeTab, setActiveTab] = useState<string>(() => filteredDefs[0]?.id ?? "");

  // Reset tab al cambiar el cultivo seleccionado
  useEffect(() => {
    setActiveTab(filteredDefs[0]?.id ?? "");
  }, [filterCultivoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTab = filteredDefs.some(d => d.id === activeTab)
    ? activeTab
    : (filteredDefs[0]?.id ?? "");

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
      ) : (
        <div className="space-y-4">
          {/* Selector de cultivo — solo cuando hay defs de múltiples cultivos */}
          {showCultivoPicker && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasGlobalDefs && (
                <button
                  onClick={() => setFilterCultivoId("")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                    filterCultivoId === ""
                      ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:shadow-sm",
                  )}
                >
                  Global
                </button>
              )}
              {cultivoIdsWithDefs.map(cid => {
                const cultivo = cultivos.find(c => c.id === cid);
                return (
                  <button
                    key={cid}
                    onClick={() => setFilterCultivoId(cid)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                      filterCultivoId === cid
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:shadow-sm",
                    )}
                  >
                    <Leaf className="w-3.5 h-3.5 shrink-0" />
                    {cultivo?.nombre ?? cid}
                  </button>
                );
              })}
            </div>
          )}

          {/* Contenido: ninguno / tabla única / tabs por def */}
          {filteredDefs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Sin formularios para este cultivo.</p>
            </div>
          ) : filteredDefs.length === 1 ? (
            <DynamicDefTable defId={filteredDefs[0].id} moduloKey={moduloKey} />
          ) : (
            <Tabs value={currentTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
                {filteredDefs.map(d => (
                  <TabsTrigger key={d.id} value={d.id}>{d.nombre}</TabsTrigger>
                ))}
              </TabsList>
              {filteredDefs.map(d => (
                <TabsContent key={d.id} value={d.id}>
                  <DynamicDefTable defId={d.id} moduloKey={moduloKey} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
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
