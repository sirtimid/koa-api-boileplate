'use strict'

export default function(knex) {
	let models = {}

	for(let model of [
		'user',
		'posts',
	]){
		models[model] = require(`./${model}`).default(knex)
	}

	return models
}