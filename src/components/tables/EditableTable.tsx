import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Check, X, Trash2, Plus, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export interface Column<T> {
  key: keyof T;
  header: string;
  width?: string;
  type?: "text" | "number" | "select" | "date" | "checkbox" | "autocomplete";
  options?: { value: string; label: string }[];
  editable?: boolean;
  required?: boolean;
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  /** Called when user clicks "Crear parámetro" in autocomplete dropdown. Receives the typed query. */
  onCreateOption?: (query: string) => void;
  /** Show a filter control for this column. Auto-detects unique values if filterType is "dropdown". */
  filterable?: boolean;
  /**
   * "dropdown" (default) — lista de valores únicos
   * "range"    — entradas min/máx para campos Número
   * "search"   — búsqueda de texto libre
   */
  filterType?: "dropdown" | "range" | "search";
  /** Allow ascending/descending sort by clicking the column header */
  sortable?: boolean;
}

interface EditableTableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onUpdate: (rowIndex: number, key: keyof T, value: any) => void;
  onDelete?: (rowIndex: number) => void;
  onAdd?: () => void;
  title?: string;
  searchable?: boolean;
  className?: string;
  /** Called when incomplete-row state changes (true = has incomplete rows) */
  onPendingChange?: (hasPending: boolean) => void;
  /** Extra action buttons rendered in the Acciones column before delete */
  rowActions?: (row: T, rowIndex: number) => React.ReactNode;
}

interface EditableCellProps {
  value: any;
  type?: Column<any>["type"];
  options?: Column<any>["options"];
  onSave: (value: any) => void;
  editable?: boolean;
  required?: boolean;
  showRequired?: boolean;
}

// ─── AutocompleteCell ──────────────────────────────────────────────────────────
// Renderiza el dropdown en un portal (document.body) para evitar clipping por
// overflow:hidden del contenedor padre.

