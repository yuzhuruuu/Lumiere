// tests/integration/staff-reservations.mjs
// Uji alur staf end-to-end terhadap Next.js + Supabase lokal:
// pelanggan membuat reservasi -> staf mencari kode -> validasi -> invoice ->
// pembayaran DP/pelunasan -> check-in -> selesai.
//
// Script menolak URL non-localhost. Tidak ada data production yang disentuh.

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createChunks } from '@supabase/ssr/dist/main/utils/chunker.js'

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const appUrl = process.env.TEST_APP_URL || 'http://localhost:3000'
const anonKey = process.env.TEST_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY

if (!anonKey || !serviceRoleKey) {
  console.error(
    'TEST_SUPABASE_ANON_KEY dan TEST_SUPABASE_SERVICE_ROLE_KEY wajib diisi.'
  )
  process.exit(1)
}

const localUrlPattern = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/
if (!localUrlPattern.test(supabaseUrl) || !localUrlPattern.test(appUrl)) {
  console.error(
    'Uji API hanya boleh dijalankan terhadap Supabase dan aplikasi lokal.'
  )
  process.exit(1)
}

const stamp = Date.now().toString(36).toUpperCase()
const password = 'LumiereTest#2026'
const customerEmail = `staff-test-customer-${stamp.toLowerCase()}@lumiere.test`
const staffEmail = `staff-test-staff-${stamp.toLowerCase()}@lumiere.test`
const adminEmail = `staff-test-admin-${stamp.toLowerCase()}@lumiere.test`

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const results = []

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error })
    console.error(`FAIL  ${name}`)
    console.error(`      ${error.message}`)
  }
}

