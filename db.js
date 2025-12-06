const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, 
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

const Tenant = sequelize.define('Tenant', {
  id: { type: DataTypes.STRING, primaryKey: true }, 
  shopDomain: { type: DataTypes.STRING, allowNull: false },
  accessToken: { type: DataTypes.STRING, allowNull: false }
});

const Customer = sequelize.define('Customer', {
  shopifyId: { type: DataTypes.BIGINT, unique: true },
  firstName: DataTypes.STRING,
  email: DataTypes.STRING,
  totalSpent: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  ordersCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  tenantId: DataTypes.STRING
});


const Order = sequelize.define('Order', {
  shopifyId: { type: DataTypes.BIGINT, unique: true },
  totalPrice: DataTypes.FLOAT,
  createdAtDate: DataTypes.DATE,
  tenantId: DataTypes.STRING
});


Tenant.hasMany(Customer, { foreignKey: 'tenantId' });
Tenant.hasMany(Order, { foreignKey: 'tenantId' });

const initDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); 
    console.log('Database Connected & Synced');
  } catch (error) {
    console.error('DB Connection Error:', error);
  }
};

module.exports = { sequelize, Tenant, Customer, Order, initDB };