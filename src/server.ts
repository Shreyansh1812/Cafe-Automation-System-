import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  let normalized = phone.replace(/[^0-9+]/g, "");
  if (normalized.startsWith("0")) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith("+")) {
    return normalized;
  }
  if (normalized.startsWith("91")) {
    return `+${normalized}`;
  }
  if (normalized.length === 10) {
    return `+91${normalized}`;
  }
  if (normalized.length === 12 && normalized.startsWith("91")) {
    return `+${normalized}`;
  }
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Intercept /api/customers/by-phone
      if (url.pathname === "/api/customers/by-phone") {
        const { sql } = await import("./services/db");
        const phone = url.searchParams.get("phone");
        const tenant_id = url.searchParams.get("tenant_id");

        if (!phone || !tenant_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Phone and tenant_id are required." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const normalizedPhone = normalizePhone(phone);

        let rows = await sql`
          SELECT 
            customer_id,
            name,
            phone,
            birthday,
            total_visits,
            lifetime_spend,
            last_visit,
            created_at
          FROM customers
          WHERE phone = ${normalizedPhone} AND tenant_id = ${tenant_id} AND deleted_at IS NULL
          LIMIT 1
        `;

        if (rows.length === 0) {
          // Fallback to match space-separated or unnormalized stored numbers
          rows = await sql`
            SELECT 
              customer_id,
              name,
              phone,
              birthday,
              total_visits,
              lifetime_spend,
              last_visit,
              created_at
            FROM customers
            WHERE (
              phone = ${phone} 
              OR REPLACE(REPLACE(phone, ' ', ''), '-', '') = ${normalizedPhone}
            ) AND tenant_id = ${tenant_id} AND deleted_at IS NULL
            LIMIT 1
          `;
        }

        if (rows.length === 0) {
          return new Response(
            JSON.stringify({
              found: false,
              message: "No customer found with this phone number.",
              normalized_phone: normalizedPhone,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        const customer = rows[0];
        return new Response(
          JSON.stringify({
            found: true,
            customer: {
              customer_id: customer.customer_id,
              name: customer.name,
              phone: customer.phone,
              birthday: customer.birthday
                ? customer.birthday instanceof Date
                  ? customer.birthday.toISOString().split("T")[0]
                  : typeof customer.birthday === "string"
                    ? customer.birthday.split("T")[0]
                    : customer.birthday
                : "",
              total_visits: customer.total_visits || 0,
              lifetime_spend: Number(customer.lifetime_spend) || 0,
              last_visit: customer.last_visit,
              member_since: customer.created_at,
            },
            normalized_phone: normalizedPhone
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Intercept /api/visits
      if (url.pathname === "/api/visits" && request.method === "POST") {
        const { sql } = await import("./services/db");
        const body = await request.json();
        const { tenant_id, customer_id, name, phone, birthday, amount_spent } = body;

        if (!tenant_id || !phone || amount_spent === undefined) {
          return new Response(
            JSON.stringify({ success: false, message: "tenant_id, phone, and amount_spent are required." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const normalizedPhone = normalizePhone(phone);

        let customerId = customer_id;

        if (!customerId) {
          const existing = await sql`
            SELECT customer_id FROM customers 
            WHERE (
              phone = ${normalizedPhone} 
              OR REPLACE(REPLACE(phone, ' ', ''), '-', '') = ${normalizedPhone}
            ) AND tenant_id = ${tenant_id} AND deleted_at IS NULL
            LIMIT 1
          `;

          if (existing.length > 0) {
            customerId = existing[0].customer_id;
          } else {
            const [newCustomer] = await sql`
              INSERT INTO customers (customer_id, tenant_id, name, phone, birthday, first_visit, created_at)
              VALUES (gen_random_uuid(), ${tenant_id}, ${name}, ${normalizedPhone}, ${birthday || null}, NOW(), NOW())
              RETURNING customer_id
            `;
            customerId = newCustomer.customer_id;
          }
        }

        // Insert visit
        await sql`
          INSERT INTO visits (visit_id, tenant_id, customer_id, visit_date, amount_spent, created_at)
          VALUES (gen_random_uuid(), ${tenant_id}, ${customerId}, NOW(), ${Number(amount_spent)}, NOW())
        `;

        // Update customer stats
        await sql`
          UPDATE customers 
          SET total_visits = total_visits + 1,
              last_visit = NOW(),
              lifetime_spend = COALESCE(lifetime_spend, 0) + ${Number(amount_spent)},
              updated_at = NOW()
          WHERE customer_id = ${customerId}
        `;

        return new Response(
          JSON.stringify({
            success: true,
            message: "Visit logged successfully!",
            customer_id: customerId,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
