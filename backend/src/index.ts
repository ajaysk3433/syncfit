/*app.ts*/
import 'dotenv/config';
import express, { type Express } from 'express';
import { logger } from './core/logs/logs.js';
import AuthRouter from "./auth/auth.routs.js";
import MembersRouter from "./members/members.routes.js";
import PlansRouter from "./membership-plans/plans.routes.js";
import AttendanceRouter from "./attendance/attendance.routes.js";
import "./core/configs/firebase.js";
import { errorHandler } from './core/error/error-handler.js';
import { prisma } from './core/configs/prisma.js';

const PORT: number = parseInt(process.env.PORT || '8080');
export const app: Express = express();

app.use(express.json());

// API Routes
app.use("/v1/auth", AuthRouter);
app.use("/v1/members", MembersRouter);
app.use("/v1/membership-plans", PlansRouter);
app.use("/v1/attendance", AttendanceRouter);

// Health check endpoint
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
    logger.info(`Listening for requests on http://localhost:${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Process terminating`);
    try {
        await prisma.$disconnect();
    } catch (err) {
        logger.error('Error disconnecting Prisma client', { error: err });
    }
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));