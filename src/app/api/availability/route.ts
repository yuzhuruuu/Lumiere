import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { timeToMinutes } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const duration = Number(searchParams.get("duration") || "120");

  if (!date || !startTime || Number.isNaN(duration)) {
    return NextResponse.json({ occupiedTableIds: [] });
  }

  const reqStart = timeToMinutes(startTime);
  const reqEnd = reqStart + duration;

  // Gunakan service_role jika dikonfigurasi agar benturan lintas pelanggan terdeteksi,
  // atau fallback ke client session (database constraint no_double_booking tetap menjaga saat submit).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = serviceKey
    ? createSupabaseJs(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : await createClient();

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
