"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  formatDateID,
  formatIDR,
  formatTimeShort,
  getEndTime,
  translateDbError,
} from "@/lib/utils";
import {
  ReservationStatusBadge,
  InvoiceStatusBadge,
} from "@/components/StatusBadge";
import type { Reservation, Invoice } from "@/types/database";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

type StaffReservationRow = Reservation & {
  invoices?: Invoice[] | Invoice | null;
};

export default function StaffDashboardPage() {
  const supabase = createClient();

  const [reservations, setReservations] = useState<StaffReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Barcode / Code Verification State (FR-17 & FR-18)
  const [scanCode, setScanCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedRes, setScannedRes] = useState<StaffReservationRow | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, dining_tables(code, area, capacity), invoices(*)")
      .order("reservation_date", { ascending: false })
      .order("start_time", { ascending: true });

    setReservations((data as StaffReservationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // Cari reservasi via barcode / kode (FR-17)
  const handleVerifyBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = scanCode.trim().toUpperCase();
    if (!cleaned) return;

    setScanning(true);
    setScanError(null);
    setScanSuccess(null);
    setScannedRes(null);

    const { data, error } = await supabase
      .from("reservations")
      .select("*, dining_tables(code, area, capacity), invoices(*)")
      .eq("reservation_code", cleaned)
      .maybeSingle();

    if (error || !data) {
      setScanError(
        `Kode reservasi "${cleaned}" tidak ditemukan atau tidak valid.`
      );
      setScanning(false);
      return;
    }

    const found = data as StaffReservationRow;
    setScannedRes(found);

    if (found.status === "check_in") {
      setScanError(
        "Reservasi ini SUDAH melakukan check-in sebelumnya (check-in berulang dicegah)."
      );
    } else if (found.status !== "dikonfirmasi") {
      setScanError(
        `Reservasi berstatus "${found.status.toUpperCase()}" dan tidak dapat dilakukan check-in.`
      );
    }

    setScanning(false);
  };

  // Konfirmasi Check-In dari hasil scan (FR-18)
  const handleConfirmCheckIn = async () => {
    if (!scannedRes || scannedRes.status !== "dikonfirmasi") return;
    setCheckingIn(true);
    setScanError(null);

    const { error } = await supabase
      .from("reservations")
      .update({
        status: "check_in",
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", scannedRes.id);

    if (error) {
      setScanError(translateDbError(error));
    } else {
      setScanSuccess(
        `Check-in berhasil untuk ${scannedRes.reservation_code} (${scannedRes.contact_name}) di Meja ${scannedRes.dining_tables?.code}!`
      );
      setScannedRes({ ...scannedRes, status: "check_in" });
      await fetchReservations();
    }
    setCheckingIn(false);
  };

  const stats = useMemo(() => {
    return {
      pending: reservations.filter((r) => r.status === "menunggu_validasi")
        .length,
      confirmed: reservations.filter((r) => r.status === "dikonfirmasi").length,
      checkedIn: reservations.filter((r) => r.status === "check_in").length,
      completed: reservations.filter((r) => r.status === "selesai").length,
    };
  }, [reservations]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (dateFilter && r.reservation_date !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = r.reservation_code.toLowerCase().includes(q);
        const matchName = r.contact_name.toLowerCase().includes(q);
        const matchPhone = r.contact_phone.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, dateFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-lumiere-gold">
            Operasional Restoran
          </span>
          <h1 className="font-serif text-3xl font-bold text-lumiere-cream mt-1">
            Dashboard Staf Lumière
          </h1>
          <p className="text-sm text-lumiere-muted mt-1">
            Validasi pengajuan reservasi, verifikasi barcode check-in, kelola
            pesanan dapur, dan catat pembayaran.
          </p>
        </div>
        <button onClick={fetchReservations} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Muat Ulang Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">Menunggu Validasi</div>
          <div className="text-3xl font-bold text-amber-400 mt-1">
            {stats.pending}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Perlu persetujuan staf
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">Dikonfirmasi</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">
            {stats.confirmed}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Siap kedatangan & DP
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">Sedang Check-In</div>
          <div className="text-3xl font-bold text-sky-400 mt-1">
            {stats.checkedIn}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Tamu aktif di lokasi
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">Selesai</div>
          <div className="text-3xl font-bold text-lumiere-cream mt-1">
            {stats.completed}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Total kunjungan selesai
          </div>
        </div>
      </div>

      {/* BARCODE CHECK-IN VERIFIER (FR-17 & FR-18) */}
      <div className="glass-card p-6 border-lumiere-gold/30 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-lumiere-gold/15 flex items-center justify-center text-lumiere-gold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-lumiere-cream">
              Verifikasi Barcode & Check-In Cepat
            </h2>
            <p className="text-xs text-lumiere-muted">
              Pindai barcode pelanggan atau masukkan kode reservasi (contoh:{" "}
              <code className="text-lumiere-gold">RSV-261116-00001</code>).
            </p>
          </div>
        </div>

        <form
          onSubmit={handleVerifyBarcode}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan / ketik kode RSV-YYMMDD-00001..."
            className="input-dark font-mono uppercase flex-1"
          />
          <button
            type="submit"
            disabled={scanning || !scanCode.trim()}
            className="btn-primary shrink-0"
          >
            {scanning ? "Memeriksa..." : "Periksa Kode"}
          </button>
        </form>

        {scanError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {scanSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scanSuccess}</span>
          </div>
        )}

        {scannedRes && (
          <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-lumiere-gold">
                  {scannedRes.reservation_code}
                </span>
                <ReservationStatusBadge status={scannedRes.status} />
              </div>
              <div className="text-sm font-semibold text-lumiere-cream">
                {scannedRes.contact_name} · Meja{" "}
                {scannedRes.dining_tables?.code} ({scannedRes.guest_count}{" "}
                tamu)
              </div>
              <div className="text-xs text-lumiere-muted">
                {formatDateID(scannedRes.reservation_date)} ·{" "}
                {formatTimeShort(scannedRes.start_time)} WIB
              </div>
            </div>

            <div className="flex items-center gap-2">
              {scannedRes.status === "dikonfirmasi" && (
                <button
                  type="button"
                  onClick={handleConfirmCheckIn}
                  disabled={checkingIn}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {checkingIn ? "Memproses..." : "Konfirmasi Check-In"}
                </button>
              )}
              <Link
                href={`/staf/reservasi/${scannedRes.id}`}
                className="btn-secondary"
              >
                Buka Detail
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* RESERVATION LIST & FILTERS (FR-14) */}
      <div className="space-y-4">
        <div className="glass-card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-lumiere-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode reservasi, nama pelanggan, atau no. HP..."
              className="input-dark pl-10"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-dark md:w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-dark md:w-52"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu_validasi">Menunggu Validasi</option>
            <option value="dikonfirmasi">Dikonfirmasi</option>
            <option value="check_in">Check-In</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
            <option value="tidak_hadir">Tidak Hadir</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-sm text-lumiere-muted">
            Tidak ada reservasi yang sesuai dengan filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const inv = Array.isArray(r.invoices)
                ? r.invoices[0]
                : r.invoices || null;
              return (
                <Link
                  key={r.id}
                  href={`/staf/reservasi/${r.id}`}
                  className="glass-card p-4 sm:p-5 block hover:border-lumiere-gold/40 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-lumiere-gold bg-lumiere-gold/10 px-2 py-0.5 rounded border border-lumiere-gold/25">
                          {r.reservation_code}
                        </span>
                        <ReservationStatusBadge status={r.status} />
                        {inv && (
                          <InvoiceStatusBadge status={inv.payment_status} />
                        )}
                      </div>
                      <div className="font-semibold text-base text-lumiere-cream">
                        {r.contact_name}{" "}
                        <span className="text-xs font-normal text-lumiere-muted">
                          ({r.contact_phone})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-lumiere-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-lumiere-gold" />
                          {formatDateID(r.reservation_date)} ·{" "}
                          {formatTimeShort(r.start_time)} –{" "}
                          {getEndTime(
                            formatTimeShort(r.start_time),
                            r.duration_minutes
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-lumiere-gold" />
                          Meja {r.dining_tables?.code} ({r.guest_count} org)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                      <div className="text-left sm:text-right">
                        {inv ? (
                          <>
                            <div className="text-[11px] text-lumiere-muted">
                              Tagihan
                            </div>
                            <div className="text-sm font-bold text-lumiere-cream">
                              {formatIDR(inv.total_amount)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-amber-300 font-medium">
                            Perlu Validasi
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-lumiere-muted group-hover:text-lumiere-gold transition" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
