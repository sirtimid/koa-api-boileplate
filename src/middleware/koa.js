'use strict'

import bodyParser from 'koa-bodyparser'
import serve from 'koa-static'
import compress from 'koa-compress'
import session from 'koa-generic-session'
import passport from 'koa-passport'
import RedisStore from 'koa-redis'
import convert from 'koa-convert'
import lusca from 'koa-lusca'
import cors from 'kcors'
import path from 'path'
import log from './log'
import { setup as setupPassport } from '../services/passport'

export default function(app) {
	const env = app.context.config.get('env')

	app.use(cors())
	app.use(bodyParser())

	app.use(serve(path.join(process.cwd(), 'public')))

	app.use(log)

	app.use(compress())

	// We need to enable sessions for passport and Lusca
	app.keys = [app.context.config.get('secrets.session')]
	app.use(convert(session({
		store: new RedisStore({
			client: app.context.redis
		})
	})))

	app.use(passport.initialize())

	setupPassport(app.context.models.user, app.context.config)

	// Lusca - server security
	if (env !== 'test') {
		app.use(convert(lusca({
			csrf: false, // TODO: make csrf work
			xframe: 'SAMEORIGIN',
			hsts: {
				maxAge: 31536000, //1 year, in seconds
				includeSubDomains: true,
				preload: true
			},
			xssProtection: true
		})))
	}

}