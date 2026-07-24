import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  MessageCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Target,
  Sparkles,
  FileText,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
};

const items: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  // Central WhatsApp — OCULTA da navegação (canal dormente).
  // O backend continua intacto: webhook, sender, processor e tabelas.
  // Para reativar, basta descomentar a linha abaixo.
  // { to: "/app/whatsapp", label: "Central WhatsApp", icon: MessageCircle, badge: true },
  { to: "/app/receitas", label: "Receitas", icon: ArrowDownToLine },
  { to: "/app/despesas", label: "Despesas", icon: ArrowUpFromLine },
  { to: "/app/investimentos", label: "Investimentos", icon: TrendingUp },
  { to: "/app/metas", label: "Metas", icon: Target },
  { to: "/app/assistente", label: "Val · Assistente", icon: Sparkles },
  // Relatórios — OCULTO: a página ainda exibe dados de exemplo (mock-data).
  // Exibir números fictícios a um usuário pagante é vício de informação (CDC).
  // Reative quando a versão com dados reais estiver pronta.
  // { to: "/app/relatorios", label: "Relatórios", icon: FileText },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("Você");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const full = (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Você";
      setName(full);
    });
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary">
            <div className="size-3 rounded-full bg-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Valora</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {items.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4 shrink-0" />
                {item.label}
              </span>
              {item.badge && (
                <span className="size-2 animate-pulse rounded-full bg-success" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-primary">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">Conta protegida</span>
          </div>
          <Link
            to="/app/configuracoes"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Configurações"
          >
            <Settings className="size-4" />
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Sair
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openMore, setOpenMore] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    setOpenMore(false);
    navigate({ to: "/auth", replace: true });
  }

  const primary = items.slice(0, 4);
  const rest = items.slice(4);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-sidebar/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg shadow-[0_-4px_20px_-8px_rgb(15_23_42_/_0.15)] lg:hidden">
      {primary.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />
            )}
            <span className={`grid place-items-center rounded-lg p-1.5 transition-colors ${active ? "bg-primary/10" : ""}`}>
              <Icon className="size-5" />
            </span>
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
      <Sheet open={openMore} onOpenChange={setOpenMore}>
        <SheetTrigger asChild>
          <button
            className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
              rest.some((i) => pathname.startsWith(i.to)) ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Mais opções"
          >
            <span className="grid place-items-center rounded-lg p-1.5">
              <Menu className="size-5" />
            </span>
            <span>Mais</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <ul className="mt-4 space-y-1">
            {rest.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpenMore(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
