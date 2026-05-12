"use client";
import { Header } from "./Header";
import { ToastProvider } from "./Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-brand-page text-brand-ink">
        <Header />
        <main className="mx-auto w-full max-w-rep px-4 py-5">{children}</main>
      </div>
    </ToastProvider>
  );
}
