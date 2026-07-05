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
    const { createBaristaServerFn } = await import("./api");
    const { loginServerFn } = await import("./api");

    const email = "test-barista@mycafe.com";
    const password = "testpassword123"; // 15 characters
    const tenantId = "550e8400-e29b-41d4-a716-446655440000";

    console.log("Cleaning up old test barista if exists...");
    await sql`
      DELETE FROM baristas WHERE email = ${email}
    `;

    console.log("Creating test barista via createBaristaServerFn...");
    const createRes = await createBaristaServerFn({
      data: {
        tenant_id: tenantId,
        name: "Test Barista",
        email,
        phone: "+919999999999",
        password,
      }
    });
    console.log("Creation response:", createRes);

    console.log("Attempting to login via loginServerFn...");
    const loginRes = await loginServerFn({
      data: {
        email,
        password,
      }
    });
    console.log("Login response:", loginRes);

    process.exit(0);
  } catch (err) {
    console.error("Test flow error:", err);
    process.exit(1);
  }
}

main();
