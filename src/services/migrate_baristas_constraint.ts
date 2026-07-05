import fs from "fs";
import path from "path";

// Polyfill import.meta.env
(import.meta as any).env = {};

// Load .env file
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env file:", e);
}

async function main() {
  try {
    const { sql } = await import("./db");

    console.log("Dropping full unique constraint and creating partial unique index on baristas email...");
    
    await sql`
      ALTER TABLE baristas DROP CONSTRAINT IF EXISTS baristas_email_key
    `;
    
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_baristas_email_active 
      ON baristas (email) 
      WHERE deleted_at IS NULL
    `;

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
