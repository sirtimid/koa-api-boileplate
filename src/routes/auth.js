'use strict'

import Router from 'koa-router'
import passport from 'koa-passport'
import mailer from '../services/mailer'
import config from 'config'
import * as auth from '../services/auth'

const router = new Router({ prefix: '/api/auth' })


/*
 * Local Strategy
 */
router.post('/login', function(ctx, next) {
	return passport.authenticate('local', async function(user, info, error) {

		error = error || info
		if (error) {
			ctx.status = 401
			ctx.body = error
			return
		}

		if (!user) {
			ctx.status = 404
			ctx.body = { message: 'Something went wrong, please try again.' }
			return
		}

		const token = auth.signToken(user.id, user.role, ctx.request.body.remember_me)
		ctx.state.user = user
		ctx.body = { token }

		return
	})(ctx, next)
})


/**
 * Send reset password email
 */
router.post('/forgot', async function(ctx, next) {
	ctx.assert(ctx.request.email, 403, 'Email required')
	const user = await ctx.models.user.findByEmail(ctx.request.email)
	ctx.assert(user, 404, 'User not found')
	const token = auth.signEmailToken(email)
	try {
		await mailer.send({
			to: email,
			subject: 'Reset Password',
			template: 'password_forgot',
			data: {
				link: config.get('app_url')+'/reset/'+token,
			}
		})
		ctx.status = 200
	} catch (err) {
		ctx.throw(400, err.message)
	}
})

/**
 * Validate token from reset password link
 */
router.post('/forgot/validate', async function(ctx, next) {
	ctx.assert(ctx.request.token, 403, 'Token required')
	try {
		const decoded = auth.validateEmailToken(ctx.request.token)
		const user = await ctx.models.user.findByEmail(decoded.email)
		ctx.assert(user, 404, 'No user found with provided email')
		ctx.body = { email: user.email }
	} catch(err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Reset a users password
 */
router.post('/reset', async function(ctx, next) {
	ctx.assert(ctx.request.token, 403, 'Token required')
	ctx.assert(ctx.request.password, 403, 'Password required')
	ctx.assert(ctx.request.repeat_password, 403, 'Repeat Password required')
	ctx.assert(ctx.request.password !== ctx.request.repeat_password, 403, `Passwords don't match`)
	try {
		const decoded = auth.validateEmailToken(ctx.request.token)
		const user = await ctx.models.user.findByEmail(decoded.email)
		ctx.assert(user, 404, 'No user found with provided email')
		await ctx.models.user.updatePassword(user.id, ctx.request.password)
		const token = auth.signToken(user.id, user.role)
		ctx.body = { token }
	} catch(err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Send activation token by email
 */
router.post('/send_activation', async function(ctx, next) {
	ctx.assert(ctx.request.email, 403, 'Email required')
	const user = await ctx.models.user.findByEmail(ctx.request.email)
	ctx.assert(user, 404, 'User not found')
	const token = auth.signEmailToken(email)
	try {
		await mailer.send({
			to: email,
			subject: 'Please confirm your email address',
			template: 'confirm_email',
			data: {
				link: config.get('app_url')+'/activate?token='+token,
			}
		})
		ctx.status = 200
	} catch (err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Activate user by token
 */
router.post('/activate', async function(ctx, next) {
	ctx.assert(ctx.request.token, 403, 'Token required')
	try {
		const decoded = auth.validateEmailToken(ctx.request.token)
		const user = await ctx.models.user.findByEmail(decoded.email)
		ctx.assert(user, 404, 'No user found with provided email')
		await ctx.models.user.save({id:user.id}, {active:1})
		const token = auth.signToken(user.id, user.role)
		ctx.body = { token }
	} catch(err) {
		ctx.throw(400, err.message)
	}
})


/*
 * Facebook Strategy
 */
router
	.get('/facebook', passport.authenticate('facebook', {
		scope: ['email', 'user_about_me'],
		failureRedirect: '/signup',
		session: false
	}))
	.get('/facebook/callback', passport.authenticate('facebook', {
		failureRedirect: '/signup',
		session: false
	}), auth.setTokenCookie);


/*
 * Google Strategy
 */
router
	.get('/google', passport.authenticate('google', {
		failureRedirect: '/signup',
		scope: [ 'profile', 'email' ],
		session: false
	}))
	.get('/google/callback', passport.authenticate('google', {
		failureRedirect: '/signup',
		session: false
	}), auth.setTokenCookie);


/*
 * Twitter Strategy
 */
router
	.get('/twitter', passport.authenticate('twitter', {
		failureRedirect: '/signup',
		session: false
	}))
	.get('/twitter/callback', passport.authenticate('twitter', {
		failureRedirect: '/signup',
		session: false
	}), auth.setTokenCookie)


/*
 * Github Strategy
 */
router
	.get('/github', passport.authenticate('github', {
		failureRedirect: '/signup',
		session: false
	}))
	.get('/github/callback', passport.authenticate('github', {
		failureRedirect: '/signup',
		session: false
	}), auth.setTokenCookie)


export default router
