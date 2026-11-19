"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatIDR,
  getStoragePublicUrl,
  translateDbError,
} from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/types/database";
import {
  Plus,
  Trash2,
  Edit3,
  Upload,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
} from "lucide-react";

export default function AdminMenuPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState(0);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  // Menu Item Form State
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemCatId, setItemCatId] = useState<number | "">("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemPhotoFile, setItemPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*, menu_categories(id, name)")
        .order("id", { ascending: true }),
    ]);

    const cats = (catRes.data as MenuCategory[]) || [];
    setCategories(cats);
    setItems((itemRes.data as MenuItem[]) || []);
    if (cats.length > 0 && itemCatId === "") {
      setItemCatId(cats[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category CRUD (FR-26)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    setFeedback(null);

    const payload = { name: catName.trim(), sort_order: Number(catSort) };
    const { error } = editingCatId
      ? await supabase
          .from("menu_categories")
          .update(payload)
          .eq("id", editingCatId)
      : await supabase.from("menu_categories").insert(payload);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setCatName("");
      setCatSort(0);
      setEditingCatId(null);
      setFeedback({
        type: "success",
        text: "Kategori menu berhasil disimpan.",
      });
      await loadData();
    }
    setSaving(false);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Hapus kategori ini? Kategori yang masih memiliki menu tidak dapat dihapus.")) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({ type: "success", text: "Kategori berhasil dihapus." });
      await loadData();
    }
  };

  // Menu Item CRUD + Storage Upload (FR-25)
  const resetItemForm = () => {
    setEditingItemId(null);
    setItemName("");
    setItemDesc("");
    setItemPrice("");
    setItemAvailable(true);
    setItemPhotoFile(null);
    if (categories.length > 0) setItemCatId(categories[0].id);
  };

  const handleEditItem = (m: MenuItem) => {
    setEditingItemId(m.id);
    setItemCatId(m.category_id);
    setItemName(m.name);
    setItemDesc(m.description || "");
    setItemPrice(String(m.price));
    setItemAvailable(m.is_available);
    setItemPhotoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCatId || !itemName.trim()) return;
    setSaving(true);
    setFeedback(null);

    let uploadedPhotoPath: string | undefined = undefined;

    if (itemPhotoFile) {
      const ext = itemPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `menu/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("restaurant-assets")
        .upload(filePath, itemPhotoFile, { upsert: true });

      if (uploadErr) {
        setFeedback({
          type: "error",
          text: `Gagal mengunggah foto ke Storage: ${uploadErr.message}`,
        });
        setSaving(false);
        return;
      }
      uploadedPhotoPath = filePath;
    }

    const payload: Record<string, unknown> = {
      category_id: Number(itemCatId),
      name: itemName.trim(),
      description: itemDesc.trim() || null,
      price: Number(itemPrice),
      is_available: itemAvailable,
    };
    if (uploadedPhotoPath !== undefined) {
      payload.photo_path = uploadedPhotoPath;
    }

    const { error } = editingItemId
      ? await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItemId)
      : await supabase.from("menu_items").insert(payload);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      resetItemForm();
      setFeedback({
        type: "success",
        text: editingItemId
          ? "Menu berhasil diperbarui."
          : "Menu baru berhasil ditambahkan.",
      });
      await loadData();
    }
    setSaving(false);
  };

  const handleToggleAvailability = async (m: MenuItem) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !m.is_available })
      .eq("id", m.id);
    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      await loadData();
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (
      !window.confirm(
        "Hapus menu ini? Menu yang pernah dipesan dalam riwayat reservasi tidak bisa dihapus (gunakan toggle Tidak Tersedia sebagai gantinya)."
      )
    ) {
      return;
    }
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({ type: "success", text: "Menu berhasil dihapus." });
      await loadData();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-lumiere-cream">
          Kelola Menu & Kategori
        </h1>
        <p className="text-sm text-lumiere-muted mt-1">
          Tambah atau ubah kategori, daftar hidangan, harga, ketersediaan, serta
          foto menu di Supabase Storage.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
              : "bg-rose-500/15 border-rose-500/30 text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TOP FORMS: CATEGORY & MENU ITEM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Manager */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-lumiere-cream">
            {editingCatId ? "Edit Kategori" : "Tambah Kategori Menu"}
          </h2>
          <form onSubmit={handleSaveCategory} className="space-y-3">
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Nama Kategori
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Contoh: Main Course"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Urutan Tampil (Sort Order)
              </label>
              <input
                type="number"
                value={catSort}
                onChange={(e) => setCatSort(Number(e.target.value))}
                className="input-dark"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                <Plus className="w-4 h-4" />
                {editingCatId ? "Update" : "Tambah"}
              </button>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName("");
                    setCatSort(0);
                  }}
                  className="btn-secondary"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="pt-3 border-t border-white/10 space-y-2 max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-lumiere-cream">
                    {c.name}
                  </span>
                  <span className="text-lumiere-muted ml-2">
                    (#{c.sort_order})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(c.id);
                      setCatName(c.name);
                      setCatSort(c.sort_order);
                    }}
                    className="p-1.5 rounded hover:bg-white/10 text-lumiere-gold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Item Form */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-lumiere-cream">
            {editingItemId ? "Edit Item Menu" : "Tambah Item Menu Baru"}
          </h2>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-lumiere-muted mb-1">
                  Kategori *
                </label>
                <select
                  required
                  value={itemCatId}
                  onChange={(e) => setItemCatId(Number(e.target.value))}
                  className="input-dark"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-lumiere-muted mb-1">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Wagyu Beef Steak"
                  className="input-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-lumiere-muted mb-1">
                Deskripsi Menu
              </label>
              <textarea
                rows={2}
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Deskripsi singkat hidangan..."
                className="input-dark"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-lumiere-muted mb-1">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="150000"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs text-lumiere-muted mb-1">
                  Foto Menu (Maks 2MB, JPG/PNG/WebP)
                </label>
                <label className="input-dark flex items-center gap-2 cursor-pointer text-xs truncate">
                  <Upload className="w-4 h-4 text-lumiere-gold shrink-0" />
                  <span className="truncate">
                    {itemPhotoFile ? itemPhotoFile.name : "Pilih file gambar..."}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      setItemPhotoFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-obsidian-900 border border-white/15 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                  className="rounded border-white/20 text-lumiere-gold"
                />
                <span>Tersedia Dipesan</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving
                  ? "Menyimpan..."
                  : editingItemId
                  ? "Simpan Perubahan Menu"
                  : "Tambah Menu"}
              </button>
              {editingItemId && (
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="btn-secondary"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* MENU LIST TABLE */}
      <div className="glass-card p-5 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-white/10 text-lumiere-muted text-xs uppercase">
              <th className="py-3 px-3">Menu</th>
              <th className="py-3 px-3">Kategori</th>
              <th className="py-3 px-3">Harga</th>
              <th className="py-3 px-3">Ketersediaan</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-lumiere-muted">
                  Memuat daftar menu...
                </td>
              </tr>
            ) : (
              items.map((m) => {
                const imgUrl = getStoragePublicUrl(m.photo_path);
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-obsidian-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4 text-lumiere-muted/40" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-lumiere-cream">
                            {m.name}
                          </div>
                          <div className="text-xs text-lumiere-muted line-clamp-1">
                            {m.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-lumiere-muted">
                      {m.menu_categories?.name}
                    </td>
                    <td className="py-3 px-3 font-bold text-lumiere-gold">
                      {formatIDR(m.price)}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(m)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                          m.is_available
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {m.is_available ? "Tersedia" : "Tidak Tersedia"}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleEditItem(m)}
                        className="p-2 rounded-lg hover:bg-white/10 text-lumiere-gold inline-flex"
                        title="Edit Menu"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(m.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/15 text-rose-400 inline-flex"
                        title="Hapus Menu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
