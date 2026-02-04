import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Palette, Settings2, Database, Upload } from "lucide-react";

// Types
interface Estructura {
  id: string;
  nombre: string;
  nivel: number;
}

interface Calibre {
  id: string;
  nombre: string;
  minimo: number;
  maximo: number;
}

interface Parametro {
  id: string;
  cultivo: string;
  nombre: string;
  tipoDato: string;
}

// Initial data
const initialEstructuras: Estructura[] = [
  { id: "1", nombre: "Bloque", nivel: 1 },
  { id: "2", nombre: "Macrotúnel", nivel: 2 },
  { id: "3", nombre: "Nave", nivel: 3 },
];

const initialCalibres: Calibre[] = [
  { id: "1", nombre: "Jumbo", minimo: 18, maximo: 20 },
  { id: "2", nombre: "Extra", minimo: 16, maximo: 18 },
  { id: "3", nombre: "Primera", minimo: 14, maximo: 16 },
  { id: "4", nombre: "Segunda", minimo: 12, maximo: 14 },
];

const initialParametros: Parametro[] = [
  { id: "1", cultivo: "Berries", nombre: "Peso fruto", tipoDato: "Número" },
  { id: "2", cultivo: "Berries", nombre: "Color", tipoDato: "Texto" },
  { id: "3", cultivo: "Berries", nombre: "Brix", tipoDato: "Número" },
];

const estructuraColumns: Column<Estructura>[] = [
  { key: "nombre", header: "Nombre", width: "200px" },
  { key: "nivel", header: "Nivel", width: "100px", type: "number" },
];

const calibreColumns: Column<Calibre>[] = [
  { key: "nombre", header: "Nombre", width: "150px" },
  { key: "minimo", header: "Mínimo (mm)", width: "120px", type: "number" },
  { key: "maximo", header: "Máximo (mm)", width: "120px", type: "number" },
];

const parametroColumns: Column<Parametro>[] = [
  { key: "cultivo", header: "Cultivo", width: "150px" },
  { key: "nombre", header: "Nombre", width: "200px" },
  {
    key: "tipoDato",
    header: "Tipo de Dato",
    width: "150px",
    type: "select",
    options: [
      { value: "Texto", label: "Texto" },
      { value: "Número", label: "Número" },
      { value: "Fecha", label: "Fecha" },
      { value: "Booleano", label: "Sí/No" },
    ],
  },
];

