import { describe, expect, it } from 'vitest'
import { mapCreateReservationError } from '@/lib/reservations/errors'

describe('mapCreateReservationError', () => {
  it('memetakan benturan jadwal ke 409', () => {
    const mapped = mapCreateReservationError({
      code: '23P01',
      message: 'conflicting key value violates exclusion constraint',
    })

    expect(mapped.status).toBe(409)
    expect(mapped.body.error).toContain('sudah dipesan')
  })

  it('memetakan minimum pembelian ke 422 beserta kekurangannya', () => {
    const mapped = mapCreateReservationError(
      {
        code: '23514',
        message: 'Total pesanan (150000.00) kurang dari minimal pembelian (300000.00)',
      },
      { subtotal: 150000, minimumOrder: 300000 }
    )

    expect(mapped.status).toBe(422)
    expect(mapped.body.details).toEqual({
      subtotal: 150000,
      minimum_order: 300000,
      shortfall: 150000,
    })
    expect(mapped.body.error).toContain('150.000')
  })

  it('memetakan menu yang tidak tersedia ke 422 dengan nama menu', () => {
    const mapped = mapCreateReservationError({
      code: '23514',
      message: 'Menu "Steak Wagyu" sedang tidak tersedia',
    })

    expect(mapped.status).toBe(422)
    expect(mapped.body.error).toContain('Steak Wagyu')
  })

  it('memetakan kapasitas, jam operasional, dan masa lalu ke 422', () => {
    const capacity = mapCreateReservationError({
      code: '23514',
      message: 'Jumlah tamu (5) melebihi kapasitas meja T1 (4)',
    })
    expect(capacity.status).toBe(422)
    expect(capacity.body.error).toContain('Kapasitas meja')

    const hours = mapCreateReservationError({
      code: '23514',
      message: 'Waktu reservasi di luar jam operasional (10:00 - 24:00)',
    })
    expect(hours.status).toBe(422)
    expect(hours.body.error).toContain('jam operasional')

    const past = mapCreateReservationError({
      code: '23514',
      message: 'Tanggal reservasi tidak boleh di masa lalu',
    })
    expect(past.status).toBe(422)
    expect(past.body.error).toContain('masa lalu')
  })

  it('memetakan foreign key, format tanggal, dan akses ke status yang tepat', () => {
    expect(
      mapCreateReservationError({ code: '23503', message: 'FK violation' })
        .status
    ).toBe(422)
    expect(
      mapCreateReservationError({ code: '22007', message: 'invalid time' })
        .status
    ).toBe(400)
    expect(
      mapCreateReservationError({ code: '42501', message: 'RLS' }).status
    ).toBe(403)
  })

  it('memakai 500 untuk error yang tidak dikenal', () => {
    const mapped = mapCreateReservationError(
      new Error('koneksi database gagal')
    )
    expect(mapped.status).toBe(500)
    expect(mapped.body.error).toContain('Gagal membuat reservasi')
  })
})
