# API Test Commands

## Health Check

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

## Cek Stok Awal

```bash
curl http://localhost:3002/products/P001
```

## Buat Transaksi POS

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

## Cek Hasil Integrasi

```bash
curl http://localhost:3002/products/P001
curl http://localhost:3002/stock-movements
curl http://localhost:3003/journals
curl http://localhost:3004/health
```
