'use strict'

import config from 'config'
import jwt from 'jsonwebtoken'
import compose from 'koa-compose'

/**
 * get token from request header
 *
 * @param ctx
 * @returns {*}
 */
export function getToken(ctx) {
	let token = null

	// search token from bearer header
	const header = ctx.request.header.authorization
	if (header) {
		const parts = header.split(' ')
		if (parts.length > 1) {
			if (/^Bearer$/i.test(parts[0])) {
				token = parts[1]
			}
		}
	}

	// search token from post params
	if(!token && ctx.request.body && ctx.request.body.access_token){
		token = ctx.request.body.access_token
	}

	// search token from query params
	if(!token && ctx.query && ctx.query.access_token){
		token = ctx.query.access_token
	}

	return token
}

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 401
 */
export function isAuthenticated() {

	return async function(ctx, next) {
		const token = getToken(ctx)

		if (!token) {
			ctx.throw(401, 'Token required')
		}

		let decoded = null
		try {
			decoded = jwt.verify(token, config.get('secrets.session'))
		} catch (err) {
			ctx.throw(401, 'Verify error')
		}

		const user = await ctx.models.user.find({ id: decoded.id })
		if (!user) {
			ctx.throw(401, 'User not found')
		}

		if (!user.active) {
			ctx.throw(401, 'User not active')
		}

		// attach user and token to context
		ctx.state.user = user
		ctx.state.token = token

		return next()
	}
}

/**
 * Checks if the user role is the admin or if the state.id is the users id
 */
export function isMeOrAdmin() {

	function meetsRequirements(ctx, next) {
		const user_roles = config.get('user_roles')
		const id = parseInt(ctx.params.id === 'me' ? ctx.state.user.id : ctx.params.id)

		if (ctx.state.user.id === id || ctx.state.user.role === 'admin') {
			ctx.params.id = id
			return next()
		} else {
			return ctx.status = 403
		}
	}

	return compose([isAuthenticated(), meetsRequirements])
}


/**
 * Checks if the user role meets the minimum requirements of the route
 */
export function hasRole(roleRequired) {
	if (!roleRequired) {
		throw new Error('Required role needs to be set')
	}

	function meetsRequirements(ctx, next) {
		const user_roles = config.get('user_roles')
		if (user_roles.indexOf(ctx.state.user.role) >= user_roles.indexOf(roleRequired)) {
			return next()
		} else {
			return ctx.status = 403
		}
	}

	return compose([isAuthenticated(), meetsRequirements])
}

/**
 * Checks if the user is admin
 */
export function isAdmin(ctx) {
	const user_roles = config.get('user_roles')
	return user_roles.indexOf(ctx.state.user.role) >= user_roles.indexOf('admin')
}

/**
 * Returns a jwt token signed by the app secret
 */
export function signToken(id, role, remember_me) {
	return jwt.sign({ id: id, role: role }, config.get('secrets.session'), {
		expiresIn: (remember_me ? 365 * 24 * 60 * 60 : 5 * 60 * 60) // 1 year || 5 hours
	})
}

/**
 * Returns a jwt token signed by the app secret
 */
export function signEmailToken(email) {
	return jwt.sign({ email }, config.get('secrets.session'), {
		expiresIn: 60 * 60 * 5
	})
}

/**
 * Returns a jwt token signed by the app secret to reset password
 */
export function validateEmailToken(token) {
  return jwt.verify(token, config.get('secrets.session'))
}

/**
 * Set token cookie directly for oAuth strategies
 */
export async function setTokenCookie(ctx, next) {
	if (!ctx.state.user) {
		ctx.status = 404
		ctx.body = `It looks like you aren't logged in, please try again.`
		return
	}
	const token = signToken(ctx.state.user.id, ctx.state.user.role)
	// redirect after login
	ctx.redirect('/')
}
