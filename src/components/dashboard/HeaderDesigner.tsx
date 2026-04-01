import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Trash2, Plus, Edit2, MoreVertical } from "lucide-react";

// Tipos de celda
export type HeaderCellType = "campo" | "texto" | "logo" | "link";

export interface HeaderCell {
  id: string;
  type: HeaderCellType;
  value: string; // campo: key, texto: string, logo: url/base64, link: url/campo
  colspan?: number;
  rowspan?: number;
  align?: "left" | "center" | "right";
}

export interface HeaderRow {
  id: string;
  cells: HeaderCell[];
}

export interface HeaderLayout {
  rows: HeaderRow[];
}

// Campos disponibles (puedes extender)
const CAMPOS = [
  { key: "productor", label: "Productor" },
  { key: "fecha", label: "Fecha" },
  { key: "semana", label: "Semana" },
  { key: "codigo", label: "Código" },
  { key: "revision", label: "Revisión" },
  { key: "fecha_inicio", label: "Fecha de inicio" },
];

function newCell(type: HeaderCellType): HeaderCell {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    value: "",
    colspan: 1,
    rowspan: 1,
    align: "left",
  };
}

export const HeaderDesigner: React.FC<{
  value: HeaderLayout;
  onChange: (layout: HeaderLayout) => void;
}> = ({ value, onChange }) => {
  const [layout, setLayout] = useState<HeaderLayout>(value);

  // Helpers
  const addRow = () => {
    const newRow: HeaderRow = { id: Math.random().toString(36).slice(2), cells: [] };
    const next = { ...layout, rows: [...layout.rows, newRow] };
    setLayout(next);
    onChange(next);
  };
  const removeRow = (rowIdx: number) => {
    const next = { ...layout };
    next.rows.splice(rowIdx, 1);
    setLayout(next);
    onChange(next);
  };
  const addCell = (rowIdx: number, type: HeaderCellType = "texto") => {
    const next = { ...layout };
    next.rows[rowIdx].cells.push(newCell(type));
    setLayout(next);
    onChange(next);
  };
  const removeCell = (rowIdx: number, cellIdx: number) => {
    const next = { ...layout };
    next.rows[rowIdx].cells.splice(cellIdx, 1);
    setLayout(next);
    onChange(next);
  };
  const editCell = (rowIdx: number, cellIdx: number, changes: Partial<HeaderCell>) => {
    const next = { ...layout };
    next.rows[rowIdx].cells[cellIdx] = { ...next.rows[rowIdx].cells[cellIdx], ...changes };
    setLayout(next);
    onChange(next);
  };

  // Render tabla visual editable
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="font-semibold text-sm text-muted-foreground flex items-center gap-2 mb-2">
        <span className="inline-block w-4 h-4"><svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" fill="#e5e7eb"/><rect x="5" y="7" width="10" height="2" rx="1" fill="#a3a3a3"/><rect x="5" y="11" width="6" height="2" rx="1" fill="#a3a3a3"/></svg></span>
        Diseño de encabezado
      </div>
      <div className="flex flex-col gap-2">
        {layout.rows.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6 border rounded-lg bg-white">Sin filas. Agrega una fila para comenzar.</div>
        )}
        {layout.rows.map((row, rowIdx) => (
          <div key={row.id} className="flex flex-row gap-2 items-center bg-white rounded-lg px-2 py-2 shadow-sm border border-muted/40 relative group overflow-x-auto">
            {row.cells.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 px-4">Fila vacía</div>
            )}
            {row.cells.map((cell, cellIdx) => {
              // Drag & drop handlers (sin hooks)
              const handleDragStart = (e: React.DragEvent) => {
                e.dataTransfer.setData("cell", JSON.stringify({ rowIdx, cellIdx }));
                e.dataTransfer.effectAllowed = "move";
                // Efecto visual: opacidad
                e.currentTarget.classList.add("opacity-40");
              };
              const handleDragEnd = (e: React.DragEvent) => {
                e.currentTarget.classList.remove("opacity-40");
              };
              const handleDrop = (e: React.DragEvent) => {
                e.preventDefault();
                const data = e.dataTransfer.getData("cell");
                if (!data) return;
                const { rowIdx: fromRow, cellIdx: fromCell } = JSON.parse(data);
                if (fromRow === rowIdx && fromCell === cellIdx) return;
                // Mover celda
                const next = { ...layout };
                const [moved] = next.rows[fromRow].cells.splice(fromCell, 1);
                next.rows[rowIdx].cells.splice(cellIdx, 0, moved);
                setLayout(next);
                onChange(next);
              };
              const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              };
              return (
                <div
                  key={cell.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-muted/40 bg-muted/10 min-w-[120px] max-w-xs relative group/cell hover:bg-primary/5 transition-colors cursor-move"
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  title="Arrastra para mover"
                >
                  <select
                    value={cell.type}
                    onChange={e => editCell(rowIdx, cellIdx, { type: e.target.value as HeaderCellType, value: "" })}
                    className="text-xs border-none bg-transparent font-medium focus:ring-1 focus:ring-primary/30 rounded px-1 py-0.5"
                    style={{ minWidth: 60 }}
                  >
                    <option value="campo">Campo</option>
                    <option value="texto">Texto</option>
                    <option value="logo">Logo</option>
                    <option value="link">Link</option>
                  </select>
                  {cell.type === "campo" ? (
                    <select
                      value={cell.value}
                      onChange={e => editCell(rowIdx, cellIdx, { value: e.target.value })}
                      className="text-xs border-none bg-transparent focus:ring-1 focus:ring-primary/30 rounded px-1 py-0.5"
                      style={{ minWidth: 80 }}
                    >
                      <option value="">Campo…</option>
                      {CAMPOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  ) : cell.type === "texto" ? (
                    <Input
                      value={cell.value}
                      onChange={e => editCell(rowIdx, cellIdx, { value: e.target.value })}
                      className="text-xs border-none bg-transparent focus:ring-1 focus:ring-primary/30 px-1 py-0.5 h-7"
                      placeholder="Texto…"
                    />
                  ) : cell.type === "logo" ? (
                    <Input
                      value={cell.value}
                      onChange={e => editCell(rowIdx, cellIdx, { value: e.target.value })}
                      className="text-xs border-none bg-transparent focus:ring-1 focus:ring-primary/30 px-1 py-0.5 h-7"
                      placeholder="URL logo…"
                    />
                  ) : cell.type === "link" ? (
                    <Input
                      value={cell.value}
                      onChange={e => editCell(rowIdx, cellIdx, { value: e.target.value })}
                      className="text-xs border-none bg-transparent focus:ring-1 focus:ring-primary/30 px-1 py-0.5 h-7"
                      placeholder="URL o campo…"
                    />
                  ) : null}
                  {/* Acciones solo en hover */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity flex gap-1 z-10">
                    <Tooltip content="Eliminar celda"><Button size="icon-xs" variant="ghost" onClick={() => removeCell(rowIdx, cellIdx)}><Trash2 className="w-3 h-3 text-destructive" /></Button></Tooltip>
                  </div>
                </div>
              );
            })}
            {/* Botón agregar celda al final de la fila */}
            <Button size="icon-xs" variant="ghost" onClick={() => addCell(rowIdx)} className="ml-1"><Plus className="w-4 h-4" /></Button>
            {/* Botón eliminar fila, solo en hover de la fila */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Tooltip content="Eliminar fila"><Button size="icon-xs" variant="ghost" onClick={() => removeRow(rowIdx)}><Trash2 className="w-4 h-4 text-destructive" /></Button></Tooltip>
            </div>
          </div>
        ))}
        {/* Botón agregar fila centrado debajo de la tabla */}
        <div className="flex justify-center mt-2">
          <Button size="sm" variant="outline" onClick={addRow} className="gap-1"><Plus className="w-4 h-4" /> Fila</Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">Puedes agregar filas y celdas, y personalizar cada celda con texto, campo, logo o link. El diseño se reflejará en el encabezado del informe.</div>
    </div>
  );
};

// Ejemplo de uso:
// <HeaderDesigner value={layout} onChange={setLayout} />
