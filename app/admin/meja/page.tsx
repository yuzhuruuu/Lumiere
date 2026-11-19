"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translateDbError } from "@/lib/utils";
import type { DiningTable } from "@/types/database";
import { Plus, Edit3, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminTablesPage() {
  const supabase = createClient();

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [area, setArea] = useState("Indoor");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadTables = async () => {
    const { data } = await supabase
      .from("dining_tables")
      .select("*")
      .order("code", { ascending: true });
    setTables((data as DiningTable[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTables();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setCapacity(4);
    setArea("Indoor");
    setIsActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setFeedback(null);

    const payload = {
      code: code.trim().toUpperCase(),
      capacity: Number(capacity),
      area: area.trim() || null,
      is_active: isActive,
    };

    const { error } = editingId
      ? await supabase
          .from("dining_tables")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("dining_tables").insert(payload);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      resetForm();
      setFeedback({ type: "success", text: "Data meja berhasil disimpan." });
      await loadTables();
    }
    setSaving(false);
  };

  const handleToggleActive = async (t: DiningTable) => {
    const { error } = await supabase
      .from("dining_tables")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      await loadTables();
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Hapus meja ini? Meja yang sudah memiliki riwayat reservasi tidak bisa dihapus (nonaktifkan saja)."
      )
    ) {
      return;
    }
    const { error } = await supabase.from("dining_tables").delete().eq("id", id);
    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({ type: "success", text: "Meja berhasil dihapus." });
      await loadTables();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-lumiere-cream">
          Kelola Meja & Kapasitas
        </h1>
        <p className="text-sm text-lumiere-muted mt-1">
          Atur kode meja, kapasitas maksimal tamu (1–50), area ruangan, dan
          status aktif meja.
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

      {/* Form */}
      <div className="glass-card p-6">
        <h2 className="font-serif text-lg font-bold text-lumiere-cream mb-4">
          {editingId ? "Edit Meja" : "Tambah Meja Baru"}
        </h2>
        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
        >
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Kode Meja *
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Contoh: T14 / VIP04"
              className="input-dark uppercase"
            />
          </div>
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">
              Kapasitas (1–50) *
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs text-lumiere-muted mb-1">Area</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="input-dark"
            >
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-white/15 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-white/20 text-lumiere-gold"
            />
            <span>Meja Aktif</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              <Plus className="w-4 h-4" />
              {editingId ? "Update" : "Tambah"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card h-32 animate-pulse" />
            ))
          : tables.map((t) => (
              <div
                key={t.id}
                className={`glass-card p-5 flex flex-col justify-between space-y-4 ${
                  !t.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold text-lumiere-cream">
                      {t.code}
                    </div>
                    <div className="text-xs text-lumiere-muted">
                      Area {t.area || "Reguler"} · Kapasitas{" "}
                      <strong className="text-lumiere-gold">
                        {t.capacity} org
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(t)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      t.is_active
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {t.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                <div className="flex justify-end gap-1.5 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(t.id);
                      setCode(t.code);
                      setCapacity(t.capacity);
                      setArea(t.area || "Indoor");
                      setIsActive(t.is_active);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-lumiere-gold"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
