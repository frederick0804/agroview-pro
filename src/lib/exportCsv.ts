/**
 * exportCsv.ts
 *
 * Utilidades para exportar datos a CSV sin dependencias externas.
 * Usa el API nativo del browser (Blob + URL.createObjectURL).
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

/**
 * Escapa un valor para CSV:
 *  - Si contiene comas, saltos de línea o comillas → envuelve en comillas dobles
 *  - Las comillas internas se duplican ("")
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte un array de objetos a string CSV.
 * Las columnas se derivan de las keys del primer objeto
 * (o de `columns` si se pasa explícitamente).
 */
export function toCsvString(
  rows: CsvRow[],
  columns?: { key: string; label: string }[],
): string {
  if (rows.length === 0) return "";

  const cols = columns ?? Object.keys(rows[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => escapeCsvValue(c.label)).join(",");
  const body   = rows.map(row =>
    cols.map(c => escapeCsvValue(row[c.key])).join(","),
  );

  return [header, ...body].join("\n");
}

/**
 * Descarga un string CSV como archivo en el browser.
 * Añade BOM UTF-8 para que Excel lo abra correctamente con tildes.
 */
export function downloadCsv(csv: string, filename: string): void {
  const BOM  = "﻿";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper combinado: convierte y descarga en un paso.
 */
export function exportToCsv(
  rows: CsvRow[],
  columns: { key: string; label: string }[],
  filename: string,
): void {
  downloadCsv(toCsvString(rows, columns), filename);
}
