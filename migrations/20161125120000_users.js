
exports.up = function(knex, Promise) {
	return knex.schema.createTableIfNotExists('users', function(table) {
		table.increments('id').primary()
		table.string('name')
		table.string('email').unique()
		table.string('role').defaultTo('user')
		table.string('password').notNullable()
		table.string('username')
		table.string('provider')
		table.string('salt')
		table.string('photo')
		table.string('facebook_id').unique()
		table.string('twitter_id').unique()
		table.string('google_id').unique()
		table.string('github_id').unique()
		table.integer('active').defaultTo(0)
		table.timestamps()
	})
	.raw('ALTER TABLE users ADD COLUMN user_data JSON NULL AFTER github_id')
}

exports.down = function(knex, Promise) {
	return knex.schema.dropTableIfExists('users')
}