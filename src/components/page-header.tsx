import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

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
  icon: Icon,
  gradient = false,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "primary";
  icon?: LucideIcon;
  gradient?: boolean;
  children?: ReactNode;
}) {
  const toneClass = gradient
    ? "text-white"
    :
    tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-destructive"
      : tone === "primary"
      ? "text-primary"
      : "text-foreground";
  const iconTone = gradient
    ? "bg-white/15 text-white"
    : tone === "success"
    ? "bg-success/10 text-success"
    : tone === "danger"
    ? "bg-destructive/10 text-destructive"
    : tone === "primary"
    ? "bg-primary/10 text-primary"
    : "bg-muted text-muted-foreground";
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-5 ring-1 ring-black/5 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] animate-fade-in ${
        gradient ? "text-white ring-white/10" : "bg-card"
      }`}
      style={gradient ? { background: "var(--gradient-hero)" } : undefined}
    >
      {gradient && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl"
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className={`text-xs font-medium uppercase tracking-wider ${gradient ? "text-white/80" : "text-muted-foreground"}`}>
        {label}
      </p>
        {Icon && (
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={`relative mt-3 text-2xl font-semibold tracking-tight tabular-nums ${toneClass}`}>{value}</p>
      {hint && (
        <p className={`relative mt-3 text-xs ${gradient ? "text-white/70" : "text-muted-foreground"}`}>{hint}</p>
      )}
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
    <section
      className={`rounded-2xl bg-card p-6 ring-1 ring-black/5 shadow-[var(--shadow-elegant)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)] ${className}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}