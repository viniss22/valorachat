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

/** Categorias de despesa do negócio (MEI/autônomo). */
const BUSINESS_EXPENSE_CATEGORIES = [
  "Insumos e mercadorias",
  "Equipamentos e ferramentas",
  "Serviços profissionais",
  "Marketing e vendas",
  "Impostos e taxas",
  "Frete e deslocamento",
  "Espaço comercial",
] as const;

export const EXPENSE_CATEGORIES = [
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

export const INCOME_CATEGORIES = [
  "Salário",
  "Honorários",
  "Dividendos",
  "Aluguéis",
  "Vendas",
] as const;

export type BusinessExpenseCategory = (typeof BUSINESS_EXPENSE_CATEGORIES)[number];
export const BUSINESS_CATEGORIES = BUSINESS_EXPENSE_CATEGORIES;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type FinanceCategory = ExpenseCategory | IncomeCategory | BusinessExpenseCategory;

export interface ParseResult {
  amount: number;
  category: FinanceCategory;
  type: "receita" | "despesa";
  description: string;
  confidence: number; // 0-1
  /** Lançamento pessoal ou do negócio (MEI/autônomo). */
  scope: "pessoal" | "empresa";
}

const PARSER_SYSTEM = `Você é um extrator de transações financeiras em Português do Brasil.
Receba uma frase do usuário e devolva APENAS um JSON puro (sem markdown, sem comentários) com as chaves:
- amount: number (valor em reais; aceite "50", "R$ 50", "50,00")
- category: uma das EXATAS opções abaixo
- type: "receita" ou "despesa"
- description: string curta descrevendo a transação (sem o valor)
- confidence: number entre 0 e 1
- scope: "pessoal" ou "empresa" (ver seção PESSOAL OU EMPRESA abaixo)

PESSOAL OU EMPRESA (campo "scope"):
O usuário pode ser MEI ou autônomo e lançar, na mesma conversa, gastos da vida
pessoal e do negócio. Classifique com atenção — errar aqui atrapalha a apuração
do lucro dele.

Marque scope = "empresa" quando a frase indicar atividade produtiva:
- mercadoria para revenda, insumo, matéria-prima, produto para atendimento
- equipamento, ferramenta ou material de trabalho
- serviço contratado para o negócio (contador, designer, assistência)
- anúncio, tráfego pago, impulsionamento, material de divulgação
- DAS, MEI, alvará, taxa da prefeitura, nota fiscal
- frete, entrega, deslocamento para cliente ou fornecedor
- aluguel de sala, loja, ateliê ou coworking
- recebimento de cliente, venda de produto/serviço, pagamento por trabalho
Palavras que sinalizam empresa: "para revender", "do salão", "da loja",
"para os clientes", "do trabalho", "da empresa", "para o atendimento",
"fornecedor", "estoque", "material de trabalho".

Marque scope = "pessoal" (padrão) para consumo próprio e da família:
mercado de casa, restaurante, farmácia, escola dos filhos, lazer, roupas,
conta de luz da residência, salário recebido de emprego.

Na dúvida, use "pessoal" e reduza a confidence para que o usuário confirme.

CATEGORIAS DE DESPESA DO NEGÓCIO (use apenas quando scope = "empresa"):
- Insumos e mercadorias: produtos para revenda, matéria-prima, estoque,
  material de consumo do serviço (ex.: produtos usados no atendimento).
- Equipamentos e ferramentas: máquinas, computador, celular de trabalho,
  mobiliário, utensílios profissionais.
- Serviços profissionais: contador, advogado, designer, assistência técnica,
  softwares e assinaturas do negócio.
- Marketing e vendas: anúncios, impulsionamento, cartão de visita, brindes,
  comissões de venda.
- Impostos e taxas: DAS, alvará, taxas municipais, tarifas bancárias PJ.
- Frete e deslocamento: entrega, motoboy, combustível para atender cliente.
- Espaço comercial: aluguel de sala/loja, condomínio comercial, contas do
  ponto comercial.

CATEGORIAS DE DESPESA PESSOAL (use quando scope = "pessoal"):
- Alimentação: mercado, feira, restaurante, lanche, delivery, café, padaria, doces, bebidas.
- Moradia: aluguel, condomínio, IPTU, luz, água, gás, internet, telefone fixo, reforma, manutenção da casa.
- Transporte: combustível, Uber/99/táxi, ônibus, metrô, estacionamento, pedágio, seguro e manutenção do carro.
- Lazer: cinema, shows, viagens, passeios, bares, festas, hobbies, presentes.
- Saúde: farmácia, remédios, consultas, exames, plano de saúde, dentista, terapia, academia.
- Educação: cursos, faculdade, escola, livros, material escolar, certificações.
- Assinaturas: streaming, apps, software, revistas, academias por mensalidade, serviços recorrentes.
- Compras: roupas, calçados, eletrônicos, móveis, utensílios, itens de casa, enxoval, cama/mesa/banho,
  decoração, papelaria, cosméticos, itens pessoais e qualquer bem material que não seja alimento.
- Outro: APENAS quando nada acima se aplicar de verdade.

CATEGORIAS DE RECEITA:
- Salário: salário, 13º, férias, adiantamento, vale.
- Honorários: pagamento de cliente, freelance, serviço prestado, consultoria, comissão.
- Dividendos: proventos, JCP, rendimentos de investimentos.
- Aluguéis: aluguel recebido de imóvel.
- Vendas: venda de produto ou item.

REGRA DE OURO SOBRE "Outro":
"Outro" é o ÚLTIMO recurso. Antes de usá-lo, pergunte-se: é algo material que a
pessoa comprou? => Compras. É consumo de comida ou bebida? => Alimentação.
É algo da casa (contas, manutenção)? => Moradia. Só use "Outro" quando
realmente não houver encaixe — por exemplo: taxas bancárias, impostos avulsos,
multas, doações.

EXEMPLOS (siga este padrão — repare no campo scope):
"gastei 31 em itens de enxoval" -> {"amount":31,"category":"Compras","type":"despesa","description":"itens de enxoval","confidence":0.93,"scope":"pessoal"}
"comprei 250 de produtos para atendimento" -> {"amount":250,"category":"Insumos e mercadorias","type":"despesa","description":"produtos para atendimento","confidence":0.9,"scope":"empresa"}
"paguei 120 de luz" -> {"amount":120,"category":"Moradia","type":"despesa","description":"conta de luz","confidence":0.96,"scope":"pessoal"}
"10 em doce" -> {"amount":10,"category":"Alimentação","type":"despesa","description":"doce","confidence":0.94,"scope":"pessoal"}
"45 no uber" -> {"amount":45,"category":"Transporte","type":"despesa","description":"Uber","confidence":0.96,"scope":"pessoal"}
"recebi 1200 do cliente João" -> {"amount":1200,"category":"Honorários","type":"receita","description":"cliente João","confidence":0.95,"scope":"empresa"}
"paguei 80 de multa" -> {"amount":80,"category":"Outro","type":"despesa","description":"multa","confidence":0.9,"scope":"pessoal"}
"paguei 76 do DAS" -> {"amount":76,"category":"Impostos e taxas","type":"despesa","description":"DAS do MEI","confidence":0.95,"scope":"empresa"}
"comprei 900 de material pro salão" -> {"amount":900,"category":"Insumos e mercadorias","type":"despesa","description":"material para o salão","confidence":0.92,"scope":"empresa"}
"200 de anúncio no instagram" -> {"amount":200,"category":"Marketing e vendas","type":"despesa","description":"anúncio no Instagram","confidence":0.93,"scope":"empresa"}
"recebi 350 de uma cliente" -> {"amount":350,"category":"Vendas","type":"receita","description":"pagamento de cliente","confidence":0.9,"scope":"empresa"}

DIVISÃO DE CONTAS (rachar, dividir, cada um paga uma parte):
Quando a frase indicar que o valor foi dividido, registre APENAS a parte que
cabe ao usuário, e deixe o cálculo explícito na description.
- "pizza de 150, cada um pagou metade" -> amount 75, description "pizza (metade de R$ 150)"
- "jantar de 240, dividimos em 3" -> amount 80, description "jantar (1/3 de R$ 240)"
- "conta de 90 rachada comigo" -> amount 45, description "conta (metade de R$ 90)"
Se a divisão for ambígua (número de pessoas não informado, ou não fica claro
quanto coube ao usuário), use confidence < 0.7 para que ele possa confirmar.
- "paguei 200 e o João me deve metade" -> amount 200, confidence 0.6,
  description "pagamento (João deve metade)" — aqui o usuário desembolsou o total.

Regras:
- "gastei", "paguei", "comprei", "torrei" => despesa.
- "recebi", "ganhei", "caiu", "entrou", "salário" => receita.
- Se o valor for claro e a categoria óbvia, confidence >= 0.9.
- Se houver ambiguidade real (valor ausente, item indecifrável), confidence < 0.7.
- Escolher "Outro" por preguiça NÃO é aceitável: prefira a categoria mais próxima.
- Se NÃO for possível identificar o valor, retorne amount = 0 e confidence baixa.
- CRÍTICO: se a frase for uma PERGUNTA, um pedido de análise ou qualquer coisa
  que NÃO seja o registro de um lançamento, retorne amount = 0 e confidence = 0.
  Exemplos que devem receber confidence = 0:
  "quanto gastei este mês?", "qual meu saldo?", "posso pedir iFood?",
  "como economizar?", "me mostra o resumo", "quais minhas metas?".
  Perguntas NUNCA viram transação.
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
  const scope = obj.scope === "empresa" ? "empresa" : "pessoal";

  // Despesa do negócio aceita tanto as categorias empresariais quanto as
  // pessoais (um MEI pode almoçar com cliente e lançar como Alimentação).
  const allowed =
    type === "receita"
      ? INCOME_CATEGORIES
      : scope === "empresa"
        ? [...BUSINESS_EXPENSE_CATEGORIES, ...EXPENSE_CATEGORIES]
        : EXPENSE_CATEGORIES;

  const category = (allowed as readonly string[]).includes(
    String(obj.category),
  )
    ? (obj.category as FinanceCategory)
    : type === "despesa"
      ? scope === "empresa"
        ? "Insumos e mercadorias"
        : "Outro"
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
    scope,
  };
}
