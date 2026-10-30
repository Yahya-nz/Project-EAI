# Accounting Service

Mencatat jurnal penjualan dalam database SQLite terpisah. Endpoint jurnal menerima JSON maupun XML; alur integrasi utama menggunakan XML.

Port: `3003`. Dokumentasi interaktif: `http://localhost:3003/api-docs`.

Endpoint utama: `POST /journals`, `GET /journals`, `GET /journals/{id}`, `GET /health`.

Lihat [panduan utama](../README.md) dan [hasil pengujian](../docs/hasil-pengujian.md).
