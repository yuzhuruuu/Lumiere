"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatIDR, getMenuItemImageUrl } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/types/database";
import {
  Search,
  UtensilsCrossed,
  CalendarPlus,
  CheckCircle2,
  XCircle,
  Wine,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";
import {
  CherryTomato,
  BasilLeaf,
  PeppercornCluster,
  StudioLightingOverlay,
} from "@/components/CulinaryAtmosphere";

export default function MenuPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      const [catRes, itemRes] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("*, menu_categories(id, name, sort_order)")
          .order("id", { ascending: true }),
      ]);
      setCategories((catRes.data as MenuCategory[]) || []);
      setItems((itemRes.data as MenuItem[]) || []);
      setLoading(false);
    }
    fetchMenu();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== "all" && item.category_id !== selectedCategory) {
        return false;
      }
      if (onlyAvailable && !item.is_available) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [items, selectedCategory, onlyAvailable, search]);

  return (
    <div className="min-h-screen bg-[#071F1A] py-12 relative overflow-hidden">
      {/* Studio Lighting Overlay */}
      <StudioLightingOverlay />

      {/* Atmospheric Accents */}
      <div className="absolute top-20 right-8 z-10 pointer-events-none hidden lg:block animate-float-slow">
        <CherryTomato size={72} rotate={25} />
      </div>
      <div className="absolute top-1/3 left-6 z-10 pointer-events-none hidden lg:block animate-float-reverse">
        <BasilLeaf size={46} rotate={-40} />
      </div>
      <div className="absolute bottom-20 left-10 z-10 pointer-events-none hidden lg:block">
        <CherryTomato size={60} rotate={-15} />
        <PeppercornCluster className="mt-2" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        {/* Editorial Menu Header */}
        <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-[#09251F] via-[#071F1A] to-[#04120F] border border-[#C8A96A]/30 shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-[0.035] pointer-events-none">
            <ItalianCrest className="w-80 h-80" />
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#071F1A] border border-[#C8A96A]/35 text-[#C8A96A] text-xs font-serif uppercase tracking-[0.25em]">
                <ItalianCrest className="w-4 h-4" />
                <span>The Menu · Fine Italian Cuisine</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F7F6F1] leading-tight">
                A Symphony of Flavors <br />
                <span className="italic font-normal text-[#C8A96A] font-serif">
                  Classic Italian Heritage.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#A2B8AF] font-light leading-relaxed">
                Every creation is prepared with culinary integrity: daily handmade pasta
                (<span className="text-[#C8A96A] italic">fatta in casa</span>), 24-month aged Parmigiano Reggiano,
                extra virgin Tuscan olive oil, and sweet San Marzano DOP reduction.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/reservasi"
                className="btn-primary text-base px-8 py-4 shadow-xl shadow-[#C8A96A]/25 hover:shadow-[#C8A96A]/40 shrink-0 font-serif tracking-wide"
              >
                <CalendarPlus className="w-5 h-5 text-[#0F3D34]" />
                <span>Reserve Table & Pre-Order</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="glass-card p-5 sm:p-6 space-y-5 bg-[#071F1A]/90 border-[#C8A96A]/25">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#C8A96A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes, ingredients (truffle, steak, pasta, dessert...)"
                className="input-dark pl-11 py-3 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#051511] border border-[#C8A96A]/20 text-xs sm:text-sm text-[#F7F6F1] cursor-pointer select-none hover:border-[#C8A96A]/40 transition">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded border-[#C8A96A]/40 text-[#C8A96A] focus:ring-[#C8A96A] bg-[#071F1A]"
              />
              <span className="font-serif">Available Only</span>
            </label>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-serif transition-all duration-200 active:scale-95 whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-[#C8A96A] text-[#071F1A] font-bold shadow-lg shadow-[#C8A96A]/25"
                  : "bg-[#051511] text-[#A2B8AF] hover:text-[#F7F6F1] border border-[#E6F0E9]/10 hover:border-[#C8A96A]/30"
              }`}
            >
              All Dishes ({items.length})
            </button>
            {categories.map((cat) => {
              const countInCat = items.filter((m) => m.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-serif transition-all duration-200 active:scale-95 whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? "bg-[#C8A96A] text-[#071F1A] font-bold shadow-lg shadow-[#C8A96A]/25"
                      : "bg-[#051511] text-[#A2B8AF] hover:text-[#F7F6F1] border border-[#E6F0E9]/10 hover:border-[#C8A96A]/30"
                  }`}
                >
                  {cat.name} ({countInCat})
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card h-80 animate-pulse bg-[#0B2822]/40" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-card p-14 text-center space-y-3 bg-[#071F1A]/80 border-[#C8A96A]/20">
            <UtensilsCrossed className="w-10 h-10 text-[#C8A96A] mx-auto opacity-60" />
            <p className="text-lg font-serif font-bold text-[#F7F6F1]">
              No Dishes Found
            </p>
            <p className="text-xs sm:text-sm text-[#A2B8AF] font-light max-w-md mx-auto">
              Please adjust your search keywords or select another culinary category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredItems.map((item) => {
              const photoUrl = getMenuItemImageUrl(item.photo_path, item.name);
              return (
                <div
                  key={item.id}
                  className={`glass-card overflow-hidden flex flex-col justify-between transition-all duration-500 group bg-[#071F1A]/90 border-[#C8A96A]/20 hover:border-[#C8A96A]/60 hover:shadow-[0_20px_50px_rgba(0,0,0,0.85)] ${
                    item.is_available ? "" : "opacity-60 grayscale-[40%]"
                  }`}
                >
                  <div>
                    <div className="h-52 bg-[#051511] relative flex items-center justify-center overflow-hidden">
                      <img
                        src={photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 brightness-[0.95] contrast-[1.05]"
                      />
                      {item.menu_categories?.name && (
                        <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-xl bg-[#071F1A]/95 backdrop-blur text-[11px] font-serif font-bold text-[#C8A96A] border border-[#C8A96A]/30">
                          {item.menu_categories.name}
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif font-bold text-lg text-[#F7F6F1] group-hover:text-[#C8A96A] transition">
                          {item.name}
                        </h3>
                        <span className="font-serif font-bold text-base text-[#C8A96A] shrink-0">
                          {formatIDR(item.price)}
                        </span>
                      </div>
                      <p className="text-xs text-[#A2B8AF] mt-2 line-clamp-2 leading-relaxed font-light">
                        {item.description || "A signature specialty from Lumière's main kitchen."}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-5 pt-3.5 border-t border-[#E6F0E9]/10 flex items-center justify-between text-xs">
                    {item.is_available ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-rose-400">
                        <XCircle className="w-3.5 h-3.5" /> Sold Out
                      </span>
                    )}

                    {item.is_available && (
                      <Link
                        href="/reservasi"
                        className="text-[#C8A96A] font-serif font-semibold hover:underline flex items-center gap-1 text-xs"
                      >
                        Order with Reservation <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
