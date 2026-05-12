"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; text: string };

const ToastCtx = createContext<{
  show: (text: string, kind?: ToastKind) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("Wrap pages in <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-rep items-center gap-2 rounded-lg border px-4 py-3 shadow-soft",
              t.kind === "success" && "border-green-200 bg-green-50 text-green-900",
              t.kind === "error" && "border-red-200 bg-red-50 text-red-900",
            )}
          >
            {t.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1 text-sm">{t.text}</span>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="text-current/60 hover:text-current"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
