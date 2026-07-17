import { MessageSquarePlus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function QuickCaptureButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Registro rápido por chat"
      className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-5 z-40 grid size-14 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-elevated)] ring-4 ring-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 lg:bottom-24 lg:right-8"
      style={{ background: "var(--gradient-primary)" }}
    >
      <MessageSquarePlus className="size-6" />
    </button>
  );
}