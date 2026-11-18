import { describe, expect, it } from 'vitest'
import { rescheduleReservationSchema } from '@/lib/validations/staff'

describe('rescheduleReservationSchema', () => {
  it('menerima perubahan sebagian yang valid', () => {
    expect(
      rescheduleReservationSchema.safeParse({ start_time: '20:00' }).success
    ).toBe(true)
    expect(
      rescheduleReservationSchema.safeParse({
        reservation_date: '2099-01-02',
        duration_minutes: 90,
        guest_count: 6,
        table_id: 2,
      }).success
    ).toBe(true)
  })

  it('menolak tanggal kalender yang tidak ada', () => {
    expect(
      rescheduleReservationSchema.safeParse({
        reservation_date: '2026-02-30',
      }).success
    ).toBe(false)
  })

  it('menolak jam yang tidak valid', () => {
    for (const time of ['24:00', '25:00', '12:60', '9:00']) {
      expect(
        rescheduleReservationSchema.safeParse({ start_time: time }).success
      ).toBe(false)
    }
  })

  it('menolak payload kosong', () => {
    const parsed = rescheduleReservationSchema.safeParse({})
    expect(parsed.success).toBe(false)
    expect(parsed.error.flatten().formErrors).toContain(
      'Tidak ada perubahan yang dikirim'
    )
  })
})
