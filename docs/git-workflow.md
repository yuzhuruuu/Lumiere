# Git Workflow - Lumière Bar & Resto

Panduan workflow Git untuk tim development.

## Branch Strategy

### Main Branches
- **`main`**: Branch production, selalu stable dan siap deploy
- **`develop`**: Branch development utama, integrasi semua fitur

### Feature Branches
Format: `feature/<nama>-<deskripsi-fitur>`

Contoh:
- `feature/andi-reservasi-system`
- `feature/budi-menu-management`
- `feature/citra-payment-integration`

### Alur Kerja

1. **Mulai fitur baru:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/namaKamu-namaFitur
```

2. **Kerjakan fitur:**
```bash
# Edit file...
git add .
git commit -m "feat: deskripsi perubahan"
```

3. **Push ke GitHub:**
```bash
git push origin feature/namaKamu-namaFitur
```

4. **Buat Pull Request:**
- Buka GitHub
- Buat PR dari `feature/namaKamu-namaFitur` → `develop`
- Minta review dari minimal 1 anggota tim
- Tunggu approval sebelum merge

## Format Commit Message

Gunakan conventional commits untuk konsistensi:

### Format Dasar
```
<type>: <deskripsi singkat>

[optional body - penjelasan detail]
```

### Types yang Digunakan

- **`feat`**: Fitur baru
  ```
  feat: tambah endpoint API reservasi
  feat: buat form input menu
  ```

- **`fix`**: Bug fix
  ```
  fix: perbaiki validasi form reservasi
  fix: atasi error 500 di API menu
  ```

- **`docs`**: Dokumentasi
  ```
  docs: update README cara instalasi
  docs: tambah komentar di auth middleware
  ```

- **`chore`**: Maintenance, config, dependencies
  ```
  chore: update Next.js ke v15
  chore: tambah ESLint rule
  ```

- **`refactor`**: Refactoring code (tidak ubah fitur)
  ```
  refactor: pindah utils ke folder lib
  ```

- **`style`**: Format code (prettier, spacing)
  ```
  style: format dengan prettier
  ```

### Contoh Commit yang Baik

✅ **BAIK:**
```
feat: tambah API endpoint untuk create reservasi

- POST /api/reservations
- Validasi input tanggal dan jumlah tamu
- Return reservation ID setelah sukses
```

❌ **KURANG BAIK:**
```
update files
wip
fix bug
```

## Pull Request Guidelines

### Checklist Sebelum Buat PR

- [ ] Code sudah di-test lokal (`npm run dev` jalan tanpa error)
- [ ] Build sukses (`npm run build`)
- [ ] ESLint clean (`npm run lint`)
- [ ] Commit messages jelas dan mengikuti format
- [ ] Tidak ada file yang tidak perlu (node_modules, .env.local, dll)

### Template PR Description

```markdown
## Deskripsi
Jelaskan singkat fitur/fix yang dibuat

## Perubahan
- List perubahan utama
- File yang ditambah/diubah

## Testing
Cara test fitur ini di lokal

## Screenshot (jika ada perubahan UI)
Lampirkan screenshot

## Catatan
Hal-hal yang perlu diperhatikan reviewer
```

### Review Process

1. Minimal **1 approval** dari anggota tim lain
2. Tidak ada conflict dengan branch target
3. CI checks (jika ada) harus pass
4. Setelah approved, yang buat PR yang merge

## Tips & Best Practices

### DO ✅
- Pull `develop` sebelum mulai feature baru
- Commit sering dengan pesan yang jelas
- Push ke GitHub secara rutin (backup)
- Komunikasi dengan tim jika ada blocking issue
- Test di lokal sebelum push
- Baca code orang lain saat review PR

### DON'T ❌
- Jangan push langsung ke `main` atau `develop`
- Jangan commit file sensitive (`.env.local`, API keys)
- Jangan commit `node_modules/` atau `.next/`
- Jangan force push kecuali darurat dan koordinasi tim
- Jangan merge PR sendiri tanpa review (kecuali urgent fix)

## Mengatasi Conflict

Jika ada merge conflict:

```bash
# Update branch develop terbaru
git checkout develop
git pull origin develop

# Kembali ke feature branch
git checkout feature/namaKamu-fitur

# Merge develop ke feature branch
git merge develop

# Resolve conflict di editor
# Setelah selesai:
git add .
git commit -m "chore: resolve merge conflict"
git push origin feature/namaKamu-fitur
```

## Pertanyaan?

Tanya di grup tim atau buat issue di GitHub untuk diskusi workflow.
