import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Sparkles,
  TrendingUp,
  Target,
  ShieldCheck,
  ArrowRight,
  Check,
  Bot,
  PiggyBank,
  Zap,
} from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinanceChat — Sua vida financeira no WhatsApp, com IA" },
      { name: "description", content: "Controle gastos, investimentos e metas conversando no WhatsApp. A IA do FinanceChat organiza tudo automaticamente em um dashboard premium." },
      { property: "og:title", content: "FinanceChat — Sua vida financeira no WhatsApp, com IA" },
      { property: "og:description", content: "Controle gastos, investimentos e metas conversando no WhatsApp. A IA do FinanceChat organiza tudo automaticamente em um dashboard premium." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <Cta />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary">
            <div className="size-3 rounded-full bg-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">FinanceChat</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#recursos" className="hover:text-foreground">Recursos</a>
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#planos" className="hover:text-foreground">Planos</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/app" className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground md:inline-flex">Entrar</Link>
          <Link to="/app" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Começar grátis <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent via-background to-background" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3" /> IA + WhatsApp · Beta aberto
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance md:text-6xl">
            Sua vida financeira <span className="text-primary">conversando</span> pelo WhatsApp.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Mande uma mensagem como <em>"gastei R$ 35 no almoço"</em> e a IA do FinanceChat organiza tudo: categoriza, calcula seu saldo e atualiza suas metas em segundos.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
              Acessar dashboard <ArrowRight className="size-4" />
            </Link>
            <Link to="/app/whatsapp" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">
              <MessageCircle className="size-4 text-whatsapp" /> Ver Central WhatsApp
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {["Sem planilhas", "100% em português", "Bancário-grau de segurança", "Configuração em 2 minutos"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="size-4 text-success" /> {f}</li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-success/10 blur-2xl" />
          <div className="rounded-3xl bg-card p-2 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-whatsapp to-success p-4">
              <div className="flex items-center gap-3 text-white">
                <div className="grid size-9 place-items-center rounded-full bg-white/20"><Bot className="size-4" /></div>
                <div>
                  <p className="text-sm font-semibold">FinanceChat IA</p>
                  <p className="text-[10px] opacity-90">online · responde em segundos</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 bg-muted/30 p-4">
              <ChatBubble side="right">Gastei R$ 35,00 no almoço de hoje 🍔</ChatBubble>
              <ChatBubble side="left" ai>
                ✅ Despesa de <strong>{brl(35)}</strong> registrada em <strong>Alimentação</strong>.
              </ChatBubble>
              <ChatBubble side="right">Recebi R$ 1.200 do projeto freelance</ChatBubble>
              <ChatBubble side="left" ai>
                🚀 Receita de <strong>{brl(1200)}</strong> em Honorários. Você já está em <strong>85%</strong> da meta Reserva de Emergência!
              </ChatBubble>
              <ChatBubble side="right">Qual meu saldo?</ChatBubble>
              <ChatBubble side="left" ai>
                Saldo atual: <strong>{brl(12450.2)}</strong> (+12% vs. mês passado). Patrimônio total: <strong>{brl(142900)}</strong>.
              </ChatBubble>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ children, side, ai }: { children: React.ReactNode; side: "left" | "right"; ai?: boolean }) {
  if (side === "right") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-primary/10 px-3 py-2 text-sm text-foreground ring-1 ring-primary/10">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      {ai && <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">IA</div>}
      <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-card px-3 py-2 text-sm text-foreground shadow-sm ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { v: "+18 mil", l: "transações registradas via WhatsApp" },
    { v: "97%", l: "de precisão na categorização por IA" },
    { v: "R$ 4.7k", l: "economia média anual dos usuários" },
    { v: "2 min", l: "para começar a usar" },
  ];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l}>
            <p className="text-3xl font-bold tracking-tight text-primary">{s.v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: MessageCircle, title: "Registro pelo WhatsApp", desc: "Mande mensagens naturais. A IA entende, categoriza e arquiva por você." },
    { icon: Sparkles, title: "Assistente Financeiro IA", desc: "Consulte saldo, peça análises e receba sugestões personalizadas em segundos." },
    { icon: TrendingUp, title: "Carteira de Investimentos", desc: "Acompanhe Tesouro, CDB, Ações, FIIs e Cripto em um único dashboard." },
    { icon: Target, title: "Metas Inteligentes", desc: "Defina objetivos e veja em tempo real quanto falta para conquistá-los." },
    { icon: PiggyBank, title: "Controle de Orçamento", desc: "Limites por categoria com alertas automáticos antes de estourar." },
    { icon: ShieldCheck, title: "Privacidade Total", desc: "Criptografia de ponta a ponta. Seus dados são apenas seus." },
  ];
  return (
    <section id="recursos" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Recursos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Tudo que você precisa para dominar seu dinheiro</h2>
          <p className="mt-4 text-muted-foreground">Uma plataforma completa que combina a praticidade do WhatsApp com a profundidade de um dashboard de gestão patrimonial.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card p-6 ring-1 ring-black/5 transition hover:ring-primary/20">
              <div className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Conecte seu WhatsApp", d: "Em 30 segundos. Sem instalar apps." },
    { n: "02", t: "Converse normalmente", d: "Conte seus gastos e receitas como faria com um amigo." },
    { n: "03", t: "Acompanhe no dashboard", d: "Veja seu dinheiro organizado em tempo real com gráficos premium." },
  ];
  return (
    <section id="como-funciona" className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Como funciona</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Comece em 3 passos simples</h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl bg-background p-8 ring-1 ring-black/5">
              <span className="text-5xl font-bold text-primary/15">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Free", price: "R$ 0", desc: "Para começar a organizar", features: ["Até 50 registros/mês", "WhatsApp básico", "Dashboard essencial"], cta: "Começar grátis", featured: false },
    { name: "Premium", price: "R$ 19,90", desc: "Para quem leva a sério", features: ["Registros ilimitados", "Assistente IA completo", "Metas e investimentos", "Relatórios avançados", "Suporte prioritário"], cta: "Assinar Premium", featured: true },
    { name: "Family", price: "R$ 39,90", desc: "Para famílias e casais", features: ["Tudo do Premium", "Até 5 contas conectadas", "Visão consolidada", "Orçamento compartilhado"], cta: "Escolher Family", featured: false },
  ];
  return (
    <section id="planos" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Planos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Escolha o plano ideal para você</h2>
          <p className="mt-4 text-muted-foreground">Sem fidelidade. Cancele quando quiser.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-8 ring-1 ${p.featured ? "bg-primary text-primary-foreground ring-primary shadow-2xl shadow-primary/30 md:-translate-y-2" : "bg-card ring-black/5"}`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success-foreground">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                <span className={`text-sm ${p.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/mês</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`size-4 ${p.featured ? "text-success-foreground" : "text-success"}`} /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/app"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${p.featured ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
              >
                {p.cta} <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="border-b border-border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Zap className="mx-auto size-10 opacity-80" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Pronto para conversar com seu dinheiro?</h2>
        <p className="mt-4 text-primary-foreground/80">Junte-se a milhares de brasileiros que estão controlando suas finanças sem planilhas, sem complicação.</p>
        <Link
          to="/app"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary hover:bg-primary-foreground/90"
        >
          Começar gratuitamente <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-primary">
            <div className="size-2 rounded-full bg-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">FinanceChat</span>
          <span>· © 2026 · Feito no Brasil 🇧🇷</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Termos</a>
          <a href="#" className="hover:text-foreground">Privacidade</a>
          <a href="#" className="hover:text-foreground">Contato</a>
        </div>
      </div>
    </footer>
  );
}
