'use strict'

import crypto from 'crypto'
import config from 'config'

export default function(knex) {

	return {

		/**
		 * Get one user by id without sensitive data
		 *
		 * @param {Integer} id
		 * @return {Object}
		 */
		findById: async function(id) {
			const user = await knex('users').where({id}).first()
			if(user){
				delete user.salt
				delete user.password
			}
			return user
		},

		/**
		 * Get one user by email without sensitive data
		 *
		 * @param {String} email
		 * @return {Object}
		 */
		findByEmail: async function(email) {
			const user = await knex('users').where({ email: email.toLowerCase() }).first()
			if(user){
				delete user.salt
				delete user.password
			}
			return user
		},

		/**
		 * Get one user by provider or email without sensitive data
		 *
		 * @param {String} email
		 * @return {Object}
		 */
		findByProviderOrEmail: async function(email, provider, id) {
			const user = await knex('users').where(function() {
				this.where('email', email.toLowerCase()).orWhere(provider, id)
			}).first()
			if(user){
				delete user.salt
				delete user.password
			}
			return user
		},

		/**
		 * Get one user
		 *
		 * @param {Object} where
		 * @return {Object}
		 */
		deleteById: function(id) {
			return knex('users').where({id}).del()
		},

		/**
		 * Get one user
		 *
		 * @param {Object} where
		 * @return {Object}
		 */
		find: function(where) {
			return knex('users').where(where).first()
		},

		/**
		 * Create one user and return it
		 *
		 * @param {Object} fields
		 * @return {Object}
		 */
		create: async function(fields) {
			if(fields.email && !fields.username){
				fields.username = fields.username || fields.email.split('@')[0]
			}

			// set default gravatar photo
			if(fields.email && !fields.photo){
				let hash = crypto.createHash('md5').update(fields.email).digest('hex')
				fields.photo = 'https://www.gravatar.com/avatar/' + hash
			}

			let row = await knex('users').insert(Object.assign({
				created_at: new Date(),
				updated_at: new Date()
			}, fields))

			if(fields.password){
				await this.updatePassword(row[0], fields.password)
			}

			return this.findById(row[0])
		},

		/**
		 * Save one user
		 *
		 * @param {Object} where
		 * @param {Object} fields
		 * @return {Object}
		 */
		save: async function(where, fields) {
			delete fields.password
			delete fields.salt
			delete fields.created_at
			delete fields.updated_at
			let user = await knex('users').where(where).first()
			if(!user) return
			await knex('users').where({id:user.id}).update(Object.assign({
				// updated_at: new Date()
			}, fields))
			return this.findById(user.id)
		},

		/**
		 * Find paged users
		 * TODO: move filters to controller
		 *
		 * @param {Object} params
		 * @return {Array}
		 */
		findAllPaged: async function(params) {
			let limit = params.limit ? parseInt(params.limit, null) : config.get('results_limit')
			let page = params.page ? parseInt(params.page, null) : 1
			let offset = limit * (page - 1)
			let order = params.order || 'name'
			let search = params.search || null

			let query = knex('users')

			if(search){
				// TODO: make search smarter, maybe FULLTEXT
				query.where(function() {
					this.where('name', 'like', `%${search}%`)
							.orWhere('email', 'like', `%${search}%`)
				})
			}

			const count = await query.clone().count('id as num').first()
			const rows = await query.orderByRaw(order).limit(limit).offset(offset)

			return {
				count: count.num || 0,
				rows: (rows || []).map(row => {
					delete row.salt
					delete row.password
					return row
				})
			}
		},

		/**
		 * Authenticate - check if the passwords are the same
		 *
		 * @param {Object} user
		 * @param {String} password
		 * @param {Function} callback
		 * @return {Boolean}
		 */
		authenticate: function(user, password, callback) {
			return user.password == this.encryptPassword(password, user.salt)
		},

		/**
		 * Encrypt password
		 *
		 * @param {String} password
		 * @param {String} salt
		 * @return {String}
		 */
		encryptPassword: function(password, salt) {
			if (!password || !salt) {
				return null
			}

			const defaultIterations = 10000
			const defaultKeyLength = 64
			salt = new Buffer(salt, 'base64')

			return crypto.pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength)
									 .toString('base64')
		},

		/**
		 * Update password field
		 *
		 * @param {Object} user
		 * @param {String} password
		 * @return {String}
		 */
		updatePassword: function(id, password) {
			if (!password || !id) {
				return
			}

			let salt = crypto.randomBytes(16).toString('base64')
			let hashed_password = this.encryptPassword(password, salt)

			return knex('users').where({id}).update({
				salt: salt,
				password: hashed_password,
				updated_at: new Date()
			})
		}

	}
}