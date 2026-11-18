// tests/integration/reservations.mjs
// Uji integrasi reservasi terhadap Supabase LOKAL.
//
// Yang diuji adalah kontrak database yang sesungguhnya:
// - reservasi + item menu tersimpan dalam satu transaksi
// - kapasitas meja dan jam operasional ditolak database
// - benturan jadwal ditolak exclusion constraint (termasuk request paralel)
// - minimum pembelian dan harga snapshot
// - RLS: pelanggan lain tidak bisa membaca reservasi orang lain
//
// Jalankan hanya terhadap Supabase lokal. Script menolak URL non-localhost
// supaya tidak pernah membuat data uji di production.
//
// Contoh:
//   $env:TEST_SUPABASE_URL = 'http://127.0.0.1:54321'
//   $env:TEST_SUPABASE_ANON_KEY = '...'
//   $env:TEST_SUPABASE_SERVICE_ROLE_KEY = '...'
//   npm run test:integration

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.TEST_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY

if (!anonKey || !serviceRoleKey) {
  console.error(
    'TEST_SUPABASE_ANON_KEY dan TEST_SUPABASE_SERVICE_ROLE_KEY wajib diisi.'
  )
  process.exit(1)
}

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  console.error(
    'Uji integrasi hanya boleh dijalankan terhadap Supabase lokal (localhost/127.0.0.1).'
  )
  process.exit(1)
}

const stamp = Date.now().toString(36).toUpperCase()
const password = 'LumiereTest#2026'
const emailA = `reservation-test-a-${stamp.toLowerCase()}@lumiere.test`
const emailB = `reservation-test-b-${stamp.toLowerCase()}@lumiere.test`

const admin = createClient(url, serviceRoleKey, {
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

function todayJakarta() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type) => parts.find((part) => part.type === type).value
  return `${value('year')}-${value('month')}-${value('day')}`
}

function dayOfWeekForDate(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
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

  throw new Error('Profil pengguna uji tidak dibuat oleh trigger auth.users')
}

