export const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function formatIDR(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatTimeShort(timeStr: string | null | undefined): string {
  if (!timeStr) return "-";
  if (timeStr.startsWith("24:00")) return "24:00";
  return timeStr.slice(0, 5);
}

export function timeToMinutes(timeStr: string): number {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  if (h === 24) return 1440;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  if (totalMinutes >= 1440) return "24:00";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function formatDateID(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeID(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateTimeStr));
}

export function getTodayJakarta(): string {
  const now = new Date();
  const jakarta = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const y = jakarta.getFullYear();
  const m = String(jakarta.getMonth() + 1).padStart(2, "0");
  const d = String(jakarta.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getStoragePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/restaurant-assets/${path}`;
}

export function translateDbError(err: unknown): string {
  if (!err) return "Terjadi kesalahan sistem.";
  const errorObj = err as { code?: string; message?: string; details?: string };
  const msg = errorObj.message || String(err);

  if (errorObj.code === "23P01" || msg.includes("no_double_booking")) {
    return "Meja yang dipilih sudah dipesan pada rentang waktu tersebut. Silakan pilih meja atau jam lain.";
  }
  if (errorObj.code === "28000") {
    return "Sesi Anda telah berakhir. Silakan login kembali.";
  }
  if (errorObj.code === "42501") {
    return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  }
  if (msg.includes("minimal pembelian")) {
    return msg;
  }
  if (msg.includes("kapasitas meja")) {
    return msg;
  }
  if (msg.includes("luar jam operasional") || msg.includes("Restoran tutup")) {
    return msg;
  }
  if (msg.includes("masa lalu")) {
    return "Tanggal reservasi tidak boleh di masa lalu.";
  }
  if (msg.includes("Transisi status")) {
    return msg;
  }
  if (msg.includes("melebihi tagihan")) {
    return msg;
  }
  if (msg.includes("idempotency_key")) {
    return "Transaksi pembayaran ini sudah tercatat sebelumnya (duplikat dicegah).";
  }
  return msg;
}

export { getMenuItemImageUrl, MENU_ITEM_IMAGES } from "./menuImages";

