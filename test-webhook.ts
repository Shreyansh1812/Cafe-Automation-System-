import fs from "fs";
import path from "path";

// Simple logic to parse the .env file if it exists
let envBaseUrl = "http://localhost:5678";
let redemptionUrl = "";
let headerName = "";
let headerValue = "";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    
    const urlMatch = envContent.match(/VITE_N8N_WEBHOOK_BASE_URL\s*=\s*(.*)/);
    if (urlMatch && urlMatch[1]) envBaseUrl = urlMatch[1].trim();

    const redemptionMatch = envContent.match(/VITE_N8N_REDEMPTION_WEBHOOK_URL\s*=\s*(.*)/);
    if (redemptionMatch && redemptionMatch[1]) redemptionUrl = redemptionMatch[1].trim();

    const nameMatch = envContent.match(/VITE_N8N_HEADER_NAME\s*=\s*(.*)/);
    if (nameMatch && nameMatch[1]) headerName = nameMatch[1].trim();

    const valueMatch = envContent.match(/VITE_N8N_HEADER_VALUE\s*=\s*(.*)/);
    if (valueMatch && valueMatch[1]) headerValue = valueMatch[1].trim();
  }
} catch (e) {
  console.warn("Could not read .env file, defaulting to localhost:5678");
}

const N8N_BASE_URL = envBaseUrl;
const N8N_REDEMPTION_URL = redemptionUrl || `${N8N_BASE_URL}/redemption`;
const HEADERS: Record<string, string> = { "Content-Type": "application/json" };
if (headerName && headerValue) {
  HEADERS[headerName] = headerValue;
  console.log(`🔒 Using Authentication Header: ${headerName} = ${headerValue}`);
}

console.log(`\n🚀 Starting Connectivity Test to n8n Webhook: ${N8N_BASE_URL}`);

async function testCafeEntry() {
  console.log("\n1. Testing 'cafe-entry' endpoint...");
  const payload = {
    tenant_id: "tenant-1",
    name: "Test Connection User",
    phone: "+91 99999 88888",
    birthday: "1995-05-15",
    amount_spent: 18.5,
  };

  try {
    const res = await fetch(`${N8N_BASE_URL}/cafe-entry`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload),
    });

    console.log(`STATUS: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    console.log("RESPONSE BODY:", data);
  } catch (err: any) {
    console.error("❌ Connection failed. Details:", err.message || err);
    console.error(
      "💡 Tip: Ensure n8n is running locally and CORS is configured, or check if the URL/port is correct."
    );
  }
}

async function testRedemption() {
  console.log("\n2. Testing 'redemption' endpoint...");
  const payload = {
    coupon_code: "CREMA-TEST-99",
    tenant_id: "tenant-1",
  };

  try {
    const res = await fetch(N8N_REDEMPTION_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload),
    });

    console.log(`STATUS: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    console.log("RESPONSE BODY:", data);
  } catch (err: any) {
    console.error("❌ Connection failed. Details:", err.message || err);
  }
}

async function run() {
  await testCafeEntry();
  await testRedemption();
  console.log("\n🏁 Connectivity check complete.");
}

run();
