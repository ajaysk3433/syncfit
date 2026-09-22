import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "../logs/logs.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
    ],
});

prisma.$on("error", (e) => {
    logger.error(`Prisma Error: ${e.message}`, { target: e.target });
});

prisma.$on("warn", (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});

export default prisma;
