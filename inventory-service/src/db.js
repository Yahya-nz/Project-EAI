const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbPath = process.env.INVENTORY_DB_PATH || path.join(__dirname, "..", "data", "inventory.db");

let db;

async function getDb() {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      stock INTEGER NOT NULL,
      price INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await seedProducts();
  return db;
}

async function seedProducts() {
  const existing = await db.get("SELECT COUNT(*) AS total FROM products");

  if (existing.total > 0) {
    return;
  }

  const now = new Date().toISOString();
  const products = [
    ["P001", "Keyboard", 10, 150000, now],
    ["P002", "Mouse", 20, 75000, now],
    ["P003", "Monitor", 8, 1250000, now]
  ];

  for (const product of products) {
    await db.run(
      "INSERT INTO products (id, name, stock, price, updated_at) VALUES (?, ?, ?, ?, ?)",
      product
    );
  }
}

async function listProducts() {
  const database = await getDb();
  return database.all(`
    SELECT
      id,
      name,
      stock,
      price,
      updated_at AS updatedAt
    FROM products
    ORDER BY id ASC
  `);
}

async function getProductById(id) {
  const database = await getDb();
  return database.get(
    `SELECT
      id,
      name,
      stock,
      price,
      updated_at AS updatedAt
    FROM products
    WHERE id = ?`,
    id
  );
}

async function reduceStock(referenceId, items) {
  const database = await getDb();
  const createdAt = new Date().toISOString();

  await database.exec("BEGIN TRANSACTION");

  try {
    for (const item of items) {
      const product = await database.get("SELECT * FROM products WHERE id = ?", item.productId);

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      await database.run(
        "UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?",
        item.quantity,
        createdAt,
        item.productId
      );

      await database.run(
        `INSERT INTO stock_movements
          (reference_id, product_id, movement_type, quantity, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        referenceId,
        item.productId,
        "OUT",
        item.quantity,
        createdAt
      );
    }

    await database.exec("COMMIT");

    return {
      referenceId,
      status: "STOCK_REDUCED",
      processedAt: createdAt
    };
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
  }
}

async function listStockMovements() {
  const database = await getDb();
  return database.all(`
    SELECT
      id,
      reference_id AS referenceId,
      product_id AS productId,
      movement_type AS movementType,
      quantity,
      created_at AS createdAt
    FROM stock_movements
    ORDER BY created_at DESC, id DESC
  `);
}

module.exports = {
  getDb,
  getProductById,
  listProducts,
  listStockMovements,
  reduceStock
};
