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

    // Check baristas
    const baristas = await sql`
      SELECT b.barista_id, b.name, b.email, b.password_hash, b.tenant_id
      FROM baristas b
    `;
    console.log("Baristas in DB:", baristas);

    // Check join with tenants
    const joinCheck = await sql`
      SELECT b.barista_id, b.name, b.email, b.tenant_id, t.business_name, t.deleted_at as tenant_deleted_at
      FROM baristas b
      JOIN tenants t ON b.tenant_id = t.tenant_id
    `;
    console.log("Joined with tenants:", joinCheck);

    process.exit(0);
  } catch (err) {
    console.error("Error running test:", err);
    process.exit(1);
  }
}

main();
