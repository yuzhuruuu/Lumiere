import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Sparkles } from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";

export default function Footer() {
  return (
    <footer className="border-t border-[#C8A96A]/20 bg-[#051511] text-[#A2B8AF] mt-24 print:hidden relative overflow-hidden">
      {/* Decorative ambient amber/gold glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-28 bg-[#C8A96A]/6 blur-3xl pointer-events-none" />

      {/* Background Crest Watermark */}
      <div className="absolute -bottom-16 -right-10 opacity-[0.03] pointer-events-none">
        <ItalianCrest className="w-80 h-80" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C8A96A] via-[#B39355] to-[#8C6D32] p-[1.5px] shadow-lg shadow-[#C8A96A]/20">
              <div className="w-full h-full rounded-[14px] bg-[#071F1A] flex items-center justify-center font-serif text-lg font-bold text-[#C8A96A]">
                L
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-wide text-[#F7F6F1]">
                  Lumière
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-serif text-[#C8A96A] font-semibold border border-[#C8A96A]/30 px-1.5 py-0.5 rounded bg-[#C8A96A]/10">
                  Ristorante
                </span>
              </div>
              <span className="block text-[9px] uppercase tracking-[0.25em] text-[#C8A96A] font-medium font-serif">
                Fine Dining & Lounge · Est. MMXXVI
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#A2B8AF] font-light max-w-sm">
            An extraordinary fine dining experience set in deep emerald velvet ambiance.
            Crafted pasta, historic vintage cellars, and an architectural 2D table booking system.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#C8A96A] font-serif">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Firenze · Milano · Semarang</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-serif font-bold uppercase tracking-[0.25em] text-[#F7F6F1] mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96A]" />
            Navigation
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm font-light">
            <li>
              <Link href="/" className="hover:text-[#C8A96A] transition font-serif">
                Home & Experience
              </Link>
            </li>
            <li>
              <Link href="/menu" className="hover:text-[#C8A96A] transition font-serif">
                Culinary Menu
              </Link>
            </li>
            <li>
              <Link
                href="/reservasi"
                className="hover:text-[#C8A96A] transition font-serif"
              >
                Table Reservation & 2D Floor Plan
              </Link>
            </li>
            <li>
              <Link
                href="/riwayat"
                className="hover:text-[#C8A96A] transition font-serif"
              >
                My Reservations & Digital Pass
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-serif font-bold uppercase tracking-[0.25em] text-[#F7F6F1] mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96A]" />
            Concierge & Hours
          </h3>
          <ul className="space-y-3.5 text-xs sm:text-sm font-light">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#C8A96A] shrink-0 mt-0.5" />
              <span>Jl. Pemuda No. 18, Semarang, Jawa Tengah</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#C8A96A] shrink-0" />
              <span>0812-3456-7890 (Concierge Desk)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#C8A96A] shrink-0" />
              <span>concierge@lumiere.resto</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#C8A96A] shrink-0" />
              <span>Daily Hours: 11:00 – 23:00 WIB</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#C8A96A]/15 py-6 text-center text-xs text-[#A2B8AF]/70 font-light">
        <p>
          © {new Date().getFullYear()} Lumière Ristorante e Lounge Bar. Founded MMXXVI.
          All rights reserved.
        </p>
      </div>
    </footer>
  );
}
