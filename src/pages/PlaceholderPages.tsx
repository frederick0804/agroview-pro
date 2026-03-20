import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";
import {
  Settings, Download, Upload, SlidersHorizontal, Leaf, Sparkles,
  BarChart3, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { parseValores, type TipoDato, type ModDato, type ModParam, type ModDef, type Cultivo } from "@/config/moduleDefinitions";
import { IaAnalysisPanel } from "@/components/dashboard/IaAnalysisPanel";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Fila aplanada para EditableTable: fecha + campos del JSONB valores */
type DynRow = { id: string; fecha: string } & Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tipoDatoToColType = (t: TipoDato): Column<DynRow>["type"] => {
  if (t === "Número") return "number";
  if (t === "Fecha")  return "date";
  if (t === "Sí/No")  return "select";
  if (t === "Foto" || t === "Archivo") return undefined; // render as text (filename)
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

// ─── Dashboard de módulo — diseño compacto ────────────────────────────────────

function ModuleDashboard({
  defs,
  allDatos,
  cultivos,
}: {
  defs: ModDef[];
  allDatos: ModDato[];
  cultivos: Cultivo[];
}) {
  const [expanded, setExpanded] = useState(false);

  const defIds   = defs.map(d => d.id);
  const modDatos = allDatos.filter(d => defIds.includes(d.definicion_id));
  const total    = modDatos.length;

  const now      = new Date();
  const weekAgo  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = modDatos.filter(d => new Date(d.fecha) >= weekAgo).length;

  // Top 3 formularios por cantidad de registros
  const byDef = defs
    .map(def => ({ def, count: modDatos.filter(d => d.definicion_id === def.id).length }))
    .sort((a, b) => b.count - a.count);
  const top3     = byDef.slice(0, 3);
  const maxCount = Math.max(...top3.map(d => d.count), 1);
  const extraDefs = byDef.length - 3;

  // Últimos 3 registros
  const recent3 = [...modDatos]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3);

  return (
    <div className="rounded-lg border bg-muted/20">
      {/* ── Barra compacta siempre visible ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

        {/* Chips de stats */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Total */}
          <span className="flex items-center gap-1.5 text-xs text-foreground/80">
            <span className="font-semibold tabular-nums">{total}</span>
            <span className="text-muted-foreground">registro{total !== 1 ? "s" : ""}</span>
          </span>

          <span className="w-px h-3 bg-border shrink-0" />

          {/* Esta semana */}
          <span className="flex items-center gap-1.5 text-xs">
            <span className={cn("font-semibold tabular-nums", thisWeek > 0 ? "text-emerald-600" : "text-muted-foreground")}>
              {thisWeek > 0 ? `+${thisWeek}` : "0"}
            </span>
            <span className="text-muted-foreground">esta semana</span>
          </span>

          <span className="w-px h-3 bg-border shrink-0" />

          {/* Formularios */}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70 tabular-nums">{defs.length}</span>
            formulario{defs.length !== 1 ? "s" : ""}
          </span>
        </div>

        <ChevronDown
          className={cn("w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0", expanded && "rotate-180")}
        />
      </button>

      {/* ── Detalle expandible ── */}
      {expanded && (
        <div className="border-t">
          {total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 px-4">
              Sin registros aún. Ingresa datos en los formularios de abajo para ver el resumen aquí.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">

              {/* Columna izquierda: top formularios */}
              <div className="px-4 py-3 space-y-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Formularios
                </p>
                <div className="space-y-2">
                  {top3.map(({ def, count }) => (
                    <div key={def.id} className="flex items-center gap-3">
                      {/* Mini barra */}
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="h-1 rounded-full bg-muted flex-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/50"
                            style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{def.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground/70 shrink-0 w-5 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                  {extraDefs > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-0.5">
                      y {extraDefs} formulario{extraDefs !== 1 ? "s" : ""} más…
                    </p>
                  )}
                </div>
              </div>

              {/* Columna derecha: últimos 3 registros */}
              <div className="px-4 py-3 space-y-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Últimos registros
                </p>
                <div className="space-y-1.5">
                  {recent3.map(dato => {
                    const def     = defs.find(d => d.id === dato.definicion_id);
                    const cultivo = cultivos.find(c => c.id === dato.cultivo_id);
                    return (
                      <div key={dato.id} className="flex items-center gap-2.5">
                        <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                        <span className="text-xs text-foreground/70 truncate flex-1">{def?.nombre ?? "Registro"}</span>
                        {cultivo && (
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                            <Leaf className="w-2.5 h-2.5" />{cultivo.nombre}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">{dato.fecha}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tabla dinámica de una definición ────────────────────────────────────────
// Lee definición, parámetros y datos directamente del ConfigContext.
// Cualquier cambio en Configuración se refleja aquí en tiempo real.

function DynamicDefTable({
  defId, moduloKey, filterCultivoId,
}: {
  defId: string;
  moduloKey: string;
  filterCultivoId?: string; // filtra registros cuando el formulario es global
}) {
  const { hasPermission } = useRole();
  const { definiciones, parametros, datos, addDato, updDato, delDato, setHasPendingChanges } = useConfig();
  const navigate = useNavigate();
  const [showIaPanel, setShowIaPanel] = useState(false);

  const def    = definiciones.find(d => d.id === defId);
  const params = parametros
    .filter(p => p.definicion_id === defId)
    .sort((a, b) => a.orden - b.orden);

  // Campos configurados con IA
  const iaParams = params.filter(p => p.fuente_datos === "ia" || p.fuente_datos === "ia_editable");
  const hasIaFields = iaParams.length > 0;

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit   = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");

  if (!def) return null;

  // Para formularios globales: filtrar registros por cultivo seleccionado.
  // Para formularios específicos: mostrar todos (el cultivo ya está en la def).
  const defDatos: ModDato[] = datos.filter(d => {
    if (d.definicion_id !== defId) return false;
    if (!def.cultivo_id && filterCultivoId) {
      // formulario global — solo mostrar registros del cultivo seleccionado
      return d.cultivo_id === filterCultivoId;
    }
    return true;
  });

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
        if (p.filtrable_rango) {
          col.filterable = true;
          col.filterType = "range";
        }
        if (p.filtrable_busqueda) {
          col.filterable = true;
          col.filterType = "search";
        }
        if (p.ordenable) {
          col.sortable = true;
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

  // Formularios globales requieren un cultivo seleccionado para poder agregar
  const canAddRecord = canCreate && (!def.cultivo_id ? !!filterCultivoId : true);

  const handleAdd = canAddRecord
    ? () => { addDato(defId, !def.cultivo_id ? filterCultivoId : undefined); }
    : undefined;

  // IA confirm: crea múltiples filas con los valores detectados por IA
  const handleIaConfirm = (rowsData: Record<string, string>[]) => {
    const cultivoForRecord = !def.cultivo_id ? filterCultivoId : undefined;

    // Crear un registro por cada fila detectada
    rowsData.forEach((values) => {
      // addDato retorna el dato creado con su ID
      const newDato = addDato(defId, cultivoForRecord);
      // Actualizar inmediatamente con los valores IA
      const merged = { ...values };
      updDato(newDato.id, { ...newDato, valores: JSON.stringify(merged) });
    });
    setShowIaPanel(false);
  };

  return (
    <div className="space-y-3">
      {/* Botón editar campos de esta definición */}
      <div className="flex items-center justify-end gap-2">
        {hasIaFields && canCreate && canAddRecord && (
          <Button
            variant={showIaPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowIaPanel(prev => !prev)}
            className={cn(
              "text-xs gap-1.5 transition-all",
              showIaPanel
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                : "border-violet-400 text-violet-600 hover:bg-violet-500/10 hover:border-violet-500",
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showIaPanel ? "Ocultar panel IA" : "Llenar con IA"}
          </Button>
        )}
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

      {/* Panel lateral de análisis IA */}
      {hasIaFields && (
        <IaAnalysisPanel
          open={showIaPanel}
          iaParams={iaParams}
          onConfirm={handleIaConfirm}
          onClose={() => setShowIaPanel(false)}
        />
      )}

      {/* Aviso cuando formulario global sin cultivo seleccionado */}
      {!def.cultivo_id && !filterCultivoId && canCreate && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Leaf className="w-3.5 h-3.5 shrink-0" />
          Selecciona un cultivo arriba para poder agregar registros a este formulario global.
        </div>
      )}

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

function DynamicModulePage({ title, moduloKey, extraModuloKeys = [] }: { title: string; moduloKey: string; extraModuloKeys?: string[] }) {
  const { role, roleName, hierarchyLevel, hasPermission, currentUser } = useRole();
  const { definiciones, cultivos, datos, getUserDefAcceso } = useConfig();
  const navigate = useNavigate();
  const canExport = hasPermission(moduloKey, "exportar");
  const userId = currentUser?.id ?? null;

  // All module keys this page covers (primary + any merged sub-modules)
  const allModuloKeys = [moduloKey, ...extraModuloKeys];

  // Definiciones visibles para este usuario en este módulo.
  // Prioridad de reglas (de mayor a menor):
  //   A. Override explícito por usuario (DefinicionAccesoUsuario)
  //      → habilitado:true  = acceso garantizado (ignora nivel/roles)
  //      → habilitado:false = acceso bloqueado  (ignora nivel/roles)
  //   B. Reglas de rol: nivel_minimo + roles_excluidos
  const defs = definiciones.filter(d => {
    if (!allModuloKeys.includes(d.modulo) || d.estado !== "activo") return false;
    // A: override por usuario
    if (userId != null) {
      const acceso = getUserDefAcceso(d.id, userId);
      if (acceso !== undefined) return acceso.habilitado;
    }
    // B: reglas de rol
    if (hierarchyLevel < d.nivel_minimo) return false;
    if ((d.roles_excluidos ?? []).includes(role)) return false;
    // C: supervisor — solo definiciones asignadas (si tiene restricción)
    if (role === "supervisor" && currentUser?.definiciones_asignadas?.length) {
      return currentUser.definiciones_asignadas.includes(d.id);
    }
    return true;
  });

  // Cultivos que tienen alguna def específica O algún registro en defs globales
  const cultivoIdsFromDefs    = defs.filter(d => d.cultivo_id).map(d => d.cultivo_id as string);
  const globalDefIds          = defs.filter(d => !d.cultivo_id).map(d => d.id);
  const cultivoIdsFromRecords = datos
    .filter(d => globalDefIds.includes(d.definicion_id) && d.cultivo_id)
    .map(d => d.cultivo_id as string);

  const allCultivoIds  = [...new Set([...cultivoIdsFromDefs, ...cultivoIdsFromRecords])];
  const hasGlobalDefs  = defs.some(d => !d.cultivo_id);
  const activeCultivos = cultivos.filter(c => allCultivoIds.includes(c.id));

  // Mostrar picker cuando hay cultivos con defs/registros O al menos un cultivo activo en el sistema
  // Mostrar picker cuando:
  // 1. ya hay cultivos con defs/registros, O
  // 2. hay formularios globales Y existen cultivos activos (para poder seleccionar antes de agregar)
  const showCultivoPicker =
    activeCultivos.length > 0 ||
    allCultivoIds.length > 0 ||
    (hasGlobalDefs && cultivos.some(c => c.activo));

  // "todos" = sin filtro; string = cultivo específico
  const [filterCultivoId, setFilterCultivoId] = useState<string>(
    () => activeCultivos[0]?.id ?? allCultivoIds[0] ?? "todos",
  );

  // Defs visibles según el cultivo:
  //   - formularios globales: siempre visibles (sus registros se filtrarán por cultivo)
  //   - formularios específicos: solo si coincide el cultivo
  const filteredDefs = filterCultivoId === "todos"
    ? defs
    : defs.filter(d => !d.cultivo_id || d.cultivo_id === filterCultivoId);

  const [activeTab, setActiveTab] = useState<string>(() => filteredDefs[0]?.id ?? "");

  // Reset tab al cambiar el cultivo seleccionado
  useEffect(() => {
    setActiveTab(filteredDefs[0]?.id ?? "");
  }, [filterCultivoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTab = filteredDefs.some(d => d.id === activeTab)
    ? activeTab
    : (filteredDefs[0]?.id ?? "");

  // cultivoId que se pasa a DynamicDefTable para filtrar registros
  const recordFilter = filterCultivoId === "todos" ? undefined : filterCultivoId;

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
          {/* ── Dashboard de módulo — solo para roles no super_admin ─────── */}
          {role !== "super_admin" && (
            <ModuleDashboard
              defs={defs}
              allDatos={datos}
              cultivos={cultivos}
            />
          )}

          {/* ── Selector de cultivo ─────────────────────────────────────── */}
          {showCultivoPicker && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Todos — sin filtro */}
              <button
                onClick={() => setFilterCultivoId("todos")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                  filterCultivoId === "todos"
                    ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:shadow-sm",
                )}
              >
                Todos
              </button>
              {/* Un chip por cultivo */}
              {cultivos.filter(c => c.activo).map(c => {
                const specificCount = datos.filter(d =>
                  globalDefIds.includes(d.definicion_id) && d.cultivo_id === c.id
                ).length + defs.filter(d => d.cultivo_id === c.id).reduce(
                  (acc, def) => acc + datos.filter(d => d.definicion_id === def.id).length, 0
                );
                return (
                  <button
                    key={c.id}
                    onClick={() => setFilterCultivoId(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                      filterCultivoId === c.id
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:shadow-sm",
                    )}
                  >
                    <Leaf className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold">{c.nombre}</span>
                    {specificCount > 0 && (
                      <span className={cn(
                        "text-[10px] opacity-70",
                        filterCultivoId === c.id ? "text-primary-foreground/70" : "",
                      )}>
                        {specificCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Aviso cultivo activo (formularios globales) ──────────────── */}
          {hasGlobalDefs && filterCultivoId !== "todos" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
              <Leaf className="w-3.5 h-3.5 shrink-0" />
              <span>
                Mostrando registros de <strong>{cultivos.find(c => c.id === filterCultivoId)?.nombre ?? filterCultivoId}</strong>.
                Los formularios globales filtran por este cultivo.
              </span>
            </div>
          )}

          {/* ── Contenido ───────────────────────────────────────────────── */}
          {filteredDefs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Sin formularios para este cultivo.</p>
            </div>
          ) : filteredDefs.length === 1 ? (
            <DynamicDefTable
              defId={filteredDefs[0].id}
              moduloKey={moduloKey}
              filterCultivoId={recordFilter}
            />
          ) : (
            <Tabs value={currentTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
                {filteredDefs.map(d => (
                  <TabsTrigger key={d.id} value={d.id}>
                    {d.nombre}
                    {!d.cultivo_id && (
                      <span className="ml-1 text-[9px] opacity-60">global</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {filteredDefs.map(d => (
                <TabsContent key={d.id} value={d.id}>
                  <DynamicDefTable
                    defId={d.id}
                    moduloKey={moduloKey}
                    filterCultivoId={recordFilter}
                  />
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
export const Cultivo        = () => <DynamicModulePage title="Cultivo"          moduloKey="cultivo"          extraModuloKeys={["cosecha"]} />;
export const Cosecha        = () => <DynamicModulePage title="Cosecha"          moduloKey="cosecha"          />;
export const PostCosecha    = () => <DynamicModulePage title="Post-cosecha"     moduloKey="post-cosecha"     extraModuloKeys={["produccion"]} />;
export const Produccion     = () => <DynamicModulePage title="Producción"       moduloKey="produccion"       />;
export const RecursosHumanos= () => <DynamicModulePage title="Recursos Humanos" moduloKey="recursos-humanos" />;
