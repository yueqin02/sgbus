"use client";

import { Star } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/cn";

export function StarButton({ code, className }: { code: string; className?: string }) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(code);
  return (
    <button
      type="button"
      aria-label={fav ? "Remove favorite" : "Save favorite"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(code);
      }}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border transition-all",
        fav
          ? "border-amber-300/40 bg-amber-300/10 text-amber-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-200",
        className,
      )}
    >
      <Star
        className="h-4 w-4"
        fill={fav ? "currentColor" : "none"}
        strokeWidth={fav ? 0 : 2}
      />
    </button>
  );
}
