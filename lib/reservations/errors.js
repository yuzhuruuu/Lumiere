// lib/reservations/errors.js
// Terjemahkan error PostgreSQL/PostgREST dari create_reservation menjadi
// respons HTTP yang aman dan mudah dipahami pengguna.

import { formatRupiah } from '@/lib/utils/currency'

function result(status, body) {
  return { status, body }
}

export function mapCreateReservationError(error, context = {}) {
  const code = error?.code
  const message = String(error?.message || '')
  const { subtotal = 0, minimumOrder = 0 } = context

  if (code === '23P01') {
    return result(409, {
      error:
        'Meja sudah dipesan pada jadwal tersebut. Silakan pilih meja atau waktu lain.',
    })
  }

  if (code === '23514') {
    if (message.includes('minimal pembelian')) {
      const shortfall = Math.max(Number(minimumOrder) - Number(subtotal), 0)

      return result(422, {
        error:
          shortfall > 0
            ? `Subtotal pesanan ${formatRupiah(subtotal)} masih kurang ${formatRupiah(shortfall)} dari minimum ${formatRupiah(minimumOrder)}.`
            : 'Total pembelian belum mencapai minimum. Silakan tambah menu.',
        details:
          shortfall > 0
            ? {
                subtotal: Number(subtotal),
                minimum_order: Number(minimumOrder),
                shortfall,
              }
            : undefined,
      })
    }

    if (message.includes('melebihi kapasitas')) {
      return result(422, {
        error: 'Kapasitas meja tidak cukup untuk jumlah tamu tersebut.',
      })
    }

    if (message.includes('tidak aktif')) {
      return result(422, {
        error: 'Meja yang dipilih sedang tidak aktif.',
      })
    }

    if (message.includes('Restoran tutup')) {
      return result(422, {
        error: 'Restoran tutup pada tanggal tersebut.',
      })
    }

    if (message.includes('jam operasional')) {
      return result(422, {
        error: 'Waktu reservasi di luar jam operasional restoran.',
      })
    }

    if (message.includes('masa lalu')) {
      return result(422, {
        error: 'Tanggal atau waktu reservasi tidak boleh di masa lalu.',
      })
    }

    if (message.includes('sedang tidak tersedia')) {
      const menuName = message.match(/Menu "([^"]+)"/)?.[1]

      return result(422, {
        error: menuName
          ? `Menu "${menuName}" sedang tidak tersedia.`
          : 'Menu yang dipilih sedang tidak tersedia.',
      })
    }

    if (message.includes('Pilih minimal satu menu')) {
      return result(422, {
        error: 'Pilih minimal satu menu untuk reservasi.',
      })
    }

    return result(422, {
      error: 'Reservasi tidak memenuhi aturan pemesanan.',
    })
  }

  if (code === '23503') {
    return result(422, {
      error: 'Meja atau menu yang dipilih tidak ditemukan.',
    })
  }

  if (code === '23505') {
    if (message.includes('reservation_items')) {
      return result(422, {
        error: 'Menu yang sama tidak boleh dipilih lebih dari sekali.',
      })
    }

    return result(409, {
      error: 'Data reservasi bentrok. Silakan coba lagi.',
    })
  }

  if (['22007', '22008', '22P02'].includes(code)) {
    return result(400, {
      error: 'Format tanggal atau waktu tidak valid.',
    })
  }

  if (code === '42501') {
    return result(403, {
      error: 'Hanya pelanggan yang dapat membuat reservasi.',
    })
  }

  if (code === '28000') {
    return result(401, {
      error: 'Silakan login terlebih dahulu.',
    })
  }

  return result(500, {
    error: 'Gagal membuat reservasi. Silakan coba lagi.',
  })
}
