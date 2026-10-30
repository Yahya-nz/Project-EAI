const amqp = require("amqplib");

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const exchangeName = process.env.SALES_EXCHANGE || "sales.events";
const routingKey = "sale.created";

let channel;

async function getChannel() {
  if (channel) {
    return channel;
  }

  const connection = await amqp.connect(rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange(exchangeName, "topic", { durable: true });

  return channel;
}

async function publishSaleCreated(event) {
  const activeChannel = await getChannel();
  const payload = Buffer.from(JSON.stringify(event));

  activeChannel.publish(exchangeName, routingKey, payload, {
    contentType: "application/json",
    persistent: true
  });
}

module.exports = {
  publishSaleCreated
};
