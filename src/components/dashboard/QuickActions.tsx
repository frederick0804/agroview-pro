import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface QuickActionsProps {
  title?: string;
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ title = "Acciones rápidas", actions, className }: QuickActionsProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className="quick-action w-full justify-start"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
