/**
 * SageFlow Peachtree Bridge Agent
 * --------------------------------
 * A secure local agent that runs on the Windows Server hosting Peachtree (Sage 50).
 * It exposes an API that Cloudflare Tunnel can talk to.
 */

require('dotenv').config();
const express = require('express');
const odbc = require('odbc');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.BRIDGE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Security Middleware: Verify API Key
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    console.warn(`[Security] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid Bridge API Key' });
  }
  next();
});

// Database Connection Helper
async function queryPeachtree(sql) {
  let connection;
  try {
    // Connect to ODBC DSN
    // Note: This relies on a System DSN named in .env
    const connectionString = `DSN=${process.env.PEACHTREE_DSN_NAME};UID=${process.env.PEACHTREE_USER};PWD=${process.env.PEACHTREE_PASSWORD};`;

    connection = await odbc.connect(connectionString);
    const result = await connection.query(sql);
    return result;
  } catch (error) {
    console.error('[ODBC Error]', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error('[Connection Close Error]', e);
      }
    }
  }
}

// Routes

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date(), system: 'SageFlow Bridge' });
});

/**
 * Customers Sync
 * Fetches customers from Peachtree
 */
app.get('/sync/customers', async (req, res) => {
  const limit = req.query.limit || 100;

  // Adjust SQL based on actual Peachtree version schema (Pervasive SQL)
  // Common fields: Customer_ID, Name, Contact, Phone
  const sql = `
    SELECT TOP ${limit} 
      Customer_ID, 
      Name, 
      Contact, 
      Email, 
      Phone_1 as Phone,
      Address_Line_1 as Address,
      City, 
      State, 
      Zip,
      Credit_Limit,
      Credit_Status
    FROM Customer
  `;

  try {
    const data = await queryPeachtree(sql);
    console.log(`[Sync] Customers synced: ${data.length} records`);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Inventory Sync
 * Fetches items and stock levels
 */
app.get('/sync/inventory', async (req, res) => {
  const limit = req.query.limit || 100;

  const sql = `
    SELECT TOP ${limit}
      Item_ID,
      Description,
      Class,
      Qty_On_Hand,
      Unit_Price,
      Cost_Method,
      Last_Unit_Cost
    FROM LineItem
    WHERE Class = 0 -- Typical class for stock items
  `;

  try {
    const data = await queryPeachtree(sql);
    console.log(`[Sync] Inventory synced: ${data.length} records`);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Sales Orders / Invoices
 */
app.get('/sync/invoices', async (req, res) => {
  const days = req.query.days || 30;

  // Pervasive SQL Date math might vary, simpler to fetch recent ID or filter in JS if needed
  // This is a simplified query
  const sql = `
    SELECT TOP 50
      Invoice_Number,
      Date,
      Customer_ID,
      Subtotal,
      Sales_Tax,
      Invoice_Total
    FROM JrnlHdr
    WHERE JrnlKey_Journal = 3 -- Sales Journal typical ID
    ORDER BY Date DESC
  `;

  try {
    const data = await queryPeachtree(sql);
    console.log(`[Sync] Invoices synced: ${data.length} records`);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`
  🚀 SageFlow Bridge Agent Running!
  ---------------------------------
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Peachtree DSN: ${process.env.PEACHTREE_DSN_NAME}
  
  Waiting for requests via Cloudflare Tunnel...
  `);
});
