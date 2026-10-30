# Project EAI: Integrasi Sistem Retail

Integrasi POS, Inventory, dan Accounting menggunakan Node.js, SQLite, RabbitMQ, dan Enterprise Integration Patterns. Setiap aplikasi memiliki database sendiri. POS menerbitkan event JSON `sale.created`; Integration Service mengirim JSON ke Inventory dan XML ke Accounting.

## Menjalankan Project

1. Salin `.env.example` menjadi `.env` (`cp .env.example .env` pada macOS/Linux, `Copy-Item .env.example .env` pada PowerShell).
2. Jalankan `docker compose up --build -d` dari folder utama project.
3. Periksa container menggunakan `docker compose ps`.
4. Pastikan `http://localhost:3004/health` menunjukkan `status: UP` dan `integration.connected: true` sebelum membuat transaksi.

| Komponen | Alamat | Fungsi |
|---|---|---|
| POS Swagger | http://localhost:3001/api-docs | Membuat dan melihat transaksi |
| Inventory Swagger | http://localhost:3002/api-docs | Melihat stok dan stock movement |
| Accounting Swagger | http://localhost:3003/api-docs | Melihat jurnal |
| Integration health | http://localhost:3004/health | Status consumer dan jumlah pesan diproses |
| RabbitMQ Management | http://localhost:15672 | Exchange, queue, consumer; login lokal `guest` / `guest` |

## Pengujian End-to-End

1. Buka Inventory Swagger, jalankan `GET /products/{id}` dengan ID `P001`, dan catat stok awal.
2. Buka POS Swagger, pilih `POST /sales`, klik **Try it out**, lalu kirim:

```json
{
  "buyerName": "Budi",
  "paymentMethod": "cash",
  "items": [
    { "productId": "P001", "name": "Keyboard", "quantity": 2, "price": 150000 }
  ]
}
```

3. Klik **Execute** dan lihat **Server response**. Hasil POS berhasil berstatus `201` dengan ID transaksi.
4. Ulangi pemeriksaan stok Inventory: stok berkurang dua dari nilai awal.
5. Jalankan `GET /stock-movements` di Inventory dan `GET /journals` di Accounting. Cocokkan `referenceId` keduanya dengan ID transaksi POS. Jurnal harus bernilai `300000` dan `sourceFormat: XML`.
6. Periksa Integration health dan RabbitMQ. Queue kosong setelah pemrosesan normal; consumer aktif segera mengambil pesan.

Jika consumer belum terhubung, lihat `docker compose logs --tail=100 integration-service rabbitmq`. Consumer mencoba ulang setiap lima detik ketika koneksi awal gagal. Perubahan stok dan jurnal terjadi asinkron setelah response POS.

## Dokumentasi

| Berkas | Isi |
|---|---|
| [Hasil pengujian dan screenshot](docs/hasil-pengujian.md) | Bukti runtime, screenshot bernomor, penjelasan hasil |
| [Laporan akhir](docs/Laporan-Akhir-EAI.docx) | Laporan revisi dengan sitasi dan referensi APA |
| [Panduan menjalankan](docs/Panduan-Menjalankan-Project.docx) | Panduan instalasi dan pengujian |
| [Arsitektur](docs/architecture.md) | Diagram dan alur integrasi |
| [Diagram PNG](diagrams/integration-architecture.png) | Diagram arsitektur integrasi |
| [Skema pesan](docs/message-schema.md) | JSON sumber, JSON Inventory, XML Accounting |
| [Perintah pengujian](docs/api-test-commands.md) | Contoh request API |
| [Naskah demo](docs/demo-script.md) | Urutan demonstrasi |

Branch `main` menyimpan pengumpulan Report 1. Branch `final-submission` berisi implementasi final dan dokumentasi pengujian.

## Struktur

```text
pos-service/          # Transaksi dan publisher event
inventory-service/    # Produk, stok, stock movement
accounting-service/   # Jurnal JSON/XML
integration-service/  # Consumer, routing, translator, HTTP adapters
diagrams/             # PNG, SVG, sumber draw.io
docs/                 # Laporan, panduan, hasil pengujian
```
