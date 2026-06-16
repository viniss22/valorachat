import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="pb-24 lg:pb-8 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}