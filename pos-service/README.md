# POS Service

Mencatat transaksi ke SQLite dan menerbitkan event JSON `sale.created` ke exchange RabbitMQ `sales.events`.

Port: `3001`. Dokumentasi interaktif: `http://localhost:3001/api-docs`.

Endpoint utama: `POST /sales`, `GET /sales`, `GET /sales/{id}`, `GET /health`.

Lihat [panduan utama](../README.md) dan [hasil pengujian](../docs/hasil-pengujian.md).
