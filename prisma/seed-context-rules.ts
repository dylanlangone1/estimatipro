import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=1&connect_timeout=0",
  max: 1,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_CONTEXT_RULES = [
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "bathroom",
    mustInclude: ["Plumbing", "Electrical", "Tile"],
    mustExclude: [] as string[],
    mustAssume: ["Standard plumbing rough-in needed", "GFI outlets required"],
    neverAssume: ["Existing plumbing is adequate"],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "kitchen",
    mustInclude: ["Plumbing", "Electrical", "Countertops", "Cabinets"],
    mustExclude: [] as string[],
    mustAssume: ["Dedicated 20-amp circuits needed"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "deck",
    mustInclude: ["Footings", "Framing", "Decking", "Railing"],
    mustExclude: ["Interior items"],
    mustAssume: ["Permit required", "Frost-depth footings needed"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "roof",
    mustInclude: ["Tear-off", "Underlayment", "Flashing", "Ridge vent"],
    mustExclude: [] as string[],
    mustAssume: ["Ice & water shield at eaves", "Drip edge required"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "basement",
    mustInclude: ["Waterproofing", "Framing", "Electrical", "Egress"],
    mustExclude: [] as string[],
    mustAssume: ["Moisture barrier needed", "Sump pump check required"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "addition",
    mustInclude: ["Foundation", "Framing", "Roofing", "HVAC extension", "Electrical", "Plumbing"],
    mustExclude: [] as string[],
    mustAssume: ["Engineering required", "Permit required"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
  {
    triggerType: "KEYWORD" as const,
    triggerValue: "siding",
    mustInclude: ["Tear-off", "Housewrap", "Trim", "Flashing"],
    mustExclude: [] as string[],
    mustAssume: ["Inspect sheathing condition"],
    neverAssume: [] as string[],
    isActive: true,
    isDefault: true,
  },
]

async function seed() {
  console.log("Seeding default context rules...")

  // Delete existing defaults first (idempotent)
  await prisma.contextRule.deleteMany({
    where: { isDefault: true, userId: null },
  })

  // Create fresh defaults
  await prisma.contextRule.createMany({
    data: DEFAULT_CONTEXT_RULES.map((rule) => ({
      ...rule,
      userId: null,
    })),
  })

  const count = await prisma.contextRule.count({
    where: { isDefault: true, userId: null },
  })
  console.log(`Seeded ${count} default context rules.`)
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
