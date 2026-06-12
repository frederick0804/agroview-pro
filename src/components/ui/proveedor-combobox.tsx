import { useState, useRef, useEffect } from "react";
import { Check, Building2, X, ShieldCheck, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvProveedor } from "@/contexts/InventarioContext";

interface ProveedorComboboxProps {
  value:    string;           // proveedor id
  onChange: (id: string) => void;
  options:  InvProveedor[];
  disabled?: boolean;
}

export function ProveedorCombobox({ value, onChange, options, disabled }: ProveedorComboboxProps) {
  const selected = options.find(o => o.id === value) ?? null;
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    o.nombre.toLowerCase().includes(query.toLowerCase()) ||
    o.ruc.includes(query),
  );

  const handleSelect = (prov: InvProveedor) => {
    onChange(prov.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Building2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selected?.nombre ?? "")}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          placeholder="Buscar proveedor…"
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {value && (
          <button type="button" onClick={handleClear} tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Proveedores
                </p>
                {filtered.map(prov => (
                  <button key={prov.id} type="button" onClick={() => handleSelect(prov)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent",
                      value === prov.id && "bg-accent/60",
                    )}
                  >
                    {prov.autorizado
                      ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      : <ShieldOff   className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    }
                    <span className="flex-1 text-left truncate">{prov.nombre}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{prov.ruc}</span>
                    {value === prov.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
