"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import {
  UtensilsCrossed,
  CalendarPlus,
  History,
  ClipboardCheck,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import ItalianCrest from "@/components/ItalianCrest";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (active) {
        setProfile((data as Profile) || null);
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const navLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-serif tracking-wide transition-all duration-300 ${
      isActive
        ? "text-[#F7F6F1] bg-[#C8A96A]/20 border border-[#C8A96A]/45 shadow-sm shadow-[#C8A96A]/20 font-semibold"
        : "text-[#A2B8AF] hover:text-[#F7F6F1] hover:bg-white/5 border border-transparent"
    }`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#C8A96A]/20 bg-[#071F1A]/90 backdrop-blur-2xl print:hidden transition-all duration-300">
      {/* Top Hairline Gold Ribbon */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C8A96A]/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C8A96A] via-[#B39355] to-[#8C6D32] p-[1.5px] shadow-lg shadow-[#C8A96A]/25 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full rounded-[14px] bg-[#071F1A] flex items-center justify-center font-serif text-xl font-bold text-[#C8A96A]">
              L
            </div>
            {/* Subtle glow dot */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C8A96A] blur-[1px] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-[0.18em] text-[#F7F6F1] group-hover:text-[#C8A96A] transition-colors">
                LUMIÈRE
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-serif text-[#C8A96A] font-semibold border border-[#C8A96A]/35 px-1.5 py-0.5 rounded bg-[#C8A96A]/10 hidden sm:inline">
                Ristorante
              </span>
            </div>
            <span className="hidden sm:block text-[9.5px] uppercase tracking-[0.28em] text-[#A2B8AF] font-light -mt-0.5">
              Fine Dining & Lounge · Est. MMXXVI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation - Centered Floating Capsule */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-full bg-[#051511]/85 border border-[#C8A96A]/25 shadow-inner backdrop-blur-md">
          <Link href="/" className={navLinkClass("/")}>
            Home
          </Link>
          <Link href="/menu" className={navLinkClass("/menu")}>
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#C8A96A]" />
            Menu
          </Link>
          {(!profile || profile.role === "pelanggan" || profile.role === "admin") && (
            <Link href="/reservasi" className={navLinkClass("/reservasi")}>
              <CalendarPlus className="w-3.5 h-3.5 text-[#C8A96A]" />
              Reservation
            </Link>
          )}
          {profile && (profile.role === "pelanggan" || profile.role === "admin") && (
            <Link href="/riwayat" className={navLinkClass("/riwayat")}>
              <History className="w-3.5 h-3.5 text-[#C8A96A]" />
              My Bookings
            </Link>
          )}
          {profile && (profile.role === "staf" || profile.role === "admin") && (
            <Link href="/staf" className={navLinkClass("/staf")}>
              <ClipboardCheck className="w-3.5 h-3.5 text-[#C8A96A]" />
              Staff Operations
            </Link>
          )}
          {profile && profile.role === "admin" && (
            <Link href="/admin" className={navLinkClass("/admin")}>
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8A96A]" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Right Auth / Action CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-28 rounded-full bg-white/5 animate-pulse" />
          ) : profile ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#051511] hover:bg-[#09251F] border border-[#C8A96A]/30 text-xs font-serif transition shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-[#C8A96A]/20 flex items-center justify-center text-[#C8A96A]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="max-w-[120px] truncate text-[#F7F6F1] font-medium">
                  {profile.full_name}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-[#C8A96A]/20 text-[#C8A96A] font-bold border border-[#C8A96A]/30">
                  {profile.role === "pelanggan" ? "VIP Guest" : profile.role}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-full text-[#A2B8AF] hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/30"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-xs font-serif text-[#F7F6F1] hover:text-[#C8A96A] transition font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/reservasi"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-serif font-bold tracking-wider uppercase bg-gradient-to-r from-[#D6B87B] via-[#C8A96A] to-[#B39355] text-[#071F1A] hover:opacity-95 transition shadow-lg shadow-[#C8A96A]/25 active:scale-95 group"
              >
                <span>Book a Table</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl text-[#F7F6F1] hover:bg-white/10 transition"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#C8A96A]" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#C8A96A]/20 bg-[#071F1A] px-5 py-5 space-y-2 shadow-2xl relative">
          <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
            <ItalianCrest className="w-40 h-40" />
          </div>

          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={navLinkClass("/")}
          >
            Home
          </Link>
          <Link
            href="/menu"
            onClick={() => setMobileOpen(false)}
            className={navLinkClass("/menu")}
          >
            <UtensilsCrossed className="w-4 h-4 text-[#C8A96A]" />
            Menu
          </Link>
          {(!profile || profile.role === "pelanggan" || profile.role === "admin") && (
            <Link
              href="/reservasi"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass("/reservasi")}
            >
              <CalendarPlus className="w-4 h-4 text-[#C8A96A]" />
              Reservation
            </Link>
          )}
          {profile && (profile.role === "pelanggan" || profile.role === "admin") && (
            <Link
              href="/riwayat"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass("/riwayat")}
            >
              <History className="w-4 h-4 text-[#C8A96A]" />
              My Bookings
            </Link>
          )}
          {profile && (profile.role === "staf" || profile.role === "admin") && (
            <Link
              href="/staf"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass("/staf")}
            >
              <ClipboardCheck className="w-4 h-4 text-[#C8A96A]" />
              Staff Operations
            </Link>
          )}
          {profile && profile.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass("/admin")}
            >
              <ShieldCheck className="w-4 h-4 text-[#C8A96A]" />
              Admin Panel
            </Link>
          )}

          <div className="pt-4 mt-3 border-t border-[#C8A96A]/20">
            {profile ? (
              <div className="space-y-3">
                <Link
                  href="/profil"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#051511] border border-[#C8A96A]/25 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#C8A96A]/20 flex items-center justify-center text-[#C8A96A]">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-serif font-medium text-[#F7F6F1]">
                      {profile.full_name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#C8A96A]/20 text-[#C8A96A]">
                    {profile.role === "pelanggan" ? "VIP Guest" : profile.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-serif font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2.5 rounded-full border border-[#C8A96A]/30 text-xs font-serif font-medium text-[#F7F6F1]"
                >
                  Sign In
                </Link>
                <Link
                  href="/reservasi"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2.5 rounded-full bg-gradient-to-r from-[#D6B87B] to-[#B39355] text-[#071F1A] text-xs font-serif font-bold tracking-wider uppercase shadow-md shadow-[#C8A96A]/25"
                >
                  Book a Table
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
