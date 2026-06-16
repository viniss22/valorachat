export const userProfile = {
  name: "Ricardo Silva",
  email: "ricardo@financechat.com.br",
  plan: "Premium",
  whatsappNumber: "+55 11 98765-4321",
  whatsappConnected: true,
  lastSync: "há 2 minutos",
};

export const overview = {
  saldo: 12450.2,
  saldoDelta: 12,
  receitas: 8200,
  receitasPrevisao: 9500,
  despesas: 3120.45,
  despesasLimite: 7000,
  patrimonio: 142900,
  investimentos: 45000,
  economiaAcumulada: 18750,
};

export type Categoria =
  | "Alimentação"
  | "Moradia"
  | "Transporte"
  | "Saúde"
  | "Educação"
  | "Lazer"
  | "Assinaturas"
  | "Impostos"
  | "Compras"
  | "Viagens"
  | "Pets"
  | "Beleza"
  | "Outros";

export const categoriasGasto: { nome: Categoria; valor: number; cor: string }[] = [
  { nome: "Moradia", valor: 1404, cor: "#0369a1" },
  { nome: "Alimentação", valor: 936, cor: "#0ea5e9" },
  { nome: "Transporte", valor: 312, cor: "#38bdf8" },
  { nome: "Lazer", valor: 468, cor: "#7dd3fc" },
  { nome: "Assinaturas", valor: 218, cor: "#bae6fd" },
];

export const evolucaoMensal = [
  { mes: "Jan", receitas: 7200, despesas: 4100, saldo: 3100 },
  { mes: "Fev", receitas: 7400, despesas: 3950, saldo: 3450 },
  { mes: "Mar", receitas: 7800, despesas: 4300, saldo: 3500 },
  { mes: "Abr", receitas: 8100, despesas: 3800, saldo: 4300 },
  { mes: "Mai", receitas: 8050, despesas: 3650, saldo: 4400 },
  { mes: "Jun", receitas: 8200, despesas: 3120, saldo: 5080 },
];

export const evolucaoInvestimentos = [
  { mes: "Jan", valor: 38000 },
  { mes: "Fev", valor: 39200 },
  { mes: "Mar", valor: 40800 },
  { mes: "Abr", valor: 42100 },
  { mes: "Mai", valor: 43500 },
  { mes: "Jun", valor: 45000 },
];

export type Transacao = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  tipo: "receita" | "despesa";
  data: string;
  origem: "whatsapp" | "manual";
  mensagemOriginal?: string;
};

export const transacoesRecentes: Transacao[] = [
  {
    id: "1",
    descricao: "Almoço no shopping",
    categoria: "Alimentação",
    valor: 35,
    tipo: "despesa",
    data: "2026-06-16T12:45:00",
    origem: "whatsapp",
    mensagemOriginal: "Gastei R$ 35,00 no almoço de hoje.",
  },
  {
    id: "2",
    descricao: "Projeto freelance - cliente João",
    categoria: "Honorários",
    valor: 1200,
    tipo: "receita",
    data: "2026-06-15T15:20:00",
    origem: "whatsapp",
    mensagemOriginal: "Recebi R$ 1.200 do projeto freelance.",
  },
  {
    id: "3",
    descricao: "Aluguel apartamento",
    categoria: "Moradia",
    valor: 1500,
    tipo: "despesa",
    data: "2026-06-10T09:00:00",
    origem: "whatsapp",
    mensagemOriginal: "Paguei aluguel de R$ 1.500.",
  },
  {
    id: "4",
    descricao: "Salário mensal",
    categoria: "Salário",
    valor: 6500,
    tipo: "receita",
    data: "2026-06-05T08:00:00",
    origem: "manual",
  },
  {
    id: "5",
    descricao: "Curso de finanças",
    categoria: "Educação",
    valor: 200,
    tipo: "despesa",
    data: "2026-06-08T14:00:00",
    origem: "whatsapp",
    mensagemOriginal: "Comprei um curso por R$ 200,00.",
  },
  {
    id: "6",
    descricao: "Uber para reunião",
    categoria: "Transporte",
    valor: 28.5,
    tipo: "despesa",
    data: "2026-06-14T18:30:00",
    origem: "whatsapp",
    mensagemOriginal: "Gastei 28,50 com Uber.",
  },
  {
    id: "7",
    descricao: "Dividendos ITSA4",
    categoria: "Dividendos",
    valor: 145,
    tipo: "receita",
    data: "2026-06-12T10:00:00",
    origem: "manual",
  },
];

