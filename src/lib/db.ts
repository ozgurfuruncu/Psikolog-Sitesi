import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/durak",
      max: 10,
    }),
    log: [],
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
