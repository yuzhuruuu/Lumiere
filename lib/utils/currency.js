// lib/utils/currency.js
// Format rupiah untuk pesan error yang ditampilkan ke pengguna.

export function formatRupiah(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 'Rp0'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number)
}
