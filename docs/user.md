# User Module cURL Examples

Gunakan contoh di bawah ini untuk mencoba endpoint `user` pada service App Management. Sesuaikan host, port, dan payload dengan kebutuhan Anda.

> Base URL contoh: `http://localhost:3000/api/app-management/user`

## Prasyarat
- Contoh `curl` berikut menggunakan format bash (dapat langsung dicoba di Postman dengan import raw request).
- Semua endpoint `app-management` memerlukan sesi login (bearer token atau cookie). Tambahkan header autentikasi saat mencoba di Postman.

## Mendapatkan Email User (External Service)
Query param wajib: `ids` (comma separated).
```bash
curl --location 'http://localhost:3000/api/app-management/user/get-email?ids=1,2,3' \
  --header 'Accept: application/json'
```

Contoh respons:
```json
{
  "success": true,
  "data": [
    { "id": 1, "email": "john@example.com" },
    { "id": 2, "email": "jane@example.com" }
  ]
}
```

## Mendapatkan Detail User Berdasarkan IDs
Query param wajib: `ids` (comma separated).
```bash
curl --location 'http://localhost:3000/api/app-management/user/get-details?ids=1,2,3' \
  --header 'Accept: application/json'
```

Contoh respons:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "john@example.com",
      "name": "John Doe",
      "username": "john",
      "role": { "id": 1, "name": "Admin" },
      "active": "Active",
      "registered_at": "2024-01-01T00:00:00.000Z",
      "contact": null
    }
  ]
}
```

Contoh error (tanpa autentikasi atau validasi gagal):

1) Tanpa autentikasi (akan 401)
```bash
curl --location 'http://localhost:3000/api/app-management/user/get-details?ids=1'
```

2) Query `ids` kosong (akan 400)
```bash
curl --location 'http://localhost:3000/api/app-management/user/get-details'
```
Respons:
```json
{
  "errors": ["The ids is required!"]
}
```

3) Query `ids` berisi non-numeric (akan 400)
```bash
curl --location 'http://localhost:3000/api/app-management/user/get-details?ids=abc,1'
```
Respons:
```json
{
  "errors": ["The ids must be positive integers!"]
}
```

## Mendapatkan Daftar User
Query params opsional: `page`, `limit`, `search`, `active` (`Active|Inactive|Take Out`).
```bash
curl "http://localhost:3000/api/app-management/user?page=1&limit=10&search=john&active=Active"
```

## Mendapatkan Detail User
Path param wajib: `id` (integer).
```bash
curl "http://localhost:3000/api/app-management/user/123"
```

## Membuat User
Body wajib (JSON): `email`, `name`, `gender` (`Male|Female`), `birthdate` (`YYYY-MM-DD`), `role_id` (integer).
```bash
curl -X POST "http://localhost:3000/api/app-management/user" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "gender": "Male",
    "birthdate": "1990-01-01",
    "role_id": 1
  }'
```

## Memperbarui User
Endpoint menggunakan `PATCH`.
```bash
curl -X PATCH "http://localhost:3000/api/app-management/user/123" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "gender": "Male",
    "birthdate": "1990-01-01",
    "role_id": 2
  }'
```

## Reset Password User
Path param wajib: `id`. Body tidak diperlukan.
```bash
curl -X POST "http://localhost:3000/api/app-management/user/reset-password/123"
```

## Take Out (Soft Delete) User
Path param wajib: `id`. Body tidak diperlukan.
```bash
curl -X POST "http://localhost:3000/api/app-management/user/take-out/123"
```
