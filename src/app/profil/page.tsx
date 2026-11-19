"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { indonesianPhoneRegex } from "@/lib/validation";
import { translateDbError } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { User, Save, CheckCircle2, AlertCircle } from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";

export default function ProfilPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name);
        setPhone(p.phone || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setMessage(null);

    if (fullName.trim().length < 2) {
      setMessage({ type: "error", text: "Nama lengkap minimal 2 karakter." });
      return;
    }
    if (phone.trim() && !indonesianPhoneRegex.test(phone.trim())) {
      setMessage({
        type: "error",
        text: "Nomor telepon harus format Indonesia valid (contoh: 081234567890).",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      .eq("id", profile.id);

    if (error) {
      setMessage({ type: "error", text: translateDbError(error) });
    } else {
      setMessage({ type: "success", text: "Profil berhasil diperbarui." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="glass-card h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 relative">
      {/* Deep Moody Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#134E43]/20 blur-[130px] pointer-events-none -z-10" />

      <div className="glass-card p-7 sm:p-9 space-y-6 bg-[#071F1A]/95 border-[#C8A96A]/30 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-4 border-b border-[#E6F0E9]/10 pb-5">
          <div className="w-13 h-13 rounded-2xl bg-[#09251F] border border-[#C8A96A]/35 flex items-center justify-center p-2.5 shadow-md">
            <ItalianCrest className="w-8 h-8 text-[#C8A96A]" />
          </div>
          <div>
            <span className="text-[10px] font-serif uppercase tracking-[0.2em] text-[#C8A96A] font-bold block">
              ✦ Registro Clienti · Profil Tamu
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F7F6F1]">
              Profil Akun Saya
            </h1>
            <p className="text-xs text-[#A2B8AF] font-light">
              Perbarui data kontak yang digunakan saat verifikasi reservasi meja.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                : "bg-rose-500/15 border-rose-500/30 text-rose-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
              Email (Terdaftar)
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ""}
              className="input-dark opacity-60 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
              Peran Akun
            </label>
            <input
              type="text"
              disabled
              value={(profile?.role || "").toUpperCase()}
              className="input-dark opacity-60 cursor-not-allowed font-semibold text-lumiere-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="input-dark"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}
