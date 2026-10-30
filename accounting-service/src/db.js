const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbPath = process.env.ACCOUNTING_DB_PATH || path.join(__dirname, "..", "data", "accounting.db");

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
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      reference_id TEXT NOT NULL,
      description TEXT NOT NULL,
      debit_account TEXT NOT NULL,
      credit_account TEXT NOT NULL,
      amount INTEGER NOT NULL,
      source_format TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

async function createJournal(journal) {
  const database = await getDb();

  await database.run(
    `INSERT INTO journals
      (id, reference_id, description, debit_account, credit_account, amount, source_format, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    journal.id,
    journal.referenceId,
    journal.description,
    journal.debitAccount,
    journal.creditAccount,
    journal.amount,
    journal.sourceFormat,
    journal.createdAt
  );

  return journal;
}

async function listJournals() {
  const database = await getDb();
  return database.all(`
    SELECT
      id,
      reference_id AS referenceId,
      description,
      debit_account AS debitAccount,
      credit_account AS creditAccount,
      amount,
      source_format AS sourceFormat,
      created_at AS createdAt
    FROM journals
    ORDER BY created_at DESC
  `);
}

async function getJournalById(id) {
  const database = await getDb();
  return database.get(
    `SELECT
      id,
      reference_id AS referenceId,
      description,
      debit_account AS debitAccount,
      credit_account AS creditAccount,
      amount,
      source_format AS sourceFormat,
      created_at AS createdAt
    FROM journals
    WHERE id = ?`,
    id
  );
}

module.exports = {
  createJournal,
  getDb,
  getJournalById,
  listJournals
};
