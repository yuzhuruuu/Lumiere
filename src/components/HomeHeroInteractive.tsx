"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarPlus,
  UtensilsCrossed,
  Sparkles,
  Star,
  Award,
  ArrowRight,
  Wine,
  Leaf,
  Clock,
  Flame,
  CheckCircle2,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";
import {
  ChiliPod,
  BasilLeaf,
  PeppercornCluster,
} from "@/components/CulinaryAtmosphere";

interface DishHighlight {
  id: "truffle" | "pasta" | "fiorentina";
  badge: string;
  name: string;
  italianTitle: string;
  price: string;
  description: string;
  provenance: string;
  winePairing: string;
  wineNote: string;
  imageUrl: string;
  category: string;
}

const DISH_HIGHLIGHTS: DishHighlight[] = [
  {
    id: "truffle",
    badge: "✦ Chef's Signature · Alba White Truffle",
    name: "Insalata Gourmet con Uovo al Tartufo",
    italianTitle: "Uovo Morbido al Tartufo Bianco d'Alba",
    price: "Rp 185.000",
    description:
      "Organic free-range egg gently cooked sous-vide at 63°C, resting on Tuscan chickpea velouté, candied Pachino tomatoes, and shaved Alba white truffle.",
    provenance: "Tartufo Bianco d'Alba & Tuscan IGP Olive Oil",
    winePairing: "Barolo DOCG 2018 · Cantina Ceretto",
    wineNote: "Delicate notes of dried rose, macerated cherry, and rich earthy forest undergrowth.",
    imageUrl:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85",
    category: "Warm Antipasto",
  },
  {
    id: "pasta",
    badge: "✦ Handmade Fresh · Bronze-Drawn",
    name: "Tagliolini al Tartufo & Parmigiano 24 Mesi",
    italianTitle: "Tagliolini Freschi all'Uovo con Burro di Malga",
    price: "Rp 215.000",
    description:
      "Fresh egg pasta handmade daily by our master pastaio, tossed with alpine churned butter, capon broth, and 24-month aged Parmigiano Reggiano DOP.",
    provenance: "Pugliese Durum Semolina & Alpine Churned Butter",
    winePairing: "Brunello di Montalcino DOCG 2017 · Biondi-Santi",
    wineNote: "Vibrant acidity, silky tannins, and an intricate bouquet of dark leather and vanilla.",
    imageUrl:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=85",
    category: "Signature Primo",
  },
  {
    id: "fiorentina",
    badge: "✦ Wood-Fired Grill · 45-Day Dry Aged",
    name: "Tagliata di Manzo al Rosmarino e Sale di Cervia",
    italianTitle: "Bistecca alla Brace con Riduzione al Balsamico",
    price: "Rp 340.000",
    description:
      "Prime beef cut dry-aged for 45 days, seared over Tuscan beechwood charcoal with fresh rosemary sprigs, aged Modena balsamico glaze, and sweet Cervia sea salt.",
    provenance: "Dry-Aged Prime Beef & 12-Year Balsamico di Modena",
    winePairing: "Amarone della Valpolicella Classico DOCG 2016",
    wineNote: "Velvety body with layered nuances of dried plum, dark cocoa, and warm spices.",
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
    category: "Noble Secondo",
  },
];

