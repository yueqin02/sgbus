import type { ArrivingService, NextBus } from "@/lib/types";
import { LOAD_META, TYPE_LABEL } from "@/lib/load";
import { Countdown } from "./Countdown";
import { cn } from "@/lib/cn";
import { Accessibility, Bus } from "lucide-react";

function NextChip({ bus }: { bus: NextBus | null }) {
  if (!bus) {
    return (
      <div className="rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-600">
        —
      </div>
    );
  }
  const load = LOAD_META[bus.load || ""];
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5 text-xs", load.bg, load.color)}>
      <Countdown iso={bus.estimatedArrival} className="text-sm" />
    </div>
  );
}

export function ArrivalCard({ service }: { service: ArrivingService }) {
  const next = service.next;
  const load = LOAD_META[next?.load || ""];
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-4 transition-colors hover:bg-zinc-900/70">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-800/80 text-lg font-bold tracking-tight text-zinc-100">
            {service.serviceNo}
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {service.operator || "—"}
            </span>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
              <Bus className="h-3.5 w-3.5" />
              <span>{TYPE_LABEL[next?.type || ""] || "—"}</span>
              {next?.feature === "WAB" && (
                <>
                  <span className="text-zinc-700">·</span>
                  <Accessibility className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Wheelchair</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          {next ? (
            <Countdown iso={next.estimatedArrival} />
          ) : (
            <span className="text-2xl font-semibold text-zinc-700">—</span>
          )}
          <span className={cn("mt-1 text-[10px] uppercase tracking-wider whitespace-nowrap", load.color)}>
            {load.label}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">After</span>
        <NextChip bus={service.next2} />
        <NextChip bus={service.next3} />
      </div>
    </div>
  );
}
