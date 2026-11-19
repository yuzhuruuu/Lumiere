import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Tentukan origin aplikasi (mendukung reverse proxy/forwarded headers)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  if (error || errorDescription) {
    const errorMsg = errorDescription || error || "Autentikasi gagal";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, origin)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .single();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL("/login?error=account_disabled", origin)
          );
        }

        // Jika ada target redirect khusus (misal /reservasi)
        if (next && next.startsWith("/")) {
          return NextResponse.redirect(new URL(next, origin));
        }

        // Redirect sesuai role pengguna
        if (profile?.role === "admin") {
          return NextResponse.redirect(new URL("/admin", origin));
        } else if (profile?.role === "staf") {
          return NextResponse.redirect(new URL("/staf", origin));
        } else {
          return NextResponse.redirect(new URL("/riwayat", origin));
        }
      }

      return NextResponse.redirect(new URL(next || "/", origin));
    }
  }

  // Jika gagal menukar kode atau tidak ada code
  return NextResponse.redirect(
    new URL("/login?error=oauth_failed", origin)
  );
}
