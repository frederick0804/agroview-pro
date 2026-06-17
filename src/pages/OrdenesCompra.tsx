import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout }  from "@/components/layout/MainLayout";
import { PageHeader }  from "@/components/layout/PageHeader";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useInventario,
  type InvOrdenCompra, type InvLineaOrden, type InvOrdenEstado,
} from "@/contexts/InventarioContext";
import { useRole } from "@/contexts/RoleContext";
import {
  Plus, Pencil, Trash2, ChevronRight, Building2,
  CheckCircle2, Clock, XCircle, PackageCheck,
  Save, AlertTriangle, Eye, FileText, Ban, Calendar, ShoppingCart, ArrowLeft,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CLIENTES_DEMO: Record<string, string> = {
  "cli-agrotati":   "Agrotati",
  "cli-ecuablue":   "Ecuablue",
  "cli-sierrablue": "Sierrablue",
};

const ESTADO_META: Record<InvOrdenEstado, { label: string; cls: string; icon: React.ReactNode }> = {
  solicitado: { label: "Solicitado", cls: "bg-yellow-100 text-yellow-800 border-yellow-200",  icon: <Clock        className="h-3 w-3" /> },
  aprobado:   { label: "Aprobado",   cls: "bg-blue-100   text-blue-800   border-blue-200",    icon: <CheckCircle2 className="h-3 w-3" /> },
  recibido:   { label: "Recibido",   cls: "bg-green-100  text-green-800  border-green-200",   icon: <PackageCheck className="h-3 w-3" /> },
  cancelado:  { label: "Cancelado",  cls: "bg-red-100    text-red-800    border-red-200",     icon: <XCircle      className="h-3 w-3" /> },
};

function EstadoBadge({ estado }: { estado: InvOrdenEstado }) {
  const m = ESTADO_META[estado];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function lineaTotal(l: InvLineaOrden) { return l.cantidad * l.precio_unitario; }
function ordenTotal(o: InvOrdenCompra) { return o.lineas.reduce((s, l) => s + lineaTotal(l), 0); }

// ─── Form state helpers ────────────────────────────────────────────────────────

interface LineaForm {
  id:              string;
  producto_id:     string;
  cantidad:        string;
  precio_unitario: string;
  estado:          "aprobado" | "sin_aprobar";
  cantidad_recibida: string;
}

function lineaFormVacia(): LineaForm {
  return { id: `tmp-${Date.now()}-${Math.random()}`, producto_id: "", cantidad: "1", precio_unitario: "0", estado: "sin_aprobar", cantidad_recibida: "0" };
}

function lineaToForm(l: InvLineaOrden): LineaForm {
  return {
    id: l.id,
    producto_id: l.producto_id,
    cantidad: String(l.cantidad),
    precio_unitario: String(l.precio_unitario),
    estado: l.estado,
    cantidad_recibida: String(l.cantidad_recibida),
  };
}

function lineaFromForm(f: LineaForm): InvLineaOrden {
  return {
    id: f.id,
    producto_id: f.producto_id,
    cantidad: parseFloat(f.cantidad.replace(",", ".")) || 0,
    precio_unitario: parseFloat(f.precio_unitario.replace(",", ".")) || 0,
    estado: f.estado,
    cantidad_recibida: parseFloat(f.cantidad_recibida.replace(",", ".")) || 0,
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdenesCompra() {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const {
    ordenes, crearOrden, editarOrden, eliminarOrden, aprobarOrden, recibirOrden, cancelarOrden,
    proveedores, catalogos,
  } = useInventario();

  const [search,        setSearch]        = useState("");
  const [fEstado,       setFEstado]       = useState<InvOrdenEstado | "all">("all");
  const [fEmpresa,      setFEmpresa]      = useState("all");
  const [fProv,         setFProv]         = useState("all");
  const [fDesde,        setFDesde]        = useState(TODAY);
  const [fHasta,        setFHasta]        = useState(TODAY);
  const [page,          setPage]          = useState(1);
  const PAGE_SIZE = 15;
  const [detailOrden,   setDetailOrden]   = useState<InvOrdenCompra | null>(null);
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [editingOrden,  setEditingOrden]  = useState<InvOrdenCompra | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<InvOrdenCompra | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ orden: InvOrdenCompra; tipo: "aprobar" | "recibir" | "cancelar" } | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fNumero,      setFNumero]      = useState("");
  const [fClienteId,   setFClienteId]   = useState("cli-agrotati");
  const [fProveedorId, setFProveedorId] = useState("");
  const [fFecha,       setFFecha]       = useState(new Date().toISOString().slice(0, 10));
  const [fNotas,       setFNotas]       = useState("");
  const [fLineas,      setFLineas]      = useState<LineaForm[]>([lineaFormVacia()]);

  function openNueva() {
    setEditingOrden(null);
    setFNumero("");
    setFClienteId("cli-agrotati");
    setFProveedorId("");
    setFFecha(new Date().toISOString().slice(0, 10));
    setFNotas("");
    setFLineas([lineaFormVacia()]);
    setSheetOpen(true);
  }

  function openEditar(o: InvOrdenCompra) {
    setEditingOrden(o);
    setFNumero(o.numero);
    setFClienteId(o.cliente_id);
    setFProveedorId(o.proveedor_id);
    setFFecha(o.fecha_pedido);
    setFNotas(o.notas ?? "");
    setFLineas(o.lineas.map(lineaToForm));
    setSheetOpen(true);
  }

  function handleGuardar() {
    const lineas = fLineas.map(lineaFromForm).filter(l => l.producto_id);
    const payload: Omit<InvOrdenCompra, "id" | "created_at" | "updated_at"> = {
      numero:        fNumero.trim() || `ORD-${Date.now()}`,
      cliente_id:    fClienteId,
      proveedor_id:  fProveedorId,
      solicitado_por: currentUser?.nombre ?? "Usuario",
      aprobado_por:  editingOrden?.aprobado_por,
      estado:        editingOrden?.estado ?? "solicitado",
      fecha_pedido:  fFecha,
      lineas,
      notas:         fNotas || undefined,
    };
    if (editingOrden) {
      editarOrden(editingOrden.id, payload);
    } else {
      crearOrden(payload);
    }
    setSheetOpen(false);
  }

  function updateLinea(idx: number, cambios: Partial<LineaForm>) {
    setFLineas(prev => prev.map((l, i) => i === idx ? { ...l, ...cambios } : l));
  }

  function addLinea() { setFLineas(prev => [...prev, lineaFormVacia()]); }
  function removeLinea(idx: number) { setFLineas(prev => prev.filter((_, i) => i !== idx)); }

  // ── Filtered + grouped + paginated ─────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = search.toLowerCase();
    return ordenes.filter(o => {
      if (fEstado !== "all" && o.estado !== fEstado)          return false;
      if (fEmpresa !== "all" && o.cliente_id !== fEmpresa)    return false;
      if (fProv    !== "all" && o.proveedor_id !== fProv)     return false;
      if (fDesde && o.fecha_pedido < fDesde)                  return false;
      if (fHasta && o.fecha_pedido > fHasta)                  return false;
      if (q) {
        const provNombre = (proveedores.find(p => p.id === o.proveedor_id)?.nombre ?? "").toLowerCase();
        const empresa    = (CLIENTES_DEMO[o.cliente_id] ?? o.cliente_id).toLowerCase();
        if (!o.numero.toLowerCase().includes(q) && !provNombre.includes(q) && !empresa.includes(q))
          return false;
      }
      return true;
    });
  }, [ordenes, search, fEstado, fEmpresa, fProv, fDesde, fHasta, proveedores]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginadas  = filtradas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const agrupadas = useMemo(() => {
    const map = new Map<string, InvOrdenCompra[]>();
    paginadas.forEach(o => {
      const key = o.cliente_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      (CLIENTES_DEMO[a] ?? a).localeCompare(CLIENTES_DEMO[b] ?? b));
  }, [paginadas]);

  const activeFilters = [fEstado !== "all", fEmpresa !== "all", fProv !== "all", fDesde !== TODAY, fHasta !== TODAY].filter(Boolean).length;

  function clearFilters() {
    setSearch(""); setFEstado("all"); setFEmpresa("all");
    setFProv("all"); setFDesde(TODAY); setFHasta(TODAY); setPage(1);
  }
  function resetPage() { setPage(1); }

  function applyPreset(preset: "hoy" | "semana" | "mes" | "trimestre" | "anio" | "todo") {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const now = new Date();
    const hasta = iso(now);
    setPage(1);
    if (preset === "todo")      { setFDesde(""); setFHasta(""); return; }
    if (preset === "hoy")       { setFDesde(TODAY); setFHasta(TODAY); return; }
    if (preset === "semana")    { const d = new Date(now); d.setDate(d.getDate() - 6); setFDesde(iso(d)); setFHasta(hasta); return; }
    if (preset === "mes")       { setFDesde(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setFHasta(hasta); return; }
    if (preset === "trimestre") { setFDesde(iso(new Date(now.getFullYear(), now.getMonth() - 2, 1))); setFHasta(hasta); return; }
    if (preset === "anio")      { setFDesde(iso(new Date(now.getFullYear(), 0, 1))); setFHasta(hasta); return; }
  }

  const fLineasTotal = fLineas.reduce((s, l) => {
    const cant = parseFloat(l.cantidad.replace(",", ".")) || 0;
    const price = parseFloat(l.precio_unitario.replace(",", ".")) || 0;
    return s + cant * price;
  }, 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      {/* Breadcrumb */}
      <nav className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate("/inventario")} className="hover:text-foreground hover:underline">
          Inventario
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Órdenes de compra</span>
      </nav>
      <PageHeader
        title="Órdenes de compra"
        description="Gestión de pedidos a proveedores"
        actions={
          <button
            onClick={() => navigate("/inventario")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Inventario
          </button>
        }
      />

      {/* Panel de filtros */}
      <div className="mb-4 rounded-xl border border-border bg-card overflow-hidden">

        {/* Sección 1: Período */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Período</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { key: "hoy",       label: "Hoy"      },
              { key: "semana",    label: "7 días"    },
              { key: "mes",       label: "Este mes"  },
              { key: "trimestre", label: "3 meses"   },
              { key: "anio",      label: "Este año"  },
              { key: "todo",      label: "Todo"      },
            ] as const).map(p => {
              const isActive =
                (p.key === "hoy"  && fDesde === TODAY && fHasta === TODAY) ||
                (p.key === "todo" && !fDesde && !fHasta);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}

            <span className="h-4 w-px bg-border mx-1" />

            {/* Rango personalizado */}
            <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1">
              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={fDesde}
                onChange={e => { setFDesde(e.target.value); resetPage(); }}
                className="bg-transparent text-[11px] outline-none w-[100px] text-muted-foreground focus:text-foreground"
              />
              <span className="text-[10px] text-muted-foreground">→</span>
              <input
                type="date"
                value={fHasta}
                onChange={e => { setFHasta(e.target.value); resetPage(); }}
                className="bg-transparent text-[11px] outline-none w-[100px] text-muted-foreground focus:text-foreground"
              />
            </div>

            <span className="ml-auto shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
              <strong className="text-foreground">{filtradas.length}</strong> orden{filtradas.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>

        <div className="border-t border-border/60" />

        {/* Sección 2: Filtros + búsqueda + nueva orden */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-center gap-2">

            {/* Búsqueda */}
            <div className="relative">
              <FileText className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar número, proveedor…"
                value={search}
                onChange={e => { setSearch(e.target.value); resetPage(); }}
                className="h-8 pl-8 text-xs w-48"
              />
              {search && (
                <button onClick={() => { setSearch(""); resetPage(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Estado */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              {([
                { v: "all",       label: "Todos" },
                { v: "solicitado",label: "Solicitado" },
                { v: "aprobado",  label: "Aprobado" },
                { v: "recibido",  label: "Recibido" },
                { v: "cancelado", label: "Cancelado" },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => { setFEstado(opt.v); resetPage(); }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    fEstado === opt.v
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  {opt.v !== "all" && (
                    <span className="ml-1 tabular-nums opacity-60">
                      {ordenes.filter(o => o.estado === opt.v).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Empresa */}
            <Select value={fEmpresa} onValueChange={v => { setFEmpresa(v); resetPage(); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {Object.entries(CLIENTES_DEMO).map(([id, nombre]) => (
                  <SelectItem key={id} value={id}>{nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Proveedor */}
            <Select value={fProv} onValueChange={v => { setFProv(v); resetPage(); }}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <XCircle className="h-3.5 w-3.5" />
                Limpiar ({activeFilters})
              </button>
            )}

            <div className="ml-auto">
              <Button onClick={openNueva} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Nueva orden
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contador de resultados — oculto, ya está en el panel */}
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground hidden">
        <span>
          <strong className="text-foreground">{filtradas.length}</strong> orden{filtradas.length !== 1 ? "es" : ""}
          {activeFilters > 0 || search ? " encontradas" : " en total"}
        </span>
        {totalPages > 1 && (
          <span className="text-border">·</span>
        )}
        {totalPages > 1 && (
          <span>página {safePage} de {totalPages}</span>
        )}
      </div>

      {/* Tabla agrupada */}
      {agrupadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No hay órdenes que coincidan</p>
          {(activeFilters > 0 || search) && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">N° Orden</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha pedido</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proveedor</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitado por</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aprobado por</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agrupadas.map(([clienteId, ords]) => (
                <Fragment key={clienteId}>
                  {/* Cabecera de grupo */}
                  <tr className="bg-muted/30">
                    <td colSpan={8} className="px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {CLIENTES_DEMO[clienteId] ?? clienteId}
                        </span>
                        <span className="text-[10px] text-muted-foreground">({ords.length})</span>
                      </div>
                    </td>
                  </tr>
                  {/* Filas de órdenes */}
                  {ords.map((orden, ri) => {
                    const prov = proveedores.find(p => p.id === orden.proveedor_id);
                    return (
                      <tr
                        key={orden.id}
                        onClick={() => setDetailOrden(orden)}
                        className={cn(
                          "border-t border-border/50 transition-colors hover:bg-accent/40 cursor-pointer",
                          ri % 2 === 0 ? "bg-background" : "bg-muted/10",
                        )}
                      >
                        <td className="px-4 py-2.5 font-medium text-primary">{orden.numero}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(orden.fecha_pedido)}</td>
                        <td className="px-4 py-2.5">{prov?.nombre ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{orden.solicitado_por}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{orden.aprobado_por ?? <span className="opacity-40">—</span>}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{fmtCurrency(ordenTotal(orden))}</td>
                        <td className="px-4 py-2.5"><EstadoBadge estado={orden.estado} /></td>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailOrden(orden)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Aprobar — solo en solicitado */}
                            {orden.estado === "solicitado" && (
                              <button
                                onClick={() => setConfirmAction({ orden, tipo: "aprobar" })}
                                className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                                title="Aprobar orden"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Recibir — solo en aprobado */}
                            {orden.estado === "aprobado" && (
                              <button
                                onClick={() => setConfirmAction({ orden, tipo: "recibir" })}
                                className="rounded-md p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                                title="Marcar como recibido"
                              >
                                <PackageCheck className="h-4 w-4" />
                              </button>
                            )}

                            {/* Cancelar — en solicitado o aprobado */}
                            {(orden.estado === "solicitado" || orden.estado === "aprobado") && (
                              <button
                                onClick={() => setConfirmAction({ orden, tipo: "cancelar" })}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                                title="Cancelar orden"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}

                            {/* Editar — solo si no está cancelada ni recibida */}
                            {orden.estado !== "cancelado" && orden.estado !== "recibido" && (
                              <button
                                onClick={() => openEditar(orden)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}

                            {/* Eliminar — solo en cancelado */}
                            {orden.estado === "cancelado" && (
                              <button
                                onClick={() => setDeleteTarget(orden)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtradas.length)} de {filtradas.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1
                : safePage <= 4 ? i + 1
                : safePage >= totalPages - 3 ? totalPages - 6 + i
                : safePage - 3 + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-w-[32px]",
                    pg === safePage
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── Sheet detalle ────────────────────────────────────────────────── */}
      <Sheet open={!!detailOrden} onOpenChange={v => !v && setDetailOrden(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetTitle className="sr-only">{detailOrden?.numero ?? "Detalle de orden"}</SheetTitle>
          {detailOrden && (() => {
            const prov = proveedores.find(p => p.id === detailOrden.proveedor_id);
            const total = ordenTotal(detailOrden);
            return (
              <>
                <SheetHeader className="mb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xl font-semibold">{detailOrden.numero}</span>
                        <EstadoBadge estado={detailOrden.estado} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {CLIENTES_DEMO[detailOrden.cliente_id] ?? detailOrden.cliente_id}
                        {" · "}
                        {fmtDate(detailOrden.fecha_pedido)}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                {/* Info cabecera */}
                <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Proveedor</p>
                    <p className="font-medium">{prov?.nombre ?? "—"}</p>
                    {prov?.ruc && <p className="text-xs text-muted-foreground">RUC {prov.ruc}</p>}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Solicitado por</p>
                    <p className="font-medium">{detailOrden.solicitado_por}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Aprobado por</p>
                    <p className="font-medium">{detailOrden.aprobado_por ?? <span className="text-muted-foreground">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Total de la orden</p>
                    <p className="font-bold text-base font-mono">{fmtCurrency(total)}</p>
                  </div>
                </div>

                {/* Líneas */}
                <div className="mb-5">
                  <p className="mb-2 text-sm font-semibold">Productos solicitados ({detailOrden.lineas.length})</p>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Producto</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Precio u.</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recibido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrden.lineas.map((linea, i) => {
                          const prod = catalogos.find(c => c.id === linea.producto_id);
                          return (
                            <tr key={linea.id} className={cn("border-t border-border/50", i % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                              <td className="px-4 py-2.5 font-medium">{prod?.nombre ?? linea.producto_id}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{linea.cantidad}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtCurrency(linea.precio_unitario)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtCurrency(lineaTotal(linea))}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                                  linea.estado === "aprobado"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200",
                                )}>
                                  {linea.estado === "aprobado" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  {linea.estado === "aprobado" ? "Aprobado" : "Sin aprobar"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums">
                                <span className={cn(
                                  linea.cantidad_recibida > 0 ? "text-green-700 font-semibold" : "text-muted-foreground",
                                )}>
                                  {linea.cantidad_recibida > 0 ? linea.cantidad_recibida : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums">{fmtCurrency(total)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Notas */}
                {detailOrden.notas && (
                  <div className="mb-5 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
                    <p className="text-muted-foreground">{detailOrden.notas}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {detailOrden.estado === "solicitado" && (
                    <Button
                      className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => { setConfirmAction({ orden: detailOrden, tipo: "aprobar" }); setDetailOrden(null); }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </Button>
                  )}
                  {detailOrden.estado === "aprobado" && (
                    <Button
                      className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => { setConfirmAction({ orden: detailOrden, tipo: "recibir" }); setDetailOrden(null); }}
                    >
                      <PackageCheck className="h-4 w-4" /> Marcar recibido
                    </Button>
                  )}
                  {(detailOrden.estado === "solicitado" || detailOrden.estado === "aprobado") && (
                    <Button
                      variant="outline"
                      className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={() => { setConfirmAction({ orden: detailOrden, tipo: "cancelar" }); setDetailOrden(null); }}
                    >
                      <Ban className="h-4 w-4" /> Cancelar orden
                    </Button>
                  )}
                  {detailOrden.estado !== "cancelado" && detailOrden.estado !== "recibido" && (
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => { openEditar(detailOrden); setDetailOrden(null); }}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  )}
                  {detailOrden.estado === "cancelado" && (
                    <Button
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => { setDeleteTarget(detailOrden); setDetailOrden(null); }}
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button variant="ghost" onClick={() => setDetailOrden(null)}>Cerrar</Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Sheet crear/editar ────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
          <SheetTitle className="sr-only">{editingOrden ? "Editar orden" : "Nueva orden de compra"}</SheetTitle>
          {/* Header fijo */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <div>
              <h2 className="text-lg font-semibold">{editingOrden ? "Editar orden" : "Nueva orden de compra"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingOrden ? `Editando ${editingOrden.numero}` : "Completa los datos del pedido"}
              </p>
            </div>
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Sección 1 — Datos generales */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Datos generales</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">N° Orden</Label>
                    <Input value={fNumero} onChange={e => setFNumero(e.target.value)} placeholder="ej. Agrosa_2" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha de pedido</Label>
                    <Input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Empresa</Label>
                    <Select value={fClienteId} onValueChange={setFClienteId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Empresa…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLIENTES_DEMO).map(([id, nombre]) => (
                          <SelectItem key={id} value={id}>{nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Proveedor</Label>
                    <Select value={fProveedorId} onValueChange={setFProveedorId}>
                      <SelectTrigger className="h-9 truncate"><SelectValue placeholder="Proveedor…" /></SelectTrigger>
                      <SelectContent>
                        {proveedores.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-border" />

            {/* Sección 2 — Productos */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Productos ({fLineas.filter(l => l.producto_id).length})
                </p>
                <button
                  onClick={addLinea}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar producto
                </button>
              </div>

              <div className="space-y-2">
                {fLineas.map((lin, idx) => {
                  const cant  = parseFloat(lin.cantidad.replace(",", ".")) || 0;
                  const price = parseFloat(lin.precio_unitario.replace(",", ".")) || 0;
                  const subtotal = cant * price;
                  return (
                    <div key={lin.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                      {/* Cabecera de línea */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground">LÍNEA {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          {subtotal > 0 && (
                            <span className="text-xs font-semibold font-mono text-foreground">
                              {fmtCurrency(subtotal)}
                            </span>
                          )}
                          <button
                            onClick={() => removeLinea(idx)}
                            disabled={fLineas.length === 1}
                            className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Producto selector */}
                      <div>
                        <Label className="text-xs mb-1 block">Producto</Label>
                        <Select value={lin.producto_id} onValueChange={v => updateLinea(idx, { producto_id: v })}>
                          <SelectTrigger className="h-9 bg-background">
                            <SelectValue placeholder="Seleccionar producto…" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogos.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cantidad + Precio en fila */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs mb-1 block">Cantidad</Label>
                          <Input
                            className="h-9 bg-background"
                            value={lin.cantidad}
                            onChange={e => updateLinea(idx, { cantidad: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Precio unitario ($)</Label>
                          <Input
                            className="h-9 bg-background"
                            value={lin.precio_unitario}
                            onChange={e => updateLinea(idx, { precio_unitario: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Estado de línea + recibido si edición */}
                      <div className={cn("grid gap-3", editingOrden ? "grid-cols-2" : "grid-cols-1")}>
                        <div>
                          <Label className="text-xs mb-1 block">Estado de aprobación</Label>
                          <div className="flex rounded-lg border border-border bg-background overflow-hidden h-9">
                            <button
                              onClick={() => updateLinea(idx, { estado: "aprobado" })}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors",
                                lin.estado === "aprobado"
                                  ? "bg-green-600 text-white"
                                  : "text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
                            </button>
                            <div className="w-px bg-border" />
                            <button
                              onClick={() => updateLinea(idx, { estado: "sin_aprobar" })}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors",
                                lin.estado === "sin_aprobar"
                                  ? "bg-amber-500 text-white"
                                  : "text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <Clock className="h-3.5 w-3.5" /> Pendiente
                            </button>
                          </div>
                        </div>
                        {editingOrden && (
                          <div>
                            <Label className="text-xs mb-1 block">Cant. recibida</Label>
                            <Input
                              className="h-9 bg-background"
                              value={lin.cantidad_recibida}
                              onChange={e => updateLinea(idx, { cantidad_recibida: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              {fLineasTotal > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <span className="text-base font-bold font-mono">{fmtCurrency(fLineasTotal)}</span>
                </div>
              )}
            </div>

            {/* Separador */}
            <div className="border-t border-border" />

            {/* Sección 3 — Notas */}
            <div>
              <Label className="text-xs mb-1.5 block text-muted-foreground uppercase tracking-widest font-semibold">Notas (opcional)</Label>
              <textarea
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none"
                placeholder="Observaciones, instrucciones de entrega…"
                value={fNotas}
                onChange={e => setFNotas(e.target.value)}
              />
            </div>

          </div>

          {/* Footer fijo */}
          <div className="shrink-0 border-t border-border bg-background px-6 py-4 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleGuardar}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white px-6"
              disabled={!fProveedorId || fLineas.every(l => !l.producto_id)}
            >
              <Save className="h-4 w-4" />
              {editingOrden ? "Guardar cambios" : "Crear orden"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog eliminar ───────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar orden
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar la orden <strong>{deleteTarget?.numero}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => { eliminarOrden(deleteTarget!.id); setDeleteTarget(null); }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog aprobar / recibir ──────────────────────────────────────── */}
      <Dialog open={!!confirmAction} onOpenChange={v => !v && setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.tipo === "aprobar"  ? <><CheckCircle2 className="h-5 w-5 text-primary" /> Aprobar orden</> :
               confirmAction?.tipo === "recibir"  ? <><PackageCheck className="h-5 w-5 text-green-500" /> Marcar como recibido</> :
               confirmAction?.tipo === "cancelar" ? <><Ban className="h-5 w-5 text-amber-500" /> Cancelar orden</> :
               "Confirmar acción"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.tipo === "aprobar"  && <>¿Aprobar la orden <strong>{confirmAction.orden.numero}</strong>? Pasará al estado <strong>Aprobado</strong>.</>}
            {confirmAction?.tipo === "recibir"  && <>¿Marcar <strong>{confirmAction.orden.numero}</strong> como recibida? El stock se actualizará automáticamente.</>}
            {confirmAction?.tipo === "cancelar" && <>¿Cancelar la orden <strong>{confirmAction.orden.numero}</strong>? Esta acción no se puede deshacer. La orden quedará como <strong>Cancelada</strong> y podrás eliminarla.</>}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Volver</Button>
            <Button
              className={
                confirmAction?.tipo === "aprobar"  ? "bg-primary hover:bg-primary/90 text-primary-foreground" :
                confirmAction?.tipo === "recibir"  ? "bg-green-600 hover:bg-green-700 text-white" :
                                                     "bg-amber-500 hover:bg-amber-600 text-white"
              }
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.tipo === "aprobar")       aprobarOrden(confirmAction.orden.id, currentUser?.nombre ?? "Usuario");
                else if (confirmAction.tipo === "recibir")  recibirOrden(confirmAction.orden.id);
                else if (confirmAction.tipo === "cancelar") cancelarOrden(confirmAction.orden.id);
                setConfirmAction(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
