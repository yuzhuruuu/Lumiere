// app/api/staff/summary/route.js
// GET /api/staff/summary
// Ringkasan operasional hari ini untuk dashboard staf:
// reservasi, pesanan dapur, tagihan belum dibayar, dan pendapatan hari ini.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { todayJakarta, jakartaDayRange } from '@/lib/utils/date'

export async function GET() {
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const today = todayJakarta()
    const range = jakartaDayRange(today)

    const [
      pendingRes,
      todayRes,
      checkedInRes,
      waitingOrdersRes,
      preparingOrdersRes,
      unpaidInvoicesRes,
      paymentsTodayRes,
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'menunggu_validasi'),
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('reservation_date', today),
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'check_in'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'menunggu'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'disiapkan'),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .in('payment_status', ['belum_dibayar', 'dp_dibayar']),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'berhasil')
        .gte('paid_at', range.start)
        .lt('paid_at', range.end),
    ])

    const firstError =
      pendingRes.error ||
      todayRes.error ||
      checkedInRes.error ||
      waitingOrdersRes.error ||
      preparingOrdersRes.error ||
      unpaidInvoicesRes.error ||
      paymentsTodayRes.error

    if (firstError) {
      console.error('Staff summary query error:', firstError)
      return NextResponse.json(
        { error: 'Gagal mengambil ringkasan operasional' },
        { status: 500 }
      )
    }

    const revenueToday = (paymentsTodayRes.data || []).reduce(
      (acc, payment) => acc + parseFloat(payment.amount),
      0
    )

    return NextResponse.json({
      date: today,
      timezone: 'Asia/Jakarta',
      reservations: {
        pending_validation: pendingRes.count ?? 0,
        today: todayRes.count ?? 0,
        currently_checked_in: checkedInRes.count ?? 0,
      },
      orders: {
        waiting: waitingOrdersRes.count ?? 0,
        preparing: preparingOrdersRes.count ?? 0,
      },
      invoices: {
        unpaid: unpaidInvoicesRes.count ?? 0,
      },
      revenue_today: revenueToday,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