function AutocompleteCell({
  value,
  suggestions = [],
  onSave,
  editable = true,
  required = false,
  onCreateOption,
  showRequired = false,
}: {
  value: string;
  suggestions: { value: string; label: string }[];
  onSave: (v: string) => void;
  editable?: boolean;
  required?: boolean;
  onCreateOption?: (query: string) => void;
  showRequired?: boolean;
}) {
  const [isEditing,   setIsEditing]   = useState(false);
  const [query,       setQuery]       = useState(value ?? "");
  const [highlighted, setHighlighted] = useState(-1);
  const [hasError,    setHasError]    = useState(false);
  const [dropPos,     setDropPos]     = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query cuando el valor externo cambia
  useEffect(() => { setQuery(value ?? ""); }, [value]);

  // Al abrir el editor, enfocar input y calcular posición del dropdown
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({
        top:   r.bottom + 4,
        left:  r.left,
        width: Math.max(r.width, 240),
      });
    }
  }, [isEditing]);

  const filtered = query.trim()
    ? suggestions
        .filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 7)
    : [];

  const exactMatch  = suggestions.some(s => s.label.toLowerCase() === query.trim().toLowerCase());
  const showCreate  = query.trim().length > 0 && !exactMatch;
  const totalItems  = filtered.length + (showCreate ? 1 : 0);

  // commit: valida si es requerido; si está vacío bloquea y muestra error
  const commit = useCallback((val: string) => {
    const trimmed = val.trim();
    if (required && !trimmed) {
      setHasError(true);
      return;
    }
    setHasError(false);
    onSave(trimmed);
    setQuery(trimmed);
    setIsEditing(false);
    setHighlighted(-1);
  }, [onSave, required]);

  // commitBlur: al perder foco → si vacío y requerido, cancela sin mostrar error
  const commitBlur = useCallback((val: string) => {
    const trimmed = val.trim();
    if (required && !trimmed) {
      setQuery(value ?? "");
      setIsEditing(false);
      setHighlighted(-1);
      setHasError(false);
      return;
    }
    setHasError(false);
    onSave(trimmed);
    setQuery(trimmed);
    setIsEditing(false);
    setHighlighted(-1);
  }, [onSave, required, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < filtered.length) {
        commit(filtered[highlighted].value);
      } else if (highlighted === filtered.length && showCreate) {
        if (onCreateOption) {
          onCreateOption(query.trim());
          setIsEditing(false);
          setHighlighted(-1);
        } else {
          commit(query);
        }
      } else {
        commit(query);
      }
    } else if (e.key === "Escape") {
      setQuery(value ?? "");
      setIsEditing(false);
      setHighlighted(-1);
      setHasError(false);
    }
  };

  if (!editable) {
    return <div className="px-3 py-2.5 text-sm">{value || "–"}</div>;
  }

  if (isEditing) {
    const dropdown =
      (filtered.length > 0 || showCreate)
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top:    dropPos.top,
                left:   dropPos.left,
                width:  dropPos.width,
                zIndex: 9999,
              }}
              className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
            >
              {filtered.map((s, i) => (
                <button
                  key={s.value}
                  // preventDefault evita que el input pierda foco (no dispara onBlur)
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(s.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    highlighted === i
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/60 text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}

              {showCreate && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (onCreateOption) {
                      onCreateOption(query.trim());
                      setIsEditing(false);
                      setHighlighted(-1);
                    } else {
                      commit(query.trim());
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm border-t border-border",
                    "text-primary hover:bg-primary/10 transition-colors",
                    "flex items-center gap-2",
                    highlighted === filtered.length && "bg-primary/10",
                  )}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Crear parámetro:{" "}
                    <strong className="font-semibold">"{query.trim()}"</strong>
                  </span>
                </button>
              )}
            </div>,
            document.body,
          )
        : null;

    return (
      <div className="flex flex-col gap-0.5 px-2 py-1">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlighted(-1); setHasError(false); }}
            onKeyDown={handleKeyDown}
            onBlur={() => commitBlur(query)}
            placeholder="Escribir o buscar…"
            className={cn(
              "w-full bg-background rounded px-2 py-1 text-sm focus:outline-none focus:ring-2",
              hasError
                ? "border border-destructive ring-destructive/20 focus:ring-destructive/30"
                : "border border-primary focus:ring-primary",
            )}
          />
          {dropdown}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit(query)}
            className="p-1 text-success hover:bg-success/10 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(value ?? ""); setIsEditing(false); setHasError(false); }}
            className="p-1 text-destructive hover:bg-destructive/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {hasError && (
          <span className="text-[10px] text-destructive leading-none px-1">
            Este campo es obligatorio
          </span>
        )}
      </div>
    );
  }

  // Vista de lectura: indicador rojo si es requerido y está vacío
  if (!isEditing) {
    const isEmpty = !value?.trim();
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="editable-cell"
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setIsEditing(true); }}
      >
        {showRequired
          ? <span className="text-destructive text-xs font-medium animate-pulse">Requerido</span>
          : isEmpty && required
            ? <span className="text-xs text-destructive/80 italic flex items-center gap-1">⚠ Requerido</span>
            : (value || "–")}
      </div>
    );
  }

  return null;
}

// ─── EditableCell ──────────────────────────────────────────────────────────────

