'use strict'

import Router from 'koa-router'
import uuid from 'uuid'
import mailer from '../services/mailer'
import * as auth from '../services/auth'

const router = new Router({ prefix: '/api/users' })

/**
 * Get list of users
 */
router.get('/', auth.hasRole('admin'), async (ctx, next) => {
	ctx.body = await ctx.models.user.findAllPaged(ctx.query)
})


/**
 * Creates a new user
 */
router.post('/', async (ctx, next) => {

	let fields = Object.assign({
		provider: 'local',
		role: 'user'
	}, ctx.request.body)

	try {
		const user = await ctx.models.user.create(fields)
		ctx.assert(user, 400, 'User could not be created')
		const token = auth.signToken(user.id, user.role)
		ctx.body = { token }

		// send confirmation email
		const confirm_token = auth.signEmailToken(user.email)
		await mailer.send({
			to: user.email,
			subject: 'Please confirm your email address',
			template: 'confirm_email',
			data: {
				link: config.get('app_url')+'/activate/'+confirm_token,
			}
		})

	} catch (err) {
		ctx.throw(400, err.message)
	}

})


/**
 * Get a single users history
 */
router.get('/history', auth.isAuthenticated(), async function getUser(ctx, next) {
	ctx.body = await ctx.models.user_history.findAllPaged(ctx.query, ctx.state.user.id)
})


/**
 * Get a single user
 */
router.get('/:id', auth.isMeOrAdmin(), async function getUser(ctx, next) {
	const user = await ctx.models.user.findById(ctx.params.id)
	ctx.assert(user, 404, 'User not found')
	ctx.body = user
})


/**
 * Update a single user
 */
router.put('/:id', auth.isMeOrAdmin(), async (ctx, next) => {
	try {
		if(ctx.state.user.role !== 'admin'){
			delete ctx.request.body.role
		}
		const user = await ctx.models.user.save({id:ctx.params.id}, ctx.request.body)
		ctx.assert(user, 404, 'User not found')

		if(ctx.state.user.role === 'admin' && ctx.request.body.new_password){
			await ctx.models.user.updatePassword(user.id, ctx.request.body.new_password)
		}

		ctx.body = user
	} catch (err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Change a users password
 */
router.put('/:id/password', auth.isMeOrAdmin(), async (ctx, next) => {
	ctx.assert(ctx.request.body.old_password, 403)
	ctx.assert(ctx.request.body.new_password, 403)

	const old_pass = ''+ctx.request.body.old_password
	const new_pass = ''+ctx.request.body.new_password

	const user = await ctx.models.user.findById(ctx.params.id)
	ctx.assert(user, 404, 'User not found')

	if(!ctx.models.user.authenticate(user, old_pass)){
		ctx.throw(403, 'Wrong password')
	}

	try {
		await ctx.models.user.updatePassword(user.id, new_pass)
	} catch (err) {
		ctx.throw(400, err.message)
	}

	ctx.status = 204
})


/**
 * Deletes a user
 */
router.delete('/:id', auth.hasRole('admin'), async (ctx, next) => {
	const user = await ctx.models.user.findById(ctx.params.id)
	ctx.assert(user, 404, 'User not found')
	await ctx.models.user.deleteById(user.id)
	ctx.status = 204
})


export default router