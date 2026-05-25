import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import stopsRaw from "../../../../public/stops.json";
import type { BusStop } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { StarButton } from "@/components/StarButton";
import { ArrivalsLive } from "./ArrivalsLive";

export const dynamic = "force-dynamic";

const STOPS = stopsRaw as BusStop[];

export default async function StopPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!/^\d{4,6}$/.test(code)) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Invalid stop code"
        description="Bus stop codes are 4–6 digits. Check the number on the stop pole and try again."
        action={
          <Link
            href="/"
            className="mt-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
          >
            Back to search
          </Link>
        }
      />
    );
  }

  const match = STOPS.find((s) => s.code === code);
  const stopName = match?.name ?? "Unknown stop";

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Bus stop
            </p>
            <p className="mt-1 font-mono text-2xl text-emerald-300">{code}</p>
            <p className="mt-1 truncate text-sm text-zinc-400">{stopName}</p>
          </div>
          <StarButton code={code} />
        </div>
      </header>

      <ArrivalsLive code={code} stopName={stopName} />
    </div>
  );
}
