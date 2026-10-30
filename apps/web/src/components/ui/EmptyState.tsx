import React from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center bg-surface/40 ${className}`}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-text">{title}</h4>
      {description && (
        <p className="text-xs text-muted max-w-sm mt-1 mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