function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.code || ''} ${result.error.message}`)
  }
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw new Error(`Gagal membaca profil: ${error.message}`)
    if (data) return data

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('Profil pengguna uji tidak dibuat')
}

function buildCookie(session) {
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  const encoded =
    'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const chunks = createChunks(storageKey, encoded)

  return chunks
    .map((chunk) => `${chunk.name}=${encodeURIComponent(chunk.value)}`)
    .join('; ')
}

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }

  return { status: response.status, body: json }
}

async function main() {
  console.log(`Menyiapkan data uji alur staf di ${supabaseUrl} ...`)

  const profileResult = await admin.from('restaurant_profile').upsert(
    {
      id: 1,
      name: 'Lumière Staff Test',
      address: 'Jl. Uji Staf No. 1',
      min_order_amount: 300000,
      dp_percentage: 50,
      tax_percentage: 10,
      pending_timeout_minutes: 0,
    },
    { onConflict: 'id' }
  )
  assertNoError(profileResult, 'seed restaurant_profile')

  const hours = Array.from({ length: 7 }, (_, day) => ({
    day_of_week: day,
    open_time: '10:00:00',
    close_time: '24:00:00',
    is_closed: false,
  }))
  const hoursResult = await admin
    .from('operating_hours')
    .upsert(hours, { onConflict: 'day_of_week' })
  assertNoError(hoursResult, 'seed operating_hours')

  const categoryResult = await admin
    .from('menu_categories')
    .insert({ name: `Staff Test ${stamp}`, sort_order: 99 })
    .select('id')
    .single()
  assertNoError(categoryResult, 'create category')

  const menuResult = await admin
    .from('menu_items')
    .insert({
      category_id: categoryResult.data.id,
      name: 'Steak Staff Test',
      price: 150000,
      is_available: true,
    })
    .select('id, name, price')
    .single()
  assertNoError(menuResult, 'create menu item')

  const tableResult = await admin
    .from('dining_tables')
    .insert({
      code: `STF${stamp.slice(-5)}`,
      capacity: 4,
      area: 'Staff Test',
      is_active: true,
    })
    .select('id, code, capacity')
    .single()
  assertNoError(tableResult, 'create table')

  const menuItem = menuResult.data
  const table = tableResult.data

  const customerResult = await admin.auth.admin.createUser({
    email: customerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Staff Test Customer', phone: '081234567821' },
  })
  assertNoError(customerResult, 'create customer')
  await waitForProfile(customerResult.data.user.id)

  const staffResult = await admin.auth.admin.createUser({
    email: staffEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Staff Test Staff', phone: '081234567822' },
  })
  assertNoError(staffResult, 'create staff')
  await waitForProfile(staffResult.data.user.id)

  const { error: staffRoleError } = await admin
    .from('profiles')
    .update({ role: 'staf', is_active: true })
    .eq('id', staffResult.data.user.id)
  assertNoError({ error: staffRoleError }, 'set staff role')

  const adminResult = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Staff Test Admin', phone: '081234567823' },
  })
  assertNoError(adminResult, 'create admin')
  await waitForProfile(adminResult.data.user.id)

  const { error: adminRoleError } = await admin
    .from('profiles')
    .update({ role: 'admin', is_active: true })
    .eq('id', adminResult.data.user.id)
  assertNoError({ error: adminRoleError }, 'set admin role')

  const customerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const staffClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const customerLogin = await customerClient.auth.signInWithPassword({
    email: customerEmail,
    password,
  })
  assertNoError(customerLogin, 'login customer')
  const customerCookie = buildCookie(customerLogin.data.session)

  const staffLogin = await staffClient.auth.signInWithPassword({
    email: staffEmail,
    password,
  })
  assertNoError(staffLogin, 'login staff')
  const staffCookie = buildCookie(staffLogin.data.session)

  const adminLogin = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password,
  })
  assertNoError(adminLogin, 'login admin')
  const adminCookie = buildCookie(adminLogin.data.session)

  const reservationPayload = {
    contact_name: 'Staff Test Customer',
    contact_phone: '081234567821',
    contact_email: customerEmail,
    reservation_date: '2099-07-01',
    start_time: '19:00',
    duration_minutes: 120,
    guest_count: 4,
    table_id: table.id,
    items: [{ menu_item_id: menuItem.id, quantity: 2 }],
    notes: 'Uji alur staf',
  }

  let reservation = null
  let invoice = null

  await test('pelanggan membuat reservasi untuk diuji staf', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: customerCookie,
      body: reservationPayload,
    })

    assert.equal(response.status, 201)
    reservation = response.body.reservation
    assert.match(reservation.reservation_code, /^RSV-\d{6}-\d{5}$/)
  })

  await test('staf mencari reservasi berdasarkan kode barcode', async () => {
    const response = await request(
      `/api/staff/reservations?search=${encodeURIComponent(reservation.reservation_code)}`,
      { cookie: staffCookie }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.total, 1)
    assert.equal(
      response.body.reservations[0].reservation_code,
      reservation.reservation_code
    )
  })

  await test('pelanggan tidak boleh mengakses daftar reservasi staf', async () => {
    const response = await request('/api/staff/reservations', {
      cookie: customerCookie,
    })

    assert.equal(response.status, 403)
  })

  await test('pelanggan tidak boleh mengakses API admin', async () => {
    const response = await request('/api/admin/users', {
      cookie: customerCookie,
    })

    assert.equal(response.status, 403)
  })

  await test('staf tidak boleh mengakses API admin', async () => {
    const response = await request('/api/admin/users', {
      cookie: staffCookie,
    })

    assert.equal(response.status, 403)
  })

  await test('admin dapat membaca rekap transaksi dan pengguna', async () => {
    const report = await request('/api/admin/reports/summary', {
      cookie: adminCookie,
    })
    assert.equal(report.status, 200)
    assert.ok(report.body.revenue)
    assert.ok(report.body.invoices)
    assert.ok(report.body.reservations)
    assert.ok(Array.isArray(report.body.top_menu))

    const users = await request('/api/admin/users', { cookie: adminCookie })
    assert.equal(users.status, 200)
    assert.ok(users.body.total >= 1)
  })

  await test('staf menyetujui reservasi dan invoice langsung terbentuk', async () => {
    const response = await request(
      `/api/staff/reservations/${reservation.id}/validate`,
      {
        method: 'PATCH',
        cookie: staffCookie,
        body: { action: 'approve' },
      }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.status, 'dikonfirmasi')

    invoice = response.body.invoice
    assert.ok(invoice, 'invoice harus dibuat dalam satu langkah persetujuan')
    assert.match(invoice.invoice_number, /^INV-\d{6}-\d{5}$/)
    assert.equal(invoice.subtotal, 300000)
    assert.equal(invoice.tax_amount, 30000)
    assert.equal(invoice.total_amount, 330000)
    assert.equal(invoice.dp_amount, 165000)
    assert.equal(invoice.payment_status, 'belum_dibayar')
    assert.ok(invoice.dp_due_at, 'batas bayar DP harus terpasang')
  })

  await test('belum ada order dapur sebelum check-in', async () => {
    const { data: orders, error } = await admin
      .from('orders')
      .select('id')
      .eq('reservation_id', reservation.id)

    assertNoError({ error }, 'read orders')
    assert.equal(orders.length, 0)
  })

  await test('detail pelanggan memakai angka invoice, bukan estimasi', async () => {
    const response = await request(`/api/reservations/${reservation.id}`, {
      cookie: customerCookie,
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.bill.source, 'invoice')
    assert.equal(response.body.reservation.bill.total_amount, 330000)
    assert.equal(
      response.body.reservation.bill.payment_status,
      'belum_dibayar'
    )
  })

  await test('staf mencatat DP dan status invoice berubah', async () => {
    const response = await request('/api/staff/payments', {
      method: 'POST',
      cookie: staffCookie,
      body: {
        invoice_id: invoice.id,
        type: 'dp',
        method: 'transfer',
        amount: 165000,
        status: 'berhasil',
        reference_no: 'TEST-DP',
        idempotency_key: `dp-${stamp}`,
      },
    })

    assert.equal(response.status, 201)
    assert.equal(response.body.payment.amount, 165000)
    assert.equal(response.body.invoice.payment_status, 'dp_dibayar')
  })

  await test('staf mencatat pelunasan dan invoice menjadi lunas', async () => {
    const response = await request('/api/staff/payments', {
      method: 'POST',
      cookie: staffCookie,
      body: {
        invoice_id: invoice.id,
        type: 'pelunasan',
        method: 'transfer',
        amount: 165000,
        status: 'berhasil',
        reference_no: 'TEST-LUNAS',
        idempotency_key: `lunas-${stamp}`,
      },
    })

    assert.equal(response.status, 201)
    assert.equal(response.body.invoice.payment_status, 'lunas')
  })

  await test('staf melakukan check-in setelah reservasi dikonfirmasi', async () => {
    const response = await request(
      `/api/staff/reservations/${reservation.id}/check-in`,
      {
        method: 'PATCH',
        cookie: staffCookie,
        body: { action: 'check_in' },
      }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.status, 'check_in')
  })

  await test('check-in membuat order dapur dan status dapat diperbarui', async () => {
    const { data: orders, error } = await admin
      .from('orders')
      .select('id, status')
      .eq('reservation_id', reservation.id)

    assertNoError({ error }, 'read orders after check-in')
    assert.equal(orders.length, 1)
    assert.equal(orders[0].status, 'menunggu')

    const orderId = orders[0].id
    for (const status of ['disiapkan', 'disajikan', 'selesai']) {
      const response = await request(`/api/staff/orders/${orderId}`, {
        method: 'PATCH',
        cookie: staffCookie,
        body: { status },
      })
      assert.equal(response.status, 200)
      assert.equal(response.body.order.status, status)
    }

    const invalid = await request(`/api/staff/orders/${orderId}`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: { status: 'disiapkan' },
    })
    assert.equal(invalid.status, 409)
  })

  await test('check-in berulang ditolak', async () => {
    const response = await request(
      `/api/staff/reservations/${reservation.id}/check-in`,
      {
        method: 'PATCH',
        cookie: staffCookie,
        body: { action: 'check_in' },
      }
    )

    assert.equal(response.status, 409)
  })

  await test('staf menyelesaikan reservasi setelah check-in', async () => {
    const response = await request(
      `/api/staff/reservations/${reservation.id}/complete`,
      { method: 'PATCH', cookie: staffCookie }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.status, 'selesai')
  })

  await test('staf dapat menolak reservasi dengan alasan', async () => {
    const second = await request('/api/reservations', {
      method: 'POST',
      cookie: customerCookie,
      body: {
        ...reservationPayload,
        reservation_date: '2099-07-02',
      },
    })
    assert.equal(second.status, 201)

    const response = await request(
      `/api/staff/reservations/${second.body.reservation.id}/validate`,
      {
        method: 'PATCH',
        cookie: staffCookie,
        body: {
          action: 'reject',
          rejection_reason: 'Jadwal meja tidak tersedia untuk permintaan ini',
        },
      }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.status, 'ditolak')
    assert.match(response.body.reservation.rejection_reason, /jadwal meja/i)
  })

  await test('pencarian kode yang tidak ada mengembalikan hasil kosong', async () => {
    const response = await request(
      '/api/staff/reservations?search=RSV-000000-00000',
      { cookie: staffCookie }
    )

    assert.equal(response.status, 200)
    assert.equal(response.body.total, 0)
  })

  console.log('')
  const passed = results.filter((result) => result.ok).length
  console.log(`${passed}/${results.length} pengujian alur staf lulus`)

  if (passed !== results.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exitCode = 1
})
