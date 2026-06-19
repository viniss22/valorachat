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
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
};

const items: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/whatsapp", label: "Central WhatsApp", icon: MessageCircle, badge: true },
  { to: "/app/receitas", label: "Receitas", icon: ArrowDownToLine },
  { to: "/app/despesas", label: "Despesas", icon: ArrowUpFromLine },
  { to: "/app/investimentos", label: "Investimentos", icon: TrendingUp },
  { to: "/app/metas", label: "Metas", icon: Target },
  { to: "/app/assistente", label: "Assistente IA", icon: Sparkles },
  { to: "/app/relatorios", label: "Relatórios", icon: FileText },
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
          <span className="text-lg font-semibold tracking-tight">FinanceChat</span>
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
          <button className="text-muted-foreground hover:text-foreground" aria-label="Configurações">
            <Settings className="size-4" />
          </button>
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-sidebar px-2 py-2 lg:hidden">
      {items.slice(0, 5).map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}