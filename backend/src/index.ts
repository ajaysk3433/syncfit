/*app.ts*/
import 'dotenv/config'
import express, {type Express } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
})


const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get('/rolldice', (req, res) => {
    logger.info('roll dice');
    res.send(getRandomNumber(1, 6).toString());
});

app.listen(PORT, () => {
    console.log(`Listening for requests on http://localhost:${PORT}`);
});
