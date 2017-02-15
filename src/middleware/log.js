'use strict'

import onFinished from 'on-finished'
import uuid from 'uuid'

const logLevel = function(status) {
	if (status < 400) {
		return "info"
	} else if (status < 500) {
		return "warn"
	} else {
		return "error"
	}
}

export default async (ctx, next) => {
	let id = ctx.headers['x-cloud-trace-context'] || uuid.v4()
	let start = Date.now()
	let log = ctx.log
	ctx.log = log.child({ req_id: id })
	let data = { err: null, req_id: id }
	try {
		await next()
	} catch (error) {
		data.err = error
	} finally {
		onFinished(ctx.res, (function(_this) {
			return function() {
				var duration, level
				data.req = _this.req
				data.res = _this.res
				duration = data.duration = Date.now() - start
				level = logLevel(_this.response.status)
				return log[level](data, `${_this.response.status} ${_this.request.method} ${_this.originalUrl} ${duration} ms`)
			}
		})(ctx))
	}
	if (data.err) {
		throw data.err
	}
}