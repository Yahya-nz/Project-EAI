require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const { XMLParser } = require("fast-xml-parser");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const { createJournal, getDb, getJournalById, listJournals } = require("./db");

const app = express();
const port = Number(process.env.ACCOUNTING_PORT || 3003);
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

app.use(cors());
app.use(express.json({ type: "application/json" }));
app.use(express.text({ type: ["application/xml", "text/xml"] }));

const openApiPath = path.join(__dirname, "..", "openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/health", async (req, res) => {
  await getDb();
  res.json({
    service: "accounting-service",
    status: "UP"
  });
});

app.post("/journals", async (req, res, next) => {
  try {
    const journalPayload = parseJournalPayload(req);
    const validationError = validateJournalPayload(journalPayload);

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    const journal = {
      id: `JRN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      referenceId: journalPayload.referenceId,
      description: journalPayload.description,
      debitAccount: journalPayload.debitAccount,
      creditAccount: journalPayload.creditAccount,
      amount: Number(journalPayload.amount),
      sourceFormat: req.is("application/xml") || req.is("text/xml") ? "XML" : "JSON",
      createdAt: new Date().toISOString()
    };

    const savedJournal = await createJournal(journal);

    res.status(201).json({
      message: "Journal created",
      data: savedJournal
    });
  } catch (error) {
    if (error.message.includes("XML")) {
      return res.status(400).json({
        error: error.message
      });
    }

    next(error);
  }
});

app.get("/journals", async (req, res, next) => {
  try {
    const journals = await listJournals();
    res.json({
      data: journals
    });
  } catch (error) {
    next(error);
  }
});

app.get("/journals/:id", async (req, res, next) => {
  try {
    const journal = await getJournalById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        error: "Journal not found"
      });
    }

    res.json({
      data: journal
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

function parseJournalPayload(req) {
  if (req.is("application/xml") || req.is("text/xml")) {
    const parsed = xmlParser.parse(req.body);

    if (!parsed || !parsed.journal) {
      throw new Error("XML payload must contain a journal root element");
    }

    return parsed.journal;
  }

  return req.body;
}

function validateJournalPayload(body) {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const requiredFields = [
    "referenceId",
    "description",
    "debitAccount",
    "creditAccount",
    "amount"
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `${field} is required`;
    }
  }

  if (!Number.isInteger(Number(body.amount)) || Number(body.amount) <= 0) {
    return "amount must be a positive integer";
  }

  return null;
}

app.listen(port, async () => {
  await getDb();
  console.log(`Accounting Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
