"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAY_NAMES_ID, formatTimeShort, translateDbError } from "@/lib/utils";
import type { OperatingHour } from "@/types/database";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminOperatingHoursPage() {
  const supabase = createClient();

  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadHours() {
      const { data } = await supabase
        .from("operating_hours")
        .select("*")
        .order("day_of_week", { ascending: true });
      setHours((data as OperatingHour[]) || []);
      setLoading(false);
    }
    loadHours();
  }, []);

  const updateRow = (
    dayOfWeek: number,
    patch: Partial<OperatingHour>
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h))
    );
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    for (const h of hours) {
      const { error } = await supabase
        .from("operating_hours")
        .update({
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        })
        .eq("day_of_week", h.day_of_week);

      if (error) {
        setFeedback({ type: "error", text: translateDbError(error) });
        setSaving(false);
        return;
      }
    }

    setFeedback({
      type: "success",
      text: "Jam operasional berhasil diperbarui dan langsung berlaku pada validasi reservasi.",
    });
    setSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-lumiere-cream">
          Kelola Jam Operasional
        </h1>
        <p className="text-sm text-lumiere-muted mt-1">
          Atur jam buka dan tutup restoran per hari. Gunakan{" "}
          <code className="text-lumiere-gold">24:00</code> untuk tutup tengah
          malam.
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

      <form onSubmit={handleSaveAll} className="glass-card p-6 space-y-4">
        {loading ? (
          <div className="h-64 animate-pulse" />
        ) : (
          <div className="divide-y divide-white/10">
            {hours.map((h) => (
              <div
                key={h.day_of_week}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="font-semibold text-sm text-lumiere-cream w-32">
                  {DAY_NAMES_ID[h.day_of_week]}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-lumiere-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.is_closed}
                      onChange={(e) =>
                        updateRow(h.day_of_week, { is_closed: e.target.checked })
                      }
                      className="rounded border-white/20 text-rose-500"
                    />
                    <span>Libur / Tutup</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={h.is_closed}
                      value={formatTimeShort(h.open_time)}
                      onChange={(e) =>
                        updateRow(h.day_of_week, { open_time: e.target.value })
                      }
                      placeholder="10:00"
                      className="input-dark w-24 text-center py-1.5 text-xs disabled:opacity-40"
                    />
                    <span className="text-lumiere-muted text-xs">s/d</span>
                    <input
                      type="text"
                      disabled={h.is_closed}
                      value={formatTimeShort(h.close_time)}
                      onChange={(e) =>
                        updateRow(h.day_of_week, { close_time: e.target.value })
                      }
                      placeholder="24:00"
                      className="input-dark w-24 text-center py-1.5 text-xs disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Jam Operasional"}
          </button>
        </div>
      </form>
    </div>
  );
}
