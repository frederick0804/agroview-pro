import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Trash2, Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: keyof T;
  header: string;
  width?: string;
  type?: "text" | "number" | "select" | "date" | "checkbox";
  options?: { value: string; label: string }[];
  editable?: boolean;
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
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
}

interface EditableCellProps {
  value: any;
  type?: Column<any>["type"];
  options?: Column<any>["options"];
  onSave: (value: any) => void;
  editable?: boolean;
}

function EditableCell({
  value,
  type = "text",
  options,
  onSave,
  editable = true,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

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
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!editable) {
    return (
      <div className="px-3 py-2.5 text-sm">
        {type === "checkbox" ? (
          <input type="checkbox" checked={!!value} disabled className="w-4 h-4" />
        ) : (
          value ?? "-"
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
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === "checkbox" ? (
          <input
            type="checkbox"
            checked={!!editValue}
            onChange={(e) => {
              setEditValue(e.target.checked);
              onSave(e.target.checked);
              setIsEditing(false);
            }}
            className="w-4 h-4"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type === "number" ? "number" : type === "date" ? "date" : "text"}
            value={editValue ?? ""}
            onChange={(e) =>
              setEditValue(type === "number" ? Number(e.target.value) : e.target.value)
            }
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        <button
          onClick={handleSave}
          className="p-1 text-success hover:bg-success/10 rounded"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
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
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setIsEditing(true);
        }
      }}
    >
      {type === "checkbox" ? (
        <input
          type="checkbox"
          checked={!!value}
          readOnly
          className="w-4 h-4 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSave(!value);
          }}
        />
      ) : type === "select" && options ? (
        options.find((o) => o.value === value)?.label ?? value ?? "-"
      ) : (
        value ?? "-"
      )}
    </div>
  );
}

export function EditableTable<T extends { id: string | number }>({
  data,
  columns,
  onUpdate,
  onDelete,
  onAdd,
  title,
  searchable = true,
  className,
}: EditableTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = searchable
    ? data.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
    : data;

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {title && <h3 className="font-semibold text-foreground">{title}</h3>}
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          )}
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          {onAdd && (
            <Button onClick={onAdd} size="sm">
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
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              {onDelete && <th style={{ width: "60px" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onDelete ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={String(col.key)}>
                      {col.render ? (
                        col.render(row[col.key], row, rowIndex)
                      ) : (
                        <EditableCell
                          value={row[col.key]}
                          type={col.type}
                          options={col.options}
                          editable={col.editable !== false}
                          onSave={(value) => onUpdate(rowIndex, col.key, value)}
                        />
                      )}
                    </td>
                  ))}
                  {onDelete && (
                    <td>
                      <button
                        onClick={() => onDelete(rowIndex)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
        <span>
          {filteredData.length} de {data.length} registros
        </span>
        <div className="flex items-center gap-2">
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
