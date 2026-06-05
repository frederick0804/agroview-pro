/**
 * CategoriaCombobox
 *
 * Input con búsqueda de categorías existentes del catálogo de inventario.
 * Si el término no existe → muestra opción "Usar X como categoría".
 * Las categorías NO se persisten por separado; se derivan de los productos.
 */

import { useState, useRef, useEffect } from "react";
import { Check, Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoriaComboboxProps {
  value:    string;
  onChange: (v: string) => void;
  options:  string[];   // categorías existentes (derivadas del catálogo)
  disabled?: boolean;
}

export function CategoriaCombobox({
  value,
  onChange,
  options,
  disabled,
}: CategoriaComboboxProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync cuando value cambia externamente (ej: al abrir el dialog en modo edición)
  useEffect(() => { setQuery(value); }, [value]);

  // Cierra al hacer clic fuera y restaura query si no hay valor limpio
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value && query !== value) setQuery(value);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, query]);

  const filtered    = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const exactMatch  = options.some(o => o.toLowerCase() === query.toLowerCase().trim());
  const showAddBtn  = query.trim().length > 0 && !exactMatch;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  const handleUseNew = () => {
    const cat = query.trim();
    if (!cat) return;
    onChange(cat);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Tag className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar o crear categoría…"
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg",
          "animate-in fade-in-0 zoom-in-95",
        )}>
          <div className="max-h-52 overflow-y-auto p-1">

            {/* Categorías existentes */}
            {filtered.length > 0 && (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Categorías existentes
                </p>
                {filtered.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent",
                      value === opt && "bg-accent/60",
                    )}
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left truncate">{opt}</span>
                    {value === opt && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </>
            )}

            {/* Sin resultados con ese nombre */}
            {filtered.length === 0 && !showAddBtn && (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? "Aún no hay categorías. Escribe para crear la primera."
                  : "Sin categorías que coincidan"}
              </p>
            )}

            {/* Crear nueva categoría */}
            {showAddBtn && (
              <>
                {filtered.length > 0 && <div className="my-1 border-t border-border" />}
                <button
                  type="button"
                  onClick={handleUseNew}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Crear categoría "<strong>{query.trim()}</strong>"</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
