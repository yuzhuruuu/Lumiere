// lib/utils/bill.js
// Perhitungan tagihan di sisi aplikasi.
// Sumber angka resmi tetap database (generate_invoice); helper ini dipakai
// untuk menampilkan estimasi sebelum invoice dibuat dan untuk format angka.

export function roundMoney(value) {
  const number = Number(value) || 0
  return Math.round((number + Number.EPSILON) * 100) / 100
}

export function calculateBill(subtotal, taxPercentage = 0, dpPercentage = 0) {
  const sub = roundMoney(subtotal)
  const taxPct = Number(taxPercentage) || 0
  const dpPct = Number(dpPercentage) || 0

  const taxAmount = roundMoney((sub * taxPct) / 100)
  const totalAmount = roundMoney(sub + taxAmount)
  const dpAmount = roundMoney((totalAmount * dpPct) / 100)

  return {
    subtotal: sub,
    tax_percentage: taxPct,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    dp_percentage: dpPct,
    dp_amount: dpAmount,
  }
}
