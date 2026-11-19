# Supabase — Lumière Bar & Resto

Folder ini berisi migration database dan seed untuk project Supabase Lumière.

## Status migrasi production

Schema production sudah diterapkan. Riwayat migrasi di
`supabase_migrations.schema_migrations` sudah disinkronkan untuk:

| Version | Name |
|---|---|
| `20261031000001` | `init_schema` |
| `20261031000002` | `rls_policies` |
| `20261031000003` | `storage` |
| `20261031000004` | `auto_cancel_cron` |

Migration baru yang akan diterapkan pada deployment berikutnya:

| Version | Name |
|---|---|
| `20261118000001` | `reservation_same_day_time_guard` |
| `20261119000001` | `admin_create_reservation_for_customer` |

Karena itu, integrasi Supabase tidak akan menjalankan ulang migration lama
tersebut di project production.

## Menambah migration baru

1. Buat file baru di `supabase/migrations/` dengan timestamp **setelah**
   migrasi terakhir.
2. Jangan mengubah migration lama yang sudah diterapkan.
3. Uji migration di local atau preview branch sebelum merge ke `main`.
4. Setelah merge, cek status deployment di Supabase Dashboard.

## Seed

- `supabase/seed-part1-accounts.sql` — akun demo.
- `docs/seed.sql` — seed data lengkap untuk pengujian.

Jangan commit folder `supabase/.temp/`; folder itu berisi state sementara CLI.
