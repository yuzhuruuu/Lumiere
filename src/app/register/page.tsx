"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validation";
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import ItalianCrest from "@/components/ItalianCrest";

function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGoogleSignUp = async () => {
    setLoadingGoogle(true);
    setError(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/reservasi");

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({
      fullName,
      email,
      phone,
      password,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Data registrasi tidak valid.");
      return;
    }

    setLoading(true);

    // Role otomatis diset 'pelanggan' oleh trigger database handle_new_user()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/reservasi");
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
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
            ✦ New Guest · Registration ✦
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#F7F6F1]">
            Create Your Guest Account
          </h1>
          <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
            Register to enjoy interactive 2D table selection, culinary pre-orders, and digital VIP passes.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-[#09251F] border border-[#C8A96A]/35 text-[#F7F6F1] text-sm space-y-3 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
            <p className="font-serif font-bold text-lg text-[#C8A96A]">Registrasi Berhasil!</p>
            <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
              Akun tamu Anda telah terdaftar dalam sistem reservasi Lumière. Silakan masuk untuk memulai pemilihan meja favorit.
            </p>
            <div className="pt-2">
              <Link href="/login" className="btn-primary w-full py-3.5 font-serif text-sm">
                Masuk ke Akun Anda
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Daftar Cepat dengan Google */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading || loadingGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-[#C8A96A]/30 bg-[#051511] hover:bg-[#09251F] text-[#F7F6F1] text-xs font-serif tracking-wide transition shadow-md hover:border-[#C8A96A]/60 active:scale-[0.99] disabled:opacity-50"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>{loadingGoogle ? "Menghubungkan ke Google..." : "Daftar Cepat dengan Google"}</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#E6F0E9]/10 w-full" />
              <span className="bg-[#071F1A] px-3 text-[10px] uppercase font-serif tracking-[0.2em] text-[#A2B8AF] shrink-0">
                atau isi formulir tamu
              </span>
              <div className="border-t border-[#E6F0E9]/10 w-full" />
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-serif text-[#C8A96A] mb-1.5">
                  Nama Lengkap (Nome e Cognome) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Marco Rossi"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-serif text-[#C8A96A] mb-1.5">
                  Alamat Email (Indirizzo Email) *
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
                  Nomor WhatsApp / Telepon *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-serif text-[#C8A96A] mb-1.5">
                  Kata Sandi (Password, min. 8 karakter) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
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
                <UserPlus className="w-4 h-4 text-[#0F3D34]" />
                <span>{loading ? "Mendaftarkan Tamu..." : "Konfirmasi Registrasi Tamu"}</span>
              </button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-[#A2B8AF] font-light">
          Sudah memiliki akun tamu?{" "}
          <Link
            href="/login"
            className="text-[#C8A96A] hover:underline font-serif font-semibold ml-1"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[#A2B8AF]">Memuat...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
