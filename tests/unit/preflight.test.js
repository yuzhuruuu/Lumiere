import { afterEach, describe, expect, it, vi } from 'vitest'
import { preflightReservation } from '@/lib/reservations/preflight'

function createSupabaseMock({
  table = {
    id: 1,
    code: 'T1',
    capacity: 4,
    is_active: true,
  },
  hours = {
    open_time: '10:00:00',
    close_time: '24:00:00',
    is_closed: false,
  },
  menuItems = [
    { id: 1, name: 'Steak', price: 150000, is_available: true },
  ],
  profile = { min_order_amount: 300000 },
} = {}) {
  return {
    from(tableName) {
      const resultByTable = {
        dining_tables: { data: table, error: null },
        operating_hours: { data: hours, error: null },
        menu_items: { data: menuItems, error: null },
        restaurant_profile: { data: profile, error: null },
      }
      const result = resultByTable[tableName] || { data: null, error: null }
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        maybeSingle: async () => result,
      }

      // Query menu memakai .select().in() dan langsung di-await.
      builder.in = () => Promise.resolve(result)

      return builder
    },
  }
}

function payload(overrides = {}) {
  return {
    contact_name: 'Budi',
    contact_phone: '081234567890',
    contact_email: 'budi@example.com',
    reservation_date: '2099-01-01',
    start_time: '19:00',
    duration_minutes: 120,
    guest_count: 4,
    table_id: 1,
    items: [{ menu_item_id: 1, quantity: 2 }],
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('preflightReservation', () => {
  it('lolos untuk reservasi valid dan menghitung subtotal dari harga DB', async () => {
    const result = await preflightReservation(
      createSupabaseMock(),
      payload()
    )

    expect(result.error).toBeUndefined()
    expect(result.subtotal).toBe(300000)
    expect(result.minimumOrder).toBe(300000)
  })

  it('menolak meja yang tidak ada atau tidak aktif', async () => {
    const missing = await preflightReservation(
      createSupabaseMock({ table: null }),
      payload()
    )
    expect(missing.error.status).toBe(422)
    expect(missing.error.body.error).toContain('tidak ditemukan')

    const inactive = await preflightReservation(
      createSupabaseMock({
        table: { id: 1, code: 'T1', capacity: 4, is_active: false },
      }),
      payload()
    )
    expect(inactive.error.status).toBe(422)
    expect(inactive.error.body.error).toContain('tidak aktif')
  })

  it('menolak jumlah tamu melebihi kapasitas', async () => {
    const result = await preflightReservation(
      createSupabaseMock(),
      payload({ guest_count: 5 })
    )

    expect(result.error.status).toBe(422)
    expect(result.error.body.details).toEqual({
      guest_count: 5,
      table_capacity: 4,
    })
  })

  it('menolak hari tutup dan jam di luar operasional', async () => {
    const closed = await preflightReservation(
      createSupabaseMock({
        hours: {
          open_time: '10:00:00',
          close_time: '24:00:00',
          is_closed: true,
        },
      }),
      payload()
    )
    expect(closed.error.status).toBe(422)
    expect(closed.error.body.error).toContain('tutup')

    const outside = await preflightReservation(
      createSupabaseMock(),
      payload({ start_time: '09:00' })
    )
    expect(outside.error.status).toBe(422)
    expect(outside.error.body.error).toContain('jam operasional')
  })

  it('menolak menu yang tidak ditemukan atau tidak tersedia', async () => {
    const missing = await preflightReservation(
      createSupabaseMock({ menuItems: [] }),
      payload()
    )
    expect(missing.error.status).toBe(422)
    expect(missing.error.body.error).toContain('tidak ditemukan')

    const unavailable = await preflightReservation(
      createSupabaseMock({
        menuItems: [
          { id: 1, name: 'Steak', price: 150000, is_available: false },
        ],
      }),
      payload()
    )
    expect(unavailable.error.status).toBe(422)
    expect(unavailable.error.body.error).toContain('Steak')
  })

  it('menolak subtotal di bawah minimum dan menyertakan kekurangan', async () => {
    const result = await preflightReservation(
      createSupabaseMock(),
      payload({ items: [{ menu_item_id: 1, quantity: 1 }] })
    )

    expect(result.error.status).toBe(422)
    expect(result.error.body.details).toEqual({
      subtotal: 150000,
      minimum_order: 300000,
      shortfall: 150000,
    })
    expect(result.error.body.error).toContain('150.000')
  })

  it('menolak reservasi hari ini yang jam mulainya sudah lewat', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T12:00:00+07:00'))

    const result = await preflightReservation(
      createSupabaseMock(),
      payload({
        reservation_date: '2026-11-18',
        start_time: '10:00',
      })
    )

    expect(result.error.status).toBe(422)
    expect(result.error.body.error).toContain('sudah lewat')
  })

  it('menolak jika konfigurasi restoran tidak ada', async () => {
    const result = await preflightReservation(
      createSupabaseMock({ profile: null }),
      payload()
    )

    expect(result.error.status).toBe(500)
    expect(result.error.body.error).toContain('Konfigurasi restoran')
  })
})
