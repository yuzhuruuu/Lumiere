"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reservationStep1Schema } from "@/lib/validation";
import {
  DAY_NAMES_ID,
  formatDateID,
  formatIDR,
  formatTimeShort,
  getEndTime,
  getTodayJakarta,
  timeToMinutes,
  translateDbError,
  getMenuItemImageUrl,
} from "@/lib/utils";
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  OperatingHour,
  Profile,
  RestaurantProfile,
} from "@/types/database";
import {
  Calendar,
  Clock,
  Users,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Sparkles,
  Info,
} from "lucide-react";
import RestaurantFloorPlan from "@/components/RestaurantFloorPlan";

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240];

export default function ReservasiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master data
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);

  // Step 1 Form State
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [reservationDate, setReservationDate] = useState(getTodayJakarta());
  const [startTime, setStartTime] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [guestCount, setGuestCount] = useState(2);

  // Step 2 Table State
  const [occupiedTableIds, setOccupiedTableIds] = useState<number[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Step 3 Cart State: menu_item_id -> quantity
  const [cart, setCart] = useState<Record<number, number>>({});
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  // Step 4 Notes
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function initData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/reservasi");
        return;
      }

      const [profRes, restRes, hoursRes, tablesRes, catRes, menuRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("restaurant_profile").select("*").eq("id", 1).single(),
          supabase
            .from("operating_hours")
            .select("*")
            .order("day_of_week", { ascending: true }),
          supabase
            .from("dining_tables")
            .select("*")
            .eq("is_active", true)
            .order("code", { ascending: true }),
          supabase
            .from("menu_categories")
            .select("*")
            .order("sort_order", { ascending: true }),
          supabase
            .from("menu_items")
            .select("*, menu_categories(id, name, sort_order)")
            .order("id", { ascending: true }),
        ]);

      if (profRes.data) {
        const p = profRes.data as Profile;
        setContactName(p.full_name || "");
        setContactPhone(p.phone || "");
        setContactEmail(p.email || user.email || "");
      }
      if (restRes.data) setRestaurant(restRes.data as RestaurantProfile);
      if (hoursRes.data) setHours(hoursRes.data as OperatingHour[]);
      if (tablesRes.data) setTables(tablesRes.data as DiningTable[]);
      if (catRes.data) setCategories(catRes.data as MenuCategory[]);
      if (menuRes.data) setMenus(menuRes.data as MenuItem[]);

      setLoadingInit(false);
    }

    initData();
  }, []);

  // Operating hours untuk tanggal yang dipilih
  const selectedDayOperatingHour = useMemo(() => {
    if (!reservationDate || hours.length === 0) return null;
    const d = new Date(`${reservationDate}T00:00:00`);
    const dow = d.getDay();
    return hours.find((h) => h.day_of_week === dow) || null;
  }, [reservationDate, hours]);

  // Validasi Step 1 -> Step 2
  const handleNextToStep2 = async () => {
    setError(null);
    const parsed = reservationStep1Schema.safeParse({
      contactName,
      contactPhone,
      contactEmail,
      reservationDate,
      startTime,
      durationMinutes,
      guestCount,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Periksa kembali data Anda.");
      return;
    }

    if (reservationDate < getTodayJakarta()) {
      setError("Tanggal reservasi tidak boleh di masa lalu.");
      return;
    }

    if (selectedDayOperatingHour) {
      if (selectedDayOperatingHour.is_closed) {
        setError("Restoran tutup pada hari yang dipilih. Silakan pilih tanggal lain.");
        return;
      }
      const openMin = timeToMinutes(selectedDayOperatingHour.open_time);
      const closeMin = timeToMinutes(selectedDayOperatingHour.close_time);
      const startMin = timeToMinutes(startTime);
      const endMin = startMin + durationMinutes;

      if (startMin < openMin || endMin > closeMin) {
        setError(
          `Waktu reservasi (${startTime} – ${getEndTime(
            startTime,
            durationMinutes
          )}) di luar jam operasional (${formatTimeShort(
            selectedDayOperatingHour.open_time
          )} – ${formatTimeShort(selectedDayOperatingHour.close_time)} WIB).`
        );
        return;
      }
    }

    setLoadingTables(true);
    try {
      const res = await fetch(
        `/api/availability?date=${encodeURIComponent(
          reservationDate
        )}&startTime=${encodeURIComponent(startTime)}&duration=${durationMinutes}`
      );
      const json = await res.json();
      const occ: number[] = json.occupiedTableIds || [];
      setOccupiedTableIds(occ);
      if (selectedTableId && occ.includes(selectedTableId)) {
        setSelectedTableId(null);
      }
    } catch {
      setOccupiedTableIds([]);
    } finally {
      setLoadingTables(false);
    }

    // Reset meja jika kapasitas tidak lagi mencukupi
    if (selectedTableId) {
      const t = tables.find((tbl) => tbl.id === selectedTableId);
      if (!t || t.capacity < guestCount) {
        setSelectedTableId(null);
      }
    }

    setStep(2);
  };

  // Hitungan subtotal, pajak, total, dan DP
  const minOrderAmount = Number(restaurant?.min_order_amount ?? 300000);
  const taxPct = Number(restaurant?.tax_percentage ?? 10);
  const dpPct = Number(restaurant?.dp_percentage ?? 50);

  const cartItemsList = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([idStr, qty]) => {
        const menu = menus.find((m) => m.id === Number(idStr));
        return menu ? { menu, quantity: qty, subtotal: menu.price * qty } : null;
      })
      .filter((x): x is { menu: MenuItem; quantity: number; subtotal: number } =>
        Boolean(x)
      );
  }, [cart, menus]);

  const subtotal = useMemo(
    () => cartItemsList.reduce((acc, item) => acc + item.subtotal, 0),
    [cartItemsList]
  );
  const taxAmount = Math.round((subtotal * taxPct) / 100);
  const totalAmount = subtotal + taxAmount;
  const dpAmount = Math.round((totalAmount * dpPct) / 100);
  const shortfall = Math.max(0, minOrderAmount - subtotal);

  const updateCartQty = (menuId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[menuId] || 0;
      const next = Math.max(0, Math.min(99, current + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[menuId];
      else copy[menuId] = next;
      return copy;
    });
  };

  const handleSubmitReservation = async () => {
    if (!selectedTableId || shortfall > 0 || cartItemsList.length === 0) return;
    setSubmitting(true);
    setError(null);

    const payloadItems = cartItemsList.map((ci) => ({
      menu_item_id: ci.menu.id,
      quantity: ci.quantity,
    }));

    const { data, error: rpcError } = await supabase.rpc("create_reservation", {
      p_contact_name: contactName.trim(),
      p_contact_phone: contactPhone.trim(),
      p_contact_email: contactEmail.trim(),
      p_reservation_date: reservationDate,
      p_start_time: startTime,
      p_duration_minutes: durationMinutes,
      p_guest_count: guestCount,
      p_table_id: selectedTableId,
      p_items: payloadItems,
      p_notes: notes.trim() || null,
    });

    if (rpcError || !data) {
      setError(translateDbError(rpcError));
      setSubmitting(false);
      return;
    }

    router.push(`/riwayat/${data.id}?created=1`);
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const filteredMenus = useMemo(() => {
    if (activeCategory === "all") return menus;
    return menus.filter((m) => m.category_id === activeCategory);
  }, [menus, activeCategory]);

  if (loadingInit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <div className="glass-card h-20 animate-pulse" />
        <div className="glass-card h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Reservation Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#071F1A] border border-[#C8A96A]/35 text-[#C8A96A] text-xs font-serif uppercase tracking-[0.25em]">
            <span>✦ Table Reservation · Est. MMXXVI</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F7F6F1]">
            Table Reservation & Curated Menu
          </h1>
          <p className="text-xs sm:text-sm text-[#A2B8AF] font-light max-w-2xl leading-relaxed">
            Select your preferred dining date, choose your table location with our interactive 2D floor plan,
            and pre-order appetizers and signature main courses prior to your arrival.
          </p>
        </div>
      </div>

      {/* Stepper with Luxury Styling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { num: 1, stepLabel: "Step I", title: "Date & Guests", sub: "Schedule & Contact" },
          { num: 2, stepLabel: "Step II", title: "Choose Table", sub: "2D Seating Map" },
          { num: 3, stepLabel: "Step III", title: "Select Menu", sub: "Course Pre-Order" },
          { num: 4, stepLabel: "Step IV", title: "Confirmation", sub: "Review & Submit" },
        ].map((s) => {
          const active = step === s.num;
          const done = step > s.num;
          return (
            <div
              key={s.num}
              className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                active
                  ? "bg-[#C8A96A] text-[#071F1A] border-[#C8A96A] shadow-xl shadow-[#C8A96A]/25"
                  : done
                  ? "bg-[#09251F] border-emerald-500/40 text-emerald-300"
                  : "bg-[#051511]/90 border-[#E6F0E9]/10 text-[#A2B8AF]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-serif uppercase tracking-widest ${active ? "text-[#071F1A]/80 font-bold" : "text-[#C8A96A]"}`}>
                  {s.stepLabel}
                </span>
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs sm:text-sm font-serif font-bold truncate mt-1">
                {s.title}
              </div>
              <div className={`text-[10px] truncate ${active ? "text-[#071F1A]/80" : "text-[#A2B8AF]/70"}`}>
                {s.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* STEP 1: JADWAL & KONTAK */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8 space-y-6 animate-page-enter">
          <h2 className="font-serif text-xl font-bold text-lumiere-cream">
            1. Identitas Pemesan & Jadwal Kunjungan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Nama Lengkap Pemesan *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input-dark"
                placeholder="Nama pemesan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Nomor Telepon / WA *
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input-dark"
                placeholder="081234567890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Email Konfirmasi *
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-dark"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Tanggal Reservasi *
              </label>
              <input
                type="date"
                min={getTodayJakarta()}
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Jam Mulai (WIB) *
              </label>
              <input
                type="time"
                step={1800}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Durasi Kunjungan *
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="input-dark"
              >
                {DURATION_OPTIONS.map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} Menit ({mins / 60} Jam)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
                Jumlah Pengunjung (1–50) *
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={guestCount}
                onChange={(e) =>
                  setGuestCount(Math.max(1, Math.min(50, Number(e.target.value))))
                }
                className="input-dark"
              />
            </div>
          </div>

          {selectedDayOperatingHour && (
            <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-lumiere-muted flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-lumiere-gold shrink-0" />
              <span>
                Jam operasional hari{" "}
                <strong className="text-lumiere-cream">
                  {DAY_NAMES_ID[selectedDayOperatingHour.day_of_week]}
                </strong>
                :{" "}
                {selectedDayOperatingHour.is_closed ? (
                  <span className="text-rose-400 font-semibold">Tutup</span>
                ) : (
                  <span className="text-lumiere-gold font-semibold">
                    {formatTimeShort(selectedDayOperatingHour.open_time)} –{" "}
                    {formatTimeShort(selectedDayOperatingHour.close_time)} WIB
                  </span>
                )}
                . Estimasi selesai:{" "}
                <strong className="text-lumiere-cream">
                  {getEndTime(startTime, durationMinutes)} WIB
                </strong>
                .
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNextToStep2}
              disabled={loadingTables}
              className="btn-primary"
            >
              {loadingTables ? "Mengecek Meja..." : "Lanjut Pilih Meja"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PILIH MEJA (DENAH RESTORAN - BIOSKOP STYLE) */}
      {step === 2 && (
        <div className="glass-card p-6 sm:p-8 space-y-6 animate-page-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lumiere-gold/15 text-lumiere-gold border border-lumiere-gold/30">
                  Denah Interaktif
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-lumiere-cream">
                  2. Pilih Meja & Kursi
                </h2>
              </div>
              <p className="text-xs text-lumiere-muted mt-1">
                {formatDateID(reservationDate)} · {startTime} –{" "}
                {getEndTime(startTime, durationMinutes)} WIB ·{" "}
                <strong className="text-lumiere-gold">{guestCount} Pengunjung</strong>
              </p>
            </div>

            {loadingTables && (
              <span className="text-xs text-lumiere-gold animate-pulse">
                Memperbarui ketersediaan meja...
              </span>
            )}
          </div>

          <RestaurantFloorPlan
            tables={tables}
            selectedTableId={selectedTableId}
            occupiedTableIds={occupiedTableIds}
            guestCount={guestCount}
            onSelectTable={(tableId) => {
              setError(null);
              setSelectedTableId(tableId);
            }}
            onContinue={() => {
              setError(null);
              setStep(3);
            }}
          />

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Jadwal
            </button>
            <button
              type="button"
              disabled={!selectedTableId}
              onClick={() => {
                setError(null);
                setStep(3);
              }}
              className="btn-primary"
            >
              Lanjut Pilih Menu
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PILIH MENU (MINIMAL Rp300.000) */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-page-enter">
          {/* Menu List */}
          <div className="lg:col-span-2 glass-card p-6 space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-lumiere-cream">
                3. Pre-Order Hidangan
              </h2>
              <p className="text-xs text-lumiere-muted mt-0.5">
                Minimal subtotal pemesanan menu adalah{" "}
                <strong className="text-lumiere-gold">
                  {formatIDR(minOrderAmount)}
                </strong>{" "}
                (sebelum pajak {taxPct}%).
              </p>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  activeCategory === "all"
                    ? "bg-lumiere-gold text-obsidian-950"
                    : "bg-white/5 text-lumiere-muted hover:text-lumiere-cream"
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-lumiere-gold text-obsidian-950"
                      : "bg-white/5 text-lumiere-muted hover:text-lumiere-cream"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filteredMenus.map((item) => {
                const qty = cart[item.id] || 0;
                const photoUrl = getMenuItemImageUrl(item.photo_path, item.name);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${
                      item.is_available
                        ? "bg-[#071F1A]/90 border-[#C8A96A]/20 hover:border-[#C8A96A]/50"
                        : "bg-[#051511]/40 border-white/5 opacity-55"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#051511] shrink-0 border border-[#C8A96A]/25 relative">
                        <img
                          src={photoUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-sm text-[#F7F6F1] truncate">
                            {item.name}
                          </h3>
                          {!item.is_available && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A2B8AF] line-clamp-1 mt-0.5 font-light">
                          {item.description}
                        </p>
                        <div className="text-sm font-serif font-bold text-[#C8A96A] mt-1">
                          {formatIDR(item.price)}
                        </div>
                      </div>
                    </div>

                    {item.is_available ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, -1)}
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-lumiere-cream"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold font-serif">
                              {qty}
                            </span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-[#C8A96A] text-[#071F1A] hover:opacity-90 flex items-center justify-center font-bold shadow-md shadow-[#C8A96A]/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A2B8AF] shrink-0 font-serif">
                        Unavailable
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Summary & Min Order Validation */}
          <div className="glass-card p-6 flex flex-col justify-between space-y-6 h-fit sticky top-20">
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-lumiere-cream flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-lumiere-gold" />
                Ringkasan Pesanan
              </h3>

              {/* Progress Bar Minimal Order */}
              <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-lumiere-muted">Syarat Minimum</span>
                  <span className="font-semibold text-lumiere-cream">
                    {formatIDR(minOrderAmount)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      shortfall === 0 ? "bg-emerald-400" : "bg-lumiere-amber"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((subtotal / Math.max(1, minOrderAmount)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                {shortfall > 0 ? (
                  <p className="text-xs text-amber-300 font-medium">
                    Kurang {formatIDR(shortfall)} lagi untuk dapat melanjutkan.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Minimal pembelian
                    terpenuhi!
                  </p>
                )}
              </div>

              {/* Selected items */}
              {cartItemsList.length === 0 ? (
                <p className="text-xs text-lumiere-muted text-center py-6">
                  Belum ada menu yang dipilih.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {cartItemsList.map(({ menu, quantity, subtotal: itemSub }) => (
                    <div
                      key={menu.id}
                      className="flex items-center justify-between py-1.5 border-b border-white/5"
                    >
                      <span className="text-lumiere-cream truncate pr-2">
                        {quantity}× {menu.name}
                      </span>
                      <span className="font-semibold text-lumiere-muted shrink-0">
                        {formatIDR(itemSub)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                <div className="flex justify-between text-lumiere-muted">
                  <span>Subtotal Menu</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lumiere-muted">
                  <span>Pajak Restoran ({taxPct}%)</span>
                  <span>{formatIDR(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lumiere-cream pt-1">
                  <span>Estimasi Total Tagihan</span>
                  <span className="text-lumiere-gold">
                    {formatIDR(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-amber-300 pt-1">
                  <span>Wajib DP ({dpPct}% setelah disetujui)</span>
                  <span className="font-semibold">{formatIDR(dpAmount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={shortfall > 0 || cartItemsList.length === 0}
                onClick={() => {
                  setError(null);
                  setStep(4);
                }}
                className="btn-primary w-full"
              >
                Lanjut ke Konfirmasi
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-secondary w-full"
              >
                <ArrowLeft className="w-4 h-4" />
                Ganti Meja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: KONFIRMASI AKHIR */}
      {step === 4 && selectedTable && (
        <div className="glass-card p-6 sm:p-8 space-y-6 animate-page-enter">
          <h2 className="font-serif text-xl font-bold text-lumiere-cream">
            4. Konfirmasi & Kirim Reservasi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-lumiere-gold">
                Detail Jadwal & Meja
              </h3>
              <div className="flex justify-between">
                <span className="text-lumiere-muted">Nama Pemesan</span>
                <span className="font-medium">{contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lumiere-muted">Telepon / Email</span>
                <span className="font-medium">
                  {contactPhone} · {contactEmail}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-lumiere-muted">Tanggal</span>
                <span className="font-medium">
                  {formatDateID(reservationDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-lumiere-muted">Waktu & Durasi</span>
                <span className="font-medium">
                  {startTime} – {getEndTime(startTime, durationMinutes)} WIB (
                  {durationMinutes} mnt)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-lumiere-muted">Meja & Kapasitas</span>
                <span className="font-bold text-lumiere-gold">
                  Meja {selectedTable.code} ({selectedTable.area}) ·{" "}
                  {guestCount}/{selectedTable.capacity} Tamu
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-lumiere-gold">
                Rincian Tagihan
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
                {cartItemsList.map(({ menu, quantity, subtotal: sub }) => (
                  <div key={menu.id} className="flex justify-between">
                    <span>
                      {quantity}× {menu.name}
                    </span>
                    <span className="text-lumiere-muted">{formatIDR(sub)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-lumiere-muted">
                  <span>Subtotal</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lumiere-muted">
                  <span>Pajak ({taxPct}%)</span>
                  <span>{formatIDR(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-lumiere-cream pt-1">
                  <span>Total Tagihan</span>
                  <span className="text-lumiere-gold">
                    {formatIDR(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>DP Wajib ({dpPct}%)</span>
                  <span>{formatIDR(dpAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-lumiere-muted mb-1.5">
              Catatan Tambahan (Opsional — mis. alergi makanan, kursi bayi,
              ulang tahun)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis catatan khusus untuk staf kami..."
              className="input-dark"
            />
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Setelah dikirim, status reservasi menjadi{" "}
              <strong>Menunggu Validasi</strong>. Pembayaran DP 50% dilakukan
              setelah staf menyetujui pengajuan dan menerbitkan tagihan.
              {restaurant && restaurant.pending_timeout_minutes > 0
                ? ` Reservasi yang tidak divalidasi dalam ${restaurant.pending_timeout_minutes} menit akan dibatalkan otomatis oleh sistem.`
                : ""}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={submitting}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Menu
            </button>
            <button
              type="button"
              onClick={handleSubmitReservation}
              disabled={submitting}
              className="btn-primary px-7 py-3"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? "Memproses Reservasi..." : "Kirim Pengajuan Reservasi"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
