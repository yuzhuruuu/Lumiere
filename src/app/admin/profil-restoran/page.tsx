"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translateDbError } from "@/lib/utils";
import type { RestaurantProfile } from "@/types/database";
import { Save, Upload, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminRestaurantProfilePage() {
  const supabase = createClient();

  const [form, setForm] = useState<Partial<RestaurantProfile>>({});
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("restaurant_profile")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) setForm(data as RestaurantProfile);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    let coverPath = form.cover_photo_path || null;

    if (coverFile) {
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `restaurant/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("restaurant-assets")
        .upload(filePath, coverFile, { upsert: true });

      if (upErr) {
        setFeedback({
          type: "error",
          text: `Gagal mengunggah sampul: ${upErr.message}`,
        });
        setSaving(false);
        return;
      }
      coverPath = filePath;
    }

    const { error } = await supabase
      .from("restaurant_profile")
      .update({
        name: form.name,
        tagline: form.tagline || null,
        description: form.description || null,
        address: form.address,
        latitude: form.latitude !== null && form.latitude !== undefined ? Number(form.latitude) : null,
        longitude: form.longitude !== null && form.longitude !== undefined ? Number(form.longitude) : null,
        phone: form.phone || null,
        email: form.email || null,
        cover_photo_path: coverPath,
        min_order_amount: Number(form.min_order_amount ?? 300000),
        dp_percentage: Number(form.dp_percentage ?? 50),
        tax_percentage: Number(form.tax_percentage ?? 10),
        pending_timeout_minutes: Number(form.pending_timeout_minutes ?? 30),
      })
      .eq("id", 1);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setCoverFile(null);
      setFeedback({
        type: "success",
        text: "Profil restoran dan pengaturan bisnis berhasil diperbarui!",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="glass-card h-96 animate-pulse" />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-lumiere-cream">
          Profil Restoran & Aturan Bisnis
        </h1>
        <p className="text-sm text-lumiere-muted mt-1">
          Kelola identitas publik restoran serta parameter minimal order,
          persentase DP, pajak, dan batas waktu pending.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
              : "bg-rose-500/15 border-rose-500/30 text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="glass-card p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Nama Restoran *
            </label>
            <input
              type="text"
              required
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={form.tagline || ""}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-lumiere-muted mb-1">
            Deskripsi Restoran
          </label>
          <textarea
            rows={3}
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-dark"
          />
        </div>

        <div>
          <label className="block text-xs text-lumiere-muted mb-1">
            Alamat Lengkap *
          </label>
          <input
            type="text"
            required
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input-dark"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Telepon Restoran
            </label>
            <input
              type="text"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Email Restoran
            </label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-lumiere-muted mb-1">
            Foto Sampul Hero (Supabase Storage: restaurant-assets)
          </label>
          <label className="input-dark flex items-center gap-2 cursor-pointer text-xs">
            <Upload className="w-4 h-4 text-lumiere-gold" />
            <span>
              {coverFile
                ? coverFile.name
                : form.cover_photo_path || "Pilih foto sampul baru..."}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        {/* Business Rules Settings */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-lumiere-gold">
            Konfigurasi Aturan Bisnis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Min. Order (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={form.min_order_amount ?? 300000}
                onChange={(e) =>
                  setForm({
                    ...form,
                    min_order_amount: Number(e.target.value),
                  })
                }
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Persentase DP (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.dp_percentage ?? 50}
                onChange={(e) =>
                  setForm({ ...form, dp_percentage: Number(e.target.value) })
                }
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Pajak (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.tax_percentage ?? 10}
                onChange={(e) =>
                  setForm({ ...form, tax_percentage: Number(e.target.value) })
                }
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Timeout Pending (mnt, 0=mati)
              </label>
              <input
                type="number"
                min={0}
                max={1440}
                value={form.pending_timeout_minutes ?? 30}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pending_timeout_minutes: Number(e.target.value),
                  })
                }
                className="input-dark"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan Pengaturan Restoran"}
        </button>
      </form>
    </div>
  );
}
