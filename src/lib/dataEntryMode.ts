export type DataEntryMode = "tabla" | "formulario";

const STORAGE_KEY = "agroview_data_entry_mode_by_user";
export const DATA_ENTRY_MODE_EVENT = "dataEntryModeChange";

type DataEntryModeMap = Record<string, DataEntryMode>;

function readModeMap(): DataEntryModeMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DataEntryModeMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeModeMap(next: DataEntryModeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function getDataEntryMode(userId: number | null | undefined): DataEntryMode {
  if (userId == null) return "tabla";
  const mode = readModeMap()[String(userId)];
  return mode === "formulario" ? "formulario" : "tabla";
}

export function setDataEntryMode(userId: number | null | undefined, mode: DataEntryMode): void {
  if (userId == null) return;
  const next = readModeMap();
  next[String(userId)] = mode;
  writeModeMap(next);
  window.dispatchEvent(new CustomEvent(DATA_ENTRY_MODE_EVENT, { detail: { userId, mode } }));
}
