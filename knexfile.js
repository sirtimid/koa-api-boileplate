module.exports = {

	development: {
		client: 'mysql',
		connection: process.env.DB_URL || 'mysql://test:test@localhost:3306/test_dev',
		pool: {
			min: 2,
			max: 10
		},
		migrations: {
			tableName: 'knex_migrations'
		},
		debug:false
	},

	production: {
		client: 'mysql',
		connection: process.env.DB_URL || 'mysql://localhost:3306/test_prod?multipleStatements=true',
		pool: {
			min: 2,
			max: 10
		},
		migrations: {
			tableName: 'knex_migrations'
		}
	}

};
