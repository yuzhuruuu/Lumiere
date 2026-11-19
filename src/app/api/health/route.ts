import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurant_profile")
      .select("id, name, min_order_amount, dp_percentage, tax_percentage")
      .eq("id", 1)
      .single();

    if (error) {
      return NextResponse.json(
        {
          status: "warning",
          message:
            "Terhubung ke Supabase, namun tabel/seed belum dijalankan atau gagal dibaca.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      restaurant: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
