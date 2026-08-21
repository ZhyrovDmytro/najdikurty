import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string): DatabaseConnection {
  if (!connectionString) {
    throw new Error("A PostgreSQL connection string is required");
  }

  const client = postgres(connectionString, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: 5,
    prepare: false
  });

  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 })
  };
}

export function createDatabaseFromEnvironment(): DatabaseConnection {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return createDatabase(connectionString);
}
