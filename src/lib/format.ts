export const brl = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export const brlCompact = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export const pct = (value: number, digits = 1) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const dateBR = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};