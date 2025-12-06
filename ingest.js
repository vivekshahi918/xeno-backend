const axios = require('axios');
const { Tenant, Customer, Order } = require('./db');


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ingestData = async (tenantId) => {
  console.log(`🚀 Starting ingestion for: ${tenantId}`);
  
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) return console.error("Tenant not found");

  const shopUrl = `https://${tenant.shopDomain}/admin/api/2023-10`;
  const headers = { 'X-Shopify-Access-Token': tenant.accessToken };

  try {

    console.log("... Fetching Customers");
    const custRes = await axios.get(`${shopUrl}/customers.json?limit=50`, { headers });
    for (const c of custRes.data.customers) {
      await Customer.upsert({
        shopifyId: c.id,
        firstName: c.first_name,
        email: c.email,
        totalSpent: parseFloat(c.total_spent),
        ordersCount: c.orders_count,
        tenantId: tenant.id
      });
    }

    console.log("... Fetching Orders");
    const ordRes = await axios.get(`${shopUrl}/orders.json?status=any&limit=50`, { headers });
    for (const o of ordRes.data.orders) {
      await Order.upsert({
        shopifyId: o.id,
        totalPrice: parseFloat(o.total_price),
        createdAtDate: o.created_at,
        tenantId: tenant.id
      });
    }

    console.log(`Ingestion Complete for ${tenantId}`);
  } catch (err) {
    console.error("Ingestion Failed:", err.message);
  }
};

module.exports = { ingestData };