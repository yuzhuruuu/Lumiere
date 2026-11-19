import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/require-role";
import { timeToMinutes } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireRole(supabase, ["pelanggan", "staf", "admin"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const duration = Number(searchParams.get("duration") || "120");

  if (!date || !startTime || Number.isNaN(duration)) {
    return NextResponse.json({ occupiedTableIds: [] });
  }

  const reqStart = timeToMinutes(startTime);
  const reqEnd = reqStart + duration;

  // Agregat benturan lintas pelanggan dibaca lewat admin client yang sudah
  // disetujui. Hanya table_id/start_time/duration_minutes yang diambil.
  const client = getSupabaseAdmin();

  const { data, error } = await client
    .from("reservations")
    .select("table_id, start_time, duration_minutes, status")
    .eq("reservation_date", date)
    .in("status", ["menunggu_validasi", "dikonfirmasi", "check_in"]);

  if (error || !data) {
    return NextResponse.json({ occupiedTableIds: [] });
  }

  const occupied = new Set<number>();
  for (const row of data) {
    const rStart = timeToMinutes(row.start_time);
    const rEnd = rStart + Number(row.duration_minutes);
    // Overlap check: [reqStart, reqEnd) && [rStart, rEnd)
    if (reqStart < rEnd && reqEnd > rStart) {
      occupied.add(row.table_id);
    }
  }

  return NextResponse.json({ occupiedTableIds: Array.from(occupied) });
}
