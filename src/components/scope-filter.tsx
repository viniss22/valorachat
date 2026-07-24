import type { TransactionRow } from "@/lib/transactions";

export type ScopeFilter = "todos" | "pessoal" | "empresa";

/** Filtra transações pelo escopo selecionado. */
export function filterByScope(
  txs: TransactionRow[],
  scope: ScopeFilter,
): TransactionRow[] {
  if (scope === "todos") return txs;
  // Lançamentos antigos (sem scope) contam como pessoais.
  return txs.filter((t) => (t.scope ?? "pessoal") === scope);
}

/**
 * Seletor Tudo / Pessoal / Empresa.
 * Só deve ser renderizado quando o usuário está em modo empresa (MEI) —
 * quem é apenas pessoa física não precisa ver isto.
 */
export function ScopeToggle({
  value,
  onChange,
}: {
  value: ScopeFilter;
  onChange: (v: ScopeFilter) => void;
}) {
  const opcoes: { id: ScopeFilter; label: string }[] = [
    { id: "todos", label: "Tudo" },
    { id: "pessoal", label: "Pessoal" },
    { id: "empresa", label: "Empresa" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === o.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
