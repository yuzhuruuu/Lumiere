"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatDateID,
  formatDateTimeID,
  formatIDR,
  formatTimeShort,
  getEndTime,
  translateDbError,
  getMenuItemImageUrl,
} from "@/lib/utils";
import BarcodeSVG from "@/components/BarcodeSVG";
import {
  ReservationStatusBadge,
  OrderStatusBadge,
  InvoiceStatusBadge,
  PaymentStatusBadge,
} from "@/components/StatusBadge";
import type {
  Invoice,
  Order,
  Payment,
  Reservation,
  ReservationItem,
  ReservationStatusLog,
} from "@/types/database";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Receipt,
  Utensils,
  History,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";

function ReservationDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
  const supabase = createClient();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ReservationStatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    const id = params.id;
    const [resQ, itemsQ, orderQ, invQ, logsQ] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, dining_tables(code, capacity, area)")
        .eq("id", id)
        .single(),
      supabase
        .from("reservation_items")
        .select("*, menu_items(name)")
        .eq("reservation_id", id)
        .order("id", { ascending: true }),
      supabase.from("orders").select("*").eq("reservation_id", id).maybeSingle(),
      supabase
        .from("invoices")
        .select("*")
        .eq("reservation_id", id)
        .maybeSingle(),
      supabase
        .from("reservation_status_logs")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (resQ.data) setReservation(resQ.data as Reservation);
    if (itemsQ.data) setItems(itemsQ.data as ReservationItem[]);
    if (orderQ.data) setOrder(orderQ.data as Order);
    if (logsQ.data) setLogs(logsQ.data as ReservationStatusLog[]);

    if (invQ.data) {
      const inv = invQ.data as Invoice;
      setInvoice(inv);
      const { data: payData } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("paid_at", { ascending: true });
      setPayments((payData as Payment[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [params.id]);

  const handleCancelReservation = async () => {
    if (!reservation) return;
    if (
      !window.confirm(
        "Apakah Anda yakin ingin membatalkan reservasi ini? Tindakan ini tidak dapat dikembalikan."
      )
    ) {
      return;
    }

    setCancelling(true);
    setError(null);

    const { error: updErr } = await supabase
      .from("reservations")
      .update({ status: "dibatalkan" })
      .eq("id", reservation.id);

    if (updErr) {
      setError(translateDbError(updErr));
    } else {
      await loadAll();
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
        <div className="glass-card h-48 animate-pulse" />
        <div className="glass-card h-64 animate-pulse" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-semibold text-lumiere-cream">
          Reservasi tidak ditemukan atau Anda tidak memiliki akses.
        </p>
        <Link href="/riwayat" className="btn-secondary">
          Kembali ke Riwayat
        </Link>
      </div>
    );
  }

  const paidTotal = payments
    .filter((p) => p.status === "berhasil")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingAmount = invoice
    ? Math.max(0, Number(invoice.total_amount) - paidTotal)
    : 0;

  const canCancel =
    reservation.status === "menunggu_validasi" ||
    reservation.status === "dikonfirmasi";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/riwayat"
          className="inline-flex items-center gap-1.5 text-sm text-lumiere-muted hover:text-lumiere-cream transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Riwayat Reservasi
        </Link>
      </div>

      {justCreated && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Pengajuan Reservasi Berhasil Dikirim!
            </p>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Simpan kode & barcode di bawah ini. Staf kami akan segera
              memvalidasi reservasi Anda dan menerbitkan tagihan DP 50%.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Card: Italian Luxury VIP Ticket & Barcode */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/35 shadow-[0_25px_80px_rgba(0,0,0,0.85)] grid grid-cols-1 lg:grid-cols-3 gap-8 items-center overflow-hidden">
        {/* Subtle Watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-[0.035] pointer-events-none">
          <ItalianCrest className="w-80 h-80" />
        </div>

        <div className="lg:col-span-2 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#071F1A] border border-[#C8A96A]/30 text-[#C8A96A] text-[11px] font-serif uppercase tracking-[0.25em]">
            <ItalianCrest className="w-3.5 h-3.5" />
            <span>Digital VIP Pass · Est. MMXXVI</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ReservationStatusBadge status={reservation.status} />
            {order && <OrderStatusBadge status={order.status} />}
            {invoice && <InvoiceStatusBadge status={invoice.payment_status} />}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F7F6F1]">
            {formatDateID(reservation.reservation_date)}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
            <div>
              <span className="text-xs text-[#A2B8AF] block font-serif">
                Arrival Time & Duration
              </span>
              <span className="font-serif font-bold text-[#F7F6F1]">
                {formatTimeShort(reservation.start_time)} –{" "}
                {getEndTime(
                  formatTimeShort(reservation.start_time),
                  reservation.duration_minutes
                )}{" "}
                WIB ({reservation.duration_minutes} mins)
              </span>
            </div>
            <div>
              <span className="text-xs text-lumiere-muted block font-serif">
                Table & Guests
              </span>
              <span className="font-semibold text-lumiere-gold font-serif">
                Table {reservation.dining_tables?.code} (
                {reservation.dining_tables?.area}) · {reservation.guest_count}{" "}
                Guests
              </span>
            </div>
            <div>
              <span className="text-xs text-lumiere-muted block font-serif">
                Guest Name
              </span>
              <span className="font-medium text-lumiere-cream">
                {reservation.contact_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-lumiere-muted block font-serif">
                Contact Details
              </span>
              <span className="font-medium text-lumiere-cream">
                {reservation.contact_phone} · {reservation.contact_email}
              </span>
            </div>
          </div>

          {reservation.notes && (
            <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-lumiere-muted">
              <strong className="text-lumiere-cream">Catatan:</strong>{" "}
              {reservation.notes}
            </div>
          )}

          {reservation.status === "ditolak" && reservation.rejection_reason && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
              <strong>Alasan Penolakan:</strong> {reservation.rejection_reason}
            </div>
          )}

          {canCancel && (
            <div className="pt-2 print:hidden">
              <button
                type="button"
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
              >
                <XCircle className="w-4 h-4" />
                {cancelling ? "Membatalkan..." : "Batalkan Reservasi"}
              </button>
            </div>
          )}
        </div>

        {/* Vector Barcode */}
        <div>
          <BarcodeSVG value={reservation.reservation_code} />
          <p className="text-[11px] text-center text-lumiere-muted mt-2">
            Tunjukkan barcode ini kepada staf saat tiba di restoran untuk
            verifikasi check-in.
          </p>
        </div>
      </div>

      {/* Menu Ordered & Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu Items */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-lumiere-gold" />
            <h2 className="font-serif text-lg font-bold text-lumiere-cream">
              Menu yang Dipesan
            </h2>
          </div>

          <div className="divide-y divide-white/5 text-sm">
            {items.map((item) => {
              const photoUrl = getMenuItemImageUrl(null, item.menu_items?.name);
              return (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#051511] shrink-0 border border-[#C8A96A]/20">
                      <img
                        src={photoUrl}
                        alt={item.menu_items?.name || "Dish"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif font-bold text-sm text-[#F7F6F1] truncate">
                        {item.menu_items?.name || `Menu #${item.menu_item_id}`}
                      </div>
                      <div className="text-xs text-[#A2B8AF] font-light">
                        {item.quantity} × {formatIDR(item.unit_price)}
                      </div>
                    </div>
                  </div>
                  <div className="font-serif font-bold text-[#C8A96A] shrink-0">
                    {formatIDR(item.subtotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice & Payment Breakdown (FR-24) */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-lumiere-gold" />
              <h2 className="font-serif text-lg font-bold text-lumiere-cream">
                Rincian Tagihan & Pembayaran
              </h2>
            </div>
            {invoice && (
              <span className="font-mono text-xs text-lumiere-muted">
                {invoice.invoice_number}
              </span>
            )}
          </div>

          {!invoice ? (
            <div className="p-5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-lumiere-muted space-y-1.5">
              <p className="font-semibold text-lumiere-cream">
                Tagihan Belum Diterbitkan
              </p>
              <p>
                Tagihan resmi (termasuk rincian DP 50%) akan otomatis muncul di
                sini setelah staf menyetujui pengajuan reservasi Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-lumiere-muted">
                  <span>Subtotal Menu</span>
                  <span>{formatIDR(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-lumiere-muted">
                  <span>Pajak Restoran</span>
                  <span>{formatIDR(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lumiere-cream pt-1 border-t border-white/10">
                  <span>Total Tagihan</span>
                  <span className="text-lumiere-gold">
                    {formatIDR(invoice.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Ketentuan DP (50%)</span>
                  <span>{formatIDR(invoice.dp_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Total Pembayaran Diterima</span>
                  <span className="font-semibold">{formatIDR(paidTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lumiere-cream pt-1 border-t border-white/10">
                  <span>Sisa Tagihan</span>
                  <span>{formatIDR(remainingAmount)}</span>
                </div>
              </div>

              {payments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-lumiere-muted">
                    Riwayat Transaksi Pembayaran
                  </div>
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-obsidian-900/70 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold uppercase text-lumiere-cream">
                          {p.type}
                        </span>{" "}
                        · <span className="uppercase">{p.method}</span>
                        <div className="text-[11px] text-lumiere-muted mt-0.5">
                          {formatDateTimeID(p.paid_at)}
                          {p.reference_no ? ` · Ref: ${p.reference_no}` : ""}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold text-lumiere-cream">
                          {formatIDR(p.amount)}
                        </div>
                        <PaymentStatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Audit Logs */}
      {logs.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-lumiere-gold" />
            <h2 className="font-serif text-lg font-bold text-lumiere-cream">
              Riwayat Perubahan Status
            </h2>
          </div>
          <div className="space-y-2.5 text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-obsidian-900 border border-white/5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="w-3.5 h-3.5 text-lumiere-gold" />
                  <span className="text-lumiere-muted">
                    {log.from_status ? `${log.from_status} → ` : "Dibuat → "}
                  </span>
                  <ReservationStatusBadge status={log.to_status} />
                  {log.note && (
                    <span className="text-lumiere-muted italic">
                      ({log.note})
                    </span>
                  )}
                </div>
                <span className="text-lumiere-muted">
                  {formatDateTimeID(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiwayatDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-lumiere-muted">
          Memuat detail reservasi...
        </div>
      }
    >
      <ReservationDetailContent />
    </Suspense>
  );
}
