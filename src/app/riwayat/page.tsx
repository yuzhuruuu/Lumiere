"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  formatDateID,
  formatIDR,
  formatTimeShort,
  getEndTime,
} from "@/lib/utils";
import {
  ReservationStatusBadge,
  InvoiceStatusBadge,
} from "@/components/StatusBadge";
import type { Reservation, Invoice } from "@/types/database";
import {
  CalendarPlus,
  QrCode,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";

type ReservationWithRelations = Reservation & {
  invoices?: Invoice[] | Invoice | null;
};

export default function RiwayatPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("reservations")
        .select("*, dining_tables(code, area), invoices(*)")
        .eq("customer_id", user.id)
        .order("reservation_date", { ascending: false })
        .order("start_time", { ascending: false });

      setReservations((data as ReservationWithRelations[]) || []);
      setLoading(false);
    }
    loadHistory();
  }, []);

  const filtered =
    statusFilter === "all"
      ? reservations
      : reservations.filter((r) => r.status === statusFilter);

  return (
    <div className="min-h-screen bg-[#071F1A] py-12 relative overflow-hidden">
      {/* Deep Moody Ambient Glows */}
      <div className="absolute top-10 right-1/4 w-[450px] h-[450px] rounded-full bg-[#134E43]/20 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] rounded-full bg-[#C8A96A]/8 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        {/* Editorial Header */}
        <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#071F1A] border border-[#C8A96A]/35 text-[#C8A96A] text-xs font-serif uppercase tracking-[0.25em]">
                <ItalianCrest className="w-3.5 h-3.5" />
                <span>My Reservations · Guest Registry</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F7F6F1]">
                Reservation History
              </h1>
              <p className="text-xs sm:text-sm text-[#A2B8AF] font-light max-w-xl leading-relaxed">
                Track status updates from our Concierge, view your digital barcode pass for seamless arrival,
                and review your pre-ordered menu selections.
              </p>
            </div>
            <Link
              href="/reservasi"
              className="btn-primary text-sm px-6 py-3.5 shadow-xl shadow-[#C8A96A]/20 shrink-0 font-serif tracking-wide"
            >
              <CalendarPlus className="w-4 h-4 text-[#0F3D34]" />
              <span>New Reservation</span>
            </Link>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { val: "all", label: "All" },
            { val: "menunggu_validasi", label: "Pending Validation" },
            { val: "dikonfirmasi", label: "Confirmed" },
            { val: "check_in", label: "Checked In" },
            { val: "selesai", label: "Completed" },
            { val: "dibatalkan", label: "Cancelled" },
            { val: "ditolak", label: "Declined" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-4 py-2 rounded-2xl text-xs font-serif whitespace-nowrap transition-all duration-200 active:scale-95 ${
                statusFilter === tab.val
                  ? "bg-[#C8A96A] text-[#071F1A] font-bold shadow-md shadow-[#C8A96A]/20"
                  : "bg-[#051511] text-[#A2B8AF] hover:text-[#F7F6F1] border border-[#E6F0E9]/10 hover:border-[#C8A96A]/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card h-32 animate-pulse bg-[#0B2822]/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-14 text-center space-y-4 bg-[#071F1A]/85 border-[#C8A96A]/20">
            <ItalianCrest className="w-12 h-12 text-[#C8A96A] mx-auto opacity-50" />
            <p className="text-lg font-serif font-bold text-[#F7F6F1]">
              No Reservations Found
            </p>
            <p className="text-xs sm:text-sm text-[#A2B8AF] font-light max-w-sm mx-auto">
              You do not have any reservations in this category. Book your dining experience today.
            </p>
            <div className="pt-2">
              <Link href="/reservasi" className="btn-primary px-7 py-3.5 font-serif text-sm">
                Book a Table
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => {
              const inv = Array.isArray(r.invoices) ? r.invoices[0] : r.invoices || null;
              return (
                <Link
                  key={r.id}
                  href={`/riwayat/${r.id}`}
                  className="glass-card p-6 block hover:border-[#C8A96A]/60 hover:-translate-y-1 transition-all duration-300 group shadow-lg bg-[#071F1A]/90 border-[#C8A96A]/25"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-[#C8A96A] bg-[#C8A96A]/10 px-3 py-1 rounded-xl border border-[#C8A96A]/30 tracking-wider">
                          {r.reservation_code}
                        </span>
                        <ReservationStatusBadge status={r.status} />
                        {inv && <InvoiceStatusBadge status={inv.payment_status} />}
                      </div>

                      <div className="text-lg font-serif font-bold text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                        {formatDateID(r.reservation_date)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#A2B8AF] font-light">
                        <span className="inline-flex items-center gap-1.5 font-serif">
                          <Clock className="w-3.5 h-3.5 text-[#C8A96A]" />
                          {formatTimeShort(r.start_time)} –{" "}
                          {getEndTime(
                            formatTimeShort(r.start_time),
                            r.duration_minutes
                          )}{" "}
                          WIB
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-serif">
                          <Users className="w-3.5 h-3.5 text-[#C8A96A]" />
                          {r.guest_count} Guests · Table {r.dining_tables?.code} (
                          {r.dining_tables?.area})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#E6F0E9]/10">
                      <div className="text-left sm:text-right">
                        {inv ? (
                          <>
                            <div className="text-[10px] uppercase font-serif tracking-widest text-[#C8A96A]">
                              Total Bill
                            </div>
                            <div className="text-base font-serif font-bold text-[#F7F6F1]">
                              {formatIDR(inv.total_amount)}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-[#C8A96A] font-serif flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-[#C8A96A]" />
                            <span>View Digital Pass</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#A2B8AF] group-hover:text-[#C8A96A] group-hover:translate-x-1 transition" />
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
