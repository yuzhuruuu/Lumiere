// app/api/admin/reports/summary/route.js
// GET /api/admin/reports/summary
// Ringkasan untuk dashboard admin: pendapatan, status reservasi/invoice,
// dan menu terlaris. Semua angka dihitung dari database (RLS admin).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { todayJakarta, monthPrefixJakarta } from '@/lib/utils/date'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  try {
    const today = todayJakarta()
    const monthPrefix = monthPrefixJakarta()

    const [paymentsRes, invoicesRes, reservationsRes, itemsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, type, status, paid_at')
        .eq('status', 'berhasil'),
      supabase.from('invoices').select('payment_status, total_amount, dp_amount'),
      supabase.from('reservations').select('status, reservation_date'),
      supabase
        .from('reservation_items')
        .select('menu_item_id, quantity, menu_items ( name )')
        .limit(2000),
    ])

    const firstError =
      paymentsRes.error || invoicesRes.error || reservationsRes.error || itemsRes.error
    if (firstError) {
      console.error('Report query error:', firstError)
      return NextResponse.json(
        { error: 'Gagal menghitung laporan' },
        { status: 500 }
      )
    }

    const payments = paymentsRes.data || []
    const invoices = invoicesRes.data || []
    const reservations = reservationsRes.data || []
    const items = itemsRes.data || []

    // ---- Pendapatan ----
    const sum = (rows) => rows.reduce((acc, r) => acc + parseFloat(r.amount), 0)

    const revenueToday = sum(
      payments.filter((p) => (p.paid_at || '').slice(0, 10) === today)
    )
    const revenueMonth = sum(
      payments.filter((p) => (p.paid_at || '').slice(0, 7) === monthPrefix)
    )
    const revenueTotal = sum(payments)

    const byType = {}
    for (const p of payments) {
      byType[p.type] = (byType[p.type] || 0) + parseFloat(p.amount)
    }

    // ---- Invoice ----
    const invoiceByStatus = {}
    for (const inv of invoices) {
      if (!invoiceByStatus[inv.payment_status]) {
        invoiceByStatus[inv.payment_status] = { count: 0, total_amount: 0 }
      }
      invoiceByStatus[inv.payment_status].count += 1
      invoiceByStatus[inv.payment_status].total_amount += parseFloat(inv.total_amount)
    }

    // ---- Reservasi ----
    const reservationByStatus = {}
    for (const r of reservations) {
      reservationByStatus[r.status] = (reservationByStatus[r.status] || 0) + 1
    }

    const reservationsToday = reservations.filter(
      (r) => r.reservation_date === today
    ).length

    // ---- Menu terlaris ----
    const menuAgg = {}
    for (const row of items) {
      const name = row.menu_items?.name || `Menu #${row.menu_item_id}`
      if (!menuAgg[row.menu_item_id]) {
        menuAgg[row.menu_item_id] = { menu_item_id: row.menu_item_id, name, qty: 0 }
      }
      menuAgg[row.menu_item_id].qty += row.quantity
    }
    const topMenu = Object.values(menuAgg)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      timezone: 'Asia/Jakarta',
      revenue: {
        today: revenueToday,
        this_month: revenueMonth,
        all_time: revenueTotal,
        by_type: byType,
      },
      invoices: {
        by_status: invoiceByStatus,
        total: invoices.length,
      },
      reservations: {
        total: reservations.length,
        today: reservationsToday,
        by_status: reservationByStatus,
      },
      top_menu: topMenu,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
