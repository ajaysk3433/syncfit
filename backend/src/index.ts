/*app.ts*/
import 'dotenv/config'
import express, { type Express } from 'express';
import { logger } from './logs.js';
import { tracer } from './snap-generate.js';


const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get('/rolldice', (req, res) => {
    return tracer.startActiveSpan('random-controller', (span) => {
        logger.info('roll dice controller');
        res.send(random());
        span.end()
    })
});

function random() {
    return tracer.startActiveSpan('random-service', (span) => {
        try {
            logger.info('roll dice service'); // <-- Will now have a new child span_id
            return getRandomNumber(1, 6).toString();
        } finally {
            span.end(); // Always end the span
        }
    });
}

const server = app.listen(PORT, () => {
    logger.info(`Listening for requests on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    logger.info('Process terminating');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