async function main() {
  console.log(`Menyiapkan data uji di ${url} ...`)

  const { error: profileError } = await admin.from('restaurant_profile').upsert(
    {
      id: 1,
      name: 'Lumière Test',
      address: 'Jl. Uji Integrasi No. 1',
      min_order_amount: 300000,
      dp_percentage: 50,
      tax_percentage: 10,
      pending_timeout_minutes: 0,
    },
    { onConflict: 'id' }
  )
  assertNoError({ error: profileError }, 'seed restaurant_profile')

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
    .insert({ name: `Test ${stamp}`, sort_order: 99 })
    .select('id')
    .single()
  assertNoError(categoryResult, 'seed menu_categories')
  const categoryId = categoryResult.data.id

  const menuResult = await admin
    .from('menu_items')
    .insert([
      {
        category_id: categoryId,
        name: 'Steak Uji',
        price: 150000,
        is_available: true,
      },
      {
        category_id: categoryId,
        name: 'Pasta Uji',
        price: 200000,
        is_available: true,
      },
      {
        category_id: categoryId,
        name: 'Menu Tidak Tersedia Uji',
        price: 100000,
        is_available: false,
      },
      {
        category_id: categoryId,
        name: 'Menu Snapshot Uji',
        price: 100000,
        is_available: true,
      },
    ])
    .select('id, name')
  assertNoError(menuResult, 'seed menu_items')

  const menuByName = Object.fromEntries(
    menuResult.data.map((item) => [item.name, item])
  )

  const tableCodes = {
    a: `TA${stamp.slice(-4)}`,
    b: `TB${stamp.slice(-4)}`,
    c: `TC${stamp.slice(-4)}`,
    d: `TD${stamp.slice(-4)}`,
  }

  const tableResult = await admin
    .from('dining_tables')
    .insert([
      { code: tableCodes.a, capacity: 4, area: 'Indoor', is_active: true },
      { code: tableCodes.b, capacity: 4, area: 'Indoor', is_active: true },
      { code: tableCodes.c, capacity: 2, area: 'Outdoor', is_active: true },
      { code: tableCodes.d, capacity: 8, area: 'VIP', is_active: false },
    ])
    .select('id, code, capacity, is_active')
  assertNoError(tableResult, 'seed dining_tables')

  const tableByCode = Object.fromEntries(
    tableResult.data.map((table) => [table.code, table])
  )
  const tableA = tableByCode[tableCodes.a]
  const tableB = tableByCode[tableCodes.b]
  const tableC = tableByCode[tableCodes.c]
  const tableD = tableByCode[tableCodes.d]

  const userAResult = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Pelanggan Uji A', phone: '081234567801' },
  })
  assertNoError(userAResult, 'create user A')
  const userA = userAResult.data.user
  await waitForProfile(userA.id)

  const userBResult = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Pelanggan Uji B', phone: '081234567802' },
  })
  assertNoError(userBResult, 'create user B')
  const userB = userBResult.data.user
  await waitForProfile(userB.id)

  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const anonymousClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const loginA = await clientA.auth.signInWithPassword({
    email: emailA,
    password,
  })
  assertNoError(loginA, 'login A')
  const loginB = await clientB.auth.signInWithPassword({
    email: emailB,
    password,
  })
  assertNoError(loginB, 'login B')

  function createReservation(client, overrides = {}) {
    return client.rpc('create_reservation', {
      p_contact_name: 'Pelanggan Uji',
      p_contact_phone: '081234567890',
      p_contact_email: 'pelanggan.uji@example.com',
      p_reservation_date: '2099-01-01',
      p_start_time: '19:00',
      p_duration_minutes: 120,
      p_guest_count: 4,
      p_table_id: tableA.id,
      p_items: [{ menu_item_id: menuByName['Steak Uji'].id, quantity: 2 }],
      p_notes: null,
      ...overrides,
    })
  }

  async function countReservations(tableId, date) {
    const { data, error } = await admin
      .from('reservations')
      .select('id')
      .eq('table_id', tableId)
      .eq('reservation_date', date)

    assertNoError({ error }, 'count reservations')
    return data.length
  }

  async function withTodayAllDayHours(fn) {
    const today = todayJakarta()
    const dayOfWeek = dayOfWeekForDate(today)
    const { data: oldHours, error: readError } = await admin
      .from('operating_hours')
      .select('open_time, close_time, is_closed')
      .eq('day_of_week', dayOfWeek)
      .single()

    assertNoError({ error: readError }, 'read today operating hours')

    const { error: updateError } = await admin
      .from('operating_hours')
      .update({
        open_time: '00:00:00',
        close_time: '24:00:00',
        is_closed: false,
      })
      .eq('day_of_week', dayOfWeek)

    assertNoError({ error: updateError }, 'set today operating hours')

    try {
      return await fn(today, dayOfWeek)
    } finally {
      const { error: restoreError } = await admin
        .from('operating_hours')
        .update(oldHours)
        .eq('day_of_week', dayOfWeek)

      assertNoError({ error: restoreError }, 'restore today operating hours')
    }
  }

  let validReservation

  await test('TC-06 reservasi valid menyimpan reservasi, item, dan harga snapshot', async () => {
    const result = await createReservation(clientA)
    assertNoError(result, 'create valid reservation')
    validReservation = result.data

    assert.match(validReservation.reservation_code, /^RSV-\d{6}-\d{5}$/)
    assert.equal(validReservation.status, 'menunggu_validasi')
    assert.equal(validReservation.customer_id, userA.id)
    assert.equal(validReservation.guest_count, 4)

    const itemsResult = await clientA
      .from('reservation_items')
      .select('menu_item_id, quantity, unit_price, subtotal')
      .eq('reservation_id', validReservation.id)
    assertNoError(itemsResult, 'read reservation items')
    assert.equal(itemsResult.data.length, 1)
    assert.equal(
      itemsResult.data[0].menu_item_id,
      menuByName['Steak Uji'].id
    )
    assert.equal(itemsResult.data[0].quantity, 2)
    assert.equal(Number(itemsResult.data[0].unit_price), 150000)
    assert.equal(Number(itemsResult.data[0].subtotal), 300000)

    const logResult = await clientA
      .from('reservation_status_logs')
      .select('from_status, to_status')
      .eq('reservation_id', validReservation.id)
    assertNoError(logResult, 'read status logs')
    assert.equal(logResult.data.length, 1)
    assert.equal(logResult.data[0].from_status, null)
    assert.equal(logResult.data[0].to_status, 'menunggu_validasi')
  })

  await test('TC-06b beberapa menu dan kuantitas tersimpan dan terhubung', async () => {
    const result = await createReservation(clientA, {
      p_reservation_date: '2099-01-06',
      p_table_id: tableA.id,
      p_items: [
        { menu_item_id: menuByName['Steak Uji'].id, quantity: 1 },
        { menu_item_id: menuByName['Pasta Uji'].id, quantity: 1 },
      ],
    })
    assertNoError(result, 'create multi-item reservation')

    const itemsResult = await clientA
      .from('reservation_items')
      .select('menu_item_id, quantity, unit_price, subtotal')
      .eq('reservation_id', result.data.id)
    assertNoError(itemsResult, 'read multi items')
    assert.equal(itemsResult.data.length, 2)

    const total = itemsResult.data.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    )
    assert.equal(total, 350000)
  })

  await test('TC-07 jumlah tamu melebihi kapasitas ditolak database', async () => {
    const date = '2099-02-01'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 3,
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /melebihi kapasitas/i)
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('TC-08 benturan waktu pada meja yang sama ditolak', async () => {
    const date = '2099-01-02'
    const first = await createReservation(clientA, {
      p_reservation_date: date,
      p_start_time: '19:00',
      p_table_id: tableA.id,
    })
    assertNoError(first, 'create first booking')

    const conflict = await createReservation(clientB, {
      p_reservation_date: date,
      p_start_time: '20:00',
      p_table_id: tableA.id,
    })

    assert.equal(conflict.error?.code, '23P01')
    assert.equal(await countReservations(tableA.id, date), 1)
  })

  await test('TC-08b reservasi yang bersambung tepat di batas diperbolehkan', async () => {
    const date = '2099-01-02'
    const adjacent = await createReservation(clientA, {
      p_reservation_date: date,
      p_start_time: '21:00',
      p_table_id: tableA.id,
    })

    assertNoError(adjacent, 'create adjacent booking')
    assert.equal(await countReservations(tableA.id, date), 2)
  })

  await test('TC-08c meja berbeda pada waktu yang sama diperbolehkan', async () => {
    const date = '2099-01-02'
    const otherTable = await createReservation(clientB, {
      p_reservation_date: date,
      p_start_time: '19:00',
      p_table_id: tableB.id,
    })

    assertNoError(otherTable, 'create other table booking')
    assert.equal(await countReservations(tableB.id, date), 1)
  })

  await test('TC-08d tanggal berbeda pada meja dan jam yang sama diperbolehkan', async () => {
    const result = await createReservation(clientA, {
      p_reservation_date: '2099-01-03',
      p_start_time: '19:00',
      p_table_id: tableA.id,
    })

    assertNoError(result, 'create booking on another date')
    assert.equal(await countReservations(tableA.id, '2099-01-03'), 1)
  })

  await test('TC-09 dua request paralel tidak menghasilkan double booking', async () => {
    const date = '2099-01-04'
    const [first, second] = await Promise.all([
      createReservation(clientA, {
        p_reservation_date: date,
        p_start_time: '19:00',
        p_table_id: tableB.id,
      }),
      createReservation(clientB, {
        p_reservation_date: date,
        p_start_time: '19:00',
        p_table_id: tableB.id,
      }),
    ])

    const successes = [first, second].filter((result) => !result.error)
    const conflicts = [first, second].filter(
      (result) => result.error?.code === '23P01'
    )

    assert.equal(successes.length, 1, 'harus tepat satu reservasi berhasil')
    assert.equal(conflicts.length, 1, 'satu request harus kena exclusion constraint')
    assert.equal(await countReservations(tableB.id, date), 1)
  })

  await test('TC-10 subtotal di bawah minimum ditolak dan transaksi rollback', async () => {
    const date = '2099-02-02'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
      p_items: [{ menu_item_id: menuByName['Steak Uji'].id, quantity: 1 }],
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /minimal pembelian/i)
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('TC-11 subtotal tepat sama dengan minimum diterima', async () => {
    const date = '2099-02-03'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
      p_items: [{ menu_item_id: menuByName['Steak Uji'].id, quantity: 2 }],
    })

    assertNoError(result, 'create exactly minimum reservation')
    assert.equal(await countReservations(tableC.id, date), 1)
  })

  await test('menu tidak tersedia ditolak dan transaksi rollback', async () => {
    const date = '2099-02-04'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
      p_items: [
        {
          menu_item_id: menuByName['Menu Tidak Tersedia Uji'].id,
          quantity: 3,
        },
      ],
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /sedang tidak tersedia/i)
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('meja tidak aktif ditolak database', async () => {
    const date = '2099-02-05'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableD.id,
      p_guest_count: 4,
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /tidak aktif/i)
    assert.equal(await countReservations(tableD.id, date), 0)
  })

  await test('jam di luar operasional ditolak database', async () => {
    const date = '2099-02-06'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_start_time: '09:00',
      p_table_id: tableC.id,
      p_guest_count: 2,
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /jam operasional/i)
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('tanggal masa lalu ditolak database', async () => {
    const date = '2000-01-01'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
    })

    assert.equal(result.error?.code, '23514')
    assert.match(result.error.message, /masa lalu/i)
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('TC-08e reservasi hari ini dengan jam sudah lewat ditolak database', async () => {
    await withTodayAllDayHours(async (today) => {
      const result = await createReservation(clientA, {
        p_reservation_date: today,
        p_start_time: '00:00',
        p_table_id: tableC.id,
        p_guest_count: 2,
      })

      assert.equal(result.error?.code, '23514')
      assert.match(result.error.message, /sudah lewat/i)
      assert.equal(await countReservations(tableC.id, today), 0)
    })
  })

  await test('TC-08f reschedule ke jam hari ini yang sudah lewat ditolak database', async () => {
    await withTodayAllDayHours(async (today) => {
      const created = await createReservation(clientA, {
        p_reservation_date: '2099-02-12',
        p_start_time: '19:00',
        p_table_id: tableC.id,
        p_guest_count: 2,
      })
      assertNoError(created, 'create future reservation for reschedule test')

      const update = await admin
        .from('reservations')
        .update({ reservation_date: today, start_time: '00:00' })
        .eq('id', created.data.id)

      assert.equal(update.error?.code, '23514')
      assert.match(update.error.message, /sudah lewat/i)

      const persisted = await clientA
        .from('reservations')
        .select('reservation_date, start_time')
        .eq('id', created.data.id)
        .single()
      assertNoError(persisted, 'read reservation after rejected reschedule')
      assert.equal(persisted.data.reservation_date, '2099-02-12')
    })
  })

  await test('durasi dan jumlah tamu di luar batas ditolak database', async () => {
    const durationDate = '2099-02-07'
    const duration = await createReservation(clientA, {
      p_reservation_date: durationDate,
      p_duration_minutes: 45,
      p_table_id: tableC.id,
      p_guest_count: 2,
    })
    assert.equal(duration.error?.code, '23514')
    assert.equal(await countReservations(tableC.id, durationDate), 0)

    const guestDate = '2099-02-08'
    const guests = await createReservation(clientA, {
      p_reservation_date: guestDate,
      p_guest_count: 51,
      p_table_id: tableC.id,
    })
    assert.equal(guests.error?.code, '23514')
    assert.equal(await countReservations(tableC.id, guestDate), 0)
  })

  await test('dua item menu yang sama ditolak unique constraint', async () => {
    const date = '2099-02-09'
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
      p_items: [
        { menu_item_id: menuByName['Steak Uji'].id, quantity: 1 },
        { menu_item_id: menuByName['Steak Uji'].id, quantity: 1 },
      ],
    })

    assert.equal(result.error?.code, '23505')
    assert.equal(await countReservations(tableC.id, date), 0)
  })

  await test('harga menu dibekukan saat reservasi dibuat', async () => {
    const date = '2099-02-10'
    const snapshotMenu = menuByName['Menu Snapshot Uji']
    const result = await createReservation(clientA, {
      p_reservation_date: date,
      p_table_id: tableC.id,
      p_guest_count: 2,
      p_items: [{ menu_item_id: snapshotMenu.id, quantity: 3 }],
    })
    assertNoError(result, 'create snapshot reservation')

    const updateResult = await admin
      .from('menu_items')
      .update({ price: 200000 })
      .eq('id', snapshotMenu.id)
    assertNoError(updateResult, 'update menu price')

    const itemsResult = await clientA
      .from('reservation_items')
      .select('unit_price, subtotal')
      .eq('reservation_id', result.data.id)
      .single()
    assertNoError(itemsResult, 'read snapshot item')
    assert.equal(Number(itemsResult.data.unit_price), 100000)
    assert.equal(Number(itemsResult.data.subtotal), 300000)
  })

  await test('TC-21 pelanggan lain tidak dapat membaca reservasi (RLS)', async () => {
    const reservationResult = await clientB
      .from('reservations')
      .select('id')
      .eq('id', validReservation.id)
    assertNoError(reservationResult, 'B read A reservation')
    assert.equal(reservationResult.data.length, 0)

    const itemsResult = await clientB
      .from('reservation_items')
      .select('id')
      .eq('reservation_id', validReservation.id)
    assertNoError(itemsResult, 'B read A reservation items')
    assert.equal(itemsResult.data.length, 0)
  })

  await test('TC-05 pengguna anonim tidak dapat membuat reservasi', async () => {
    const result = await createReservation(anonymousClient)

    // RLS dapat menolak lebih dulu (42501) sebelum auth.uid() di fungsi
    // sempat dievaluasi; keduanya berarti request anonim tidak boleh lolos.
    assert.ok(
      ['28000', '42501'].includes(result.error?.code),
      `kode error tak terduga: ${result.error?.code}`
    )
  })

  console.log('')
  const passed = results.filter((result) => result.ok).length
  console.log(`${passed}/${results.length} pengujian integrasi lulus`)

  if (passed !== results.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exitCode = 1
})
