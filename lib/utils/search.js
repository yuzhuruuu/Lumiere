// lib/utils/search.js
// Membersihkan input pencarian sebelum dimasukkan ke filter PostgREST.
// Karakter koma dan tanda kurung adalah pemisah sintaks filter .or(),
// sehingga harus dibuang agar pencarian tidak error / disalahartikan.

export function sanitizeSearch(value, maxLength = 100) {
  if (!value) return ''
  return value
    .trim()
    .slice(0, maxLength)
    .replace(/[,()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
