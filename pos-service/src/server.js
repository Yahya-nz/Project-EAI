require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const { createSale, getDb, getSaleById, listSales } = require("./db");
const { publishSaleCreated } = require("./rabbitmq");

const app = express();
const port = Number(process.env.POS_PORT || 3001);

app.use(cors());
app.use(express.json());

const openApiPath = path.join(__dirname, "..", "openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/health", async (req, res) => {
  await getDb();
  res.json({
    service: "pos-service",
    status: "UP"
  });
});

app.post("/sales", async (req, res, next) => {
  try {
    const validationError = validateSaleRequest(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const sale = buildSale(req.body);
    const savedSale = await createSale(sale);
    const event = buildSaleCreatedEvent(savedSale);

    await publishSaleCreated(event);

    res.status(201).json({
      message: "Sale created and sale.created event published",
      sale: savedSale,
      event
    });
  } catch (error) {
    next(error);
  }
});

app.get("/sales", async (req, res, next) => {
  try {
    const sales = await listSales();
    res.json({
      data: sales
    });
  } catch (error) {
    next(error);
  }
});

app.get("/sales/:id", async (req, res, next) => {
  try {
    const sale = await getSaleById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        error: "Sale not found"
      });
    }

    res.json({
      data: sale
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    detail: error.message
  });
});

function validateSaleRequest(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.buyerName || typeof body.buyerName !== "string") {
    return "buyerName is required";
  }

  if (!body.paymentMethod || typeof body.paymentMethod !== "string") {
    return "paymentMethod is required";
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "items must contain at least one item";
  }

  for (const item of body.items) {
    if (!item.productId || !item.name) {
      return "Each item must have productId and name";
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Each item quantity must be a positive integer";
    }

    if (!Number.isInteger(item.price) || item.price <= 0) {
      return "Each item price must be a positive integer";
    }
  }

  return null;
}

function buildSale(body) {
  const items = body.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.quantity * item.price
  }));

  return {
    id: `SALE-${Date.now()}`,
    buyerName: body.buyerName,
    paymentMethod: body.paymentMethod,
    totalAmount: items.reduce((total, item) => total + item.subtotal, 0),
    status: "CREATED",
    createdAt: new Date().toISOString(),
    items
  };
}

function buildSaleCreatedEvent(sale) {
  return {
    eventId: crypto.randomUUID(),
    eventType: "sale.created",
    occurredAt: new Date().toISOString(),
    source: "pos-service",
    data: {
      saleId: sale.id,
      buyerName: sale.buyerName,
      paymentMethod: sale.paymentMethod,
      totalAmount: sale.totalAmount,
      items: sale.items
    }
  };
}

app.listen(port, async () => {
  await getDb();
  console.log(`POS Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
