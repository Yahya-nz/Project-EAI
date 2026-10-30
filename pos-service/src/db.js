const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbPath = process.env.POS_DB_PATH || path.join(__dirname, "..", "data", "pos.db");

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
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      buyer_name TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );
  `);

  return db;
}

async function createSale(sale) {
  const database = await getDb();

  await database.exec("BEGIN TRANSACTION");

  try {
    await database.run(
      `INSERT INTO sales
        (id, buyer_name, payment_method, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      sale.id,
      sale.buyerName,
      sale.paymentMethod,
      sale.totalAmount,
      sale.status,
      sale.createdAt
    );

    for (const item of sale.items) {
      await database.run(
        `INSERT INTO sale_items
          (sale_id, product_id, product_name, quantity, price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sale.id,
        item.productId,
        item.name,
        item.quantity,
        item.price,
        item.subtotal
      );
    }

    await database.exec("COMMIT");
    return sale;
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
  }
}

async function listSales() {
  const database = await getDb();
  const sales = await database.all(`
    SELECT
      id,
      buyer_name AS buyerName,
      payment_method AS paymentMethod,
      total_amount AS totalAmount,
      status,
      created_at AS createdAt
    FROM sales
    ORDER BY created_at DESC
  `);

  for (const sale of sales) {
    sale.items = await listSaleItems(sale.id);
  }

  return sales;
}

async function getSaleById(id) {
  const database = await getDb();
  const sale = await database.get(
    `SELECT
      id,
      buyer_name AS buyerName,
      payment_method AS paymentMethod,
      total_amount AS totalAmount,
      status,
      created_at AS createdAt
    FROM sales
    WHERE id = ?`,
    id
  );

  if (!sale) {
    return null;
  }

  sale.items = await listSaleItems(id);
  return sale;
}

async function listSaleItems(saleId) {
  const database = await getDb();
  return database.all(
    `SELECT
      product_id AS productId,
      product_name AS name,
      quantity,
      price,
      subtotal
    FROM sale_items
    WHERE sale_id = ?
    ORDER BY id ASC`,
    saleId
  );
}

module.exports = {
  createSale,
  getDb,
  getSaleById,
  listSales
};
