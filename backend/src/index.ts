/*app.ts*/
import 'dotenv/config'
import express, { type Express } from 'express';
import { logger } from './core/logs/logs.js';
import AuthRouter from "./auth/auth.routs.js"
import "./core/configs/firebase.js"
import { errorHandler } from './core/error/error-handler.js';


const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();
app.use(express.json())

app.use("/v1/auth/",AuthRouter)

const server = app.listen(PORT, () => {
    logger.info(`Listening for requests on http://localhost:${PORT}`);
});


app.use(errorHandler)

process.on('SIGTERM', () => {
    logger.info('Process terminating');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Process terminating');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});