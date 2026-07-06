import fs from "fs";
import path from "path";
import postgres from "postgres";

async function run() {
  console.log("Starting phone normalization database migration...");
  
  // Read .env file to get DATABASE_URL
  let dbUrl = "postgresql://postgres:EvoTestDB123@localhost:5432/evolution";
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/DATABASE_URL\s*=\s*(.*)/);
      if (match && match[1]) {
        dbUrl = match[1].trim();
      }
    }
  } catch (err) {
    console.warn("Could not read .env file, using default DB URL:", err);
  }

  const sql = postgres(dbUrl, {
    ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : false,
  });

  try {
    // 1. Customers
    const res1 = await sql`
      UPDATE customers 
      SET phone = 
          CASE 
              -- If phone starts with '0', remove it and add '+91'
              WHEN phone LIKE '0%' THEN '+91' || SUBSTRING(phone FROM 2)
              -- If phone is 10 digits, add '+91'
              WHEN phone ~ '^[0-9]{10}$' THEN '+91' || phone
              -- If phone has spaces, remove them
              ELSE REPLACE(phone, ' ', '')
          END
      WHERE phone IS NOT NULL 
        AND phone NOT LIKE '+%'
      RETURNING customer_id, phone;
    `;
    console.log(`Normalized ${res1.length} customer records.`);

    // 2. Baristas
    const res2 = await sql`
      UPDATE baristas 
      SET phone = 
          CASE 
              WHEN phone LIKE '0%' THEN '+91' || SUBSTRING(phone FROM 2)
              WHEN phone ~ '^[0-9]{10}$' THEN '+91' || phone
              ELSE REPLACE(phone, ' ', '')
          END
      WHERE phone IS NOT NULL 
        AND phone NOT LIKE '+%'
      RETURNING barista_id, phone;
    `;
    console.log(`Normalized ${res2.length} barista records.`);

    // 3. Tenants
    const res3 = await sql`
      UPDATE tenants 
      SET phone = 
          CASE 
              WHEN phone LIKE '0%' THEN '+91' || SUBSTRING(phone FROM 2)
              WHEN phone ~ '^[0-9]{10}$' THEN '+91' || phone
              ELSE REPLACE(phone, ' ', '')
          END
      WHERE phone IS NOT NULL 
        AND phone NOT LIKE '+%'
      RETURNING tenant_id, phone;
    `;
    console.log(`Normalized ${res3.length} tenant records.`);
    
    // Also, handle any customer records that might have +91 with spaces like "+91 9878900000"
    const res4 = await sql`
      UPDATE customers
      SET phone = REPLACE(phone, ' ', '')
      WHERE phone LIKE '+%' AND phone LIKE '% %'
      RETURNING customer_id, phone;
    `;
    console.log(`Stripped spaces from ${res4.length} formatted E.164 customer numbers.`);

    console.log("Migration complete!");
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    await sql.end();
    process.exit(1);
  }
}

run();
