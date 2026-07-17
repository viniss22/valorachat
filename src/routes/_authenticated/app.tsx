import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { TransactionFab } from "@/components/transaction-fab";
import { QuickCaptureButton } from "@/components/quick-capture/QuickCaptureButton";
import { QuickCapturePanel } from "@/components/quick-capture/QuickCapturePanel";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const [captureOpen, setCaptureOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="pb-24 lg:pb-8 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <QuickCaptureButton onClick={() => setCaptureOpen(true)} />
      <QuickCapturePanel open={captureOpen} onOpenChange={setCaptureOpen} />
      <TransactionFab />
      <MobileNav />
    </div>
  );
}