export type Meta = {
  id: string;
  titulo: string;
  alvo: number;
  acumulado: number;
  prazo: string;
  cor: string;
};

export const metas: Meta[] = [
  {
    id: "m1",
    titulo: "Reserva de Emergência",
    alvo: 20000,
    acumulado: 17000,
    prazo: "Dez/2026",
    cor: "var(--success)",
  },
  {
    id: "m2",
    titulo: "Viagem para Europa",
    alvo: 15000,
    acumulado: 3300,
    prazo: "Jul/2027",
    cor: "var(--primary)",
  },
  {
    id: "m3",
    titulo: "Entrada do Imóvel",
    alvo: 80000,
    acumulado: 22000,
    prazo: "Dez/2028",
    cor: "var(--primary)",
  },
  {
    id: "m4",
    titulo: "Carro Novo",
    alvo: 60000,
    acumulado: 8500,
    prazo: "Mar/2028",
    cor: "var(--primary)",
  },
];

export type Investimento = {
  id: string;
  ativo: string;
  tipo: string;
  valor: number;
  rentabilidade: number;
};

export const investimentos: Investimento[] = [
  { id: "i1", ativo: "Tesouro Selic 2029", tipo: "Tesouro Direto", valor: 18500, rentabilidade: 11.2 },
  { id: "i2", ativo: "CDB Banco Inter 120% CDI", tipo: "CDB", valor: 8200, rentabilidade: 13.4 },
  { id: "i3", ativo: "IVVB11", tipo: "ETF", valor: 6450, rentabilidade: 14.5 },
  { id: "i4", ativo: "ITSA4", tipo: "Ações", valor: 4800, rentabilidade: 8.2 },
  { id: "i5", ativo: "HGLG11", tipo: "FII", valor: 3850, rentabilidade: 9.6 },
  { id: "i6", ativo: "Bitcoin", tipo: "Cripto", valor: 2100, rentabilidade: -3.2 },
  { id: "i7", ativo: "LCI Bradesco", tipo: "LCI", valor: 1100, rentabilidade: 10.8 },
];

export type Conversa = {
  id: string;
  hora: string;
  usuario: string;
  resposta: string;
  tipo: "registro" | "consulta";
};

export const conversasWhatsapp: Conversa[] = [
  {
    id: "c1",
    hora: "12:45",
    usuario: "Gastei R$ 35,00 no almoço de hoje.",
    resposta: "✅ Despesa de R$ 35,00 registrada em Alimentação.",
    tipo: "registro",
  },
  {
    id: "c2",
    hora: "10:30",
    usuario: "Recebi R$ 1.200 do projeto freelance.",
    resposta: "🚀 Receita de R$ 1.200,00 registrada em Honorários. Você atingiu 85% da meta Reserva de Emergência!",
    tipo: "registro",
  },
  {
    id: "c3",
    hora: "09:15",
    usuario: "Quanto gastei em lazer esse mês?",
    resposta: "Você gastou R$ 468,00 em Lazer este mês — 12% menos que no mês passado. Bom trabalho! 👏",
    tipo: "consulta",
  },
  {
    id: "c4",
    hora: "Ontem",
    usuario: "Paguei aluguel de R$ 1.500.",
    resposta: "✅ Despesa de R$ 1.500,00 registrada em Moradia.",
    tipo: "registro",
  },
  {
    id: "c5",
    hora: "Ontem",
    usuario: "Qual meu saldo?",
    resposta: "Seu saldo atual é R$ 12.450,20 (+12% vs. mês anterior). Patrimônio total: R$ 142.900,00.",
    tipo: "consulta",
  },
];

export type Lembrete = {
  id: string;
  titulo: string;
  valor: number;
  vencimento: string;
  tipo: "fatura" | "conta" | "meta";
};

export const lembretes: Lembrete[] = [
  { id: "l1", titulo: "Fatura Nubank", valor: 1850, vencimento: "20/06/2026", tipo: "fatura" },
  { id: "l2", titulo: "Conta de Luz", valor: 240, vencimento: "22/06/2026", tipo: "conta" },
  { id: "l3", titulo: "Internet Vivo", valor: 120, vencimento: "25/06/2026", tipo: "conta" },
  { id: "l4", titulo: "Aporte meta Europa", valor: 500, vencimento: "30/06/2026", tipo: "meta" },
];