function EditableCell({
  value,
  type = "text",
  options,
  onSave,
  editable = true,
  required = false,
  showRequired = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [hasError,  setHasError]  = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => { setEditValue(value); }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Valida requerido; si falla, muestra error y no cierra la celda
  const handleSave = useCallback(() => {
    if (required && !editValue?.toString().trim()) {
      setHasError(true);
      return;
    }
    setHasError(false);
    onSave(editValue);
    setIsEditing(false);
  }, [editValue, onSave, required]);

  // En blur: si requerido y vacío → cancela sin error visible; si tiene valor → guarda
  const handleBlurSave = useCallback(() => {
    if (required && !editValue?.toString().trim()) {
      setEditValue(value); // revertir
      setIsEditing(false);
      setHasError(false);
      return;
    }
    setHasError(false);
    onSave(editValue);
    setIsEditing(false);
  }, [editValue, onSave, required, value]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
    setHasError(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter")       handleSave();
      else if (e.key === "Escape") handleCancel();
    },
    [handleSave, handleCancel],
  );

  if (!editable) {
    return (
      <div className="px-3 py-2.5 text-sm">
        {type === "checkbox" ? (
          <input type="checkbox" checked={!!value} disabled className="w-4 h-4" />
        ) : (
          value ?? "–"
        )}
      </div>
    );
  }

  if (isEditing) {
    const inputClass = cn(
      "w-full bg-background rounded px-2 py-1 text-sm focus:outline-none focus:ring-2",
      hasError
        ? "border border-destructive ring-destructive/20 focus:ring-destructive/30"
        : "border border-primary focus:ring-primary",
    );

    return (
      <div className="flex flex-col gap-0.5 px-2 py-1">
        <div className="flex items-center gap-1">
          {type === "select" && options ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={e => { setEditValue(e.target.value); setHasError(false); }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlurSave}
              className={inputClass}
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!editValue}
              onChange={e => { setEditValue(e.target.checked); onSave(e.target.checked); setIsEditing(false); }}
              className="w-4 h-4"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type === "number" ? "number" : type === "date" ? "date" : "text"}
              value={editValue ?? ""}
              onChange={e => {
                setEditValue(type === "number" ? Number(e.target.value) : e.target.value);
                setHasError(false);
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlurSave}
              className={inputClass}
            />
          )}
          <button onClick={handleSave}   className="p-1 text-success     hover:bg-success/10     rounded shrink-0"><Check className="w-4 h-4" /></button>
          <button onClick={handleCancel} className="p-1 text-destructive hover:bg-destructive/10 rounded shrink-0"><X     className="w-4 h-4" /></button>
        </div>
        {hasError && (
          <span className="text-[10px] text-destructive leading-none px-1">
            Este campo es obligatorio
          </span>
        )}
      </div>
    );
  }

  // Vista de lectura: indicador rojo si es requerido y está vacío
  const isEmpty = type !== "checkbox" && !value?.toString().trim();
  return (
    <div
      onClick={() => setIsEditing(true)}
      className="editable-cell"
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setIsEditing(true); }}
    >
      {type === "checkbox" ? (
        <input
          type="checkbox"
          checked={!!value}
          readOnly
          className="w-4 h-4 cursor-pointer"
          onClick={e => { e.stopPropagation(); onSave(!value); }}
        />
      ) : type === "select" && options ? (
        showRequired
          ? <span className="text-destructive text-xs font-medium animate-pulse">Requerido</span>
          : (options.find(o => o.value === value)?.label ?? value ?? "–")
      ) : showRequired ? (
        <span className="text-destructive text-xs font-medium animate-pulse">Requerido</span>
      ) : (
        isEmpty && required
          ? <span className="text-xs text-destructive/80 italic flex items-center gap-1">⚠ Requerido</span>
          : (value ?? "–")
      )}
    </div>
  );
}

