/*app.ts*/
import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { logger } from './core/logs/logs.js';
import AuthRouter from "./auth/auth.routs.js";
import MembersRouter from "./members/members.routes.js";
import PlansRouter from "./membership-plans/plans.routes.js";
import AttendanceRouter from "./attendance/attendance.routes.js";
import { swaggerDocument } from "./core/docs/swagger.js";
import "./core/configs/firebase.js";
import { errorHandler } from './core/error/error-handler.js';
import { prisma } from './core/configs/prisma.js';
import { bootstrapAdminUser } from './core/configs/bootstrap.js';

const PORT: number = parseInt(process.env.PORT || '8080');
export const app: Express = express();

// Enable CORS for all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

app.use(express.json());

// API Documentation (Swagger UI)
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
});

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

const server = app.listen(PORT, async () => {
    logger.info(`Listening for requests on http://localhost:${PORT}`);
    logger.info(`Swagger UI documentation available at http://localhost:${PORT}/docs`);

    // Bootstrap default admin user on startup
    await bootstrapAdminUser();
});

const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Process terminating`);

    // Close all open keep-alive connections immediately
    if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
    }

    try {
        await prisma.$disconnect();
    } catch (err) {
        logger.error('Error disconnecting Prisma client', { error: err });
    }

    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });

    // Fallback force exit after 1s if anything hangs
    setTimeout(() => process.exit(0), 1000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));