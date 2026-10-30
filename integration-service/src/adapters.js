const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || "http://localhost:3002";
const accountingServiceUrl = process.env.ACCOUNTING_SERVICE_URL || "http://localhost:3003";

async function sendToInventory(payload) {
  return post(`${inventoryServiceUrl}/stock/reduce`, {
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function sendToAccounting(xmlPayload) {
  return post(`${accountingServiceUrl}/journals`, {
    headers: {
      "Content-Type": "application/xml"
    },
    body: xmlPayload
  });
}

async function post(url, options) {
  const response = await fetch(url, {
    method: "POST",
    ...options
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${responseBody}`);
  }

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    return responseBody;
  }
}

module.exports = {
  sendToAccounting,
  sendToInventory
};
