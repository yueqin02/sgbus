import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BusStop } from "@/lib/types";
import { StarButton } from "./StarButton";
import { formatDistance } from "@/lib/distance";

type Props = {
  stop: BusStop;
  distanceKm?: number;
};

export function StopCard({ stop, distanceKm }: Props) {
  return (
    <Link
      href={`/stop/${stop.code}`}
      className="flex items-center gap-3 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-3 transition-colors hover:bg-zinc-900/70"
    >
      <StarButton code={stop.code} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-zinc-200">{stop.code}</span>
          {distanceKm !== undefined && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
              {formatDistance(distanceKm)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-zinc-400">{stop.name}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-600" />
    </Link>
  );
}
