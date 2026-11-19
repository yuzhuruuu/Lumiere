import React from "react";
import type {
  ReservationStatus,
  OrderStatus,
  InvoiceStatus,
  PaymentRecordStatus,
} from "@/types/database";

const RESERVATION_META: Record<
  ReservationStatus,
  { label: string; classes: string }
> = {
  menunggu_validasi: {
    label: "Menunggu Validasi",
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  dikonfirmasi: {
    label: "Dikonfirmasi",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  check_in: {
    label: "Check-In",
    classes: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  selesai: {
    label: "Selesai",
    classes: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  },
  ditolak: {
    label: "Ditolak",
    classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  dibatalkan: {
    label: "Dibatalkan",
    classes: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  tidak_hadir: {
    label: "Tidak Hadir",
    classes: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
};

const ORDER_META: Record<OrderStatus, { label: string; classes: string }> = {
  menunggu: {
    label: "Menunggu Dapur",
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  disiapkan: {
    label: "Sedang Disiapkan",
    classes: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  disajikan: {
    label: "Sudah Disajikan",
    classes: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  selesai: {
    label: "Pesanan Selesai",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  dibatalkan: {
    label: "Dibatalkan",
    classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

const INVOICE_META: Record<
  InvoiceStatus,
  { label: string; classes: string }
> = {
  belum_dibayar: {
    label: "Belum Dibayar",
    classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  dp_dibayar: {
    label: "DP Dibayar (50%)",
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  lunas: {
    label: "Lunas",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  dibatalkan: {
    label: "Dibatalkan",
    classes: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
};

const PAYMENT_META: Record<
  PaymentRecordStatus,
  { label: string; classes: string }
> = {
  menunggu: {
    label: "Menunggu",
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  berhasil: {
    label: "Berhasil",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  gagal: {
    label: "Gagal",
    classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const meta = RESERVATION_META[status] ?? {
    label: status,
    classes: "bg-zinc-700 text-zinc-200 border-zinc-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_META[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const meta = INVOICE_META[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentRecordStatus }) {
  const meta = PAYMENT_META[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}
