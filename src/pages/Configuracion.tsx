import { useState } from "react";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Palette, Settings2, Upload, Layers, List, Table2, Info,
  ChevronDown, ChevronUp, Pencil, Save, X, Plus, Trash2,
} from "lucide-react";

// ─── §4 Informe V3: Sistema de Configuraciones Dinámicas ─────────────────────
// Reemplaza tablas rígidas (CONFIG_ESTRUCTURA_JERARQUIA, CONFIG_CALIBRES,
// PERSONAL, ASISTENCIA) por 3 tablas dinámicas:
//   CONFIG_DEFINICIONES → qué tipos de configuración existen
//   CONFIG_PARAMETROS   → qué campos tiene cada definición
//   CONFIG_DATOS        → valores reales almacenados (híbrido columnas + JSONB)

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoConfig = "estructura_campo" | "calibres" | "datos_personal" | "asistencia";
type TipoDato   = "Texto" | "Número" | "Fecha" | "Sí/No" | "Lista";

interface ConfigDefinicion {
  id: string;
  tipo: TipoConfig;
  nombre: string;
  descripcion: string;
  version: string;
  activo: boolean;
}

interface ConfigParametro {
  id: string;
  definicion_id: string;
  nombre: string;
  tipo_dato: TipoDato;
  obligatorio: boolean;
  orden: number;
}

interface ConfigDato {
  id: string;
  definicion_id: string;
  referencia: string;
  fecha: string;
  valores: string; // Representación del JSONB — diseño híbrido §2.2
}

interface BrandConfig {
  nombreEmpresa: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAccent: string;
}

// ─── Datos demo ───────────────────────────────────────────────────────────────

const initDefiniciones: ConfigDefinicion[] = [
  { id: "1", tipo: "estructura_campo", nombre: "Estructura de Campo v2.0",  descripcion: "Jerarquía Bloque → Macrotúnel → Nave",              version: "2.0", activo: true },
  { id: "2", tipo: "calibres",         nombre: "Calibres Arándano Azul",    descripcion: "Rangos de calibre en mm para selección de fruta",   version: "1.0", activo: true },
  { id: "3", tipo: "datos_personal",   nombre: "Ficha de Personal v3.0",    descripcion: "Datos dinámicos de trabajadores de campo",           version: "3.0", activo: true },
  { id: "4", tipo: "asistencia",       nombre: "Control de Asistencia",     descripcion: "Registro de timbrado y jornada laboral (QR/bio)",   version: "1.5", activo: true },
];

const initParametros: ConfigParametro[] = [
  // estructura_campo
  { id: "1",  definicion_id: "1", nombre: "nombre",             tipo_dato: "Texto",   obligatorio: true,  orden: 1 },
  { id: "2",  definicion_id: "1", nombre: "nivel",              tipo_dato: "Número",  obligatorio: true,  orden: 2 },
  { id: "3",  definicion_id: "1", nombre: "capacidad_plantas",  tipo_dato: "Número",  obligatorio: false, orden: 3 },
  // calibres
  { id: "4",  definicion_id: "2", nombre: "nombre",             tipo_dato: "Texto",   obligatorio: true,  orden: 1 },
  { id: "5",  definicion_id: "2", nombre: "mm_minimo",          tipo_dato: "Número",  obligatorio: true,  orden: 2 },
  { id: "6",  definicion_id: "2", nombre: "mm_maximo",          tipo_dato: "Número",  obligatorio: true,  orden: 3 },
  { id: "7",  definicion_id: "2", nombre: "peso_g_minimo",      tipo_dato: "Número",  obligatorio: false, orden: 4 },
  // datos_personal
  { id: "8",  definicion_id: "3", nombre: "rut",                tipo_dato: "Texto",   obligatorio: true,  orden: 1 },
  { id: "9",  definicion_id: "3", nombre: "nombre_completo",    tipo_dato: "Texto",   obligatorio: true,  orden: 2 },
  { id: "10", definicion_id: "3", nombre: "cargo",              tipo_dato: "Lista",   obligatorio: true,  orden: 3 },
  { id: "11", definicion_id: "3", nombre: "telefono",           tipo_dato: "Texto",   obligatorio: false, orden: 4 },
  { id: "12", definicion_id: "3", nombre: "fecha_ingreso",      tipo_dato: "Fecha",   obligatorio: true,  orden: 5 },
  { id: "13", definicion_id: "3", nombre: "tipo_contrato",      tipo_dato: "Lista",   obligatorio: true,  orden: 6 },
  // asistencia
  { id: "14", definicion_id: "4", nombre: "empleado_id",        tipo_dato: "Texto",   obligatorio: true,  orden: 1 },
  { id: "15", definicion_id: "4", nombre: "tipo_marca",         tipo_dato: "Lista",   obligatorio: true,  orden: 2 },
  { id: "16", definicion_id: "4", nombre: "hora",               tipo_dato: "Texto",   obligatorio: true,  orden: 3 },
  { id: "17", definicion_id: "4", nombre: "ubicacion_gps",      tipo_dato: "Texto",   obligatorio: false, orden: 4 },
];

