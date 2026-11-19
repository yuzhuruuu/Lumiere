import { z } from "zod";

export const indonesianPhoneRegex = /^(\+62|62|0)8[0-9]{8,11}$/;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter").max(100),
  email: z.string().trim().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(
      indonesianPhoneRegex,
      "Nomor HP harus format Indonesia valid (contoh: 081234567890 atau +6281234567890)"
    ),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const reservationStep1Schema = z.object({
  contactName: z.string().trim().min(2, "Nama pemesan minimal 2 karakter").max(100),
  contactPhone: z
    .string()
    .trim()
    .regex(
      indonesianPhoneRegex,
      "Format nomor telepon tidak valid (contoh: 081234567890)"
    ),
  contactEmail: z.string().trim().email("Format email tidak valid"),
  reservationDate: z.string().min(1, "Tanggal reservasi wajib dipilih"),
  startTime: z.string().min(1, "Jam mulai wajib dipilih"),
  durationMinutes: z
    .number()
    .int()
    .min(30, "Durasi minimal 30 menit")
    .max(240, "Durasi maksimal 240 menit (4 jam)")
    .refine((v) => v % 30 === 0, "Durasi harus kelipatan 30 menit"),
  guestCount: z
    .number()
    .int()
    .min(1, "Jumlah pengunjung minimal 1 orang")
    .max(50, "Jumlah pengunjung maksimal 50 orang"),
});

export const paymentSchema = z.object({
  type: z.enum(["dp", "pelunasan"]),
  method: z.enum(["tunai", "transfer", "qris", "kartu_debit"]),
  amount: z.number().positive("Nominal pembayaran harus lebih dari Rp0"),
  referenceNo: z.string().trim().max(100).optional(),
});
