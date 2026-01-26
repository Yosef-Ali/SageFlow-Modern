
import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function fixInvoiceStatus() {
  console.log(`Connecting to database...`);
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`✅ Connected.`);

    // 1. Ensure the enum exists
    const checkEnum = await client.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status');`);
    if (!checkEnum.rows[0].exists) {
      console.log("Creating enum 'invoice_status'...");
      await client.query(`CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');`);
    }

    // 2. Sanitize existing data
    // Convert to uppercase
    await client.query(`UPDATE invoices SET status = UPPER(status) WHERE status IS NOT NULL`);

    // Set invalid statuses to 'DRAFT'
    await client.query(`
      UPDATE invoices 
      SET status = 'DRAFT' 
      WHERE status NOT IN ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
    `);

    // 3. Drop Default, Alter Type, Set Default
    console.log("Dropping default value...");
    await client.query(`ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT;`);

    console.log("Altering column type...");
    await client.query(`
      ALTER TABLE invoices 
      ALTER COLUMN status TYPE invoice_status 
      USING status::invoice_status;
    `);

    console.log("Setting default value back...");
    await client.query(`ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'DRAFT'::invoice_status;`);

    console.log("✅ Column 'status' successfully converted to type 'invoice_status'.");

  } catch (err: any) {
    // If table doesn't exist or column doesn't exist, this might fail, which is fine (means Drizzle will create it)
    console.error(`❌ Error (might be expected if table/column missing):`, err.message);
  } finally {
    await client.end();
  }
}

fixInvoiceStatus();
