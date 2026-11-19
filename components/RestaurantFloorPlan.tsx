"use client";

import React, { useState } from "react";
import type { DiningTable } from "@/types/database";
import {
  Users,
  Check,
  Lock,
  AlertTriangle,
  Sparkles,
  Music,
  Wine,
  Trees,
  Coffee,
  Info,
  Layers,
  LayoutGrid,
  MapPin,
  Compass,
} from "lucide-react";

interface RestaurantFloorPlanProps {
  tables: DiningTable[];
  selectedTableId: number | null;
  occupiedTableIds: number[];
  guestCount: number;
  onSelectTable: (tableId: number) => void;
  onContinue?: () => void;
}

export default function RestaurantFloorPlan({
  tables,
  selectedTableId,
  occupiedTableIds,
  guestCount,
  onSelectTable,
  onContinue,
}: RestaurantFloorPlanProps) {
  const [activeAreaFilter, setActiveAreaFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"floorplan" | "grid">("floorplan");

  // Filter area
  const areas = Array.from(
    new Set(tables.map((t) => t.area || "Indoor").filter(Boolean))
  );

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // Klasifikasi meja berdasarkan area
  const vipTables = tables.filter(
    (t) => (t.area || "").toLowerCase() === "vip"
  );
  const indoorTables = tables.filter(
    (t) =>
      (t.area || "").toLowerCase() === "indoor" ||
      (!t.area && !vipTables.includes(t))
  );
  const outdoorTables = tables.filter(
    (t) => (t.area || "").toLowerCase() === "outdoor"
  );
  const otherTables = tables.filter(
    (t) =>
      !vipTables.includes(t) &&
      !indoorTables.includes(t) &&
      !outdoorTables.includes(t)
  );

  // Pisahkan indoor berdasarkan kapasitas untuk baris (2 pax couple, 4 pax family)
  const indoorCoupleTables = indoorTables.filter((t) => t.capacity <= 2);
  const indoorFamilyTables = indoorTables.filter((t) => t.capacity > 2);

  return (
    <div className="space-y-6">
      {/* HEADER CONTROL & LEGEND (Bioskop Style) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md">
        {/* Cinema Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <span className="text-lumiere-muted font-medium flex items-center gap-1.5 mr-1 font-serif">
            <Compass className="w-3.5 h-3.5 text-lumiere-gold" />
            Legend:
          </span>
          {/* Available */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-obsidian-800 border border-white/30 inline-block shadow-sm" />
            <span className="text-lumiere-cream">Available</span>
          </div>
          {/* Selected */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-lumiere-gold border border-amber-300 inline-block shadow-sm shadow-lumiere-gold/50" />
            <span className="text-lumiere-gold font-semibold">Your Selection</span>
          </div>
          {/* Reserved */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-950/80 border border-rose-800/80 inline-block" />
            <span className="text-rose-400">Reserved</span>
          </div>
          {/* Insufficient Capacity */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-obsidian-950/90 border border-white/10 opacity-50 inline-block" />
            <span className="text-lumiere-muted">Under Capacity</span>
          </div>
        </div>

        {/* View Mode Toggle & Filter Area */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Area Filter Buttons */}
          <div className="flex items-center bg-obsidian-950 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveAreaFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                activeAreaFilter === "ALL"
                  ? "bg-lumiere-gold text-obsidian-950"
                  : "text-lumiere-muted hover:text-lumiere-cream"
              }`}
            >
              All Areas
            </button>
            {areas.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setActiveAreaFilter(a)}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  activeAreaFilter === a
                    ? "bg-lumiere-gold text-obsidian-950"
                    : "text-lumiere-muted hover:text-lumiere-cream"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Toggle Denah vs Grid */}
          <div className="flex items-center bg-obsidian-950 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("floorplan")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-medium ${
                viewMode === "floorplan"
                  ? "bg-white/15 text-lumiere-cream"
                  : "text-lumiere-muted hover:text-lumiere-cream"
              }`}
              title="Interactive Floor Plan"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Floor Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-medium ${
                viewMode === "grid"
                  ? "bg-white/15 text-lumiere-cream"
                  : "text-lumiere-muted hover:text-lumiere-cream"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DENAH RESTORAN INTERAKTIF (CINEMA STYLE RESTAURANT MAP) */}
      {viewMode === "floorplan" ? (
        <div className="relative rounded-3xl bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-obsidian-950 border border-white/10 p-5 sm:p-8 overflow-x-auto shadow-2xl">
          {/* Subtle Floor Texture Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #f5ecd5 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="min-w-[680px] max-w-4xl mx-auto space-y-8 relative z-10">
            {/* 1. ARCHITECTURAL TOP BAR (Screen/Front Landmark) */}
            <div className="relative text-center">
              <div className="h-10 mx-auto max-w-xl rounded-b-2xl bg-gradient-to-r from-[#09251F] via-[#C8A96A]/20 to-[#09251F] border-x border-b border-[#C8A96A]/40 flex items-center justify-center gap-3 px-6 shadow-xl shadow-[#C8A96A]/10">
                <Wine className="w-4 h-4 text-[#C8A96A] animate-pulse" />
                <span className="text-xs font-serif font-bold tracking-[0.25em] text-[#C8A96A] uppercase">
                  🍸 BAR LOUNGE, ENOTECA & RECEPTION 🍸
                </span>
                <Coffee className="w-4 h-4 text-[#C8A96A]" />
              </div>
              <div className="text-[10px] text-lumiere-muted tracking-[0.2em] mt-1 uppercase font-serif">
                ▲ Main Entrance & Foyer ▲
              </div>
            </div>

            {/* 2. ZONE: VIP PRIVATE SUITES */}
            {(activeAreaFilter === "ALL" || activeAreaFilter === "VIP") &&
              vipTables.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#09251F]/90 border border-[#C8A96A]/30 relative shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C8A96A]" />
                      <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#C8A96A]">
                        Salotto Privato VIP
                      </span>
                    </div>
                    <span className="text-[11px] text-[#A2B8AF] font-light font-serif">
                      Exclusive Banquet Suite (10 Guests)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-around gap-6">
                    {vipTables.map((tbl) => (
                      <TableItem
                        key={tbl.id}
                        table={tbl}
                        guestCount={guestCount}
                        isSelected={selectedTableId === tbl.id}
                        isOccupied={occupiedTableIds.includes(tbl.id)}
                        onSelect={() => onSelectTable(tbl.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* 3. ZONE: MAIN INDOOR DINING ROOM */}
            {(activeAreaFilter === "ALL" || activeAreaFilter === "Indoor") &&
              indoorTables.length > 0 && (
                <div className="p-4 sm:p-6 rounded-3xl bg-[#09251F]/70 border border-[#C8A96A]/20 space-y-6 shadow-xl">
                  {/* Central Stage Landmark */}
                  <div className="flex items-center justify-center">
                    <div className="px-5 py-2.5 rounded-2xl bg-[#071F1A] border border-[#C8A96A]/35 flex items-center gap-2.5 text-xs font-serif font-bold text-[#F7F6F1] shadow-inner">
                      <Music className="w-3.5 h-3.5 text-[#C8A96A]" />
                      <span>Grand Piano Stage & Live Jazz</span>
                      <Music className="w-3.5 h-3.5 text-[#C8A96A]" />
                    </div>
                  </div>

                  {/* Row A: Couple / 2-Pax Tables */}
                  {indoorCoupleTables.length > 0 && (
                    <div>
                      <div className="text-[11px] font-serif font-bold tracking-[0.2em] text-[#C8A96A] uppercase mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C8A96A]" />
                        Row A — Couple Tables (2 Guests)
                      </div>
                      <div className="grid grid-cols-6 gap-3 sm:gap-4 place-items-center">
                        {indoorCoupleTables.map((tbl) => (
                          <TableItem
                            key={tbl.id}
                            table={tbl}
                            guestCount={guestCount}
                            isSelected={selectedTableId === tbl.id}
                            isOccupied={occupiedTableIds.includes(tbl.id)}
                            onSelect={() => onSelectTable(tbl.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aisle Walkway */}
                  <div className="relative py-2 flex items-center justify-center">
                    <div className="w-full border-t border-dashed border-[#C8A96A]/25" />
                    <span className="absolute bg-[#071F1A] px-4 py-1 rounded-full text-[10px] font-serif uppercase tracking-[0.25em] text-[#A2B8AF] border border-[#C8A96A]/20">
                      Central Aisle & Service Walkway
                    </span>
                  </div>

                  {/* Row B: Family / 4-Pax Tables */}
                  {indoorFamilyTables.length > 0 && (
                    <div>
                      <div className="text-[11px] font-serif font-bold tracking-[0.2em] text-[#C8A96A] uppercase mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C8A96A]" />
                        Row B — Family & Banquet Tables (4 Guests)
                      </div>
                      <div className="grid grid-cols-6 gap-3 sm:gap-4 place-items-center">
                        {indoorFamilyTables.map((tbl) => (
                          <TableItem
                            key={tbl.id}
                            table={tbl}
                            guestCount={guestCount}
                            isSelected={selectedTableId === tbl.id}
                            isOccupied={occupiedTableIds.includes(tbl.id)}
                            onSelect={() => onSelectTable(tbl.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* 4. ZONE: OUTDOOR GARDEN & TERRACE */}
            {(activeAreaFilter === "ALL" || activeAreaFilter === "Outdoor") &&
              outdoorTables.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#09251F]/70 border border-emerald-500/25 relative shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Trees className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-serif font-bold uppercase tracking-wider text-emerald-300">
                        Terrazza Giardino
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-200/70 font-light font-serif">
                      Open-Air Terrace & Skyline View (4–6 Guests)
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4 place-items-center">
                    {outdoorTables.map((tbl) => (
                      <TableItem
                        key={tbl.id}
                        table={tbl}
                        guestCount={guestCount}
                        isSelected={selectedTableId === tbl.id}
                        isOccupied={occupiedTableIds.includes(tbl.id)}
                        onSelect={() => onSelectTable(tbl.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Other Area (if any custom table added by admin) */}
            {otherTables.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-xs font-serif font-bold uppercase tracking-wider text-lumiere-cream">
                  Area Lainnya
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-center">
                  {otherTables.map((tbl) => (
                    <TableItem
                      key={tbl.id}
                      table={tbl}
                      guestCount={guestCount}
                      isSelected={selectedTableId === tbl.id}
                      isOccupied={occupiedTableIds.includes(tbl.id)}
                      onSelect={() => onSelectTable(tbl.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: MODE GRID LIST BIASA */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {tables
            .filter((t) =>
              activeAreaFilter === "ALL"
                ? true
                : (t.area || "Indoor").toLowerCase() ===
                  activeAreaFilter.toLowerCase()
            )
            .map((tbl) => {
              const capacityOk = tbl.capacity >= guestCount;
              const isOccupied = occupiedTableIds.includes(tbl.id);
              const disabled = !capacityOk || isOccupied;
              const isSelected = selectedTableId === tbl.id;

              return (
                <button
                  key={tbl.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectTable(tbl.id)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    isSelected
                      ? "bg-lumiere-gold/20 border-lumiere-gold ring-2 ring-lumiere-gold/40 shadow-lg"
                      : disabled
                      ? "bg-obsidian-900/50 border-white/5 opacity-50 cursor-not-allowed"
                      : "bg-obsidian-900 border-white/10 hover:border-lumiere-gold/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-lumiere-cream">
                      {tbl.code}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-lumiere-muted">
                      {tbl.area || "Reguler"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-lumiere-muted">
                    <Users className="w-3.5 h-3.5 text-lumiere-gold" />
                    <span>Max. {tbl.capacity} guests</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium">
                    {isOccupied ? (
                      <span className="text-rose-400">Reserved</span>
                    ) : !capacityOk ? (
                      <span className="text-amber-400">Under Capacity</span>
                    ) : (
                      <span className="text-emerald-400">Available</span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {/* CINEMA-STYLE SELECTED TABLE FLOATING / BOTTOM CARD */}
      {selectedTable ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-lumiere-gold/40 shadow-xl shadow-lumiere-gold/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-lumiere-gold/20 border border-lumiere-gold/40 flex items-center justify-center text-lumiere-gold font-bold text-lg font-serif shrink-0">
              {selectedTable.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-lumiere-cream">
                  Table {selectedTable.code} Selected
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-lumiere-gold/15 text-lumiere-gold border border-lumiere-gold/30">
                  {selectedTable.area || "Indoor"}
                </span>
              </div>
              <p className="text-xs text-lumiere-muted mt-0.5">
                Capacity: Max. <strong>{selectedTable.capacity} Guests</strong>{" "}
                · Your Party: <strong>{guestCount} Guests</strong> (Fits)
              </p>
            </div>
          </div>

          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="btn-primary w-full sm:w-auto px-6 py-2.5 whitespace-nowrap shadow-md shadow-lumiere-gold/20 font-serif"
            >
              Continue to Select Menu
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/10 text-center text-xs text-lumiere-muted flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-lumiere-gold" />
          <span>
            Click on any available table above to make your selection.
          </span>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUB-KOMPONEN: GAMBAR MEJA BESERTA KURSI NYA (SVG / ARCHITECTURAL ELEMENT)
// =========================================================================
interface TableItemProps {
  table: DiningTable;
  guestCount: number;
  isSelected: boolean;
  isOccupied: boolean;
  onSelect: () => void;
}

function TableItem({
  table,
  guestCount,
  isSelected,
  isOccupied,
  onSelect,
}: TableItemProps) {
  const capacityOk = table.capacity >= guestCount;
  const disabled = isOccupied || !capacityOk;

  // Warna status kursi
  const chairColor = isSelected
    ? "bg-lumiere-gold border-amber-300 shadow-sm shadow-lumiere-gold/50"
    : disabled
    ? "bg-white/5 border-white/5"
    : "bg-white/20 border-white/20 group-hover:bg-lumiere-gold/50 group-hover:border-lumiere-gold";

  // Warna status meja
  const tableBgColor = isSelected
    ? "bg-gradient-to-br from-lumiere-gold to-amber-500 text-obsidian-950 font-bold shadow-xl shadow-lumiere-gold/40 ring-4 ring-lumiere-gold/30 scale-105"
    : isOccupied
    ? "bg-rose-950/40 border-rose-900/50 text-rose-400 opacity-60 cursor-not-allowed"
    : !capacityOk
    ? "bg-obsidian-950/70 border-white/5 text-lumiere-muted/40 opacity-40 cursor-not-allowed"
    : "bg-obsidian-850 border-white/15 text-lumiere-cream hover:border-lumiere-gold hover:shadow-lg hover:shadow-lumiere-gold/20 hover:scale-105";

  // Render kursi berdasarkan kapasitas meja
  const renderChairs = () => {
    // 2-SEATER MEJA (Kiri & Kanan atau Atas & Bawah)
    if (table.capacity <= 2) {
      return (
        <div className="flex items-center gap-1">
          {/* Kursi Kiri */}
          <span
            className={`w-1.5 h-6 rounded-l-md border transition-all duration-200 ${chairColor}`}
          />
          {/* Meja */}
          <div
            className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${tableBgColor}`}
          >
            <span className="text-xs font-bold leading-none">{table.code}</span>
            <span
              className={`text-[9px] mt-0.5 leading-none ${
                isSelected ? "text-obsidian-900 font-semibold" : "text-lumiere-muted"
              }`}
            >
              2p
            </span>
          </div>
          {/* Kursi Kanan */}
          <span
            className={`w-1.5 h-6 rounded-r-md border transition-all duration-200 ${chairColor}`}
          />
        </div>
      );
    }

    // 4-SEATER MEJA (2 Atas, 2 Bawah)
    if (table.capacity <= 4) {
      return (
        <div className="flex flex-col items-center">
          {/* 2 Kursi Atas */}
          <div className="flex gap-2.5 justify-center mb-0.5">
            <span
              className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
            />
          </div>
          {/* Meja Persegi */}
          <div
            className={`w-14 h-12 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${tableBgColor}`}
          >
            <span className="text-xs font-bold leading-none">{table.code}</span>
            <span
              className={`text-[9px] mt-0.5 leading-none ${
                isSelected ? "text-obsidian-900 font-semibold" : "text-lumiere-muted"
              }`}
            >
              4p
            </span>
          </div>
          {/* 2 Kursi Bawah */}
          <div className="flex gap-2.5 justify-center mt-0.5">
            <span
              className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
            />
          </div>
        </div>
      );
    }

    // 6-SEATER MEJA (3 Atas, 3 Bawah)
    if (table.capacity <= 6) {
      return (
        <div className="flex flex-col items-center">
          {/* 3 Kursi Atas */}
          <div className="flex gap-2 justify-center mb-0.5">
            <span
              className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
            />
          </div>
          {/* Meja Persegi Panjang */}
          <div
            className={`w-20 h-12 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${tableBgColor}`}
          >
            <span className="text-xs font-bold leading-none">{table.code}</span>
            <span
              className={`text-[9px] mt-0.5 leading-none ${
                isSelected ? "text-obsidian-900 font-semibold" : "text-lumiere-muted"
              }`}
            >
              6p
            </span>
          </div>
          {/* 3 Kursi Bawah */}
          <div className="flex gap-2 justify-center mt-0.5">
            <span
              className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
            />
            <span
              className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
            />
          </div>
        </div>
      );
    }

    // 10-SEATER / VIP BANQUET MEJA (4 Atas, 4 Bawah, 1 Kiri, 1 Kanan)
    return (
      <div className="flex flex-col items-center">
        {/* 4 Kursi Atas */}
        <div className="flex gap-2 justify-center mb-0.5">
          <span
            className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-t-md border transition-all duration-200 ${chairColor}`}
          />
        </div>

        {/* Tengah (Kursi Kiri + Meja Panjang + Kursi Kanan) */}
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-6 rounded-l-md border transition-all duration-200 ${chairColor}`}
          />
          <div
            className={`w-28 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all duration-200 ${tableBgColor}`}
          >
            <div className="flex items-center gap-1">
              {isSelected ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3 h-3 text-lumiere-gold" />
              )}
              <span className="text-xs font-bold leading-none">{table.code}</span>
            </div>
            <span
              className={`text-[9px] mt-1 leading-none ${
                isSelected ? "text-obsidian-900 font-semibold" : "text-lumiere-gold"
              }`}
            >
              VIP · 10p
            </span>
          </div>
          <span
            className={`w-1.5 h-6 rounded-r-md border transition-all duration-200 ${chairColor}`}
          />
        </div>

        {/* 4 Kursi Bawah */}
        <div className="flex gap-2 justify-center mt-0.5">
          <span
            className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
          />
          <span
            className={`w-4 h-1.5 rounded-b-md border transition-all duration-200 ${chairColor}`}
          />
        </div>
      </div>
    );
  };

  // Tooltip description
  let tooltipText = `Table ${table.code} (${table.area || "Indoor"}) · Capacity: ${
    table.capacity
  } Guests`;
  if (isOccupied) tooltipText += " · Reserved for this time";
  else if (!capacityOk)
    tooltipText += ` · Under capacity (Party size: ${guestCount})`;
  else tooltipText += " · Available (Click to select)";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      title={tooltipText}
      className={`group relative p-1.5 rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-lumiere-gold/50 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {renderChairs()}

      {/* Badge Ikon Kecil Status */}
      {isOccupied && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow-sm">
          <Lock className="w-2.5 h-2.5" />
        </span>
      )}
      {!isOccupied && !capacityOk && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] shadow-sm">
          <AlertTriangle className="w-2.5 h-2.5" />
        </span>
      )}
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-sm animate-bounce">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}
    </button>
  );
}
