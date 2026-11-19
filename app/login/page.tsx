"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, AlertCircle, KeyRound, Sparkles } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import ItalianCrest from "@/components/ItalianCrest";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "account_disabled") {
        setError("Akun Anda sedang dinonaktifkan. Hubungi Concierge Administrator.");
      } else if (errorParam === "oauth_failed") {
        setError("Gagal masuk dengan akun Google. Silakan periksa konfigurasi provider atau coba lagi.");
      } else {
        setError(decodeURIComponent(errorParam));
      }
    }
  }, [errorParam]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) {
      callbackUrl.searchParams.set("next", redirectTo);
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (oauthError) {
      setError(oauthError.message || "Gagal menghubungkan ke Google.");
      setLoadingGoogle(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError(
        signInError?.message === "Invalid login credentials"
          ? "Alamat email atau kata sandi tidak valid."
          : signInError?.message || "Gagal masuk ke akun."
      );
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      setError("Akun Anda sedang dinonaktifkan. Hubungi Concierge Administrator.");
      setLoading(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else if (profile?.role === "admin") {
      router.push("/admin");
    } else if (profile?.role === "staf") {
      router.push("/staf");
    } else {
      router.push("/riwayat");
    }
    router.refresh();
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("LumiereDemo#2026");
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 relative">
      {/* Deep Moody Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#134E43]/20 blur-[130px] pointer-events-none -z-10" />

      <div className="glass-card p-7 sm:p-9 space-y-6 bg-[#071F1A]/95 border-[#C8A96A]/30 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <ItalianCrest className="w-12 h-12 text-[#C8A96A]" />
          </div>
          <span className="text-[10px] font-serif font-bold uppercase tracking-[0.25em] text-[#C8A96A] block">
            ✦ Member Access ✦
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#F7F6F1]">
            Sign In to Lumière
          </h1>
          <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
            Exclusive access for table reservations, digital passes, and curated fine dining.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || loadingGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-[#C8A96A]/30 bg-[#051511] hover:bg-[#09251F] text-[#F7F6F1] text-xs font-serif tracking-wide transition shadow-md hover:border-[#C8A96A]/60 active:scale-[0.99] disabled:opacity-50"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>{loadingGoogle ? "Menghubungkan ke Google..." : "Masuk Cepat dengan Google"}</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#E6F0E9]/10 w-full" />
          <span className="bg-[#071F1A] px-3 text-[10px] uppercase font-serif tracking-[0.2em] text-[#A2B8AF] shrink-0">
            atau gunakan email
          </span>
          <div className="border-t border-[#E6F0E9]/10 w-full" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-serif text-[#C8A96A] mb-1.5">
              Alamat Email (Indirizzo Email)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-serif text-[#C8A96A] mb-1.5">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-dark"
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="btn-primary w-full py-4 font-serif text-sm tracking-wide"
          >
            <LogIn className="w-4 h-4 text-[#0F3D34]" />
            <span>{loading ? "Memverifikasi Kredensial..." : "Masuk ke Akun"}</span>
          </button>
        </form>

        {/* Quick Demo Accounts from seed.sql */}
        <div className="pt-4 border-t border-[#E6F0E9]/10 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-serif text-[#C8A96A]">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Akun Demo Otomatis (Seed Database):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount("pelanggan01@lumiere.test")}
              className="px-2.5 py-2 rounded-xl bg-[#051511] hover:bg-[#09251F] border border-[#C8A96A]/20 text-xs font-serif text-[#F7F6F1] transition"
            >
              Pelanggan
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount("staf1@lumiere.test")}
              className="px-2.5 py-2 rounded-xl bg-[#051511] hover:bg-[#09251F] border border-[#C8A96A]/20 text-xs font-serif text-[#F7F6F1] transition"
            >
              Staf
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount("admin@lumiere.test")}
              className="px-2.5 py-2 rounded-xl bg-[#051511] hover:bg-[#09251F] border border-[#C8A96A]/20 text-xs font-serif text-[#F7F6F1] transition"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#A2B8AF] font-light">
          Belum memiliki akun tamu?{" "}
          <Link
            href="/register"
            className="text-[#C8A96A] hover:underline font-serif font-semibold ml-1"
          >
            Registrasi Akun Baru
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[#A2B8AF]">Memuat otentikasi...</div>}>
      <LoginForm />
    </Suspense>
  );
}
