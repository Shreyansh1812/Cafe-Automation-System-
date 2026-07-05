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

    // Get columns of baristas
    const baristasCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'baristas'
    `;
    console.log("Columns in baristas:", baristasCols.map(c => `${c.column_name}: ${c.data_type}`));

    // Select all baristas to see if they have deleted_at values
    const allBaristas = await sql`
      SELECT barista_id, name, email, deleted_at FROM baristas
    `;
    console.log("\nAll baristas in DB:", allBaristas);

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting baristas:", err);
    process.exit(1);
  }
}

main();
