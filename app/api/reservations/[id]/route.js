// app/api/reservations/[id]/route.js
// GET /api/reservations/[id] - Detail reservasi spesifik

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { calculateBill } from '@/lib/utils/bill'

export async function GET(request, { params }) {
  const supabase = await createClient()
  // Next.js 15/16: params adalah Promise, wajib di-await
  const { id } = await params
  
  try {
    // 1. Cek login + status akun. Kepemilikan data tetap dijaga RLS:
    //    pelanggan hanya bisa membaca reservasinya sendiri.
    const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
    if (auth.error) return auth.error
    
    // 2. Ambil data reservasi dengan relasi lengkap
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        id,
        reservation_code,
        customer_id,
        contact_name,
        contact_phone,
        contact_email,
        reservation_date,
        start_time,
        duration_minutes,
        guest_count,
        status,
        validated_by,
        validated_at,
        checked_in_at,
        rejection_reason,
        notes,
        created_at,
        updated_at,
        dining_tables (
          id,
          code,
          capacity,
          area
        ),
        reservation_items (
          id,
          menu_item_id,
          quantity,
          unit_price,
          subtotal,
          menu_items (
            id,
            name,
            description,
            photo_path,
            is_available
          )
        )
      `)
      .eq('id', id)
      .single()
    
    if (reservationError) {
      if (reservationError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Reservasi tidak ditemukan' },
          { status: 404 }
        )
      }
      console.error('Error fetching reservation:', reservationError)
      return NextResponse.json(
        { error: 'Gagal mengambil detail reservasi' },
        { status: 500 }
      )
    }
    
    // 3. Cek ownership (pelanggan hanya bisa lihat milik sendiri)
    if (
      auth.profile.role === 'pelanggan' &&
      reservation.customer_id !== auth.user.id
    ) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke reservasi ini' },
        { status: 403 }
      )
    }
    
    // 4. Ambil invoice jika ada
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        subtotal,
        tax_amount,
        total_amount,
        dp_amount,
        payment_status,
        issued_at
      `)
      .eq('reservation_id', id)
      .single()
    
    // 5. Ambil payments jika ada invoice
    let payments = []
    if (invoice) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id,
          type,
          method,
          amount,
          status,
          reference_no,
          paid_at
        `)
        .eq('invoice_id', invoice.id)
        .order('paid_at', { ascending: false })
      
      payments = paymentsData || []
    }
    
    // 5b. Riwayat perubahan status (dibuat otomatis oleh trigger database)
    const { data: statusLogs } = await supabase
      .from('reservation_status_logs')
      .select('id, from_status, to_status, note, changed_by, created_at')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true })

    // 5c. Konfigurasi pajak & DP untuk rincian tagihan
    const { data: billConfig } = await supabase
      .from('restaurant_profile')
      .select('tax_percentage, dp_percentage')
      .eq('id', 1)
      .single()

    const taxPercentage = parseFloat(billConfig?.tax_percentage ?? 10)
    const dpPercentage = parseFloat(billConfig?.dp_percentage ?? 50)
    const itemsSubtotal = reservation.reservation_items.reduce(
      (acc, item) => acc + parseFloat(item.subtotal),
      0
    )
    const estimate = calculateBill(itemsSubtotal, taxPercentage, dpPercentage)

    // Jika invoice sudah dibuat, angka invoice (dihitung database) yang dipakai.
    const bill = invoice
      ? {
          source: 'invoice',
          subtotal: parseFloat(invoice.subtotal),
          tax_percentage: taxPercentage,
          tax_amount: parseFloat(invoice.tax_amount),
          total_amount: parseFloat(invoice.total_amount),
          dp_percentage: dpPercentage,
          dp_amount: parseFloat(invoice.dp_amount),
          payment_status: invoice.payment_status,
        }
      : {
          source: 'estimate',
          ...estimate,
          payment_status: null,
        }
    
    // 6. Format response
    const formattedReservation = {
      id: reservation.id,
      reservation_code: reservation.reservation_code,
      contact: {
        name: reservation.contact_name,
        phone: reservation.contact_phone,
        email: reservation.contact_email,
      },
      schedule: {
        date: reservation.reservation_date,
        start_time: reservation.start_time,
        duration_minutes: reservation.duration_minutes,
      },
      guest_count: reservation.guest_count,
      table: {
        id: reservation.dining_tables.id,
        code: reservation.dining_tables.code,
        capacity: reservation.dining_tables.capacity,
        area: reservation.dining_tables.area,
      },
      items: reservation.reservation_items.map(item => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        name: item.menu_items.name,
        description: item.menu_items.description,
        photo_path: item.menu_items.photo_path,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
      })),
      status: reservation.status,
      validated_at: reservation.validated_at,
      checked_in_at: reservation.checked_in_at,
      rejection_reason: reservation.rejection_reason,
      notes: reservation.notes,
      created_at: reservation.created_at,
      updated_at: reservation.updated_at,
      invoice: invoice ? {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        subtotal: parseFloat(invoice.subtotal),
        tax_amount: parseFloat(invoice.tax_amount),
        total_amount: parseFloat(invoice.total_amount),
        dp_amount: parseFloat(invoice.dp_amount),
        payment_status: invoice.payment_status,
        issued_at: invoice.issued_at,
      } : null,
      bill,
      payments: payments.map(payment => ({
        id: payment.id,
        type: payment.type,
        method: payment.method,
        amount: parseFloat(payment.amount),
        status: payment.status,
        reference_no: payment.reference_no,
        paid_at: payment.paid_at,
      })),
      status_logs: (statusLogs || []).map(log => ({
        id: log.id,
        from_status: log.from_status,
        to_status: log.to_status,
        note: log.note,
        changed_by: log.changed_by,
        created_at: log.created_at,
      })),
      barcode_data: {
        code: reservation.reservation_code,
        type: 'reservation',
        reservation_id: reservation.id,
      },
    }
    
    return NextResponse.json({
      reservation: formattedReservation,
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
