# Report 1 - Proposal Tema dan Inisiasi Repository

## 1. Judul Proposal

**Retail Enterprise Integration: Rancangan Integrasi POS, Inventory, dan Accounting Menggunakan Microservices, RabbitMQ, dan Enterprise Integration Patterns**

## 2. Latar Belakang

Dalam organisasi retail, aplikasi Point of Sales, Inventory, dan Accounting sering memiliki peran yang berbeda. POS digunakan untuk mencatat transaksi penjualan, Inventory digunakan untuk mengelola stok, sedangkan Accounting digunakan untuk mencatat transaksi keuangan. Jika sistem-sistem tersebut berjalan terpisah tanpa integrasi, data transaksi harus dipindahkan secara manual atau melalui proses yang tidak konsisten.

Masalah utama yang ingin diselesaikan adalah information silo, yaitu kondisi ketika data penting tersimpan pada aplikasi masing-masing dan tidak otomatis mengalir ke sistem lain. Dalam konteks integrasi enterprise, pola integrasi berbasis pesan dapat digunakan untuk menghubungkan beberapa aplikasi yang berbeda tanpa membuat aplikasi saling bergantung secara langsung (Hohpe & Woolf, 2003). Oleh karena itu, proyek ini mengusulkan rancangan integrasi yang memungkinkan transaksi dari POS mengalir ke Inventory dan Accounting melalui integration layer.

Pendekatan yang direncanakan adalah event-driven integration dengan RabbitMQ sebagai message broker. RabbitMQ mendukung pola publish/subscribe, yaitu satu producer dapat menerbitkan pesan dan pesan tersebut dapat diterima oleh consumer melalui mekanisme exchange dan queue (RabbitMQ, n.d.). Dalam rancangan ini, POS Service akan menerbitkan event `sale.created`, lalu Integration Service akan meneruskan data tersebut ke Inventory Service dan Accounting Service.

Setiap aplikasi utama juga dirancang memiliki database sendiri. Prinsip ini mengikuti pendekatan database per service, yaitu data milik satu service dikelola secara privat oleh service tersebut dan tidak diakses langsung oleh service lain (Richardson, n.d.). Dengan demikian, POS Service tidak akan mengubah database Inventory atau Accounting secara langsung. Komunikasi antar sistem dilakukan melalui API, event, dan integration layer.

## 3. Tema yang Dipilih

| Item | Keterangan |
|---|---|
| Tema | Retail Enterprise Integration |
| Domain | Sistem retail sederhana |
| Fokus integrasi | POS, Inventory, dan Accounting |
| Model integrasi | Event-driven integration |
| Message broker yang direncanakan | RabbitMQ |
| Orkestrasi yang direncanakan | Docker Compose |
| Dokumentasi API yang direncanakan | Swagger/OpenAPI |

Tema retail dipilih karena alur bisnisnya mudah dipahami dan cocok untuk menunjukkan integrasi enterprise. Satu transaksi penjualan dari POS dapat menjadi business event yang memicu perubahan pada sistem lain, yaitu pengurangan stok pada Inventory dan pencatatan jurnal pada Accounting.

## 4. Daftar Aplikasi yang Akan Diintegrasikan

| No | Aplikasi | Fungsi Utama | Database yang Direncanakan | Endpoint yang Direncanakan |
|---:|---|---|---|---|
| 1 | POS Service | Mencatat transaksi penjualan dan menerbitkan event penjualan | `pos.db` | `POST /sales`, `GET /sales` |
| 2 | Inventory Service | Mengelola data produk, stok, dan pergerakan stok | `inventory.db` | `GET /products`, `POST /stock/reduce` |
| 3 | Accounting Service | Mencatat jurnal transaksi penjualan | `accounting.db` | `POST /journals`, `GET /journals` |
| 4 | Integration Service | Menghubungkan event POS ke Inventory dan Accounting | Tidak menggunakan database utama | `GET /health` |
| 5 | RabbitMQ | Menjadi message broker untuk event transaksi | Volume RabbitMQ | Management UI `:15672` |

