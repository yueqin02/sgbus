import { NextResponse } from "next/server";
import { fetchArrivals } from "@/lib/lta";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!/^\d{4,6}$/.test(code)) {
    return NextResponse.json(
      { error: "Invalid bus stop code" },
      { status: 400 },
    );
  }
  const data = await fetchArrivals(code);
  return NextResponse.json(data, {
    headers: { "cache-control": "no-store" },
  });
}