// ─── EditableTable ─────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function EditableTable<T extends { id: string | number }>({
  data,
  columns,
  onUpdate,
  onDelete,
  onAdd,
  title,
  searchable = true,
  className,
  onPendingChange,
  rowActions,
}: EditableTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [newRowId, setNewRowId] = useState<string | number | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [rangeFilters, setRangeFilters] = useState<Record<string, { min: string; max: string }>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [filterPortalPos, setFilterPortalPos] = useState({ top: 0, left: 0 });
  const newRowRef = useRef<HTMLTableRowElement>(null);
  const prevDataLen = useRef(data.length);

  // Calculate portal position when a filter opens
  const openFilterAt = useCallback((colKey: string) => {
    const btn = filterBtnRefs.current[colKey];
    if (btn) {
      const r = btn.getBoundingClientRect();
      setFilterPortalPos({ top: r.bottom + 4, left: r.left });
    }
    setOpenFilter(colKey);
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!openFilter) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        // Also check if the click is on a filter button (toggling)
        const btn = filterBtnRefs.current[openFilter];
        if (btn && btn.contains(e.target as Node)) return;
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  // Filterable columns
  const filterableCols = columns.filter(c => c.filterable);
  const hasFilters = filterableCols.length > 0;
  const activeFilterCount =
    Object.values(columnFilters).filter(Boolean).length +
    Object.values(rangeFilters).filter(r => r.min || r.max).length;

  const clearAllFilters = () => {
    setColumnFilters({});
    setRangeFilters({});
  };

  // Required columns
  const requiredKeys = columns.filter(c => c.required).map(c => c.key);

  // Check if any row is missing required fields
  const incompleteRowIds = new Set(
    requiredKeys.length > 0
      ? data
          .filter(row =>
            requiredKeys.some(k => {
              const v = row[k];
              return v === undefined || v === null || v === "";
            }),
          )
          .map(row => row.id)
      : [],
  );
  const hasIncomplete = incompleteRowIds.size > 0;

  // Notify parent when pending state changes
  useEffect(() => {
    onPendingChange?.(hasIncomplete);
  }, [hasIncomplete, onPendingChange]);

  const filteredData = (() => {
    let result = data;
    // Apply column filters (dropdown + search types)
    for (const [key, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal) continue;
      const col = columns.find(c => String(c.key) === key);
      const ft = col?.filterType ?? "dropdown";
      result = result.filter(row => {
        const cellVal = row[key as keyof T];
        if (ft === "search") {
          return String(cellVal ?? "").toLowerCase().includes(filterVal.toLowerCase());
        }
        // dropdown
        if (typeof cellVal === "boolean") return String(cellVal) === filterVal;
        return String(cellVal ?? "").toLowerCase() === filterVal.toLowerCase();
      });
    }
    // Apply range filters
    for (const [key, range] of Object.entries(rangeFilters)) {
      const { min, max } = range;
      if (!min && !max) continue;
      result = result.filter(row => {
        const val = parseFloat(String(row[key as keyof T] ?? ""));
        if (isNaN(val)) return true;
        if (min && val < parseFloat(min)) return false;
        if (max && val > parseFloat(max)) return false;
        return true;
      });
    }
    // Apply global search
    if (searchable && searchTerm) {
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    }
    // Apply sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey as keyof T];
        const bv = b[sortKey as keyof T];
        const an = parseFloat(String(av ?? ""));
        const bn = parseFloat(String(bv ?? ""));
        let cmp: number;
        if (!isNaN(an) && !isNaN(bn)) {
          cmp = an - bn;
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" });
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  })();

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pagedData = filteredData.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); setDeleteConfirmIdx(null); }, [searchTerm]);
  // Reset to page 1 if data shrinks below current page
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [filteredData.length]);
  // Cancel pending delete confirmation when navigating pages
  useEffect(() => { setDeleteConfirmIdx(null); }, [page]);

  // Detect newly added row → jump to its page, scroll into view, highlight
  useEffect(() => {
    if (data.length > prevDataLen.current) {
      const lastRow = data[data.length - 1];
      if (lastRow) {
        setNewRowId(lastRow.id);
        // Navigate to the page containing the new row
        const idxInFiltered = filteredData.findIndex(d => d.id === lastRow.id);
        if (idxInFiltered >= 0) {
          setPage(Math.floor(idxInFiltered / pageSize) + 1);
        }
        // Clear highlight after 3s
        const timer = setTimeout(() => setNewRowId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevDataLen.current = data.length;
  }, [data.length]);

  // Scroll new row into view once rendered
  useEffect(() => {
    if (newRowId !== null && newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [newRowId, safePage]);

  // Resolve the index into `data` by id (handles both search-filter and pagination offsets)
  const dataIdx = (row: T) => data.findIndex(d => d.id === row.id);

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
        {title && <h3 className="font-semibold text-foreground">{title}</h3>}
        <div className="flex items-center gap-3 flex-wrap">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
          )}
          {hasFilters && activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={clearAllFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpiar filtros ({activeFilterCount})
            </Button>
          )}
          {onAdd && (
            <Button onClick={onAdd} size="sm" disabled={hasIncomplete} title={hasIncomplete ? "Completa los campos requeridos antes de agregar otra fila" : undefined}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar fila
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => {
                const colKey = String(col.key);
                const isFilterable = col.filterable;
                const ft = col.filterType ?? "dropdown";
                const isFilterOpen = openFilter === colKey;
                const hasActiveDropdown = !!columnFilters[colKey];
                const rangeState = rangeFilters[colKey] ?? { min: "", max: "" };
                const hasActiveRange = !!(rangeState.min || rangeState.max);
                const hasActiveFilter = ft === "range" ? hasActiveRange : hasActiveDropdown;

                // Unique values — only needed for dropdown type
                const uniqueValues = isFilterable && ft === "dropdown"
                  ? Array.from(new Set(
                      data
                        .map(row => {
                          const v = row[col.key];
                          return v === undefined || v === null || v === "" ? null : String(v);
                        })
                        .filter((v): v is string => v !== null),
                    )).sort()
                  : [];

                const getLabel = (val: string) => {
                  if (col.type === "checkbox") return val === "true" ? "Sí" : "No";
                  const opt = col.options?.find(o => o.value === val);
                  return opt ? opt.label : val;
                };

                // Show filter button: always for range/search; for dropdown only if >1 unique val
                const showFilterBtn = isFilterable && (ft !== "dropdown" || uniqueValues.length > 1);

                const isSorted = sortKey === colKey;
                const handleSort = () => {
                  if (!col.sortable) return;
                  if (isSorted) {
                    setSortDir(d => d === "asc" ? "desc" : "asc");
                  } else {
                    setSortKey(colKey);
                    setSortDir("asc");
                  }
                };

                return (
                  <th key={colKey} style={{ width: col.width }} className="relative">
                    <div className="flex items-center gap-1">
                      <span
                        onClick={col.sortable ? handleSort : undefined}
                        className={cn(col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors")}
                      >
                        {col.header}
                        {col.required && <span className="text-white ml-0.5">*</span>}
                      </span>
                      {col.sortable && (
                        <button
                          onClick={handleSort}
                          className={cn(
                            "p-0.5 rounded transition-colors",
                            isSorted ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground",
                          )}
                          title={isSorted ? (sortDir === "asc" ? "Orden ascendente — clic para descendente" : "Orden descendente — clic para ascendente") : "Ordenar columna"}
                        >
                          {isSorted
                            ? sortDir === "asc"
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />
                            : <ArrowUpDown className="w-3 h-3" />}
                        </button>
                      )}
                      {showFilterBtn && (
                        <button
                          ref={el => { filterBtnRefs.current[colKey] = el; }}
                          onClick={() => openFilter === colKey ? setOpenFilter(null) : openFilterAt(colKey)}
                          className={cn(
                            "p-0.5 rounded hover:bg-muted transition-colors",
                            hasActiveFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground",
                          )}
                          title={ft === "range" ? "Filtrar por rango" : ft === "search" ? "Buscar en columna" : "Filtrar columna"}
                        >
                          {ft === "search" ? <Search className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              {(onDelete || rowActions) && <th style={{ width: rowActions ? "130px" : "60px" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onDelete || rowActions ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchTerm ? "Sin resultados para la búsqueda" : "No hay datos disponibles"}
                </td>
              </tr>
            ) : (
              pagedData.map(row => {
                const idx = dataIdx(row);
                const isNew = row.id === newRowId;
                const isIncomplete = incompleteRowIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    ref={isNew ? newRowRef : undefined}
                    className={cn(
                      isNew && "bg-emerald-500/10 transition-colors duration-700",
                      isIncomplete && !isNew && "bg-amber-500/8",
                    )}
                  >
                    {columns.map(col => {
                      const cellValue = row[col.key];
                      const cellEmpty = cellValue === undefined || cellValue === null || cellValue === "";
                      const cellRequired = !!col.required && cellEmpty && isIncomplete;
                      return (
                        <td key={String(col.key)}>
                          {col.render ? (
                            col.render(cellValue, row, idx)
                          ) : col.type === "autocomplete" ? (
                            <AutocompleteCell
                              value={String(cellValue ?? "")}
                              suggestions={col.options ?? []}
                              editable={col.editable !== false}
                              required={col.required}
                              onSave={value => onUpdate(idx, col.key, value)}
                              onCreateOption={col.onCreateOption}
                              showRequired={cellRequired}
                            />
                          ) : (
                            <EditableCell
                              value={cellValue}
                              type={col.type}
                              options={col.options}
                              editable={col.editable !== false}
                              required={col.required}
                              onSave={value => onUpdate(idx, col.key, value)}
                              showRequired={cellRequired}
                            />
                          )}
                        </td>
                      );
                    })}
                    {(onDelete || rowActions) && (
                      <td>
                        <div className="flex items-center gap-1 px-1">
                          {rowActions && rowActions(row, idx)}
                          {onDelete && (
                            <button
                              onClick={() => setDeleteConfirmIdx(idx)}
                              title="Eliminar fila"
                              className={cn(
                                "p-2 rounded transition-colors shrink-0",
                                isNew
                                  ? "text-destructive hover:bg-destructive/10"
                                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Filter dropdowns (rendered via portal to avoid overflow clipping) ── */}
      {openFilter && (() => {
        const col = columns.find(c => String(c.key) === openFilter);
        if (!col) return null;
        const colKey = openFilter;
        const ft = col.filterType ?? "dropdown";
        const hasActiveDropdown = !!columnFilters[colKey];
        const rangeState = rangeFilters[colKey] ?? { min: "", max: "" };
        const hasActiveRange = !!(rangeState.min || rangeState.max);

        const uniqueValues = col.filterable && ft === "dropdown"
          ? Array.from(new Set(
              data
                .map(row => {
                  const v = row[col.key];
                  return v === undefined || v === null || v === "" ? null : String(v);
                })
                .filter((v): v is string => v !== null),
            )).sort()
          : [];

        const getLabel = (val: string) => {
          if (col.type === "checkbox") return val === "true" ? "Sí" : "No";
          const opt = col.options?.find(o => o.value === val);
          return opt ? opt.label : val;
        };

        const portalContent = (
          <div
            ref={filterRef}
            style={{
              position: "fixed",
              top: filterPortalPos.top,
              left: filterPortalPos.left,
              zIndex: 9999,
            }}
          >
            {ft === "dropdown" && (
              <div className="bg-popover border border-border rounded-lg shadow-xl min-w-[160px] py-1">
                <button
                  onClick={() => { setColumnFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; }); setOpenFilter(null); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                    !hasActiveDropdown && "font-semibold text-primary",
                  )}
                >
                  Todos
                </button>
                {uniqueValues.map(val => (
                  <button
                    key={val}
                    onClick={() => { setColumnFilters(prev => ({ ...prev, [colKey]: val })); setOpenFilter(null); setPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2",
                      columnFilters[colKey] === val && "font-semibold text-primary",
                    )}
                  >
                    {columnFilters[colKey] === val && <Check className="w-3 h-3" />}
                    <span className={columnFilters[colKey] === val ? "" : "ml-5"}>{getLabel(val)}</span>
                  </button>
                ))}
              </div>
            )}

            {ft === "range" && (
              <div className="bg-popover border border-border rounded-lg shadow-xl w-52 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por rango</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Mínimo</label>
                    <input
                      type="number"
                      placeholder="—"
                      value={rangeState.min}
                      onChange={e => {
                        setRangeFilters(prev => ({ ...prev, [colKey]: { ...rangeState, min: e.target.value } }));
                        setPage(1);
                      }}
                      className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Máximo</label>
                    <input
                      type="number"
                      placeholder="—"
                      value={rangeState.max}
                      onChange={e => {
                        setRangeFilters(prev => ({ ...prev, [colKey]: { ...rangeState, max: e.target.value } }));
                        setPage(1);
                      }}
                      className="w-full h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                {hasActiveRange && (
                  <button
                    onClick={() => { setRangeFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; }); setOpenFilter(null); }}
                    className="w-full text-[10px] text-destructive hover:text-destructive/80 text-center pt-1"
                  >
                    Quitar filtro
                  </button>
                )}
              </div>
            )}

            {ft === "search" && (
              <div className="bg-popover border border-border rounded-lg shadow-xl w-52 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Buscar en columna</p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Escribir..."
                    autoFocus
                    value={columnFilters[colKey] ?? ""}
                    onChange={e => { setColumnFilters(prev => ({ ...prev, [colKey]: e.target.value })); setPage(1); }}
                    className="w-full h-7 text-xs rounded-md border border-input bg-background pl-6 pr-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {columnFilters[colKey] && (
                  <button
                    onClick={() => { setColumnFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; }); setOpenFilter(null); }}
                    className="w-full text-[10px] text-destructive hover:text-destructive/80 text-center"
                  >
                    Quitar filtro
                  </button>
                )}
              </div>
            )}
          </div>
        );

        return createPortal(portalContent, document.body);
      })()}

      {/* Footer — paginación */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          {filteredData.length === 0
            ? "Sin registros"
            : `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredData.length)} de ${filteredData.length}`}
          {data.length !== filteredData.length && ` (filtrado de ${data.length})`}
        </span>

        <div className="flex items-center gap-3">
          {/* Selector de filas por página */}
          <div className="flex items-center gap-1.5">
            <span>Filas:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-6 text-xs border border-border rounded px-1 bg-background focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Controles de página */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPage(1)}
              disabled={safePage <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Primera página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 min-w-[60px] text-center">
              {safePage} / {pageCount}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(pageCount)}
              disabled={safePage >= pageCount}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de confirmación de eliminación ── */}
      {onDelete && (
        <Dialog
          open={deleteConfirmIdx !== null}
          onOpenChange={open => { if (!open) setDeleteConfirmIdx(null); }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <DialogTitle>Eliminar registro</DialogTitle>
              </div>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar este registro?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmIdx(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmIdx !== null && onDelete) {
                    onDelete(deleteConfirmIdx);
                  }
                  setDeleteConfirmIdx(null);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sí, eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
