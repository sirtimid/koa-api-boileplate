'use strict'

import Router from 'koa-router'
import * as auth from '../services/auth'

const router = new Router({ prefix: '/api/posts' })


/**
 * Get list of posts
 */
router.get('/', auth.isAuthenticated(), async (ctx, next) => {
	const user_id = !auth.isAdmin(ctx) ? ctx.state.user.id : null
	ctx.body = await ctx.models.posts.findAllPaged(ctx.query, user_id)
})


/**
 * Creates a new post
 */
router.post('/', auth.isAuthenticated(), async (ctx, next) => {
	let fields = Object.assign({ user_id: ctx.state.user.id }, ctx.request.body)
	try {
		const post = await ctx.models.posts.create(fields)
		ctx.assert(post, 400, 'post could not be created')
		ctx.body = post
	} catch (err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Get a single post
 */
router.get('/:id', auth.isAuthenticated(), async (ctx, next) => {
	const post = await ctx.models.posts.findById(ctx.params.id)
	ctx.assert(post, 404)
	ctx.body = post
})


/**
 * Update a single post
 */
router.put('/:id', auth.isAuthenticated(), async (ctx, next) => {
	let fields = Object.assign({ user_id: ctx.state.user.id }, ctx.request.body)
	try {
		const post = await ctx.models.posts.save({id:ctx.params.id}, fields)
		ctx.assert(post, 404)
		ctx.body = post
	} catch (err) {
		ctx.throw(400, err.message)
	}
})


/**
 * Deletes a post
 */
router.delete('/:id', auth.isAuthenticated(), async (ctx, next) => {
	const post = await ctx.models.posts.findById(ctx.params.id)
	ctx.assert(post, 404)
	await ctx.models.posts.deleteById(post.id)
	ctx.status = 204
})


export default router