const initDatos: ConfigDato[] = [
  { id: "1", definicion_id: "1", referencia: "Bloque A-1",       fecha: "2025-01-10", valores: '{"nombre":"Bloque A-1","nivel":1,"capacidad_plantas":4500}' },
  { id: "2", definicion_id: "1", referencia: "Macrotúnel A-1-1", fecha: "2025-01-10", valores: '{"nombre":"Macrotúnel A-1-1","nivel":2,"capacidad_plantas":900}' },
  { id: "3", definicion_id: "2", referencia: "Jumbo",             fecha: "2025-01-10", valores: '{"nombre":"Jumbo","mm_minimo":18,"mm_maximo":20,"peso_g_minimo":5}' },
  { id: "4", definicion_id: "2", referencia: "Extra",             fecha: "2025-01-10", valores: '{"nombre":"Extra","mm_minimo":16,"mm_maximo":18,"peso_g_minimo":4}' },
  { id: "5", definicion_id: "3", referencia: "RUT: 12.345.678-9", fecha: "2025-02-01", valores: '{"rut":"12.345.678-9","nombre_completo":"Pedro Soto","cargo":"Cosechador","telefono":"+56912345678","fecha_ingreso":"2024-03-01","tipo_contrato":"plazo_fijo"}' },
  { id: "6", definicion_id: "4", referencia: "RUT: 12.345.678-9", fecha: "2025-03-01", valores: '{"empleado_id":"12345678","tipo_marca":"entrada","hora":"07:42","ubicacion_gps":"Bloque A-1"}' },
];

// ─── Columnas CONFIG_DEFINICIONES ─────────────────────────────────────────────

const colsDefinicion: Column<ConfigDefinicion>[] = [
  { key: "tipo", header: "Tipo", width: "160px",
    type: "select", options: [
      { value: "estructura_campo", label: "Estructura Campo" },
      { value: "calibres",         label: "Calibres" },
      { value: "datos_personal",   label: "Datos Personal" },
      { value: "asistencia",       label: "Asistencia" },
    ]},
  { key: "nombre",      header: "Nombre",      width: "220px" },
  { key: "descripcion", header: "Descripción", width: "280px" },
  { key: "version",     header: "Versión",     width: "80px" },
];

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const tipoLabels: Record<TipoConfig, string> = {
  estructura_campo: "Estructura Campo",
  calibres:         "Calibres",
  datos_personal:   "Datos Personal",
  asistencia:       "Asistencia",
};

const tipoBadgeColor: Record<TipoConfig, string> = {
  estructura_campo: "bg-green-100 text-green-700",
  calibres:         "bg-blue-100 text-blue-700",
  datos_personal:   "bg-purple-100 text-purple-700",
  asistencia:       "bg-orange-100 text-orange-700",
};

const tipoDatoInputType: Record<TipoDato, string> = {
  Texto:  "text",
  Número: "number",
  Fecha:  "date",
  "Sí/No": "text",
  Lista:  "text",
};

// ─── Componente principal ─────────────────────────────────────────────────────

