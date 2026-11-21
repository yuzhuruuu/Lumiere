import { describe, it, expect } from 'vitest'
import { getDisplayStatus } from '../../lib/reservations/display-status'

describe('getDisplayStatus', () => {
  it('menampilkan Menunggu Persetujuan sebelum divalidasi', () => {
    expect(getDisplayStatus({ status: 'menunggu_validasi' })).toBe(
      'Menunggu Persetujuan'
    )
  })

  it('menampilkan Menunggu DP setelah disetujui tanpa invoice', () => {
    expect(getDisplayStatus({ status: 'dikonfirmasi' })).toBe('Menunggu DP')
  })

  it('menampilkan Verifikasi Pembayaran saat ada pengajuan menunggu', () => {
    expect(
      getDisplayStatus({
        status: 'dikonfirmasi',
        invoice: { payment_status: 'belum_dibayar' },
        payments: [{ status: 'menunggu' }],
      })
    ).toBe('Verifikasi Pembayaran')
  })

  it('menampilkan Terkonfirmasi setelah DP diverifikasi', () => {
    expect(
      getDisplayStatus({
        status: 'dikonfirmasi',
        invoice: { payment_status: 'dp_dibayar' },
        payments: [{ status: 'berhasil' }],
      })
    ).toBe('Terkonfirmasi')
  })

  it('kembali ke Menunggu DP setelah bukti ditolak', () => {
    expect(
      getDisplayStatus({
        status: 'dikonfirmasi',
        invoice: { payment_status: 'belum_dibayar' },
        payments: [{ status: 'gagal' }],
      })
    ).toBe('Menunggu DP')
  })

  it('memakai status akhir reservasi bila sudah ditolak/dibatalkan/tidak hadir/selesai', () => {
    expect(getDisplayStatus({ status: 'ditolak' })).toBe('Ditolak')
    expect(getDisplayStatus({ status: 'dibatalkan' })).toBe('Dibatalkan')
    expect(getDisplayStatus({ status: 'tidak_hadir' })).toBe('Tidak Hadir')
    expect(getDisplayStatus({ status: 'selesai' })).toBe('Selesai')
  })
})
