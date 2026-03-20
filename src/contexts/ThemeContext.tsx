// ─── ThemeContext — Manejo global de tema: dark mode, colores y logo ──────────
// Persiste en localStorage. Aplica CSS custom properties en tiempo real.

import { createContext, useContext, useEffect, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  darkMode: boolean;
  colorPrimario: string;    // hex, ej. "#1a5c3a"
  colorSecundario: string;  // hex
  colorAccent: string;      // hex
  nombreEmpresa: string;
  logo: string | null;      // base64 data URL o null
}

const STORAGE_KEY = "agroview-theme";

export const DEFAULT_THEME: ThemeConfig = {
  darkMode: false,
  colorPrimario:   "#1a5c3a",
  colorSecundario: "#40916c",
  colorAccent:     "#d4a72d",
  nombreEmpresa:   "BlueData",
  logo:            null,
};

// ─── Utilidades de color ──────────────────────────────────────────────────────

/** Convierte hex a las partes H, S, L (valores numéricos) */
function hexToHslParts(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convierte hex a formato "H S% L%" que usan las CSS variables de Tailwind/shadcn */
export function hexToHsl(hex: string): string {
  const { h, s, l } = hexToHslParts(hex);
  return `${h} ${s}% ${l}%`;
}

/** Luminancia relativa de un color hex (0 = negro, 1 = blanco) */
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Aplica el tema al DOM (CSS variables + clase dark) */
export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement;

  // — Modo oscuro —
  root.classList.toggle("dark", theme.darkMode);

  // — Color primario + variables del sidebar derivadas del mismo matiz —
  if (HEX_RE.test(theme.colorPrimario)) {
    const hsl = hexToHsl(theme.colorPrimario);
    const { h, s } = hexToHslParts(theme.colorPrimario);
    const fg = getLuminance(theme.colorPrimario) > 0.4 ? "20 14% 4%" : "0 0% 98%";

    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--ring", hsl);

    // Sidebar: mismo matiz (h), saturación moderada, distintas luminosidades
    const sS = Math.min(s, 45); // cap saturación para evitar colores muy vivos
    if (theme.darkMode) {
      root.style.setProperty("--sidebar-background",        `${h} ${Math.min(sS, 25)}% 6%`);
      root.style.setProperty("--sidebar-accent",            `${h} ${Math.min(sS, 20)}% 14%`);
      root.style.setProperty("--sidebar-border",            `${h} ${Math.min(sS, 15)}% 17%`);
      root.style.setProperty("--sidebar-muted",             `${h} ${Math.min(sS, 15)}% 24%`);
    } else {
      root.style.setProperty("--sidebar-background",        `${h} ${sS}% 18%`);
      root.style.setProperty("--sidebar-accent",            `${h} ${Math.min(sS + 10, 35)}% 25%`);
      root.style.setProperty("--sidebar-border",            `${h} ${Math.min(sS + 5, 30)}% 25%`);
      root.style.setProperty("--sidebar-muted",             `${h} ${Math.min(sS, 20)}% 35%`);
    }
    // Items activos del sidebar — usa el primario directo
    root.style.setProperty("--sidebar-primary",             hsl);
    root.style.setProperty("--sidebar-primary-foreground",  fg);
  }

  // — Color de acento —
  if (HEX_RE.test(theme.colorAccent)) {
    const hsl = hexToHsl(theme.colorAccent);
    const fg  = getLuminance(theme.colorAccent) > 0.4 ? "20 14% 4%" : "0 0% 98%";
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--accent-foreground", fg);
    root.style.setProperty("--sidebar-ring", hsl);
  }

  // — Color secundario (variable custom, no rompe tokens de shadcn) —
  if (HEX_RE.test(theme.colorSecundario)) {
    root.style.setProperty("--color-brand-secondary", hexToHsl(theme.colorSecundario));
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeConfig;
  /** Persiste cambios parciales inmediatamente */
  saveTheme: (updates: Partial<ThemeConfig>) => void;
  /** Alterna dark mode en tiempo real */
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
    } catch {
      // ignore malformed data
    }
    return DEFAULT_THEME;
  });

  // Cada vez que el tema cambia → aplica al DOM y persiste
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const saveTheme = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => ({ ...prev, ...updates }));
  };

  const toggleDarkMode = () => {
    setTheme((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  return (
    <ThemeContext.Provider value={{ theme, saveTheme, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}
