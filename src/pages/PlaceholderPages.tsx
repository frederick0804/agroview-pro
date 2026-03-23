import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { useConfig } from "@/contexts/ConfigContext";
import {
  Settings, Download, Upload, SlidersHorizontal, Leaf, Sparkles, Brain,
  BarChart3, ChevronDown, ChevronUp, Calendar, Plus, Eye, Clock, CheckCircle2, AlertCircle, X, Trash2,
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
  const [showMlPanel, setShowMlPanel] = useState(false);

  // Estados para gestión de eventos (Sheet unificado — 3 vistas)
  const [selectedEventoRegistro, setSelectedEventoRegistro] = useState<string | null>(null);
  const [showEventosSheet, setShowEventosSheet]             = useState(false);
  const [activeEventoTab, setActiveEventoTab]               = useState<string>("");
  const [sheetView, setSheetView]                           = useState<"list" | "form" | "detail">("list");
  const [selectedEventoDetalle, setSelectedEventoDetalle]   = useState<string | null>(null);
  const [newEventoForm, setNewEventoForm]                   = useState<Record<string, string>>({});

  const def    = definiciones.find(d => d.id === defId);
  const params = parametros
    .filter(p => p.definicion_id === defId)
    .sort((a, b) => a.orden - b.orden);

  // Campos configurados con IA o ML
  const iaParams = params.filter(p => p.fuente_datos === "ia" || p.fuente_datos === "ia_editable");
  const mlParams = params.filter(p => p.fuente_datos === "ml" || p.fuente_datos === "ml_editable");
  const hasIaFields = iaParams.length > 0;
  const hasMlFields = mlParams.length > 0;
  const hasAutoFields = hasIaFields || hasMlFields;

  const canCreate = hasPermission(moduloKey, "crear");
  const canEdit   = hasPermission(moduloKey, "editar");
  const canDelete = hasPermission(moduloKey, "eliminar");

  if (!def) return null;

  // Definiciones de eventos relacionadas a esta definición (registro padre)
  const eventoDefs = definiciones.filter(d =>
    d.tipo_formulario === "evento" &&
    d.registro_padre_id === defId &&
    d.estado === "activo"
  );
  const hasEventos = eventoDefs.length > 0;

  // Helper para obtener eventos de un registro específico
  const getEventosForRegistro = (registroId: string) => {
    return eventoDefs.map(eventoDef => {
      // Filtrar solo los eventos que están asociados a este registro padre específico
      const eventoDatos = datos.filter(d =>
        d.definicion_id === eventoDef.id &&
        d.registro_padre_dato_id === registroId
      );
      return {
        def: eventoDef,
        datos: eventoDatos,
      };
    });
  };

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
        // ── Relación: dropdown con registros de otra definición ────────────────
        if (p.tipo_dato === "Relación" && p.relacion_def_id) {
          const fuenteDatos = datos.filter(d => d.definicion_id === p.relacion_def_id);
          const campoLabel  = p.relacion_campo_label ?? "nombre";
          const campoValor  = p.relacion_campo_valor ?? campoLabel;
          col.type = "select";
          col.filterable = true;
          col.options = [
            { value: "", label: "— Sin asignar —" },
            ...fuenteDatos.map(d => {
              const vals = parseValores(d.valores);
              const label = vals[campoLabel] || d.referencia || d.id;
              const valor = vals[campoValor] || label;
              return { value: valor, label };
            }),
          ];
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

  // NO agregar columna separada de eventos - se integra en acciones

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

  const handleMlConfirm = (rows: Record<string, string>[]) => {
    const cultivoId = !def.cultivo_id ? filterCultivoId : undefined;
    rows.forEach(row => {
      const values = row;
      const fecha = new Date().toISOString().slice(0, 10);
      addDato(defId, fecha, values, cultivoId);
      const newDatos = datos.filter(d => d.definicion_id === defId).sort((a, b) => b.id.localeCompare(a.id));
      const newDato = newDatos[0];
      const merged = { ...values };
      updDato(newDato.id, { ...newDato, valores: JSON.stringify(merged) });
    });
    setShowMlPanel(false);
  };

  // ── Handlers para eventos ─────────────────────────────────────────────────
  const openEventosSheet = (registroId: string) => {
    setSelectedEventoRegistro(registroId);
    if (eventoDefs.length > 0) setActiveEventoTab(eventoDefs[0].id);
    setSheetView("list");
    setSelectedEventoDetalle(null);
    setNewEventoForm({});
    setShowEventosSheet(true);
  };

  const closeEventosSheet = () => {
    setShowEventosSheet(false);
    setSelectedEventoRegistro(null);
    setSheetView("list");
    setSelectedEventoDetalle(null);
    setNewEventoForm({});
  };

  const openDetalle = (eventoId: string) => {
    setSelectedEventoDetalle(eventoId);
    setSheetView("detail");
  };

  const handleOpenForm = () => {
    const eventoParams = parametros.filter(p => p.definicion_id === activeEventoTab);
    const initialForm: Record<string, string> = {};
    eventoParams.forEach(p => { initialForm[p.nombre] = ""; });
    setNewEventoForm(initialForm);
    setSheetView("form");
  };

  const handleSaveEvento = () => {
    if (!selectedEventoRegistro || !activeEventoTab) return;
    const registroDato = defDatos.find(d => d.id === selectedEventoRegistro);
    if (!registroDato) return;

    const cultivoId = registroDato.cultivo_id || filterCultivoId;
    const newDato = addDato(activeEventoTab, cultivoId, selectedEventoRegistro);
    updDato(newDato.id, { ...newDato, valores: JSON.stringify(newEventoForm) });

    setSheetView("list");
    setNewEventoForm({});
  };

  const handleDeleteEvento = (eventoId: string) => {
    if (canDelete && window.confirm("¿Confirmas eliminar este evento?")) {
      delDato(eventoId);
    }
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
        {hasMlFields && canCreate && canAddRecord && (
          <Button
            variant={showMlPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMlPanel(prev => !prev)}
            className={cn(
              "text-xs gap-1.5 transition-all",
              showMlPanel
                ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-500/20"
                : "border-cyan-400 text-cyan-600 hover:bg-cyan-500/10 hover:border-cyan-500",
            )}
          >
            <Brain className="w-3.5 h-3.5" />
            {showMlPanel ? "Ocultar panel ML" : "Analizar con ML"}
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
          params={iaParams}
          tipo="ia"
          onConfirm={handleIaConfirm}
          onClose={() => setShowIaPanel(false)}
        />
      )}

      {/* Panel lateral de análisis ML */}
      {hasMlFields && (
        <IaAnalysisPanel
          open={showMlPanel}
          params={mlParams}
          tipo="ml"
          onConfirm={handleMlConfirm}
          onClose={() => setShowMlPanel(false)}
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
        rowActions={(row, rowIndex) => {
          if (!hasEventos) return null;

          const registro = defDatos[rowIndex];
          if (!registro) return null;

          // Contar eventos existentes para este registro
          const eventCount = eventoDefs.reduce((total, eventoDef) => {
            const eventosData = datos.filter(d =>
              d.definicion_id === eventoDef.id &&
              d.registro_padre_dato_id === registro.id
            );
            return total + eventosData.length;
          }, 0);

          return (
            <button
              onClick={() => openEventosSheet(registro.id)}
              title={`Ver eventos (${eventCount})`}
              className={cn(
                "p-2 rounded transition-colors shrink-0 relative",
                "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50",
              )}
            >
              <Calendar className="w-4 h-4" />
              {eventCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {eventCount > 9 ? "9+" : eventCount}
                </span>
              )}
            </button>
          );
        }}
      />

      {/* ── Sheet de eventos — 2 vistas: lista / formulario ────────────────── */}
      <Sheet open={showEventosSheet} onOpenChange={(o) => { if (!o) closeEventosSheet(); }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] sm:max-w-[420px] flex flex-col p-0 gap-0 overflow-hidden [&>button:first-of-type]:hidden"
        >
          {/* ── VISTA LISTA ────────────────────────────────────────────────── */}
          <div
            className={cn(
              "flex flex-col h-full transition-transform duration-300 ease-in-out absolute inset-0",
              sheetView === "list" ? "translate-x-0" : "-translate-x-full"
            )}
          >
            {/* Cabecera lista */}
            <div className="px-5 pt-5 pb-4 border-b shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-sm font-semibold leading-tight">
                      Eventos del registro
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {(() => {
                        const reg = defDatos.find(d => d.id === selectedEventoRegistro);
                        return reg ? (reg.referencia || `ID …${reg.id.slice(-6)}`) : "";
                      })()}
                    </SheetDescription>
                  </div>
                </div>
                <button
                  onClick={closeEventosSheet}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs de tipos de evento (pills) */}
              {eventoDefs.length > 1 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {eventoDefs.map(ed => {
                    const count = selectedEventoRegistro
                      ? datos.filter(d => d.definicion_id === ed.id && d.registro_padre_dato_id === selectedEventoRegistro).length
                      : 0;
                    const active = activeEventoTab === ed.id;
                    return (
                      <button
                        key={ed.id}
                        onClick={() => setActiveEventoTab(ed.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {ed.nombre}
                        {count > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cuerpo — lista de eventos, scrollable */}
            <div className="flex-1 overflow-y-auto">
              {eventoDefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                    <Calendar className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Sin tipos de eventos</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    Ve a Configuración → Formularios para definir eventos para este formulario.
                  </p>
                </div>
              ) : (() => {
                const activeDef = eventoDefs.find(d => d.id === activeEventoTab) ?? eventoDefs[0];
                if (!activeDef) return null;
                const eventoParams = parametros
                  .filter(p => p.definicion_id === activeDef.id)
                  .sort((a, b) => a.orden - b.orden);
                const eventosData = selectedEventoRegistro
                  ? datos
                      .filter(d => d.definicion_id === activeDef.id && d.registro_padre_dato_id === selectedEventoRegistro)
                      .slice()
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  : [];

                return (
                  <div className="p-5 space-y-3">
                    {/* Descripción del tipo activo cuando hay solo 1 */}
                    {eventoDefs.length === 1 && activeDef.descripcion && (
                      <p className="text-xs text-muted-foreground pb-1">{activeDef.descripcion}</p>
                    )}

                    {eventosData.length === 0 ? (
                      <div className="flex flex-col items-center py-14 text-center">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                          <Clock className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Sin eventos aún</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Presiona «Nuevo evento» para registrar el primero.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground/60 pb-1">
                          {eventosData.length} registro{eventosData.length !== 1 ? "s" : ""}
                        </p>

                        {eventosData.map(evento => {
                          const valores       = parseValores(evento.valores);
                          const previewParams = eventoParams.filter(p => valores[p.nombre]).slice(0, 3);
                          const extra         = eventoParams.length - previewParams.length;

                          return (
                            <button
                              key={evento.id}
                              className="group w-full relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm text-left transition-all duration-150 overflow-hidden"
                              onClick={() => openDetalle(evento.id)}
                            >
                              {/* Acento izquierdo */}
                              <div className="absolute left-0 inset-y-0 w-[3px] rounded-l-xl bg-emerald-400/70 group-hover:bg-primary transition-colors" />

                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-foreground">
                                    {new Date(evento.fecha).toLocaleDateString("es-CL", {
                                      day: "2-digit", month: "short", year: "numeric"
                                    })}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                                    #{evento.id.slice(-5)}
                                  </span>
                                </div>
                                {previewParams.length > 0 && (
                                  <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap">
                                    {previewParams.map(p => (
                                      <span key={p.id} className="text-[11px] text-muted-foreground">
                                        <span className="text-muted-foreground/50">
                                          {p.etiqueta_personalizada || p.nombre.replace(/_/g, ' ')}:
                                        </span>{" "}
                                        <span className="font-medium text-foreground/70">
                                          {String(valores[p.nombre]).length > 18
                                            ? String(valores[p.nombre]).slice(0, 18) + "…"
                                            : valores[p.nombre]}
                                        </span>
                                      </span>
                                    ))}
                                    {extra > 0 && (
                                      <span className="text-[11px] text-muted-foreground/40">+{extra} más</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Flecha de navegación */}
                              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer fijo: botón nuevo evento */}
            {eventoDefs.length > 0 && canCreate && (
              <div className="px-5 py-4 border-t shrink-0 bg-background">
                <Button className="w-full" onClick={handleOpenForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo{" "}
                  {eventoDefs.find(d => d.id === activeEventoTab)?.nombre ?? "evento"}
                </Button>
              </div>
            )}
          </div>

          {/* ── VISTA FORMULARIO ───────────────────────────────────────────── */}
          <div
            className={cn(
              "flex flex-col h-full transition-transform duration-300 ease-in-out absolute inset-0 bg-background",
              sheetView === "form" ? "translate-x-0" : "translate-x-full"
            )}
            aria-hidden={sheetView !== "form"}
          >
            {/* Cabecera formulario — con botón volver */}
            <div className="px-5 pt-5 pb-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSheetView("list")}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                  title="Volver a la lista"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">
                    Nuevo {eventoDefs.find(d => d.id === activeEventoTab)?.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {(() => {
                      const reg = defDatos.find(d => d.id === selectedEventoRegistro);
                      return reg ? (reg.referencia || `ID …${reg.id.slice(-6)}`) : "";
                    })()}
                  </p>
                </div>
                <button
                  onClick={closeEventosSheet}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Campos del formulario — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {parametros
                .filter(p => p.definicion_id === activeEventoTab)
                .sort((a, b) => a.orden - b.orden)
                .map(param => (
                  <div key={param.id} className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      {param.etiqueta_personalizada || param.nombre.replace(/_/g, ' ')}
                      {param.obligatorio && <span className="text-red-500 text-xs">*</span>}
                    </Label>

                    {param.tipo_dato === "Texto" && (
                      <Input
                        value={newEventoForm[param.nombre] || ""}
                        onChange={(e) => setNewEventoForm(prev => ({ ...prev, [param.nombre]: e.target.value }))}
                        placeholder={param.nombre.replace(/_/g, ' ')}
                      />
                    )}
                    {param.tipo_dato === "Número" && (
                      <Input
                        type="number"
                        value={newEventoForm[param.nombre] || ""}
                        onChange={(e) => setNewEventoForm(prev => ({ ...prev, [param.nombre]: e.target.value }))}
                        placeholder="0"
                      />
                    )}
                    {param.tipo_dato === "Fecha" && (
                      <Input
                        type="date"
                        value={newEventoForm[param.nombre] || ""}
                        onChange={(e) => setNewEventoForm(prev => ({ ...prev, [param.nombre]: e.target.value }))}
                      />
                    )}
                    {param.tipo_dato === "Sí/No" && (
                      <Select
                        value={newEventoForm[param.nombre] || ""}
                        onValueChange={(v) => setNewEventoForm(prev => ({ ...prev, [param.nombre]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sí">Sí</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {param.tipo_dato === "Lista" && param.opciones && (
                      <Select
                        value={newEventoForm[param.nombre] || ""}
                        onValueChange={(v) => setNewEventoForm(prev => ({ ...prev, [param.nombre]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar…" />
                        </SelectTrigger>
                        <SelectContent>
                          {param.opciones.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {param.descripcion && (
                      <p className="text-xs text-muted-foreground">{param.descripcion}</p>
                    )}
                  </div>
                ))}
            </div>

            {/* Footer fijo: acciones */}
            <div className="px-5 py-4 border-t shrink-0 bg-background">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSheetView("list")}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveEvento}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Guardar evento
                </Button>
              </div>
            </div>
          </div>

          {/* ── VISTA DETALLE ──────────────────────────────────────────────── */}
          {(() => {
            const eventoDetalle = selectedEventoDetalle
              ? datos.find(d => d.id === selectedEventoDetalle)
              : null;
            const detalleDef = eventoDetalle
              ? eventoDefs.find(d => d.id === eventoDetalle.definicion_id)
              : null;
            const detalleParams = detalleDef
              ? parametros.filter(p => p.definicion_id === detalleDef.id).sort((a, b) => a.orden - b.orden)
              : [];
            const detalleValores = eventoDetalle ? parseValores(eventoDetalle.valores) : {};

            return (
              <div
                className={cn(
                  "flex flex-col h-full transition-transform duration-300 ease-in-out absolute inset-0 bg-background",
                  sheetView === "detail" ? "translate-x-0" : "translate-x-full"
                )}
                aria-hidden={sheetView !== "detail"}
              >
                {/* Cabecera detalle */}
                <div className="px-5 pt-5 pb-4 border-b shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSheetView("list"); setSelectedEventoDetalle(null); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                      title="Volver"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {detalleDef?.nombre ?? "Evento"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {eventoDetalle
                          ? new Date(eventoDetalle.fecha).toLocaleDateString("es-CL", {
                              weekday: "long", day: "numeric", month: "long", year: "numeric"
                            })
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={closeEventosSheet}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos del detalle — scrollable, con espacio holgado */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {detalleParams.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">Sin campos configurados.</p>
                  ) : (
                    <div className="space-y-5">
                      {detalleParams.map((param, idx) => {
                        const val = detalleValores[param.nombre];
                        const label = param.etiqueta_personalizada || param.nombre.replace(/_/g, ' ');
                        return (
                          <div key={param.id}>
                            {/* Separador cada 5 campos para agrupar visualmente */}
                            {idx > 0 && idx % 5 === 0 && (
                              <div className="border-t border-dashed border-border/60 mb-5" />
                            )}
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
                              {label}
                            </p>
                            <p className={cn(
                              "text-sm leading-relaxed break-words",
                              val ? "text-foreground font-medium" : "text-muted-foreground/40 italic"
                            )}>
                              {val || "Sin valor"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer con eliminar */}
                {canDelete && eventoDetalle && (
                  <div className="px-5 py-4 border-t shrink-0 bg-background">
                    <button
                      onClick={() => {
                        handleDeleteEvento(eventoDetalle.id);
                        setSheetView("list");
                        setSelectedEventoDetalle(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar este evento
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
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

    // ✅ FILTRAR EVENTOS - no deben aparecer como tabs
    if (d.tipo_formulario === "evento") return false;

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
