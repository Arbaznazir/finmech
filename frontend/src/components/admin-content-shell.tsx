"use client";

import { ReactNode } from "react";

type AdminContentShellProps = {
  icon: ReactNode;
  title: string;
  description: string;
  breadcrumb: string;
  sidebar: ReactNode;
  children: ReactNode;
};

export function AdminContentShell({
  icon,
  title,
  description,
  breadcrumb,
  sidebar,
  children,
}: AdminContentShellProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs shrink-0">
            <span className="text-muted-foreground">Editing </span>
            <span className="font-semibold text-foreground">{breadcrumb}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-5 items-start">
        <aside className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {sidebar}
        </aside>
        <main className="rounded-2xl border border-border bg-card p-5 sm:p-6 min-h-[420px]">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminSidebarLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
      {children}
    </p>
  );
}

export function AdminPillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block mt-4">
      <span className="text-xs text-muted-foreground mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
