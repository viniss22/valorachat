import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="mt-1 max-w-[60ch] text-pretty text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "primary";
  children?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-destructive"
      : tone === "primary"
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-black/5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {hint && <p className="mt-4 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl bg-card p-6 ring-1 ring-black/5 ${className}`}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}