# Architecture Diagram

## Diagram Gambar

Diagram arsitektur integrasi disediakan sebagai asset terpisah di folder `diagrams/`.

File utama:

- `diagrams/integration-architecture.png`
- `diagrams/integration-architecture.svg`
- `diagrams/integration-architecture.drawio`

![Retail Enterprise Integration Architecture](../diagrams/integration-architecture.png)

## Mermaid Source

Kode Mermaid di bawah ini bisa dibuka di website online seperti `https://mermaid.live` jika ingin mengubah source diagram menjadi gambar secara manual.

```mermaid
flowchart LR
  Client["Postman / Swagger UI"]
  POS["POS Service\nDatabase: pos.db"]
  Broker["RabbitMQ\nMessage Channel"]
  Integration["Integration Service\nRouter + Translator + Adapter"]
  Inventory["Inventory Service\nDatabase: inventory.db"]
  Accounting["Accounting Service\nDatabase: accounting.db"]

  Client -->|POST /sales| POS
  POS -->|publish sale.created| Broker
  Broker -->|consume event| Integration
  Integration -->|POST /stock/reduce| Inventory
  Integration -->|POST /journals| Accounting
```
