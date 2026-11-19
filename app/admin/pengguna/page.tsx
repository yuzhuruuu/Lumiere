"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { translateDbError } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";
import { Search, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminUsersPage() {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("role", { ascending: false })
      .order("full_name", { ascending: true });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setFeedback(null);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: `Peran pengguna berhasil diubah menjadi "${newRole.toUpperCase()}".`,
      });
      await loadProfiles();
    }
  };

  const handleToggleActive = async (p: Profile) => {
    setFeedback(null);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: `Status akun ${p.full_name} berhasil diperbarui.`,
      });
      await loadProfiles();
    }
  };

  const filtered = profiles.filter((p) => {
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.full_name.toLowerCase().includes(q) &&
        !p.email.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-lumiere-cream">
          Kelola Akun & Peran Pengguna
        </h1>
        <p className="text-sm text-lumiere-muted mt-1">
          Tetapkan peran Pelanggan, Staf, atau Administrator serta kelola status
          aktif akun.
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

      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-lumiere-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email pengguna..."
              className="input-dark pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-dark sm:w-48"
          >
            <option value="all">Semua Peran</option>
            <option value="pelanggan">Pelanggan</option>
            <option value="staf">Staf</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-lumiere-muted text-xs uppercase">
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3">Email & Telepon</th>
                <th className="py-3 px-3">Peran (Role)</th>
                <th className="py-3 px-3">Status Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-lumiere-muted">
                    Memuat daftar akun...
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-lumiere-cream">
                      {p.full_name}
                    </td>
                    <td className="py-3 px-3 text-xs text-lumiere-muted">
                      <div>{p.email}</div>
                      <div>{p.phone || "-"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={p.role}
                        onChange={(e) =>
                          handleRoleChange(p.id, e.target.value as UserRole)
                        }
                        className="input-dark py-1.5 text-xs w-36"
                      >
                        <option value="pelanggan">Pelanggan</option>
                        <option value="staf">Staf</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          p.is_active
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