Setiap aplikasi utama akan dibuat sebagai service terpisah agar tanggung jawab sistem lebih jelas. POS Service berperan sebagai sumber event transaksi, Inventory Service berperan sebagai sistem stok, dan Accounting Service berperan sebagai sistem pencatatan keuangan. Integration Service berperan sebagai penghubung yang menerapkan routing dan transformasi data.

## 5. Format Data yang Direncanakan

| Aplikasi | Format Data | Contoh Data | Keterangan |
|---|---|---|---|
| POS Service | JSON | Event `sale.created` | Data transaksi lengkap dari POS |
| Inventory Service | JSON | Payload `referenceId` dan daftar item | Digunakan untuk mengurangi stok |
| Accounting Service | XML | Payload `<journal>` | Digunakan untuk mencatat jurnal transaksi |
| Integration Service | JSON dan XML | JSON event diterjemahkan menjadi JSON/XML | Berperan sebagai router dan translator antar sistem |

Perbedaan format data sengaja dirancang untuk menunjukkan heterogenitas antar aplikasi. POS dan Inventory menggunakan JSON, sedangkan Accounting menerima XML. Integration Service akan berperan sebagai Message Translator, yaitu pola yang digunakan untuk mengubah format pesan agar dapat dipahami oleh sistem tujuan (Hohpe & Woolf, 2003).

## 6. Contoh Rancangan Payload POS

```json
{
  "eventType": "sale.created",
  "source": "pos-service",
  "data": {
    "saleId": "SALE-001",
    "customerName": "Budi",
    "paymentMethod": "cash",
    "totalAmount": 300000,
    "items": [
      {
        "productId": "P001",
        "name": "Keyboard",
        "quantity": 2,
        "price": 150000,
        "subtotal": 300000
      }
    ]
  }
}
```

## 7. Contoh Rancangan Payload Inventory

```json
{
  "referenceId": "SALE-001",
  "items": [
    {
      "productId": "P001",
      "quantity": 2
    }
  ]
}
```

## 8. Contoh Rancangan Payload Accounting

```xml
<journal>
  <referenceId>SALE-001</referenceId>
  <description>Sales transaction from POS for Budi</description>
  <debitAccount>Cash</debitAccount>
  <creditAccount>Sales Revenue</creditAccount>
  <amount>300000</amount>
</journal>
```

## 9. Diagram Arsitektur Integrasi

Diagram arsitektur integrasi dibuat sebagai asset terpisah agar dapat dibuka dan diedit secara mandiri.

![Retail Enterprise Integration Architecture](../diagrams/integration-architecture.png)

File diagram:

| File | Keterangan |
|---|---|
| `diagrams/integration-architecture.png` | Gambar diagram utama |
| `diagrams/integration-architecture.svg` | Versi SVG |
| `diagrams/integration-architecture.drawio` | Versi editable untuk diagrams.net / draw.io |

Diagram tersebut menunjukkan pemisahan antara source application, integration layer, dan target applications. Integration layer berisi inbound adapter, message channel, subscriber queue, message router, message translator, outbound adapters, dan failed queue. Komponen tersebut mengacu pada pola Enterprise Integration Patterns yang umum digunakan untuk integrasi berbasis pesan (Hohpe & Woolf, 2003).

## 10. Pola Integrasi yang Direncanakan

| Enterprise Integration Pattern | Rencana Implementasi |
|---|---|
| Message Channel | RabbitMQ digunakan sebagai kanal pesan antar service |
| Publish-Subscribe Channel | POS menerbitkan event `sale.created` ke exchange RabbitMQ |
| Message Router | Integration Service menentukan event harus dikirim ke Inventory dan Accounting |
| Message Translator | Integration Service mengubah payload POS menjadi JSON Inventory dan XML Accounting |
| Message Endpoint / Adapter | Integration Service menjadi endpoint/adapter yang memanggil API service tujuan |

