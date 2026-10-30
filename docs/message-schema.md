# Message Schema

## Event: sale.created

Event ini dikirim oleh POS Service setelah transaksi penjualan berhasil dibuat.

```json
{
  "eventId": "EVT-001",
  "eventType": "sale.created",
  "occurredAt": "2026-06-02T10:00:00.000Z",
  "source": "pos-service",
  "data": {
    "saleId": "SALE-001",
    "buyerName": "Budi",
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

## Transformasi ke Inventory

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

## Transformasi ke Accounting

Accounting Service menerima XML untuk menunjukkan heterogenitas format data antar aplikasi.

```xml
<journal>
  <referenceId>SALE-001</referenceId>
  <description>Sales transaction from POS for Budi</description>
  <debitAccount>Cash</debitAccount>
  <creditAccount>Sales Revenue</creditAccount>
  <amount>300000</amount>
</journal>
```
