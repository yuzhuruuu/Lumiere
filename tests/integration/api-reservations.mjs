// tests/integration/api-reservations.mjs
// Uji end-to-end route API reservasi terhadap aplikasi Next.js lokal
// yang terhubung ke Supabase lokal.
//
// Prasyarat:
// - Supabase lokal berjalan (migration 1-6 sudah diterapkan)
// - Next.js dev server berjalan dengan env Supabase lokal
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
const emailA = `api-test-a-${stamp.toLowerCase()}@lumiere.test`
const emailB = `api-test-b-${stamp.toLowerCase()}@lumiere.test`
const emailAdmin = `api-test-admin-${stamp.toLowerCase()}@lumiere.test`

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
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw new Error(`Gagal membaca profil: ${error.message}`)
    if (data) return

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
  console.log(`Menyiapkan data uji API di ${supabaseUrl} ...`)

  const profileResult = await admin.from('restaurant_profile').upsert(
    {
      id: 1,
      name: 'Lumière API Test',
      address: 'Jl. Uji API No. 1',
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
    .insert({ name: `API Test ${stamp}`, sort_order: 99 })
    .select('id')
    .single()
  assertNoError(categoryResult, 'create category')

  const menuResult = await admin
    .from('menu_items')
    .insert({
      category_id: categoryResult.data.id,
      name: 'Steak API Test',
      price: 150000,
      is_available: true,
    })
    .select('id, name, price')
    .single()
  assertNoError(menuResult, 'create menu item')

  const tableResult = await admin
    .from('dining_tables')
    .insert({
      code: `API${stamp.slice(-5)}`,
      capacity: 4,
      area: 'API Test',
      is_active: true,
    })
    .select('id, code, capacity')
    .single()
  assertNoError(tableResult, 'create table')

  const menuItem = menuResult.data
  const table = tableResult.data

  const userAResult = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'API Test A', phone: '081234567811' },
  })
  assertNoError(userAResult, 'create user A')
  await waitForProfile(userAResult.data.user.id)

  const userBResult = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'API Test B', phone: '081234567812' },
  })
  assertNoError(userBResult, 'create user B')
  await waitForProfile(userBResult.data.user.id)

  const adminUserResult = await admin.auth.admin.createUser({
    email: emailAdmin,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'API Test Admin', phone: '081234567813' },
  })
  assertNoError(adminUserResult, 'create admin user')
  await waitForProfile(adminUserResult.data.user.id)
  const { error: adminRoleError } = await admin
    .from('profiles')
    .update({ role: 'admin', is_active: true })
    .eq('id', adminUserResult.data.user.id)
  assertNoError({ error: adminRoleError }, 'set admin role')

  const clientA = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const clientB = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const clientAdmin = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const loginA = await clientA.auth.signInWithPassword({
    email: emailA,
    password,
  })
  assertNoError(loginA, 'login A')
  const cookieA = buildCookie(loginA.data.session)

  const loginB = await clientB.auth.signInWithPassword({
    email: emailB,
    password,
  })
  assertNoError(loginB, 'login B')
  const cookieB = buildCookie(loginB.data.session)

  const loginAdmin = await clientAdmin.auth.signInWithPassword({
    email: emailAdmin,
    password,
  })
  assertNoError(loginAdmin, 'login admin')
  const cookieAdmin = buildCookie(loginAdmin.data.session)

  const date = '2099-06-01'
  const startTime = '19:00'
  const duration = 120
  const guestCount = 4

  const payload = {
    contact_name: 'API Test A',
    contact_phone: '081234567811',
    contact_email: emailA,
    reservation_date: date,
    start_time: startTime,
    duration_minutes: duration,
    guest_count: guestCount,
    table_id: table.id,
    items: [{ menu_item_id: menuItem.id, quantity: 2 }],
    notes: 'Uji API',
  }

  let createdReservation = null

  await test('check-availability membutuhkan login', async () => {
    const response = await request('/api/reservations/check-availability', {
      method: 'POST',
      body: {
        reservation_date: date,
        start_time: startTime,
        duration_minutes: duration,
        guest_count: guestCount,
      },
    })

    assert.equal(response.status, 401)
    assert.match(response.body.error, /login/i)
  })

  await test('check-availability mengembalikan meja yang tersedia', async () => {
    const response = await request('/api/reservations/check-availability', {
      method: 'POST',
      cookie: cookieA,
      body: {
        reservation_date: date,
        start_time: startTime,
        duration_minutes: duration,
        guest_count: guestCount,
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.is_open, true)
    assert.equal(response.body.query.end_time, '21:00')
    assert.ok(
      response.body.available_tables.some((item) => item.id === table.id),
      'meja uji harus tersedia sebelum reservasi'
    )
  })

  await test('membuat reservasi lewat API menyimpan item dan tagihan 10% pajak', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: payload,
    })

    assert.equal(response.status, 201)
    assert.match(
      response.body.reservation.reservation_code,
      /^RSV-\d{6}-\d{5}$/
    )
    assert.equal(response.body.reservation.status, 'menunggu_validasi')
    assert.equal(response.body.items.length, 1)
    assert.equal(response.body.items[0].quantity, 2)
    assert.equal(response.body.items[0].unit_price, 150000)
    assert.equal(response.body.items[0].subtotal, 300000)
    assert.equal(response.body.bill.source, 'estimate')
    assert.equal(response.body.bill.subtotal, 300000)
    assert.equal(response.body.bill.tax_amount, 30000)
    assert.equal(response.body.bill.total_amount, 330000)
    assert.equal(response.body.bill.dp_amount, 165000)

    createdReservation = response.body.reservation
  })

  await test('detail reservasi mengembalikan item dan data barcode', async () => {
    assert.ok(createdReservation, 'reservasi harus sudah dibuat')

    const response = await request(`/api/reservations/${createdReservation.id}`, {
      cookie: cookieA,
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.reservation.items.length, 1)
    assert.equal(response.body.reservation.barcode_data.code, createdReservation.reservation_code)
    assert.equal(response.body.reservation.barcode_data.type, 'reservation')
  })

  await test('meja yang sudah dipesan hilang dari daftar ketersediaan (lintas pelanggan)', async () => {
    const response = await request('/api/reservations/check-availability', {
      method: 'POST',
      cookie: cookieA,
      body: {
        reservation_date: date,
        start_time: startTime,
        duration_minutes: duration,
        guest_count: guestCount,
      },
    })

    assert.equal(response.status, 200)
    assert.equal(
      response.body.available_tables.some((item) => item.id === table.id),
      false
    )

    // Pelanggan lain juga harus melihat meja ini sibuk. Ini yang menguji
    // query agregat lintas-RLS di route check-availability.
    const responseB = await request('/api/reservations/check-availability', {
      method: 'POST',
      cookie: cookieB,
      body: {
        reservation_date: date,
        start_time: startTime,
        duration_minutes: duration,
        guest_count: guestCount,
      },
    })

    assert.equal(responseB.status, 200)
    assert.equal(
      responseB.body.available_tables.some((item) => item.id === table.id),
      false
    )
  })

  await test('benturan jadwal lewat API menghasilkan 409', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: payload,
    })

    assert.equal(response.status, 409)
    assert.match(response.body.error, /sudah dipesan/i)
  })

  await test('kapasitas tamu lewat API ditolak dengan pesan jelas', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: {
        ...payload,
        reservation_date: '2099-06-02',
        guest_count: 5,
      },
    })

    assert.equal(response.status, 422)
    assert.match(response.body.error, /kapasitas/i)
    assert.equal(response.body.details.guest_count, 5)
    assert.equal(response.body.details.table_capacity, 4)
  })

  await test('minimum pembelian lewat API menampilkan kekurangan', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: {
        ...payload,
        reservation_date: '2099-06-03',
        guest_count: 2,
        items: [{ menu_item_id: menuItem.id, quantity: 1 }],
      },
    })

    assert.equal(response.status, 422)
    assert.equal(response.body.details.subtotal, 150000)
    assert.equal(response.body.details.minimum_order, 300000)
    assert.equal(response.body.details.shortfall, 150000)
    assert.match(response.body.error, /kurang/i)
  })

  await test('tanggal dan jam tidak valid ditolak sebagai 400', async () => {
    const invalidDate = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: { ...payload, reservation_date: '2026-02-30' },
    })
    assert.equal(invalidDate.status, 400)

    const invalidTime = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieA,
      body: { ...payload, start_time: '24:00' },
    })
    assert.equal(invalidTime.status, 400)
  })

  await test('pengguna anonim tidak bisa membuat reservasi', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      body: payload,
    })

    assert.equal(response.status, 401)
  })

  await test('pelanggan lain tidak bisa membuka detail reservasi (RLS + route)', async () => {
    assert.ok(createdReservation, 'reservasi harus sudah dibuat')

    const response = await request(`/api/reservations/${createdReservation.id}`, {
      cookie: cookieB,
    })

    assert.equal(response.status, 404)
  })

  await test('admin dapat membuat reservasi untuk pelanggan lewat API', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieAdmin,
      body: {
        ...payload,
        customer_id: userAResult.data.user.id,
        reservation_date: '2099-06-10',
      },
    })

    assert.equal(response.status, 201)
    assert.equal(response.body.reservation.customer_id, userAResult.data.user.id)
  })

  await test('admin wajib memilih pelanggan', async () => {
    const response = await request('/api/reservations', {
      method: 'POST',
      cookie: cookieAdmin,
      body: { ...payload, customer_id: undefined, reservation_date: '2099-06-11' },
    })

    assert.equal(response.status, 400)
  })

  console.log('')
  const passed = results.filter((result) => result.ok).length
  console.log(`${passed}/${results.length} pengujian API lulus`)

  if (passed !== results.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exitCode = 1
})
