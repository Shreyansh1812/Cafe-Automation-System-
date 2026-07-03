import { Construction } from "lucide-react";

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70">
          <Construction className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          This module is part of the upcoming build. The shell, routing and API pipes are
          already wired — feature UI lands next.
        </p>
      </div>
    </div>
  );
}
