"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { paymentSchema } from "@/lib/validation";
import {
  formatDateID,
  formatDateTimeID,
  formatIDR,
  formatTimeShort,
  getEndTime,
  translateDbError,
} from "@/lib/utils";
import {
  ReservationStatusBadge,
  OrderStatusBadge,
  InvoiceStatusBadge,
  PaymentStatusBadge,
} from "@/components/StatusBadge";
import type {
  DiningTable,
  Invoice,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentType,
  Reservation,
  ReservationItem,
  ReservationStatus,
  ReservationStatusLog,
} from "@/types/database";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  Utensils,
  CreditCard,
  ArrowRightLeft,
  History,
} from "lucide-react";

export default function StaffReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ReservationStatusLog[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Rejection modal/box state
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Table reassignment state
  const [newTableId, setNewTableId] = useState<number | "">("");

  // Payment form state (FR-22 & FR-23)
  const [payType, setPayType] = useState<PaymentType>("dp");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("qris");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payRef, setPayRef] = useState<string>("");

  const loadData = async () => {
    const id = params.id;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setStaffId(user.id);

    const [resQ, itemsQ, orderQ, invQ, logsQ, tablesQ] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, dining_tables(id, code, capacity, area)")
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
      supabase
        .from("dining_tables")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true }),
    ]);

    if (resQ.data) {
      const r = resQ.data as Reservation;
      setReservation(r);
      setNewTableId(r.table_id);
    }
    if (itemsQ.data) setItems(itemsQ.data as ReservationItem[]);
    if (orderQ.data) setOrder(orderQ.data as Order);
    if (logsQ.data) setLogs(logsQ.data as ReservationStatusLog[]);
    if (tablesQ.data) setTables(tablesQ.data as DiningTable[]);

    if (invQ.data) {
      const inv = invQ.data as Invoice;
      setInvoice(inv);
      const { data: payData } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("paid_at", { ascending: true });
      const plist = (payData as Payment[]) || [];
      setPayments(plist);

      // Auto-suggest DP or Pelunasan amount
      const paidSum = plist
        .filter((p) => p.status === "berhasil")
        .reduce((s, p) => s + Number(p.amount), 0);
      const rem = Math.max(0, Number(inv.total_amount) - paidSum);
      if (paidSum === 0 && Number(inv.dp_amount) > 0) {
        setPayType("dp");
        setPayAmount(String(inv.dp_amount));
      } else if (rem > 0) {
        setPayType("pelunasan");
        setPayAmount(String(rem));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  // PRD v0.4: approve_reservation membuat status, invoice, dan batas DP
  // dalam satu transaksi. Order dapur dibuat saat check-in.
  const handleApprove = async () => {
    if (!reservation) return;
    setBusy(true);
    setFeedback(null);

    const { error } = await supabase.rpc("approve_reservation", {
      p_reservation_id: reservation.id,
    });

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: "Reservasi disetujui. Tagihan dan batas bayar DP sudah dibuat!",
      });
    }

    await loadData();
    setBusy(false);
  };

  // Reject reservation with reason (FR-16)
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation || !rejectionReason.trim()) return;
    setBusy(true);
    setFeedback(null);

    const { error } = await supabase
      .from("reservations")
      .update({
        status: "ditolak",
        rejection_reason: rejectionReason.trim(),
        validated_by: staffId,
        validated_at: new Date().toISOString(),
      })
      .eq("id", reservation.id);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setShowRejectBox(false);
      setFeedback({
        type: "success",
        text: "Reservasi berhasil ditolak dan alasan penolakan tersimpan.",
      });
      await loadData();
    }
    setBusy(false);
  };

  // Update reservation lifecycle status (FR-18)
  const handleStatusTransition = async (nextStatus: ReservationStatus) => {
    if (!reservation) return;
    setBusy(true);
    setFeedback(null);

    const patch: Partial<Reservation> = { status: nextStatus };
    if (nextStatus === "check_in") {
      patch.checked_in_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("reservations")
      .update(patch)
      .eq("id", reservation.id);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: `Status reservasi diperbarui menjadi "${nextStatus}".`,
      });
      await loadData();
    }
    setBusy(false);
  };

  // Reassign table (Database section 8.3)
  const handleMoveTable = async () => {
    if (!reservation || !newTableId || Number(newTableId) === reservation.table_id)
      return;
    setBusy(true);
    setFeedback(null);

    const { error } = await supabase
      .from("reservations")
      .update({ table_id: Number(newTableId) })
      .eq("id", reservation.id);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: "Meja reservasi berhasil dipindahkan.",
      });
      await loadData();
    }
    setBusy(false);
  };

  // Update Kitchen Order Status (FR-20)
  const handleUpdateOrderStatus = async (nextOrderStatus: OrderStatus) => {
    if (!order) return;
    setBusy(true);
    setFeedback(null);

    const { error } = await supabase
      .from("orders")
      .update({
        status: nextOrderStatus,
        handled_by: staffId,
      })
      .eq("id", order.id);

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setFeedback({
        type: "success",
        text: `Status pesanan dapur diperbarui menjadi "${nextOrderStatus}".`,
      });
      await loadData();
    }
    setBusy(false);
  };

  // Record Payment DP / Pelunasan (FR-22 & FR-23)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setFeedback(null);

    const parsed = paymentSchema.safeParse({
      type: payType,
      method: payMethod,
      amount: Number(payAmount),
      referenceNo: payRef || undefined,
    });

    if (!parsed.success) {
      setFeedback({
        type: "error",
        text: parsed.error.issues[0]?.message || "Data pembayaran tidak valid.",
      });
      return;
    }

    setBusy(true);
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const choiceByType: Record<string, string> = {
      dp: "dp_50",
      penuh: "penuh",
      pelunasan: "pelunasan",
    };

    // Nominal dihitung database oleh record_payment_at_restaurant.
    const { error } = await supabase.rpc("record_payment_at_restaurant", {
      p_invoice_id: invoice.id,
      p_choice: choiceByType[parsed.data.type],
      p_method: parsed.data.method,
      p_idempotency_key: idempotencyKey,
      p_reference: parsed.data.referenceNo || null,
    });

    if (error) {
      setFeedback({ type: "error", text: translateDbError(error) });
    } else {
      setPayRef("");
      setFeedback({
        type: "success",
        text: `Pembayaran ${parsed.data.type.toUpperCase()} berhasil dicatat. Nominal dihitung sistem.`,
      });
      await loadData();
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-4">
        <div className="glass-card h-48 animate-pulse" />
        <div className="glass-card h-72 animate-pulse" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-semibold">Reservasi tidak ditemukan.</p>
        <Link href="/staf" className="btn-secondary">
          Kembali ke Dashboard Staf
        </Link>
      </div>
    );
  }

  const paidTotal = payments
    .filter((p) => p.status === "berhasil")
    .reduce((s, p) => s + Number(p.amount), 0);
  const remainingAmount = invoice
    ? Math.max(0, Number(invoice.total_amount) - paidTotal)
    : 0;

  const isActiveReservation = [
    "menunggu_validasi",
    "dikonfirmasi",
    "check_in",
  ].includes(reservation.status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/staf"
          className="inline-flex items-center gap-1.5 text-sm text-lumiere-muted hover:text-lumiere-cream"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard Staf
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
              : "bg-rose-500/15 border-rose-500/30 text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* HEADER & LIFECYCLE ACTIONS */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-lumiere-gold bg-lumiere-gold/10 px-3 py-1 rounded-lg border border-lumiere-gold/30">
                {reservation.reservation_code}
              </span>
              <ReservationStatusBadge status={reservation.status} />
              {order && <OrderStatusBadge status={order.status} />}
              {invoice && <InvoiceStatusBadge status={invoice.payment_status} />}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-lumiere-cream">
              {reservation.contact_name}
            </h1>
            <p className="text-sm text-lumiere-muted">
              {reservation.contact_phone} · {reservation.contact_email}
            </p>
          </div>

          {/* Action Buttons based on Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {reservation.status === "menunggu_validasi" && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Setujui & Terbitkan Tagihan
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(!showRejectBox)}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Tolak
                </button>
              </>
            )}

            {reservation.status === "dikonfirmasi" && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusTransition("check_in")}
                  disabled={busy}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Check-In
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusTransition("tidak_hadir")}
                  disabled={busy}
                  className="btn-secondary text-orange-300 border-orange-500/30"
                >
                  Tidak Hadir
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusTransition("dibatalkan")}
                  disabled={busy}
                  className="btn-secondary text-rose-300 border-rose-500/30"
                >
                  Batalkan
                </button>
              </>
            )}

            {reservation.status === "check_in" && (
              <button
                type="button"
                onClick={() => handleStatusTransition("selesai")}
                disabled={busy}
                className="btn-primary"
              >
                <CheckCircle2 className="w-4 h-4" />
                Selesaikan Reservasi
              </button>
            )}
          </div>
        </div>

        {/* Rejection Form */}
        {showRejectBox && reservation.status === "menunggu_validasi" && (
          <form
            onSubmit={handleReject}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3"
          >
            <label className="block text-xs font-semibold text-rose-200">
              Alasan Penolakan (Wajib diisi) *
            </label>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Kapasitas area penuh untuk jadwal tersebut."
              className="input-dark"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectBox(false)}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </form>
        )}

        {/* Schedule & Table Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-sm">
          <div>
            <span className="text-xs text-lumiere-muted block">Tanggal</span>
            <span className="font-semibold">
              {formatDateID(reservation.reservation_date)}
            </span>
          </div>
          <div>
            <span className="text-xs text-lumiere-muted block">
              Jam & Durasi
            </span>
            <span className="font-semibold">
              {formatTimeShort(reservation.start_time)} –{" "}
              {getEndTime(
                formatTimeShort(reservation.start_time),
                reservation.duration_minutes
              )}{" "}
              WIB ({reservation.duration_minutes} mnt)
            </span>
          </div>
          <div>
            <span className="text-xs text-lumiere-muted block">
              Meja & Tamu
            </span>
            <span className="font-semibold text-lumiere-gold">
              Meja {reservation.dining_tables?.code} (
              {reservation.dining_tables?.area}) · {reservation.guest_count}{" "}
              Tamu
            </span>
          </div>
          <div>
            <span className="text-xs text-lumiere-muted block">
              Waktu Check-In
            </span>
            <span className="font-semibold">
              {reservation.checked_in_at
                ? formatDateTimeID(reservation.checked_in_at)
                : "Belum check-in"}
            </span>
          </div>
        </div>

        {/* Pindah Meja untuk reservasi aktif */}
        {isActiveReservation && (
          <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-lumiere-muted">
              <ArrowRightLeft className="w-4 h-4 text-lumiere-gold shrink-0" />
              <span>
                Pindahkan Meja (database memvalidasi kapasitas & benturan
                jadwal):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newTableId}
                onChange={(e) => setNewTableId(Number(e.target.value))}
                className="input-dark py-1.5 text-xs w-48"
              >
                {tables
                  .filter((t) => t.capacity >= reservation.guest_count)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.area} (Maks {t.capacity})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleMoveTable}
                disabled={busy || Number(newTableId) === reservation.table_id}
                className="btn-secondary py-1.5 text-xs"
              >
                Pindah
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MIDDLE GRID: MENU & KITCHEN ORDER + INVOICE & PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu & Order Status (FR-19 & FR-20) */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-lumiere-gold" />
              <h2 className="font-serif text-lg font-bold text-lumiere-cream">
                Pesanan Menu & Status Dapur
              </h2>
            </div>
            {order && <OrderStatusBadge status={order.status} />}
          </div>

          {order && (
            <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/10 space-y-2">
              <div className="text-xs font-medium text-lumiere-muted">
                Perbarui Status Pesanan Dapur:
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "menunggu",
                    "disiapkan",
                    "disajikan",
                    "selesai",
                    "dibatalkan",
                  ] as OrderStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busy || order.status === st}
                    onClick={() => handleUpdateOrderStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      order.status === st
                        ? "bg-lumiere-gold text-obsidian-950"
                        : "bg-white/5 hover:bg-white/10 text-lumiere-cream"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divide-y divide-white/5 text-sm">
            {items.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-lumiere-cream">
                    {item.quantity}× {item.menu_items?.name}
                  </span>
                  <div className="text-xs text-lumiere-muted">
                    @ {formatIDR(item.unit_price)}
                  </div>
                </div>
                <span className="font-semibold text-lumiere-gold">
                  {formatIDR(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice & Payment Recorder (FR-21..24) */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-lumiere-gold" />
              <h2 className="font-serif text-lg font-bold text-lumiere-cream">
                Tagihan & Pencatatan Pembayaran
              </h2>
            </div>
            {invoice && (
              <span className="font-mono text-xs text-lumiere-muted">
                {invoice.invoice_number}
              </span>
            )}
          </div>

          {!invoice ? (
            <div className="p-5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-lumiere-muted space-y-3">
              <p>
                Tagihan belum tersedia. Setujui reservasi terlebih dahulu untuk
                menerbitkan tagihan otomatis.
              </p>
              {["dikonfirmasi", "check_in", "selesai"].includes(
                reservation.status
              ) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const { error } = await supabase.rpc("generate_invoice", {
                      p_reservation_id: reservation.id,
                    });
                    if (error) {
                      setFeedback({
                        type: "error",
                        text: translateDbError(error),
                      });
                    }
                    await loadData();
                    setBusy(false);
                  }}
                  className="btn-primary text-xs"
                >
                  Terbitkan Tagihan Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-obsidian-900 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-lumiere-muted">
                  <span>Subtotal</span>
                  <span>{formatIDR(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-lumiere-muted">
                  <span>Pajak (10%)</span>
                  <span>{formatIDR(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lumiere-cream pt-1 border-t border-white/10">
                  <span>Total Tagihan</span>
                  <span className="text-lumiere-gold">
                    {formatIDR(invoice.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Target DP (50%)</span>
                  <span>{formatIDR(invoice.dp_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Sudah Dibayar</span>
                  <span className="font-semibold">{formatIDR(paidTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lumiere-cream pt-1 border-t border-white/10">
                  <span>Sisa Tagihan</span>
                  <span>{formatIDR(remainingAmount)}</span>
                </div>
              </div>

              {/* Record New Payment Form */}
              {remainingAmount > 0 &&
                invoice.payment_status !== "dibatalkan" && (
                  <form
                    onSubmit={handleRecordPayment}
                    className="p-4 rounded-xl bg-obsidian-900/90 border border-lumiere-gold/25 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-lumiere-gold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Catat Pembayaran Baru
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPayType("dp");
                            setPayAmount(String(invoice.dp_amount));
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-lumiere-cream"
                        >
                          DP 50%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayType("pelunasan");
                            setPayAmount(String(remainingAmount));
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-lumiere-cream"
                        >
                          Sisa Lunas
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-lumiere-muted mb-1">
                          Jenis Pembayaran
                        </label>
                        <select
                          value={payType}
                          onChange={(e) =>
                            setPayType(e.target.value as PaymentType)
                          }
                          className="input-dark py-2 text-xs"
                        >
                          <option value="dp">DP (Uang Muka)</option>
                          <option value="pelunasan">Pelunasan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-lumiere-muted mb-1">
                          Metode
                        </label>
                        <select
                          value={payMethod}
                          onChange={(e) =>
                            setPayMethod(e.target.value as PaymentMethod)
                          }
                          className="input-dark py-2 text-xs"
                        >
                          <option value="qris">QRIS</option>
                          <option value="transfer">Transfer Bank</option>
                          <option value="tunai">Tunai</option>
                          <option value="kartu_debit">Kartu Debit</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-lumiere-muted mb-1">
                          Nominal (Rp)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={remainingAmount}
                          required
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="input-dark py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-lumiere-muted mb-1">
                          No. Referensi (Opsional)
                        </label>
                        <input
                          type="text"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="TRX-12345"
                          className="input-dark py-2 text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-primary w-full py-2 text-xs"
                    >
                      Simpan Pembayaran
                    </button>
                  </form>
                )}

              {/* Payment History */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-lumiere-muted">
                    Riwayat Pembayaran:
                  </div>
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold uppercase">
                          {p.type}
                        </span>{" "}
                        · <span className="uppercase">{p.method}</span>
                        <div className="text-[11px] text-lumiere-muted">
                          {formatDateTimeID(p.paid_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatIDR(p.amount)}</div>
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

      {/* STATUS AUDIT LOGS */}
      {logs.length > 0 && (
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-lumiere-gold" />
            <h2 className="font-serif text-lg font-bold text-lumiere-cream">
              Log Perubahan Status
            </h2>
          </div>
          <div className="space-y-2 text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-obsidian-900 border border-white/5 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lumiere-muted">
                    {log.from_status || "Baru"} →
                  </span>
                  <ReservationStatusBadge status={log.to_status} />
                  {log.note && (
                    <span className="italic text-lumiere-muted">
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
