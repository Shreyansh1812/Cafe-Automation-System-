import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h4 className="text-sm font-medium text-slate-800">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">{description}</p>
    </div>
  );
}
