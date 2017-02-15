
exports.up = function(knex, Promise) {
	return knex.schema
	.createTableIfNotExists('posts', function(table) {
		table.uuid('id').primary()
		table.integer('active').defaultTo(0)
		table.string('title')
		table.text('description')
		table.integer('user_id')
				 .unsigned()
				 .references('id')
				 .inTable('users')
				 .notNullable()
				 .onDelete('NO ACTION')
				 .onUpdate('NO ACTION')
		table.timestamps()
	})
}

exports.down = function(knex, Promise) {
	return knex.schema.dropTableIfExists('campaigns')
}