import Link from "next/link";
import { Map, MapPin, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";

type QuickAction = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/nearby",
    icon: MapPin,
    label: "Nearby",
    description: "Stops within walking distance",
  },
  {
    href: "/map",
    icon: Map,
    label: "Map",
    description: "See live buses on a map",
  },
  {
    href: "/favorites",
    icon: Star,
    label: "Favorites",
    description: "Your saved stops",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Where to?
        </h1>
        <p className="text-sm text-zinc-400">
          Enter a stop code, street name, or pick from your recent stops.
        </p>
      </div>

      <SearchInput />

      <div className="flex flex-col gap-2 pt-2">
        {QUICK_ACTIONS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 transition-colors hover:bg-zinc-900/60"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-100">{label}</p>
              <p className="truncate text-sm text-zinc-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
