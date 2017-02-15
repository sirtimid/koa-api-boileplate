'use strict'

module.exports = (path) => {
	return async (ctx, next) => {
		if (!(ctx.path === path && ctx.method === 'GET')) {
			await next()
			return
		}

		let db = 'OK'
		try {
			await ctx.knex.raw('SHOW TABLES')
		}
		catch (error) {
			db = error
		}

		let redis = 'OK'
		try{
			await ctx.redis.ping()
		}
		catch (error) {
			redis = error
		}

		ctx.body = {
			db: db,
			redis: redis,
			app: ctx.config.get('app_name')
		}
	}
}