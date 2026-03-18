const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const prismaLogConfig =
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
}

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: prismaLogConfig,
  });

const hasDedicatedDirectUrl =
  typeof process.env.DIRECT_URL === "string" &&
  process.env.DIRECT_URL.length > 0 &&
  process.env.DIRECT_URL !== process.env.DATABASE_URL;

const prismaTx =
  globalForPrisma.__prismaTx ||
  (hasDedicatedDirectUrl
    ? new PrismaClient({
        log: prismaLogConfig,
        datasources: {
          db: {
            url: process.env.DIRECT_URL,
          },
        },
      })
    : prisma);

async function runDbTransaction(work, options = {}) {
  const txOptions = {
    maxWait: parsePositiveInteger(process.env.PRISMA_TX_MAX_WAIT_MS, 5000),
    timeout: parsePositiveInteger(process.env.PRISMA_TX_TIMEOUT_MS, 15000),
    ...options,
  };

  const runWithClient = (client) => client.$transaction(work, txOptions);

  if (prismaTx === prisma) {
    return runWithClient(prisma);
  }

  try {
    return await runWithClient(prismaTx);
  } catch (error) {
    const errorCode = String(error?.code || "");
    const errorMessage = String(error?.message || "");
    const canFallback =
      errorCode === "P2028" ||
      errorCode === "P2024" ||
      errorMessage.includes("Transaction API error") ||
      errorMessage.includes("Transaction not found");

    if (!canFallback) {
      throw error;
    }

    return runWithClient(prisma);
  }
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
  if (prismaTx !== prisma) {
    globalForPrisma.__prismaTx = prismaTx;
  }
}

module.exports = { prisma, runDbTransaction };
