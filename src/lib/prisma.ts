import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: pg.Pool | undefined
}

function createPrismaClient() {
  // Replace deprecated SSL modes that trigger pg-connection-string warning (pg v9 compat).
  // DATABASE_URL often contains ?sslmode=require; replace with verify-full so pg doesn't
  // warn about upcoming libpq semantics change. No security behaviour changes — the pool
  // already enforces ssl: { rejectUnauthorized: true } which is equivalent to verify-full.
  const connStr = (process.env.DATABASE_URL ?? "").replace(
    /sslmode=(prefer|require|verify-ca)/g,
    "sslmode=verify-full"
  )
  const pool = new pg.Pool({
    connectionString: connStr,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true },
  })
  globalForPrisma.pool = pool
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
