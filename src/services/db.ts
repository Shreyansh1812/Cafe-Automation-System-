import postgres from "postgres";

const isServer = typeof window === "undefined";

let sql: postgres.Sql<any>;

if (isServer) {
  const connectionString = process.env.DATABASE_URL || import.meta.env.VITE_DATABASE_URL || "postgresql://postgres:EvoTestDB123@localhost:5432/evolution";

  sql = postgres(connectionString, {
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
} else {
  // Client-side stub to prevent import errors in browser bundle
  sql = (() => {
    throw new Error("Database queries cannot be executed directly on the client side.");
  }) as any;
}

export { sql };
