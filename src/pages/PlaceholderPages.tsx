import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";

const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <MainLayout>
      <PageHeader
        title={title}
        description={`Módulo de ${title} - En desarrollo`}
      />
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Módulo en Construcción
        </h2>
        <p className="text-muted-foreground">
          Este módulo está siendo desarrollado. Pronto estará disponible con todas
          sus funcionalidades.
        </p>
      </div>
    </MainLayout>
  );
};

export const Laboratorio = () => <PlaceholderPage title="Laboratorio" />;
export const Vivero = () => <PlaceholderPage title="Vivero" />;
export const Cultivo = () => <PlaceholderPage title="Cultivo" />;
export const Produccion = () => <PlaceholderPage title="Producción" />;
export const RecursosHumanos = () => <PlaceholderPage title="Recursos Humanos" />;
