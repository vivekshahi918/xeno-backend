const express = require('express');
const cors = require('cors');
const { initDB, Tenant, Customer, Order, Product, sequelize } = require('./db');
const { ingestData } = require('./ingest');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/ingest', async (req, res) => {
  const { tenantId } = req.body;
  ingestData(tenantId).catch(err => console.error(err));
  res.json({ message: "Sync started" });
});


app.get('/api/stats', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const totalCustomers = await Customer.count({ where: { tenantId } });
    const totalOrders = await Order.count({ where: { tenantId } });
    const revenueData = await Order.findAll({
      attributes: [[sequelize.fn('sum', sequelize.col('totalPrice')), 'total']],
      where: { tenantId }, raw: true
    });
    res.json({ totalCustomers, totalOrders, totalRevenue: revenueData[0]?.total || 0 });
  } catch (e) { res.json({ totalCustomers: 0, totalOrders: 0, totalRevenue: 0 }); }
});


app.get('/api/products', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const products = await Product.findAll({ where: { tenantId } });
    res.json(products);
  } catch (e) { res.json([]); }
});


app.get('/api/customers', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const customers = await Customer.findAll({ where: { tenantId }, limit: 50 });
    res.json(customers);
  } catch (e) { res.json([]); }
});


app.get('/api/analytics', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const salesByDate = await Order.findAll({
      where: { tenantId },
      attributes: ['createdAtDate', [sequelize.fn('sum', sequelize.col('totalPrice')), 'revenue']],
      group: ['createdAtDate'],
      order: [['createdAtDate', 'ASC']],
      raw: true
    });
    const categoryStats = await Product.findAll({
      where: { tenantId },
      attributes: ['category', [sequelize.fn('count', sequelize.col('id')), 'count']],
      group: ['category'],
      raw: true
    });
    res.json({ sales: salesByDate, categories: categoryStats });
  } catch (e) { res.json({ sales: [], categories: [] }); }
});


app.listen(process.env.PORT, async () => {
  console.log(`Server running on port ${process.env.PORT}`);
  
  await initDB();

  const tenantId = 'xeno-demo-store';
  const exists = await Tenant.findByPk(tenantId);
  
  if (!exists) {
    console.log("Seeding Default Tenant...");
    try {
      await Tenant.create({
        id: tenantId,
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN
      });
      console.log("Default Tenant Seeded Successfully");
    } catch (err) {
      console.error("Failed to seed tenant:", err.message);
    }
  }

});