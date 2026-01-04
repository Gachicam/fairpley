import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PrismaClientLike = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientLike | undefined;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // 本番環境: Accelerate接続 (prisma://...)
  if (databaseUrl.startsWith("prisma://")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withAccelerate } = require("@prisma/extension-accelerate");
    return new PrismaClient({
      log: ["error"],
    }).$extends(withAccelerate());
  }

  // ローカル開発: TCP接続 (postgres://...)
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
