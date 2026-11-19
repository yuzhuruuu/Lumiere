"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  UtensilsCrossed,
  Grid2x2,
  Clock,
  Store,
  Users,
} from "lucide-react";

const ADMIN_TABS = [
  { href: "/admin", label: "Rekap Transaksi", icon: BarChart3, exact: true },
  {
    href: "/admin/menu",
    label: "Menu & Kategori",
    icon: UtensilsCrossed,
    exact: false,
  },
  { href: "/admin/meja", label: "Meja & Area", icon: Grid2x2, exact: false },
  {
    href: "/admin/jam-operasional",
    label: "Jam Operasional",
    icon: Clock,
    exact: false,
  },
  {
    href: "/admin/profil-restoran",
    label: "Profil Restoran",
    icon: Store,
    exact: false,
  },
  { href: "/admin/pengguna", label: "Akun & Peran", icon: Users, exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Sub-navigation */}
      <div className="glass-card p-2 flex items-center gap-1.5 overflow-x-auto">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? "bg-gradient-to-r from-lumiere-gold to-lumiere-amber text-obsidian-950 shadow-md"
                  : "text-lumiere-muted hover:text-lumiere-cream hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
