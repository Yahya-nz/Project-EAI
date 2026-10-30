require("dotenv").config();

const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const {
  getDb,
  getProductById,
  listProducts,
  listStockMovements,
  reduceStock
} = require("./db");

const app = express();
const port = Number(process.env.INVENTORY_PORT || 3002);

app.use(cors());
app.use(express.json());

const openApiPath = path.join(__dirname, "..", "openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/health", async (req, res) => {
  await getDb();
  res.json({
    service: "inventory-service",
    status: "UP"
  });
});

app.get("/products", async (req, res, next) => {
  try {
    const products = await listProducts();
    res.json({
      data: products
    });
  } catch (error) {
    next(error);
  }
});

app.get("/products/:id", async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json({
      data: product
    });
  } catch (error) {
    next(error);
  }
});

app.post("/stock/reduce", async (req, res, next) => {
  try {
    const validationError = validateReduceStockRequest(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const result = await reduceStock(req.body.referenceId, req.body.items);
    res.json(result);
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("Insufficient stock")) {
      return res.status(409).json({
        error: error.message
      });
    }

    next(error);
  }
});

app.get("/stock-movements", async (req, res, next) => {
  try {
    const movements = await listStockMovements();
    res.json({
      data: movements
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

function validateReduceStockRequest(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  if (!body.referenceId || typeof body.referenceId !== "string") {
    return "referenceId is required";
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "items must contain at least one item";
  }

  for (const item of body.items) {
    if (!item.productId || typeof item.productId !== "string") {
      return "Each item must have productId";
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Each item quantity must be a positive integer";
    }
  }

  return null;
}

app.listen(port, async () => {
  await getDb();
  console.log(`Inventory Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
