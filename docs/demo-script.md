# Demo Script

Durasi target: 5-10 menit.

## 1. Pembukaan

Project ini adalah simulasi integrasi enterprise pada sistem retail. Ada tiga aplikasi utama: POS, Inventory, dan Accounting. Masing-masing aplikasi berdiri sebagai microservice dan memiliki database sendiri.

## 2. Arsitektur

Alurnya dimulai dari POS Service. Ketika transaksi penjualan dibuat, POS menyimpan transaksi ke database sendiri dan mengirim event `sale.created` ke RabbitMQ. Integration Service membaca event tersebut, lalu melakukan routing dan transformasi data ke Inventory dan Accounting.

## 3. Pola Integrasi

Pola EIP yang digunakan:

- Message Channel melalui RabbitMQ.
- Publish-Subscribe Channel melalui exchange `sales.events`.
- Message Router di Integration Service.
- Message Translator untuk mengubah payload POS menjadi format Inventory dan XML Accounting.
- Message Endpoint/Adapter untuk memanggil API Inventory dan Accounting.

## 4. Demo Teknis

1. Jalankan semua service dengan `docker compose up --build`.
2. Buka Swagger POS di `http://localhost:3001/api-docs`.
3. Cek stok awal `P001` dari Inventory.
4. Buat transaksi POS untuk membeli 2 Keyboard.
5. Tunjukkan event diproses oleh Integration Service.
6. Cek Inventory, stok `P001` turun dari 10 menjadi 8.
7. Cek Accounting, jurnal transaksi otomatis dibuat.

## 5. Penutup

Satu business event dari POS berhasil memicu perubahan pada dua sistem lain tanpa POS mengakses database Inventory atau Accounting secara langsung. Semua komunikasi dilakukan lewat integration layer.
