import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  description: string;
  timestamp: string;
  type?: "info" | "success" | "warning";
}

interface RecentActivityProps {
  title?: string;
  activities: Activity[];
  className?: string;
}

export function RecentActivity({
  title = "Actividad reciente",
  activities,
  className,
}: RecentActivityProps) {
  const typeStyles = {
    info: "bg-info/20 border-info",
    success: "bg-success/20 border-success",
    warning: "bg-warning/20 border-warning",
  };

  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-2 border-2",
                typeStyles[activity.type || "info"]
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
