import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditableTable, Column } from "@/components/tables/EditableTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

interface Pedido {
  id: string;
  tipoPedido: string;
  fecha: string;
  cliente: string;
  tipoCliente: string;
  presentacion: string;
  peso: number;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

interface Cliente {
  id: string;
  nombre: string;
  tipo: string;
  contacto: string;
  email: string;
  telefono: string;
}

const initialPedidos: Pedido[] = [
  {
    id: "1",
    tipoPedido: "Exportación",
    fecha: "2024-01-15",
    cliente: "AgroExport S.A.",
    tipoCliente: "Mayorista",
    presentacion: "Caja 5kg",
    peso: 5,
    cantidad: 200,
    precioUnitario: 45,
    total: 9000,
  },
  {
    id: "2",
    tipoPedido: "Nacional",
    fecha: "2024-01-16",
    cliente: "Supermercados Unidos",
    tipoCliente: "Retail",
    presentacion: "Clamshell 500g",
    peso: 0.5,
    cantidad: 500,
    precioUnitario: 8,
    total: 4000,
  },
  {
    id: "3",
    tipoPedido: "Exportación",
    fecha: "2024-01-18",
    cliente: "Fresh Fruits Inc.",
    tipoCliente: "Distribuidor",
    presentacion: "Caja 2kg",
    peso: 2,
    cantidad: 350,
    precioUnitario: 22,
    total: 7700,
  },
];

const initialClientes: Cliente[] = [
  {
    id: "1",
    nombre: "AgroExport S.A.",
    tipo: "Mayorista",
    contacto: "Juan Pérez",
    email: "jperez@agroexport.com",
    telefono: "+52 555 1234567",
  },
  {
    id: "2",
    nombre: "Supermercados Unidos",
    tipo: "Retail",
    contacto: "María García",
    email: "mgarcia@superunidos.com",
    telefono: "+52 555 7654321",
  },
  {
    id: "3",
    nombre: "Fresh Fruits Inc.",
    tipo: "Distribuidor",
    contacto: "John Smith",
    email: "jsmith@freshfruits.com",
    telefono: "+1 555 9876543",
  },
];

const pedidoColumns: Column<Pedido>[] = [
  {
    key: "tipoPedido",
    header: "Tipo",
    width: "100px",
    type: "select",
    options: [
      { value: "Exportación", label: "Exportación" },
      { value: "Nacional", label: "Nacional" },
    ],
  },
  { key: "fecha", header: "Fecha", width: "120px", type: "date", required: true },
  { key: "cliente", header: "Cliente", width: "180px", required: true },
  {
    key: "tipoCliente",
    header: "Tipo Cliente",
    width: "120px",
    type: "select",
    options: [
      { value: "Mayorista", label: "Mayorista" },
      { value: "Retail", label: "Retail" },
      { value: "Distribuidor", label: "Distribuidor" },
    ],
  },
  { key: "presentacion", header: "Presentación", width: "130px" },
  { key: "peso", header: "Peso (kg)", width: "100px", type: "number" },
  { key: "cantidad", header: "Cantidad", width: "100px", type: "number" },
  { key: "precioUnitario", header: "Precio Unit.", width: "110px", type: "number" },
  {
    key: "total",
    header: "Total",
    width: "110px",
    editable: false,
    render: (value) => (
      <div className="px-3 py-2.5 text-sm font-medium text-success">
        ${value.toLocaleString()}
      </div>
    ),
  },
];

const clienteColumns: Column<Cliente>[] = [
  { key: "nombre", header: "Nombre", width: "180px", required: true },
  {
    key: "tipo",
    header: "Tipo",
    width: "120px",
    type: "select",
    options: [
      { value: "Mayorista", label: "Mayorista" },
      { value: "Retail", label: "Retail" },
      { value: "Distribuidor", label: "Distribuidor" },
    ],
  },
  { key: "contacto", header: "Contacto", width: "150px" },
  { key: "email", header: "Email", width: "200px" },
  { key: "telefono", header: "Teléfono", width: "150px" },
];

const Comercial = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);

  // Handlers for pedidos
  const handleUpdatePedido = (rowIndex: number, key: keyof Pedido, value: any) => {
    setPedidos((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      
      // Recalculate total if quantity or price changes
      if (key === "cantidad" || key === "precioUnitario") {
        updated[rowIndex].total =
          updated[rowIndex].cantidad * updated[rowIndex].precioUnitario;
      }
      
      return updated;
    });
  };

  const handleDeletePedido = (rowIndex: number) => {
    setPedidos((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleAddPedido = () => {
    const newId = String(Date.now());
    setPedidos((prev) => [
      ...prev,
      {
        id: newId,
        tipoPedido: "Nacional",
        fecha: new Date().toISOString().split("T")[0],
        cliente: "",
        tipoCliente: "Retail",
        presentacion: "",
        peso: 0,
        cantidad: 0,
        precioUnitario: 0,
        total: 0,
      },
    ]);
  };

  // Handlers for clientes
  const handleUpdateCliente = (rowIndex: number, key: keyof Cliente, value: any) => {
    setClientes((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [key]: value };
      return updated;
    });
  };

  const handleDeleteCliente = (rowIndex: number) => {
    setClientes((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleAddCliente = () => {
    const newId = String(Date.now());
    setClientes((prev) => [
      ...prev,
      {
        id: newId,
        nombre: "",
        tipo: "Retail",
        contacto: "",
        email: "",
        telefono: "",
      },
    ]);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Comercial"
        description="Gestión de pedidos, clientes y operaciones comerciales."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="pedidos" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="presentaciones">Presentaciones</TabsTrigger>
          <TabsTrigger value="bodegas">Bodegas</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <EditableTable
            title="Registro de Pedidos"
            data={pedidos}
            columns={pedidoColumns}
            onUpdate={handleUpdatePedido}
            onDelete={handleDeletePedido}
            onAdd={handleAddPedido}
          />
        </TabsContent>

        <TabsContent value="clientes">
          <EditableTable
            title="Clientes"
            data={clientes}
            columns={clienteColumns}
            onUpdate={handleUpdateCliente}
            onDelete={handleDeleteCliente}
            onAdd={handleAddCliente}
          />
        </TabsContent>

        <TabsContent value="presentaciones">
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
            Módulo de Presentaciones - Próximamente
          </div>
        </TabsContent>

        <TabsContent value="bodegas">
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
            Módulo de Bodegas - Próximamente
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Comercial;
