import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Cria um provider OpenAI compatível com `ai@6`.
 * Lê a chave de OPENAI_API_KEY do ambiente do servidor.
 */
export function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina a variável de ambiente no servidor.",
    );
  }
  return createOpenAI({ apiKey });
}

// ---------- parseFinanceMessage ----------

const EXPENSE_CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Assinaturas",
  "Compras",
  "Outro",
] as const;

const INCOME_CATEGORIES = [
  "Salário",
  "Honorários",
  "Dividendos",
  "Aluguéis",
  "Vendas",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type FinanceCategory = ExpenseCategory | IncomeCategory;

export interface ParseResult {
  amount: number;
  category: FinanceCategory;
  type: "receita" | "despesa";
  description: string;
  confidence: number; // 0-1
}

const PARSER_SYSTEM = `Você é um extrator de transações financeiras em Português do Brasil.
Receba uma frase do usuário e devolva APENAS um JSON puro (sem markdown, sem comentários) com as chaves:
- amount: number (valor em reais; aceite "50", "R$ 50", "50,00")
- category: uma das EXATAS opções abaixo
- type: "receita" ou "despesa"
- description: string curta descrevendo a transação (sem o valor)
- confidence: number entre 0 e 1

Categorias de DESPESA: ${EXPENSE_CATEGORIES.join(", ")}.
Categorias de RECEITA: ${INCOME_CATEGORIES.join(", ")}.

Regras:
- "gastei", "paguei", "comprei", "torrei" => despesa.
- "recebi", "ganhei", "caiu", "entrou", "salário" => receita.
- Se o valor for claro e a categoria óbvia, confidence >= 0.9.
- Se houver ambiguidade (valor ausente, categoria genérica), confidence < 0.7.
- Se NÃO for possível identificar o valor, retorne amount = 0 e confidence baixa.
- NUNCA escreva texto fora do JSON.`;

/**
 * Extrai uma transação estruturada a partir de uma mensagem em linguagem
 * natural usando OpenAI GPT-4 Turbo. Lança Error com mensagem clara quando
 * não consegue parsear (ex.: valor ausente).
 */
export async function parseFinanceMessage(
  userMessage: string,
): Promise<ParseResult> {
  const trimmed = userMessage?.trim();
  if (!trimmed) {
    throw new Error("Mensagem vazia. Envie algo como: 'gastei 50 em almoço'.");
  }

  const openai = createOpenAIProvider();

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: PARSER_SYSTEM,
    prompt: trimmed,
    temperature: 0,
  });

  // Remove eventual cerca de código markdown caso o modelo desobedeça.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Não consegui interpretar a mensagem. Tente: 'gastei 50 em almoço'.",
    );
  }

  const obj = parsed as Partial<ParseResult> & { amount?: unknown };
  const amount =
    typeof obj.amount === "number"
      ? obj.amount
      : typeof obj.amount === "string"
        ? Number(String(obj.amount).replace(",", "."))
        : NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Não consegui extrair o valor. Tente: 'Paguei 150 na conta'.",
    );
  }

  const type = obj.type === "receita" ? "receita" : "despesa";
  const allowed =
    type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = (allowed as readonly string[]).includes(
    String(obj.category),
  )
    ? (obj.category as FinanceCategory)
    : type === "despesa"
      ? "Outro"
      : "Vendas";

  const confidence =
    typeof obj.confidence === "number"
      ? Math.min(1, Math.max(0, obj.confidence))
      : 0.5;

  return {
    amount,
    category,
    type,
    description: typeof obj.description === "string" ? obj.description : trimmed,
    confidence,
  };
}