'use strict'

const path = require('path');

require('dotenv').config({path: path.join(__dirname, '.env')})

const Koa = require('koa');
const Router = require('koa-router');
const compress = require('koa-compress');
const etag = require('koa-etag');
const koaBunyan = require('koa-bunyan-logger');
const send = require('koa-send');
const fs = require('fs');
const bunyan = require('bunyan');
const {promisify} = require('util');

const stream = {
  type: 'rotating-file',
  path: `/var/log/${process.env['V_APP_NAME']}.log`,
  period: '1d',
  count: 30
};

const loggerConfig = {
  name: process.env.V_APP_NAME,
  level: process.env.V_APP_LOG_LEVEL,
  serializers: bunyan.stdSerializers
};

if (process.env.NODE_ENV !== 'dev') {
  loggerConfig.streams = [stream];
}

const logger = bunyan.createLogger(loggerConfig);
const BASE_DIR = path.join(__dirname, process.env.V_APP_DIST);
const TEMPLATES_DIR = path.join(BASE_DIR, process.env.V_APP_TEMPLATES);
const router = new Router();
const app = new Koa();

let cache = {};

require('koa-ctx-cache-control')(app);

app.use(koaBunyan(logger));
app.use(koaBunyan.requestIdContext());
app.use(koaBunyan.requestLogger());
app.use(etag());
app.use(compress());

router
  .get('/', async ctx => {
    ctx.cacheControl('1 day');
    ctx.body = cache['index-main.html'];
  })
  .get('/cdn/*', async ctx => {
    ctx.cacheControl('1 day');
    await send(ctx, ctx.path, { root: BASE_DIR })
  })
  .get('/templates/*', async ctx => {
    ctx.cacheControl('1 day');
    await send(ctx, ctx.path, { root: TEMPLATES_DIR });
  });

app.use(router.routes());

getTemplates()
  .then(() => {
    app.listen(Number(process.env.V_APP_SERVER_PORT));
    logger.info('App Server Started');
  })
  .catch(err => {
    logger.error({
      err
    });
  });

async function getTemplates() {
  logger.trace('getting templates');
  let dir = await promisify(fs.readdir)(BASE_DIR);
  for (let file of dir) {
    let template = await promisify(fs.readFile)(path.join(BASE_DIR, file));
    cache[file] = template.toString();
    logger.trace({
      file
    }, 'caching template');
  }
  logger.trace('caching complete');
}
