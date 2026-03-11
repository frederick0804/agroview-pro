import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Check, X, Trash2, Plus, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
  /** Show a dropdown filter for this column. Auto-detects unique values if no filterOptions provided. */
  filterable?: boolean;
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
  onCreateOption,
  showRequired = false,
}: {
  value: string;
  suggestions: { value: string; label: string }[];
  onSave: (v: string) => void;
  editable?: boolean;
  onCreateOption?: (query: string) => void;
  showRequired?: boolean;
}) {
  const [isEditing,   setIsEditing]   = useState(false);
  const [query,       setQuery]       = useState(value ?? "");
  const [highlighted, setHighlighted] = useState(-1);
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

  const commit = useCallback((val: string) => {
    const trimmed = val.trim();
    onSave(trimmed);
    setQuery(trimmed);
    setIsEditing(false);
    setHighlighted(-1);
  }, [onSave]);

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
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setHighlighted(-1); }}
          onKeyDown={handleKeyDown}
          // Al perder foco (click fuera del dropdown), guardar lo que haya en el input
          onBlur={() => commit(query)}
          placeholder="Escribir o buscar…"
          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          onClick={() => { setQuery(value ?? ""); setIsEditing(false); }}
          className="p-1 text-destructive hover:bg-destructive/10 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

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
        : (value || "–")}
    </div>
  );
}

// ─── EditableCell ──────────────────────────────────────────────────────────────

function EditableCell({
  value,
  type = "text",
  options,
  onSave,
  editable = true,
  showRequired = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
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

  const handleSave = useCallback(() => {
    onSave(editValue);
    setIsEditing(false);
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter")  handleSave();
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
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        {type === "select" && options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            onChange={e => setEditValue(type === "number" ? Number(e.target.value) : e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        <button onClick={handleSave}   className="p-1 text-success     hover:bg-success/10     rounded"><Check  className="w-4 h-4" /></button>
        <button onClick={handleCancel} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X      className="w-4 h-4" /></button>
      </div>
    );
  }

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
        value ?? "–"
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
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const newRowRef = useRef<HTMLTableRowElement>(null);
  const prevDataLen = useRef(data.length);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!openFilter) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  // Filterable columns
  const filterableCols = columns.filter(c => c.filterable);
  const hasFilters = filterableCols.length > 0;
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

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
    // Apply column filters
    for (const [key, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal) continue;
      result = result.filter(row => {
        const cellVal = row[key as keyof T];
        if (typeof cellVal === "boolean") return String(cellVal) === filterVal;
        return String(cellVal ?? "").toLowerCase() === filterVal.toLowerCase();
      });
    }
    // Apply search
    if (searchable && searchTerm) {
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    }
    return result;
  })();

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pagedData = filteredData.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [searchTerm]);
  // Reset to page 1 if data shrinks below current page
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [filteredData.length]);

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
              onClick={() => setColumnFilters({})}
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
                const isFilterOpen = openFilter === colKey;
                const hasActiveFilter = !!columnFilters[colKey];

                // Compute unique values for filter dropdown
                const uniqueValues = isFilterable
                  ? Array.from(new Set(
                      data
                        .map(row => {
                          const v = row[col.key];
                          return v === undefined || v === null || v === "" ? null : String(v);
                        })
                        .filter((v): v is string => v !== null),
                    )).sort()
                  : [];

                // Resolve display labels from options
                const getLabel = (val: string) => {
                  if (col.type === "checkbox") return val === "true" ? "Sí" : "No";
                  const opt = col.options?.find(o => o.value === val);
                  return opt ? opt.label : val;
                };

                return (
                  <th key={colKey} style={{ width: col.width }} className="relative">
                    <div className="flex items-center gap-1">
                      <span>
                        {col.header}
                        {col.required && <span className="text-white ml-0.5">*</span>}
                      </span>
                      {isFilterable && uniqueValues.length > 1 && (
                        <button
                          onClick={() => setOpenFilter(isFilterOpen ? null : colKey)}
                          className={cn(
                            "p-0.5 rounded hover:bg-muted transition-colors",
                            hasActiveFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground",
                          )}
                          title="Filtrar columna"
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {isFilterOpen && (
                      <div
                        ref={filterRef}
                        className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg min-w-[160px] py-1"
                      >
                        <button
                          onClick={() => { setColumnFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; }); setOpenFilter(null); }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                            !hasActiveFilter && "font-semibold text-primary",
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
                  </th>
                );
              })}
              {(onDelete || rowActions) && <th style={{ width: rowActions ? "100px" : "60px" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + ((onDelete || rowActions) ? 1 : 0)}
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
                              onSave={value => onUpdate(idx, col.key, value)}
                              showRequired={cellRequired}
                            />
                          )}
                        </td>
                      );
                    })}
                    {(onDelete || rowActions) && (
                      <td>
                        <div className="flex items-center gap-0.5">
                          {rowActions?.(row, idx)}
                          {onDelete && (
                            <button
                              onClick={() => setDeleteConfirmIdx(idx)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
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

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteConfirmIdx !== null} onOpenChange={open => { if (!open) setDeleteConfirmIdx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmIdx(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteConfirmIdx !== null && onDelete) {
                  onDelete(deleteConfirmIdx);
                }
                setDeleteConfirmIdx(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
