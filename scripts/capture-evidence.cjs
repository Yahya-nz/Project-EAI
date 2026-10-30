const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Run against a fresh local test environment; this script creates one sale.
const output = path.resolve('docs/screenshots');
const payload = {
  buyerName: 'Budi', paymentMethod: 'cash',
  items: [{ productId: 'P001', name: 'Keyboard', quantity: 2, price: 150000 }]
};

async function json(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200, url);
  return response.json();
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const healthBefore = await json('http://localhost:3004/health');
  assert.equal(healthBefore.integration.connected, true);
  const before = await json('http://localhost:3002/products/P001');
  assert.equal(before.data.stock, 10, 'Use a fresh database for the documented 10 -> 8 test');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
    async function swagger(port, method, endpoint, filename, body) {
      await page.goto(`http://localhost:${port}/api-docs/`, { waitUntil: 'networkidle' });
      const block = page.locator(`.opblock-${method}`).filter({ has: page.locator('.opblock-summary-path', { hasText: endpoint }) }).first();
      await block.locator('.opblock-summary').click();
      await block.getByRole('button', { name: 'Try it out' }).click();
      if (endpoint.includes('{id}')) await block.locator('input[placeholder="id"]').fill('P001');
      if (body) await block.locator('textarea').fill(JSON.stringify(body, null, 2));
      const responsePromise = page.waitForResponse(r => r.url().includes(`localhost:${port}/`) && r.request().method().toLowerCase() === method && !r.url().includes('api-docs'));
      await block.getByRole('button', { name: 'Execute', exact: true }).click();
      const response = await responsePromise;
      assert.equal(response.status(), method === 'post' ? 201 : 200);
      await response.finished();
      await block.locator('.live-responses-table').waitFor();
      await page.screenshot({ path: path.join(output, filename), fullPage: true });
      return response.json();
    }
    await swagger(3002, 'get', '/products/{id}', '01-inventory-stok-awal-p001-10.png');
    const sale = await swagger(3001, 'post', '/sales', '02-pos-transaksi-berhasil-http-201.png', payload);
    let health;
    for (let attempt = 0; attempt < 40; attempt++) {
      health = await json('http://localhost:3004/health');
      if (health.integration.processedMessages > healthBefore.integration.processedMessages) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.equal(health.integration.failedMessages, 0);
    assert.ok(health.integration.processedMessages > healthBefore.integration.processedMessages);
    const after = await swagger(3002, 'get', '/products/{id}', '03-inventory-stok-akhir-p001-8.png');
    assert.equal(after.data.stock, 8);
    const movements = await swagger(3002, 'get', '/stock-movements', '04-inventory-stock-movement-out-2.png');
    assert.ok(movements.data.some(m => m.referenceId === sale.sale.id && m.quantity === 2 && m.movementType === 'OUT'));
    const journals = await swagger(3003, 'get', '/journals', '05-accounting-jurnal-xml-300000.png');
    assert.ok(journals.data.some(j => j.referenceId === sale.sale.id && j.amount === 300000 && j.sourceFormat === 'XML'));
    await page.goto('http://localhost:3004/health');
    await page.locator('pre').evaluate(pre => {
      pre.textContent = JSON.stringify(JSON.parse(pre.textContent), null, 2);
      pre.style.fontSize = '20px';
    });
    await page.screenshot({ path: path.join(output, '06-integration-health-up-consumer-connected.png'), fullPage: true });
    await page.goto('http://localhost:15672/', { waitUntil: 'networkidle' });
    if (await page.locator('input[name="username"]').count()) {
      await page.locator('input[name="username"]').fill('guest');
      await page.locator('input[name="password"]').fill('guest');
      await page.getByRole('button', { name: /login/i }).click();
    }
    await page.getByRole('link', { name: 'Exchanges', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Exchanges', exact: true }).click();
    await page.getByRole('link', { name: 'sales.events', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, '07-rabbitmq-exchange-sales-events.png'), fullPage: true });
    await page.getByRole('link', { name: /Queues( and Streams)?$/i }).first().click();
    await page.getByRole('link', { name: 'integration.sale.created', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, '08-rabbitmq-queues-integration-dan-failed.png'), fullPage: true });
    await page.getByRole('link', { name: 'integration.sale.created', exact: true }).click();
    await page.getByText('Consumers', { exact: false }).first().waitFor();
    await page.screenshot({ path: path.join(output, '09-rabbitmq-queue-consumer-aktif.png'), fullPage: true });
    const brokerResponse = await fetch('http://localhost:15672/api/overview', { headers: { Authorization: 'Basic ' + Buffer.from('guest:guest').toString('base64') } });
    assert.equal(brokerResponse.status, 200);
    const broker = await brokerResponse.json();
    const evidence = { capturedAt: new Date().toISOString(), environment: { mode: 'native-local', node: process.version, rabbitmq: broker.rabbitmq_version }, request: payload, before, sale, after, movements, journals, health };
    await fs.writeFile('docs/hasil-pengujian.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ result: 'PASS', saleId: sale.sale.id, before: before.data.stock, after: after.data.stock, journalAmount: 300000, processedMessages: health.integration.processedMessages, screenshots: 9 }));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
