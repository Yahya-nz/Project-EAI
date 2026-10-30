const amqp = require("amqplib");
const {
  routeSaleCreated,
  translateToAccountingXml,
  translateToInventoryPayload
} = require("./eip");
const { sendToAccounting, sendToInventory } = require("./adapters");

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const exchangeName = process.env.SALES_EXCHANGE || "sales.events";
const routingKey = "sale.created";
const queueName = process.env.INTEGRATION_QUEUE || "integration.sale.created";
const failedQueueName = process.env.INTEGRATION_FAILED_QUEUE || "integration.failed";

const state = {
  connected: false,
  processedMessages: 0,
  failedMessages: 0,
  lastProcessedAt: null,
  lastError: null
};

async function startConsumer() {
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange(exchangeName, "topic", { durable: true });
  await channel.assertQueue(queueName, { durable: true });
  await channel.assertQueue(failedQueueName, { durable: true });
  await channel.bindQueue(queueName, exchangeName, routingKey);
  await channel.prefetch(1);

  state.connected = true;

  await channel.consume(queueName, async (message) => {
    if (!message) {
      return;
    }

    try {
      const event = JSON.parse(message.content.toString());
      await processSaleCreatedEvent(event);

      state.processedMessages += 1;
      state.lastProcessedAt = new Date().toISOString();
      state.lastError = null;
      channel.ack(message);
    } catch (error) {
      state.failedMessages += 1;
      state.lastError = error.message;

      await channel.sendToQueue(
        failedQueueName,
        Buffer.from(JSON.stringify({
          failedAt: new Date().toISOString(),
          error: error.message,
          originalMessage: message.content.toString()
        })),
        {
          contentType: "application/json",
          persistent: true
        }
      );

      channel.ack(message);
      console.error("Failed to process integration message:", error);
    }
  });

  console.log(`Integration consumer listening on ${queueName}`);
}

async function processSaleCreatedEvent(event) {
  const destinations = routeSaleCreated(event);

  for (const destination of destinations) {
    if (destination === "inventory") {
      const inventoryPayload = translateToInventoryPayload(event);
      await sendToInventory(inventoryPayload);
    }

    if (destination === "accounting") {
      const accountingXml = translateToAccountingXml(event);
      await sendToAccounting(accountingXml);
    }
  }
}

function getState() {
  return {
    ...state,
    exchangeName,
    queueName,
    failedQueueName,
    routingKey
  };
}

module.exports = {
  getState,
  processSaleCreatedEvent,
  startConsumer
};
