"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Wine,
  UtensilsCrossed,
  Check,
  ArrowRight,
  Flame,
  Leaf,
  Layers,
  Heart,
  ChevronRight,
  Award,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";
import {
  CherryTomato,
  ChiliPod,
  BasilLeaf,
  RosemarySprig,
  PeppercornCluster,
} from "@/components/CulinaryAtmosphere";

export default function HomeSignatureShowcase() {
  const [selectedPlate, setSelectedPlate] = useState<"pasta" | "veloute">("pasta");

  return (
    <div className="space-y-28">
      {/* 1. THE PHILOSOPHY & FOUR PILLARS */}
      <section className="relative">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#09251F] border border-[#C8A96A]/35 text-[#C8A96A] text-xs font-serif uppercase tracking-[0.25em] shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96A]" />
            <span>The Culinary Philosophy</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F6F1] leading-tight">
            The Harmony of Haute Cuisine
          </h2>
          <p className="text-sm sm:text-base text-[#A2B8AF] leading-relaxed font-light">
            True culinary excellence is born from pure, authentic ingredients, deep respect
            for classic Italian gastronomy, and contemporary precision without compromise.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Ceramic Plate Presentation */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="absolute -top-4 -right-2 z-20 animate-float-slow hidden sm:block">
              <ChiliPod size={38} rotate={45} />
            </div>
            <div className="absolute top-1/2 -left-8 z-20 animate-float-reverse hidden sm:block">
              <BasilLeaf size={40} rotate={-30} />
            </div>
            <div className="absolute -bottom-6 left-6 z-10 pointer-events-none hidden sm:block">
              <PeppercornCluster />
            </div>

            <div className="relative w-72 h-72 sm:w-84 sm:h-84 rounded-full p-4 bg-gradient-to-br from-[#1C2824] via-[#0E1513] to-[#060B09] border-[5px] border-[#22332D] shadow-[0_25px_70px_rgba(0,0,0,0.9)] animate-float-slow">
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-inner border border-white/10">
                <Image
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=85"
                  alt="Insalata di Grani Antichi e Germogli"
                  fill
                  className="object-cover brightness-[0.95] contrast-[1.05]"
                  sizes="(max-width: 768px) 280px, 360px"
                />
              </div>
              <div className="absolute -inset-2 rounded-full border border-dashed border-[#C8A96A]/20 pointer-events-none" />
            </div>

            <div className="absolute -bottom-3 right-2 px-4 py-2 rounded-2xl bg-[#071F1A]/95 border border-[#C8A96A]/35 text-[#E6F0E9] text-xs font-serif shadow-2xl flex items-center gap-2 backdrop-blur-xl">
              <Leaf className="w-4 h-4 text-[#C8A96A]" />
              <span>Organic Micro-Greens & Amalfi Lemon</span>
            </div>
          </div>

          {/* Right: Four Pillars Card */}
          <div className="lg:col-span-7">
            <div className="glass-card p-6 sm:p-9 space-y-6 bg-[#071F1A]/90 border border-[#C8A96A]/25 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none">
                <ItalianCrest className="w-64 h-64" />
              </div>

              <div className="flex items-center justify-between border-b border-[#E6F0E9]/10 pb-5">
                <div>
                  <span className="text-[10px] font-serif font-bold uppercase tracking-[0.25em] text-[#C8A96A]">
                    ✦ The Four Pillars of Lumière ✦
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#F7F6F1] mt-0.5">
                    Foundations of Authentic Italian Flavor
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#0F3D34] border border-[#C8A96A]/40 flex items-center justify-center text-[#C8A96A] shadow-lg">
                  <Wine className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0F3D34]/50 border border-[#E6F0E9]/10 space-y-2 hover:border-[#C8A96A]/40 transition group">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Artisanal Pasta</span>
                  </div>
                  <h4 className="text-sm font-serif font-semibold text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                    Bronze-Drawn Daily
                  </h4>
                  <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
                    Crafted each morning using organic Italian durum semolina and certified
                    pasture-raised farm eggs.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0F3D34]/50 border border-[#E6F0E9]/10 space-y-2 hover:border-[#C8A96A]/40 transition group">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                    <Wine className="w-3.5 h-3.5" />
                    <span>Private Wine Cellar</span>
                  </div>
                  <h4 className="text-sm font-serif font-semibold text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                    Fine Vintages & Aperitifs
                  </h4>
                  <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
                    Curated rare reserves from Piedmont, Tuscany, and Veneto, alongside
                    bespoke vintage Negronis with fresh herbs.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0F3D34]/50 border border-[#E6F0E9]/10 space-y-2 hover:border-[#C8A96A]/40 transition group">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Intimate Atmosphere</span>
                  </div>
                  <h4 className="text-sm font-serif font-semibold text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                    Emerald Velvet & Live Piano
                  </h4>
                  <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
                    Dim candlelit ambiance, deep emerald velvet furnishings, and live acoustic
                    grand piano for an unforgettable evening.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0F3D34]/50 border border-[#E6F0E9]/10 space-y-2 hover:border-[#C8A96A]/40 transition group">
                  <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Exclusive VIP Suite</span>
                  </div>
                  <h4 className="text-sm font-serif font-semibold text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                    Salotto Privato (10 Guests)
                  </h4>
                  <p className="text-xs text-[#A2B8AF] font-light leading-relaxed">
                    A private dining room accompanied by a dedicated sommelier and butler
                    for distinguished gatherings and private celebrations.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E6F0E9]/10">
                <span className="text-xs text-[#A2B8AF] font-light">
                  Ready to experience this authentic culinary journey?
                </span>
                <Link
                  href="/reservasi"
                  className="inline-flex items-center gap-1.5 text-xs font-serif font-bold text-[#C8A96A] hover:underline"
                >
                  Choose Your Ideal Table <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEASONAL DUO WITH VINTAGE SILVER FORK */}
      <section className="relative rounded-3xl p-6 sm:p-12 bg-gradient-to-b from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/30 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="absolute -top-6 -right-3 z-10 pointer-events-none hidden lg:block">
          <RosemarySprig size={85} rotate={-25} />
        </div>
        <div className="absolute -bottom-6 -right-4 z-20 pointer-events-none hidden lg:block">
          <CherryTomato size={62} rotate={20} />
        </div>
        <div className="absolute -bottom-6 left-10 z-10 pointer-events-none hidden lg:block">
          <PeppercornCluster />
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-[#C8A96A]/8 blur-3xl pointer-events-none" />

        <div className="text-center max-w-xl mx-auto mb-12 space-y-2 relative z-10">
          <span className="text-xs font-serif font-bold uppercase tracking-[0.25em] text-[#C8A96A]">
            ✦ Iconic Seasonal Duo ✦
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F7F6F1]">
            Two Legendary Dishes of the Season
          </h2>
          <p className="text-xs sm:text-sm text-[#A2B8AF] font-light">
            A harmonious pairing of handmade San Marzano tagliolini and velvety autumnal soup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-8 items-center max-w-5xl mx-auto relative z-10">
          {/* PLATE 1: Pasta */}
          <div
            onClick={() => setSelectedPlate("pasta")}
            className={`md:col-span-5 p-6 rounded-3xl border transition-all duration-500 cursor-pointer ${
              selectedPlate === "pasta"
                ? "bg-[#0B2822]/90 border-[#C8A96A] shadow-2xl shadow-[#C8A96A]/15 scale-[1.02]"
                : "bg-[#071F1A]/60 border-[#E6F0E9]/10 hover:border-[#E6F0E9]/30"
            }`}
          >
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 mx-auto rounded-full p-3 bg-[#EBE7DF] border-4 border-[#D8D2C5] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group overflow-hidden">
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-inner">
                <Image
                  src="https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=85"
                  alt="Tagliolini al Pomodoro e Basilico Fresco"
                  fill
                  className="object-cover group-hover:scale-108 transition-transform duration-700 brightness-[0.97]"
                  sizes="(max-width: 768px) 220px, 300px"
                />
              </div>
            </div>

            <div className="text-center mt-6 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                  Primo Piatto
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96A]" />
                <span className="text-xs font-serif font-bold text-[#F7F6F1]">
                  Rp145.000
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#F7F6F1]">
                Tagliolini al Pomodoro di San Marzano
              </h3>
              <p className="text-xs text-[#A2B8AF] font-light leading-relaxed max-w-xs mx-auto">
                Handmade fresh pasta tossed in San Marzano DOP reduction, fresh Genovese
                basil leaves, 24-month Parmigiano Reggiano, and Tuscan extra virgin olive oil.
              </p>
            </div>
          </div>

          {/* CENTER: VINTAGE SILVER FORK */}
          <div className="md:col-span-1 hidden md:flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-44 flex items-center justify-center">
              <svg
                viewBox="0 0 24 96"
                className="w-9 h-40 text-[#E6F0E9]/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                fill="currentColor"
              >
                <path d="M7 6v18c0 2.5 1.5 4.5 4 5v36c0 1.5 1 2.5 2 2.5s2-1 2-2.5V29c2.5-.5 4-2.5 4-5V6c0-.5-.5-1-1-1s-1 .5-1 1v16h-1V6c0-.5-.5-1-1-1s-1 .5-1 1v16h-2V6c0-.5-.5-1-1-1s-1 .5-1 1v16h-1V6c0-.5-.5-1-1-1s-1 .5-1 1z" />
                <path d="M11 29h2v42c0 2-1 4-2 6-1-2-2-4-2-6V29z" opacity="0.9" />
              </svg>
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96A] font-serif font-bold">
              ✦ TASTING ✦
            </span>
          </div>

          {/* PLATE 2: GOURMET VELOUTÉ */}
          <div
            onClick={() => setSelectedPlate("veloute")}
            className={`md:col-span-5 p-6 rounded-3xl border transition-all duration-500 cursor-pointer ${
              selectedPlate === "veloute"
                ? "bg-[#0B2822]/90 border-[#C8A96A] shadow-2xl shadow-[#C8A96A]/15 scale-[1.02]"
                : "bg-[#071F1A]/60 border-[#E6F0E9]/10 hover:border-[#E6F0E9]/30"
            }`}
          >
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 mx-auto rounded-full p-3 bg-[#F4F1EC] border-4 border-[#E2DBD1] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group overflow-hidden">
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-inner">
                <Image
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85"
                  alt="Vellutata di Cavolfiore e Verdure Caramellate"
                  fill
                  className="object-cover group-hover:scale-108 transition-transform duration-700 brightness-[0.97]"
                  sizes="(max-width: 768px) 220px, 300px"
                />
              </div>
            </div>

            <div className="text-center mt-6 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-serif font-bold text-[#C8A96A] uppercase tracking-wider">
                  Zuppa Gourmet
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96A]" />
                <span className="text-xs font-serif font-bold text-[#F7F6F1]">
                  Rp165.000
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#F7F6F1]">
                Vellutata di Verdure & Fiori Commestibili
              </h3>
              <p className="text-xs text-[#A2B8AF] font-light leading-relaxed max-w-xs mx-auto">
                Silky cauliflower and cannellini bean puree with glazed baby carrots,
                sweet beets, crisp chickpeas, and delicate edible blossoms.
              </p>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <div className="mt-10 pt-6 border-t border-[#E6F0E9]/10 text-center relative z-10">
          <Link
            href="/reservasi"
            className="btn-primary px-9 py-4 shadow-xl shadow-[#C8A96A]/20 font-serif tracking-wide"
          >
            <span>Book Your Table</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
