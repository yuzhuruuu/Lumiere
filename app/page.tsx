import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  DAY_NAMES_ID,
  formatIDR,
  formatTimeShort,
  getMenuItemImageUrl,
} from "@/lib/utils";
import type {
  RestaurantProfile,
  OperatingHour,
  MenuItem,
  DiningTable,
} from "@/types/database";
import {
  CalendarPlus,
  UtensilsCrossed,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  QrCode,
  ArrowRight,
  Wine,
  Leaf,
  Layers,
  Star,
  Compass,
} from "lucide-react";
import HomeHeroInteractive from "@/components/HomeHeroInteractive";
import HomeSignatureShowcase from "@/components/HomeSignatureShowcase";
import ScrollReveal from "@/components/ScrollReveal";
import ItalianCrest from "@/components/ItalianCrest";
import {
  CherryTomato,
  ChiliPod,
  BasilLeaf,
  RosemarySprig,
  PeppercornCluster,
  StudioLightingOverlay,
} from "@/components/CulinaryAtmosphere";

export const dynamic = "force-dynamic";

const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function HomePage() {
  const supabase = await createClient();

  const [profileRes, hoursRes, menuRes, tablesRes] = await Promise.all([
    supabase.from("restaurant_profile").select("*").eq("id", 1).single(),
    supabase
      .from("operating_hours")
      .select("*")
      .order("day_of_week", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*, menu_categories(name)")
      .eq("is_available", true)
      .order("id", { ascending: true })
      .limit(6),
    supabase
      .from("dining_tables")
      .select("*")
      .eq("is_active", true)
      .order("capacity", { ascending: true }),
  ]);

  const restaurant = (profileRes.data as RestaurantProfile | null) ?? {
    id: 1,
    name: "Lumière Ristorante e Lounge Bar",
    tagline: "Fine Italian Dining · Est. MMXXVI",
    description:
      "An exquisite celebration of Italian cuisine in a deep emerald velvet ambiance. Featuring handcrafted pasta, rare vintage wines, and an interactive 2D table booking experience.",
    address: "Jl. Pemuda No. 18, Semarang, Jawa Tengah",
    latitude: null,
    longitude: null,
    phone: "081234567890",
    email: "concierge@lumiere.resto",
    logo_path: null,
    cover_photo_path: null,
    min_order_amount: 300000,
    dp_percentage: 50,
    tax_percentage: 10,
    pending_timeout_minutes: 30,
    updated_at: new Date().toISOString(),
  };

  const hours = (hoursRes.data as OperatingHour[]) || [];
  const featuredMenus = (menuRes.data as MenuItem[]) || [];
  const tables = (tablesRes.data as DiningTable[]) || [];

  // Group tables by area
  const areaSummary = tables.reduce<
    Record<string, { count: number; minCap: number; maxCap: number }>
  >((acc, t) => {
    const area = t.area || "Indoor";
    if (!acc[area]) {
      acc[area] = { count: 0, minCap: t.capacity, maxCap: t.capacity };
    }
    acc[area].count += 1;
    acc[area].minCap = Math.min(acc[area].minCap, t.capacity);
    acc[area].maxCap = Math.max(acc[area].maxCap, t.capacity);
    return acc;
  }, {});

  return (
    <div className="space-y-32 pb-20 relative overflow-hidden bg-[#071F1A]">
      {/* Studio Lighting Overlay */}
      <StudioLightingOverlay />

      {/* 1. HERO SECTION */}
      <section className="relative pt-10 sm:pt-16 pb-16 lg:pb-24 border-b border-[#C8A96A]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="fade" delayMs={50}>
            <HomeHeroInteractive
              minOrderAmount={restaurant.min_order_amount}
              dpPercentage={restaurant.dp_percentage}
            />
          </ScrollReveal>
        </div>
      </section>

      {/* 2. SIGNATURE SHOWCASE & DUAL PLATE DISPLAY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" delayMs={100}>
          <HomeSignatureShowcase />
        </ScrollReveal>
      </section>

      {/* 3. INTERACTIVE 2D FLOOR PLAN TEASER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute -top-10 -right-4 z-20 hidden md:block animate-float-slow">
          <CherryTomato size={68} rotate={18} />
        </div>
        <div className="absolute -bottom-8 -left-4 z-20 hidden md:block animate-float-reverse">
          <BasilLeaf size={44} rotate={-35} />
        </div>
        <div className="absolute -top-14 left-1/3 z-10 pointer-events-none hidden md:block">
          <PeppercornCluster />
        </div>

        <ScrollReveal direction="up" delayMs={120}>
          <div className="relative rounded-3xl p-6 sm:p-12 bg-gradient-to-br from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/35 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden group">
            <div className="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none">
              <ItalianCrest className="w-80 h-80" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#071F1A] border border-[#C8A96A]/35 text-[#C8A96A] text-xs font-serif uppercase tracking-[0.25em]">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Floor Plan · Your Reserved Seat</span>
                </div>

                <div className="space-y-2">
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F7F6F1] leading-tight">
                    Choose Your Favorite Table <br />
                    <span className="italic font-normal text-[#C8A96A] font-serif">
                      Just Like Booking Cinema Seats.
                    </span>
                  </h2>
                  <p className="text-sm text-[#A2B8AF] font-light leading-relaxed max-w-xl pt-1">
                    Experience our interactive 2D architectural seating map.
                    Select the exact atmosphere you desire: near the grand piano in the
                    *Sala Principale*, the open breeze of the *Terrazza Giardino*, or the
                    total privacy of the *Salotto Privato VIP*.
                  </p>
                </div>

                {/* Hall Badges */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <span className="px-3.5 py-2 rounded-2xl bg-[#071F1A] border border-[#C8A96A]/25 text-xs text-[#F7F6F1] flex items-center gap-2 font-serif">
                    <span className="w-2 h-2 rounded-full bg-[#C8A96A]" />
                    Salotto VIP (10 Guests)
                  </span>
                  <span className="px-3.5 py-2 rounded-2xl bg-[#071F1A] border border-[#E6F0E9]/15 text-xs text-[#F7F6F1] flex items-center gap-2 font-serif">
                    <span className="w-2 h-2 rounded-full bg-[#E6F0E9]" />
                    Sala Principale & Live Jazz (2–4 Guests)
                  </span>
                  <span className="px-3.5 py-2 rounded-2xl bg-[#071F1A] border border-[#E6F0E9]/15 text-xs text-[#F7F6F1] flex items-center gap-2 font-serif">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Terrazza Giardino (4–6 Guests)
                  </span>
                </div>

                <div className="pt-2">
                  <Link
                    href="/reservasi"
                    className="btn-primary text-base px-8 py-4 shadow-xl shadow-[#C8A96A]/25 hover:shadow-[#C8A96A]/40 font-serif tracking-wide"
                  >
                    <Layers className="w-4 h-4 text-[#0F3D34]" />
                    <span>Open Floor Plan & Reserve Table</span>
                    <ArrowRight className="w-4 h-4 text-[#0F3D34]" />
                  </Link>
                </div>
              </div>

              {/* Simulation Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="p-6 rounded-3xl bg-[#051511]/95 border border-[#C8A96A]/30 shadow-2xl max-w-sm w-full space-y-5">
                  <div className="text-center pb-3 border-b border-[#E6F0E9]/10">
                    <span className="text-[10px] font-serif font-bold tracking-[0.25em] uppercase text-[#C8A96A]">
                      ✦ Real-Time Seating Map ✦
                    </span>
                    <div className="text-xs font-serif text-[#F7F6F1] mt-1">
                      🍸 Bar Counter & Grand Piano Stage 🍸
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 place-items-center py-2">
                    <div className="p-3 rounded-2xl bg-[#09251F] border border-[#C8A96A]/40 text-center w-full shadow-md">
                      <span className="text-xs font-serif font-bold text-[#C8A96A] block">T01</span>
                      <span className="text-[9px] text-[#F7F6F1]">2 Seats</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#C8A96A] via-[#D6B87B] to-[#B39355] text-center w-full text-[#071F1A] font-bold shadow-xl shadow-[#C8A96A]/35 scale-105">
                      <span className="text-xs font-serif font-bold block">T08</span>
                      <span className="text-[9px] uppercase tracking-wider">Selected</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-center w-full opacity-60">
                      <span className="text-xs font-serif font-bold text-rose-400 block">T12</span>
                      <span className="text-[9px] text-rose-400">Reserved</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#071F1A] border border-[#E6F0E9]/10 text-center text-[11px] text-[#A2B8AF] font-light">
                    ✓ Table availability automatically synced with our live booking database.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. RESERVATION EXPERIENCE STEPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" delayMs={80}>
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-serif font-bold uppercase tracking-[0.25em] text-[#C8A96A]">
              ✦ The Reservation Experience ✦
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F6F1]">
              Four Steps to Your Table
            </h2>
            <p className="text-xs sm:text-sm text-[#A2B8AF] font-light">
              An elegant, streamlined digital reservation confirmed instantly.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "I",
              title: "Date & Guests",
              desc: "Select date, dining time, party size, and visit duration (30–240 minutes).",
            },
            {
              step: "II",
              title: "Choose Table",
              desc: "Explore the 2D layout and pick your seat in Sala Principale, Terrace, or VIP Suite.",
            },
            {
              step: "III",
              title: "Pre-Order Menu",
              desc: `Curate your courses with a minimum subtotal of ${formatIDR(
                restaurant.min_order_amount
              )}.`,
            },
            {
              step: "IV",
              title: "Digital Ticket",
              desc: "Receive an instant digital barcode pass for seamless VIP check-in upon arrival.",
            },
          ].map((item, idx) => (
            <ScrollReveal key={item.step} direction="up" delayMs={idx * 90}>
              <div className="glass-card p-7 relative overflow-hidden group hover:border-[#C8A96A]/50 transition-all duration-300 h-full bg-[#071F1A]/85 border-[#C8A96A]/20">
                <span className="font-serif text-5xl font-bold text-[#C8A96A]/20 group-hover:text-[#C8A96A]/35 transition-colors">
                  {item.step}
                </span>
                <h3 className="text-lg font-serif font-bold text-[#F7F6F1] mt-3">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#A2B8AF] mt-2 font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* 5. FEATURED MENU SECTION WITH MATCHING DISH IMAGES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute -bottom-16 -left-6 z-20 flex items-end gap-1.5 pointer-events-none hidden lg:flex">
          <CherryTomato size={82} rotate={-10} />
          <CherryTomato size={56} rotate={32} className="-ml-5 -mb-2" />
        </div>
        <div className="absolute -bottom-12 left-44 z-10 hidden lg:block pointer-events-none">
          <RosemarySprig size={105} rotate={50} />
        </div>
        <div className="absolute -top-10 right-14 z-20 hidden sm:block animate-float-slow">
          <BasilLeaf size={48} rotate={-20} />
        </div>
        <div className="absolute -bottom-6 left-56 z-10 pointer-events-none hidden lg:block">
          <PeppercornCluster />
        </div>

        <ScrollReveal direction="up" delayMs={80}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-serif font-bold uppercase tracking-[0.25em] text-[#C8A96A]">
                ✦ Chef&apos;s Selection ✦
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F7F6F1] mt-1">
                Featured Culinary Creations
              </h2>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 text-sm font-serif font-bold text-[#C8A96A] hover:text-[#D6B87B] transition group"
            >
              <span>View Full Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {featuredMenus.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-[#A2B8AF]">
            Menu items currently unavailable.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {featuredMenus.map((item, idx) => {
              // Guaranteed matching food image using our curated fallback system
              const photoUrl = getMenuItemImageUrl(item.photo_path, item.name);
              return (
                <ScrollReveal key={item.id} direction="up" delayMs={idx * 75}>
                  <div className="glass-card overflow-hidden flex flex-col justify-between group hover:border-[#C8A96A]/60 transition-all duration-500 h-full bg-[#071F1A]/85 border-[#C8A96A]/20 shadow-xl">
                    <div>
                      <div className="h-52 bg-[#051511] relative overflow-hidden flex items-center justify-center">
                        <img
                          src={photoUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition duration-700 brightness-[0.95] contrast-[1.05]"
                        />
                        {item.menu_categories?.name && (
                          <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-xl bg-[#071F1A]/95 backdrop-blur text-[11px] font-serif font-bold text-[#C8A96A] border border-[#C8A96A]/30">
                            {item.menu_categories.name}
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                            {item.name}
                          </h3>
                          <span className="font-serif font-bold text-base text-[#C8A96A] shrink-0">
                            {formatIDR(item.price)}
                          </span>
                        </div>
                        <p className="text-xs text-[#A2B8AF] mt-2 line-clamp-2 font-light leading-relaxed">
                          {item.description || "A culinary masterpiece from Lumière's main kitchen."}
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-5 pt-3 border-t border-[#E6F0E9]/10 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </span>
                      <Link
                        href="/reservasi"
                        className="text-[#C8A96A] hover:underline font-serif font-bold flex items-center gap-1"
                      >
                        Order with Reservation →
                      </Link>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. OPERATING HOURS, SEATING & CONCIERGE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Opening Hours */}
        <ScrollReveal direction="up" delayMs={100}>
          <div className="glass-card p-7 sm:p-8 h-full flex flex-col justify-between bg-[#071F1A]/85 border-[#C8A96A]/20">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E6F0E9]/10">
                <Clock className="w-5 h-5 text-[#C8A96A]" />
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#F7F6F1]">
                    Opening Hours
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#C8A96A] font-serif">
                    Daily Schedule
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[#E6F0E9]/10 text-sm">
                {hours.length > 0 ? (
                  hours.map((h) => (
                    <div
                      key={h.day_of_week}
                      className="py-3 flex items-center justify-between"
                    >
                      <span className="text-[#A2B8AF] font-light font-serif">
                        {DAY_NAMES_EN[h.day_of_week]}
                      </span>
                      {h.is_closed ? (
                        <span className="text-rose-400 font-medium font-serif">Closed</span>
                      ) : (
                        <span className="font-serif font-semibold text-[#F7F6F1]">
                          {formatTimeShort(h.open_time)} –{" "}
                          {formatTimeShort(h.close_time)} WIB
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[#A2B8AF] py-4 font-light">
                    Open Daily: 11:00 – 23:00 WIB
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Seating & Capacity */}
        <ScrollReveal direction="up" delayMs={160}>
          <div className="glass-card p-7 sm:p-8 h-full flex flex-col justify-between bg-[#071F1A]/85 border-[#C8A96A]/20">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E6F0E9]/10">
                <Users className="w-5 h-5 text-[#C8A96A]" />
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#F7F6F1]">
                    Seating & Capacity
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#C8A96A] font-serif">
                    Dining Areas
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#A2B8AF] mb-5 font-light leading-relaxed">
                Total {tables.length} tables arranged for romantic dinners, family gatherings,
                and executive private dining.
              </p>
              <div className="space-y-3">
                {Object.entries(areaSummary).map(([area, info]) => (
                  <div
                    key={area}
                    className="p-4 rounded-2xl bg-[#051511] border border-[#E6F0E9]/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-serif font-bold text-sm text-[#F7F6F1]">
                        {area.toLowerCase() === "vip"
                          ? "Salotto VIP"
                          : area.toLowerCase() === "outdoor"
                          ? "Terrazza Giardino"
                          : "Sala Principale"}
                      </div>
                      <div className="text-[11px] text-[#A2B8AF] font-light">
                        {info.count} active tables
                      </div>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-xl bg-[#C8A96A]/15 text-[#C8A96A] text-xs font-serif font-bold border border-[#C8A96A]/30">
                      {info.minCap === info.maxCap
                        ? `${info.maxCap} Guests`
                        : `${info.minCap}–${info.maxCap} Guests`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Concierge & Contact */}
        <ScrollReveal direction="up" delayMs={220}>
          <div className="glass-card p-7 sm:p-8 flex flex-col justify-between h-full bg-[#071F1A]/85 border-[#C8A96A]/20">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E6F0E9]/10">
                <MapPin className="w-5 h-5 text-[#C8A96A]" />
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#F7F6F1]">
                    Concierge & Contact
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#C8A96A] font-serif">
                    Location & Service
                  </span>
                </div>
              </div>
              <div className="space-y-4 text-sm font-light">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#C8A96A] mb-1 font-serif font-bold">
                    Address
                  </div>
                  <p className="text-[#F7F6F1] leading-relaxed text-xs sm:text-sm">
                    {restaurant.address}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#C8A96A] shrink-0" />
                  <span className="text-[#F7F6F1] text-xs sm:text-sm">{restaurant.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#C8A96A] shrink-0" />
                  <span className="text-[#F7F6F1] text-xs sm:text-sm">{restaurant.email || "-"}</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/reservasi"
                className="btn-primary w-full py-4 text-center shadow-xl shadow-[#C8A96A]/20 font-serif tracking-wide"
              >
                Book a Table
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