const Configuracion = () => {
  // State for tables
  const [estructuras, setEstructuras] = useState<Estructura[]>(initialEstructuras);
  const [calibres, setCalibres] = useState<Calibre[]>(initialCalibres);
  const [parametros, setParametros] = useState<Parametro[]>(initialParametros);

  // State for brand config
  const [brandConfig, setBrandConfig] = useState({
    nombreEmpresa: "BlueData",
    colorPrimario: "#2d6a4f",
    colorSecundario: "#40916c",
    colorAccent: "#d4a72d",
  });

  // Handlers for estructuras
  const handleUpdateEstructura = (rowIndex: number, key: keyof Estructura, value: any) => {
    setEstructuras((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleDeleteEstructura = (rowIndex: number) => {
    setEstructuras((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleAddEstructura = () => {
    const newId = String(Date.now());
    setEstructuras((prev) => [...prev, { id: newId, nombre: "", nivel: prev.length + 1 }]);
  };

  // Handlers for calibres
  const handleUpdateCalibre = (rowIndex: number, key: keyof Calibre, value: any) => {
    setCalibres((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleDeleteCalibre = (rowIndex: number) => {
    setCalibres((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleAddCalibre = () => {
    const newId = String(Date.now());
    setCalibres((prev) => [...prev, { id: newId, nombre: "", minimo: 0, maximo: 0 }]);
  };

  // Handlers for parametros
  const handleUpdateParametro = (rowIndex: number, key: keyof Parametro, value: any) => {
    setParametros((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleDeleteParametro = (rowIndex: number) => {
    setParametros((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleAddParametro = () => {
    const newId = String(Date.now());
    setParametros((prev) => [
      ...prev,
      { id: newId, cultivo: "", nombre: "", tipoDato: "Texto" },
    ]);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description="Gestiona los parámetros generales del sistema y personaliza tu marca."
      />

      <Tabs defaultValue="parametros" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="parametros" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Parámetros Generales
          </TabsTrigger>
          <TabsTrigger value="marca" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Logo y Colores
          </TabsTrigger>
          <TabsTrigger value="avanzado" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Avanzado
          </TabsTrigger>
        </TabsList>

        {/* Parámetros Generales Tab */}
        <TabsContent value="parametros" className="space-y-6">
          {/* Estructura */}
          <EditableTable
            title="Estructura de Cultivo"
            data={estructuras}
            columns={estructuraColumns}
            onUpdate={handleUpdateEstructura}
            onDelete={handleDeleteEstructura}
            onAdd={handleAddEstructura}
            searchable={false}
          />

          {/* Calibres */}
          <EditableTable
            title="Calibres"
            data={calibres}
            columns={calibreColumns}
            onUpdate={handleUpdateCalibre}
            onDelete={handleDeleteCalibre}
            onAdd={handleAddCalibre}
            searchable={false}
          />

          {/* Parámetros de Cultivo */}
          <EditableTable
            title="Parámetros de Cultivo"
            data={parametros}
            columns={parametroColumns}
            onUpdate={handleUpdateParametro}
            onDelete={handleDeleteParametro}
            onAdd={handleAddParametro}
          />
        </TabsContent>

        {/* Logo y Colores Tab */}
        <TabsContent value="marca" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Personalización de Marca</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>Logo de la Empresa</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arrastra tu logo aquí o haz click para seleccionar
                  </p>
                  <Button variant="outline" size="sm">
                    Seleccionar archivo
                  </Button>
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa</Label>
                  <Input
                    id="nombreEmpresa"
                    value={brandConfig.nombreEmpresa}
                    onChange={(e) =>
                      setBrandConfig((prev) => ({ ...prev, nombreEmpresa: e.target.value }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Color Pickers */}
            <div className="mt-8">
              <h4 className="font-medium text-foreground mb-4">Colores del Sistema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Color Primario</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandConfig.colorPrimario}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorPrimario: e.target.value }))
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={brandConfig.colorPrimario}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorPrimario: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color Secundario</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandConfig.colorSecundario}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorSecundario: e.target.value }))
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={brandConfig.colorSecundario}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorSecundario: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color de Acento</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandConfig.colorAccent}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorAccent: e.target.value }))
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border border-border"
                    />
                    <Input
                      value={brandConfig.colorAccent}
                      onChange={(e) =>
                        setBrandConfig((prev) => ({ ...prev, colorAccent: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-8">
              <h4 className="font-medium text-foreground mb-4">Vista Previa</h4>
              <div
                className="rounded-lg p-6"
                style={{ backgroundColor: brandConfig.colorPrimario }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: brandConfig.colorAccent }}>
                    <span className="text-lg font-bold" style={{ color: brandConfig.colorPrimario }}>
                      {brandConfig.nombreEmpresa.charAt(0)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {brandConfig.nombreEmpresa}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: brandConfig.colorSecundario }}
                  >
                    Botón Secundario
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: brandConfig.colorAccent,
                      color: brandConfig.colorPrimario,
                    }}
                  >
                    Botón Acento
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <Button>Guardar Cambios</Button>
            </div>
          </div>
        </TabsContent>

        {/* Avanzado Tab */}
        <TabsContent value="avanzado" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-6">Configuración Avanzada</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Modo Oscuro</p>
                  <p className="text-sm text-muted-foreground">
                    Activar tema oscuro para la interfaz
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Notificaciones por Email</p>
                  <p className="text-sm text-muted-foreground">
                    Recibir alertas importantes por correo
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Auto-guardado</p>
                  <p className="text-sm text-muted-foreground">
                    Guardar cambios automáticamente en tablas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Configuracion;
