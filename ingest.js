const axios = require('axios');
const { Tenant, Customer, Order, Product } = require('./db');

const DEMO_PROFILES = [
  { name: "Alice Johnson", email: "alice.j@example.com" },
  { name: "Bob Smith", email: "bob.smith@test.co" },
  { name: "Charlie Brown", email: "charlie.b@domain.com" },
  { name: "Diana Prince", email: "diana.p@demo.net" },
  { name: "Evan Wright", email: "evan.w@sample.org" },
  { name: "Fiona Green", email: "fiona.g@test.io" },
  { name: "George King", email: "george.k@example.com" },
  { name: "Hannah Lee", email: "hannah.l@demo.co" }
];

const ingestData = async (tenantId) => {
  console.log(`Starting ingestion for: ${tenantId}`);
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) return console.error("Tenant not found");

  const shopUrl = `https://${tenant.shopDomain}/admin/api/2023-10`;
  const headers = { 'X-Shopify-Access-Token': tenant.accessToken };

  try {
    console.log("... Fetching Customers");
    const custRes = await axios.get(`${shopUrl}/customers.json?limit=50`, { headers });
    
    for (let i = 0; i < custRes.data.customers.length; i++) {
      const c = custRes.data.customers[i];
      
      const demoProfile = DEMO_PROFILES[i % DEMO_PROFILES.length];

      const realName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      const finalName = realName || demoProfile.name;
      const finalEmail = c.email || demoProfile.email;

      await Customer.upsert({
        shopifyId: c.id,
        firstName: finalName, 
        email: finalEmail,
        totalSpent: parseFloat(c.total_spent || (Math.random() * 800 + 100).toFixed(2)), // Random spend if 0
        ordersCount: c.orders_count || Math.floor(Math.random() * 5) + 1,
        tenantId: tenant.id
      });
    }

    // --- ORDERS ---
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

    // --- PRODUCTS ---
    console.log("... Fetching Products");
    const prodRes = await axios.get(`${shopUrl}/products.json?limit=50`, { headers });
    for (const p of prodRes.data.products) {
      const variant = p.variants[0] || {};
      await Product.upsert({
        shopifyId: p.id,
        title: p.title,
        category: p.product_type || "General",
        price: parseFloat(variant.price || 0),
        stock: variant.inventory_quantity || 100,
        tenantId: tenant.id
      });
    }

    console.log(`Ingestion Complete for ${tenantId}`);
  } catch (err) {
    console.error("Ingestion Error:", err.message);
  }
};

module.exports = { ingestData };