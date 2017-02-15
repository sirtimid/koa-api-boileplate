'use strict'

import Koa from 'koa'
import router from './routes'
import convert from 'koa-convert'
import * as ctx from './context'
import healthCheck from './middleware/health-check'

const app = new Koa()
// assign context
Object.assign(app.context, ctx)
// setup koa middlewares
require('./middleware/koa').default(app)
// create healthcheck ednpoint at /api
app.use(healthCheck('/api'))
// assign routes
app.use(router)

// start server
const port = ctx.config.get('port')
const name = ctx.config.get('app_name')
app.listen(port, () => ctx.log.info(`${name} listening on ${port}`) )

exports = module.exports = app