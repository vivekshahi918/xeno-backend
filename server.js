const express = require('express');
const cors = require('cors');
const { initDB, Tenant, Customer, Order, sequelize } = require('./db');
const { ingestData } = require('./ingest');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/ingest', async (req, res) => {
  const { tenantId } = req.body;
  await ingestData(tenantId);
  res.json({ message: "Ingestion started/completed" });
});

app.get('/api/stats', async (req, res) => {
  const { tenantId } = req.query; 
  

  const totalCustomers = await Customer.count({ where: { tenantId } });
  const totalOrders = await Order.count({ where: { tenantId } });
  

  const totalRevenueData = await Order.findAll({
    attributes: [[sequelize.fn('sum', sequelize.col('totalPrice')), 'total']],
    where: { tenantId },
    raw: true
  });
  const totalRevenue = totalRevenueData[0].total || 0;

  res.json({ totalCustomers, totalOrders, totalRevenue });
});

app.get('/api/chart', async (req, res) => {
  const { tenantId } = req.query;
  const orders = await Order.findAll({
    where: { tenantId },
    attributes: ['createdAtDate', 'totalPrice'],
    order: [['createdAtDate', 'ASC']]
  });
  res.json(orders);
});

app.listen(process.env.PORT, async () => {
  console.log(`Server running on port ${process.env.PORT}`);
  await initDB();


  const tenantId = 'xeno-demo-store';
  const exists = await Tenant.findByPk(tenantId);
  if (!exists && process.env.SHOPIFY_ACCESS_TOKEN) {
    await Tenant.create({
      id: tenantId,
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN
    });
    console.log("Seeded Default Tenant");
  }
});