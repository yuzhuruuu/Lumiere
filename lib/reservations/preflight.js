// lib/reservations/preflight.js
// Pemeriksaan awal sebelum RPC create_reservation dipanggil.
//
// Tujuannya bukan menggantikan aturan database, melainkan memberi pesan yang
// jelas sebelum transaksi dibuat. Database tetap memeriksa ulang kapasitas,
// jam operasional, minimum pembelian, benturan jadwal, dan transisi status.

import { nowJakartaTime, todayJakarta } from '@/lib/utils/date'
import {
  dayOfWeekForDate,
  isWithinOperatingHours,
} from '@/lib/utils/availability'
import { formatRupiah } from '@/lib/utils/currency'

function fail(status, body) {
  return { error: { status, body } }
}

function timeLabel(value) {
  return String(value || '').slice(0, 5)
}

export async function preflightReservation(supabase, data) {
  const {
    reservation_date,
    start_time,
    duration_minutes,
    guest_count,
    table_id,
    items,
  } = data

  // Tanggal dan jam harus berada di masa depan. Pemeriksaan jam hanya
  // relevan untuk hari ini; tanggal yang lebih lampau sudah ditolak.
  const today = todayJakarta()

  if (reservation_date < today) {
    return fail(422, { error: 'Tanggal reservasi tidak boleh di masa lalu.' })
  }

  if (reservation_date === today && start_time <= nowJakartaTime()) {
    return fail(422, {
      error: 'Waktu reservasi hari ini sudah lewat. Pilih jam lain.',
    })
  }

  const menuItemIds = [...new Set(items.map((item) => item.menu_item_id))]

  const [tableResult, hoursResult, menuResult, profileResult] =
    await Promise.all([
      supabase
        .from('dining_tables')
        .select('id, code, capacity, is_active')
        .eq('id', table_id)
        .maybeSingle(),
      supabase
        .from('operating_hours')
        .select('open_time, close_time, is_closed')
        .eq('day_of_week', dayOfWeekForDate(reservation_date))
        .maybeSingle(),
      supabase
        .from('menu_items')
        .select('id, name, price, is_available')
        .in('id', menuItemIds),
      supabase
        .from('restaurant_profile')
        .select('min_order_amount')
        .eq('id', 1)
        .maybeSingle(),
    ])

  if (
    tableResult.error ||
    hoursResult.error ||
    menuResult.error ||
    profileResult.error
  ) {
    return fail(500, { error: 'Gagal memvalidasi data reservasi.' })
  }

  const table = tableResult.data
  const hours = hoursResult.data
  const menuItems = menuResult.data || []
  const profile = profileResult.data

  if (!table) {
    return fail(422, { error: 'Meja tidak ditemukan.' })
  }

  if (!table.is_active) {
    return fail(422, { error: `Meja ${table.code} sedang tidak aktif.` })
  }

  if (guest_count > table.capacity) {
    return fail(422, {
      error: `Jumlah tamu (${guest_count}) melebihi kapasitas meja ${table.code} (${table.capacity} orang).`,
      details: {
        guest_count,
        table_capacity: table.capacity,
      },
    })
  }

  if (!hours || hours.is_closed) {
    return fail(422, {
      error: 'Restoran tutup pada tanggal tersebut.',
    })
  }

  if (
    !isWithinOperatingHours(
      start_time,
      duration_minutes,
      hours.open_time,
      hours.close_time
    )
  ) {
    return fail(422, {
      error: `Waktu reservasi di luar jam operasional (${timeLabel(hours.open_time)}–${timeLabel(hours.close_time)}).`,
    })
  }

  if (menuItems.length !== menuItemIds.length) {
    return fail(422, {
      error: 'Beberapa menu yang dipilih tidak ditemukan.',
    })
  }

  const unavailable = menuItems.filter((item) => !item.is_available)

  if (unavailable.length > 0) {
    return fail(422, {
      error: `Menu berikut sedang tidak tersedia: ${unavailable
        .map((item) => item.name)
        .join(', ')}.`,
    })
  }

  if (!profile) {
    return fail(500, {
      error: 'Konfigurasi restoran belum lengkap. Hubungi admin.',
    })
  }

  const priceById = new Map(
    menuItems.map((item) => [item.id, Number(item.price)])
  )

  // Subtotal memakai harga dari database, bukan harga kiriman client.
  const subtotal = items.reduce((total, item) => {
    return total + priceById.get(item.menu_item_id) * item.quantity
  }, 0)

  const minimumOrder = Number(profile.min_order_amount || 0)
  const shortfall = Math.max(minimumOrder - subtotal, 0)

  if (minimumOrder > 0 && subtotal < minimumOrder) {
    return fail(422, {
      error: `Subtotal pesanan ${formatRupiah(subtotal)} masih kurang ${formatRupiah(shortfall)} dari minimum ${formatRupiah(minimumOrder)}.`,
      details: {
        subtotal,
        minimum_order: minimumOrder,
        shortfall,
      },
    })
  }

  return {
    subtotal,
    minimumOrder,
    table,
    menuItems,
    hours,
  }
}
