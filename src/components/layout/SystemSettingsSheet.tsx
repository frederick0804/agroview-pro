import { useRef, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, Palette, Upload, RotateCcw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, DEFAULT_THEME } from "@/contexts/ThemeContext";
import { useRole } from "@/contexts/RoleContext";
import { getDataEntryMode, setDataEntryMode, type DataEntryMode } from "@/lib/dataEntryMode";

interface SystemSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemSettingsSheet({ open, onOpenChange }: SystemSettingsSheetProps) {
  const { theme, saveTheme, toggleDarkMode } = useTheme();
  const { currentUser } = useRole();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState({
    nombreEmpresa: theme.nombreEmpresa ?? "",
    colorPrimario: theme.colorPrimario ?? DEFAULT_THEME.colorPrimario,
    colorSecundario: theme.colorSecundario ?? DEFAULT_THEME.colorSecundario,
    colorAccent: theme.colorAccent ?? DEFAULT_THEME.colorAccent,
  });
  const [brandSaved, setBrandSaved] = useState(false);

  const [entryMode, setEntryMode] = useState<DataEntryMode>(() =>
    getDataEntryMode(currentUser?.id ?? null),
  );

  // Sync draft when sheet opens or theme changes
  useEffect(() => {
    if (open) {
      setDraft({
        nombreEmpresa: theme.nombreEmpresa ?? "",
        colorPrimario: theme.colorPrimario ?? DEFAULT_THEME.colorPrimario,
        colorSecundario: theme.colorSecundario ?? DEFAULT_THEME.colorSecundario,
        colorAccent: theme.colorAccent ?? DEFAULT_THEME.colorAccent,
      });
      setEntryMode(getDataEntryMode(currentUser?.id ?? null));
    }
  }, [open, currentUser?.id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveTheme({ logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSaveBrand = () => {
    saveTheme(draft);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2500);
  };

  const handleResetBrand = () => {
    const defaults = {
      nombreEmpresa: DEFAULT_THEME.nombreEmpresa ?? "",
      colorPrimario: DEFAULT_THEME.colorPrimario,
      colorSecundario: DEFAULT_THEME.colorSecundario,
      colorAccent: DEFAULT_THEME.colorAccent,
    };
    setDraft(defaults);
    saveTheme(defaults);
  };

  const handleEntryModeChange = (mode: DataEntryMode) => {
    setEntryMode(mode);
    setDataEntryMode(currentUser?.id ?? null, mode);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Ajustes del sistema
          </SheetTitle>
          <SheetDescription>
            Personalización de marca y configuración avanzada de la plataforma.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Marca */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              Marca
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Logo de la Empresa</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                {theme.logo ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative inline-block">
                      <img
                        src={theme.logo}
                        alt="Logo de la empresa"
                        className="h-16 max-w-[180px] object-contain rounded-lg border border-border bg-muted/30 p-1"
                      />
                      <button
                        onClick={() => saveTheme({ logo: null })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                        title="Eliminar logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <Button variant="outline" size="sm" type="button" onClick={() => logoInputRef.current?.click()}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-2 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">Arrastra tu logo o haz click</p>
                    <Button variant="outline" size="sm" type="button"
                      onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}>
                      Seleccionar archivo
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                <Input
                  id="nombreEmpresa"
                  value={draft.nombreEmpresa}
                  onChange={e => setDraft(p => ({ ...p, nombreEmpresa: e.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Colores</p>
                <div className="space-y-3">
                  {(["colorPrimario", "colorSecundario", "colorAccent"] as const).map((key, i) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={draft[key]}
                        onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                        className="w-9 h-9 rounded-md cursor-pointer border border-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          {["Color Primario", "Color Secundario", "Color de Acento"][i]}
                        </p>
                        <Input
                          value={draft[key]}
                          onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleResetBrand}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Restaurar
                </Button>
                <div className="flex items-center gap-2">
                  {brandSaved && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Guardado
                    </span>
                  )}
                  <Button size="sm" onClick={handleSaveBrand}>Guardar cambios</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Avanzado */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Avanzado
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Modo Oscuro</p>
                  <p className="text-xs text-muted-foreground">Activar tema oscuro para la interfaz</p>
                </div>
                <Switch checked={theme.darkMode} onCheckedChange={toggleDarkMode} />
              </div>

              <div className="space-y-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Modo de ingreso de datos</p>
                  <p className="text-xs text-muted-foreground">
                    Elige tu formato preferido para capturar registros en los módulos operativos.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                  <button
                    onClick={() => handleEntryModeChange("tabla")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-colors",
                      entryMode === "tabla"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Por tabla
                  </button>
                  <button
                    onClick={() => handleEntryModeChange("formulario")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-colors",
                      entryMode === "formulario"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Por formulario
                  </button>
                </div>
              </div>

              {[
                { label: "Notificaciones por Email", desc: "Recibir alertas importantes por correo",    checked: true },
                { label: "Auto-guardado",            desc: "Guardar cambios automáticamente en tablas", checked: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.checked} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
