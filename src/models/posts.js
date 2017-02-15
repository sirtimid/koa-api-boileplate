'use strict'

import _ from 'lodash'
import uuid from 'uuid'
import config from 'config'

export default function(knex) {

	return {

		/**
		 * Get one post
		 *
		 * @param {Object} where
		 * @return {Object}
		 */
		find: async function(where) {
			return await knex('posts').where(where).first()
		},

		/**
		 * Get one post by id
		 *
		 * @param {Integer} id
		 * @return {Object}
		 */
		findById: async function(id) {
			return await knex('posts').where({
				id
			}).first()
		},

		/**
		 * Get one post
		 *
		 * @param {Object} where
		 * @return {Object}
		 */
		deleteById: function(id) {
			return knex('posts').where({
				id
			}).del()
		},

		/**
		 * Create one post and return it
		 *
		 * @param {Object} fields
		 * @return {Object}
		 */
		create: async function(fields) {
			fields.id = fields.id || uuid.v4()
			let row = await knex('posts').insert(Object.assign({
				created_at: new Date(),
				updated_at: new Date()
			}, fields))
			return this.findById(fields.id)
		},

		/**
		 * Save one post
		 *
		 * @param {Object} where
		 * @param {Object} fields
		 * @return {Object}
		 */
		save: async function(where, fields) {
			let post = await knex('posts').where(where).first()
			if (!post) return
			await knex('posts').where({
				id: post.id
			}).update(Object.assign({
				updated_at: new Date()
			}, fields))
			return this.findById(post.id)
		},

		/**
		 * Find paged posts
		 * TODO: move filters to controller
		 *
		 * @param {Object} params
		 * @return {Array}
		 */
		findAllPaged: async function(params, user_id) {
			let limit = params.limit ? parseInt(params.limit, null) : config.get(
				'results_limit')
			let page = params.page ? parseInt(params.page, null) : 1
			let offset = limit * (page - 1)
			let order = params.order || 'created_at DESC'
			let search = params.search || null

			const query = knex('posts')

			// filter by active
			if (params.active) {
				query.where('active', 1)
			}

			if(search){
				// TODO: make search smarter, maybe FULLTEXT
				query.where(function() {
					this.where('title', 'like', `%${search}%`)
							.orWhere('description', 'like', `%${search}%`)
				})
			}

			// filter by user id
			if (user_id) {
				query.where('user_id', user_id)
			}

			const count = await query.clone().count('id as num').first()
			const rows = await query.orderByRaw(order).limit(limit).offset(offset)

			return {
				count: count.num || 0,
				rows: rows || []
			}
		},

	}

}
