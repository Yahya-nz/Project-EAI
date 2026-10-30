# Panduan Menjalankan Project Final

## 1. Ringkasan Project

Project ini adalah simulasi Enterprise Application Integration pada domain retail. Sistem terdiri dari POS Service, Inventory Service, Accounting Service, Integration Service, dan RabbitMQ sebagai message broker.

Alur utama:

```text
POS Service
  -> publish event sale.created
  -> RabbitMQ
  -> Integration Service
  -> Inventory Service mengurangi stok
  -> Accounting Service membuat jurnal
```

## 2. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Docker Desktop | Wajib untuk menjalankan semua service dengan Docker Compose |
| Browser | Untuk membuka Swagger UI dan RabbitMQ Management |
| Postman atau curl | Untuk menguji endpoint API |
| Port kosong | `3001`, `3002`, `3003`, `3004`, `5672`, dan `15672` |

## 3. Catatan Pengujian

| Item | Keterangan |
|---|---|
| Docker Compose | Perlu diuji pada komputer yang memiliki Docker Desktop aktif |
| Validasi awal | Syntax JavaScript, struktur package JSON, dan logic service sudah dicek secara lokal |
| Pengujian lanjutan | Build Docker, startup seluruh container, RabbitMQ, dan alur end-to-end penuh perlu diuji melalui Docker Compose |

Catatan ini menjelaskan bahwa pengujian Docker Compose harus dilakukan pada environment yang mendukung Docker Desktop.

## 4. Cara Menjalankan

Masuk ke folder project:

```bash
cd Project-EAI-final
```

Salin file environment:

```bash
cp .env.example .env
```

Jalankan semua service:

```bash
docker compose up --build
```

Tunggu sampai RabbitMQ dan semua service aktif.

## 5. URL Service

| Komponen | URL |
|---|---|
| POS Swagger | `http://localhost:3001/api-docs` |
| Inventory Swagger | `http://localhost:3002/api-docs` |
| Accounting Swagger | `http://localhost:3003/api-docs` |
| Integration Health | `http://localhost:3004/health` |
| RabbitMQ Management | `http://localhost:15672` |

Login RabbitMQ:

```text
username: guest
password: guest
```

## 6. Health Check

Jalankan:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

Ekspektasi:

```text
status: UP
```

Untuk Integration Service, status bisa `STARTING` sebentar saat masih menunggu koneksi RabbitMQ.

## 7. Test End-to-End

### 7.1 Cek stok awal

```bash
curl http://localhost:3002/products/P001
```

Ekspektasi awal:

```text
stock: 10
```

### 7.2 Buat transaksi POS

```bash
curl -X POST http://localhost:3001/sales \
  -H "Content-Type: application/json" \
  -d '{
    "buyerName": "Budi",
    "paymentMethod": "cash",
    "items": [
      {
        "productId": "P001",
        "name": "Keyboard",
        "quantity": 2,
        "price": 150000
      }
    ]
  }'
```

Ekspektasi:

```text
Sale created and sale.created event published
```

### 7.3 Cek stok setelah transaksi

```bash
curl http://localhost:3002/products/P001
```

Ekspektasi:

```text
stock: 8
```

### 7.4 Cek stock movement

```bash
curl http://localhost:3002/stock-movements
```

Ekspektasi:

```text
movementType: OUT
quantity: 2
referenceId sesuai saleId dari POS
```

### 7.5 Cek jurnal Accounting

```bash
curl http://localhost:3003/journals
```

Ekspektasi:

```text
debitAccount: Cash
creditAccount: Sales Revenue
sourceFormat: XML
amount: 300000
```

## 8. Troubleshooting

| Masalah | Penyebab Umum | Solusi |
|---|---|---|
| Port sudah dipakai | Ada aplikasi lain memakai port yang sama | Ubah port di `.env` atau hentikan aplikasi lain |
| RabbitMQ belum siap | Container RabbitMQ masih starting | Tunggu 10-30 detik lalu ulang request |
| Integration status `STARTING` | Consumer belum berhasil konek ke RabbitMQ | Cek log `integration-service` |
| Stok tidak berubah | Event belum diproses atau Integration Service error | Cek RabbitMQ queue dan log Integration Service |
| Jurnal tidak muncul | Request ke Accounting gagal | Cek log Accounting dan Integration Service |
| Docker build gagal | Cache atau dependency error | Jalankan `docker compose build --no-cache` |

## 9. Command Log yang Berguna

Lihat semua container:

```bash
docker compose ps
```

Lihat log semua service:

```bash
docker compose logs
```

Lihat log integration service:

```bash
docker compose logs integration-service
```

Stop semua service:

```bash
docker compose down
```

Stop dan hapus volume data:

```bash
docker compose down -v
```

## 10. File Penting

| File | Fungsi |
|---|---|
| `README.md` | Ringkasan project dan cara menjalankan |
| `docker-compose.yml` | Menjalankan semua service dan RabbitMQ |
| `.env.example` | Contoh konfigurasi environment |
| `docs/Laporan-Akhir-EAI.docx` | Laporan akhir |
| `docs/Panduan-Menjalankan-Project.docx` | Panduan menjalankan dan menguji project |
| `diagrams/integration-architecture.png` | Diagram arsitektur integrasi |
| `docs/message-schema.md` | Skema event dan transformasi payload |
| `docs/demo-script.md` | Script/narasi demo video |

## 11. Kesimpulan Pengujian

Jika transaksi POS berhasil membuat stok Inventory berkurang dan jurnal Accounting muncul otomatis, maka integrasi end-to-end sudah berhasil.
