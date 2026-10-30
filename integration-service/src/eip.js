function routeSaleCreated(event) {
  if (event.eventType !== "sale.created") {
    return [];
  }

  return ["inventory", "accounting"];
}

function translateToInventoryPayload(event) {
  return {
    referenceId: event.data.saleId,
    items: event.data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    }))
  };
}

function translateToAccountingXml(event) {
  const data = event.data;
  const debitAccount = data.paymentMethod === "cash" ? "Cash" : "Accounts Receivable";

  return [
    "<journal>",
    `  <referenceId>${escapeXml(data.saleId)}</referenceId>`,
    `  <description>${escapeXml(`Sales transaction from POS for ${data.buyerName}`)}</description>`,
    `  <debitAccount>${escapeXml(debitAccount)}</debitAccount>`,
    "  <creditAccount>Sales Revenue</creditAccount>",
    `  <amount>${data.totalAmount}</amount>`,
    "</journal>"
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = {
  routeSaleCreated,
  translateToAccountingXml,
  translateToInventoryPayload
};
