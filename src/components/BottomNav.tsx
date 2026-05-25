"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MapPin, Map, Star } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Search", icon: Search, match: (p: string) => p === "/" || p.startsWith("/stop") },
  { href: "/nearby", label: "Nearby", icon: MapPin, match: (p: string) => p.startsWith("/nearby") },
  { href: "/map", label: "Map", icon: Map, match: (p: string) => p.startsWith("/map") },
  { href: "/favorites", label: "Saved", icon: Star, match: (p: string) => p.startsWith("/favorites") },
];

export function BottomNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900/80 bg-zinc-950/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-emerald-300"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active ? "scale-110" : "scale-100",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