export default function HomeHeroInteractive({
  minOrderAmount,
  dpPercentage,
}: {
  minOrderAmount: number;
  dpPercentage: number;
}) {
  const [activeHighlightId, setActiveHighlightId] = useState<"truffle" | "pasta" | "fiorentina">("truffle");

  const currentDish = DISH_HIGHLIGHTS.find((d) => d.id === activeHighlightId) || DISH_HIGHLIGHTS[0];

  return (
    <div className="relative">
      {/* Background Architectural Watermark */}
      <div className="absolute -top-16 -left-12 opacity-[0.035] pointer-events-none select-none">
        <ItalianCrest className="w-96 h-96" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center relative z-10">
        {/* LEFT COLUMN: EDITORIAL ITALIAN HEADLINE & DETAILS */}
        <div className="lg:col-span-7 space-y-8">
          {/* Italian Luxury Sub-Header Pill */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#09251F]/90 border border-[#C8A96A]/30 backdrop-blur-xl shadow-lg">
            <ItalianCrest className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-serif tracking-[0.25em] uppercase text-[#C8A96A] font-medium">
              Ristorante e Lounge Bar · Est. MMXXVI
            </span>
          </div>

          {/* Monumental Display Headline */}
          <div className="space-y-3">
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-[#F7F6F1] leading-[0.98]">
              L'Arte della <br />
              <span className="italic font-normal text-[#C8A96A] font-serif inline-block hover:scale-[1.01] transition-transform">
                Cucina Italiana.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-[#A2B8AF] leading-relaxed max-w-xl font-light pt-2">
              An extraordinary fine dining experience set in deep emerald velvet ambiance.
              From fresh handmade pasta tossed with Alba white truffles, Tuscan wood-fired steaks,
              to rare vintage reserves from historic Chianti cellars.
            </p>
          </div>

          {/* Culinary Master & Sommelier Endorsement Box */}
          <div className="flex flex-wrap items-center gap-4 py-1">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#09251F]/80 border border-[#C8A96A]/25 backdrop-blur-md shadow-md">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C8A96A] via-[#B39355] to-[#8C6D32] p-[1.5px] shadow-lg">
                <div className="w-full h-full rounded-[10px] bg-[#071F1A] flex items-center justify-center font-serif text-sm font-bold text-[#C8A96A]">
                  MB
                </div>
              </div>
              <div>
                <div className="text-xs font-serif font-bold text-[#F7F6F1] tracking-wide">
                  Maestro Marco Bertolli
                </div>
                <div className="text-[11px] text-[#C8A96A] flex items-center gap-1 font-medium font-serif">
                  <Award className="w-3.5 h-3.5" />
                  <span>Executive Culinary Director · Firenze</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#09251F]/60 border border-[#E6F0E9]/10 text-xs text-[#A2B8AF]">
              <div className="flex text-[#C8A96A]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#C8A96A]" />
                ))}
              </div>
              <span className="font-serif font-bold text-[#F7F6F1]">4.95 / 5.0</span>
              <span className="text-[11px] text-[#A2B8AF] font-serif">· Culinary Guide Rating</span>
            </div>
          </div>

          {/* Interactive Dish Degustation Tabs */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-serif tracking-[0.2em] text-[#C8A96A]">
              ✦ Chef's Tasting Selection (Select Course to Preview)
            </div>
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#051511]/90 border border-[#C8A96A]/25">
              {DISH_HIGHLIGHTS.map((dish) => {
                const isActive = activeHighlightId === dish.id;
                return (
                  <button
                    key={dish.id}
                    onClick={() => setActiveHighlightId(dish.id)}
                    className={`px-3 py-2.5 rounded-xl text-left transition-all duration-300 text-xs font-serif ${
                      isActive
                        ? "bg-[#C8A96A] text-[#071F1A] font-bold shadow-lg shadow-[#C8A96A]/25"
                        : "text-[#A2B8AF] hover:text-[#F7F6F1] hover:bg-white/5"
                    }`}
                  >
                    <span className="block text-[9px] uppercase tracking-wider opacity-80">
                      {dish.category}
                    </span>
                    <span className="block truncate font-semibold mt-0.5">
                      {dish.id === "truffle" ? "Tartufo Bianco" : dish.id === "pasta" ? "Tagliolini Freschi" : "Tagliata Fiorentina"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Luxury CTA Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href="/reservasi"
              className="btn-primary text-base px-8 py-4 shadow-2xl shadow-[#C8A96A]/25 hover:shadow-[#C8A96A]/40 group font-serif tracking-wide"
            >
              <CalendarPlus className="w-5 h-5 text-[#0F3D34]" />
              <span>Book a Table</span>
              <ArrowRight className="w-4 h-4 text-[#0F3D34] group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/menu"
              className="btn-secondary text-base px-7 py-4 text-[#F7F6F1] hover:border-[#C8A96A] font-serif tracking-wide"
            >
              <UtensilsCrossed className="w-5 h-5 text-[#C8A96A]" />
              <span>Explore Menu</span>
            </Link>
          </div>

          {/* Heritage Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3.5 rounded-2xl bg-[#09251F]/70 border border-[#E6F0E9]/10 backdrop-blur-md hover:border-[#C8A96A]/30 transition">
              <div className="text-[10px] uppercase tracking-wider text-[#A2B8AF] font-serif">Handmade Pasta</div>
              <div className="text-xs font-serif font-bold text-[#C8A96A] mt-1">
                Bronze-Drawn Daily
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#09251F]/70 border border-[#E6F0E9]/10 backdrop-blur-md hover:border-[#C8A96A]/30 transition">
              <div className="text-[10px] uppercase tracking-wider text-[#A2B8AF] font-serif">Aged Ingredients</div>
              <div className="text-xs font-serif font-bold text-[#F7F6F1] mt-1">
                Parmigiano 24 Months
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#09251F]/70 border border-[#E6F0E9]/10 backdrop-blur-md hover:border-[#C8A96A]/30 transition">
              <div className="text-[10px] uppercase tracking-wider text-[#A2B8AF] font-serif">Wine Cellar</div>
              <div className="text-xs font-serif font-bold text-[#E6F0E9] mt-1">
                80+ Rare Vintages
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#09251F]/70 border border-[#E6F0E9]/10 backdrop-blur-md hover:border-[#C8A96A]/30 transition">
              <div className="text-[10px] uppercase tracking-wider text-[#A2B8AF] font-serif">Interactive Seating</div>
              <div className="text-xs font-serif font-bold text-[#C8A96A] mt-1">
                2D Floor Plan
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DARK MOODY DISH PRESENTATION WITH SOMMELIER PAIRING */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          {/* Candlelit & Emerald Amber Glows */}
          <div className="absolute w-96 h-96 rounded-full bg-[#C8A96A]/12 blur-[120px] pointer-events-none -top-10 -right-10" />
          <div className="absolute w-80 h-80 rounded-full bg-[#071F1A] blur-[90px] pointer-events-none bottom-0 left-0" />

          {/* Floating Wine Pairing Stamp (Top Left) */}
          <div className="absolute -top-6 -left-2 z-20 animate-float-slow">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#071F1A]/95 border border-[#C8A96A]/40 text-xs shadow-2xl backdrop-blur-xl">
              <Wine className="w-4 h-4 text-[#C8A96A]" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#C8A96A] font-bold font-serif">
                  Sommelier Wine Pairing
                </div>
                <div className="text-[11px] font-serif text-[#F7F6F1]">
                  {currentDish.winePairing}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Certified Provenance Stamp (Bottom Right) */}
          <div className="absolute -bottom-8 -right-2 z-20 animate-float-reverse">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#071F1A]/95 border border-[#E6F0E9]/25 text-xs shadow-2xl backdrop-blur-xl">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold font-serif">
                  Certified Provenance
                </div>
                <div className="text-[11px] font-serif text-[#F7F6F1]">
                  {currentDish.provenance}
                </div>
              </div>
            </div>
          </div>

          {/* Central Dish Plate on Volcanic Black Charger Plate */}
          <div className="relative group p-4 sm:p-6">
            {/* SCATTERED CULINARY ACCENTS */}
            <div className="absolute -top-3 right-6 z-20 animate-float-slow hidden sm:block">
              <ChiliPod size={42} rotate={38} />
            </div>
            <div className="absolute top-16 -right-8 z-20 animate-float-reverse hidden sm:block">
              <ChiliPod size={46} rotate={72} />
            </div>
            <div className="absolute top-1/2 -right-12 z-20 animate-float-slow hidden sm:block">
              <ChiliPod size={40} rotate={105} />
            </div>
            <div className="absolute bottom-16 -right-7 z-20 animate-float-reverse hidden sm:block">
              <ChiliPod size={44} rotate={135} />
            </div>
            <div className="absolute -top-6 left-12 z-20 animate-float-reverse hidden sm:block">
              <ChiliPod size={38} rotate={-35} />
            </div>
            <div className="absolute bottom-20 -left-8 z-20 animate-float-slow hidden sm:block">
              <ChiliPod size={42} rotate={-65} />
            </div>

            <div className="absolute -top-8 right-28 z-20 animate-float-slow hidden sm:block">
              <BasilLeaf size={48} rotate={24} />
            </div>
            <div className="absolute top-1/3 -left-10 z-20 animate-float-reverse hidden sm:block">
              <BasilLeaf size={42} rotate={-50} />
            </div>
            <div className="absolute bottom-6 -left-6 z-20 animate-float-slow hidden sm:block">
              <BasilLeaf size={38} rotate={15} />
            </div>

            <div className="absolute top-8 -right-6 z-10 pointer-events-none hidden sm:block">
              <PeppercornCluster />
            </div>
            <div className="absolute bottom-16 -left-12 z-10 pointer-events-none hidden sm:block">
              <PeppercornCluster />
            </div>

            {/* Charger Plate with Textured Volcanic Rim */}
            <div className="relative w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full p-4 sm:p-5 bg-gradient-to-br from-[#1A2521] via-[#0E1513] to-[#060B09] border-[6px] border-[#22332D] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] transition-all duration-700 group-hover:border-[#C8A96A]/50 group-hover:scale-[1.02]">
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-dashed border-[#C8A96A]/25 pointer-events-none animate-spin-slow" />

              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border border-white/10">
                <Image
                  key={currentDish.id}
                  src={currentDish.imageUrl}
                  alt={currentDish.name}
                  fill
                  priority
                  className="object-cover group-hover:scale-110 transition-transform duration-700 brightness-[0.95] contrast-[1.05]"
                  sizes="(max-width: 768px) 320px, 420px"
                />
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/50 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
