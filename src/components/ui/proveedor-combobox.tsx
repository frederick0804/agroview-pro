/**
 * ProveedorCombobox
 *
 * Input con búsqueda de proveedores existentes.
 * Si no existe el término escrito → muestra "Agregar proveedor".
 */

import { useState, useRef, useEffect } from "react";
import { Check, Plus, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProveedorComboboxProps {
  value:    string;
  onChange: (v: string) => void;
  options:  string[];           // lista de proveedores existentes
  onAdd?:   (nombre: string) => void; // callback al crear uno nuevo
  disabled?: boolean;
}

export function ProveedorCombobox({
  value,
  onChange,
  options,
  onAdd,
  disabled,
}: ProveedorComboboxProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query cuando value cambia externamente
  useEffect(() => { setQuery(value); }, [value]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Si hay valor seleccionado y el query es distinto, restaurar
        if (value && query !== value) setQuery(value);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, query]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  const exactMatch   = options.some(o => o.toLowerCase() === query.toLowerCase());
  const showAddBtn   = query.trim().length > 0 && !exactMatch;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  const handleAdd = () => {
    const nombre = query.trim();
    if (!nombre) return;
    onAdd?.(nombre);
    onChange(nombre);
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
        <Building2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar o agregar proveedor…"
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {query && (
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
            {/* Opciones existentes */}
            {filtered.length > 0 && (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Proveedores
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
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-left truncate">{opt}</span>
                    {value === opt && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </>
            )}

            {/* Sin resultados */}
            {filtered.length === 0 && !showAddBtn && (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                Sin proveedores registrados
              </p>
            )}

            {/* Botón agregar nuevo */}
            {showAddBtn && (
              <>
                {filtered.length > 0 && <div className="my-1 border-t border-border" />}
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Agregar "<strong>{query.trim()}</strong>" como proveedor</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