const Configuracion = () => {
  const [definiciones, setDefiniciones] = useState<ConfigDefinicion[]>(initDefiniciones);
  const [parametros,   setParametros]   = useState<ConfigParametro[]>(initParametros);
  const [datos,        setDatos]        = useState<ConfigDato[]>(initDatos);
  const [brandConfig,  setBrandConfig]  = useState<BrandConfig>({
    nombreEmpresa:   "BlueData",
    colorPrimario:   "#2d6a4f",
    colorSecundario: "#40916c",
    colorAccent:     "#d4a72d",
  });

  // ── Filtros ──
  const [filterParDefId, setFilterParDefId] = useState<string>("all");
  const [filterDatDefId, setFilterDatDefId] = useState<string>("all");

  // ── Estado editor CONFIG_DATOS ──
  const [expandedDatoIds, setExpandedDatoIds] = useState<Set<string>>(new Set());
  const [editingDatoId,   setEditingDatoId]   = useState<string | null>(null);
  const [editingDato,     setEditingDato]      = useState<ConfigDato | null>(null);

  // ── Handlers definiciones ──
  const updDef = (i: number, k: keyof ConfigDefinicion, v: unknown) =>
    setDefiniciones(p => { const r = [...p]; r[i] = { ...r[i], [k]: v }; return r; });
  const delDef = (i: number) => setDefiniciones(p => p.filter((_, j) => j !== i));
  const addDef = () => setDefiniciones(p => [...p, {
    id: String(Date.now()), tipo: "estructura_campo" as TipoConfig,
    nombre: "", descripcion: "", version: "1.0", activo: true,
  }]);

  // ── Handlers parámetros (índice original) ──
  const updPar = (i: number, k: keyof ConfigParametro, v: unknown) =>
    setParametros(p => { const r = [...p]; r[i] = { ...r[i], [k]: v }; return r; });
  const delPar = (i: number) => setParametros(p => p.filter((_, j) => j !== i));

  // ── CONFIG_PARAMETROS — filtrado con mapeo de índices ──
  const filteredParametros = filterParDefId === "all"
    ? parametros
    : parametros.filter(p => p.definicion_id === filterParDefId);

  const updParFiltered = (rowIndex: number, k: keyof ConfigParametro, v: unknown) => {
    const item = filteredParametros[rowIndex];
    const originalIdx = parametros.findIndex(p => p.id === item.id);
    if (originalIdx !== -1) updPar(originalIdx, k, v);
  };
  const delParFiltered = (rowIndex: number) => {
    const item = filteredParametros[rowIndex];
    const originalIdx = parametros.findIndex(p => p.id === item.id);
    if (originalIdx !== -1) delPar(originalIdx);
  };
  const addParFiltered = () => setParametros(p => [...p, {
    id: String(Date.now()),
    definicion_id: filterParDefId === "all" ? (definiciones[0]?.id ?? "1") : filterParDefId,
    nombre: "",
    tipo_dato: "Texto" as TipoDato,
    obligatorio: false,
    orden: filteredParametros.length + 1,
  }]);

  // Columnas dinámicas para CONFIG_PARAMETROS — definicion_id muestra nombre
  const colsParametro: Column<ConfigParametro>[] = [
    {
      key: "definicion_id", header: "Definición", width: "220px",
      type: "select",
      options: definiciones.map(d => ({ value: d.id, label: d.nombre })),
    },
    { key: "nombre",    header: "Campo", width: "170px" },
    { key: "tipo_dato", header: "Tipo",  width: "130px",
      type: "select", options: [
        { value: "Texto",  label: "Texto" },
        { value: "Número", label: "Número" },
        { value: "Fecha",  label: "Fecha" },
        { value: "Sí/No",  label: "Sí/No" },
        { value: "Lista",  label: "Lista (select)" },
      ]},
    { key: "orden", header: "Orden", width: "70px", type: "number" },
  ];

  // ── Helpers CONFIG_DATOS ──
  const getDefNombre = (defId: string) =>
    definiciones.find(d => d.id === defId)?.nombre ?? `Def. ${defId}`;
  const getDefParams = (defId: string) =>
    parametros.filter(p => p.definicion_id === defId).sort((a, b) => a.orden - b.orden);
  const parseValores = (v: string): Record<string, string> => {
    try { return JSON.parse(v) as Record<string, string>; } catch { return {}; }
  };

  // ── CONFIG_DATOS — filtrado ──
  const filteredDatos = filterDatDefId === "all"
    ? datos
    : datos.filter(d => d.definicion_id === filterDatDefId);

  // Toggle expand/collapse de campos
  const toggleExpand = (id: string) =>
    setExpandedDatoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Iniciar edición de un dato
  const startEdit = (dato: ConfigDato) => {
    setEditingDatoId(dato.id);
    setEditingDato({ ...dato });
    setExpandedDatoIds(prev => new Set([...prev, dato.id]));
  };
  const cancelEdit = () => { setEditingDatoId(null); setEditingDato(null); };

  const saveEdit = () => {
    if (!editingDato) return;
    setDatos(prev => prev.map(d => d.id === editingDato.id ? editingDato : d));
    setEditingDatoId(null);
    setEditingDato(null);
  };

  // Actualizar un campo individual dentro de valores (JSON)
  const updateEditingField = (fieldName: string, value: string) => {
    if (!editingDato) return;
    const parsed = parseValores(editingDato.valores);
    parsed[fieldName] = value;
    setEditingDato({ ...editingDato, valores: JSON.stringify(parsed) });
  };

  // Cambiar definición del dato en edición → regenera campos vacíos
  const changeEditingDef = (newDefId: string) => {
    if (!editingDato) return;
    const newParams = getDefParams(newDefId);
    const emptyVals: Record<string, string> = {};
    newParams.forEach(p => { emptyVals[p.nombre] = ""; });
    setEditingDato({ ...editingDato, definicion_id: newDefId, valores: JSON.stringify(emptyVals) });
  };

  const deleteDato = (id: string) => setDatos(prev => prev.filter(d => d.id !== id));

  // Agregar nuevo dato — abre directamente en modo edición con campos vacíos
  const addNewDato = () => {
    const defId = filterDatDefId === "all" ? (definiciones[0]?.id ?? "1") : filterDatDefId;
    const newParams = getDefParams(defId);
    const emptyVals: Record<string, string> = {};
    newParams.forEach(p => { emptyVals[p.nombre] = ""; });
    const newDato: ConfigDato = {
      id: String(Date.now()),
      definicion_id: defId,
      referencia: "",
      fecha: new Date().toISOString().split("T")[0],
      valores: JSON.stringify(emptyVals),
    };
    setDatos(prev => [...prev, newDato]);
    setEditingDatoId(newDato.id);
    setEditingDato(newDato);
    setExpandedDatoIds(prev => new Set([...prev, newDato.id]));
    if (filterDatDefId === "all") setFilterDatDefId(defId);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description="Sistema de configuraciones dinámicas — CONFIG_DEFINICIONES · CONFIG_PARAMETROS · CONFIG_DATOS"
      />

      {/* Nota arquitectónica (§4 informe V3) */}
      <div className="flex items-start gap-3 mb-6 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Sistema Dinámico (V3):</strong> Las tablas rígidas anteriores
          (CONFIG_ESTRUCTURA_JERARQUIA, CONFIG_CALIBRES, PERSONAL, ASISTENCIA) han sido
          reemplazadas por 3 tablas dinámicas. La estructura se define en{" "}
          <strong>Definiciones</strong>, los campos en <strong>Parámetros</strong>{" "}
          y los valores reales en <strong>Datos</strong> (formato híbrido: columnas + JSONB).
        </span>
      </div>

      <Tabs defaultValue="definiciones" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap gap-1 h-auto">
          <TabsTrigger value="definiciones" className="flex items-center gap-2">
            <Layers className="w-4 h-4" /> CONFIG_DEFINICIONES
          </TabsTrigger>
          <TabsTrigger value="parametros" className="flex items-center gap-2">
            <List className="w-4 h-4" /> CONFIG_PARAMETROS
          </TabsTrigger>
          <TabsTrigger value="datos" className="flex items-center gap-2">
            <Table2 className="w-4 h-4" /> CONFIG_DATOS
          </TabsTrigger>
          <TabsTrigger value="marca" className="flex items-center gap-2">
            <Palette className="w-4 h-4" /> Marca
          </TabsTrigger>
          <TabsTrigger value="avanzado" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Avanzado
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            CONFIG_DEFINICIONES
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="definiciones" className="space-y-4">
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
            Define <strong>qué tipos de configuración</strong> existen en el sistema.
            Cada entrada reemplaza una tabla rígida del diseño anterior.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            {definiciones.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoBadgeColor[d.tipo]}`}>
                  {tipoLabels[d.tipo]}
                </span>
                <p className="text-sm font-semibold text-foreground mt-1">{d.nombre}</p>
                <p className="text-xs text-muted-foreground">v{d.version}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{d.descripcion}</p>
              </div>
            ))}
          </div>
          <EditableTable
            title="Registro de Definiciones"
            data={definiciones}
            columns={colsDefinicion}
            onUpdate={updDef}
            onDelete={delDef}
            onAdd={addDef}
          />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            CONFIG_PARAMETROS — con filtro y nombre de definición
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="parametros" className="space-y-4">
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
            Define <strong>qué campos (parámetros)</strong> tiene cada tipo de configuración.
            Filtra por definición para ver solo los campos relevantes.
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterParDefId("all")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                filterParDefId === "all"
                  ? "bg-foreground text-background border-transparent"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/50",
              )}
            >
              Todas <span className="opacity-60">({parametros.length})</span>
            </button>
            {definiciones.map(d => {
              const count = parametros.filter(p => p.definicion_id === d.id).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setFilterParDefId(d.id)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                    filterParDefId === d.id
                      ? `${tipoBadgeColor[d.tipo]} border-transparent`
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50",
                  )}
                >
                  {d.nombre} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <EditableTable
            title={
              filterParDefId === "all"
                ? "Todos los Parámetros"
                : `Parámetros — ${getDefNombre(filterParDefId)}`
            }
            data={filteredParametros}
            columns={colsParametro}
            onUpdate={updParFiltered}
            onDelete={delParFiltered}
            onAdd={addParFiltered}
            searchable={false}
          />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            CONFIG_DATOS — editor estructurado (sin JSON crudo)
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="datos" className="space-y-4">
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
            Almacena los <strong>valores reales</strong> de cada configuración.
            Los campos se presentan con sus <strong>nombres y tipos</strong> de la definición
            correspondiente — sin necesidad de editar JSON directamente.
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterDatDefId("all")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                filterDatDefId === "all"
                  ? "bg-foreground text-background border-transparent"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/50",
              )}
            >
              Todos <span className="opacity-60">({datos.length})</span>
            </button>
            {definiciones.map(d => {
              const count = datos.filter(dt => dt.definicion_id === d.id).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setFilterDatDefId(d.id)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                    filterDatDefId === d.id
                      ? `${tipoBadgeColor[d.tipo]} border-transparent`
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50",
                  )}
                >
                  {d.nombre} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Panel de datos */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                {filterDatDefId === "all"
                  ? "Todos los Datos"
                  : `Datos — ${getDefNombre(filterDatDefId)}`}
              </h3>
              <Button onClick={addNewDato} size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Agregar dato
              </Button>
            </div>

            {/* Filas */}
            <div className="divide-y divide-border">
              {filteredDatos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No hay datos disponibles. Haz click en{" "}
                  <strong>Agregar dato</strong> para comenzar.
                </div>
              ) : (
                filteredDatos.map(dato => {
                  const isExpanded = expandedDatoIds.has(dato.id);
                  const isEditing  = editingDatoId === dato.id;
                  const defObj     = definiciones.find(d => d.id === dato.definicion_id);
                  const activeDefId = isEditing && editingDato
                    ? editingDato.definicion_id
                    : dato.definicion_id;
                  const defParams  = getDefParams(activeDefId);
                  const parsedVals = parseValores(
                    isEditing && editingDato ? editingDato.valores : dato.valores,
                  );

                  return (
                    <div key={dato.id}>
                      {/* Cabecera de fila */}
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        isEditing ? "bg-primary/5" : "hover:bg-muted/30",
                      )}>
                        {/* Badge de tipo */}
                        {defObj && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                            tipoBadgeColor[defObj.tipo],
                          )}>
                            {tipoLabels[defObj.tipo]}
                          </span>
                        )}

                        {/* Campos cabecera: vista vs edición */}
                        {isEditing && editingDato ? (
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <select
                              value={editingDato.definicion_id}
                              onChange={e => changeEditingDef(e.target.value)}
                              className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {definiciones.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                              ))}
                            </select>
                            <Input
                              value={editingDato.referencia}
                              onChange={e => setEditingDato({ ...editingDato, referencia: e.target.value })}
                              placeholder="Referencia"
                              className="h-8 text-sm w-44"
                            />
                            <input
                              type="date"
                              value={editingDato.fecha}
                              onChange={e => setEditingDato({ ...editingDato, fecha: e.target.value })}
                              className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">
                              {dato.referencia || (
                                <span className="text-muted-foreground italic">Sin referencia</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {dato.fecha}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {defParams.length} campo{defParams.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={saveEdit} className="h-7 text-xs px-3">
                                <Save className="w-3.5 h-3.5 mr-1" /> Guardar
                              </Button>
                              <Button
                                size="sm" variant="outline" onClick={cancelEdit}
                                className="h-7 text-xs px-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleExpand(dato.id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                              >
                                {isExpanded
                                  ? <><ChevronUp   className="w-3.5 h-3.5" /> Ocultar</>
                                  : <><ChevronDown className="w-3.5 h-3.5" /> Ver campos</>}
                              </button>
                              <button
                                onClick={() => startEdit(dato)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteDato(dato.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Campos expandidos / editor estructurado */}
                      {(isExpanded || isEditing) && (
                        <div className={cn(
                          "px-4 pb-5 pt-3",
                          isEditing
                            ? "bg-primary/5 border-t border-primary/10"
                            : "bg-muted/20 border-t border-border",
                        )}>
                          {defParams.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No hay parámetros definidos para esta definición.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {defParams.map(param => {
                                const fieldVal = isEditing && editingDato
                                  ? (parseValores(editingDato.valores)[param.nombre] ?? "")
                                  : (parsedVals[param.nombre] ?? "—");

                                return (
                                  <div key={param.id} className="space-y-1">
                                    {/* Etiqueta */}
                                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <span className="capitalize">
                                        {param.nombre.replace(/_/g, " ")}
                                      </span>
                                      {param.obligatorio && (
                                        <span className="text-destructive" title="Obligatorio">*</span>
                                      )}
                                      <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">
                                        {param.tipo_dato}
                                      </span>
                                    </p>
                                    {/* Input edición / valor lectura */}
                                    {isEditing ? (
                                      <input
                                        type={tipoDatoInputType[param.tipo_dato]}
                                        value={parseValores(editingDato!.valores)[param.nombre] ?? ""}
                                        onChange={e => updateEditingField(param.nombre, e.target.value)}
                                        placeholder={param.nombre.replace(/_/g, " ")}
                                        className="w-full h-8 text-sm border border-border rounded-md px-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                    ) : (
                                      <div className="text-sm text-foreground bg-background border border-border rounded-md px-2.5 py-1.5 min-h-[34px] truncate">
                                        {String(fieldVal)}
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

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              {filteredDatos.length} de {datos.length} registros
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Marca
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="marca" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Personalización de Marca</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label>Logo de la Empresa</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arrastra tu logo aquí o haz click para seleccionar
                  </p>
                  <Button variant="outline" size="sm">Seleccionar archivo</Button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input
                    id="nombreEmpresa"
                    value={brandConfig.nombreEmpresa}
                    onChange={e => setBrandConfig(p => ({ ...p, nombreEmpresa: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h4 className="font-medium text-foreground mb-4">Colores del Sistema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(["colorPrimario", "colorSecundario", "colorAccent"] as const).map((key, i) => (
                  <div key={key} className="space-y-2">
                    <Label>{["Color Primario", "Color Secundario", "Color de Acento"][i]}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandConfig[key]}
                        onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                      />
                      <Input
                        value={brandConfig[key]}
                        onChange={e => setBrandConfig(p => ({ ...p, [key]: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Avanzado
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="avanzado" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Configuración Avanzada</h3>
            <div className="space-y-6">
              {[
                { label: "Modo Oscuro",              desc: "Activar tema oscuro para la interfaz",          checked: false },
                { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo",        checked: true  },
                { label: "Auto-guardado",             desc: "Guardar cambios automáticamente en tablas",     checked: true  },
                { label: "Multi-tenant activo",       desc: "Habilitar aislamiento de datos por empresa",    checked: true  },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.checked} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Configuracion;
