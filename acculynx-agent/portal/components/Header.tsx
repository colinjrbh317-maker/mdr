"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, Upload, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/queue", label: "Queue", icon: Inbox },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/upload", label: "Transcript", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b-4 border-brand-red bg-brand-dark text-white">
      <div className="mx-auto flex max-w-rep items-center justify-between px-4 py-3">
        <Link href="/queue" className="font-display text-lg font-extrabold uppercase tracking-wide">
          MDR <span className="text-brand-amber">Portal</span>
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 min-w-[44px] items-center gap-1 rounded-md px-2 text-sm transition-colors",
                  active ? "bg-white/15 text-white" : "text-white/70 hover:text-white",
                )}
              >
                <Icon size={18} aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
