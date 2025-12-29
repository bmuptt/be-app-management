Context7:
- Wajib pakai Context7 saat butuh pembuatan kode, langkah setup/konfigurasi, atau dokumentasi library/API.

Prisma-Local:
- Wajib pakai Prisma-Local MCP saat butuh hal terkait Prisma (migration, schema, seeding, query, Prisma Studio, status migration).

Aturan Umum:
- Jangan running aplikasi (server) karena sudah dijalankan; cukup jalankan integration test yang relevan, kalau ada error langsung diperbaiki.
- Pattern lebih baik banyak file yang spesifik dan mudah di-maintain/debug.
- Hindari tipe any; kalau perlu gunakan unknown lalu narrowing.
- Hindari penggunaan console.log karena cepat penuh log docker; kecuali console.error.
- Field di DB gunakan snake_case (contoh created_at), bukan camelCase.
- Isi file .env harus sama seperti env.example (jangan menambahkan nilai sensitif ke repo).

Arsitektur dan Struktur Folder:
- Pattern umum: route, middleware, validation, controller, service, repository.
- Interface/type taruh di src\\model dan export lewat src\\model\\index.ts.
- src\\config: semua config
- src\\controllers: controllers
- src\\helper: helper
- src\\model: interface/type
- src\\repository: query DB / call service lain
- src\\routes: routing per modul (user dan role beda file)
- src\\services: service
- src\\types: types
- src\\validation: validation
- docs: dokumentasi API (contoh curl). Tidak perlu pakai header Cookie.

Validation dan Error:
- Semua validation error harus status 400.
- Bentuk error validation harus seperti ini:
{
  "errors": [
    "The email is required!",
    "The name is required!",
    "The role is required!"
  ]
}
- Usahakan validation hanya di src\\validation (bukan di controller/service).

Pagination dan Sorting:
- Kalau ada endpoint list dengan paging: wajib ada sorting stabil dengan id desc (untuk mencegah data pindah halaman/duplikasi).
- Jika sudah ada sort utama lain: id desc tetap dipakai sebagai tie-breaker.

Upload File:
- Untuk update yang ada upload file: request body wajib punya status_file.
- status_file = 0: tidak ada perubahan file.
- status_file = 1 + ada upload file: ganti file.
- status_file = 1 + tidak ada upload file: hapus file.

Dokumentasi API:
- Jangan asal membuat file .md (repo public, hindari info sensitif).
- Boleh membuat/mengubah docs hanya untuk dokumentasi API di folder docs.
- Jika tambah/ubah endpoint: wajib update docs modul terkait (contoh curl tanpa Cookie; header minimal Accept + Content-Type bila perlu).

Testing:
- Setiap test case (it) wajib refresh database biar terisolasi.
- Kalau ada perubahan, cek apakah perubahan bisa diuji dengan integration test; kalau bisa dan belum ada, buat test flow-nya.
- Jangan buat test manual; jalankan integration test yang ada.
- Jalankan test yang diperlukan saja agar tidak lama.
- Basic command test: npm run test:local
