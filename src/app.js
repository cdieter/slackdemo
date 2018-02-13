/**
 * The application entry point
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import domainMiddleware from 'express-domain-middleware';
import {errorHandler, notFoundHandler} from 'express-api-error-handler';
import config from 'config';
import './bootstrap';
import JobService from './services/JobService';
import logger from './common/logger';

const app = express();
app.set('port', config.PORT);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(domainMiddleware);

app.post('/start', (req, res) => {
  JobService.start();
  res.json({
    success: true,
  });
});

app.use(errorHandler({
  log: ({err, req, body}) => {
    logger.error(err, `${body.status} ${req.method} ${req.url}`);
  },
}));

app.use(notFoundHandler({
  log: ({req}) => {
    logger.error(`404 ${req.method} ${req.url}`);
  },
}));

const server = http.createServer(app);
JobService.start();
server.listen(app.get('port'), () => {
  logger.info(`Express server listening on port ${app.get('port')} in ${process.env.NODE_ENV} mode`);
});

