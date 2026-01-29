
import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function fixRelationships() {
  console.log(`Connecting to database...`);
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`✅ Connected.`);

    const fixes = [
      // 1. Invoices -> Companies
      {
        name: "invoices.company_id -> companies.id",
        sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;`
      },
      // 2. Invoices -> Customers
      {
        name: "invoices.customer_id -> customers.id",
        sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;`
      },
      // 3. Invoice Items -> Invoices
      {
        name: "invoice_items.invoice_id -> invoices.id",
        sql: `ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;`
      },
      // 4. Invoice Items -> Items
      {
        name: "invoice_items.item_id -> items.id",
        sql: `ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;`
      },
      // 5. Customers -> Companies
      {
        name: "customers.company_id -> companies.id",
        sql: `ALTER TABLE customers ADD CONSTRAINT customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;`
      },
      // 6. Items -> Companies
      {
        name: "items.company_id -> companies.id",
        sql: `ALTER TABLE items ADD CONSTRAINT items_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;`
      },
      // 7. Vendors -> Companies
      {
        name: "vendors.company_id -> companies.id",
        sql: `ALTER TABLE vendors ADD CONSTRAINT vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;`
      },
      // 8. Payments -> Invoices
      {
        name: "payments.invoice_id -> invoices.id",
        sql: `ALTER TABLE payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;`
      }
    ];

    for (const fix of fixes) {
      try {
        console.log(`Applying: ${fix.name}...`);
        await client.query(fix.sql);
        console.log(`   ✅ Success.`);
      } catch (err: any) {
        if (err.message.includes("already exists")) {
          console.log(`   ℹ️ Already exists, skipping.`);
        } else {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }

    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ Schema cache reload notified.");

  } catch (err: any) {
    console.error(`❌ Connection error:`, err.message);
  } finally {
    await client.end();
  }
}

fixRelationships();
