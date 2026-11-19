"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateID, formatIDR } from "@/lib/utils";
import {
  InvoiceStatusBadge,
  ReservationStatusBadge,
} from "@/components/StatusBadge";
import type { Invoice, Payment, Reservation } from "@/types/database";
import { Download, Search, ExternalLink } from "lucide-react";

type InvoiceWithRelations = Invoice & {
  reservations?: Reservation;
  payments?: Payment[];
};

export default function AdminTransactionRecapPage() {
  const supabase = createClient();

  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRecap() {
      const [invRes, resRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "*, reservations(id, reservation_code, contact_name, reservation_date, status), payments(*)"
          )
          .order("issued_at", { ascending: false }),
        supabase.from("reservations").select("id, status"),
      ]);

      setInvoices((invRes.data as InvoiceWithRelations[]) || []);
      setReservations((resRes.data as Reservation[]) || []);
      setLoading(false);
    }
    loadRecap();
  }, []);

  const enrichedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      const validPayments = (inv.payments || []).filter(
        (p) => p.status === "berhasil"
      );
      const paidAmount = validPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const remaining = Math.max(0, Number(inv.total_amount) - paidAmount);
      return { ...inv, paidAmount, remaining };
    });
  }, [invoices]);

  const summary = useMemo(() => {
    const activeInvoices = enrichedInvoices.filter(
      (i) => i.payment_status !== "dibatalkan"
    );
    const totalBilled = activeInvoices.reduce(
      (s, i) => s + Number(i.total_amount),
      0
    );
    const totalReceived = enrichedInvoices.reduce(
      (s, i) => s + i.paidAmount,
      0
    );
    const totalRemaining = activeInvoices.reduce(
      (s, i) => s + i.remaining,
      0
    );

    const statusCounts = reservations.reduce<Record<string, number>>(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      totalReservations: reservations.length,
      totalInvoices: invoices.length,
      totalBilled,
      totalReceived,
      totalRemaining,
      statusCounts,
    };
  }, [enrichedInvoices, reservations, invoices.length]);

  const filteredInvoices = useMemo(() => {
    return enrichedInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.payment_status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchInv = inv.invoice_number.toLowerCase().includes(q);
        const matchRsv = (inv.reservations?.reservation_code || "")
          .toLowerCase()
          .includes(q);
        const matchName = (inv.reservations?.contact_name || "")
          .toLowerCase()
          .includes(q);
        if (!matchInv && !matchRsv && !matchName) return false;
      }
      return true;
    });
  }, [enrichedInvoices, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      "No Invoice",
      "Kode Reservasi",
      "Pelanggan",
      "Tanggal Reservasi",
      "Subtotal",
      "Pajak",
      "Total Tagihan",
      "Pembayaran Diterima",
      "Sisa Tagihan",
      "Status Pembayaran",
    ];
    const rows = filteredInvoices.map((i) => [
      i.invoice_number,
      i.reservations?.reservation_code || "-",
      `"${(i.reservations?.contact_name || "-").replace(/"/g, '""')}"`,
      i.reservations?.reservation_date || "-",
      i.subtotal,
      i.tax_amount,
      i.total_amount,
      i.paidAmount,
      i.remaining,
      i.payment_status,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-transaksi-lumiere-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-lumiere-gold">
            Administrator Dashboard
          </span>
          <h1 className="font-serif text-3xl font-bold text-lumiere-cream mt-1">
            Rekap Transaksi & Keuangan
          </h1>
          <p className="text-sm text-lumiere-muted mt-1">
            Pantau seluruh invoice, pembayaran DP maupun pelunasan, dan
            distribusi status reservasi.
          </p>
        </div>
        <button onClick={handleExportCsv} className="btn-secondary shrink-0">
          <Download className="w-4 h-4 text-lumiere-gold" />
          Ekspor CSV
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">Total Reservasi</div>
          <div className="text-2xl font-bold text-lumiere-cream mt-1">
            {summary.totalReservations}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            {summary.totalInvoices} invoice diterbitkan
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">
            Total Tagihan (Aktif)
          </div>
          <div className="text-2xl font-bold text-lumiere-gold mt-1">
            {formatIDR(summary.totalBilled)}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Termasuk pajak 10%
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">
            Total Pembayaran Diterima
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatIDR(summary.totalReceived)}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Transaksi berstatus berhasil
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-lumiere-muted">
            Sisa Tagihan Belum Lunas
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {formatIDR(summary.totalRemaining)}
          </div>
          <div className="text-[11px] text-lumiere-muted mt-1">
            Menunggu DP / pelunasan
          </div>
        </div>
      </div>

      {/* Status Distribution Strip */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-lumiere-muted uppercase tracking-wider mr-2">
          Distribusi Reservasi:
        </span>
        {Object.entries(summary.statusCounts).map(([st, count]) => (
          <span
            key={st}
            className="px-3 py-1 rounded-lg bg-obsidian-900 border border-white/10 text-lumiere-cream"
          >
            <span className="capitalize">{st.replace("_", " ")}</span>:{" "}
            <strong className="text-lumiere-gold">{count}</strong>
          </span>
        ))}
      </div>

      {/* Filter & Table */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-lumiere-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor invoice, kode reservasi, atau nama pelanggan..."
              className="input-dark pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-dark sm:w-52"
          >
            <option value="all">Semua Status Tagihan</option>
            <option value="belum_dibayar">Belum Dibayar</option>
            <option value="dp_dibayar">DP Dibayar</option>
            <option value="lunas">Lunas</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-lumiere-muted text-xs uppercase">
                <th className="py-3 px-3">No. Invoice / Reservasi</th>
                <th className="py-3 px-3">Pelanggan</th>
                <th className="py-3 px-3">Subtotal + Pajak</th>
                <th className="py-3 px-3">Total Tagihan</th>
                <th className="py-3 px-3">Diterima</th>
                <th className="py-3 px-3">Sisa</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-lumiere-muted">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-lumiere-muted">
                    Tidak ada transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3">
                      <div className="font-mono font-bold text-lumiere-cream">
                        {inv.invoice_number}
                      </div>
                      <div className="font-mono text-xs text-lumiere-gold">
                        {inv.reservations?.reservation_code}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-lumiere-cream">
                        {inv.reservations?.contact_name}
                      </div>
                      <div className="text-xs text-lumiere-muted">
                        {inv.reservations?.reservation_date
                          ? formatDateID(inv.reservations.reservation_date)
                          : "-"}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-lumiere-muted">
                      <div>Sub: {formatIDR(inv.subtotal)}</div>
                      <div>Pjk: {formatIDR(inv.tax_amount)}</div>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-lumiere-cream">
                      {formatIDR(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-emerald-400">
                      {formatIDR(inv.paidAmount)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-amber-300">
                      {formatIDR(inv.remaining)}
                    </td>
                    <td className="py-3.5 px-3 space-y-1">
                      <InvoiceStatusBadge status={inv.payment_status} />
                      {inv.reservations?.status && (
                        <div>
                          <ReservationStatusBadge
                            status={inv.reservations.status}
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {inv.reservations?.id && (
                        <Link
                          href={`/staf/reservasi/${inv.reservations.id}`}
                          className="inline-flex items-center gap-1 text-xs text-lumiere-gold hover:underline"
                        >
                          Detail <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
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
