# Integration Service

Mengkonsumsi event dari queue `integration.sale.created`, melakukan routing, menerjemahkan payload menjadi JSON Inventory dan XML Accounting, lalu memanggil API tujuan.

Port: `3004`. Status consumer: `http://localhost:3004/health`.

Pesan yang gagal diproses masuk queue `integration.failed`. Koneksi awal ke RabbitMQ dicoba ulang setiap lima detik bila broker belum siap. Retry ini berlaku saat startup, belum mencakup pemulihan koneksi yang terputus setelah consumer aktif.

Lihat [panduan utama](../README.md) dan [hasil pengujian](../docs/hasil-pengujian.md).
