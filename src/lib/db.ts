import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required in production.");
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/durak",
      max: Math.min(20, Math.max(1, Number(process.env.DATABASE_POOL_MAX) || 5)),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }),
    log: [],
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
