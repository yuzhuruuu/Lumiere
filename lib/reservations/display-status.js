// lib/reservations/display-status.js
// Label status turunan untuk pelanggan (PRD v0.4 bagian 4.5).
// Bukan status database baru — murni turunan reservasi + invoice + pembayaran.

const TERMINAL_STATUS = {
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  tidak_hadir: 'Tidak Hadir',
  selesai: 'Selesai',
}

export function getDisplayStatus({ status, invoice = null, payments = [] }) {
  if (status === 'menunggu_validasi') return 'Menunggu Persetujuan'

  if (TERMINAL_STATUS[status]) return TERMINAL_STATUS[status]

  if (invoice?.payment_status === 'dibatalkan') return 'Dibatalkan'

  // DP terverifikasi (atau lunas) = reservasi benar-benar terkonfirmasi.
  if (['dp_dibayar', 'lunas'].includes(invoice?.payment_status)) {
    return 'Terkonfirmasi'
  }

  // Bukti sudah dikirim tapi belum diproses staf.
  if (payments.some((payment) => payment.status === 'menunggu')) {
    return 'Verifikasi Pembayaran'
  }

  // Disetujui tapi DP belum dibayar / bukti ditolak (batas baru berjalan).
  if (invoice?.payment_status === 'belum_dibayar' || !invoice) {
    return 'Menunggu DP'
  }

  return 'Terkonfirmasi'
}