Pola-pola tersebut dipilih karena sesuai dengan karakteristik integrasi enterprise, yaitu menghubungkan beberapa aplikasi yang memiliki tanggung jawab dan format data berbeda melalui lapisan integrasi. Selain itu, endpoint API setiap service direncanakan akan didokumentasikan menggunakan Swagger/OpenAPI karena OpenAPI merupakan standar deskripsi API yang dapat digunakan untuk dokumentasi, pengujian, dan pemahaman endpoint REST (OpenAPI Initiative, n.d.).

## 11. Rencana Alur Integrasi

| Langkah | Rencana Proses |
|---:|---|
| 1 | User membuat transaksi melalui POS Service |
| 2 | POS Service menyimpan transaksi ke database POS |
| 3 | POS Service menerbitkan event `sale.created` ke RabbitMQ |
| 4 | Integration Service menerima event dari queue |
| 5 | Message Router menentukan tujuan event |
| 6 | Message Translator mengubah payload untuk Inventory dan Accounting |
| 7 | Inventory Service menerima payload JSON untuk pengurangan stok |
| 8 | Accounting Service menerima payload XML untuk pencatatan jurnal |

## 12. Repo Inisiasi

Repository yang digunakan untuk tahap inisiasi:

| Item | Keterangan |
|---|---|
| Nama repository | `Project-EAI` |
| URL repository | `https://github.com/Yahya-nz/Project-EAI.git` |
| Branch utama | `main` |
| Status report 1 | Repo disiapkan untuk proposal, struktur awal, dokumen, dan diagram |

Struktur repository yang direncanakan:

```text
Project-EAI/
├── pos-service/
├── inventory-service/
├── accounting-service/
├── integration-service/
├── diagrams/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

Komponen yang disiapkan untuk Report 1:

| Item | Status Report 1 |
|---|---|
| Proposal tema | Disiapkan |
| Daftar aplikasi | Disiapkan |
| Format data setiap aplikasi | Disiapkan |
| Diagram arsitektur integrasi | Disiapkan |
| Repository inisiasi | Disiapkan |

## 13. Rencana Pengerjaan Berikutnya

| Tahap | Rencana Pekerjaan |
|---|---|
| Tahap 1 / Report 1 | Proposal tema, daftar aplikasi, format data, diagram arsitektur integrasi, dan repo inisiasi |
| Tahap 2 | Implementasi POS Service, Inventory Service, Accounting Service, dan Integration Service |
| Tahap 3 | Integrasi RabbitMQ, transformasi data, dokumentasi Swagger/OpenAPI, testing, laporan akhir, dan video demo |

## 14. Kesimpulan Proposal

Proposal ini mengusulkan tema Retail Enterprise Integration karena memiliki alur bisnis yang mudah dipahami dan sesuai untuk menunjukkan integrasi antar aplikasi enterprise. Rancangan terdiri dari POS Service, Inventory Service, Accounting Service, Integration Service, dan RabbitMQ.

Pada tahap pertama, fokus pekerjaan adalah menyiapkan rancangan awal dan inisiasi repository. Implementasi penuh, pengujian end-to-end, laporan akhir, dan video demo akan dikerjakan pada tahap berikutnya.

## Daftar Pustaka

Hohpe, G., & Woolf, B. (2003). Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions. Addison-Wesley.

OpenAPI Initiative. (n.d.). OpenAPI Specification. https://www.openapis.org/

RabbitMQ. (n.d.). RabbitMQ tutorial: Publish/Subscribe. https://www.rabbitmq.com/tutorials/tutorial-three-javascript

Richardson, C. (n.d.). Pattern: Database per service. Microservices.io. https://microservices.io/patterns/data/database-per-service.html
